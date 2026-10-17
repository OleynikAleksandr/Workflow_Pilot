import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {BackendBrowserHost,ExecutionFacade} from '../src/execution/facade.mjs';
import {SessionRuntimes} from '../src/control/sessions/service.mjs';
import {ProjectPlanContinuation} from '../src/control/workflow/project-plan-continuation.mjs';
import {configureProjectPlanContinuation} from '../src/control/workflow/project-session-plan-continuation.mjs';
import {createBackendPages} from '../src/backend/bootstrap.mjs';

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,description) {
  for(let attempt=0;attempt<100;attempt++){if(predicate())return;await settle(10);}
  assert.fail('Timed out: '+description);
}
function fakeElectron() {
  const windows=[];
  class BrowserWindow {
    constructor(options) {
      const contents=new EventEmitter();
      Object.assign(contents,{id:windows.length+1,url:'',loads:[],destroyed:false,
        getURL:()=>contents.url,isDestroyed:()=>contents.destroyed,
        setWindowOpenHandler:handler=>{contents.openHandler=handler;},
        executeJavaScript:async()=>null,insertCSS:async()=>'css-key',removeInsertedCSS:async()=>{},
        loadURL:async url=>{contents.loads.push(url);
          contents.emit('did-start-navigation',{isMainFrame:true,isSameDocument:false});
          contents.url=url;contents.emit('did-finish-load');},
        reload:()=>{contents.reloads=(contents.reloads??0)+1;
          contents.emit('did-start-navigation',{isMainFrame:true,isSameDocument:false});contents.emit('did-finish-load');}});
      Object.assign(this,{options,webContents:contents,destroyed:false});windows.push(this);
    }
    isDestroyed(){return this.destroyed;}
    destroy(){this.destroyed=true;this.webContents.destroyed=true;}
  }
  return {BrowserWindow,screen:{getAllDisplays:()=>[{scaleFactor:1},{scaleFactor:2}]},windows};
}
const hostOf=electron=>new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,screen:electron.screen,
  partition:'persist:workflow-pilot-chatgpt',preload:'/fixture/preload.cjs'});

test('backend host keeps a hidden offscreen page independent of its viewers',()=>{
  const electron=fakeElectron(),host=hostOf(electron);
  const contents=host.create('page-a');
  const options=electron.windows[0].options;
  assert.equal(options.show,false);assert.deepEqual(options.webPreferences.offscreen,{deviceScaleFactor:2});
  assert.equal(options.webPreferences.partition,'persist:workflow-pilot-chatgpt');
  assert.equal(options.webPreferences.preload,'/fixture/preload.cjs');
  assert.equal(options.webPreferences.sandbox,true);assert.equal(options.webPreferences.nodeIntegration,false);
  assert.deepEqual(contents.openHandler({url:'http://example.invalid/popup'}),{action:'deny'});
  const popup=contents.openHandler({url:'https://chatgpt.com/popup'});
  assert.equal(popup.action,'allow');assert.equal(typeof popup.createWindow,'function','popups stay backend pages');
  let prevented=false;contents.emit('will-navigate',{preventDefault:()=>{prevented=true;}},'http://example.invalid/');
  assert.equal(prevented,true);
  assert.throws(()=>host.create('page-a'),{code:'BROWSER_HOST_CONFLICT'});
  host.show('page-a');assert.equal(host.selected,'page-a');
  const first=host.attachViewer('page-a'),second=host.attachViewer('page-a');
  assert.notEqual(first,second);assert.equal(host.viewers('page-a'),2);
  assert.equal(host.detachViewer(first),true);assert.equal(host.detachViewer(first),false);
  assert.equal(host.detachViewer(second),true);
  assert.equal(host.viewers('page-a'),0);assert.equal(host.selected,'page-a','viewers do not own selection');
  assert.equal(contents.isDestroyed(),false,'zero viewers keep the page alive');
  assert.equal(host.view('page-a').webContents,contents);
  assert.throws(()=>host.attachViewer('missing'),{code:'SESSION_RUNTIME_RELEASED'});
  const late=host.attachViewer('page-a');host.close('page-a');
  assert.equal(contents.isDestroyed(),true);assert.equal(host.selected,null);
  assert.equal(host.detachViewer(late),false);assert.equal(host.count,0);
});

function backendFixture(t,root,{recoverCrashed=false}={}) {
  const electron=fakeElectron(),host=hostOf(electron),sources=new Map(),sends=[];
  let respond=()=>({state:'sent'});
  const workspace=path.join(root,'project');
  const project={workspace,projectId:'fixture',sessionId:'chat-a',chatUrl:'https://chatgpt.com/c/fixture-a',scopeId:'scope-a'};
  const plan={...project,inspectedSessionId:'chat-a',scopeStatus:'ACTIVE',confirmed:true,planRevision:1,
    planView:{tasks:[{id:'T001',status:'done'},{id:'T002',status:'pending'},{id:'T003',status:'pending'}]}};
  const store={project:(w,id)=>w===workspace&&(!id||id==='chat-a')?project:null,selected:()=>project,
    inspect:async()=>structuredClone(plan),recordAgentTime:async()=>{},updateSession:async(_w,_id,patch)=>Object.assign(project,patch),
    bindChat:async()=>project};
  const auth=new ProjectPlanContinuation();auth.set(workspace,'scope-a',true,'chat-a');
  const execution=new ExecutionFacade();
  execution.attachBrowser({host,ipc:{},recoverCrashed,recoveryDelayMs:5,
    connect:(contents,_ipc,source)=>{
      sources.set(contents,source);
      const reset=()=>source.reset();
      contents.on('render-process-gone',reset);
      return ()=>contents.removeListener('render-process-gone',reset);
    },
    createComposer:()=>({inFlight:false,inspect:async()=>({login:true}),hasFilled:()=>false,
      sendUserMessage:async({text,canContinue,onBeforeSend})=>{
        if(!canContinue()||!await onBeforeSend())return {state:'cancelled'};
        sends.push(text);return respond();
      }})});
  const counts={cancel:0,reset:0};
  const sessions=new SessionRuntimes({store,runtime:()=>({}),execution,
    presentation:{show:id=>host.show(id),hide:()=>host.hide()},
    // As coordination.observePage: every page feeds its own automation, selected or not.
    onPage:(record,event)=>record.primaryAutomation?.observe(event),
    decorate:record=>{
      // Context delivery has its own suite; this fixture keeps a delivered chat.
      Object.assign(record.controller,{attach:()=>{},tick:async()=>{}});
      Object.defineProperty(record.controller,'state',{get:()=>({phase:'delivered'}),set:()=>{}});
      const cancel=record.controller.cancel.bind(record.controller),reset=record.recovery.reset.bind(record.recovery);
      record.controller.cancel=()=>{counts.cancel++;return cancel();};
      record.recovery.reset=()=>{counts.reset++;return reset();};
      configureProjectPlanContinuation(record,{store,authorization:auth,inspectPlan:async()=>structuredClone(plan),onChange:()=>{}});
    }});
  const pages=createBackendPages({sessions,store,host,setup:{ready:async()=>({ready:true})}});
  t.after(()=>sessions.dispose());
  const observe=(record,seq,fields,documentId='fixture-document-1')=>sources.get(host.view(record.key).webContents).accept({version:1,documentId,seq,
    state:{url:project.chatUrl,editorAvailable:true,editorRevision:1,writable:true,busy:false,sendEnabled:true,
      draftRevision:0,userMessageCount:seq,userMessagesRevision:seq,lastMessageRole:'assistant',userTurnId:'aa',draftPresent:false,...fields}});
  return {electron,host,sessions,pages,project,plan,sends,counts,observe,setResult:fn=>{respond=fn;}};
}

test('fixture chain continues without viewers; detach and reconnect never reload, cancel or reset',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wp-backend-pages-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const f=backendFixture(t,root);
  const key=await f.pages.select(f.project);
  const record=f.sessions.find(f.project),contents=f.host.view(key).webContents;
  assert.equal(record.ready,true);assert.equal(f.sessions.visible,record);
  assert.deepEqual(contents.loads,[f.project.chatUrl]);
  // Navigation during selection cancels as before; only later calls are counted.
  Object.assign(f.counts,{cancel:0,reset:0});
  const viewer=f.pages.attachViewer(key);
  assert.equal(f.pages.list()[0].viewers,1);
  assert.equal(f.pages.detachViewer(viewer),true);
  assert.deepEqual(f.counts,{cancel:0,reset:0},'detach is not a page or automation event');
  assert.equal(f.pages.list()[0].viewers,0);assert.equal(contents.isDestroyed(),false);
  // Step 1: the delivered chat pauses; PlanContinuation continues with nobody watching.
  f.observe(record,1,{turnId:'a1'});
  await until(()=>f.sends.length===1,'first continuation');
  f.observe(record,2,{turnId:'a1',busy:true,lastMessageRole:'user'});
  f.plan.planView.tasks[1].status='done';f.plan.planRevision=2;
  record.primaryAutomation.changed();await settle();
  f.observe(record,3,{turnId:'b2'});
  await until(()=>f.sends.length===2,'second continuation');
  assert.deepEqual(f.sends,['Продолжай','Продолжай']);
  assert.equal(f.pages.list()[0].viewers,0);
  // Reconnect addresses the same page and identity; it is not a new selection.
  const again=f.pages.attachViewer(key);
  assert.equal(f.host.view(key).webContents,contents);assert.equal(f.sessions.find(f.project),record);
  assert.deepEqual(contents.loads,[f.project.chatUrl]);
  assert.deepEqual(record.identity,{workspace:f.project.workspace,sessionId:'chat-a',assignmentId:null,taskId:null});
  assert.deepEqual(f.counts,{cancel:0,reset:0});
  f.pages.detachViewer(again);
  assert.equal(f.pages.list()[0].crashed,false);
});

test('page crash is distinct from detach and an unknown Send is not repeated after reload',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wp-backend-crash-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const f=backendFixture(t,root);
  const key=await f.pages.select(f.project);
  const record=f.sessions.find(f.project),contents=f.host.view(key).webContents,events=[];
  record.browser.subscribe(event=>events.push(event.type));
  const viewer=f.pages.attachViewer(key);f.pages.detachViewer(viewer);
  assert.deepEqual(events,[],'viewer changes do not emit page events');
  f.setResult(()=>({state:'unknown'}));
  f.observe(record,1,{turnId:'c3'});
  await until(()=>f.sends.length===1,'uncertain continuation');
  contents.emit('render-process-gone');
  assert.deepEqual(events,['crashed']);
  const [entry]=f.pages.list();
  assert.equal(entry.crashed,true);assert.equal(entry.ready,false);assert.equal(entry.error.code,'RENDER_PROCESS_GONE');
  assert.equal(entry.viewers,0);assert.equal(contents.isDestroyed(),false,'a crash does not release the page');
  // Explicit reopen of the same page: the same pause stays consumed.
  f.setResult(()=>({state:'sent'}));
  await f.sessions.navigate(record,f.project.chatUrl,{reload:true});record.ready=true;
  assert.equal(f.pages.list()[0].crashed,false);
  const accepted=f.observe(record,1,{turnId:'c3'},'fixture-document-2');
  assert.equal(accepted.accepted,true,'the reopened document is observed');
  await settle(80);
  assert.equal(record.primaryAutomation.flow.view().reason,'SEND_UNKNOWN');
  assert.deepEqual(f.sends,['Продолжай'],'UNKNOWN is never resent');
});

test('a page whose renderer died is reloaded at its own address, keeps readiness and never resends',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wp-backend-recover-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const f=backendFixture(t,root,{recoverCrashed:true});
  const key=await f.pages.select(f.project);
  const record=f.sessions.find(f.project),contents=f.host.view(key).webContents,events=[];
  record.browser.subscribe(event=>events.push(event.type==='crashed'?'crashed:'+event.recovering+':'+event.reason:event.type));
  f.setResult(()=>({state:'unknown'}));
  f.observe(record,1,{turnId:'r1'});
  await until(()=>f.sends.length===1,'uncertain continuation');
  contents.emit('render-process-gone',{},{reason:'killed',exitCode:15});
  assert.equal(f.pages.list()[0].crashed,true);assert.equal(record.ready,false);
  await until(()=>contents.reloads===1&&!f.pages.list()[0].crashed,'automatic reload');
  assert.deepEqual(contents.loads,[f.project.chatUrl],'the same document address is reloaded, nothing else is opened');
  assert.equal(record.ready,true,'readiness confirmed before the crash is kept');
  assert.ok(events.includes('crashed:true:killed'));
  f.setResult(()=>({state:'sent'}));
  f.observe(record,1,{turnId:'r1'},'fixture-document-2');
  await settle(80);
  assert.deepEqual(f.sends,['Продолжай'],'UNKNOWN is never resent after recovery');
  // Recovery is bounded: three reloads per window, then the page stays closed.
  for(let i=0;i<3;i++){contents.emit('render-process-gone',{},{reason:'crashed',exitCode:1});await settle(30);}
  assert.equal(contents.reloads,3);
  assert.equal(f.pages.list()[0].crashed,true,'the fourth loss in the window is not reloaded');
  assert.ok(events.includes('crashed:false:crashed'));
});

test('Electron backend owns the restored session page: viewer loss, reconnect and crash',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:60000},async t=>{
  const {spawn,execFileSync}=await import('node:child_process');
  const readline=await import('node:readline');
  const {fileURLToPath}=await import('node:url');
  const {WorkspaceSessions}=await import('../src/control/sessions/workspace-session.mjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wp-backend-browser-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const workspace=path.join(root,'project');
  await fs.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});
  await fs.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fs.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
  await fs.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fs.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'fixture-project',project_name:'Fixture',
      plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
      tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  const store=new WorkspaceSessions(path.join(root,'workspaces.json'));
  const project=await store.select(workspace);
  const chatUrl='https://chatgpt.com/c/backend-fixture-chat';
  await store.bindChat(project.workspace,project.sessionId,chatUrl);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout});
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);}catch{}});
      backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('backend startup timeout: '+errors)),25000);}),
  ]).finally(()=>clearTimeout(deadline));
  const call=async(route,{method='GET',body}={})=>{
    const response=await fetch(`http://127.0.0.1:${ready.port}${route}`,{method,
      headers:{authorization:'Bearer '+ready.token,...body?{'content-type':'application/json'}:{}},body:body&&JSON.stringify(body)});
    assert.equal(response.status,200,route);return response.json();
  };
  const state=()=>call('/v1/browser/fixture-state');
  let before;
  for(let attempt=0;attempt<100;attempt++){before=await state();if(before.documentId&&before.page)break;await settle(50);}
  assert.equal(before.selected,true);assert.equal(before.workspace,project.workspace);
  assert.equal(before.sessionId,project.sessionId);assert.equal(before.url,chatUrl);
  assert.ok(before.documentId,'staged ChatGPT observer reports the backend page');
  assert.equal(before.viewers,0);assert.equal(before.crashed,false);
  const {viewerId,key}=await call('/v1/fixture/viewers',{method:'POST'});
  assert.equal(key,before.key);assert.equal((await state()).viewers,1);
  assert.deepEqual(await call('/v1/fixture/viewers/detach',{method:'POST',body:{viewerId}}),{detached:true});
  await settle(250);
  const after=await state();
  assert.equal(after.viewers,0);assert.equal(after.webContentsId,before.webContentsId);
  assert.equal(after.page.bootId,before.page.bootId,'no reload after the last viewer left');
  assert.ok(after.page.ticks>before.page.ticks,'the page keeps running without viewers');
  assert.equal(after.documentId,before.documentId);assert.equal(after.epoch,before.epoch);
  const again=await call('/v1/fixture/viewers',{method:'POST'});
  const reconnected=await state();
  assert.equal(reconnected.page.bootId,before.page.bootId);assert.equal(reconnected.viewers,1);
  await call('/v1/fixture/viewers/detach',{method:'POST',body:{viewerId:again.viewerId}});
  await call('/v1/fixture/crash',{method:'POST'});
  let crashed;
  for(let attempt=0;attempt<100;attempt++){crashed=await state();if(crashed.crashed)break;await settle(50);}
  assert.equal(crashed.crashed,true);assert.equal(crashed.error.code,'RENDER_PROCESS_GONE');
  assert.equal(crashed.ready,false);assert.equal(crashed.webContentsId,before.webContentsId,'a crash does not release the page');
  assert.ok(crashed.epoch>before.epoch);
  // The backend reloads the same page by itself; the crash notice disappears.
  let recovered;
  for(let attempt=0;attempt<200;attempt++){recovered=await state();if(!recovered.crashed&&recovered.page&&recovered.page.bootId!==before.page.bootId)break;await settle(50);}
  assert.equal(recovered.crashed,false,'the page is reloaded after its renderer died');
  assert.equal(recovered.webContentsId,before.webContentsId);assert.equal(recovered.url,chatUrl);
  assert.notEqual(recovered.page.bootId,before.page.bootId);assert.equal(recovered.error,null);
  const journal=await fs.readFile(path.join(root,'diagnostics','backend-events.jsonl'),'utf8');
  assert.match(journal,/"event":"render-process-gone"/);assert.match(journal,/"event":"backend-start"/);
  assert.equal(journal.includes(ready.token),false,'the journal never holds the token');
  assert.equal(journal.includes('chatgpt.com'),false,'the journal holds no page addresses');
  backend.stdin.end('stop\n');
  const code=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not stop')),10000);
    backend.once('exit',value=>{clearTimeout(timeout);resolve(value);});});
  assert.equal(code,0);
  await assert.rejects(fs.access(path.join(root,'.backend-host','owner.json')));
});

test('view mode: a page moves between its hidden host and a window, one page per window, offscreen pages never attach',()=>{
  const electron=fakeElectron();
  class View {
    constructor(container){this.parent=container;}
    addChildView(view){view.owner?.children.delete(view);this.children.add(view);view.owner=this;}
  }
  class BaseWindow {
    constructor(options){this.options=options;this.destroyed=false;this.size=[options.width,options.height];this.contentView=Object.assign(new View(),{children:new Set()});}
    getContentSize(){return this.size;} setContentSize(w,h){this.size=[w,h];}
    isDestroyed(){return this.destroyed;} destroy(){this.destroyed=true;}
  }
  class WebContentsView {
    constructor({webPreferences}){this.webPreferences=webPreferences;this.bounds=null;
      this.webContents=new electron.BrowserWindow({webPreferences}).webContents;this.webContents.close=()=>{this.webContents.destroyed=true;};}
    setBounds(bounds){this.bounds=bounds;} getBounds(){return this.bounds;}
  }
  const host=new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,BaseWindow,WebContentsView,nativeImage:{createFromBuffer:()=>null},
    screen:electron.screen,partition:'persist:workflow-pilot-chatgpt',preload:'/fixture/preload.cjs',pageMode:'view'});
  const a=host.create('page-a'),b=host.create('page-b');
  assert.equal(host.view('page-a').webContents,a);
  assert.equal(host.attached('page-a'),null,'a new page waits in its hidden host');
  const win=Object.assign(new View(),{children:new Set()});
  host.attach('page-a',win,{x:300,y:0,width:900,height:700});
  assert.equal(host.attached('page-a'),win);assert.equal(win.children.size,1);
  host.attach('page-b',win,{x:300,y:0,width:900,height:700});
  assert.equal(host.attached('page-a'),null,'showing another page returns the first to its host');
  assert.equal(win.children.size,1);
  host.detach('page-b');assert.equal(win.children.size,0);assert.equal(host.attached('page-b'),null);
  host.close('page-a');assert.equal(a.isDestroyed(),true);
  assert.throws(()=>host.attach('page-a',win,{x:0,y:0,width:1,height:1}),{code:'SESSION_RUNTIME_RELEASED'});
  assert.throws(()=>new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,screen:electron.screen,partition:'p',pageMode:'view'}),
    {code:'BROWSER_PAGE_MODE_INVALID'},'view mode needs views and image decoding');
  const offscreen=hostOf(electron);offscreen.create('page-c');
  assert.throws(()=>offscreen.attach('page-c',win,{x:0,y:0,width:1,height:1}),{code:'BROWSER_PAGE_MODE_INVALID'});
});
