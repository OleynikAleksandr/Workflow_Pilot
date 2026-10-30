import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { SessionRuntimes,sessionStore,sessionRuntimeKey } from '../src/control/sessions/service.mjs';
import { ExecutionFacade } from '../src/execution/facade.mjs';
import { DesktopBrowserHost } from '../src/frontend/desktop/browser-host.mjs';
import { BrowserSessions } from '../src/execution/browser/session-runtime.mjs';

function navigationFixture(t,options={}) {
  const contents=new EventEmitter();Object.assign(contents,{url:'https://chatgpt.com/',loads:[],reloads:0,
    getURL:()=>contents.url,isDestroyed:()=>false,
    loadURL:async url=>{contents.loads.push(url);contents.emit('did-start-navigation',{url,isMainFrame:true,isSameDocument:false});
      contents.url=url;contents.emit('did-navigate',{},url,200,'OK');contents.emit('did-finish-load');},
    reload:()=>{contents.reloads++;contents.emit('did-start-navigation',{url:contents.url,isMainFrame:true,isSameDocument:false});contents.emit('did-finish-load');}});
  const manager=new BrowserSessions({host:{create:()=>contents,close:()=>{}},ipc:{},connect:()=>()=>{},
    createComposer:()=>({inFlight:false}),recoveryDelayMs:5,...options});
  const port=manager.open('navigation');t.after(()=>manager.dispose());
  return {manager,port,contents};
}

test('navigation waits for the extension before the first document and before dispatching q',async t=>{
  let ready;const waiting=new Promise(resolve=>{ready=resolve;}),prepared=[];
  const {port,contents}=navigationFixture(t,{prepareNavigation:async url=>{prepared.push(url);await waiting;}});
  contents.url='about:blank';const load=port.navigate('https://chatgpt.com/');
  assert.equal(contents.loads.length,0);ready();await load;assert.deepEqual(contents.loads,['https://chatgpt.com/']);
  await port.composer.startChat({url:'https://chatgpt.com/?q=one',navigationToken:'prepared'});
  assert.deepEqual(prepared,['https://chatgpt.com/','https://chatgpt.com/?q=one']);assert.equal(contents.loads.length,2);
});

test('extension error leaves bootstrap token unused and a later successful preparation can dispatch it once',async t=>{
  let failure=true;const error=Object.assign(new Error('Extension unavailable'),{code:'CHATGPT_SEARCH_EXTENSION_DOWNLOAD'});
  const {port,contents}=navigationFixture(t,{prepareNavigation:async()=>{if(failure)throw error;}});
  const args={url:'https://chatgpt.com/?q=one',navigationToken:'retry-preparation'};
  await assert.rejects(port.composer.startChat(args),{code:error.code});assert.equal(contents.loads.length,0);
  assert.equal(port.snapshot().epoch,0);assert.equal(port.snapshot().navigationOwner,null);
  failure=false;await port.composer.startChat(args);assert.deepEqual(contents.loads,[args.url]);
  await assert.rejects(port.composer.startChat(args),{code:'BOOTSTRAP_ALREADY_DISPATCHED'});
});

test('cancel, release, user interaction and main-frame navigation while preparing never dispatch the saved URL',async t=>{
  for(const reason of ['cancel','release','key','mouse','navigation']){
    let resolve;const ready=new Promise(done=>{resolve=done;});let current=true;
    const {port,contents}=navigationFixture(t,{prepareNavigation:()=>ready});
    const sending=port.composer.startChat({url:'https://chatgpt.com/?q=one',navigationToken:'pending',canContinue:()=>current});
    if(reason==='cancel')current=false;
    if(reason==='release')port.release();
    if(reason==='key')contents.emit('before-input-event',{}, {type:'keyDown',key:'x'});
    if(reason==='mouse')contents.emit('before-mouse-event',{}, {type:'mouseDown'});
    if(reason==='navigation')contents.emit('did-navigate-in-page',{},'https://chatgpt.com/c/manual-chat',true);
    resolve();assert.equal(await sending,null,reason);assert.equal(contents.loads.length,0,reason);
  }
});

test('a newer navigation wins during preparation, while iframe navigation cannot cancel it',async t=>{
  let first;let calls=0;
  const {port,contents}=navigationFixture(t,{prepareNavigation:()=>++calls===1?new Promise(resolve=>{first=resolve;}):Promise.resolve()});
  const old=port.navigate('https://chatgpt.com/c/old-chat');
  await port.navigate('https://chatgpt.com/c/new-chat');first();assert.equal(await old,null);
  assert.deepEqual(contents.loads,['https://chatgpt.com/c/new-chat']);
  let finish;const other=navigationFixture(t,{prepareNavigation:()=>new Promise(resolve=>{finish=resolve;})});
  const q=other.port.composer.startChat({url:'https://chatgpt.com/?q=one',navigationToken:'iframe-safe'});
  other.contents.emit('did-navigate-in-page',{},'https://example.com/iframe',false);finish();await q;
  assert.equal(other.contents.loads.length,1);
});

test('navigation port preserves transient redirect URLs, frame identity and one sequence for all subscribers',async t=>{
  const {port,contents}=navigationFixture(t),events=[],other=[];
  port.subscribe(event=>{events.push(structuredClone(event));event.url='changed';});port.subscribe(event=>other.push(event));
  await port.composer.startChat({url:'https://chatgpt.com/?q=short',navigationToken:'request-one'});
  contents.url='https://chatgpt.com/c/final-chat';
  contents.emit('did-redirect-navigation',{url:'https://chatgpt.com/work/',isMainFrame:true});
  contents.emit('did-navigate-in-page',{},'https://chatgpt.com/c/iframe-chat',false);
  contents.emit('did-navigate-in-page',{},contents.url,true);
  const transitions=events.filter(e=>e.type==='navigated');
  assert.deepEqual(transitions.map(e=>[e.navigationKind,e.url,e.isMainFrame]),[
    ['navigate','https://chatgpt.com/?q=short',true],['redirect','https://chatgpt.com/work/',true],
    ['in-page','https://chatgpt.com/c/iframe-chat',false],['in-page','https://chatgpt.com/c/final-chat',true]]);
  assert.deepEqual(events.map(e=>e.navigationSequence),other.map(e=>e.navigationSequence));
  const sequenced=events.filter(e=>e.navigationSequence!==undefined);
  assert.equal(new Set(sequenced.map(e=>e.navigationSequence)).size,sequenced.length);
  assert.ok(transitions.every(e=>e.navigationOwner==='request-one'));
  assert.ok(other.every(e=>e.url!=='changed'));
  const before=events.length,incarnation=port.snapshot().incarnation;port.release();
  contents.emit('did-navigate-in-page',{},'https://chatgpt.com/c/late-chat',true);
  assert.equal(events.length,before);assert.notEqual(navigationFixture(t).port.snapshot().incarnation,incarnation);
});

test('only an admitted bootstrap can load q once; refresh checks current and target including empty q',async t=>{
  for(const query of ['q=command','q=']) {
    const {port,contents}=navigationFixture(t),url='https://chatgpt.com/?'+query;
    await port.composer.startChat({url,navigationToken:'once'});
    assert.deepEqual(contents.loads,[url]);
    await assert.rejects(port.composer.startChat({url,navigationToken:'once'}),{code:'BOOTSTRAP_ALREADY_DISPATCHED'});
    await port.navigate('https://chatgpt.com/c/saved-chat',{reload:true});
    assert.equal(contents.loads.at(-1),'https://chatgpt.com/');
    await port.navigate(url,{reload:true});assert.equal(contents.loads.at(-1),'https://chatgpt.com/');
    await port.navigate(url);assert.equal(contents.loads.filter(value=>value===url).length,1);
    assert.equal(contents.reloads,0);
  }
});

test('crash recovery never reloads q or uses a lost query URL, independently of control attempts',async t=>{
  for(const loseUrl of [false,true]) {
    const {port,contents}=navigationFixture(t,{recoverCrashed:true});
    await port.composer.startChat({url:'https://chatgpt.com/?q=command',navigationToken:'once'});
    if(loseUrl)contents.url='';
    contents.emit('render-process-gone',{}, {reason:'killed'});
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.equal(contents.reloads,0);assert.equal(contents.loads.length,2);
    assert.equal(contents.loads.at(-1),'https://chatgpt.com/');assert.equal(port.snapshot().navigationOwner,null);
  }
});

test('native refresh shortcuts on a query page are routed through the same safe refresh',async t=>{
  for(const input of [{key:'r',meta:true},{key:'r',control:true},{key:'F5'}]) {
    const {port,contents}=navigationFixture(t);let prevented=false;
    await port.composer.startChat({url:'https://chatgpt.com/?q=command',navigationToken:'once'});
    contents.emit('before-input-event',{preventDefault:()=>{prevented=true;}},{type:'keyDown',...input});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(prevented,true);assert.equal(contents.loads.at(-1),'https://chatgpt.com/');assert.equal(contents.reloads,0);
  }
});

test('explicit navigation wins a pending crash recovery and user input ends bootstrap ownership',async t=>{
  const {port,contents}=navigationFixture(t,{recoverCrashed:true});
  await port.composer.startChat({url:'https://chatgpt.com/?q=command',navigationToken:'once'});
  contents.emit('before-mouse-event',{}, {type:'mouseMove'});assert.equal(port.snapshot().navigationOwner,'once');
  contents.emit('before-input-event',{}, {type:'rawKeyDown'});assert.equal(port.snapshot().navigationOwner,null);
  contents.emit('render-process-gone',{}, {reason:'killed'});
  await port.navigate('https://chatgpt.com/c/saved-chat');await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(contents.reloads,0);assert.equal(contents.loads.at(-1),'https://chatgpt.com/c/saved-chat');
});

test('bootstrap load errors and diagnostics never expose q or its ticket',async t=>{
  const {port,contents}=navigationFixture(t),secret='secret-ticket-value',diagnostics=[],events=[];
  contents.loadURL=async()=>{throw Object.assign(Error('net failed https://chatgpt.com/?q='+secret),{code:'ERR_FAILED'});};
  port.setDiagnostic(value=>diagnostics.push(value));port.subscribe(event=>{if(event.error)events.push(event.error);});
  let failure;try{await port.composer.startChat({url:'https://chatgpt.com/?q='+secret,navigationToken:'once'});}catch(error){failure=error;}
  assert.equal(failure.code,'ERR_FAILED');assert.ok(!String(failure).includes(secret));
  assert.ok(!JSON.stringify([...events,...diagnostics]).includes(secret));
  assert.deepEqual(diagnostics[0].url.queryKeys,['q']);
});

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

test('restart without a saved conversation address reports the lost page and never replays Send',async t=>{
  for(const state of ['sending','sent','unknown']) {
    const f=fixture(t);
    f.projects.a.chatUrl=null;f.projects.a.attempt={state,sendStartedAtMs:1};
    const record=f.manager.ensure(f.projects.a);record.ready=true;
    await f.manager.navigate(record,'https://chatgpt.com/');
    f.manager.tick(record);f.manager.tick(record);
    assert.equal(record.controller.state.phase,'send-unknown');
    assert.equal(record.controller.state.error.code,'SESSION_CHAT_ADDRESS_UNKNOWN');
    assert.equal(f.projects.a.attempt.state,state,'unknown outcomes are not changed to success or retried');
    assert.equal(record.controller.active,null);
  }
});

test('background startup observation stops at dispatch and cannot revive a cancelled generation',async t=>{
  const f=fixture(t);Object.assign(f.projects.a,{chatUrl:null,assignmentId:'a1'});
  const a=f.manager.ensure(f.projects.a);a.ready=true;a.controller.attach(f.projects.a);
  let finish,reads=0,ticks=0;
  f.composers.get(f.view(a).webContents).observeSnapshot=()=>{reads++;return new Promise(resolve=>{finish=resolve;});};
  f.manager.tick=()=>ticks++;
  a.controller.emit({phase:'waiting-composer'});
  await new Promise(resolve=>setTimeout(resolve,550));assert.equal(reads,1);
  a.controller.cancel();finish({state:{editorAvailable:true}});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(ticks,0);
  for(const state of ['sending','sent','unknown','acknowledged']){
    f.projects.a.attempt={state};a.controller.emit({phase:'waiting-composer'});
    assert.equal(a.startupObservation.timer,null);
  }
  f.projects.a.attempt=null;a.controller.emit({phase:'waiting-composer'});
  f.manager.release(a,{force:true});
  await new Promise(resolve=>setTimeout(resolve,550));assert.equal(reads,1);
});

test('ordinary orchestrator readiness is reconciled without selecting its card',async t=>{
  const f=fixture(t);Object.assign(f.projects.a,{chatUrl:null});
  const a=f.manager.ensure(f.projects.a);a.ready=true;a.controller.attach(f.projects.a);
  let reads=0,ticks=0;
  f.composers.get(f.view(a).webContents).observeSnapshot=async()=>{reads++;return {version:1,documentId:'startup-doc-123',seq:1,
    state:{url:'https://chatgpt.com/',editorAvailable:true,writable:true,busy:false,sendEnabled:false,
      editorRevision:1,draftRevision:0,userMessageCount:0,userMessagesRevision:0}};};
  f.manager.tick=()=>{ticks++;a.controller.emit({phase:'preparing-message'});};
  a.controller.emit({phase:'waiting-login'});
  await new Promise(resolve=>setTimeout(resolve,550));
  assert.equal(reads,1);assert.ok(ticks>=1);assert.equal(f.manager.visible,null);
  f.projects.a.preparationPaused=true;a.controller.emit({phase:'waiting-login'});
  assert.equal(a.startupObservation.timer,null);
});

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

test('owned manual Send checkpoints before its permanent address and never reopens the root while the save waits',async()=>{
  let saved={workspace:'/manual',sessionId:'manual',chatUrl:null,attempt:null},release,tail=Promise.resolve();
  const gate=new Promise(r=>release=r),errors=[];
  const store={project:()=>structuredClone(saved),
    updateSession:(_w,_s,patch)=>tail=tail.then(async()=>{await gate;Object.assign(saved,patch);return structuredClone(saved);}),
    bindChat:(_w,_s,url)=>tail=tail.then(()=>{saved.chatUrl=url;return structuredClone(saved);})};
  const phases=[],record={project:store.project,epoch:7,ready:true,disposed:false,loading:false,
    pageState:{current:{documentId:'own-document'}},controller:{cancel:()=>{},emit:s=>phases.push(s.phase),tick:()=>{throw Error('manual Send restarted bootstrap');}}};
  const sessions=new SessionRuntimes({store,runtime:()=>({}),onError:(_r,e)=>errors.push(e)});
  const state={url:'https://chatgpt.com/',userMessageCount:0,manualSendRevision:0};
  assert.equal(sessions.observeManualConversation(state,record),false);
  assert.equal(sessions.observeManualConversation({...state,url:'https://chatgpt.com/c/WEB:12345678-1234-1234-1234-123456789abc',
    userMessageCount:1,manualSendRevision:1},record),true);
  assert.equal(record.manualStartObserved,true);assert.equal(saved.manualStart,undefined,'disk save has not completed');
  sessions.tick(record);assert.equal(phases.at(-1),'waiting-manual-chat');
  sessions.tick=()=>{};
  assert.equal(sessions.observeManualConversation({...state,url:'https://chatgpt.com/c/manual1234',userMessageCount:1,manualSendRevision:1},record),true);
  release();await tail;await record.manualDocumentOwner.checkpoint;
  assert.equal(saved.manualStart,true);assert.equal(saved.chatUrl,'https://chatgpt.com/c/manual1234');assert.deepEqual(errors,[]);
});

test('safeReload opens only the saved chat address, never q, and records the document it replaced',async t=>{
  let source,now=5000;
  const {port,contents}=navigationFixture(t,{connect:(_contents,_ipc,pageSource)=>{source=pageSource;return ()=>{};},now:()=>now});
  const observe=documentId=>source.accept({version:1,documentId,seq:1,state:{url:'https://chatgpt.com/c/saved-chat-1',login:'signed-in',
    editorAvailable:true,editorRevision:1,writable:true,busy:false,sendEnabled:false,draftRevision:0,userMessageCount:0,userMessagesRevision:0}});
  await port.navigate('https://chatgpt.com/c/saved-chat-1');observe('document-first-1');
  assert.deepEqual(port.pageState.document,{id:'document-first-1',since:5000,reloadedFrom:null});
  for(const address of ['https://chatgpt.com/?q=repeat','https://example.com/c/saved-chat-1',null])
    assert.deepEqual(await port.safeReload(address),{reloaded:false,reason:'invalid-address'});
  const loads=contents.loads.length;now=9000;
  assert.deepEqual(await port.safeReload('https://chatgpt.com/c/saved-chat-1'),{reloaded:true,from:'document-first-1'});
  assert.deepEqual(contents.loads.slice(loads),['https://chatgpt.com/c/saved-chat-1']);
  assert.equal(contents.loads.some(url=>url.includes('?q=')),false);
  source.reset();observe('document-second-1');
  assert.deepEqual(port.pageState.document,{id:'document-second-1',since:9000,reloadedFrom:{documentId:'document-first-1',reason:'control',lineage:['document-first-1']}});
  // A second reload extends the lineage of documents connected by this page's own reloads.
  await port.safeReload('https://chatgpt.com/c/saved-chat-1');source.reset();observe('document-third-1');
  assert.deepEqual(port.pageState.document.reloadedFrom.lineage,['document-first-1','document-second-1']);
  // Any other navigation is not a reload of this page.
  source.reset();observe('document-other-1');assert.equal(port.pageState.document.reloadedFrom,null);
});

test('safeReload is refused during a send, a start navigation and a load',async t=>{
  const composer={inFlight:true};
  const {port,contents}=navigationFixture(t,{createComposer:()=>composer});
  assert.deepEqual(await port.safeReload('https://chatgpt.com/c/saved-chat-1'),{reloaded:false,reason:'composer-in-flight'});
  composer.inFlight=false;
  let release;const original=contents.loadURL;
  contents.loadURL=url=>new Promise(resolve=>{release=()=>resolve(original(url));});
  const starting=port.composer.startChat({url:'https://chatgpt.com/?q=start',navigationToken:'token-one'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(await port.safeReload('https://chatgpt.com/c/saved-chat-1'),{reloaded:false,reason:'startup-navigation'});
  release();await starting;
  const loading=port.navigate('https://chatgpt.com/c/saved-chat-2');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(await port.safeReload('https://chatgpt.com/c/saved-chat-2'),{reloaded:false,reason:'loading'});
  release();await loading;
});
