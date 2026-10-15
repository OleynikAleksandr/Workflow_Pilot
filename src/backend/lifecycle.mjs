import http from 'node:http';
import fs from 'node:fs';
import {authorizeLoopback,checkBackendCompatibility} from './protocol.mjs';
import {BACKEND_API_VERSION} from '../contracts/backend.mjs';

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
  req.on('data',chunk=>{size+=chunk.length;if(size>4096){reject(Object.assign(new Error('Too large'),{code:'BACKEND_ACCESS_DENIED'}));req.destroy();}else chunks.push(chunk);});
  req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject);
});

// The production API is T005. Fixture routes address only backend-owned pages
// and expose no URL navigation, JavaScript or file access.
export async function startBackendPort({claim,services,host,fixtureRoot=null}) {
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
      contents.executeJavaScript('({bootId:fixtureBootId,ticks:fixtureTicks})').catch(()=>null),
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
    if(req.method==='POST'&&req.url==='/v1/fixture/crash') {
      const page=await fixturePage();contentsOf(page).forcefullyCrashRenderer();
      return respond(res,200,{key:page.key});
    }
    return false;
  };
  const server=http.createServer(async(req,res)=>{
    try {
      authorizeLoopback(req.headers,{port:server.address().port,token:claim.token});
      checkBackendCompatibility({apiVersion:BACKEND_API_VERSION,identity:'workflow-pilot',bootGeneration:claim.generation},
        {identity:'workflow-pilot'});
      if(req.method==='GET'&&req.url==='/v1/status') {
        return respond(res,200,{apiVersion:BACKEND_API_VERSION,identity:'workflow-pilot',
          bootGeneration:claim.generation,readiness:'ready',projects:services.control.projects.snapshot().projects.length,
          browser:{connected:true,owner:'backend',fixtureAvailable:!!fixtureRoot}});
      }
      if(fixtureRoot&&await fixtureRoute(req,res)!==false)return;
      respond(res,404,{error:{code:'BACKEND_ROUTE_NOT_FOUND',message:'Операция недоступна.'}});
    }catch(error){
      if(res.headersSent)return res.destroy();
      respond(res,403,{error:{code:error?.code==='BACKEND_ACCESS_DENIED'?'BACKEND_ACCESS_DENIED':'BACKEND_UNAVAILABLE',message:'Доступ запрещён.'}});
    }
  });
  await new Promise((resolve,reject)=>{
    const onError=error=>reject(error);server.once('error',onError);
    server.listen(0,'127.0.0.1',()=>{server.off('error',onError);resolve();});
  });
  try{claim.publish(server.address().port);}
  catch(error){await new Promise(resolve=>server.close(resolve));throw error;}
  let stopped=false;
  const stop=async()=>{
    if(stopped)return;stopped=true;
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await services.dispose();
    claim.release();
  };
  return Object.freeze({port:server.address().port,stop});
}
