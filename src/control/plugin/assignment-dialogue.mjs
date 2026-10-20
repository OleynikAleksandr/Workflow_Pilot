import {createHash} from 'node:crypto';
import {ASSIGNMENT_DIALOGUE_VERSION,assignmentPayload,assignmentCheck as check} from '../../contracts/plugin-communication.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const allowed={O:new Set(['task','context','question','clarification','decision','acceptance','revision_request']),
  E:new Set(['context_request','context','question','clarification','result'])};
const reference=(run,target)=>'assignment:'+hash(JSON.stringify([run.id,target.scope_id,target.assignment_id,target.local_session_id]));

// Text and delivery belong to the existing WAL. Kit alone applies task grants,
// proof and acceptance. A persisted intent bridges these two durable owners.
export class AssignmentDialogue {
  constructor(communication,kit){this.c=communication;this.kit=kit;this.pending=new Map();}
  async input(input){return this.c.modelInput({metadata:input.metadata});}
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
      try{await this.c.enrollment.validate(target);const state=await this.state(target,target.assignment_id);
        const physical=state.block?await this.c.workflow.reconcile(target):this.c.workflow.observe(target);
        assignments.push({recipient_ref:member.role==='O'?reference(run,target):'orchestrator',task_id:target.task_id,
          assignment_id:target.assignment_id,attempt:state.dialogue?.attempt??1,dialogue_version:state.dialogue_version,
          phase:state.phase,block:state.block??null,channel:this.c.workflow.progress(target.local_session_id),
          physical:physical?{busy:physical.busy===true,stopped:physical.stopped===true,commandsIdle:physical.commandsIdle===true,
            document_id:physical.documentId??null,observation_seq:physical.observationSeq??0}:null,
          parked:!!state.block&&physical?.stopped===true&&physical.commandsIdle===true&&!physical.busy,
          dialogue:state.dialogue?{grant:state.dialogue.grant,result:state.dialogue.result,acceptance:state.dialogue.acceptance}:null});
      }catch(error){assignments.push({recipient_ref:member.role==='O'?reference(run,target):'orchestrator',task_id:target.task_id,
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
    return this.c.mutate('assignmentIntent',{...binding,payload,key:input.idempotency_key,draft:true});
  }
  async dispatch(input){
    const binding=await this.input(input);
    const result=await this.c.mutate('assignmentDispatch',{...binding,draft_id:input.draft_id});
    return this.complete(binding.run_id,result.message_id);
  }
  async ready(target){
    const progress=this.c.workflow.progress(target.local_session_id),physical=await this.c.workflow.reconcile(target);
    check(progress?.sdk&&progress.permitted&&physical?.stopped&&!physical.busy&&physical.commandsIdle===true,
      'CHANNEL_NOT_READY','Задание сохраните через workflow_assignment_prepare. Отправка требует текущего SDK, привязки и конца bootstrap; ждите ready без опроса модели.');
  }
  async dispatchDraft(input){
    const {run,member}=this.c.member(input),intent=run.assignment_intents?.[input.draft_id];
    check(member.role==='O'&&intent?.sender_id===member.id&&intent.effect.kind==='task','ROLE','Нужен собственный черновик O.');
    if(intent.phase!=='draft')return {message_id:intent.message_id};
    await this.c.enrollment.validate(intent.target);
    const state=await this.state(member.target,intent.effect.assignment_id);
    check(state.contract_digest===intent.contract_digest&&(state.dialogue?.attempt??1)===intent.effect.attempt,
      'STALE_DRAFT','Изменились требования или попытка. Подготовьте новое поручение.');
    await this.ready(intent.target);
    intent.phase='prepared';
    this.c.event(run,'task.dispatch_requested',{message_id:intent.message_id,assignment_id:intent.effect.assignment_id});
    return {message_id:intent.message_id};
  }
  async prepare(input){
    const c=this.c,{run,member}=c.member(input),payload=input.payload;
    check(run.mode==='workflow'&&run.grant&&!run.removed,'MODE','Нужен рабочий план.');
    check(allowed[member.role].has(payload.kind),'ROLE','Роль не допускает это сообщение.');
    check(!input.draft||member.role==='O'&&payload.kind==='task','ROLE','Подготовка доступна только оркестратору для task.');
    const fingerprint=hash(JSON.stringify(payload)),key=hash(JSON.stringify([member.id,input.key]));
    const previous=Object.values(run.assignment_intents??{}).find(i=>i.key===key);
    if(previous){check(previous.fingerprint===fingerprint,'CONFLICT','Этот ключ уже использован с другим содержимым.');return {message_id:previous.message_id,draft_id:previous.message_id,phase:previous.phase};}
    check(run.grant.phase!=='complete','STOPPED','План уже завершён.');
    const target=await this.target(run,member,payload.recipient),worker=member.role==='E'?member.target:target;
    const state=await this.state(member.target,worker.assignment_id);
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
  deferred(input){
    const run=this.c.run(input),intent=run.assignment_intents?.[input.message_id];
    if(!intent||run.removed||intent.phase==='retired')return {retired:true};
    const phase=input.retry?'deferred':'failed';
    if(intent.phase===phase&&intent.error?.code===input.code&&intent.error?.message===input.message)return {phase};
    intent.phase=phase;intent.error={code:input.code,message:input.message};
    this.c.event(run,'message.intent_deferred',{message_id:intent.message_id,code:input.code,retry:input.retry});
    return {phase:intent.phase};
  }
  async reconcile(projectId,scopeId){
    await this.c.tail;
    for(const run of this.c.runs.values())if(!run.removed&&run.project_id===projectId&&run.grant?.scope_id===scopeId)
      for(const intent of Object.values(run.assignment_intents??{}))if(['prepared','deferred'].includes(intent.phase)){
        try{await this.complete(run.id,intent.message_id);}catch(error){
          if(run.removed||intent.phase==='retired')continue;
          if(intent.phase!=='failed')await this.c.mutate('assignmentDeferred',{run_id:run.id,message_id:intent.message_id,
            retry:false,code:String(error.code??'KIT_UNAVAILABLE'),message:String(error.message).slice(0,700)});
        }
      }
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
    run.messages.push(message);intent.phase='published';
    c.event(run,'message.persisted',{message_id:message.message_id,participant_id:message.recipient_id,assignment_id:message.assignment_id,
      task_id:message.task_id,kind:message.kind,sender_role:message.sender_role});
    return c.workflow.receipt(message);
  }
  async status(input){
    const binding=await this.input(input);await this.c.enrollment.validateInput(binding);
    const {run,member}=this.c.member(binding);
    const pending=Object.values(run.assignment_intents??{}).filter(i=>i.sender_id===member.id&&i.phase!=='published');
    return {permission:this.c.workflow.state(run),assignments:await this.roster(run,member),
      pending_intents:pending.map(i=>({message_id:i.message_id,draft_id:i.phase==='draft'?i.message_id:undefined,
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
        message.delivery='accepted';message.resolved_by_read=true;
        c.event(run,'send.resolved',{message_id:message.message_id,evidence:'recipient-read-yield'});
      }
      c.event(run,'message.yielded',{message_id:message.message_id,participant_id:member.id,reason:input.reason});}
    return {handled:messages.map(m=>m.message_id),physical_completion:false,instructions:'Завершите ответ. Это квитанция обработки, не DONE и не подтверждение физической остановки.'};
  }
}
