import fs from 'node:fs';
import { planPath, check, json, atomic, readJSON, withLock } from './common.mjs';
import { head, git, localPath } from './git.mjs';
const file = root => localPath(root,'integration.json');
export const journal = root => fs.existsSync(localPath(root, 'transaction.json')) ? readJSON(localPath(root, 'transaction.json')) : null;
export const activeIntegration = root => fs.existsSync(file(root)) ? readJSON(file(root)) : null;
export function assertIntegrationIdle(root) {
  check(!activeIntegration(root),'INTEGRATION_PENDING','main занят интеграцией; используйте integration:status/continue.');
}
export function assertIntegrationCommand(root,command) {
  if(['status','validate','recover','plan:view','hook','hook:ack','git-hook','integration:status','integration:continue','integration:start','assignment:status','task:block','assignment:message','plan:escalate'].includes(command))return;
  assertIntegrationIdle(root);
}
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
    'kit-update': p => p === PLAN || p.startsWith('.harness/kit/') || p.startsWith('.harness/plans/by-id/') || p.startsWith('.harness/plans/by-session/') || p.startsWith('.harness/plans/archive/') || ['.harness/kit-manifest.json', '.harness/plans/todo-plan.template.md', 'scripts/workflow', 'scripts/workflow.mjs', 'scripts/workflow.cmd', 'README.md','AGENTS.md', 'AGENTS.override.md', 'docs/architecture/OVERVIEW.md', '.gitignore'].includes(p),
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
