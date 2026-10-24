import { createHash } from 'node:crypto';
import { validateContextPacket } from '../../contracts/context.mjs';
import { PluginCommunication, COMMUNICATION_BUILD, COMMUNICATION_PROTOCOL } from './communication.mjs';
import {localParticipantTarget} from './enrollment.mjs';
import {ROLE_PROTOCOL_VERSION,roleUpdate} from '@webpilot/workflow-kit/lib/role-protocol';

const fail = (code, message) => Object.assign(new Error(message), { code });
const key = value => typeof value === 'string' && value.length > 0 && value.length <= 512;
export function pluginConversationKey(metadata) {
  if (!key(metadata?.['openai/session'])) throw fail('PLUGIN_SESSION_REQUIRED',
    'Клиент не передал идентификатор разговора. Подключите плагин в поддерживаемом разговоре ChatGPT.');
  return createHash('sha256').update(JSON.stringify(['openai/organization', 'openai/subject', 'openai/session']
    .map(name => key(metadata[name]) ? metadata[name] : ''))).digest('hex');
}

// Both frontends use the same ProjectsService. No profile copies or browser operations.
export class PluginProjects {
  constructor({ projects, loadContext, plans=null,migrate=null, communicationStore = null, onChange = () => {}, observe, admit, reconcile, currentMessage, onCommunicationChange, workProgress = null, userChoice = null, choose = null }) {
    Object.assign(this, { projects, loadContext, onChange,plans });
    this.communication = new PluginCommunication({store:communicationStore,resolveTarget:id=>localParticipantTarget(projects,id),
      verifyTarget:id=>this.participantTarget(id),verifyTerminal:(target,message)=>this.terminalTarget(target,message),
      observe,admit,reconcile,currentMessage,onChange:onCommunicationChange,workProgress,userChoice,choose,
      dialogueKit:plans?{status:(target,id)=>this.dialogueOperation(target,'assignment:dialogue-status',id),
        close:(target,input)=>this.dialogueOperation(target,'assignment:transport',input),
        apply:(target,input)=>this.dialogueOperation(target,'assignment:dialogue',input),migrate}:null});
  }
  async terminalTarget(target,message){
    if(target.role!=='E'||message.kind!=='acceptance'||!message.read||!message.yielded
      ||message.assignment_id!==target.assignment_id||message.scope_id!==target.scope_id)return false;
    const all=this.projects.snapshot().projects;
    const child=all.find(p=>!p.archivedAt&&p.sessions.some(s=>s.sessionId===target.local_session_id&&!s.archivedAt));
    const session=child?.sessions.find(s=>s.sessionId===target.local_session_id);
    if(!session||session.external||session.closedPlanCommit||session.role!=='executor'
      ||session.assignmentId!==target.assignment_id||session.taskId!==target.task_id
      ||session.parentProjectId!==target.project_id||session.parentScopeId!==target.scope_id
      ||session.executionOriginSessionId!==target.origin_session_id)return false;
    const origin=await this.participantTarget(target.origin_session_id);
    if(origin?.role!=='O'||origin.project_id!==target.project_id||origin.scope_id!==target.scope_id)return false;
    const parent=all.find(p=>p.projectId===target.project_id&&!p.parentWorkspace&&!p.archivedAt);
    if(!parent||session.parentWorkspace!==parent.workspace)return false;
    const state=await this.dialogueOperation(origin,'assignment:dialogue-status',target.assignment_id);
    return state.phase==='INTEGRATED'&&state.scope_id===target.scope_id&&state.task_id===target.task_id
      &&state.worktree===child.workspace&&state.cleanup?.status==='DONE'&&state.cleanup.commands_idle===true
      &&['message_id','attempt','source_commit'].every(k=>state.dialogue?.acceptance?.[k]===message[k]);
  }
  async dialogueOperation(target,command,input){
    const fresh=await this.participantTarget(target.local_session_id);
    if(!fresh||fresh.role!==target.role||fresh.scope_id!==target.scope_id||fresh.assignment_id!==target.assignment_id)
      throw fail('PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED','Назначение автора изменилось.');
    const project=this.projects.snapshot().projects.find(p=>p.sessions.some(s=>s.sessionId===target.local_session_id));
    if(!project)throw fail('PLUGIN_COMMUNICATION_PROJECT_REMOVED','Проект удалён.');
    try{
      for(let attempt=0;;attempt++)try{
        const timing={onTiming:span=>this.communication.recordKitTiming({...target,
          assignment_id:typeof input==='string'?input:input?.assignment_id??target.assignment_id},span)};
        return command==='assignment:dialogue-status'?await this.plans.call(project.workspace,command,['--id',input],null,timing)
          :await this.plans.call(project.workspace,command,[],input,timing);
      }catch(error){
        if(command==='assignment:dialogue-status'&&['PLAN_JSON','PLAN_MARKERS','PLAN_PROJECTION','ENOENT'].includes(error.code)&&attempt<2){
          // Git replaces the parent plan during integration. Retry only this
          // read; a stable invalid contract still fails closed.
          await new Promise(resolve=>setTimeout(resolve,50));continue;
        }
        // Kit reports this before acquiring its operation lock. Preserve the
        // durable operation ID while another assignment finishes its effect.
        if(command!=='assignment:dialogue'||error.code!=='WORKFLOW_LOCKED'||attempt>=40)throw error;
        await new Promise(resolve=>setTimeout(resolve,250));
        const current=await this.participantTarget(target.local_session_id);
        if(!current||current.scope_id!==target.scope_id||current.assignment_id!==target.assignment_id)
          throw fail('PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED','Назначение изменилось во время ожидания Kit.');
      }
    }
    catch(error){throw fail('PLUGIN_ASSIGNMENT_'+(error.code??'FAILED'),error.message);}
  }
  async participantTarget(sessionId) {
    // Integration replaces the on-disk plan while concurrent recipients read
    // their messages. Retry a fresh ownership read, never reuse a cached grant.
    for(let attempt=0;attempt<3;attempt++){
      try{
        const target=await this.participantSnapshot(sessionId);
        if(target||attempt===2)return target;
      }catch(error){
        if(!['WORKFLOW_PLAN_INVALID','WORKFLOW_NOT_INSTALLED','ENOENT'].includes(error.code)||attempt===2)throw error;
      }
      await new Promise(resolve=>setTimeout(resolve,50));
    }
  }
  async participantSnapshot(sessionId) {
    // Session cancellation/mode intent is committed before MCP admission, even
    // when a navigation event and an incoming tool call arrive together.
    await this.projects.whenIdle?.();
    const target=localParticipantTarget(this.projects,sessionId);if(!target)return null;
    const parent=this.projects.snapshot().projects.find(p=>p.projectId===target.project_id&&!p.parentWorkspace&&!p.archivedAt);
    if(!parent)return null;
    const info=await this.projects.inspect(parent.workspace,target.origin_session_id);
    if(info.projectId!==parent.projectId)return null;
    const projects={snapshot:()=>({projects:this.projects.snapshot().projects.map(p=>p.workspace===parent.workspace?{...p,...info}:p)}),
      project:workspace=>workspace===parent.workspace?info:this.projects.project(workspace)};
    const fresh=localParticipantTarget(projects,sessionId);if(!fresh)return null;
    if(fresh.role==='E'){
      const proof=await this.projects.assignmentProof(sessionId);
      if(!(proof?.phase==='ASSIGNED'||fresh.dialogue_version===1&&proof?.phase==='INTEGRATED')||proof.id!==fresh.assignment_id||proof.parent_scope_id!==fresh.scope_id
        ||proof.parent_task_id!==fresh.task_id)return null;
    }
    return fresh;
  }
  async reserveParticipant(sessionId,correlation) {
    const target=await this.participantTarget(sessionId);
    if(!target)throw fail('PLUGIN_PARTICIPANT_UNAVAILABLE','Нет действующего назначения или оркестратора для этой сессии.');
    return this.communication.reserve(target,correlation);
  }
  async panel({enrollment_ticket,metadata}={}) {
    await this.communication.ready;
    const registration=enrollment_ticket?await this.communication.enroll(enrollment_ticket,metadata):null;
    let startup_resume,startup_context,role_update,binding=registration;
    if(!binding&&metadata)try{binding=await this.communication.modelInput({metadata});
      await this.communication.enrollment.validateInput(binding);
    }catch{/* An unregistered panel still opens its normal connection view. */}
    if(binding){
      const c=this.communication,run=c.runs.get(binding.run_id),member=run.members[binding.participant_id],m=c.startup.message(run,member.target.local_session_id);
      if(m?.delivery_mode==='model-pull'&&!m.startup_complete)
        startup_context=await c.startupOpen({metadata,message_id:m.message_id});
      else if(m?.intent&&!m.startup_complete&&!m.superseded)startup_resume={message_id:m.message_id,
        instructions:'Продолжите чтение того же стартового пакета через workflow_communication_read_message/read_context и подтвердите workflow_startup_complete. Повтор уведомления не требуется.'};
      // A candidate that lost planning to the owner learns its new role here; no message enters its chat.
      const current=c.enrollment.resolveTarget?.(member.target.local_session_id);
      if(member.target.role==='O'&&!member.target.scope_id&&current?.role==='S'&&current.project_id===member.target.project_id)
        role_update={role_protocol:ROLE_PROTOCOL_VERSION,instructions:roleUpdate('discussion')};
    }
    return {...(registration?{registration}:{}),...(startup_context?{startup_context}:{}),...(startup_resume?{startup_resume}:{}),...(role_update?{role_update}:{}),communication:{protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
      storage:this.communication.store?'durable':'memory',critical_error:this.communication.critical}};
  }
  list() {
    return { projects: this.projects.snapshot().projects.filter(p => !p.archivedAt && !p.parentWorkspace)
      .map(p => ({ id: p.projectId, name: p.displayName || p.name,
        sessions: p.sessions.filter(s => !s.archivedAt).map(s => ({ id: s.sessionId, title: s.title || 'Новая сессия',
          external: s.external?.provider === 'chatgpt-plugin' })) })) };
  }
  project(id) {
    if (!key(id)) throw fail('PLUGIN_PROJECT_REQUIRED', 'Выберите проект из списка.');
    const matches = this.projects.snapshot().projects.filter(p => p.projectId === id && !p.archivedAt && !p.parentWorkspace);
    if (matches.length !== 1) throw fail('PLUGIN_PROJECT_UNAVAILABLE', 'Проект недоступен. Обновите список проектов.');
    return matches[0];
  }
  async open(projectId) {
    const p = this.project(projectId), info = await this.projects.inspect(p.workspace);
    if (info.projectId !== p.projectId) throw fail('PROJECT_REPLACED', 'В этой папке теперь другой проект.');
    return { project: { id: p.projectId, name: p.displayName || p.name },
      sessions: this.list().projects.find(v => v.id === p.projectId).sessions };
  }
  async connect({ projectId, requestId, metadata }) {
    if (!/^[0-9a-f-]{36}$/i.test(requestId ?? '')) throw fail('PLUGIN_REQUEST_INVALID', 'Некорректный идентификатор подключения.');
    const conversationKey = pluginConversationKey(metadata), p = this.project(projectId);
    const packet = validateContextPacket(await this.loadContext(p.workspace), p.workspace);
    if (packet.facts.project_id !== p.projectId) throw fail('PROJECT_REPLACED', 'Контекст принадлежит другому проекту.');
    const session = await this.projects.connectExternal(p.workspace, { projectId, requestId, conversationKey });
    this.onChange();
    return { project: { id: p.projectId, name: p.displayName || p.name }, sessionId: session.sessionId,
      workspace: p.workspace, context: packet.context, contextSha256: packet.context_sha256,
      contextBytes: packet.context_bytes, contextSignature: packet.signature,
      instructions: 'Контекст проекта получен через Workflow Pilot. Прочитайте его целиком до работы. Продолжайте в этом разговоре. Не создавайте другой диалог и не запускайте встроенный браузер. Правила и текущий план находятся в recovery.' };
  }
}
