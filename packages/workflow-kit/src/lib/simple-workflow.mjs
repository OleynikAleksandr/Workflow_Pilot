import fs from 'node:fs';
import { assertSimpleReview } from './plan-review.mjs';
import path from 'node:path';
import {check,contextPath} from './common.mjs';
import {createScope,applyConfig,buildScopePlan} from './actions.mjs';
import {readPlan,EXECUTION_POLICY_FIELDS} from './plan.mjs';
import {readConfig,validateConfig,taskChecks} from './validate.mjs';

// The model supplies domain decisions; this facade supplies the workflow schema.
export function createSimplePlan(root,input) {
  assertSimpleReview(root);
  check(typeof input.spec === 'string', 'SPEC_REQUIRED', 'Укажите spec: путь к планировочному документу.');
  contextPath(root,input.spec);
  check(fs.existsSync(path.join(root,input.spec)), 'SPEC_REQUIRED', 'Сначала запишите планировочный документ: '+input.spec);
  check(Array.isArray(input.tasks)&&input.tasks.length>0,'PLAN_SCHEMA','Нужен непустой список микрозадач.');
  const checks=input.checks??[];
  const config=validateConfig({...readConfig(root),profile:input.stack?'DEVELOPMENT':readConfig(root).profile,stack:input.stack??readConfig(root).stack,checks:checks.map(c=>({required:false,timeout_ms:120000,...c}))});
  const ids=new Set(config.checks.map(c=>c.id));
  const tasks=input.tasks.map((t,i)=>{
    check(typeof t.title==='string'&&t.title.trim(),'PLAN_SCHEMA','У каждой микрозадачи нужен title.');
    const files=t.files??[];check(Array.isArray(files),'PLAN_SCHEMA','files должен быть массивом.');files.forEach(p=>contextPath(root,p));
    const verification=t.checks??[];for(const id of verification)check(ids.has(id),'NOT_CONFIGURED','Неизвестная проверка: '+id);
    return {...(Object.hasOwn(t,'parallel_safe')?{parallel_safe:t.parallel_safe}:{}),id:t.id??'T'+String(i+1).padStart(3,'0'),title:t.title,why:t.why??t.title,dependencies:t.dependencies??[],functional_paths:files.filter(f=>!f.endsWith('.md')),documentation_paths:[...new Set([input.spec,...files.filter(f=>f.endsWith('.md'))])],verification_ids:verification,verification_kind:t.verification_kind??'code',acceptance_criteria:t.acceptance??[t.title],expected_commit_message:t.commit??'feat: '+t.title};
  });
  for (const task of tasks) {
    check(['code','package','installed'].includes(task.verification_kind),'PLAN_SCHEMA','Некорректный verification_kind.',{task_id:task.id});
    taskChecks(task,config);
  }
  const documentation=[...new Set([input.spec,'README.md','docs/architecture/OVERVIEW.md',...tasks.flatMap(t=>t.documentation_paths)])];
  const withoutDocs=tasks.filter(t=>t.id!=='DOCS');
  const delivery=withoutDocs.filter(t=>['package','installed'].includes(t.verification_kind));
  const work=withoutDocs.filter(t=>!['package','installed'].includes(t.verification_kind));
  const finalTask={id:'DOCS',title:'Актуализация всех документов проекта',why:'Сохранить актуальный контекст для следующего агента',dependencies:work.map(t=>t.id),functional_paths:[],documentation_paths:documentation,verification_ids:[],acceptance_criteria:['Документы соответствуют результату'],expected_commit_message:'docs: актуализировать контекст проекта'};
  const normalizedDelivery=delivery.map(t=>({...t,dependencies:[...new Set([...t.dependencies,'DOCS'])]}));
  tasks.splice(0,tasks.length,...work,...(delivery.length ? [finalTask,...normalizedDelivery] : []));
  const policy=Object.fromEntries([...EXECUTION_POLICY_FIELDS,'execution_origin_session_id'].filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]]));
  const scope={...policy,scope_id:input.id,objective:input.objective,approval_note:input.approval??'Пользователь поручил выполнить описанную задачу и план.',acceptance_criteria:input.acceptance??[input.objective],approved_scope:{functional_paths:[...new Set(tasks.flatMap(t=>t.functional_paths))],documentation_paths:[...new Set(tasks.flatMap(t=>t.documentation_paths))]},context_pack:{documents:[{path:input.spec,required:true}],include_last_completed_task:false,dependency_task_ids:[]},tasks};
  // Reject invalid execution metadata before changing project configuration.
  buildScopePlan(root,scope,readPlan(root),config);
  if(input.stack||input.checks)applyConfig(root,config);
  return createScope(root,scope);
}
