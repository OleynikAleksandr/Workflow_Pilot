import fs from 'node:fs';
import path from 'node:path';
import { PLAN, CONFIG, check, hash, json, readJSON, safePath, withLock } from './common.mjs';
import { git, head, localPath, allChanges, isAncestor, run, ensureIdleGit } from './git.mjs';
import { readPlan, parallelTasksCompatible, isOrchestratedPlan, isDeliveryTask } from './plan.mjs';
import { validate, journal } from './validate.mjs';
import { commitCandidate, completedTransaction, finishTransaction } from './transaction.mjs';
import { prepareRuntime } from './platform.mjs';
import {assertPlanPermission} from './plan-permission.mjs';
import {migrationAttestation} from './dialogue-migration-state.mjs';
import {assertAssignmentCommandsIdle} from './assignment-command-safety.mjs';

import { assignmentRecords, validId, commonDirectory, recordPath, childRecordPath, readAssignment, save, plainPath, binding, localPlan, ownWorktree, assertAssignment, packageDirectories, environmentStatus, preparationSteps } from './assignment-contract.mjs';
export { readAssignment, assertAssignment, assertAssignmentCommand, environmentStatus } from './assignment-contract.mjs';
function npm(root,args,options) {
  if(process.platform!=='win32')return run('npm',args,root,options);
  const search=[path.dirname(process.execPath),...(process.env.Path??process.env.PATH??'').split(path.delimiter)];
  const cli=search.map(dir=>path.join(dir,'node_modules/npm/bin/npm-cli.js')).find(file=>fs.existsSync(file));
  check(cli,'NEEDS_SETUP','Установите npm рядом с доступным Node.js; npm.cmd не запускается через shell.');
  return run(process.execPath,[cli,...args],root,options);
}
const parentAssignments=root=>assignmentRecords(root);
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
  const dialogue=record.dialogue_version?readJSON(recordPath(record.parent_root,record.id)).dialogue??null:null;
  return {ok:true,...binding(record),status:sha?'READY_FOR_INTEGRATION':!setup.ready?'NEEDS_SETUP':plan.current_task_id?'RUNNING':'READY',
    source_commit:sha??null,setup,transaction_pending:!!journal(record.worktree),
    ...(record.dialogue_version?{dialogue,attempt:dialogue?.attempt??1}: {})};
}
export const assignmentStatus=(root,id)=>assignmentStatusUnlocked(root,id);
// Only a verified INTEGRATED worktree is removed, never with force; its merged branch goes with git branch -d.
export function removeIntegratedWorktree(root,record) {
  check(record.phase==='INTEGRATED','ASSIGNMENT_NOT_INTEGRATED','Удаляется только worktree подтверждённо интегрированного назначения.',{id:record.id});
  if(record.dialogue_version===1){
    const acceptance=record.dialogue?.acceptance,transport=record.dialogue?.transport;
    const pending=reason=>{
      record.cleanup={status:'PENDING',reason};save(recordPath(root,record.id),record);
      return {id:record.id,task_id:record.parent_task_id,worktree:record.worktree,branch:record.branch,...record.cleanup};
    };
    if(!acceptance||!transport||['message_id','attempt','source_commit'].some(k=>transport[k]!==acceptance[k]))
      return pending('terminal-receipt-pending');
    try{assertAssignmentCommandsIdle(record);}catch(error){
      if(error.code!=='ASSIGNMENT_COMMAND_ACTIVE')throw error;
      return pending('executor-command-active');
    }
  }
  const errors=[];
  let installerOnlyTip=null;
  if(record.migration){
    const attestation=migrationAttestation(root,record.migration.operation_id),entry=attestation.assignments.find(a=>a.id===record.id);
    const tip=git(root,['rev-parse','refs/heads/'+record.branch],{allowFailure:true});
    if(entry&&entry.source_commit===record.source_commit&&entry.before_head===record.source_commit
      &&tip.status===0&&tip.stdout.trim()===entry.upgrade_commit){
      installerOnlyTip=entry.upgrade_commit;
      git(root,['update-ref','refs/workflow-kit/dialogue-migrations/'+record.migration.operation_id+'/'+record.id,installerOnlyTip]);
    }
  }
  if(fs.existsSync(record.worktree)) {
    const removed=git(root,['worktree','remove','--',record.worktree],{allowFailure:true});
    if(removed.status!==0)errors.push(String(removed.stderr||removed.stdout).trim().slice(-1000));
  }
  if(!fs.existsSync(record.worktree)) {
    git(root,['worktree','prune'],{allowFailure:true});
    if(git(root,['show-ref','--verify','--quiet','refs/heads/'+record.branch],{allowFailure:true}).status===0) {
      const branch=git(root,['branch',installerOnlyTip?'-D':'-d',record.branch],{allowFailure:true});
      if(branch.status!==0)errors.push(String(branch.stderr||branch.stdout).trim().slice(-1000));
    }
  }
  record.cleanup=errors.length?{status:'PENDING',error:errors.join('\n')}:{status:'DONE',commands_idle:true};
  save(recordPath(root,record.id),record);
  return {id:record.id,task_id:record.parent_task_id,worktree:record.worktree,branch:record.branch,...record.cleanup};
}
// Backend-only acknowledgement of an existing acceptance, never a task/result
// authoring operation. Durable transport proof precedes worktree deletion.
export function acknowledgeAssignmentTransport(root,input) {
  check(!readAssignment(root),'ASSIGNMENT_READ_ONLY','Квитанцию транспорта сохраняет backend через main.');
  return withLock(localPath(root,'operation.lock'),()=>{
    assertPlanPermission(root);
    const record=readJSON(recordPath(root,input.assignment_id)),acceptance=record.dialogue?.acceptance;
    check(record.parent_scope_id===readPlan(root).scope_id&&record.phase==='INTEGRATED'&&record.dialogue_version===1
      &&acceptance&&['message_id','attempt','source_commit'].every(k=>input[k]===acceptance[k]),
      'ASSIGNMENT_TRANSPORT_STALE','Нужна завершающая квитанция текущей приёмки интегрированного назначения.');
    record.dialogue.transport={message_id:input.message_id,attempt:input.attempt,source_commit:input.source_commit};
    save(recordPath(root,record.id),record);
    if(record.cleanup?.status==='PENDING')removeIntegratedWorktree(root,record);
    return {ok:true,...record.dialogue.transport,cleanup:record.cleanup??null};
  });
}
// Final orchestrator sweep: integrated leftovers are removed, everything else is only reported.
export function cleanupAssignments(root) {
  check(!readAssignment(root),'ASSIGNMENT_READ_ONLY','Очистку выполняет оркестратор в main.');
  return withLock(localPath(root,'operation.lock'),()=>{
    const records=assignmentRecords(root);
    const removed=records.filter(r=>r.phase==='INTEGRATED' && r.cleanup?.status!=='DONE').map(r=>removeIntegratedWorktree(root,r));
    const kept=records.filter(r=>r.phase!=='INTEGRATED').map(r=>({id:r.id,task_id:r.parent_task_id,phase:r.phase,worktree:r.worktree,branch:r.branch}));
    const pending=removed.filter(r=>r.status!=='DONE');
    return {ok:true,removed:removed.filter(r=>r.status==='DONE'),pending,kept,
      only_main:!pending.length && !kept.length && records.every(r=>r.cleanup?.status==='DONE'||!fs.existsSync(r.worktree))};
  });
}
export function createAssignment(root,input,expectedRevision) {
  check(!readAssignment(root),'ASSIGNMENT_NESTED','Вложенные назначения запрещены.');
  root=fs.realpathSync(root);
  check(input && validId(input.id) && typeof input.task_id==='string','ASSIGNMENT_ID','Нужны id и task_id.');
  const target=plainPath(input.worktree), file=recordPath(root,input.id);
  return withLock(localPath(root,'operation.lock'),()=>{
    if(fs.existsSync(file)) {
      const record=readJSON(file);verifyInput(record,input);
      if(['ASSIGNED','INTEGRATED'].includes(record.phase))return assignmentStatusUnlocked(root,record.id);
      assertPlanPermission(root);
      return resumeAssignment(root,record);
    }
    const {plan,resolved}=validate(root);
    assertPlanPermission(root,plan);
    check(expectedRevision!==undefined && plan.plan_revision===Number(expectedRevision),'REVISION_CHANGED','Нужна текущая revision.');
    check(['parallel','orchestrated'].includes(plan.execution_strategy) && !plan.current_task_id && plan.execution_scope_status==='ACTIVE','ASSIGNMENT_POLICY','Назначения выдаются из активного parallel- или orchestrated-плана без основной микрозадачи.');
    ensureIdleGit(root);
    check(!journal(root) && !allChanges(root).length,'ASSIGNMENT_DIRTY','Перед выдачей main должен быть чистым, без транзакции.');
    check(git(root,['branch','--show-current']).stdout.trim()==='main' && input.base_commit===head(root),'ASSIGNMENT_BASE','База — подтверждённый текущий SHA main.');
    const task=plan.tasks.find(t=>t.id===input.task_id);
    check(task?.implementation_status==='TODO','ASSIGNMENT_TASK','Назначается только ожидающая задача.');
    if(isOrchestratedPlan(plan)) {
      check(!isDeliveryTask(task),'ASSIGNMENT_TASK','Delivery-задачу плана оркестратора выполняет оркестратор в main, не исполнитель.');
      // Wave barrier: a sequential task waits for everything before it; later work waits for an unfinished sequential task.
      const earlier=plan.tasks.slice(0,plan.tasks.indexOf(task)).filter(t=>!task.parallel_safe||!t.parallel_safe);
      check(earlier.every(t=>t.commit_status==='DONE'),'ASSIGNMENT_BARRIER','Последовательная задача и следующая за ней работа ждут интеграции всего предыдущего.',{task_id:task.id,pending:earlier.filter(t=>t.commit_status!=='DONE').map(t=>t.id)});
    }
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
      config_digest:hash(fs.readFileSync(safePath(root,CONFIG))),phase:'PREPARED',setup:{},
      ...(plan.dialogue_version?{dialogue_version:plan.dialogue_version,attempt:1}: {})};
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
    assertPlanPermission(root);
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

