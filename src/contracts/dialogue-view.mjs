// A view of facts, never a transition or an execution permission.
// A technical error is not evidence that the user can resolve it.
export function executionIssue(error) {
  const code=error?.code;
  if(['READINESS_BUSY','PROJECT_RECOVERY_REQUIRED','CONCURRENT_CHANGE','READINESS_CHANGED'].includes(code))
    return {phase:'waiting',label:'Ожидаем завершения операции проекта',reason:''};
  if(code==='MAIN_DIRTY')return {phase:'attention',label:'В main есть незакоммиченные изменения',
    reason:error.message,userAction:'Сохраните или зафиксируйте свои изменения в main, затем нажмите «Продолжить».'};
  if(['LOGIN_REQUIRED','AUTH_REQUIRED','SIGNED_OUT'].includes(code))return {phase:'attention',label:'Нужен вход в ChatGPT',
    reason:error.message,userAction:'Войдите в свой аккаунт ChatGPT в указанной сессии.'};
  if(code==='CONVERSATION_BRANCH')return {phase:'attention',label:'Разговор разветвился',
    reason:error.message,userAction:'Откройте разговор, выберите нужную ветку и нажмите «Продолжить».'};
  return {phase:'stopped',label:'Работа остановлена',reason:error?.message??'Причина уточняется; подробности доступны в диагностике.'};
}
export function notificationActivity(recovery){
  if(recovery?.retrying)return {phase:'delivery',label:'Восстанавливаем доставку уведомления',reason:'Сообщение сохранено. Повторное поручение не создаётся.'};
  if(recovery?.exhausted)return {phase:'attention',label:'Не удалось уведомить агента',
    userAction:'Откройте чат и попросите прочитать входящие Workflow Pilot.',
    reason:`SDK: ${recovery.error?.code??'нет подтверждения'}. Попыток: ${recovery.attempts} из ${recovery.limit}. Откройте чат и попросите прочитать входящие Workflow Pilot.`};
  return null;
}
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
  const recovery=notificationActivity(channel?.incoming?.recovery);if(recovery)return recovery;
  const conflict=channel?.incoming&&!channel.incoming.read&&deliveryAttention(channel.incoming.reason);if(conflict)return conflict;
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

// Server-page delivery: neutral waits resolve themselves; conflicts need the user.
export const DELIVERY_ATTENTION=Object.freeze({
  'freshness-conflict-draft':{label:'Черновик задерживает доставку',reason:'Отправьте или очистите черновик в окне Workflow Pilot; черновик не стирается.'},
  'freshness-unavailable':{label:'Серверная страница не готова к доставке',reason:'Откройте разговор во встроенном окне Workflow Pilot; после загрузки страницы доставка продолжится.'},
  'freshness-conflict-branch':{label:'Разговор разветвился',reason:'Откройте разговор, выберите нужную ветку и нажмите «Продолжить».'},
});
export const deliveryAttention=reason=>DELIVERY_ATTENTION[reason]?{phase:'attention',...DELIVERY_ATTENTION[reason]}:null;
const waits={
  'owner-unavailable':'Доставку выполняет служба Workflow Pilot; ожидаем панель её серверной страницы.',
  'freshness-reload':'Обновляем серверную страницу разговора перед доставкой.',
  'freshness-reload-deferred':'Обновление серверной страницы отложено до конца отправки или ручного ввода.',
  'awaiting-turn-end':'Ожидаем подтверждение конца хода.',
  'previous-message':'Предыдущая передача ещё не подтверждена.',
  'recipient-unavailable':'Восстанавливаем соединение с чатом получателя.',
  'recipient-connection-error':'Соединение с получателем прервано.',
  'admission-denied':'Проверяем разрешение и актуальность поручения.',
  'manual-stop':'Отправка остановлена вручную.',
};

// Only observed facts. A read receipt is not evidence that tests started.
export function planActivity({run={},execution={},channel,physical}={}) {
  const stage=(phase,label,reason='',actor='Оркестратор')=>({phase,label,reason,actor});
  if(run.state==='complete')return stage('complete','Выполнение завершено — ожидается ваша приёмка','','План');
  if(run.issue||execution.error)return {...executionIssue(execution.error??run.issue),actor:'План'};
  if(['paused','pausing'].includes(run.state))return stage('paused',run.state==='pausing'?'Выполнение приостанавливается':'Выполнение на паузе',run.message??'Новые назначения и отправки приостановлены.','План');
  if(run.state==='not-started')return stage('ready','План готов к запуску','','План');
  const command=(execution.commands??[]).find(c=>c.blocksIntegration||c.state==='running');
  if(command)return stage('command','Выполняется команда',command.reason??'Ожидаем подтверждение завершения команды.','Workflow Kit');
  if(execution.integration?.status&&execution.integration.status!=='IDLE')return stage('integration','Проверка и интеграция в main',
    ['UNKNOWN','CONFLICT','CHECKS_FAILED'].includes(execution.integration.status)?'Интеграция требует исправления.':'Ожидаем результат операции Kit.','Workflow Kit');
  const incoming=channel?.incoming,task=incoming?.task_id?' · '+incoming.task_id:'';
  const blocker=channel?.blocker;
  if(blocker&&(blocker.reason==='manual-stop'||['claimed','unknown','rejected'].includes(blocker.delivery))){
    const reason=blocker.reason;
    const current=(phase,label,detail)=>({...stage(phase,label,detail,'Канал связи'),recipient:'O',
      priority:phase==='attention'?0:1,key:'blocked-by:'+blocker.message_id+':'+reason,startedAt:blocker.created_at});
    const recovery=notificationActivity(blocker.recovery);
    if(recovery)return current(recovery.phase,recovery.label,recovery.reason);
    if(['unknown','rejected'].includes(blocker.delivery))return current('attention','Отправка требует проверки',
      (blocker.delivery==='rejected'?'ChatGPT отклонил отправку. ':'Подтверждение отправки не получено. ')+
      (blocker.read?'Получатель прочитал сообщение; повтор не требуется. ':'Проверьте чат получателя. Автоматически повторять отправку нельзя.'));
    if(reason==='manual-stop')return current('attention','Ответ оркестратора остановлен вручную',
      'Чтобы передать следующие результаты, откройте его чат и продолжите работу.');
    return current('delivery','Передаём сообщение','Ожидаем подтверждение ChatGPT.');
  }
  if(incoming){
    const preparation=incoming.kind==='ready'||incoming.kind==='recovery'&&['prepare',undefined].includes(incoming.service_action);
    const recipient=incoming.recipient_role??'O',to=recipient==='O'?'оркестратору':'исполнителю'+task;
    const current=(...args)=>({...stage(...args),recipient,key:'message:'+(incoming.message_id??incoming.kind)+':'+args[0],
      startedAt:(incoming.handled?incoming.handled_at:incoming.read?incoming.read_at:incoming.delivery==='accepted'?incoming.delivery_at:incoming.created_at)??null});
    const recovery=!incoming.read&&notificationActivity(incoming.recovery);
    if(recovery)return current(recovery.phase,recovery.label+task,recovery.reason,'Канал связи');
    if(!incoming.read&&['unknown','rejected'].includes(incoming.delivery))return current('attention','Доставка требует проверки'+task,
      'Проверьте чат получателя. Автоматически повторять отправку нельзя.','Канал связи');
    if(!incoming.read){
      if(incoming.reason==='send-unknown')return current('attention','Исход прежней отправки неизвестен',
        'Проверьте чат получателя. Автоматического повтора нет.','Канал связи');
      if(incoming.reason==='manual-stop')return current('attention','Отправка остановлена вручную',
        'Продолжите работу в чате получателя.','Канал связи');
      const conflict=deliveryAttention(incoming.reason);
      if(conflict)return current('attention',conflict.label+task,conflict.reason,'Канал связи');
      const label=incoming.delivery==='accepted'?'Сообщение принято ChatGPT'+task
        :preparation&&recipient==='O'
        ?channel.sdk===false?'Восстанавливаем соединение с оркестратором'
          :'Передаём запрос подготовки'+task+' оркестратору'
        :incoming.kind==='result'?'Результат'+task+' готов · передаём '+to:'Передаём сообщение '+to;
      return current(incoming.delivery==='accepted'?'waiting-read':'delivery',label,waits[incoming.reason]??'','Канал связи');
    }
    if(incoming.handled)return current('turn-end',incoming.kind==='finalization'?'Завершается итоговый ответ':'Ожидаем завершение ответа'+task,
      'Получатель подтвердил обработку сообщения.');
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
// An observer panel shows the work and accepts explicit user actions; the
// backend page of the participant delivers every automatic message.
export const OBSERVER_DELIVERY_LABEL='Доставку выполняет служба Workflow Pilot';
