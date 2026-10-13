export function integrationProblem(operation) {
  if (operation?.status !== 'CHECKS_FAILED') return null;
  let failure;
  try { failure=JSON.parse(operation.error)?.details?.result; } catch { /* Older Git hooks may return plain text. */ }
  if (failure?.status==='FAILED' && failure.exit_code===null) return {
    code:'INTEGRATION_CHECK_START_FAILED',
    message:'Не удалось запустить проверку интеграции'+(failure.id?' «'+String(failure.id).slice(0,80)+'»':'')+'. Проверьте окружение приложения; изменения сохранены.',
  };
  return null;
}

export function plannedExecution(task,strategy) {
  if(strategy!=='parallel')return 'Последовательно';
  const mode=task.parallel_safe?'Параллельно':'Отдельный исполнитель';
  return task.dependencies?.length?'После '+task.dependencies.join(', ')+' · '+mode:mode;
}

export function projectExecutionPlan(plan,assignments,integration) {
  return {state:plan.tasks.every(t=>t.commit_status==='DONE')?'awaiting-acceptance':'working',
    completed:plan.tasks.filter(t=>t.commit_status==='DONE').length,total:plan.tasks.length,
    tasks:plan.tasks.map(task=>{
      const assignment=assignments.find(a=>a.parent_task_id===task.id);
      const status=task.commit_status==='DONE'?'done':assignment?'current':'pending';
      const merging=assignment&&integration?.assignment_id===assignment.id&&integration.status!=='IDLE';
      const label=status==='done'?'Интеграция проверена':merging
        ?integrationProblem(integration)?.message??(['CONFLICT','CHECKS_FAILED'].includes(integration.status)?'Интеграция требует исправления':'Интегрируется')
        :assignment?.status==='UNKNOWN'?'Назначение требует сверки':assignment?.status==='READY_FOR_INTEGRATION'?'Готово к интеграции':assignment?'Назначено исполнителю':null;
      return {id:task.id,title:task.title,status,label,executionLabel:plannedExecution(task,plan.execution_strategy)};
    })};
}

export function executorStatus(assignment,record,integration) {
  if(assignment?.status==='INTEGRATED')return {phase:'done',label:'Завершено · интеграция проверена'};
  if(integration?.assignment_id&&integration.assignment_id===assignment?.id&&integration.status!=='IDLE')
    return ['CONFLICT','CHECKS_FAILED','UNKNOWN'].includes(integration.status)
      ?{phase:'attention',label:integrationProblem(integration)?.message??(integration.status==='UNKNOWN'?'Исход слияния неизвестен':'Нужно исправление в main')}
      :{phase:'merging',label:'Интегрируется'};
  if(record?.error)return {phase:'attention',label:record.error.message};
  if(record?.controller?.state?.error)return {phase:'attention',label:record.controller.state.error.message+' Повторите сверку или откройте чат.'};
  if(assignment?.error)return {phase:'attention',label:assignment.error.message};
  if(assignment?.status==='NEEDS_SETUP')return {phase:'setup',label:'Нужна подготовка worktree'};
  if(assignment?.status==='UNKNOWN')return {phase:'unknown',label:'Состояние требует сверки'};
  if(assignment?.commandActive){const command=assignment.commands?.find(c=>c.blocksIntegration);return {phase:'command',
    label:command?command.reason+' · '+command.id:'Команда ещё не подтверждена как завершённая'};}
  const page=record?.pageState.current?.state;
  if(!record||record.disposed||!page||record.loading)return {phase:'unknown',label:'Активность сейчас не наблюдается'};
  if(page.connectionError)return {phase:'unknown',label:'Нет подтверждённой связи с чатом'};
  if(page.busy)return {phase:'working',label:assignment?.status==='READY_FOR_INTEGRATION'?'Коммит готов · ответ продолжается':'Работает'};
  if(assignment?.status==='READY_FOR_INTEGRATION')return page.lastMessageRole==='assistant'
    ?{phase:'ready',label:'Готово к слиянию'}:{phase:'waiting',label:'Ждём завершения ответа'};
  if(page.login==='signed-out')return {phase:'waiting',label:'Нужен вход в ChatGPT'};
  if(page.draftPresent)return {phase:'waiting',label:'Черновик · отправка приостановлена'};
  return {phase:'waiting',label:'Пауза · задача не завершена'};
}

export function projectExecutors(projects,workspace,execution,recordFor) {
  const parent=projects.find(p=>p.workspace===workspace&&!p.parentWorkspace&&!p.archivedAt);
  return projects.filter(p=>parent&&p.parentWorkspace===workspace&&p.parentProjectId===parent.projectId&&!p.archivedAt).flatMap(project=>project.sessions
    .filter(s=>s.assignmentId&&!s.archivedAt).map(session=>{
      const target={...project,...session},record=recordFor(target);
      const assignment=execution.assignments.find(a=>a.id===session.assignmentId);
      return {workspace:project.workspace,sessionId:session.sessionId,originSessionId:session.executionOriginSessionId,
        assignmentId:session.assignmentId,taskId:session.taskId,title:session.title,experience:session.experience,
        chatUrl:session.chatUrl,worktree:true,...executorStatus(assignment,record,execution.integration),
        sourceCommit:assignment?.source_commit??null,integrationCommit:assignment?.integration_commit??null,
        time:record?.executor?.clock.snapshot()??{...session.executionTime,phase:'unknown'}};
    }));
}

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
