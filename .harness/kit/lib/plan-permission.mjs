import fs from 'node:fs';
import {atomic,check,json,readJSON,withLock} from './common.mjs';
import {localPath} from './git.mjs';
import {readPlan,parsePlan} from './plan.mjs';
import {assertMigrationIdle} from './dialogue-migration-state.mjs';

// A mirror of the existing plan button, not another scheduler or a timer lease.
// Git operations consult it even when invoked directly by the orchestrator.
export function setPlanPermission(root,input) {
  const integration=localPath(root,'integration.json');
  const plan=fs.existsSync(integration)?parsePlan(readJSON(integration).original_plan):readPlan(root);
  check(!plan.assignment&&input?.scope_id===plan.scope_id,'PLAN_PERMISSION_SCOPE','Разрешение относится к другому плану.');
  check(typeof input.backend_id==='string'&&input.backend_id.length>0&&input.backend_id.length<=120
    &&Number.isSafeInteger(input.backend_pid)&&input.backend_pid>0&&typeof input.active==='boolean',
  'PLAN_PERMISSION_INPUT','Нужна identity службы и состояние кнопки плана.');
  const file=localPath(root,'plan-permission.json');
  return withLock(localPath(root,'permission.lock'),()=>{
    const previous=fs.existsSync(file)?readJSON(file):null;
    const value={version:1,scope_id:plan.scope_id,backend_id:input.backend_id,backend_pid:input.backend_pid,
      active:input.active,generation:(previous?.generation??0)+1};
    atomic(file,json(value));return {ok:true,...value};
  });
}
export function assertPlanPermission(root,plan=readPlan(root)) {
  assertMigrationIdle(root);
  if(plan.dialogue_version!==1)return;
  const file=localPath(root,'plan-permission.json'),value=fs.existsSync(file)?readJSON(file):null;
  let alive=false;
  if(Number.isSafeInteger(value?.backend_pid))try{process.kill(value.backend_pid,0);alive=true;}catch{}
  check(value?.version===1&&value.scope_id===plan.scope_id&&value.active===true&&alive,
    'PLAN_PAUSED','План приостановлен. Новые назначения, задания и интеграции ждут общей кнопки «Продолжить».');
}
