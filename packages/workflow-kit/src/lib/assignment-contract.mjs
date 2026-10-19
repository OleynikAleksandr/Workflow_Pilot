import fs from 'node:fs';
import path from 'node:path';
import { PLAN, CONFIG, check, hash, json, atomic, readJSON, safePath } from './common.mjs';
import { git, head, repoRoot, localPath, isAncestor } from './git.mjs';
import { parsePlan, isDeliveryTask } from './plan.mjs';
import { taskChecks } from './validation-rules.mjs';
export const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
export const commonDirectory = root => fs.realpathSync(git(root, ['rev-parse','--path-format=absolute','--git-common-dir']).stdout.trim());
export const recordPath = (root, id) => { check(validId(id),'ASSIGNMENT_ID','Нужен устойчивый ID назначения.'); return localPath(root,'assignments/'+id+'.json'); };
export const childRecordPath = root => localPath(root,'assignment.json');
export const readAssignment = root => fs.existsSync(childRecordPath(root)) ? readJSON(childRecordPath(root)) : null;
export const save = (file, record) => atomic(file, json(record), 0o600);
export function assignmentRecords(root) {
  const dir = localPath(root,'assignments');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith('.json')).map(file => readJSON(path.join(dir,file))) : [];
}
export const unfinishedAssignments = (root, scopeId) => assignmentRecords(root).filter(r => r.parent_scope_id === scopeId && r.phase !== 'INTEGRATED');
// In an orchestrated plan only the orchestrator writes main, and only for delivery after all other work.
export function assertOrchestratedMain(root, plan, task) {
  check(isDeliveryTask(task), 'ORCHESTRATED_MAIN_READ_ONLY',
    'Обычные задачи и DOCS плана оркестратора выполняют исполнители в своих worktree; task:start в main допустим только для delivery-задачи.',{task_id:task.id});
  check(plan.tasks.filter(t => !isDeliveryTask(t)).every(t => t.commit_status === 'DONE'), 'DELIVERY_NOT_READY',
    'Delivery начинается после интеграции всех обычных задач и DOCS.',{task_id:task.id});
  check(!unfinishedAssignments(root, plan.scope_id).length, 'DELIVERY_NOT_READY', 'Есть незавершённые назначения исполнителей.',{task_id:task.id});
}
export function plainPath(target) {
  check(typeof target==='string' && path.isAbsolute(target),'ASSIGNMENT_PATH','Нужен абсолютный путь worktree.');
  let current = path.parse(target).root;
  for (const part of path.relative(current,target).split(path.sep).filter(Boolean)) {
    current = path.join(current,part);
    const stat = fs.lstatSync(current,{throwIfNoEntry:false});
    check(!stat?.isSymbolicLink(),'SYMLINK_PATH','Назначение не следует по symlink: '+current);
  }
  return path.resolve(target);
}
export function binding(record) {
  return {id:record.id,parent_scope_id:record.parent_scope_id,parent_task_id:record.parent_task_id,
    parent_root:record.parent_root,worktree:record.worktree,branch:record.branch,base_commit:record.base_commit,
    external_dependencies:record.external_dependencies,
    ...(record.dialogue_version ? {dialogue_version:record.dialogue_version} : {})};
}
export function basePlan(root, record) {
  return parsePlan(git(root,['show',record.base_commit+':'+PLAN]).stdout);
}
export function localPlan(root, record) {
  const parent = basePlan(root,record), source = parent.tasks.find(t=>t.id===record.parent_task_id);
  check(parent.scope_id===record.parent_scope_id && source,'ASSIGNMENT_BASE','Задача отсутствует в подтверждённой базе.');
  const scope = 'assignment-'+record.id;
  const task = {...structuredClone(source),dependencies:[],parallel_safe:false,
    implementation_status:'TODO',commit_status:'PENDING',commit_ref:{scope_id:scope,task_id:source.id,role:'implementation'}};
  if(record.dialogue_version)task.commit_ref.iteration=record.attempt??1;
  if(task.context_pack)task.context_pack.dependency_task_ids=[];
  delete task.actual_files;
  return {schema_version:1,plan_revision:1,project_id:parent.project_id,project_name:parent.project_name,
    scope_id:scope,execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',objective:source.title,
    acceptance_criteria:[...source.acceptance_criteria],approved_scope:{functional_paths:[...source.functional_paths],documentation_paths:[...source.documentation_paths]},
    baseline_commit:record.base_commit,current_task_id:null,
    context_pack:{...structuredClone(parent.context_pack),dependency_task_ids:[],include_last_completed_task:false},
    tasks:[task],blocked_reason:null,user_decisions:[],parallel_allowed:false,max_workers:1,
    execution_strategy:'sequential',execution_reason:'Одна порученная микрозадача; результат ждёт интеграции.',
    assignment:binding(record),...(record.dialogue_version?{dialogue_version:record.dialogue_version}:{})};
}
export function immutableContract(plan) {
  const p=structuredClone(plan);
  for(const key of ['plan_revision','current_task_id','delivery_status'])delete p[key];
  for(const task of p.tasks)for(const key of ['implementation_status','commit_status','actual_files'])delete task[key];
  // A commit that deletes a required document pins its revision; the pin is not a contract change.
  for(const pack of [p.context_pack,...p.tasks.map(task=>task.context_pack)])for(const doc of pack?.documents??[])delete doc.revision;
  return json(p);
}
export function ownWorktree(root, record) {
  plainPath(record.worktree);
  check(fs.realpathSync(root)===record.worktree && repoRoot(root)===record.worktree
    && commonDirectory(root)===record.git_common_dir
    && git(root,['branch','--show-current']).stdout.trim()===record.branch
    && isAncestor(root,record.base_commit,head(root)), 'ASSIGNMENT_OWNER','Назначение, cwd, Git или ветка не совпадают.');
}
export function assertAssignment(root, plan, {ready=false,role,files}={}) {
  const record=readAssignment(root);
  check(record || !plan.assignment,'ASSIGNMENT_MISSING','У локального плана нет журнала назначения.');
  if(!record)return null;
  ownWorktree(root,record);
  check(immutableContract(plan)===immutableContract(localPlan(root,record)), 'ASSIGNMENT_CONTRACT',
    'Исполнитель не меняет область, зависимости, проверки или состав назначенного плана.');
  check(hash(fs.readFileSync(safePath(root,CONFIG)))===record.config_digest,'ASSIGNMENT_CONFIG','Конфигурация проверок назначения изменена.');
  if(role)check(['assignment-plan','implementation','repair'].includes(role),'ASSIGNMENT_READ_ONLY','Исполнитель не создаёт и не расширяет планы.');
  if(files) {
    const allowed=[PLAN,...plan.tasks[0].functional_paths,...plan.tasks[0].documentation_paths];
    check(files.every(file=>allowed.includes(file)),'ASSIGNMENT_SCOPE','Изменения выходят за назначенную область.');
  }
  if(ready) {
    const setup=environmentStatus(root,record);
    check(setup.ready,'NEEDS_SETUP','Сначала подготовьте окружение назначения.',setup);
  }
  return record;
}
export function assertAssignmentCommand(root, command) {
  if(!readAssignment(root))return;
  check(['status','validate','recover','plan:view','task:start','commit','repair','hook','hook:ack','git-hook','assignment:status','assignment:dialogue','assignment:dialogue-status','task:block'].includes(command),
    'ASSIGNMENT_READ_ONLY','Исполнитель выполняет назначение; изменение плана, вложенные назначения и публикация запрещены.');
}
export function packageDirectories(root, record) {
  const config=readJSON(safePath(root,CONFIG)), plan=localPlan(root,record);
  const checks=taskChecks(plan.tasks[0],config), dirs=new Set();
  for(const item of checks) {
    const cwd=!item.cwd || item.cwd==='.' ? root : safePath(root,item.cwd);
    check(fs.statSync(cwd,{throwIfNoEntry:false})?.isDirectory(),'NEEDS_SETUP','Отсутствует cwd проверки: '+(item.cwd??'.'));
    let current=cwd;
    while(current===root || current.startsWith(root+path.sep)) {
      if(fs.existsSync(path.join(current,'package.json')))dirs.add(current);
      if(current===root)break;
      current=path.dirname(current);
    }
  }
  return [...dirs].filter(dir=>{
    const p=readJSON(safePath(root,path.relative(root,path.join(dir,'package.json')).split(path.sep).join('/')));
    return Object.keys({...p.dependencies,...p.devDependencies,...p.optionalDependencies}).length>0;
  });
}
export function environmentStatus(root, record=readAssignment(root)) {
  check(record,'ASSIGNMENT_MISSING','Нет назначения.');
  const needs=[];
  let directories;
  try {directories=packageDirectories(root,record);}catch(error) {if(error.code==='NEEDS_SETUP')return {ready:false,needs:[error.message]};throw error;}
  for(const dir of directories) {
    const relative=file=>path.relative(root,path.join(dir,file)).split(path.sep).join('/');
    const lock=safePath(root,relative('package-lock.json')), modules=safePath(root,relative('node_modules'));
    if(!fs.existsSync(lock)) {needs.push({directory:dir,reason:'package-lock.json required for npm ci'});continue;}
    const receipt=record.setup?.[dir], digest=hash(fs.readFileSync(lock));
    if(!fs.statSync(modules,{throwIfNoEntry:false})?.isDirectory() || receipt?.lock_digest!==digest || receipt?.status!=='PASSED')
      needs.push({directory:dir,reason:'Explicit npm ci in this worktree required'});
  }
  for(const step of preparationSteps(root,record))if(record.preparation?.[step.key]!==step.digest)
    needs.push({directory:step.cwd,reason:'Run standard '+step.script+' before issuing the task'});
  return {ready:needs.length===0,needs};
}
export function preparationSteps(root,record) {
  const config=readJSON(safePath(root,CONFIG)), steps=[];
  for(const test of taskChecks(localPlan(root,record).tasks[0],config)) {
    if(!/^npm(?:\.cmd)?$/.test(path.basename(test.executable)))continue;
    let relative=test.cwd??'.';
    const prefix=test.args.indexOf('--prefix');
    if(prefix>=0)relative=path.posix.join(relative,test.args[prefix+1]??'');
    const cwd=relative==='.'?root:safePath(root,relative);
    const file=path.join(cwd,'package.json');
    if(!fs.existsSync(file))continue;
    const name=test.args[0]==='run'?test.args[1]:test.args[0];
    const script='pre'+name, content=readJSON(file).scripts?.[script];
    if(!content)continue;
    const key=path.relative(root,cwd)+':'+script;
    if(!steps.some(step=>step.key===key))steps.push({key,cwd,script,digest:hash(content)});
  }
  return steps;
}
