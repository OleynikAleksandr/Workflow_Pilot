import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { DesktopIpc } from '../src/frontend/desktop/ipc.mjs';
import { ControlFacade, publicVpsState, publicRuntimeState } from '../src/control/facade.mjs';
import { desktopFiles } from '../src/execution/facade.mjs';
import { DESKTOP_CHANNELS } from '../src/contracts/desktop.mjs';

test('IPC refuses remote pages, other windows, child frames and changed URLs before invoking Control', () => {
  const handlers=new Map(),localUrl='file:///fixture/index.html',archiveUrl='file:///fixture/archive.html';
  const local={mainFrame:{url:localUrl},isDestroyed:()=>false},archive={mainFrame:{url:archiveUrl},isDestroyed:()=>false};
  const ipc=new DesktopIpc({handle:(key,fn)=>handlers.set(key,fn),removeHandler:key=>handlers.delete(key)},
    {local:()=>({contents:local,url:localUrl}),archive:()=>({contents:archive,url:archiveUrl})});
  let calls=0;
  ipc.handle('local','pilot:get-state',()=>{calls++;return {ok:true};});
  ipc.handle('archive','archive:delete-project',()=>{calls++;});
  const localCall=handlers.get('pilot:get-state'),archiveCall=handlers.get('archive:delete-project');
  for(const event of [{sender:archive,senderFrame:archive.mainFrame},{sender:local,senderFrame:{url:localUrl}},
    {sender:{mainFrame:{url:'https://chatgpt.com/'}},senderFrame:{url:localUrl}}])
    assert.throws(()=>localCall(event),{code:'IPC_FORBIDDEN'});
  assert.throws(()=>archiveCall({sender:local,senderFrame:local.mainFrame}),{code:'IPC_FORBIDDEN'});
  local.mainFrame.url='https://chatgpt.com/';
  assert.throws(()=>localCall({sender:local,senderFrame:local.mainFrame}),{code:'IPC_FORBIDDEN'});
  assert.equal(calls,0);
  local.mainFrame.url=localUrl;
  assert.deepEqual(localCall({sender:local,senderFrame:local.mainFrame}),{ok:true});
  local.isDestroyed=()=>true;
  assert.throws(()=>localCall({sender:local,senderFrame:local.mainFrame}),{code:'IPC_FORBIDDEN'});
  assert.throws(()=>ipc.handle('local','arbitrary:execute',()=>{}),{code:'IPC_CHANNEL_INVALID'});
  assert.throws(()=>ipc.handle('local','pilot:get-state',()=>{}),{code:'IPC_CHANNEL_INVALID'});
  ipc.dispose();assert.equal(handlers.size,0);ipc.dispose();
});

for(const [file,globalName,surface,eventName] of [
  ['preload.cjs','webPilot','local','pilot:state-changed'],
  ['archive-preload.cjs','webPilotArchive','archive','pilot-archive:state-changed'],
]) test(file+' exposes fixed capabilities and releases state listeners',async()=>{
  const events=new EventEmitter(),invoked=[],scope={};
  const ipcRenderer={invoke:(channel,input)=>{invoked.push(channel);return Promise.resolve(input);},
    on:(...args)=>events.on(...args),removeListener:(...args)=>events.removeListener(...args)};
  vm.runInNewContext(await fs.readFile(new URL('../src/frontend/desktop/'+file,import.meta.url),'utf8'),{
    require:name=>{assert.equal(name,'electron');return {ipcRenderer,contextBridge:{exposeInMainWorld:(name,api)=>{scope[name]=api;}}};},
  });
  const api=scope[globalName];assert(Object.isFrozen(api));
  assert.equal(api.invoke,undefined);assert.equal(api.send,undefined);assert.equal(api.execute,undefined);
  for(const [name,fn]of Object.entries(api))if(name!=='onState')await fn();
  assert.deepEqual([...new Set(invoked)].sort(),[...DESKTOP_CHANNELS[surface]].sort());
  let received=0;const unsubscribe=api.onState(()=>received++);
  events.emit(eventName,{},{});assert.equal(received,1);
  unsubscribe();events.emit(eventName,{},{});assert.equal(received,1);assert.equal(events.listenerCount(eventName),0);
});

test('Control owns settings: concurrent color edits survive, failed writes roll back and restart restores snapshots',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pilot-settings-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  let failWrite=false;
  const files={readJson:file=>desktopFiles.readJson(file),writeJson:async(file,value)=>{
    if(failWrite)throw Object.assign(new Error('fixture write failure'),{code:'EIO'});
    await desktopFiles.writeJson(file,value);
  }};
  const create=()=>new ControlFacade({storageFile:path.join(root,'sessions.json'),execution:{files}})
    .configureSettings({file:path.join(root,'settings.json'),workflowSnapshot:()=>({projectPlanContinuation:{},parallelExecutionBook:{}})});
  const settings=create(),before=settings.parallelExecution;
  await Promise.all([settings.setColor({key:'background',value:'#abcdef'}),settings.setColor({key:'userText',value:'#123456'}),
    settings.save({shellTheme:'dark'}),settings.save({parallelExecution:{parallel_allowed:true,max_workers:4}})]);
  assert.equal(settings.chatColors.background,'#abcdef');assert.equal(settings.chatColors.userText,'#123456');
  assert.equal(settings.shellTheme,'dark');assert.deepEqual(before,{parallel_allowed:false,max_workers:2});
  const copy=settings.snapshot();copy.chatColors.background='#000000';copy.parallelExecution.max_workers=100;
  assert.equal(settings.chatColors.background,'#abcdef');assert.equal(settings.parallelExecution.max_workers,4);
  failWrite=true;await assert.rejects(settings.save({shellTheme:'light'}),{code:'EIO'});
  assert.equal(settings.shellTheme,'dark');failWrite=false;
  await settings.save({sidebarWidth:390});
  const restarted=create();await restarted.load();assert.deepEqual(restarted.snapshot(),settings.snapshot());
  assert.equal(restarted.files,undefined);assert.equal(restarted.values,undefined);assert.equal(restarted.tail,undefined);
});

test('runtime snapshots mask connector paths and never serialize raw errors or credentials',()=>{
  const secret='sk-fixture-secret-1234567890',connector='https://user:'+secret+'@example.invalid/mcp/'+secret+'/mcp?key='+secret;
  const input={mcp:{ready:true,key:secret},tunnel:{configured:true,ready:true,api_key:secret},
    vps:{configured:true,ready:true,connector,lastError:{message:secret,at:secret},error:secret}};
  const snapshot=publicRuntimeState(input);
  assert(!JSON.stringify(snapshot).includes(secret));assert.equal(snapshot.vps.connector,'https://example.invalid/mcp/…/mcp');
  assert.equal(snapshot.vps.lastError.at,null);
  assert.equal(publicVpsState({configured:false}).phase,'setup-required');
});

test('Control composes first-run readiness without inventing login or exposing tunnel credentials',async()=>{
  const secret='sk-fixture-secret-1234567890',timers=new Map();let nextTimer=0,configured=false;
  const schedule=callback=>{const id=++nextTimer;timers.set(id,callback);return id;};
  const cancel=id=>timers.delete(id);
  const control=new ControlFacade({storageFile:'/unused-fixture/sessions.json',execution:{files:desktopFiles}});
  const options={readiness:{probeNode:async()=>true,probeGit:async()=>true,
    inspectRuntime:async()=>({mcp:{ready:true},tunnel:{ready:configured,configured}}),
    configureTunnel:async credentials=>{assert.equal(credentials.key,secret);configured=true;},
    prepareRuntime:async()=>({mcp:{ready:true},tunnel:{ready:configured,configured}}),schedule,cancel},
    clipboard:{readText:()=>'',promptTunnelId:async()=>({cancelled:true}),schedule,unschedule:cancel}};
  const startup=control.configureStartup(options);
  assert.throws(()=>control.configureStartup(options),/ALREADY_CONFIGURED/);
  await startup.flow.check();assert.equal(startup.flow.snapshot().phase,'tunnel');
  assert.equal(startup.flow.snapshot().account,'unknown');
  await startup.flow.configure({tunnelId:'fixture-tunnel',key:secret});
  assert.equal(startup.flow.snapshot().phase,'connected');
  assert.equal(startup.flow.snapshot().account,'unknown');
  assert(!JSON.stringify([startup.flow.snapshot(),startup.clipboard.snapshot()]).includes(secret));
  startup.flow.beginPage(2);startup.flow.finishPage(1);startup.flow.observe(1,{login:'signed-in'});
  assert.equal(startup.flow.snapshot().account,'unknown');
  startup.flow.finishPage(2);startup.flow.observe(2,{login:'signed-out'});
  assert.equal(startup.flow.snapshot().account,'signed-out');
  startup.flow.beginPage(3);startup.clipboard.observe({active:true,ready:true});
  assert(timers.size>0);startup.flow.dispose();startup.clipboard.dispose();assert.equal(timers.size,0);
});
