import { readCommandActivity, acknowledgeUnknownCommand } from '../workflow/command-activity.mjs';

// Product ownership and destructive-action preconditions live behind Control.
// Desktop supplies only confirmation and presentation callbacks.
export function createProjectLifecycle({store,workflow,liveSessions,contextCache,workspaceSetup,confirm,settingsOpen,getDeletion,awaitSettings,saveSettings,onDeleted,purgeState}) {
const {execution}=workflow;
function archiveRecords(items, { single = false } = {}) {
  if (!Array.isArray(items) || !items.length || (single && items.length !== 1)) throw new Error(single ? 'Выберите один проект.' : 'Выберите проекты из архива.');
  const seen = new Set();
  return items.map(item => {
    if (!item || typeof item.workspace !== 'string' || typeof item.projectId !== 'string' || seen.has(item.workspace)) throw new Error('Некорректный выбор архива.');
    seen.add(item.workspace);
    const project = store.project(item.workspace);
    if (!project?.archivedAt || project.projectId !== item.projectId) throw new Error('Список архива изменился. Повторите выбор.');
    return project;
  });
}

function sessionArchiveRecords(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('Выберите сессии из архива.');
  const snapshot = store.snapshot(); const seen = new Set();
  return items.map(item => {
    const key = `${item?.workspace ?? ''}\n${item?.sessionId ?? ''}`;
    if (!item || typeof item.workspace !== 'string' || typeof item.projectId !== 'string' || typeof item.sessionId !== 'string' || seen.has(key))
      throw new Error('Некорректный выбор сессий архива.');
    seen.add(key);
    const project = snapshot.projects.find(project => project.workspace === item.workspace);
    if (!project || project.projectId !== item.projectId || project.archivedAt) throw new Error('Проект сессии изменился. Повторите выбор.');
    const session = project.sessions.find(session => session.sessionId === item.sessionId);
    if (!session?.archivedAt) throw new Error('Сессия больше не находится в архиве.');
    return { project, session };
  });
}

async function prepareProjectRemoval(job) {
  const workspaces=[job.workspace,...(job.related??[]).map(p=>p.workspace)];
  const records=[...liveSessions.all()].filter(r=>workspaces.includes(r.identity?.workspace));
  for(const record of records)if(record.pageState.current?.state.busy||record.controller.pending||record.composer.inFlight)
    throw Object.assign(new Error('Остановите работу чатов удаляемого проекта перед удалением.'),{code:'DELETE_PROJECT_BUSY'});
  for(const workspace of workspaces)await execution.suspend(workspace);
  for(const workspace of workspaces) {
    const activity=await readCommandActivity(workspace),command=activity.commands.find(c=>c.blocksDeletion);
    if(command)throw Object.assign(new Error('Удаление ожидает завершения операции '+command.id+'. '+command.reason+
      '. Для сервера попросите агента остановить его по session ID; неизвестный исход требует диагностики.'),{code:'DELETE_PROJECT_BUSY'});
  }
  job.sessionIds=[...new Set([...(job.sessionIds??[]),...records.map(r=>r.diagnostics?.log.sessionId).filter(Boolean)])];
  for(const record of records)await record.diagnostics?.stop();
  for(const record of records)if(!liveSessions.release(record))
    throw Object.assign(new Error('Чат ещё занят. Повторите удаление после остановки.'),{code:'DELETE_PROJECT_BUSY'});
  await store.whenIdle();
  await awaitSettings();
}
async function cleanupDeletedProject(job) {
  const identities=[{workspace:job.workspace,projectId:job.projectId,sessionIds:job.sessionIds??[]},...(job.related??[])];
  workflow.cleanup(identities);
  contextCache.clear();workspaceSetup.invalidateReadiness();
  onDeleted(identities);
  await saveSettings();
}

async function acknowledgeCommand(input) {
    const selected=store.selected(),root=selected?.parentWorkspace??selected?.workspace;
    const target=typeof input?.workspace==='string'&&store.project(input.workspace);
    if(!target||target.projectId!==input.projectId||(target.parentWorkspace??target.workspace)!==root)
      throw new Error('Проект операции изменился. Повторите диагностику.');
    const activity=await readCommandActivity(target.workspace),command=activity.commands.find(c=>c.id===input.id);
    if(!command?.canAcknowledge||command.digest!==input.digest)throw new Error('Операция изменилась или исполнитель ещё работает.');
    const answer=await confirm({type:'warning',buttons:['Отмена','Признать исход неизвестным'],defaultId:0,cancelId:0,
      message:'Операция '+command.id,detail:'Результат утрачен. Это разрешит интеграцию проверенного коммита, но не подтвердит успех команды и не разрешит удаление живого сервера. Продолжайте только после диагностики этой операции.'});
    if(answer.response!==1)return;
    if(store.selected()?.sessionId!==selected.sessionId||store.project(target.workspace)?.projectId!==input.projectId)
      throw new Error('Выбранная сессия изменилась.');
    await acknowledgeUnknownCommand(target.workspace,{...input,confirmation:input.id});
    await execution.signal(root);
}
async function clearOrphanExecutor(input) {
    if (!settingsOpen()) throw new Error('Откройте Настройки для восстановления записи исполнителя.');
    const expected=await getDeletion().inspectOrphan(input);
    const choice=await confirm({
      type:'warning',buttons:['Отмена','Убрать запись'],defaultId:0,cancelId:0,noLink:true,
      title:'Восстановление исполнителя',
      message:'Убрать локальную запись исполнителя «'+(store.project(expected.workspace)?.displayName||store.project(expected.workspace)?.name||expected.workspace)+'»?',
      detail:'Путь: '+expected.workspace+'\nБудет удалена только локальная запись и относящиеся к ней настройки и диагностика. Облачные чаты ChatGPT сохраняются. Файлы на диске не удаляются.',
    });
    if(choice.response!==1)return;
    if(!settingsOpen())throw Object.assign(new Error('Настройки закрыты. Повторите подтверждение.'),{code:'EXECUTOR_RECORD_CHANGED'});
    const checkBusy=async target=>{
      const workspaces=[target.workspace,target.parentWorkspace];
      if([...liveSessions.all()].some(record=>workspaces.includes(record.identity?.workspace)))
        throw Object.assign(new Error('Исполнитель или родитель ещё открыт в ChatGPT. Завершите работу.'),{code:'DELETE_PROJECT_BUSY'});
      for(const workspace of workspaces){
        const activity=await readCommandActivity(workspace);
        if(activity.deletionBlocked)throw Object.assign(new Error('Исход команды не подтверждён. Очистка запрещена.'),{code:'DELETE_PROJECT_BUSY'});
      }
      const ledgers=execution.ledgers();
      if(ledgers.some(ledger=>Object.values(ledger?.assignments??{}).some(entry=>entry.worktree===target.workspace
        && entry.phase!=='integrated'&&entry.integration!=='done')))
        throw Object.assign(new Error('Назначение исполнителя ещё активно или имеет UNKNOWN-состояние.'),{code:'DELETE_PROJECT_BUSY'});
      if(execution.allStates().some(state=>(state.assignments??[]).some(entry=>
        entry.worktree===target.workspace&&entry.status!=='INTEGRATED')))
        throw Object.assign(new Error('Исполнение не завершено. Проверьте состояние назначения.'),{code:'DELETE_PROJECT_BUSY'});
    };
    await getDeletion().clearOrphan(input,{checkBusy,cleanup:cleanupDeletedProject,
      purgeState:(dir,identities)=>{
        return purgeState(dir,identities);
      }});
}
return Object.freeze({archiveRecords,sessionArchiveRecords,prepareProjectRemoval,cleanupDeletedProject,acknowledgeCommand,clearOrphanExecutor});
}
