import {createHash} from 'node:crypto';
import {workflowRunId} from './enrollment.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const check=(ok,code,message)=>{if(!ok)throw Object.assign(Error(message),{code:'PLUGIN_COMMUNICATION_'+code});};
export const STARTUP_INSTRUCTIONS='Это полный стартовый контекст сессии, не поручение реализации. Продолжай в этом же ходе. Прочитай текст включённой части (part); повторно её запрашивать не нужно. Все остальные части получи через workflow_communication_read_context с этим message_id/context_ref, part от 0 до total-1; независимые части можно запросить параллельно. Если текст части не включён, прочитай все части. После полного чтения вызови workflow_startup_complete с message_id и context_sha256=context_ref. Не подтверждай неполный пакет. Затем кратко подтверди восстановление проекта и заверши ход. Не вызывай assignment_yield, task:start или ожидание очереди; запуск плана разрешает пользователь.';
export function contextParts(text,limit=12000){
  const parts=[];let part='',bytes=0;
  for(const char of text){const size=Buffer.byteLength(char);if(bytes+size>limit){parts.push(part);part='';bytes=0;}part+=char;bytes+=size;}
  parts.push(part);return parts;
}

// A narrow pre-plan lane using durable messages and authenticated MCP reads.
// Old SDK packets retain their intent semantics. Neither path grants a plan.
export class StartupContext {
  constructor(communication){this.c=communication;}
  message(run,session){return run?.messages.findLast(m=>m.kind==='startup-context'&&m.recipient_session_id===session&&!m.superseded);}
  active(run,member){const m=this.message(run,member.target?.local_session_id);return ['O','E','S'].includes(member.role)&&!!m&&!m.cancelled&&!m.startup_complete;}
  ownsAttempt(m,owner){return m.kind==='startup-context'&&m.recipient_session_id===owner.local_session_id
    &&m.request_id===owner.request_id&&(m.attempt_generation??null)===(owner.attempt_generation??null);}
  cancelled(run,owner,reason){
    let participant_id=null;
    for(const m of run.messages.filter(m=>this.ownsAttempt(m,owner))){
      participant_id??=m.recipient_id;
      if(m.cancelled)continue;
      m.cancelled=true;m.cancelled_at=this.c.now();m.cancel_reason=reason;m.superseded=true;
      if(m.delivery==='pending')m.delivery='cancelled';
      this.c.event(run,'startup.cancelled',{message_id:m.message_id,request_id:m.request_id});
    }
    return {participant_id};
  }
  stage(target,input){return this.c.mutate('startupStage',{...input,target,run_id:workflowRunId(target)});}
  async staged(input){
    const c=this.c,{target,text,request_id}=input;
    check(['O','E','S'].includes(target.role),'MODE','Нужна зарегистрированная сессия стартового пакета.');
    check(typeof request_id==='string'&&request_id.length<=128&&request_id.length>0,'INPUT','Нет идентификатора старта.');
    check(typeof text==='string'&&text.trim()&&Buffer.byteLength(text)<=220000,'CONTEXT','Стартовый пакет пуст или слишком велик; он не обрезан.');
    const run=c.enrollment.ensureRun(target),digest=hash(text);
    check(!Object.values(run.enrollments).some(invitation=>invitation.target.local_session_id===target.local_session_id
      &&invitation.request_id===request_id&&(invitation.attempt_generation??null)===(input.attempt_generation??null)
      &&invitation.status==='revoked'),'STARTUP_CANCELLED','Приглашение этого стартового пакета отозвано.');
    const existing=run.messages.find(m=>m.kind==='startup-context'&&m.request_id===request_id&&m.recipient_session_id===target.local_session_id);
    if(existing){
      check(!existing.cancelled,'STARTUP_CANCELLED','Этот стартовый пакет отменён. Повтор не возобновляет его.');
      check((existing.attempt_generation??null)===(input.attempt_generation??null),'CONFLICT','Поколение стартового пакета изменилось.');
      check(existing.context_ref===digest,'CONFLICT','Нельзя заменить сохранённый стартовый пакет.');
      if(existing.superseded&&!existing.intent){existing.superseded=false;existing.delivery='pending';
        c.event(run,'startup.resumed',{message_id:existing.message_id});}
      return this.view(existing);
    }
    const old=this.message(run,target.local_session_id);
    check(!old||(!old.intent&&!old.read)||old.startup_complete,'CONFLICT','Исход прежней отправки не подтверждён. Повтор запрещён.');
    check(run.messages.length<2048,'LIMIT','Достигнут лимит сообщений.');
    const ref=c.store?await c.store.putContent(text):digest;
    if(!c.store)c.workflow.contents.set(ref,text);
    if(old&&!old.startup_complete){old.superseded=true;old.delivery='superseded';}
    const member=Object.values(run.members).find(m=>m.target.local_session_id===target.local_session_id);
    const message={message_id:c.makeId(),kind:'startup-context',service:true,sender_role:'backend',sender_id:null,
      recipient_id:member?.id??null,recipient_session_id:target.local_session_id,scope_id:target.scope_id,
      assignment_id:target.assignment_id??null,task_id:target.task_id??null,request_id,attempt_generation:input.attempt_generation??null,
      context_ref:ref,context_bytes:Buffer.byteLength(text),
      total_parts:contextParts(text,24000).length,parts_read:[],body:'Стартовый контекст сессии',
      delivery_mode:input.delivery_mode??'model-pull',delivery:'pending',read:false,reply_observed:false,created_at:new Date(c.now()).toISOString()};
    run.messages.push(message);c.event(run,'startup.prepared',{message_id:message.message_id,participant_id:member?.id??null,
      context_bytes:message.context_bytes,total_parts:message.total_parts});return this.view(message);
  }
  view(m){return m?{message_id:m.message_id,request_id:m.request_id,delivery:m.delivery,read:m.read,
    delivery_mode:m.delivery_mode??'sdk-notification',complete:!!m.startup_complete,cancelled:!!m.cancelled,
    superseded:!!m.superseded,parts_read:m.parts_read.length,total_parts:m.total_parts,
    ...(m.startup_complete?{completion:{id:'startup:'+m.message_id,at:m.startup_completed_at??null}}:{})}:null;}
  progress(sessionId,requestId){
    if(this.c.removedSessions.has(sessionId))return null;
    const match=m=>m.kind==='startup-context'&&m.recipient_session_id===sessionId&&m.request_id===requestId;
    const target=this.c.enrollment.resolveTarget?.(sessionId);
    if(target)return this.view(this.c.readableRun(workflowRunId(target))?.messages.findLast(match));
    // A closed plan detaches the participant, but a confirmed startup stays confirmed.
    for(const id of this.c.runs.keys()){const m=this.c.readableRun(id)?.messages.findLast(match);if(m?.startup_complete)return this.view(m);}
    return null;
  }
  async own(input){
    const {run,member}=this.c.member(input),m=run.messages.find(m=>m.message_id===input.message_id);
    check(['O','E','S'].includes(member.role)&&m?.kind==='startup-context'&&m.recipient_id===member.id,'READ_DENIED','Стартовый пакет недоступен этому разговору.');
    check(!m.cancelled,'STARTUP_CANCELLED','Стартовый пакет отменён. Дальнейшее чтение и подтверждение запрещены.');
    check(!m.superseded&&await this.c.workflow.currentMessage(member.target,m),
      'STALE_MESSAGE','Стартовый пакет устарел. Не подтверждайте его; обновите контекст проекта.');
    return {run,member,m};
  }
  async part(input){
    const {run,m}=await this.own(input);
    check(m.read&&input.context_ref===m.context_ref,'READ_DENIED','Сначала прочитайте адресное стартовое сообщение.');
    return this.returnPart(run,m,input.part??0);
  }
  async open(input){
    const {run,member,m}=await this.own(input);
    check(m.delivery_mode==='model-pull'&&!m.intent,'MODE','Начатую SDK-доставку нельзя заменить прямым чтением.');
    if(!m.read){m.read=true;this.c.event(run,'message.read',{message_id:m.message_id,participant_id:member.id});}
    // One durable transaction owns the receipt and first part. A lost tool
    // response is retried as a read, never as a second model notification.
    const result=await this.returnPart(run,m,0);
    this.c.event(run,'startup.open_returned',{message_id:m.message_id,participant_id:member.id});
    return {...result,complete:!!m.startup_complete};
  }
  async returnPart(run,m,index){
    const text=this.c.store?await this.c.store.readContent(m.context_ref):this.c.workflow.contents.get(m.context_ref);
    check(typeof text==='string'&&hash(text)===m.context_ref,'CONTEXT','Сохранённый контекст повреждён.');
    const parts=contextParts(text,24000);
    check(Number.isInteger(index)&&index>=0&&index<parts.length,'INPUT','Неверная часть контекста.');
    if(!m.parts_read.includes(index)){m.parts_read.push(index);this.c.event(run,'startup.part_returned',{
      message_id:m.message_id,part:index,total_parts:parts.length});}
    return {message_id:m.message_id,context_ref:m.context_ref,sha256:m.context_ref,part:index,total:parts.length,
      bytes:m.context_bytes,text:parts[index],instructions:STARTUP_INSTRUCTIONS};
  }
  async completed(input){
    const {run,member,m}=await this.own(input);
    check(input.context_sha256===m.context_ref,'CONTEXT','Digest не совпадает со стартовым пакетом.');
    check(m.read&&m.parts_read.length===m.total_parts,'INCOMPLETE','Прочитайте все части стартового контекста перед подтверждением.');
    if(!m.startup_complete){m.startup_complete=true;m.startup_completed_at=new Date(this.c.now()).toISOString();
      if(member.deliveryGate?.message_id===m.message_id)delete member.deliveryGate;
      this.c.event(run,'startup.complete',{message_id:m.message_id,participant_id:member.id,total_parts:m.total_parts});}
    return {...this.view(m),instructions:'Контекст полностью получен и подтверждён. Кратко сообщите о восстановлении проекта. Выполнение плана не разрешено этим подтверждением.'};
  }
}
