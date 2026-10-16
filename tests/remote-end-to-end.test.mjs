import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {startServeProxy} from './fixtures/remote-serve-proxy.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=100)=>new Promise(resolve=>setTimeout(resolve,ms));

// A remote device as Safari would be: the gateway's cookie on every request
// and the page origin on changes (the Serve stand-in maps it to https).
function deviceConnection(proxy,cookie,clientId) {
  return new BackendConnection({origin:`http://127.0.0.1:${proxy.port}`,clientId,
    fetch:(url,options={})=>fetch(url,{...options,headers:{...options.headers,cookie,origin:`http://127.0.0.1:${proxy.port}`}})});
}

test('remote access end to end: enable, pair on the Mac, take control, drop and reconnect, revoke; the Mac window keeps working',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:180000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-remote-e2e-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const workspace=path.join(root,'alpha');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),'<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,
    project_id:'fixture-alpha',project_name:'Alpha',plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
    tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],{cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  const seen=[],waiting=[];
  readline.createInterface({input:backend.stdout}).on('line',line=>{let value;try{value=JSON.parse(line);}catch{return;}seen.push(value);
    for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}});
  const next=(match,label)=>{const found=seen.find(match);if(found)return Promise.resolve(found);
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('timeout '+label)),40000);waiting.push({match,resolve:value=>{clearTimeout(timer);resolve(value);}});});};
  const fixture=async op=>{seen.splice(0,seen.length,...seen.filter(value=>value.op!==op));backend.stdin.write(JSON.stringify({op})+'\n');return next(value=>value.op===op,op);};
  const ready=await next(value=>value.ready,'backend');
  // R01: nothing listens until the explicit enable.
  const mac=new BackendConnection({port:ready.port,token:ready.token});t.after(()=>mac.close());
  await mac.connect();
  const before=await mac.read('ui.state');assert.equal(before.state.remoteAccess.enabled,false);
  const enabled=await fixture('remote-enable');
  const proxy=await startServeProxy({targetPort:enabled.remote.port});t.after(()=>proxy.close());
  await mac.acquire();
  // R02: a device exists only after the Mac confirms its code.
  const pairing=await (await fetch(`http://127.0.0.1:${proxy.port}/remote/pair`,{method:'POST',
    headers:{'content-type':'application/json',origin:`http://127.0.0.1:${proxy.port}`},body:JSON.stringify({name:'iPad'})})).json();
  const waitingState=await mac.read('ui.state');
  assert.deepEqual(waitingState.state.remoteAccess.pairings.map(item=>item.code),[pairing.code],'the Mac sees the code the device shows');
  await fixture('remote-approve');
  const approved=await fetch(`http://127.0.0.1:${proxy.port}/remote/pair/${pairing.pairingId}`);
  const cookie=approved.headers.get('set-cookie').split(';')[0];
  const session=await (await fetch(`http://127.0.0.1:${proxy.port}/remote/session`,{headers:{cookie}})).json();
  // R03: the device sees the same state and takes control explicitly.
  let device=deviceConnection(proxy,cookie,session.device.clientId);t.after(()=>device.close());
  await device.connect();
  const deviceStates=[];device.subscribe({onUi:(kind,value)=>{if(kind==='state')deviceStates.push(value);}});
  for(let i=0;i<50&&!deviceStates.length;i++)await settle();
  assert.equal(await fsp.realpath(deviceStates.at(-1).projects[0].workspace),await fsp.realpath(workspace),'the same projects as the Mac window');
  await assert.rejects(device.acquire(),{code:'BACKEND_LEASE_HELD'},'control is never taken implicitly');
  await device.acquire({takeover:true});
  await assert.rejects(mac.submit('settings.update',{theme:'dark'}),error=>error.code==='BACKEND_LEASE_STALE','the Mac becomes an observer');
  const theme=await device.invoke('local','pilot:set-theme','dark');
  assert.equal(theme.ok,true);
  for(let i=0;i<50&&deviceStates.at(-1)?.theme!=='dark';i++)await settle();
  assert.equal(deviceStates.at(-1).theme,'dark');
  // R06: a dropped connection reconnects with the same device identity; a
  // repeated request is not a second effect.
  const first=await device.submit('ui.invoke',{surface:'local',channel:'pilot:set-theme',input:'light'},{requestId:'remote-theme-1'});
  device.close();
  device=deviceConnection(proxy,cookie,session.device.clientId);await device.connect();
  await device.acquire();
  assert.equal((await device.wait(first.operationId)).status,'completed','the operation accepted before the drop finished once');
  // The same requestId never becomes a second effect: the same operation or a refusal.
  const repeat=await device.submit('ui.invoke',{surface:'local',channel:'pilot:set-theme',input:'light'},{requestId:'remote-theme-1'})
    .catch(error=>({refused:error.code}));
  assert.ok(repeat.operationId===first.operationId||repeat.refused==='BACKEND_REQUEST_CONFLICT',JSON.stringify(repeat));
  // R02: revoking the device ends its access and control at once.
  await fixture('remote-revoke');
  await assert.rejects(device.connect(),error=>error.code==='REMOTE_DEVICE_REQUIRED');
  const after=await mac.read('ui.state');
  assert.equal(after.state.remoteAccess.devices.length,0);
  // R08: the Mac window takes control back and keeps working; its API is still loopback-only.
  await mac.acquire();
  assert.equal((await mac.read('settings.get')).theme,'light','the Mac reads the result of the device change');
  device.close();backend.stdin.write('stop\n');
});
