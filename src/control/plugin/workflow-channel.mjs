import {createHash} from 'node:crypto';
import {workflowRunId} from './enrollment.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,message)=>Object.assign(new Error(message),{code:'PLUGIN_COMMUNICATION_'+code});
const check=(value,code,message)=>{if(!value)throw fail(code,message);};
const LEASE_MS=60000;
const kinds=new Set(['assignment-start','continue','question','decision','result','integration','finalization','diagnostic']);

// Plan permission is durable. A short panel lease only proves a live SDK; it
// never asks the user to renew that permission or authorizes another scope.
export class WorkflowChannel {
  constructor(communication,{observe=()=>({canSend:false}),admit=async()=>false,currentMessage=async()=>true}={}) {
    Object.assign(this,{c:communication,observe,admit,currentMessage});this.contents=new Map();
  }
  async superseded(run,member,message){
    if(message.superseded)return true;
    if(await this.currentMessage(member.target,message))return false;
    message.superseded=true;
    if(!message.intent){message.reply_observed=true;message.delivery='superseded';}
    else {message.read=true;this.observed(run,member);}
    this.c.event(run,'message.superseded',{participant_id:member.id,message_id:message.message_id,block_id:message.block_id});
    return true;
  }
  grant(target,phase='running') {return this.c.mutate('grant',{run_id:workflowRunId(target),target,phase});}
  _grant({target,phase}) {
    const c=this.c;
    check(target.role==='O'&&target.scope_id,'MODE','Нужен опубликованный план своего оркестратора.');
    check(['running','pausing','paused','complete'].includes(phase),'INPUT','Неизвестное состояние плана.');
    const run=c.enrollment.ensureRun(target),active=['running','pausing'].includes(phase),old=run.grant;
    if(old?.scope_id===target.scope_id&&old.phase===phase&&old.active===active&&old.boot===c.backendId)return this.state(run);
    const generation=Math.max(old?.generation??0,...Object.values(run.members).map(m=>m.generation))+1;
    run.grant={scope_id:target.scope_id,generation,phase,active,boot:c.backendId};
    for(const member of Object.values(run.members)){member.generation=generation;member.stopped=!active;
      if(member.role==='O')member.target.scope_id=target.scope_id;}
    c.event(run,'plan.permission',{scope_id:target.scope_id,permission_generation:generation,phase,active});
    return this.state(run);
  }
  state(run){return {scope_id:run.grant?.scope_id??null,phase:run.grant?.phase??'not-started',active:run.grant?.active===true};}
  permitted(run,member) {
    return run.grant?.active===true&&run.grant.boot===this.c.backendId&&!member.stopped
      &&(member.role==='O'||member.target.scope_id===run.grant.scope_id);
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
      for(const m of Object.values(run.members)){m.stopped=true;m.generation=run.grant.generation;}
      c.event(run,'plan.revoked',{participant_id:member.id,scope_id:run.grant.scope_id});
    }
    return {...c._status(input),stop_applied:true};
  }
  async enqueue(target,{key,kind,text,source=null,block_id=null,signal_id=null}) {
    return this.c.mutate('enqueue',{run_id:workflowRunId(target),target,key,kind,text,source,block_id,signal_id});
  }
  async _enqueue(input) {
    const c=this.c,run=c.run(input),target=input.target;
    check(run.mode==='workflow'&&target.scope_id===run.grant?.scope_id,'ASSIGNMENT_CHANGED','Назначение относится к другому плану.');
    check(typeof input.key==='string'&&input.key.length>0&&input.key.length<=240&&kinds.has(input.kind),'INPUT','Неверный конверт рабочего сообщения.');
    check(typeof input.text==='string'&&input.text.trim()&&Buffer.byteLength(input.text)<=1048576,'CONTEXT','Контекст пуст или превышает допустимый размер; он не обрезан.');
    const fingerprint=hash(JSON.stringify([target.local_session_id,target.assignment_id,input.kind,input.text,input.block_id,input.signal_id]));
    const existing=run.messages.find(m=>m.idempotency_key===input.key);
    if(existing){check(existing.fingerprint===fingerprint,'CONFLICT','Ключ события уже использован для другого поручения.');return this.receipt(existing);}
    check(run.grant.active,'STOPPED','Выполнение плана приостановлено.');
    check(run.messages.length<2048,'LIMIT','Достигнут лимит сообщений плана.');
    const ref=c.store?await c.store.putContent(input.text):hash(input.text);
    if(!c.store)this.contents.set(ref,input.text);
    await c.enrollment.validate(target);
    const recipient=Object.values(run.members).find(m=>m.target.local_session_id===target.local_session_id);
    const source=input.source&&Object.values(run.members).find(m=>m.target.local_session_id===input.source.local_session_id);
    const message={message_id:c.makeId(),recipient_id:recipient?.id??null,recipient_session_id:target.local_session_id,
      sender_id:source?.id??null,sender_role:input.source?.role??'backend',scope_id:target.scope_id,
      assignment_id:target.assignment_id??input.source?.assignment_id??null,task_id:target.task_id??input.source?.task_id??null,
      kind:input.kind,block_id:input.block_id,signal_id:input.signal_id,context_ref:ref,
      body:input.kind+(target.task_id?' · '+target.task_id:''),idempotency_key:input.key,fingerprint,
      delivery:'pending',read:false,reply_observed:false,created_at:new Date(c.now()).toISOString()};
    run.messages.push(message);c.event(run,'message.persisted',{message_id:message.message_id,participant_id:recipient?.id??null,
      assignment_id:message.assignment_id,task_id:message.task_id,kind:message.kind,scope_id:message.scope_id});
    return this.receipt(message);
  }
  receipt(message){return {message_id:message.message_id,delivery:message.delivery,read:message.read,reply_observed:message.reply_observed===true};}
  pending(run,member) {
    if(!this.permitted(run,member)||member.deliveryGate||!this.observe(member.target).canSend)return null;
    const first=run.messages.find(m=>m.recipient_id===member.id&&m.scope_id===run.grant.scope_id&&!m.reply_observed);
    return first?.delivery==='pending'&&!first.read?first:null;
  }
  async canClaim(run,member,message) {
    if(this.pending(run,member)?.message_id!==message.message_id)return false;
    return await this.admit(member.target)===true&&this.observe(member.target).canSend===true;
  }
  begin(run,member,message) {
    const page=this.observe(member.target);
    member.deliveryGate={message_id:message.message_id,documentId:page.documentId??null,turnId:page.turnId??null,
      userTurnId:page.userTurnId??null,assistantRevision:page.assistantRevision??0,userMessagesRevision:page.userMessagesRevision??0};
  }
  observed(run,member) {
    const gate=member.deliveryGate;if(!gate)return;
    const page=this.observe(member.target);
    const native=gate.turnId&&page.turnId&&gate.turnId!==page.turnId&&gate.userTurnId&&page.userTurnId&&gate.userTurnId!==page.userTurnId;
    const revisions=gate.documentId===page.documentId&&page.assistantRevision>gate.assistantRevision&&page.userMessagesRevision>gate.userMessagesRevision;
    if(page.stopped&&!page.busy&&(native||revisions)){
      const message=run.messages.find(m=>m.message_id===gate.message_id);
      if(message?.read&&message.delivery==='accepted'){
        message.reply_observed=true;delete member.deliveryGate;
        this.c.event(run,'reply.observed',{participant_id:member.id,message_id:message.message_id});
      }
    }
  }
  async content(input) {
    const c=this.c;await c.ready;await c.tail;await c.enrollment.validateInput(input);
    const {run,member}=c.member(input),message=run.messages.find(m=>m.message_id===input.message_id);
    check(message?.recipient_id===member.id&&message.context_ref===input.context_ref,'READ_DENIED','Контекст недоступен этому назначению.');
    check(!message.superseded&&await this.currentMessage(member.target,message),'STALE_MESSAGE','Сигнал устарел. Не выполняйте прежнее решение; ожидайте актуальное поручение.');
    const text=c.store?await c.store.readContent(message.context_ref):this.contents.get(message.context_ref);
    check(typeof text==='string','CONTEXT','Сохранённый контекст недоступен.');
    const parts=[];let part='',bytes=0;
    for(const char of text){const size=Buffer.byteLength(char);if(bytes+size>12000){parts.push(part);part='';bytes=0;}part+=char;bytes+=size;}parts.push(part);
    const index=input.part??0;check(Number.isInteger(index)&&index>=0&&index<parts.length,'INPUT','Неверная часть контекста.');
    return {message_id:message.message_id,context_ref:message.context_ref,part:index,total:parts.length,text:parts[index],
      bytes:Buffer.byteLength(text),sha256:message.context_ref};
  }
}
