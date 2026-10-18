import { createHash, randomUUID } from 'node:crypto';

import {COMMUNICATION_PROTOCOL,COMMUNICATION_BUILD,COMMUNICATION_PERMISSION_MS} from '../../contracts/backend.mjs';
export {COMMUNICATION_PROTOCOL,COMMUNICATION_BUILD} from '../../contracts/backend.mjs';
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

const MUTATIONS=['join','bind','enable','stop','send','probe','claim','verify','report','read','telemetry'];
const SECRET=/(?:Bearer\s+\S+|sk-(?:proj-)?[A-Za-z0-9_-]{12,}|(?:authorization|cookie|api[_-]?key|password|(?:access[_-]?)?token)\s*[:=]\s*\S+|https?:\/\/[^\s/:]+:[^\s/@]+@)/i;
const CLIENT_EVENTS=new Set(['sdk.invoked','sdk.accepted','sdk.rejected','sdk.timeout','sdk.error','report.failed',
  'stop.local','stop.failed','host.handshake','host.context_changed','visibility.changed','panel.pagehide','panel.dispose','panel.mount','panel.resume',
  'wait.error','connection.restored']);
const ERROR_CODES=new Set(['SDK_TIMEOUT','SDK_REJECTED','SDK_ERROR','MCP_ERROR','NETWORK_ERROR','CONTEXT_CHANGED','DISPOSED']);
const SDK_VERSIONS={ext_apps:'1.7.5',mcp_extensions:'0.2.0',mcp:'1.32.1'};

// Control owns the protocol. Every acknowledged mutation follows the adapter's
// durable transaction. Readers and waiters see only committed state.
export class PluginCommunication {
  constructor({now=Date.now,uuid:makeId=randomUUID,waitMs=25000,store=null}={}) {
    Object.assign(this,{now,makeId,waitMs,store});
    this.runs=new Map();this.panels=new Map();this.waiters=new Map();this.probes=new Map();
    this.backendId=makeId();this.tail=Promise.resolve();this.critical=null;this.disposed=false;
    this.ready=this.restore();
  }
  async restore() {
    const loaded=this.store?.load()??{runs:[],issues:[]};this.recoveryIssues=loaded.issues;
    for(const run of loaded.runs)this.runs.set(run.id,run);
    if(loaded.issues.length){this.critical=loaded.issues[0].error_code;return;}
    for(const run of this.runs.values()) {
      const offset=run.events.length;
      for(const member of Object.values(run.members)){member.stopped=true;member.generation++;}
      for(const message of run.messages) {
        if(message.delivery==='claimed'){message.delivery='unknown';this.event(run,'send.unknown',{message_id:message.message_id});}
        if(message.kind==='probe'&&message.delivery==='pending'){message.delivery='rejected';this.event(run,'probe.cancelled',{message_id:message.message_id});}
      }
      for(const probe of Object.values(run.probes??{}))this.event(run,'probe.cancelled',{participant_id:probe.memberId});
      run.probes={};this.event(run,'backend.restart',{build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL,sdk_versions:SDK_VERSIONS});
      try{await this.persist(run,offset);}catch{break;}
    }
  }
  async persist(run,offset) {
    const {events,...state}=run;
    try{if(events.length>offset)await this.store?.append(state,events.slice(offset));}
    catch(error){this.critical=error.code??'PLUGIN_COMMUNICATION_STORE_WRITE';throw fail('STORE_WRITE','Не удалось сохранить журнал. Отправка заблокирована.');}
  }
  mutate(name,input) {
    const work=this.tail.then(async()=>{
      await this.ready;
      requireValue(!this.disposed,'CLOSED','Служба связи закрывается.');
      requireValue(!this.critical,'STORE_BLOCKED','Критическая ошибка журнала. Отправка заблокирована.');
      const old=this.runs.get(input.run_id),panels=structuredClone(this.panels);
      if(old)this.runs.set(input.run_id,structuredClone(old));
      const offset=old?.events.length??0;
      try {
        if(old)this.expire(this.runs.get(input.run_id));
        const result=this['_'+name](input),run=this.runs.get(input.run_id);
        if(run){await this.persist(run,offset);this.syncTimers(run);this.wake(run,run.events.slice(offset));}
        return structuredClone(result);
      }catch(error) {
        this.panels=panels;if(old)this.runs.set(input.run_id,old);else this.runs.delete(input.run_id);
        if(!this.critical&&old) {
          const denied=structuredClone(old);
          this.expire(denied);
          this.event(denied,name==='claim'?'claim.denied':name==='send'&&error.code==='PLUGIN_COMMUNICATION_CONFLICT'?'message.conflict':'operation.denied',
            {operation:name,error_code:/^PLUGIN_COMMUNICATION_[A-Z_]+$/.test(error.code??'')?error.code:'PLUGIN_COMMUNICATION_INPUT',severity:'warning'});
          try{await this.persist(denied,old.events.length);this.runs.set(input.run_id,denied);this.syncTimers(denied);this.wake(denied,denied.events.slice(old.events.length));}catch{}
        }
        throw error;
      }
    });this.tail=work.catch(()=>{});return work;
  }
  wake(run,events) {
    if(events.some(e=>!e.event_type.startsWith('wait.')))for(const waiter of this.waiters.values())if(waiter.runId===run.id)waiter.wake('event');
  }
  syncTimers(run) {
    for(const [key,timer] of this.probes)if(timer.runId===run.id&&!Object.values(run.probes??{}).some(p=>p.id===key)){
      clearTimeout(timer.timer);this.probes.delete(key);
    }
    for(const probe of Object.values(run.probes??{}))if(!this.probes.has(probe.id)) {
      const timer=setTimeout(()=>void this.mutate('fire',{run_id:run.id,probe_id:probe.id}).catch(()=>{}),Math.max(0,probe.due-this.now()));
      timer.unref?.();this.probes.set(probe.id,{runId:run.id,timer});
    }
  }
  event(run,type,fields={}) {
    requireValue(run.events.length<20000,'LIMIT','Лимит журнала достигнут. Начните отдельный опыт.');
    const entry={schema_version:1,event_id:this.makeId(),seq:run.events.length+1,run_id:run.id,
      component:'control',event_type:type,severity:'info',server_time:new Date(this.now()).toISOString(),
      backend_instance_id:this.backendId,...fields};
    run.events.push(entry);
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
  _join(input) {
    requireValue(identifier(input.run_id) && ['O','E'].includes(input.role),'INPUT','Укажите run_id и роль O/E.');
    const identity=communicationIdentity(input.metadata);
    let run=this.runs.get(input.run_id);
    if(!run) {
      requireValue(this.runs.size<100,'LIMIT','Лимит запусков достигнут.');
      run={id:input.run_id,members:{},messages:[],events:[],probes:{},clientSequences:{},clientEvents:{}};this.runs.set(run.id,run);
      this.event(run,'backend.start',{build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL,sdk_versions:SDK_VERSIONS});
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
  _bind(input) {
    const {run,member}=this.member(input);
    requireValue(uuid(input.panel_instance_id),'INPUT','Некорректный экземпляр панели.');
    requireValue(input.protocol_version===COMMUNICATION_PROTOCOL && input.build_id===COMMUNICATION_BUILD,
      'VERSION','Несовместимая версия панели.');
    const previous=this.panels.get(input.panel_instance_id);
    requireValue(!previous || previous.runId===run.id && previous.memberId===member.id,'BINDING','Панель уже связана с другим участником.');
    if(!previous)this.panels.set(input.panel_instance_id,{runId:run.id,memberId:member.id,identity:member.identity,generation:0,expiresAt:0});
    this.event(run,'binding.confirmed',{participant_id:member.id,panel_instance_id:input.panel_instance_id});
    return this._status(input);
  }
  _status(input) {
    const {run,member}=this.member(input),expiresAt=this.deadline(run,member);
    return {run_id:run.id,participant_id:member.id,role:member.role,conversation_key:member.identity,
      protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
      permission_generation:member.generation,stopped:member.stopped||expiresAt<=this.now(),
      storage:this.store?'durable':'memory',critical_error:this.critical,recovery_issues:this.recoveryIssues.filter(i=>!i.run_id||i.run_id===run.id),
      expires_at:expiresAt,
      seq:run.events.length,messages:run.messages.filter(m=>m.recipient_id===member.id||m.sender_id===member.id)
        .map(({idempotency_key,...message})=>structuredClone(message))};
  }
  _enable(input) {
    const {run,member,panel}=this.panel(input);
    requireValue(input.message_supported===true,'UNSUPPORTED','Хост не предоставил openai/message.');
    this.cancelProbes(run,member);
    member.generation++;member.stopped=false;panel.generation=member.generation;panel.expiresAt=this.now()+COMMUNICATION_PERMISSION_MS;
    this.event(run,'permission.enabled',{participant_id:member.id,panel_instance_id:input.panel_instance_id,
      permission_generation:member.generation,expires_at:panel.expiresAt});
    return this._status(input);
  }
  _stop(input) {
    const {run,member,panel}=this.panel(input),scope=input.scope??'participant';
    requireValue(['participant','panel'].includes(scope),'INPUT','Некорректная область остановки.');
    // Only an explicit user Stop is global. A retiring instance may not revoke
    // a newer instance's permission, including an enable response arriving late.
    if(member.stopped || scope==='panel' && (panel.generation!==member.generation || input.permission_generation!==member.generation))
      return {...this._status(input),stop_applied:false};
    member.stopped=true;member.generation++;
    this.cancelProbes(run,member);
    this.event(run,'stop.confirmed',{participant_id:member.id,panel_instance_id:input.panel_instance_id,
      permission_generation:member.generation,scope});
    return {...this._status(input),stop_applied:true};
  }
  deadline(run,member) {
    return Math.max(0,...[...this.panels.values()].filter(p=>p.runId===run.id&&p.memberId===member.id&&p.generation===member.generation).map(p=>p.expiresAt));
  }
  cancelProbes(run,member) {
    if(run.probes[member.id]){delete run.probes[member.id];this.event(run,'probe.cancelled',{participant_id:member.id});}
    for(const message of run.messages)if(message.kind==='probe'&&message.recipient_id===member.id&&message.delivery==='pending'){
      message.delivery='rejected';this.event(run,'probe.cancelled',{participant_id:member.id,message_id:message.message_id});
    }
  }
  expire(run) {
    for(const member of Object.values(run.members))if(!member.stopped&&this.deadline(run,member)<=this.now()){
      member.stopped=true;member.generation++;this.cancelProbes(run,member);
      this.event(run,'permission.expired',{participant_id:member.id,permission_generation:member.generation});
    }
  }
  _send(input) {
    const {run,member}=this.member(input),recipient=Object.values(run.members).find(m=>m.id===input.recipient_id);
    requireValue(recipient && recipient!==member && ['question','answer','result'].includes(input.kind),'INPUT','Некорректный адресат или вид сообщения.');
    requireValue(typeof input.body==='string' && input.body.trim() && Buffer.byteLength(input.body)<=4096
      && identifier(input.idempotency_key),'INPUT','Сообщение должно содержать до 4096 байт и ключ идемпотентности.');
    requireValue(!SECRET.test(input.body),'SECRET_INPUT','Не включайте ключи, cookies или заголовки авторизации в контрольный текст.');
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
    requireValue(run.messages.length<256,'LIMIT','Лимит сообщений запуска достигнут.');
    const message={...value,run_id:run.id,message_id:this.makeId(),created_at:new Date(this.now()).toISOString(),
      idempotency_key:idempotencyKey,delivery:'pending',read:false};
    run.messages.push(message);this.event(run,this.store?'message.persisted':'message.queued',{participant_id:member.id,message_id:message.message_id,
      sender_id:message.sender_id,recipient_id:message.recipient_id,kind:message.kind,body:message.body,in_reply_to:message.in_reply_to});
    return {message_id:message.message_id};
  }
  _probe(input) {
    const {run,member}=this.member(input);
    requireValue(Number.isSafeInteger(input.delay_ms) && input.delay_ms>=25 && input.delay_ms<=60000,'INPUT','Задержка probe: от 25 до 60000 мс.');
    requireValue(!member.stopped,'STOPPED','Сначала включите связь в подтверждённой панели.');
    requireValue([...this.panels.values()].some(p=>p.runId===run.id&&p.memberId===member.id&&p.generation===member.generation&&p.expiresAt>this.now()),'STOPPED','Нет действующего разрешения панели.');
    requireValue(!run.probes[member.id],'PROBE_PENDING','Одна probe уже ожидает.');
    const due=this.now()+input.delay_ms,generation=member.generation;
    run.probes[member.id]={id:this.makeId(),memberId:member.id,due,generation};
    this.event(run,'probe.scheduled',{participant_id:member.id,due_at:due});
    return {due_at:due};
  }
  _fire(input) {
    const run=this.run(input),probe=Object.values(run.probes).find(p=>p.id===input.probe_id);
    if(!probe)return {cancelled:true};
    const member=Object.values(run.members).find(m=>m.id===probe.memberId);delete run.probes[member.id];
    if(member.stopped||member.generation!==probe.generation||![...this.panels.values()].some(p=>p.runId===run.id&&p.memberId===member.id&&p.generation===member.generation&&p.expiresAt>this.now())){
      this.event(run,'probe.cancelled',{participant_id:member.id});return {cancelled:true};
    }
    this.event(run,'probe.fired',{participant_id:member.id});
    return this.enqueue(run,member,{sender_id:member.id,recipient_id:member.id,kind:'probe',body:'Контрольное сообщение Workflow Pilot',in_reply_to:null},probe.id);
  }
  async wait(input,signal) {
    await this.ready;await this.tail;const key=input.panel_instance_id;
    requireValue(!this.waiters.has(key),'WAIT_ACTIVE','У этой панели уже есть ожидание.');
    // Reserve before persistence so two simultaneous waits cannot pass together.
    const holder={runId:input.run_id,wake:()=>{}};this.waiters.set(key,holder);
    try {
      const prepared=await this.mutate('waitStart',input);
      if(prepared.immediate)return this.waitResult(input);
      await new Promise(resolve=>{
        let timer;
        const finish=reason=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);holder.reason=reason;resolve();};
        const cancel=()=>finish('cancel');holder.wake=finish;
        timer=setTimeout(()=>finish('timeout'),Math.min(this.waitMs,prepared.expires_at-this.now()));timer.unref?.();
        signal?.addEventListener('abort',cancel,{once:true});
        if(signal?.aborted)cancel();
        else if(this.runs.get(input.run_id).events.length>prepared.seq)finish('event');
      });
      if(!this.disposed&&!this.critical)await this.mutate('waitEnd',{...input,reason:holder.reason});
      await this.tail;return this.waitResult(input);
    }finally{this.waiters.delete(key);}
  }
  _waitStart(input) {
    const {run,panel}=this.allowed(input);
    requireValue(Number.isSafeInteger(input.after_seq)&&input.after_seq>=0&&input.after_seq<=run.events.length,'CURSOR','Некорректный курсор журнала.');
    const value=this.waitResult(input);if(value.message_id||run.events.length>input.after_seq)return {immediate:true};
    this.event(run,'wait.started',{participant_id:input.participant_id,panel_instance_id:input.panel_instance_id});
    return {seq:run.events.length,expires_at:panel.expiresAt};
  }
  _waitEnd(input) {
    const {run,member}=this.panel(input);
    this.event(run,'wait.'+({timeout:'timeout',cancel:'cancel',event:'event'}[input.reason]??'cancel'),{participant_id:member.id,panel_instance_id:input.panel_instance_id});
    return {};
  }
  waitResult(input) {
    const {run,member}=this.member(input),pending=run.messages.find(m=>m.recipient_id===member.id&&m.delivery==='pending'&&!m.read);
    const events=run.events.slice(input.after_seq,input.after_seq+100);
    return {message_id:pending?.message_id??null,events,seq:events.at(-1)?.seq??input.after_seq,
      stopped:member.stopped||member.generation!==input.permission_generation,critical_error:this.critical};
  }
  _claim(input) {
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
  _verify(input) {
    const {run,member,message}=this.attempt(input);
    requireValue(message.delivery==='claimed' && !message.intent && message.permission_generation===member.generation,
      'CLAIM_DENIED','Намерение отправки уже было подтверждено. Повтор запрещён.');
    message.intent=true;
    this.event(run,'binding.verified',{participant_id:member.id,message_id:message.message_id,conversation_key:member.identity});
    this.event(run,'send.intent',{participant_id:member.id,message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id});
    return {message_id:message.message_id,permission_generation:member.generation,expires_at:this.panels.get(input.panel_instance_id).expiresAt};
  }
  _report(input) {
    const {run,message}=this.attempt(input,false);
    requireValue(['accepted','rejected','unknown'].includes(input.outcome) && message.intent,'INPUT','Некорректный результат отправки.');
    requireValue(message.delivery==='claimed'||message.delivery===input.outcome,'CONFLICT','Результат доставки уже записан.');
    message.delivery=input.outcome;
    this.event(run,'send.report',{message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id,outcome:input.outcome});
    return {delivery:message.delivery,read:message.read};
  }
  _read(input) {
    const {run,member}=this.member(input),message=run.messages.find(m=>m.message_id===input.message_id);
    requireValue(message && message.recipient_id===member.id,'READ_DENIED','Сообщение недоступно этому участнику.');
    this.event(run,'read.requested',{participant_id:member.id,message_id:message.message_id});
    if(!message.read){message.read=true;this.event(run,'message.read',{participant_id:member.id,message_id:message.message_id});}
    this.event(run,'read.returned',{participant_id:member.id,message_id:message.message_id});
    const {idempotency_key,...value}=message;return structuredClone(value);
  }
  _telemetry(input) {
    const {run}=this.panel(input),data=input.event;
    requireValue(data&&uuid(data.event_id)&&CLIENT_EVENTS.has(data.event_type)&&Number.isSafeInteger(data.client_sequence)
      &&data.client_sequence>=1&&typeof data.client_time==='string'&&!Number.isNaN(Date.parse(data.client_time))
      &&Number.isFinite(data.duration_ms)&&data.duration_ms>=0&&data.duration_ms<=86400000,'INPUT','Некорректное событие панели.');
    const safe={event_id:data.event_id,event_type:data.event_type,client_sequence:data.client_sequence,client_time:new Date(data.client_time).toISOString(),duration_ms:data.duration_ms,
      ...(data.error_code?{error_code:ERROR_CODES.has(data.error_code)?data.error_code:'MCP_ERROR'}:{})};
    if(data.event_type==='host.handshake')Object.assign(safe,{message_supported:data.message_supported===true,
      build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL,sdk_versions:SDK_VERSIONS});
    if(data.message_id){requireValue(run.messages.some(m=>m.message_id===data.message_id&&m.recipient_id===input.participant_id),'INPUT','Неизвестное сообщение события.');safe.message_id=data.message_id;}
    const signature=JSON.stringify({panel_instance_id:input.panel_instance_id,...safe}),previous=run.clientEvents[data.event_id];
    requireValue(!previous||previous===signature,'CONFLICT','ID события уже использован.');
    if(previous)return {duplicate:true};
    requireValue(!run.events.some(e=>e.event_id===data.event_id),'CONFLICT','ID события уже использован журналом.');
    const last=run.clientSequences[input.panel_instance_id]??0;
    requireValue(data.client_sequence>last,'CURSOR','Порядок событий панели нарушен.');
    if(data.client_sequence!==last+1)this.event(run,'frontend.gap',{panel_instance_id:input.panel_instance_id,from:last+1,to:data.client_sequence-1,severity:'warning'});
    run.clientSequences[input.panel_instance_id]=data.client_sequence;run.clientEvents[data.event_id]=signature;
    this.event(run,safe.event_type,{...safe,component:'frontend',server_received_at:new Date(this.now()).toISOString(),
      panel_instance_id:input.panel_instance_id,participant_id:input.participant_id});
    return {seq:run.events.length};
  }
  async status(input){await this.ready;await this.tail;return structuredClone(this._status(input));}
  async recover(input){
    await this.ready;await this.tail;const identity=communicationIdentity(input.metadata),participants=[];
    for(const run of this.runs.values())for(const member of Object.values(run.members))if(member.identity===identity)
      participants.push({run_id:run.id,participant_id:member.id,role:member.role});
    return {participants,build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL,critical_error:this.critical};
  }
  async journal(input){await this.ready;await this.tail;const {run}=this.member(input);
    const after=input.after_seq??0;requireValue(Number.isSafeInteger(after)&&after>=0&&after<=run.events.length,'CURSOR','Некорректный курсор.');
    return {events:structuredClone(run.events.slice(after,after+100)),seq:Math.min(after+100,run.events.length),total_seq:run.events.length,critical_error:this.critical};}
  async export(input){await this.ready;await this.tail;const {run}=this.member(input);
    const after=input.after_seq??0,through=input.through_seq??run.events.length;
    requireValue(Number.isSafeInteger(after)&&Number.isSafeInteger(through)&&after>=0&&after<=through&&through<=run.events.length,'CURSOR','Некорректные границы экспорта.');
    const events=run.events.slice(after,Math.min(after+100,through)),next=events.at(-1)?.seq??after;
    return {jsonl:events.map(e=>JSON.stringify(e)).join('\n')+(events.length?'\n':''),after_seq:next,through_seq:through,complete:next===through,
      summary:{run_id:run.id,events:through,protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
        sdk_versions:SDK_VERSIONS,gaps:run.events.slice(0,through).filter(e=>e.event_type==='frontend.gap')
          .map(({seq,panel_instance_id,from,to})=>({seq,panel_instance_id,from,to})),critical_error:this.critical}};}
  dispose(){this.disposed=true;for(const probe of this.probes.values())clearTimeout(probe.timer);this.probes.clear();for(const w of this.waiters.values())w.wake('cancel');}
}
for(const name of MUTATIONS)PluginCommunication.prototype[name]=function(input){return this.mutate(name,input);};
