import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {BrowserView} from '../src/frontend/client/browser-view.mjs';
import {defaultPageMode} from '../src/backend/main.mjs';

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));

// One fixture backend of the given page mode; the page is the local fixture chat.
async function startFixtureBackend(t,extra=[]) {
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-native-pages-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root,...extra],
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
  const client=new BackendConnection({port:ready.port,token:ready.token});
  t.after(()=>client.close());
  await client.connect();await client.acquire();
  const until=async(predicate,label)=>{for(let i=0;i<200;i++){const value=await predicate();if(value)return value;await settle(25);}assert.fail('Timed out: '+label);};
  const command=async op=>{backend.stdin.write(JSON.stringify({op})+'\n');return until(()=>replies.find(reply=>reply.op===op),op);};
  const stop=async()=>{
    backend.stdin.end('stop\n');
    return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not stop')),10000);
      backend.once('exit',value=>{clearTimeout(timeout);resolve(value);});});
  };
  return {client,until,command,stop,state:async()=>client.json('/v1/browser/fixture-state',{}),
    rect:selector=>client.json('/v1/fixture/rect',{method:'POST',body:{selector}})};
}

test('page mode follows the platform: views on macOS, offscreen elsewhere',()=>{
  assert.equal(defaultPageMode('darwin'),'view');
  assert.equal(defaultPageMode('linux'),'offscreen');
  assert.equal(defaultPageMode('win32'),'offscreen');
});

test('view-mode page keeps running in its hidden host, serves frames and input, and moves into a window without a reload',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const backend=await startFixtureBackend(t);
  const first=await backend.until(async()=>{const value=await backend.state();return value.page&&value;},'fixture page');
  assert.equal(first.pageMode,'view');assert.equal(first.visible,false,'no visible or focused server window');
  // JavaScript timers of a page in the hidden host keep running.
  await backend.until(async()=>(await backend.state()).page.ticks>first.page.ticks+5,'page timers in the hidden host');
  const draft=await backend.rect('#draft');
  const view=new BrowserView(backend.client,draft.browserSessionId);await view.attach();
  const frame=await backend.until(()=>view.nextFrame(),'first frame');
  assert.ok(frame.meta.pixelWidth>0&&frame.png.length>100,'a hidden view page renders a frame');
  await view.input('pointer',{action:'down',x:draft.x,y:draft.y,button:'left',clickCount:1});
  await view.input('pointer',{action:'up',x:draft.x,y:draft.y,button:'left',clickCount:1});
  await view.input('text',{text:'встроенное окно'});
  await backend.until(async()=>(await backend.state()).page.draft==='встроенное окно','input reaches the hidden page');
  const probe=await backend.command('page-attach-probe');
  assert.deepEqual(probe,{op:'page-attach-probe',attached:true,returned:true,reloaded:false,frame:true});
  const after=await backend.state();
  assert.equal(after.page.bootId,first.page.bootId,'moving between windows never reloads');
  assert.equal(after.page.draft,'встроенное окно','the draft survives the move');
  assert.ok(await backend.until(()=>view.nextFrame({after:null}),'frame after the move'));
  await view.detach();
  assert.equal(await backend.stop(),0);
});

test('offscreen mode stays available on macOS for the server path',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const backend=await startFixtureBackend(t,['--backend-page-mode=offscreen']);
  const first=await backend.until(async()=>{const value=await backend.state();return value.page&&value;},'fixture page');
  assert.equal(first.pageMode,'offscreen');
  const draft=await backend.rect('#draft');
  const view=new BrowserView(backend.client,draft.browserSessionId);await view.attach();
  assert.ok((await backend.until(()=>view.nextFrame(),'offscreen frame')).meta.pixelWidth>0);
  assert.deepEqual(await backend.command('page-attach-probe'),{op:'page-attach-probe',error:'BROWSER_PAGE_MODE_INVALID'});
  await view.detach();
  assert.equal(await backend.stop(),0);
});
