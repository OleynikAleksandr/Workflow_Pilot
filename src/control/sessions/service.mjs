import { ContextSession } from '../context/context-session.mjs';
import { AgentTimer } from './agent-timer.mjs';
import { ConversationRecovery } from './conversation-recovery.mjs';
import { normalizeChatUrl } from '../../contracts/browser.mjs';
import { sessionRuntimeKey } from '../../contracts/control.mjs';
export { sessionRuntimeKey } from '../../contracts/control.mjs';

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
    patchAttempt:(workspace,sessionId,expected,patch)=>{owns(workspace,sessionId);return store.patchAttempt(workspace,sessionId,expected,patch,{background:true});},
  };
}

// Product coordination only. Execution owns pages; Desktop presents them by key.
export class SessionRuntimes {
  #records = new Map();
  all() { return [...this.#records.values()]; }
  find(project) { return this.#records.get(sessionRuntimeKey(project)); }
  constructor({store,runtime,contextCache,execution,presentation,onChange=()=>{},onPage=()=>{},
    decorate=()=>()=>{},onError=()=>{},onChatBound=()=>{}}) {
    Object.assign(this,{store,runtime,contextCache,execution,presentation,onChange,onPage,decorate,onError,onChatBound});
    this.visible=null;
    // Backend draining: no new Send, context delivery or assignment starts;
    // work already in flight continues and checkpoints are untouched.
    this.paused=false;
  }
  ensure(project=null) {
    if(project?.external)throw Object.assign(new Error('Эта сессия открыта в ChatGPT. Продолжайте разговор там.'),{code:'EXTERNAL_SESSION'});
    const key=sessionRuntimeKey(project), existing=this.#records.get(key);
    if(existing)return existing;
    const identity=project?Object.freeze({workspace:project.workspace,sessionId:project.sessionId,
      assignmentId:project.assignmentId??null,taskId:project.taskId??null}):null;
    const browser=this.execution.openBrowserSession(key);
    const runtimes=this;
    const record={key,identity,browser,pageState:browser.pageState,ready:false,get paused(){return runtimes.paused;},
      get loading(){return browser.snapshot().loading;},get epoch(){return browser.snapshot().epoch;},
      readinessEpoch:0,disposed:false,manualDocumentOwner:null,lastStopObservation:null,error:null,cleanups:[]};
    record.navigationTail=Promise.resolve();
    const observeNavigation=work=>{
      record.navigationTail=record.navigationTail.then(()=>record.disposed?undefined:work()).catch(error=>{
        const attempt=record.project()?.attempt;
        if(attempt?.bootstrapTransport==='url-query')record.controller.cancelledRequests.add(attempt.requestId);
        record.error={code:error.code??'STARTUP_OBSERVATION_FAILED',message:error.message};this.onError(record,error);
      });
      void record.navigationTail.then(()=>{if(!record.disposed){this.tick(record);this.onChange(record);}});
    };
    record.addressLost = !!project && !project.chatUrl && (!!project.attempt?.sendStartedAtMs
      || ['sending','sent','unknown','acknowledged'].includes(project.attempt?.state));
    this.#records.set(key,record);
    record.project=()=>identity?this.store.project(identity.workspace,identity.sessionId):null;
    const scopedStore=identity?sessionStore(this.store,identity):this.store;
    record.composer=browser.composer;
    record.controller=new ContextSession({store:scopedStore,runtime:this.runtime(),contextCache:this.contextCache,
      canStartChat:()=>{const p=record.project();return !this.paused&&!record.disposed&&record.ready
        &&!record.manualStartObserved&&!p?.manualStart&&!!p&&!p.archivedAt&&!p.sessionArchivedAt;},
      composer:record.composer,onChange:()=>{this.syncStartupObservation(record);this.onChange(record);},onChatBound:()=>this.onChatBound(record)});
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
        const snapshot=record.browser.snapshot();
        observeNavigation(()=>record.controller.observePage(event,snapshot));
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
      if(['navigation-start','navigated','navigation-interrupted','crashed'].includes(event.type))
        observeNavigation(()=>record.controller.observeNavigation(event.type==='crashed'?{...event,isMainFrame:true,
          url:event.snapshot?.url,navigationSequence:event.snapshot?.navigationSequence}:event));
      // A page reloaded after its renderer died keeps the readiness it had; the
      // interrupted Send stays UNKNOWN in the composer and is never repeated.
      if(event.type==='loaded'&&record.readyBeforeCrash&&!event.snapshot?.crashed){record.ready=true;record.readyBeforeCrash=false;}
      if(event.type==='loaded')void record.navigationTail.then(()=>{this.tick(record);this.onChange(record);});
      if(event.type==='crashed'){
        record.readyBeforeCrash=event.recovering===true&&record.ready;record.ready=false;
        const saved=record.project();
        if(saved&&!saved.chatUrl&&(saved.attempt?.sendStartedAtMs||['sent','unknown'].includes(saved.attempt?.state)))record.addressLost=true;
      }
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
    const urlStartup=project?.attempt?.bootstrapTransport==='url-query',cancelling=urlStartup&&project.attempt.cancelState==='requested';
    if(record.disposed||!project||project.archivedAt||project.sessionArchivedAt)return;
    if(!cancelling&&(this.paused||!record.ready||record.loading))return;
    if(!project.chatUrl&&!project.attempt&&(record.manualStartObserved||project.manualStart)){
      record.controller.emit({phase:'waiting-manual-chat',messageSent:false,error:null});return;
    }
    if(!urlStartup&&record.addressLost&&!normalizeChatUrl(record.composer.getURL())) {
      record.controller.emit({phase:'send-unknown',error:{code:'SESSION_CHAT_ADDRESS_UNKNOWN',
        message:'Страница разговора утрачена до сохранения адреса. Первоначальная отправка не повторяется; восстановите исходный разговор.'}});
      return;
    }
    record.addressLost=false;
    record.controller.runtime=this.runtime();
    if(!record.controller.active) {
      record.controller.attach(project,{freshDraft:freshDraft||record.freshDraft===true});
      record.freshDraft=false;
    }
    void record.controller.tick();
  }
  syncStartupObservation(record){
    const project=record.project(),attempt=project?.attempt,controller=record.controller;
    const eligible=controller&&record.ready&&!record.disposed&&!this.paused&&!record.loading
      &&!project?.archivedAt&&!project?.sessionArchivedAt&&!project?.manualStart&&!project?.preparationPaused&&!project?.chatUrl
      &&!attempt?.sendStartedAtMs&&!['sending','sent','acknowledged','unknown'].includes(attempt?.state)
      &&['waiting-composer','waiting-login'].includes(controller.state.phase);
    let probe=record.startupObservation;
    if(!eligible){if(probe)clearTimeout(probe.timer);if(probe)probe.timer=null;return;}
    if(probe?.generation!==controller.generation){if(probe)clearTimeout(probe.timer);
      probe=record.startupObservation={generation:controller.generation,count:0,timer:null};}
    if(probe.timer||probe.count>=60)return;
    // Layout/CSSOM readiness can change without a DOM mutation. Only an unsent
    // bootstrap receives this bounded read-only reconciliation; never a Send retry.
    probe.timer=setTimeout(async()=>{
      probe.count++;
      try{if(!controller.pending&&await record.composer.observeSnapshot()
        &&!record.disposed&&controller.generation===probe.generation)this.tick(record);}
      catch(error){if(!record.disposed)this.onError(record,error);}
      finally{probe.timer=null;if(!record.disposed)this.syncStartupObservation(record);}
    },500);probe.timer.unref?.();
  }
  observeManualConversation(state, record = this.visible) {
    const selected = record?.project(), documentId = record?.pageState.current?.documentId;
    if (!selected || selected.chatUrl || !documentId) return false;
    if (!record.manualDocumentOwner && /^https:\/\/chatgpt\.com\/$/.test(state.url) && state.userMessageCount === 0)
      record.manualDocumentOwner = {documentId, workspace:selected.workspace, sessionId:selected.sessionId, generation:record.epoch, binding:false};
    const owner = record.manualDocumentOwner;
    if (!owner || owner.documentId !== documentId || owner.workspace !== selected.workspace
        || owner.sessionId !== selected.sessionId || owner.generation !== record.epoch || !state.manualSendRevision) return false;
    if (selected.attempt?.state === 'sent' || selected.attempt?.sendStartedAtMs) return false;
    const url = normalizeChatUrl(state.url);
    record.manualStartObserved=true;
    record.controller.cancel();
    if(!selected.manualStart&&!owner.checkpoint){
      owner.checkpoint=this.store.updateSession(owner.workspace,owner.sessionId,{manualStart:true},{background:true}).then(()=>{
        if(!record.disposed){this.tick(record);this.onChange(record);}
      },error=>{owner.checkpoint=null;this.onError(record,error);});
    }
    if (!url || owner.binding) return true;
    owner.binding = true;
    void this.store.bindChat(owner.workspace, owner.sessionId, url, {manual:true,background:true}).then(() => {
      if (record.manualDocumentOwner !== owner || record.disposed || record.epoch !== owner.generation) return;
      this.tick(record); this.onChange(record); this.onChatBound(record);
    }, error => { if (record.manualDocumentOwner === owner) { owner.binding = false; this.onError(record,error); } });
    return true;
  }
  show(record) {
    if(record.disposed||this.#records.get(record.key)!==record)throw new Error('SESSION_RUNTIME_RELEASED');
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
    clearTimeout(record.startupObservation?.timer);
    for(const cleanup of record.cleanups.splice(0).reverse())cleanup();
    record.browser.release();
    this.#records.delete(record.key);return true;
  }
  dispose() {for(const record of this.all())this.release(record,{force:true});}
}
