import fs from 'node:fs';
import path from 'node:path';
import {PLAN,check,json,atomic,readJSON,safePath,contextPath,withLock} from './common.mjs';
import {git,head,localPath,allChanges,paths,ensureIdleGit} from './git.mjs';
import {readPlan,parsePlan,renderPlan} from './plan.mjs';
import {commitCandidate,checkServicePaths,completedTransaction,finishTransaction} from './transaction.mjs';
import {validate,journal} from './validate.mjs';
import {readAssignment,createAssignment,setupAssignment,assignmentStatus} from './task-assignment.mjs';
import {adoptTaskFiles,selectTaskFiles} from './task-files.mjs';

const file = root => localPath(root,'task-handoff.json');
const save = (root,record) => atomic(file(root),json(record),0o600);
const failpoint = stage => check(process.env.WORKFLOW_TEST_FAILPOINT!==stage,'TEST_INTERRUPTION','Прерывание восстановления: '+stage);
export function assertHandoffCommand(root,command) {
  const record=fs.existsSync(file(root))?readJSON(file(root)):null;
  check(!record || record.phase==='DONE' || ['status','validate','recover','plan:view','assignment:handoff','assignment:status','integration:status','hook','git-hook'].includes(command),
    'HANDOFF_PENDING','Сначала продолжите assignment:handoff с тем же ID; сохранённые файлы не удаляйте.');
}
function image(root,name) {
  const target=safePath(root,name), stat=fs.lstatSync(target,{throwIfNoEntry:false});
  check(!stat || stat.isFile(),'HANDOFF_FILE','Переносит только обычные файлы: '+name);
  if(!stat)return null;
  check(stat.size<=16*1024*1024,'HANDOFF_FILE','Слишком большой файл для безопасного переноса: '+name);
  return {mode:stat.mode&0o777,data:fs.readFileSync(target).toString('base64')};
}
const equal = (a,b) => json(a)===json(b);
function baseImage(root,sha,name) {
  const entry=git(root,['ls-tree','-z',sha,'--',name]).stdout;
  if(!entry)return null;
  check(/^100[0-7]{3} blob /.test(entry),'HANDOFF_FILE','База содержит неподдерживаемый тип: '+name);
  const [mode,,oid]=entry.slice(0,entry.indexOf('\t')).split(' ');
  return {mode:mode==='100755'?0o755:0o644,data:git(root,['cat-file','blob',oid],{encoding:null}).stdout.toString('base64')};
}
function put(root,name,value) {
  const target=safePath(root,name);
  if(value)atomic(target,Buffer.from(value.data,'base64'),value.mode);
  else if(fs.existsSync(target))fs.unlinkSync(target); // Only after verified durable backup and exact image comparison.
}
function initialRecord(root,input,revision) {
  const target=path.resolve(input.worktree);
  check(target!==root&&!target.startsWith(root+path.sep)&&!root.startsWith(target+path.sep),'ASSIGNMENT_PATH','Worktree должен быть вне основной папки.');
  let current=path.parse(target).root;
  for(const part of path.relative(current,target).split(path.sep).filter(Boolean)) {
    current=path.join(current,part);
    check(!fs.lstatSync(current,{throwIfNoEntry:false})?.isSymbolicLink(),'SYMLINK_PATH','Перенос не следует по symlink.');
  }
  check(!fs.existsSync(target)&&fs.statSync(path.dirname(target),{throwIfNoEntry:false})?.isDirectory(),'ASSIGNMENT_PATH','Нужны свободный путь и существующая родительская папка.');
  check(git(root,['show-ref','--verify','--quiet','refs/heads/workflow/'+input.id],{allowFailure:true}).status!==0,'ASSIGNMENT_BRANCH','Ветка назначения уже занята.');
  check(git(root,['branch','--show-current']).stdout.trim()==='main','HANDOFF_BASE','Перенос разрешён только из main.');
  const assignments=localPath(root,'assignments');
  for(const name of fs.existsSync(assignments)?fs.readdirSync(assignments):[])if(name.endsWith('.json'))
    check(readJSON(path.join(assignments,name)).phase==='INTEGRATED','HANDOFF_ASSIGNMENTS','Сначала разберите существующее незавершённое назначение.');
  const {plan}=validate(root), before=head(root);
  check(plan.plan_revision===Number(revision),'REVISION_CHANGED','Нужна текущая revision для переноса.');
  check(plan.execution_strategy==='parallel'&&!plan.assignment&&plan.current_task_id===input.task_id,'HANDOFF_POLICY','Нужна ошибочно начатая задача основного parallel-плана.');
  const committedText=git(root,['show',before+':'+PLAN]).stdout, committed=parsePlan(committedText);
  let text=committedText, resetRequired=false;
  if(committed.current_task_id) {
    // Updating 1.7.0 may have persisted its legacy task:start. Only that exact
    // managed upgrade may be undone, with a new service commit (never reset HEAD).
    check(git(root,['show','-s','--format=%B',before]).stdout.includes('Workflow-Role: kit-update\n'),
      'HANDOFF_BASE','Активный план в HEAD не подтверждён обновлением Kit.');
    checkServicePaths('kit-update',git(root,['diff-tree','--no-commit-id','--name-only','-r',before]).stdout.trim().split('\n').filter(Boolean));
    text=git(root,['show',before+'^:'+PLAN]).stdout;
    check(equal(committed,plan),'HANDOFF_PLAN_CHANGED','После обновления изменён активный план.');
    resetRequired=true;
  }
  const published=parsePlan(text), expected=structuredClone(published);
  check(published.execution_strategy==='parallel'&&published.scope_id===plan.scope_id&&!published.current_task_id&&input.base_commit===before,
    'HANDOFF_BASE','Нужен точный опубликованный план без активной задачи.');
  const task=expected.tasks.find(t=>t.id===input.task_id);
  check(task?.implementation_status==='TODO','HANDOFF_TASK','В опубликованном плане задача должна ожидать.');
  task.implementation_status='IN_PROGRESS';expected.current_task_id=task.id;expected.plan_revision++;
  check(equal(plan,expected),'HANDOFF_PLAN_CHANGED','План изменён сверх прежнего task:start; автоматический перенос остановлен.');
  if(resetRequired) {published.plan_revision=plan.plan_revision+1;text=renderPlan(published);}
  check(!paths(root,'staged').length,'HANDOFF_STAGED','В index есть изменения; сохраните и разберите их перед переносом.');
  const selected=selectTaskFiles(root,structuredClone(plan),structuredClone(task));
  check(!selected.excluded.length,'HANDOFF_FOREIGN','Есть прежние или чужие правки; перенос остановлен без изменения файлов.',{paths:selected.excluded});
  const allowed=new Set([...task.functional_paths,...task.documentation_paths]);
  check(selected.selected.every(p=>allowed.has(p)),'HANDOFF_SCOPE','Файлы выходят за назначенную задачу; нужен разбор состава.');
  const files=selected.selected.map(name=>{contextPath(root,name);return {name,work:image(root,name),base:baseImage(root,before,name)};});
  return {schema_version:1,phase:'SAVED',input:{...input},scope:plan.scope_id,base:before,planText:text,
    activePlanText:fs.readFileSync(safePath(root,PLAN),'utf8'),resetRequired,files};
}
// A narrow migration for the legacy bug: the only permitted plan change is task:start.
// Every byte is backed up before touching main. An interruption resumes the same
// assignment; unknown/foreign edits stop recovery without cleaning them up.
export function handoffParallelTask(root,input,revision) {
  check(!readAssignment(root),'ASSIGNMENT_NESTED','Перенос выполняется из основного checkout.');
  check(input&&typeof input.id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(input.id)
    &&typeof input.task_id==='string'&&typeof input.worktree==='string'&&path.isAbsolute(input.worktree),'HANDOFF_INPUT','Нужны id, task_id, абсолютный worktree и base_commit.');
  let record;
  withLock(localPath(root,'operation.lock'),()=>{
    ensureIdleGit(root);
    const previous=fs.existsSync(file(root))?readJSON(file(root)):null;
    if(previous&&(previous.phase!=='DONE'||previous.input.id===input.id)) {
      check(equal(previous.input,input),'HANDOFF_REUSE','Незавершённый перенос принадлежит другому назначению.');record=previous;
    } else {check(!journal(root),'TRANSACTION_PENDING','Сначала завершите commit/repair.');record=initialRecord(root,input,revision);save(root,record);}
    if(record.phase==='DONE')return;
    const pending=journal(root), message='chore: восстановить назначение '+record.input.id;
    check(!pending||(record.phase==='RESETTING'&&pending.role==='plan-adjustment'&&pending.message===message
      &&pending.before_head===record.base&&pending.candidate_plan===record.planText),
      'TRANSACTION_PENDING','Сначала завершите другую транзакцию commit/repair.');
    if(record.phase==='RESETTING'&&head(root)!==record.base) {
      const changed=head(root);
      check(git(root,['show','-s','--format=%P',changed]).stdout.trim()===record.base
        &&git(root,['show',changed+':'+PLAN]).stdout===record.planText
        &&git(root,['show','-s','--format=%B',changed]).stdout.startsWith(message+'\n\nWorkflow-Scope: '+record.scope+'\nWorkflow-Task: ')
        &&git(root,['show','-s','--format=%B',changed]).stdout.includes('\nWorkflow-Role: plan-adjustment\n')
        &&git(root,['diff-tree','--no-commit-id','--name-only','-r',changed]).stdout.trim()===PLAN,
        'HANDOFF_CONCURRENT','HEAD изменён другой операцией во время восстановления.');
      if(pending) {check(completedTransaction(root,pending)===changed,'HANDOFF_CONCURRENT','Не подтверждён коммит восстановления.');finishTransaction(root,pending,changed);}
      record.base=changed;record.resetRequired=false;record.phase='RESTORED';save(root,record);
    }
    check(head(root)===record.base&&paths(root,'staged').every(p=>pending&&p===PLAN),'HANDOFF_CONCURRENT','HEAD или index изменился во время переноса.');
    const names=new Set([PLAN,...record.files.map(f=>f.name)]);
    check(allChanges(root).every(p=>names.has(p)),'HANDOFF_FOREIGN','Появились чужие правки; они сохранены, перенос остановлен.');
    const current=fs.readFileSync(safePath(root,PLAN),'utf8');
    check(current===record.activePlanText||current===record.planText,'HANDOFF_CONCURRENT','План изменился во время переноса.');
    // Preflight every file before the first write; tolerate only our recorded partial restore.
    for(const item of record.files)check(equal(image(root,item.name),item.work)||equal(image(root,item.name),item.base),
      'HANDOFF_CONCURRENT','Файл изменился после сохранения: '+item.name);
    for(const item of record.files) {put(root,item.name,item.base);failpoint('handoff-file-restored');}
    atomic(safePath(root,PLAN),record.planText);
    if(record.resetRequired) {
      record.phase='RESETTING';save(root,record);
      const result=commitCandidate(root,{plan:parsePlan(record.planText),role:'plan-adjustment',selected:[PLAN],message,beforeHead:record.base});
      failpoint('handoff-reset-committed');
      record.base=result.sha;record.resetRequired=false;
    }
    record.phase='RESTORED';save(root,record);failpoint('handoff-restored');
  });
  if(record.phase==='DONE')return {...assignmentStatus(root,input.id),handoff:true};
  const parent=readPlan(root);
  let assignment=createAssignment(root,{...input,base_commit:record.base},parent.plan_revision);
  if(assignment.status==='NEEDS_SETUP')assignment=setupAssignment(root,input.id,{npmCi:true});
  check(assignment.status==='READY','HANDOFF_ASSIGNMENT','Назначение не готово к переносу.');
  withLock(localPath(root,'operation.lock'),()=>withLock(localPath(input.worktree,'operation.lock'),()=>{
    check(head(root)===record.base&&!allChanges(root).length,'HANDOFF_CONCURRENT','Основной checkout изменился до переноса в назначение.');
    const child=readPlan(input.worktree), task=child.tasks[0], names=new Set(record.files.map(f=>f.name));
    check(!child.current_task_id&&!journal(input.worktree)&&allChanges(input.worktree).every(p=>names.has(p)),
      'HANDOFF_CHILD_CHANGED','В назначении появилась другая работа; сохранённые файлы остаются в журнале.');
    for(const item of record.files)check(equal(image(input.worktree,item.name),item.base)||equal(image(input.worktree,item.name),item.work),
      'HANDOFF_CHILD_CHANGED','Файл назначения изменился: '+item.name);
    for(const item of record.files) {put(input.worktree,item.name,item.work);failpoint('handoff-file-copied');}
    adoptTaskFiles(input.worktree,child,task,[...names]);
    failpoint('handoff-copied');
    record.phase='DONE';save(root,record);
  }));
  return {...assignmentStatus(root,input.id),handoff:true};
}
