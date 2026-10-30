import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createBackendJournal,launchServicesType} from '../src/backend/diagnostics.mjs';

test('native Electron creates and disposes the isolated status icon',{skip:process.platform!=='darwin',timeout:25000},async t=>{
  const {execFile}=await import('node:child_process');
  const {promisify}=await import('node:util');
  const {fileURLToPath}=await import('node:url');
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-status-icon-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const electron=(await import('electron')).default,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const {stdout}=await promisify(execFile)(electron,[fileURLToPath(new URL('./fixtures/status-menu-electron.cjs',import.meta.url)),root],
    {env,timeout:20000,killSignal:'SIGKILL',maxBuffer:1024*1024});
  const result=stdout.trim().split('\n').map(line=>{try{return JSON.parse(line);}catch{return null;}}).find(value=>value?.initial);
  assert.equal(result?.ok,true);assert.equal(result.initial.available,true);assert.equal(result.disposed.available,false);
  assert.equal(result.disposed.phase,'disposed');assert.ok(result.states.some(state=>state.phase==='available'));
});

test('status icon retries bounded failures, restores latest menu and cancels all recovery on disposal',async()=>{
  const {createStatusMenu}=await import('../src/backend/status-menu.mjs');
  const queued=new Map(),states=[],menus=[];let serial=0,created=0,destroyed=0;
  const schedule=fn=>{const id=++serial;queued.set(id,fn);return id;},cancel=id=>queued.delete(id);
  const next=()=>{const [id,fn]=queued.entries().next().value;queued.delete(id);fn();};
  class Tray{constructor(){if(++created<3)throw Error('PRIVATE q=ticket');}setToolTip(){}setContextMenu(menu){menus.push(menu);}destroy(){destroyed++;}}
  const options={Tray,Menu:{buildFromTemplate:items=>items},nativeImage:{createFromBitmap:()=>({isEmpty:()=>false,setTemplateImage(){}})},
    onOpen(){},onStop(){},onCancelStop(){},schedule,cancel,onState:s=>states.push(s)};
  const icon=createStatusMenu(options);assert.deepEqual(icon.view(),{available:false,attempts:1,phase:'unavailable',errorCode:'TRAY_CREATE_FAILED'});
  icon.update({service:{phase:'draining',reasons:[]},pages:4});assert.equal(queued.size,1);
  next();assert.equal(queued.size,1);next();assert.equal(queued.size,0);
  assert.equal(icon.view().available,true);assert.equal(icon.view().attempts,3);assert.match(menus.at(-1)[0].label,/страниц: 4/);
  assert.ok(menus.at(-1).some(item=>item.label==='Отменить остановку'));
  assert.equal(JSON.stringify(states).includes('PRIVATE'),false);icon.destroy();icon.destroy();assert.equal(destroyed,1);assert.equal(icon.view().phase,'disposed');
  created=0;const failed=createStatusMenu({...options,Tray:class{constructor(){created++;throw Error('no tray');}}});
  next();next();assert.equal(created,3);assert.equal(queued.size,0);assert.equal(failed.view().available,false);failed.destroy();
  const cancelled=createStatusMenu({...options,Tray:class{constructor(){throw Error('no tray');}}});
  const pending=[...queued.values()][0];cancelled.destroy();assert.equal(queued.size,0);pending();assert.equal(cancelled.view().attempts,1);
});

test('a menu failure retires its icon before recovery and exposes only a safe stage',async()=>{
  const {createStatusMenu}=await import('../src/backend/status-menu.mjs');let tick,destroyed=0,fail=true;
  class Tray{setToolTip(){}setContextMenu(){if(fail)throw Error('PRIVATE');}destroy(){destroyed++;}}
  const icon=createStatusMenu({Tray,Menu:{buildFromTemplate:items=>items},nativeImage:{createFromBitmap:()=>({setTemplateImage(){}})},
    onOpen(){},onStop(){},onCancelStop(){},schedule:fn=>{tick=fn;return 1;},cancel(){}});
  icon.update({service:{phase:'running',reasons:[]}});assert.equal(destroyed,1);assert.equal(icon.view().errorCode,'TRAY_MENU_FAILED');
  fail=false;tick();assert.equal(icon.view().available,true);icon.destroy();assert.equal(destroyed,2);
});


test('backend journal keeps only small scalar facts, private and bounded',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-backend-journal-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const file=path.join(root,'diagnostics','backend-events.jsonl');
  const journal=createBackendJournal(file,{now:()=>'2026-10-16T00:00:00.000Z',pid:42});
  assert.equal(journal.record('child-process-gone',{type:'GPU',reason:'killed',exitCode:15,token:{secret:'x'},list:['a'],'bad key':1}),true);
  assert.equal(journal.record('lease',{held:true,generation:3,note:'y'.repeat(500)}),true);
  assert.equal(journal.record('bad event!',{}),false,'event names are fixed identifiers');
  assert.equal(journal.record('identity.unmatched',{source:'model-read',identity_prefix:'0123abcd'}),true,'dotted identity events are accepted');
  const lines=fs.readFileSync(file,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(lines[0],{ts:'2026-10-16T00:00:00.000Z',pid:42,event:'child-process-gone',type:'GPU',reason:'killed',exitCode:15});
  assert.equal(lines[1].note.length,120,'strings are shortened');
  if(process.platform!=='win32')assert.equal(fs.statSync(file).mode&0o077,0,'the journal is private');
  fs.writeFileSync(file,'x'.repeat(1024*1024+1));
  journal.record('clients',{count:0});
  assert.equal(fs.existsSync(file+'.1'),true,'one rotation keeps the previous megabyte');
  assert.ok(fs.statSync(file).size<1000);
});

test('LaunchServices type is parsed from lsappinfo and absent elsewhere',async()=>{
  const output=' [ NULL ]  ASN:0x0-0x13013: \n !cgsConnection !signalled type="UIElement" flavor=[ NULL ]';
  assert.equal(await launchServicesType(1,{platform:'darwin',run:(_file,_args,_options,done)=>done(null,output)}),'UIElement');
  assert.equal(await launchServicesType(1,{platform:'darwin',run:(_file,_args,_options,done)=>done(new Error('gone'))}),null);
  assert.equal(await launchServicesType(1,{platform:'linux'}),null);
  if(process.platform==='darwin')assert.match(String(await launchServicesType(process.pid)),/^(null|[A-Za-z]+)$/);
});

test('the menu bar stop goes to its handler and a pending device appears with its code', async () => {
  const { createStatusMenu } = await import('../src/backend/status-menu.mjs');
  let template = null; const calls = [];
  class Tray { setToolTip() {} setContextMenu(menu) { template = menu; } destroy() {} isDestroyed() { return false; } }
  const Menu = { buildFromTemplate: items => items };
  const nativeImage = { createFromBitmap: () => ({ setTemplateImage() {} }) };
  const menu = createStatusMenu({ Tray, Menu, nativeImage, onOpen: () => calls.push('open'), onStop: () => calls.push('stop'),
    onCancelStop: () => calls.push('cancel'), onApprove: id => calls.push('approve ' + id) });
  menu.update({ service: { phase: 'running', reasons: [], error: null }, pages: 2, pairings: [{ id: 'p1', name: 'iPad', code: '123456' }] });
  const byLabel = label => template.find(item => item.label?.startsWith(label));
  assert.match(byLabel('Подключить').label, /iPad.*123456/);
  byLabel('Подключить').click(); byLabel('Остановить фоновую службу').click(); byLabel('Открыть Workflow Pilot').click();
  assert.deepEqual(calls, ['approve p1', 'stop', 'open']);
  menu.update({ service: { phase: 'draining', reasons: [{ message: 'Ждём ответа' }], error: null } });
  byLabel('Отменить остановку').click();
  assert.equal(calls.at(-1), 'cancel');
});
