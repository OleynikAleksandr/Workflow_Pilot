const actionLabels = {
  runDoctor: 'Проверяем и восстанавливаем проект', continueDoctor: 'Возвращаемся к работе', reviewDoctorProject: 'Проверяем папку',
  newSession: 'Создаём сессию', selectSession: 'Открываем сессию', selectWorkspace: 'Открываем проект',
  reload: 'Обновляем ChatGPT', retry: 'Обновляем контекст', returnToChat: 'Возвращаемся к чату',
  previewNew: 'Проверяем новый проект',
  applySetup: 'Подготавливаем проект', refreshSetup: 'Проверяем папку',
  archiveProject: 'Архивируем проект', archiveSession: 'Архивируем сессию',
  openArchive: 'Открываем архив', restore: 'Восстанавливаем проекты', restoreSessions: 'Восстанавливаем сессии',
  forget: 'Убираем проекты из списка', deleteSessions: 'Удаляем локальные сессии',
  previewDelete: 'Проверяем содержимое папки', deleteProject: 'Удаляем проект с диска',
  recoverDeletions: 'Завершаем очистку', setTheme: 'Меняем оформление',
  setHideToolCalls: 'Обновляем отображение', copyWorkspacePath: 'Копируем путь', copyExternalClientLine: 'Копируем строку',
  closeSettings: 'Закрываем настройки', cancelSetup: 'Завершаем подготовку',
  cancelDelete: 'Отменяем удаление', beginCreate: 'Открываем создание проекта',
  setExpanded: 'Обновляем список сессий', setFirstSessionExperience: 'Выбираем тип сессии',
};
const phaseLabels = {
  preparing: 'Проверяем подключение и службы', 'loading-context': 'Подготавливаем контекст',
  'preparing-message': 'Вставляем контекст в сообщение', sending: 'Отправляем контекст',
  'waiting-generation': 'Ждём завершения ответа ChatGPT',
};
const phaseLabel = context => phaseLabels[context?.phase];
export function operationLabel(state = {}, action = null) {
  if(state.execution?.phase==='preparing')return 'Подготавливаем worktree и чат исполнителя';
  if(state.execution?.phase==='merging')return 'Проверяем и сливаем результат в main';
  if (['repairing','verifying','services'].includes(state.doctor?.phase)) return 'Доктор проекта: проверка и восстановление';
  if (state.setup?.phase === 'checking') return 'Проверяем папку проекта';
  if (state.setup?.phase === 'applying') return 'Подготавливаем проект';
  if (state.startup?.active) return state.startup.busy ? (state.startup.phase === 'preparing' ? 'Готовим компоненты на компьютере' : state.startup.phase === 'configuring' ? 'Настраиваем подключение' : 'Проверяем готовность') : null;
  if (state.pageLoading) return 'Открываем ChatGPT';
  if (action && phaseLabel(state.context) && !state.context?.error) return phaseLabel(state.context);
  if (action) return actionLabels[action] ?? null; // Native file dialogs already show what they await.
  if (state.startupError || state.context?.error || state.setup || state.settings) return null;
  if (['waiting-login','waiting-draft','waiting-composer','prepared-stale','error','chat-changed','waiting-chat','send-unknown'].includes(state.context?.phase)) return null;
  if (phaseLabel(state.context)) return phaseLabel(state.context);
  if (state.contextPreparation?.busy) return 'Подготавливаем контекст заранее';
  return null;
}
export function createProgress(element, { now = Date.now, schedule = setInterval, cancel = clearInterval } = {}) {
  const document = element.ownerDocument;
  const spinner = document.createElement('span'); spinner.className = 'operation-spinner'; spinner.setAttribute('aria-hidden','true');
  const label = document.createElement('span'); label.className = 'operation-label';
  const elapsed = document.createElement('span'); elapsed.className = 'operation-elapsed'; elapsed.setAttribute('aria-hidden','true');
  element.replaceChildren(spinner,label,elapsed); element.hidden = true;
  let current = null, started = 0, timer = null;
  const update = () => { elapsed.textContent = Math.floor((now()-started)/1000) + ' с'; };
  return {
    show(text) {
      if (text === current) return;
      current = text || null;
      if (timer !== null) cancel(timer);
      timer = null; element.hidden = !current;
      if (!current) { label.textContent = ''; elapsed.textContent = ''; return; }
      label.textContent = current; started = now(); update();
      timer = schedule(update,1000);
    },
    destroy() { if (timer !== null) cancel(timer); timer = null; current = null; element.hidden = true; },
  };
}
