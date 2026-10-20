import { createHash, randomUUID } from 'node:crypto';
import {ParticipantEnrollment} from './enrollment.mjs';
import {WorkflowChannel} from './workflow-channel.mjs';
import {AssignmentDialogue} from './assignment-dialogue.mjs';
import {ASSIGNMENT_DIALOGUE_VERSION} from '../../contracts/plugin-communication.mjs';
import {ROLE_PROTOCOL_VERSION,roleUpdate} from '@webpilot/workflow-kit/lib/role-protocol';

import {COMMUNICATION_PROTOCOL,COMMUNICATION_BUILD,COMMUNICATION_PERMISSION_MS,communicationVersionMessage} from '../../contracts/backend.mjs';
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

const MUTATIONS=['join','bind','enable','stop','send','probe','claim','claimReady','verify','report','read','telemetry','telemetryBatch','sync'];
const diagnostic=e=>e.component==='frontend'||['operation.timing','kit.timing','observer.timing','claim.deferred'].includes(e.event_type);
const functional=e=>!diagnostic(e)&&!e.event_type.startsWith('wait.');
const SECRET=/(?:Bearer\s+\S+|sk-(?:proj-)?[A-Za-z0-9_-]{12,}|(?:authorization|cookie|api[_-]?key|password|(?:access[_-]?)?token)\s*[:=]\s*\S+|https?:\/\/[^\s/:]+:[^\s/@]+@)/i;
const CLIENT_EVENTS=new Set(['sdk.invoked','sdk.accepted','sdk.rejected','sdk.timeout','sdk.error','report.failed',
  'stop.local','stop.failed','host.handshake','host.context_changed','visibility.changed','panel.pagehide','panel.dispose','panel.mount','panel.resume',
  'wait.error','connection.restored','rpc.completed']);
const RPC_OPERATIONS=new Set(['recover','bind','sync','wait','claim','claim_ready','verify','report','status','journal','stop','enable','export']);
const ERROR_CODES=new Set(['SDK_TIMEOUT','SDK_REJECTED','SDK_ERROR','MCP_ERROR','NETWORK_ERROR','CONTEXT_CHANGED','DISPOSED']);
const SDK_VERSIONS={ext_apps:'1.7.5',mcp_extensions:'0.2.0',mcp:'1.32.1'};

// Control owns the protocol. Every acknowledged mutation follows the adapter's
// durable transaction. Readers and waiters see only committed state.
export class PluginCommunication {
  constructor({now=Date.now,uuid:makeId=randomUUID,waitMs=25000,store=null,resolveTarget=null,verifyTarget=null,verifyTerminal=null,observe,admit,reconcile,currentMessage,dialogueKit=null,onChange=()=>{}}={}) {
    Object.assign(this,{now,makeId,waitMs,store,onChange});
    this.runs=new Map();this.panels=new Map();this.waiters=new Map();this.probes=new Map();
    this.removedSessions=new Set();
    this.observedDenials=new Map();this.verifyTerminal=verifyTerminal;this.timings=[];
    this.backendId=makeId();this.tail=Promise.resolve();this.critical=null;this.disposed=false;
    this.enrollment=new ParticipantEnrollment(this,resolveTarget,verifyTarget);
    this.workflow=new WorkflowChannel(this,{observe,admit,reconcile,currentMessage});
    this.assignment=new AssignmentDialogue(this,dialogueKit);
    this.ready=this.restore();
  }
  async restore() {
    const loaded=this.store?.load()??{runs:[],issues:[]};this.recoveryIssues=loaded.issues;
    for(const run of loaded.runs)this.runs.set(run.id,run);
    if(loaded.issues.length){this.critical=loaded.issues[0].error_code;return;}
    for(const run of this.runs.values()) {
      for(const id of run.removed_sessions??[])this.removedSessions.add(id);
      const offset=run.events.length;
      if(run.grant&&run.grant.phase!=='complete'){run.grant.active=false;run.grant.phase='paused';run.grant.reason='restart';run.grant.generation++;}
      this.assignment.invalidateAuthorizations(run);
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
    const queued=performance.now();
    const work=this.tail.then(async()=>{
      const entered=performance.now();
      await this.ready;
      requireValue(!this.disposed,'CLOSED','Служба связи закрывается.');
      requireValue(!this.critical,'STORE_BLOCKED','Критическая ошибка журнала. Отправка заблокирована.');
      await this.enrollment.validateInput(input);
      const validated=performance.now();
      const old=this.runs.get(input.run_id),panels=structuredClone(this.panels);
      if(old)this.runs.set(input.run_id,structuredClone(old));
      const offset=old?.events.length??0;
      try {
        if(old)this.expire(this.runs.get(input.run_id));
        const result=await this['_'+name](input),run=this.runs.get(input.run_id);
        if(name==='observed')this.observedDenials.delete(input.run_id+':'+input.message_id);
        if(run){
          const changes=run.events.slice(offset),messageId=input.message_id??result?.message_id;
          if(run.mode==='workflow'&&messageId&&changes.some(functional))
            this.event(run,'operation.timing',{operation:name,message_id:messageId,clock_domain:'backend-monotonic',
              queue_ms:Math.round(entered-queued),validation_ms:Math.round(validated-entered),handler_ms:Math.round(performance.now()-validated)});
          const pending=this.timings.filter(t=>t.project_id===run.project_id&&t.scope_id===run.grant?.scope_id);
          for(const t of pending)this.event(run,t.type??'kit.timing',{operation:t.operation,elapsed_ms:t.elapsed_ms,
            clock_domain:'backend-monotonic',assignment_id:t.assignment_id,outcome:t.outcome,
            started_at:t.started_at??null,ended_at:t.ended_at});
          this.timings=this.timings.filter(t=>!pending.includes(t));
          await this.persist(run,offset);this.syncTimers(run);this.wake(run,run.events.slice(offset));
          if(changes.some(functional)&&run.mode==='workflow')queueMicrotask(()=>this.onChange(run.id,changes));
        }
        return structuredClone(result);
      }catch(error) {
        this.panels=panels;if(old)this.runs.set(input.run_id,old);else this.runs.delete(input.run_id);
        const denialKey=input.run_id+':'+input.message_id;
        const repeated=name==='observed'&&this.observedDenials.get(denialKey)===error.code;
        if(name==='observed'){
          if(!this.observedDenials.has(denialKey)&&this.observedDenials.size>=2048)
            this.observedDenials.delete(this.observedDenials.keys().next().value);
          this.observedDenials.set(denialKey,error.code);
        }
        if(!this.critical&&old&&!repeated) {
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
  recordKitTiming(target,span){
    if(!/^[a-z]+(?::[a-z-]+)?$/.test(span.operation)||!Number.isFinite(span.elapsed_ms))return;
    this.timings.push({project_id:target.project_id,scope_id:target.scope_id,assignment_id:target.assignment_id??null,
      operation:span.operation,elapsed_ms:Math.max(0,Math.round(span.elapsed_ms)),outcome:span.ok?'ok':'error',
      started_at:span.started_at??null,ended_at:span.ended_at??new Date(this.now()).toISOString()});
    if(this.timings.length>64)this.timings.shift();
  }
  recordObserverTiming(target,elapsed,ok){
    this.timings.push({type:'observer.timing',project_id:target.project_id,scope_id:target.scope_id,
      assignment_id:target.assignment_id??null,operation:'physical-state',elapsed_ms:Math.max(0,Math.round(elapsed)),outcome:ok?'observed':'unavailable',
      ended_at:new Date(this.now()).toISOString()});
    if(this.timings.length>64)this.timings.shift();
  }
  wakes(run,memberId,event){
    if(!functional(event))return false;
    if(run.mode!=='workflow')return true;
    if(/^(plan\.|backend\.|project\.removed|operation\.denied)/.test(event.event_type))return true;
    if(event.message_id)return run.messages.some(m=>m.message_id===event.message_id&&m.recipient_id===memberId);
    return event.participant_id===memberId;
  }
  wake(run,events) {
    for(const waiter of this.waiters.values())if(waiter.runId===run.id&&events.some(e=>this.wakes(run,waiter.memberId,e)))waiter.wake('event');
  }
  syncTimers(run) {
    this.workflow.syncProbes(run);
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
    if(run.mode==='workflow')this.enrollment.current(member.target);
    return {run,member};
  }
  reserve(target){return this.enrollment.reserve(target);}
  async removeProjects(identities) {
    await this.ready;
    const sessions=[...new Set(identities.flatMap(p=>p.sessionIds??[]))];
    for(const id of sessions)this.removedSessions.add(id);
    for(const run of this.runs.values())if(run.mode==='workflow'&&(
      Object.values(run.members).some(m=>sessions.includes(m.target.local_session_id))
      ||Object.values(run.enrollments??{}).some(e=>sessions.includes(e.target.local_session_id))))
      await this.mutate('retire',{run_id:run.id,sessions});
  }
  _retire(input) {
    const run=this.run(input),sessions=new Set(input.sessions),members=new Set();
    run.removed_sessions=[...new Set([...(run.removed_sessions??[]),...input.sessions])];
    for(const member of Object.values(run.members))if(sessions.has(member.target.local_session_id)){
      members.add(member.id);member.removed=true;member.stopped=true;member.generation++;
    }
    for(const [key,value] of Object.entries(run.enrollments??{}))if(sessions.has(value.target.local_session_id))delete run.enrollments[key];
    if(sessions.has(run.origin_session_id)){
      run.removed=true;
      if(run.grant){run.grant.active=false;run.grant.phase='paused';run.grant.reason='removed';run.grant.generation++;}
    }
    for(const message of run.messages)if(run.removed||sessions.has(message.recipient_session_id)||members.has(message.recipient_id)||members.has(message.sender_id)){
      if(message.delivery==='claimed')message.delivery='unknown';
      else if(message.delivery==='pending')message.delivery='rejected';
    }
    for(const intent of Object.values(run.assignment_intents??{}))if(intent.phase!=='published'&&(run.removed
      ||sessions.has(intent.source.local_session_id)||sessions.has(intent.target.local_session_id)))intent.phase='retired';
    for(const [id,panel] of this.panels)if(panel.runId===run.id&&(run.removed||members.has(panel.memberId)))this.panels.delete(id);
    for(const [id,probe] of Object.entries(run.probes??{}))if(run.removed||members.has(probe.memberId))delete run.probes[id];
    this.event(run,'project.removed');return {removed:true};
  }
  enroll(ticket,metadata){return this.enrollment.enroll(ticket,metadata);}
  _reserve(input){return this.enrollment.reserveInTransaction(input);}
  _enroll(input){const result=this.enrollment.enrollInTransaction(input,communicationIdentity(input.metadata));
    const run=this.run(result),member=Object.values(run.members).find(m=>m.id===result.participant_id);
    this.workflow.attach(run,member);return result;}
  _grant(input){return this.workflow._grant(input);}
  _enqueue(input){return this.workflow._enqueue(input);}
  _assignmentIntent(input){return this.assignment.prepare(input);}
  _assignmentDispatch(input){return this.assignment.dispatchDraft(input);}
  _assignmentAuthorized(input){return this.assignment.applyAuthorized(input);}
  assignmentPrepare(input){return this.assignment.draft(input);}
  assignmentDispatch(input){return this.assignment.dispatch(input);}
  _assignmentPublish(input){return this.assignment.publish(input);}
  _assignmentTransport(input){return this.assignment.transport(input);}
  _assignmentDeferred(input){return this.assignment.deferred(input);}
  _assignmentYield(input){return this.assignment.yielded(input);}
  assignmentSend(input){return this.assignment.send(input);}
  assignmentStatus(input){return this.assignment.status(input);}
  assignmentYield(input){return this.assignment.yield(input);}
  assignmentMigrate(input){return this.assignment.migrate(input);}
  _assignmentMigrated(input){return this.assignment.migrated(input);}
  _sync(input){return this.workflow.sync(input);}
  _turnTimeout(input){return this.workflow.timeout(input);}
  async _observed(input){const run=this.run(input);for(const member of Object.values(run.members))
    if((!input.session_id||member.target.local_session_id===input.session_id)
      &&(!input.message_id||member.deliveryGate?.message_id===input.message_id
        ||run.messages.some(m=>m.message_id===input.message_id&&m.recipient_id===member.id&&m.read&&m.yielded)))
      await this.workflow.observed(run,member);return {};}
  observeSession(sessionId){for(const run of this.runs.values())if(run.mode==='workflow'&&Object.values(run.members).some(m=>m.target.local_session_id===sessionId)){
    void this.mutate('observed',{run_id:run.id,session_id:sessionId}).catch(()=>{});
    for(const waiter of this.waiters.values())if(waiter.runId===run.id
      &&run.members[waiter.memberId]?.target.local_session_id===sessionId)waiter.wake('event');
  }}
  async modelInput(input){
    if(input.run_id&&input.participant_id)return input;
    await this.ready;await this.tail;const identity=communicationIdentity(input.metadata);
    const matches=[];
    for(const run of this.runs.values())if(run.mode==='workflow')for(const member of Object.values(run.members))
      if(member.identity===identity&&(!input.message_id||run.messages.some(m=>m.message_id===input.message_id&&m.recipient_id===member.id)))matches.push({run,member});
    requireValue(matches.length===1,'BINDING','Рабочее назначение текущего разговора не найдено.');
    return {...input,run_id:matches[0].run.id,participant_id:matches[0].member.id};
  }
  async readMessage(input){
    const binding=await this.modelInput(input),message=await this.read(binding);
    if(message.superseded||!message.service||message.sender_role!=='backend')return message;
    const {run,member}=this.member(binding);
    if(member.role==='O'&&message.assignment_id)message.recipient_ref=this.assignment.recipientRef(run,message.assignment_id);
    if(message.context_ref){
      const content=await this.workflow.content({...binding,context_ref:message.context_ref,part:0});
      if(content.total===1&&content.bytes<=12000){
        message.inline_context={text:content.text,sha256:content.sha256,bytes:content.bytes,complete:true};
        message.instructions=message.instructions.replace('Прочитайте ВСЕ части workflow_communication_read_context для основного context_ref и каждого contexts[].sha256, part от 0 до total-1.',
          'Основной context_ref полностью включён в inline_context (complete=true); повторно его не читайте. Дополнительные contexts[].sha256 прочитайте через workflow_communication_read_context, part от 0 до total-1.');
      }
    }
    return message;
  }
  async content(input){return this.workflow.content(await this.modelInput(input));}
  async roster(input){input=await this.modelInput(input);await this.enrollment.validateInput(input);const {run,member}=this.member(input),participants=[];
    for(const candidate of Object.values(run.members))if(candidate.id===member.id||member.role==='O'){
      try{await this.enrollment.validate(candidate.target);participants.push(this.enrollment.publicMember(run,candidate));}catch{}
    }return {participants,permission:this.workflow.state(run),
      ...(this.assignment.kit?{assignments:await this.assignment.roster(run,member)}:{})};
  }
  panel(input) {
    const context=this.member(input),panel=this.panels.get(input.panel_instance_id);
    requireValue(panel && panel.runId===context.run.id && panel.memberId===context.member.id
      && panel.identity===context.member.identity,'BINDING','Подтвердите привязку этого экземпляра панели.');
    requireValue(input.protocol_version===COMMUNICATION_PROTOCOL && input.build_id===COMMUNICATION_BUILD,
      'VERSION',communicationVersionMessage(input));
    return {...context,panel};
  }
  allowed(input) {
    const context=this.panel(input),{run,member,panel}=context;
    if(run.mode==='workflow')requireValue(this.workflow.permitted(run,member)&&panel.messageSupported,'STOPPED','План приостановлен или SDK недоступен.');
    requireValue(!member.stopped && panel.expiresAt>this.now() && panel.generation===member.generation
      && input.permission_generation===member.generation,'STOPPED','Связь остановлена или срок разрешения истёк.');
    return context;
  }
  _join(input) {
    requireValue(identifier(input.run_id) && ['O','E'].includes(input.role),'INPUT','Укажите run_id и роль O/E.');
    const identity=communicationIdentity(input.metadata);
    let run=this.runs.get(input.run_id);
    requireValue(!input.run_id.startsWith('work:')&&run?.mode!=='workflow','MODE','Join предназначен только для прежнего эксперимента. Рабочая панель регистрируется по назначению.');
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
      'VERSION',communicationVersionMessage(input));
    const previous=this.panels.get(input.panel_instance_id);
    requireValue(!previous || previous.runId===run.id && previous.memberId===member.id,'BINDING','Панель уже связана с другим участником.');
    if(!previous)this.panels.set(input.panel_instance_id,{runId:run.id,memberId:member.id,identity:member.identity,generation:0,expiresAt:0});
    this.panels.get(input.panel_instance_id).messageSupported=input.message_supported===true;
    if(run.mode==='workflow'){const panel=this.panels.get(input.panel_instance_id);panel.generation=member.generation;panel.expiresAt=this.now()+60000;}
    this.event(run,'binding.confirmed',{participant_id:member.id,panel_instance_id:input.panel_instance_id});
    return this._status(input);
  }
  _status(input) {
    const {run,member}=this.member(input),expiresAt=this.deadline(run,member);
    return {run_id:run.id,participant_id:member.id,role:member.role,conversation_key:member.identity,
      ...(run.mode==='workflow'?this.enrollment.publicMember(run,member):{}),
      protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
      permission_generation:member.generation,stopped:run.mode==='workflow'?!this.workflow.permitted(run,member):member.stopped||expiresAt<=this.now(),
      ...(run.mode==='workflow'?{permission:this.workflow.state(run),channel_ready:[...this.panels.values()].some(p=>p.runId===run.id&&p.memberId===member.id&&p.messageSupported&&p.expiresAt>this.now())}:{}),
      storage:this.store?'durable':'memory',critical_error:this.critical,recovery_issues:this.recoveryIssues.filter(i=>!i.run_id||i.run_id===run.id),
      expires_at:expiresAt,
      seq:run.events.length,messages:run.messages.filter(m=>m.recipient_id===member.id||m.sender_id===member.id)
        .map(({idempotency_key,fingerprint,...message})=>structuredClone(message))};
  }
  _enable(input) {
    const {run,member,panel}=this.panel(input);
    requireValue(run.mode!=='workflow','MODE','Связью рабочего плана управляет кнопка выполнения плана.');
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
    if(run.mode==='workflow')return this.workflow.stop(input);
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
    if(run.mode==='workflow'){
      for(const message of run.messages)if(message.delivery==='claimed'&&this.now()-message.claimed_at>35000){
        message.delivery='unknown';this.event(run,'send.unknown',{message_id:message.message_id});
      }return;
    }
    for(const member of Object.values(run.members))if(!member.stopped&&this.deadline(run,member)<=this.now()){
      member.stopped=true;member.generation++;this.cancelProbes(run,member);
      this.event(run,'permission.expired',{participant_id:member.id,permission_generation:member.generation});
    }
  }
  _send(input) {
    const {run,member}=this.member(input),recipient=Object.values(run.members).find(m=>m.id===input.recipient_id);
    requireValue(run.mode!=='workflow','MODE','Рабочий диалог версии 1: workflow_assignment_send. Старое назначение: task:block/assignment:message до безопасной миграции. Legacy send не используется в рабочих планах.');
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
    requireValue(run.mode!=='workflow','MODE','Probe предназначен только для прежнего эксперимента.');
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
    const holder={runId:input.run_id,memberId:input.participant_id,wake:()=>{}};this.waiters.set(key,holder);
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
        else {const run=this.runs.get(input.run_id);
          if(run.events.slice(prepared.seq).some(e=>this.wakes(run,input.participant_id,e)))finish('event');}
      });
      if(!this.disposed&&!this.critical)await this.mutate('waitEnd',{...input,reason:holder.reason});
      await this.tail;return this.waitResult(input);
    }finally{this.waiters.delete(key);}
  }
  _waitStart(input) {
    const {run,panel}=this.allowed(input);
    // Only an already valid lease in this generation can be renewed by wait.
    // Reconnection and expired leases still require explicit sync.
    if(run.mode==='workflow')panel.expiresAt=this.now()+60000;
    requireValue(Number.isSafeInteger(input.after_seq)&&input.after_seq>=0&&input.after_seq<=run.events.length,'CURSOR','Некорректный курсор журнала.');
    const value=this.waitResult(input);
    if(value.message_id||run.events.slice(input.after_seq).some(e=>this.wakes(run,input.participant_id,e)))return {immediate:true};
    if(run.mode!=='workflow')this.event(run,'wait.started',{participant_id:input.participant_id,panel_instance_id:input.panel_instance_id});
    return {seq:run.events.length,expires_at:panel.expiresAt};
  }
  _waitEnd(input) {
    const {run,member}=this.panel(input);
    if(run.mode!=='workflow')this.event(run,'wait.'+({timeout:'timeout',cancel:'cancel',event:'event'}[input.reason]??'cancel'),{participant_id:member.id,panel_instance_id:input.panel_instance_id});
    return {};
  }
  waitResult(input) {
    const {run,member}=this.member(input),pending=run.mode==='workflow'?this.workflow.pending(run,member):run.messages.find(m=>m.recipient_id===member.id&&m.delivery==='pending'&&!m.read);
    const end=Math.min(input.after_seq+100,run.events.length),events=this.visibleEvents(run,member,run.events.slice(input.after_seq,end));
    return {message_id:pending?.message_id??null,events,seq:end,expires_at:this.panels.get(input.panel_instance_id)?.expiresAt??0,
      stopped:member.stopped||member.generation!==input.permission_generation,critical_error:this.critical};
  }
  async _claim(input) {
    const {run,member}=this.allowed(input),message=run.messages.find(m=>m.message_id===input.message_id);
    requireValue(message && message.recipient_id===member.id && message.delivery==='pending' && !message.read,'CLAIM_DENIED','Доставка уже принята или не принадлежит участнику.');
    if(run.mode==='workflow'&&await this.workflow.superseded(run,member,message))return {deferred:true,superseded:true};
    if(run.mode==='workflow'&&!await this.workflow.canClaim(run,member,message)){
      const physical=this.workflow.observe(member.target),preceding=run.messages.find(m=>m.recipient_id===member.id
        &&m.scope_id===run.grant.scope_id&&!m.reply_observed);
      const reason=member.deliveryGate?'previous-turn':preceding?.message_id!==message.message_id?'previous-message':
        physical.busy?'recipient-busy':!physical.canSend?'recipient-unavailable':'admission-denied';
      if(message.claim_wait_reason!==reason){message.claim_wait_reason=reason;
        this.event(run,'claim.deferred',{message_id:message.message_id,participant_id:member.id,reason});}
      return {deferred:true,reason};
    }
    delete message.claim_wait_reason;
    message.delivery='claimed';message.delivery_attempt_id=this.makeId();message.panel_instance_id=input.panel_instance_id;
    if(run.mode==='workflow')message.claimed_at=this.now();
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
  async _claimReady(input){
    const claimed=await this._claim(input);if(claimed.deferred)return claimed;
    return {...claimed,...await this._verify({...input,delivery_attempt_id:claimed.delivery_attempt_id},true)};
  }
  async _verify(input,alreadyChecked=false) {
    const {run,member,message}=this.attempt(input);
    requireValue(message.delivery==='claimed' && !message.intent && message.permission_generation===member.generation,
      'CLAIM_DENIED','Намерение отправки уже было подтверждено. Повтор запрещён.');
    if(run.mode==='workflow'){
      if(!alreadyChecked){
        if(await this.workflow.superseded(run,member,message))return {superseded:true,expires_at:0};
        requireValue(await this.workflow.admit(member.target)&&this.workflow.observe(member.target).canSend,'BUSY','Адресат занят. Попытка оставлена без повтора; требуется проверка.');
      }
      else requireValue(this.workflow.observe(member.target).canSend,'BUSY','Адресат изменился перед отправкой.');
      this.workflow.begin(run,member,message);
    }
    message.intent=true;
    this.event(run,'binding.verified',{participant_id:member.id,message_id:message.message_id,conversation_key:member.identity});
    this.event(run,'send.intent',{participant_id:member.id,message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id});
    return {message_id:message.message_id,permission_generation:member.generation,expires_at:this.panels.get(input.panel_instance_id).expiresAt};
  }
  async _report(input) {
    const {run,message}=this.attempt(input,false);
    requireValue(['accepted','rejected','unknown'].includes(input.outcome) && message.intent,'INPUT','Некорректный результат отправки.');
    requireValue(message.delivery==='claimed'||message.delivery===input.outcome||message.resolved_by_read,'CONFLICT','Результат доставки уже записан.');
    if(!message.resolved_by_read)message.delivery=input.outcome;
    this.event(run,'send.report',{message_id:message.message_id,delivery_attempt_id:message.delivery_attempt_id,outcome:input.outcome});
    if(run.mode==='workflow')await this.workflow.observed(run,run.members[message.recipient_id]);
    return {delivery:message.delivery,read:message.read};
  }
  async _read(input) {
    const {run,member}=this.member(input),message=run.messages.find(m=>m.message_id===input.message_id);
    requireValue(message && message.recipient_id===member.id,'READ_DENIED','Сообщение недоступно этому участнику.');
    if(run.mode==='workflow'&&await this.workflow.superseded(run,member,message)){
      message.superseded_read=true;
      this.event(run,'message.obsolete_read',{participant_id:member.id,message_id:message.message_id});
      await this.workflow.observed(run,member);
      return {message_id:message.message_id,superseded:true,
        instructions:'Этот сигнал устарел. Не выполняйте его и не повторяйте task:start. Для диалога версии 1 вызовите workflow_assignment_yield с reason=handled для этого уведомления, затем завершите ход.'};
    }
    this.event(run,'read.requested',{participant_id:member.id,message_id:message.message_id});
    if(!message.read){message.read=true;this.event(run,'message.read',{participant_id:member.id,message_id:message.message_id});}
    this.event(run,'read.returned',{participant_id:member.id,message_id:message.message_id});
    if(run.mode==='workflow')await this.workflow.observed(run,member);
    const {idempotency_key,fingerprint,...value}=message;
    return {...structuredClone(value),...(run.mode==='workflow'?{role_protocol:ROLE_PROTOCOL_VERSION,
      instructions:roleUpdate(member.role==='O'?'orchestrator':'executor',message.dialogue_version??0)+'\nПрочитайте ВСЕ части workflow_communication_read_context для основного context_ref и каждого contexts[].sha256, part от 0 до total-1. Сервисное событие backend содержит факты, не авторское задание агента. Действуйте в рамках роли и Workflow Kit; не повторяйте выполненные действия.'}:{})};
  }
  _telemetry(input) {
    const {run}=this.panel(input),data=input.event;
    requireValue(data&&uuid(data.event_id)&&CLIENT_EVENTS.has(data.event_type)&&Number.isSafeInteger(data.client_sequence)
      &&data.client_sequence>=1&&typeof data.client_time==='string'&&!Number.isNaN(Date.parse(data.client_time))
      &&Number.isFinite(data.duration_ms)&&data.duration_ms>=0&&data.duration_ms<=86400000,'INPUT','Некорректное событие панели.');
    const safe={event_id:data.event_id,event_type:data.event_type,client_sequence:data.client_sequence,client_time:new Date(data.client_time).toISOString(),
      duration_ms:data.duration_ms,duration_kind:'since-panel-mount',
      ...(data.error_code?{error_code:ERROR_CODES.has(data.error_code)?data.error_code:'MCP_ERROR'}:{})};
    if(data.event_type==='rpc.completed'){
      requireValue(RPC_OPERATIONS.has(data.operation)&&Number.isFinite(data.operation_ms)&&data.operation_ms>=0
        &&data.operation_ms<=86400000,'INPUT','Некорректная длительность обращения панели.');
      Object.assign(safe,{operation:data.operation,operation_ms:data.operation_ms,clock_domain:'panel-monotonic'});
    }
    else if(data.operation_ms!==undefined){
      requireValue(Number.isFinite(data.operation_ms)&&data.operation_ms>=0&&data.operation_ms<=86400000,'INPUT','Некорректная длительность SDK.');
      Object.assign(safe,{operation_ms:data.operation_ms,clock_domain:'panel-monotonic'});
    }
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
  _telemetryBatch(input){
    requireValue(Array.isArray(input.events)&&input.events.length>0&&input.events.length<=16,'INPUT','Нужно от 1 до 16 событий.');
    for(const event of input.events)this._telemetry({...input,event});
    return {seq:this.run(input).events.length};
  }
  async status(input){
    await this.ready;await this.tail;await this.enrollment.validateInput(input);
    const value=structuredClone(this._status(input)),{run,member}=this.member(input);
    if(run.mode==='workflow'&&member.target.dialogue_version===1){
      if(input.view!=='panel')value.assignments=await this.assignment.roster(run,member);
      else value.assignments=this.assignment.targets(run).filter(t=>t.role==='E'&&(member.role==='O'||t.local_session_id===member.target.local_session_id))
        .map(t=>{
          const messages=run.messages.filter(m=>m.assignment_id===t.assignment_id&&m.scope_id===run.grant.scope_id&&!m.superseded);
          const attempt=Math.max(1,...messages.map(m=>m.attempt??1)),latest=kind=>messages.findLast(m=>m.kind===kind&&m.attempt===attempt);
          const task=latest('task'),result=latest('result'),acceptance=latest('acceptance'),physical=this.workflow.observe(t);
          return {task_id:t.task_id,assignment_id:t.assignment_id,attempt,projection:true,
            phase:run.grant.phase==='complete'||acceptance?.kit_transport_closed?'INTEGRATED':'channel',
            physical:physical?{busy:physical.busy===true,stopped:physical.stopped===true,commandsIdle:physical.commandsIdle===true}:null,
            channel:this.workflow.progress(t.local_session_id),
            dialogue:{attempt,grant:task?{message_id:task.message_id}:null,
              result:result?{message_id:result.message_id,source_commit:result.source_commit}:null,
              acceptance:acceptance?{message_id:acceptance.message_id,source_commit:acceptance.source_commit}:null}};
        });
      value.pending_intents=Object.values(run.assignment_intents??{}).filter(i=>i.phase!=='published'
        &&(member.role==='O'||i.sender_id===member.id||i.target.local_session_id===member.target.local_session_id))
        .map(i=>({message_id:i.message_id,assignment_id:i.effect.assignment_id,phase:i.phase,error:i.error??null}));
      for(const message of value.messages.slice(-30))if(message.context_ref){
        try{const text=this.store?await this.store.readContent(message.context_ref):this.workflow.contents.get(message.context_ref);
          if(typeof text==='string')message.preview=text.slice(0,1600)+(text.length>1600?'…':'');}
        catch{message.preview='Текст временно недоступен; сообщение сохранено.';}
      }
    }
    return value;
  }
  async recover(input){
    await this.ready;await this.tail;const identity=communicationIdentity(input.metadata),participants=[];
    for(const run of this.runs.values())for(const member of Object.values(run.members))if(member.identity===identity) {
      if(run.mode==='workflow') {
        try{await this.enrollment.validate(member.target);}catch{continue;}
        participants.push(this.enrollment.publicMember(run,member));
      }else participants.push({run_id:run.id,participant_id:member.id,role:member.role});
    }
    return {participants,build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL,
      assignment_dialogue_version:ASSIGNMENT_DIALOGUE_VERSION,role_protocol_version:ROLE_PROTOCOL_VERSION,critical_error:this.critical};
  }
  visibleEvents(run,member,events) {
    if(run.mode!=='workflow'||member.role==='O')return events;
    const messages=new Set(run.messages.filter(m=>m.sender_id===member.id||m.recipient_id===member.id).map(m=>m.message_id));
    return events.filter(e=>e.participant_id===member.id||messages.has(e.message_id)
      ||e.local_session_id===member.target.local_session_id||e.event_type.startsWith('backend.'));
  }
  async journal(input){await this.ready;await this.tail;const {run,member}=this.member(input);
    await this.enrollment.validateInput(input);
    const after=input.after_seq??0;requireValue(Number.isSafeInteger(after)&&after>=0&&after<=run.events.length,'CURSOR','Некорректный курсор.');
    return {events:structuredClone(this.visibleEvents(run,member,run.events.slice(after,after+100))),seq:Math.min(after+100,run.events.length),total_seq:run.events.length,critical_error:this.critical};}
  async export(input){await this.ready;await this.tail;const {run,member}=this.member(input);
    await this.enrollment.validateInput(input);
    const after=input.after_seq??0,through=input.through_seq??run.events.length;
    requireValue(Number.isSafeInteger(after)&&Number.isSafeInteger(through)&&after>=0&&after<=through&&through<=run.events.length,'CURSOR','Некорректные границы экспорта.');
    const next=Math.min(after+100,through),events=this.visibleEvents(run,member,run.events.slice(after,next));
    return {jsonl:events.map(e=>JSON.stringify(e)).join('\n')+(events.length?'\n':''),after_seq:next,through_seq:through,complete:next===through,
      summary:{run_id:run.id,events:through,through_seq:through,visibility:run.mode==='workflow'&&member.role==='E'?'own-assignment':'whole-run',
        page_from:after,page_through:next,protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
        sdk_versions:SDK_VERSIONS,gaps:this.visibleEvents(run,member,run.events.slice(0,through)).filter(e=>e.event_type==='frontend.gap')
          .map(({seq,panel_instance_id,from,to})=>({seq,panel_instance_id,from,to})),critical_error:this.critical}};}
  dispose(){this.disposed=true;this.workflow.dispose();for(const probe of this.probes.values())clearTimeout(probe.timer);this.probes.clear();for(const w of this.waiters.values())w.wake('cancel');}
}
for(const name of MUTATIONS)PluginCommunication.prototype[name]=function(input){return this.mutate(name,input);};
