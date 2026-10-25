import { assertAssignment } from './assignment-contract.mjs';
import { check, planPath, contextPath } from './common.mjs';
import {validatePreparedTask} from './prepared-task.mjs';
import { readPlan, isOrchestratedPlan, isDocumentationFinalizationTask } from './plan.mjs';

import { validateConfig, readConfig } from './validation-rules.mjs';
export { defaultConfig, documentByteLimit, retryCommand, validateDocumentSizes, validateDocumentationCommit, validateConfig, readConfig, matches, validateDocs, taskChecks } from './validation-rules.mjs';
import { journal } from './transaction-state.mjs';
export { journal } from './transaction-state.mjs';
import { resolveReferences } from './commit-references.mjs';
export { resolveReferences } from './commit-references.mjs';
export function validatePlanConfiguration(root, plan, config) {
  validateConfig(config);
  for (const task of plan.tasks) {
    validatePreparedTask(plan,task,config.budget);
    for (const p of [...task.functional_paths, ...task.documentation_paths]) contextPath(root, p);
    for (const test of task.verification_ids) check(config.checks.some(c => c.id === test), 'NOT_CONFIGURED', 'Нет конфигурации проверки ' + test);
  }
  validateDeliveryTail(plan, config);
}
// A release round of an orchestrated plan repeats the project's delivery tail after its DOCS.
function validateDeliveryTail(plan, config) {
  if (!isOrchestratedPlan(plan) || plan.execution_scope_status === 'NONE' || !plan.release) return;
  const expected = config.delivery_tail ?? [];
  check(expected.length > 0, 'DELIVERY_TAIL_REQUIRED',
    'План с release: true требует delivery_tail в .harness/workflow.json. Настройте хвост через config:apply или опубликуйте план с release: false.');
  const tail = plan.tasks.slice(plan.tasks.findLastIndex(isDocumentationFinalizationTask) + 1);
  const describe = task => ({id: task.id, verification_kind: task.verification_kind, verification_ids: task.verification_ids});
  const same = (task, step) => task.verification_kind === step.verification_kind
    && task.verification_ids.length === step.verification_ids.length && step.verification_ids.every(id => task.verification_ids.includes(id));
  check(tail.length === expected.length && tail.every((task, index) => same(task, expected[index])), 'DELIVERY_TAIL_MISMATCH',
    'Delivery-задачи после DOCS должны повторять delivery_tail проекта по составу и порядку.',
    {expected, received: tail.map(describe)});
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
