import { randomUUID } from 'node:crypto';
import { parallelTasksCompatible } from '@webpilot/workflow-kit/lib/plan';
import { validateParallelSettings } from './parallel-settings.mjs';
import { integrationProblem, projectExecutionPlan } from './execution-projection.mjs';

const fail=(code,message)=>Object.assign(new Error(message),{code});
const issue=e=>({code:e.code??'PARALLEL_FAILED',message:String(e.message??e).slice(0,1000)});
// A changed pause or an unrelated assistant turn is not an acknowledgement.
// The dispatched user message must first appear in the SAME observed document;
// only its subsequent completed assistant turn can acknowledge this handoff.
async function observeHandoffReply(entry,page,persist,mayFinish=true) {
  if(entry.status!=='sent'||!entry.documentId||page.documentId!==entry.documentId
    ||page.manualStopped||(page.manualSendRevision??0)!==(entry.manualSendRevision??0))return;
  const userSeen=Number.isSafeInteger(page.userMessagesRevision)
    &&page.userMessagesRevision>(entry.userMessagesRevision??Number.MAX_SAFE_INTEGER)
    ||!!(entry.userTurnId&&page.userTurnId&&page.userTurnId!==entry.userTurnId);
  if(userSeen&&!entry.replyUserObserved){
    entry.replyUserObserved=true;
    entry.replyAssistantAtUser=page.assistantRevision??null;
    entry.replyTurnAtUser=page.turnId??null;
    await persist();
  }
  if(!entry.replyUserObserved)return;
  if(page.busy&&!entry.replyStarted){entry.replyStarted=true;await persist();}
  const newerAssistant=!!(page.turnId&&page.turnId!==(entry.replyTurnAtUser??entry.turnId))
    ||Number.isSafeInteger(page.assistantRevision)
      &&page.assistantRevision>(entry.replyAssistantAtUser??Number.MAX_SAFE_INTEGER);
  // A rapid, complete reply may be observed in a single DOM snapshot. Native
  // identities for BOTH newly inserted turns establish order even if no
  // intermediate streaming observation was delivered.
  const nativePair=!!(page.userTurnId&&page.userTurnId!==(entry.userTurnId??'')
    &&entry.turnId&&page.turnId&&entry.turnId!==page.turnId);
  if(mayFinish&&page.stopped&&page.lastMessageRole==='assistant'&&!page.connectionError
    &&(newerAssistant||nativePair)) {entry.status='reply-observed';await persist();}
}
function sentPageBaseline(entry,page){
  Object.assign(entry,{documentId:page.documentId??null,turnId:page.turnId??null,
    userTurnId:page.userTurnId??null,userMessagesRevision:page.userMessagesRevision??null,
    assistantRevision:page.assistantRevision??null,manualSendRevision:page.manualSendRevision??0});
}
// Source readiness is evidence of the worker's committed result, not permission
// to modify main. A writer can block merging without hiding that proof.
export function finalSourceState(state,workerStopped=()=>true) {
  const {plan,assignments=[]}=state;
  const allDone=plan.tasks.length>0&&plan.tasks.every(t=>t.commit_status==='DONE');
  const sources=plan.tasks.filter(t=>t.commit_status!=='DONE').map(task=>{
    const matches=assignments.filter(a=>a.parent_task_id===task.id);
    if(matches.length!==1)return null;
    const a=matches[0];
    return a.status==='READY_FOR_INTEGRATION'&&a.source_commit&&!a.error&&!a.transaction_pending&&!a.dirty
      &&workerStopped(a)?a:null;
  });
  const sourceReady=plan.tasks.length>0&&sources.every(Boolean);
  const blockers=sourceReady?sources.filter(a=>a.commandActive).map(a=>{
    const command=a.commands?.find(c=>c.blocksIntegration);
    return {assignment:a.id,task:a.parent_task_id,source:a.source_commit,checkout:a.worktree,
      operation:command?.id??null,state:command?.state??'unknown',
      code:command?'WRITE_COMMAND_ACTIVE':'ASSIGNMENT_OPERATION_LOCK',
      reason:command?.reason??'Исход операции исполнителя не подтверждён; требуется диагностика назначения.'};
  }):[];
  const baseSafe=sourceReady&&!state.commandActive&&state.mainClean&&state.integration?.status==='IDLE';
  return {sourceReady,allDone,blockers,mergeSafe:baseSafe&&blockers.length===0,
    diagnosticEligible:baseSafe&&state.confirmed&&blockers.length>0};
}
export function executionOrigin(plan,lookup) {
  if(plan.execution_strategy!=='parallel')return null;
  const id=plan.execution_origin_session_id,origin=id&&lookup(id);
  if(plan.project_id&&origin?.projectId!==plan.project_id)throw fail('EXECUTION_PROJECT_MISMATCH','Сессия принадлежит другому проекту. Запуск остановлен.');
  if(!origin?.executionSnapshot||origin.sessionId!==id||origin.assignmentId||origin.archivedAt||origin.sessionArchivedAt)
    throw fail('EXECUTION_ORIGIN_UNKNOWN','Не найден сохранённый снимок основной сессии этого плана.');
  const snapshot=validateParallelSettings(origin.executionSnapshot);
  if(!snapshot.parallel_allowed||snapshot.max_workers<2||plan.parallel_allowed!==snapshot.parallel_allowed||plan.max_workers!==snapshot.max_workers)
    throw fail('EXECUTION_POLICY_MISMATCH','Параметры плана не совпадают с разрешением основной сессии.');
  return origin;
}
export function availableTasks(plan,assignments,workers) {
  const unfinished=assignments.filter(a=>a.status!=='INTEGRATED');
  const occupied=unfinished.filter(a=>a.status!=='READY_FOR_INTEGRATION'||!workers(a).stopped).length;
  let slots=Math.max(0,plan.max_workers-occupied);const chosen=[];
  const activeTasks=unfinished.map(a=>plan.tasks.find(t=>t.id===a.parent_task_id)).filter(Boolean);
  for(const task of plan.tasks) {
    if(task.commit_status==='DONE')continue;
    const assigned=assignments.some(a=>a.parent_task_id===task.id);
    const ready=task.implementation_status==='TODO'&&task.dependencies.every(id=>plan.tasks.find(t=>t.id===id)?.commit_status==='DONE');
    if(!task.parallel_safe) {
      if(!assigned&&ready&&!unfinished.length&&!chosen.length&&slots)chosen.push(task);
      break; // An exclusive task is also a barrier for later tasks.
    }
    if(assigned||!ready||!slots)continue;
    if([...activeTasks,...chosen].every(other=>parallelTasksCompatible(task,other))) {chosen.push(task);slots--;}
  }
  return chosen;
}

// One serialized, event-driven queue per main checkout. The persisted book is a
// delivery ledger, never a replacement for Kit's plan, assignments or Git proofs.
export class ParallelExecution {
  constructor({kit,origin,openWorker,workerState,mainState,save,book={},onChange=()=>{},watch=()=>()=>{},
    isEnabled=null,onComplete=()=>{},sendCorrection,sendFinalization=null,sendDiagnostic=null,canFinalize=null,restoreWorker=async()=>null,restoreOrigin=async()=>{},now=Date.now,uuid=randomUUID}) {
    Object.assign(this,{isEnabled,onComplete,kit,origin,openWorker,workerState,mainState,save,book,onChange,watch,sendCorrection,restoreWorker,restoreOrigin,now,uuid});
    Object.assign(this,{sendFinalization,sendDiagnostic,canFinalize});
    this.queues=new Map();this.states=new Map();this.unwatch=new Map();this.correcting=new Set();this.suspended=new Set();this.enabled=false;this.closed=false;
  }
  view(workspace){return this.states.get(workspace)??{phase:'idle',assignments:[],error:null};}
  publish(workspace,patch){this.states.set(workspace,{...this.view(workspace),...patch});this.onChange();}
  ledger(workspace,scope) {
    const key=JSON.stringify([workspace,scope]);
    const ledger=this.book[key]??= {workspace,scope,started:false,assignments:{},corrections:{}};
    if(ledger.workspace!==workspace||ledger.scope!==scope||!ledger.assignments||Array.isArray(ledger.assignments)
      ||!ledger.corrections||Array.isArray(ledger.corrections)||Object.entries(ledger.assignments).some(([id,a])=>!a||a.id!==id||typeof a.taskId!=='string'))
      throw fail('EXECUTION_LEDGER_INVALID','Журнал исполнения повреждён. Проверьте назначения Kit; новые отправки остановлены.');
    return ledger;
  }
  async scopedLedger(state,origin) {
    const {workspace=origin.workspace,plan}=state,key=JSON.stringify([workspace,plan.scope_id]);
    const old=this.book[key];
    if(plan.project_id&&old) {
      let same=old.projectId===plan.project_id;
      if(!old.projectId) {
        const entries=Object.values(old.assignments??{});
        same=!entries.length||entries.every(e=>state.assignments.some(a=>a.id===e.id));
        if(!same&&this.kit.projectIdentity) {
          const ids=await Promise.all(entries.map(e=>this.kit.projectIdentity(workspace,e.base)));
          same=ids.every(id=>id===plan.project_id);
        }
      }
      if(!same)delete this.book[key];
    }
    const ledger=this.ledger(workspace,plan.scope_id);
    if(plan.project_id&&(ledger.projectId!==plan.project_id||ledger.originSessionId!==origin.sessionId)) {
      ledger.projectId=plan.project_id;ledger.originSessionId=origin.sessionId;await this.persist();
    }
    return ledger;
  }
  persist(){return this.save(structuredClone(this.book));}
  observe(workspace) {
    this.suspended.delete(workspace);
    if(!this.unwatch.has(workspace))this.unwatch.set(workspace,this.watch(workspace,()=>this.signal(workspace)));
  }
  setEnabled(value) {
    this.enabled=value===true;
    if(this.enabled)for(const workspace of this.unwatch.keys())void this.signal(workspace);
  }
  signal(workspace) {return this.enqueue(workspace,true);}
  recheck(workspace) {this.observe(workspace);return this.enqueue(workspace,true);}
  enqueue(workspace,recovery=false) {
    if(this.closed||this.suspended.has(workspace))return Promise.resolve();
    if(this.correcting.has(workspace)) {
      const current=this.queues.get(workspace);if(current){current.again=true;current.recovery||=recovery;}
      return Promise.resolve(this.view(workspace));
    }
    let queue=this.queues.get(workspace);
    if(queue){queue.again=true;queue.recovery||=recovery;return queue.promise;}
    queue={again:true,recovery};this.queues.set(workspace,queue);
    queue.promise=Promise.resolve().then(async()=>{
      do {queue.again=false;const recover=queue.recovery;queue.recovery=false;
        try {await this.reconcile(workspace,recover);}
        catch(error){this.publish(workspace,{phase:'attention',error:issue(error)});}
      }while(queue.again&&!this.closed&&!this.suspended.has(workspace));
      return this.view(workspace);
    }).finally(()=>this.queues.delete(workspace));
    return queue.promise;
  }
  async reconcile(workspace,recovery=false) {
    const state=await this.kit.read(workspace),{plan}=state;
    if(plan.execution_strategy!=='parallel') {this.publish(workspace,{phase:'sequential',assignments:[],error:null});return;}
    const enabled=()=>!this.suspended.has(workspace)&&(this.isEnabled?this.isEnabled(workspace,plan.scope_id):this.enabled);
    this.unwatch.get(workspace)?.update?.(state.watchInputs);
    const origin=executionOrigin(plan,id=>this.origin(workspace,id));
    const ledger=await this.scopedLedger(state,origin);
    if(this.suspended.has(workspace))return;
    const assignments=state.assignments.map(a=>({...a,...(ledger.assignments[a.id]?.readyAt?{readyAt:ledger.assignments[a.id].readyAt}:{})}));
    for(const entry of Object.values(ledger.assignments))if(!assignments.some(a=>a.id===entry.id))
      assignments.push({id:entry.id,parent_task_id:entry.taskId,worktree:entry.worktree,status:'UNKNOWN',
        error:entry.error??issue(fail('ASSIGNMENT_UNKNOWN','Назначение не подтверждено Kit. Откройте соответствующий чат и проверьте назначение; повторного создания нет.'))});
    let recoveryError=null;
    if(ledger.started||enabled()) {
      try {await this.restoreOrigin(origin);}catch(error){recoveryError=issue(error);}
      for(const a of assignments) {
        if(a.status==='INTEGRATED') {
          const entry=ledger.assignments[a.id];
          if(entry&&entry.integration!=='done'){entry.integration='done';entry.error=null;await this.persist();}
          continue;
        }
        if(a.status==='UNKNOWN'){recoveryError??=a.error;continue;}
        try {
          const restored=await this.restoreWorker(a,origin,ledger.assignments[a.id],recovery&&enabled());
          if(restored) {
            const entry=ledger.assignments[a.id]??={id:a.id,taskId:a.parent_task_id,worktree:a.worktree};
            if(entry.sessionId!==restored.sessionId){entry.sessionId=restored.sessionId;entry.phase='running';await this.persist();}
          }
        }catch(error){a.error=issue(error);recoveryError??=a.error;}
      }
    }
    this.publish(workspace,{phase:'waiting',scopeId:plan.scope_id,originSessionId:origin.sessionId,
      objective:plan.objective,planView:projectExecutionPlan(plan,assignments,state.integration),
      assignments,integration:state.integration,correctionStatus:ledger.corrections[state.integration.operation_id]??null,
      commands:[...(state.commands??[]),...assignments.flatMap(a=>a.commands??[])],
      canCorrect:!state.commandActive&&this.mainState(origin).stopped&&this.mainState(origin).canSend,
      error:recoveryError,maxWorkers:plan.max_workers});
    // A pending integration owns main; AutoPlan may request one correction in its exact main chat.
    if(await this.finalize(workspace,{...state,assignments},origin,ledger,enabled))return;
    if(state.integration.status!=='IDLE') {
      const operation=state.integration;
      // Resume only Kit's existing journal, never start another merge after an ambiguous call.
      const signature=JSON.stringify([operation.operation_id,operation.status,state.head]);
      const source=assignments.find(a=>a.id===operation.assignment_id);
      const resumeKnown=recovery&&['PREPARED','MERGING','RESOLVING','CHECKING'].includes(operation.status)
        &&source&&!source.error&&!source.commandActive&&!source.transaction_pending&&!source.dirty
        &&this.workerState(source,ledger.assignments[source.id]).stopped&&this.mainState(origin).stopped;
      if(!state.commandActive&&this.kit.continueIntegration&&(resumeKnown||operation.committed&&ledger.recoveryAttempt!==signature)) {
        ledger.recoveryAttempt=signature;await this.persist();
        await this.kit.continueIntegration(workspace,operation.operation_id);
        this.queues.get(workspace).again=true;return;
      }
      const launchFailure=integrationProblem(operation);
      if(!launchFailure&&enabled()&&['CONFLICT','CHECKS_FAILED','RESOLVING'].includes(operation.status)
        &&!ledger.corrections[operation.operation_id]&&!state.commandActive&&this.mainState(origin).stopped&&this.mainState(origin).canSend) {
        this.publish(workspace,{phase:'integration',error:null});
        await this.correct(workspace,{fromQueue:true});return;
      }
      this.publish(workspace,{phase:'integration',error:launchFailure??recoveryError??{
        code:'INTEGRATION_PENDING',message:operation.status==='UNKNOWN'?'Исход слияния неизвестен. Проверьте основной чат и integration:status; повторный merge запрещён.'
          :ledger.corrections[operation.operation_id]?'Исправление интеграции передано основному чату; ждём подтверждённого результата.'
          :enabled()?'Интеграция приостановлена. Ждём готовности основного чата для исправления.'
          :'Интеграция приостановлена. Включите автовыполнение проекта для передачи исправления.'}});return;
    }
    if(state.commandActive)throw fail('COMMAND_ACTIVE','В проекте ещё выполняется команда Kit. После её завершения очередь продолжится автоматически.');
    if(plan.current_task_id||state.handoff) {
      if(!enabled()){this.publish(workspace,{phase:'paused',error:{code:'MAIN_TASK_ACTIVE',message:'В main осталась начатая задача. Включите автовыполнение проекта для безопасной передачи исполнителю.'}});return;}
      const page=this.mainState(origin);
      if(!page.stopped||page.canSend===false)throw fail('MAIN_CHAT_NOT_READY','Ждём остановки основного чата и готовности поля без черновика.');
      if(!this.kit.handoff)throw fail('HANDOFF_NOT_SUPPORTED','Для безопасной передачи задачи требуется Workflow Kit 1.7.1.');
      const task=plan.tasks.find(t=>t.id===(state.handoff?.input.task_id??plan.current_task_id));
      if(!task)throw fail('HANDOFF_TASK_UNKNOWN','Не найдена задача сохранённой передачи.');
      const id=state.handoff?.input.id??Object.values(ledger.assignments).find(e=>e.taskId===task.id)?.id??'wp-'+this.uuid();
      const entry=ledger.assignments[id]??={id,taskId:task.id,base:state.head,phase:'handoff'};
      ledger.started=true;await this.persist();this.publish(workspace,{phase:'preparing'});
      if(!enabled())return;
      const result=await this.kit.handoff(workspace,plan,task,id,state.head,state.handoff);
      entry.worktree=result.worktree;entry.phase=result.status;entry.error=null;await this.persist();
      this.queues.get(workspace).again=true;return;
    }
    if(!state.confirmed)throw fail(state.confirmationError?.code??'PLAN_NOT_READY',state.confirmationError?.message??'Ждём опубликованный и подтверждённый план.');
    if(plan.execution_scope_status!=='ACTIVE')throw fail('SCOPE_NOT_ACTIVE','Текущий план не разрешён к выполнению.');
    if(plan.tasks.length&&plan.tasks.every(t=>t.commit_status==='DONE')) {this.onComplete(workspace,plan.scope_id);this.publish(workspace,{phase:'complete'});return;}
    if(enabled()&&!ledger.started){ledger.started=true;await this.persist();}
    if(!ledger.started){this.publish(workspace,{phase:'paused',error:null});return;}
    const stopped=a=>{const page=this.workerState(a,ledger.assignments[a.id]);return {...page,stopped:page.stopped&&!a.error&&!a.commandActive&&!a.transaction_pending&&!a.dirty};};
    for(const a of assignments) {
      const entry=ledger.assignments[a.id];
      if(entry&&a.status==='READY_FOR_INTEGRATION'&&stopped(a).stopped&&!entry.readyAt) {entry.readyAt=this.now();await this.persist();}
    }
    const ready=assignments.filter(a=>a.status==='READY_FOR_INTEGRATION'&&stopped(a).stopped&&ledger.assignments[a.id]?.readyAt)
      .sort((a,b)=>ledger.assignments[a.id].readyAt-ledger.assignments[b.id].readyAt
        ||plan.tasks.findIndex(t=>t.id===a.parent_task_id)-plan.tasks.findIndex(t=>t.id===b.parent_task_id));
    if(ready.length&&state.mainClean&&this.mainState(origin).stopped) {
      const a=ready[0],entry=ledger.assignments[a.id];
      if(entry.integration==='starting'||entry.integration==='unknown')
        throw fail('INTEGRATION_UNKNOWN','Исход предыдущего запуска слияния требует сверки; автоматического повтора нет.');
      entry.integration='starting';await this.persist();this.publish(workspace,{phase:'merging'});
      try {const result=await this.kit.integrate(workspace,a);entry.integration=result.status==='INTEGRATED'?'done':'pending';await this.persist();}
      catch(error){entry.integration='unknown';await this.persist();throw error;}
      this.queues.get(workspace).again=true;return;
    }
    if(!enabled()){this.publish(workspace,{phase:'paused'});return;}
    if(!state.mainClean)throw fail('MAIN_DIRTY','В main есть незакоммиченные изменения. Автовыполнение не удаляет и не присваивает их.');
    const mainPage=this.mainState(origin);
    if(!mainPage.stopped||mainPage.canSend===false)throw fail('MAIN_CHAT_NOT_READY','Ждём готовности основного чата без активного ответа и черновика.');
    // A known, never-opened assignment may finish setup under the same identity.
    for(const a of assignments) {
      const entry=ledger.assignments[a.id];
      if(!entry||entry.sessionId||a.error||!['READY','NEEDS_SETUP'].includes(a.status)||a.commandActive||a.transaction_pending)continue;
      if(!enabled())break;
      if(entry.phase==='opening')continue; // Crash during session creation is reconciled from the session store above.
      try {
        let prepared=a;
        if(a.status==='NEEDS_SETUP')prepared=await this.kit.setupAssignment(workspace,a.id);
        if(prepared.status!=='READY'||!enabled())continue;
        entry.phase='opening';await this.persist();
        if(!enabled()){entry.phase='ready';await this.persist();break;}
        const session=await this.openWorker({...a,...prepared,title:plan.tasks.find(t=>t.id===a.parent_task_id)?.title},origin);
        entry.sessionId=session.sessionId;entry.phase='running';entry.error=null;await this.persist();
      }catch(error){entry.error=issue(error);await this.persist();recoveryError??=entry.error;}
    }
    for(const task of availableTasks(plan,assignments,stopped)) {
      if(this.closed||!enabled())break;
      // Persist identity before creating a worktree. An ambiguous result never gets a new ID.
      let entry=Object.values(ledger.assignments).find(a=>a.taskId===task.id);
      if(entry)continue;
      const id='wp-'+this.uuid();entry=ledger.assignments[id]={id,taskId:task.id,base:state.head,phase:'creating'};
      await this.persist();this.publish(workspace,{phase:'preparing'});
      if(this.closed||!enabled()){delete ledger.assignments[id];await this.persist();break;}
      try {
        let assignment=await this.kit.create(workspace,plan,task,id,state.head);
        entry.worktree=assignment.worktree;entry.phase=assignment.status;await this.persist();
        if(assignment.status==='NEEDS_SETUP')assignment=await this.kit.setupAssignment(workspace,id);
        entry.phase=assignment.status;await this.persist();
        if(assignment.status!=='READY')throw fail('NEEDS_SETUP','Окружение задания не готово. Повторите подготовку задания.');
        if(this.closed||!enabled()){entry.phase='ready';await this.persist();break;}
        entry.phase='opening';await this.persist();
        if(!enabled()){entry.phase='ready';await this.persist();break;}
        const session=await this.openWorker({...assignment,id,parent_root:workspace,parent_scope_id:plan.scope_id,
          parent_task_id:task.id,title:task.title},origin);
        entry.sessionId=session.sessionId;entry.phase='running';await this.persist();
      }catch(error){entry.error=issue(error);entry.phase='attention';await this.persist();throw error;}
    }
    const latest=await this.kit.read(workspace);
    this.publish(workspace,{phase:recoveryError?'attention':'waiting',planView:projectExecutionPlan(latest.plan,[...latest.assignments,...assignments.filter(a=>a.status==='UNKNOWN'&&!latest.assignments.some(b=>b.id===a.id))],latest.integration),assignments:latest.assignments.map(a=>({...a,
      ...(assignments.find(b=>b.id===a.id)?.error?{error:assignments.find(b=>b.id===a.id).error}:{})}))
      .concat(assignments.filter(a=>a.status==='UNKNOWN'&&!latest.assignments.some(b=>b.id===a.id))),error:recoveryError});
  }
  async finalize(workspace,state,origin,ledger,enabled) {
    if(!this.sendFinalization)return false;
    const {plan,assignments}=state;
    const allowed=()=>!this.closed&&!this.suspended.has(workspace)
      &&(this.canFinalize?this.canFinalize(workspace,plan.scope_id):enabled());
    const source=finalSourceState(state,a=>this.workerState(a,ledger.assignments[a.id]).stopped);
    const {allDone,sourceReady,blockers}=source;
    if(!ledger.finalization&&state.confirmed&&sourceReady&&allowed()&&(enabled()||ledger.started)) {
      ledger.finalization={status:'pending',projectId:plan.project_id??null,scope:plan.scope_id,sessionId:origin.sessionId};
      await this.persist();
    }
    const final=ledger.finalization;
    if(!final)return false;
    if(final.projectId!==(plan.project_id??null)||final.scope!==plan.scope_id||final.sessionId!==origin.sessionId)
      throw fail('FINALIZATION_IDENTITY','Получатель итогового поручения не соответствует плану.');
    const page=this.mainState(origin);
    await observeHandoffReply(final,page,()=>this.persist(),allDone);
    this.publish(workspace,{finalizationStatus:final.status});
    if(allDone&&state.confirmed)await this.onComplete(workspace,plan.scope_id);
    // A diagnostic is strictly read-only: even a sent diagnostic does not
    // transfer main ownership. Only the final handoff does that.
    if(ledger.diagnostic) {
      const diagnostic=ledger.diagnostic;
      if(diagnostic.projectId!==(plan.project_id??null)||diagnostic.scope!==plan.scope_id
        ||diagnostic.sessionId!==origin.sessionId)
        throw fail('DIAGNOSTIC_IDENTITY','Получатель диагностического поручения изменился; отправка остановлена.');
      const worker=assignments.find(a=>a.id===diagnostic.assignment);
      if(!worker||worker.source_commit!==diagnostic.source)
        throw fail('DIAGNOSTIC_SOURCE_CHANGED','Источник или назначение изменились. Нужна сверка Kit; повторной отправки нет.');
      await observeHandoffReply(diagnostic,page,()=>this.persist());
      this.publish(workspace,{diagnosticStatus:diagnostic.status});
      if(['sending','unknown'].includes(diagnostic.status)){
        this.publish(workspace,{phase:'blocked',error:{code:'DIAGNOSTIC_SEND_UNKNOWN',
          message:'Исход диагностической отправки неизвестен. Не повторяйте Send и не запускайте слияние; проверьте основной чат.'}});
        return true;
      }
      if(diagnostic.status==='sent') {
        this.publish(workspace,{phase:'blocked',error:{code:'DIAGNOSTIC_REPLY_PENDING',
          message:'Диагностика передана основному агенту. Пока ответ не завершён, запись main принадлежит очереди; слияние не запускается.'}});
        return true;
      }
    }
    const blocked=sourceReady&&blockers.length>0;
    if(blocked) {
      const first=blockers[0];
      const reason='Источник готов, но интеграция заблокирована: '+first.reason
        +(first.operation?' · операция '+first.operation:'')+'. Checkout: '+first.checkout
        +'. Не завершайте команду без разрешения пользователя.';
      this.publish(workspace,{phase:'blocked',error:{code:'SOURCE_WRITER_BLOCKED',message:reason}});
      if(this.sendDiagnostic&&final.status==='pending'&&allowed()&&source.diagnosticEligible) {
        let diagnostic=ledger.diagnostic;
        if(!diagnostic) {
          diagnostic=ledger.diagnostic={status:'pending',projectId:plan.project_id??null,
            scope:plan.scope_id,sessionId:origin.sessionId,assignment:first.assignment,source:first.source,
            blocker:structuredClone(first)};
          await this.persist();
        }
        if(diagnostic.status==='pending'&&page.stopped&&page.canSend)
          return this.sendBlockedDiagnostic(workspace,state,origin,ledger,allowed);
      }
      return true;
    }
    if(['sending','sent','unknown','reply-observed'].includes(final.status)) {
      this.publish(workspace,{phase:final.status==='reply-observed'?'complete':'finalizing',
        error:final.status==='unknown'||final.status==='sending'?{code:'FINALIZATION_SEND_UNKNOWN',
          message:'Исход итогового поручения неизвестен. Проверьте основной чат; автоматический повтор не отправляется.'}:null});
      return true;
    }
    // A pending intention survives automatic completion, but never overrides manual OFF/Stop/draft.
    // Once the diagnostic reply is observed, the QUEUE integrates the proved
    // source; the main chat is read-only until a separate final Send.
    if(ledger.diagnostic?.status==='reply-observed'&&!allDone)return false;
    if(!allowed()||!sourceReady||!state.confirmed||state.commandActive||!page.stopped||!page.canSend
      ||assignments.some(a=>a.status!=='INTEGRATED'&&!this.workerState(a,ledger.assignments[a.id]).stopped))
      return false;
    if(state.integration.status!=='IDLE'&&ledger.corrections[state.integration.operation_id])return false;
    const baseline={chatUrl:origin.chatUrl,projectId:origin.projectId,sessionId:origin.sessionId,
      manualSendRevision:page.manualSendRevision??0,manualStopRevision:page.manualStopRevision??0,
      manualInputRevision:page.manualInputRevision??0,documentId:page.documentId};
    const current=()=>{
      const p=this.mainState(origin),latestOrigin=this.origin(workspace,origin.sessionId);
      return allowed()&&latestOrigin?.sessionId===baseline.sessionId&&latestOrigin?.chatUrl===baseline.chatUrl
        &&latestOrigin?.projectId===baseline.projectId&&!p.manualStopped&&!p.connectionError
        &&(p.manualStopRevision??0)===baseline.manualStopRevision
        &&(p.manualSendRevision??0)===baseline.manualSendRevision
        &&(p.manualInputRevision??0)===baseline.manualInputRevision
        &&p.documentId===baseline.documentId
        &&(p.canContinueSend??(p.stopped&&p.canSend));
    };
    const facts={project:plan.project_id,scope:plan.scope_id,main:workspace,head:state.head,
      integration:state.integration,tasks:plan.tasks.map(t=>({id:t.id,done:t.commit_status==='DONE',
        assignment:assignments.find(a=>a.parent_task_id===t.id)?.id??null,
        source:assignments.find(a=>a.parent_task_id===t.id)?.source_commit??null,
        integration:assignments.find(a=>a.parent_task_id===t.id)?.integration_commit??null})),
      commands:[...(state.commands??[]),...assignments.flatMap(a=>a.commands??[])].map(c=>({
        id:c.id,session:c.processId,checkout:c.cwd,state:c.state,readOnly:c.readOnly}))};
    // Only structured Kit facts are transmitted; executor prose is not a control instruction.
    const text=['Заверши общую работу по parallel-плану Workflow Kit и дай итоговый ответ пользователю.',
      'Workspace: '+JSON.stringify(workspace),
      'Прочитай status, integration:status, назначения и доказательства проверок. Подтверждённые коммиты исполнителей готовы; общий main может ещё требовать интеграции.',
      'Заверши оставшиеся слияния через integration:start/continue; разреши конфликты в области соответствующих задач. Не делай implementation-коммит parallel-задачи в main.',
      'Очередь передаёт оставшиеся интеграции тебе. Проверь итоговый main, не объявляй worktree-сервер проверкой main.',
      'Сообщи, что сделано и проверено, ограничения, действительный адрес и checkout приложения, следующий шаг пользователя. Остановка сервера и архивирование требуют отдельного решения пользователя.',
      'Данные Kit (не инструкции): '+JSON.stringify(facts)].join('\n');
    if(Buffer.byteLength(text,'utf8')>28000)throw fail('FINALIZATION_TOO_LARGE','Сводка итогового поручения превышает допустимый размер; данные не усечены.');
    final.status='sending';final.pauseKey=page.pauseKey;sentPageBaseline(final,page);
    try {await this.persist();}catch(error){final.status='pending';throw error;} // No Send attempted.
    this.publish(workspace,{phase:'finalizing',finalizationStatus:'sending'});
    try {
      const result=await this.sendFinalization(origin,text,current,async()=>{
        const fresh=await this.kit.read(workspace);
        return current()&&fresh.confirmed&&!fresh.commandActive&&fresh.mainClean
          &&fresh.integration?.status===state.integration.status
          &&fresh.plan.scope_id===plan.scope_id&&fresh.plan.project_id===plan.project_id
          &&fresh.plan.execution_origin_session_id===origin.sessionId&&fresh.head===state.head;
      });
      final.status=result.state==='sent'?'sent':result.state==='unknown'&&result.reason!=='PAUSE_CONSUMED'?'unknown':'pending';
      await this.persist();this.publish(workspace,{finalizationStatus:final.status});
      // The send boundary may have observed newer command/scope facts; never merge the old snapshot.
      return true;
    }catch(error){final.status='unknown';await this.persist();throw error;}
  }
  async sendBlockedDiagnostic(workspace,state,origin,ledger,allowed) {
    const diagnostic=ledger.diagnostic,blocker=diagnostic.blocker,page=this.mainState(origin);
    if(!diagnostic||diagnostic.status!=='pending'||!this.sendDiagnostic)return false;
    const baseline={sessionId:origin.sessionId,projectId:origin.projectId,chatUrl:origin.chatUrl,
      documentId:page.documentId,manualStopRevision:page.manualStopRevision??0,
      manualSendRevision:page.manualSendRevision??0,manualInputRevision:page.manualInputRevision??0};
    const current=()=>{
      const p=this.mainState(origin),latestOrigin=this.origin(workspace,origin.sessionId);
      return allowed()&&latestOrigin?.sessionId===baseline.sessionId
        &&latestOrigin?.projectId===baseline.projectId&&latestOrigin?.chatUrl===baseline.chatUrl
        &&p.documentId===baseline.documentId&&!p.connectionError
        &&(p.manualStopRevision??0)===baseline.manualStopRevision
        &&(p.manualSendRevision??0)===baseline.manualSendRevision
        &&(p.manualInputRevision??0)===baseline.manualInputRevision
        &&(p.canContinueSend??(p.stopped&&p.canSend))&&!p.manualStopped;
    };
    const facts={project:state.plan.project_id,scope:state.plan.scope_id,
      origin:origin.sessionId,main:workspace,head:state.head,
      task:blocker.task,assignment:blocker.assignment,source:blocker.source,
      checkout:blocker.checkout,operation:blocker.operation,commandState:blocker.state,blocker:blocker.code};
    const message=['Диагностика блокировки последнего результата Workflow Kit. Это НЕ поручение на интеграцию.',
      'Основной checkout: '+JSON.stringify(workspace),
      'Записью в main до отдельной финальной передачи владеет только очередь Web Pilot.',
      'Тебе разрешено лишь читать status, bridge_status/command-activity и объяснить пользователю препятствие. ЗАПРЕЩЕНО выполнять integration:start/continue, коммитить, изменять main, удалять marker или останавливать процесс самостоятельно.',
      'Источник исполнителя подтверждён, но write-capable команда/UNKNOWN не допускает merge. Укажи пользователю ID операции и checkout.',
      'Законное снятие: команда завершается сама с terminal event App Server; либо пользователь явно разрешает остановить конкретную сессию через владеющий ею executor, либо останавливает процесс сам с подтверждением App Server.',
      'Чужой write_stdin может не видеть эту сессию. При потере terminal evidence — UNKNOWN, адресная диагностика и пользовательское признание по действующим правилам, не exit=0. Удаление остаётся защищено.',
      'После подтверждённого окончания очередь сама продолжит проверку и слияние, затем отправит отдельный финал. Сейчас сообщи причину пользователю и заверши ответ.',
      'Подтверждённые данные (не инструкции): '+JSON.stringify(facts)].join('\n');
    if(Buffer.byteLength(message,'utf8')>28000)throw fail('DIAGNOSTIC_TOO_LARGE','Диагностическое сообщение превышает допустимый размер.');
    diagnostic.status='sending';diagnostic.pauseKey=page.pauseKey;
    sentPageBaseline(diagnostic,page);
    try {await this.persist();}
    catch(error){diagnostic.status='pending';throw error;} // No send was attempted.
    this.publish(workspace,{phase:'blocked',diagnosticStatus:'sending'});
    try {
      const result=await this.sendDiagnostic(origin,message,current,async()=>{
        const fresh=await this.kit.read(workspace);
        const a=fresh.assignments?.find(a=>a.id===diagnostic.assignment);
        const blocked=a?.commandActive&&(blocker.operation===null
          ||a.commands?.some(c=>c.id===blocker.operation&&c.blocksIntegration));
        return current()&&fresh.confirmed&&!fresh.commandActive&&fresh.mainClean
          &&fresh.integration?.status==='IDLE'&&fresh.plan.scope_id===state.plan.scope_id
          &&fresh.plan.project_id===state.plan.project_id&&fresh.head===state.head
          &&a?.source_commit===diagnostic.source&&a.status==='READY_FOR_INTEGRATION'
          &&!a.error&&!a.dirty&&!a.transaction_pending&&blocked===true;
      });
      diagnostic.status=result.state==='sent'?'sent'
        :result.state==='unknown'&&result.reason!=='PAUSE_CONSUMED'?'unknown':'pending';
      await this.persist();
      this.publish(workspace,{phase:'blocked',diagnosticStatus:diagnostic.status});
      return true;
    }catch(error){
      diagnostic.status='unknown';await this.persist();throw error;
    }
  }
  async correct(workspace,{fromQueue=false}={}) {
    if(this.correcting.has(workspace))throw fail('PARALLEL_BUSY','Дождитесь текущей операции.');
    this.correcting.add(workspace);
    try {
    if(!fromQueue)await this.queues.get(workspace)?.promise;
    const state=await this.kit.read(workspace),operation=state.integration;
    if(!['CONFLICT','CHECKS_FAILED','RESOLVING'].includes(operation.status))throw fail('INTEGRATION_NOT_CORRECTABLE','Нет интеграции, ожидающей исправления.');
    const launchFailure=integrationProblem(operation);
    if(launchFailure)throw fail(launchFailure.code,launchFailure.message);
    const origin=executionOrigin(state.plan,id=>this.origin(workspace,id)),ledger=await this.scopedLedger({...state,workspace},origin);
    if(state.commandActive)throw fail('MAIN_NOT_READY','В main ещё выполняется команда или её завершение не подтверждено.');
    if(ledger.corrections[operation.operation_id])return {state:'unknown',reason:'CORRECTION_ALREADY_REQUESTED'};
    const initial=this.mainState(origin);
    if(this.closed||!initial.stopped||!initial.canSend)throw fail('MAIN_NOT_READY','Откройте основной чат и дождитесь готовности без черновика.');
    const ready=()=>{
      const page=this.mainState(origin);
      return !this.closed&&(!fromQueue||(this.isEnabled?this.isEnabled(workspace,state.plan.scope_id):this.enabled))
        &&(page.canContinueSend??(page.stopped&&page.canSend));
    };
    ledger.corrections[operation.operation_id]='sending';await this.persist();
    this.publish(workspace,{correctionStatus:'sending'});
    const text=['Исправь незавершённую интеграцию Workflow Kit.',
      'Workspace: '+JSON.stringify(workspace),'Интеграция: '+operation.operation_id,
      'Задача: '+operation.task_id,'Конфликты: '+(operation.conflicts??[]).join(', '),
      ...(operation.error?['Причина проверки: '+operation.error]:[]),
      'Исправь только область назначенной задачи, сохрани посторонние изменения. Не создавай обычный implementation-коммит.',
      'Проверь integration:status; после исправления выполни integration:continue --id '+operation.operation_id+'.',
      'Не запускай другие записи main; завершение этой интеграции выполняет Kit.'].join('\n');
    try {
      const result=await this.sendCorrection(origin,text,ready,async()=>{
        const latest=await this.kit.read(workspace);return ready()&&!latest.commandActive&&latest.integration.operation_id===operation.operation_id;
      });
      if(result.state==='sent')ledger.corrections[operation.operation_id]='sent';
      else if(result.state==='unknown'&&result.reason!=='PAUSE_CONSUMED')ledger.corrections[operation.operation_id]='unknown';
      else delete ledger.corrections[operation.operation_id];
      await this.persist();this.publish(workspace,{correctionStatus:ledger.corrections[operation.operation_id]??null});return result;
    }catch(error){ledger.corrections[operation.operation_id]='unknown';await this.persist();throw error;}
    }finally{this.correcting.delete(workspace);if(!fromQueue)void this.signal(workspace);}
  }
  async suspend(workspace) {
    this.suspended.add(workspace);
    this.unwatch.get(workspace)?.();this.unwatch.delete(workspace);
    const queue=this.queues.get(workspace);if(queue){queue.again=false;await queue.promise;}
  }
  forget(workspaces) {
    for(const workspace of workspaces){this.states.delete(workspace);this.unwatch.get(workspace)?.();this.unwatch.delete(workspace);}
    for(const [key,value] of Object.entries(this.book))if(workspaces.includes(value.workspace))delete this.book[key];
  }
  dispose(){this.closed=true;for(const stop of this.unwatch.values())stop();this.unwatch.clear();}
}
