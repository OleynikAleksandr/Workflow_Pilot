import { assertAssignment } from './assignment-contract.mjs';
import { check, planPath, contextPath } from './common.mjs';
import { readPlan } from './plan.mjs';

import { validateConfig, readConfig } from './validation-rules.mjs';
export { defaultConfig, documentByteLimit, retryCommand, validateDocumentSizes, validateDocumentationCommit, validateConfig, readConfig, matches, validateDocs, taskChecks } from './validation-rules.mjs';
import { journal } from './transaction-state.mjs';
export { journal } from './transaction-state.mjs';
import { resolveReferences } from './commit-references.mjs';
export { resolveReferences } from './commit-references.mjs';
export function validatePlanConfiguration(root, plan, config) {
  validateConfig(config);
  for (const task of plan.tasks) {
    for (const p of [...task.functional_paths, ...task.documentation_paths]) contextPath(root, p);
    for (const test of task.verification_ids) check(config.checks.some(c => c.id === test), 'NOT_CONFIGURED', 'Нет конфигурации проверки ' + test);
  }
}
export function validate(root, candidateConfig) {
  const plan = readPlan(root); const config = candidateConfig ?? readConfig(root); const pendingJournal = journal(root);
  assertAssignment(root, plan);
  const pending = pendingJournal && (pendingJournal.plan_path ?? '.harness/plans/todo-plan.md') === planPath(root) ? pendingJournal : null;
  const resolved = resolveReferences(root, plan, pending);
  for (const task of plan.tasks) {
    for (const p of [...task.functional_paths, ...task.documentation_paths]) contextPath(root, p);
    if (task.implementation_status === 'IN_PROGRESS') check(task.dependencies.every(d => plan.tasks.find(t => t.id === d).commit_status === 'DONE'), 'DEPENDENCY_PENDING', 'Зависимости текущей задачи не выполнены.');
    for (const test of task.verification_ids) check(config.checks.some(c => c.id === test), 'NOT_CONFIGURED', 'Нет конфигурации проверки ' + test);
  }
  return { plan, config, resolved, transaction: pending };
}
