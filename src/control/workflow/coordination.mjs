import { ProjectAutoPlan } from './project-auto-plan.mjs';
import { configureProjectAutoPlan } from './project-session-auto-plan.mjs';
import { AutoPlan } from './auto-plan.mjs';
import { PlanReviewClient } from './plan-review.mjs';
import { ReviewContinuation } from './review-continuation.mjs';
import { AutomationSendState } from './automation-send-state.mjs';
import { readAutoPlanState } from './auto-plan-state.mjs';
import { PlanMonitor } from './plan-monitor.mjs';
import { ParallelExecution } from './parallel-execution.mjs';
import { ParallelKit } from './parallel-kit.mjs';
import { ExecutionControl } from './execution-control.mjs';
import { readReview } from '@webpilot/workflow-kit/lib/plan-review';
import { reviewBlocksExecution } from './auto-plan-state.mjs';
import { configureExecutor, executorPageState } from './executor-session.mjs';
import { ProjectInputWatch, ChildCommandWatches, chatGPTEntrypoint } from '../../execution/facade.mjs';
import { removeProjectSettings, belongsToProject } from '../projects/project-state-cleanup.mjs';

// The 0.6.115 coordination rules live here. Desktop supplies presentation/readiness and persistence.
export function createWorkflowCoordination({store, setup:workspaceSetup, plans:sessionPlans,
  getController, available, contextAvailable, onChange:publish, report, save:saveSettings}) {
let liveSessions;
let reviewCheckpoint=null,automationCheckpoint=null,parallelExecutionBook={};
const projectAutoPlan=new ProjectAutoPlan({identity:workspace=>store.snapshot().projects.find(p=>p.workspace===workspace)?.projectId,
  ownsSession:(workspace,id)=>store.snapshot().projects.some(p=>p.workspace===workspace&&p.sessions.some(s=>s.sessionId===id)),onChange:workspace=>{
  for(const record of liveSessions.all()) {
    const project=record.project();
    if((project?.parentWorkspace??project?.workspace)!==workspace)continue;
    record.primaryAutomation?.update();
    if(record.executor){record.executor.setEnabled(projectAutoPlan.enabled(workspace,project.parentScopeId));record.controller.signal();}
  }
  void saveSettings().catch(report);void execution.signal(workspace);publish();
}});
// The run/pause button of orchestrated plans; legacy plans keep ProjectAutoPlan.
const executionControl=new ExecutionControl({identity:workspace=>store.snapshot().projects.find(p=>p.workspace===workspace)?.projectId,
  onChange:workspace=>{void saveSettings().catch(report);void execution.signal(workspace);publish();}});
const planMonitor = new PlanMonitor({ selected: () => store.selected(),
  inspect: (workspace, sessionId) => store.inspect(workspace, sessionId), onChange: (_info, change) => {
    publish();
    // A published orchestrated plan fixes session roles; a closed one remembers its commit.
    const workspace=store.selected()?.workspace;
    if (change?.semanticChanged && workspace && !store.selected()?.parentWorkspace)
      void store.reconcileRoles(workspace).then(changed=>{if(changed)publish();}).catch(report);
    if (change?.semanticChanged || change?.recovered) void autoPlan.planChanged().catch(report);
    if (change?.semanticChanged && contextAvailable()) void getController()?.tick();
  }, onInputsChanged: () => {
    planReview.refresh();
    if (contextAvailable()) getController()?.projectChanged();
  }, onError: () => publish() });
const automationSend = new AutomationSendState({save:async checkpoint=>{
  automationCheckpoint=checkpoint;await saveSettings({automationCheckpoint});
}});
function sendAutomation(text,canContinue,onBeforeSend,flow) {
  const sender=liveSessions.visible?.primaryAutomation?.automation??automationSend;
  return sender.send({selected:flow.selected(),page:flow.page,ready:canContinue,kind:flow===autoPlan?'plan':'review',
    perform:()=>getController().composer.sendUserMessage({text,canContinue,onBeforeSend,waitForAcknowledgement:false,cleanupOnCancel:true})});
}
const emptyAutoPlan=new AutoPlan({selected:()=>null,inspectPlan:async()=>({}),send:async()=>({})});
const autoPlan=new Proxy({}, {
  get:(_target,key)=>{const flow=liveSessions.visible?.primaryAutomation?.flow??emptyAutoPlan,value=flow[key];return typeof value==='function'?value.bind(flow):value;},
  set:(_target,key,value)=>{(liveSessions.visible?.primaryAutomation?.flow??emptyAutoPlan)[key]=value;return true;}
});
function configurePrimary(record) {
  return configureProjectAutoPlan(record,{store,authorization:projectAutoPlan,
    inspectPlan:selected=>readAutoPlanState(selected,workspaceSetup.environment),onChange:()=>publish(),
    log:(event,fields)=>record.diagnostics?.log.record('auto-plan',event,fields)});
}
const planReview = new PlanReviewClient({selected:()=>store.selected(),onChange:()=>publish()});
const reviewContinuation=new ReviewContinuation({selected:()=>store.selected(),client:planReview,
  send:sendAutomation,onChange:()=>publish(),
  available,
  saveCheckpoint:async checkpoint=>{reviewCheckpoint=checkpoint;await saveSettings({reviewCheckpoint});}});
const executionKit=new ParallelKit({plans:sessionPlans,setup:workspaceSetup});
// The parallel queue has the authoritative Kit confirmation; per-chat plan
// projections must not bind a pre-plan ON while review/transaction is pending.
const authorizedExecutionKit=Object.create(executionKit);
authorizedExecutionKit.read=async workspace=>{
  const facts=await executionKit.read(workspace),plan=facts.plan;
  if(plan.execution_strategy==='parallel'&&facts.confirmed&&plan.execution_scope_status==='ACTIVE')
    projectAutoPlan.sync(workspace,plan.scope_id,{confirmed:true,planRevision:plan.plan_revision,
      originSessionId:plan.execution_origin_session_id});
  return facts;
};
const liveRecord=project=>project&&liveSessions.find(project);
const orchestratedPlan=workspace=>store.project(workspace)?.planExecution?.execution_strategy==='orchestrated';
// Executors of an orchestrated plan keep their continuations while a pause is pending.
const executorEnabled=(workspace,scope)=>orchestratedPlan(workspace)
  ?['running','pausing'].includes(executionControl.view(workspace,scope).state):projectAutoPlan.enabled(workspace,scope);
const storedOrchestrator=(workspace,scope)=>store.snapshot().projects.find(p=>p.workspace===workspace)?.sessions
  .find(s=>s.role==='orchestrator'&&s.orchestratorScopeId===scope&&!s.archivedAt)?.sessionId??null;
async function restoreExecutionPage(project,assignment=null) {
  if(liveRecord(project)?.ready&&(!assignment||liveRecord(project).executor))return project;
  if(!project?.chatUrl||(!project.manualStart&&!project.attempt?.sendStartedAtMs&&!['sent','acknowledged'].includes(project.attempt?.state)))
    throw Object.assign(new Error('Сохранённый адрес и отправка не подтверждены. Откройте соответствующий чат и проверьте его; автоматического Send нет.'),{code:'EXECUTOR_CHAT_UNKNOWN'});
  const record=liveSessions.ensure(project);
  if(assignment)configureExecutor(record,{store,enabled:executorEnabled(project.parentWorkspace??project.workspace,project.parentScopeId??project.scopeId),
    inspectPlan:selected=>readAutoPlanState(selected,workspaceSetup.environment),onChange:()=>publish(),
    signal:()=>{void execution.signal(project.parentWorkspace);},
    log:(event,fields)=>record.diagnostics?.log.record('auto-plan',event,fields)});
  if(!record.ready){record.ready=true;await liveSessions.navigate(record,project.chatUrl);}
  return project;
}
const execution=new ParallelExecution({kit:authorizedExecutionKit,book:parallelExecutionBook,
  // A draining backend opens no new assignment and queues no new send.
  isEnabled:(workspace,scope)=>!liveSessions?.paused&&executorEnabled(workspace,scope),
  // New tasks, the final handoff and delivery steps of an orchestrated plan wait while it is not running.
  isIssuing:(workspace,scope)=>!orchestratedPlan(workspace)||executionControl.issuing(workspace,scope),
  canFinalize:(workspace,scope)=>orchestratedPlan(workspace)?executionControl.issuing(workspace,scope):projectAutoPlan.finalizationAllowed(workspace,scope),
  onComplete:(workspace,scope)=>orchestratedPlan(workspace)?executionControl.complete(workspace,scope)
    :projectAutoPlan.sync(workspace,scope,{complete:true,confirmed:true}),
  onSettle:(workspace,scope,facts)=>executionControl.settle(workspace,scope,facts),
  onPause:(workspace,scope,reason,message)=>executionControl.pause(workspace,scope,reason,message??null),
  sendWorker:(assignment,entry,text,ready,before)=>{
    const record=liveRecord(store.project(assignment.worktree,entry?.sessionId));
    return record?.executor?record.executor.deliver(text,ready,before):Promise.resolve({state:'cancelled',reason:'PAGE_NOT_READY'});
  },
  orchestrator:storedOrchestrator,
  origin:(workspace,id)=>store.project(workspace,id),
  save:async book=>{parallelExecutionBook=book;await saveSettings({parallelExecutionBook:book});},
  onChange:()=>{
    for(const [workspace,watcher] of execution.unwatch){
      watcher.refreshAssignments?.();
    }
    for(const state of execution.states.values())for(const assignment of state.assignments??[])if(assignment.status==='INTEGRATED') {
      const record=liveRecord(store.project(assignment.worktree));
      if(record){record.integrated=true;record.executor?.clock.observe('done');
        // An integrated executor of an orchestrated plan frees its page; the chat reopens from the task.
        if(orchestratedPlan(assignment.parent_root??state.workspace)&&liveSessions.visible!==record)liveSessions.release(record);}
    }
    publish();
  },
  watch:(workspace,signal)=>{
    const onError=error=>{if(error)execution.publish(workspace,{phase:'attention',error});};
    const watcher=new ProjectInputWatch({workspace,onSignal:signal,onError});
    const children=new ChildCommandWatches({onSignal:signal,onError});
    const refreshAssignments=()=>{
      const state=execution.view(workspace),origin=store.project(workspace,state.originSessionId);
      // No worktree path from an unconfirmed/foreign assignment is watched.
      children.update((state.assignments??[]).filter(a=>{
        if(a.status==='INTEGRATED'||a.status==='UNKNOWN'||!a.worktree||!origin)return false;
        const child=store.project(a.worktree);
        return child?.assignmentId===a.id&&child.parentWorkspace===workspace
          &&child.parentProjectId===origin.projectId&&child.parentScopeId===state.scopeId
          &&child.executionOriginSessionId===origin.sessionId&&!child.archivedAt;
      }).map(a=>a.worktree));
    };
    watcher.update(['.harness/runtime/command-activity/']);
    const stop=()=>{watcher.close();children.close();};
    stop.update=paths=>{watcher.update(['.harness/runtime/command-activity/',...(paths??[])]);refreshAssignments();};
    stop.refreshAssignments=refreshAssignments;return stop;
  },
  mainState:origin=>{
    const record=liveRecord(origin),page=record?.pageState.current;
    return {...executorPageState(record),documentId:page?.documentId??null,
      lastMessageRole:page?.state?.lastMessageRole??null,
      userMessagesRevision:page?.state?.userMessagesRevision??null,
      manualInputRevision:page?.state?.manualInputRevision??0,
      manualStopRevision:page?.state?.manualStopRevision??0};
  },
  workerState:(assignment,entry)=>executorPageState(liveRecord(store.project(assignment.worktree,entry?.sessionId))),
  restoreOrigin:origin=>restoreExecutionPage(origin),
  restoreWorker:async(assignment,origin,entry,recovery)=>{
    if(!assignment.worktree)return null;
    const project=store.project(assignment.worktree,entry?.sessionId);
    if(!project) {
      if(entry?.sessionId||entry?.phase==='opening'||['RUNNING','READY_FOR_INTEGRATION'].includes(assignment.status))
        throw Object.assign(new Error('Не найдена сохранённая сессия назначения. Проверьте worktree и чат; новая сессия автоматически не создаётся.'),{code:'EXECUTOR_SESSION_MISSING'});
      return null;
    }
    if(project.assignmentId!==assignment.id||project.taskId!==assignment.parent_task_id||project.parentScopeId!==assignment.parent_scope_id
      ||project.executionOriginSessionId!==origin.sessionId||project.parentWorkspace!==origin.workspace||project.parentProjectId!==origin.projectId||project.archivedAt||project.sessionArchivedAt)
      throw Object.assign(new Error('Сессия не соответствует назначению Kit. Откройте её для проверки.'),{code:'EXECUTOR_SESSION_MISMATCH'});
    const restored=await restoreExecutionPage(project,assignment);
    if(recovery)await liveRecord(restored)?.controller.resumePreparation();
    return restored;
  },
  openWorker:async(assignment,origin)=>{
    const project=await store.ensureExecutor(assignment,origin),record=liveSessions.ensure(project);
    configureExecutor(record,{store,enabled:executorEnabled(project.parentWorkspace??project.workspace,project.parentScopeId??project.scopeId),
      inspectPlan:selected=>readAutoPlanState(selected,workspaceSetup.environment),onChange:()=>publish(),
      signal:()=>{void execution.signal(origin.workspace);},
      log:(event,fields)=>record.diagnostics?.log.record('auto-plan',event,fields)});
    record.ready=true;
    await liveSessions.navigate(record,project.chatUrl??chatGPTEntrypoint(project.experience),{freshDraft:!project.attempt&&!project.chatUrl});
    publish();return project;
  },
  sendCorrection:(origin,text,canContinue,onBeforeSend)=>sendExecutionMessage(origin,text,canContinue,onBeforeSend,'correction'),
  sendDiagnostic:(origin,text,canContinue,onBeforeSend)=>sendExecutionMessage(origin,text,canContinue,onBeforeSend,'diagnostic'),
  sendFinalization:(origin,text,canContinue,onBeforeSend)=>sendExecutionMessage(origin,text,canContinue,onBeforeSend,'finalization')});
function sendExecutionMessage(origin,text,canContinue,onBeforeSend,kind) {
  const record=liveRecord(origin),sender=record?.primaryAutomation?.automation;
  if(!sender)return Promise.resolve({state:'cancelled',reason:'PAGE_NOT_READY'});
  return sender.send({selected:origin,page:record.pageState.current?.state,kind,ready:canContinue,
    perform:()=>record.composer.sendUserMessage({text,canContinue,onBeforeSend,waitForAcknowledgement:false,cleanupOnCancel:true})});
}
// The button command: verified against the published plan, never against a chat's guess.
async function setPlanExecution() {
  const selected=store.selected(),workspace=selected?.parentWorkspace??selected?.workspace;
  if(!workspace||selected?.external)throw Object.assign(new Error('Выберите проект с планом оркестратора.'),{code:'PLAN_EXECUTION_UNAVAILABLE'});
  const info=await store.inspect(workspace);
  if(info.planExecution?.execution_strategy!=='orchestrated'||!['ACTIVE','BLOCKED'].includes(info.scopeStatus))
    throw Object.assign(new Error('Кнопка доступна у опубликованного плана оркестратора.'),{code:'PLAN_EXECUTION_UNAVAILABLE'});
  if(reviewBlocksExecution(readReview(workspace),info.scopeId))
    throw Object.assign(new Error('План ещё не согласован в Review.'),{code:'PLAN_NOT_APPROVED'});
  const view=executionControl.toggle(workspace,info.scopeId);
  execution.observe(workspace);await saveSettings();
  return view;
}
async function setAutoPlan(enabled) {
    const selected=store.selected(),workspace=selected?.parentWorkspace??selected?.workspace;
    const project=selected?.parentWorkspace?store.project(workspace):selected;
    if(project&&(await store.inspect(workspace)).planExecution?.execution_strategy==='orchestrated')
      throw Object.assign(new Error('План оркестратора запускается кнопкой «Начать выполнение плана».'),{code:'PLAN_EXECUTION_BUTTON'});
    const info=project&&await readAutoPlanState(project,workspaceSetup.environment);
    let verified=info?.confirmed===true;
    if(info?.scopeId&&info.planExecution?.execution_strategy==='parallel'){
      const kit=await executionKit.read(workspace);
      verified=kit.confirmed&&kit.plan.project_id===info.projectId
        &&kit.plan.scope_id===info.scopeId&&kit.plan.plan_revision===info.planRevision;
    }
    const scope=verified?info.scopeId:null;
    const done=verified&&info.planView?.tasks?.length>0&&info.planView.tasks.every(t=>t.status==='done');
    projectAutoPlan.sync(workspace,scope,{confirmed:verified,complete:done,
      planRevision:info?.planRevision,originSessionId:info?.planExecution?.execution_origin_session_id});
    const current=projectAutoPlan.state(workspace);
    if(scope&&current?.scopeId!==scope&&enabled===true)
      throw new Error('План изменился во время переключения AutoPlan. Обновите состояние проекта.');
    // Completion is an automatic OFF, never misrecord it as a manual OFF.
    if(!(done&&enabled===true))projectAutoPlan.set(workspace,
      scope&&current?.scopeId!==scope?current.scopeId:scope,enabled===true,project?.sessionId);
    if(workspace)execution.observe(workspace);
    await saveSettings();
}
function observePage(event, record = liveSessions.visible) {
  if(!record||record.disposed)return;
  const visible=record===liveSessions.visible;
  if(visible) {
    automationSend.observe(record.project(),event);
    if(!record.identity?.assignmentId) reviewContinuation.observe(event);
  }
  record.primaryAutomation?.observe(event);
  record.executor?.observe(event);
  const safety=JSON.stringify([event.documentId,event.state?.url,event.state?.busy,event.state?.lastMessageRole,event.state?.connectionError,
    event.state?.draftPresent,event.state?.editorAvailable,event.state?.writable,event.state?.turnId,event.state?.userTurnId,
    event.state?.assistantRevision,event.state?.userMessagesRevision,event.state?.manualInputRevision,
    event.state?.manualStopRevision,event.state?.manualSendRevision]);
  if(record.identity&&!record.identity.assignmentId&&execution.unwatch.has(record.identity.workspace)&&record.executionSafety!==safety) {
    record.executionSafety=safety;void execution.signal(record.identity.workspace);
  }
  publish();
}

function snapshot() {
  return structuredClone({projectAutoPlan:projectAutoPlan.snapshot(),executionControl:executionControl.snapshot(),reviewCheckpoint,automationCheckpoint,parallelExecutionBook});
}
function restore(settings={}) {
  projectAutoPlan.book=new ProjectAutoPlan({saved:settings.projectAutoPlan}).snapshot();
  executionControl.book=new ExecutionControl({saved:settings.executionControl}).snapshot();
  parallelExecutionBook=settings.parallelExecutionBook&&typeof settings.parallelExecutionBook==='object'&&!Array.isArray(settings.parallelExecutionBook)
    ? structuredClone(settings.parallelExecutionBook) : {};
  execution.book=parallelExecutionBook;
  reviewCheckpoint=structuredClone(settings.reviewCheckpoint??null);
  automationCheckpoint=structuredClone(settings.automationCheckpoint??null);
  emptyAutoPlan.restore(false);
  automationSend.entries.clear();automationSend.cycles.clear();automationSend.restore(automationCheckpoint);
  reviewContinuation.stops.clear();reviewContinuation.restore(reviewCheckpoint);
}
const executionPort=Object.freeze({
  view: workspace=>structuredClone(execution.view(workspace)),
  allStates: ()=>structuredClone([...execution.states].map(([workspace,state])=>({...state,workspace}))),
  ledgers: ()=>structuredClone(Object.values(parallelExecutionBook)),
  observe: workspace=>execution.observe(workspace),signal: workspace=>execution.signal(workspace),
  recheck: workspace=>execution.recheck(workspace),correct: (...args)=>execution.correct(...args),
  suspend: workspace=>execution.suspend(workspace),forget: workspaces=>execution.forget(workspaces),
  publish: (...args)=>execution.publish(...args),dispose: ()=>execution.dispose(),
});
return Object.freeze({
  attachSessions: sessions=>{if(liveSessions)throw new Error('WORKFLOW_SESSIONS_ALREADY_ATTACHED');liveSessions=sessions;},
  autoPlan,
  planMonitor:Object.freeze({
    get error(){return planMonitor.error;},get watchError(){return planMonitor.watchError;},
    get pending(){return planMonitor.pending;},get rerunRequested(){return planMonitor.rerunRequested;},
    view:(...args)=>planMonitor.view(...args),observeSelection:()=>planMonitor.observeSelection(),
    refresh:()=>planMonitor.refresh(),invalidate:()=>planMonitor.invalidate(),close:()=>planMonitor.close(),
  }),
  planReview:Object.freeze({view:()=>planReview.view(),setEnabled:input=>planReview.setEnabled(input),
    refresh:()=>planReview.refresh(),observeSelection:()=>planReview.observeSelection(),dispose:()=>planReview.dispose()}),
  reviewContinuation:Object.freeze({get persistenceError(){return reviewContinuation.persistenceError;},
    get message(){return reviewContinuation.flow.state.message;},
    update:()=>reviewContinuation.update(),dispose:()=>reviewContinuation.dispose()}),
  projectAutoPlan:Object.freeze({enabled:(...args)=>projectAutoPlan.enabled(...args),snapshot:()=>projectAutoPlan.snapshot()}),
  executionControl:Object.freeze({view:(...args)=>executionControl.view(...args),enabled:(...args)=>executionControl.enabled(...args),
    snapshot:()=>executionControl.snapshot()}),setPlanExecution,
  execution:executionPort,executionKit:Object.freeze({git:(...args)=>executionKit.git(...args)}),
  configurePrimary,observePage,setAutoPlan,snapshot,restore,
  sessionChanged(record) {
    record.primaryAutomation?.update();record.executor?.changed();
    if(record.identity&&!record.identity.assignmentId&&execution.unwatch.has(record.identity.workspace)) {
      const stopped=executorPageState(record).stopped;
      if(record.executionStopped!==stopped){record.executionStopped=stopped;void execution.signal(record.identity.workspace);}
    }

  },
  cleanup(identities) {
  const cleaned=removeProjectSettings({projectAutoPlan:projectAutoPlan.snapshot(),parallelExecutionBook,reviewCheckpoint,automationCheckpoint},identities);
  projectAutoPlan.book=cleaned.projectAutoPlan;parallelExecutionBook=cleaned.parallelExecutionBook;execution.book=parallelExecutionBook;
  reviewCheckpoint=cleaned.reviewCheckpoint;automationCheckpoint=cleaned.automationCheckpoint;
  execution.forget(identities.map(p=>p.workspace));
  executionControl.forget(identities.map(p=>p.workspace));
  for(const book of [automationSend.entries,automationSend.cycles,reviewContinuation.flow.checkpoints,reviewContinuation.flow.cycles,reviewContinuation.stops])
    for(const [key,value] of book)if(belongsToProject([key,value],identities))book.delete(key);

  },
  restoreBackground() {
    // A plan that was running or pausing continues after a backend restart, without a repeated Send.
    for(const [workspace,state] of Object.entries(executionControl.book))if(['running','pausing'].includes(state.state)) {
      execution.observe(workspace);void execution.signal(workspace);
    }
    for(const [workspace,state] of Object.entries(projectAutoPlan.book))if(state.enabled) {
      const project=store.project(workspace,state.sessionId);
      if(project?.chatUrl&&!project.archivedAt&&!project.sessionArchivedAt)void restoreExecutionPage(project).catch(report);
    }
    for(const project of store.snapshot().projects)if(!project.parentWorkspace&&!project.archivedAt
      &&(project.sessions.some(s=>s.executionSnapshot?.parallel_allowed)||Object.values(parallelExecutionBook).some(b=>b?.workspace===project.workspace))) {
      execution.observe(project.workspace);void execution.signal(project.workspace);
    }

  },
});
}
