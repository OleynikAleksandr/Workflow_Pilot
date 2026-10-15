import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configureBackendIdentity,claimBackendIdentity} from './identity.mjs';
import {initializeBackendServices} from './bootstrap.mjs';
import {startBackendPort,createBackendBrowserHost} from './lifecycle.mjs';

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
  app.whenReady().then(async()=>{
    if(process.platform==='darwin')app.setActivationPolicy('accessory');
    const claim=claimBackendIdentity(identity);
    let services,port;
    try {
      const sourceDir=fileURLToPath(new URL('../',import.meta.url));
      services=await initializeBackendServices({dataDir:identity.dataDir,sourceDir,
        resourcesDir:app.isPackaged?path.join(process.resourcesPath,'resources'):path.join(sourceDir,'../resources')});
      const preload=app.isPackaged?path.join(process.resourcesPath,'resources/chatgpt-page-observer-preload.cjs')
        :path.join(sourceDir,'../resources/chatgpt-page-observer-preload.cjs');
      services.execution.attachBrowser({host:createBackendBrowserHost({electron,partition:identity.partition,preload}),ipc:electron.ipcMain});
      port=await startBackendPort({identity,claim,services,electron,fixtureRoot});
    }catch(error){
      try{await services?.dispose();}finally{claim.release();}
      throw error;
    }
    if(fixtureRoot){
      process.stdout.write(JSON.stringify({ready:true,port:port.port,generation:claim.generation,token:claim.token,pid:process.pid})+'\n');
      process.stdin.setEncoding('utf8');
      let buffer='';
      process.stdin.on('data',chunk=>{
        buffer+=chunk;
        if(buffer.includes('\n') && buffer.trim()==='stop') {
          void port.stop().then(()=>app.quit());
        }
      });
    }
  }).catch(error=>{
    process.stderr.write(JSON.stringify({error:error.code??'BACKEND_STARTUP_FAILED'})+'\n');
    app.exit(1);
  });
}
