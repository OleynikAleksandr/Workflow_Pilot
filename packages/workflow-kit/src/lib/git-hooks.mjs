import fs from 'node:fs';
import { assertIntegrationIdle, validateIntegrationCandidate } from './task-integration.mjs';
import { assertAssignment, readAssignment } from './task-assignment.mjs';
import path from 'node:path';
import { check, hash, PLAN, withPlanFile, json, atomic, safePath } from './common.mjs';
import { listPlans } from './session-plans.mjs';
import { parsePlan, isDocumentationFinalizationTask } from './plan.mjs';
import { journal, readConfig, validateDocs, resolveReferences, validateDocumentationCommit, validateDocumentSizes } from './validate.mjs';
import { git, head, paths, run, localPath, snapshot } from './git.mjs';
import { messageFor, saveJournal, completedTransaction, checkServicePaths } from './transaction.mjs';

export function validateStaged(root) {
  const t = journal(root);
  check(t, 'MANAGED_COMMIT_REQUIRED', 'Используйте ./scripts/workflow commit --task <id>. Прямой commit управляемых файлов запрещён.');
  check(t.before_head === head(root), 'HEAD_CHANGED', 'HEAD изменился во время транзакции.');
  const selected = paths(root, 'staged');
  check(selected.length > 0 && selected.every(p => t.selected.includes(p)), 'CANDIDATE_SCOPE', 'Index содержит файлы вне разрешённого кандидата.');
  const PLAN = t.plan_path ?? ' .harness/plans/todo-plan.md'.trim();
  const planText = git(root, ['show', ':' + PLAN]).stdout;
  check(hash(planText) === t.candidate_hash, 'CANDIDATE_PLAN', 'Index содержит другой план.');
  check(git(root, ['write-tree']).stdout.trim() === t.candidate_tree, 'CANDIDATE_CHANGED', 'Index изменён после подготовки кандидата.');
  validateDocumentSizes(root, selected, t);
  const plan = parsePlan(planText);
  assertAssignment(root,plan,{role:t.role,files:selected,ready:t.role==='implementation'});
  if (t.role === 'implementation' || t.role === 'integration') {
    if(t.role==='integration')validateIntegrationCandidate(root,t,plan);
    else assertIntegrationIdle(root);
    check(t.task?.id === t.task_id && plan.tasks.find(task => task.id === t.task_id)?.commit_status === 'DONE', 'CANDIDATE_TASK', 'Кандидат не завершает нужную задачу.');
    const config = readConfig(root);
    validateDocs(root, selected, t.task, config, p => {
      const r = git(root, ['show', ':' + p], { allowFailure: true });
      check(r.status === 0, 'DOCUMENTATION_INDEX', 'Документ отсутствует в index: ' + p); return r.stdout;
    });
    resolveReferences(root, plan, t);
  } else {
    checkServicePaths(t.role, selected, PLAN);
    if (t.role === 'documentation') validateDocumentationCommit(root, selected, plan);
  }
  return t;
}
export function preCommit(root) {
  const t = validateStaged(root);
  const before = snapshot(root, t.selected);
  const results = [];
  for (const test of t.checks) {
    const start = Date.now();
    const cwd = !test.cwd || test.cwd === '.' ? root : safePath(root, test.cwd);
    const result = run(test.executable, test.args, cwd, { allowFailure: true, timeout: test.timeout_ms });
    const record = { id: test.id, kind: test.kind ?? 'unspecified', evidence: test.evidence ?? null, command: [test.executable,...test.args], status: result.status === 0 && !result.error ? 'PASSED' : 'FAILED', exit_code: result.status,
      elapsed_ms: Date.now() - start, output: String(result.stderr || result.stdout || result.error?.message || '').slice(-1200) };
    results.push(record);
    atomic(localPath(root, 'last-verification.json'), json({ transaction_id: t.id, candidate_tree: t.candidate_tree, verification_scope: 'worktree', excluded_changes: t.excluded_changes ?? [], commit: null, checks: results }));
    check(record.status === 'PASSED', 'CHECK_FAILED', 'Не пройдена проверка ' + test.id, { result: record });
  }
  const after = snapshot(root, t.selected);
  check(after.fingerprint === before.fingerprint, 'CHECK_MODIFIED_CANDIDATE', 'Проверка изменила файлы или index. Подготовьте новый кандидат повтором commit.');
  validateStaged(root);
  t.phase = 'CHECKED'; t.checked_snapshot = after.fingerprint; saveJournal(root, t);
  if (!results.length) atomic(localPath(root, 'last-verification.json'), json({ transaction_id: t.id, candidate_tree: t.candidate_tree, verification_scope: 'worktree', excluded_changes: t.excluded_changes ?? [], commit: null, checks: [], note: 'Документальная или служебная операция: проверены схема и кандидат; suite приложения не запускалась.' }));
  return { ok: true, message: 'Кандидат проверен.', checks: results };
}
export function commitMessage(root, file) {
  const t = validateStaged(root);
  check(fs.readFileSync(file, 'utf8').trim() === messageFor(t).trim(), 'COMMIT_MESSAGE', 'Сообщение и trailers не соответствуют управляемой транзакции.');
  check(t.phase === 'CHECKED' && snapshot(root, t.selected).fingerprint === t.checked_snapshot, 'CANDIDATE_UNCHECKED', 'Кандидат изменён или pre-commit не завершён.');
  return { ok: true };
}
export function postCommit(root) {
  const t = journal(root); if (!t) return { ok: true };
  const sha = completedTransaction(root, t);
  check(sha, 'COMMIT_NOT_CONFIRMED', 'post-commit не подтвердил транзакцию.');
  t.phase = 'COMMITTED'; t.result_sha = sha; saveJournal(root, t);
  return { ok: true, sha };
}
export function prePush(root) {
  assertIntegrationIdle(root);
  check(!readAssignment(root),'ASSIGNMENT_READ_ONLY','Ветка исполнителя передаётся основной сессии для интеграции; push запрещён.');
  check(!journal(root), 'TRANSACTION_PENDING', 'Перед push завершите commit/repair.');
  for (const { file, plan } of listPlans(root)) {
    withPlanFile(root, file, {}, () => resolveReferences(root, plan));
    // 1.5.5: GitHub gets the result only after its documentation (delivery-ordering-policy, invariant 5).
    const docs = plan.execution_scope_status === 'NONE' ? null : plan.tasks.findLast(isDocumentationFinalizationTask);
    check(!docs || docs.commit_status === 'DONE', 'DOCS_BEFORE_PUSH',
      'Push выполняется только после DOCS текущего плана. Заверши DOCS, затем публикуй в delivery-задаче после неё (verification_kind=package с проверкой удалённой ветки). Не обходи hook через --no-verify.',
      { scope_id: plan.scope_id, docs_status: docs?.commit_status ?? null });
  }
  const config = readConfig(root);
  for (const test of config.checks.filter(c => c.stage === 'push' && c.required)) {
    const result = run(test.executable, test.args, test.cwd && test.cwd !== '.' ? safePath(root, test.cwd) : root, { timeout: test.timeout_ms });
    check(result.status === 0, 'PUSH_CHECK_FAILED', 'Не пройдена проверка ' + test.id);
  }
  return { ok: true };
}
