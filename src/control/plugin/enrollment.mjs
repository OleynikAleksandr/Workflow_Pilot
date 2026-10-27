import {createHash, randomBytes} from 'node:crypto';

const fail = (code, message) => Object.assign(new Error(message), {code:'PLUGIN_COMMUNICATION_'+code});
const check = (value, code, message) => {if(!value)throw fail(code,message);};
const hash = value => createHash('sha256').update(value).digest('hex');
const ownsAttempt = (invitation,owner) => invitation.target.project_id===owner.project_id
  &&invitation.target.local_session_id===owner.local_session_id
  &&(invitation.request_id??null)===(owner.request_id??null)
  &&(invitation.attempt_generation??null)===(owner.attempt_generation??null);
const FIELDS=['project_id','local_session_id','origin_session_id','role','assignment_id','task_id','scope_id'];
const same = (a,b) => !!a && !!b && FIELDS.every(key=>key==='scope_id'&&a.role==='O'&&(a[key]==null||b[key]==null)
  ||(a[key]??null)===(b[key]??null))
  && ['workspace_id','origin_workspace_id'].every(key=>!b[key] || a[key]===b[key]);
export const workflowRunId = target => 'work:'+hash(JSON.stringify([target.project_id,target.origin_session_id]));

// A ticket authorizes only the first binding of a backend-selected local session.
// Raw tickets live in the targeted bootstrap only; the WAL contains their hashes.
export class ParticipantEnrollment {
  constructor(communication, resolveTarget, verifyTarget) {Object.assign(this,{communication,resolveTarget,verifyTarget});}
  async validate(target) {
    check(!this.communication.removedSessions.has(target.local_session_id),'PROJECT_REMOVED','Этот проект удалён из приложения.');
    const current=this.verifyTarget?await this.verifyTarget(target.local_session_id):this.current(target);
    check(same(current,target),'ASSIGNMENT_CHANGED','Проект или действующее назначение не подтверждены. Отправка остановлена.');
    return current;
  }
  async validateInput(input,operation=null) {
    const run=this.communication.runs.get(input.run_id);
    if(run?.mode!=='workflow'&&!input.target)return;
    if(operation==='enroll')check(run.enrollments?.[input.ticket_hash]?.status!=='revoked',
      'ENROLLMENT_REVOKED','Приглашение отозвано. Эта попытка запуска отменена.');
    const target=input.target??run.members[input.participant_id]?.target??run.enrollments?.[input.ticket_hash]?.target;
    if(target)await this.validate(target);
    if(input.recipient_id&&run?.members[input.recipient_id])await this.validate(run.members[input.recipient_id].target);
  }
  current(target) {
    check(!this.communication.removedSessions.has(target.local_session_id),'PROJECT_REMOVED','Этот проект удалён из приложения.');
    const current=this.resolveTarget?.(target.local_session_id);
    check(same(current,target),'ASSIGNMENT_CHANGED','Назначение или проект изменились. Ожидайте актуальный стартовый контекст Workflow Pilot.');
    return current;
  }
  // Upgrade only an exact, still-owned session; never infer ownership from a path.
  migrateRun(run) {
    if(run.mode!=='workflow'||run.removed)return;
    for(const saved of [...Object.values(run.members).map(m=>m.target),...Object.values(run.enrollments??{}).map(i=>i.target)]){
      if(!saved||saved.workspace_id)continue;
      const current=this.resolveTarget?.(saved.local_session_id);
      if(!same(current,saved)||!current.workspace_id)continue;
      Object.assign(saved,{workspace_id:current.workspace_id,origin_workspace_id:current.origin_workspace_id});
      this.communication.event(run,'identity.workspace_bound',{local_session_id:saved.local_session_id,workspace_id:saved.workspace_id});
    }
  }
  reserve(target,correlation={}) {
    this.current(target);
    const {request_id=null,attempt_generation=null}=correlation;
    check(request_id===null&&attempt_generation===null||typeof request_id==='string'&&request_id.length>0&&request_id.length<=128
      &&typeof attempt_generation==='string'&&attempt_generation.length>0&&attempt_generation.length<=128,'INPUT','Неверная корреляция запуска.');
    const ticket=randomBytes(32).toString('hex');
    return this.communication.mutate('reserve',{run_id:workflowRunId(target),target,ticket_hash:hash(ticket),request_id,attempt_generation})
      .then(result=>({...result,enrollment_ticket:ticket}));
  }
  evidence(ref,owner) {return this.communication.mutate('enrollmentEvidence',{...ref,owner});}
  evidenceInTransaction(input) {
    const invitation=this.communication.run(input).enrollments?.[input.ticket_hash];
    check(invitation&&ownsAttempt(invitation,input.owner),'ENROLLMENT_OWNER','Приглашение не принадлежит этой попытке.');
    return {run_id:input.run_id,ticket_hash:input.ticket_hash,request_id:invitation.request_id??null,
      attempt_generation:invitation.attempt_generation??null,status:invitation.status??'active',
      participant_id:invitation.participant_id??null,expires_at:invitation.expires_at};
  }
  async cancel(owner,ref=null,reason='cancelled') {
    const c=this.communication;await c.ready;await c.tail;
    check(!c.disposed,'CLOSED','Служба связи закрывается.');
    check(!c.critical,'STORE_BLOCKED','Отзыв не подтверждён: журнал заблокирован.');
    check(typeof owner?.project_id==='string'&&typeof owner.local_session_id==='string'
      &&typeof owner.request_id==='string'&&owner.request_id.length>0,'ENROLLMENT_OWNER','Нужен владелец отменяемой попытки.');
    const references=ref?[ref]:[...c.runs.values()].filter(r=>r.mode==='workflow'&&r.project_id===owner.project_id).flatMap(run=>{
      const matches=Object.entries(run.enrollments).filter(([,invitation])=>ownsAttempt(invitation,owner))
        .map(([ticket_hash])=>({run_id:run.id,ticket_hash}));
      return matches.length?matches:run.messages.some(m=>c.startup.ownsAttempt(m,owner))?[{run_id:run.id,ticket_hash:null}]:[];
    });
    let participant_id=null;
    for(const reference of references){
      const result=await c.mutate('revokeEnrollment',{...reference,owner,reason});
      participant_id??=result.participant_id;
    }
    return {status:participant_id?'registered-stopped':'revoked',participant_id,cancelled:true};
  }
  revokeInTransaction(input) {
    const c=this.communication,run=c.run(input),invitation=run.enrollments?.[input.ticket_hash];
    check(run.mode==='workflow'&&run.project_id===input.owner.project_id,'ENROLLMENT_OWNER','Запуск принадлежит другому проекту.');
    check(typeof input.reason==='string'&&input.reason.length<=200,'INPUT','Неверная причина отзыва.');
    if(input.ticket_hash)check(invitation&&ownsAttempt(invitation,input.owner),'ENROLLMENT_OWNER','Приглашение не принадлежит этой попытке.');
    if(invitation&&invitation.status!=='revoked'){
      invitation.status='revoked';invitation.revoked_at=c.now();invitation.revoked_reason=input.reason;
      c.event(run,'enrollment.revoked',{local_session_id:input.owner.local_session_id,request_id:input.owner.request_id??null});
    }
    const stopped=c.startup.cancelled(run,input.owner,input.reason);
    return {status:'revoked',participant_id:invitation?.participant_id??stopped.participant_id??null};
  }
  ensureRun(target) {
    const c=this.communication,id=workflowRunId(target);
    let run=c.runs.get(id);
    check(!run?.removed,'PROJECT_REMOVED','Этот запуск удалён из приложения.');
    check(!run||run.mode==='workflow','MODE','Этот запуск не предназначен для назначений.');
    if(!run) {
      check(c.runs.size<100,'LIMIT','Достигнут лимит запусков связи.');
      run={id,registry_version:2,mode:'workflow',project_id:target.project_id,
        origin_session_id:target.origin_session_id,members:{},enrollments:{},messages:[],events:[],probes:{},clientEvents:{},clientSequences:{}};
      c.runs.set(run.id,run);c.event(run,'backend.start');
    }
    check(run.project_id===target.project_id&&run.origin_session_id===target.origin_session_id,'BINDING','Запуск принадлежит другой сессии.');
    return run;
  }
  reserveInTransaction(input) {
    const c=this.communication,target=this.current(input.target),run=this.ensureRun(target);
    for(const [key,value] of Object.entries(run.enrollments))if(value.expires_at<=c.now()&&!value.participant_id&&value.status!=='revoked')delete run.enrollments[key];
    if(input.request_id!==null&&input.request_id!==undefined){
      check(!Object.values(run.enrollments).some(invitation=>ownsAttempt(invitation,{...target,...input,local_session_id:target.local_session_id,project_id:target.project_id})),
        'ENROLLMENT_EXISTS','Приглашение этой попытки уже сохранено. Сверьте и отзовите его; повторная отправка запрещена.');
      check(!Object.values(run.members).some(member=>member.target.local_session_id===target.local_session_id),
        'BINDING','Сессия уже зарегистрирована. Для нового разговора нужна отдельная локальная сессия.');
    }
    check(Object.keys(run.enrollments).length<256,'LIMIT','Достигнут лимит приглашений запуска.');
    run.enrollments[input.ticket_hash]={target:structuredClone(target),request_id:input.request_id??null,
      attempt_generation:input.attempt_generation??null,status:'active',expires_at:c.now()+30*60*1000,participant_id:null};
    c.event(run,'enrollment.reserved',{local_session_id:target.local_session_id,assignment_id:target.assignment_id??null});
    return {run_id:run.id,ticket_hash:input.ticket_hash,expires_at:run.enrollments[input.ticket_hash].expires_at};
  }
  async enroll(ticket,metadata) {
    check(typeof ticket==='string'&&/^[a-f0-9]{64}$/.test(ticket),'ENROLLMENT','Неверное приглашение панели. Используйте стартовый контекст своего назначения.');
    const c=this.communication;await c.ready;await c.tail;
    const ticket_hash=hash(ticket),run=[...c.runs.values()].find(run=>run.mode==='workflow'&&run.enrollments?.[ticket_hash]);
    check(run,'ENROLLMENT','Приглашение недоступно. Ожидайте актуальный стартовый контекст Workflow Pilot.');
    return c.mutate('enroll',{run_id:run.id,ticket_hash,metadata});
  }
  enrollInTransaction(input,identity) {
    const c=this.communication,run=c.run(input),invitation=run.enrollments?.[input.ticket_hash];
    check(invitation,'ENROLLMENT','Приглашение недоступно.');
    check(invitation.status!=='revoked','ENROLLMENT_REVOKED','Приглашение отозвано. Эта попытка запуска отменена.');
    const target=this.current(invitation.target);
    const previous=Object.values(run.members).find(member=>same(member.target,target));
    check(!previous||previous.identity===identity,'BINDING','Назначение уже связано с другим разговором.');
    check(![...c.runs.values()].filter(r=>r.mode==='workflow').some(r=>Object.values(r.members).some(member=>member.identity===identity&&!same(member.target,target))),
      'BINDING','Один разговор не может представлять разные назначения.');
    if(invitation.participant_id) {
      check(previous?.id===invitation.participant_id,'BINDING','Привязка приглашения изменилась.');
      return this.publicMember(run,previous);
    }
    check(invitation.expires_at>c.now(),'ENROLLMENT_EXPIRED','Приглашение истекло. Ожидайте новый стартовый контекст Workflow Pilot.');
    check(target.role!=='O'||!Object.values(run.members).some(member=>member.role==='O'&&member.id!==previous?.id),
      'BINDING','Оркестратор запуска уже зарегистрирован.');
    const member=previous??{id:c.makeId(),role:target.role,identity,target:structuredClone(target),generation:0,stopped:true};
    run.members[member.id]=member;invitation.participant_id=member.id;
    c.event(run,'enrollment.confirmed',{participant_id:member.id,role:member.role,assignment_id:target.assignment_id??null});
    return this.publicMember(run,member);
  }
  publicMember(run,member) {
    return {run_id:run.id,participant_id:member.id,role:member.role,mode:'workflow',
      project_id:member.target.project_id,local_session_id:member.target.local_session_id,
      ...(member.target.workspace_id?{workspace_id:member.target.workspace_id,origin_workspace_id:member.target.origin_workspace_id}:{}),
      assignment_id:member.target.assignment_id??null,task_id:member.target.task_id??null,scope_id:member.target.scope_id??null};
  }
}

// Resolve only backend-owned sessions. User-supplied role/IDs never enter this path.
export function localParticipantTarget(projects,sessionId) {
  // Persistence snapshots omit derived planExecution; use its project projection.
  const all=projects.snapshot().projects.map(project=>({...project,
    planExecution:projects.project?.(project.workspace)?.planExecution??project.planExecution,
    planView:projects.project?.(project.workspace)?.planView??project.planView}));
  const project=all.find(p=>!p.archivedAt&&p.sessions.some(s=>s.sessionId===sessionId&&!s.archivedAt));
  const session=project?.sessions.find(s=>s.sessionId===sessionId);
  if(!session||session.external||session.closedPlanCommit)return null;
  if(session.role==='executor') {
    const parent=all.find(p=>p.workspace===session.parentWorkspace&&!p.archivedAt&&!p.parentWorkspace);
    const origin=parent?.sessions.find(s=>s.sessionId===session.executionOriginSessionId&&!s.archivedAt&&s.role==='orchestrator');
    if(!origin||parent.projectId!==session.parentProjectId||parent.scopeId!==session.parentScopeId
      ||project.parentWorkspaceId&&project.parentWorkspaceId!==parent.workspaceId
      ||parent.planExecution?.execution_origin_session_id!==origin.sessionId
      ||project.ownershipState!=='confirmed'||!session.assignmentId||!session.taskId)return null;
    return {project_id:parent.projectId,local_session_id:sessionId,origin_session_id:origin.sessionId,role:'E',
      ...(project.workspaceId?{workspace_id:project.workspaceId,origin_workspace_id:parent.workspaceId}:{}),
      scope_id:session.parentScopeId,assignment_id:session.assignmentId,task_id:session.taskId,
      ...(parent.planExecution?.dialogue_version===1?{dialogue_version:1}:{})};
  }
  if(project.parentWorkspace)return null;
  const published=project.scopeId&&['ACTIVE','BLOCKED'].includes(project.scopeStatus);
  // A planning session keeps the plan-owner channel through its mode choice: one run, one target role.
  if(!['orchestrator','planning','self'].includes(session.role)||published&&project.planExecution?.execution_origin_session_id!==sessionId)
    return {project_id:project.projectId,local_session_id:sessionId,origin_session_id:sessionId,role:'S',
      ...(project.workspaceId?{workspace_id:project.workspaceId,origin_workspace_id:project.workspaceId}:{}),
      scope_id:project.scopeId??null,assignment_id:null,task_id:null};
  return {project_id:project.projectId,local_session_id:sessionId,origin_session_id:sessionId,role:'O',
    ...(project.workspaceId?{workspace_id:project.workspaceId,origin_workspace_id:project.workspaceId}:{}),
    // Publication and persisted role reconciliation are separate operations.
    // The fresh plan's exact origin is authoritative during that interval.
    scope_id:published?project.scopeId:session.orchestratorScopeId??null,assignment_id:null,task_id:null,
    ...(project.planExecution?.dialogue_version===1?{dialogue_version:1}:{})};
}
