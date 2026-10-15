import path from 'node:path';
import fs from 'node:fs';
import {ControlFacade} from '../control/facade.mjs';
import {ExecutionFacade,nodeExecutableCandidates} from '../execution/facade.mjs';
import {journal} from '@webpilot/workflow-kit/lib/validate';

// The same product composition is used by legacy Desktop during migration and
// the independent backend host. Store and Kit ownership live here, not in UI.
export function createBackendComposition({execution=new ExecutionFacade()}={}) {
  return Object.freeze({
    execution,
    createControl:options=>new ControlFacade({...options,execution}),
  });
}

export async function initializeBackendServices({dataDir,sourceDir,resourcesDir,execution=new ExecutionFacade()}) {
  // Never follow an existing file link out of our own product profile.
  for(const name of ['settings.json','workspaces.json']) {
    if(fs.lstatSync(path.join(dataDir,name),{throwIfNoEntry:false})?.isSymbolicLink())
      throw Object.assign(new Error('Backend refuses a linked store.'),{code:'BACKEND_STORE_LINK'});
  }
  const {createControl}=createBackendComposition({execution});
  let workflow,sessions;
  const control=createControl({storageFile:path.join(dataDir,'workspaces.json'),
    getExecutionSettings:()=>settings.parallelExecution,
    git:(workspace,args)=>workflow.executionKit.git(workspace,['--no-optional-locks',...args])});
  const settings=control.configureSettings({file:path.join(dataDir,'settings.json'),
    workflowSnapshot:()=>workflow?.snapshot()??{}});
  const setup=control.configureProjects({executeNode:execution.executeFile,files:execution.files,
    resourceDir:resourcesDir??path.join(sourceDir,'../resources'),nodeCandidates:nodeExecutableCandidates(),
  });
  control.configureContext({getRuntime:()=>execution.runtime,onChange:()=>{}});
  const visible=()=>sessions?.visible;
  const controller=()=>visible()?.controller??null;
  const pageReady=()=>Boolean(visible()?.ready && controller() && !controller().composer?.inFlight);
  workflow=control.configureWorkflow({getController:controller,available:pageReady,
    contextAvailable:()=>Boolean(visible()?.ready&&controller()),onChange:()=>{},report:()=>{},save:overrides=>settings.save(overrides)});
  // The browser ports and workflow are owned here, not by window/sidebarReady.
  // T004 supplies page-controller decoration and restores live sessions.
  sessions=control.attachSessions({presentation:{show:()=>{},hide:()=>{}},onChange:()=>{},
    onPage:(record,event)=>workflow.observePage(event,record),onError:()=>{}});
  workflow.attachSessions(sessions);
  try{workflow.restore(await settings.load());}
  catch(error){if(error.code!=='ENOENT')throw error;workflow.restore({});}
  await control.projects.load();
  for(const workspace of new Set(control.projects.snapshot().projects.map(project=>project.workspace))) {
    if(typeof workspace!=='string'||!path.isAbsolute(workspace)
      || !fs.existsSync(path.join(workspace,'.harness','workflow.json')))continue;
    if(journal(workspace))throw Object.assign(new Error('Kit transaction requires recovery before backend starts.'),
      {code:'BACKEND_KIT_TRANSACTION_PENDING'});
  }
  return Object.freeze({control,execution,workflow,settings,setup,sessions,dispose:async()=>{
    workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();
    workflow.execution.dispose();sessions.dispose();await execution.dispose();
  }});
}
