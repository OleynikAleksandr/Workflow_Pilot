import {check,contextPath} from './common.mjs';
import {readPlan} from './plan.mjs';
import {applyPlan} from './actions.mjs';

// Additive amendment: never copy statuses or commit references through the model.
export function updateTask(root,taskId,input,expectedRevision) {
 const plan=readPlan(root),task=plan.tasks.find(t=>t.id===taskId);
 check(task,'UNKNOWN_TASK','Укажите существующую задачу через --task.',{task_id:taskId});
 check(task.commit_status!=='DONE','COMPLETED_TASK_IMMUTABLE','Завершённую задачу не меняют; добавьте новую через plan:extend.',{task_id:taskId});
 check(input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).length>0,'TASK_UPDATE','Нужен объект с files, checks или acceptance.');
 for(const [key,values] of Object.entries(input)) {
  check(['files','checks','acceptance'].includes(key),'TASK_UPDATE','Неизвестное поле. Допустимы files, checks, acceptance; обоснование числа файлов не требуется.',{task_id:taskId,field:key,expected:['files','checks','acceptance'],received:key});
  check(Array.isArray(values)&&values.every(v=>typeof v==='string'&&v.trim()),'TASK_UPDATE','Допустимы только массивы files, checks, acceptance.',{task_id:taskId,field:key,expected:'array of strings',received:values,next_action:'task:update --task '+taskId+' --input changes.json --expected-revision '+plan.plan_revision});
 }
 for(const f of input.files??[])contextPath(root,f);
 const append=(a,b)=>[...new Set([...a,...b])];
 const amended={...task,functional_paths:append(task.functional_paths,(input.files??[]).filter(f=>!f.endsWith('.md'))),documentation_paths:append(task.documentation_paths,(input.files??[]).filter(f=>f.endsWith('.md'))),verification_ids:append(task.verification_ids,input.checks??[]),acceptance_criteria:append(task.acceptance_criteria,input.acceptance??[])};
 return applyPlan(root,{tasks:plan.tasks.map(t=>t.id===taskId?amended:t),approved_scope:{...plan.approved_scope,functional_paths:append(plan.approved_scope.functional_paths,amended.functional_paths),documentation_paths:append(plan.approved_scope.documentation_paths,amended.documentation_paths)}},expectedRevision);
}
