import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {BackendBrowserHost,ExecutionFacade} from '../../src/execution/facade.mjs';
import {CommandService} from '../../src/execution/commands/service.mjs';
import {initializeBackendServices} from '../../src/backend/bootstrap.mjs';
import {configureBackendIdentity,claimBackendIdentity} from '../../src/backend/identity.mjs';
import {startBackendPort} from '../../src/backend/lifecycle.mjs';
import {startServeProxy} from './remote-serve-proxy.mjs';

function fakeElectron() {
  class BrowserWindow {
    constructor() {
      const contents=new EventEmitter();
      Object.assign(contents,{id:1,url:'',destroyed:false,getURL:()=>contents.url,isDestroyed:()=>contents.destroyed,
        setWindowOpenHandler(){},isOffscreen:()=>true,debugger:{isAttached:()=>false,attach(){},on(){},removeListener(){},sendCommand:async()=>({})},
        loadURL:async url=>{contents.url=url;contents.emit('did-finish-load');}});
      this.webContents=contents;
    }
    getContentSize(){return [800,600];}
    setContentSize(){}
    isDestroyed(){return this.webContents.destroyed;}
    destroy(){this.webContents.destroyed=true;}
  }
  return {BrowserWindow,screen:{getAllDisplays:()=>[{scaleFactor:1}]}};
}

// Headless backend with its gateway behind the Serve stand-in.
export async function remoteBackend(t,{devices}={}) {
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-remote-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const mock={paths:{appData:root},getPath(key){return this.paths[key];},setPath(key,value){this.paths[key]=value;},setName(){}};
  const identity=configureBackendIdentity(mock,{testRoot:root}),claim=claimBackendIdentity(identity);
  const electron=fakeElectron();
  const host=new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,screen:electron.screen,partition:'persist:fixture',preload:'/fixture.cjs'});
  const services=await initializeBackendServices({dataDir:root,sourceDir:path.resolve('src'),resourcesDir:path.resolve('resources'),
    execution:new ExecutionFacade({commands:new CommandService()}),diagnostics:false,browser:{host,ipc:{},connect:()=>()=>{},
      createComposer:()=>({inFlight:false,inspect:async()=>({login:true}),hasFilled:()=>false})}});
  const port=await startBackendPort({identity,claim,services,host,remoteDevices:devices?.(root)});
  t.after(()=>port.stop());
  const status=await port.remote.enable({owner:'Owner@Example.com',dnsName:'mac.tailnet-fixture.ts.net'});
  const proxy=await startServeProxy({targetPort:status.port});t.after(()=>proxy.close());
  const intruder=await startServeProxy({targetPort:status.port,login:'someone@example.com'});t.after(()=>intruder.close());
  const call=async(route,{method='GET',body,cookie,origin=proxy.origin,via=proxy}={})=>{
    const response=await fetch(`http://127.0.0.1:${via.port}${route}`,{method,body:body&&JSON.stringify(body),redirect:'manual',
      headers:{...cookie?{cookie}:{},...body?{'content-type':'application/json',origin}:{},...method!=='GET'&&!body?{origin}:{}}});
    const text=await response.text();
    let json=null;try{json=JSON.parse(text);}catch{}
    return {status:response.status,json,text,headers:response.headers};
  };
  return {root,claim,host,port,status,proxy,intruder,call,services};
}

