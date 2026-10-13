import fs from 'node:fs';
import path from 'node:path';
import { PLAN, CONFIG, check, hash, json, atomic, readJSON, safePath, withLock } from './common.mjs';
import { git, head, repoRoot, localPath, allChanges, isAncestor, run, ensureIdleGit } from './git.mjs';
import { readPlan, parsePlan, renderPlan, parallelTasksCompatible } from './plan.mjs';
import { validate, taskChecks, journal } from './validate.mjs';
import { commitCandidate, completedTransaction, finishTransaction } from './transaction.mjs';
import { prepareRuntime } from './platform.mjs';

const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const commonDirectory = root => fs.realpathSync(git(root, ['rev-parse','--path-format=absolute','--git-common-dir']).stdout.trim());
const recordPath = (root, id) => { check(validId(id),'ASSIGNMENT_ID','Нужен устойчивый ID назначения.'); return localPath(root,'assignments/'+id+'.json'); };
const childRecordPath = root => localPath(root,'assignment.json');
export const readAssignment = root => fs.existsSync(childRecordPath(root)) ? readJSON(childRecordPath(root)) : null;
const save = (file, record) => atomic(file, json(record), 0o600);
function plainPath(target) {
  check(typeof target==='string' && path.isAbsolute(target),'ASSIGNMENT_PATH','Нужен абсолютный путь worktree.');
  let current = path.parse(target).root;
  for (const part of path.relative(current,target).split(path.sep).filter(Boolean)) {
    current = path.join(current,part);
    const stat = fs.lstatSync(current,{throwIfNoEntry:false});
    check(!stat?.isSymbolicLink(),'SYMLINK_PATH','Назначение не следует по symlink: '+current);
  }
  return path.resolve(target);
}
function binding(record) {
  return {id:record.id,parent_scope_id:record.parent_scope_id,parent_task_id:record.parent_task_id,
    parent_root:record.parent_root,worktree:record.worktree,branch:record.branch,base_commit:record.base_commit,
    external_dependencies:record.external_dependencies};
}
function basePlan(root, record) {
  return parsePlan(git(root,['show',record.base_commit+':'+PLAN]).stdout);
}
function localPlan(root, record) {
  const parent = basePlan(root,record), source = parent.tasks.find(t=>t.id===record.parent_task_id);
  check(parent.scope_id===record.parent_scope_id && source,'ASSIGNMENT_BASE','Задача отсутствует в подтверждённой базе.');
  const scope = 'assignment-'+record.id;
  const task = {...structuredClone(source),dependencies:[],parallel_safe:false,
    implementation_status:'TODO',commit_status:'PENDING',commit_ref:{scope_id:scope,task_id:source.id,role:'implementation'}};
  if(task.context_pack)task.context_pack.dependency_task_ids=[];
  delete task.actual_files;
  return {schema_version:1,plan_revision:1,project_id:parent.project_id,project_name:parent.project_name,
    scope_id:scope,execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',objective:source.title,
    acceptance_criteria:[...source.acceptance_criteria],approved_scope:{functional_paths:[...source.functional_paths],documentation_paths:[...source.documentation_paths]},
    baseline_commit:record.base_commit,current_task_id:null,
    context_pack:{...structuredClone(parent.context_pack),dependency_task_ids:[],include_last_completed_task:false},
    tasks:[task],blocked_reason:null,user_decisions:[],parallel_allowed:false,max_workers:1,
    execution_strategy:'sequential',execution_reason:'Одна порученная микрозадача; результат ждёт интеграции.',
    assignment:binding(record)};
}
function immutableContract(plan) {
  const p=structuredClone(plan);
  for(const key of ['plan_revision','current_task_id','delivery_status'])delete p[key];
  for(const task of p.tasks)for(const key of ['implementation_status','commit_status','actual_files'])delete task[key];
  return json(p);
}
function ownWorktree(root, record) {
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
  check(['status','validate','recover','plan:view','task:start','commit','repair','hook','hook:ack','git-hook','assignment:status'].includes(command),
    'ASSIGNMENT_READ_ONLY','Исполнитель выполняет назначение; изменение плана, вложенные назначения и публикация запрещены.');
}
function packageDirectories(root, record) {
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
function preparationSteps(root,record) {
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
function npm(root,args,options) {
  if(process.platform!=='win32')return run('npm',args,root,options);
  const search=[path.dirname(process.execPath),...(process.env.Path??process.env.PATH??'').split(path.delimiter)];
  const cli=search.map(dir=>path.join(dir,'node_modules/npm/bin/npm-cli.js')).find(file=>fs.existsSync(file));
  check(cli,'NEEDS_SETUP','Установите npm рядом с доступным Node.js; npm.cmd не запускается через shell.');
  return run(process.execPath,[cli,...args],root,options);
}
function parentAssignments(root) {
  const dir=localPath(root,'assignments');
  return fs.existsSync(dir)?fs.readdirSync(dir).filter(file=>file.endsWith('.json')).map(file=>readJSON(path.join(dir,file))):[];
}
function verifyInput(record,input) {
  check(record.parent_task_id===input.task_id && record.worktree===path.resolve(input.worktree)
    && record.base_commit===input.base_commit,'ASSIGNMENT_REUSE','ID уже принадлежит другому назначению.');
}
function assignmentStatusUnlocked(root,id) {
  const child=readAssignment(root);
  const record=child ?? readJSON(recordPath(root,id));
  if(!fs.existsSync(record.worktree))return {ok:true,...binding(record),status:record.phase};
  ownWorktree(record.worktree,record);
  const plan=readPlan(record.worktree);
  if(!plan.assignment)return {ok:true,...binding(record),status:'PREPARING'};
  const runtime=readAssignment(record.worktree);
  assertAssignment(record.worktree,plan);
  const {resolved}=validate(record.worktree);
  const sha=resolved[record.parent_task_id]?.sha;
  const setup=environmentStatus(record.worktree,runtime);
  return {ok:true,...binding(record),status:sha?'READY_FOR_INTEGRATION':!setup.ready?'NEEDS_SETUP':plan.current_task_id?'RUNNING':'READY',
    source_commit:sha??null,setup,transaction_pending:!!journal(record.worktree)};
}
export const assignmentStatus=(root,id)=>assignmentStatusUnlocked(root,id);
export function createAssignment(root,input,expectedRevision) {
  check(!readAssignment(root),'ASSIGNMENT_NESTED','Вложенные назначения запрещены.');
  root=fs.realpathSync(root);
  check(input && validId(input.id) && typeof input.task_id==='string','ASSIGNMENT_ID','Нужны id и task_id.');
  const target=plainPath(input.worktree), file=recordPath(root,input.id);
  return withLock(localPath(root,'operation.lock'),()=>{
    if(fs.existsSync(file)) {
      const record=readJSON(file);verifyInput(record,input);
      return resumeAssignment(root,record);
    }
    const {plan,resolved}=validate(root);
    check(expectedRevision!==undefined && plan.plan_revision===Number(expectedRevision),'REVISION_CHANGED','Нужна текущая revision.');
    check(plan.execution_strategy==='parallel' && !plan.current_task_id && plan.execution_scope_status==='ACTIVE','ASSIGNMENT_POLICY','Назначения выдаются из активного parallel-плана без основной микрозадачи.');
    ensureIdleGit(root);
    check(!journal(root) && !allChanges(root).length,'ASSIGNMENT_DIRTY','Перед выдачей main должен быть чистым, без транзакции.');
    check(git(root,['branch','--show-current']).stdout.trim()==='main' && input.base_commit===head(root),'ASSIGNMENT_BASE','База — подтверждённый текущий SHA main.');
    const task=plan.tasks.find(t=>t.id===input.task_id);
    check(task?.implementation_status==='TODO','ASSIGNMENT_TASK','Назначается только ожидающая задача.');
    const dependencies=task.dependencies.map(id=>{
      const dep=plan.tasks.find(t=>t.id===id), sha=resolved[id]?.sha;
      check(dep?.commit_status==='DONE' && sha && isAncestor(root,sha,input.base_commit),'DEPENDENCY_PENDING','Зависимость не интегрирована: '+id);
      return {task_id:id,commit:sha};
    });
    const active=parentAssignments(root).filter(r=>r.parent_scope_id===plan.scope_id && r.phase!=='INTEGRATED');
    check(!active.some(r=>r.parent_task_id===task.id),'ASSIGNMENT_EXISTS','У задачи уже есть назначение; восстановите его по ID.');
    const running=active.filter(r=>assignmentStatusUnlocked(root,r.id).status!=='READY_FOR_INTEGRATION');
    check(running.length<plan.max_workers && active.every(r=>parallelTasksCompatible(task,plan.tasks.find(t=>t.id===r.parent_task_id))),
      'ASSIGNMENT_CAPACITY','Лимит или область изменений не допускают одновременный запуск.');
    check(target!==root && !target.startsWith(root+path.sep) && !root.startsWith(target+path.sep),'ASSIGNMENT_PATH','Worktree должен находиться вне основной рабочей папки.');
    check(!fs.existsSync(target) && fs.statSync(path.dirname(target),{throwIfNoEntry:false})?.isDirectory(),'ASSIGNMENT_PATH','Нужны свободный путь и существующий родительский каталог.');
    const branch='workflow/'+input.id;
    check(git(root,['show-ref','--verify','--quiet','refs/heads/'+branch],{allowFailure:true}).status!==0,'ASSIGNMENT_BRANCH','Ветка уже занята.');
    const record={schema_version:1,id:input.id,parent_root:root,parent_scope_id:plan.scope_id,parent_task_id:task.id,
      worktree:target,branch,base_commit:input.base_commit,git_common_dir:commonDirectory(root),external_dependencies:dependencies,
      config_digest:hash(fs.readFileSync(safePath(root,CONFIG))),phase:'PREPARED',setup:{}};
    save(file,record);
    return resumeAssignment(root,record);
  });
}
function resumeAssignment(root,record) {
  const file=recordPath(root,record.id), child=record.worktree;
  if(!fs.existsSync(child)) {
    check(!fs.existsSync(childRecordPath(root)) && head(root)===record.base_commit,'ASSIGNMENT_BASE','main изменился до создания worktree.');
    const ref=git(root,['rev-parse','--verify','refs/heads/'+record.branch],{allowFailure:true});
    if(ref.status===0) {
      check(record.phase==='CREATING' && ref.stdout.trim()===record.base_commit,'ASSIGNMENT_BRANCH','Существующая ветка не подтверждена журналом.');
      git(root,['worktree','add','--',child,record.branch]);
    } else {
      record.phase='CREATING';save(file,record);
      git(root,['worktree','add','-b',record.branch,'--',child,record.base_commit]);
    }
  }
  ownWorktree(child,record);
  return withLock(localPath(child,'operation.lock'),()=>{
    const existing=readAssignment(child);
    if(existing)check(json(binding(existing))===json(binding(record)),'ASSIGNMENT_OWNER','Worktree принадлежит другому назначению.');
    else {check(head(child)===record.base_commit && !allChanges(child).length,'ASSIGNMENT_DIRTY','Созданное дерево изменено вне выдачи.');save(childRecordPath(child),record);}
    prepareRuntime(child);
    if(process.env.WORKFLOW_TEST_FAILPOINT==='assignment-worktree')check(false,'TEST_INTERRUPTION','Прерывание после создания дерева.');
    const pending=journal(child);
    if(pending) {
      check(pending.role==='assignment-plan','TRANSACTION_PENDING','Назначение уже выполняется; завершите текущую транзакцию в его worktree.');
      const completed=completedTransaction(child,pending);
      if(completed)finishTransaction(child,pending,completed);
    }
    if(!readPlan(child).assignment || journal(child)) {
      check(head(child)===record.base_commit,'ASSIGNMENT_BASE','HEAD изменился до фиксации локального плана.');
      const plan=localPlan(child,record);
      commitCandidate(child,{plan,role:'assignment-plan',selected:[PLAN],message:'chore: назначить '+record.parent_task_id,beforeHead:record.base_commit});
    }
    record.phase='ASSIGNED';save(file,record);
    return assignmentStatusUnlocked(root,record.id);
  });
}
export function setupAssignment(root,id,{npmCi=false}={}) {
  check(!readAssignment(root),'ASSIGNMENT_NESTED','Подготовкой управляет основная сессия.');
  return withLock(localPath(root,'operation.lock'),()=>{
    const record=readJSON(recordPath(root,id)), child=record.worktree;
    ownWorktree(child,record);
    return withLock(localPath(child,'operation.lock'),()=>{
      const local=readAssignment(child), plan=readPlan(child);
      assertAssignment(child,plan);
      check(!plan.current_task_id && !journal(child),'TASK_ACTIVE','Окружение готовится до запуска исполнителя.');
      if(npmCi)for(const dir of packageDirectories(child,local)) {
        const rel=file=>path.relative(child,path.join(dir,file)).split(path.sep).join('/');
        const lock=safePath(child,rel('package-lock.json'));
        check(fs.existsSync(lock),'NEEDS_SETUP','Для npm ci нужен package-lock.json.');
        safePath(child,rel('node_modules'));
        local.setup??={};local.setup[dir]={status:'RUNNING',lock_digest:hash(fs.readFileSync(lock))};save(childRecordPath(child),local);
        const result=npm(dir,['ci'],{allowFailure:true,timeout:600000});
        local.setup[dir].status=result.status===0?'PASSED':'FAILED';save(childRecordPath(child),local);
        check(result.status===0,'NEEDS_SETUP','npm ci завершился с ошибкой.',{output:String(result.stderr||result.stdout).slice(-2000)});
        check(hash(fs.readFileSync(lock))===local.setup[dir].lock_digest,'ASSIGNMENT_CONFIG','npm ci изменил lockfile.');
      }
      if(npmCi)for(const step of preparationSteps(child,local)) {
        const result=npm(step.cwd,['run',step.script],{allowFailure:true,timeout:600000});
        check(result.status===0,'NEEDS_SETUP','Не пройден штатный подготовительный скрипт '+step.script,
          {output:String(result.stderr||result.stdout).slice(-2000)});
        local.preparation??={};local.preparation[step.key]=step.digest;save(childRecordPath(child),local);
      }
      check(!allChanges(child).length,'ASSIGNMENT_DIRTY','Подготовка изменила отслеживаемые файлы; проверьте их до запуска.');
      return assignmentStatusUnlocked(root,id);
    });
  });
}

