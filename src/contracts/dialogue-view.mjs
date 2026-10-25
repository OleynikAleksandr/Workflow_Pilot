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
  if(dialogue?.result)return {phase:'review',label:channel?.result?.read
    ?'Оркестратор получил результат · ожидаем решение':'Результат готов · ожидаем рассмотрения оркестратором'};
  if(status==='READY_FOR_INTEGRATION')return {phase:'report',label:'Коммит проверен · ожидаем отчёт исполнителя'};
  if(!dialogue?.grant)return physical?.busy?{phase:'starting',label:'Завершается загрузочный ход'}
    :{phase:'waiting-task',label:'Ожидаем задание оркестратора'};
  if(channel?.initial&&!channel.initial.read)return {phase:'dispatch',label:'Передаём задание исполнителю'};
  if((dialogue?.attempt??1)>1)return {phase:'revision',label:'Доработка · попытка '+dialogue.attempt};
  if(physical?.busy)return {phase:'working',label:'Выполняет поручение оркестратора'};
  return {phase:'waiting',label:'Задание получено · ожидаем следующий шаг'};
}

const waits={
  'previous-turn':'Оркестратор завершает предыдущий ответ.',
  'previous-message':'Сначала обрабатывается предыдущее сообщение.',
  'recipient-busy':'Получатель ещё отвечает.',
  'recipient-unavailable':'Восстанавливаем соединение с чатом получателя.',
  'admission-denied':'Передача продолжится, когда назначение будет готово.',
  'commands-active':'Ожидаем завершение команды.',
  'recipient-draft':'У получателя открыт черновик.',
  'manual-stop':'Ход остановлен вручную.',
};

// Only observed facts. A read receipt is not evidence that tests started.
export function planActivity({run={},execution={},channel,physical}={}) {
  const stage=(phase,label,reason='',actor='Оркестратор')=>({phase,label,reason,actor});
  if(run.state==='complete')return stage('complete','Выполнение завершено — ожидается ваша приёмка','','План');
  if(run.issue||execution.error)return stage('attention','Требуется внимание',execution.error?.message??run.issue?.message??'Оркестратор плана не определён.','План');
  if(['paused','pausing'].includes(run.state))return stage('paused',run.state==='pausing'?'Выполнение приостанавливается':'Выполнение на паузе',run.message??'Новые назначения и отправки приостановлены.','План');
  if(run.state==='not-started')return stage('ready','План готов к запуску','','План');
  const command=(execution.commands??[]).find(c=>c.blocksIntegration||c.state==='running');
  if(command)return stage('command','Выполняется команда',command.reason??'Ожидаем подтверждение завершения команды.','Workflow Kit');
  if(execution.integration?.status&&execution.integration.status!=='IDLE')return stage('integration','Проверка и интеграция в main',
    ['UNKNOWN','CONFLICT','CHECKS_FAILED'].includes(execution.integration.status)?'Интеграция требует исправления.':'Ожидаем результат операции Kit.','Workflow Kit');
  const incoming=channel?.incoming,task=incoming?.task_id?' · '+incoming.task_id:'';
  const blocker=channel?.blocker;
  if(blocker&&(blocker.message_id!==incoming?.message_id||blocker.reason==='manual-stop'||['unknown','rejected'].includes(blocker.delivery))){
    const held=blocker.kind==='user-choice'?'вашего выбора':'предыдущего сообщения';
    const reason=blocker.reason;
    const current=(phase,label,detail)=>({...stage(phase,label,detail,'Канал связи'),recipient:'O',
      priority:phase==='attention'?0:1,key:'blocked-by:'+blocker.message_id+':'+reason,startedAt:blocker.created_at});
    if(['unknown','rejected'].includes(blocker.delivery))return current('attention',blocker.read?'Завершение ответа требует проверки':'Отправка требует проверки',
      (blocker.read?'Оркестратор получил сообщение, но завершение ответа неизвестно. ':'Исход предыдущей отправки неизвестен. ')+
      'Проверьте чат оркестратора. Автоматически повторять отправку нельзя.');
    if(reason==='manual-stop')return current('attention','Ответ оркестратора остановлен вручную',
      'Чтобы передать следующие результаты, откройте его чат и продолжите работу.');
    if(reason==='commands-active')return current('command','Ожидаем завершения команды оркестратора',
      'После неё передача результатов продолжится автоматически.');
    if(reason==='recipient-busy')return current('processing','Оркестратор завершает обработку '+held,
      'Следующие результаты ждут окончания этого ответа.');
    return current('turn-end','Ожидаем завершения обработки '+held,
      'Проверяем состояние чата оркестратора перед передачей следующих результатов.');
  }
  if(incoming){
    const preparation=incoming.kind==='ready'||incoming.kind==='recovery'&&['prepare',undefined].includes(incoming.service_action);
    const recipient=incoming.recipient_role??'O',to=recipient==='O'?'оркестратору':'исполнителю'+task;
    const current=(...args)=>({...stage(...args),recipient,key:'message:'+(incoming.message_id??incoming.kind)+':'+args[0],
      startedAt:(incoming.handled?incoming.handled_at:incoming.read?incoming.read_at:incoming.delivery==='accepted'?incoming.delivery_at:incoming.created_at)??null});
    if(!incoming.read&&['unknown','rejected'].includes(incoming.delivery))return current('attention','Доставка требует проверки'+task,
      'Проверьте чат получателя. Автоматически повторять отправку нельзя.','Канал связи');
    if(!incoming.read){
      if(['manual-stop','recipient-draft'].includes(incoming.reason))return current('attention',
        incoming.reason==='manual-stop'?'Чат получателя остановлен вручную':'В чате получателя открыт черновик',
        incoming.reason==='manual-stop'?'Откройте чат получателя и продолжите работу.':'Отправьте или уберите черновик в чате получателя, чтобы продолжить передачу.','Канал связи');
      const label=incoming.delivery==='accepted'?'Ожидаем, когда '+(recipient==='O'?'оркестратор':'исполнитель'+task)+' получит сообщение'
        :preparation&&recipient==='O'
        ?channel.sdk===false?'Восстанавливаем соединение с оркестратором'
          :'Передаём запрос подготовки'+task+' оркестратору'
        :incoming.kind==='result'?'Результат'+task+' готов · передаём '+to:'Передаём сообщение '+to;
      return current(incoming.delivery==='accepted'?'waiting-read':'delivery',label,waits[incoming.reason]??'','Канал связи');
    }
    if(incoming.handled)return current('turn-end',incoming.kind==='finalization'?'Завершается итоговый ответ':'Ожидаем завершение ответа'+task,
      'Следующие сообщения будут переданы после окончания ответа.');
    if(incoming.kind==='result')return current('result','Получил результат'+task+' · ожидаем решение');
    if(incoming.kind==='finalization')return current('final','Готовит итоговый ответ');
    if(preparation)return current('prepare','Готовит поручение'+task);
    if(incoming.kind==='question')return current('question','Обрабатывает вопрос исполнителя'+task);
    return current('processing','Обрабатывает сообщение'+task);
  }
  const tasks=execution.planView?.tasks??[],allDone=tasks.length>0&&tasks.every(t=>t.status==='done');
  if(allDone){
    if(execution.assignments?.some(a=>a.cleanup?.status!=='DONE'))return stage('cleanup','План завершается',
      execution.finalizationReason??'Ожидаем последние квитанции и подтверждение очистки назначений.','Workflow Kit');
    return stage('finalizing','План завершается',physical?.busy?'Итоговый ответ ещё продолжается.':
      execution.finalizationReason??'Проверяем чистоту main и подтверждения завершения.','План');
  }
  if(execution.phase==='preparing')return stage('bootstrap','Подключаем исполнителей','','Приложение');
  if(physical?.busy)return stage('processing','Работает над планом');
  return stage('waiting','Ожидаем результаты и события','Состояние каждого исполнителя показано у его задачи.','План');
}

// Bounded, local observation time. Restart resets it; it is not model thinking.
export function activityClock({now=()=>performance.now(),wallNow=Date.now,limit=256}={}) {
  const entries=new Map();
  return (key,stage)=>{
    const stamp=now(),signature=JSON.stringify([stage.phase,stage.label,stage.reason,stage.key]),old=entries.get(key);
    const since=old?.signature===signature?old.since:stamp;
    entries.delete(key);entries.set(key,{signature,since});
    while(entries.size>limit)entries.delete(entries.keys().next().value);
    const start=Date.parse(stage.startedAt??'');
    return {...stage,elapsedMs:Math.max(0,Number.isFinite(start)?wallNow()-start:stamp-since),
      clock:Number.isFinite(start)?'durable-stage-time':'observed-backend-monotonic'};
  };
}
