import {createHash} from 'node:crypto';
import {workflowRunId} from './enrollment.mjs';
import {communicationMessageComplete,notificationRecovery,NOTIFICATION_LIMIT} from '../../contracts/plugin-communication.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,message)=>Object.assign(new Error(message),{code:'PLUGIN_COMMUNICATION_'+code});
const check=(value,code,message)=>{if(!value)throw fail(code,message);};
const LEASE_MS=60000;
const kinds=new Set(['assignment-start','continue','question','decision','result','integration','finalization','diagnostic','ready','recovery','user-choice','review']);
// Only a receipt proves a stage. A persisted message (delivery:pending) is not
// delivered: the agent must not report it as handed over to the recipient.
const stageNotes={saved:'Сохранено в очереди; SDK ещё не доставил получателю. Не сообщай, что сообщение передано.',
  sending:'SDK начал отправку; подтверждения хоста ещё нет.',accepted:'Принято хостом; чтение получателем не подтверждено.',
  read:'Прочитано получателем.',unknown:'Исход отправки неизвестен; не повторяй отправку.',rejected:'Отправка отклонена.',superseded:'Сообщение устарело.'};
export function deliveryStage(message){
  const stage=message.read?'read':message.superseded?'superseded':message.delivery==='pending'?'saved':message.delivery==='claimed'?'sending'
    :['accepted','unknown','rejected'].includes(message.delivery)?message.delivery:'unknown';
  return {delivery_stage:stage,delivered:stage==='read',delivery_note:stageNotes[stage]};
}

// Plan permission is durable. A short panel lease only proves a live SDK; it
// never asks the user to renew that permission or authorizes another scope.
export class WorkflowChannel {
  constructor(communication,{observe=()=>({canSend:false}),admit=async()=>false,reconcile=async()=>null,currentMessage=async()=>true}={}) {
    Object.assign(this,{c:communication,observe,admission:admit,currentMessage});this.contents=new Map();this.turnProbes=new Map();
    this.observationSpans=new Map();
    this.reconcile=async target=>{
      const started=performance.now();const value=await reconcile(target),elapsed=performance.now()-started;
      const signature=JSON.stringify([value?.busy,value?.stopped,value?.commandsIdle,value?.turnId,value?.assistantRevision]);
      if(this.observationSpans.get(target.local_session_id)!==signature||elapsed>=250){
        this.observationSpans.set(target.local_session_id,signature);
        if(this.observationSpans.size>256)this.observationSpans.delete(this.observationSpans.keys().next().value);
        this.c.recordObserverTiming(target,elapsed,!!value);
      }
      return value;
    };
  }
  async superseded(run,member,message){
    if(message.superseded)return true;
    if(await this.currentMessage(member.target,message))return false;
    message.superseded=true;
    if(!message.intent){message.reply_observed=true;message.delivery='superseded';}
    // An obsolete delivery with an SDK intent still has an unknown outcome.
    // Never invent a read receipt to clear its gate.
    else await this.observed(run,member);
    this.c.event(run,'message.superseded',{participant_id:member.id,message_id:message.message_id,block_id:message.block_id});
    return true;
  }
  async grant(target,phase='running',guard={}) {
    return this.c.mutate('grant',{run_id:workflowRunId(target),target,phase,...guard});
  }
  _grant({target,phase,canContinue,expectedGeneration}) {
    const c=this.c;
    check(target.role==='O'&&target.scope_id,'MODE','Нужен опубликованный план своего оркестратора.');
    check(['running','pausing','paused','complete'].includes(phase),'INPUT','Неизвестное состояние плана.');
    const run=c.enrollment.ensureRun(target),active=phase==='running'||phase==='pausing'&&target.dialogue_version!==1,old=run.grant;
    check(!canContinue||canContinue(),'PERMISSION_CHANGED','Команда разрешения заменена более поздним действием пользователя.');
    if(old?.scope_id===target.scope_id&&old.phase===phase&&old.active===active&&old.boot===c.backendId)return this.state(run);
    check(expectedGeneration===undefined||(old?.generation??0)===expectedGeneration,
      'PERMISSION_CHANGED','Разрешение уже изменилось; прежняя команда не применяется.');
    const generation=Math.max(old?.generation??0,...Object.values(run.members).map(m=>m.generation))+1;
    run.grant={scope_id:target.scope_id,generation,phase,active,boot:c.backendId};
    c.assignment.invalidateAuthorizations(run);
    for(const member of Object.values(run.members)){member.generation=generation;member.stopped=!active;
      if(member.role==='O')member.target.scope_id=target.scope_id;}
    c.event(run,'plan.permission',{scope_id:target.scope_id,permission_generation:generation,phase,active});
    return this.state(run);
  }
  state(run){return {scope_id:run.grant?.scope_id??null,phase:run.grant?.phase??'not-started',active:run.grant?.active===true};}
  // Read-only local projection. Registration, a live SDK lease and message
  // receipt are separate facts; no ticket, identity or message text leaves it.
  panelIssue(run,member,panel) {
    if(!panel||panel.runId!==run.id||panel.memberId!==member.id||panel.identity!==member.identity)return 'panel-unbound';
    if(panel.generation!==member.generation)return 'generation-mismatch';
    if(panel.expiresAt<=this.c.now())return 'lease-expired';
    if(!panel.messageSupported)return 'sdk-unavailable';
    return null;
  }
  // Only the attested owner panel makes the delivery channel live; observers never do.
  livePanel(run,member){const {panel}=this.c.ownership.owner(run,member);return !!panel&&this.panelIssue(run,member,panel)===null;}
  progress(sessionId) {
    const c=this.c,target=c.enrollment.resolveTarget?.(sessionId);
    if(!target||c.removedSessions.has(sessionId))return null;
    const run=c.runs.get(workflowRunId(target));if(run?.removed)return null;
    const member=Object.values(run?.members??{}).find(m=>['project_id','local_session_id','origin_session_id','role','scope_id','assignment_id','task_id','workspace_id','origin_workspace_id']
      .every(key=>(m.target[key]??null)===(target[key]??null)));
    const sdk=!!member&&this.livePanel(run,member);
    const initial=run?.messages.findLast(m=>m.recipient_session_id===sessionId&&m.scope_id===target.scope_id
      &&m.assignment_id===target.assignment_id&&['assignment-start','task','revision_request'].includes(m.kind)&&!m.superseded);
    const dialogue=run?.messages.filter(m=>m.assignment_id===target.assignment_id&&m.scope_id===target.scope_id&&!m.superseded)??[];
    const question=dialogue.findLast(m=>m.blocking&&m.kind==='question');
    const blocked=!!question&&!dialogue.some(m=>m.kind==='decision'&&m.resume&&m.block_id===question.block_id);
    const failed=run?.messages.find(m=>m.recipient_session_id===sessionId&&!m.read&&!m.superseded&&!m.cancelled&&['unknown','rejected'].includes(m.delivery));
    const incoming=failed
      ??(member&&this.first(run,member))
      ??run?.messages.find(m=>m.recipient_session_id===sessionId&&m.scope_id===target.scope_id&&!communicationMessageComplete(m));
    const readAt=incoming&&run.events.findLast(e=>e.event_type==='message.read'&&e.message_id===incoming.message_id)?.server_time;
    const acceptedAt=incoming&&run.events.findLast(e=>e.event_type==='send.report'&&e.message_id===incoming.message_id&&e.outcome==='accepted')?.server_time;
    const gated=(member&&this.first(run,member))??failed;
    const recovery=gated&&notificationRecovery(gated,c.now());
    const blocker=gated&&['claimed','unknown','rejected'].includes(gated.delivery)?{
      message_id:gated.message_id,kind:gated.kind,scope_id:gated.scope_id??null,task_id:gated.task_id??null,
      read:!!(gated.read||gated.superseded_read),delivery:gated.delivery,
      ...(recovery?{recovery}:{}),
      reason:gated.delivery==='claimed'?'sdk-pending':'send-'+gated.delivery,created_at:gated.created_at}:null;
    const result=target.role==='E'&&run?.messages.findLast(m=>m.assignment_id===target.assignment_id
      &&m.scope_id===target.scope_id&&m.kind==='result'&&m.sender_role==='E'&&!m.superseded);
    const draft=target.role==='E'&&Object.values(run?.assignment_intents??{}).findLast(i=>
      i.effect.assignment_id===target.assignment_id&&i.effect.scope_id===target.scope_id
      &&i.effect.kind==='task'&&!['published','retired','failed'].includes(i.phase));
    return {registered:!!member,sdk,permitted:!!member&&this.permitted(run,member),
      generation:member?.generation??null,blocked,
      ...(blocker?{blocker}:{}),
      ...(result?{result:{delivery:result.delivery,read:!!result.read}}:{}),
      ...(incoming?{incoming:{message_id:incoming.message_id,created_at:incoming.created_at,delivery_at:acceptedAt??null,read_at:readAt??null,
        handled_at:Number.isFinite(incoming.yielded?.at)?new Date(incoming.yielded.at).toISOString():null,kind:incoming.kind,task_id:incoming.task_id,
        sender_role:incoming.sender_role,recipient_role:member?.role??target.role,read:!!incoming.read,
        service_action:incoming.idempotency_key?.startsWith('prepare:')?'prepare'
          :incoming.idempotency_key?.startsWith('parked:')?'parked':incoming.idempotency_key?.startsWith('authorize:')?'authorize':null,
        handled:!!incoming.yielded,delivery:incoming.delivery,recovery:notificationRecovery(incoming,c.now()),reason:incoming.claim_wait_reason??null}}:{}),
      ...(draft?{draft:{phase:draft.phase}}:{}),
      initial:initial?{message_id:initial.message_id,delivery:initial.delivery,read:initial.read,recovery:notificationRecovery(initial,c.now()),handled:!!initial.yielded,physical_complete:!!initial.reply_observed}:null};
  }
  permitted(run,member) {
    return ['O','E'].includes(member.role)&&run.grant?.active===true&&run.grant.boot===this.c.backendId&&!member.stopped
      &&(member.role==='O'||member.target.scope_id===run.grant.scope_id);
  }
  // The user's choice is delivered without the plan permission: no plan, paused or complete.
  choicePending(run,member){return run.messages.some(m=>['user-choice','review'].includes(m.kind)&&m.recipient_id===member.id&&!communicationMessageComplete(m));}
  transportPermitted(run,member){return this.permitted(run,member)||this.c.startup.active(run,member)||this.choicePending(run,member);}
  messagePermitted(run,member,message){
    return message.kind==='startup-context'?this.c.startup.active(run,member)
      :message.kind==='user-choice'||message.kind==='review'||this.permitted(run,member);
  }
  first(run,member){
    // Only a still-running or uncertain SDK effect occupies the transport lane.
    // Accepted/read/yield/assistant state never schedules a later notification.
    return run.messages.find(m=>m.recipient_id===member.id&&(m.delivery==='claimed'
        ||['unknown','rejected'].includes(m.delivery)&&m.notification_version!==1))
      ??run.messages.find(m=>m.recipient_id===member.id&&m.delivery==='pending'&&!m.read&&!m.superseded&&m.delivery_mode!=='model-pull'
        &&this.messagePermitted(run,member,m)
        &&(['startup-context','user-choice','review'].includes(m.kind)||m.scope_id===run.grant?.scope_id))
      ??run.messages.find(m=>m.recipient_id===member.id&&this.retryEligible(run,member,m));
  }
  retryEligible(run,member,message){
    const r=notificationRecovery(message,this.c.now());
    return r?.retrying&&r.due_at<=this.c.now()&&this.messagePermitted(run,member,message)
      &&(['user-choice','review'].includes(message.kind)||message.scope_id===run.grant?.scope_id);
  }
  retryDelay(run,member){
    const delays=run.messages.filter(m=>m.recipient_id===member.id&&this.messagePermitted(run,member,m))
      .map(m=>notificationRecovery(m,this.c.now())).filter(r=>r?.retrying&&r.due_at>this.c.now()).map(r=>r.due_at-this.c.now());
    return Math.min(this.c.freshness.holdDelay(member.target),...delays);
  }
  attach(run,member) {
    if(run.grant){member.generation=run.grant.generation;member.stopped=!run.grant.active;}
    for(const message of run.messages)if(message.recipient_session_id===member.target.local_session_id&&!message.recipient_id)
      message.recipient_id=member.id;
  }
  async sync(input) {
    const c=this.c,{run,member,panel}=c.panel(input);
    check(run.mode==='workflow','MODE','Эта операция относится к рабочему плану.');
    panel.messageSupported=input.message_supported===true;
    panel.generation=member.generation;panel.expiresAt=c.now()+LEASE_MS;
    check(input.recover_notifications===undefined||typeof input.recover_notifications==='boolean','INPUT','Некорректное начало восстановления.');
    check(input.recovery_id===undefined||typeof input.recovery_id==='string'&&/^[a-f0-9-]{36}$/i.test(input.recovery_id),'INPUT','Некорректная квитанция восстановления.');
    check(!(input.recover_notifications&&input.recovery_id),'INPUT','Начало и подтверждение восстановления — разные шаги.');
    let incident=this.connectionIncident(member,panel);
    const owner=c.ownership.role(run,member,panel)==='owner';
    if(input.recover_notifications===true&&owner&&this.transportPermitted(run,member)&&!this.panelIssue(run,member,panel)){
      const page=this.observe(member.target);
      if(page?.sdkDocumentReady&&page.documentId&&!this.physicalBlock(member.target)){
        if(!incident||incident.restored_at){
          incident=member.notification_connection={id:c.makeId(),panel_id:panel.id,generation:member.generation,
            document_id:page.documentId,waited:false,messages:run.messages.filter(m=>m.recipient_id===member.id
              &&m.notification_version===1&&!m.read&&m.notification_attempts?.length).map(m=>m.message_id)};
          c.event(run,'notification.connection_lost',{participant_id:member.id,incident_id:incident.id});
        }
      }
    }
    if(input.recovery_id){
      check(owner&&incident?.id===input.recovery_id&&incident.waited,'RECOVERY_STALE','Нет подтверждённого восстановления этого подключения.');
      if(this.transportPermitted(run,member)&&!this.panelIssue(run,member,panel)&&!this.physicalBlock(member.target)){
        if(!incident.restored_at){incident.restored_at=c.now();
          c.event(run,'notification.connection_restored',{participant_id:member.id,incident_id:incident.id});}
        await this.restoreNotifications(run,member);
      }
    }
    return {...c._status(input),...(input.recover_notifications&&incident?{notification_recovery_id:incident.id}:{})};
  }
  // Reconnect is evidence for a finite notification retry, never a new grant.
  connectionIncident(member,panel){
    const incident=member.notification_connection,page=this.observe(member.target);
    return incident&&panel&&incident.panel_id===panel.id&&incident.generation===member.generation
      &&incident.document_id===page?.documentId&&page?.sdkDocumentReady===true?incident:null;
  }
  connectionWaited(member,panel){
    const incident=this.connectionIncident(member,panel);
    if(incident&&!incident.restored_at)incident.waited=true;
  }
  async restoreNotifications(run,member){
    const incident=member.notification_connection;
    if(!incident?.restored_at)return;
    const panel=this.c.panels.get(incident.panel_id);
    if(!this.connectionIncident(member,panel)||this.panelIssue(run,member,panel)||this.physicalBlock(member.target))return;
    for(const message of run.messages){
      const attempts=message.notification_attempts,last=attempts?.at(-1);
      if(message.recipient_id!==member.id||message.notification_version!==1||message.notification_recovery
        ||message.read||message.superseded||message.cancelled||message.reply_observed
        ||!['unknown','rejected'].includes(message.delivery)||!attempts?.length||attempts.length>NOTIFICATION_LIMIT
        ||last.error?.retryable===false||!incident.messages?.includes(message.message_id)
        ||!this.messagePermitted(run,member,message)||!await this.currentMessage(member.target,message))continue;
      message.notification_recovery={incident_id:incident.id,at:this.c.now()};
      this.c.event(run,'notification.connection_recovered',{message_id:message.message_id,participant_id:member.id,
        incident_id:incident.id,attempts:attempts.length});
    }
  }
  stop(input) {
    const c=this.c,{run,member,panel}=c.panel(input);
    if(input.scope==='panel'){
      panel.expiresAt=0;panel.messageSupported=false;
      c.event(run,'panel.detached',{participant_id:member.id,panel_instance_id:input.panel_instance_id});
      return {...c._status(input),stop_applied:false};
    }
    if(run.grant?.active){
      run.grant.active=false;run.grant.phase='paused';run.grant.reason='manual';run.grant.generation++;
      c.assignment.invalidateAuthorizations(run);
      for(const m of Object.values(run.members)){m.stopped=true;m.generation=run.grant.generation;}
      c.event(run,'plan.revoked',{participant_id:member.id,scope_id:run.grant.scope_id});
    }
    return {...c._status(input),stop_applied:true};
  }
  async enqueue(target,{key,kind,text,source=null,block_id=null,signal_id=null,subject=null,attempt=null,role=null,ui_event=null}) {
    return this.c.mutate('enqueue',{run_id:workflowRunId(target),target,key,kind,text,source,block_id,signal_id,subject,attempt,role,ui_event});
  }
  async _enqueue(input) {
    const c=this.c,run=c.run(input),target=input.target;
    const choice=['user-choice','review'].includes(input.kind);
    check(run.mode==='workflow'&&(choice||target.scope_id===run.grant?.scope_id),'ASSIGNMENT_CHANGED','Назначение относится к другому плану.');
    check(typeof input.key==='string'&&input.key.length>0&&input.key.length<=240&&kinds.has(input.kind),'INPUT','Неверный конверт рабочего сообщения.');
    check(typeof input.text==='string'&&input.text.trim()&&Buffer.byteLength(input.text)<=1048576,'CONTEXT','Контекст пуст или превышает допустимый размер; он не обрезан.');
    if(input.ui_event)check(choice&&input.ui_event.recipient_session_id===target.local_session_id
      &&(input.ui_event.type==='review-preference'&&typeof input.ui_event.id==='string'
        &&Number.isSafeInteger(input.ui_event.revision)&&input.ui_event.revision>0&&typeof input.ui_event.enabled==='boolean'
        ||input.kind==='review'&&input.ui_event.type==='review-continuation'&&typeof input.ui_event.run_id==='string'
          &&Number.isSafeInteger(input.ui_event.generation)), 'INPUT','Некорректное событие Review.');
    const fingerprint=hash(JSON.stringify(input.ui_event?[target.local_session_id,input.kind,input.text,input.ui_event]
      :[target.local_session_id,target.assignment_id,input.kind,input.text,input.block_id,input.signal_id,
      ...(target.dialogue_version===1?[input.subject,input.attempt]:[])]));
    const existing=run.messages.find(m=>m.idempotency_key===input.key);
    if(existing){check(existing.fingerprint===fingerprint,'CONFLICT','Ключ события уже использован для другого поручения.');return this.receipt(existing);}
    check(choice||run.grant?.active,'STOPPED','Выполнение плана приостановлено.');
    check(run.messages.length<2048,'LIMIT','Достигнут лимит сообщений плана.');
    const ref=c.store?await c.store.putContent(input.text):hash(input.text);
    if(!c.store)this.contents.set(ref,input.text);
    await c.enrollment.validate(target);
    const recipient=Object.values(run.members).find(m=>m.target.local_session_id===target.local_session_id);
    const source=input.source&&Object.values(run.members).find(m=>m.target.local_session_id===input.source.local_session_id);
    const message={message_id:c.makeId(),recipient_id:recipient?.id??null,recipient_session_id:target.local_session_id,
      sender_id:source?.id??null,sender_role:input.source?.role??'backend',scope_id:target.scope_id,
      assignment_id:target.assignment_id??input.subject?.assignment_id??input.source?.assignment_id??null,task_id:target.task_id??input.subject?.task_id??input.source?.task_id??null,
      ...(target.dialogue_version===1?{dialogue_version:1,attempt:input.attempt,service:!input.source,
        ...(input.signal_id?{blocking:input.kind==='question',resume:input.kind==='decision'}:{})}:{}),
      kind:input.kind,block_id:input.block_id,signal_id:input.signal_id,context_ref:ref,...(choice&&input.role?{recipient_role:input.role}:{}),
      body:input.kind+(target.task_id?' · '+target.task_id:''),idempotency_key:input.key,fingerprint,
      ...(input.ui_event?{ui_event:structuredClone(input.ui_event)}:{}),
      delivery:'pending',read:false,reply_observed:false,created_at:new Date(c.now()).toISOString()};
    run.messages.push(message);c.event(run,'message.persisted',{message_id:message.message_id,participant_id:recipient?.id??null,
      assignment_id:message.assignment_id,task_id:message.task_id,kind:message.kind,scope_id:message.scope_id});
    // A ready producer may have observed the assignment just before O
    // authorized it. Recheck in the enqueue transaction, not only in start().
    for(const intent of Object.values(run.assignment_intents??{}))if(intent.effect.kind==='task'
      &&(intent.phase==='published'||intent.phase==='authorized'&&c.assignment.authorized(run,intent)))
      c.assignment.suppressPreparation(run,intent);
    return this.receipt(message);
  }
  receipt(message){return {message_id:message.message_id,delivery:message.delivery,read:message.read,reply_observed:message.reply_observed===true,
    notification_version:message.notification_version??null,recovery:notificationRecovery(message,this.c.now()),
    ...(message.dialogue_version===1?{operation_id:message.kit_receipt?.operation_id,assignment_id:message.assignment_id,attempt:message.attempt,
      handled:!!message.yielded,result:message.kit_receipt?.result??null,acceptance:message.kit_receipt?.acceptance??null,
      block_id:message.block_id??null,problem_id:message.problem_id??null,repair_attempt:message.repair_attempt??null,
      escalation_required:message.escalation_required===true,...deliveryStage(message)}:{})};}
  pending(run,member) {
    if(!this.transportPermitted(run,member)||this.physicalBlock(member.target)||this.c.freshness.held(member.target))return null;
    const first=this.first(run,member);
    return first&&(first.delivery==='pending'||this.retryEligible(run,member,first))?first:null;
  }
  async admit(target,message){
    const result=await this.admission(target,message);
    return result===true||result?.allowed===true;
  }
  physicalBlock(target){
    const page=this.observe(target);
    return page?.legacySendUnknown?'send-unknown':page?.manualStopped?'manual-stop':page?.connectionError?'recipient-connection-error'
      :!page?.sdkDocumentReady?'recipient-unavailable':null;
  }
  async claimBlockReason(run,member,message) {
    if(this.first(run,member)?.message_id!==message.message_id)return 'previous-message';
    const physical=this.physicalBlock(member.target);if(physical)return physical;
    if(!this.messagePermitted(run,member,message))return 'admission-denied';
    const admitted=await this.admission(member.target,message);
    if(admitted!==true&&admitted?.allowed!==true)return admitted?.reason??'admission-denied';
    return this.physicalBlock(member.target)??this.c.freshness.blockReason(run,member,message,this.observe(member.target));
  }
  begin(run,member,message) {
    if(['user-choice','review'].includes(message.kind))return;
    const page=this.observe(member.target);
    message.handlingGate={message_id:message.message_id,documentId:page.documentId??null,turnId:page.turnId??null,
      observationSeq:page.observationSeq??0,userTurnId:page.userTurnId??null,
      assistantRevision:page.assistantRevision??0,userMessagesRevision:page.userMessagesRevision??0};
  }
  async observed(run,member) {
    // Retire only saved legacy UI gates whose own delivery is confirmed.
    // Never manufacture reply.observed: the model may still be answering.
    const uiGate=member.deliveryGate&&run.messages.find(m=>m.message_id===member.deliveryGate.message_id);
    if(['user-choice','review'].includes(uiGate?.kind)&&communicationMessageComplete(uiGate)){
      await this.c.enrollment.validate(member.target);
      delete member.deliveryGate;delete uiGate.handlingGate;
      this.c.event(run,'user_event.delivered',{participant_id:member.id,message_id:uiGate.message_id});
    }
    // A recipient may read several queued messages in one model turn. These
    // have no SDK delivery gate, but still need their own fresh idle evidence.
    for(const message of this.directlyHandled(run,member)){
      const baseline=message.yielded.page;
      if(!baseline)continue;
      const gate=message.handlingGate??={documentId:baseline.documentId,observationSeq:baseline.observationSeq??0};
      await this.observeDialogue(run,member,message,gate,true);
    }
    // Migrate the old single handling gate in memory; never replay its SDK.
    if(member.deliveryGate){
      const previous=run.messages.find(m=>m.message_id===member.deliveryGate.message_id);
      if(previous&&!['startup-context','user-choice','review'].includes(previous.kind)){
        previous.handlingGate??=member.deliveryGate;delete member.deliveryGate;
      }
    }
    for(const message of this.handledMessages(run,member)){
      if(message.dialogue_version===1){
        if(message.yielded)await this.observeDialogue(run,member,message,message.handlingGate);
        continue;
      }
      const gate=message.handlingGate,page=this.observe(member.target);
      const native=gate.turnId&&page.turnId&&gate.turnId!==page.turnId&&gate.userTurnId&&page.userTurnId&&gate.userTurnId!==page.userTurnId;
      const revisions=gate.documentId===page.documentId&&page.assistantRevision>gate.assistantRevision&&page.userMessagesRevision>gate.userMessagesRevision;
      if(page.stopped&&!page.busy&&(native||revisions)){
        message.reply_observed=true;delete message.handlingGate;
        this.c.event(run,'reply.observed',{participant_id:member.id,message_id:message.message_id});
      }
    }
  }
  directlyHandled(run,member){
    return run.messages.filter(m=>m.recipient_id===member.id&&m.scope_id===run.grant?.scope_id
      &&m.dialogue_version===1&&m.delivery==='pending'&&!m.intent&&m.read&&m.yielded&&!m.reply_observed&&!m.superseded);
  }
  handledMessages(run,member){return run.messages.filter(message=>message.handlingGate
    &&message.recipient_id===member.id&&message.scope_id===run.grant?.scope_id&&(message.delivery==='accepted'||message.resolved_by_read)
    &&(message.read||message.superseded_read)&&!message.reply_observed);}
  async observeDialogue(run,member,message,gate,direct=false){
    if(!this.permitted(run,member)||!(message.read||message.superseded_read)||!message.yielded
      ||(!direct&&message.delivery!=='accepted'&&!message.resolved_by_read))return;
    try{await this.c.enrollment.validate(member.target);}catch(error){
      // Only an already read/yielded terminal receipt can outlive its checkout.
      // This path is never used for enrollment, new sends or model API calls.
      if(error.code!=='PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'||member.role!=='E'||message.kind!=='acceptance'
        ||message.assignment_id!==member.target.assignment_id||message.scope_id!==member.target.scope_id||!this.c.verifyTerminal
        ||!await this.c.verifyTerminal(member.target,message))throw error;
    }
    const page=await this.reconcile(member.target);
    let baseline=gate.restoredBaseline??message.yielded.page;
    // The backend page reloaded this conversation itself: confirm the end of
    // the turn on the new document by two idle observations at least 2 s apart.
    if(page&&baseline&&!gate.restoredBaseline&&this.c.freshness.transferable(baseline.documentId,page)){
      const ready=page.stopped&&!page.busy&&page.canSend&&page.commandsIdle&&page.lastMessageRole==='assistant'&&page.turnIdentitySource==='native';
      const signature=JSON.stringify([page.documentId,page.turnId,page.assistantRevision]);
      if(!ready){delete gate.rebase;
        if(gate.wait_reason!=='rebase-waiting'){gate.wait_reason='rebase-waiting';this.c.event(run,'turn.waiting',{message_id:message.message_id,reason:'rebase-waiting'});}
        this.c.freshness.foreignTurn(run,member,message,gate,page);return;}
      if(gate.rebase?.signature!==signature){gate.rebase={signature,seq:page.observationSeq,at:this.c.now()};return;}
      if(page.observationSeq<=gate.rebase.seq||this.c.now()-gate.rebase.at<2000)return;
      message.reply_observed=true;
      if(member.deliveryGate?.message_id===message.message_id)delete member.deliveryGate;
      delete message.handlingGate;
      this.c.event(run,'freshness.rebased',{participant_id:member.id,message_id:message.message_id});
      this.c.event(run,'reply.observed',{participant_id:member.id,message_id:message.message_id,evidence:'rebased-fresh-idle'});
      return;
    }
    // Delivered before a reload of this page and handled after it: the gate follows its own document.
    if(page&&baseline&&gate.documentId!==page.documentId&&page.documentId===baseline.documentId
      &&this.c.freshness.transferable(gate.documentId,page))gate.documentId=page.documentId;
    // Read/yield survives a backend restart; the old page no longer exists.
    // Observe the restored, verified recipient twice, without inventing SDK
    // acceptance or replaying a message it already handled.
    if(page&&baseline&&page.documentId!==baseline.documentId
      &&message.yielded.backend_id!==this.c.backendId){
      if(!page.stopped||page.busy||!page.canSend||!page.commandsIdle)return;
      gate.restoredBaseline=structuredClone(page);gate.documentId=page.documentId;
      gate.observationSeq=page.observationSeq;gate.seenBusy=true;delete gate.idle;return;
    }
    if(!page||!baseline||page.documentId!==gate.documentId||page.documentId!==baseline.documentId
      ||page.observationSeq<=Math.max(gate.observationSeq,baseline.observationSeq??0))return;
    const reason=!page.commandsIdle?'commands-active':page.busy?'assistant-busy':!page.stopped?'page-unavailable'
      :!page.canSend?'draft-or-manual-stop':null;
    if(page.busy&&!gate.seenBusy){gate.seenBusy=true;this.c.event(run,'turn.busy',{message_id:message.message_id});}
    if(reason){
      if(gate.idle||gate.wait_reason!==reason){delete gate.idle;gate.wait_reason=reason;
        this.c.event(run,'turn.waiting',{message_id:message.message_id,reason});}
      return;
    }
    // A fresh read of the old idle bubble is not evidence of this turn ending.
    // When it stays so after yield, the turn ran on another client.
    if(!baseline.busy&&!gate.seenBusy&&page.assistantRevision<=baseline.assistantRevision){
      this.c.freshness.foreignTurn(run,member,message,gate,page);return;}
    const signature=JSON.stringify([page.documentId,page.turnId,page.assistantRevision]);
    if(gate.idle?.signature!==signature){
      gate.idle={signature,seq:page.observationSeq,at:this.c.now()};gate.wait_reason='confirming-idle';
      this.c.event(run,'turn.idle_candidate',{message_id:message.message_id});return;
    }
    if(page.observationSeq<=gate.idle.seq||this.c.now()-gate.idle.at<500)return;
    message.reply_observed=true;
    if(member.deliveryGate?.message_id===message.message_id)delete member.deliveryGate;
    delete message.handlingGate;
    this.c.event(run,'reply.observed',{participant_id:member.id,message_id:message.message_id,evidence:'read-yield-fresh-idle'});
  }
  syncProbes(run){
    if(this.c.disposed)return;
    const eligible=new Map(Object.values(run.members).flatMap(member=>{
      const gate=member.deliveryGate,message=run.messages.find(m=>m.message_id===gate?.message_id);
      return [...(message?.kind!=='user-choice'&&this.permitted(run,member)&&message?.dialogue_version===1&&message.yielded&&!message.reply_observed
        ?[[message.message_id,member]]:[]),
        ...(this.permitted(run,member)?[...this.directlyHandled(run,member),...this.handledMessages(run,member).filter(m=>m.dialogue_version===1&&m.yielded)].map(m=>[m.message_id,member]):[])];
    }));
    for(const [id,p] of this.turnProbes)if(p.runId===run.id&&!eligible.has(id)){clearTimeout(p.timer);this.turnProbes.delete(id);}
    for(const [id] of eligible){
      let p=this.turnProbes.get(id);if(p?.timer||p?.exhausted)continue;
      if(!p){p={runId:run.id,count:0,timer:null};this.turnProbes.set(id,p);}
      p.timer=setTimeout(async()=>{
        p.count++;p.exhausted=p.count>=120;
        try{await this.c.mutate('observed',{run_id:run.id,message_id:id});
          if(p.exhausted)await this.c.mutate('turnTimeout',{run_id:run.id,message_id:id});
        }catch{/* Identity/removal failures never authorize a new delivery. */}
        p.timer=null;
        if(!this.c.disposed){const current=this.c.runs.get(run.id);if(current)this.syncProbes(current);}
      },1000);p.timer.unref?.();
    }
  }
  timeout(input){
    const run=this.c.run(input),member=Object.values(run.members).find(m=>m.deliveryGate?.message_id===input.message_id);
    if(member){member.deliveryGate.wait_reason='physical-completion-unconfirmed';
      this.c.event(run,'turn.waiting',{message_id:input.message_id,reason:'physical-completion-unconfirmed'});}
    else {const message=run.messages.find(m=>m.message_id===input.message_id&&m.handlingGate&&!m.reply_observed);
      if(message){message.handlingGate.wait_reason='physical-completion-unconfirmed';
        this.c.event(run,'turn.waiting',{message_id:input.message_id,reason:'physical-completion-unconfirmed'});}}
    return {};
  }
  dispose(){for(const p of this.turnProbes.values())clearTimeout(p.timer);this.turnProbes.clear();this.observationSpans.clear();}
  async content(input) {
    const c=this.c;await c.ready;await c.tail;await c.enrollment.validateInput(input);
    const {run,member}=c.member(input),message=run.messages.find(m=>m.message_id===input.message_id);
    check(message?.recipient_id===member.id&&(message.context_ref===input.context_ref
      ||message.contexts?.some(c=>c.sha256===input.context_ref)),'READ_DENIED','Контекст недоступен этому назначению.');
    check(!message.superseded&&await this.currentMessage(member.target,message),'STALE_MESSAGE','Сигнал устарел. Не выполняйте прежнее решение; ожидайте актуальное поручение.');
    const text=c.store?await c.store.readContent(input.context_ref):this.contents.get(input.context_ref);
    check(typeof text==='string','CONTEXT','Сохранённый контекст недоступен.');
    const parts=[];let part='',bytes=0;
    for(const char of text){const size=Buffer.byteLength(char);if(bytes+size>12000){parts.push(part);part='';bytes=0;}part+=char;bytes+=size;}parts.push(part);
    const index=input.part??0;check(Number.isInteger(index)&&index>=0&&index<parts.length,'INPUT','Неверная часть контекста.');
    const source=message.contexts?.find(c=>c.sha256===input.context_ref);
    return {message_id:message.message_id,context_ref:input.context_ref,part:index,total:parts.length,text:parts[index],
      bytes:Buffer.byteLength(text),sha256:input.context_ref,...(source?{source:source.source,commit:source.commit}:{})};
  }
}
