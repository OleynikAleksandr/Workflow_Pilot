// Disposable Chromium process: local HTTPS pages with nested cross-origin frames.
// No user profile, ChatGPT, plugin or OS window control.
import {app,BrowserWindow} from 'electron';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import {attestPanelFrames} from '../../src/execution/browser/panel-frame-attestation.mjs';
import {COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../../src/contracts/backend.mjs';

const root=mkdtempSync(path.join(os.tmpdir(),'wp-panel-frames-'));
app.setPath('userData',root);app.setPath('sessionData',path.join(root,'session'));
app.commandLine.appendSwitch('disable-gpu');
const report=value=>process.stdout.write(JSON.stringify(value)+'\n');
const ids={first:'11111111-1111-4111-8111-111111111111',second:'22222222-2222-4222-8222-222222222222',
  wrong:'33333333-3333-4333-8333-333333333333',same:'44444444-4444-4444-8444-444444444444',
  main:'55555555-5555-4555-8555-555555555555',reloaded:'66666666-6666-4666-8666-666666666666'};
const publish=(id,build=COMMUNICATION_BUILD)=>`<script>Object.defineProperty(globalThis,'__workflowPilotPanel',{value:Object.freeze(${JSON.stringify({frame_instance_id:id,build_id:build,protocol_version:COMMUNICATION_PROTOCOL})})});</script>`;
let port;
const pages={
  // The main document also publishes a valid value: the main frame is never attested.
  '/main':q=>`<!doctype html><title>host</title>${publish(ids.main)}<script>globalThis.mutations=0;
    new MutationObserver(list=>{globalThis.mutations+=list.length;}).observe(document,{subtree:true,childList:true,attributes:true,characterData:true});</script>
    <iframe src="https://localhost:${port}/outer?panel=${q.get('panel')}"></iframe>
    <iframe src="https://localhost:${port}/panel?id=${ids.wrong}&build=0.5.41-communication-8"></iframe>
    <iframe src="https://localhost:${port}/empty"></iframe>
    <iframe src="https://127.0.0.1:${port}/panel?id=${ids.same}"></iframe>`,
  '/outer':q=>`<!doctype html><iframe src="https://localhost:${port}/panel?id=${q.get('panel')}"></iframe>`,
  '/panel':q=>`<!doctype html>${publish(q.get('id'),q.get('build')??COMMUNICATION_BUILD)}<p>panel</p>`,
  '/empty':()=>'<!doctype html><p>no value</p>',
};
function certificate(){
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost',
    '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',path.join(root,'key.pem'),'-out',path.join(root,'cert.pem')],{stdio:'ignore'});
  return {key:readFileSync(path.join(root,'key.pem')),cert:readFileSync(path.join(root,'cert.pem'))};
}
async function loaded(window,url){
  await window.loadURL(url);
  // Nested frames finish independently of the main document.
  for(let i=0;i<100;i++){if(window.webContents.mainFrame.framesInSubtree.length>=6)break;await new Promise(r=>setTimeout(r,50));}
  await new Promise(r=>setTimeout(r,200));
}
async function run(){
  const server=https.createServer(certificate(),(req,res)=>{
    const url=new URL(req.url,'https://localhost'),page=pages[url.pathname];
    res.writeHead(page?200:404,{'content-type':'text/html; charset=utf-8'});res.end(page?page(url.searchParams):'');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
  await app.whenReady();
  app.on('certificate-error',(event,_contents,_url,_error,_certificate,callback)=>{event.preventDefault();callback(true);});
  const options={show:false,width:800,height:600,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}};
  const first=new BrowserWindow(options),second=new BrowserWindow(options);
  await loaded(first,`https://127.0.0.1:${port}/main?panel=${ids.first}`);
  await loaded(second,`https://127.0.0.1:${port}/main?panel=${ids.second}`);
  const before=await first.webContents.executeJavaScript('({html:document.documentElement.outerHTML,mutations:globalThis.mutations})');
  const attested=await attestPanelFrames(first.webContents);
  const other=await attestPanelFrames(second.webContents);
  const after=await first.webContents.executeJavaScript('({html:document.documentElement.outerHTML,mutations:globalThis.mutations})');
  await loaded(first,`https://127.0.0.1:${port}/main?panel=${ids.reloaded}`);
  const reloaded=await attestPanelFrames(first.webContents);
  report({ids,frames:first.webContents.mainFrame.framesInSubtree.length,attested,other,reloaded,
    unchanged:before.html===after.html,mutations:after.mutations-before.mutations});
  server.close();first.destroy();second.destroy();
}
run().catch(error=>report({fatal:String(error?.stack??error)})).finally(()=>{try{rmSync(root,{recursive:true,force:true});}catch{}app.exit(0);});
