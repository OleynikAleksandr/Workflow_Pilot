import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {attestPanelFrames,validPanelAttestation,PANEL_ATTESTATION_SCRIPT} from '../src/execution/browser/panel-frame-attestation.mjs';
import {BrowserSessions} from '../src/execution/browser/session-runtime.mjs';
import {COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/contracts/backend.mjs';

const here=import.meta.dirname;
const id='0f8fad5b-d9cb-469f-a165-70867728950e';
const value=(frame_instance_id=id,build_id=COMMUNICATION_BUILD,protocol_version=COMMUNICATION_PROTOCOL)=>({frame_instance_id,build_id,protocol_version});

test('real Electron attests only the panel frame of its own page; the main document is neither read nor changed',
  {skip:process.platform!=='darwin'?'macOS fixture; native Windows/Linux pending':false},async t=>{
    const electron=(await import('electron')).default;
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const child=spawn(electron,[path.join(here,'fixtures/panel-frame-host.mjs')],{env,stdio:['ignore','pipe','pipe']});
    t.after(()=>{if(child.exitCode===null)child.kill('SIGTERM');});
    let stderr='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr+=chunk;});
    const lines=readline.createInterface({input:child.stdout})[Symbol.asyncIterator]();
    let timer;const next=await Promise.race([lines.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('fixture timeout: '+stderr.slice(-1500))),60000);})])
      .finally(()=>clearTimeout(timer));
    assert.equal(next.done,false,'Electron fixture exited: '+stderr.slice(-1500));
    const result=JSON.parse(next.value);assert.equal(result.fatal,undefined,result.fatal);
    assert.ok(result.frames>=6,'nested cross-origin frames were mounted');
    assert.deepEqual(result.attested,[{frame_instance_id:result.ids.first}],'only the valid panel frame of this page');
    assert.deepEqual(result.other,[{frame_instance_id:result.ids.second}],'another webContents is attested separately');
    assert.deepEqual(result.reloaded,[{frame_instance_id:result.ids.reloaded}],'a reload discards the previous frame');
    assert.equal(result.unchanged,true);assert.equal(result.mutations,0);
  });

test('attestation validates the published value and skips the main, same-origin, detached and silent frames',async()=>{
  assert.equal(validPanelAttestation(value()),true);
  for(const wrong of [null,{},value('not-a-uuid'),value(id,'0.5.41-communication-8'),value(id,COMMUNICATION_BUILD,8)])
    assert.equal(validPanelAttestation(wrong),false);
  const scripts=[];
  const frame=(origin,result,extra={})=>({origin,processId:extra.processId??1,routingId:extra.routingId??Math.random(),detached:extra.detached??false,
    executeJavaScript:async script=>{scripts.push(script);if(result instanceof Error)throw result;return result==='hang'?new Promise(()=>{}):result;}});
  const main=frame('https://chatgpt.com',value('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),{routingId:0});
  const frames=[main,frame('https://chatgpt.com',value('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
    frame('https://sandbox.example',value()),frame('https://sandbox.example',value()),
    frame('https://sandbox.example',value('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),{detached:true}),
    frame('https://sandbox.example',new Error('gone')),frame('https://sandbox.example','hang'),
    frame('https://sandbox.example',value('dddddddd-dddd-4ddd-8ddd-dddddddddddd','other-build'))];
  main.framesInSubtree=frames;
  const result=await attestPanelFrames({isDestroyed:()=>false,mainFrame:main},{timeoutMs:50});
  assert.deepEqual(result,[{frame_instance_id:id}]);
  assert.ok(scripts.every(script=>script===PANEL_ATTESTATION_SCRIPT),'one constant read-only script');
  assert.equal(scripts.length,5,'main and same-origin ChatGPT frames are never evaluated');
  assert.deepEqual(await attestPanelFrames({isDestroyed:()=>true}),[]);
});

test('the page port binds attested frames to its session, incarnation and current document only',async()=>{
  const contents=Object.assign(new EventEmitter(),{isDestroyed:()=>false,getURL:()=>'https://chatgpt.com/c/fixture'});
  let source,resolveFrames;
  const sessions=new BrowserSessions({host:{create:()=>contents,close(){}},ipc:null,
    connect:(_contents,_ipc,pageSource)=>{source=pageSource;return ()=>{};},
    createComposer:()=>({inFlight:false}),
    attestFrames:async()=>new Promise(resolve=>{resolveFrames=resolve;})});
  const port=sessions.open('page');
  const observe=documentId=>source.accept({version:1,documentId,seq:1,state:{url:'https://chatgpt.com/c/fixture',login:'signed-in',
    editorAvailable:true,editorRevision:1,writable:true,busy:false,sendEnabled:false,draftRevision:0,userMessageCount:0,userMessagesRevision:0}});
  const empty=await port.attestPanelFrames();assert.deepEqual(empty.frames,[],'no observed document, nothing attested');
  observe('document-one-0001');
  let pending=port.attestPanelFrames();resolveFrames([{frame_instance_id:id}]);
  const fresh=await pending;
  assert.equal(fresh.browserSessionId,'page');assert.equal(fresh.documentId,'document-one-0001');
  assert.equal(fresh.incarnation,port.snapshot().incarnation);assert.deepEqual(fresh.frames,[{frame_instance_id:id}]);assert.equal(fresh.stale,false);
  pending=port.attestPanelFrames();contents.emit('did-navigate',{},'https://chatgpt.com/c/fixture');resolveFrames([{frame_instance_id:id}]);
  const stale=await pending;assert.equal(stale.stale,true);assert.deepEqual(stale.frames,[],'a navigation during enumeration discards frames');
  port.release();
});
