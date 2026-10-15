import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline';
import {configureBackendIdentity,claimBackendIdentity,assertNoBackendOwner} from '../src/backend/identity.mjs';
import {createBackendComposition} from '../src/backend/bootstrap.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'wp-backend-lifecycle-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return root;
}
function mockApp(root){
  const paths={appData:root};
  return {getPath:key=>paths[key],setPath:(key,value)=>{paths[key]=value;},setName:()=>{},paths};
}

test('profile ownership excludes legacy desktop and rejects symlink/foreign/stale owner',t=>{
  const root=fixture(t);const dataDir=path.join(root,'Workflow Pilot');
  fs.mkdirSync(dataDir,{mode:0o700});
  const app=mockApp(root);const identity=configureBackendIdentity(app);
  assert.equal(identity.dataDir,dataDir);
  assert.equal(app.paths.sessionData,path.join(dataDir,'browser'));
  const owner=claimBackendIdentity(identity);
  assert.equal(owner.owns(),true);
  assert.throws(()=>assertNoBackendOwner(dataDir),error=>error.code==='BACKEND_OWNER_CONFLICT');
  assert.throws(()=>claimBackendIdentity(identity),error=>error.code==='BACKEND_OWNER_CONFLICT');
  owner.publish(57991);
  assert.equal(fs.statSync(identity.serviceFile).mode&0o077,0);
  assert.equal(JSON.parse(fs.readFileSync(identity.serviceFile)).generation,owner.generation);
  assert.equal(owner.release(),true);assert.equal(owner.release(),false);
  assertNoBackendOwner(dataDir);
  fs.writeFileSync(identity.serviceFile,'{"product":"other"}');
  assert.throws(()=>claimBackendIdentity(identity),error=>error.code==='BACKEND_OWNER_CONFLICT');
  fs.unlinkSync(identity.serviceFile);
  // Stale owner is never silently reclaimed, regardless of an inactive PID.
  fs.writeFileSync(identity.ownerFile,JSON.stringify({product:'workflow-pilot',pid:999999999,generation:'old'}));
  assert.throws(()=>claimBackendIdentity(identity),error=>error.code==='BACKEND_OWNER_CONFLICT');
  fs.unlinkSync(identity.ownerFile);
  const linked=path.join(root,'linked');fs.symlinkSync(dataDir,linked,'dir');
  assert.throws(()=>configureBackendIdentity(mockApp(root),{testRoot:linked}),error=>error.code==='BACKEND_PROFILE_LINK');
});

test('composition creates one shared Execution and Control facade, never an implicit second registry',()=>{
  const first=createBackendComposition();
  const control=first.createControl({storageFile:path.join(os.tmpdir(),'wp-compose-unused.json')});
  assert.ok(control.projects);assert.equal(first.execution.runtime,null);
  const second=first.createControl({storageFile:path.join(os.tmpdir(),'wp-compose-unused-2.json')});
  assert.ok(second.projects);
  // The actual app creates its Control once; attaching a second browser/runtime
  // to the same Execution is independently rejected by the facade.
  first.execution.attachRuntime({channel:'secure-tunnel'});
  assert.throws(()=>first.execution.attachRuntime({channel:'vps'}),error=>error.code==='EXECUTION_OWNER_CONFLICT');
});

test('independent Electron backend survives disconnected frontend; single owner and corrupt state fail closed',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:35000},async t=>{
  const root=fixture(t);const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const args=['.', '--backend-host','--backend-fixture-root='+root];
  const backend=spawn(electron,args,{cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout});
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);}catch{}});backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('backend startup timeout: '+errors)),12000);}),
  ]).finally(()=>clearTimeout(deadline));
  const request=async(route)=>{
    const response=await fetch(`http://127.0.0.1:${ready.port}${route}`,{headers:{authorization:'Bearer '+ready.token}});
    assert.equal(response.status,200);return response;
  };
  const status=await (await request('/v1/status')).json();
  assert.equal(status.identity,'workflow-pilot');assert.equal(status.bootGeneration,ready.generation);
  assert.deepEqual(status.browser,{connected:true,owner:'backend',fixtureAvailable:true});
  // Fixture on disk is owned by the test, no chat or real project is loaded.
  const before=await (await request('/v1/browser/fixture-state')).json();
  const frame=Buffer.from(await (await request('/v1/browser/frame')).arrayBuffer());
  assert.equal(frame.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const second=spawn(electron,args,{cwd:project,env,stdio:['ignore','pipe','pipe']});
  let duplicate='';second.stderr.on('data',part=>{duplicate+=part;});
  const exit=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('competing backend did not exit')),6500);
    second.once('exit',code=>{clearTimeout(timeout);resolve(code);});});
  assert.notEqual(exit,0,'second backend refuses ownership');
  assert.match(duplicate,/BACKEND_OWNER_CONFLICT/);
  const front=spawn(process.execPath,['-e','process.stdout.write("front done\\n")'],{stdio:'pipe'});
  await new Promise((resolve,reject)=>{front.once('exit',code=>code===0?resolve():reject(Error('client failed')));});
  await new Promise(resolve=>setTimeout(resolve,230));
  const after=await (await request('/v1/browser/fixture-state')).json();
  assert.equal(after.page.bootId,before.page.bootId);
  assert.ok(after.page.ticks>before.page.ticks);
  const denied=await fetch(`http://127.0.0.1:${ready.port}/v1/status`);
  assert.equal(denied.status,403);
  backend.stdin.end('stop\n');
  const done=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not terminate')),10000);
    backend.once('exit',code=>{clearTimeout(timeout);resolve(code);});});
  assert.equal(done,0,'shutdown cleans up only owned resources');
  assert.equal(fs.existsSync(path.join(root,'.backend-host','owner.json')),false);
  assert.equal(fs.existsSync(path.join(root,'.backend-host','service.json')),false);
  // A corrupt project store may not be silently reset to an empty project list.
  fs.writeFileSync(path.join(root,'workspaces.json'),'{ broken-json', {mode:0o600});
  const broken=spawn(electron,args,{cwd:project,env,stdio:['ignore','pipe','pipe']});
  let stderr='';broken.stderr.on('data',part=>{stderr+=part;});
  const result=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('corrupt-profile test stalled')),9000);
    broken.once('exit',code=>{clearTimeout(timeout);resolve(code);});});
  assert.notEqual(result,0);assert.match(stderr,/BACKEND_STARTUP_FAILED|WORKSPACE_|SESSIONS_INVALID|SyntaxError/);
  assert.equal(await fsp.readFile(path.join(root,'workspaces.json'),'utf8'),'{ broken-json');
  const other=path.join(root,'foreign-sentinel.json');
  await fsp.writeFile(other,'{"sentinel":true}');
  await fsp.unlink(path.join(root,'workspaces.json'));
  await fsp.symlink(other,path.join(root,'workspaces.json'));
  const linkedStore=spawn(electron,args,{cwd:project,env,stdio:['ignore','pipe','pipe']});
  let linkedError='';linkedStore.stderr.on('data',part=>{linkedError+=part;});
  const linkExit=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('linked store test stalled')),9000);
    linkedStore.once('exit',code=>{clearTimeout(timeout);resolve(code);});
  });
  assert.notEqual(linkExit,0);assert.match(linkedError,/BACKEND_STORE_LINK/);
  assert.equal(await fsp.readFile(other,'utf8'),'{"sentinel":true}');
  await fsp.unlink(path.join(root,'workspaces.json'));
  const workspace=path.join(root,'project');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});
  await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
  await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'fixture-project',project_name:'Fixture',
      plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
      tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  const store=new WorkspaceSessions(path.join(root,'workspaces.json'));
  await store.select(workspace);
  const journalDir=path.join(workspace,'.git','workflow-kit');
  await fsp.mkdir(journalDir,{recursive:true});
  await fsp.writeFile(path.join(journalDir,'transaction.json'),JSON.stringify({id:'unfinished',role:'implementation'}));
  const original=await fsp.readFile(path.join(root,'workspaces.json'),'utf8');
  const withJournal=spawn(electron,args,{cwd:project,env,stdio:['ignore','pipe','pipe']});
  let journalError='';withJournal.stderr.on('data',part=>{journalError+=part;});
  const journalExit=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Kit journal test stalled')),9000);
    withJournal.once('exit',code=>{clearTimeout(timeout);resolve(code);});
  });
  assert.notEqual(journalExit,0);assert.match(journalError,/BACKEND_KIT_TRANSACTION_PENDING/);
  assert.equal(await fsp.readFile(path.join(root,'workspaces.json'),'utf8'),original);
  assert.equal(fs.existsSync(path.join(journalDir,'transaction.json')),true);
});
