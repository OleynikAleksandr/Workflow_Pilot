export function startupView(progress){
  if(progress?.complete)return {phase:'startup-ready',title:'Контекст восстановлен',detail:progress.snapshot_stale
    ?'Все части подтверждены. План изменился после подготовки снимка; перед следующими решениями получите актуальный контекст.'
    :'Все части прочитаны и подтверждены агентом. Дальнейшая работа — в рамках роли сессии.'};
  if(progress?.superseded||progress?.error?.code==='PLUGIN_COMMUNICATION_STALE_MESSAGE'||progress?.error?.code==='CONTEXT_CHANGED')
    return {phase:'startup-stale',title:'Стартовый контекст устарел',detail:'Этот пакет нельзя подтвердить. Откройте новую сессию для получения актуального контекста; повторной отправки в старый чат не будет.'};
  if(progress?.error||progress?.delivery==='rejected')return {phase:'startup-failed',title:'Не удалось восстановить контекст',detail:`${progress.error?.message??'Доставка стартового контекста отклонена.'} Проверьте причину и откройте новую сессию. Повторной отправки нет.`};
  if(progress?.delivery==='unknown')return {phase:'startup-uncertain',title:'Передача требует проверки',detail:'Исход отправки неизвестен. Не повторяйте Send; проверьте квитанции и, если пакет получен, дочитайте его.'};
  if(progress?.read)return {phase:'startup-reading',title:'Агент читает контекст',detail:`Прочитано частей: ${progress.parts_read} из ${progress.total_parts}. Ожидаем подтверждение всего пакета.`};
  if(['accepted','claimed'].includes(progress?.delivery))return {phase:'startup-transfer',title:'Передаём стартовый контекст',detail:'Уведомление передано в канал. Чтение агентом ещё не подтверждено.'};
  if(progress?.delivery_mode==='model-pull')return {phase:'startup-channel',title:'Открываем панель и передаём контекст',detail:'Агент получит первую часть при открытии панели и продолжит чтение в этом же ходе. Файлы в ChatGPT не загружаются.'};
  return {phase:'startup-channel',title:'Подключаем панель для контекста',detail:'Ждём готовности канала и завершения загрузочного ответа. Файлы в ChatGPT не загружаются.'};
}

// One projection for Desktop/HTTP: a durable startup.complete receipt wins
// over an old transport=pending and a stale controller observation.
export function startupContextState(state,progress){
  const failed=state?.phase==='stale'?{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE',message:'Стартовый пакет устарел.'}
    :state?.phase==='error'?state.error??{code:'STARTUP_ERROR',message:'Восстановление завершилось ошибкой.'}
    :!progress?{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE',message:'Стартовый пакет отсутствует или сессия удалена.'}:null;
  const complete=progress?.complete===true;
  const startup=complete?{...progress,snapshot_stale:state?.phase==='stale'||state?.startup?.snapshot_stale===true||progress.snapshot_stale===true}
    :{...progress,...(failed?{error:failed}:{})};
  return {...state,startup,phase:complete?'startup-complete':failed?'startup-failed':'startup-channel',error:complete?null:failed??null};
}
