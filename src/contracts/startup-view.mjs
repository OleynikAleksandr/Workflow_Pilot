export function startupView(progress){
  if(progress?.complete)return {phase:'startup-ready',title:'Контекст восстановлен',detail:'Все части прочитаны и подтверждены агентом. Дальнейшая работа — в рамках роли сессии.'};
  if(progress?.superseded)return {phase:'startup-stale',title:'Стартовый контекст устарел',detail:'Проект изменился во время передачи. Откройте новую сессию для актуального контекста.'};
  if(['unknown','rejected'].includes(progress?.delivery))return {phase:'startup-uncertain',title:'Передача требует проверки',detail:'Хост не подтвердил отправку. Автоматического повтора нет; если уведомление пришло, агент может дочитать тот же пакет.'};
  if(progress?.read)return {phase:'startup-reading',title:'Агент читает контекст',detail:`Прочитано частей: ${progress.parts_read} из ${progress.total_parts}. Ожидаем подтверждение всего пакета.`};
  if(['accepted','claimed'].includes(progress?.delivery))return {phase:'startup-transfer',title:'Передаём стартовый контекст',detail:'Уведомление передано в канал. Чтение агентом ещё не подтверждено.'};
  if(progress?.delivery_mode==='model-pull')return {phase:'startup-channel',title:'Открываем панель и передаём контекст',detail:'Агент получит первую часть при открытии панели и продолжит чтение в этом же ходе. Файлы в ChatGPT не загружаются.'};
  return {phase:'startup-channel',title:'Подключаем панель для контекста',detail:'Ждём готовности канала и завершения загрузочного ответа. Файлы в ChatGPT не загружаются.'};
}
