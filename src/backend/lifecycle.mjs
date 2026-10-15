import http from 'node:http';
import {authorizeLoopback,checkBackendCompatibility} from './protocol.mjs';
import {BACKEND_API_VERSION} from '../contracts/backend.mjs';

export function createBackendBrowserHost({electron,partition,preload}) {
  const {BrowserWindow,screen}=electron,views=new Map();
  return Object.freeze({
    create(id) {
      if(views.has(id))throw Object.assign(new Error('Страница уже принадлежит backend.'),{code:'BROWSER_HOST_CONFLICT'});
      const ratio=Math.max(1,...screen.getAllDisplays().map(display=>display.scaleFactor));
      const win=new BrowserWindow({show:false,width:1000,height:760,webPreferences:{
        partition,preload,offscreen:{deviceScaleFactor:ratio},backgroundThrottling:false,
        nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
      win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      views.set(id,win);return win.webContents;
    },
    close(id) {const win=views.get(id);if(!win)return;
      views.delete(id);if(!win.isDestroyed())win.destroy();},
    get count(){return views.size;},
  });
}

// Browser presentation is served by the backend process. T004 will connect
// session-runtime to this host; the fixture route cannot navigate ChatGPT.
export async function startBackendPort({identity,claim,services,electron,fixtureRoot=null}) {
  const {BrowserWindow,screen}=electron;
  let page=null;
  const openFixture=async()=>{
    if(!fixtureRoot) return null;
    if(page && !page.isDestroyed())return page;
    const ratio=Math.max(1,...screen.getAllDisplays().map(display=>display.scaleFactor));
    const win=new BrowserWindow({show:false,width:900,height:700,webPreferences:{
      offscreen:{deviceScaleFactor:ratio},backgroundThrottling:false,
      nodeIntegration:false,contextIsolation:true,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    try{await win.loadURL(new URL('../../tests/fixtures/backend-browser-page.html',import.meta.url).href);}
    catch(error){win.destroy();throw error;}
    page=win;return page;
  };
  const respond=(res,status,value)=>{
    const body=Buffer.from(JSON.stringify(value));
    res.writeHead(status,{'content-type':'application/json','content-length':body.length,'cache-control':'no-store'});
    res.end(body);
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
      if(req.method==='GET'&&req.url==='/v1/browser/fixture-state'&&fixtureRoot) {
        const win=await openFixture();
        return respond(res,200,{bootGeneration:claim.generation,visible:win.isVisible(),
          page:await win.webContents.executeJavaScript('({bootId:fixtureBootId,ticks:fixtureTicks})')});
      }
      if(req.method==='GET'&&req.url==='/v1/browser/frame'&&fixtureRoot) {
        const win=await openFixture();const png=(await win.webContents.capturePage()).toPNG();
        res.writeHead(200,{'content-type':'image/png','content-length':png.length,'cache-control':'no-store'});
        return res.end(png);
      }
      respond(res,404,{error:{code:'BACKEND_ROUTE_NOT_FOUND',message:'Операция недоступна.'}});
    }catch(error){respond(res,403,{error:{code:error?.code==='BACKEND_ACCESS_DENIED'?'BACKEND_ACCESS_DENIED':'BACKEND_UNAVAILABLE',message:'Доступ запрещён.'}});}
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
    if(page&&!page.isDestroyed())page.destroy();
    await services.dispose();
    claim.release();
  };
  return Object.freeze({port:server.address().port,stop});
}
