import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {execFileSync} from 'node:child_process';
import {BackendBrowserHost,ExecutionFacade} from '../src/execution/facade.mjs';
import {CommandService} from '../src/execution/commands/service.mjs';
import {initializeBackendServices} from '../src/backend/bootstrap.mjs';
import {configureBackendIdentity,claimBackendIdentity} from '../src/backend/identity.mjs';
import {startBackendPort} from '../src/backend/lifecycle.mjs';
import {createBackendEvents} from '../src/backend/events.mjs';
import {createBackendOperations,openOperationJournal,backendCatalog} from '../src/backend/operations.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';

const settle=(ms=20)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,description,timeoutMs=5000) {
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){if(await predicate())return;await settle(15);}
  assert.fail('Timed out: '+description);
}
function fakeElectron() {
  class BrowserWindow {
    constructor() {
      const contents=new EventEmitter();
      Object.assign(contents,{url:'',destroyed:false,getURL:()=>contents.url,isDestroyed:()=>contents.destroyed,
        setWindowOpenHandler(){},executeJavaScript:async()=>null,insertCSS:async()=>'css',removeInsertedCSS:async()=>{},
        loadURL:async url=>{contents.emit('did-start-navigation',{isMainFrame:true,isSameDocument:false});contents.url=url;contents.emit('did-finish-load');}});
      this.webContents=contents;
    }
    isDestroyed(){return this.webContents.destroyed;}
    destroy(){this.webContents.destroyed=true;}
  }
  return {BrowserWindow,screen:{getAllDisplays:()=>[{scaleFactor:2}]}};
}
async function projectFixture(root,name) {
  const workspace=path.join(root,name);
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});
  await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
  await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'fixture-'+name,project_name:name,
      plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
      tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  return workspace;
}
async function startBackend(t,root) {
  const mock={paths:{appData:root},getPath(key){return this.paths[key];},setPath(key,value){this.paths[key]=value;},setName(){}};
  const identity=configureBackendIdentity(mock,{testRoot:root}),claim=claimBackendIdentity(identity);
  const electron=fakeElectron();
  const host=new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,screen:electron.screen,partition:'persist:fixture',preload:'/fixture.cjs'});
  let services,port;
  try {
    services=await initializeBackendServices({dataDir:root,sourceDir:path.resolve('src'),resourcesDir:path.resolve('resources'),
      // Each in-process backend owns its workers, as one backend process does.
      execution:new ExecutionFacade({commands:new CommandService()}),diagnostics:false,browser:{host,ipc:{},connect:()=>()=>{},
        createComposer:()=>({inFlight:false,inspect:async()=>({login:true}),hasFilled:()=>false})}});
    port=await startBackendPort({identity,claim,services,host});
  }catch(error){await services?.dispose();claim.release();throw error;}
  const stop=async()=>{await port.stop();};
  t.after(stop);
  return {identity,claim,services,port:port.port,stop};
}
const clientOf=backend=>new BackendConnection({port:backend.port,token:backend.claim.token});
function raw(port,{method='GET',path:route='/v1/handshake',headers={},body}={}) {
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,method,path:route,headers},res=>{
      let data='';res.setEncoding('utf8');res.on('data',part=>{data+=part;});
      res.on('end',()=>resolve({status:res.statusCode,body:data?JSON.parse(data):null}));
    });
    req.on('error',reject);if(body!==undefined)req.write(body);req.end();
  });
}

test('loopback API refuses missing/wrong token, foreign Host and Origin, also for the event stream',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-auth-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const backend=await startBackend(t,root),auth={authorization:'Bearer '+backend.claim.token};
  assert.equal((await raw(backend.port)).status,403);
  assert.equal((await raw(backend.port,{headers:{authorization:'Bearer '+'x'.repeat(64)}})).status,403);
  assert.equal((await raw(backend.port,{headers:{...auth,host:'evil.example:'+backend.port}})).status,403);
  assert.equal((await raw(backend.port,{headers:{...auth,origin:'https://evil.example'}})).status,403);
  assert.equal((await raw(backend.port,{path:'/v1/events?token='+backend.claim.token})).status,403);
  assert.equal((await raw(backend.port,{path:'/v1/events',headers:{origin:'null',...auth}})).status,403);
  const ok=await raw(backend.port,{headers:auth});
  assert.equal(ok.status,200);assert.equal(ok.body.bootGeneration,backend.claim.generation);
  assert.equal((await raw(backend.port,{path:'/v1/debug/eval',headers:auth})).status,404);
});

test('client performs allowed project/session/settings/plan operations under the writer lease',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-ops-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const workspace=await projectFixture(root,'alpha');
  const store=new WorkspaceSessions(path.join(root,'workspaces.json'));
  const project=await store.select(workspace);
  const backend=await startBackend(t,root),client=clientOf(backend);t.after(()=>client.close());
  const handshake=await client.connect();
  assert.equal(handshake.identity,'workflow-pilot');assert.equal(handshake.capabilities.commands,true);
  const states=[];let snapshot;
  client.subscribe({onSnapshot:value=>{snapshot=value;},onEvent:event=>{if(event.type==='state')states.push(event);}});
  await until(()=>snapshot,'initial snapshot');
  assert.equal(snapshot.state.projects[0].workspace,project.workspace);
  const listed=await client.read('projects.list');
  assert.equal(listed.projects.length,1);assert.equal(listed.projects[0].sessions[0].sessionId,project.sessionId);
  assert.deepEqual(await client.read('settings.get'),{theme:'light',hideToolCalls:true});
  assert.equal((await client.read('sessions.list',{workspace:project.workspace})).sessions.length,1);
  assert.equal((await client.read('plan.snapshot')).selected.sessionId,project.sessionId);
  await assert.rejects(client.read('projects.list',{unexpected:true}),error=>error.code==='BACKEND_ARGS_INVALID');
  await assert.rejects(client.submit('settings.update',{theme:'dark'}),error=>error.code==='BACKEND_LEASE_REQUIRED');
  await client.acquire();
  assert.deepEqual(await client.run('settings.update',{theme:'dark'}),{theme:'dark',hideToolCalls:true});
  await until(()=>states.some(event=>backend.services.settings.shellTheme==='dark'&&event.type==='state'),'state event');
  await assert.rejects(client.run('settings.update',{theme:'neon'}),error=>error.code==='BACKEND_ARGS_INVALID');
  await assert.rejects(client.run('settings.update',{theme:'dark',script:'x'}),error=>error.code==='BACKEND_ARGS_INVALID');
  assert.deepEqual(await client.run('projects.rename',{workspace:project.workspace,name:'Альфа'}),{changed:true});
  const created=await client.run('sessions.create',{workspace:project.workspace});
  assert.notEqual(created.selected.sessionId,project.sessionId);
  assert.deepEqual(await client.run('sessions.rename',{workspace:project.workspace,sessionId:created.selected.sessionId,name:'Вторая'}),{changed:true});
  const selected=await client.run('sessions.select',{workspace:project.workspace,sessionId:project.sessionId});
  assert.equal(selected.selected.sessionId,project.sessionId);
  assert.equal(backend.services.control.projects.selected().sessionId,project.sessionId,'Control remains the store owner');
  await assert.rejects(client.run('projects.open',{workspace:path.join(root,'unknown')}),error=>error.code==='PROJECT_NOT_REGISTERED');
  await assert.rejects(client.run('projects.delete',{workspace:project.workspace}),error=>error.code==='BACKEND_OPERATION_NOT_AVAILABLE');
  // PlanContinuation goes through the same Kit-verified coordination as the old IPC.
  await assert.rejects(client.run('plan.continue',{}),{code:'PLUGIN_PLAN_IDENTITY'},'a plan without its SDK participant cannot start');
  assert.equal((await client.run('plan.stop',{})).planContinuation,false);
  // A newer writer invalidates the older lease generation.
  const other=clientOf(backend);await other.connect();
  await assert.rejects(other.acquire(),{code:'BACKEND_LEASE_HELD'},'control is never taken implicitly');
  await other.acquire({takeover:true});
  await assert.rejects(client.submit('settings.update',{theme:'light'}),error=>error.code==='BACKEND_LEASE_STALE');
  await other.release();client.close();
});

test('requestId deduplicates, accepted operations finish after disconnect and are journaled before the effect',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-dedup-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const workspace=await projectFixture(root,'beta');
  const store=new WorkspaceSessions(path.join(root,'workspaces.json'));
  const project=await store.select(workspace);
  const backend=await startBackend(t,root),client=clientOf(backend);
  await client.connect();await client.acquire();
  const first=await client.submit('sessions.create',{workspace:project.workspace},{requestId:'create-once'});
  const repeat=await client.submit('sessions.create',{workspace:project.workspace},{requestId:'create-once'});
  assert.equal(first.status,'accepted');assert.equal(repeat.operationId,first.operationId);
  await assert.rejects(client.submit('sessions.create',{workspace:path.join(root,'different')},{requestId:'create-once'}),
    error=>error.code==='BACKEND_REQUEST_CONFLICT');
  client.close();
  // A new client, without the old connection, sees the same server-side operation.
  const later=clientOf(backend);await later.connect();
  const done=await later.wait(first.operationId);
  assert.equal(done.status,'completed');
  const sessions=backend.services.control.projects.snapshot().projects[0].sessions;
  assert.equal(sessions.length,2,'one effect for one requestId');
  assert.ok(sessions.every(session=>!Object.hasOwn(session,'experience')));
  const journal=fs.readFileSync(path.join(backend.identity.ownerDir,'operations.jsonl'),'utf8').trim().split('\n').map(JSON.parse)
    .filter(record=>record.operationId===first.operationId).map(record=>record.status);
  assert.deepEqual(journal,['accepted','running','completed']);
  assert.equal(fs.statSync(path.join(backend.identity.ownerDir,'operations.jsonl')).mode&0o077,0);
});

test('a new boot generation never reruns an accepted mutation; stale commands require reconciliation',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-boot-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const first=await startBackend(t,root);
  const ownerDir=first.identity.ownerDir,oldGeneration=first.claim.generation;
  await first.stop();
  // Simulates a crash after durable acceptance and before a confirmed result.
  fs.appendFileSync(path.join(ownerDir,'operations.jsonl'),JSON.stringify({requestId:'lost-send',operationId:'op:'+'a'.repeat(40),
    fingerprint:'f'.repeat(64),bootGeneration:oldGeneration,status:'running'})+'\n{"interrupted":');
  const second=await startBackend(t,root),client=clientOf(second);
  await client.connect();await client.acquire();
  assert.notEqual(second.claim.generation,oldGeneration);
  assert.equal((await client.operation('op:'+'a'.repeat(40))).status,'unknown');
  const result=await client.submit('settings.update',{theme:'dark'},{requestId:'lost-send'});
  assert.equal(result.status,'unknown','the previous record is never executed again');
  assert.equal(second.services.settings.shellTheme,'light');
  const stale=await raw(second.port,{method:'POST',path:'/v1/commands',headers:{authorization:'Bearer '+second.claim.token,'content-type':'application/json'},
    body:JSON.stringify({requestId:'old-client',operation:'settings.update',args:{theme:'dark'},bootGeneration:oldGeneration,leaseGeneration:1})});
  assert.equal(stale.status,409);assert.equal(stale.body.error.code,'BACKEND_BOOT_STALE');
  // Corruption before the last line is fatal, not silently reset.
  fs.writeFileSync(path.join(root,'corrupt.jsonl'),'{broken\n{"requestId":"a","operationId":"op:b"}\n');
  assert.throws(()=>openOperationJournal(path.join(root,'corrupt.jsonl')),{code:'BACKEND_JOURNAL_CORRUPT'});
});

test('malformed and oversized messages are rejected without blocking the backend',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-bad-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const backend=await startBackend(t,root);
  const headers={authorization:'Bearer '+backend.claim.token,'content-type':'application/json'};
  const broken=await raw(backend.port,{method:'POST',path:'/v1/commands',headers,body:'{not json'});
  assert.equal(broken.status,400);assert.equal(broken.body.error.code,'BACKEND_MESSAGE_INVALID');
  const large=await raw(backend.port,{method:'POST',path:'/v1/commands',headers,body:JSON.stringify({pad:'x'.repeat(70*1024)})});
  assert.equal(large.status,413);
  const unknown=await raw(backend.port,{method:'POST',path:'/v1/commands',headers,
    body:JSON.stringify({requestId:'r1',operation:'shell.exec',args:{},bootGeneration:backend.claim.generation})});
  assert.equal(unknown.status,400);assert.equal(unknown.body.error.code,'BACKEND_COMMAND_INVALID');
  const client=clientOf(backend);await client.connect();
  assert.deepEqual(await client.read('settings.get'),{theme:'light',hideToolCalls:true});
});

test('a slow event reader is disconnected while writers and other readers continue',()=>{
  let state={n:0};
  const events=createBackendEvents({bootGeneration:'boot-fixture',state:()=>state,heartbeatMs:60000,coalesceMs:0});
  const stream=()=>{
    const req=new EventEmitter(),res=new EventEmitter();
    Object.assign(res,{writableLength:0,chunks:[],destroyed:false,writeHead(){},flushHeaders(){},
      write(text){this.chunks.push(text);this.writableLength+=text.length;return false;},destroy(){this.destroyed=true;}});
    return {req,res};
  };
  const slow=stream(),fast=stream();
  events.open(slow.req,slow.res,{generation:'boot-fixture',afterSequence:null});
  events.open(fast.req,fast.res,{generation:'boot-fixture',afterSequence:null});
  fast.res.write=function(text){this.chunks.push(text);return true;};
  for(let index=0;index<600;index++)events.operation({operationId:'op:'+String(index).padStart(40,'0'),status:'completed',blob:'x'.repeat(8000)});
  assert.equal(slow.res.destroyed,true,'unbounded buffering is refused');
  assert.equal(fast.res.destroyed,false);
  assert.equal(fast.res.chunks.filter(chunk=>chunk.startsWith('event: event')).length,600);
  assert.equal(events.clients,1);
  // A later subscriber beyond the retained window gets a snapshot, not a partial history.
  const late=stream();events.open(late.req,late.res,{generation:'boot-fixture',afterSequence:1});
  assert.match(late.res.chunks[0],/^event: snapshot/);
  events.close();
});

test('pending mutation limit refuses new work without stopping accepted work',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-queue-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const journal=openOperationJournal(path.join(root,'operations.jsonl'));
  let release;const blocked=new Promise(resolve=>{release=resolve;});
  const operations=createBackendOperations({bootGeneration:'boot-a',journal,limit:1,
    catalog:{'settings.update':async()=>{await blocked;return {done:true};}}});
  const lease=(await operations.submit({requestId:'lease',operation:'control.acquire',args:{clientId:'client-fixture-1'},bootGeneration:'boot-a'})).value.leaseGeneration;
  const command=requestId=>({requestId,operation:'settings.update',args:{theme:'dark'},bootGeneration:'boot-a',leaseGeneration:lease});
  const accepted=await operations.submit(command('one'));
  assert.equal(accepted.status,'accepted');
  await assert.rejects(operations.submit(command('two')),{code:'BACKEND_QUEUE_LIMIT'});
  release();await operations.idle();
  assert.equal(operations.operation(accepted.operationId).status,'completed');
  assert.equal((await operations.submit(command('two'))).status,'accepted');
  await operations.idle();
});

test('a Desktop action that returns a large internal record still completes without leaking it',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-api-result-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const project={workspace:'/tmp/big',sessions:Array.from({length:400},(_,index)=>({sessionId:'s'+index,chatUrl:'https://chatgpt.com/c/'+index,
    receipts:'x'.repeat(1000)}))};
  assert.ok(JSON.stringify(project).length>256*1024,'the fixture record exceeds the message limit');
  const calls=[];
  const services={control:{projects:{snapshot:()=>({projects:[]}),selected:()=>null}},settings:{},
    desktop:{invoke:async(surface,channel,input)=>{calls.push([surface,channel,input]);
      return channel==='pilot:rename-project'?{ok:true,result:true,state:{huge:project}}:{ok:true,result:project,state:{huge:project}};}}};
  const journal=openOperationJournal(path.join(root,'operations.jsonl'));
  const operations=createBackendOperations({bootGeneration:'boot-a',journal,catalog:backendCatalog(services)});
  const lease=(await operations.submit({requestId:'lease',operation:'control.acquire',args:{clientId:'client-fixture-1'},bootGeneration:'boot-a'})).value.leaseGeneration;
  const invoke=(requestId,channel,input)=>operations.submit({requestId,operation:'ui.invoke',bootGeneration:'boot-a',leaseGeneration:lease,
    args:{surface:'local',channel,input}});
  const selected=await invoke('select','pilot:select-session',{workspace:'/tmp/big',sessionId:'s1'});
  const renamed=await invoke('rename','pilot:rename-project',{workspace:'/tmp/big',name:'Big'});
  await operations.idle();
  const view=operations.operation(selected.operationId);
  assert.equal(view.status,'completed','an executed action is not reported as failed because of its value');
  assert.deepEqual(view.result.value,{ok:true,result:null},'internal records do not cross the API');
  assert.equal(operations.operation(renamed.operationId).result.value.result,true,'small scalar results are kept');
  assert.equal(calls.length,2);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'operations.jsonl'),'utf8'),/chatgpt\.com\/c\//,'the journal holds no chat addresses');
});
