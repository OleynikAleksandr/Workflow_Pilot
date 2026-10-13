import { PLAN, check, json } from './common.mjs';
import { git, isAncestor, commitHistory, commitPaths } from './git.mjs';
import { parsePlan, renderPlan } from './plan.mjs';
const planAt = (root,sha) => parsePlan(git(root,['show',sha+':'+PLAN]).stdout);
const one = (commit,key) => {const values=commit.trailers[key];check(values?.length===1,'INTEGRATION_TRAILERS','Нужен единственный '+key);return values[0];};
const taskContract = task => {
  const copy=structuredClone(task);
  for(const key of ['implementation_status','commit_status','commit_ref','actual_files'])delete copy[key];
  return json(copy);
};
const workerContract = task => {
  const copy=structuredClone(task);copy.dependencies=[];copy.parallel_safe=false;
  if(copy.context_pack)copy.context_pack.dependency_task_ids=[];
  return taskContract(copy);
};
export const allowedFiles = task => [...new Set([PLAN,...task.functional_paths,...task.documentation_paths])];

// All durable source identity is in Git. Local check receipts are required at admission.
// The resolver callback examines declared predecessors at the assignment base;
// proof validation never imports command orchestration or creates a module cycle.
export function inspectIntegrationSource(root,source,task,parentScope,resolveReferences) {
  check(typeof source==='string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(source),'INTEGRATION_SOURCE','Нужен точный source SHA.');
  const child=planAt(root,source), assignment=child.assignment;
  check(assignment?.parent_scope_id===parentScope && assignment.parent_task_id===task.id,'INTEGRATION_SOURCE','Source принадлежит другому назначению.');
  const base=planAt(root,assignment.base_commit), original=base.tasks.find(t=>t.id===task.id);
  check(base.scope_id===parentScope && original && taskContract(original)===taskContract(task),'INTEGRATION_CONTRACT','Контракт задачи изменился после назначения.');
  const commits=commitHistory(root,assignment.base_commit,source);
  check(commits.length===2,'INTEGRATION_HISTORY','Разрешены только подготовка назначения и один implementation-коммит.');
  const [implementation,preparation]=commits;
  check(implementation.sha===source && implementation.parents.length===1 && implementation.parents[0]===preparation.sha
    && preparation.parents.length===1 && preparation.parents[0]===assignment.base_commit,'INTEGRATION_HISTORY','Посторонние коммиты или merge в ветке исполнителя.');
  for(const [commit,role] of [[implementation,'implementation'],[preparation,'assignment-plan']]) {
    check(one(commit,'Workflow-Scope')===child.scope_id && one(commit,'Workflow-Role')===role,'INTEGRATION_TRAILERS','Неверная идентичность источника.');
    one(commit,'Workflow-Transaction');
  }
  check(one(implementation,'Workflow-Task')===task.id,'INTEGRATION_TRAILERS','Неверная задача источника.');
  check(commitPaths(root,preparation.sha).every(p=>p===PLAN),'INTEGRATION_SCOPE','Подготовка назначения изменила исходники.');
  const prepared=planAt(root,preparation.sha), childTask=child.tasks[0];
  check(json(prepared.assignment)===json(assignment) && prepared.tasks[0].commit_status==='PENDING'
    && childTask.commit_status==='DONE' && workerContract(original)===taskContract(childTask)
    && workerContract(original)===taskContract(prepared.tasks[0]),'INTEGRATION_CONTRACT','Локальное задание не соответствует родительскому.');
  const changed=commitPaths(root,source), allowed=allowedFiles(task);
  check(changed.includes(PLAN) && changed.every(p=>allowed.includes(p)),'INTEGRATION_SCOPE','Source содержит чужие файлы.');
  // Installed runtime/configuration are inherited, never imported from a worker.
  const delta=git(root,['diff','--name-only','--no-renames',assignment.base_commit,source,'--']).stdout.trim().split('\n').filter(Boolean);
  check(delta.every(p=>p===PLAN || !p.startsWith('.harness/') && !['scripts/workflow','scripts/workflow.mjs','scripts/workflow.cmd'].includes(p)),
    'INTEGRATION_SERVICE_FILES','Исполнитель не заменяет служебную конфигурацию main.');
  // Resolve only the declared dependencies, not every earlier independent task.
  const baseResolved=original.dependencies.length ? resolveReferences(root,
    {...base,tasks:base.tasks.filter(t=>original.dependencies.includes(t.id))},null,assignment.base_commit) : {};
  check(json(assignment.external_dependencies.map(d=>d.task_id).sort())===json([...original.dependencies].sort())
    && assignment.external_dependencies.every(d=>baseResolved[d.task_id]?.sha===d.commit && isAncestor(root,d.commit,assignment.base_commit)),
    'DEPENDENCY_ORDER','Назначение не подтверждает интегрированные зависимости базы.');
  return {child,assignment,changed};
}

export function verifyIntegrationCommit(root,commit,task,plan,resolveReferences) {
  const ref=task.commit_ref;
  // Later documentation commits may pin old context references. Validate the
  // source contract against the plan at admission, not today's mutable metadata.
  const before=planAt(root,commit.parents[0]);
  task=before.tasks.find(item=>item.id===task.id);
  check(task,'INTEGRATION_TASK','Нет задачи в родительском коммите интеграции.');
  check(commit.parents.length===2 && commit.parents[1]===ref.source_commit,'INTEGRATION_PARENTS','Интеграция требует двух точных родителей.');
  check(one(commit,'Workflow-Transaction')===ref.operation_id && one(commit,'Workflow-Source')===ref.source_commit,
    'INTEGRATION_TRAILERS','Интеграция не совпадает с источником/операцией.');
  const source=inspectIntegrationSource(root,ref.source_commit,task,plan.scope_id,resolveReferences);
  check(isAncestor(root,source.assignment.base_commit,commit.parents[0]),'INTEGRATION_BASE','База не предшествует main.');
  const changed=git(root,['diff','--name-only','--no-renames','-z',commit.parents[0],commit.sha,'--']).stdout.split('\0').filter(Boolean);
  check(changed.includes(PLAN) && changed.every(p=>allowedFiles(task).includes(p)),'INTEGRATION_SCOPE','Merge содержит чужие файлы.');
  const after=planAt(root,commit.sha);
  const expected=integrationPlan(before,task.id,ref.operation_id,ref.source_commit,changed.filter(p=>p!==PLAN));
  check(renderPlan(after)===renderPlan(expected),'INTEGRATION_PLAN','Merge изменил общий план вне своей задачи.');
  return {sha:commit.sha,parent:commit.parents[0],paths:changed,source_commit:ref.source_commit,integration_commit:commit.sha};
}
export function integrationPlan(before,taskId,id,source,actual) {
  const plan=structuredClone(before), task=plan.tasks.find(t=>t.id===taskId);
  check(task?.commit_status==='PENDING' && plan.current_task_id===null,'INTEGRATION_TASK','Родительская задача уже выполняется или завершена.');
  task.implementation_status='DONE';task.commit_status='DONE';task.actual_files=actual.slice().sort();
  task.commit_ref={scope_id:plan.scope_id,task_id:task.id,role:'integration',operation_id:id,source_commit:source};
  plan.plan_revision++;plan.delivery_status=plan.tasks.every(t=>t.commit_status==='DONE')?'READY_FOR_ACCEPTANCE':'IN_PROGRESS';
  return plan;
}
