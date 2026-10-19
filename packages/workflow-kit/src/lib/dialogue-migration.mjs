import fs from 'node:fs';
import path from 'node:path';
import {PLAN,check,json,readJSON,atomic,withLock,safePath} from './common.mjs';
import {git,head,localPath,allChanges,ensureIdleGit} from './git.mjs';
import {readPlan} from './plan.mjs';
import {validate} from './validate.mjs';
import {journal,activeIntegration} from './transaction-state.mjs';
import {commitCandidate} from './transaction.mjs';
import {assignmentRecords,readAssignment,recordPath,childRecordPath,save,ownWorktree} from './assignment-contract.mjs';
import {assignmentStatus} from './task-assignment.mjs';
import {assertAssignmentCommandsIdle} from './assignment-command-safety.mjs';
import {prepareDialogueRuntimeUpgrade,applyDialogueRuntimeUpgrade} from './installer.mjs';
import {migrationJournal} from './dialogue-migration-state.mjs';

const failpoint=stage=>check(process.env.WORKFLOW_TEST_FAILPOINT!==stage,'TEST_INTERRUPTION','Прерван переход: '+stage);
function migrationLock(root,operationId,fn){
  const file=localPath(root,'operation.lock');fs.mkdirSync(path.dirname(file),{recursive:true});
  if(fs.existsSync(file))withLock(localPath(root,'migration-recovery.lock'),()=>{
    const stat=fs.lstatSync(file);check(stat.isFile()&&!stat.isSymbolicLink(),'WORKFLOW_LOCKED','Блокировка не является обычным файлом.');
    const previous=readJSON(file);let dead=false;
    try{process.kill(previous.pid,0);}catch(error){dead=error.code==='ESRCH';}
    check(previous.dialogue_migration===operationId&&dead,'WORKFLOW_LOCKED','Другая операция ещё удерживает блокировку.');
    check(fs.lstatSync(file).ino===stat.ino,'WORKFLOW_LOCKED','Блокировка изменилась.');fs.unlinkSync(file);
  });
  let fd;try{fd=fs.openSync(file,'wx');}catch{check(false,'WORKFLOW_LOCKED','Другая операция удерживает блокировку.');}
  try{fs.writeFileSync(fd,json({pid:process.pid,dialogue_migration:operationId,created_at:new Date().toISOString()}));return fn();}
  finally{fs.closeSync(fd);try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}}
}
const lockedAll=(roots,id,fn,index=0)=>index===roots.length?fn():migrationLock(roots[index],id,()=>lockedAll(roots,id,fn,index+1));
const clean=root=>{ensureIdleGit(root);check(!journal(root)&&!activeIntegration(root)&&!allChanges(root).length,
  'DIALOGUE_MIGRATION_BUSY','Переход требует чистого checkout без транзакции: '+root);
  assertAssignmentCommandsIdle({worktree:root,dialogue_version:1});};

export function migrateAssignmentDialogue(root,input){
  root=fs.realpathSync(root);
  check(!readAssignment(root)&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(input?.operation_id??''),
    'DIALOGUE_MIGRATION_OWNER','Переход выполняет O в main с устойчивым operation_id.');
  const file=migrationJournal(root),saved=fs.existsSync(file)?readJSON(file):null,plan=readPlan(root);
  if(saved){check(saved.operation_id===input.operation_id&&saved.scope_id===input.scope_id,
    'DIALOGUE_MIGRATION_PENDING','Продолжите ранее начатую операцию перехода.');
    if(saved.phase==='DONE')return {ok:true,migrated:true,operation_id:saved.operation_id,scope_id:saved.scope_id,commit:saved.commit,duplicate:true};}
  check(plan.scope_id===input.scope_id&&plan.execution_strategy==='orchestrated'&&plan.execution_scope_status==='ACTIVE',
    'DIALOGUE_MIGRATION_SCOPE','Нужен текущий активный orchestrated-план.');
  check(!input.project_id||input.project_id===plan.project_id,'DIALOGUE_MIGRATION_SCOPE','Проект изменился перед переходом.');
  const permission=localPath(root,'plan-permission.json'),permit=fs.existsSync(permission)?readJSON(permission):null;
  check(permit?.scope_id===plan.scope_id&&permit.active===false,'DIALOGUE_MIGRATION_PAUSE','Сначала нужна подтверждённая общая пауза.');
  const records=assignmentRecords(root).filter(r=>r.parent_scope_id===plan.scope_id&&r.phase!=='INTEGRATED');
  return lockedAll([root,...records.map(r=>r.worktree).sort()],input.operation_id,()=>{
    let record=saved;
    if(!record){
      check((plan.dialogue_version??0)===0,'DIALOGUE_MIGRATION_VERSION','План уже использует новый диалог.');
      clean(root);const verified=validate(root);
      const children=records.map(r=>{
        check(r.phase==='ASSIGNED','DIALOGUE_MIGRATION_BUSY','Назначение ещё создаётся: '+r.id);
        ownWorktree(r.worktree,r);clean(r.worktree);
        const state=assignmentStatus(root,r.id),child=readPlan(r.worktree),runtime=readAssignment(r.worktree);
        check(!state.transaction_pending&&['READY','READY_FOR_INTEGRATION','RUNNING','NEEDS_SETUP'].includes(state.status),
          'DIALOGUE_MIGRATION_UNKNOWN','Исход назначения не подтверждён: '+r.id);
        check(!verified.resolved[r.parent_task_id]?.integration_commit,'DIALOGUE_MIGRATION_PROOF','Интеграция не совпадает с назначением.');
        return {record:r,runtime,before_head:head(r.worktree),source_commit:state.source_commit??null,started:!!child.current_task_id,plan:child};
      });
      const upgrades=[prepareDialogueRuntimeUpgrade(root,input.operation_id,plan),...children.map(c=>{
        const next=structuredClone(c.plan);next.dialogue_version=1;next.plan_revision++;
        next.tasks[0].commit_ref.iteration??=1;
        return prepareDialogueRuntimeUpgrade(c.record.worktree,input.operation_id,next);
      })];
      record={version:1,operation_id:input.operation_id,scope_id:plan.scope_id,phase:'PREPARED',before_head:head(root),children,upgrades};
      atomic(file,json(record));failpoint('dialogue-migration-prepared');
    }
    for(const entry of record.upgrades){
      const child=record.children.find(c=>c.record.worktree===entry.root);
      if(child){
        const runtime={...child.runtime,dialogue_version:1,contract_dialogue_version:0,attempt:1,
          migration:{operation_id:record.operation_id}};
        save(childRecordPath(entry.root),runtime);
      }
      if(!entry.upgrade_commit){entry.upgrade_commit=applyDialogueRuntimeUpgrade(entry);atomic(file,json(record));}
      if(child)check(head(entry.root)===entry.upgrade_commit&&!allChanges(entry.root).length,
        'DIALOGUE_MIGRATION_CHANGED','Checkout изменён после обновления runtime.');
      failpoint('dialogue-migration-runtime');
    }
    const attestation={version:1,operation_id:record.operation_id,scope_id:record.scope_id,assignments:record.children.map(c=>{
      const entry=record.upgrades.find(e=>e.root===c.record.worktree),files={};
      for(const name of git(root,['diff-tree','--no-commit-id','--name-only','-r',entry.upgrade_commit]).stdout.trim().split('\n').filter(Boolean)){
        const blob=git(root,['rev-parse',entry.upgrade_commit+':'+name],{allowFailure:true});files[name]=blob.status===0?blob.stdout.trim():null;
      }
      return {id:c.record.id,before_head:c.before_head,source_commit:c.source_commit,upgrade_commit:entry.upgrade_commit,files};
    })};
    const receiptPath='.harness/dialogue-migrations/'+record.operation_id+'.json';
    if(record.phase!=='COMMITTED'){
      const before=record.upgrades[0].upgrade_commit;
      const next=structuredClone(record.upgrades[0].plan);next.dialogue_version=1;next.plan_revision++;
      const receiptFile=safePath(root,receiptPath),receiptText=json(attestation);
      check(!fs.existsSync(receiptFile)||fs.readFileSync(receiptFile,'utf8')===receiptText,
        'DIALOGUE_MIGRATION_CHANGED','Доказательство перехода изменено извне.');
      atomic(receiptFile,receiptText);
      let result;
      if(head(root)!==before&&!journal(root)){
        check(git(root,['rev-parse','HEAD^']).stdout.trim()===before
          &&git(root,['log','-1','--format=%B']).stdout.includes('Workflow-Role: dialogue-migration')
          &&json(readPlan(root))===json(next)&&!allChanges(root).length,
          'DIALOGUE_MIGRATION_HEAD','main изменён вне завершения перехода.');
        result={sha:head(root)};
      }else result=commitCandidate(root,{plan:next,role:'dialogue-migration',selected:[PLAN,receiptPath],
        message:'chore: перейти на адресный диалог оркестратора',beforeHead:before});
      failpoint('dialogue-migration-final-receipt');
      record.commit=result.sha;record.phase='COMMITTED';atomic(file,json(record));
      failpoint('dialogue-migration-committed');
    }
    check(head(root)===record.commit&&!allChanges(root).length,'DIALOGUE_MIGRATION_CHANGED','main изменён после фиксации перехода.');
    for(const child of record.children){
      const r=readJSON(recordPath(root,child.record.id));
      r.dialogue_version=1;r.contract_dialogue_version=0;r.migration={operation_id:record.operation_id};
      r.dialogue??={version:1,attempt:1,grant:child.started||child.source_commit?
        {legacy_authorization:true,source_commit:child.source_commit}:null,result:null,acceptance:null,history:[],operations:{}};
      save(recordPath(root,r.id),r);
    }
    record.phase='DONE';atomic(file,json(record));
    return {ok:true,migrated:true,operation_id:record.operation_id,scope_id:record.scope_id,commit:record.commit,
      ready_without_report:record.children.filter(c=>c.source_commit).map(c=>({assignment_id:c.record.id,source_commit:c.source_commit})),
      instructions:'Переход сохранён. Одна общая кнопка «Продолжить». O запрашивает у готовых E result существующего коммита; работу и commit не повторять.'};
  });
}
