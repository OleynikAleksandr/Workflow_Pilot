import fs from 'node:fs';
import { assertIntegrationIdle } from './task-integration.mjs';
import { assertAssignment } from './task-assignment.mjs';
import {selectTaskFiles} from './task-files.mjs';
import path from 'node:path';
import { PLAN, planPath, check, hash, id, json, atomic, withLock, safePath } from './common.mjs';
import { readPlan, renderPlan, parsePlan, isDocumentationFinalizationTask } from './plan.mjs';
import { validate, journal, taskChecks, retryCommand } from './validate.mjs';
import { git, head, paths, localPath, gitPath, allChanges, ensureIdleGit, identityReady, snapshot, documentText, commitTimeout } from './git.mjs';

export const saveJournal = (root, data) => atomic(localPath(root, 'transaction.json'), json(data));
export const messageFor = t => t.message + '\n\nWorkflow-Scope: ' + (t.scope_id ?? 'NONE') + '\nWorkflow-Task: ' + (t.task_id ?? t.id) + '\nWorkflow-Role: ' + t.role + (t.role === 'implementation' ? '\nWorkflow-Iteration: ' + (t.task?.commit_ref?.iteration ?? 1) : '') + '\nWorkflow-Transaction: ' + t.id + (t.role === 'integration' ? '\nWorkflow-Source: ' + t.source_commit : '');
export const locked = (root, fn) => withLock(localPath(root, 'operation.lock'), () => { assertIntegrationIdle(root); return fn(); });
export function checkServicePaths(role, files, PLAN = ' .harness/plans/todo-plan.md'.trim()) {
  const patterns = {
    'assignment-plan': p => p === PLAN,
    'scope-plan': p => p === PLAN || p.startsWith('docs/') && /\.(md|markdown)$/.test(p),
    'plan-adjustment': p => p === PLAN || p === '.harness/workflow.json' || p.startsWith('docs/') && /\.(md|markdown)$/.test(p),
    repair: p => p === PLAN, planPath,
    'plan-carryover': p => p === PLAN,
    archive: p => p === PLAN,
    documentation: p => p === PLAN || !p.startsWith('.harness/') && p.endsWith('.md'),
    bootstrap: p => p.startsWith('.harness/') || p.startsWith('docs/') || ['README.md','AGENTS.md', 'AGENTS.override.md', '.gitignore', '.gitattributes', '.codex/hooks.json', 'scripts/workflow', 'scripts/workflow.mjs', 'scripts/workflow.cmd'].includes(p) || p.startsWith('.husky/'),
    'kit-update': p => p === PLAN || p.startsWith('.harness/kit/') || p.startsWith('.harness/plans/by-id/') || p.startsWith('.harness/plans/by-session/') || p.startsWith('.harness/plans/archive/') || ['.harness/kit-manifest.json', '.harness/plans/todo-plan.template.md', 'scripts/workflow', 'scripts/workflow.mjs', 'scripts/workflow.cmd', 'README.md','AGENTS.md', 'AGENTS.override.md', 'docs/architecture/OVERVIEW.md'].includes(p),
  };
  check(patterns[role], 'SERVICE_ROLE', 'Недопустимая служебная роль.');
  check(files.every(patterns[role]), 'SERVICE_SCOPE', 'Служебный коммит содержит недопустимые пути.', { files, role });
}
export function completedTransaction(root, t) {
  const now = head(root); if (!now || now === t.before_head) return null;
  const message = git(root, ['log', '-1', '--format=%B']).stdout;
  const trailers = git(root, ['interpret-trailers', '--parse'], { input: message }).stdout;
  if (!trailers.split('\n').includes('Workflow-Transaction: ' + t.id)) return null;
  const parent = git(root, ['rev-parse', 'HEAD^'], { allowFailure: true });
  check((t.before_head === null && parent.status !== 0) || parent.stdout.trim() === t.before_head, 'TRANSACTION_PARENT', 'Родитель коммита не соответствует транзакции.');
  if(t.role==='integration')check(git(root,['show','-s','--format=%P','HEAD']).stdout.trim()===t.before_head+' '+t.source_commit,
    'INTEGRATION_PARENTS','Родители merge-коммита не соответствуют транзакции.');
  check(git(root, ['rev-parse', 'HEAD^{tree}']).stdout.trim() === t.candidate_tree, 'TRANSACTION_TREE', 'Содержимое коммита отличается от проверенного кандидата.');
  check(message.trim() === messageFor(t).trim(), 'TRANSACTION_MESSAGE', 'Идентичность созданного коммита изменилась.');
  return now;
}
export function finishTransaction(root, t, sha) {
  const evidenceFile = localPath(root, 'last-verification.json');
  if (fs.existsSync(evidenceFile)) {
    const evidence = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
    if (evidence.transaction_id === t.id) {
      evidence.commit = sha;
      // Persist before removing the journal so interrupted finalization can retry safely.
      atomic(localPath(root, 'verification/by-commit/' + sha + '.json'), json(evidence));
      atomic(evidenceFile, json(evidence));
    }
  }
  atomic(localPath(root, 'last-commit.json'), json({ sha, scope_id: t.scope_id, task_id: t.task_id, role: t.role, transaction_id: t.id }));
  for (const name of ['transaction.json', 'index-before']) {
    const file = localPath(root, name); if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  return { ok: true, sha, task_id: t.task_id, role: t.role, message: 'Коммит создан и подтверждён.',
    excluded_changes: t.excluded_changes ?? [],
    ...((t.excluded_changes?.length ?? 0) ? {next_action: 'Перечисленные изменения остались вне коммита: они существовали до task:start или не вошли в явный выбор --files. Сверьте их с задачей перед финальной DOCS. Не присваивайте чужие изменения; собственные оставшиеся правки включите в следующую задачу явно через commit --files.'} : {}) };
}
export function commitCandidate(root, { plan, role, task = null, selected, message, beforeHead, checks = [] }) {
  assertIntegrationIdle(root);
  assertAssignment(root, plan, {role,files:selected,ready:role==='implementation'});
  const PLAN = planPath(root);
  ensureIdleGit(root); check(identityReady(root), 'GIT_IDENTITY', 'Git не знает автора. Настройте user.name и user.email; файлы сохранены.');
  let t = journal(root);
  if (t) {
    check((t.plan_path ?? '.harness/plans/todo-plan.md') === PLAN, 'TRANSACTION_TARGET_MISMATCH', 'Незавершённый commit принадлежит другому плану.');
    const existing = completedTransaction(root, t); if (existing) return finishTransaction(root, t, existing);
    check(t.role === role && t.task_id === (task?.id ?? null), 'TRANSACTION_PENDING', 'Сначала завершите предыдущую транзакцию.');
    check(head(root) === t.before_head, 'HEAD_CHANGED', 'HEAD изменён другим процессом; нужен repair --dry-run.');
    const currentHash = hash(fs.readFileSync(path.join(root, PLAN)));
    check([t.original_hash, t.candidate_hash].includes(currentHash), 'PLAN_CHANGED', 'План изменён во время незавершённого commit.');
  }
  const files = [...new Set([...selected, PLAN])].sort();
  for (const p of files) { const f = safePath(root, p); check(!fs.existsSync(f) || fs.statSync(f).isFile(), 'PATH_NOT_FILE', 'В задаче перечисляются файлы, а не каталоги: ' + p); }
  if (role !== 'implementation') checkServicePaths(role, files, PLAN);
  const staged = paths(root, 'staged');
  check(staged.every(p => files.includes(p)), 'FOREIGN_STAGED', 'В index есть посторонние файлы. Они не будут включены и не будут сняты со staging.', { paths: staged.filter(p => !files.includes(p)) });
  // Preflight every deleted required source before writing the journal, plan or index.
  // Use a clone so even the caller's plan remains intact on failure.
  plan = structuredClone(plan);
  const documents = [plan.context_pack, ...plan.tasks.map(item => item.context_pack)].flatMap(pack => pack?.documents ?? []);
  const missing = documents.filter(doc => doc.required && (doc.revision ?? 'WORKTREE') === 'WORKTREE' && !fs.existsSync(safePath(root,doc.path)));
  for (const doc of missing) {
    check(files.includes(doc.path), 'MISSING_FILE', 'Отсутствует required WORKTREE-документ вне выбранной операции: ' + doc.path);
    documentText(root, {...doc, revision:beforeHead});
  }
  const deleted = new Set(missing.map(doc => doc.path));
  const pin = documents.filter(doc => (doc.revision ?? 'WORKTREE') === 'WORKTREE' && deleted.has(doc.path));
  for (const doc of pin) doc.revision = beforeHead;
  if (task) task = {...task, context_pack:plan.tasks.find(item => item.id === task.id)?.context_pack};
  const candidateText = renderPlan(plan);
  if (!t) {
    check(head(root) === beforeHead, 'HEAD_CHANGED', 'HEAD изменился перед подготовкой коммита.');
    const index = gitPath(root, 'index');
    if (fs.existsSync(index)) atomic(localPath(root, 'index-before'), fs.readFileSync(index), 0o600);
    const original = fs.existsSync(path.join(root, PLAN)) ? fs.readFileSync(path.join(root, PLAN), 'utf8') : renderPlan(readPlan(root));
    t = { schema_version: 1, id: id(), plan_path: PLAN, role, scope_id: role === 'archive' ? plan.archived_scope_id : plan.scope_id,
      task_id: task?.id ?? null, task, message, before_head: beforeHead, original_plan: original,
      original_hash: hash(original), candidate_hash: hash(candidateText), candidate_plan: candidateText, selected: files, excluded_changes: allChanges(root).filter(p=>!files.includes(p)), checks, phase: 'PREPARING' };
    saveJournal(root, t);
  } else {
    check(hash(candidateText) === t.candidate_hash, 'CANDIDATE_CHANGED', 'Повтор commit не должен подменять план-кандидат.');
  }
  atomic(path.join(root, PLAN), candidateText);
  const changed = allChanges(root).filter(p => files.includes(p));
  check(changed.length > 0, 'NOTHING_TO_COMMIT', 'Нет изменений для фиксации.');
  check(head(root) === t.before_head, 'HEAD_CHANGED', 'HEAD изменился до staging.');
  // On retry a deletion may already be absent from the index. git add with
  // that path would fail even though the prepared deletion is still correct.
  const indexed = new Set(paths(root,'tracked'));
  const stageable = changed.filter(file => indexed.has(file) || fs.existsSync(path.join(root,file)));
  if (stageable.length) git(root, ['add', '--', ...stageable]);
  t.selected = files; t.candidate_tree = git(root, ['write-tree']).stdout.trim();
  t.snapshot = snapshot(root, files).fingerprint; t.phase = 'PREPARED'; saveJournal(root, t);
  // Explicit failpoints are only for deterministic crash tests in temporary repositories.
  if (process.env.WORKFLOW_TEST_FAILPOINT === 'prepared') check(false, 'TEST_INTERRUPTION', 'Тестовое прерывание после подготовки кандидата.');
  const result = git(root, ['commit', '-m', messageFor(t)], { allowFailure: true, timeout: commitTimeout(t.checks) });
  if (result.status !== 0) {
    t = journal(root) ?? t; t.phase = 'CHECKS_FAILED'; t.error = String(result.stderr || result.stdout).slice(-5000); saveJournal(root, t);
    // A normal failed check is not a crash. Restore only our own plan/index;
    // leave all source edits intact, and retain the journal if another writer intervened.
    const backup=localPath(root,'index-before');
    const unchanged=head(root)===t.before_head && hash(fs.readFileSync(path.join(root,PLAN)))===t.candidate_hash
      && git(root,['write-tree']).stdout.trim()===t.candidate_tree && fs.existsSync(backup);
    if(unchanged) {
      atomic(localPath(root,'failed-'+t.id+'.json'),json(t));
      atomic(gitPath(root,'index'),fs.readFileSync(backup),0o600);
      atomic(path.join(root,PLAN),t.original_plan);
      fs.unlinkSync(localPath(root,'transaction.json'));fs.unlinkSync(backup);
    }
    const retry = retryCommand(t);
    check(false, 'COMMIT_FAILED', unchanged ? 'Проверка не пройдена. Правки сохранены. Исправьте причину и повторите ' + retry + '; repair не нужен.' : 'Обнаружены конкурирующие изменения. Журнал сохранён для repair.', { output:t.error, retryable:unchanged });
  }
  const sha = completedTransaction(root, t);
  check(sha, 'COMMIT_NOT_CONFIRMED', 'Git завершился, но нужный коммит не подтверждён.');
  if (process.env.WORKFLOW_TEST_FAILPOINT === 'committed') check(false, 'TEST_INTERRUPTION', 'Тестовое прерывание после создания коммита.');
  return finishTransaction(root, t, sha);
}
export function commitTask(root, taskId, actualFiles) {
  if(actualFiles!==undefined)check(Array.isArray(actualFiles)&&actualFiles.every(p=>typeof p==='string'),'COMMIT_FILES','files должен быть массивом путей.',{field:'files',expected:'array of paths'});
  return locked(root, () => {
    const pending = journal(root);
    if (pending) {
      check((pending.plan_path ?? '.harness/plans/todo-plan.md') === planPath(root), 'TRANSACTION_TARGET_MISMATCH', 'Незавершённый commit относится к другому plan path.');
      check(pending.task_id === taskId, 'TRANSACTION_PENDING', 'Другая задача ожидает завершения commit.');
      const done = completedTransaction(root, pending); if (done) return finishTransaction(root, pending, done);
      const plan = parsePlan(pending.candidate_plan);
      if(actualFiles!==undefined)check(JSON.stringify([...new Set(actualFiles)].sort())===JSON.stringify((pending.task.actual_files??[]).slice().sort()),'CANDIDATE_CHANGED','Подготовленный коммит уже имеет состав файлов; завершите его повтором commit без нового списка.');
      return commitCandidate(root, { plan, role: 'implementation', task: pending.task, selected: pending.selected, message: pending.message, checks: pending.checks, beforeHead: pending.before_head });
    }
    const { plan, config, resolved } = validate(root);
    if (resolved[taskId]?.sha) return { ok: true, sha: resolved[taskId].sha, task_id: taskId, role: 'implementation', already_committed: true, message: 'Задача уже зафиксирована.' };
    check(plan.execution_scope_status === 'ACTIVE' && plan.current_task_id === taskId, 'TASK_NOT_ACTIVE', 'Сначала начните текущую задачу через task:start.');
    const task = plan.tasks.find(t => t.id === taskId);
    check(task.dependencies.every(id => plan.tasks.find(t => t.id === id)?.commit_status === 'DONE'), 'DEPENDENCY_PENDING', 'Сначала завершите зависимости задачи.', {task_id: taskId});
    const selection = selectTaskFiles(root,plan,task,actualFiles);
    const taskInput = structuredClone(task);
    const checks = taskChecks(task, config);
    task.implementation_status = 'DONE'; task.commit_status = 'DONE'; plan.current_task_id = null; plan.plan_revision++;
    plan.delivery_status = plan.tasks.every(t => t.commit_status === 'DONE') ? 'READY_FOR_ACCEPTANCE' : 'IN_PROGRESS';
    return commitCandidate(root, { plan, role: 'implementation', task: taskInput, selected: selection.selected, message: task.expected_commit_message, checks, beforeHead: head(root) });
  });
}
