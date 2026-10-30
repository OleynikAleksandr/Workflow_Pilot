import { PlanContinuation } from './plan-continuation.mjs';
import { AutomationSendState } from './automation-send-state.mjs';
import { PlanMonitor } from './plan-monitor.mjs';
import { ProjectInputWatch } from '../../execution/facade.mjs';
import { ExecutorTimer } from '../sessions/agent-timer.mjs';

export function executorPageState(record) {
  const project=record?.project(),page=record?.pageState.current?.state;
  const observed=!!project&&!!project.chatUrl&&!project.archivedAt&&!project.sessionArchivedAt&&!record.disposed&&!record.loading&&record.ready
    &&(!project.attempt?.cancelState||project.attempt.cancelState==='none')
    &&page?.url===project.chatUrl&&!page.busy&&!page.connectionError&&page.lastMessageRole==='assistant'
    &&page.login!=='signed-out';
  const stopped=observed&&!record.controller.pending&&!record.composer.inFlight;
  const blocked=(record?.primaryAutomation?.automation??record?.executor?.automation)?.blocked(project);
  return {stopped,canSend:stopped&&page.editorAvailable&&page.writable&&!page.draftPresent&&!blocked,
    sdkDocumentReady:!!project&&!!project.chatUrl&&!project.archivedAt&&!project.sessionArchivedAt
      &&!record.disposed&&!record.loading&&record.ready&&(!project.attempt?.cancelState||project.attempt.cancelState==='none')
      &&page?.url===project.chatUrl&&page.login==='signed-in'&&!page.connectionError,
    busy:!!page?.busy,turnId:page?.turnId??null,assistantRevision:page?.assistantRevision??0,
    connectionError:page?.connectionError??null,userTurnId:page?.userTurnId??null,
    turnIdentitySource:page?.turnIdentitySource??'none',manualInputRevision:page?.manualInputRevision??0,
    turnVariant:page?.turnVariant??'unknown',
    manualSendRevision:page?.manualSendRevision??0,
    manualStopped:!!blocked,
    legacySendUnknown:!!(record?.primaryAutomation?.automation??record?.executor?.automation)?.unknown(project)
      ||!!(record?.primaryAutomation?.flow??record?.executor?.flow)?.unknown(),
    pauseKey:record?.primaryAutomation?.automation.key(project,page)??page?.turnId??null,
    // Composer owns its inFlight flag and inserted draft during an admitted send.
    canContinueSend:observed&&page.editorAvailable&&page.writable&&!blocked};
}

// Each assigned task keeps its own continuation ledger and plan watcher. Neither
// selecting a different page nor opening Settings changes this controller.
export function configureExecutor(record,{store,inspectPlan,enabled,onChange,signal,dialogue=null,log=()=>{}}) {
  if(record.executor)return record.executor;
  const saved=record.project(),checkpoint=saved.executionAutomation??{};
  const clock=new ExecutorTimer({saved:saved.executionTime,
    onCheckpoint:async time=>{await store.saveExecutorTime(saved.workspace,saved.sessionId,time);onChange();},
    onError:error=>{record.error={code:error.code??'EXECUTOR_TIME_SAVE',message:error.message};onChange();}});
  let monitor,lastSafety,lastStopped;
  const selected=()=>{const project=record.project();return project&&{...project,...monitor?.view(project)};};
  const automation=new AutomationSendState({save:automationCheckpoint=>store.saveExecutorAutomation(
    saved.workspace,saved.sessionId,{automationCheckpoint})});
  automation.restore(checkpoint.automationCheckpoint);
  const flow=new PlanContinuation({selected,inspectPlan:async project=>{
    const plan=await inspectPlan(project);
    // SDK task/decision messages already carry the executor's continuation.
    // task:start is not a second task intent and must not enqueue a duplicate.
    return {...plan,confirmed:plan.confirmed&&!dialogue&&plan.scopeId==='assignment-'+saved.assignmentId
      &&plan.planView?.tasks?.length===1&&plan.planView.tasks[0].id===saved.taskId
      &&(!plan.nextTask||plan.nextTask.id===saved.taskId)};
  },
    available:()=>!!record.project()&&!record.disposed&&!record.paused&&record.ready&&!record.loading&&!record.composer.inFlight
      &&!record.controller.pending&&['delivered','stale','manual-session'].includes(record.controller.state.phase),
    saveCheckpoint:continuationCheckpoint=>store.saveExecutorAutomation(saved.workspace,saved.sessionId,{continuationCheckpoint}),
    durableQueue:!!dialogue,
    onChange,log,send:async(text,canContinue,onBeforeSend,meta)=>{
      if(!canContinue()||!await onBeforeSend())return {state:'cancelled'};
      if(automation.blocked(selected()))return {state:'unknown'};
      return dialogue.send(record.project(),text,'continue',meta);
    }});
  monitor=new PlanMonitor({selected:record.project,inspect:(workspace,id)=>store.inspect(workspace,id),
    onChange:()=>{void flow.planChanged();signal();onChange();},
    onInputsChanged:()=>{record.controller.projectChanged();signal();},
    onError:error=>{record.error=error;onChange();}});
  const activityWatch=new ProjectInputWatch({workspace:saved.workspace,onSignal:signal,
    onError:error=>{if(error){record.error=error;onChange();}}});
  activityWatch.update(['.harness/runtime/command-activity/']);
  record.executor={flow,monitor,clock,automation,
    // The orchestrator's answer reaches this executor through the same guarded send as its continuations.
    deliver:(text,_ready,_before,meta)=>dialogue.send(record.project(),text,'decision',meta),
    observe:event=>{
    clock.observe(record.integrated?'done':event.reset||event.state?.connectionError?'unknown':event.state?.busy?'working':'waiting');
    automation.observe(selected(),event);flow.observe(event);
    const safety=JSON.stringify([event.documentId,event.state?.url,event.state?.busy,event.state?.lastMessageRole,event.state?.connectionError]);
    if(safety!==lastSafety){lastSafety=safety;signal();}
  },
    setEnabled:value=>{if(value&&!flow.enabled&&flow.state.phase!=='complete')void flow.start();else if(!value&&flow.enabled)flow.disable();},
    changed:()=>{
      flow.availabilityChanged();const stopped=executorPageState(record).stopped;
      if(stopped!==lastStopped){lastStopped=stopped;signal();}
    }};
  record.controller.onIdle=()=>record.executor.changed();
  flow.restore(enabled,checkpoint.continuationCheckpoint);monitor.observeSelection();
  record.cleanups.push(()=>{record.controller.onIdle=null;flow.dispose();monitor.close();activityWatch.close();clock.dispose();});
  return record.executor;
}
