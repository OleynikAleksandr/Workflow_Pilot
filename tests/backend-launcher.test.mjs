import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {processAlive} from '../src/backend/identity.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=50)=>new Promise(resolve=>setTimeout(resolve,ms));
function launch(electron,root,env) {
  const child=spawn(electron,['.','--desktop-client','--client-fixture','--client-backend-root='+root,'--client-root='+path.join(root,'client-'+Math.random().toString(16).slice(2))],
    {cwd:project,env,stdio:['pipe','pipe','pipe']});
  let errors='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{errors+=chunk;});
  const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('client timeout '+errors)),45000);
    readline.createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.clientReady){clearTimeout(timer);resolve(value);}}catch{}});});
  return {child,ready};
}

test('concurrent launchers share one backend; a stale descriptor starts a new one',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:180000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-launcher-'));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const service=path.join(root,'.backend-host','service.json');
  const pids=new Set();
  t.after(async()=>{
    // Also the backend of a failed assertion: its pid is in the descriptor.
    try{pids.add(JSON.parse(fs.readFileSync(service,'utf8')).pid);}catch{}
    for(const pid of pids)if(processAlive(pid)){try{process.kill(pid,'SIGKILL');}catch{}}
    await settle(300);await fsp.rm(root,{recursive:true,force:true});
  });
  const first=launch(electron,root,env),second=launch(electron,root,env);
  t.after(()=>{for(const client of [first,second])if(client.child.exitCode===null)client.child.kill('SIGKILL');});
  const [a,b]=await Promise.all([first.ready,second.ready]);
  assert.equal(a.connected,true);assert.equal(b.connected,true);
  const descriptor=JSON.parse(fs.readFileSync(service,'utf8'));pids.add(descriptor.pid);
  assert.equal(processAlive(descriptor.pid),true);
  // The losing backend refused ownership and exited; only the descriptor owner serves.
  await settle(1500);
  assert.equal(JSON.parse(fs.readFileSync(service,'utf8')).pid,descriptor.pid);
  for(const client of [first,second]){client.child.kill('SIGTERM');}
  await settle(300);
  assert.equal(processAlive(descriptor.pid),true,'closing every client leaves the backend running');
  process.kill(descriptor.pid,'SIGKILL');
  for(let i=0;i<60&&processAlive(descriptor.pid);i++)await settle();
  assert.equal(fs.existsSync(service),true,'a killed backend leaves its descriptor');
  const third=launch(electron,root,env);t.after(()=>{if(third.child.exitCode===null)third.child.kill('SIGKILL');});
  assert.equal((await third.ready).connected,true);
  const next=JSON.parse(fs.readFileSync(service,'utf8'));pids.add(next.pid);
  assert.notEqual(next.pid,descriptor.pid,'a stale descriptor is replaced by a newly started backend');
  assert.notEqual(next.generation,descriptor.generation);
  third.child.kill('SIGTERM');
  process.kill(next.pid,'SIGTERM');
  for(let i=0;i<100&&processAlive(next.pid);i++)await settle();
  assert.equal(processAlive(next.pid),false);assert.equal(fs.existsSync(path.join(root,'.backend-host','owner.json')),false);
});
