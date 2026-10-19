import fs from 'node:fs';
import path from 'node:path';
import { check, hash, withLock, readJSON } from './common.mjs';
import { readPlan, isOrchestratedPlan } from './plan.mjs';
import { commonDirectory, readAssignment, recordPath } from './assignment-contract.mjs';
import {assertPlanPermission} from './plan-permission.mjs';
import {sameAssignment,latestBlock,blockAnswered} from './signal-state.mjs';

// Signals connect executors, the orchestrator and the application without commits.
// Every checkout of one repository appends to the same journal in the common Git directory.
export const signalsPath = root => path.join(commonDirectory(root), 'workflow-kit', 'signals.jsonl');
const lockPath = root => path.join(commonDirectory(root), 'workflow-kit', 'signals.lock');
export function readSignals(root) {
  const file = signalsPath(root);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}
const text = (value, field) => {
  check(typeof value === 'string' && value.trim().length >= 3 && value.length <= 4000, 'SIGNAL_INPUT',
    field + ': нужен текст от 3 до 4000 символов.', {field});
  return value.trim();
};
function append(root, request, id, build=()=>request) {
  check(id === undefined || /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(id), 'SIGNAL_INPUT', '--id: латинские буквы, цифры, точка, дефис.');
  return withLock(lockPath(root), () => {
    const signals=readSignals(root),requestHash=hash(JSON.stringify(request));
    const explicit=id&&signals.find(item=>item.id===id);
    if(explicit){
      check(explicit.request_hash===requestHash,'SIGNAL_CONFLICT','Ключ сигнала уже использован с другим содержимым.',{id});
      return {ok:true,duplicate:true,signal:explicit};
    }
    const value=build(signals,requestHash);
    if(value.existing)return {ok:true,duplicate:true,signal:value.existing};
    const key=id??hash(JSON.stringify(value)).slice(0,32);
    const record={schema_version:2,id:key,...value,request_hash:requestHash,
      ...(value.kind==='task-blocked'?{block_id:key}:{})};
    const existing=signals.find(item=>item.id===key);
    if(existing){check(existing.request_hash===requestHash,'SIGNAL_CONFLICT','Содержимое сигнала изменилось.',{id:key});return {ok:true,duplicate:true,signal:existing};}
    const stored = {...record, recorded_at: new Date().toISOString()};
    fs.mkdirSync(path.dirname(signalsPath(root)), {recursive: true});
    const file=fs.openSync(signalsPath(root),'a',0o600);
    try{fs.writeFileSync(file,JSON.stringify(stored)+'\n');fs.fsyncSync(file);}finally{fs.closeSync(file);}
    if(process.platform!=='win32'){const dir=fs.openSync(path.dirname(signalsPath(root)),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}}
    return {ok: true, duplicate: false, signal: stored};
  });
}
function orchestratedMain(root) {
  check(!readAssignment(root), 'ASSIGNMENT_READ_ONLY', 'Команду выполняет оркестратор в main.');
  const plan = readPlan(root);
  check(isOrchestratedPlan(plan) && plan.execution_scope_status === 'ACTIVE', 'SIGNAL_POLICY', 'Нужен активный план оркестратора.');
  return plan;
}
export function blockTask(root, taskId, reason, id, problemId, dialogue={}) {
  const plan = readPlan(root), assignment = readAssignment(root), task = plan.tasks.find(t => t.id === taskId);
  check(task && plan.current_task_id === taskId && task.implementation_status === 'IN_PROGRESS', 'TASK_NOT_ACTIVE',
    'Блокируется только начатая текущая задача; её файлы сохраняются.', {task_id: taskId});
  check(problemId===undefined||/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(problemId),'SIGNAL_INPUT','Некорректный --problem-id.');
  const request={kind:'task-blocked',scope_id:assignment?.parent_scope_id??plan.scope_id,task_id:taskId,
    assignment_id:assignment?.id??null,reason:text(reason,'--reason')};
  if(assignment?.dialogue_version===1)request.assignment_attempt=assignment.attempt??1;
  if(dialogue.message_id)request.dialogue_message_id=dialogue.message_id;
  request.problem_id=problemId??hash(request.reason).slice(0,24);
  return append(root,request,id,(signals,requestHash)=>{
    const last=latestBlock(signals,request);
    if(last&&!blockAnswered(signals,last)&&last.request_hash===requestHash)return {existing:last};
    const own=signals.filter(s=>sameAssignment(s,request));
    const approved=own.findLastIndex(s=>s.kind==='assignment-message'&&s.approval_note);
    const attempt=own.slice(approved+1).filter(s=>s.kind==='task-blocked'&&s.problem_id===request.problem_id).length+1;
    return {...request,after_decision_id:own.findLast(s=>s.kind==='assignment-message')?.id??null,
      attempt,escalation_required:attempt>=3};
  });
}
export function messageAssignment(root, assignmentId, message, id, blockId, approvalNote, dialogue={}) {
  const plan = orchestratedMain(root);
  const file = recordPath(root, assignmentId);
  check(fs.existsSync(file), 'ASSIGNMENT_ID', 'Назначение не найдено: ' + assignmentId);
  const record = readJSON(file);
  check(record.parent_scope_id === plan.scope_id && record.phase === 'ASSIGNED', 'SIGNAL_POLICY',
    'Уточнение передаётся только незавершённому назначению текущего плана.', {id: assignmentId});
  const request={kind:'assignment-message',scope_id:plan.scope_id,task_id:record.parent_task_id,
    assignment_id:assignmentId,text:text(message,'--text'),block_id:blockId??null,
    ...(approvalNote?{approval_note:text(approvalNote,'--approval-note')}:{})};
  if(record.dialogue_version===1)request.assignment_attempt=record.dialogue?.attempt??1;
  if(dialogue.message_id)request.dialogue_message_id=dialogue.message_id;
  return append(root,request,id,(signals,requestHash)=>{
    const duplicate=signals.find(s=>s.request_hash===requestHash);
    if(duplicate)return {existing:duplicate};
    if(record.dialogue_version===1)assertPlanPermission(root,plan);
    const block=latestBlock(signals,request);
    check(!blockId||block?.block_id===blockId,'BLOCK_STALE','Решение относится не к последней блокировке.',{block_id:block?.block_id??null});
    check(!block?.block_id||blockId===block.block_id,'BLOCK_REQUIRED','Укажите точный --block-id из вопроса.',{block_id:block?.block_id});
    check(!block||!blockAnswered(signals,block),'BLOCK_ALREADY_ANSWERED','Эта блокировка уже получила решение.');
    check(!block?.escalation_required||approvalNote,'BLOCK_ESCALATION_REQUIRED',
      'Три повторения проблемы. Выполните plan:escalate с попытками и нужным решением пользователя; новый цикл — только после его ответа с --approval-note.',{block_id:block?.block_id});
    return request;
  });
}
export function escalatePlan(root, reason, id) {
  const plan = orchestratedMain(root);
  return append(root, {kind: 'plan-escalated', scope_id: plan.scope_id, reason: text(reason, '--reason')}, id);
}
// A block lasts until its task is DONE or the orchestrator answers that assignment.
export function blockedTasks(root, plan) {
  const signals = readSignals(root).filter(signal => signal.scope_id === plan.scope_id);
  const result = [];
  for (const [index, signal] of signals.entries()) {
    if (signal.kind !== 'task-blocked' || plan.tasks.find(t => t.id === signal.task_id)?.commit_status === 'DONE') continue;
    if (latestBlock(signals,signal)===signal&&!blockAnswered(signals,signal)) result.push({task_id:signal.task_id,assignment_id:signal.assignment_id,reason:signal.reason,
      block_id:signal.block_id??null,problem_id:signal.problem_id??null,attempt:signal.attempt??null,
      escalation_required:signal.escalation_required===true,recorded_at:signal.recorded_at});
  }
  return result.filter((item, index) => result.findLastIndex(other => other.task_id === item.task_id) === index);
}
