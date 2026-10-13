import { ContextSession } from './context-session.mjs';
import { AgentTimer } from './agent-timer.mjs';
import { ConversationRecovery } from './conversation-recovery.mjs';

export const sessionRuntimeKey = project => project ? JSON.stringify([
  project.workspace, project.sessionId, project.assignmentId ?? null, project.taskId ?? null,
]) : 'entry';

// This facade addresses one saved session, never the current sidebar selection.
export function sessionStore(store, identity) {
  const owns = (workspace, sessionId = identity.sessionId) => {
    if(workspace!==identity.workspace || sessionId!==identity.sessionId)throw Object.assign(new Error('Чужая сессия.'),{code:'SESSION_CHANGED'});
  };
  return {
    selected:()=>store.project(identity.workspace,identity.sessionId),
    project:workspace=>{owns(workspace);return store.project(workspace,identity.sessionId);},
    inspect:(workspace,sessionId)=>{owns(workspace,sessionId);return store.inspect(workspace,sessionId);},
    bindChat:(workspace,sessionId,url,options)=>{owns(workspace,sessionId);return store.bindChat(workspace,sessionId,url,{...options,background:true});},
    updateSession:(workspace,sessionId,patch)=>{owns(workspace,sessionId);return store.updateSession(workspace,sessionId,patch,{background:true});},
  };
}

// Product coordination only. Execution owns pages; Desktop presents them by key.
export class SessionRuntimes {
  constructor({store,runtime,contextCache,execution,presentation,onChange=()=>{},onPage=()=>{},
    decorate=()=>()=>{},onError=()=>{},onChatBound=()=>{}}) {
    Object.assign(this,{store,runtime,contextCache,execution,presentation,onChange,onPage,decorate,onError,onChatBound});
    this.records=new Map();this.visible=null;
  }
  ensure(project=null) {
    const key=sessionRuntimeKey(project), existing=this.records.get(key);
    if(existing)return existing;
    const identity=project?Object.freeze({workspace:project.workspace,sessionId:project.sessionId,
      assignmentId:project.assignmentId??null,taskId:project.taskId??null}):null;
    const browser=this.execution.openBrowserSession(key);
    const record={key,identity,browser,pageState:browser.pageState,ready:false,
      get loading(){return browser.snapshot().loading;},get epoch(){return browser.snapshot().epoch;},
      readinessEpoch:0,disposed:false,manualDocumentOwner:null,lastStopObservation:null,error:null,cleanups:[]};
    this.records.set(key,record);
    record.project=()=>identity?this.store.project(identity.workspace,identity.sessionId):null;
    const scopedStore=identity?sessionStore(this.store,identity):this.store;
    record.composer=browser.composer;
    record.controller=new ContextSession({store:scopedStore,runtime:this.runtime(),contextCache:this.contextCache,
      composer:record.composer,onChange:()=>this.onChange(record),onChatBound:()=>this.onChatBound(record)});
    record.controller.onIdle=()=>this.onChange(record);
    record.timer=new AgentTimer({onFinish:(target,durationMs)=>{
      void this.store.recordAgentTime(target.workspace,target.sessionId,durationMs).then(()=>this.onChange(record),error=>this.onError(record,error));
    }});
    record.recovery=new ConversationRecovery({selected:record.project,
      checkpoint:project?.conversationRecovery,
      save:checkpoint=>identity?this.store.updateSession(identity.workspace,identity.sessionId,{conversationRecovery:checkpoint},{background:true}):Promise.resolve(),
      available:()=>!record.disposed&&!record.loading&&record.ready&&!record.composer.inFlight,
      inspect:()=>record.composer.inspect(),
      reopen:async(project,current)=>{
        if(!current())return false;
        await this.navigate(record,project.chatUrl,{reload:true});
        if(!record.pageState.current)await record.pageState.waitForChange(record.pageState.version,{timeoutMs:5000,canContinue:current});
        return current()&&record.pageState.current?.state.url===project.chatUrl&&!record.pageState.current.state.connectionError;
      },onChange:()=>this.onChange(record)});
    record.cleanups.push(record.pageState.subscribe(event=>{
      if(record.disposed)return;
      if(event.reset){record.manualDocumentOwner=null;record.lastStopObservation=null;record.timer.finish();}
      else {
        const project=record.project(), documentId=event.documentId??record.pageState.current?.documentId;
        const revision=event.state.manualStopRevision??0;
        if(revision>(record.lastStopObservation?.documentId===documentId?record.lastStopObservation.revision:0))record.recovery.manualStop(event.state);
        record.lastStopObservation={documentId,revision};
        if(project&&!project.archivedAt&&!project.sessionArchivedAt)record.timer.observe(record.identity,event.state.busy);
        if(record.ready&&!record.loading)record.recovery.observe(event.state);
      }
      this.onPage(record,event);
      if(!event.reset&&record.ready&&!record.loading)this.tick(record);
    }));
    record.cleanups.push(browser.subscribe(event=>{
      if(record.disposed)return;
      if(event.type==='navigation-start')record.controller.cancel();
      if(event.type==='loaded'||event.type==='navigated'){this.tick(record);this.onChange(record);}
      if(event.type==='crashed')record.ready=false;
      if(event.error){
        record.controller.cancel();record.error=event.error;
        this.onError(record,Object.assign(new Error(event.error.message),{code:event.error.code}));
      }
    }));
    const cleanup=this.decorate(record);if(typeof cleanup==='function')record.cleanups.push(cleanup);
    return record;
  }
  tick(record,{freshDraft=false}={}) {
    const project=record.project();
    if(record.disposed||!record.ready||record.loading||!project||project.archivedAt||project.sessionArchivedAt)return;
    record.controller.runtime=this.runtime();
    if(!record.controller.active) {
      record.controller.attach(project,{freshDraft:freshDraft||record.freshDraft===true});
      record.freshDraft=false;
    }
    void record.controller.tick();
  }
  show(record) {
    if(record.disposed||this.records.get(record.key)!==record)throw new Error('SESSION_RUNTIME_RELEASED');
    this.visible=record;this.presentation.show(record.key);
  }
  hide() {
    this.presentation.hide();this.visible=null;
  }
  async navigate(record,url,{reload=false,freshDraft=false}={}) {
    if(record.disposed)throw new Error('SESSION_RUNTIME_RELEASED');
    if(!reload&&record.composer.getURL()===url){this.tick(record,{freshDraft});return record;}
    record.error=null;record.freshDraft=freshDraft;record.controller.cancel();
    const result=await record.browser.navigate(url,{reload});
    if(!result||record.disposed)return null;
    this.tick(record,{freshDraft});return record;
  }
  release(record,{force=false}={}) {
    if(!record||record.disposed)return false;
    if(!force&&(record.pageState.current?.state.busy||record.controller.pending||record.composer.inFlight))return false;
    if(this.visible===record)this.hide();
    record.disposed=true;record.controller.cancel();record.recovery.reset();record.timer.finish();
    for(const cleanup of record.cleanups.splice(0).reverse())cleanup();
    record.browser.release();
    this.records.delete(record.key);return true;
  }
  dispose() {for(const record of [...this.records.values()])this.release(record,{force:true});}
}
