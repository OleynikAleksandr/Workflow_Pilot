import fs from 'node:fs';
import path from 'node:path';
import { check, hash, withLock, readJSON } from './common.mjs';
import { readPlan, isOrchestratedPlan } from './plan.mjs';
import { commonDirectory, readAssignment, recordPath } from './assignment-contract.mjs';

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
function append(root, signal, id) {
  check(id === undefined || /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(id), 'SIGNAL_INPUT', '--id: латинские буквы, цифры, точка, дефис.');
  const record = {id: id ?? hash(JSON.stringify(signal)).slice(0, 32), ...signal};
  return withLock(lockPath(root), () => {
    const existing = readSignals(root).find(item => item.id === record.id);
    if (existing) return {ok: true, duplicate: true, signal: existing};
    const stored = {...record, recorded_at: new Date().toISOString()};
    fs.mkdirSync(path.dirname(signalsPath(root)), {recursive: true});
    fs.appendFileSync(signalsPath(root), JSON.stringify(stored) + '\n', {mode: 0o600});
    return {ok: true, duplicate: false, signal: stored};
  });
}
function orchestratedMain(root) {
  check(!readAssignment(root), 'ASSIGNMENT_READ_ONLY', 'Команду выполняет оркестратор в main.');
  const plan = readPlan(root);
  check(isOrchestratedPlan(plan) && plan.execution_scope_status === 'ACTIVE', 'SIGNAL_POLICY', 'Нужен активный план оркестратора.');
  return plan;
}
export function blockTask(root, taskId, reason, id) {
  const plan = readPlan(root), assignment = readAssignment(root), task = plan.tasks.find(t => t.id === taskId);
  check(task && plan.current_task_id === taskId && task.implementation_status === 'IN_PROGRESS', 'TASK_NOT_ACTIVE',
    'Блокируется только начатая текущая задача; её файлы сохраняются.', {task_id: taskId});
  return append(root, {kind: 'task-blocked', scope_id: assignment?.parent_scope_id ?? plan.scope_id, task_id: taskId,
    assignment_id: assignment?.id ?? null, reason: text(reason, '--reason')}, id);
}
export function messageAssignment(root, assignmentId, message, id) {
  const plan = orchestratedMain(root);
  const file = recordPath(root, assignmentId);
  check(fs.existsSync(file), 'ASSIGNMENT_ID', 'Назначение не найдено: ' + assignmentId);
  const record = readJSON(file);
  check(record.parent_scope_id === plan.scope_id && record.phase !== 'INTEGRATED', 'SIGNAL_POLICY',
    'Уточнение передаётся только незавершённому назначению текущего плана.', {id: assignmentId});
  return append(root, {kind: 'assignment-message', scope_id: plan.scope_id, task_id: record.parent_task_id,
    assignment_id: assignmentId, text: text(message, '--text')}, id);
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
    const answered = signals.slice(index + 1).some(later => later.kind === 'assignment-message'
      && later.task_id === signal.task_id && (signal.assignment_id === null || later.assignment_id === signal.assignment_id));
    if (!answered) result.push({task_id: signal.task_id, assignment_id: signal.assignment_id, reason: signal.reason, recorded_at: signal.recorded_at});
  }
  return result.filter((item, index) => result.findLastIndex(other => other.task_id === item.task_id) === index);
}
