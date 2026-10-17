import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {BackendConnection} from '../src/frontend/client/connection.mjs';

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));

async function startFixtureBackend(t) {
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-native-window-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout}),replies=[];
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);else if(value.op)replies.push(value);}catch{}});
      backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('backend startup timeout: '+errors)),25000);}),
  ]).finally(()=>clearTimeout(deadline));
  const until=async(predicate,label,limit=300)=>{for(let i=0;i<limit;i++){const value=await predicate();if(value)return value;await settle(25);}assert.fail('Timed out: '+label);};
  // Each command gets its own reply: earlier replies of the same op are consumed.
  const command=async(op)=>{
    const seen=replies.length;backend.stdin.write(JSON.stringify({op})+'\n');
    return until(()=>{const index=replies.findIndex((reply,i)=>i>=seen&&reply.op===op);return index>=0&&replies.splice(index,1)[0];},op);
  };
  const stop=async()=>{
    backend.stdin.end('stop\n');
    return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not stop')),10000);
      backend.once('exit',value=>{clearTimeout(timeout);resolve(value);});});
  };
  return {ready,until,command,stop,errors:()=>errors};
}

test('native window of the backend: state, control, the real page, an HTTP client beside it, and close without stopping work',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:120000},async t=>{
  const backend=await startFixtureBackend(t);
  const http=new BackendConnection({port:backend.ready.port,token:backend.ready.token});t.after(()=>http.close());
  await http.connect();
  // The fixture page exists before the window opens.
  const first=await backend.until(async()=>{const value=await http.json('/v1/browser/fixture-state',{});return value.page&&value;},'fixture page');
  assert.deepEqual(await backend.command('native-open'),{op:'native-open',opened:true});
  const opened=await backend.until(async()=>{const value=await backend.command('native-probe');
    return value.native?.open&&value.native.control&&value.native.sidebar.length>0&&value;},'native window with state and control');
  assert.match(opened.native.clientId,/^native-/);
  // The selected page is the real view inside the window.
  const shown=await backend.until(async()=>{const value=await backend.command('native-probe');return value.native.page&&value.attached&&value;},'page shown in the window');
  const draft=await http.json('/v1/fixture/rect',{method:'POST',body:{selector:'#draft'}});
  assert.equal(shown.native.page,draft.browserSessionId,'the window shows the selected backend page');
  assert.equal(first.visible,false);
  // The HTTP client takes control; the native window becomes an observer.
  // Without the lease an HTTP client cannot act; the window holds it.
  await assert.rejects(http.acquire(),{code:'BACKEND_LEASE_HELD'});
  await http.acquire({takeover:true});
  await backend.until(async()=>{const value=await backend.command('native-probe');return value.native.control===false&&value;},'native window observes');
  await http.release();
  await backend.until(async()=>(await backend.command('native-probe')).native.control,'native window takes the free lease back');
  // Closing the window returns the page to its hidden host; the page keeps running.
  const before=(await http.json('/v1/browser/fixture-state',{})).page;
  await backend.command('native-close');
  const closed=await backend.until(async()=>{const value=await backend.command('native-probe');return value.native===null&&value;},'window closed');
  assert.equal(closed.attached,false,'the page left the closed window');
  const after=await backend.until(async()=>{const value=(await http.json('/v1/browser/fixture-state',{})).page;return value.ticks>before.ticks+5&&value;},'page keeps running');
  assert.equal(after.bootId,before.bootId,'closing the window never reloads the page');
  // The window opens again with the same page.
  await backend.command('native-open');
  await backend.until(async()=>{const value=await backend.command('native-probe');return value.native?.open&&value.attached&&value;},'reopened window shows the page');
  assert.equal(await backend.stop(),0,backend.errors());
});
