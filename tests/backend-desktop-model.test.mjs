import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label,timeoutMs=15000) {
  const deadline=Date.now()+timeoutMs;
  for(;;){const value=await predicate();if(value)return value;if(Date.now()>deadline)assert.fail('Timed out: '+label);await settle();}
}

test('Electron backend runs the Desktop model; the client uses the former channels through the API',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const {spawn}=await import('node:child_process');
  const readline=await import('node:readline');
  const {fileURLToPath}=await import('node:url');
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-desktop-model-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
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
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGKILL');});
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
  const read=await client.read('ui.state');
  assert.equal(read.state.projects[0].workspace,project.workspace);assert.ok(Array.isArray(read.archive.archives));
  await assert.rejects(client.invoke('local','pilot:rename-project',{workspace:project.workspace,name:'Альфа'}),{code:'BACKEND_LEASE_REQUIRED'});
  await client.acquire();
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
