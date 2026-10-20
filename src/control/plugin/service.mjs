import { createHash } from 'node:crypto';
import { validateContextPacket } from '../../contracts/context.mjs';
import { PluginCommunication, COMMUNICATION_BUILD, COMMUNICATION_PROTOCOL } from './communication.mjs';
import {localParticipantTarget} from './enrollment.mjs';

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
  constructor({ projects, loadContext, plans=null,migrate=null, communicationStore = null, onChange = () => {}, observe, admit, reconcile, currentMessage, onCommunicationChange }) {
    Object.assign(this, { projects, loadContext, onChange,plans });
    this.communication = new PluginCommunication({store:communicationStore,resolveTarget:id=>localParticipantTarget(projects,id),
      verifyTarget:id=>this.participantTarget(id),observe,admit,reconcile,currentMessage,onChange:onCommunicationChange,
      dialogueKit:plans?{status:(target,id)=>this.dialogueOperation(target,'assignment:dialogue-status',id),
        apply:(target,input)=>this.dialogueOperation(target,'assignment:dialogue',input),migrate}:null});
  }
  async dialogueOperation(target,command,input){
    const fresh=await this.participantTarget(target.local_session_id);
    if(!fresh||fresh.role!==target.role||fresh.scope_id!==target.scope_id||fresh.assignment_id!==target.assignment_id)
      throw fail('PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED','Назначение автора изменилось.');
    const project=this.projects.snapshot().projects.find(p=>p.sessions.some(s=>s.sessionId===target.local_session_id));
    if(!project)throw fail('PLUGIN_COMMUNICATION_PROJECT_REMOVED','Проект удалён.');
    try{
      for(let attempt=0;;attempt++)try{
        return command==='assignment:dialogue-status'?await this.plans.call(project.workspace,command,['--id',input])
          :await this.plans.call(project.workspace,command,[],input);
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
  async reserveParticipant(sessionId) {
    const target=await this.participantTarget(sessionId);
    if(!target)throw fail('PLUGIN_PARTICIPANT_UNAVAILABLE','Нет действующего назначения или оркестратора для этой сессии.');
    return this.communication.reserve(target);
  }
  async panel({enrollment_ticket,metadata}={}) {
    await this.communication.ready;
    const registration=enrollment_ticket?await this.communication.enroll(enrollment_ticket,metadata):null;
    return {...(registration?{registration}:{}),communication:{protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,
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
