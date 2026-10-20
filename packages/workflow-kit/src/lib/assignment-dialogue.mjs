import fs from 'node:fs';
import {PLAN, check, hash, json, readJSON, withLock} from './common.mjs';
import {head, git, localPath, allChanges, ensureIdleGit} from './git.mjs';
import {readPlan,parsePlan} from './plan.mjs';
import {readAssignment, recordPath, childRecordPath, ownWorktree, localPlan, save} from './assignment-contract.mjs';
import {validate, taskChecks} from './validate.mjs';
import {journal, activeIntegration, completedTransaction, finishTransaction} from './transaction-state.mjs';
import {commitCandidate} from './transaction.mjs';
import {blockTask,messageAssignment,readSignals} from './signals.mjs';
import {latestBlock,blockAnswered} from './signal-state.mjs';
import {assertAssignmentCommandsIdle} from './assignment-command-safety.mjs';
import {assertPlanPermission} from './plan-permission.mjs';
import {migratedResultHead} from './dialogue-migration-state.mjs';

export const ASSIGNMENT_DIALOGUE_VERSION = 1;
const key = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/.test(value);
const sha = value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const allowed = {
  O: new Set(['task','context','question','clarification','decision','revision_request','acceptance']),
  E: new Set(['context_request','context','question','clarification','result']),
};
const initial = () => ({version:ASSIGNMENT_DIALOGUE_VERSION,attempt:1,grant:null,result:null,acceptance:null,history:[],operations:{}});
const contractDigest=task=>hash(json(task&&{title:task.title,why:task.why,functional_paths:task.functional_paths,
  documentation_paths:task.documentation_paths,acceptance_criteria:task.acceptance_criteria,
  verification_ids:task.verification_ids,dependencies:task.dependencies,context_pack:task.context_pack,
  ...(Object.hasOwn(task,'task_brief')?{task_brief:task.task_brief}:{})}));

function activeBlock(record) {
  const signals=readSignals(record.parent_root),block=latestBlock(signals,{scope_id:record.parent_scope_id,
    task_id:record.parent_task_id,assignment_id:record.id,assignment_attempt:record.dialogue?.attempt??1});
  return block&&!blockAnswered(signals,block)?block:null;
}

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
  const task=readPlan(record.parent_root).tasks.find(t=>t.id===record.parent_task_id);
  const signals=readSignals(record.parent_root),last=latestBlock(signals,{scope_id:record.parent_scope_id,
    task_id:record.parent_task_id,assignment_id:record.id,assignment_attempt:record.dialogue?.attempt??1});
  const decision=last&&signals.findLast(s=>s.kind==='assignment-message'&&s.assignment_id===record.id
    &&s.block_id===last.block_id&&(s.assignment_attempt??1)===(record.dialogue?.attempt??1));
  return {ok:true,id:record.id,task_id:record.parent_task_id,role,
    ...(role==='O'&&task?.task_brief?{task_brief:task.task_brief}:{}),
    contract_digest:contractDigest(task),scope_id:record.parent_scope_id,worktree:record.worktree,
    cleanup:record.cleanup??null,
    phase:record.phase,migration:record.migration??null,dialogue_version:record.dialogue_version??0,dialogue:record.dialogue??null,block:activeBlock(record),
    last_decision:decision?{id:decision.id,block_id:decision.block_id,attempt:record.dialogue?.attempt??1}:null};
}
export function assertAssignmentDispatch(root,record) {
  if(record?.dialogue_version!==ASSIGNMENT_DIALOGUE_VERSION)return;
  assertPlanPermission(record.parent_root);
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
  assertAssignmentCommandsIdle(record);
  check(sha(source),'ASSIGNMENT_RESULT','Нужен полный source_commit.');
  ownWorktree(record.worktree,record);
  ensureIdleGit(record.worktree);
  check(!journal(record.worktree) && !allChanges(record.worktree).length && migratedResultHead(record,source),
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
    d.revision={operation_id:input.operation_id,from:input.source_commit,base:head(child),next:d.attempt+1};
    save(file,record);
  }
  const r=d.revision;
  const base=r.base??r.from;
  check(r.operation_id===input.operation_id && r.from===input.source_commit,
    'ASSIGNMENT_REVISION_PENDING','Продолжите исходную операцию доработки.');
  const runtime=readAssignment(child);runtime.attempt=r.next;save(childRecordPath(child),runtime);
  const candidate=localPlan(child,runtime), old=readPlan(child);
  candidate.plan_revision=old.plan_revision+1;
  const pending=journal(child);
  if(pending) {
    check(pending.role==='assignment-plan' && pending.before_head===base,'TRANSACTION_PENDING','Есть другая транзакция.');
    const done=completedTransaction(child,pending);
    if(done)finishTransaction(child,pending,done);
    else {candidate.plan_revision=parsePlan(pending.candidate_plan).plan_revision;
      commitCandidate(child,{plan:candidate,role:'assignment-plan',selected:[PLAN],message:'chore: доработка '+record.parent_task_id,beforeHead:base});}
  } else if(head(child)===base) {
    check(!allChanges(child).length,'ASSIGNMENT_NOT_READY','Worktree изменился перед доработкой.');
    commitCandidate(child,{plan:candidate,role:'assignment-plan',selected:[PLAN],message:'chore: доработка '+record.parent_task_id,beforeHead:base});
  } else {
    const current=readPlan(child), message=git(child,['log','-1','--format=%B']).stdout;
    check(git(child,['rev-parse','HEAD^']).stdout.trim()===base
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
    if(input.kind==='task'&&input.contract_digest)check(input.contract_digest===contractDigest(plan.tasks.find(t=>t.id===record.parent_task_id)),
      'ASSIGNMENT_CONTRACT_CHANGED','Требования изменились после подготовки. Оркестратор должен подготовить новое поручение.');
    if(input.kind==='task'||input.kind==='revision_request'||input.resume)assertPlanPermission(parent,plan);
    check(record.phase==='ASSIGNED' && input.attempt===d.attempt,'ASSIGNMENT_STALE','Назначение или попытка уже изменились.');
    check(!input.blocking||(role==='E'&&input.kind==='question'),'ASSIGNMENT_DIALOGUE_INPUT','blocking допустим только для вопроса E.');
    check(!input.resume||(role==='O'&&input.kind==='decision'),'ASSIGNMENT_DIALOGUE_INPUT','resume допустим только для решения O.');
    check(!d.revision || d.revision.operation_id===input.operation_id,'ASSIGNMENT_REVISION_PENDING','Сначала завершите начатую доработку.');
    return withLock(localPath(record.worktree,'operation.lock'),()=>{
      ownWorktree(record.worktree,record);
      const signalId=hash(input.operation_id).slice(0,40),priorSignal=readSignals(parent).find(s=>s.id===signalId&&s.dialogue_message_id===input.message_id);
      const block=activeBlock(record);let signal=null;
      if(input.block_id&&!priorSignal)check(block?.block_id===input.block_id,'BLOCK_STALE','Блокировка уже изменилась или разрешена.');
      if(input.blocking){
        check(priorSignal||!block||block.id===signalId,'BLOCK_ALREADY_ACTIVE','Продолжите уточнение существующей блокировки.',{block_id:block?.block_id});
        signal=blockTask(record.worktree,record.parent_task_id,'Сообщение '+input.message_id+'; содержание '+input.content_digest,
          signalId,input.problem_id?(/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(input.problem_id)?input.problem_id:hash(input.problem_id).slice(0,40)):undefined,{message_id:input.message_id}).signal;
      }else if(input.resume){
        check(priorSignal||block&&input.block_id===block.block_id,'BLOCK_REQUIRED','Решение требует текущего block_id.');
        signal=messageAssignment(parent,record.id,'Решение '+input.message_id+'; содержание '+input.content_digest,
          hash(input.operation_id).slice(0,40),input.block_id,undefined,{message_id:input.message_id}).signal;
      }
      if(signal&&process.env.WORKFLOW_TEST_FAILPOINT==='dialogue-signal')check(false,'TEST_INTERRUPTION','Тестовый сбой после сигнала до квитанции диалога.');
      if(input.kind==='task') {
        check(!d.grant,'ASSIGNMENT_ALREADY_DISPATCHED','Поручение уже выдано; передайте уточнение.');
        d.grant={message_id:input.message_id,operation_id:input.operation_id};
      } else if(input.kind==='result') {
        check(!block,'ASSIGNMENT_BLOCKED','Сначала получите решение по текущей блокировке.');
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
        task_id:record.parent_task_id,attempt:d.attempt,kind:input.kind,result:d.result,acceptance:d.acceptance,
        block_id:signal?.block_id??block?.block_id??null,problem_id:signal?.problem_id??block?.problem_id??null,
        repair_attempt:signal?.attempt??block?.attempt??null,escalation_required:signal?.escalation_required??block?.escalation_required??false};
      d.operations[input.operation_id]={fingerprint,receipt};save(file,record);
      return receipt;
    });
  });
}
