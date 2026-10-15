// Disposable Chromium process: no user profile, ChatGPT, plugin or OS window control.
import {app,BrowserWindow,screen} from 'electron';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline';
import http from 'node:http';
import {randomBytes} from 'node:crypto';

const root=mkdtempSync(path.join(os.tmpdir(),'wp-browser-probe-'));
app.setPath('userData',root);
app.setPath('sessionData',path.join(root,'session'));
app.commandLine.appendSwitch('disable-gpu');
let window,frames=0,lastFrame=0;
let popupCount=0;
let download;
let server;
let rasterScale=1;
const token=randomBytes(24).toString('hex');
const report=value=>process.stdout.write(JSON.stringify(value)+'\n');
report({phase:'module-start',electron:process.versions.electron,ready:app.isReady()});
app.once('ready',()=>report({phase:'ready-event'}));
setTimeout(()=>report({phase:'ready-wait',ready:app.isReady()}),2000).unref();
const state=async()=>window.webContents.executeJavaScript(`({bootId:fixtureBootId,ticks:fixtureTicks,draft:document.querySelector('#draft').value,menuOpen:!document.querySelector('#menu').hidden,selectedFile:document.querySelector('#selected-file').textContent,compositionEvents:window.fixtureCompositions})`);
async function run() {
  await app.whenReady();
  report({phase:'app-ready'});
  // The detached browser cannot change its raster density without recreating the
  // WebContents. Render for the densest currently attached local display instead.
  rasterScale=Math.max(1,...screen.getAllDisplays().map(display=>display.scaleFactor));
  window=new BrowserWindow({show:false,width:900,height:700,webPreferences:{offscreen:{deviceScaleFactor:rasterScale},backgroundThrottling:false,sandbox:true,nodeIntegration:false,contextIsolation:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'allow',overrideBrowserWindowOptions:{show:false}}));
  window.webContents.on('did-create-window',popup=>{popupCount++;popup.close();});
  window.webContents.session.on('will-download',(_event,item)=>{
    const target=path.join(root,'fixture-result.txt');item.setSavePath(target);
    download=new Promise((resolve,reject)=>item.once('done',(_done,status)=>status==='completed'?resolve(target):reject(new Error('DOWNLOAD_'+status))));
  });
  window.webContents.on('paint',()=>{frames++;lastFrame=Date.now()});
  await window.loadURL(new URL('./backend-browser-page.html',import.meta.url).href);
  server=http.createServer(async(req,res)=>{
    const send=(code,value)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
    if(req.headers.host!==`127.0.0.1:${server.address().port}` || req.headers.authorization!==`Bearer ${token}` || req.headers.origin)return send(403,{error:'ACCESS_DENIED'});
    if(req.method==='POST' && req.url==='/frame') {
      const start=performance.now();const image=await window.webContents.capturePage();const png=image.toPNG();
      res.writeHead(200,{'content-type':'image/png','content-length':png.length,'cache-control':'no-store','x-capture-ms':String(Math.round((performance.now()-start)*10)/10),
        'x-logical-width':'900','x-logical-height':'700','x-raster-scale':String(rasterScale)});
      res.end(png);return;
    }
    if(req.method!=='POST'||req.url!=='/fixture')return send(404,{error:'NOT_FOUND'});
    let payload='';
    try {
      for await(const chunk of req){payload+=chunk;if(payload.length>4096)return send(413,{error:'TOO_LARGE'});}
      send(200,await execute(JSON.parse(payload)));
    }catch(error){send(400,{error:error.message});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  report({ready:true,pid:process.pid,port:server.address().port,token,rasterScale,logicalSize:{width:900,height:700}});
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})) {
    try {
      const command=JSON.parse(line);
      if(command.op==='stop'){report({ok:true});break;}
      report(await execute(command));
    }catch(error){report({error:error.message});}
  }
}
async function execute(command) {
      if(command.op==='state')return {state:await state(),frames,lastFrame,popupCount,rasterScale};
      if(command.op==='metrics')return {cpu:process.getCPUUsage(),memory:await process.getProcessMemoryInfo(),frames,lastFrame};
      else if(command.op==='draft') {
        await window.webContents.executeJavaScript(`document.querySelector('#draft').value=${JSON.stringify(command.text)}`);
        return {ok:true};
      } else if(command.op==='menu') {
        await window.webContents.executeJavaScript(`document.querySelector('#action').click()`);
        return {ok:true};
      } else if(command.op==='frame') {
        const image=await window.webContents.capturePage();
        return {width:image.getSize().width,height:image.getSize().height,bytes:image.toPNG().length};
      } else if(command.op==='input') {
        const started=performance.now();
        window.webContents.debugger.attach('1.3');
        try {
          await window.webContents.debugger.sendCommand('Runtime.evaluate', {expression:"document.querySelector('#draft').focus()"});
          await window.webContents.debugger.sendCommand('Input.insertText',{text:command.text});
        } finally {window.webContents.debugger.detach();}
        return {elapsedMs:Math.round((performance.now()-started)*10)/10,state:await state(),focused:window.isFocused(),visible:window.isVisible()};
      } else if(command.op==='upload') {
        if(!/^[A-Za-z0-9-]{1,35}\.txt$/.test(command.name)||typeof command.text!=='string'||Buffer.byteLength(command.text)>2048)throw Error('INVALID_FILE');
        const target=path.join(root,command.name);
        writeFileSync(target,command.text,{flag:'wx'});
        window.webContents.debugger.attach('1.3');
        try {
          const {root:doc}=await window.webContents.debugger.sendCommand('DOM.getDocument');
          const {nodeId}=await window.webContents.debugger.sendCommand('DOM.querySelector',{nodeId:doc.nodeId,selector:'#file'});
          await window.webContents.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:[target]});
        } finally {window.webContents.debugger.detach();}
        return {state:await state(),readBack:readFileSync(target,'utf8'),visible:window.isVisible()};
      } else if(command.op==='download') {
        download=null;
        let timer;
        const started=Promise.race([
          new Promise(resolve=>window.webContents.session.once('will-download',resolve)),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DOWNLOAD_NOT_STARTED')),3000);}),
        ]);
        await window.webContents.executeJavaScript(`document.querySelector('#download').click()`);
        await started.finally(()=>clearTimeout(timer));
        const target=await download;
        return {name:path.basename(target),text:readFileSync(target,'utf8'),visible:window.isVisible()};
      } else if(command.op==='rect') {
        return await window.webContents.executeJavaScript(`(()=>{const r=document.querySelector(${JSON.stringify(command.selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
      } else if(command.op==='click'||command.op==='clickAt') {
        const center=command.op==='clickAt'?{x:command.x,y:command.y}:await window.webContents.executeJavaScript(`(()=>{const r=document.querySelector(${JSON.stringify(command.selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        if(!Number.isFinite(center.x)||!Number.isFinite(center.y)||center.x<0||center.y<0||center.x>900||center.y>700)throw Error('CLICK_OUT_OF_BOUNDS');
        window.webContents.debugger.attach('1.3');
        try {
          await window.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...center});
          await window.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...center});
        } finally {window.webContents.debugger.detach();}
        return {state:await state(),popupCount,visible:window.isVisible(),focused:window.isFocused()};
      } else if(command.op==='ime') {
        window.webContents.debugger.attach('1.3');
        try {
          await window.webContents.debugger.sendCommand('Runtime.evaluate',{expression:"document.querySelector('#draft').focus()"});
          await window.webContents.debugger.sendCommand('Input.imeSetComposition',{text:command.text,selectionStart:command.text.length,selectionEnd:command.text.length});
          const interim=await state();
          await window.webContents.debugger.sendCommand('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
          return {interim,state:await state(),focused:window.isFocused()};
        } finally {window.webContents.debugger.detach();}
      }
      return {error:'UNKNOWN_COMMAND'};
}
void run().catch(error=>{report({fatal:error.message});process.exitCode=1;}).finally(()=>{
  server?.closeAllConnections();server?.close();window?.destroy();app.quit();rmSync(root,{recursive:true,force:true});
});
