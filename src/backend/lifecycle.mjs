import fs from 'node:fs';
import path from 'node:path';
import {BACKEND_API_VERSION} from '../contracts/backend.mjs';
import {startBackendServer} from './server.mjs';
import {createBackendEvents} from './events.mjs';
import {openOperationJournal,createBackendOperations,backendCatalog,backendPublicState} from './operations.mjs';
import {createTransfers} from './transfers.mjs';
import {createPresentationRoutes} from '../execution/facade.mjs';

const FIXTURE_PAGE=new URL('../../tests/fixtures/backend-browser-page.html',import.meta.url);
const FIXTURE_ENTRY='https://chatgpt.com/fixture-entry';

// Test profiles only: chatgpt.com is answered by a local page, nothing leaves
// the machine and no account is used.
export async function installFixtureChat(session) {
  const html=await fs.promises.readFile(FIXTURE_PAGE);
  await session.protocol.handle('https',request=>new URL(request.url).hostname==='chatgpt.com'
    ? new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})
    : new Response('',{status:404}));
}

const readBody=req=>new Promise((resolve,reject)=>{
  let size=0;const chunks=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>4096){reject(Object.assign(new Error('Too large'),{code:'BACKEND_MESSAGE_SIZE'}));req.destroy();}else chunks.push(chunk);});
  req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject);
});

// Fixture routes (test profiles only) address backend-owned pages and expose
// no URL navigation, JavaScript or file access.
export async function startBackendPort({identity,claim,services,host,fixtureRoot=null,onEvents=()=>{}}) {
  const fixturePage=async()=>{
    const {sessions}=services;
    if(sessions.visible&&!sessions.visible.disposed)return sessions.visible;
    const entry=sessions.ensure(null);
    if(entry.browser.snapshot().url!==FIXTURE_ENTRY)await sessions.navigate(entry,FIXTURE_ENTRY);
    return entry;
  };
  const contentsOf=page=>host.view(page.key).webContents;
  const pageInfo=async page=>{
    const contents=contentsOf(page),entry=services.pages.list().find(item=>item.key===page.key);
    // A crashed renderer never answers; the fixture probe is bounded.
    let timer;
    const live=page.browser.snapshot().crashed||contents.isCrashed()?null:await Promise.race([
      contents.executeJavaScript(`({bootId:fixtureBootId,ticks:fixtureTicks,draft:document.querySelector('#draft')?.value??'',
        menuOpen:!document.querySelector('#menu')?.hidden,selectedFile:document.querySelector('#selected-file')?.textContent??'',
        compositions:window.fixtureCompositions??[],mouseUps:window.fixtureMouseUps??0,keyUps:window.fixtureKeyUps??[]})`).catch(()=>null),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1000);})]).finally(()=>clearTimeout(timer));
    return {...entry,webContentsId:contents.id,page:live};
  };
  const respond=(res,status,value)=>{
    const body=Buffer.from(JSON.stringify(value));
    res.writeHead(status,{'content-type':'application/json','content-length':body.length,'cache-control':'no-store'});
    res.end(body);
  };
  const fixtureRoute=async(req,res)=>{
    if(req.method==='GET'&&req.url==='/v1/browser/fixture-state') {
      const page=await fixturePage();
      return respond(res,200,{bootGeneration:claim.generation,visible:false,...await pageInfo(page)});
    }
    if(req.method==='GET'&&req.url==='/v1/browser/frame') {
      const png=(await contentsOf(await fixturePage()).capturePage()).toPNG();
      res.writeHead(200,{'content-type':'image/png','content-length':png.length,'cache-control':'no-store'});
      res.end(png);return true;
    }
    if(req.method==='POST'&&req.url==='/v1/fixture/viewers') {
      const page=await fixturePage();
      return respond(res,200,{viewerId:services.pages.attachViewer(page.key),key:page.key});
    }
    if(req.method==='POST'&&req.url==='/v1/fixture/viewers/detach') {
      const {viewerId}=JSON.parse(await readBody(req)||'{}');
      return respond(res,200,{detached:services.pages.detachViewer(viewerId)});
    }
    if(req.method==='POST'&&req.url==='/v1/fixture/rect') {
      const {selector}=JSON.parse(await readBody(req)||'{}');
      if(!['#action','#draft','#popup','#file','#download','#menu'].includes(selector))return respond(res,400,{error:{code:'BACKEND_MESSAGE_INVALID'}});
      const page=await fixturePage();
      return respond(res,200,{browserSessionId:host.browserSessionId(page.key),
        ...await contentsOf(page).executeJavaScript(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`)});
    }
    if(req.method==='POST'&&req.url==='/v1/fixture/crash') {
      const page=await fixturePage();contentsOf(page).forcefullyCrashRenderer();
      return respond(res,200,{key:page.key});
    }
    return false;
  };
  const journal=openOperationJournal(path.join(identity.ownerDir,'operations.jsonl'));
  const events=createBackendEvents({bootGeneration:claim.generation,state:()=>backendPublicState(services)});
  services.onChange(events.changed);
  onEvents(events);
  const transfers=createTransfers({directory:path.join(identity.ownerDir,'transfers'),emit:events.browser});
  host.emit=events.browser;host.onDownload=transfers.download;
  let presentation;
  const operations=createBackendOperations({bootGeneration:claim.generation,journal,catalog:backendCatalog(services),
    onOperation:view=>{events.operation(view);events.changed();},onLease:()=>{void presentation?.leaseChanged();}});
  presentation=createPresentationRoutes({host,transfers,leaseGeneration:()=>operations.leaseGeneration});
  const extra=async(req,res,url)=>{
    if(fixtureRoot&&await fixtureRoute(req,res)!==false)return true;
    return presentation.route(req,res,url);
  };
  let server;
  try {
    server=await startBackendServer({claim,operations,events,extra,
      status:()=>({apiVersion:BACKEND_API_VERSION,identity:'workflow-pilot',bootGeneration:claim.generation,readiness:'ready',
        projects:services.control.projects.snapshot().projects.length,
        browser:{connected:true,owner:'backend',fixtureAvailable:!!fixtureRoot}})});
  }catch(error){services.onChange(null);host.emit=()=>{};host.onDownload=null;transfers.close();events.close();throw error;}
  try{claim.publish(server.port);}
  catch(error){await server.close();throw error;}
  let stopped=false;
  const stop=async()=>{
    if(stopped)return;stopped=true;
    services.onChange(null);host.emit=()=>{};host.onDownload=null;await server.close();
    // Accepted operations finish or stay recorded before services go away.
    await operations.idle();
    await services.dispose();
    transfers.close();
    claim.release();
  };
  return Object.freeze({port:server.port,stop});
}
