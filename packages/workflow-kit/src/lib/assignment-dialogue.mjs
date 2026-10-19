import fs from 'node:fs';
import {PLAN, check, hash, json, readJSON, withLock} from './common.mjs';
import {head, git, localPath, allChanges, ensureIdleGit} from './git.mjs';
import {readPlan,parsePlan} from './plan.mjs';
import {readAssignment, recordPath, childRecordPath, ownWorktree, localPlan, save} from './assignment-contract.mjs';
import {validate, taskChecks} from './validate.mjs';
import {journal, activeIntegration, completedTransaction, finishTransaction} from './transaction-state.mjs';
import {commitCandidate} from './transaction.mjs';

export const ASSIGNMENT_DIALOGUE_VERSION = 1;
const key = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/.test(value);
const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const allowed = {
  O: new Set(['task','context','question','clarification','decision','revision_request','acceptance']),
  E: new Set(['context_request','context','question','clarification','result']),
};
const initial = () => ({version:ASSIGNMENT_DIALOGUE_VERSION,attempt:1,grant:null,result:null,acceptance:null,history:[],operations:{}});

function target(root, id) {
  const child=readAssignment(root), parent=child?.parent_root??fs.realpathSync(root);
  check(!child || !id || child.id===id,'ASSIGNMENT_OWNER','Чужое назначение.');
  const file=recordPath(parent,child?.id??id), record=readJSON(file);
  check(record.parent_root===parent,'ASSIGNMENT_OWNER','Изменён владелец назначения.');
  if(child)ownWorktree(root,record);
  return {parent,file,record,role:child?'E':'O'};
}
export function assignmentDialogueStatus(root,id) {
  const {record,role}=target(root,id);
  return {ok:true,id:record.id,task_id:record.parent_task_id,role,
    dialogue_version:record.dialogue_version??0,dialogue:record.dialogue??null};
}
export function assertAssignmentDispatch(root,record) {
  if(record?.dialogue_version!==ASSIGNMENT_DIALOGUE_VERSION)return;
  const current=readJSON(recordPath(record.parent_root,record.id)), d=current.dialogue;
  check(d?.grant && !d.revision && d.attempt===(record.attempt??1),
    'ASSIGNMENT_NOT_DISPATCHED','Ожидайте адресное поручение оркестратора; bootstrap не разрешает task:start.');
}
export function assertAssignmentAcceptance(record,source) {
  if(record.dialogue_version!==ASSIGNMENT_DIALOGUE_VERSION)return;
  const d=record.dialogue;
  check(d?.result && d.acceptance?.result_id===d.result.message_id
    && d.acceptance.source_commit===source && d.result.source_commit===source
    && d.acceptance.attempt===d.attempt && !d.revision,
  'ASSIGNMENT_NOT_ACCEPTED','Нужна приёмка оркестратором текущего результата и точного source_commit.');
}
function proof(record, source) {
  check(sha(source),'ASSIGNMENT_RESULT','Нужен полный source_commit.');
  ownWorktree(record.worktree,record);
  ensureIdleGit(record.worktree);
  check(!journal(record.worktree) && !allChanges(record.worktree).length && head(record.worktree)===source,
    'ASSIGNMENT_NOT_READY','Сначала завершите проверки/коммит; worktree должен быть чистым.');
  const {plan,resolved,config}=validate(record.worktree), task=plan.tasks[0];
  check(task.commit_status==='DONE' && resolved[record.parent_task_id]?.sha===source
    && (task.commit_ref.iteration??1)===(record.dialogue?.attempt??1),
  'ASSIGNMENT_RESULT','Коммит не подтверждает текущую попытку назначения.');
  const receipt=readJSON(localPath(record.worktree,'verification/by-commit/'+source+'.json'));
  check(receipt.commit===source && receipt.candidate_tree===git(record.worktree,['rev-parse',source+'^{tree}']).stdout.trim()
    && taskChecks(task,config).every(c=>receipt.checks.some(r=>r.id===c.id && r.status==='PASSED')),
  'ASSIGNMENT_UNCHECKED','Нет доказательства проверок текущего результата.');
  return {source_commit:source,evidence_digest:hash(json(receipt)),excluded_changes:receipt.excluded_changes??[]};
}

// Revision is a journaled Kit transition. Prior DONE commits and receipts remain
// immutable; a plan-only preparation commit starts the next checked iteration.
function revise(file,record,input) {
  const d=record.dialogue, child=record.worktree;
  if(!d.revision) {
    check(!activeIntegration(record.parent_root),'INTEGRATION_PENDING','main занят интеграцией.');
    proof(record,input.source_commit);
    d.revision={operation_id:input.operation_id,from:input.source_commit,next:d.attempt+1};
    save(file,record);
  }
  const r=d.revision;
  check(r.operation_id===input.operation_id && r.from===input.source_commit,
    'ASSIGNMENT_REVISION_PENDING','Продолжите исходную операцию доработки.');
  const runtime=readAssignment(child);runtime.attempt=r.next;save(childRecordPath(child),runtime);
  const candidate=localPlan(child,runtime), old=readPlan(child);
  candidate.plan_revision=old.plan_revision+1;
  const pending=journal(child);
  if(pending) {
    check(pending.role==='assignment-plan' && pending.before_head===r.from,'TRANSACTION_PENDING','Есть другая транзакция.');
    const done=completedTransaction(child,pending);
    if(done)finishTransaction(child,pending,done);
    else {candidate.plan_revision=parsePlan(pending.candidate_plan).plan_revision;
      commitCandidate(child,{plan:candidate,role:'assignment-plan',selected:[PLAN],message:'chore: доработка '+record.parent_task_id,beforeHead:r.from});}
  } else if(head(child)===r.from) {
    check(!allChanges(child).length,'ASSIGNMENT_NOT_READY','Worktree изменился перед доработкой.');
    commitCandidate(child,{plan:candidate,role:'assignment-plan',selected:[PLAN],message:'chore: доработка '+record.parent_task_id,beforeHead:r.from});
  } else {
    const current=readPlan(child), message=git(child,['log','-1','--format=%B']).stdout;
    check(git(child,['rev-parse','HEAD^']).stdout.trim()===r.from
      && message.includes('Workflow-Role: assignment-plan')
      && current.tasks[0].commit_ref.iteration===r.next && current.tasks[0].commit_status==='PENDING'
      && !allChanges(child).length,'ASSIGNMENT_REVISION_PENDING','Исход доработки не подтверждён; повтор запрещён.');
  }
  d.history.push({attempt:d.attempt,grant:d.grant,result:d.result,acceptance:d.acceptance});
  d.attempt=r.next;d.grant={message_id:input.message_id,operation_id:input.operation_id};
  d.result=null;d.acceptance=null;delete d.revision;
}

export function applyAssignmentDialogue(root,input) {
  check(input && key(input.operation_id) && key(input.message_id) && key(input.assignment_id),
    'ASSIGNMENT_DIALOGUE_INPUT','Нужны assignment_id, message_id и operation_id.');
  const owner=target(root,input.assignment_id);
  check(allowed[owner.role].has(input.kind),'ASSIGNMENT_ROLE','Роль не допускает это действие.');
  return withLock(localPath(owner.parent,'operation.lock'),()=>{
    const {record,file,role,parent}=target(root,input.assignment_id), plan=readPlan(parent);
    check(record.dialogue_version===ASSIGNMENT_DIALOGUE_VERSION,'ASSIGNMENT_DIALOGUE_VERSION','Назначение не переведено на рабочий диалог.');
    check(plan.scope_id===record.parent_scope_id && plan.execution_scope_status==='ACTIVE'
      && (!input.scope_id || input.scope_id===plan.scope_id),'ASSIGNMENT_CHANGED','План назначения изменился.');
    const d=record.dialogue??=initial(), fingerprint=hash(json({role,...input}));
    const previous=d.operations[input.operation_id];
    if(previous){check(previous.fingerprint===fingerprint,'ASSIGNMENT_DIALOGUE_CONFLICT','Ключ уже использован с другим содержимым.');return {...previous.receipt,duplicate:true};}
    check(record.phase==='ASSIGNED' && input.attempt===d.attempt,'ASSIGNMENT_STALE','Назначение или попытка уже изменились.');
    check(!d.revision || d.revision.operation_id===input.operation_id,'ASSIGNMENT_REVISION_PENDING','Сначала завершите начатую доработку.');
    return withLock(localPath(record.worktree,'operation.lock'),()=>{
      ownWorktree(record.worktree,record);
      if(input.kind==='task') {
        check(!d.grant,'ASSIGNMENT_ALREADY_DISPATCHED','Поручение уже выдано; передайте уточнение.');
        d.grant={message_id:input.message_id,operation_id:input.operation_id};
      } else if(input.kind==='result') {
        check(d.grant,'ASSIGNMENT_NOT_DISPATCHED','Назначение не получило поручение O.');
        check(!d.result,'ASSIGNMENT_RESULT_EXISTS','Результат уже отправлен; используйте исходную квитанцию.');
        d.result={message_id:input.message_id,attempt:d.attempt,...proof(record,input.source_commit)};
      } else if(['acceptance','revision_request'].includes(input.kind)) {
        check(d.result?.message_id===input.result_id && d.result?.source_commit===input.source_commit,
          'ASSIGNMENT_RESULT_STALE','Решение относится к другому результату.');
        if(input.kind==='revision_request')revise(file,record,input);
        else {proof(record,input.source_commit);d.acceptance={message_id:input.message_id,result_id:input.result_id,
          source_commit:input.source_commit,attempt:d.attempt};}
      }
      const receipt={ok:true,operation_id:input.operation_id,message_id:input.message_id,assignment_id:record.id,
        task_id:record.parent_task_id,attempt:d.attempt,kind:input.kind,result:d.result,acceptance:d.acceptance};
      d.operations[input.operation_id]={fingerprint,receipt};save(file,record);
      return receipt;
    });
  });
}
