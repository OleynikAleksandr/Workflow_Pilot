import { check, planPath, hash } from './common.mjs';
import { parsePlan, renderPlan } from './plan.mjs';
import { commitHistory, commitPaths, areAncestors, git, head } from './git.mjs';
import { journal } from './transaction-state.mjs';
import { verifyIntegrationCommit } from './integration-proof.mjs';
function commitIteration(commit) {
  const values = commit.trailers['Workflow-Iteration'];
  if (!values?.length) return 1;
  check(values.length === 1 && /^[1-9][0-9]*$/.test(values[0]), 'AMBIGUOUS_COMMIT', 'Некорректный Workflow-Iteration: ' + commit.sha);
  return Number(values[0]);
}
export function resolveReferences(root, p, pending = journal(root), tip = 'HEAD') {
  const PLAN = planPath(root);
  const history = p.scope_id ? commitHistory(root, p.baseline_commit, tip) : [];
  const resolved = {};
  for (const task of p.tasks) {
    const targetIteration = task.commit_ref?.iteration ?? 1;
    check(Number.isSafeInteger(targetIteration) && targetIteration > 0, 'PLAN_SCHEMA', 'commit_ref.iteration должна быть положительным целым: ' + task.id);
    const role = task.commit_ref.role;
    const taskHistory = history.filter(c => c.trailers['Workflow-Scope']?.includes(p.scope_id) && c.trailers['Workflow-Task']?.includes(task.id) && c.trailers['Workflow-Role']?.includes(role));
    for (const c of taskHistory) for (const key of ['Workflow-Scope', 'Workflow-Task', 'Workflow-Role']) check(c.trailers[key]?.length === 1, 'AMBIGUOUS_COMMIT', 'Дублированные trailers: ' + c.sha);
    const candidates = taskHistory.filter(c => commitIteration(c) === targetIteration);
    check(candidates.length <= 1, 'AMBIGUOUS_COMMIT', 'Найдено несколько коммитов задачи ' + task.id + ' iteration ' + targetIteration);
    if (!candidates.length) {
      const inTransaction = pending?.scope_id === p.scope_id && (pending.plan_path ?? '.harness/plans/todo-plan.md') === PLAN && pending?.task_id === task.id && pending.before_head === head(root) && pending.candidate_hash === hash(renderPlan(p));
      check(task.commit_status !== 'DONE' || inTransaction, 'PLAN_COMMIT_MISMATCH', 'Задача ' + task.id + ' отмечена DONE, но коммит не найден.');
      if (inTransaction) resolved[task.id] = { pending: true };
      continue;
    }
    const c = candidates[0];
    check(task.commit_status === 'DONE', 'PLAN_COMMIT_MISMATCH', 'Коммит уже существует, а задача не закрыта: ' + task.id);
    if (role === 'integration') {
      resolved[task.id] = verifyIntegrationCommit(root, c, task, p, resolveReferences);
      continue;
    }
    check(c.parents.length === 1, 'HISTORY_NOT_LINEAR', 'Коммит микрозадачи должен иметь одного родителя.');
    const changed = commitPaths(root, c.sha);
    // Historical task commits predate adoption; inspect the path in THAT commit.
    const planCandidates = [...new Set([PLAN, '.harness/plans/todo-plan.md'])].filter(file => changed.includes(file))
      .map(file => { const result = git(root, ['show', c.sha + ':' + file], { allowFailure: true });
        return result.status === 0 ? { file, plan: parsePlan(result.stdout) } : null; })
      .filter(record => record?.plan.scope_id === p.scope_id);
    check(planCandidates.length === 1, 'COMMIT_PLAN_MISMATCH', 'Коммит не содержит однозначный план этой задачи.');
    const committedPath = planCandidates[0].file;
    const allowed = new Set([...task.functional_paths, ...task.documentation_paths, committedPath]);
    check(changed.every(f => allowed.has(f)), 'COMMIT_SCOPE_MISMATCH', 'Состав коммита не соответствует задаче ' + task.id, { sha: c.sha, changed });
    const committed = planCandidates[0].plan;
    const record = committed.tasks.find(t => t.id === task.id);
    check(committed.scope_id === p.scope_id && record?.commit_status === 'DONE', 'COMMIT_PLAN_MISMATCH', 'Коммит не содержит завершение нужной задачи.');
    const dependencyCommits = record.dependencies.map(dep => {
      // Resolve the dependency iteration used by this historical commit.
      const depTask = committed.tasks.find(item => item.id === dep);
      const depIteration = depTask?.commit_ref?.iteration ?? 1;
      const earlier = history.find(h => h.trailers['Workflow-Scope']?.[0] === p.scope_id && h.trailers['Workflow-Task']?.[0] === dep
        && h.trailers['Workflow-Role']?.[0] === (depTask?.commit_ref?.role ?? 'implementation') && commitIteration(h) === depIteration);
      check(earlier, 'DEPENDENCY_ORDER', 'Зависимость не предшествует задаче ' + task.id);
      return earlier.sha;
    });
    check(areAncestors(root, dependencyCommits, c.parents[0]), 'DEPENDENCY_ORDER', 'Зависимость не предшествует задаче ' + task.id);
    resolved[task.id] = { sha: c.sha, parent: c.parents[0], paths: changed };
  }
  return resolved;
}
