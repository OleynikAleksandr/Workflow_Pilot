import fs from 'node:fs';
import path from 'node:path';
import { PLAN, CONFIG, check, hash, json, atomic, readJSON, safePath, withLock } from './common.mjs';
import { git, head, gitPath, localPath, allChanges, paths, isAncestor, commitHistory, commitPaths, ensureIdleGit, commitTimeout } from './git.mjs';
import { parsePlan, readPlan, renderPlan } from './plan.mjs';
import { validate, journal, taskChecks, readConfig, resolveReferences } from './validate.mjs';
import { assignmentStatus } from './task-assignment.mjs';
import { saveJournal, messageFor, completedTransaction, finishTransaction } from './transaction.mjs';

const file = root => localPath(root,'integration.json');
const save = (root,record) => atomic(file(root),json(record),0o600);
const validId = value => typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const recordFile = (root,id) => {check(validId(id),'INTEGRATION_ID','Нужен ID назначения.');return localPath(root,'assignments/'+id+'.json');};
export const activeIntegration = root => fs.existsSync(file(root)) ? readJSON(file(root)) : null;
export function assertIntegrationIdle(root) {
  check(!activeIntegration(root),'INTEGRATION_PENDING','main занят интеграцией; используйте integration:status/continue.');
}
export function assertIntegrationCommand(root,command) {
  if(['status','validate','recover','plan:view','hook','hook:ack','git-hook','integration:status','integration:continue','integration:start','assignment:status'].includes(command))return;
  assertIntegrationIdle(root);
}
const planAt = (root,sha) => parsePlan(git(root,['show',sha+':'+PLAN]).stdout);
const one = (commit,key) => {const values=commit.trailers[key];check(values?.length===1,'INTEGRATION_TRAILERS','Нужен единственный '+key);return values[0];};
const taskContract = task => {
  const copy=structuredClone(task);
  for(const key of ['implementation_status','commit_status','commit_ref','actual_files'])delete copy[key];
  return json(copy);
};
const workerContract = task => {
  const copy=structuredClone(task);copy.dependencies=[];copy.parallel_safe=false;
  if(copy.context_pack)copy.context_pack.dependency_task_ids=[];
  return taskContract(copy);
};
const allowedFiles = task => [...new Set([PLAN,...task.functional_paths,...task.documentation_paths])];

// All durable source identity is in Git. Local check receipts are required at admission.
export function inspectIntegrationSource(root,source,task,parentScope) {
  check(typeof source==='string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(source),'INTEGRATION_SOURCE','Нужен точный source SHA.');
  const child=planAt(root,source), assignment=child.assignment;
  check(assignment?.parent_scope_id===parentScope && assignment.parent_task_id===task.id,'INTEGRATION_SOURCE','Source принадлежит другому назначению.');
  const base=planAt(root,assignment.base_commit), original=base.tasks.find(t=>t.id===task.id);
  check(base.scope_id===parentScope && original && taskContract(original)===taskContract(task),'INTEGRATION_CONTRACT','Контракт задачи изменился после назначения.');
  const commits=commitHistory(root,assignment.base_commit,source);
  check(commits.length===2,'INTEGRATION_HISTORY','Разрешены только подготовка назначения и один implementation-коммит.');
  const [implementation,preparation]=commits;
  check(implementation.sha===source && implementation.parents.length===1 && implementation.parents[0]===preparation.sha
    && preparation.parents.length===1 && preparation.parents[0]===assignment.base_commit,'INTEGRATION_HISTORY','Посторонние коммиты или merge в ветке исполнителя.');
  for(const [commit,role] of [[implementation,'implementation'],[preparation,'assignment-plan']]) {
    check(one(commit,'Workflow-Scope')===child.scope_id && one(commit,'Workflow-Role')===role,'INTEGRATION_TRAILERS','Неверная идентичность источника.');
    one(commit,'Workflow-Transaction');
  }
  check(one(implementation,'Workflow-Task')===task.id,'INTEGRATION_TRAILERS','Неверная задача источника.');
  check(commitPaths(root,preparation.sha).every(p=>p===PLAN),'INTEGRATION_SCOPE','Подготовка назначения изменила исходники.');
  const prepared=planAt(root,preparation.sha), childTask=child.tasks[0];
  check(json(prepared.assignment)===json(assignment) && prepared.tasks[0].commit_status==='PENDING'
    && childTask.commit_status==='DONE' && workerContract(original)===taskContract(childTask)
    && workerContract(original)===taskContract(prepared.tasks[0]),'INTEGRATION_CONTRACT','Локальное задание не соответствует родительскому.');
  const changed=commitPaths(root,source), allowed=allowedFiles(task);
  check(changed.includes(PLAN) && changed.every(p=>allowed.includes(p)),'INTEGRATION_SCOPE','Source содержит чужие файлы.');
  // Installed runtime/configuration are inherited, never imported from a worker.
  const delta=git(root,['diff','--name-only','--no-renames',assignment.base_commit,source,'--']).stdout.trim().split('\n').filter(Boolean);
  check(delta.every(p=>p===PLAN || !p.startsWith('.harness/') && !['scripts/workflow','scripts/workflow.mjs','scripts/workflow.cmd'].includes(p)),
    'INTEGRATION_SERVICE_FILES','Исполнитель не заменяет служебную конфигурацию main.');
  // Resolve only the declared dependencies, not every earlier independent task.
  const baseResolved=original.dependencies.length ? resolveReferences(root,
    {...base,tasks:base.tasks.filter(t=>original.dependencies.includes(t.id))},null,assignment.base_commit) : {};
  check(json(assignment.external_dependencies.map(d=>d.task_id).sort())===json([...original.dependencies].sort())
    && assignment.external_dependencies.every(d=>baseResolved[d.task_id]?.sha===d.commit && isAncestor(root,d.commit,assignment.base_commit)),
    'DEPENDENCY_ORDER','Назначение не подтверждает интегрированные зависимости базы.');
  return {child,assignment,changed};
}

export function verifyIntegrationCommit(root,commit,task,plan) {
  const ref=task.commit_ref;
  // Later documentation commits may pin old context references. Validate the
  // source contract against the plan at admission, not today's mutable metadata.
  const before=planAt(root,commit.parents[0]);
  task=before.tasks.find(item=>item.id===task.id);
  check(task,'INTEGRATION_TASK','Нет задачи в родительском коммите интеграции.');
  check(commit.parents.length===2 && commit.parents[1]===ref.source_commit,'INTEGRATION_PARENTS','Интеграция требует двух точных родителей.');
  check(one(commit,'Workflow-Transaction')===ref.operation_id && one(commit,'Workflow-Source')===ref.source_commit,
    'INTEGRATION_TRAILERS','Интеграция не совпадает с источником/операцией.');
  const source=inspectIntegrationSource(root,ref.source_commit,task,plan.scope_id);
  check(isAncestor(root,source.assignment.base_commit,commit.parents[0]),'INTEGRATION_BASE','База не предшествует main.');
  const changed=git(root,['diff','--name-only','--no-renames','-z',commit.parents[0],commit.sha,'--']).stdout.split('\0').filter(Boolean);
  check(changed.includes(PLAN) && changed.every(p=>allowedFiles(task).includes(p)),'INTEGRATION_SCOPE','Merge содержит чужие файлы.');
  const after=planAt(root,commit.sha);
  const expected=integrationPlan(before,task.id,ref.operation_id,ref.source_commit,changed.filter(p=>p!==PLAN));
  check(renderPlan(after)===renderPlan(expected),'INTEGRATION_PLAN','Merge изменил общий план вне своей задачи.');
  return {sha:commit.sha,parent:commit.parents[0],paths:changed,source_commit:ref.source_commit,integration_commit:commit.sha};
}
function integrationPlan(before,taskId,id,source,actual) {
  const plan=structuredClone(before), task=plan.tasks.find(t=>t.id===taskId);
  check(task?.commit_status==='PENDING' && plan.current_task_id===null,'INTEGRATION_TASK','Родительская задача уже выполняется или завершена.');
  task.implementation_status='DONE';task.commit_status='DONE';task.actual_files=actual.slice().sort();
  task.commit_ref={scope_id:plan.scope_id,task_id:task.id,role:'integration',operation_id:id,source_commit:source};
  plan.plan_revision++;plan.delivery_status=plan.tasks.every(t=>t.commit_status==='DONE')?'READY_FOR_ACCEPTANCE':'IN_PROGRESS';
  return plan;
}
export function validateIntegrationCandidate(root,t,plan) {
  const record=activeIntegration(root);
  check(record?.id===t.id && record.source_commit===t.source_commit && record.before_head===t.before_head,
    'INTEGRATION_OWNER','Нет соответствующего журнала интеграции.');
  check(fs.readFileSync(gitPath(root,'MERGE_HEAD'),'utf8').trim()===t.source_commit,'INTEGRATION_PARENTS','MERGE_HEAD изменён.');
  check(git(root,['diff','--name-only','--diff-filter=U']).stdout.trim()==='','MERGE_CONFLICT','Остались конфликты.');
  check(paths(root).length===0 && paths(root,'untracked').length===0,'INTEGRATION_DIRTY','Кандидат не совпадает с рабочей папкой.');
  inspectIntegrationSource(root,t.source_commit,t.task,plan.scope_id);
  const expected=integrationPlan(parsePlan(record.original_plan),t.task_id,t.id,t.source_commit,paths(root,'staged').filter(p=>p!==PLAN));
  check(renderPlan(expected)===renderPlan(plan),'INTEGRATION_PLAN','Кандидат общего плана изменён.');
  check(git(root,['rev-parse',':'+CONFIG]).stdout.trim()===git(root,['rev-parse',t.before_head+':'+CONFIG]).stdout.trim(),
    'INTEGRATION_SERVICE_FILES','Конфигурация main должна сохраниться.');
}
function finish(root,record,t,sha) {
  if(t)finishTransaction(root,t,sha);
  if(process.env.WORKFLOW_TEST_FAILPOINT==='integration-finalized')check(false,'TEST_INTERRUPTION','Прерывание после сохранения доказательств.');
  const assignment=readJSON(recordFile(root,record.assignment_id));
  assignment.phase='INTEGRATED';assignment.source_commit=record.source_commit;assignment.integration_commit=sha;
  atomic(recordFile(root,record.assignment_id),json(assignment),0o600);
  atomic(localPath(root,'integrations/'+record.id+'.json'),json({...record,phase:'INTEGRATED',integration_commit:sha}),0o600);
  if(fs.existsSync(file(root)))fs.unlinkSync(file(root));
  return {ok:true,status:'INTEGRATED',assignment_id:record.assignment_id,task_id:record.task_id,source_commit:record.source_commit,integration_commit:sha};
}
export function integrationStatus(root) {
  const record=activeIntegration(root);
  if(!record)return {ok:true,status:'IDLE'};
  return {ok:true,status:record.phase,assignment_id:record.assignment_id,operation_id:record.id,task_id:record.task_id,
    source_commit:record.source_commit,before_head:record.before_head,
    conflicts:git(root,['diff','--name-only','--diff-filter=U']).stdout.trim().split('\n').filter(Boolean),error:record.error??null};
}
export function startIntegration(root,{id,source_commit}) {
  check(validId(id),'INTEGRATION_ID','Нужен ID назначения.');
  return withLock(localPath(root,'operation.lock'),()=>{
    const active=activeIntegration(root);
    if(active) {
      check(active.assignment_id===id && active.source_commit===source_commit,'INTEGRATION_PENDING','Другая интеграция уже занимает main.');
      return resume(root,active);
    }
    const assignment=readJSON(recordFile(root,id));
    const {plan,resolved,config}=validate(root);
    if(assignment.phase==='INTEGRATED') {
      const done=resolved[assignment.parent_task_id];
      check(done?.source_commit===source_commit && done.sha===assignment.integration_commit,'INTEGRATION_SOURCE','Повтор с другим источником.');
      return {ok:true,status:'INTEGRATED',already_integrated:true,...done};
    }
    ensureIdleGit(root);
    check(!journal(root) && !allChanges(root).length,'INTEGRATION_DIRTY','main должен быть чистым и без чужой транзакции.');
    check(git(root,['branch','--show-current']).stdout.trim()==='main' && fs.realpathSync(root)===assignment.parent_root
      && plan.execution_strategy==='parallel' && plan.execution_scope_status==='ACTIVE' && !plan.current_task_id,
      'INTEGRATION_OWNER','Интеграция выполняется в исходном main активного parallel-плана.');
    const task=plan.tasks.find(t=>t.id===assignment.parent_task_id);
    check(task?.commit_status==='PENDING','INTEGRATION_TASK','Задача уже интегрирована.');
    const status=assignmentStatus(root,id);
    check(status.status==='READY_FOR_INTEGRATION' && !status.transaction_pending && status.source_commit===source_commit
      && !allChanges(assignment.worktree).length && head(assignment.worktree)===source_commit,'INTEGRATION_NOT_READY','Исполнитель ещё не завершил точный source.');
    const source=inspectIntegrationSource(root,source_commit,task,plan.scope_id);
    check(source.assignment.id===id && source.assignment.base_commit===assignment.base_commit && isAncestor(root,assignment.base_commit),
      'INTEGRATION_BASE','Назначение или база не совпадают с main.');
    const receipt=readJSON(localPath(assignment.worktree,'verification/by-commit/'+source_commit+'.json'));
    const checks=taskChecks(task,config);
    check(receipt.commit===source_commit && receipt.candidate_tree===git(root,['rev-parse',source_commit+'^{tree}']).stdout.trim()
      && checks.every(c=>receipt.checks.some(r=>r.id===c.id && r.status==='PASSED')),'INTEGRATION_UNCHECKED','Нет успешных проверок source.');
    check(task.dependencies.every(d=>resolved[d]?.sha && isAncestor(root,resolved[d].sha,assignment.base_commit)),'DEPENDENCY_ORDER','Зависимости не входят в базу исполнителя.');
    const record={schema_version:1,id:'integration-'+id,assignment_id:id,task_id:task.id,source_commit,
      before_head:head(root),original_plan:renderPlan(plan),phase:'PREPARED'};
    save(root,record);
    return resume(root,record);
  });
}
export function continueIntegration(root,id) {
  return withLock(localPath(root,'operation.lock'),()=>{
    const record=activeIntegration(root);
    check(record && record.id===id,'INTEGRATION_OWNER','Нет такой незавершённой интеграции.');
    return resume(root,record);
  });
}
function resume(root,record) {
  let t=journal(root);
  if(t) {
    check(t.role==='integration' && t.id===record.id,'TRANSACTION_PENDING','Обнаружена чужая транзакция.');
    const done=completedTransaction(root,t);
    if(done)return finish(root,record,t,done);
  }
  if(!t && head(root)!==record.before_head) {
    // Finalization may have persisted the receipt and removed transaction.json,
    // then crashed before updating the assignment. Recover the identity from Git.
    const {plan,resolved}=validate(root), task=plan.tasks.find(item=>item.id===record.task_id), done=resolved[record.task_id];
    check(task?.commit_ref.operation_id===record.id && done?.sha===head(root)
      && done.parent===record.before_head && done.source_commit===record.source_commit,
      'HEAD_CHANGED','main изменён вне ожидаемой интеграции.');
    return finish(root,record,null,done.sha);
  }
  check(head(root)===record.before_head && git(root,['branch','--show-current']).stdout.trim()==='main','HEAD_CHANGED','main изменён; автоматического повторного merge нет.');
  const before=parsePlan(record.original_plan), task=before.tasks.find(t=>t.id===record.task_id);
  if(record.phase==='PREPARED') {
    ensureIdleGit(root);check(!allChanges(root).length,'INTEGRATION_DIRTY','Изменения появились до merge.');
    record.phase='MERGING';save(root,record);
    const result=git(root,['merge','--no-commit','--no-ff',record.source_commit],{allowFailure:true,timeout:600000});
    if(!fs.existsSync(gitPath(root,'MERGE_HEAD'))) {
      record.phase='UNKNOWN';record.error=String(result.stderr||result.stdout).slice(-2000);save(root,record);
      check(false,'INTEGRATION_UNKNOWN','Git не подтвердил незавершённое слияние; изменения сохранены.');
    }
  }
  check(fs.existsSync(gitPath(root,'MERGE_HEAD')) && fs.readFileSync(gitPath(root,'MERGE_HEAD'),'utf8').trim()===record.source_commit,
    'INTEGRATION_UNKNOWN','Нет ожидаемого MERGE_HEAD; автоматический повтор запрещён.');
  if(record.phase==='MERGING') {
    // Only the subordinate plan is replaced, by the exact parent plan from the journal.
    atomic(safePath(root,PLAN),record.original_plan);git(root,['add','--',PLAN]);
    record.phase='RESOLVING';save(root,record);
  }
  check(fs.readFileSync(safePath(root,PLAN),'utf8')===record.original_plan || t && hash(fs.readFileSync(safePath(root,PLAN)))===t.candidate_hash,
    'INTEGRATION_PLAN','Общий план изменён вне операции; изменения сохранены.');
  const conflicts=git(root,['diff','--name-only','--diff-filter=U']).stdout.trim();
  if(conflicts) {record.phase='CONFLICT';save(root,record);return integrationStatus(root);}
  const changed=allChanges(root);
  check(changed.every(p=>allowedFiles(task).includes(p)),'INTEGRATION_SCOPE','Изменения вне задачи сохранены; интеграция остановлена.');
  for(const p of changed)safePath(root,p);
  // The correction agent may edit only this task's paths; no ours/theirs fallback.
  const indexed=new Set(paths(root,'tracked'));
  const stageable=changed.filter(p=>indexed.has(p)||fs.existsSync(path.join(root,p)));
  if(stageable.length)git(root,['add','--',...stageable]);
  const actual=paths(root,'staged').filter(p=>p!==PLAN).sort();
  const candidate=renderPlan(integrationPlan(before,task.id,record.id,record.source_commit,actual));
  atomic(safePath(root,PLAN),candidate);git(root,['add','--',PLAN]);
  t={schema_version:1,id:record.id,plan_path:PLAN,role:'integration',scope_id:before.scope_id,task_id:task.id,
    task:{...task,actual_files:actual},source_commit:record.source_commit,message:'merge: '+task.title,
    before_head:record.before_head,original_plan:record.original_plan,original_hash:hash(record.original_plan),
    candidate_plan:candidate,candidate_hash:hash(candidate),candidate_tree:git(root,['write-tree']).stdout.trim(),
    selected:[PLAN,...actual].sort(),excluded_changes:[],checks:taskChecks({...task,actual_files:actual},readConfig(root)),phase:'PREPARED'};
  saveJournal(root,t);record.phase='CHECKING';save(root,record);
  if(process.env.WORKFLOW_TEST_FAILPOINT==='integration-prepared')check(false,'TEST_INTERRUPTION','Прерывание до merge-коммита.');
  const result=git(root,['commit','-m',messageFor(t)],{allowFailure:true,timeout:commitTimeout(t.checks)});
  if(result.status!==0) {
    record.phase='CHECKS_FAILED';record.error=String(result.stderr||result.stdout).slice(-4000);save(root,record);
    // Keep source corrections and MERGE_HEAD; expose PENDING until the commit succeeds.
    if(head(root)===record.before_head && hash(fs.readFileSync(safePath(root,PLAN)))===t.candidate_hash) {
      atomic(safePath(root,PLAN),record.original_plan);git(root,['add','--',PLAN]);
      fs.unlinkSync(localPath(root,'transaction.json'));
    }
    check(false,'INTEGRATION_CHECKS_FAILED','Кандидат не прошёл проверки; исправьте main и вызовите integration:continue.',{output:record.error});
  }
  const sha=completedTransaction(root,t);check(sha,'COMMIT_NOT_CONFIRMED','Merge-коммит не подтверждён.');
  if(process.env.WORKFLOW_TEST_FAILPOINT==='integration-committed')check(false,'TEST_INTERRUPTION','Прерывание после merge-коммита.');
  return finish(root,record,t,sha);
}
