import path from 'node:path';
import fs from 'node:fs';
import {ControlFacade} from '../control/facade.mjs';
import {ExecutionFacade,nodeExecutableCandidates,chatGPTEntrypoint,decorateBackendPage,ChromiumDiagnostics} from '../execution/facade.mjs';
import {journal} from '@webpilot/workflow-kit/lib/validate';

// The same product composition is used by legacy Desktop during migration and
// the independent backend host. Store and Kit ownership live here, not in UI.
export function createBackendComposition({execution=new ExecutionFacade()}={}) {
  return Object.freeze({
    execution,
    createControl:options=>new ControlFacade({...options,execution}),
  });
}

const pageError=error=>({code:typeof error?.code==='string'?error.code:'BACKEND_PAGE_ERROR',
  message:typeof error?.message==='string'?error.message:'Страница недоступна.'});

// Never follow an existing file link out of our own product profile.
export function assertProfileStores(dataDir) {
  for(const name of ['settings.json','workspaces.json']) {
    if(fs.lstatSync(path.join(dataDir,name),{throwIfNoEntry:false})?.isSymbolicLink())
      throw Object.assign(new Error('Backend refuses a linked store.'),{code:'BACKEND_STORE_LINK'});
  }
}

// An unfinished Kit transaction is recovered by Kit, never run over by the backend.
// A checkout whose transaction state cannot be read (folder gone, broken git or worktree)
// does not stop the service: that project shows its own error when it is selected.
export function assertNoPendingKitTransactions(projects,{readJournal=journal}={}) {
  for(const workspace of new Set(projects.map(project=>project.workspace))) {
    if(typeof workspace!=='string'||!path.isAbsolute(workspace)
      || !fs.existsSync(path.join(workspace,'.harness','workflow.json')))continue;
    let pending;
    try{pending=readJournal(workspace);}catch{continue;}
    if(pending)throw Object.assign(new Error('Kit transaction requires recovery before backend starts.'),
      {code:'BACKEND_KIT_TRANSACTION_PENDING'});
  }
}

export async function initializeBackendServices({dataDir,sourceDir,resourcesDir,execution=new ExecutionFacade(),
  browser=null,diagnostics=true}) {
  assertProfileStores(dataDir);
  const {createControl}=createBackendComposition({execution});
  let workflow,sessions,changed=()=>{};
  const notify=()=>{try{changed();}catch{ /* a subscriber never stops Control */ }};
  const control=createControl({storageFile:path.join(dataDir,'workspaces.json'),
    getExecutionSettings:()=>settings.parallelExecution,
    git:(workspace,args)=>workflow.executionKit.git(workspace,['--no-optional-locks',...args])});
  const settings=control.configureSettings({file:path.join(dataDir,'settings.json'),
    workflowSnapshot:()=>workflow?.snapshot()??{}});
  const setup=control.configureProjects({executeNode:execution.executeFile,files:execution.files,
    resourceDir:resourcesDir??path.join(sourceDir,'../resources'),nodeCandidates:nodeExecutableCandidates(),
  });
  control.configureContext({getRuntime:()=>execution.runtime,onChange:()=>{}});
  // The selected session is the primary page for workflow. It is chosen by
  // Control, never by a window, a viewer or a client connection.
  const visible=()=>sessions?.visible;
  const controller=()=>visible()?.controller??null;
  const pageReady=()=>Boolean(visible()?.ready && !visible().loading && controller() && !controller().composer?.inFlight);
  workflow=control.configureWorkflow({getController:controller,available:pageReady,
    contextAvailable:()=>Boolean(visible()?.ready&&!visible().loading&&controller()),onChange:notify,report:notify,save:overrides=>settings.save(overrides)});
  if(browser)execution.attachBrowser(browser);
  const diagnosticsFile=path.join(dataDir,'diagnostics','chromium-events.jsonl');
  const decorate=record=>{
    workflow.configurePrimary(record);
    record.controller.canSendContext=project=>!project.assignmentId
      ||workflow.executorEnabled(project.parentWorkspace,project.parentScopeId);
    const contents=browser.host.view(record.key).webContents;
    const page=decorateBackendPage(contents,{colors:settings.chatColors,hideToolCalls:()=>settings.hideToolCalls});
    record.colors=page.colors;record.applyToolCalls=page.applyToolCalls;
    if(diagnostics) {
      record.diagnostics=new ChromiumDiagnostics(contents,{file:diagnosticsFile,
        owner:()=>({workspace:record.identity?.workspace,sessionId:record.identity?.sessionId}),
        onConversationRateLimit:(id,seconds)=>record.recovery.rateLimited(id,seconds)});
      void record.diagnostics.start({platform:process.platform,electron:process.versions.electron,
        chromium:process.versions.chrome}).catch(()=>{});
      record.browser.setDiagnostic(({event,...fields})=>record.diagnostics.log.record('composer',event,{sessionId:record.identity?.sessionId??null,...fields}));
    }
    return ()=>{page.dispose();void record.diagnostics?.stop().catch(()=>{});};
  };
  sessions=control.attachSessions({presentation:browser?{show:id=>browser.host.show(id),hide:()=>browser.host.hide()}:{show:()=>{},hide:()=>{}},
    onChange:record=>{workflow.sessionChanged(record);notify();},
    onPage:(record,event)=>{
      if(!event.reset) {
        record.diagnostics?.observePage(event.state);
        if(!record.loading)sessions.observeManualConversation(event.state,record);
      }
      workflow.observePage(event,record);
    },
    onError:(record,error)=>{record.diagnostics?.recordObserverFailure(error?.code);record.error=pageError(error);notify();},
    decorate:browser?decorate:undefined});
  workflow.attachSessions(sessions);
  try{workflow.restore(await settings.load());}
  catch(error){if(error.code!=='ENOENT')throw error;workflow.restore({});}
  await control.projects.load();
  assertNoPendingKitTransactions(control.projects.snapshot().projects);
  const pages=createBackendPages({sessions,setup,store:control.projects,host:browser?.host??null,onReady:notify});
  return Object.freeze({control,execution,workflow,settings,setup,sessions,pages,
    // One change listener: the backend event log. It reads state, never stores it.
    onChange:listener=>{changed=typeof listener==='function'?listener:()=>{};},
    // Pages of PlanContinuation and parallel work come back first; then the saved selection.
    restore:async()=>{
      workflow.restoreBackground();
      const selected=control.projects.selected();
      if(selected&&!selected.external&&!selected.archivedAt&&!selected.sessionArchivedAt)await pages.select(selected);
    },
    dispose:async()=>{
      workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();
      workflow.execution.dispose();sessions.dispose();await execution.dispose();
    }});
}

// Page addressing for viewers. A viewer never selects, reloads or releases a
// page; its absence leaves the page, observer, waits and automation running.
export function createBackendPages({sessions,setup,store,host,onReady=()=>{}}) {
  const record=key=>sessions.all().find(item=>item.key===key&&!item.disposed);
  const required=key=>{
    const found=record(key);
    if(!found||!host)throw Object.assign(new Error('Страница не найдена.'),{code:'SESSION_RUNTIME_RELEASED'});
    return found;
  };
  return Object.freeze({
    async select(project) {
      if(!project||project.external)throw Object.assign(new Error('Сессия недоступна backend.'),{code:'EXTERNAL_SESSION'});
      const current=store.project(project.workspace,project.sessionId)??project;
      const page=sessions.ensure(current);sessions.show(page);
      const epoch=++page.readinessEpoch;
      // Readiness is project-specific; it never depends on a window or viewer.
      const readiness=Promise.resolve().then(()=>setup.ready(current.workspace)).then(result=>result?.ready===true,()=>false);
      await sessions.navigate(page,current.chatUrl??chatGPTEntrypoint(current.experience),{freshDraft:!current.chatUrl});
      const ready=await readiness;
      if(page.disposed||page.readinessEpoch!==epoch)return page.key;
      page.ready=ready;onReady();
      if(ready)sessions.tick(page);else page.controller.cancel();
      return page.key;
    },
    attachViewer:key=>{required(key);return host.attachViewer(key);},
    detachViewer:viewerId=>host?.detachViewer(viewerId)??false,
    list:()=>sessions.all().filter(item=>!item.disposed).map(item=>{
      const snapshot=item.browser.snapshot();
      return {key:item.key,workspace:item.identity?.workspace??null,sessionId:item.identity?.sessionId??null,
        assignmentId:item.identity?.assignmentId??null,taskId:item.identity?.taskId??null,
        url:snapshot.url,epoch:snapshot.epoch,loading:snapshot.loading,crashed:snapshot.crashed,ready:item.ready,
        selected:sessions.visible===item,viewers:host?.viewers(item.key)??0,
        documentId:item.pageState.current?.documentId??null,error:item.error?structuredClone(item.error):null};
    }),
  });
}
