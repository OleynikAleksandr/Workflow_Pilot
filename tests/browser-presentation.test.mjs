import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {PageInput} from '../src/execution/browser/presentation/input.mjs';
import {createTransfers} from '../src/backend/transfers.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {BrowserView} from '../src/frontend/client/browser-view.mjs';

const settle=(ms=20)=>new Promise(resolve=>setTimeout(resolve,ms));

test('input maps to addressed CDP commands and a release never replays text',async()=>{
  const sent=[],input=new PageInput(async(method,params)=>{sent.push([method,params]);},{platform:'darwin'});
  await input.dispatch({type:'pointer',data:{action:'down',x:10,y:20,button:'left',clickCount:1}});
  await input.dispatch({type:'key',data:{action:'down',key:'Shift',code:'ShiftLeft',modifiers:['shift']}});
  await input.dispatch({type:'composition',data:{phase:'start',text:'に',selectionStart:1,selectionEnd:1}});
  assert.deepEqual(input.pressed,{buttons:['left'],keys:['ShiftLeft'],composing:true});
  await input.dispatch({type:'key',data:{action:'down',key:'a',code:'KeyA',modifiers:['meta']}});
  await input.dispatch({type:'key',data:{action:'down',key:'Enter',code:'Enter'}});
  await input.dispatch({type:'text',data:{text:'Привет'}});
  assert.deepEqual(sent.find(([,params])=>params.key==='a')[1].commands,['selectAll']);
  assert.equal(sent.find(([,params])=>params.key==='Enter')[1].text,'\r');
  sent.length=0;await input.releaseAll();
  assert.deepEqual(sent.map(([method,params])=>[method,params.type??params.text]).sort(),[
    ['Input.dispatchKeyEvent','keyUp'],['Input.dispatchKeyEvent','keyUp'],['Input.dispatchKeyEvent','keyUp'],
    ['Input.dispatchMouseEvent','mouseReleased'],['Input.imeSetComposition','']].sort());
  assert.equal(sent.some(([method])=>method==='Input.insertText'),false,'release does not replay text');
  sent.length=0;await input.releaseAll();assert.deepEqual(sent,[]);
  await input.dispatch({type:'pointer',data:{action:'up',x:1,y:1,button:'left'}});
  assert.deepEqual(sent,[],'an unmatched release is ignored');
});

test('transfers accept only sequential complete uploads into a private backend directory',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-transfers-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const events=[],transfers=createTransfers({directory:path.join(root,'transfers'),emit:(type,data)=>events.push([type,data])});
  assert.throws(()=>transfers.startUpload({transferId:'t1',name:'../escape.txt',size:3,direction:'upload'}),{code:'BACKEND_TRANSFER_INVALID'});
  assert.throws(()=>transfers.startUpload({transferId:'t1',name:'a.txt',size:3,direction:'download'}),{code:'BACKEND_TRANSFER_INVALID'});
  transfers.startUpload({transferId:'t1',name:'заметка.txt',size:6,direction:'upload'});
  assert.throws(()=>transfers.appendUpload('t1',2,Buffer.from('ab')),{code:'BACKEND_TRANSFER_INVALID'});
  transfers.appendUpload('t1',0,Buffer.from('abc'));
  assert.throws(()=>transfers.finishUpload('t1'),{code:'BACKEND_TRANSFER_INCOMPLETE'});
  assert.throws(()=>transfers.appendUpload('t1',3,Buffer.from('defg')),{code:'BACKEND_TRANSFER_INVALID'});
  transfers.appendUpload('t1',3,Buffer.from('def'));
  const file=transfers.finishUpload('t1');
  assert.equal(path.dirname(path.dirname(file)),path.join(root,'transfers'));
  assert.equal(fs.readFileSync(file,'utf8'),'abcdef');assert.equal(fs.statSync(path.dirname(file)).mode&0o077,0);
  const item=new EventEmitter();let target;
  Object.assign(item,{getFilename:()=>'../../report.txt',setSavePath:value=>{target=value;},getMimeType:()=>'text/plain'});
  transfers.download(item,'page-1');
  assert.equal(path.basename(target),'report.txt');assert.equal(path.dirname(path.dirname(target)),path.join(root,'transfers'));
  fs.writeFileSync(target,'Результат');item.emit('done',{},'completed');
  const [[type,ready]]=events;assert.equal(type,'download-ready');assert.equal(ready.browserSessionId,'page-1');
  const read=transfers.readDownload(ready.transferId);
  let text='';for await(const chunk of read.stream)text+=chunk;
  assert.equal(text,'Результат');assert.equal(transfers.discard(ready.transferId),true);
  assert.throws(()=>transfers.readDownload(ready.transferId),{code:'BACKEND_TRANSFER_NOT_FOUND'});
  transfers.close();assert.equal(fs.existsSync(path.join(root,'transfers')),false);
});

test('Electron backend page: frames, addressed input, clipboard, files, popup, release and lease',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const {spawn}=await import('node:child_process');
  const readline=await import('node:readline');
  const {fileURLToPath}=await import('node:url');
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-presentation-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout});
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);}catch{}});
      backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('backend startup timeout: '+errors)),25000);}),
  ]).finally(()=>clearTimeout(deadline));
  const client=new BackendConnection({port:ready.port,token:ready.token});
  t.after(()=>client.close());
  await client.connect();await client.acquire();
  const events=[];client.subscribe({onEvent:event=>events.push(event)});
  const fixture=async(route,body)=>client.json(route,body?{method:'POST',body}:{});
  const state=async()=>(await fixture('/v1/browser/fixture-state')).page;
  const rect=selector=>fixture('/v1/fixture/rect',{selector});
  const until=async(predicate,label)=>{for(let i=0;i<200;i++){const value=await predicate();if(value)return value;await settle(25);}assert.fail('Timed out: '+label);};
  const action=await rect('#action');
  const view=new BrowserView(client,action.browserSessionId);
  await view.attach();
  const frame=await until(()=>view.nextFrame(),'first frame');
  assert.equal(Buffer.from(frame.png.subarray(0,8)).toString('hex'),'89504e470d0a1a0a');
  assert.equal(frame.meta.pixelWidth,Math.round(frame.meta.logicalWidth*frame.meta.scale));
  const click=async({x,y})=>{
    await view.input('pointer',{action:'down',x,y,button:'left',clickCount:1});
    await view.input('pointer',{action:'up',x,y,button:'left',clickCount:1});
  };
  await click(action);
  assert.equal((await until(async()=>(await state()).menuOpen&&await state(),'menu')).menuOpen,true);
  await click(await rect('#draft'));
  await view.input('text',{text:'Привет, мир'});
  await view.input('composition',{phase:'start',text:'й',selectionStart:1,selectionEnd:1});
  await view.input('composition',{phase:'update',text:'йо',selectionStart:2,selectionEnd:2});
  await view.input('composition',{phase:'end',text:'ё',selectionStart:1,selectionEnd:1});
  let page=await until(async()=>{const value=await state();return value.draft.endsWith('ё')&&value;},'composition');
  assert.equal(page.draft,'Привет, мирё');
  assert.ok(page.compositions.some(item=>item.name==='compositionstart'));
  await view.input('key',{action:'down',key:'Backspace',code:'Backspace'});
  await view.input('key',{action:'up',key:'Backspace',code:'Backspace'});
  await until(async()=>(await state()).draft==='Привет, мир','backspace');
  await view.input('key',{action:'down',key:'a',code:'KeyA',modifiers:['meta']});
  await view.input('key',{action:'up',key:'a',code:'KeyA',modifiers:['meta']});
  assert.equal(await until(async()=>{const text=await view.selection();return text==='Привет, мир'&&text;},'selection'),'Привет, мир');
  await view.paste('вставка');
  await until(async()=>(await state()).draft==='вставка','paste replaces selection');
  // File chooser is intercepted on the backend; the client file answers it.
  await click(await rect('#file'));
  const chooser=await until(()=>events.find(event=>event.type==='browser.file-chooser'),'file chooser');
  await view.upload({chooserId:chooser.data.chooserId,name:'client-note.txt',bytes:new TextEncoder().encode('с клиента\n'),mime:'text/plain'});
  await until(async()=>(await state()).selectedFile==='client-note.txt','upload attached');
  await click(await rect('#download'));
  const download=await until(()=>events.find(event=>event.type==='browser.download-ready'),'download');
  const file=await view.download(download.data.transferId);
  assert.equal(file.name,'fixture-result.txt');assert.equal(new TextDecoder().decode(file.bytes),'Результат проверки\n');
  await click(await rect('#popup'));
  const popup=await until(()=>events.find(event=>event.type==='browser.page-opened'),'popup');
  assert.equal(popup.data.kind,'popup');assert.equal(popup.data.parentId,action.browserSessionId);
  const popupView=new BrowserView(client,popup.data.browserSessionId);await popupView.attach();
  const popupFrame=await until(()=>popupView.nextFrame(),'popup frame');
  assert.ok(popupFrame.meta.pixelWidth>0,'popup is presented without a server window');
  await popupView.detach();
  // A lost viewer releases its pressed button and key; nothing is replayed.
  const before=await state();
  await view.input('pointer',{action:'down',x:5,y:5,button:'left',clickCount:1});
  await view.input('key',{action:'down',key:'Shift',code:'ShiftLeft',modifiers:['shift']});
  assert.equal(await view.detach(),true);
  page=await until(async()=>{const value=await state();return value.mouseUps>before.mouseUps&&value.keyUps.includes('Shift')&&value;},'release');
  assert.equal(page.draft,'вставка');
  const again=new BrowserView(client,action.browserSessionId);await again.attach();await until(()=>again.nextFrame(),'frame');
  const body=again.frame;
  const input={browserSessionId:action.browserSessionId,documentGeneration:body.documentGeneration,sequence:1,
    leaseGeneration:client.leaseGeneration,type:'text',data:{text:'!'}};
  await client.json('/v1/browser/input',{method:'POST',body:{viewerId:again.viewerId,input}});
  await assert.rejects(client.json('/v1/browser/input',{method:'POST',body:{viewerId:again.viewerId,input}}),{code:'BROWSER_INPUT_REPLAY'});
  await assert.rejects(client.json('/v1/browser/input',{method:'POST',body:{viewerId:again.viewerId,
    input:{...input,sequence:2,documentGeneration:body.documentGeneration+1}}}),{code:'BROWSER_DOCUMENT_CHANGED'});
  // An observer sees frames but cannot type, paste or resize.
  const observer=new BackendConnection({port:ready.port,token:ready.token});await observer.connect();
  const watch=new BrowserView(observer,action.browserSessionId);await watch.attach();await until(()=>watch.nextFrame(),'frame');
  await assert.rejects(watch.input('text',{text:'x'}),{code:'BACKEND_LEASE_REQUIRED'});
  // Clients share one local bearer; the lease generation separates writer from observers.
  await assert.rejects(observer.json('/v1/browser/input',{method:'POST',body:{viewerId:watch.viewerId,
    input:{...input,sequence:3,leaseGeneration:client.leaseGeneration-1}}}),{code:'BACKEND_LEASE_STALE'});
  await assert.rejects(watch.setViewport(1200,800),{code:'BACKEND_LEASE_STALE'});
  // A new writer ends the previous holder's pressed input.
  const pressed=await state();
  const holder=new BrowserView(client,action.browserSessionId);await holder.attach();await until(()=>holder.nextFrame(),'frame');
  await holder.input('pointer',{action:'down',x:6,y:6,button:'left',clickCount:1});
  await observer.acquire({takeover:true});
  await until(async()=>(await state()).mouseUps>pressed.mouseUps,'lease change release');
  assert.equal((await fixture('/v1/browser/fixture-state')).visible,false,'no visible or focused server window');
  observer.close();
  backend.stdin.end('stop\n');
  const code=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not stop')),10000);
    backend.once('exit',value=>{clearTimeout(timeout);resolve(value);});});
  assert.equal(code,0);
});
