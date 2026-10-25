import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {taskEvidence,executorDispatchStage} from '../src/backend/desktop-model.mjs';

test('orchestrated evidence separates checked child commits from Kit main integration without assuming a send',()=>{
  const tasks=['T001','T002','T003','DOCS'].map(id=>({id,status:'pending'}));
  const sha=n=>String(n).repeat(40);
  const assignments=[{parent_task_id:'T001',status:'INTEGRATED',source_commit:sha('a')},
    {parent_task_id:'T002',status:'READY_FOR_INTEGRATION',source_commit:sha('b')},
    {parent_task_id:'T003',status:'RUNNING',source_commit:sha('c')},
    {parent_task_id:'DOCS',status:'UNKNOWN',source_commit:sha('d')}];
  tasks[0].status='done';
  assert.deepEqual(taskEvidence(tasks,assignments),{received:2,total:4,integrated:1,totalTasks:4});
  tasks[1].status='done';assignments[1].status='INTEGRATED';
  assert.deepEqual(taskEvidence(tasks,assignments),{received:2,total:4,integrated:2,totalTasks:4});
  tasks[2].status='done';tasks[3].status='done';
  assert.deepEqual(taskEvidence(tasks,assignments),{received:4,total:4,integrated:4,totalTasks:4});
  const unverified=[{parent_task_id:'T001',status:'READY_FOR_INTEGRATION',source_commit:'truncated'},
    {parent_task_id:'T002',status:'UNKNOWN',source_commit:sha('b')}];
  assert.equal(taskEvidence(tasks.map(t=>({...t,status:'pending'})),unverified).received,0,
    'neither UNKNOWN nor an unverified hash is a result');
  assert.deepEqual(taskEvidence([{id:'delivery',status:'done',delivery:true}],[]),
    {received:0,total:0,integrated:1,totalTasks:1},'orchestrator-only delivery is not an E result');
});

test('worker stages distinguish authorized, SDK pending/accepted and Kit RUNNING without inferring starts',()=>{
  const a={status:'READY',dialogue_version:1};
  assert.match(executorDispatchStage(a,{draft:{phase:'prepared'}}).label,/Поручение подготовлено/);
  assert.match(executorDispatchStage(a,{draft:{phase:'authorized'}}).label,/Поручение сохранено · ожидаем канал исполнителя/);
  assert.match(executorDispatchStage(a,{initial:{delivery:'pending',read:false}}).label,/не доставлено/);
  assert.match(executorDispatchStage(a,{initial:{delivery:'accepted',read:false}}).label,/SDK принял/);
  assert.match(executorDispatchStage(a,{initial:{delivery:'accepted',read:true}}).label,/запуск не подтверждён/);
  assert.match(executorDispatchStage({...a,status:'RUNNING'},{initial:{delivery:'accepted',read:true}}).label,/Kit RUNNING/);
  assert.equal(executorDispatchStage({...a,status:'UNKNOWN'},{initial:{delivery:'accepted'}}),null);
  assert.equal(executorDispatchStage(a,{}),null,'missing receipt never invents a stage');
});
import {startupContextState} from '../src/contracts/startup-view.mjs';

test('Desktop/HTTP startup projection uses durable completion over pending and exposes terminal errors',()=>{
  const done=startupContextState({phase:'stale',error:{code:'CONTEXT_CHANGED'}},
    {delivery_mode:'model-pull',delivery:'pending',complete:true,read:true,parts_read:3,total_parts:3});
  assert.equal(done.phase,'startup-complete');assert.equal(done.startup.complete,true);
  assert.equal(done.startup.snapshot_stale,true);assert.equal(done.error,null);
  const stale=startupContextState({phase:'stale'},
    {delivery_mode:'model-pull',delivery:'pending',read:false,parts_read:0,total_parts:3});
  assert.equal(stale.phase,'startup-failed');assert.equal(stale.startup.error.code,'PLUGIN_COMMUNICATION_STALE_MESSAGE');
  const interrupted=startupContextState({phase:'error',error:{code:'STORE_BLOCKED',message:'Запись невозможна'}},
    {delivery_mode:'model-pull',delivery:'pending',read:true,parts_read:1,total_parts:3});
  assert.equal(interrupted.phase,'startup-failed');assert.equal(interrupted.error.code,'STORE_BLOCKED');
  const old=startupContextState({phase:'startup-channel'},
    {delivery_mode:'sdk-notification',delivery:'unknown',complete:false});
  assert.equal(old.phase,'startup-channel');assert.equal(old.startup.delivery,'unknown');
});

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label,timeoutMs=15000) {
  const deadline=Date.now()+timeoutMs;
  for(;;){const value=await predicate();if(value)return value;if(Date.now()>deadline)assert.fail('Timed out: '+label);await settle();}
}

test('Electron backend runs the Desktop model; the client uses the former channels through the API',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const {spawn}=await import('node:child_process');
  const readline=await import('node:readline');
  const {fileURLToPath}=await import('node:url');
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-desktop-model-'));
  const workspace=path.join(root,'alpha');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});
  await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
  await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'fixture-alpha',project_name:'Alpha',
      plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
      tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  const project=await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  t.after(async()=>{if(backend.exitCode===null)backend.kill('SIGKILL');await fsp.rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout});
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);}catch{}});
      backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('startup timeout: '+errors)),30000);}),
  ]).finally(()=>clearTimeout(deadline));
  const client=new BackendConnection({port:ready.port,token:ready.token});t.after(()=>client.close());
  await client.connect();
  const ui=new Map(),events=[];
  client.subscribe({onUi:(kind,value)=>ui.set(kind,value),onEvent:event=>events.push(event)});
  const state=await until(()=>ui.get('state')?.projects?.length===1&&ui.get('state'),'Desktop state');
  assert.equal(state.projects[0].workspace,project.workspace);assert.equal(state.selected.sessionId,project.sessionId);
  assert.equal(state.fixture,false,'the backend model is not the in-process smoke fixture');
  assert.ok(state.workProgress===null||state.workProgress.version===1,'the project progress reaches the client');
  const read=await client.read('ui.state');
  assert.equal(read.state.projects[0].workspace,project.workspace);assert.ok(Array.isArray(read.archive.archives));
  await assert.rejects(client.invoke('local','pilot:rename-project',{workspace:project.workspace,name:'Альфа'}),{code:'BACKEND_LEASE_REQUIRED'});
  await client.acquire();
  const invalid=await client.invoke('local','pilot:new-session',{workspace:project.workspace,unsupported:true});
  assert.equal(invalid.ok,false);assert.equal(invalid.error.code,'SESSION_INPUT');
  assert.equal((await client.read('ui.state')).state.selected.sessionId,project.sessionId,'rejected options cannot change selection');
  assert.equal((await client.invoke('local','pilot:rename-project',{workspace:project.workspace,name:'Альфа'})).ok,true);
  await until(()=>ui.get('state')?.projects?.[0]?.name==='Альфа','renamed state');
  const failed=await client.invoke('local','pilot:rename-project',{workspace:path.join(root,'missing'),name:'x'});
  assert.equal(failed.ok,false);assert.equal(typeof failed.error.message,'string');
  await assert.rejects(client.invoke('local','pilot:shell',{}),{code:'BACKEND_ARGS_INVALID'});
  await assert.rejects(client.invoke('settings','pilot:set-theme','dark'),{code:'BACKEND_ARGS_INVALID'});
  assert.equal((await client.invoke('local','pilot:set-theme','dark')).ok,true);
  await until(()=>events.some(event=>event.type==='ui.theme'&&event.data.theme==='dark'),'theme request');
  assert.equal((await client.invoke('local','pilot:open-archive-window')).ok,true);
  await until(()=>events.some(event=>event.type==='ui.open-archive'),'archive window request');
  await until(()=>ui.get('archive'),'archive state');
  assert.equal((await client.invoke('archive','archive:close')).ok,true);
  await until(()=>events.some(event=>event.type==='ui.close-archive'),'archive close request');
  // Without any client the model keeps its page; a new client sees the same state.
  client.close();
  const later=new BackendConnection({port:ready.port,token:ready.token});t.after(()=>later.close());
  await later.connect();
  const again=new Map();later.subscribe({onUi:(kind,value)=>again.set(kind,value)});
  const restored=await until(()=>again.get('state')?.projects?.[0]?.name==='Альфа'&&again.get('state'),'state after reconnect');
  assert.equal(restored.theme,'dark');assert.equal(restored.selected.sessionId,project.sessionId);
  later.close();
  backend.stdin.end('stop\n');
  const code=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not stop')),10000);
    backend.once('exit',value=>{clearTimeout(timeout);resolve(value);});});
  assert.equal(code,0);
});

test('startup projection keeps registration, address, reading and durable cancellation independent',()=>{
  const attempt={bootstrapTransport:'url-query',state:'sending',sendStartedAtMs:1,cancelState:'none',addressStatus:'pending'};
  let state=startupContextState({phase:'waiting-registration'},{read:false},attempt);
  assert.equal(state.launch.registration,'pending');assert.equal(state.phase,'waiting-registration');
  state=startupContextState({phase:'startup-channel'},{read:true,parts_read:1,total_parts:3},{...attempt,state:'sent'});
  assert.equal(state.launch.registration,'confirmed');assert.equal(state.launch.address,'pending');assert.equal(state.startup.parts_read,1);
  state=startupContextState({phase:'delivered'},{complete:true,read:true},{...attempt,state:'sent',cancelState:'requested'});
  assert.equal(state.phase,'cancel-pending');assert.equal(state.startup.complete,true,'historical receipt remains true');
  state=startupContextState(state,{complete:true,cancelled:true},{...attempt,state:'sent',cancelState:'registered-stopped'});
  assert.equal(state.phase,'startup-cancelled');assert.equal(state.launch.registration,'confirmed');
});
