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

const settle=(ms=20)=>new Promise(resolve=>setTimeout(resolve,ms));

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
  const status=createStatusMenu({Tray,Menu,nativeImage,onOpen:()=>actions.push('open'),onStop:()=>actions.push('stop'),onCancelStop:()=>actions.push('cancel')});
  let items=status.update({service:{phase:'running',reasons:[]},pages:2});
  assert.match(items[0].label,/работает · страниц: 2/);
  items.find(item=>item.label==='Остановить фоновую службу…').click();
  items=status.update({service:{phase:'draining',reasons:[{message:'Ждём завершения ответа ChatGPT: Альфа.'}]},pages:2});
  assert.match(items[0].label,/Остановка/);assert.equal(items[1].label,'Ждём завершения ответа ChatGPT: Альфа.');
  items.find(item=>item.label==='Отменить остановку').click();items.find(item=>item.label==='Открыть Workflow Pilot').click();
  assert.deepEqual(actions,['stop','cancel','open']);assert.match(tooltip,/остановка/);
  assert.equal(createStatusMenu({Tray:class{constructor(){throw new Error('no tray');}},Menu,nativeImage,onOpen(){},onStop(){},onCancelStop(){}}),null,
    'without a system tray the client menu is the fallback');
});

test('Electron backend stops through the API at a safe point and confirms by exit and released profile',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
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
  assert.equal((await client.read('service.status')).phase,'running');
  await assert.rejects(client.run('service.stop'),{code:'BACKEND_LEASE_REQUIRED'});
  await client.acquire();
  const accepted=await client.submit('service.stop',{});
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
