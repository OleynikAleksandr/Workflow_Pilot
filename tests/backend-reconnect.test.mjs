import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createControlLease,LEASE_RENEW_MS,LEASE_TTL_MS} from '../src/backend/control-lease.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {processAlive} from '../src/backend/identity.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=50)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label,timeoutMs=20000) {
  const deadline=Date.now()+timeoutMs;
  for(;;){const value=await predicate();if(value)return value;if(Date.now()>deadline)assert.fail('Timed out: '+label);await settle(100);}
}

test('lease is explicit, renewed, expires after the window and refuses older generations',()=>{
  assert.equal(LEASE_RENEW_MS,10000);assert.equal(LEASE_TTL_MS,45000);
  let now=1000;const changes=[];
  const lease=createControlLease({bootGeneration:'boot',now:()=>now,onChange:view=>changes.push(view.holder)});
  const a=lease.acquire({clientId:'client-aaaaaaaa'});
  assert.equal(a.holder,'client-aaaaaaaa');assert.equal(a.expiresAt,1000+45000);
  assert.throws(()=>lease.acquire({clientId:'client-bbbbbbbb'}),{code:'BACKEND_LEASE_HELD'});
  assert.equal(lease.acquire({clientId:'client-aaaaaaaa'}).generation,a.generation+1,'the holder may refresh explicitly');
  now+=30000;lease.renew({clientId:'client-aaaaaaaa',leaseGeneration:a.generation+1});
  now+=40000;assert.equal(lease.current().generation,a.generation+1,'renewal moves the expiry');
  const b=lease.acquire({clientId:'client-bbbbbbbb',takeover:true});
  assert.throws(()=>lease.renew({clientId:'client-aaaaaaaa',leaseGeneration:a.generation+1}),{code:'BACKEND_LEASE_STALE'});
  assert.deepEqual(lease.release({clientId:'client-aaaaaaaa',leaseGeneration:a.generation+1}),{released:false});
  now+=45001;
  assert.equal(lease.current(),null,'a missed renewal window frees control');
  assert.throws(()=>lease.renew({clientId:'client-bbbbbbbb',leaseGeneration:b.generation}),{code:'BACKEND_LEASE_STALE'});
  const c=lease.acquire({clientId:'client-aaaaaaaa'});
  assert.deepEqual(lease.release({clientId:'client-aaaaaaaa',leaseGeneration:c.generation}),{released:true});
  assert.throws(()=>lease.acquire({clientId:'bad'}),{code:'BACKEND_ARGS_INVALID'});
  assert.ok(changes.includes('client-bbbbbbbb'));lease.dispose();
});

function startBackend(electron,root,env,ttl) {
  const child=spawn(electron,['.','--backend-host','--backend-fixture-root='+root,'--backend-lease-ttl-ms='+ttl],{cwd:project,env,stdio:['pipe','pipe','pipe']});
  let errors='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{errors+=chunk;});
  const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('backend timeout '+errors)),30000);
    readline.createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.ready){clearTimeout(timer);resolve(value);}}catch{}});});
  return {child,ready,exited:new Promise(resolve=>child.once('exit',resolve))};
}

test('two clients share state; control moves only explicitly; expiry and stale generations are enforced',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:120000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-reconnect-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=startBackend(electron,root,env,1500);t.after(()=>{if(backend.child.exitCode===null)backend.child.kill('SIGKILL');});
  const ready=await backend.ready;
  const a=new BackendConnection({port:ready.port,token:ready.token}),b=new BackendConnection({port:ready.port,token:ready.token});
  t.after(()=>{a.close();b.close();});
  await a.connect();await b.connect();
  const seen={a:new Map(),b:new Map()};
  a.subscribe({onUi:(kind,value)=>seen.a.set(kind,value)});b.subscribe({onUi:(kind,value)=>seen.b.set(kind,value)});
  await until(()=>seen.a.get('state')&&seen.b.get('state'),'both states');
  assert.deepEqual(seen.a.get('state').projects,seen.b.get('state').projects,'one consistent state');
  assert.equal(seen.b.get('lease').holder,null,'subscribing does not take control');
  await a.acquire();
  await until(()=>seen.b.get('lease')?.holder===a.clientId,'B sees who controls');
  await assert.rejects(b.acquire(),{code:'BACKEND_LEASE_HELD'});
  await assert.rejects(b.invoke('local','pilot:set-theme','dark'),{code:'BACKEND_LEASE_REQUIRED'});
  assert.equal((await a.invoke('local','pilot:set-theme','dark')).ok,true);
  await until(()=>seen.b.get('state')?.theme==='dark','observer sees the change');
  const oldGeneration=a.leaseGeneration;
  await b.acquire({takeover:true});
  // A late request of the previous holder is refused, never applied.
  const late=await fetch(`http://127.0.0.1:${ready.port}/v1/commands`,{method:'POST',headers:{authorization:'Bearer '+ready.token,'content-type':'application/json'},
    body:JSON.stringify({requestId:'late-old-writer',operation:'ui.invoke',args:{surface:'local',channel:'pilot:set-theme',input:'light'},
      bootGeneration:a.bootGeneration,leaseGeneration:oldGeneration})});
  assert.equal(late.status,409);assert.equal((await late.json()).error.code,'BACKEND_LEASE_STALE');
  await assert.rejects(a.renew(),{code:'BACKEND_LEASE_STALE'});assert.equal(a.leaseGeneration,null);
  // Without renewal the lease expires and control is free again.
  await until(()=>seen.a.get('lease')?.holder===null,'lease expiry',8000);
  await assert.rejects(b.invoke('local','pilot:set-theme','light'),{code:'BACKEND_LEASE_STALE'});
  await a.acquire();
  assert.equal((await a.invoke('local','pilot:set-theme','light')).ok,true,'a short drop recovers a free lease');
  backend.child.stdin.end('stop\n');assert.equal(await backend.exited,0);
});

test('the Desktop client marks staleness and reconnects to a new backend boot without restarting it itself',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:180000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-client-reconnect-'));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const pids=new Set();
  t.after(async()=>{for(const pid of pids)if(processAlive(pid))try{process.kill(pid,'SIGKILL');}catch{}await settle(300);await fsp.rm(root,{recursive:true,force:true});});
  const first=startBackend(electron,root,env,45000);const ready=await first.ready;pids.add(ready.pid);
  const client=spawn(electron,['.','--desktop-client','--client-fixture','--client-backend-root='+root,'--client-root='+path.join(root,'client')],{cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(client.exitCode===null)client.kill('SIGKILL');});
  const waiting=[];readline.createInterface({input:client.stdout}).on('line',line=>{let value;try{value=JSON.parse(line);}catch{return;}
    for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}});
  const next=match=>new Promise(resolve=>waiting.push({match,resolve}));
  const probe=async()=>{const reply=next(value=>value.op==='probe');client.stdin.write('{"op":"probe"}\n');return (await reply).value;};
  assert.equal((await next(value=>value.clientReady)).connected,true);
  await until(async()=>(await probe()).control,'client holds control');
  first.child.stdin.end('stop\n');await first.exited;
  const lost=await until(async()=>{const value=await probe();return value.stale&&value;},'staleness shown');
  assert.match(lost.title,/нет связи/);
  await settle(2500);
  assert.equal(fs.existsSync(path.join(root,'.backend-host','service.json')),false,'a stopped service is not restarted by the client');
  const second=startBackend(electron,root,env,45000);const again=await second.ready;pids.add(again.pid);
  assert.notEqual(again.generation,ready.generation);
  const restored=await until(async()=>{const value=await probe();return !value.stale&&value.control&&value;},'reconnected to the new boot',30000);
  assert.doesNotMatch(restored.title,/нет связи|наблюдение/);
  client.kill('SIGTERM');
  second.child.stdin.end('stop\n');assert.equal(await second.exited,0);
});

test('a window keeps one clientId across connections, so its own lease is taken back without a takeover',()=>{
  const first=new BackendConnection({port:4100,token:'t'.repeat(32),clientId:'client-window-0001'});
  const second=new BackendConnection({port:4100,token:'t'.repeat(32),clientId:'client-window-0001'});
  assert.equal(first.clientId,second.clientId);
  assert.match(new BackendConnection({port:4100,token:'t'.repeat(32)}).clientId,/^client-/,'a standalone connection still gets its own id');
  assert.throws(()=>new BackendConnection({port:4100,token:'t'.repeat(32),clientId:'bad'}),{code:'BACKEND_AUTH_CONFIG'});
  let now=0;const lease=createControlLease({bootGeneration:'boot',now:()=>now});
  const before=lease.acquire({clientId:first.clientId});
  const after=lease.acquire({clientId:second.clientId});
  assert.equal(after.holder,second.clientId);assert.ok(after.generation>before.generation,'the reconnected window holds a fresh generation');
  assert.throws(()=>lease.renew({clientId:first.clientId,leaseGeneration:before.generation}),{code:'BACKEND_LEASE_STALE'});
  lease.dispose();
});
