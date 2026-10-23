import {startupView} from '../../../contracts/startup-view.mjs';
const actionLabels = {
  runDoctor: 'Проверяем и восстанавливаем проект', continueDoctor: 'Возвращаемся к работе', reviewDoctorProject: 'Проверяем папку',
  newSession: 'Создаём сессию', chooseOption: 'Передаём ваш выбор',
  reload: 'Обновляем ChatGPT', retry: 'Обновляем контекст', returnToChat: 'Возвращаемся к чату',
  previewNew: 'Проверяем новый проект',
  applySetup: 'Подготавливаем проект', refreshSetup: 'Проверяем папку',
  archiveProject: 'Архивируем проект', archiveSession: 'Архивируем сессию',
  openArchive: 'Открываем архив', restore: 'Восстанавливаем проекты', restoreSessions: 'Восстанавливаем сессии',
  forget: 'Убираем проекты из списка', deleteSessions: 'Удаляем локальные сессии',
  previewDelete: 'Проверяем содержимое папки', deleteProject: 'Удаляем проект с диска',
  recoverDeletions: 'Завершаем очистку',
  cancelSetup: 'Завершаем подготовку', cancelDelete: 'Отменяем удаление',
};
// Selecting a project or session, loading its ChatGPT page and other instant UI
// steps show no notice: the chat pane itself shows the page, and a notice would
// only shift the sidebar.
const phaseLabels = {
  preparing: 'Проверяем подключение и службы', 'loading-context': 'Подготавливаем контекст',
  'preparing-message': 'Вставляем контекст в сообщение', sending: 'Отправляем контекст',
  'waiting-attachments': 'Ожидаем обработку вложений ChatGPT',
  'waiting-generation': 'Ждём завершения ответа ChatGPT',
};
const phaseLabel = context => phaseLabels[context?.phase];
export function operationLabel(state = {}, action = null) {
  if(state.context?.startup||['startup-channel','startup-complete','startup-failed'].includes(state.context?.phase)){
    const view=startupView(state.context.startup);
    return ['startup-ready','startup-stale','startup-failed','startup-uncertain'].includes(view.phase)?null:view.title;
  }
  if(state.execution?.phase==='preparing')return 'Подготавливаем worktree и чат исполнителя';
  if(state.execution?.phase==='merging')return 'Проверяем и сливаем результат в main';
  if (['repairing','verifying','services'].includes(state.doctor?.phase)) return 'Доктор проекта: проверка и восстановление';
  if (state.setup?.phase === 'checking') return 'Проверяем папку проекта';
  if (state.setup?.phase === 'applying') return 'Подготавливаем проект';
  if (state.startup?.active) return state.startup.busy ? (state.startup.phase === 'preparing' ? 'Готовим компоненты на компьютере' : state.startup.phase === 'configuring' ? 'Настраиваем подключение' : 'Проверяем готовность') : null;
  if (action && phaseLabel(state.context) && !state.context?.error) return phaseLabel(state.context);
  if (action) return actionLabels[action] ?? null; // Native file dialogs already show what they await.
  if (state.startupError || state.context?.error || state.setup || state.settings) return null;
  if (['waiting-login','waiting-draft','waiting-composer','prepared-stale','error','chat-changed','waiting-chat','send-unknown'].includes(state.context?.phase)) return null;
  if (phaseLabel(state.context)) return phaseLabel(state.context);
  if (state.contextPreparation?.busy) return 'Подготавливаем контекст заранее';
  return null;
}
// A notice appears only when an operation outlasts `delay`, so short steps never
// flash a line nobody can read and never move the sidebar.
export function createProgress(element, { now = Date.now, schedule = setInterval, cancel = clearInterval,
  defer = setTimeout, undefer = clearTimeout, delay = 1000 } = {}) {
  const document = element.ownerDocument;
  const spinner = document.createElement('span'); spinner.className = 'operation-spinner'; spinner.setAttribute('aria-hidden','true');
  const label = document.createElement('span'); label.className = 'operation-label';
  const elapsed = document.createElement('span'); elapsed.className = 'operation-elapsed'; elapsed.setAttribute('aria-hidden','true');
  element.replaceChildren(spinner,label,elapsed); element.hidden = true;
  let current = null, started = 0, timer = null, pending = null;
  const update = () => { elapsed.textContent = Math.floor((now()-started)/1000) + ' с'; };
  const stop = () => {
    if (timer !== null) cancel(timer);
    if (pending !== null) undefer(pending);
    timer = null; pending = null;
  };
  const reveal = () => { pending = null; element.hidden = false; update(); timer = schedule(update,1000); };
  return {
    show(text) {
      if ((text || null) === current) return;
      const shown = current !== null && !element.hidden;
      current = text || null; stop();
      if (!current) { element.hidden = true; label.textContent = ''; elapsed.textContent = ''; return; }
      label.textContent = current; started = now();
      // A stage change of an already visible operation stays visible.
      if (shown || delay <= 0) reveal(); else { element.hidden = true; pending = defer(reveal, delay); }
    },
    destroy() { stop(); current = null; element.hidden = true; },
  };
}
