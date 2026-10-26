import {createHash} from 'node:crypto';
import {workflowRunId} from './enrollment.mjs';
import {communicationMessageComplete} from '../../contracts/plugin-communication.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,message)=>Object.assign(new Error(message),{code:'PLUGIN_COMMUNICATION_'+code});
const check=(value,code,message)=>{if(!value)throw fail(code,message);};
const LEASE_MS=60000;
const kinds=new Set(['assignment-start','continue','question','decision','result','integration','finalization','diagnostic','ready','recovery','user-choice']);
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
  grant(target,phase='running',guard={}) {return this.c.mutate('grant',{run_id:workflowRunId(target),target,phase,...guard});}
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
  livePanel(run,member){return [...this.c.panels.values()].some(p=>this.panelIssue(run,member,p)===null);}
  progress(sessionId) {
    const c=this.c,target=c.enrollment.resolveTarget?.(sessionId);
    if(!target||c.removedSessions.has(sessionId))return null;
    const run=c.runs.get(workflowRunId(target));if(run?.removed)return null;
    const member=Object.values(run?.members??{}).find(m=>['project_id','local_session_id','origin_session_id','role','scope_id','assignment_id','task_id']
      .every(key=>(m.target[key]??null)===(target[key]??null)));
    const sdk=!!member&&this.livePanel(run,member);
    const initial=run?.messages.findLast(m=>m.recipient_session_id===sessionId&&m.scope_id===target.scope_id
      &&m.assignment_id===target.assignment_id&&['assignment-start','task','revision_request'].includes(m.kind)&&!m.superseded);
    const dialogue=run?.messages.filter(m=>m.assignment_id===target.assignment_id&&m.scope_id===target.scope_id&&!m.superseded)??[];
    const question=dialogue.findLast(m=>m.blocking&&m.kind==='question');
    const blocked=!!question&&!dialogue.some(m=>m.kind==='decision'&&m.resume&&m.block_id===question.block_id);
    const incoming=run?.messages.find(m=>m.recipient_session_id===sessionId&&m.scope_id===target.scope_id
      &&!communicationMessageComplete(m));
    const readAt=incoming&&run.events.findLast(e=>e.event_type==='message.read'&&e.message_id===incoming.message_id)?.server_time;
    const acceptedAt=incoming&&run.events.findLast(e=>e.event_type==='send.report'&&e.message_id===incoming.message_id&&e.outcome==='accepted')?.server_time;
    // A previous UI decision can belong to the unpublished scope and still
    // occupy this same recipient's lane. Describe that actual gate, not only
    // the newer result waiting behind it. Never project message text/identity.
    const gate=member?.deliveryGate;
    const gated=gate&&run.messages.find(m=>m.message_id===gate.message_id);
    const page=member?this.observe(member.target):null;
    const blocker=gated&&this.gatePending(run,member)?{message_id:gated.message_id,kind:gated.kind,
      scope_id:gated.scope_id??null,task_id:gated.task_id??null,read:!!(gated.read||gated.superseded_read),delivery:gated.delivery,
      reason:page?.manualStopped?'manual-stop':page?.commandsIdle===false?'commands-active':page?.busy?'recipient-busy'
        :gate.wait_reason??'physical-completion-unconfirmed',created_at:gated.created_at}:null;
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
        handled:!!incoming.yielded,delivery:incoming.delivery,reason:incoming.claim_wait_reason??null}}:{}),
      ...(draft?{draft:{phase:draft.phase}}:{}),
      initial:initial?{message_id:initial.message_id,delivery:initial.delivery,read:initial.read,handled:!!initial.yielded,physical_complete:!!initial.reply_observed}:null};
  }
  permitted(run,member) {
    return ['O','E'].includes(member.role)&&run.grant?.active===true&&run.grant.boot===this.c.backendId&&!member.stopped
      &&(member.role==='O'||member.target.scope_id===run.grant.scope_id);
  }
  // The user's choice is delivered without the plan permission: no plan, paused or complete.
  choicePending(run,member){return run.messages.some(m=>m.kind==='user-choice'&&m.recipient_id===member.id&&!communicationMessageComplete(m));}
  transportPermitted(run,member){return this.permitted(run,member)||this.c.startup.active(run,member)||this.choicePending(run,member);}
  first(run,member){return run.messages.find(m=>m.recipient_id===member.id&&!communicationMessageComplete(m)
    &&(m.kind==='startup-context'||m.kind==='user-choice'||m.scope_id===run.grant?.scope_id));}
  gatePending(run,member){
    if(!member.deliveryGate)return false;
    const message=run.messages.find(m=>m.message_id===member.deliveryGate.message_id);
    return message?.kind==='user-choice'?!communicationMessageComplete(message)
      :!message?.reply_observed&&!message?.startup_complete;
  }
  attach(run,member) {
    if(run.grant){member.generation=run.grant.generation;member.stopped=!run.grant.active;}
    for(const message of run.messages)if(message.recipient_session_id===member.target.local_session_id&&!message.recipient_id)
      message.recipient_id=member.id;
  }
  sync(input) {
    const c=this.c,{run,member,panel}=c.panel(input);
    check(run.mode==='workflow','MODE','Эта операция относится к рабочему плану.');
    panel.messageSupported=input.message_supported===true;
    panel.generation=member.generation;panel.expiresAt=c.now()+LEASE_MS;
    return c._status(input);
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
    const choice=input.kind==='user-choice';
    check(run.mode==='workflow'&&(choice||target.scope_id===run.grant?.scope_id),'ASSIGNMENT_CHANGED','Назначение относится к другому плану.');
    check(typeof input.key==='string'&&input.key.length>0&&input.key.length<=240&&kinds.has(input.kind),'INPUT','Неверный конверт рабочего сообщения.');
    check(typeof input.text==='string'&&input.text.trim()&&Buffer.byteLength(input.text)<=1048576,'CONTEXT','Контекст пуст или превышает допустимый размер; он не обрезан.');
    if(input.ui_event)check(choice&&input.ui_event.type==='review-preference'&&typeof input.ui_event.id==='string'
      &&Number.isSafeInteger(input.ui_event.revision)&&input.ui_event.revision>0&&typeof input.ui_event.enabled==='boolean'
      &&input.ui_event.recipient_session_id===target.local_session_id,'INPUT','Некорректное событие Review.');
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
    ...(message.dialogue_version===1?{operation_id:message.kit_receipt?.operation_id,assignment_id:message.assignment_id,attempt:message.attempt,
      handled:!!message.yielded,result:message.kit_receipt?.result??null,acceptance:message.kit_receipt?.acceptance??null,
      block_id:message.block_id??null,problem_id:message.problem_id??null,repair_attempt:message.repair_attempt??null,
      escalation_required:message.escalation_required===true,...deliveryStage(message)}:{})};}
  pending(run,member) {
    if(!this.transportPermitted(run,member)||this.gatePending(run,member)||!this.observe(member.target).canSend)return null;
    const first=this.first(run,member);
    return first?.delivery==='pending'&&!first.read&&first.delivery_mode!=='model-pull'?first:null;
  }
  async admit(target,message){
    const result=await this.admission(target,message);
    return result===true||result?.allowed===true;
  }
  physicalBlock(target){
    const page=this.observe(target);
    return page.manualStopped?'manual-stop':page.draftPresent?'recipient-draft':
      page.busy?'recipient-busy':!page.canSend?'recipient-unavailable':null;
  }
  async claimBlockReason(run,member,message) {
    if(message.kind!=='startup-context'&&this.c.startup.active(run,member))return 'previous-message';
    if(this.gatePending(run,member))return 'previous-turn';
    const first=this.first(run,member);
    if(first?.message_id!==message.message_id)return 'previous-message';
    const physical=this.physicalBlock(member.target);if(physical)return physical;
    if(!(message.kind==='startup-context'?this.c.startup.active(run,member):message.kind==='user-choice'||this.permitted(run,member)))return 'admission-denied';
    const admitted=await this.admission(member.target,message);
    if(admitted!==true&&admitted?.allowed!==true)return admitted?.reason==='commands-active'?'commands-active':'admission-denied';
    return this.physicalBlock(member.target);
  }
  begin(run,member,message) {
    if(message.kind==='user-choice')return; // FIFO owns delivery until read; no model-turn gate.
    const page=this.observe(member.target);
    member.deliveryGate={message_id:message.message_id,documentId:page.documentId??null,turnId:page.turnId??null,
      observationSeq:page.observationSeq??0,
      userTurnId:page.userTurnId??null,assistantRevision:page.assistantRevision??0,userMessagesRevision:page.userMessagesRevision??0};
  }
  async observed(run,member) {
    // Retire only saved legacy UI gates whose own delivery is confirmed.
    // Never manufacture reply.observed: the model may still be answering.
    const uiGate=member.deliveryGate&&run.messages.find(m=>m.message_id===member.deliveryGate.message_id);
    if(uiGate?.kind==='user-choice'&&communicationMessageComplete(uiGate)){
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
    const gate=member.deliveryGate;if(!gate)return;
    const message=run.messages.find(m=>m.message_id===gate.message_id);
    if(message?.kind==='startup-context')return; // Explicit all-parts receipt closes this lane, not an inferred model reply.
    if(message?.kind==='user-choice')return; // Uncertain/unread UI delivery remains a barrier.
    if(message?.dialogue_version===1)return this.observeDialogue(run,member,message,gate);
    const page=this.observe(member.target);
    const native=gate.turnId&&page.turnId&&gate.turnId!==page.turnId&&gate.userTurnId&&page.userTurnId&&gate.userTurnId!==page.userTurnId;
    const revisions=gate.documentId===page.documentId&&page.assistantRevision>gate.assistantRevision&&page.userMessagesRevision>gate.userMessagesRevision;
    if(page.stopped&&!page.busy&&(native||revisions)){
      const message=run.messages.find(m=>m.message_id===gate.message_id);
      if((message?.read||message?.superseded_read)&&message.delivery==='accepted'){
        message.reply_observed=true;delete member.deliveryGate;
        this.c.event(run,'reply.observed',{participant_id:member.id,message_id:message.message_id});
      }
    }
  }
  directlyHandled(run,member){
    return run.messages.filter(m=>m.recipient_id===member.id&&m.scope_id===run.grant?.scope_id
      &&m.dialogue_version===1&&m.delivery==='pending'&&!m.intent&&m.read&&m.yielded&&!m.reply_observed&&!m.superseded);
  }
  async observeDialogue(run,member,message,gate,direct=false){
    if(!this.permitted(run,member)||!(message.read||message.superseded_read)||!message.yielded
      ||(!direct&&message.delivery!=='accepted'))return;
    try{await this.c.enrollment.validate(member.target);}catch(error){
      // Only an already read/yielded terminal receipt can outlive its checkout.
      // This path is never used for enrollment, new sends or model API calls.
      if(error.code!=='PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'||member.role!=='E'||message.kind!=='acceptance'
        ||message.assignment_id!==member.target.assignment_id||message.scope_id!==member.target.scope_id||!this.c.verifyTerminal
        ||!await this.c.verifyTerminal(member.target,message))throw error;
    }
    const page=await this.reconcile(member.target);
    let baseline=gate.restoredBaseline??message.yielded.page;
    // Read/yield survives a backend restart; the old page no longer exists.
    // Observe the restored, verified recipient twice, without inventing SDK
    // acceptance or replaying a message it already handled.
    if(direct&&page&&baseline&&page.documentId!==baseline.documentId
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
    if(!baseline.busy&&!gate.seenBusy&&page.assistantRevision<=baseline.assistantRevision)return;
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
        ...(this.permitted(run,member)?this.directlyHandled(run,member).map(m=>[m.message_id,member]):[])];
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
    else if(run.messages.some(m=>m.message_id===input.message_id&&m.handlingGate&&!m.reply_observed))
      this.c.event(run,'turn.waiting',{message_id:input.message_id,reason:'physical-completion-unconfirmed'});
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
