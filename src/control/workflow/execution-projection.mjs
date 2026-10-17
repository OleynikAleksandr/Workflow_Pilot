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
  if(strategy==='orchestrated')return task.verification_kind==='package'||task.verification_kind==='installed'?'Оркестратор в main'
    :task.parallel_safe?'Параллельно':'Последовательно';
  if(strategy!=='parallel')return 'Последовательно';
  const mode=task.parallel_safe?'Параллельно':'Отдельный исполнитель';
  return task.dependencies?.length?'После '+task.dependencies.join(', ')+' · '+mode:mode;
}

export function projectExecutionPlan(plan,assignments,integration) {
  return {state:plan.tasks.every(t=>t.commit_status==='DONE')?'awaiting-acceptance':'working',
    completed:plan.tasks.filter(t=>t.commit_status==='DONE').length,total:plan.tasks.length,
    tasks:plan.tasks.map(task=>{
      const assignment=assignments.find(a=>a.parent_task_id===task.id);
      const delivery=task.verification_kind==='package'||task.verification_kind==='installed';
      // Delivery of an orchestrated plan runs in main without an assignment.
      const status=task.commit_status==='DONE'?'done':assignment||task.implementation_status==='IN_PROGRESS'?'current':'pending';
      const merging=assignment&&integration?.assignment_id===assignment.id&&integration.status!=='IDLE';
      const label=status==='done'?'Интеграция проверена':merging
        ?integrationProblem(integration)?.message??(['CONFLICT','CHECKS_FAILED'].includes(integration.status)?'Интеграция требует исправления':'Интегрируется')
        :assignment?.status==='UNKNOWN'?'Назначение требует сверки':assignment?.status==='READY_FOR_INTEGRATION'?'Готово к интеграции':assignment?'Назначено исполнителю':null;
      return {id:task.id,title:task.title,status,...(delivery?{delivery:true}:{}),label:label??(delivery&&status==='current'?'Выполняет оркестратор':null),
        executionLabel:plannedExecution(task,plan.execution_strategy)};
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
      return {workspace:project.workspace,sessionId:session.sessionId,originSessionId:session.executionOriginSessionId,parentScopeId:session.parentScopeId,
        createdAt:session.createdAt,
        assignmentId:session.assignmentId,taskId:session.taskId,title:session.title,experience:session.experience,
        chatUrl:session.chatUrl,worktree:true,...executorStatus(assignment,record,execution.integration),
        sourceCommit:assignment?.source_commit??null,integrationCommit:assignment?.integration_commit??null,
        time:record?.executor?.clock.snapshot()??{...session.executionTime,phase:'unknown'}};
    }));
}

export { executionFinalStages } from '../../contracts/workflow-view.mjs';
