import {createHash} from 'node:crypto';
import {readCommandActivity} from './command-activity.mjs';
import {executorPageState} from './executor-session.mjs';
import {AUTOMATIC_DIALOGUE_ENABLED} from '../../contracts/backend.mjs';
import {currentSignal} from '@webpilot/workflow-kit/lib/signal-state';

const hash=value=>createHash('sha256').update(value).digest('hex');
// A narrow adapter for the existing scheduler. It owns no assignments or plan.
export class DialogueDelivery {
  constructor({store,getPlugin,record,route,state,signals,kitPermission=async()=>{}}){Object.assign(this,{store,getPlugin,record,route,state,signals,kitPermission});}
  async currentMessage(target,message){
    if(message.kind==='startup-context'){
      const project=this.project(target.local_session_id),attempt=project?.attempt;
      if(!project||project.preparationPaused||attempt?.requestId!==message.request_id||attempt.contextTransport!=='panel')return false;
      // A discussion chat has already received an immutable, authenticated
      // model-pull snapshot. Its remaining reads acknowledge that snapshot,
      // not the latest plan revision. All pre-open, SDK and O/E checks stay strict.
      if(target.role==='S'&&message.delivery_mode==='model-pull'&&message.read
        &&message.parts_read?.includes(0))return true;
      const info=await this.store.inspect(project.workspace,project.sessionId);
      return await this.record(project)?.controller.packetIsCurrent(attempt.packet,{...project,...info})===true;
    }
    if(message.dialogue_version===1&&message.assignment_id){
      const state=await this.getPlugin().communication.assignment.state(target,message.assignment_id);
      if((state.dialogue?.attempt??1)!==message.attempt)return false;
      if(message.block_id&&state.block?.block_id!==message.block_id&&state.last_decision?.block_id!==message.block_id)return false;
    }
    if(!message.signal_id)return true;
    const project=this.project(target.local_session_id);
    if(!project||!this.signals)return false;
    const signals=await this.signals(project.parentWorkspace??project.workspace);
    const signal=signals.find(s=>s.id===message.signal_id&&s.scope_id===message.scope_id
      &&s.assignment_id===message.assignment_id&&s.task_id===message.task_id);
    return !!signal&&currentSignal(signals,signal);
  }
  uses(project){return !!project&&this.route(project.parentWorkspace??project.workspace,project.parentScopeId??project.scopeId)==='plugin-v1';}
  owned(project){return !!project&&this.store.project(project.parentWorkspace??project.workspace)?.planExecution?.dialogue_version===1;}
  project(sessionId){const p=this.store.snapshot().projects.find(p=>p.sessions.some(s=>s.sessionId===sessionId));return p&&this.store.project(p.workspace,sessionId);}
  observe(target){
    const project=this.project(target.local_session_id),record=this.record(project),page=record?.pageState.current;
    return {...executorPageState(record),draftPresent:!!page?.state?.draftPresent,documentId:page?.documentId??null,
      observationSeq:page?.seq??0,
      userMessagesRevision:page?.state?.userMessagesRevision??0,lastMessageRole:page?.state?.lastMessageRole??null};
  }
  async reconcile(target){
    const project=this.project(target.local_session_id),record=this.record(project);
    if(!record)return null;
    let timer;
    try{return await Promise.race([(async()=>{
      if(!await record.composer.observeSnapshot())return null;
      const activity=await readCommandActivity(project.workspace);
      if(this.record(this.project(target.local_session_id))!==record)return null;
      return {...this.observe(target),commandsIdle:!activity.commandActive};
    })(),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2000);timer.unref?.();})]);}
    finally{clearTimeout(timer);}
  }
  async admit(target,message){
    const project=this.project(target.local_session_id);
    if(message?.kind==='startup-context'){
      if(!project||project.attempt?.state!=='sent'||project.attempt.requestId!==message.request_id
        ||!this.observe(target).canSend||!await this.currentMessage(target,message))return {allowed:false,reason:'admission-denied'};
      return (await readCommandActivity(project.workspace)).commandActive?{allowed:false,reason:'commands-active'}:{allowed:true};
    }
    // The user's own choice is admitted without the plan permission; physical checks stay.
    if(message?.kind==='user-choice'){
      if(!project||!this.observe(target).canSend)return {allowed:false,reason:'admission-denied'};
      return (await readCommandActivity(project.workspace)).commandActive?{allowed:false,reason:'commands-active'}:{allowed:true};
    }
    if(!this.uses(project)||!(this.owned(project)?['running']:['running','pausing']).includes(this.state(project.parentWorkspace??project.workspace,target.scope_id).state)
      ||!this.observe(target).canSend)return {allowed:false,reason:'admission-denied'};
    return (await readCommandActivity(project.workspace)).commandActive
      ?{allowed:false,reason:'commands-active'}:{allowed:true};
  }
  async prepareBootstrap(project){
    if(!AUTOMATIC_DIALOGUE_ENABLED)throw Object.assign(Error('Канал стартового контекста отключён.'),{code:'STARTUP_CHANNEL_REQUIRED'});
    const ticket=await this.getPlugin().reserveParticipant(project.sessionId);
    if(project.role==='executor'&&this.owned(project)){
      const origin=this.project(project.executionOriginSessionId);
      if(origin)await this.send(origin,'Назначение создано; подключение исполнителя продолжается параллельно. Сейчас подготовьте task и выбранный контекст через workflow_assignment_prepare с dispatch_when_ready=true: это явное разрешение отправить сохранённое поручение при подтверждённой готовности канала. Используйте recipient_ref из read_message, attempt=1. Отдельного ready и dispatch ждать не нужно. Без dispatch_when_ready сохраняется только черновик. Данные backend: '+JSON.stringify({
        assignment_id:project.assignmentId,task_id:project.taskId}), 'recovery',{
        key:'prepare:'+project.assignmentId+':v2',subject:{assignment_id:project.assignmentId,task_id:project.taskId},attempt:1});
    }
    return {...ticket,context_transport:'panel'};
  }
  async stageStartup(project,attempt){
    const plugin=this.getPlugin(),target=await plugin.participantTarget(project.sessionId);
    if(!target)throw Object.assign(Error('Получатель стартового пакета не подтверждён.'),{code:'PLUGIN_PARTICIPANT_UNAVAILABLE'});
    return plugin.communication.startup.stage(target,{request_id:attempt.requestId,text:attempt.startupText});
  }
  async permission(workspace,scope,phase){
    if(this.route(workspace,scope)!=='plugin-v1')return;
    const communication=this.getPlugin()?.communication;
    if(this.store.project(workspace)?.planExecution?.dialogue_version===1)
      await this.kitPermission(workspace,{scope_id:scope,backend_id:communication.backendId,backend_pid:process.pid,active:phase==='running'});
    const settled=[...(communication?.runs.values()??[])].find(run=>run.mode==='workflow'&&run.project_id===this.store.project(workspace)?.projectId
      &&run.grant?.scope_id===scope&&run.grant.phase===phase&&run.grant.boot===communication.backendId);
    if(settled)return communication.workflow.state(settled);
    const project=this.store.project(workspace),origin=project?.planExecution?.execution_origin_session_id
      ??this.store.snapshot().projects.find(p=>p.workspace===workspace)?.sessions.find(s=>s.orchestratorScopeId===scope&&!s.archivedAt)?.sessionId;
    const target=await this.getPlugin().participantTarget(origin);
    if(!target||target.scope_id!==scope)throw Object.assign(Error('Оркестратор опубликованного плана не подтверждён.'),{code:'PLUGIN_PLAN_IDENTITY'});
    try{return await this.getPlugin().communication.workflow.grant(target,phase==='not-started'?'paused':phase);}
    catch(error){
      if(target.dialogue_version===1)await this.kitPermission(workspace,{scope_id:scope,
        backend_id:communication.backendId,backend_pid:process.pid,active:false});
      throw error;
    }
  }
  async send(project,text,kind,meta={}){
    const plugin=this.getPlugin(),target=await plugin.participantTarget(project.sessionId);
    if(!target)throw Object.assign(Error('Назначение адресата больше не действует.'),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
    const source=meta.sourceSessionId?await plugin.participantTarget(meta.sourceSessionId):null;
    const receipt=await plugin.communication.workflow.enqueue(target,{key:meta.key??kind+':'+hash(JSON.stringify([target.scope_id,target.local_session_id,text])),
      kind:meta.kind??kind,text,source,block_id:meta.block_id??null,signal_id:meta.signal_id??null,
      subject:meta.subject??null,attempt:meta.attempt??null,role:meta.role??null});
    return {state:'queued',message_id:receipt.message_id};
  }
  async start(project){
    if(!this.uses(project))return;
    if(this.owned(project)){
      const plugin=this.getPlugin(),progress=plugin.communication.workflow.progress(project.sessionId);
      if(!progress?.sdk||!progress.permitted||!this.observe({local_session_id:project.sessionId}).stopped)return;
      const origin=this.project(project.executionOriginSessionId),target=await plugin.participantTarget(origin?.sessionId);
      if(!target)return;
      const state=await plugin.communication.assignment.state(target,project.assignmentId),attempt=state.dialogue?.attempt??1;
      if(state.block){
        const worker=await plugin.participantTarget(project.sessionId),physical=worker&&await this.reconcile(worker);
        if(!physical?.stopped||!physical.commandsIdle||physical.busy)return;
        return this.send(origin,'Исполнитель припаркован на текущей блокировке; локальные команды завершены. Перед изменением общей среды сверьте parked всех затронутых назначений через participants. Данные backend: '+JSON.stringify({
          assignment_id:project.assignmentId,task_id:project.taskId,attempt,block_id:state.block.block_id}), 'recovery',{
          key:'parked:'+hash(JSON.stringify([project.assignmentId,attempt,state.block.block_id,physical.documentId,physical.turnId,physical.assistantRevision])),
          block_id:state.block.block_id,subject:{assignment_id:project.assignmentId,task_id:project.taskId},attempt});
      }
      if(state.migration&&state.dialogue?.grant?.legacy_authorization&&!state.dialogue.result){
        return this.send(origin,'Назначение переведено на рабочий диалог. Обновите инструкции исполнителя адресным context. Если есть проверенный коммит, запросите у E result этого коммита без повторения работы; иначе уточните сохранённую точку и продолжите её. Данные backend: '+JSON.stringify({
          assignment_id:project.assignmentId,task_id:project.taskId,attempt,source_commit:state.dialogue.grant.source_commit??null}),'recovery',{
          key:'migrated:'+project.assignmentId+':'+state.migration.operation_id,subject:{assignment_id:project.assignmentId,task_id:project.taskId},attempt});
      }
      if(state.dialogue?.grant)return;
      for(const run of plugin.communication.runs.values()){
        const intent=Object.values(run.assignment_intents??{}).find(i=>i.effect.assignment_id===project.assignmentId
          &&i.effect.attempt===attempt&&i.effect.scope_id===target.scope_id&&i.effect.kind==='task'
          &&['authorized','needs_confirmation'].includes(i.phase));
        if(!intent)continue;
        if(intent.phase==='authorized'&&plugin.communication.assignment.authorized(run,intent))return;
        return this.send(origin,'Сохранённое поручение требует новой авторизации после изменения разрешения или состояния назначения. Проверьте актуальные требования/попытку и draft_id через workflow_assignment_status. Если они совпадают, вызовите workflow_assignment_dispatch с when_ready=true; иначе подготовьте новое поручение. Данные backend: '+JSON.stringify({
          assignment_id:project.assignmentId,task_id:project.taskId,attempt,draft_id:intent.message_id}),'recovery',{
          key:'authorize:'+intent.message_id+':'+run.grant.generation,
          subject:{assignment_id:project.assignmentId,task_id:project.taskId},attempt});
      }
      return this.send(origin,'Назначение готово к получению задания оркестратора. Данные backend (не рабочее поручение): '+JSON.stringify({
        assignment_id:project.assignmentId,task_id:project.taskId,attempt}), 'ready',{
        key:'ready:'+project.assignmentId+':'+attempt,subject:{assignment_id:project.assignmentId,task_id:project.taskId},attempt});
    }
    return this.send(project,['Загрузочный ход завершён. Начни своё назначение Workflow Kit.',
      'Выполни task:start '+project.taskId+', затем порученную задачу, проверки и commit --task '+project.taskId+'.',
      'Полное задание и recovery уже находятся в стартовом контексте; при изменении прочитай актуальный recovery.',
      'При обычном техническом препятствии обратись к оркестратору через task:block и закончи ход в ожидании адресного решения. Пользователю писать «продолжай» не требуется.'
    ].join('\n'),'assignment-start',{key:'assignment-start:'+project.assignmentId});
  }
  receipt(messageId){
    for(const run of this.getPlugin()?.communication.runs.values()??[]){const m=run.messages.find(m=>m.message_id===messageId);if(m)return this.getPlugin().communication.workflow.receipt(m);}
    return null;
  }
  reserved(project){
    if(!this.uses(project))return false;
    for(const run of this.getPlugin()?.communication.runs.values()??[])if(run.mode==='workflow')
      if(run.messages.some(m=>m.recipient_session_id===project.sessionId&&m.scope_id===(project.parentScopeId??project.scopeId)&&!m.reply_observed&&!m.startup_complete))return true;
    return false;
  }
  settled(workspace,scope){
    const project=this.store.project(workspace);
    for(const run of this.getPlugin()?.communication.runs.values()??[])if(run.mode==='workflow'&&run.project_id===project?.projectId&&run.grant?.scope_id===scope){
      if(run.messages.some(m=>m.scope_id===scope&&!m.reply_observed&&!m.superseded&&!m.startup_complete))return false;
      if(this.getPlugin().communication.assignment?.kit?.close&&run.messages.some(m=>m.scope_id===scope
        &&m.kind==='acceptance'&&!m.kit_transport_closed))return false;
      if(Object.values(run.assignment_intents??{}).some(i=>i.effect.scope_id===scope&&['authorized','needs_confirmation','prepared','deferred'].includes(i.phase)))return false;
    }
    return true;
  }
}
