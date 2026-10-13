import fs from 'node:fs';
import path from 'node:path';
import {check,contextPath} from './common.mjs';
import {readPlan,isDeliveryTask,isDocumentationFinalizationTask} from './plan.mjs';
import {readConfig,taskChecks} from './validate.mjs';
import {applyPlan} from './actions.mjs';

const TASK_FIELDS=['id','title','why','files','checks','dependencies','acceptance','commit','verification_kind','before','parallel_safe'];
const notStarted=t=>t.implementation_status==='TODO'&&t.commit_status==='PENDING';

// Only new domain tasks and added dependencies enter here. applyPlan owns locking, revision and history.
export function extendPlan(root,input,expectedRevision) {
  check(input && typeof input==='object' && !Array.isArray(input),'PLAN_SCHEMA','Ожидается объект с tasks.');
  check(Object.keys(input).every(k=>['spec','tasks','dependencies'].includes(k)),'PLAN_SCHEMA','plan:extend принимает только spec, tasks и dependencies; прежний план копировать не нужно.');
  const plan=readPlan(root),config=readConfig(root);
  check(expectedRevision!==undefined,'EXPECTED_REVISION_REQUIRED','Укажите --expected-revision из status.');
  check(Number(expectedRevision)===plan.plan_revision,'REVISION_CONFLICT','План изменился. Прочитайте status и проверьте, не добавлены ли уже ваши задачи.',{expected:expectedRevision,actual:plan.plan_revision});
  check(plan.execution_scope_status==='ACTIVE','SCOPE_LIFECYCLE','Для plan:extend нужен активный сохранённый план. При NONE используйте plan:create.');
  const added=input.dependencies!==undefined;
  if(added)check(input.dependencies&&typeof input.dependencies==='object'&&!Array.isArray(input.dependencies)&&Object.keys(input.dependencies).length>0,'PLAN_SCHEMA','dependencies: ожидается объект вида {"T003":["T001A"]}.');
  const newTasks=input.tasks??[];
  check(Array.isArray(newTasks)&&(newTasks.length>0||added),'PLAN_SCHEMA','tasks должен содержать новые задачи.');
  if(input.spec!==undefined){check(typeof input.spec==='string','SPEC_REQUIRED','spec должен быть путём к документу.');contextPath(root,input.spec);check(/^docs\/(planning|modules)\/.+\.md$/i.test(input.spec)&&fs.existsSync(path.join(root,input.spec)),'SPEC_REQUIRED','Укажите существующий документ docs/planning/ или docs/modules/.');}
  const used=new Set(plan.tasks.map(t=>t.id));
  for(const t of newTasks)if(t?.id){check(!/^DOCS(?:-\d+)?$/.test(t.id)&&!used.has(t.id),'TASK_ID_CONFLICT','ID уже занят или зарезервирован: '+t.id,{task_id:t.id});used.add(t.id);}
  let next=1;
  // The file order is the execution order: existing tasks keep their places, a new one goes to the end or before a named task.
  const ordered=structuredClone(plan.tasks),amended=new Set();
  const tasks=newTasks.map((t,i)=>{
    const field='tasks['+i+']';
    check(t && typeof t==='object'&&!Array.isArray(t),'PLAN_SCHEMA',field+': ожидается объект.');
    check(!('spec' in t),'PLAN_SCHEMA',field+': spec указывается на верхнем уровне рядом с tasks, а не внутри задачи: {"spec":"docs/planning/x.md","tasks":[…]}.');
    check(Object.keys(t).every(k=>TASK_FIELDS.includes(k)),'PLAN_SCHEMA',field+': передавайте только '+TASK_FIELDS.join(', ')+'.');
    check(typeof t.title==='string'&&t.title.trim(),'PLAN_SCHEMA',field+'.title: нужен заголовок.');
    let id=t.id;
    if(!id){while(used.has('T'+String(next).padStart(3,'0')))next++;id='T'+String(next++).padStart(3,'0');used.add(id);}
    check(Array.isArray(t.files)&&t.files.length>0,'PLAN_SCHEMA',field+'.files: перечислите файлы новой задачи.');
    t.files.forEach(f=>contextPath(root,f));
    const task={id,title:t.title,why:t.why??t.title,dependencies:t.dependencies??[],functional_paths:t.files.filter(f=>!f.endsWith('.md')),documentation_paths:[...new Set([...(input.spec?[input.spec]:[]),...t.files.filter(f=>f.endsWith('.md'))])],verification_ids:t.checks??[],verification_kind:t.verification_kind??'code',acceptance_criteria:t.acceptance??[t.title],expected_commit_message:t.commit??'feat: '+t.title,implementation_status:'TODO',commit_status:'PENDING',commit_ref:{scope_id:plan.scope_id,task_id:id,role:'implementation'}};
    if(Object.hasOwn(t,'parallel_safe'))task.parallel_safe=t.parallel_safe;
    check(Array.isArray(task.verification_ids),'PLAN_SCHEMA',field+'.checks: нужен массив ID проверок.');
    try{taskChecks(task,config);}catch(error){error.message=field+'.checks ('+id+'): '+error.message;error.details={...error.details,task_id:id,field:field+'.checks',available_checks:config.checks.map(c=>c.id)};throw error;}
    if(t.before===undefined)ordered.push(task);
    else {
      // 1.5.6: the new task is placed right before a not yet started task, which then waits for it.
      const at=typeof t.before==='string'?ordered.findIndex(x=>x.id===t.before&&plan.tasks.some(old=>old.id===x.id)):-1;
      check(at>=0&&!isDocumentationFinalizationTask(ordered[at]),'TASK_ORDER',field+'.before: укажите ID существующей задачи плана (не DOCS).',{task_id:id,before:t.before});
      const target=ordered[at];
      check(notStarted(target),'TASK_ORDER',field+'.before: задача '+target.id+' уже начата или завершена. Новую задачу можно поставить только перед ещё не начатой.',{task_id:id,before:target.id});
      check(isDeliveryTask(task)===isDeliveryTask(target),'TASK_ORDER',field+'.before: обычная задача ставится перед обычной, delivery (package/installed) — перед delivery; DOCS остаётся между ними.',{task_id:id,before:target.id});
      target.dependencies=[...new Set([...target.dependencies,id])];amended.add(target.id);
      ordered.splice(at,0,task);
    }
    return task;
  });
  for(const [id,dependencies] of Object.entries(input.dependencies??{})){
    const field='dependencies.'+id,target=ordered.find(t=>t.id===id);
    check(target&&!isDocumentationFinalizationTask(target)&&plan.tasks.some(t=>t.id===id),'PLAN_SCHEMA',field+': в плане нет такой задачи (у DOCS зависимости ведёт Kit). Зависимости новой задачи указывайте в ней самой.',{task_id:id});
    check(notStarted(target),'TASK_ORDER',field+': зависимости дополняются только у ещё не начатой задачи.',{task_id:id});
    check(Array.isArray(dependencies)&&dependencies.length>0&&dependencies.every(d=>typeof d==='string'&&d!==id&&d!=='DOCS'&&used.has(d)),'PLAN_SCHEMA',field+': нужен непустой массив ID других задач плана или новых задач.',{task_id:id});
    target.dependencies=[...new Set([...target.dependencies,...dependencies])];amended.add(id);
  }
  if(amended.size){
    // Kit keeps ordinary work before DOCS and delivery after it; within that order a dependency must come first.
    const order=ordered.map(t=>t.id);
    for(const t of ordered)if(amended.has(t.id)||tasks.includes(t))for(const d of t.dependencies)
      check(d==='DOCS'||order.indexOf(d)<order.indexOf(t.id),'TASK_ORDER','Задача '+t.id+' зависит от '+d+', которая стоит в плане позже. Порядок в плане — порядок выполнения: поставьте новую задачу раньше через before.',{task_id:t.id,dependency:d});
  }
  const changes={tasks:ordered,approved_scope:{...plan.approved_scope,functional_paths:[...new Set([...plan.approved_scope.functional_paths,...tasks.flatMap(t=>t.functional_paths)])],documentation_paths:[...new Set([...plan.approved_scope.documentation_paths,...tasks.flatMap(t=>t.documentation_paths)])]}};
  if(input.spec)changes.context_pack={...plan.context_pack,documents:[...plan.context_pack.documents.filter(d=>d.path!==input.spec),{path:input.spec,required:true}]};
  // The captured revision prevents a concurrent writer from being overwritten.
  return applyPlan(root,changes,expectedRevision);
}
