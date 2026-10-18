import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configureBackendIdentity,claimBackendIdentity} from './identity.mjs';
import {createBackendComposition,createBackendPages,assertProfileStores,assertNoPendingKitTransactions} from './bootstrap.mjs';
import {createDesktopModel} from './desktop-model.mjs';
import {createRemoteSurface} from './remote-surface.mjs';
import {startBackendPort,installFixtureChat} from './lifecycle.mjs';
import {createStopController} from './shutdown.mjs';
import {createStatusMenu} from './status-menu.mjs';
import {createBackendJournal,launchServicesType} from './diagnostics.mjs';
import {createRemoteDevices} from './remote-devices.mjs';
import {createRemoteAccess} from './remote-access.mjs';
import {spawn} from 'node:child_process';
import {BackendBrowserHost,desktopDependencies,TailscaleCli} from '../execution/facade.mjs';

// Every release (macOS, Windows, Linux with its required X11 session) keeps pages as
// views the native window can show. Offscreen pages are the mode of a backend without
// a display (the later server stage); today only a development flag selects it.
export const defaultPageMode=()=>'view';
// nativeWindow(options): the entry point composes the window module (frontend) and
// hands it in; the backend never imports frontend code itself.
export function startBackend(electron,{fixtureRoot=null,leaseTtlMs=null,pageMode=null,nativeWindow=null}={}) {
  const {app}=electron;
  let identity;
  try{identity=configureBackendIdentity(app,{testRoot:fixtureRoot});}
  catch(error){process.stderr.write(JSON.stringify({error:error.code??'BACKEND_IDENTITY_FAILED'})+'\n');app.exit(1);return;}
  if(!app.requestSingleInstanceLock()){
    process.stderr.write(JSON.stringify({error:'BACKEND_OWNER_CONFLICT'})+'\n');
    app.exit(2);return;
  }
  app.on('window-all-closed',()=>{});
  const journal=createBackendJournal(path.join(identity.dataDir,'diagnostics','backend-events.jsonl'));
  journal.record('backend-start',{version:app.getVersion(),packaged:app.isPackaged,fixture:!!fixtureRoot});
  // The backend never owns a Dock tile. macOS may promote a process that shows a
  // dialog or is activated; the accessory policy is applied again after each
  // such event and the observed LaunchServices type is journaled.
  let native=null;
  const keepAccessory=trigger=>{
    // The open native window owns a Dock tile and the app menu.
    if(process.platform!=='darwin'||native)return;
    try{app.setActivationPolicy('accessory');}catch{ /* not ready yet */ }
    void launchServicesType().then(type=>{
      if(type&&type!=='UIElement'){journal.record('dock-type',{type,trigger});try{app.setActivationPolicy('accessory');}catch{}}
    });
  };
  const guardedDialog=new Proxy(electron.dialog,{get:(target,key)=>typeof target[key]!=='function'?target[key]
    :(...args)=>{const result=target[key](...args);Promise.resolve(result).finally(()=>keepAccessory('dialog')).catch(()=>{});return result;}});
  app.on('child-process-gone',(_event,details)=>journal.record('child-process-gone',
    {type:details?.type,reason:details?.reason,exitCode:details?.exitCode,serviceName:details?.serviceName}));
  app.on('render-process-gone',(_event,_contents,details)=>journal.record('render-process-gone',{reason:details?.reason,exitCode:details?.exitCode}));
  for(const name of ['activate','did-become-active','browser-window-created'])app.on(name,()=>setImmediate(()=>keepAccessory(name)));
  let port=null,desktop=null,stopping=null,events=null,stopper=null,statusMenu=null,devices=null,disposeAccess=()=>{},lastServiceEntry=null,pageHost=null,nativeControl=null;
  // Every ordinary exit stops own services first, then releases the profile.
  // The owner record is removed only by the process that proved ownership.
  const shutdown=()=>{
    // The profile lock is released explicitly so the next owner never sees a leftover lock file.
    native?.close();
    stopping??=(port?port.stop():Promise.resolve(desktop?.dispose())).catch(()=>{})
      .finally(()=>{disposeAccess();stopper?.dispose();statusMenu?.destroy();app.releaseSingleInstanceLock();app.exit(0);});
    return stopping;
  };
  // Quit from the Dock tile of the open native window closes the window only, like
  // quitting the separate client; the service stops from its own menu or a signal.
  app.on('before-quit',event=>{
    journal.record('quit-requested',{running:!!port,native:!!native});
    if(native&&!stopping){event.preventDefault();native.close();return;}
    if(port){event.preventDefault();void shutdown();}
  });
  for(const signal of ['SIGTERM','SIGINT','SIGHUP'])process.on(signal,()=>{journal.record('signal',{name:signal});void shutdown();});
  app.whenReady().then(async()=>{
    if(process.platform==='darwin')app.setActivationPolicy('accessory');
    const claim=claimBackendIdentity(identity);
    try {
      assertProfileStores(identity.dataDir);
      const sourceDir=fileURLToPath(new URL('../',import.meta.url));
      const preload=app.isPackaged?path.join(process.resourcesPath,'resources/chatgpt-page-observer-preload.cjs')
        :path.join(sourceDir,'../resources/chatgpt-page-observer-preload.cjs');
      if(fixtureRoot)await installFixtureChat(electron.session.fromPartition(identity.partition));
      const host=new BackendBrowserHost({BrowserWindow:electron.BrowserWindow,BaseWindow:electron.BaseWindow,WebContentsView:electron.WebContentsView,nativeImage:electron.nativeImage,
        pageMode:pageMode??defaultPageMode(),screen:electron.screen,partition:identity.partition,preload,
        session:electron.session.fromPartition(identity.partition)});
      pageHost=host;
      const {execution,createControl}=createBackendComposition();
      const surface=createRemoteSurface({host,dialog:guardedDialog,
        // Fail closed before any page, executor or automation starts.
        beforeWindow:async({storageError})=>{
          if(storageError)throw Object.assign(new Error('Project store cannot be read.'),{code:'WORKSPACE_STORE_INVALID'});
          assertNoPendingKitTransactions(desktop.services.control.projects.snapshot().projects);
          return false;
        }});
      // Remote devices and the gateway are bound after the API port exists.
      const remoteAccess={current:null};
      devices=createRemoteDevices({dir:path.join(identity.dataDir,'remote'),journal,onChange:()=>desktop?.publish(),
        revokeClient:clientId=>void port?.revokeClient(clientId)});
      desktop=createDesktopModel({electron:{...electron,dialog:guardedDialog},recoverCrashedPages:true,remoteAccess,sourceDir,dataDir:identity.dataDir,partition:identity.partition,smoke:false,
        eventBaseline:false,eventRuntimeChecker:false,executionServices:execution,createControl,dependencies:desktopDependencies,
        browserHost:host,surface,offline:!!fixtureRoot,pluginDirectory:fixtureRoot?path.join(fixtureRoot,'plugin'):null});
      if(!await desktop.start())throw Object.assign(new Error('Desktop model did not start.'),{code:'BACKEND_STARTUP_FAILED'});
      const base=desktop.services;
      const service=Object.freeze({view:()=>stopper?.view()??{phase:'running',reasons:[],since:null,error:null},
        request:()=>stopper.request(),cancel:()=>stopper.cancel()});
      // window.open from a launch of the app: the native window, where this backend has one.
      const nativeService=Object.freeze({open:()=>{
        if(!nativeControl?.available())throw Object.assign(new Error('Встроенное окно недоступно.'),{code:'NATIVE_WINDOW_UNAVAILABLE'});
        nativeControl.open({reason:'launch'});return {opened:true};}});
      const services=Object.freeze({control:base.control,execution:base.execution,workflow:base.workflow,settings:base.settings,
        setup:base.setup,sessions:base.sessions,desktop,service,window:nativeService,
        pages:createBackendPages({sessions:base.sessions,setup:base.setup,store:base.control.projects,host}),
        onChange:listener=>desktop.onPublish(listener),restore:async()=>{},dispose:async()=>desktop.dispose()});
      port=await startBackendPort({identity,claim,services,host,fixtureRoot,onEvents:sink=>{events=sink;
          surface.attach(sink,{holder:()=>port?.operations.leaseHolder()??null,holderIsRemote:()=>devices.isRemoteClient(port?.operations.leaseHolder())});
          desktop.publish();},
        remoteDevices:devices,backendJournal:journal,
        onStreams:count=>journal.record('clients',{count}),onLease:view=>journal.record('lease',{held:!!view.holder,generation:view.generation}),
        leaseTtlMs:fixtureRoot&&leaseTtlMs||undefined,appVersion:app.getVersion()});
      // Fixtures never touch Tailscale, sleep settings or the default browser.
      const access=createRemoteAccess({gateway:port.remote,dir:path.join(identity.dataDir,'remote'),journal,onChange:()=>desktop?.publish(),
        tailscale:fixtureRoot?{state:async()=>({installed:false,running:false,loggedIn:false,httpsEnabled:false,login:null,dnsName:null}),
          serveState:async()=>({known:false,ours:false,conflict:false}),serveOn:async()=>false,serveOff:async()=>false}:new TailscaleCli(),
        power:fixtureRoot?null:electron.powerSaveBlocker,openExternal:url=>fixtureRoot?Promise.resolve():electron.shell.openExternal(url)});
      remoteAccess.current=Object.freeze({
        view:()=>({...access.view(),...devices.view()}),
        approve:pairingId=>devices.approve(pairingId),reject:pairingId=>devices.reject(pairingId),revoke:deviceId=>devices.revoke(deviceId),
        action:input=>access.action(input),
        initiatorIsRemote:()=>devices.isRemoteClient(port.operations.leaseHolder()),
      });
      // Read-only check of Tailscale at start; an earlier enabled choice is restored.
      if(!fixtureRoot)void access.refresh().catch(()=>{}).then(()=>access.restore());
      disposeAccess=()=>access.dispose();
      const status=()=>({service:stopper.view(),pages:base.sessions.all().length,pairings:devices.view().pairings});
      stopper=createStopController({drainState:()=>desktop.drainState(),pause:value=>desktop.pause(value),stop:shutdown,
        onChange:view=>{events.ui('service',view);statusMenu?.update(status());
          // Codes only, and only when they change: a long wait does not flood the journal.
          const entry={phase:view.phase,reasons:view.reasons.map(reason=>reason.code),error:view.error?.code??null};
          const key=JSON.stringify(entry);if(key!==lastServiceEntry){lastServiceEntry=key;journal.record('service',entry);}}});
      events.ui('service',stopper.view());
      // The native window: the same client opened inside this process with the
      // real page views. Fixtures open it hidden and never change the Dock.
      const nativePages=Object.freeze({attach:(id,container,bounds)=>host.attach(id,container,bounds),
        setBounds:(id,bounds)=>host.setBounds(id,bounds),detach:id=>host.detach(id),contents:id=>host.view(id)?.webContents??null});
      const nativeAvailable=()=>!!nativeWindow&&host.pageMode==='view';
      const openNative=({reason='open',hidden=!!fixtureRoot}={})=>{
        journal.record('native-window',{reason,open:!!native});
        // A background process brings its window to the front explicitly.
        const front=()=>{if(!hidden){try{app.focus({steal:true});}catch{ /* focus is best effort */ }}};
        if(native&&!native.closed){native.focus();front();return native;}
        if(!hidden&&process.platform==='darwin'){try{app.setActivationPolicy('regular');}catch{ /* not ready yet */ }}
        const opened=nativeWindow({port:port.port,token:claim.token,pages:nativePages,logDir:path.join(identity.dataDir,'diagnostics'),hidden,
          openHttpClient:()=>openClient('native-menu',{http:true}),
          onClosed:()=>{if(native===opened)native=null;journal.record('native-window-closed',{});keepAccessory('native-closed');}});
        native=opened;front();
        return opened;
      };
      nativeControl={available:nativeAvailable,open:openNative};
      // A client is a separate process: focus a connected one or start a new one.
      // A packaged macOS client is opened through LaunchServices like a Dock
      // click, so it belongs to the app's own Dock tile, not a tile of this process.
      // On macOS the ordinary open is the native window; the HTTP client is asked for explicitly.
      const openClient=(reason,{http=false}={})=>{
        if(!http&&nativeAvailable())return openNative({reason});
        journal.record('open-client',{reason,clients:events.localClients});
        if(events.localClients>0)return events.uiCommand('focus',{},{to:'local'});
        const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
        if(app.isPackaged&&process.platform==='darwin'&&!fixtureRoot) {
          const bundle=path.resolve(process.execPath,'../../..');
          spawn('/usr/bin/open',['-n','-a',bundle,'--args','--http-client'],{detached:true,stdio:'ignore',env}).unref();
        } else {
          const args=[...(app.isPackaged?[]:[app.getAppPath()]),'--http-client',...(fixtureRoot?['--client-backend-root='+fixtureRoot,
            '--client-root='+path.join(fixtureRoot,'client'),'--client-fixture']:[])];
          spawn(process.execPath,args,{detached:true,stdio:'ignore',env}).unref();
        }
        keepAccessory('open-client');
      };
      // macOS also emits activate for the backend's own launch; only a later
      // reopen of the app opens a client. Fixtures never react to OS events.
      if(!fixtureRoot) {
        const ready=Date.now();
        app.on('activate',()=>{if(Date.now()-ready>3000)openClient('activate');});
        // Another launch of this profile (any version) reaches the running backend.
        app.on('second-instance',()=>openClient('second-instance'));
      }
      if(!fixtureRoot) {
        statusMenu=createStatusMenu({Tray:electron.Tray,Menu:electron.Menu,nativeImage:electron.nativeImage,onOpen:()=>openClient('status-menu'),
          onOpenHttp:nativeAvailable()?()=>openClient('status-menu-http',{http:true}):null,
          onApprove:pairingId=>{try{devices.approve(pairingId);}catch{ /* an expired request disappears from the menu */ }},
          onCancelStop:()=>{journal.record('stop-cancel-menu');stopper.cancel();},
          // Each step of a stop from the menu bar is journaled; the confirmation
          // is brought to the front, then the backend leaves the Dock again.
          onStop:async()=>{
            journal.record('stop-menu');
            try{app.focus({steal:true});}catch{ /* focus is best effort */ }
            const answer=await guardedDialog.showMessageBox({type:'question',buttons:['Остановить','Отмена'],defaultId:1,cancelId:1,
              message:'Остановить фоновую службу Workflow Pilot?',
              detail:'Новые отправки и назначения не начнутся. Текущий ответ ChatGPT, инструменты и команды Kit завершатся; затем службы остановятся.'});
            journal.record('stop-dialog',{response:answer.response});
            if(answer.response===0)stopper.request();
          }});
        statusMenu?.update(status());
        desktop.onPublish(()=>{events.changed();statusMenu?.update(status());});
      }
    }catch(error){
      try{await (port?port.stop():desktop?.dispose());}finally{claim.release();}
      throw error;
    }
    if(fixtureRoot){
      process.stdout.write(JSON.stringify({ready:true,port:port.port,generation:claim.generation,token:claim.token,pid:process.pid})+'\n');
      process.stdin.setEncoding('utf8');
      let buffer='';
      // Test profiles only: stop, and the remote gateway with a fixture tailnet
      // identity (no Tailscale is involved in fixtures).
      process.stdin.on('data',chunk=>{
        buffer+=chunk;
        for(let index;(index=buffer.indexOf('\n'))>=0;) {
          const line=buffer.slice(0,index).trim();buffer=buffer.slice(index+1);
          if(line==='stop'){void shutdown();continue;}
          let command;try{command=JSON.parse(line);}catch{continue;}
          void (async()=>{
            if(command.op==='remote-enable')return {remote:await port.remote.enable({owner:'owner@example.com',dnsName:'mac.tailnet-fixture.ts.net'})};
            if(command.op==='remote-approve')return {approved:devices.view().pairings.map(item=>devices.approve(item.id).id)};
            if(command.op==='remote-revoke')return {revoked:devices.view().devices.map(item=>devices.revoke(item.id).revoked)};
            // The native window of a fixture backend: opened hidden, probed and closed.
            if(command.op==='native-open'){if(!nativeControl?.available())return {error:'NATIVE_WINDOW_UNAVAILABLE'};nativeControl.open({reason:'fixture',hidden:true});return {opened:true};}
            if(command.op==='native-probe')return {native:native?await native.probe():null,
              attached:desktop.services.sessions.visible?!!pageHost.attached(desktop.services.sessions.visible.key):false};
            if(command.op==='native-close'){native?.close();return {closed:true};}
            // A view-mode page moves into a hidden window container and back without a reload.
            if(command.op==='page-attach-probe') {
              const page=desktop.services.sessions.visible;
              const host=pageHost;
              if(!page||host?.pageMode!=='view')return {error:'BROWSER_PAGE_MODE_INVALID'};
              const contents=host.view(page.key).webContents,boot=()=>contents.executeJavaScript('fixtureBootId');
              const before=await boot(),container=new electron.BaseWindow({show:false,focusable:false,width:900,height:700});
              try {
                host.attach(page.key,container.contentView,{x:200,y:0,width:700,height:700});
                const inside=host.attached(page.key)===container.contentView&&container.contentView.children.length===1;
                const shot=await host.presentation(host.browserSessionId(page.key)).frame();
                host.detach(page.key);
                return {attached:inside,returned:host.attached(page.key)===null&&container.contentView.children.length===0,
                  reloaded:await boot()!==before,frame:!!shot?.png?.length};
              } finally { container.destroy(); }
            }
            return {error:'UNKNOWN_FIXTURE_OP'};
          })().then(value=>process.stdout.write(JSON.stringify({op:command.op,...value})+'\n'),
            error=>process.stdout.write(JSON.stringify({op:command.op,error:error.code??error.message})+'\n'));
        }
      });
    }
  }).catch(error=>{
    process.stderr.write(JSON.stringify({error:error.code??'BACKEND_STARTUP_FAILED'})+'\n');
    app.exit(1);
  });
}
