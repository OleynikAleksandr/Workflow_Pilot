import { createHash, randomUUID } from 'node:crypto';

export const COMMUNICATION_PROTOCOL = 1;
export const COMMUNICATION_BUILD = 'communication-v1-t001';
const fail = (code, message) => Object.assign(new Error(message), {code:'PLUGIN_COMMUNICATION_'+code});
const requireValue = (yes, code, message) => { if (!yes) throw fail(code,message); };
const identifier = value => typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const uuid = value => typeof value==='string' && /^[0-9a-f-]{36}$/i.test(value);
export function communicationIdentity(metadata) {
  requireValue(typeof metadata?.['openai/session']==='string' && metadata['openai/session'].length>0
    && metadata['openai/session'].length<=512,'IDENTITY_REQUIRED','Хост не передал привязку текущего разговора. Отправка запрещена.');
  return createHash('sha256').update(JSON.stringify(['openai/organization','openai/subject','openai/session']
    .map(key=>typeof metadata[key]==='string' && metadata[key].length<=512?metadata[key]:''))).digest('hex');
}

// Control owns the protocol; it does not access profiles, files, projects or the SDK.
// T001 is intentionally volatile. Persistence and crash recovery follow in T002.
export class PluginCommunication {
  constructor({now=Date.now,uuid:makeId=randomUUID,waitMs=25000}={}) {
    Object.assign(this,{now,makeId,waitMs});
    this.runs=new Map();this.panels=new Map();this.waiters=new Map();this.probes=new Map();
    this.backendId=makeId();
  }
  event(run,type,fields={}) {
    const entry={schema_version:1,event_id:this.makeId(),seq:run.events.length+1,run_id:run.id,
      component:'control',event_type:type,severity:'info',server_time:new Date(this.now()).toISOString(),
      backend_instance_id:this.backendId,...fields};
    run.events.push(entry);
    for(const waiter of this.waiters.values())if(waiter.run===run)waiter.wake();
    return entry;
  }
  run(input) {
    requireValue(identifier(input.run_id),'INPUT','Некорректный запуск.');
    const run=this.runs.get(input.run_id);
    requireValue(run,'RUN_REQUIRED','Сначала участник должен вызвать join.');return run;
  }
  member(input) {
    const run=this.run(input),identity=communicationIdentity(input.metadata);
    const member=Object.values(run.members).find(item=>item.id===input.participant_id);
    requireValue(member && member.identity===identity,'BINDING','Участник не принадлежит текущему разговору.');
    return {run,member};
  }
  panel(input) {
    const context=this.member(input),panel=this.panels.get(input.panel_instance_id);
    requireValue(panel && panel.runId===context.run.id && panel.memberId===context.member.id
      && panel.identity===context.member.identity,'BINDING','Подтвердите привязку этого экземпляра панели.');
    requireValue(input.protocol_version===COMMUNICATION_PROTOCOL && input.build_id===COMMUNICATION_BUILD,
      'VERSION','Панель устарела. Переоткройте панель Workflow Pilot.');
    return {...context,panel};
  }
  allowed(input) {
    const context=this.panel(input),{member,panel}=context;
    requireValue(!member.stopped && panel.expiresAt>this.now() && panel.generation===member.generation
      && input.permission_generation===member.generation,'STOPPED','Связь остановлена или срок разрешения истёк.');
    return context;
  }
  join(input) {
    requireValue(identifier(input.run_id) && ['O','E'].includes(input.role),'INPUT','Укажите run_id и роль O/E.');
    const identity=communicationIdentity(input.metadata);
    let run=this.runs.get(input.run_id);
    if(!run) {
      run={id:input.run_id,members:{},messages:[],events:[]};this.runs.set(run.id,run);
      this.event(run,'backend.start',{build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL});
    }
    const previous=run.members[input.role];
    requireValue(!previous || previous.identity===identity,'BINDING','Роль уже занята другим разговором.');
    requireValue(!Object.values(run.members).some(m=>m.role!==input.role && m.identity===identity),
      'BINDING','Второй участник должен находиться в отдельном разговоре.');
    const member=previous??{id:this.makeId(),role:input.role,identity,generation:0,stopped:true};
    run.members[input.role]=member;
    this.event(run,'join.confirmed',{participant_id:member.id,conversation_key:identity});
    return {run_id:run.id,participant_id:member.id,role:member.role,conversation_key:identity,
      protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
  }
  bind(input) {
    const {run,member}=this.member(input);
    requireValue(uuid(input.panel_instance_id),'INPUT','Некорректный экземпляр панели.');
    requireValue(input.protocol_version===COMMUNICATION_PROTOCOL && input.build_id===COMMUNICATION_BUILD,
      'VERSION','Несовместимая версия панели.');
    const previous=this.panels.get(input.panel_instance_id);
    requireValue(!previous || previous.runId===run.id && previous.memberId===member.id,'BINDING','Панель уже связана с другим участником.');
    if(!previous)this.panels.set(input.panel_instance_id,{runId:run.id,memberId:member.id,identity:member.identity,generation:0,expiresAt:0});
    this.event(run,'binding.confirmed',{participant_id:member.id,panel_instance_id:input.panel_instance_id});
    return this.status(input);
  }
  status(input) {
    const {run,member}=this.member(input),panel=this.panels.get(input.panel_instance_id);
    return {run_id:run.id,participant_id:member.id,role:member.role,conversation_key:member.identity,
      protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
      permission_generation:member.generation,stopped:member.stopped,
      expires_at:panel?.runId===run.id && panel.memberId===member.id?panel.expiresAt:0,
      seq:run.events.length,messages:run.messages.filter(m=>m.recipient_id===member.id||m.sender_id===member.id)
        .map(({idempotency_key,...message})=>structuredClone(message))};
  }
  enable(input) {
    const {run,member,panel}=this.panel(input);
    requireValue(input.message_supported===true,'UNSUPPORTED','Хост не предоставил openai/message.');
    member.generation++;member.stopped=false;panel.generation=member.generation;panel.expiresAt=this.now()+600000;
    this.event(run,'permission.enabled',{participant_id:member.id,panel_instance_id:input.panel_instance_id,
      permission_generation:member.generation,expires_at:panel.expiresAt});
    return this.status(input);
  }
  stop(input) {
    const {run,member}=this.panel(input);member.stopped=true;member.generation++;
    for(const [key,probe] of this.probes)if(probe.run===run && probe.member===member) {
      clearTimeout(probe.timer);this.probes.delete(key);this.event(run,'probe.cancelled',{participant_id:member.id});
    }
    this.event(run,'stop.confirmed',{participant_id:member.id,permission_generation:member.generation});
    return this.status(input);
  }
  send(input) {
    const {run,member}=this.member(input),recipient=Object.values(run.members).find(m=>m.id===input.recipient_id);
    requireValue(recipient && recipient!==member && ['question','answer','result'].includes(input.kind),'INPUT','Некорректный адресат или вид сообщения.');
    requireValue(typeof input.body==='string' && input.body.trim() && Buffer.byteLength(input.body)<=4096
      && identifier(input.idempotency_key),'INPUT','Сообщение должно содержать до 4096 байт и ключ идемпотентности.');
    const parent=run.messages.find(m=>m.message_id===input.in_reply_to);
    requireValue(input.kind==='question'?!input.in_reply_to:parent && parent.recipient_id===member.id && parent.sender_id===recipient.id,
      'REPLY','Ответ должен ссылаться на полученное сообщение другого участника.');
    const value={sender_id:member.id,recipient_id:recipient.id,kind:input.kind,body:input.body,in_reply_to:input.in_reply_to??null};
    const existing=run.messages.find(m=>m.sender_id===member.id && m.idempotency_key===input.idempotency_key);
    if(existing) {
      requireValue(Object.keys(value).every(key=>value[key]===existing[key]),'CONFLICT','Ключ идемпотентности уже использован с другим содержимым.');
      this.event(run,'message.duplicate',{message_id:existing.message_id});return {message_id:existing.message_id,duplicate:true};
    }
    return this.enqueue(run,member,value,input.idempotency_key);
  }
  enqueue(run,member,value,idempotencyKey) {
    const message={...value,run_id:run.id,message_id:this.makeId(),created_at:new Date(this.now()).toISOString(),
      idempotency_key:idempotencyKey,delivery:'pending',read:false};
    run.messages.push(message);this.event(run,'message.queued',{participant_id:member.id,message_id:message.message_id});
    return {message_id:message.message_id};
  }
  probe(input) {
    const {run,member}=this.member(input);
    requireValue(Number.isSafeInteger(input.delay_ms) && input.delay_ms>=25 && input.delay_ms<=60000,'INPUT','Задержка probe: от 25 до 60000 мс.');
    requireValue(!member.stopped,'STOPPED','Сначала включите связь в подтверждённой панели.');
    const key=run.id+':'+member.id;
    requireValue(!this.probes.has(key),'PROBE_PENDING','Одна probe уже ожидает.');
    const due=this.now()+input.delay_ms,generation=member.generation;
    const timer=setTimeout(()=>{
      this.probes.delete(key);
      if(member.stopped||member.generation!==generation)return;
      this.event(run,'probe.fired',{participant_id:member.id});
      this.enqueue(run,member,{sender_id:member.id,recipient_id:member.id,kind:'probe',body:'Контрольное сообщение Workflow Pilot',in_reply_to:null},this.makeId());
    },input.delay_ms);timer.unref?.();
    this.probes.set(key,{run,member,timer});this.event(run,'probe.scheduled',{participant_id:member.id,due_at:due});
    return {due_at:due};
  }
  async wait(input,signal) {
    const {run,member}=this.allowed(input),key=input.panel_instance_id;
    requireValue(!this.waiters.has(key),'WAIT_ACTIVE','У этой панели уже есть ожидание.');
    requireValue(Number.isSafeInteger(input.after_seq) && input.after_seq>=0 && input.after_seq<=run.events.length,'CURSOR','Некорректный курсор журнала.');
    const pending=()=>run.messages.find(m=>m.recipient_id===member.id && m.delivery==='pending' && !m.read);
    const result=()=>({message_id:pending()?.message_id??null,events:run.events.slice(input.after_seq),seq:run.events.length,
      stopped:member.stopped || member.generation!==input.permission_generation});
    if(pending()||run.events.length>input.after_seq)return result();
    this.event(run,'wait.started',{participant_id:member.id,panel_instance_id:key});
    return new Promise(resolve=>{
      let timer;
      const finish=()=>{clearTimeout(timer);signal?.removeEventListener('abort',finish);this.waiters.delete(key);resolve(result());};
      this.waiters.set(key,{run,wake:finish});timer=setTimeout(finish,this.waitMs);timer.unref?.();
      signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted)finish();
    });
  }
  claim(input) {
    const {run,member}=this.allowed(input),message=run.messages.find(m=>m.message_id===input.message_id);
    requireValue(message && message.recipient_id===member.id && message.delivery==='pending' && !message.read,'CLAIM_DENIED','Доставка уже принята или не принадлежит участнику.');
    message.delivery='claimed';message.delivery_attempt_id=this.makeId();message.panel_instance_id=input.panel_instance_id;
    message.permission_generation=member.generation;
    this.event(run,'claim.granted',{participant_id:member.id,message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id});
    return {message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id};
  }
  attempt(input,permission=true) {
    const context=permission?this.allowed(input):this.panel(input),{run,member}=context;
    const message=run.messages.find(m=>m.message_id===input.message_id);
    requireValue(message && message.recipient_id===member.id && message.panel_instance_id===input.panel_instance_id
      && message.delivery_attempt_id===input.delivery_attempt_id,'CLAIM_DENIED','Нет подходящей попытки доставки.');
    return {...context,message};
  }
  verify(input) {
    const {run,member,message}=this.attempt(input);
    requireValue(message.delivery==='claimed' && !message.intent && message.permission_generation===member.generation,
      'CLAIM_DENIED','Намерение отправки уже было подтверждено. Повтор запрещён.');
    message.intent=true;
    this.event(run,'binding.verified',{participant_id:member.id,message_id:message.message_id,conversation_key:member.identity});
    this.event(run,'send.intent',{participant_id:member.id,message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id});
    return {message_id:message.message_id,permission_generation:member.generation,expires_at:this.panels.get(input.panel_instance_id).expiresAt};
  }
  report(input) {
    const {run,message}=this.attempt(input,false);
    requireValue(['accepted','rejected','unknown'].includes(input.outcome) && message.intent,'INPUT','Некорректный результат отправки.');
    requireValue(message.delivery==='claimed'||message.delivery===input.outcome,'CONFLICT','Результат доставки уже записан.');
    message.delivery=input.outcome;
    this.event(run,'send.report',{message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id,outcome:input.outcome});
    return {delivery:message.delivery,read:message.read};
  }
  read(input) {
    const {run,member}=this.member(input),message=run.messages.find(m=>m.message_id===input.message_id);
    requireValue(message && message.recipient_id===member.id,'READ_DENIED','Сообщение недоступно этому участнику.');
    if(!message.read){message.read=true;this.event(run,'message.read',{participant_id:member.id,message_id:message.message_id});}
    const {idempotency_key,...value}=message;return structuredClone(value);
  }
  journal(input) {const {run}=this.member(input);return {events:structuredClone(run.events),seq:run.events.length};}
  dispose() {for(const probe of this.probes.values())clearTimeout(probe.timer);this.probes.clear();for(const w of this.waiters.values())w.wake();}
}
