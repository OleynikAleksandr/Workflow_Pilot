import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { SessionRuntimes,sessionStore,sessionRuntimeKey } from '../src/session-runtime.mjs';
import { ExecutionFacade } from '../src/execution/facade.mjs';
import { DesktopBrowserHost } from '../src/frontend/desktop/browser-host.mjs';

function fixture(t) {
  let selected='a',connections=0,disconnections=0;
  const composers=new Map(),sources=new Map(),views=new Map();let container;
  const projects={a:{workspace:'/project',sessionId:'a',projectId:'p',chatUrl:'https://chatgpt.com/c/aaaaaaaa'},
    b:{workspace:'/project',sessionId:'b',projectId:'p',chatUrl:'https://chatgpt.com/c/bbbbbbbb'}};
  const store={project:(workspace,id)=>workspace==='/project'?projects[id??selected]:null,selected:()=>projects[selected],
    inspect:async()=>({projectId:'p'}),recordAgentTime:async()=>{},bindChat:async(w,id,url)=>{projects[id].chatUrl=url;return projects[id];},
    updateSession:async(w,id,patch)=>{Object.assign(projects[id],patch);return projects[id];}};
  const createView=()=>{
    const contents=new EventEmitter();contents.url='';contents.destroyed=false;contents.loads=[];
    contents.getURL=()=>contents.url;contents.isDestroyed=()=>contents.destroyed;contents.close=()=>{contents.destroyed=true;};
    contents.loadURL=async url=>{contents.loads.push(url);contents.emit('did-start-navigation',{isMainFrame:true,isSameDocument:false});contents.url=url;contents.emit('did-finish-load');};
    return {webContents:contents,setVisible(value){this.visible=value;}};
  };
  const desktop=new DesktopBrowserHost(createView),create=desktop.create.bind(desktop);
  desktop.create=id=>{const contents=create(id);views.set(id,desktop.view(id));return contents;};
  const execution=new ExecutionFacade();
  execution.attachBrowser({host:desktop,ipc:{},
    createComposer:contents=>{const composer={inFlight:false,inspect:async()=>({login:true})};composers.set(contents,composer);return composer;},
    connect:(contents,_ipc,source)=>{sources.set(contents,source);connections++;return()=>disconnections++;}});
  const manager=new SessionRuntimes({store,runtime:()=>({}),execution,
    presentation:{show:id=>desktop.show(id,container),hide:()=>desktop.hide()}});
  t.after(()=>manager.dispose());
  const host=()=>({children:new Set(),addChildView(view){this.children.add(view);},removeChildView(view){this.children.delete(view);}});
  return {manager,projects,store,host,view:record=>views.get(record.key),composers,sources,
    show:(record,target)=>{container=target;manager.show(record);},
    select:id=>{selected=id;},counts:()=>({connections,disconnections})};
}

test('independent sessions keep pages, controllers and timers when switching or moving their presentation',async t=>{
  const f=fixture(t),a=f.manager.ensure(f.projects.a),b=f.manager.ensure(f.projects.b),host=f.host(),otherHost=f.host();
  assert.notEqual(f.view(a),f.view(b));assert.notEqual(a.controller,b.controller);assert.notEqual(a.composer,b.composer);
  assert.equal(a.view,undefined);assert.equal(a.composer.contents,undefined);
  assert.notEqual(a.pageState,b.pageState);assert.notEqual(a.recovery,b.recovery);assert.notEqual(a.timer,b.timer);
  assert.equal(f.manager.ensure(f.projects.a),a);assert.equal(f.counts().connections,2);
  await f.manager.navigate(a,f.projects.a.chatUrl);await f.manager.navigate(b,f.projects.b.chatUrl);
  a.controller.attach(f.projects.a);const generation=a.controller.generation;
  a.timer.observe(a.identity,true);const timer=a.timer.active;
  f.show(a,host);f.select('b');f.show(b,host);
  assert.equal(a.controller.current(generation),true,'background controller remains bound to its session');
  assert.equal(a.timer.active,timer);assert.equal(f.view(a).webContents.destroyed,false);
  assert.equal(a.composer.getURL(),f.projects.a.chatUrl);assert.equal(f.view(a).webContents.loads.length,1);
  f.show(a,otherHost);
  assert.equal(host.children.size,0);assert.equal(otherHost.children.has(f.view(a)),true);
  assert.equal(a.controller.generation,generation);assert.equal(a.timer.active,timer);
  await f.manager.navigate(a,f.projects.a.chatUrl);
  assert.equal(f.view(a).webContents.loads.length,1,'showing an existing chat does not navigate or resend');
  f.manager.hide();assert.equal(f.view(a).webContents.destroyed,false);assert.equal(a.controller.current(generation),true);
});

test('explicit release refuses active work and cleans only that session',t=>{
  const f=fixture(t),a=f.manager.ensure(f.projects.a),b=f.manager.ensure(f.projects.b);
  const contents=f.view(a).webContents;
  f.composers.get(contents).inFlight=true;assert.equal(f.manager.release(a),false);
  f.composers.get(contents).inFlight=false;assert.equal(f.manager.release(a),true);
  assert.equal(contents.destroyed,true);assert.equal(f.view(b).webContents.destroyed,false);
  assert.equal(f.sources.get(contents).listeners.size,0);assert.equal(contents.listenerCount('did-finish-load'),0);
  assert.deepEqual(f.counts(),{connections:2,disconnections:1});
  assert.throws(()=>f.show(a,f.host()),/RELEASED/);assert.equal(f.manager.release(a),false);
});

test('session-scoped store and operation keys preserve worktree/task address independently of selection',async t=>{
  const f=fixture(t),identity={workspace:'/project',sessionId:'a'},own=sessionStore(f.store,identity);
  f.select('b');await own.updateSession('/project','a',{attempt:{state:'sent'}});
  assert.equal(f.projects.a.attempt.state,'sent');assert.equal(f.projects.b.attempt,undefined);
  assert.equal(own.selected().sessionId,'a');assert.equal(own.project('/project').sessionId,'a');
  assert.throws(()=>own.updateSession('/project','b',{}),{code:'SESSION_CHANGED'});
  assert.throws(()=>own.project('/other'),{code:'SESSION_CHANGED'});
  assert.notEqual(sessionRuntimeKey({...identity,taskId:'T1'}),sessionRuntimeKey({...identity,taskId:'T2'}));
  assert.notEqual(sessionRuntimeKey(identity),sessionRuntimeKey({...identity,workspace:'/worktree'}));
});

test('late navigation completion cannot revive a released session',async t=>{
  const f=fixture(t),a=f.manager.ensure(f.projects.a);let finish;
  f.view(a).webContents.loadURL=()=>new Promise(resolve=>{finish=resolve;});
  const pending=f.manager.navigate(a,f.projects.a.chatUrl);f.manager.release(a,{force:true});finish();
  assert.equal(await pending,null);assert.equal(a.controller.active,null);assert.equal(f.view(a).webContents.destroyed,true);
});

test('Execution snapshots are detached and release settles all page waits and subscriptions',async t=>{
  const f=fixture(t),a=f.manager.ensure(f.projects.a),contents=f.view(a).webContents;
  const source=f.sources.get(contents);
  const observation={version:1,documentId:'document-1234',seq:1,state:{
    url:f.projects.a.chatUrl,editorAvailable:true,editorRevision:1,writable:true,busy:false,sendEnabled:true,
    draftRevision:0,userMessageCount:0,userMessagesRevision:0}};
  source.accept(observation);
  const copy=a.pageState.current;copy.state.url='https://foreign.invalid/';
  assert.equal(a.pageState.current.state.url,f.projects.a.chatUrl);
  const off=a.pageState.subscribe(event=>{if(event.state)event.state.url='mutated';});
  source.accept({...observation,seq:2,state:{...observation.state,draftRevision:1}});
  assert.equal(a.pageState.current.state.url,f.projects.a.chatUrl);
  let lifecycle;
  a.browser.subscribe(event=>{lifecycle=event;event.snapshot.loading='mutated';});
  await a.browser.navigate(f.projects.a.chatUrl);
  assert.doesNotThrow(()=>JSON.stringify(lifecycle));assert.equal(a.browser.snapshot().loading,false);
  const pending=a.pageState.waitForChange(a.pageState.version,{timeoutMs:60000});
  f.manager.release(a,{force:true});
  assert.equal((await pending).cancelled,true);assert.equal(source.listeners.size,0);off();
  await assert.rejects(a.composer.inspect(),{code:'SESSION_RUNTIME_RELEASED'});
});

test('renderer loss cancels only its controller and a replacement gets a fresh page',t=>{
  const f=fixture(t),a=f.manager.ensure(f.projects.a),b=f.manager.ensure(f.projects.b);
  a.ready=true;a.controller.attach(f.projects.a);b.controller.attach(f.projects.b);
  const bGeneration=b.controller.generation;
  f.view(a).webContents.emit('render-process-gone');
  assert.equal(a.ready,false);assert.equal(a.controller.active,null);
  assert.equal(a.error.code,'RENDER_PROCESS_GONE');assert.equal(b.controller.current(bGeneration),true);
  f.manager.release(a,{force:true});
  const replacement=f.manager.ensure(f.projects.a);
  assert.notEqual(replacement.browser,a.browser);assert.equal(replacement.browser.snapshot().disposed,false);
  assert.equal(a.browser.release(),false,'stale release cannot close the replacement');
});
