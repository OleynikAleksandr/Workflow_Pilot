import fs from 'node:fs';
import {check,readJSON,json} from './common.mjs';
import {localPath,git,head} from './git.mjs';

export const migrationJournal=root=>localPath(root,'dialogue-migration.json');
export function migrationOwner(root){
  const child=localPath(root,'assignment.json');
  return fs.existsSync(child)?readJSON(child).parent_root:root;
}
export function pendingDialogueMigration(root){
  const file=migrationJournal(migrationOwner(root));
  if(!fs.existsSync(file))return null;
  const value=readJSON(file);return value.phase==='DONE'?null:value;
}
export function assertMigrationIdle(root){
  check(!pendingDialogueMigration(root),'DIALOGUE_MIGRATION_PENDING','Продолжите сохранённую миграцию; новые действия временно запрещены.');
}
export function assertMigrationCommand(root,command){
  if(['status','validate','recover','plan:view','hook','hook:ack','git-hook','assignment:status','assignment:dialogue-status',
    'integration:status','plan:permission','assignment:migrate'].includes(command))return;
  assertMigrationIdle(root);
}
export function installerMigrationCandidate(root,plan,role,files){
  if(role!=='kit-update')return false;
  const record=pendingDialogueMigration(root),entry=record?.upgrades?.find(item=>item.root===root);
  if(!entry)return false;
  check(json(entry.plan)===json(plan)&&files.every(p=>p==='.harness/plans/todo-plan.md'||entry.selected.includes(p)),
    'DIALOGUE_MIGRATION_CANDIDATE','Кандидат не совпадает с сохранённой операцией installer.');
  return true;
}
export function migrationAttestation(root,operationId){
  check(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(operationId),'DIALOGUE_MIGRATION_ID','Неверная операция перехода.');
  const file='.harness/dialogue-migrations/'+operationId+'.json';
  let value;try{value=JSON.parse(git(root,['show','HEAD:'+file]).stdout);}catch{}
  check(value?.operation_id===operationId&&value.version===1,'DIALOGUE_MIGRATION_PROOF','Нет зафиксированного main доказательства перехода.');
  return value;
}
export function migratedResultHead(record,source){
  if(head(record.worktree)===source)return true;
  if(!record.migration)return false;
  const proof=migrationAttestation(record.parent_root,record.migration.operation_id);
  const entry=proof.assignments.find(a=>a.id===record.id);
  return !!entry&&entry.source_commit===source&&entry.before_head===source&&head(record.worktree)===entry.upgrade_commit
    &&git(record.worktree,['rev-parse',entry.upgrade_commit+'^']).stdout.trim()===source;
}
export function sourceMigrationUpgrades(root,commits,assignment){
  return commits.filter(c=>c.trailers['Workflow-Dialogue-Migration']).map(commit=>{
    const ids=commit.trailers['Workflow-Dialogue-Migration'];check(ids.length===1,'DIALOGUE_MIGRATION_PROOF','Неоднозначный переход.');
    const proof=migrationAttestation(root,ids[0]),entry=proof.assignments.find(a=>a.id===assignment.id);
    check(entry?.upgrade_commit===commit.sha&&commit.parents.length===1&&commit.parents[0]===entry.before_head
      &&commit.trailers['Workflow-Role']?.[0]==='kit-update','DIALOGUE_MIGRATION_PROOF','Посторонний service-коммит в назначении.');
    const changed=git(root,['diff-tree','--no-commit-id','--name-only','-r',commit.sha]).stdout.trim().split('\n').filter(Boolean);
    check(changed.length===Object.keys(entry.files).length&&changed.every(p=>Object.hasOwn(entry.files,p)),
      'DIALOGUE_MIGRATION_PROOF','Состав service-коммита изменён.');
    for(const [file,blob] of Object.entries(entry.files)){
      const actual=git(root,['rev-parse',commit.sha+':'+file],{allowFailure:true});
      check(blob===null?actual.status!==0:actual.status===0&&actual.stdout.trim()===blob,'DIALOGUE_MIGRATION_PROOF','Файл перехода не подтверждён main.');
    }
    return {commit,entry};
  });
}
