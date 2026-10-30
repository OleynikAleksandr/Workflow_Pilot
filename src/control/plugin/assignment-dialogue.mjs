import {createHash} from 'node:crypto';
import {ASSIGNMENT_DIALOGUE_VERSION,assignmentPayload,assignmentCheck as check} from '../../contracts/plugin-communication.mjs';
import {INCOMING_WORK_RULE} from '@webpilot/workflow-kit/lib/role-protocol';
import {workflowRunId} from './enrollment.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const allowed={O:new Set(['task','context','question','clarification','decision','acceptance','revision_request']),
  E:new Set(['context_request','context','question','clarification','result'])};
// An unpublished intent has reached no recipient; its answer says so explicitly.
const unpublishedStage=phase=>({delivery_stage:phase==='authorized'?'authorized_waiting_channel':phase,delivered:false,
  delivery_note:phase==='authorized'?'Отправка разрешена и сохранена; ждём готовности канала исполнителя. Поручение ещё не доставлено.'
    :'Поручение ещё не опубликовано и не доставлено.'});
const reference=(run,target)=>'assignment:'+hash(JSON.stringify([run.id,target.scope_id,target.assignment_id,target.local_session_id]));

// Text and delivery belong to the existing WAL. Kit alone applies task grants,
// proof and acceptance. A persisted intent bridges these two durable owners.
export class AssignmentDialogue {
  constructor(communication,kit){this.c=communication;this.kit=kit;this.pending=new Map();}
  async input(input){return this.c.modelInput({metadata:input.metadata,meta_keys:input.meta_keys,trace_source:input.trace_source});}
  async migrate(input){
    const binding=await this.input(input),{run,member}=this.c.member(binding);
    check(member.role==='O'&&run.mode==='workflow'&&run.grant?.phase==='paused','MIGRATION_PAUSE','Переход выполняет O после общей паузы.');
    check(this.kit?.migrate,'CAPABILITY','Служба не поддерживает переход старых назначений.');
    check(!run.messages.some(m=>m.scope_id===run.grant.scope_id&&m.intent&&!m.reply_observed),
      'MIGRATION_UNKNOWN','Есть незавершённая или неопределённая доставка; сначала установите её исход без повторной отправки.');
    const operationId='migration-'+hash(JSON.stringify([run.id,run.grant.scope_id]));
    const result=await this.kit.migrate(member.target,{operation_id:operationId});
    await this.c.mutate('assignmentMigrated',{...binding,operation_id:operationId});return result;
  }
  async migrated(input){
    const {run}=this.c.member(input);
    check(!run.removed,'INTENT','Проект уже удалён.');
    for(const member of Object.values(run.members)){
      try{member.target=this.c.enrollment.current(member.target);}catch(error){
        if(error.code!=='PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED')throw error;member.removed=true;member.stopped=true;
      }
    }
    for(const [key,entry] of Object.entries(run.enrollments??{})){
      try{entry.target=this.c.enrollment.current(entry.target);}catch(error){
        if(error.code!=='PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED')throw error;delete run.enrollments[key];
      }
    }
    for(const message of run.messages)if(message.scope_id===run.grant.scope_id&&!message.intent&&!message.reply_observed){
      message.superseded=true;message.delivery='superseded';message.reply_observed=true;
    }
    this.c.event(run,'plan.dialogue_migrated',{operation_id:input.operation_id});return {migrated:true};
  }
  targets(run){
    const targets=new Map();
    for(const entry of [...Object.values(run.enrollments??{}),...Object.values(run.members)]){
      const t=entry.target;if(t&&(t.role==='O'||t.scope_id===run.grant?.scope_id))targets.set(t.local_session_id,t);
    }
    return [...targets.values()];
  }
  recipientRef(run,assignmentId){
    const target=this.targets(run).find(t=>t.role==='E'&&t.assignment_id===assignmentId);
    return target?reference(run,target):null;
  }
  authorized(run,intent){
    const a=intent.authorization,g=run.grant;
    return !!a&&g?.active&&g.phase==='running'&&a.generation===g.generation&&a.boot===this.c.backendId
      &&g.boot===a.boot&&a.scope_id===g.scope_id&&a.recipient===reference(run,intent.target)
      &&a.attempt===intent.effect.attempt&&a.contract_digest===intent.contract_digest;
  }
  invalidateAuthorizations(run){
    for(const intent of Object.values(run.assignment_intents??{}))if(intent.phase==='authorized'&&!this.authorized(run,intent)){
      intent.phase='needs_confirmation';
      this.c.event(run,'task.authorization_expired',{message_id:intent.message_id,assignment_id:intent.effect.assignment_id});
    }
  }
  suppressPreparation(run,intent){
    for(const m of run.messages)if(m.service&&m.sender_role==='backend'&&m.recipient_id===intent.sender_id
      &&m.assignment_id===intent.effect.assignment_id&&m.attempt===intent.effect.attempt
      &&m.scope_id===intent.effect.scope_id&&!m.read&&!m.intent&&!m.reply_observed
      &&(m.kind==='ready'||m.kind==='recovery'&&m.idempotency_key?.startsWith('prepare:'))){
      m.superseded=true;m.reply_observed=true;m.delivery='superseded';
      this.c.event(run,'message.superseded',{message_id:m.message_id,participant_id:m.recipient_id,reason:'task-authorized'});
    }
  }
  async target(run,member,recipient){
    const target=this.targets(run).find(t=>member.role==='E'?recipient==='orchestrator'&&t.role==='O'
      :t.role==='E'&&reference(run,t)===recipient);
    check(target,'RECIPIENT','Выберите адресата своего назначения из workflow_communication_participants.');
    await this.c.enrollment.validate(target);return target;
  }
  async state(target,assignmentId){
    check(this.kit?.status,'CAPABILITY','Рабочий диалог недоступен в этой службе.');
    const state=await this.kit.status(target,assignmentId);
    check(state.dialogue_version===ASSIGNMENT_DIALOGUE_VERSION,'CAPABILITY','Назначение использует прежний контракт. Нужна штатная миграция в безопасной паузе.');
    return state;
  }
  async roster(run,member){
    const assignments=[];
    for(const target of this.targets(run).filter(t=>t.role==='E'&&(member.role==='O'||t.local_session_id===member.target.local_session_id))){
      try{await this.c.enrollment.validate(target);const state=await this.state(member.role==='O'?member.target:target,target.assignment_id);
        const physical=state.block?await this.c.workflow.reconcile(target):this.c.workflow.observe(target);
        assignments.push({recipient_ref:member.role==='O'?reference(run,target):'orchestrator',task_id:target.task_id,
          assignment_id:target.assignment_id,attempt:state.dialogue?.attempt??1,dialogue_version:state.dialogue_version,
          ...(member.role==='O'&&state.task_brief?{task_brief:state.task_brief,contract_digest:state.contract_digest}:{}),
          phase:state.phase,block:state.block??null,channel:this.c.workflow.progress(target.local_session_id),
          physical:physical?{busy:physical.busy===true,stopped:physical.stopped===true,commandsIdle:physical.commandsIdle===true,
            document_id:physical.documentId??null,observation_seq:physical.observationSeq??0}:null,
          parked:!!state.block&&physical?.stopped===true&&physical.commandsIdle===true&&!physical.busy,
          dialogue:state.dialogue?{grant:state.dialogue.grant,result:state.dialogue.result,acceptance:state.dialogue.acceptance}:null});
      }catch(error){
        // A parent may read its integrated record after cleanup. This view
        // grants neither model access for the deleted E nor another delivery.
        if(member.role==='O'&&target.project_id===member.target.project_id&&target.scope_id===run.grant?.scope_id){
          try{
            const state=await this.state(member.target,target.assignment_id);
            if(state.id===target.assignment_id&&state.scope_id===target.scope_id&&state.task_id===target.task_id
              &&state.phase==='INTEGRATED'&&state.cleanup?.status==='DONE'){
              assignments.push({recipient_ref:reference(run,target),task_id:target.task_id,assignment_id:target.assignment_id,
                attempt:state.dialogue?.attempt??1,phase:'INTEGRATED',terminal:true,dialogue_version:state.dialogue_version,
                dialogue:state.dialogue?{result:state.dialogue.result,acceptance:state.dialogue.acceptance}:null});
              continue;
            }
          }catch{/* A missing parent proof remains the original concrete error. */}
        }
        assignments.push({recipient_ref:member.role==='O'?reference(run,target):'orchestrator',task_id:target.task_id,
        assignment_id:target.assignment_id,error:{code:error.code,message:error.message}});}
    }
    return assignments;
  }
  async send(input){
    const binding=await this.input(input),payload=assignmentPayload(input);
    const result=await this.c.mutate('assignmentIntent',{...binding,payload,key:input.idempotency_key});
    return this.complete(binding.run_id,result.message_id);
  }
  async draft(input){
    const binding=await this.input(input),payload=assignmentPayload({...input,kind:'task'});
    check(input.dispatch_when_ready===undefined||typeof input.dispatch_when_ready==='boolean','INPUT','dispatch_when_ready должен быть boolean.');
    const result=await this.c.mutate('assignmentIntent',{...binding,payload,key:input.idempotency_key,draft:true});
    if(!input.dispatch_when_ready)return result;
    await this.c.mutate('assignmentDispatch',{...binding,draft_id:result.message_id,when_ready:true});
    return this.complete(binding.run_id,result.message_id);
  }
  async dispatch(input){
    const binding=await this.input(input);
    check(input.when_ready===undefined||typeof input.when_ready==='boolean','INPUT','when_ready должен быть boolean.');
    const result=await this.c.mutate('assignmentDispatch',{...binding,draft_id:input.draft_id,when_ready:input.when_ready===true});
    return this.complete(binding.run_id,result.message_id);
  }
  async ready(target){
    const progress=this.c.workflow.progress(target.local_session_id),physical=await this.c.workflow.reconcile(target);
    check(progress?.sdk&&progress.permitted&&physical?.sdkDocumentReady&&!physical.manualStopped&&!physical.connectionError,
      'CHANNEL_NOT_READY','Отправка ждёт текущего SDK и подтверждённой привязки. Явно авторизованное поручение отправится автоматически; обычный черновик требует dispatch. Завершите ход без опроса модели.');
  }
  // Backend-only binding. The actual O member and Kit's checked author snapshot
  // replace neither host identity nor a public model authorization endpoint.
  async bindPrepared(target){
    const result=await this.c.mutate('assignmentPlanBind',{run_id:workflowRunId(target),target});
    if(result.message_id)await this.complete(workflowRunId(target),result.message_id);
    return result.prepared===true;
  }
  async bindPlan(input){
    const c=this.c,run=c.run(input),target=input.target;
    check(target.role==='E'&&target.dialogue_version===1&&run.mode==='workflow'&&!run.removed,
      'ROLE','Подготовка связывается только с собственным назначением E.');
    const member=Object.values(run.members).find(m=>m.role==='O'&&m.target.local_session_id===target.origin_session_id);
    if(!member)return {prepared:false};
    await c.enrollment.validate(member.target);await c.enrollment.validate(target);
    const state=await this.state(member.target,target.assignment_id),p=state.prepared_task;
    if(!p)return {prepared:false};
    check(p.version===1&&p.project_id===target.project_id&&p.scope_id===target.scope_id
      &&p.author_session_id===member.target.local_session_id&&p.body_sha256===hash(p.body),
      'STALE_DRAFT','Подготовка не принадлежит текущему автору и назначению.');
    if(run.grant?.scope_id!==target.scope_id||!run.grant.active||run.grant.phase!=='running')return {prepared:true};
    // Revisions are authored decisions of O; never replace one by the first task.
    const attempt=state.dialogue?.attempt??1;
    if(attempt!==1)return {prepared:true};
    const previous=Object.values(run.assignment_intents??{}).find(i=>i.effect.assignment_id===target.assignment_id
      &&i.effect.scope_id===target.scope_id&&i.effect.attempt===attempt&&i.planned_preparation===p.contract_digest);
    if(state.dialogue?.grant&&!previous)return {prepared:true};
    if(previous?.phase==='published')return {prepared:true};
    if(previous?.phase==='authorized'&&this.authorized(run,previous))return {prepared:true,message_id:previous.message_id};
    if(previous)check(['draft','authorized','needs_confirmation'].includes(previous.phase),
      'INTENT_CLOSED','Сохранённая подготовка требует адресного разбора отказа.');
    const contexts=p.contexts.map(item=>{
      check(item.sha256===hash(item.text)&&item.bytes===Buffer.byteLength(item.text),'STALE_DRAFT','Snapshot контекста повреждён.');
      return {source:item.source,text:item.text,commit:item.commit};
    });
    if(p.dependency_task_ids.length){
      const facts=p.dependency_facts;
      check(Array.isArray(facts)&&p.dependency_task_ids.length===facts.length
        &&p.dependency_task_ids.every(id=>facts.some(f=>f.task_id===id&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(f.commit))),
        'STALE_DRAFT','Не подтверждены интегрированные зависимости подготовки.');
      const text=JSON.stringify(facts);
      check(Buffer.byteLength(text)+512<=28000,'CONTEXT','Факты зависимостей превышают размер части.');
      contexts.push({source:'workflow-kit-dependencies.json',text});
    }
    check(Buffer.byteLength(p.body)+contexts.reduce((n,item)=>n+Buffer.byteLength(item.text),0)<=(p.hard_bytes??180000),
      'CONTEXT','Пакет с проверенными фактами зависимостей превышает бюджет; он не обрезан.');
    // openWorker may arrive before bootstrap reserves the known local target.
    // This is not a rejected recipient; no intent or author turn is needed yet.
    const invitations=Object.values(run.enrollments??{}).filter(e=>e.target?.local_session_id===target.local_session_id);
    const registered=Object.values(run.members).some(m=>m.target.local_session_id===target.local_session_id);
    if(!registered&&!invitations.length)return {prepared:true,waiting:'participant-reservation'};
    check(!invitations.length||invitations.some(e=>e.status!=='revoked'),
      'ENROLLMENT_REVOKED','Приглашение исполнителя отозвано; поручение не привязано.');
    check(registered||invitations.some(e=>e.status!=='revoked'&&e.expires_at>c.now()),
      'ENROLLMENT_EXPIRED','Приглашение исполнителя истекло; поручение не привязано.');
    const known=this.targets(run).find(t=>t.local_session_id===target.local_session_id);
    check(known&&['project_id','origin_session_id','role','scope_id','assignment_id','task_id']
      .every(key=>(known[key]??null)===(target[key]??null)),
      'ASSIGNMENT_CHANGED','Зарегистрированный адресат не принадлежит текущему назначению.');
    const key='plan:'+hash(JSON.stringify([target.project_id,target.scope_id,target.task_id,p.contract_digest,target.assignment_id,attempt]));
    const payload=assignmentPayload({kind:'task',recipient:reference(run,target),attempt,body:p.body,contexts,idempotency_key:key});
    const context={run,member},result=await this.prepare({...input,payload,key,draft:true,planned_preparation:p.contract_digest},context);
    await this.dispatchDraft({...input,draft_id:result.message_id,when_ready:true},context);
    c.event(run,'task.plan_bound',{message_id:result.message_id,assignment_id:target.assignment_id,task_id:target.task_id,
      preparation_digest:p.contract_digest});
    return {prepared:true,message_id:result.message_id};
  }
  async dispatchDraft(input,trusted=null){
    const {run,member}=trusted??this.c.member(input),intent=run.assignment_intents?.[input.draft_id];
    check(member.role==='O'&&intent?.sender_id===member.id&&intent.effect.kind==='task','ROLE','Нужен собственный черновик O.');
    check(intent.effect.scope_id===run.grant?.scope_id,'STALE_DRAFT','Черновик относится к другому плану.');
    if(intent.phase==='published')return {message_id:intent.message_id};
    check(!['failed','retired'].includes(intent.phase),'INTENT_CLOSED','Операция закрыта; подготовьте актуальное поручение.');
    await this.c.enrollment.validate(intent.target);
    const state=await this.state(member.target,intent.effect.assignment_id);
    check(state.contract_digest===intent.contract_digest&&(state.dialogue?.attempt??1)===intent.effect.attempt,
      'STALE_DRAFT','Изменились требования или попытка. Подготовьте новое поручение.');
    if(!input.when_ready)await this.ready(intent.target);
    check(run.grant.active&&run.grant.phase==='running'&&run.grant.boot===this.c.backendId,
      'STOPPED','Авторизация отправки требует выполняющегося плана.');
    intent.authorization={generation:run.grant.generation,boot:this.c.backendId,scope_id:run.grant.scope_id,
      recipient:reference(run,intent.target),attempt:intent.effect.attempt,contract_digest:intent.contract_digest};
    intent.phase='authorized';delete intent.error;
    this.suppressPreparation(run,intent);
    this.c.event(run,'task.dispatch_requested',{message_id:intent.message_id,assignment_id:intent.effect.assignment_id});
    return {message_id:intent.message_id};
  }
  async prepare(input,trusted=null){
    const c=this.c,{run,member}=trusted??c.member(input),payload=input.payload;
    check(run.mode==='workflow'&&run.grant&&!run.removed,'MODE','Нужен рабочий план.');
    check(allowed[member.role].has(payload.kind),'ROLE','Роль не допускает это сообщение.');
    check(!input.draft||member.role==='O'&&payload.kind==='task','ROLE','Подготовка доступна только оркестратору для task.');
    const fingerprint=hash(JSON.stringify(payload)),key=hash(JSON.stringify([member.id,run.grant.scope_id,input.key]));
    const legacyKey=hash(JSON.stringify([member.id,input.key]));
    const previous=Object.values(run.assignment_intents??{}).find(i=>i.effect.scope_id===run.grant.scope_id&&(i.key===key||i.key===legacyKey));
    if(previous){check(previous.fingerprint===fingerprint,'CONFLICT','Этот ключ уже использован с другим содержимым.');return {message_id:previous.message_id,draft_id:previous.message_id,phase:previous.phase};}
    check(run.grant.phase!=='complete','STOPPED','План уже завершён.');
    const target=await this.target(run,member,payload.recipient),worker=member.role==='E'?member.target:target;
    const state=await this.state(member.target,worker.assignment_id);
    check(!input.draft||typeof state.contract_digest==='string'&&state.contract_digest.length>0,
      'CAPABILITY','Обновите Workflow Kit проекта: подготовка требует проверяемой версии требований назначения.');
    check((state.dialogue?.attempt??1)===payload.attempt,'STALE_ATTEMPT','Попытка изменилась. Прочитайте статус назначения.');
    if(payload.kind==='task'&&!input.draft)await this.ready(target);
    if(payload.in_reply_to){const parent=run.messages.find(m=>m.message_id===payload.in_reply_to);
      check(parent?.recipient_id===member.id&&parent.read&&parent.assignment_id===worker.assignment_id&&parent.attempt===payload.attempt,
        'CORRELATION','Ответ требует прочитанного сообщения текущей попытки своего назначения.');}
    if(['acceptance','revision_request'].includes(payload.kind)){
      const result=run.messages.find(m=>m.message_id===payload.result_id);
      check(result?.kind==='result'&&result.recipient_id===member.id&&result.read
        &&result.assignment_id===worker.assignment_id,'RESULT_UNREAD','Сначала прочитайте адресный result исполнителя.');
    }
    check(Object.keys(run.assignment_intents??{}).length<2048,'LIMIT','Достигнут лимит сообщений плана.');
    const put=async text=>{if(c.store)return c.store.putContent(text);const ref=hash(text);c.workflow.contents.set(ref,text);return ref;};
    const content=await put(payload.body),contexts=[];
    for(const item of payload.contexts)contexts.push({source:item.source,commit:item.commit,sha256:await put(item.text),bytes:Buffer.byteLength(item.text)});
    const messageId=c.makeId(),operationId='message:'+messageId;
    const effect={assignment_id:worker.assignment_id,scope_id:run.grant.scope_id,attempt:payload.attempt,
      operation_id:operationId,message_id:messageId,kind:payload.kind,source_commit:payload.source_commit,result_id:payload.result_id,
      block_id:payload.block_id,problem_id:payload.problem_id,blocking:payload.blocking,resume:payload.resume,content_digest:fingerprint,
      ...(state.contract_digest?{contract_digest:state.contract_digest}:{})};
    const intent={message_id:messageId,operation_id:operationId,key,fingerprint,sender_id:member.id,source:member.target,target,
      effect,context_ref:content,contexts,in_reply_to:payload.in_reply_to,contract_digest:state.contract_digest,
      ...(trusted&&input.planned_preparation?{planned_preparation:input.planned_preparation}:{}),
      phase:input.draft?'draft':'prepared',created_at:new Date(c.now()).toISOString()};
    (run.assignment_intents??={})[messageId]=structuredClone(intent);
    c.event(run,input.draft?'task.prepared':'message.intent',{message_id:messageId,assignment_id:worker.assignment_id,kind:payload.kind});
    return {message_id:messageId,...(input.draft?{draft_id:messageId,phase:'draft',published:false}: {})};
  }
  complete(runId,messageId){
    const key=runId+':'+messageId;if(this.pending.has(key))return this.pending.get(key);
    const work=(async()=>{
      await this.c.tail;const run=this.c.runs.get(runId),intent=run?.assignment_intents?.[messageId];
      check(intent&&!run.removed,'INTENT','Намерение недоступно.');
      check(intent.phase!=='draft','DRAFT_NOT_DISPATCHED','Черновик не отправлен. После ready вызовите workflow_assignment_dispatch.');
      if(intent.phase==='published')return this.c.workflow.receipt(run.messages.find(m=>m.message_id===messageId));
      if(intent.authorization)return this.c.mutate('assignmentAuthorized',{run_id:runId,message_id:messageId});
      check(!['failed','retired'].includes(intent.phase),'INTENT_CLOSED','Операция закрыта; прочитайте её точную ошибку в status.');
      let receipt;
      try{await this.c.enrollment.validate(intent.source);await this.c.enrollment.validate(intent.target);
        if(intent.effect.kind==='task')await this.ready(intent.target);
        receipt=await this.kit.apply(intent.source,intent.effect);}
      catch(error){
        // The same durable operation survives a paused plan, process restart or
        // an interrupted CLI response. Permanent validation is visible, not retried.
        const code=String(error.code??'KIT_UNAVAILABLE');
        const retry=/(?:CHANNEL_NOT_READY|WORKFLOW_LOCKED|PLAN_PAUSED|TEST_INTERRUPTION|KIT_UNAVAILABLE|TIMEOUT|ECONN|EPIPE|COMMAND_ACTIVE|COMMAND_UNKNOWN|INTEGRATION_PENDING|TRANSACTION_PENDING)$/.test(code);
        await this.c.mutate('assignmentDeferred',{run_id:runId,message_id:messageId,retry,code,message:String(error.message).slice(0,700)});
        if(!retry)throw error;
        return {message_id:messageId,operation_id:intent.operation_id,persisted:true,published:false,phase:'deferred',error:{code,message:String(error.message).slice(0,700)}};
      }
      return this.c.mutate('assignmentPublish',{run_id:runId,message_id:messageId,receipt});
    })();this.pending.set(key,work);void work.finally(()=>this.pending.delete(key)).catch(()=>{});return work;
  }
  async applyAuthorized(input){
    const c=this.c,run=c.run(input),intent=run.assignment_intents?.[input.message_id];
    check(intent&&!run.removed,'INTENT','Намерение недоступно.');
    if(intent.phase==='published')return c.workflow.receipt(run.messages.find(m=>m.message_id===input.message_id));
    if(intent.phase==='authorized'&&!this.authorized(run,intent))this.invalidateAuthorizations(run);
    if(intent.phase!=='authorized')return {message_id:intent.message_id,draft_id:intent.message_id,
      persisted:true,published:false,phase:intent.phase,...unpublishedStage(intent.phase)};
    try{
      await c.enrollment.validate(intent.source);await c.enrollment.validate(intent.target);
      const state=await this.state(intent.source,intent.effect.assignment_id);
      check(state.contract_digest===intent.contract_digest&&(state.dialogue?.attempt??1)===intent.effect.attempt,
        'STALE_DRAFT','Изменились требования или попытка. Подготовьте новое поручение.');
      await this.ready(intent.target);
      // Authorization, the idempotent Kit effect and WAL publication share the
      // permission mutation queue. A concurrent Stop cannot race a new effect.
      const receipt=await this.kit.apply(intent.source,intent.effect);
      return this.publish({...input,receipt});
    }catch(error){
      const code=String(error.code??'KIT_UNAVAILABLE');
      const retry=/(?:CHANNEL_NOT_READY|WORKFLOW_LOCKED|PLAN_PAUSED|TEST_INTERRUPTION|KIT_UNAVAILABLE|TIMEOUT|ECONN|EPIPE|COMMAND_ACTIVE|COMMAND_UNKNOWN|INTEGRATION_PENDING|TRANSACTION_PENDING)$/.test(code);
      if(!retry)intent.phase='needs_confirmation';
      if(intent.error?.code!==code||!retry){
        intent.error={code,message:String(error.message).slice(0,700)};
        c.event(run,'task.dispatch_waiting',{message_id:intent.message_id,assignment_id:intent.effect.assignment_id,code,retry});
      }
      return {message_id:intent.message_id,draft_id:intent.message_id,persisted:true,published:false,phase:intent.phase,
        ...unpublishedStage(intent.phase),...(retry?{waiting:intent.error}:{error:intent.error})};
    }
  }
  deferred(input){
    const run=this.c.run(input),intent=run.assignment_intents?.[input.message_id];
    if(!intent||run.removed||intent.phase==='retired')return {retired:true};
    const phase=input.retry?'deferred':'failed';
    if(intent.phase===phase&&intent.error?.code===input.code&&intent.error?.message===input.message)return {phase};
    intent.phase=phase;intent.error={code:input.code,message:input.message};
    this.c.event(run,'message.intent_deferred',{message_id:intent.message_id,code:input.code,retry:input.retry});
    return {phase:intent.phase};
  }
  async reconcile(projectId,scopeId,owner){
    await this.c.tail;
    for(const run of this.c.runs.values())if(!run.removed&&run.project_id===projectId&&run.grant?.scope_id===scopeId
      &&(!owner||owner.sessions.some(s=>s.sessionId===run.origin_session_id))){
      for(const intent of Object.values(run.assignment_intents??{}))if(['authorized','prepared','deferred'].includes(intent.phase)){
        try{await this.complete(run.id,intent.message_id);}catch(error){
          if(run.removed||intent.phase==='retired')continue;
          if(intent.phase!=='failed')await this.c.mutate('assignmentDeferred',{run_id:run.id,message_id:intent.message_id,
            retry:false,code:String(error.code??'KIT_UNAVAILABLE'),message:String(error.message).slice(0,700)});
        }
      }
      if(this.kit?.close&&run.grant.active)for(const message of run.messages.filter(m=>m.kind==='acceptance'
        &&m.read&&m.yielded&&m.reply_observed&&!m.kit_transport_closed)){
        const origin=run.members[message.sender_id]?.target;if(!origin)continue;
        try{
          const state=await this.state(origin,message.assignment_id);if(state.phase!=='INTEGRATED')continue;
          const receipt=await this.kit.close(origin,{assignment_id:message.assignment_id,message_id:message.message_id,
            attempt:message.attempt,source_commit:message.source_commit});
          await this.c.mutate('assignmentTransport',{run_id:run.id,message_id:message.message_id,receipt});
        }catch(error){await this.c.mutate('assignmentTransport',{run_id:run.id,message_id:message.message_id,
          error:{code:String(error.code??'KIT_UNAVAILABLE'),message:String(error.message).slice(0,700)}});}
      }
    }
  }
  transport(input){
    const run=this.c.run(input),message=run.messages.find(m=>m.message_id===input.message_id);
    check(message?.kind==='acceptance'&&message.read&&message.yielded&&message.reply_observed,'TRANSPORT','Нет завершающей квитанции.');
    if(input.error){
      if(JSON.stringify(message.transport_error)!==JSON.stringify(input.error)){
        message.transport_error=input.error;
        this.c.event(run,'assignment.transport_waiting',{message_id:message.message_id,error_code:input.error.code});
      }
      return {pending:true};
    }
    check(input.receipt?.ok&&['message_id','attempt','source_commit'].every(k=>input.receipt[k]===message[k]),
      'TRANSPORT','Kit не подтвердил точную завершающую квитанцию.');
    if(input.receipt.cleanup?.status==='PENDING')return this.transport({...input,receipt:null,
      error:{code:'CLEANUP_PENDING',message:input.receipt.cleanup.reason??input.receipt.cleanup.error??'Очистка ожидает завершения команд.'}});
    message.kit_transport_closed=true;delete message.transport_error;
    this.c.event(run,'assignment.transport_closed',{message_id:message.message_id,assignment_id:message.assignment_id});
    return {closed:true};
  }
  async publish(input){
    const c=this.c,run=c.run(input),intent=run.assignment_intents?.[input.message_id];
    check(intent&&!run.removed&&intent.phase!=='retired','INTENT','Намерение недоступно.');
    if(intent.phase==='published')return c.workflow.receipt(run.messages.find(m=>m.message_id===input.message_id));
    await c.enrollment.validate(intent.source);await c.enrollment.validate(intent.target);
    const receipt=input.receipt;
    check(receipt?.operation_id===intent.operation_id&&receipt.message_id===intent.message_id,'KIT_RECEIPT','Kit не подтвердил сохранённую операцию.');
    const effect=intent.effect,recipient=Object.values(run.members).find(m=>m.target.local_session_id===intent.target.local_session_id);
    const message={message_id:intent.message_id,dialogue_version:ASSIGNMENT_DIALOGUE_VERSION,scope_id:effect.scope_id,
      assignment_id:effect.assignment_id,task_id:receipt.task_id,attempt:receipt.attempt,
      sender_id:intent.sender_id,sender_role:intent.source.role,recipient_id:recipient?.id??null,recipient_session_id:intent.target.local_session_id,
      kind:effect.kind,context_ref:intent.context_ref,contexts:intent.contexts,in_reply_to:intent.in_reply_to,
      block_id:receipt.block_id??effect.block_id,result_id:effect.result_id,source_commit:effect.source_commit,
      problem_id:receipt.problem_id??effect.problem_id,blocking:effect.blocking,resume:effect.resume,
      repair_attempt:receipt.repair_attempt,escalation_required:receipt.escalation_required,
      body:effect.kind+' · '+receipt.task_id,kit_receipt:receipt,idempotency_key:intent.key,fingerprint:intent.fingerprint,
      delivery:'pending',read:false,reply_observed:false,created_at:intent.created_at};
    run.messages.push(message);intent.phase='published';delete intent.error;
    if(effect.kind==='task')for(const other of Object.values(run.assignment_intents??{})){
      if(other!==intent&&other.effect.kind==='task'&&other.effect.assignment_id===effect.assignment_id
        &&other.effect.scope_id===effect.scope_id&&other.effect.attempt<=effect.attempt
        &&['draft','authorized','needs_confirmation'].includes(other.phase)){
        // Kit's accepted exact task is authoritative. Superseded unconsumed
        // drafts must not keep finalization waiting forever.
        other.phase='retired';
        c.event(run,'task.draft_retired',{message_id:other.message_id,assignment_id:effect.assignment_id});
      }
    }
    c.event(run,'message.persisted',{message_id:message.message_id,participant_id:message.recipient_id,assignment_id:message.assignment_id,
      task_id:message.task_id,kind:message.kind,sender_role:message.sender_role});
    return c.workflow.receipt(message);
  }
  async status(input){
    const binding=await this.input(input);await this.c.enrollment.validateInput(binding);
    const {run,member}=this.c.member(binding);
    const pending=Object.values(run.assignment_intents??{}).filter(i=>i.sender_id===member.id&&i.phase!=='published');
    return {permission:this.c.workflow.state(run),assignments:await this.roster(run,member),pending_incoming:await this.c.pendingIncoming(run,member),
      pending_intents:pending.map(i=>({message_id:i.message_id,draft_id:i.effect.kind==='task'?i.message_id:undefined,
        assignment_id:i.effect.assignment_id,attempt:i.effect.attempt,operation_id:i.operation_id,phase:i.phase,error:i.error??null})),
      messages:run.messages.filter(m=>(m.sender_id===member.id||m.recipient_id===member.id)&&m.scope_id===run.grant?.scope_id)
        .map(m=>({...this.c.workflow.receipt(m),kind:m.kind,assignment_id:m.assignment_id,attempt:m.attempt,sender_role:m.sender_role,in_reply_to:m.in_reply_to}))};
  }
  async yield(input){const binding=await this.input(input);return this.c.mutate('assignmentYield',{...binding,message_ids:input.message_ids,reason:input.reason});}
  async yielded(input){
    const c=this.c,{run,member}=c.member(input);
    check(run.mode==='workflow'&&Array.isArray(input.message_ids)&&input.message_ids.length>0&&input.message_ids.length<=32
      &&['awaiting_reply','tasks_sent','result_sent','handled'].includes(input.reason),'INPUT','Укажите прочитанные сообщения и причину окончания хода.');
    const messages=[...new Set(input.message_ids)].map(id=>run.messages.find(m=>m.message_id===id));
    check(messages.every(m=>m?.dialogue_version===ASSIGNMENT_DIALOGUE_VERSION&&m.recipient_id===member.id
      &&(m.read&&!m.superseded||m.superseded_read&&input.reason==='handled')&&m.scope_id===run.grant?.scope_id),
      'YIELD_DENIED','Квитанция относится только к прочитанным сообщениям своего текущего плана.');
    for(const message of messages){
      if(message.superseded_read&&input.reason==='handled')continue;
      const reply=run.messages.find(m=>m.sender_id===member.id&&m.assignment_id===message.assignment_id
        &&m.in_reply_to===message.message_id&&((m.kind==='revision_request'&&m.result_id===message.message_id)
          ||(m.kind==='decision'&&m.resume&&m.block_id===message.block_id)));
      if(message.service&&message.sender_role==='backend'&&!message.assignment_id)continue;
      const state=await this.state(member.target,message.assignment_id);
      const decided=member.role==='O'&&message.kind==='question'&&message.block_id
        &&state.last_decision?.block_id===message.block_id&&state.last_decision.attempt===message.attempt;
      check(reply||decided||await c.workflow.currentMessage(member.target,message),'STALE_MESSAGE','Сообщение больше не относится к текущей работе.');
      check((state.dialogue?.attempt??1)===message.attempt
        ||reply?.kind==='revision_request'&&reply.attempt===state.dialogue?.attempt&&reply.attempt===message.attempt+1,
        'STALE_ATTEMPT','Нельзя подтвердить обработку старой попытки.');
    }
    for(const message of messages)if(!message.yielded){message.yielded={reason:input.reason,at:c.now(),backend_id:c.backendId,page:structuredClone(c.workflow.observe(member.target))};
      if(message.intent&&['claimed','unknown'].includes(message.delivery)){
        message.resolved_by_read=true;
        c.event(run,'send.resolved',{message_id:message.message_id,evidence:'recipient-read-yield'});
      }
      c.event(run,'message.yielded',{message_id:message.message_id,participant_id:member.id,reason:input.reason});}
    return {handled:messages.map(m=>m.message_id),physical_completion:false,instructions:INCOMING_WORK_RULE+'\nЭто квитанция обработки, не DONE и не подтверждение физической остановки. Завершите ответ после всей уже доступной разрешённой работы текущего поручения.'};
  }
}
