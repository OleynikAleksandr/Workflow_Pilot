import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configureBackendIdentity,claimBackendIdentity} from './identity.mjs';
import {initializeBackendServices} from './bootstrap.mjs';
import {startBackendPort,installFixtureChat} from './lifecycle.mjs';
import {BackendBrowserHost} from '../execution/facade.mjs';

export function startBackend(electron,{fixtureRoot=null}={}) {
  const {app}=electron;
  let identity;
  try{identity=configureBackendIdentity(app,{testRoot:fixtureRoot});}
  catch(error){process.stderr.write(JSON.stringify({error:error.code??'BACKEND_IDENTITY_FAILED'})+'\n');app.exit(1);return;}
  if(!app.requestSingleInstanceLock()){
    process.stderr.write(JSON.stringify({error:'BACKEND_OWNER_CONFLICT'})+'\n');
    app.exit(2);return;
  }
  app.on('window-all-closed',()=>{});
  let port=null,stopping=null;
  // Every ordinary exit stops own services first, then releases the profile.
  // The owner record is removed only by the process that proved ownership.
  const shutdown=()=>{
    stopping??=(port?port.stop():Promise.resolve()).catch(()=>{}).finally(()=>app.exit(0));
    return stopping;
  };
  app.on('before-quit',event=>{if(port){event.preventDefault();void shutdown();}});
  for(const signal of ['SIGTERM','SIGINT','SIGHUP'])process.on(signal,()=>{void shutdown();});
  app.whenReady().then(async()=>{
    if(process.platform==='darwin')app.setActivationPolicy('accessory');
    const claim=claimBackendIdentity(identity);
    let services;
    try {
      const sourceDir=fileURLToPath(new URL('../',import.meta.url));
      const preload=app.isPackaged?path.join(process.resourcesPath,'resources/chatgpt-page-observer-preload.cjs')
        :path.join(sourceDir,'../resources/chatgpt-page-observer-preload.cjs');
      if(fixtureRoot)await installFixtureChat(electron.session.fromPartition(identity.partition));
      const host=new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,screen:electron.screen,partition:identity.partition,preload,
        session:electron.session.fromPartition(identity.partition)});
      services=await initializeBackendServices({dataDir:identity.dataDir,sourceDir,
        resourcesDir:app.isPackaged?path.join(process.resourcesPath,'resources'):path.join(sourceDir,'../resources'),
        browser:{host,ipc:electron.ipcMain}});
      port=await startBackendPort({identity,claim,services,host,fixtureRoot});
      // A page that cannot open is recorded on its session; the backend stays up.
      await services.restore().catch(()=>{});
    }catch(error){
      try{await (port?port.stop():services?.dispose());}finally{claim.release();}
      throw error;
    }
    if(fixtureRoot){
      process.stdout.write(JSON.stringify({ready:true,port:port.port,generation:claim.generation,token:claim.token,pid:process.pid})+'\n');
      process.stdin.setEncoding('utf8');
      let buffer='';
      process.stdin.on('data',chunk=>{
        buffer+=chunk;
        if(buffer.includes('\n') && buffer.trim()==='stop')void shutdown();
      });
    }
  }).catch(error=>{
    process.stderr.write(JSON.stringify({error:error.code??'BACKEND_STARTUP_FAILED'})+'\n');
    app.exit(1);
  });
}
