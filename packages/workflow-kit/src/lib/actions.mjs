import fs from 'node:fs';
import { assertAssignment, assertAssignmentCommand } from './task-assignment.mjs';
import { assertReviewPublication, finishReviewPublication, cleanupReview } from './plan-review.mjs';
import {beginTaskFiles,handoffTaskFiles} from './task-files.mjs';
import path from 'node:path';
import { VERSION, PLAN, planPath, safePath, CONFIG, MANIFEST, check, readJSON, atomic, json, hash, id, textFile } from './common.mjs';
import { emptyPlan, readPlan, parsePlan, renderPlan, writePlan, validatePlan, nextTask, projectContextPack, projectContextPaths, normalizeExecutionPolicy,
  FINAL_DOCUMENTATION_TASK_ID, FINAL_DOCUMENTATION_TASK_TITLE, isDocumentationFinalizationTask, isDeliveryTask } from './plan.mjs';
import { validate, validateConfig, validatePlanConfiguration, readConfig, journal, resolveReferences, taskChecks } from './validate.mjs';
import { git, head, localPath, allChanges, identityReady, paths, gitPath } from './git.mjs';
import { locked, commitCandidate, completedTransaction, finishTransaction } from './transaction.mjs';
import { recover, recoverState } from './recovery.mjs';
import { assertSingleWriter } from './session-plans.mjs';
import { hooksDirectory } from './installation-files.mjs';

const noTransaction = root => check(!journal(root), 'TRANSACTION_PENDING', 'Сначала завершите текущую транзакцию commit/repair.');
const acknowledgementsPath = root => path.join(root, '.harness/runtime/worktrees', hash(gitPath(root, 'index')).slice(0, 20), 'hook-acknowledgements.json');
const revision = (p, value) => { if (value !== undefined) check(p.plan_revision === Number(value), 'REVISION_CHANGED', 'Revision плана изменилась. Сначала обновите status.'); };
const requiredDocuments = pack => (pack?.documents ?? []).filter(d => d.required);
function requireModuleContext(planLike) {
  if (!(planLike.tasks ?? []).some(t => (t.functional_paths ?? []).length)) return;
  const docs = requiredDocuments(planLike.context_pack);
  check(docs.some(d => d.path === 'docs/architecture/OVERVIEW.md'), 'MODULE_CONTEXT_REQUIRED', 'Функциональному scope нужен required compact project overview: docs/architecture/OVERVIEW.md.');
  check(docs.some(d => /^docs\/(modules|planning)\/.+\.md$/i.test(d.path)), 'MODULE_CONTEXT_REQUIRED', 'Укажите планировочный документ в context_pack.documents с required:true (docs/planning/ или docs/modules/).');
}
function normalizeCompletionContract(plan) {
  const foundation = projectContextPaths();
  plan.context_pack = projectContextPack(plan.context_pack);
  plan.approved_scope = { ...plan.approved_scope,
    documentation_paths: [...new Set([...(plan.approved_scope?.documentation_paths ?? []), ...foundation])] };
  // Completed records, including prior DOCS iterations, stay byte-for-byte in place.
  const boundary = plan.tasks.findLastIndex(t => t.commit_status === 'DONE') + 1;
  const history = plan.tasks.slice(0, boundary);
  const pending = plan.tasks.slice(boundary);
  const existing = pending.filter(isDocumentationFinalizationTask);
  check(existing.length <= 1, 'DOCUMENTATION_FINAL_TASK', 'В раунде должна быть одна DOCS.');
  let finalTask = existing[0];
  const ordinary = pending.filter(task => task !== finalTask);
  const delivery = ordinary.filter(isDeliveryTask);
  const work = ordinary.filter(task => !isDeliveryTask(task));
  if (!delivery.length && !finalTask) return plan;
  if (!finalTask) {
    const iteration = Math.max(0,...history.filter(isDocumentationFinalizationTask).map(t => t.commit_ref?.iteration ?? 1)) + 1;
    const taskId = iteration === 1 ? FINAL_DOCUMENTATION_TASK_ID : FINAL_DOCUMENTATION_TASK_ID + '-' + iteration;
    finalTask = {
      id: taskId, title: FINAL_DOCUMENTATION_TASK_TITLE,
      implementation_status: 'TODO', commit_status: 'PENDING',
      commit_ref: {scope_id:plan.scope_id, task_id:taskId, role:'implementation', iteration},
      why: 'Перед выпуском сверить README, OVERVIEW и действующие контракты модулей с результатом; обновить устаревшее.',
      dependencies: [], functional_paths: [], documentation_paths: foundation,
      acceptance_criteria: ['Документы описывают текущий результат, существенное из выпущенных рабочих спецификаций перенесено в контракты модулей; история остаётся в Git.'],
      verification_ids: [], expected_commit_message: 'docs: актуализировать документацию проекта',
    };
  }
  check(isDocumentationFinalizationTask(finalTask),
    'DOCUMENTATION_FINAL_TASK', 'Зарезервированный пункт DOCS должен называться «' + FINAL_DOCUMENTATION_TASK_TITLE + '».');
  const deliveryIds = new Set(delivery.map(task => task.id));
  for (const task of work) check(!task.dependencies.some(id => deliveryIds.has(id)), 'DOCUMENTATION_FINAL_TASK',
    'Обычная задача не может зависеть от package/installed delivery-задачи.', {task_id:task.id});
  const previousDocs = history.findLastIndex(isDocumentationFinalizationTask);
  const roundWork = [...history.slice(previousDocs + 1).filter(t=>!isDeliveryTask(t)), ...work];
  finalTask = { ...finalTask, dependencies: [...new Set([...roundWork.map(task => task.id), ...finalTask.dependencies])], functional_paths: [],
    documentation_paths: [...new Set([...(finalTask.documentation_paths ?? []), ...ordinary.flatMap(t=>t.documentation_paths ?? []), ...foundation])] };
  const normalizedDelivery = delivery.map(task => ({ ...task, dependencies: [...new Set([...task.dependencies, finalTask.id])] }));
  plan.tasks = [...history, ...work, finalTask, ...normalizedDelivery];
  return plan;
}
function service(root, plan, role, selected, message) {
  return commitCandidate(root, { plan, role, selected, message, beforeHead: head(root) });
}
export function buildScopePlan(root, input, previous, config = readConfig(root)) {
    const plan = { ...emptyPlan(previous.project_name), ...input, schema_version: 1, project_id: previous.project_id,
      project_name: previous.project_name, plan_revision: previous.plan_revision + 1, scope_id: input.scope_id || 'scope-' + id(),
      execution_scope_status: 'ACTIVE', delivery_status: 'IN_PROGRESS', baseline_commit: head(root), current_task_id: null, blocked_reason: null };
    delete plan.approval_note;
    check(Array.isArray(input.tasks), 'PLAN_SCHEMA', 'Нужен список микрозадач.');
    plan.tasks = input.tasks.map((t, i) => {
      check(!t.implementation_status || t.implementation_status === 'TODO', 'PLAN_SCHEMA', 'Новый scope не может начинаться с завершённых задач.');
      const taskId = t.id || 'T' + String(i + 1).padStart(3, '0');
      return { dependencies: [], functional_paths: [], documentation_paths: [], verification_ids: [], ...t, id: taskId,
        implementation_status: 'TODO', commit_status: 'PENDING', commit_ref: { scope_id: plan.scope_id, task_id: taskId, role: 'implementation' } };
    });
    normalizeCompletionContract(plan);
    plan.tasks = plan.tasks.map(task => ({ implementation_status: 'TODO', commit_status: 'PENDING',
      commit_ref: { scope_id: plan.scope_id, task_id: task.id, role: 'implementation' }, ...task }));
    requireModuleContext(plan);
    plan.user_decisions = input.user_decisions ?? [];
    normalizeExecutionPolicy(plan);
    validatePlan(plan); validatePlanConfiguration(root, plan, config);
    return plan;
}
export function createScope(root, input, expectedRevision) {
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); assertSingleWriter(root, PLAN); const { plan: previous } = validate(root); revision(previous, expectedRevision);
    check(previous.execution_scope_status === 'NONE', 'SCOPE_EXISTS', 'Текущий scope ещё не закрыт пользователем.');
    check(head(root), 'NO_BASELINE', 'Сначала завершите bootstrap-коммит установки.');
    check(typeof input.approval_note === 'string' && input.approval_note.trim().length >= 10, 'SCOPE_APPROVAL', 'Запишите согласованное пользователем содержание scope в approval_note.');
    const plan = buildScopePlan(root, input, previous);
    const review = assertReviewPublication(root, plan);
    plan.user_decisions = [...(input.user_decisions ?? []), { id: id(), text: input.approval_note, recorded_at: new Date().toISOString() }];
    if(review?.user_decision?.action==='publish')plan.user_decisions.push({id:id(),
      text:'Публикация Review по явному решению пользователя (не означает снятия спора): '+review.user_decision.note,
      recorded_at:new Date().toISOString()});
    const selected = [PLAN, ...allChanges(root).filter(p => (review ? review.documents.map(d => d.source) : plan.approved_scope.documentation_paths).includes(p))];
    const result = service(root, plan, 'scope-plan', selected, 'docs: согласовать scope ' + plan.scope_id);
    finishReviewPublication(root, plan, result.sha);
    return { ...result, state: recover(root) };
  });
}
export function startTask(root, taskId, expectedRevision) {
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); assertSingleWriter(root, PLAN); const { plan, config } = validate(root); revision(plan, expectedRevision);
    const assignment = assertAssignment(root, plan, {ready:true});
    check(plan.execution_strategy !== 'parallel' || assignment, 'PARALLEL_MAIN_READ_ONLY',
      'Основной parallel-план выполняют назначенные исполнители. Не начинайте task:start в main; запуском управляет AutoPlan проекта. Уже начатую задачу сохраняет assignment:handoff.');
    check(plan.execution_scope_status === 'ACTIVE', 'SCOPE_NOT_ACTIVE', 'Реализация разрешена только в ACTIVE scope.');
    const task = plan.tasks.find(t => t.id === taskId);
    check(task, 'UNKNOWN_TASK', 'Задача не найдена: ' + taskId);
    const started=()=>{
      const cleanup=cleanupReview(root,plan), result=recover(root);
      if(cleanup?.error)result.facts.review_cleanup_error=cleanup.error;
      return result;
    };
    if (plan.current_task_id === taskId) return started();
    check(plan.current_task_id === null && task.implementation_status === 'TODO', 'TASK_ALREADY_ACTIVE', 'Другую или завершённую задачу начать нельзя.');
    check(task.dependencies.every(d => plan.tasks.find(t => t.id === d)?.commit_status === 'DONE'), 'DEPENDENCY_PENDING', 'Зависимости задачи ещё не завершены.');
    taskChecks(task, config);
    beginTaskFiles(root,plan,task);
    task.implementation_status = 'IN_PROGRESS'; plan.current_task_id = taskId; plan.plan_revision++;
    writePlan(root, plan); return started();
  });
}
export function applyPlan(root, input, expectedRevision) {
  assertAssignmentCommand(root, 'plan:apply');
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); assertSingleWriter(root, PLAN); const { plan: original } = validate(root);
    check(expectedRevision !== undefined, 'EXPECTED_REVISION_REQUIRED', 'Укажите --expected-revision из status.'); revision(original, expectedRevision);
    const permitted = ['objective', 'acceptance_criteria', 'approved_scope', 'context_pack', 'tasks', 'user_decisions', 'execution_scope_status', 'blocked_reason'];
    check(Object.keys(input).every(k => permitted.includes(k)), 'MANAGED_FIELDS', 'Служебные поля плана не меняются через plan:apply.');
    const plan = { ...structuredClone(original), ...input, plan_revision: original.plan_revision + 1 };
    check(['ACTIVE', 'BLOCKED'].includes(plan.execution_scope_status) && original.execution_scope_status !== 'NONE', 'SCOPE_LIFECYCLE', 'Создание/архивирование scope выполняются отдельными командами.');
    const added = plan.tasks.filter(t => !original.tasks.some(old => old.id === t.id));
    const originalFinal = original.tasks.findLast(isDocumentationFinalizationTask);
    const deferDocs = originalFinal && original.current_task_id === originalFinal.id && added.length > 0;
    for (const old of original.tasks) {
      const current = plan.tasks.find(t => t.id === old.id);
      check(current, 'TASK_REMOVAL', 'Существующие задачи не удаляются из активного scope.');
      if (old.commit_status === 'DONE') {
        check(JSON.stringify(current) === JSON.stringify(old), 'COMPLETED_TASK_IMMUTABLE', 'Запись завершённой задачи неизменяема.');
        check(plan.tasks.indexOf(current) === original.tasks.indexOf(old), 'TASK_ORDER', 'Завершённые задачи не переставляются.');
      } else {
        check(current.implementation_status === old.implementation_status && current.commit_status === old.commit_status && JSON.stringify(current.commit_ref) === JSON.stringify(old.commit_ref), 'MANAGED_FIELDS', 'Статусы и references меняются командами task:start/commit; для уточнения используйте task:update.', { task_id: old.id, field: 'task state', expected: { implementation_status: old.implementation_status, commit_status: old.commit_status, commit_ref: old.commit_ref }, received: { implementation_status: current.implementation_status, commit_status: current.commit_status, commit_ref: current.commit_ref }, next_action: 'task:update --task '+old.id+' --input changes.json --expected-revision '+original.plan_revision });
      }
    }
    for (const t of added) check(t.implementation_status === 'TODO' && t.commit_status === 'PENDING', 'MANAGED_FIELDS', 'Новая задача должна быть TODO/PENDING.');
    let deferredTransfer;
    if (deferDocs) {
      // Move only pending documentation owned by DOCS into the first runnable correction.
      // Its normal checked commit will preserve those edits; DOCS remains unfinished.
      const pendingDocs = allChanges(root).filter(p => originalFinal.documentation_paths.includes(p));
      const recipient = added.find(t => t.dependencies.every(id => original.tasks.find(old => old.id === id)?.commit_status === 'DONE'));
      check(recipient, 'DEPENDENCY_PENDING', 'Исправлению нужна задача без незавершённых зависимостей.');
      const transferred=handoffTaskFiles(root,original,originalFinal,recipient,pendingDocs,false);
      deferredTransfer={from:originalFinal,to:recipient,files:transferred};
      recipient.documentation_paths = [...new Set([...recipient.documentation_paths, ...transferred])];
      plan.tasks.find(t=>t.id===originalFinal.id).implementation_status = 'TODO';
      plan.current_task_id = null;
    }
    normalizeCompletionContract(plan);
    if (added.some(t => t.functional_paths.length) || (input.context_pack && plan.tasks.some(t => t.functional_paths.length && t.commit_status !== 'DONE'))) requireModuleContext(plan);
    plan.delivery_status = plan.tasks.length && plan.tasks.every(t => t.commit_status === 'DONE') ? 'READY_FOR_ACCEPTANCE' : 'IN_PROGRESS';
    normalizeExecutionPolicy(plan);
    validatePlan(plan); validatePlanConfiguration(root, plan, readConfig(root)); resolveReferences(root, plan);
    if(deferredTransfer)handoffTaskFiles(root,original,deferredTransfer.from,deferredTransfer.to,deferredTransfer.files);
    if (plan.current_task_id || deferDocs) writePlan(root, plan);
    else service(root, plan, 'plan-adjustment', [PLAN], 'docs: уточнить план ' + plan.scope_id);
    return recover(root);
  });
}
export function applyConfig(root, input) {
  assertAssignmentCommand(root, 'config:apply');
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); const candidateConfig = validateConfig(input); const { plan } = validate(root, candidateConfig);
    const config = candidateConfig; const before = fs.readFileSync(path.join(root, CONFIG), 'utf8');
    check(paths(root, 'staged').every(p => p === CONFIG), 'FOREIGN_STAGED', 'Сначала отделите посторонние staged-изменения.');
    atomic(path.join(root, CONFIG), json(config)); plan.plan_revision++;
    try { return service(root, plan, 'plan-adjustment', [CONFIG, PLAN], 'chore: настроить профиль разработки'); }
    catch (e) { if (!journal(root)) atomic(path.join(root, CONFIG), before); throw e; }
  });
}

// Explicit scope rollover: Git retains the exact source plan.
export function carryoverPlan(root, input, expectedRevision) {
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); assertSingleWriter(root, PLAN);
    const { plan: previous, config } = validate(root);
    check(input && Object.keys(input).every(k => ['scope','id','objective','approval_note'].includes(k)),
      'PLAN_SCHEMA', 'Допустимы scope, id, objective, approval_note.');
    check(typeof input.approval_note === 'string' && input.approval_note.trim().length >= 10,
      'USER_CLOSE_REQUIRED', 'Перенос требует прямого поручения пользователя.');
    check(typeof input.scope === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.scope)
      && typeof input.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.id) && input.id !== input.scope,
      'SCOPE_ID', 'Нужны разные корректные исходный scope и новый id.');
    check(expectedRevision !== undefined, 'EXPECTED_REVISION_REQUIRED', 'Укажите --expected-revision.');
    // Retry after a confirmed commit is harmless, including after a lost response.
    if (previous.scope_id === input.id && previous.carryover?.from_scope === input.scope
        && previous.carryover.source_revision === Number(expectedRevision)) {
      const source = git(root, ['show', previous.carryover.source_commit + ':' + PLAN]).stdout;
      check(hash(source) === (previous.carryover.source_sha256 ?? previous.carryover.archive_sha256),
        'CARRYOVER_SOURCE', 'Исходный план переноса не подтверждён в Git.');
      return { ok:true, already_transferred:true, scope_id:previous.scope_id,
        source_commit:previous.carryover.source_commit, task_ids:previous.carryover.task_ids };
    }
    revision(previous, expectedRevision);
    check(previous.scope_id === input.scope && previous.execution_scope_status !== 'NONE',
      'SCOPE_ID', 'Исходный scope не является текущим.');
    check(previous.current_task_id === null, 'TASK_ALREADY_ACTIVE', 'Сначала завершите текущую микрозадачу.');
    const remaining = previous.tasks.filter(t => t.commit_status !== 'DONE');
    check(remaining.length > 0, 'NOTHING_TO_TRANSFER', 'Нет незавершённых задач; используйте archive.');
    const original = textFile(root, PLAN);
    check(allChanges(root).length === 0, 'DIRTY_WORKTREE',
      'Перенос требует чистого рабочего дерева.');
    const ids = new Set(remaining.map(t => t.id));
    const tasks = remaining.map(t => {
      const next = structuredClone(t);
      next.dependencies = t.dependencies.filter(dep => ids.has(dep));
      if (next.context_pack) next.context_pack.dependency_task_ids =
        (next.context_pack.dependency_task_ids ?? []).filter(dep => ids.has(dep));
      next.commit_ref = {scope_id:input.id, task_id:t.id, role:'implementation',
        ...(isDocumentationFinalizationTask(t) ? {iteration:t.commit_ref?.iteration ?? 1} : {})};
      delete next.actual_files;
      return next;
    });
    const plan = { ...emptyPlan(previous.project_name), project_id:previous.project_id,
      scope_id:input.id, plan_revision:previous.plan_revision + 1, execution_scope_status:previous.execution_scope_status,
      delivery_status:'IN_PROGRESS', objective:input.objective ?? previous.objective,
      acceptance_criteria:structuredClone(previous.acceptance_criteria), baseline_commit:head(root),
      blocked_reason:previous.blocked_reason, context_pack:structuredClone(previous.context_pack),
      approved_scope:{functional_paths:[...new Set(tasks.flatMap(t=>t.functional_paths))],
        documentation_paths:[...new Set(tasks.flatMap(t=>t.documentation_paths))]}, tasks,
      user_decisions:[{id:id(),text:input.approval_note,recorded_at:new Date().toISOString()}],
      carryover:{from_scope:previous.scope_id, source_revision:previous.plan_revision,
        source_commit:head(root), source_path:PLAN, source_sha256:hash(original),
        task_ids:remaining.map(t=>t.id),
        completed_dependencies:Object.fromEntries(remaining.map(t=>[t.id,t.dependencies.filter(dep=>!ids.has(dep))]))} };
    plan.context_pack.dependency_task_ids = plan.context_pack.dependency_task_ids.filter(dep=>ids.has(dep));
    normalizeCompletionContract(plan); requireModuleContext(plan);
    validatePlan(plan); validatePlanConfiguration(root,plan,config); resolveReferences(root,plan);
    const result = service(root,plan,'plan-carryover',[PLAN],
      'docs: перенести незавершённые задачи ' + previous.scope_id + ' → ' + input.id);
    return {...result, source_commit:plan.carryover.source_commit, task_ids:remaining.map(t=>t.id), state:recover(root)};
  });
}

// Project rename: the name shown in the plan heading and recovery follows the user's
// decision (usually a renamed folder). Manifest hook paths are refreshed for the current
// checkout; runtime targets are already resolved from the hooks directory, so this is tidiness.
export function renameProject(root, name, expectedRevision) {
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); assertSingleWriter(root, PLAN); const { plan } = validate(root);
    check(expectedRevision !== undefined, 'EXPECTED_REVISION_REQUIRED', 'Укажите --expected-revision из status.'); revision(plan, expectedRevision);
    const next = typeof name === 'string' ? name.trim() : '';
    check(next && next.length <= 100 && !/[\u0000-\u001f\u007f]/.test(next), 'PROJECT_NAME', 'Укажите имя проекта: одна строка до 100 символов без управляющих символов.');
    check(plan.current_task_id === null, 'TASK_ACTIVE', 'Сначала завершите активную микрозадачу.');
    const manifestFile = path.join(root, MANIFEST);
    const manifestBefore = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, 'utf8') : null;
    let manifestAfter = manifestBefore;
    if (manifestBefore !== null) {
      const manifest = JSON.parse(manifestBefore); const folder = hooksDirectory(root).folder;
      manifest.files = manifest.files.map(entry => entry.external && entry.kind === 'git-hook'
        ? { ...entry, path: path.join(folder, path.posix.basename(entry.path.replaceAll('\\', '/'))) } : entry);
      manifestAfter = json(manifest);
    }
    if (plan.project_name === next && manifestAfter === manifestBefore) return { ok: true, changed: false, project_name: next, message: 'Имя проекта уже актуально.' };
    const previousName = plan.project_name;
    plan.project_name = next; plan.plan_revision++;
    const selected = [PLAN];
    if (manifestAfter !== manifestBefore) { atomic(manifestFile, manifestAfter); selected.push(MANIFEST); }
    try {
      const result = service(root, plan, 'kit-update', selected, 'chore: переименовать проект в ' + next);
      return { ...result, changed: true, previous_name: previousName, project_name: next, message: 'Имя проекта: ' + next + '.' };
    } catch (error) {
      if (!journal(root) && manifestAfter !== manifestBefore) atomic(manifestFile, manifestBefore);
      throw error;
    }
  });
}
export function archive(root, scope, approvalNote) {
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root); const { plan } = validate(root);
    check(scope && plan.scope_id === scope, 'SCOPE_ID', 'Укажите точный --scope.');
    check(typeof approvalNote === 'string' && approvalNote.trim().length >= 10, 'USER_CLOSE_REQUIRED', 'Нужна отдельная команда пользователя на закрытие, записанная в --approval-note. Приёмка сама по себе не закрывает scope.');
    check(plan.tasks.every(t => t.commit_status === 'DONE'), 'SCOPE_UNFINISHED', 'В scope остались незавершённые задачи; обычное архивирование отклонено.');
    check(allChanges(root).length === 0, 'DIRTY_WORKTREE', 'Архивирование требует чистого рабочего дерева.');
    const empty = emptyPlan(plan.project_name); empty.project_id = plan.project_id; empty.plan_revision = plan.plan_revision + 1;
    empty.archived_scope_id = scope; empty.user_decisions = [{ id: id(), text: approvalNote, recorded_at: new Date().toISOString() }];
    return service(root, empty, 'archive', [PLAN], 'docs: закрыть scope ' + scope);
  });
}
export function commitDocumentation(root, files, message) {
  const PLAN = planPath(root);
  return locked(root, () => {
    noTransaction(root);
    const { plan } = validate(root);
    check(plan.execution_scope_status === 'NONE' || plan.execution_scope_status === 'ACTIVE' && plan.current_task_id === null,
      'TASK_ACTIVE', 'docs:commit разрешён без плана или между микрозадачами ACTIVE-плана.');
    check(!plan.tasks.some(t => t.implementation_status === 'IN_PROGRESS'), 'TASK_ACTIVE', 'Сначала завершите активную микрозадачу.');
    check(Array.isArray(files) && files.length && files.every(p => typeof p === 'string' && p.endsWith('.md') && !p.startsWith('.harness/')),
      'DOCUMENTATION_PATHS', 'Укажите непустой files: только .md вне .harness/.');
    for (const file of files) safePath(root, file);
    check(typeof message === 'string' && message.trim(), 'COMMIT_MESSAGE', 'Укажите --message для docs:commit.');
    check(allChanges(root).some(p => files.includes(p)), 'NOTHING_TO_COMMIT', 'Нет выбранных изменений документации.');
    plan.plan_revision++;
    return service(root, plan, 'documentation', files, message);
  });
}
export function repair(root, applyId, cancelId) {
  const PLAN = planPath(root);
  const pending = journal(root); const raw = textFile(root, PLAN); let operation;
  if (pending) {
    const completed = completedTransaction(root, pending);
    operation = { kind: completed ? 'finish-commit' : 'retry-commit', sha: completed, message: completed ? 'Завершить технический журнал подтверждённого коммита.' : 'Повторить управляемую транзакцию с сохранением изменений.' };
  } else {
    const p = parsePlan(raw, { projection: false }); resolveReferences(root, p);
    try { validatePlanConfiguration(root, p, readConfig(root)); } catch (error) {
      if (error.code !== "NOT_CONFIGURED") throw error;
      check(!applyId, "CONFIG_REPAIR_REQUIRED", "Используйте config:apply с полной согласованной конфигурацией проверок.");
      return {ok:false, kind:"configuration", code:error.code, message:error.message, next_action:"config:apply --input <config.json>", dry_run:true};
    }
    operation = { kind: renderPlan(p) === raw ? 'none' : 'projection', message: renderPlan(p) === raw ? 'Повреждение не обнаружено.' : 'Восстановить читаемую проекцию из канонического JSON.' };
    const active=p.tasks.find(t=>t.id===p.current_task_id);
    if(active&&isDocumentationFinalizationTask(active)&&active.implementation_status==='IN_PROGRESS'&&active.dependencies.some(id=>p.tasks.find(t=>t.id===id)?.commit_status!=='DONE'))operation={kind:'defer-docs',message:'Отложить DOCS до завершения добавленных исправлений; сохранить рабочие файлы и историю.'};
  }
  const repairId = hash(json({ operation, head: head(root), raw, pending })).slice(0, 24);
  if (cancelId) return locked(root, () => {
    check(cancelId === repairId, 'REPAIR_CHANGED', 'Состояние изменилось. Повторите repair --dry-run.');
    check(pending && !completedTransaction(root, pending), 'NO_PREPARATION', 'Нет незавершённой подготовки коммита.');
    check(head(root) === pending.before_head, 'HEAD_CHANGED', 'HEAD изменён; отмена запрещена.');
    check(hash(textFile(root, PLAN)) === pending.candidate_hash, 'PLAN_CHANGED', 'План изменён после подготовки.');
    check(git(root, ['write-tree']).stdout.trim() === pending.candidate_tree, 'INDEX_CHANGED', 'Index изменён после подготовки.');
    const before = localPath(root, 'index-before');
    check(fs.existsSync(before), 'INDEX_BACKUP_MISSING', 'Нет сохранённого исходного index.');
    atomic(localPath(root, 'cancelled-' + pending.id + '.json'), json(pending), 0o600);
    atomic(gitPath(root, 'index'), fs.readFileSync(before), 0o600);
    atomic(path.join(root, PLAN), pending.original_plan);
    fs.unlinkSync(localPath(root, 'transaction.json'));
    return {ok:true, message:'Подготовка отменена; рабочие файлы сохранены, задача снова открыта.'};
  });
  if (!applyId) return { ok: true, repair_id: repairId, ...operation, dry_run: true };
  check(repairId === applyId, 'REPAIR_CHANGED', 'Состояние изменилось. Повторите repair --dry-run.');
  return locked(root, () => {
    if (operation.kind === 'finish-commit') return finishTransaction(root, pending, operation.sha);
    if (operation.kind === 'retry-commit') return commitCandidate(root, { plan: readPlan(root), role: pending.role, task: pending.task, selected: pending.selected, message: pending.message, checks: pending.checks, beforeHead: pending.before_head });
    if(operation.kind==='defer-docs'){const p=readPlan(root);p.tasks.find(t=>t.id===p.current_task_id).implementation_status='TODO';p.current_task_id=null;p.plan_revision++;writePlan(root,p);return {ok:true,message:operation.message};}
    if (operation.kind === 'projection') { const p = parsePlan(raw, { projection: false }); writePlan(root, p); return { ok: true, message: 'Проекция восстановлена. Изменения не коммитились автоматически.' }; }
    return { ok: true, message: operation.message };
  });
}
export function acknowledgeHook(root, marker, client = 'Codex') {
  const receipt = readJSON(localPath(root, 'recovery.json'));
  check(receipt.marker && receipt.marker === marker && receipt.reason !== 'manual', 'HOOK_MARKER', 'Маркер не соответствует последнему lifecycle-событию.');
  const hooksHash = hash(fs.readFileSync(path.join(root, '.codex/hooks.json')));
  const file = acknowledgementsPath(root);
  const records = fs.existsSync(file) ? readJSON(file) : {};
  records[receipt.reason] = { marker, client, kit_version: VERSION, hooks_hash: hooksHash, at: new Date().toISOString(), signature: receipt.signature, plan_revision: receipt.plan_revision };
  atomic(file, json(records)); return { ok: true, message: 'Получение контекста агентом отмечено для события ' + receipt.reason + '.' };
}
export function status(root) {
  const state = recoverState(root);
  const { plan, config, resolved, transaction } = state.validation;
  const receiptFile = localPath(root, 'recovery.json'); const ackFile = acknowledgementsPath(root);
  const hooksFile = path.join(root, '.codex/hooks.json'); const hooksHash = fs.existsSync(hooksFile) ? hash(fs.readFileSync(hooksFile)) : null;
  const receipts = fs.existsSync(ackFile) ? readJSON(ackFile) : {};
  const acknowledged = Object.fromEntries(Object.entries(receipts).filter(([, r]) => r.hooks_hash === hooksHash && r.kit_version === VERSION));
  const recovery = state.packet;
  return { ok: true, project_path: root, project_name: plan.project_name, version: VERSION, project_id: plan.project_id,
    scope_status: plan.execution_scope_status, delivery_status: plan.delivery_status, scope_id: plan.scope_id, objective: plan.objective,
    current_task_id: plan.current_task_id, next_task_id: nextTask(plan)?.id ?? null, plan_revision: plan.plan_revision,
    tasks_done: plan.tasks.filter(t => t.commit_status === 'DONE').length, tasks_total: plan.tasks.length,
    profile: config.profile, stack: config.stack, head: state.snapshot.head,
    changes: [...new Set([...state.snapshot.staged, ...state.snapshot.unstaged, ...state.snapshot.untracked])].sort(), resolved,
    transaction: transaction ? { id: transaction.id, phase: transaction.phase, task: transaction.task_id } : null,
    integration_status: !hooksHash ? 'HOOK_MISSING' : acknowledged.startup ? 'HOOK_VERIFIED' : 'HOOK_TRUST_PENDING',
    hook_events: acknowledged, auto_compact_status: 'AUTO_COMPACT_UNVERIFIED',
    last_hook_execution: fs.existsSync(receiptFile) ? readJSON(receiptFile) : null,
    recovery_size: recovery.size, recovery_text: recovery.text, recovery_completeness: recovery.completeness,
    git_identity_ready: identityReady(root), manifest_present: fs.existsSync(path.join(root, MANIFEST)) };
}

export function preparePlan(root, input, expectedRevision) {
  void root; void input; void expectedRevision;
  check(false, 'COMMAND_REMOVED', 'plan:prepare удалена. Новый chat продолжает текущий checkout plan; для независимой работы используйте Git worktree.');
}
export function bindPlan(root, targetSession, experience, expectedRevision) {
  void root; void targetSession; void experience; void expectedRevision;
  check(false, 'COMMAND_REMOVED', 'plan:bind удалена: chat session больше не владеет plan.');
}
export function adoptPlan(root, evidence, expectedRevision) {
  void root; void evidence; void expectedRevision;
  check(false, 'COMMAND_REMOVED', 'plan:adopt удалена: historical session plans не могут становиться runtime current через ownership.');
}
