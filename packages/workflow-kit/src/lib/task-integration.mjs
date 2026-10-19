import fs from 'node:fs';
import path from 'node:path';
import { PLAN, CONFIG, check, hash, json, atomic, readJSON, safePath, withLock } from './common.mjs';
import { git, head, gitPath, localPath, allChanges, paths, isAncestor, ensureIdleGit, commitTimeout } from './git.mjs';
import { parsePlan, renderPlan, isOrchestratedPlan } from './plan.mjs';
import { validate, journal, taskChecks, readConfig, resolveReferences } from './validate.mjs';
import { assignmentStatus, removeIntegratedWorktree } from './task-assignment.mjs';
import {assertAssignmentAcceptance} from './assignment-dialogue.mjs';
import {assertAssignmentCommandsIdle} from './assignment-command-safety.mjs';
import {assertPlanPermission} from './plan-permission.mjs';
import {migratedResultHead} from './dialogue-migration-state.mjs';
import { saveJournal, messageFor, completedTransaction, finishTransaction } from './transaction-state.mjs';

const file = root => localPath(root,'integration.json');
const save = (root,record) => atomic(file(root),json(record),0o600);
const validId = value => typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const recordFile = (root,id) => {check(validId(id),'INTEGRATION_ID','Нужен ID назначения.');return localPath(root,'assignments/'+id+'.json');};
import { activeIntegration } from './transaction-state.mjs';
export { activeIntegration, assertIntegrationIdle, assertIntegrationCommand } from './transaction-state.mjs';
import { inspectIntegrationSource as inspectSourceProof, verifyIntegrationCommit as verifyCommitProof, integrationPlan, allowedFiles } from './integration-proof.mjs';
export const inspectIntegrationSource = (root,source,task,parentScope) => inspectSourceProof(root,source,task,parentScope,resolveReferences);
export const verifyIntegrationCommit = (root,commit,task,plan) => verifyCommitProof(root,commit,task,plan,resolveReferences);
export function validateIntegrationCandidate(root,t,plan) {
  const record=activeIntegration(root);
  check(record?.id===t.id && record.source_commit===t.source_commit && record.before_head===t.before_head,
    'INTEGRATION_OWNER','Нет соответствующего журнала интеграции.');
  check(fs.readFileSync(gitPath(root,'MERGE_HEAD'),'utf8').trim()===t.source_commit,'INTEGRATION_PARENTS','MERGE_HEAD изменён.');
  check(git(root,['diff','--name-only','--diff-filter=U']).stdout.trim()==='','MERGE_CONFLICT','Остались конфликты.');
  check(paths(root).length===0 && paths(root,'untracked').length===0,'INTEGRATION_DIRTY','Кандидат не совпадает с рабочей папкой.');
  inspectIntegrationSource(root,t.source_commit,t.task,plan.scope_id);
  const staged=paths(root,'staged').filter(p=>p!==PLAN);
  const expected=integrationPlan(parsePlan(record.original_plan),t.task_id,t.id,t.source_commit,staged,
    {deleted:staged.filter(p=>!fs.existsSync(path.join(root,p))),pin:t.before_head});
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
  // An orchestrated plan does not accumulate worktrees; a failed removal leaves the integration intact for assignment:cleanup.
  // Dialogue executors still need to read/yield their acceptance after the
  // merge. The orchestrator's final cleanup runs after transport receipts.
  const cleanup=isOrchestratedPlan(parsePlan(record.original_plan))&&assignment.dialogue_version!==1?removeIntegratedWorktree(root,assignment):null;
  return {ok:true,status:'INTEGRATED',assignment_id:record.assignment_id,task_id:record.task_id,source_commit:record.source_commit,integration_commit:sha,
    ...(cleanup?{cleanup}:{})};
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
    assertPlanPermission(root,plan);
    ensureIdleGit(root);
    assertAssignmentCommandsIdle(assignment);
    assertAssignmentAcceptance(assignment,source_commit);
    check(!journal(root) && !allChanges(root).length,'INTEGRATION_DIRTY','main должен быть чистым и без чужой транзакции.');
    check(git(root,['branch','--show-current']).stdout.trim()==='main' && fs.realpathSync(root)===assignment.parent_root
      && ['parallel','orchestrated'].includes(plan.execution_strategy) && plan.execution_scope_status==='ACTIVE' && !plan.current_task_id,
      'INTEGRATION_OWNER','Интеграция выполняется в исходном main активного parallel- или orchestrated-плана.');
    const task=plan.tasks.find(t=>t.id===assignment.parent_task_id);
    check(task?.commit_status==='PENDING','INTEGRATION_TASK','Задача уже интегрирована.');
    const status=assignmentStatus(root,id);
    check(status.status==='READY_FOR_INTEGRATION' && !status.transaction_pending && status.source_commit===source_commit
      && !allChanges(assignment.worktree).length && migratedResultHead(assignment,source_commit),'INTEGRATION_NOT_READY','Исполнитель ещё не завершил точный source.');
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
  assertPlanPermission(root,parsePlan(record.original_plan));
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
  const assignment=readJSON(recordFile(root,record.assignment_id));
  assertAssignmentCommandsIdle(assignment);
  assertAssignmentAcceptance(assignment,record.source_commit);
  if(assignment.dialogue_version===1)check(migratedResultHead(assignment,record.source_commit)
    &&!allChanges(assignment.worktree).length&&!journal(assignment.worktree),'INTEGRATION_NOT_READY','Исходный результат изменился до продолжения интеграции.');
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
    // Installer-owned files have a separate main attestation. Keep the current
    // parent runtime; task source conflicts still require an O decision.
    const source=inspectIntegrationSource(root,record.source_commit,task,before.scope_id);
    for(const file of source.migration_service_paths??[]){
      if(git(root,['cat-file','-e',record.before_head+':'+file],{allowFailure:true}).status===0)
        git(root,['restore','--source='+record.before_head,'--staged','--worktree','--',file]);
      else git(root,['rm','--ignore-unmatch','--',file]);
    }
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
  const candidate=renderPlan(integrationPlan(before,task.id,record.id,record.source_commit,actual,
    {deleted:actual.filter(p=>!fs.existsSync(path.join(root,p))),pin:record.before_head}));
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
