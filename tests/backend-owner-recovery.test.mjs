import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {configureBackendIdentity,claimBackendIdentity,assertNoBackendOwner,processAlive} from '../src/backend/identity.mjs';

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));
function profile(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'wp-owner-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const app={paths:{appData:root},getPath(key){return this.paths[key];},setPath(key,value){this.paths[key]=value;},setName(){}};
  const identity=configureBackendIdentity(app,{testRoot:root});
  fs.mkdirSync(identity.ownerDir,{mode:0o700,recursive:true});
  return identity;
}
const dead=()=>false,live=()=>true;

test('a stale owner of a finished process is recovered with its descriptor; operations journal is kept',t=>{
  const identity=profile(t),journal=path.join(identity.ownerDir,'operations.jsonl');
  fs.writeFileSync(identity.ownerFile,JSON.stringify({product:'workflow-pilot',pid:424242,generation:'old'}),{mode:0o600});
  fs.writeFileSync(identity.serviceFile,JSON.stringify({product:'workflow-pilot',pid:424242,generation:'old',port:1,token:'x'}),{mode:0o600});
  fs.writeFileSync(journal,'{"requestId":"r","operationId":"op:x","bootGeneration":"old","status":"running"}\n');
  const claim=claimBackendIdentity(identity,{alive:dead});
  assert.notEqual(claim.generation,'old');assert.equal(claim.owns(),true);
  assert.equal(fs.existsSync(identity.serviceFile),false,'the stale descriptor is not reused');
  assert.match(fs.readFileSync(journal,'utf8'),/"bootGeneration":"old"/,'previous operations stay for UNKNOWN reconciliation');
  assert.equal(claim.release(),true);assert.equal(fs.existsSync(identity.ownerFile),false);
});

test('live, foreign, corrupt or unconfirmed owners are refused without changing data',t=>{
  const identity=profile(t);
  const owner=value=>fs.writeFileSync(identity.ownerFile,value,{mode:0o600});
  owner(JSON.stringify({product:'workflow-pilot',pid:1234,generation:'live'}));
  assert.throws(()=>claimBackendIdentity(identity,{alive:live}),{code:'BACKEND_OWNER_CONFLICT'});
  owner(JSON.stringify({product:'other-product',pid:1234,generation:'x'}));
  assert.throws(()=>claimBackendIdentity(identity,{alive:dead}),{code:'BACKEND_OWNER_CONFLICT'});
  owner('{broken');
  assert.throws(()=>claimBackendIdentity(identity,{alive:dead}),{code:'BACKEND_OWNER_CORRUPT'});
  assert.equal(fs.readFileSync(identity.ownerFile,'utf8'),'{broken');
  fs.unlinkSync(identity.ownerFile);
  fs.writeFileSync(path.join(identity.ownerDir,'target.json'),'{}');
  fs.symlinkSync(path.join(identity.ownerDir,'target.json'),identity.ownerFile);
  assert.throws(()=>claimBackendIdentity(identity,{alive:dead}),{code:'BACKEND_OWNER_CONFLICT'});
  fs.unlinkSync(identity.ownerFile);
  // A descriptor without an owner is not explained by a crash of this code.
  fs.writeFileSync(identity.serviceFile,'{}');
  assert.throws(()=>claimBackendIdentity(identity,{alive:dead}),{code:'BACKEND_OWNER_CONFLICT'});
});

test('legacy Desktop refuses only a live backend owner',t=>{
  const identity=profile(t);
  assert.doesNotThrow(()=>assertNoBackendOwner(identity.dataDir));
  fs.writeFileSync(identity.ownerFile,JSON.stringify({product:'workflow-pilot',pid:777,generation:'g'}));
  assert.throws(()=>assertNoBackendOwner(identity.dataDir,{alive:live}),{code:'BACKEND_OWNER_CONFLICT'});
  assert.doesNotThrow(()=>assertNoBackendOwner(identity.dataDir,{alive:dead}),'a crashed backend never blocks Desktop');
  fs.writeFileSync(identity.ownerFile,'{broken');
  assert.doesNotThrow(()=>assertNoBackendOwner(identity.dataDir));
  assert.equal(processAlive(process.pid),true);assert.equal(processAlive(0),false);
});

async function spawnBackend(root) {
  const {spawn}=await import('node:child_process');
  const readline=await import('node:readline');
  const {fileURLToPath}=await import('node:url');
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  let errors='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:child.stdout});
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);}catch{}});
      child.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('startup timeout: '+errors)),25000);}),
  ]).finally(()=>clearTimeout(deadline));
  const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  return {child,ready,exited};
}

test('Electron backend releases the profile on SIGTERM and recovers it after SIGKILL',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-owner-e2e-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const owner=path.join(root,'.backend-host','owner.json'),service=path.join(root,'.backend-host','service.json');
  const first=await spawnBackend(root);t.after(()=>{if(first.child.exitCode===null)first.child.kill('SIGKILL');});
  assert.equal(fs.existsSync(owner),true);
  first.child.kill('SIGTERM');
  assert.deepEqual(await first.exited,{code:0,signal:null},'ordinary termination is graceful');
  assert.equal(fs.existsSync(owner),false);assert.equal(fs.existsSync(service),false);
  const second=await spawnBackend(root);t.after(()=>{if(second.child.exitCode===null)second.child.kill('SIGKILL');});
  second.child.kill('SIGKILL');await second.exited;
  assert.equal(fs.existsSync(owner),true,'a killed process leaves its owner record');
  for(let i=0;i<40&&processAlive(second.ready.pid);i++)await settle();
  const third=await spawnBackend(root);t.after(()=>{if(third.child.exitCode===null)third.child.kill('SIGKILL');});
  assert.notEqual(third.ready.generation,second.ready.generation,'the stale owner is recovered with a new boot generation');
  const status=await fetch(`http://127.0.0.1:${third.ready.port}/v1/status`,{headers:{authorization:'Bearer '+third.ready.token}});
  assert.equal(status.status,200);
  third.child.stdin.end('stop\n');
  assert.equal((await third.exited).code,0);assert.equal(fs.existsSync(owner),false);
});
