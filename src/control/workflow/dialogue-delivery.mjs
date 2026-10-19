import {createHash} from 'node:crypto';
import {readCommandActivity} from './command-activity.mjs';
import {executorPageState} from './executor-session.mjs';
import {AUTOMATIC_DIALOGUE_ENABLED} from '../../contracts/backend.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
// A narrow adapter for the existing scheduler. It owns no assignments or plan.
export class DialogueDelivery {
  constructor({store,getPlugin,record,route,state}){Object.assign(this,{store,getPlugin,record,route,state});}
  uses(project){return !!project&&this.route(project.parentWorkspace??project.workspace,project.parentScopeId??project.scopeId)==='plugin-v1';}
  project(sessionId){const p=this.store.snapshot().projects.find(p=>p.sessions.some(s=>s.sessionId===sessionId));return p&&this.store.project(p.workspace,sessionId);}
  observe(target){
    const project=this.project(target.local_session_id),record=this.record(project),page=record?.pageState.current;
    return {...executorPageState(record),documentId:page?.documentId??null,
      userMessagesRevision:page?.state?.userMessagesRevision??0,lastMessageRole:page?.state?.lastMessageRole??null};
  }
  async admit(target){
    const project=this.project(target.local_session_id);
    if(!this.uses(project)||!['running','pausing'].includes(this.state(project.parentWorkspace??project.workspace,target.scope_id).state)
      ||!this.observe(target).canSend)return false;
    return !(await readCommandActivity(project.workspace)).commandActive;
  }
  async prepareBootstrap(project){
    if(!AUTOMATIC_DIALOGUE_ENABLED||!['orchestrator','executor'].includes(project.role))return null;
    const selected=this.route(project.parentWorkspace??project.workspace,project.parentScopeId??project.scopeId);
    if(selected==='legacy-dom'||project.role==='executor'&&selected!=='plugin-v1')return null;
    return this.getPlugin().reserveParticipant(project.sessionId);
  }
  async permission(workspace,scope,phase){
    if(this.route(workspace,scope)!=='plugin-v1')return;
    const communication=this.getPlugin()?.communication;
    const settled=[...(communication?.runs.values()??[])].find(run=>run.mode==='workflow'&&run.project_id===this.store.project(workspace)?.projectId
      &&run.grant?.scope_id===scope&&run.grant.phase===phase&&run.grant.boot===communication.backendId);
    if(settled)return communication.workflow.state(settled);
    const project=this.store.project(workspace),origin=project?.planExecution?.execution_origin_session_id
      ??this.store.snapshot().projects.find(p=>p.workspace===workspace)?.sessions.find(s=>s.orchestratorScopeId===scope&&!s.archivedAt)?.sessionId;
    const target=await this.getPlugin().participantTarget(origin);
    if(!target||target.scope_id!==scope)throw Object.assign(Error('Оркестратор опубликованного плана не подтверждён.'),{code:'PLUGIN_PLAN_IDENTITY'});
    return this.getPlugin().communication.workflow.grant(target,phase==='not-started'?'paused':phase);
  }
  async send(project,text,kind,meta={}){
    const plugin=this.getPlugin(),target=await plugin.participantTarget(project.sessionId);
    if(!target)throw Object.assign(Error('Назначение адресата больше не действует.'),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
    const source=meta.sourceSessionId?await plugin.participantTarget(meta.sourceSessionId):null;
    const receipt=await plugin.communication.workflow.enqueue(target,{key:meta.key??kind+':'+hash(JSON.stringify([target.scope_id,target.local_session_id,text])),
      kind:meta.kind??kind,text,source,block_id:meta.block_id??null,signal_id:meta.signal_id??null});
    return {state:'queued',message_id:receipt.message_id};
  }
  async start(project){
    if(!this.uses(project))return;
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
      if(run.messages.some(m=>m.recipient_session_id===project.sessionId&&m.scope_id===(project.parentScopeId??project.scopeId)&&!m.reply_observed))return true;
    return false;
  }
}
