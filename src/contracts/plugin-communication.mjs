export const ASSIGNMENT_DIALOGUE_VERSION=1;
// A UI notification is settled by its delivery receipt, not by the model's
// subsequent answer. Other working messages retain their turn/yield contract.
export function communicationMessageComplete(message) {
  if(!message)return false;
  if(message.startup_complete)return true;
  if(message.intent&&['claimed','unknown','rejected'].includes(message.delivery))return false;
  if(['user-choice','review'].includes(message.kind))return !!(message.superseded&&!message.intent
    ||(message.read||message.superseded_read)&&(!message.intent||message.delivery==='accepted'));
  return !!(message.reply_observed||message.superseded);
}
export const ASSIGNMENT_KINDS=Object.freeze(['task','context_request','context','question','clarification','decision','result','revision_request','acceptance']);
export const assignmentError=(code,message)=>Object.assign(new Error(message),{code:'PLUGIN_COMMUNICATION_'+code});
export const assignmentCheck=(value,code,message)=>{if(!value)throw assignmentError(code,message);};
const key=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$/.test(value);
const sha=value=>typeof value==='string'&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
export function assignmentPayload(input){
  const check=assignmentCheck;
  check(key(input.idempotency_key)&&key(input.recipient)&&ASSIGNMENT_KINDS.includes(input.kind)
    &&Number.isSafeInteger(input.attempt)&&input.attempt>0,'INPUT','Нужны адресат из реестра, тип, текущая попытка и ключ операции.');
  check(typeof input.body==='string'&&input.body.trim(),'CONTEXT','Нужен содержательный текст агента.');
  for(const name of ['in_reply_to','result_id','block_id','problem_id'])check(input[name]==null||key(input[name]),'INPUT','Некорректная корреляция '+name+'.');
  check(input.source_commit==null||sha(input.source_commit),'INPUT','Нужен полный source_commit.');
  check(input.blocking===undefined||typeof input.blocking==='boolean','INPUT','blocking должен быть boolean.');
  check(input.resume===undefined||typeof input.resume==='boolean','INPUT','resume должен быть boolean.');
  const contexts=input.contexts??[];
  check(Array.isArray(contexts)&&contexts.length<=16,'CONTEXT','Допустимо до 16 выбранных источников контекста.');
  for(const item of contexts)check(item&&typeof item.source==='string'&&item.source.trim()&&item.source.length<=1024
    &&typeof item.text==='string'&&item.text.length>0&&(item.commit==null||sha(item.commit)),
  'CONTEXT','Каждый источник содержит source, text и необязательный полный commit.');
  const bytes=new TextEncoder().encode(input.body).length+contexts.reduce((n,c)=>n+new TextEncoder().encode(c.text).length,0);
  check(bytes<=1048576,'CONTEXT','Выбранный контекст превышает 1 MiB; он не обрезан. Разделите отправку.');
  return {recipient:input.recipient,kind:input.kind,attempt:input.attempt,body:input.body,
    in_reply_to:input.in_reply_to??null,result_id:input.result_id??null,source_commit:input.source_commit??null,
    block_id:input.block_id??null,problem_id:input.problem_id??null,blocking:input.blocking??false,resume:input.resume??false,
    contexts:contexts.map(c=>({source:c.source,commit:c.commit??null,text:c.text}))};
}
