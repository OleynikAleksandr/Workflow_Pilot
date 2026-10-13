import fs from 'node:fs';
import path from 'node:path';
import { PLAN, planPath, currentPlanSelection, check, json, atomic, textFile, relativePath, id } from './common.mjs';

const BEGIN = '<!-- workflow-state:begin -->';
const END = '<!-- workflow-state:end -->';
const label = { TODO: 'Ожидает', IN_PROGRESS: 'В работе', DONE: 'Завершено', PENDING: 'Ожидает коммита' };
const string = (v, field) => check(typeof v === 'string' && v.trim().length > 0, 'PLAN_SCHEMA', 'Нужно непустое поле: ' + field);
const array = (v, field) => check(Array.isArray(v), 'PLAN_SCHEMA', 'Нужен массив: ' + field);
const unique = (values, field) => check(new Set(values).size === values.length, 'PLAN_SCHEMA', 'Повторяющиеся значения: ' + field);
export const PROJECT_CONTINUATION_OBJECTIVE = 'Продолжите обсуждение или исследование проекта; план реализации создаётся, когда определён её объём.';
export const FINAL_DOCUMENTATION_TASK_ID = 'DOCS';
export const FINAL_DOCUMENTATION_TASK_TITLE = 'Актуализация всех документов проекта';
export const PROJECT_CONTEXT_DOCUMENTS = Object.freeze([
  { path: 'docs/architecture/OVERVIEW.md', required: true, revision: 'WORKTREE' },
]);
export const projectContextPaths = () => PROJECT_CONTEXT_DOCUMENTS.map(doc => doc.path);
export function projectContextPack(pack = {}) {
  const documents = [...(pack.documents ?? []).map(doc => ({...doc}))];
  for (const base of PROJECT_CONTEXT_DOCUMENTS) {
    const existing = documents.filter(doc => doc.path === base.path);
    if (!existing.length) documents.push({...base});
    else existing[0].required = true;
  }
  return { documents: uniqueDocuments(documents), include_last_completed_task: pack.include_last_completed_task ?? false,
    dependency_task_ids: [...(pack.dependency_task_ids ?? [])] };
}
export function uniqueDocuments(documents) {
  const result = new Map();
  for (const doc of documents) {
    const revision = doc.revision ?? 'WORKTREE';
    const key = JSON.stringify([doc.path, revision]);
    const previous = result.get(key);
    result.set(key, {...doc, revision, required: Boolean(doc.required || previous?.required)});
  }
  return [...result.values()];
}
export const isDocumentationFinalizationTask = task => /^DOCS(?:-[2-9][0-9]*|-[1-9][0-9]+)?$/.test(task?.id ?? '')
  && task?.title === FINAL_DOCUMENTATION_TASK_TITLE;
export const isDeliveryTask = task => ['package','installed'].includes(task?.verification_kind);
export const EXECUTION_POLICY_FIELDS = Object.freeze(['parallel_allowed', 'max_workers', 'execution_strategy', 'execution_reason']);
export const hasExecutionPolicy = plan => EXECUTION_POLICY_FIELDS.some(key => Object.hasOwn(plan, key));
export function normalizeExecutionPolicy(plan) {
  if (hasExecutionPolicy(plan)) for (const task of plan.tasks) {
    if (!Object.hasOwn(task, 'parallel_safe')) task.parallel_safe = false;
  }
  return plan;
}
const knownWritePaths = task => [...task.functional_paths, ...task.documentation_paths];
const concreteWritePath = file => typeof file === 'string' && file !== '.' && !/[\*?\[\]{}]/.test(file) && !file.endsWith('/');
// Compatibility only; readiness, capacity and active assignments belong to the scheduler.
export function parallelTasksCompatible(left, right) {
  if (left.id === right.id || left.parallel_safe !== true || right.parallel_safe !== true) return false;
  const a = knownWritePaths(left), b = knownWritePaths(right);
  return a.length > 0 && b.length > 0 && [...a, ...b].every(concreteWritePath)
    && !a.some(x => b.some(y => x === y || x.startsWith(y + '/') || y.startsWith(x + '/')));
}
function validateExecutionPolicy(plan) {
  if (Object.hasOwn(plan,'execution_origin_session_id')) check(typeof plan.execution_origin_session_id==='string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(plan.execution_origin_session_id),
    'PLAN_EXECUTION_ORIGIN','Некорректная сессия происхождения параметров выполнения.');
  if (!hasExecutionPolicy(plan)) {
    check(plan.tasks.every(task => !Object.hasOwn(task, 'parallel_safe')), 'PLAN_EXECUTION_POLICY', 'parallel_safe требует полного набора параметров выполнения плана.');
    return;
  }
  check(typeof plan.parallel_allowed === 'boolean' && Number.isSafeInteger(plan.max_workers) && plan.max_workers >= 1,
    'PLAN_EXECUTION_POLICY', 'Нужны parallel_allowed:boolean и положительный целый max_workers.');
  check(['sequential', 'parallel'].includes(plan.execution_strategy) && typeof plan.execution_reason === 'string' && plan.execution_reason.trim(),
    'PLAN_EXECUTION_POLICY', 'Нужны execution_strategy sequential/parallel и непустая execution_reason.');
  check(plan.execution_strategy !== 'parallel' || plan.parallel_allowed && plan.max_workers > 1,
    'PLAN_EXECUTION_POLICY', 'Параллельное выполнение требует разрешения и max_workers > 1.');
  const positions = new Map(plan.tasks.map((task, index) => [task.id, index]));
  for (const task of plan.tasks) {
    check(typeof task.parallel_safe === 'boolean', 'PLAN_EXECUTION_POLICY', 'Нужен parallel_safe:boolean у ' + task.id);
    check(!task.parallel_safe || knownWritePaths(task).every(concreteWritePath),
      'PLAN_WRITE_SCOPE', 'parallel_safe требует конкретных путей записи без glob и неизвестной области: ' + task.id);
    check(task.dependencies.every(dep => positions.get(dep) < positions.get(task.id)),
      'TASK_ORDER', 'В новом плане зависимость должна стоять перед задачей: ' + task.id);
  }
}
export function emptyPlan(name) {
  return { schema_version: 1, plan_revision: 1, project_id: id(), project_name: name, scope_id: null,
    execution_scope_status: 'NONE', delivery_status: 'IN_PROGRESS', objective: PROJECT_CONTINUATION_OBJECTIVE, acceptance_criteria: [],
    approved_scope: { functional_paths: [], documentation_paths: [] },
    baseline_commit: null, current_task_id: null, context_pack: projectContextPack(),
    tasks: [], blocked_reason: null, user_decisions: [] };
}
export function validatePlan(p) {
  check(p && typeof p === 'object' && p.schema_version === 1, 'PLAN_SCHEMA', 'Неподдерживаемая схема плана.');
  check(Number.isSafeInteger(p.plan_revision) && p.plan_revision > 0, 'PLAN_SCHEMA', 'Некорректная revision.');
  string(p.project_id, 'project_id'); string(p.project_name, 'project_name');
  check(['NONE', 'ACTIVE', 'BLOCKED'].includes(p.execution_scope_status), 'PLAN_SCHEMA', 'Некорректное состояние scope.');
  check(['IN_PROGRESS', 'READY_FOR_ACCEPTANCE'].includes(p.delivery_status), 'PLAN_SCHEMA', 'Некорректная готовность результата.');
  for (const key of ['owner_session_id', 'prepared_in_session_id']) {
    if (p[key] !== undefined && p[key] !== null) check(typeof p[key] === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(p[key]), 'PLAN_SCHEMA', 'Некорректный ' + key);
  }
  if (p.session_experience !== undefined && p.session_experience !== null) check(['chat', 'work'].includes(p.session_experience), 'PLAN_SCHEMA', 'Некорректный режим сессии.');
  for (const f of ['tasks', 'acceptance_criteria', 'user_decisions']) array(p[f], f);
  for (const f of ['functional_paths', 'documentation_paths']) {
    array(p.approved_scope?.[f], f); unique(p.approved_scope[f], f); p.approved_scope[f].forEach(relativePath);
  }

  array(p.context_pack?.documents, 'context_pack.documents'); array(p.context_pack?.dependency_task_ids, 'context_pack.dependency_task_ids');
  check(typeof p.context_pack.include_last_completed_task === 'boolean', 'PLAN_SCHEMA', 'include_last_completed_task должен быть boolean.');
  const validateContext = pack => {
    if (!pack) return;
    array(pack.documents, 'context.documents');
    for (const doc of pack.documents) {
      relativePath(doc.path); check(typeof doc.required === 'boolean', 'PLAN_SCHEMA', 'required должен быть boolean.');
      check(doc.revision === undefined || doc.revision === 'WORKTREE' || typeof doc.revision === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(doc.revision), 'PLAN_SCHEMA', 'revision: WORKTREE либо точный SHA коммита.');
      if (doc.heading_path) { array(doc.heading_path, 'heading_path'); doc.heading_path.forEach(h => string(h, 'heading')); }
    }
  };
  validateContext(p.context_pack);
  if (p.execution_scope_status === 'NONE') {
    check(p.scope_id === null && p.current_task_id === null && p.tasks.length === 0, 'PLAN_SCHEMA', 'NONE не может содержать активные задачи.');
    for (const doc of PROJECT_CONTEXT_DOCUMENTS) {
      check(p.context_pack.documents.some(current => current.path === doc.path && current.required === true),
        'PROJECT_CONTEXT_REQUIRED', 'NONE должен сохранять обязательную ссылку: ' + doc.path);
    }
  } else {
    string(p.scope_id, 'scope_id'); string(p.objective, 'objective');
    check(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p.scope_id), 'PLAN_SCHEMA', 'scope_id: латинские буквы, цифры, точка, дефис, подчёркивание.');
    check(p.acceptance_criteria.length > 0 && p.tasks.length > 0, 'PLAN_SCHEMA', 'Активному scope нужны задачи и критерии.');
    check(typeof p.baseline_commit === 'string' && /^[0-9a-f]{40,64}$/.test(p.baseline_commit), 'PLAN_SCHEMA', 'Активному scope нужен реальный baseline.');
  }
  unique(p.tasks.map(t => t.id), 'task IDs');
  if(p.assignment) {
    const a=p.assignment;
    check(typeof a.id==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(a.id)
      && p.scope_id==='assignment-'+a.id && p.tasks.length===1 && a.parent_task_id===p.tasks[0].id
      && typeof a.parent_scope_id==='string' && a.parent_scope_id.length>0
      && typeof a.base_commit==='string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(a.base_commit)
      && a.base_commit===p.baseline_commit && typeof a.branch==='string' && a.branch==='workflow/'+a.id
      && typeof a.worktree==='string' && path.isAbsolute(a.worktree)
      && typeof a.parent_root==='string' && path.isAbsolute(a.parent_root)
      && p.execution_strategy==='sequential' && p.parallel_allowed===false && p.max_workers===1
      && Array.isArray(a.external_dependencies) && a.external_dependencies.every(d=>typeof d.task_id==='string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(d.commit))
      && p.tasks[0].dependencies.length===0,'PLAN_ASSIGNMENT','Некорректное локальное назначение.');
  }
  const byId = new Map(p.tasks.map(t => [t.id, t]));
  for (const t of p.tasks) {
    check(t.verification_kind === undefined || ['code','package','installed'].includes(t.verification_kind), 'PLAN_SCHEMA', 'verification_kind задачи: code, package или installed.', {task_id:t.id,field:'verification_kind',received:t.verification_kind});
    for (const f of ['id', 'title', 'why', 'expected_commit_message']) string(t[f], f);
    check(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(t.id), 'PLAN_SCHEMA', 'Некорректный task ID.');
    check(!/[\r\n]/.test(t.expected_commit_message), 'PLAN_SCHEMA', 'Ожидаемое сообщение коммита должно занимать одну строку.');
    check(['TODO', 'IN_PROGRESS', 'DONE'].includes(t.implementation_status) && ['PENDING', 'DONE'].includes(t.commit_status), 'PLAN_SCHEMA', 'Некорректное состояние задачи.');
    check((t.implementation_status === 'DONE') === (t.commit_status === 'DONE'), 'PLAN_SCHEMA', 'Задача и запись коммита закрываются вместе.');
    for (const f of ['dependencies', 'functional_paths', 'documentation_paths', 'acceptance_criteria', 'verification_ids']) { array(t[f], f); unique(t[f], f); }
    check(t.acceptance_criteria.length > 0, 'PLAN_SCHEMA', 'У задачи нет критериев готовности.');
    for (const f of ['functional_paths', 'documentation_paths']) for (const file of t[f]) {
      relativePath(file); check(p.approved_scope[f].includes(file), 'OUT_OF_SCOPE', 'Путь не включён в scope: ' + file);
    }
    check(t.functional_paths.length + t.documentation_paths.length > 0, 'PLAN_SCHEMA', 'У задачи нет файлов.');
    check(!t.functional_paths.some(f => t.documentation_paths.includes(f)), 'PLAN_SCHEMA', 'Файл не может быть одновременно функциональным и документационным.');

    for (const dep of t.dependencies) check(dep !== t.id && byId.has(dep), 'PLAN_SCHEMA', 'Неизвестная или циклическая зависимость: ' + dep);
    const integrated = p.execution_strategy === 'parallel' && t.commit_status === 'DONE';
    check(t.commit_ref?.scope_id === p.scope_id && t.commit_ref?.task_id === t.id && t.commit_ref?.role === (integrated ? 'integration' : 'implementation'),
      'PLAN_SCHEMA', 'Некорректная ссылка коммита; parallel DONE требует интеграции: ' + t.id);
    if (integrated) {
      check(typeof t.commit_ref.operation_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(t.commit_ref.operation_id)
        && typeof t.commit_ref.source_commit === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(t.commit_ref.source_commit),
        'PLAN_SCHEMA', 'Интеграции нужны уникальный ID операции и точный source SHA.');
    } else check(t.commit_ref.source_commit === undefined && t.commit_ref.operation_id === undefined,
      'PLAN_SCHEMA', 'Доказательства интеграции появляются только при parallel DONE.');
    validateContext(t.context_pack);
  }
  const visited = new Set(); const visiting = new Set();
  function visit(t) {
    check(!visiting.has(t.id), 'PLAN_CYCLE', 'Цикл зависимостей микрозадач.');
    if (visited.has(t.id)) return; visiting.add(t.id);
    t.dependencies.forEach(dep => visit(byId.get(dep))); visiting.delete(t.id); visited.add(t.id);
  }
  p.tasks.forEach(visit);
  validateExecutionPolicy(p);
  for (const dep of p.context_pack.dependency_task_ids) check(byId.has(dep), 'PLAN_SCHEMA', 'Неизвестная контекстная зависимость: ' + dep);
  const current = p.tasks.filter(t => t.implementation_status === 'IN_PROGRESS');
  check(current.length <= 1 && (current[0]?.id ?? null) === p.current_task_id, 'PLAN_SCHEMA', 'current_task_id не соответствует текущей задаче.');
  check(p.execution_scope_status !== 'BLOCKED' || (typeof p.blocked_reason === 'string' && p.blocked_reason.trim()), 'PLAN_SCHEMA', 'BLOCKED требует причину.');
  for (const [finalIndex, finalTask] of p.tasks.entries()) if (isDocumentationFinalizationTask(finalTask)) {
    const beforeDocs = p.tasks.slice(0, finalIndex);
    check(finalTask.functional_paths.length === 0, 'DOCUMENTATION_FINAL_TASK', 'Финальная актуализация документации не содержит функциональных файлов.');
    check(finalTask.documentation_paths.some(p => ['docs/architecture/OVERVIEW.md','docs/DOCUMENTATION_INDEX.md'].includes(p)), 'DOCUMENTATION_FINAL_TASK', 'DOCS должна включать обзор проекта (либо прежний индекс до миграции).');
    const previous = beforeDocs.findLastIndex(isDocumentationFinalizationTask);
    const expected = beforeDocs.slice(previous + 1).filter(t => !isDeliveryTask(t)).map(t => t.id);
    check(expected.every(id => finalTask.dependencies.includes(id))
      && finalTask.dependencies.every(id => beforeDocs.some(t => t.id === id)),
      'DOCUMENTATION_FINAL_TASK', 'DOCS зависит от работы своего раунда и не ссылается вперёд.');
  }
  for (const [index, task] of p.tasks.entries()) if (isDeliveryTask(task) && !p.assignment) {
    const docs = p.tasks.slice(0,index).findLast(isDocumentationFinalizationTask);
    check(docs && task.dependencies.includes(docs.id), 'DOCUMENTATION_FINAL_TASK',
      'Каждая delivery-задача должна зависеть от DOCS своего раунда.', {task_id:task.id});
  }
  check(p.delivery_status !== 'READY_FOR_ACCEPTANCE' || (p.tasks.length > 0 && p.tasks.every(t => t.commit_status === 'DONE')), 'PLAN_SCHEMA', 'Готовность к приёмке не подтверждается задачами.');
  return p;
}
export function renderPlan(p) {
  validatePlan(p);
  const lines = ['# Активный план — ' + p.project_name, '', BEGIN, '```json', JSON.stringify(p, null, 2), '```', END, '',
    '## Состояние', '', 'Execution Scope Status: ' + p.execution_scope_status, 'Delivery Status: ' + p.delivery_status,
    'Scope: ' + (p.scope_id ?? 'не создан'), 'Current Task: ' + (p.current_task_id ?? 'нет'), 'Revision: ' + p.plan_revision, '',
    '## Цель', '', p.objective || PROJECT_CONTINUATION_OBJECTIVE, '', '## Критерии приёмки', '', ...p.acceptance_criteria.map(c => '- ' + c), '', '## Микрозадачи', ''];
  if (hasExecutionPolicy(p)) lines.push('Выполнение: ' + p.execution_strategy + '; разрешено: ' + p.parallel_allowed + '; лимит: ' + p.max_workers,
    'Причина: ' + p.execution_reason, '');
  for (const t of p.tasks) {
    lines.push('- [' + t.implementation_status + '] ' + t.id + ': ' + t.title + ' — ' + label[t.implementation_status],
      '  - Git Commit: [' + t.commit_status + '] ' + t.expected_commit_message,
      '  - Reference: ' + p.scope_id + ' / ' + t.id + ' / ' + t.commit_ref.role,
      '  - Файлы: ' + [...t.functional_paths, ...t.documentation_paths].join(', '));
    if (hasExecutionPolicy(p)) lines.push('  - Параллельность: ' + (t.parallel_safe ? 'допустима при непересекающихся областях' : 'исключительное выполнение'),
      '  - Зависимости: ' + (t.dependencies.join(', ') || 'нет'));
    if (t.commit_ref.role === 'integration') lines.push('  - Source: ' + t.commit_ref.source_commit + '; операция: ' + t.commit_ref.operation_id);
  }
  lines.push('', '## Context Pack For This Cycle', '', ...p.context_pack.documents.map(d => '- ' + d.path + (d.heading_path?.length ? ' → ' + d.heading_path.join(' / ') : '')),
    '', 'Служебные состояния меняются только командами workflow. Приёмка не архивирует scope.', '');
  return lines.join('\n');
}
export function parsePlan(text, { projection = true } = {}) {
  check(text.split(BEGIN).length === 2 && text.split(END).length === 2, 'PLAN_MARKERS', 'В плане нужен ровно один блок workflow-state.');
  const fragment = text.split(BEGIN)[1].split(END)[0].trim();
  const match = /^```json\n([\s\S]+)\n```$/.exec(fragment);
  check(match, 'PLAN_MARKERS', 'Внутри workflow-state нужен один fenced JSON-блок.');
  let p; try { p = JSON.parse(match[1]); } catch { check(false, 'PLAN_JSON', 'Некорректный JSON в плане.'); }
  validatePlan(p);
  if (projection) check(renderPlan(p) === text, 'PLAN_PROJECTION', 'Читаемая проекция изменена вручную. Используйте repair --dry-run.');
  return p;
}
export const readPlan = root => {
  const selected = currentPlanSelection();
  if (selected?.virtualPlan && !fs.existsSync(path.join(root, planPath(root)))) return structuredClone(selected.virtualPlan);
  return parsePlan(textFile(root, planPath(root)));
};
export const writePlan = (root, p) => atomic(path.join(root, planPath(root)), renderPlan(p));
export function nextTask(p) { return p.tasks.find(t => t.id === p.current_task_id) ?? p.tasks.find(t => t.implementation_status === 'TODO' && t.dependencies.every(d => p.tasks.find(t2 => t2.id === d).commit_status === 'DONE')) ?? null; }
