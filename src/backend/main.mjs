import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configureBackendIdentity,claimBackendIdentity} from './identity.mjs';
import {createBackendComposition,createBackendPages,assertProfileStores,assertNoPendingKitTransactions} from './bootstrap.mjs';
import {createDesktopModel} from './desktop-model.mjs';
import {createRemoteSurface} from './remote-surface.mjs';
import {startBackendPort,installFixtureChat} from './lifecycle.mjs';
import {BackendBrowserHost,desktopDependencies} from '../execution/facade.mjs';

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
  let port=null,desktop=null,stopping=null;
  // Every ordinary exit stops own services first, then releases the profile.
  // The owner record is removed only by the process that proved ownership.
  const shutdown=()=>{
    stopping??=(port?port.stop():Promise.resolve(desktop?.dispose())).catch(()=>{}).finally(()=>app.exit(0));
    return stopping;
  };
  app.on('before-quit',event=>{if(port){event.preventDefault();void shutdown();}});
  for(const signal of ['SIGTERM','SIGINT','SIGHUP'])process.on(signal,()=>{void shutdown();});
  app.whenReady().then(async()=>{
    if(process.platform==='darwin')app.setActivationPolicy('accessory');
    const claim=claimBackendIdentity(identity);
    try {
      assertProfileStores(identity.dataDir);
      const sourceDir=fileURLToPath(new URL('../',import.meta.url));
      const preload=app.isPackaged?path.join(process.resourcesPath,'resources/chatgpt-page-observer-preload.cjs')
        :path.join(sourceDir,'../resources/chatgpt-page-observer-preload.cjs');
      if(fixtureRoot)await installFixtureChat(electron.session.fromPartition(identity.partition));
      const host=new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,screen:electron.screen,partition:identity.partition,preload,
        session:electron.session.fromPartition(identity.partition)});
      const {execution,createControl}=createBackendComposition();
      const surface=createRemoteSurface({host,dialog:electron.dialog,
        // Fail closed before any page, executor or automation starts.
        beforeWindow:async({storageError})=>{
          if(storageError)throw Object.assign(new Error('Project store cannot be read.'),{code:'WORKSPACE_STORE_INVALID'});
          assertNoPendingKitTransactions(desktop.services.control.projects.snapshot().projects);
          return false;
        }});
      desktop=createDesktopModel({electron,sourceDir,dataDir:identity.dataDir,partition:identity.partition,smoke:false,
        eventBaseline:false,eventRuntimeChecker:false,executionServices:execution,createControl,dependencies:desktopDependencies,
        browserHost:host,surface,offline:!!fixtureRoot});
      if(!await desktop.start())throw Object.assign(new Error('Desktop model did not start.'),{code:'BACKEND_STARTUP_FAILED'});
      const base=desktop.services;
      const services=Object.freeze({control:base.control,execution:base.execution,workflow:base.workflow,settings:base.settings,
        setup:base.setup,sessions:base.sessions,desktop,
        pages:createBackendPages({sessions:base.sessions,setup:base.setup,store:base.control.projects,host}),
        onChange:listener=>desktop.onPublish(listener),restore:async()=>{},dispose:async()=>desktop.dispose()});
      port=await startBackendPort({identity,claim,services,host,fixtureRoot,onEvents:events=>{surface.attach(events);desktop.publish();}});
    }catch(error){
      try{await (port?port.stop():desktop?.dispose());}finally{claim.release();}
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
