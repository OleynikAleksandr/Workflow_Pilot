// A view of facts, never a transition or an execution permission.
export function assignmentStage({phase,status,dialogue,block,channel,physical}={}) {
  if(phase==='INTEGRATED'||status==='INTEGRATED')return {phase:'done',label:'Интеграция проверена'};
  if(channel&&!channel.registered)return {phase:'starting',label:'Ожидаем регистрацию исполнителя'};
  if(channel&&!channel.sdk)return {phase:'starting',label:'Ожидаем подключение SDK и привязку панели'};
  if(channel&&!channel.permitted)return {phase:'waiting',label:'Связь плана приостановлена'};
  if(block||channel?.blocked)return {phase:'question',label:'Вопрос оркестратору · ожидаем решение'};
  if(dialogue?.acceptance)return {phase:'accepted',label:'Результат принят оркестратором · ожидаем интеграцию'};
  if(dialogue?.result)return {phase:'review',label:'Результат отправлен · ожидаем проверку оркестратора'};
  if(status==='READY_FOR_INTEGRATION')return {phase:'report',label:'Коммит проверен · ожидаем отчёт исполнителя'};
  if(!dialogue?.grant)return {phase:'waiting-task',label:'Ожидаем задание оркестратора'};
  if(channel?.initial&&!channel.initial.read)return {phase:'dispatch',label:'Задание оркестратора в доставке · чтение не подтверждено'};
  if((dialogue?.attempt??1)>1)return {phase:'revision',label:'Доработка · попытка '+dialogue.attempt};
  if(physical?.busy)return {phase:'working',label:'Выполняет поручение оркестратора'};
  return {phase:'waiting',label:'Задание получено · ожидаем следующий шаг'};
}
