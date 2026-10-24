import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createStopController,drainReasons} from '../src/backend/shutdown.mjs';
import {createStatusMenu} from '../src/backend/status-menu.mjs';
import {SessionRuntimes} from '../src/control/sessions/service.mjs';
import {ExecutionFacade} from '../src/execution/facade.mjs';
import {DesktopBrowserHost} from '../src/frontend/desktop/browser-host.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {createForceStop,forceExitOwnTree} from '../src/backend/force-stop.mjs';
import {createBackendOperations,openOperationJournal,backendCatalog} from '../src/backend/operations.mjs';

const settle=(ms=20)=>new Promise(resolve=>setTimeout(resolve,ms));

test('force stop has an independent deadline even if graceful cleanup never resolves',async()=>{
  let deadline,stops=0,forced=0,ms;
  const force=createForceStop({stop:()=>{stops++;return new Promise(()=>{});},forceExit:()=>forced++,
    schedule:(callback,delay)=>{deadline=callback;ms=delay;}});
  assert.equal(force(),true);assert.equal(force(),false);assert.equal(stops,1);assert.equal(ms,2000);
  deadline();assert.equal(forced,1);
});

test('emergency exit targets only current descendants and never a neighbour or reparented PID',()=>{
  const killed=[],exits=[];let scans=0;
  forceExitOwnTree({pid:100,platform:'darwin',execute:(cmd,args)=>{
    assert.equal(cmd,'ps');assert.deepEqual(args,['-axo','pid=,ppid=']);
    return ++scans===1?'100 1\n101 100\n102 101\n103 100\n200 1\n201 200':'100 1\n101 100\n102 101\n103 1\n200 1\n201 200';
  },signal:(pid,name)=>killed.push([pid,name]),exit:code=>exits.push(code)});
  assert.deepEqual(killed,[[102,'SIGKILL'],[101,'SIGKILL']]);assert.deepEqual(exits,[1]);
  forceExitOwnTree({pid:100,platform:'win32',execute:(cmd,args)=>{assert.equal(cmd,'taskkill.exe');assert.deepEqual(args,['/PID','100','/T','/F']);},exit:()=>{}});
});

test('confirmed emergency operation bypasses a full blocked queue but still requires its control lease',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-force-queue-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  let release,forced=0;const blocked=new Promise(resolve=>{release=resolve;});
  const catalog=backendCatalog({desktop:{},control:{projects:{}},service:{force:()=>{forced++;return {phase:'force-stopping'};}}});
  assert.throws(()=>catalog['service.force-stop']({}),/./);assert.equal(forced,0);
  const operations=createBackendOperations({bootGeneration:'boot-a',journal:openOperationJournal(path.join(root,'operations.jsonl')),limit:1,
    catalog:{'settings.update':()=>blocked,'service.force-stop':catalog['service.force-stop']}});
  t.after(()=>operations.dispose());
  const command={requestId:'force',operation:'service.force-stop',args:{confirmed:true},bootGeneration:'boot-a'};
  await assert.rejects(operations.submit(command),{code:'BACKEND_LEASE_REQUIRED'});
  const lease=(await operations.submit({requestId:'lease',operation:'control.acquire',args:{clientId:'client-fixture-1'},bootGeneration:'boot-a'})).value.leaseGeneration;
  await operations.submit({...command,requestId:'blocked',operation:'settings.update',args:{theme:'dark'},leaseGeneration:lease});
  const accepted=await operations.submit({...command,leaseGeneration:lease});
  for(let i=0;i<50&&!forced;i++)await settle(5);
  assert.equal(forced,1);assert.equal(accepted.status,'accepted');
  release();await operations.idle();
});

test('stop drains until a safe point, never kills on time and can be cancelled',async()=>{
  let busy=[{code:'ANSWER_RUNNING',message:'Ждём завершения ответа ChatGPT: Альфа.'}],paused=[],stops=0;const views=[];
  const stopper=createStopController({drainState:()=>busy,pause:value=>paused.push(value),stop:async()=>{stops++;},
    onChange:view=>views.push(view),intervalMs:5});
  assert.equal(stopper.request().phase,'draining');assert.deepEqual(paused,[true]);
  await settle(80);
  assert.equal(stops,0,'a running answer is never interrupted');
  assert.equal(stopper.view().reasons[0].code,'ANSWER_RUNNING');
  assert.equal(stopper.cancel().phase,'running');assert.deepEqual(paused,[true,false],'cancel resumes automation');
  await settle(30);assert.equal(stops,0);
  stopper.request();busy=[];
  await settle(40);
  assert.equal(stops,1);assert.equal(stopper.view().phase,'stopping');
  assert.equal(stopper.cancel().phase,'stopping','a stop already at the safe point is not reverted');
  assert.equal(stopper.request().phase,'stopping');assert.equal(stops,1);
  assert.ok(views.some(view=>view.phase==='draining'&&view.reasons.length===1));
  stopper.dispose();
});

test('a failed stop stays visible and retries without force',async()=>{
  let attempts=0;
  const stopper=createStopController({drainState:()=>[],pause:()=>{},intervalMs:5,
    stop:async()=>{if(++attempts===1)throw Object.assign(new Error('busy port'),{code:'EBUSY'});}});
  stopper.request();await settle(60);
  assert.equal(attempts,2);assert.equal(stopper.view().phase,'stopping');
  stopper.dispose();
});

test('paused sessions start no new context or automation; resuming re-evaluates them',t=>{
  const createView=()=>{const contents=new EventEmitter();Object.assign(contents,{url:'',getURL:()=>contents.url,isDestroyed:()=>false,close(){},
    loadURL:async url=>{contents.url=url;}});return {webContents:contents};};
  const execution=new ExecutionFacade();
  execution.attachBrowser({host:new DesktopBrowserHost(createView),ipc:{},connect:()=>()=>{},createComposer:()=>({inFlight:false})});
  const project={workspace:'/p',sessionId:'a',projectId:'p',chatUrl:'https://chatgpt.com/c/aaaaaaaa'};
  const store={project:()=>project,selected:()=>project,inspect:async()=>({}),recordAgentTime:async()=>{},updateSession:async()=>project};
  const sessions=new SessionRuntimes({store,runtime:()=>({}),execution,presentation:{show(){},hide(){}}});
  t.after(()=>sessions.dispose());
  const record=sessions.ensure(project);let attached=0;
  record.controller.attach=()=>{attached++;record.controller.active=project;};record.controller.tick=async()=>{};
  record.ready=true;sessions.paused=true;
  assert.equal(record.paused,true);sessions.tick(record);assert.equal(attached,0,'no context send while draining');
  sessions.paused=false;sessions.tick(record);assert.equal(attached,1);
});

test('status menu shows the actual service state and the matching action',()=>{
  const menus=[];let tooltip='';
  class Tray{constructor(image){this.image=image;}setToolTip(value){tooltip=value;}setContextMenu(menu){menus.push(menu);}destroy(){}}
  const nativeImage={createFromBitmap:(buffer,size)=>({buffer,size,setTemplateImage(){this.template=true;}})};
  const Menu={buildFromTemplate:items=>items};
  const actions=[];
  const status=createStatusMenu({Tray,Menu,nativeImage,onOpen:()=>actions.push('open'),onStop:()=>actions.push('stop'),onCancelStop:()=>actions.push('cancel'),onForceStop:()=>actions.push('force')});
  let items=status.update({service:{phase:'running',reasons:[]},pages:2});
  assert.match(items[0].label,/работает · страниц: 2/);
  items.find(item=>item.label==='Остановить фоновую службу…').click();
  items=status.update({service:{phase:'draining',reasons:[{message:'Ждём завершения ответа ChatGPT: Альфа.'}]},pages:2});
  assert.match(items[0].label,/Остановка/);assert.equal(items[1].label,'Ждём завершения ответа ChatGPT: Альфа.');
  items.find(item=>item.label==='Отменить остановку').click();items.find(item=>item.label==='Открыть Workflow Pilot').click();
  assert.deepEqual(actions,['stop','cancel','open']);assert.match(tooltip,/остановка/);
  for(const phase of ['running','draining','stopping']){
    const force=status.update({service:{phase,reasons:[]}}).find(item=>item.label==='Принудительно остановить службу…');
    assert.notEqual(force.enabled,false);force.click();
  }
  assert.deepEqual(actions.slice(-3),['force','force','force']);
  status.destroy();
  const unavailable=createStatusMenu({Tray:class{constructor(){throw new Error('no tray');}},Menu,nativeImage,onOpen(){},onStop(){},onCancelStop(){}});
  assert.equal(unavailable.view().available,false,'without a system tray the client menu is the fallback');unavailable.destroy();
});

for(const forced of [false,true])test('Electron backend stops through the API and releases profile; force='+forced,{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const {spawn}=await import('node:child_process');
  const readline=await import('node:readline');
  const {fileURLToPath}=await import('node:url');
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-stop-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],{cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGKILL');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout});
  const ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout '+errors)),30000);
    lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready){clearTimeout(timer);resolve(value);}}catch{}});});
  const exited=new Promise(resolve=>backend.once('exit',code=>resolve(code)));
  const client=new BackendConnection({port:ready.port,token:ready.token});t.after(()=>client.close());
  await client.connect();
  const services=[];client.subscribe({onUi:(kind,value)=>{if(kind==='service')services.push(value);}});
  const state=await client.read('service.status');assert.equal(state.phase,'running');
  assert.deepEqual(state.statusIcon,{available:false,attempts:0,phase:'disabled',errorCode:null});
  await assert.rejects(client.run('service.stop'),{code:'BACKEND_LEASE_REQUIRED'});
  await client.acquire();
  const accepted=await client.submit(forced?'service.force-stop':'service.stop',forced?{confirmed:true}:{});
  assert.equal(accepted.status,'accepted');
  assert.equal(await Promise.race([exited,settle(15000).then(()=>'timeout')]),0,'the backend confirms the stop by exiting');
  assert.equal(fs.existsSync(path.join(root,'.backend-host','owner.json')),false);
  assert.equal(fs.existsSync(path.join(root,'.backend-host','service.json')),false);
});

test('a stop waits for answers, sends and Kit commands, never for context preparation that sent nothing',()=>{
  const reasons=drainReasons({sessions:[
    {name:'Оркестратор',busy:true,sending:false,preparing:'waiting-chat'},
    {name:'T001',busy:false,sending:false,preparing:'loading-context'},
    {name:'T002',busy:false,sending:false,preparing:'sending'},
    {name:'T003',busy:false,sending:true,preparing:null}],
    states:[{name:'Проект',commands:[{state:'running'}]},{name:'Готово',commands:[{state:'completed'}]}]});
  assert.deepEqual(reasons.map(reason=>reason.code),['ANSWER_RUNNING','SEND_RUNNING','SEND_RUNNING','COMMAND_RUNNING']);
  assert.equal(reasons.some(reason=>/T001/.test(reason.message)),false,'a stuck preparation does not hold the stop');
  assert.deepEqual(drainReasons({sessions:[{name:'T001',busy:false,sending:false,preparing:'preparing-message'}]}),[]);
});
