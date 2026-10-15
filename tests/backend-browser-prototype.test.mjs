import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import readline from 'node:readline';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const runClient=promisify(execFile);
test('isolated offscreen Chromium retains document and timer across client requests',{skip:process.platform!=='darwin'?'macOS prototype; native Windows/Linux pending':false},async t=>{
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(electron,[path.join(here,'fixtures/backend-browser-probe.mjs')],{
    env,stdio:['pipe','pipe','pipe']});
  let stderr='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr+=chunk;});
  const iterator=readline.createInterface({input:child.stdout})[Symbol.asyncIterator]();
  const read=async()=>{
    let timeout;
    const next=await Promise.race([iterator.next(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('probe timeout: '+stderr.slice(-1500))),15000);})]).finally(()=>clearTimeout(timeout));
    assert.equal(next.done,false,'Electron probe exited: '+stderr);const value=JSON.parse(next.value);
    assert.equal(value.error,undefined,JSON.stringify(value));assert.equal(value.fatal,undefined,JSON.stringify(value));return value;
  };
  let port,token;
  // Each request is an independent HTTP client connection; the backend owns the page.
  const command=async value=>{
    const response=await fetch(`http://127.0.0.1:${port}/fixture`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(value)});
    const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.error,undefined,JSON.stringify(result));return result;
  };
  t.after(()=>{child.stdin.destroy();if(child.exitCode===null)child.kill('SIGTERM');});
  let boot=await read();
  while(boot.phase) {
    if(boot.phase==='ready-wait' && !boot.ready)throw new Error('Electron app.whenReady() did not resolve in 2 seconds; renderer test cannot start');
    boot=await read();
  }
  assert.equal(boot.ready,true);
  ({port,token}=boot);
  assert.ok(boot.rasterScale>=1,'offscreen scale selected from detected monitors');
  const separateClient=async(op,text)=>{
    const {stdout}=await runClient(process.execPath,[path.join(here,'fixtures/backend-browser-client.mjs'),String(port),token,op,text??''],{timeout:10000});
    return JSON.parse(stdout);
  };
  const denied=await fetch(`http://127.0.0.1:${port}/fixture`,{method:'POST',body:'{}'});
  assert.equal(denied.status,403);
  await separateClient('draft','Проверка: Привет, русский текст — 123');
  const first=await command({op:'state'});
  assert.equal(first.state.menuOpen,false);
  assert.equal(first.state.draft,'Проверка: Привет, русский текст — 123');
  const input=await command({op:'input',text:' Яблоко и ёж: проверка ввода'});
  assert.equal(input.visible,false);
  assert.equal(input.focused,false);
  assert.equal(input.state.draft,first.state.draft+' Яблоко и ёж: проверка ввода');
  const click=await command({op:'click',selector:'#action'});
  assert.equal(click.state.menuOpen,true);
  assert.equal(click.visible,false);
  const popup=await command({op:'click',selector:'#popup'});
  assert.equal(popup.popupCount,1,'new popup is handled while the backend window is hidden');
  assert.equal(popup.visible,false);
  const composition=await command({op:'ime',text:'абв'});
  assert.equal(composition.focused,false);
  assert.deepEqual(composition.state.compositionEvents.map(event=>event.name),['compositionstart','compositionupdate','compositionupdate','compositionend']);
  assert.equal(composition.state.compositionEvents[1].data,'абв');
  t.diagnostic('Chromium composition event sequence: '+JSON.stringify(composition.state.compositionEvents));
  const upload=await command({op:'upload',name:'test-file.txt',text:'Файл для браузера\n'});
  assert.equal(upload.state.selectedFile,'test-file.txt');
  assert.equal(upload.readBack,'Файл для браузера\n');
  assert.equal(upload.visible,false);
  const download=await command({op:'download'});
  assert.equal(download.name,'fixture-result.txt');
  assert.equal(download.text,'Результат проверки\n');
  assert.equal(download.visible,false);
  const frame=await command({op:'frame'});
  assert.ok(frame.bytes>1000,'actual Chromium frame');
  assert.equal(frame.width,Math.round(900*boot.rasterScale),'offscreen raster respects deviceScaleFactor');
  assert.equal(frame.height,Math.round(700*boot.rasterScale));
  const point=await command({op:'rect',selector:'#action'});
  const viewer=JSON.parse((await runClient((await import('electron')).default,[path.join(here,'fixtures/backend-browser-viewer.mjs'),String(port),token,String(point.x),String(point.y)],{
    timeout:20000,env:{...env},maxBuffer:1024*1024})).stdout.trim().split('\n').at(-1));
  assert.equal(viewer.fatal,undefined,JSON.stringify(viewer));
  assert.equal(viewer.visible,false);
  assert.deepEqual(viewer.decoded,{width:frame.width,height:frame.height,logicalWidth:900,logicalHeight:700,
    rasterScale:boot.rasterScale,clientScale:viewer.clientScale});
  assert.ok(viewer.clientScale>=1,'frontend queries its display scale');
  assert.ok(boot.rasterScale>=viewer.clientScale,'frame is not undersampled on the viewer monitor');
  assert.ok(viewer.compositedBytes>1000);
  assert.equal(viewer.state.menuOpen,false,'a pixel-coordinate click in an independent renderer reached the backend page');
  const latency=[];
  for(let i=0;i<5;i++){
    const started=performance.now();
    const response=await fetch(`http://127.0.0.1:${port}/frame`,{method:'POST',headers:{authorization:`Bearer ${token}`}});
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');
    const body=Buffer.from(await response.arrayBuffer());
    assert.ok(body.length>1000);
    assert.equal(body.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    latency.push(Math.round((performance.now()-started)*10)/10);
  }
  t.diagnostic('PNG/frame full loopback roundtrip milliseconds: '+JSON.stringify(latency));
  t.diagnostic('Hidden-client Cyrillic text insertion: '+input.elapsedMs+'ms; raster payload: '+frame.bytes+' bytes');
  t.diagnostic('Automatic display scale: frontend '+viewer.clientScale+'x, backend '+boot.rasterScale+'x, PNG '+frame.width+'x'+frame.height);
  // No active connection while the backend page/timer continue to run.
  const idleStart=await command({op:'metrics'});
  await new Promise(resolve=>setTimeout(resolve,350));
  const idleEnd=await command({op:'metrics'});
  t.diagnostic('Backend main CPU percentage samples during disconnected timer: '+[idleStart.cpu.percentCPUUsage,idleEnd.cpu.percentCPUUsage].join(', ')+'; renderer/GPU excluded');
  // First client process is gone: a fresh Node process reconnects to the same browser.
  const second=await separateClient('state');
  assert.equal(second.state.bootId,first.state.bootId,'no browser reload');
  assert.ok(second.state.ticks>first.state.ticks,'timer continues without a client request');
  assert.equal(second.state.draft,input.state.draft);
  assert.equal(second.state.menuOpen,false);
  child.stdin.write(JSON.stringify({op:'stop'})+'\n');
  assert.equal((await read()).ok,true);
});
