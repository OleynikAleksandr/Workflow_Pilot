// A view of facts, never a transition or an execution permission.
export function currentPlanTasks(project,execution) {
  return (project?.planExecution?.execution_strategy==='orchestrated'&&execution?.scopeId===project.scopeId
    ?execution.planView?.tasks:null)??project?.planView?.tasks??[];
}

export function assignmentStage({phase,status,dialogue,block,channel,physical}={}) {
  if(phase==='INTEGRATED'||status==='INTEGRATED')return {phase:'done',label:'Интеграция проверена'};
  if(channel?.draft?.phase==='needs_confirmation')return {phase:'waiting-task',label:'Поручение ждёт повторного разрешения оркестратора'};
  if(channel?.draft?.phase==='authorized')return {phase:'waiting-channel',label:'Поручение готово · ожидаем подтверждённый канал'};
  if(channel&&!channel.registered)return {phase:'starting',label:'Ожидаем регистрацию исполнителя'};
  if(channel&&!channel.sdk)return {phase:'starting',label:'Ожидаем подключение SDK и привязку панели'};
  if(channel&&!channel.permitted)return {phase:'waiting',label:'Связь плана приостановлена'};
  if(block||channel?.blocked)return {phase:'question',label:'Вопрос оркестратору · ожидаем решение'};
  if(dialogue?.acceptance)return {phase:'accepted',label:'Результат принят оркестратором · ожидаем интеграцию'};
  if(dialogue?.result)return {phase:'review',label:'Результат отправлен · ожидаем проверку оркестратора'};
  if(status==='READY_FOR_INTEGRATION')return {phase:'report',label:'Коммит проверен · ожидаем отчёт исполнителя'};
  if(!dialogue?.grant)return physical?.busy?{phase:'starting',label:'Завершается загрузочный ход'}
    :{phase:'waiting-task',label:'Ожидаем задание оркестратора'};
  if(channel?.initial&&!channel.initial.read)return {phase:'dispatch',label:'Задание оркестратора в доставке · чтение не подтверждено'};
  if((dialogue?.attempt??1)>1)return {phase:'revision',label:'Доработка · попытка '+dialogue.attempt};
  if(physical?.busy)return {phase:'working',label:'Выполняет поручение оркестратора'};
  return {phase:'waiting',label:'Задание получено · ожидаем следующий шаг'};
}

const waits={
  'previous-turn':'Ждём подтверждённый конец предыдущего хода.',
  'previous-message':'Ждём обработки предыдущего сообщения.',
  'recipient-busy':'Получатель ещё отвечает.',
  'recipient-unavailable':'Готовность получателя к отправке не подтверждена.',
  'admission-denied':'Ожидаем разрешённое состояние назначения.',
  'commands-active':'Ожидаем завершение команды.',
  'recipient-draft':'У получателя открыт черновик.',
  'manual-stop':'Ход остановлен вручную.',
};

// Only observed facts. A read receipt is not evidence that tests started.
export function planActivity({run={},execution={},channel,physical}={}) {
  const stage=(phase,label,reason='',actor='Оркестратор')=>({phase,label,reason,actor});
  if(run.state==='complete')return stage('complete','Выполнение завершено — ожидается ваша приёмка','','План');
  if(run.issue||execution.error)return stage('attention','Требуется внимание',execution.error?.message??'Оркестратор плана не определён.','План');
  if(['paused','pausing'].includes(run.state))return stage('paused',run.state==='pausing'?'Выполнение приостанавливается':'Выполнение на паузе',run.message??'Новые назначения и отправки приостановлены.','План');
  if(run.state==='not-started')return stage('ready','План готов к запуску','','План');
  const command=(execution.commands??[]).find(c=>c.blocksIntegration||c.state==='running');
  if(command)return stage('command','Выполняется команда',command.reason??'Ожидаем подтверждение завершения команды.','Workflow Kit');
  if(execution.integration?.status&&execution.integration.status!=='IDLE')return stage('integration','Проверка и интеграция в main',
    ['UNKNOWN','CONFLICT','CHECKS_FAILED'].includes(execution.integration.status)?'Интеграция требует исправления.':'Ожидаем результат операции Kit.','Workflow Kit');
  const incoming=channel?.incoming,task=incoming?.task_id?' · '+incoming.task_id:'';
  if(incoming){
    if(['unknown','rejected'].includes(incoming.delivery))return stage('attention','Доставка требует сверки'+task,'Автоматическая повторная отправка запрещена.','Канал связи');
    if(!incoming.read)return stage('delivery',incoming.delivery==='accepted'?'Ожидаем прочтение сообщения'+task:'Доставка сообщения'+task,
      waits[incoming.reason]??'Прочтение оркестратором ещё не подтверждено.','Канал связи');
    if(incoming.handled)return stage('turn-end',incoming.kind==='finalization'?'Завершается итоговый ответ':'Ожидаем завершение ответа'+task,
      'Сообщение обработано; физический конец хода ещё не подтверждён.');
    if(incoming.kind==='result')return stage('result','Обрабатывает результат'+task,'Результат прочитан; начало конкретной проверки ещё не подтверждено.');
    if(incoming.kind==='finalization')return stage('final','Готовит итоговый ответ','Итоговый ход начат; очистка и последние квитанции проверяются отдельно.');
    if(['ready','recovery'].includes(incoming.kind))return stage('prepare','Готовит поручение'+task,'Служебные данные прочитаны оркестратором.');
    if(incoming.kind==='question')return stage('question','Обрабатывает вопрос исполнителя'+task);
    return stage('processing','Обрабатывает сообщение'+task);
  }
  const tasks=execution.planView?.tasks??[],allDone=tasks.length>0&&tasks.every(t=>t.status==='done');
  if(allDone){
    if(execution.assignments?.some(a=>a.cleanup?.status!=='DONE'))return stage('cleanup','План завершается',
      execution.finalizationReason??'Ожидаем последние квитанции и подтверждение очистки назначений.','Workflow Kit');
    return stage('finalizing','План завершается',physical?.busy?'Итоговый ответ ещё продолжается.':
      execution.finalizationReason??'Проверяем чистоту main и подтверждения завершения.','План');
  }
  if(execution.phase==='preparing')return stage('bootstrap','Подготовка исполнителей','Создание и подключение назначений.','Workflow Kit');
  if(physical?.busy)return stage('processing','Ход оркестратора продолжается','Конкретная операция сейчас не наблюдается.');
  return stage('waiting','Ожидаем результаты и события','Состояние каждого исполнителя показано у его задачи.','План');
}

// Bounded, local observation time. Restart resets it; it is not model thinking.
export function activityClock({now=()=>performance.now(),limit=256}={}) {
  const entries=new Map();
  return (key,stage)=>{
    const stamp=now(),signature=JSON.stringify([stage.phase,stage.label,stage.reason]),old=entries.get(key);
    const since=old?.signature===signature?old.since:stamp;
    entries.delete(key);entries.set(key,{signature,since});
    while(entries.size>limit)entries.delete(entries.keys().next().value);
    return {...stage,elapsedMs:Math.max(0,stamp-since),clock:'observed-backend-monotonic'};
  };
}
