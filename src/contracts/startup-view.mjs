// Public projection: never expose the ticket, q, context or enrollment hash.
export function startupLaunch(attempt,now=Date.now()){
  if(attempt?.bootstrapTransport!=='url-query')return null;
  return {registration:attempt.state==='sent'?'confirmed':!attempt.sendStartedAtMs?'not-started':attempt.state==='unknown'?'unknown':'pending',
    address:attempt.addressStatus??'pending',modeConfirmed:!!attempt.modeConfirmed,cancel:attempt.cancelState??'none',
    modeViolation:!!attempt.modeViolation,loginLost:!!attempt.loginLost,
    addressOverdue:attempt.addressStatus!=='confirmed'&&!!attempt.sendStartedAtMs&&now-attempt.sendStartedAtMs>=60000};
}
export function startupView(progress){
  const launch=progress?.launch;
  if(progress?.cancelled||launch&&launch.cancel!=='none')return {
    phase:launch?.cancel==='requested'?'cancel-pending':'startup-cancelled',
    title:launch?.cancel==='requested'?'Завершаем отмену запуска':'Запуск остановлен',
    detail:(launch?.cancel==='requested'?'Отзыв приглашения ещё не подтверждён. Повторной отправки нет.'
      :'Новые части контекста и сообщения этой попытки запрещены. Создайте новый Chat.')
      +(progress?.complete?' Контекст был подтверждён до остановки; ранее полученный текст сохраняется.':'')};
  if(launch?.registration==='not-started')return {phase:progress?.error?'startup-failed':'preparing',
    title:progress?.error?'Не удалось подготовить запуск':'Подготавливаем панель',
    detail:progress?.error?.message??'Сохраняем полный контекст и приглашение до отправки команды.'};
  if(launch&&launch.registration!=='confirmed')return {phase:launch.registration==='unknown'?'startup-uncertain':'waiting-registration',
    title:launch.registration==='unknown'?'Регистрация панели не подтверждена':'Ожидаем регистрацию панели',
    detail:'Первая команда запущена. Только регистрация по её приглашению подтвердит отправку. Повторной команды нет.'
      +(launch.address==='pending'?' Адрес чата ещё не подтверждён.':launch.address==='lost'?' Связь с адресом утрачена.':' Адрес пока не связан с регистрацией.')};
  const address=launch&&launch.address!=='confirmed'
    ?(launch.address==='lost'?' Адрес чата утрачен; автоматической перепривязки нет.'
      :launch.address==='conflict'?' Адрес конфликтует; автоматической перепривязки нет.':' Регистрация подтверждена; ожидаем подтверждённый адрес чата.'):'';
  if(progress?.complete)return {phase:'startup-ready',title:'Контекст восстановлен',detail:progress.snapshot_stale
    ?'Все части подтверждены. План изменился после подготовки снимка; перед следующими решениями получите актуальный контекст.'+address
    :'Все части прочитаны и подтверждены агентом. Дальнейшая работа — в рамках роли сессии.'+address};
  if(progress?.superseded||progress?.error?.code==='PLUGIN_COMMUNICATION_STALE_MESSAGE'||progress?.error?.code==='CONTEXT_CHANGED')
    return {phase:'startup-stale',title:'Стартовый контекст устарел',detail:'Этот пакет нельзя подтвердить. Откройте новую сессию для получения актуального контекста; повторной отправки в старый чат не будет.'};
  if(progress?.error||progress?.delivery==='rejected')return {phase:'startup-failed',title:'Не удалось восстановить контекст',detail:`${progress.error?.message??'Доставка стартового контекста отклонена.'} Проверьте причину и откройте новую сессию. Повторной отправки нет.`};
  if(progress?.delivery==='unknown')return {phase:'startup-uncertain',title:'Передача требует проверки',detail:'Исход отправки неизвестен. Не повторяйте Send; проверьте квитанции и, если пакет получен, дочитайте его.'};
  if(progress?.read)return {phase:'startup-reading',title:'Агент читает контекст',detail:`Прочитано частей: ${progress.parts_read} из ${progress.total_parts}. Ожидаем подтверждение всего пакета.`+address};
  if(['accepted','claimed'].includes(progress?.delivery))return {phase:'startup-transfer',title:'Передаём стартовый контекст',detail:'Уведомление передано в канал. Чтение агентом ещё не подтверждено.'};
  if(progress?.delivery_mode==='model-pull')return {phase:'startup-channel',title:'Открываем панель и передаём контекст',detail:'Агент получит первую часть при открытии панели и продолжит чтение в этом же ходе. Файлы в ChatGPT не загружаются.'+address};
  return {phase:'startup-channel',title:'Подключаем панель для контекста',detail:'Ждём готовности канала и завершения загрузочного ответа. Файлы в ChatGPT не загружаются.'};
}

// One projection for Desktop/HTTP: a durable startup.complete receipt wins
// over an old transport=pending and a stale controller observation.
// progress===null: the channel answered that the packet is gone (terminal);
// undefined: the channel has not answered yet, e.g. right after backend start.
export function startupContextState(state,progress,attempt=null){
  const launch=startupLaunch(attempt)??state?.startup?.launch??null;
  if(progress?.cancelled||launch&&launch.cancel!=='none')return {...state,launch,
    startup:{...progress,launch},phase:launch?.cancel==='requested'?'cancel-pending':'startup-cancelled'};
  const failed=state?.phase==='stale'?{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE',message:'Стартовый пакет устарел.'}
    :state?.phase==='error'?state.error??{code:'STARTUP_ERROR',message:'Восстановление завершилось ошибкой.'}
    :progress===null&&(!launch||attempt?.contextRef)?{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE',message:'Стартовый пакет отсутствует или сессия удалена.'}:null;
  const complete=progress?.complete===true;
  const startup=complete?{...progress,snapshot_stale:state?.phase==='stale'||state?.startup?.snapshot_stale===true||progress.snapshot_stale===true}
    :{...progress,...(failed?{error:failed}:{})};
  return {...state,launch,startup:{...startup,...(launch?{launch}:{})},
    phase:launch&&launch.registration!=='confirmed'?state?.phase??'waiting-registration'
      :complete?'startup-complete':failed?'startup-failed':'startup-channel',error:complete?null:failed??null};
}
