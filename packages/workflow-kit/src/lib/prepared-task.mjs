import {check,hash,relativePath,isPrivate} from './common.mjs';

// The committed plan is the immutable content store for this author snapshot.
// No runtime status, Git result or counter participates in its semantic digest.
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
  ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const digest=value=>hash('workflow-pilot/prepared-task/v1\0'+canonical(value));
const same=(a,b)=>canonical(a)===canonical(b);
const forbidden=/(?:Bearer\s+[A-Za-z0-9._~-]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{12,}|enrollment_ticket\s*["']?\s*[:=]\s*["']?[a-f0-9]{64}|https?:\/\/chatgpt\.com\/(?:c\/[A-Za-z0-9_-]{8,}|\?q=))/i;
const fail=(yes,task,message)=>check(yes,'TASK_PREPARATION',task.id+': '+message,{task_id:task.id});
const semantic=task=>Object.fromEntries(['id','title','why','functional_paths','documentation_paths','verification_ids',
  'acceptance_criteria','dependencies','context_pack','task_brief','parallel_safe','verification_kind','expected_commit_message']
  .filter(key=>Object.hasOwn(task,key)).map(key=>{
    const value=structuredClone(task[key]);
    if(key==='context_pack')for(const doc of value.documents??[])delete doc.revision;
    return [key,value];
  }));
const binding=(plan,task,prepared)=>({version:1,project_id:prepared.project_id,scope_id:prepared.scope_id,
  author_session_id:prepared.author_session_id,task:semantic(task),body_sha256:prepared.body_sha256,
  contexts:prepared.contexts.map(({text,...manifest})=>manifest),dependency_task_ids:prepared.dependency_task_ids});

export function validatePreparedTask(plan,task,{document_bytes=28000,hard_bytes=180000}={}){
  const p=task.prepared_task;if(!p)return;
  fail(p.version===1&&p.project_id===plan.project_id&&p.scope_id===(plan.assignment?.parent_scope_id??plan.scope_id)
    &&typeof p.author_session_id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(p.author_session_id),task,'подготовка принадлежит другому автору/проекту/scope.');
  if(!plan.assignment)fail(p.author_session_id===plan.execution_origin_session_id,task,'автор не является владельцем этого плана.');
  fail(typeof task.task_brief==='string'&&task.task_brief.trim()&&Buffer.byteLength(task.task_brief)<=12000
    &&p.body_sha256===hash(task.task_brief)&&!task.task_brief.includes('\0')&&!forbidden.test(task.task_brief),task,'нужен целый авторский task_brief без секретов.');
  fail(Array.isArray(p.contexts)&&p.contexts.length<=16&&Array.isArray(p.dependency_task_ids),task,'повреждён манифест контекста.');
  let bytes=Buffer.byteLength(task.task_brief);
  for(const item of p.contexts){
    fail(item&&typeof item.source==='string'&&!isPrivate(item.source),task,'недопустимый источник контекста.');relativePath(item.source);
    fail(typeof item.text==='string'&&item.text.length>0&&!item.text.includes('\0')&&!forbidden.test(item.text)
      &&item.bytes===Buffer.byteLength(item.text)&&item.sha256===hash(item.text)
      &&(item.commit===null||/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(item.commit)),task,'байты выбранного контекста не подтверждены.');
    fail(Buffer.byteLength(canonical(item))+256<=document_bytes,task,'часть контекста вместе с оформлением превышает document_bytes.');
    bytes+=item.bytes;
  }
  fail(bytes<=hard_bytes&&bytes<=1048576,task,'выбранный контекст превышает бюджет; он не обрезан.');
  if(!plan.assignment){
    fail(same(p.dependency_task_ids,task.dependencies),task,'нужен точный перечень отложенных зависимостей.');
    fail(p.contexts.length+(task.dependencies.length?1:0)<=16,task,'нужно место для проверенных фактов зависимостей.');
    fail(p.contract_digest===digest(binding(plan,task,p)),task,'требования изменились после подготовки; явно обновите prepared_task до нового Review.');
  }
}

// Called only on an author mutation, after all ordinary/DOCS normalization.
// Reading an older plan never adds preparation or authorizes its brief.
export function sealPreparations(plan,budget){
  for(const task of plan.tasks){
    if(!task.prepared_task){
      fail(plan.preparation_version!==1||['package','installed'].includes(task.verification_kind),task,
        'до публикации сохраните task_brief и prepared_task:{version:1,contexts:[{source,text,commit?}]}, включая DOCS.');
      continue;
    }
    const raw=task.prepared_task;
    if(!raw.contract_digest){
      fail(raw.version===1&&Array.isArray(raw.contexts),task,'нужна явная подготовка версии 1.');
      for(const [key,value] of Object.entries({project_id:plan.project_id,scope_id:plan.scope_id,author_session_id:plan.execution_origin_session_id}))
        fail(raw[key]===undefined||raw[key]===value,task,'подменена принадлежность подготовки.');
      fail(typeof task.task_brief==='string',task,'task_brief отсутствует.');
      fail(raw.contexts.every(item=>item&&typeof item.source==='string'&&typeof item.text==='string'),task,'каждая часть содержит source и text.');
      const prepared={version:1,project_id:plan.project_id,scope_id:plan.scope_id,author_session_id:plan.execution_origin_session_id,
        body_sha256:hash(task.task_brief),contexts:raw.contexts.map(item=>({source:item.source,text:item.text,commit:item.commit??null,
          sha256:hash(typeof item.text==='string'?item.text:''),bytes:Buffer.byteLength(typeof item.text==='string'?item.text:'')})),
        dependency_task_ids:raw.dependency_task_ids??[...task.dependencies]};
      prepared.contract_digest=digest(binding(plan,task,prepared));task.prepared_task=prepared;
    }
    validatePreparedTask(plan,task,budget);
  }
  return plan;
}
