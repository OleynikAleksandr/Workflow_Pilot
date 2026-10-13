// A small read-only explanation of the final protocol. Source evidence from a
// worker is deliberately NOT represented as a checked main or user acceptance.
export function executionFinalStages(execution={}) {
  const assignments=execution.assignments??[],plan=execution.planView??{};
  const complete=plan.total>0&&plan.completed===plan.total;
  const ready=assignments.filter(a=>a.status==='READY_FOR_INTEGRATION'&&a.source_commit&&!a.error&&!a.dirty);
  const blocking=assignments.find(a=>a.commandActive&&a.status==='READY_FOR_INTEGRATION');
  const blocker=blocking?.commands?.find(c=>c.blocksIntegration);
  const unknown=assignments.some(a=>a.status==='UNKNOWN');
  const source=complete?{status:'done',text:'Результаты исполнителей интегрированы.'}
    :ready.length?{status:'ready',text:`Исходный коммит исполнителя подтверждён (${ready.length}). Это ещё не проверка main.`}
      :unknown?{status:'unknown',text:'Источник назначения требует проверки Kit/Git.'}
        :{status:'waiting',text:'Ждём подтверждённый коммит исполнителя.'};
  const integration=execution.integration?.status;
  const main=complete?{status:'done',text:'Интеграции задач подтверждены Kit/Git в общем main.'}
    :blocking?{status:'blocked',text:'Запись в main запрещена: выполняется write-команда исполнителя.'}
      :integration==='UNKNOWN'?{status:'unknown',text:'Исход слияния неизвестен. Повторная запись запрещена.'}
        :integration&&integration!=='IDLE'?{status:'waiting',text:'Интеграция main требует завершения или исправления.'}
          :{status:'waiting',text:ready.length?'Исходник готов; ждём безопасной интеграции в main.':'Общий main ещё не завершён.'};
  const handoff=(status,kind)=>({
    pending:{status:'waiting',text:`${kind} ожидает разрешённого момента отправки.`},
    sending:{status:'unknown',text:`Отправка ${kind.toLowerCase()} начата; исход нельзя повторять без проверки.`},
    unknown:{status:'unknown',text:`Исход отправки ${kind.toLowerCase()} неизвестен. Повтор запрещён.`},
    sent:{status:'sent',text:`${kind} отправлена. Ожидаем ответ исходного основного чата.`},
    'reply-observed':{status:'done',text:`${kind}: ответ исходного чата завершён.`},
  })[status]??{status:'waiting',text:`${kind} пока не требуется.`};
  const diagnostic=handoff(execution.diagnosticStatus,'Диагностика');
  const final=handoff(execution.finalizationStatus,'Финальная передача');
  const reply=execution.finalizationStatus==='reply-observed'&&complete
    ?{status:'done',text:'Итоговый ответ завершён. Остаётся приёмка пользователем.'}
    :{status:'waiting',text:execution.finalizationStatus==='sent'?'Ждём отдельный завершённый итоговый ответ.':'Итоговый ответ ещё не подтверждён.'};
  let action='Автоматическое продолжение ожидает событий; новая кнопка слияния не требуется.';
  if(execution.diagnosticStatus==='unknown'||execution.finalizationStatus==='unknown'||
    execution.diagnosticStatus==='sending'||execution.finalizationStatus==='sending')
    action='Проверьте отправку в исходном основном чате. Не повторяйте сообщение при неизвестном исходе.';
  else if(blocking)action=`Нужна проверка операции ${blocker?.id??'без подтверждённого ID'} в ${blocking.worktree??'worktree исполнителя'}. `+
    'Не останавливайте сервер без решения пользователя: дождитесь подтверждённого завершения App Server.';
  else if(unknown||integration==='UNKNOWN')action='Проверьте состояние Kit, операцию и доказательства; неизвестный исход не означает успех.';
  else if(execution.finalizationStatus==='reply-observed'&&complete)action='Технический результат готов. Для закрытия плана требуется приёмка пользователя.';
  else if(execution.diagnosticStatus==='sent')action='Диагностический ответ — только чтение main. После него очередь продолжит интеграцию при снятом блокере.';
  else if(execution.finalizationStatus==='sent')action='Исходный основной чат проверяет общий main и формирует отдельный итоговый ответ.';
  else if(execution.error?.message)action=execution.error.message;
  return {source,main,diagnostic,final,reply,action,blocked:!!blocking};
}
