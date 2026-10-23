import { ProjectPlanContinuation } from './project-plan-continuation.mjs';
import { configureProjectPlanContinuation } from './project-session-plan-continuation.mjs';
import { PlanContinuation } from './plan-continuation.mjs';
import { PlanReviewClient } from './plan-review.mjs';
import { PlanningOwners } from './planning-owner.mjs';
import { ReviewContinuation } from './review-continuation.mjs';
import { AutomationSendState } from './automation-send-state.mjs';
import { readPlanContinuationState } from './plan-continuation-state.mjs';
import { PlanMonitor } from './plan-monitor.mjs';
import { ParallelExecution } from './parallel-execution.mjs';
import { ParallelKit } from './parallel-kit.mjs';
import { ExecutionControl } from './execution-control.mjs';
import { readReview } from '@webpilot/workflow-kit/lib/plan-review';
import { reviewBlocksExecution } from './plan-continuation-state.mjs';
import { configureExecutor, executorPageState } from './executor-session.mjs';
import { ProjectInputWatch, ChildCommandWatches, chatGPTEntrypoint } from '../../execution/facade.mjs';
import { removeProjectSettings, belongsToProject } from '../projects/project-state-cleanup.mjs';
import { unsentExecutor } from '../sessions/workspace-session.mjs';
import { AUTOMATIC_DIALOGUE_ENABLED } from '../../contracts/backend.mjs';
import {DialogueDelivery} from './dialogue-delivery.mjs';
import { UserChoices, collectChoiceFacts } from './user-choices.mjs';
import { readExecutionMode, chooseExecutionMode } from '@webpilot/workflow-kit/lib/execution-mode';
import { readPlanningOwner } from '@webpilot/workflow-kit/lib/planning-owner';
import { safePath } from '@webpilot/workflow-kit/lib/common';
import { desktopFiles } from '../../execution/facade.mjs';

// The 0.6.115 coordination rules live here. Desktop supplies presentation/readiness and persistence.
export function createWorkflowCoordination({store, setup:workspaceSetup, plans:sessionPlans,
  getController, available, contextAvailable, onChange:publishModel, report, save:saveSettings,getPlugin=()=>null}) {
// Every published change may add or retire a cause of the user's choice card.
function publish(){publishModel();scheduleChoices();}
let liveSessions;
// A pending Kit transaction holds only its project. The service and archive stay
// available; neither startup nor deletion repairs or changes the Kit journal.
const startupRecovery=new Map();
const recoveryWatchers=new Map(),recoveryChecks=new Map();
const recoveryError=()=>Object.assign(new Error('Незавершённая транзакция Workflow Kit удерживает проект. Проверьте ./scripts/workflow status, завершите сохранённую транзакцию штатным commit или repair. После её подтверждённого завершения блокировка снимется автоматически; затем повторите подготовку контекста. План не возобновляется автоматически.'),{code:'PROJECT_RECOVERY_REQUIRED'});
const held=project=>startupRecovery.has(project?.parentWorkspace??project?.workspace);
// Only a fresh, successful readiness proof releases the original hold. A
// missing/unknown Kit result is never interpreted as a completed transaction.
function recheckRecovery(root){
  if(!startupRecovery.has(root))return Promise.resolve(false);
  if(recoveryChecks.has(root))return recoveryChecks.get(root);
  const check=(async()=>{
    for(const workspace of startupRecovery.get(root)??[]){
      workspaceSetup.invalidateReadiness(workspace);
      try{if((await workspaceSetup.ready(workspace)).ready!==true)return false;}
      catch{return false;}
    }
    if(!startupRecovery.has(root))return false;
    startupRecovery.delete(root);recoveryWatchers.get(root)?.close();recoveryWatchers.delete(root);
    publish();
    const controller=getController();
    if(contextAvailable()&&controller?.active&&(controller.active.workspace===root||store.project(controller.active.workspace)?.parentWorkspace===root)){
      if(controller.state?.error?.code==='PROJECT_RECOVERY_REQUIRED')void controller.resumePreparation().catch(report);
      else controller.signal();
    }
    // Recovery only re-enables new bootstrap. Sequential and orchestrated
    // permissions remain OFF/paused until an explicit user action.
    return true;
  })().finally(()=>recoveryChecks.delete(root));
  recoveryChecks.set(root,check);return check;
}
function watchRecovery(root){
  if(recoveryWatchers.has(root))return;
  const watcher=new ProjectInputWatch({workspace:root,onSignal:()=>void recheckRecovery(root).catch(report),
    onError:error=>{if(error)report(error);}});
  recoveryWatchers.set(root,watcher);
  watcher.update(['.git/workflow-kit/transaction.json','.git/workflow-kit/operation.lock']);
}
let reviewCheckpoint=null,automationCheckpoint=null,parallelExecutionBook={};
const dialogue=new DialogueDelivery({store,getPlugin,record:project=>project&&liveSessions?.find(project),
  route:(workspace,scope)=>executionControl.route(workspace,scope),state:(workspace,scope)=>executionControl.view(workspace,scope),
  signals:workspace=>executionKit.signals(workspace),
  kitPermission:(workspace,input)=>sessionPlans.call(workspace,'plan:permission',[],input)});
let permissionTail=Promise.resolve();
function syncPermission(workspace){
  if(startupRecovery.has(workspace))return Promise.resolve();
  const entry=executionControl.book[workspace];if(!entry||entry.route!=='plugin-v1')return Promise.resolve();
  const {scopeId,state}=entry;
  const next=permissionTail.then(()=>dialogue.permission(workspace,scopeId,state));
  permissionTail=next.catch(report);return next;
}
const projectPlanContinuation=new ProjectPlanContinuation({identity:workspace=>store.snapshot().projects.find(p=>p.workspace===workspace)?.projectId,
  ownsSession:(workspace,id)=>store.snapshot().projects.some(p=>p.workspace===workspace&&p.sessions.some(s=>s.sessionId===id)),onChange:workspace=>{
  for(const record of liveSessions.all()) {
    const project=record.project();
    if((project?.parentWorkspace??project?.workspace)!==workspace)continue;
    record.primaryAutomation?.update();
    if(record.executor&&!orchestratedPlan(workspace)){record.executor.setEnabled(projectPlanContinuation.enabled(workspace,project.parentScopeId));record.controller.signal();}
  }
  void saveSettings().catch(report);void execution.signal(workspace);publish();
}});
// Live executors of an orchestrated plan follow its run/pause button at once.
const applyExecutionControl=workspace=>{
  for(const record of liveSessions?.all()??[]) {
    const project=record.project();
    if(!record.executor||project?.parentWorkspace!==workspace)continue;
    record.executor.setEnabled(executorEnabled(workspace,project.parentScopeId));record.controller.signal();
  }
};
// The run/pause button of orchestrated plans; legacy plans keep ProjectPlanContinuation.
const executionControl=new ExecutionControl({identity:workspace=>store.snapshot().projects.find(p=>p.workspace===workspace)?.projectId,
  onChange:workspace=>{void syncPermission(workspace).then(()=>{applyExecutionControl(workspace);return execution.signal(workspace);}).catch(report);
    void saveSettings().catch(report);publish();}});
const planMonitor = new PlanMonitor({ selected: () => store.selected(),
  inspect: (workspace, sessionId) => store.inspect(workspace, sessionId), onChange: (_info, change) => {
    publish();
    // A published orchestrated plan fixes session roles; a closed one remembers its commit.
    const workspace=store.selected()?.workspace;
    if (change?.semanticChanged && workspace && !store.selected()?.parentWorkspace)
      void store.reconcileRoles(workspace).then(changed=>{if(changed)publish();}).catch(report);
    if (change?.semanticChanged || change?.recovered) void planContinuation.planChanged().catch(report);
    if (change?.semanticChanged && contextAvailable()) void getController()?.tick();
  }, onInputsChanged: () => {
    planReview.refresh();
    const selected=store.selected(),root=selected?.parentWorkspace??selected?.workspace;
    if(root&&startupRecovery.has(root))void recheckRecovery(root).catch(report);
    if (contextAvailable()) getController()?.projectChanged();
  }, onError: () => publish() });
const automationSend = new AutomationSendState({save:async checkpoint=>{
  automationCheckpoint=checkpoint;await saveSettings({automationCheckpoint});
}});
function sendAutomation(text,canContinue,onBeforeSend,flow) {
  const sender=liveSessions.visible?.primaryAutomation?.automation??automationSend;
  return sender.send({selected:flow.selected(),page:flow.page,ready:canContinue,kind:flow===planContinuation?'plan':'review',
    perform:()=>getController().composer.sendUserMessage({text,canContinue,onBeforeSend,waitForAcknowledgement:false,cleanupOnCancel:true})});
}
const emptyPlanContinuation=new PlanContinuation({selected:()=>null,inspectPlan:async()=>({}),send:async()=>({})});
const planContinuation=new Proxy({}, {
  get:(_target,key)=>{const flow=liveSessions.visible?.primaryAutomation?.flow??emptyPlanContinuation,value=flow[key];return typeof value==='function'?value.bind(flow):value;},
  set:(_target,key,value)=>{(liveSessions.visible?.primaryAutomation?.flow??emptyPlanContinuation)[key]=value;return true;}
});
function configurePrimary(record) {
  return configureProjectPlanContinuation(record,{store,authorization:projectPlanContinuation,
    inspectPlan:selected=>readPlanContinuationState(selected,workspaceSetup.environment),onChange:()=>publish(),
    log:(event,fields)=>record.diagnostics?.log.record('plan-continuation',event,fields)});
}
// A published plan (ACTIVE/BLOCKED) freezes the Review switch until the plan is closed.
const planReview = new PlanReviewClient({selected:()=>store.selected(),onChange:()=>publish(),
  published:workspace=>['ACTIVE','BLOCKED'].includes(store.project(workspace)?.scopeStatus)});
const planningOwners=new PlanningOwners({store,onChange:()=>publish(),report});
// The user's choice cards: causes come from facts this coordination already tracks.
const modeSupported=workspace=>desktopFiles.existsSync(safePath(workspace,'.harness/kit/lib/execution-mode.mjs'));
const choiceFacts=({manual})=>collectChoiceFacts({manual,projects:store.snapshot().projects,project:workspace=>store.project(workspace),
  execution:(workspace,scope)=>executionControl.view(workspace,scope),legacyOwner:workspace=>projectPlanContinuation.state(workspace)?.sessionId,
  review:readReview,mode:workspace=>modeSupported(workspace)?readExecutionMode(workspace):null,owner:readPlanningOwner});
async function withKitLock(operation){
  for(let attempt=0;;attempt++){
    try{return await operation();}
    catch(error){if(error.code!=='WORKFLOW_LOCKED'||attempt>=40)throw error;await new Promise(resolve=>setTimeout(resolve,250));}
  }
}
const userChoices=new UserChoices({facts:choiceFacts,report,
  async act(record,option){
    if(option.action==='continue')return setPlanExecution(true,record.workspace);
    if(option.action==='transfer')return planningOwners.assign(record.workspace,record.session_id,{transfer:true});
    if(option.action==='mode'){
      await withKitLock(()=>chooseExecutionMode(record.workspace,{session_id:record.session_id,strategy:option.strategy,
        generation:record.data.generation,approval_note:'Выбор пользователя в '+(record.source==='window'?'окне':'панели')+' Workflow Pilot: '+option.label}));
      await store.reconcileRoles?.(record.workspace);
    }
  },
  async deliver(record,option){
    const project=store.project(record.workspace,record.session_id);
    if(!project)throw Object.assign(new Error('Сессия выбора больше не существует.'),{code:'USER_CHOICE_SESSION'});
    const role=option.strategy==='orchestrated'?'orchestrator':option.strategy==='sequential'?'self':record.role??'discussion';
    return dialogue.send(project,'Выбор пользователя в '+(record.source==='window'?'окне':'панели')+' Workflow Pilot: «'+option.label+'». '+option.message,
      'user-choice',{key:'choice:'+record.choice_id,role});
  },
  receipt:messageId=>dialogue.receipt(messageId),
  onChange(){
    void saveSettings().catch(report);publish();
    for(const record of userChoices.records.values())getPlugin()?.communication.userChoiceChanged?.(record.session_id);
  }});
let choicesTimer=null;
// Facts change on many events; one deferred reconciliation follows a burst of them.
function scheduleChoices(){
  if(choicesTimer)return;
  choicesTimer=setTimeout(()=>{choicesTimer=null;userChoices.reconcile();},200);choicesTimer.unref?.();
}
const reviewContinuation=new ReviewContinuation({selected:()=>store.selected(),client:planReview,
  send:sendAutomation,onChange:()=>publish(),
  available,
  saveCheckpoint:async checkpoint=>{reviewCheckpoint=checkpoint;await saveSettings({reviewCheckpoint});}});
const executionKit=new ParallelKit({plans:sessionPlans,setup:workspaceSetup,onTiming:(workspace,id,span)=>{
  const communication=getPlugin()?.communication,project=store.project(workspace);
  const run=[...(communication?.runs.values()??[])].find(r=>r.project_id===project?.projectId&&!r.removed);
  if(run)communication.recordKitTiming({project_id:run.project_id,scope_id:run.grant?.scope_id,assignment_id:id},span);
}});
// The parallel queue has the authoritative Kit confirmation; per-chat plan
// projections must not bind a pre-plan ON while review/transaction is pending.
const authorizedExecutionKit=Object.create(executionKit);
authorizedExecutionKit.read=async workspace=>{
  const facts=await executionKit.read(workspace),plan=facts.plan;
  if(plan.execution_strategy==='parallel'&&facts.confirmed&&plan.execution_scope_status==='ACTIVE')
    projectPlanContinuation.sync(workspace,plan.scope_id,{confirmed:true,planRevision:plan.plan_revision,
      originSessionId:plan.execution_origin_session_id});
  return facts;
};
const liveRecord=project=>project&&liveSessions.find(project);
const orchestratedPlan=workspace=>store.project(workspace)?.planExecution?.execution_strategy==='orchestrated';
// Executors of an orchestrated plan keep their continuations while a pause is pending.
// A started button marks the plan as orchestrated even before the cached project view refreshes;
// a plan of the former model keeps its continuation engine as the source of truth.
const executorEnabled=(workspace,scope)=>{
  if(startupRecovery.has(workspace)||execution.retired.has(workspace)||store.project(workspace)?.archivedAt)return false;
  const {state}=executionControl.view(workspace,scope),strategy=store.project(workspace)?.planExecution?.execution_strategy;
  return strategy==='orchestrated'||(!strategy&&state!=='not-started')?['running','pausing'].includes(state):projectPlanContinuation.enabled(workspace,scope);
};
const storedOrchestrator=(workspace,scope)=>store.snapshot().projects.find(p=>p.workspace===workspace)?.sessions
  .find(s=>s.role==='orchestrator'&&s.orchestratorScopeId===scope&&!s.archivedAt)?.sessionId??null;
async function restoreExecutionPage(project,assignment=null) {
  if(held(project))throw recoveryError();
  if(liveRecord(project)?.ready&&(!assignment||liveRecord(project).executor)){
    if(assignment&&executorEnabled(project.parentWorkspace,project.parentScopeId))await dialogue.start(project);
    return project;
  }
  // An executor that never received anything opens a fresh Chat draft and gets its task as usual.
  const unsent=!!assignment&&unsentExecutor(project);
  if(!unsent&&(!project?.chatUrl||(!project.manualStart&&!project.attempt?.sendStartedAtMs&&!['sent','acknowledged'].includes(project.attempt?.state))))
    throw Object.assign(new Error('Сохранённый адрес и отправка не подтверждены. Откройте соответствующий чат и проверьте его; автоматического Send нет.'),{code:'EXECUTOR_CHAT_UNKNOWN'});
  if(unsent)project=await store.resetUnsentExecutor(project.workspace,project.sessionId);
  const record=liveSessions.ensure(project);
  if(assignment)configureExecutor(record,{store,enabled:executorEnabled(project.parentWorkspace??project.workspace,project.parentScopeId??project.scopeId),
    dialogue:dialogue.uses(project)?dialogue:null,
    inspectPlan:selected=>readPlanContinuationState(selected,workspaceSetup.environment),onChange:()=>publish(),
    signal:()=>{void execution.signal(project.parentWorkspace);},
    log:(event,fields)=>record.diagnostics?.log.record('plan-continuation',event,fields)});
  if(!record.ready||unsent){record.ready=true;await liveSessions.navigate(record,project.chatUrl??chatGPTEntrypoint(project.experience??'chat'),{freshDraft:unsent});}
  if(assignment&&executorEnabled(project.parentWorkspace,project.parentScopeId))await dialogue.start(project);
  return project;
}
const execution=new ParallelExecution({kit:authorizedExecutionKit,book:parallelExecutionBook,
  queuedRoute:(workspace,scope)=>executionControl.route(workspace,scope)==='plugin-v1',
  deliveryReceipt:id=>dialogue.receipt(id),
  channelSettled:(workspace,scope)=>dialogue.settled(workspace,scope),
  reconcileChannel:(workspace,scope)=>getPlugin()?.communication.assignment.reconcile(store.project(workspace)?.projectId,scope),
  restoreIntegrated:(workspace,assignment,entry)=>dialogue.reserved(store.project(assignment.worktree,entry?.sessionId)),
  physicalWorkerState:(assignment,entry)=>executorPageState(liveRecord(store.project(assignment.worktree,entry?.sessionId))),
  physicalMainState:origin=>executorPageState(liveRecord(origin)),
  // A draining backend opens no new assignment and queues no new send.
  isEnabled:(workspace,scope)=>!liveSessions?.paused&&executorEnabled(workspace,scope),
  // New tasks, the final handoff and delivery steps of an orchestrated plan wait while it is not running.
  isIssuing:(workspace,scope)=>!orchestratedPlan(workspace)||executionControl.issuing(workspace,scope),
  canFinalize:(workspace,scope)=>orchestratedPlan(workspace)?executionControl.issuing(workspace,scope):projectPlanContinuation.finalizationAllowed(workspace,scope),
  onComplete:async(workspace,scope)=>{if(orchestratedPlan(workspace)){
    await dialogue.permission(workspace,scope,'complete');return executionControl.complete(workspace,scope);
  }return projectPlanContinuation.sync(workspace,scope,{complete:true,confirmed:true});},
  onSettle:(workspace,scope,facts)=>executionControl.settle(workspace,scope,facts),
  onPause:(workspace,scope,reason,message)=>executionControl.pause(workspace,scope,reason,message??null),
  sendWorker:(assignment,entry,text,ready,before,meta)=>{
    const project=store.project(assignment.worktree,entry?.sessionId),record=liveRecord(project);
    if(dialogue.uses(project))return dialogue.send(project,text,'decision',meta);
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
        if(orchestratedPlan(assignment.parent_root??state.workspace)&&liveSessions.visible!==record
          &&(!dialogue.owned(record.project())||!dialogue.reserved(record.project())))liveSessions.release(record);}
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
        if(['INTEGRATED','UNKNOWN','REFUSED'].includes(a.status)||!a.worktree||!origin)return false;
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
    return {...executorPageState(record),...(dialogue.reserved(origin)?{stopped:false,canSend:false}:{}),documentId:page?.documentId??null,
      lastMessageRole:page?.state?.lastMessageRole??null,
      userMessagesRevision:page?.state?.userMessagesRevision??null,
      manualInputRevision:page?.state?.manualInputRevision??0,
      manualStopRevision:page?.state?.manualStopRevision??0};
  },
  workerState:(assignment,entry)=>{const project=store.project(assignment.worktree,entry?.sessionId);return {
    ...executorPageState(liveRecord(project)),...(dialogue.reserved(project)?{stopped:false,canSend:false}:{} )};},
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
      dialogue:dialogue.uses(project)?dialogue:null,
      inspectPlan:selected=>readPlanContinuationState(selected,workspaceSetup.environment),onChange:()=>publish(),
      signal:()=>{void execution.signal(origin.workspace);},
      log:(event,fields)=>record.diagnostics?.log.record('plan-continuation',event,fields)});
    record.ready=true;
    await liveSessions.navigate(record,project.chatUrl??chatGPTEntrypoint(project.experience),{freshDraft:!project.attempt&&!project.chatUrl});
    await dialogue.start(project);
    publish();return project;
  },
  sendCorrection:(origin,text,canContinue,onBeforeSend,meta)=>sendExecutionMessage(origin,text,canContinue,onBeforeSend,'integration',meta),
  sendDiagnostic:(origin,text,canContinue,onBeforeSend,meta)=>sendExecutionMessage(origin,text,canContinue,onBeforeSend,'diagnostic',meta),
  sendFinalization:(origin,text,canContinue,onBeforeSend,meta)=>sendExecutionMessage(origin,text,canContinue,onBeforeSend,'finalization',meta)});
function sendExecutionMessage(origin,text,canContinue,onBeforeSend,kind,meta) {
  if(dialogue.uses(origin))return dialogue.send(origin,text,kind,meta);
  const record=liveRecord(origin),sender=record?.primaryAutomation?.automation;
  if(!sender)return Promise.resolve({state:'cancelled',reason:'PAGE_NOT_READY'});
  return sender.send({selected:origin,page:record.pageState.current?.state,kind,ready:canContinue,
    perform:()=>record.composer.sendUserMessage({text,canContinue,onBeforeSend,waitForAcknowledgement:false,cleanupOnCancel:true})});
}
// The button command: verified against the published plan, never against a chat's guess.
// The one plan button: start, pause and continue. running: undefined toggles, a boolean sets.
async function setPlanExecution(running,chosen=null) {
  // A choice card names its project; the button acts on the selected one.
  const selected=chosen?null:store.selected(),workspace=chosen??selected?.parentWorkspace??selected?.workspace;
  if(!workspace||selected?.external)throw Object.assign(new Error('Выберите проект с планом.'),{code:'PLAN_EXECUTION_UNAVAILABLE'});
  if(running!==undefined&&typeof running!=='boolean')throw Object.assign(new Error('Неверная команда кнопки плана.'),{code:'PLAN_EXECUTION_INVALID'});
  if(startupRecovery.has(workspace)) {
    if(!await recheckRecovery(workspace))throw recoveryError();
  }
  const info=await store.inspect(workspace);
  if(!info.scopeId||!['ACTIVE','BLOCKED'].includes(info.scopeStatus))
    throw Object.assign(new Error('Кнопка доступна у опубликованного плана.'),{code:'PLAN_EXECUTION_UNAVAILABLE'});
  if(reviewBlocksExecution(readReview(workspace),info.scopeId))
    throw Object.assign(new Error('План ещё не согласован в Review.'),{code:'PLAN_NOT_APPROVED'});
  if(info.planExecution?.execution_strategy==='orchestrated') {
    executionControl.selectRoute(workspace,info.scopeId,AUTOMATIC_DIALOGUE_ENABLED&&getPlugin()?'plugin-v1':'legacy-dom');
    const {state}=executionControl.view(workspace,info.scopeId);
    if(running===undefined||(running&&!['running','pausing'].includes(state))||(running===false&&state==='running')){
      if(!['pausing','complete'].includes(state)){
        await permissionTail;await dialogue.permission(workspace,info.scopeId,state==='running'?'pausing':'running');
      }
      executionControl.toggle(workspace,info.scopeId);
    }
    execution.observe(workspace);await saveSettings();
    await permissionTail;
    return executionControl.view(workspace,info.scopeId);
  }
  // A plan of the former model: the same button drives its continuation engine; pause is immediate.
  const want=running??!projectPlanContinuation.enabled(workspace,info.scopeId);
  await continuePlan(want);
  if(want&&executionControl.view(workspace,info.scopeId).state!=='running')executionControl.toggle(workspace,info.scopeId);
  if(!want)executionControl.stop(workspace,info.scopeId);
  await saveSettings();
  return {state:want?'running':'paused',reason:null,message:null};
}
// The continuation engine of a plan of the former model; reached only through the plan button.
async function continuePlan(enabled) {
    const selected=store.selected(),workspace=selected?.parentWorkspace??selected?.workspace;
    const project=selected?.parentWorkspace?store.project(workspace):selected;
    if(project&&(await store.inspect(workspace)).planExecution?.execution_strategy==='orchestrated')
      throw Object.assign(new Error('План оркестратора запускается кнопкой «Начать выполнение плана».'),{code:'PLAN_EXECUTION_BUTTON'});
    const info=project&&await readPlanContinuationState(project,workspaceSetup.environment);
    let verified=info?.confirmed===true;
    if(info?.scopeId&&info.planExecution?.execution_strategy==='parallel'){
      const kit=await executionKit.read(workspace);
      verified=kit.confirmed&&kit.plan.project_id===info.projectId
        &&kit.plan.scope_id===info.scopeId&&kit.plan.plan_revision===info.planRevision;
    }
    const scope=verified?info.scopeId:null;
    const done=verified&&info.planView?.tasks?.length>0&&info.planView.tasks.every(t=>t.status==='done');
    projectPlanContinuation.sync(workspace,scope,{confirmed:verified,complete:done,
      planRevision:info?.planRevision,originSessionId:info?.planExecution?.execution_origin_session_id});
    const current=projectPlanContinuation.state(workspace);
    if(scope&&current?.scopeId!==scope&&enabled===true)
      throw new Error('План изменился во время запуска. Обновите состояние проекта.');
    // Completion is an automatic OFF, never misrecord it as a manual OFF.
    if(!(done&&enabled===true))projectPlanContinuation.set(workspace,
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
  planningOwners.observe(record,event);
  userChoices.page(record.project()?.sessionId,event);
  getPlugin()?.communication.observeSession(record.project()?.sessionId);
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
  return structuredClone({projectPlanContinuation:projectPlanContinuation.snapshot(),executionControl:executionControl.snapshot(),reviewCheckpoint,automationCheckpoint,parallelExecutionBook,
    userChoices:userChoices.snapshot()});
}
function restore(settings={}) {
  projectPlanContinuation.book=new ProjectPlanContinuation({saved:settings.projectPlanContinuation}).snapshot();
  executionControl.book=new ExecutionControl({saved:settings.executionControl}).snapshot();
  executionControl.revokeAfterRestart();
  parallelExecutionBook=settings.parallelExecutionBook&&typeof settings.parallelExecutionBook==='object'&&!Array.isArray(settings.parallelExecutionBook)
    ? structuredClone(settings.parallelExecutionBook) : {};
  execution.book=parallelExecutionBook;
  reviewCheckpoint=structuredClone(settings.reviewCheckpoint??null);
  automationCheckpoint=structuredClone(settings.automationCheckpoint??null);
  userChoices.restore(settings.userChoices??{});scheduleChoices();
  emptyPlanContinuation.restore(false);
  automationSend.entries.clear();automationSend.cycles.clear();automationSend.restore(automationCheckpoint);
  reviewContinuation.stops.clear();reviewContinuation.restore(reviewCheckpoint);
}
const executionPort=Object.freeze({
  view: workspace=>structuredClone(execution.view(workspace)),
  allStates: ()=>structuredClone([...execution.states].map(([workspace,state])=>({...state,workspace}))),
  ledgers: ()=>structuredClone(Object.values(parallelExecutionBook)),
  observe: workspace=>{if(!startupRecovery.has(workspace))execution.observe(workspace);},
  signal: workspace=>startupRecovery.has(workspace)?Promise.resolve():execution.signal(workspace),
  recheck: workspace=>{if(startupRecovery.has(workspace))throw recoveryError();return execution.recheck(workspace);},
  correct: (...args)=>{if(startupRecovery.has(args[0]))throw recoveryError();return execution.correct(...args);},
  suspend: workspace=>execution.suspend(workspace),forget: workspaces=>execution.forget(workspaces),
  retire: workspace=>execution.retire(workspace),allow: workspace=>execution.allow(workspace),
  publish: (...args)=>execution.publish(...args),dispose: ()=>execution.dispose(),
});
return Object.freeze({
  async migrateAssignments(target,input){
    const project=store.snapshot().projects.find(p=>p.projectId===target.project_id&&!p.parentWorkspace&&!p.archivedAt);
    if(!project||target.role!=='O'||executionControl.view(project.workspace,target.scope_id).state!=='paused')
      throw Object.assign(Error('Переход доступен оркестратору своего плана после общей паузы.'),{code:'DIALOGUE_MIGRATION_PAUSE'});
    await execution.suspend(project.workspace);
    try{
      const facts=await executionKit.migration(project.workspace,target.scope_id,input.operation_id)
        ??await executionKit.read(project.workspace);
      for(const assignment of facts.assignments.filter(a=>a.status!=='INTEGRATED')){
        const child=store.project(assignment.worktree),page=child&&await dialogue.reconcile({local_session_id:child.sessionId});
        if(assignment.status==='UNKNOWN'||!page?.stopped||!page.commandsIdle||page.busy)
          throw Object.assign(Error('Назначение ещё не припарковано или его исход неизвестен: '+assignment.parent_task_id),{code:'DIALOGUE_MIGRATION_BUSY'});
      }
      const result=await workspaceSetup.call({action:'dialogue-migrate',mode:'existing',project:project.workspace,
        permission:{scope_id:target.scope_id,backend_id:getPlugin().communication.backendId,backend_pid:process.pid,active:false},
        migration:{operation_id:input.operation_id,scope_id:target.scope_id,project_id:target.project_id}});
      workspaceSetup.invalidateReadiness(project.workspace);
      await store.inspect(project.workspace);await store.reconcileRoles(project.workspace);
      return result;
    }finally{execution.observe(project.workspace);}
  },
  async holdProjectsForRecovery(workspaces) {
    for(const workspace of workspaces) {
      const project=store.project(workspace),parent=project?.parentWorkspace?store.project(project.parentWorkspace):null;
      const root=parent&&parent.projectId===project.parentProjectId?parent.workspace:workspace;
      if(!startupRecovery.has(root))startupRecovery.set(root,new Set());
      startupRecovery.get(root).add(workspace);
    }
    for(const root of startupRecovery.keys()) {
      await execution.suspend(root);
      const legacy=projectPlanContinuation.book[root];if(legacy?.enabled){legacy.enabled=false;legacy.offReason='recovery';}
      const state=executionControl.book[root];
      if(state&&['running','pausing','paused'].includes(state.state)&&state.reason!=='manual')
        executionControl.write(root,state.scopeId,'paused','unknown',recoveryError().message,state.route,false);
      watchRecovery(root);
    }
    if(startupRecovery.size)await saveSettings();
  },
  retireCommunication:identities=>getPlugin()?.communication.removeProjects(identities),
  prepareBootstrap:project=>{if(held(project)){
    void recheckRecovery(project.parentWorkspace??project.workspace).catch(report);
    throw recoveryError();
  }return dialogue.prepareBootstrap(project);},
  recoveryStatus:workspace=>startupRecovery.has(workspace)?{held:true,code:'PROJECT_RECOVERY_REQUIRED',message:recoveryError().message}:null,
  stageStartup:(project,attempt)=>dialogue.stageStartup(project,attempt),
  startupProgress:(sessionId,requestId)=>getPlugin()?.communication.startup.progress(sessionId,requestId),
  observeParticipant:target=>dialogue.observe(target),admitParticipant:(target,message)=>dialogue.admit(target,message),
  reconcileParticipant:target=>dialogue.reconcile(target),
  currentMessage:(target,message)=>dialogue.currentMessage(target,message),
  communicationChanged:(runId,events=[])=>{
    const run=getPlugin()?.communication.runs.get(runId);if(!run)return;
    const parent=store.snapshot().projects.find(p=>p.projectId===run.project_id&&!p.parentWorkspace);
    if(!parent)return;
    if(run.grant?.reason==='manual'&&!run.grant.active)executionControl.stop(parent.workspace,run.grant.scope_id);
    const uncertain=run.messages.find(m=>m.scope_id===run.grant?.scope_id&&['unknown','rejected'].includes(m.delivery));
    if(uncertain&&['running','pausing'].includes(executionControl.view(parent.workspace,run.grant.scope_id).state)){
      executionControl.write(parent.workspace,run.grant.scope_id,'paused','unknown','Доставка '+uncertain.message_id+' — '+uncertain.delivery+'. Автоматического повтора нет.');
    }
    const global=!events.length||events.some(e=>/^(plan\.|backend\.|project\.)/.test(e.event_type));
    const affected=new Set(events.flatMap(e=>{
      const message=run.messages.find(m=>m.message_id===e.message_id);
      return [e.participant_id,message?.recipient_id,message?.sender_id].filter(Boolean);
    }));
    for(const member of Object.values(run.members))if(global||affected.has(member.id))
      liveRecord(dialogue.project(member.target.local_session_id))?.executor?.changed();
    for(const event of events)if(event.event_type==='startup.complete'){
      const member=run.members[event.participant_id];
      if(member)void liveRecord(dialogue.project(member.target.local_session_id))?.controller.tick();
    }
    void execution.signal(parent.workspace);publish();
  },
  attachSessions: sessions=>{if(liveSessions)throw new Error('WORKFLOW_SESSIONS_ALREADY_ATTACHED');liveSessions=sessions;},
  planContinuation,
  planMonitor:Object.freeze({
    get error(){return planMonitor.error;},get watchError(){return planMonitor.watchError;},
    get pending(){return planMonitor.pending;},get rerunRequested(){return planMonitor.rerunRequested;},
    view:(...args)=>planMonitor.view(...args),observeSelection:()=>planMonitor.observeSelection(),
    refresh:()=>planMonitor.refresh(),invalidate:()=>planMonitor.invalidate(),close:()=>planMonitor.close(),
  }),
  planningOwners:Object.freeze({assign:(...args)=>planningOwners.assign(...args),forget:(...args)=>planningOwners.forget(...args)}),
  planReview:Object.freeze({view:()=>planReview.view(),setEnabled:input=>planReview.setEnabled(input),
    refresh:()=>planReview.refresh(),observeSelection:()=>planReview.observeSelection(),dispose:()=>planReview.dispose()}),
  reviewContinuation:Object.freeze({get persistenceError(){return reviewContinuation.persistenceError;},
    get message(){return reviewContinuation.flow.state.message;},
    update:()=>reviewContinuation.update(),dispose:()=>reviewContinuation.dispose()}),
  projectPlanContinuation:Object.freeze({enabled:(...args)=>projectPlanContinuation.enabled(...args),snapshot:()=>projectPlanContinuation.snapshot()}),
  // Whether an executor may send its first message and continuations: the plan button for an
  // orchestrated plan, ProjectPlanContinuation for the legacy parallel plans.
  executorEnabled:(workspace,scope)=>executorEnabled(workspace,scope),
  executionControl:Object.freeze({view:(...args)=>executionControl.view(...args),enabled:(...args)=>executionControl.enabled(...args),
    snapshot:()=>executionControl.snapshot()}),setPlanExecution,
  userChoices:Object.freeze({view:sessionId=>userChoices.view(sessionId),history:workspace=>userChoices.workspaceHistory(workspace),
    choose:input=>input?.option_id==='reopen'?userChoices.reopen(input):userChoices.choose(input),forget:sessionId=>userChoices.forget(sessionId),
    reconcile:()=>scheduleChoices()}),
  // The user confirmed archiving a project with an active plan: execution pauses now; Kit is untouched.
  stopPlanExecution:async workspace=>{const scope=store.project(workspace)?.scopeId;if(!scope)return null;
    if(executionControl.view(workspace,scope).state==='complete')return executionControl.view(workspace,scope);
    if(!startupRecovery.has(workspace))await dialogue.permission(workspace,scope,'paused');return executionControl.stop(workspace,scope);},
  execution:executionPort,executionKit:Object.freeze({git:(...args)=>executionKit.git(...args)}),
  // The continuation engine of plans of the former model; users reach it only through the plan button.
  continuePlan,
  configurePrimary,observePage,snapshot,restore,
  sessionChanged(record) {
    record.primaryAutomation?.update();record.executor?.changed();
    if(record.identity&&!record.identity.assignmentId&&execution.unwatch.has(record.identity.workspace)) {
      const stopped=executorPageState(record).stopped;
      if(record.executionStopped!==stopped){record.executionStopped=stopped;void execution.signal(record.identity.workspace);}
    }

  },
  cleanup(identities) {
  for(const identity of identities){startupRecovery.delete(identity.workspace);recoveryWatchers.get(identity.workspace)?.close();recoveryWatchers.delete(identity.workspace);}
  const cleaned=removeProjectSettings({projectPlanContinuation:projectPlanContinuation.snapshot(),parallelExecutionBook,reviewCheckpoint,automationCheckpoint},identities);
  projectPlanContinuation.book=cleaned.projectPlanContinuation;parallelExecutionBook=cleaned.parallelExecutionBook;execution.book=parallelExecutionBook;
  reviewCheckpoint=cleaned.reviewCheckpoint;automationCheckpoint=cleaned.automationCheckpoint;
  execution.forget(identities.map(p=>p.workspace));
  executionControl.forget(identities.map(p=>p.workspace));
  for(const book of [automationSend.entries,automationSend.cycles,reviewContinuation.flow.checkpoints,reviewContinuation.flow.cycles,reviewContinuation.stops])
    for(const [key,value] of book)if(belongsToProject([key,value],identities))book.delete(key);

  },
  async revokeKitPermissions() {
    for(const project of store.snapshot().projects)if(!project.parentWorkspace&&!project.archivedAt&&project.planExecution?.dialogue_version===1)
      try{await sessionPlans.call(project.workspace,'plan:permission',[],{scope_id:project.scopeId,
        backend_id:getPlugin()?.communication.backendId??'startup',backend_pid:process.pid,active:false});}
      catch(error){startupRecovery.set(project.workspace,new Set([project.workspace]));report(error);}
  },
  restoreBackground() {
    // A plan that was running or pausing continues after a backend restart, without a repeated Send.
    for(const [workspace,state] of Object.entries(executionControl.book))if(!startupRecovery.has(workspace)&&['running','pausing'].includes(state.state)) {
      execution.observe(workspace);void execution.signal(workspace);
    }
    for(const [workspace,state] of Object.entries(projectPlanContinuation.book))if(!startupRecovery.has(workspace)&&state.enabled) {
      const project=store.project(workspace,state.sessionId);
      if(project?.chatUrl&&!project.archivedAt&&!project.sessionArchivedAt)void restoreExecutionPage(project).catch(report);
    }
    for(const project of store.snapshot().projects)if(!startupRecovery.has(project.workspace)&&!project.parentWorkspace&&!project.archivedAt
      &&(project.sessions.some(s=>s.executionSnapshot?.parallel_allowed)||Object.values(parallelExecutionBook).some(b=>b?.workspace===project.workspace))) {
      execution.observe(project.workspace);void execution.signal(project.workspace);
    }

  },
  closeRecovery(){for(const watcher of recoveryWatchers.values())watcher.close();recoveryWatchers.clear();},
});
}
