import { createProgress, operationLabel } from './progress.mjs';
import { settingsPanelView } from './settings-panel.mjs';
import { workspaceSetupView } from './workspace-setup.mjs';
import {startupView} from '../../../contracts/startup-view.mjs';
import {paletteCss,spinnerCss} from '../../../contracts/palette.mjs';
import {roleActor,participantName} from '../../../contracts/work-progress.mjs';
const $ = id => document.getElementById(id);
// The shared palette of the sidebar and the panel; an inline style is within the page CSP.
const paletteStyle=document.createElement('style');paletteStyle.id='wp-palette';
paletteStyle.textContent=paletteCss()+spinnerCss;document.head.append(paletteStyle);
const api = window.webPilot;
let lastProjects = '';
let currentState;
$('workspace-details').before($('review-preference'));
let actionPending = false, pendingAction = null, actionGeneration = 0, planFocusKey = '';
const navigationActions = new Set(['selectWorkspace', 'selectSession', 'reload', 'returnToChat']);
const progress = createProgress($('operation-progress'));
window.addEventListener('pagehide', () => progress.destroy());
const sessionScroll = new Map();
const renameDialog = $('rename-dialog');
const renameInput = $('rename-dialog-input');
const renameDialogTitle = $('rename-dialog-title');
const renameDialogLabel = $('rename-dialog-label');
const renameSave = $('rename-dialog-save');
const renameCancel = $('rename-dialog-cancel');
let renameRequest = null, renameSaving = false;

function openRenameDialog({ kind, workspace, sessionId = null, value }) {
  closeTreeMenus();
  renameRequest = { kind, workspace, sessionId };
  renameDialogTitle.textContent = kind === 'session' ? 'Переименовать сессию' : 'Переименовать проект';
  renameDialogLabel.textContent = kind === 'session' ? 'Название сессии' : 'Название проекта в Web Pilot';
  renameInput.value = value ?? '';
  renameSave.disabled = false; renameCancel.disabled = false; renameSaving = false;
  renameDialog.showModal();
  requestAnimationFrame(() => { renameInput.focus(); renameInput.select(); });
}

function closeRenameDialog() {
  if (renameDialog.open) renameDialog.close();
  renameRequest = null; renameSaving = false; renameSave.disabled = false; renameCancel.disabled = false;
}

async function submitRenameDialog() {
  if (!renameRequest || renameSaving) return;
  const value = renameInput.value.trim();
  if (!value) { renameInput.setCustomValidity('Введите название.'); renameInput.reportValidity(); return; }
  renameInput.setCustomValidity(''); renameSaving = true; renameSave.disabled = true; renameCancel.disabled = true;
  try {
    const response = renameRequest.kind === 'session'
      ? await api.renameSession(renameRequest.workspace, renameRequest.sessionId, value)
      : await api.renameProject(renameRequest.workspace, value);
    if (!response?.ok) throw new Error(response?.error?.message || 'Не удалось переименовать.');
    if (response.state) render(response.state);
    closeRenameDialog();
  } catch (error) {
    $('error-banner').hidden = false; $('error-banner').textContent = error.message;
    renameSaving = false; renameSave.disabled = false; renameCancel.disabled = false; renameInput.focus();
  }
}

renameSave.addEventListener('click', submitRenameDialog);
renameCancel.addEventListener('click', closeRenameDialog);
renameDialog.addEventListener('cancel', event => { event.preventDefault(); closeRenameDialog(); });
renameInput.addEventListener('input', () => renameInput.setCustomValidity(''));
renameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); void submitRenameDialog(); }
  if (event.key === 'Escape') { event.preventDefault(); closeRenameDialog(); }
});

function treeIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tree-icon'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `#tree-${name}`); svg.append(use);
  return svg;
}
function closeTreeMenus() {
  for (const menu of document.querySelectorAll('.project-menu:popover-open, .session-menu:popover-open')) menu.hidePopover();
}
function bindTreeMenu(button, menu, label) {
  menu.setAttribute('popover', 'auto'); menu.setAttribute('aria-label', label);
  button.setAttribute('aria-label', label); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-haspopup', 'true');
  menu.addEventListener('toggle', event => button.setAttribute('aria-expanded', String(event.newState === 'open')));
  button.addEventListener('click', () => {
    if (menu.matches(':popover-open')) { menu.hidePopover(); return; }
    $('project-actions').open = false;
    menu.showPopover();
    const rect = button.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
    menu.style.top = `${Math.max(8, rect.bottom + menu.offsetHeight + 14 <= innerHeight ? rect.bottom + 6 : rect.top - menu.offsetHeight - 6)}px`;
  });
}
document.addEventListener('click', event => { if (!$('project-actions').contains(event.target)) $('project-actions').open = false; });
document.addEventListener('keydown', event => { if (event.key === 'Escape') $('project-actions').open = false; });
document.addEventListener('scroll', event => { if (!event.target.closest?.('[popover]')) closeTreeMenus(); }, true);
window.addEventListener('resize', closeTreeMenus);
$('project-actions').addEventListener('toggle', () => { if ($('project-actions').open) {closeTreeMenus();$('project-search').focus();} });
$('toggle-projects').addEventListener('click', async () => {
  if (actionPending || !currentState) return;
  const root=currentState.selected?.parentWorkspace??currentState.selected?.workspace;
  const project=currentState.projects.find(p=>p.workspace===root);
  if(project)await action('setExpanded',project.workspace,!project.expanded);
});
// Archive needs neither the project's folder nor its selection; an active orchestrated
// plan is stopped only after the user confirms it.
function archiveProject(project) {
  return action('archiveProject', project.workspace);
}
let pickerSignature='';
function renderProjectChoices(state) {
  const selected=state.selected?.parentWorkspace??state.selected?.workspace,query=$('project-search').value.trim().toLocaleLowerCase();
  const signature=JSON.stringify([state.projects.map(p=>[p.workspace,p.name,p.activity]),selected,query]);
  if(signature===pickerSignature)return;
  pickerSignature=signature;
  const focused=document.activeElement?.dataset?.projectChoice;
  const choices=state.projects.filter(p=>(p.name+' '+p.workspace).toLocaleLowerCase().includes(query));
  $('project-options').replaceChildren(...choices.map(project=>{
    const button=document.createElement('button');button.type='button';button.dataset.projectChoice=project.workspace;
    button.title=project.workspace;
    if(project.workspace===selected)button.setAttribute('aria-current','page');
    const title=document.createElement('span');title.textContent=project.name;
    const status=document.createElement('small');
    status.textContent=[project.workspace===selected?'Выбран':null,project.activity==='working'?'Работает в фоне':project.activity==='attention'?'Требует внимания':null].filter(Boolean).join(' · ');
    button.append(title);if(status.textContent)button.append(status);
    button.addEventListener('click',()=>{$('project-actions').open=false;action('selectWorkspace',project.workspace);});
    // A project whose folder is gone cannot be selected, so its record is archived from here.
    const archive=document.createElement('button');archive.type='button';archive.className='project-choice-archive';
    archive.textContent='В архив';archive.title='Перенести в архив';archive.setAttribute('aria-label','Перенести в архив: '+project.name);
    archive.addEventListener('click',()=>{$('project-actions').open=false;
      archiveProject(currentState?.projects.find(p=>p.workspace===project.workspace)??project);});
    const row=document.createElement('div');row.className='project-choice';row.append(button,archive);
    return row;
  }));
  $('project-search-empty').hidden=choices.length>0;
  if(focused)[...$('project-options').children].find(b=>b.dataset.projectChoice===focused)?.focus();
}
$('project-search').addEventListener('input',()=>{if(currentState)renderProjectChoices(currentState);});
$('project-archive').addEventListener('click',()=>{$('project-actions').open=false;action('openArchive');});
$('project-actions').addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp','Escape'].includes(event.key))return;
  if(event.key==='Escape'){$('project-actions').open=false;$('project-actions').querySelector('summary').focus();return;}
  const choices=[...$('project-options').querySelectorAll('[data-project-choice]')];if(!choices.length)return;
  event.preventDefault();const position=choices.indexOf(document.activeElement),direction=event.key==='ArrowDown'?1:-1;
  choices[(position+direction+choices.length)%choices.length].focus();
});

const phases = {
  selected: ['Готов к началу', 'Войдите в ChatGPT справа и выберите папку проекта слева.', 'neutral'],
  preparing: ['Подготавливаем подключение', 'Проверяем локальные инструменты и связь с ChatGPT.', 'working'],
  'loading-context': ['Получаем контекст проекта', 'Готовим полный пакет для первого сообщения.', 'working'],
  'waiting-login': ['Войдите в ChatGPT', 'После входа Web Pilot продолжит автоматически.', 'working'],
  'waiting-composer': ['Ожидаем поле сообщения', 'Откройте доступное поле ChatGPT. Старт продолжится автоматически.', 'working'],
  'waiting-draft': ['В поле есть черновик', 'Закончите или уберите свой черновик. Стартовое сообщение подождёт.', 'working'],
  'waiting-generation': ['Ждём завершения ответа', 'ChatGPT отвечает. Передача контекста начнётся, когда поле освободится.', 'working'],
  'preparing-message': ['Вставляем контекст', 'Передаём подготовленный пакет редактору ChatGPT.', 'working'],
  'waiting-attachments': ['Ожидаем обработку вложений ChatGPT', 'Сообщение будет отправлено после готовности всех частей.', 'working'],
  'preparation-paused': ['Подготовка отменена', 'Текст и вложения сохранены. Можно повторить подготовку или создать новую сессию.', 'attention'],
  sending: ['Открываем панель', 'Запускаем короткую команду открытия панели. Контекст поступит через неё.', 'working'],
  'waiting-registration':['Ожидаем регистрацию панели','Команда запущена. Повторной отправки нет.','working'],
  'cancel-pending':['Завершаем отмену запуска','Отзыв приглашения ещё не подтверждён. Новый запуск этой попытки запрещён.','attention'],
  'startup-cancelled':['Запуск остановлен','Создайте новый Chat через меню проекта. Повторной отправки нет.','neutral'],
  'waiting-chat': ['Контекст отправлен', 'Можно продолжать разговор. Адрес чата сохранится при его появлении.', 'success'],
  delivered: ['Контекст передан', 'Полный пакет отправлен в этот чат. Агент кратко подтвердит получение и опишет проект.', 'success'],
  stale: ['Разговор сохранён', 'План изменился. Новый стартовый пакет доступен в новой сессии.', 'neutral'],
  'prepared-stale': ['Пакет в поле устарел', 'Уберите подготовленный черновик и повторите подготовку. Отправка приостановлена.', 'working'],
  'manual-session': ['Разговор сохранён', 'Для полного стартового пакета создайте новую сессию.', 'neutral'],
  'waiting-manual-chat':['Ручной разговор','Ожидаем постоянный адрес этого разговора. Автоматическая команда панели не отправляется.','neutral'],
  'legacy-session': ['Сохранённый чат проекта', 'Для полного стартового пакета создайте новую сессию.', 'neutral'],
  'send-unknown': ['Исход отправки неизвестен', 'Проверьте сообщения в этом чате. Повторной отправки нет; для нового полного пакета создайте новую сессию.', 'neutral'],
  'chat-changed': ['Открыт другой чат', 'Этот чат пока не связан с проектом. Вернитесь к сессии проекта или создайте новую через меню проекта.', 'working'],
  error: ['Не удалось подготовить сессию', 'После исправления причины повторите подготовку.', 'error'],
};

const setupView = workspaceSetupView(action);
const settingsView = settingsPanelView(action);

const splitter = $('sidebar-splitter');
let splitterDrag = null, resizeFrame = 0, requestedSidebarWidth = null;
function requestSidebarWidth(width) {
  requestedSidebarWidth = width;
  if (resizeFrame) return;
  resizeFrame = requestAnimationFrame(async () => {
    resizeFrame = 0;
    const value = requestedSidebarWidth; requestedSidebarWidth = null;
    try {
      const result = await api.setSidebarWidth(value);
      if (result?.state) render(result.state);
    } catch (error) { $('error-banner').hidden = false; $('error-banner').textContent = error.message; }
  });
}
splitter.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  splitterDrag = { pointerId: event.pointerId, startX: event.screenX, startWidth: currentState?.sidebarWidth ?? 312 };
  splitter.classList.add('dragging');
  try { splitter.setPointerCapture(event.pointerId); } catch {}
  event.preventDefault();
});
splitter.addEventListener('pointermove', event => {
  if (!splitterDrag || event.pointerId !== splitterDrag.pointerId) return;
  requestSidebarWidth(splitterDrag.startWidth + event.screenX - splitterDrag.startX);
});
function finishSplitter(event) {
  if (!splitterDrag || event.pointerId !== splitterDrag.pointerId) return;
  requestSidebarWidth(splitterDrag.startWidth + event.screenX - splitterDrag.startX);
  splitterDrag = null; splitter.classList.remove('dragging');
}
splitter.addEventListener('pointerup', finishSplitter);
splitter.addEventListener('pointercancel', finishSplitter);
splitter.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault(); requestSidebarWidth((currentState?.sidebarWidth ?? 312) + (event.key === 'ArrowRight' ? 24 : -24));
});

async function action(method, ...args) {
  if (actionPending) return;
  closeTreeMenus();
  $('project-actions').open = false;
  if (['selectWorkspace', 'newSession'].includes(method)) {
    sessionScroll.set(args[0], 0);
    for (const list of $('projects').querySelectorAll('.sessions')) if (list.dataset.workspace === args[0]) list.scrollTop = 0;
  }
  const generation = ++actionGeneration, navigation = navigationActions.has(method);
  if (!navigation) { actionPending = true; pendingAction = method; }
  render(currentState);
  try {
    let result = await api[method](...args);
    if(method==='archiveProject'&&result?.error?.code==='PLAN_ACTIVE'&&!args[1]?.stopExecution){
      if(window.confirm('У проекта есть незавершённое выполнение плана. Перенести проект в архив? Выполнение плана будет остановлено; план и работа исполнителей сохранятся.')){
        result=await api.archiveProject(args[0],{stopExecution:true});
      }
    }
    if (generation === actionGeneration && result?.state) render(result.state);
  } catch (error) {
    if (generation === actionGeneration) {
      $('error-banner').hidden = false;
      $('error-banner').textContent = error.message;
    }
  } finally {
    if (!navigation) { actionPending = false; pendingAction = null; }
    if (generation === actionGeneration) render(currentState);
  }
}

// Elapsed time on the current stage of a task, measured by the backend and ticking here.
let elapsedTicker = null;
const agentClock = ms => { const seconds = Math.max(0, Math.floor(ms / 1000)); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'); };
function kitUpgradeNeeded(health) {
  return health?.phase === 'error' && health.action === 'upgrade' && !health.error && !health.issues?.length;
}

// Executors of a legacy parallel plan keep their accumulated work and wait time in the tree.
let executorTicker = null;
const pairClock = ms => { const seconds = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0'); };
const spokenClock = ms => { const seconds = Math.max(0, Math.floor(ms / 1000)); return Math.floor(seconds / 60) + ' мин ' + seconds % 60 + ' с'; };
function renderExecutorTimes() {
  clearInterval(executorTicker);executorTicker=null;
  const nodes=[...document.querySelectorAll('[data-executor-time]')];
  const paint=()=>{for(const node of nodes) {
    const time=node.executorTime??{},delta=Math.max(0,Date.now()-(time.asOf??Date.now()));
    const active=(time.activeMs??0)+(time.phase==='working'?delta:0),waiting=(time.waitingMs??0)+(time.phase==='waiting'?delta:0);
    node.textContent='Работа '+pairClock(active)+' · ожидание '+pairClock(waiting);
    node.setAttribute('aria-label','Наблюдаемая работа '+spokenClock(active)+', ожидание '+spokenClock(waiting));
  }};
  paint();if(nodes.some(node=>['working','waiting'].includes(node.executorTime?.phase)))executorTicker=setInterval(paint,1000);
}

function renderElapsedTimes() {
  clearInterval(elapsedTicker);elapsedTicker=null;
  const nodes=[...document.querySelectorAll('[data-elapsed]')],received=performance.now();
  const paint=()=>{for(const node of nodes){
    node.textContent=agentClock(Number(node.dataset.elapsed)+performance.now()-received);
    node.title='Время на текущей стадии по наблюдению службы; после перезапуска отсчёт начинается заново.';
  }};
  paint();if(nodes.length)elapsedTicker=setInterval(paint,1000);
}

function render(state) {
  progress.show(operationLabel(state ?? {}, pendingAction));
  if (!state) return;
  $('prototype-version').textContent = state.version ?? '';
  renderProjectChoices(state);
  for (const list of $('projects').querySelectorAll('.sessions')) {
    if (!list.closest('[hidden]')) sessionScroll.set(list.dataset.workspace, list.scrollTop);
  }
  const previousProjects = currentState?.projects ?? [];
  currentState = state;
  splitter.setAttribute('aria-valuemin', String(state.sidebarMinWidth ?? 312));
  splitter.setAttribute('aria-valuenow', String(state.sidebarWidth ?? 312));
  const selected = state.selected;
  const context = state.context;
  const signature = JSON.stringify([state.projects, selected?.workspace, selected?.sessionId]);
  if (signature !== lastProjects) {
    lastProjects = signature;
    const outerScroll = $('projects').scrollTop;
    const executorDisclosure=new Map([...$('projects').querySelectorAll('[data-executor-group]')].map(node=>[node.dataset.executorGroup,node.open]));
    const oldProject = previousProjects.find(project => project.workspace === selected?.workspace);
    if (selected && !oldProject?.sessions.some(session => session.sessionId === selected.sessionId)) sessionScroll.set(selected.workspace, 0);
    closeTreeMenus();
    const fragment = document.createDocumentFragment();
    const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    for (const project of state.projects.filter(p=>p.workspace===(selected?.parentWorkspace??selected?.workspace))) {
      const item = document.createElement('li'); item.className = 'workspace-tree';
      const activeProject = project.workspace === (selected?.parentWorkspace??selected?.workspace);
      const row = document.createElement('div'); row.className = 'workspace-row' + (activeProject ? ' active' : '');
      const toggle = () => action('setExpanded', project.workspace, !project.expanded);
      const arrow = document.createElement('button'); arrow.className = 'expand-project';
      arrow.append(treeIcon('chevron-right'));
      arrow.setAttribute('aria-label', `${project.expanded ? 'Свернуть' : 'Раскрыть'} сессии ${project.name}`);
      arrow.setAttribute('aria-expanded', String(project.expanded));
      arrow.addEventListener('click', toggle);
      const button = document.createElement('button');
      button.className = 'project' + (activeProject ? ' active' : '');
      button.dataset.workspace = project.workspace;
      button.setAttribute('aria-pressed', String(activeProject));
      button.setAttribute('aria-expanded', String(project.expanded));
      button.title = `${project.workspace}\nОткрыть последнюю сессию`;
      const label = document.createElement('span'); label.className = 'project-copy';
      const name = document.createElement('strong'); name.textContent = project.name;
      const caption = document.createElement('small');
      const count = project.sessions.length;
      caption.textContent = `${count} ${count % 10 === 1 && count % 100 !== 11 ? 'сессия' : count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14) ? 'сессии' : 'сессий'}`;
      label.append(name, caption); button.append(treeIcon(project.expanded ? 'folder-open' : 'folder'), label);
      button.addEventListener('click', () => action('selectWorkspace', project.workspace));
      button.addEventListener('keydown', event => {
        if ((event.key === 'ArrowRight' && !project.expanded) || (event.key === 'ArrowLeft' && project.expanded)) { event.preventDefault(); toggle(); }
      });
      const menuButton = document.createElement('button'); menuButton.className = 'icon-button project-menu-button'; menuButton.append(treeIcon('ellipsis'));
      const menu = document.createElement('div'); menu.className = 'project-menu';
      bindTreeMenu(menuButton, menu, `Меню проекта ${project.name}`);
      const menuAction = (className, text, handler) => {
        const control = document.createElement('button'); control.className = `secondary ${className}`; control.textContent = text;
        control.addEventListener('click', () => { closeTreeMenus(); handler(); });
        menu.append(control);
      };
      menuAction('new-project-chat', 'Новый Chat', () => action('newSession', project.workspace));
      const separator = document.createElement('div'); separator.className = 'menu-separator'; separator.setAttribute('aria-hidden', 'true'); menu.append(separator);
      menuAction('rename-project', 'Переименовать', () => openRenameDialog({
        kind: 'project', workspace: project.workspace, value: project.name,
      }));
      menuAction('copy-workspace-path', 'Скопировать полный путь', () => action('copyWorkspacePath', project.workspace));
      menuAction('copy-external-client-line', 'Скопировать строку для внешнего клиента', () => action('copyExternalClientLine', project.workspace));
      menuAction('archive-project', 'Перенести в архив', () => archiveProject(project));
      row.append(arrow, button, menuButton); item.append(row, menu);
      const sessions = document.createElement('ul'); sessions.className = 'sessions'; sessions.hidden = !project.expanded;
      sessions.dataset.workspace = project.workspace;
      sessions.setAttribute('aria-label', `Сессии ${project.name}, новые сверху`);
      sessions.tabIndex = 0;
      sessions.addEventListener('scroll', () => {
        if (sessions.isConnected && !sessions.closest('[hidden]')) sessionScroll.set(project.workspace, sessions.scrollTop);
      }, { passive: true });
      for (const session of project.sessions) {
        const entry = document.createElement('li');
        const row = document.createElement('div'); row.className = 'session-row';
        const choice = document.createElement('button');
        const active = activeProject && selected?.sessionId === session.sessionId;
        choice.className = 'session' + (active ? ' active' : '');
        choice.dataset.sessionId = session.sessionId; choice.dataset.workspace = project.workspace; choice.dataset.role = session.role ?? '';
        if (active) choice.setAttribute('aria-current', 'page');
        const copy = document.createElement('span'); copy.className = 'session-copy';
        const title = document.createElement('strong'); title.textContent = session.title || 'Новая сессия';
        // One compact line: date, role and plan progress; the plan stage lives in the plan card and the panel.
        const meta = document.createElement('small'); meta.className = 'session-meta';
        const date = document.createElement('span'); date.className = 'session-date';
        date.textContent = dateFormat.format(new Date(session.createdAt)) + (session.chatUrl || session.external ? '' : ' · новая');
        meta.append(date);
        // The tree shows orchestrators and discussion chats; the tasks of a plan live in its to-do plan.
        if (['orchestrator', 'planning', 'self', 'discussion'].includes(session.role)) {
          const role = document.createElement('span'); role.className = 'session-role'; role.dataset.role = session.role;
          role.dataset.state = '';
          // With an older Kit a candidate becomes the orchestrator only when the user gives it the first task.
          const candidate = session.role === 'orchestrator' && !session.orchestratorScopeId && !session.planningOwner;
          role.textContent = participantName(candidate?'S':roleActor(session.role));
          meta.append(role);
        }
        copy.append(title, meta);
        const experience = document.createElement('span'); experience.className = 'session-experience'; experience.dataset.experience = 'chat'; experience.textContent = session.external ? 'ChatGPT ↗' : 'Chat';
        choice.title = `${session.title || 'Новая сессия'} · ${experience.textContent}\n${new Date(session.createdAt).toLocaleString('ru-RU')}`;
        choice.append(copy, experience);
        choice.addEventListener('click', () => action('selectSession', project.workspace, session.sessionId));
        const menuButton = document.createElement('button'); menuButton.className = 'icon-button session-menu-button'; menuButton.append(treeIcon('ellipsis'));
        const menu = document.createElement('div'); menu.className = 'session-menu';
        bindTreeMenu(menuButton, menu, `Меню сессии ${session.title || 'Новая сессия'}`);
        const rename = document.createElement('button'); rename.className = 'secondary rename-session'; rename.textContent = 'Переименовать';
        rename.addEventListener('click', () => openRenameDialog({
          kind: 'session', workspace: project.workspace, sessionId: session.sessionId, value: session.title || 'Новая сессия',
        }));
        const archive = document.createElement('button'); archive.className = 'secondary archive-session'; archive.textContent = 'Перенести в архив';
        archive.addEventListener('click', () => { closeTreeMenus(); action('archiveSession', project.workspace, session.sessionId); });
        menu.append(rename, archive);
        const transferable = project.planningOwnerSessionId && session.sessionId !== project.planningOwnerSessionId && !session.closedPlanCommit;
        if ((project.orchestrationIssue && session.role !== 'orchestrator' || transferable) && !session.external) {
          const assign = document.createElement('button'); assign.className = 'secondary assign-orchestrator'; assign.textContent = 'Назначить оркестратором';
          assign.addEventListener('click', () => { closeTreeMenus(); action('assignOrchestrator', session.sessionId); });
          menu.append(assign);
        }
        row.append(choice, menuButton); entry.append(row, menu); sessions.append(entry);
      }
      item.append(sessions);
      // Executors of an orchestrated plan open from its to-do plan; the group remains for legacy parallel plans.
      const orchestratedScopes=new Set(project.sessions.filter(s=>s.role==='orchestrator'&&s.orchestratorScopeId).map(s=>s.orchestratorScopeId));
      const legacyExecutors=(project.executors??[]).filter(executor=>!orchestratedScopes.has(executor.parentScopeId));
      const origins=[...new Set(legacyExecutors.map(executor=>executor.originSessionId))];
      for(const origin of origins) {
        const group=document.createElement('details');group.className='executor-group';group.hidden=!project.expanded;
        group.dataset.executorGroup=project.workspace+'\n'+origin;
        group.open=executorDisclosure.get(group.dataset.executorGroup)??true;
        const heading=document.createElement('summary');
        const source=project.sessions.find(session=>session.sessionId===origin);
        heading.textContent='Исполнители · '+(source?.title||'основная сессия');group.append(heading);
        const list=document.createElement('ul');list.className='executor-list';list.setAttribute('aria-label','Исполнители основной сессии');
        for(const executor of legacyExecutors.filter(entry=>entry.originSessionId===origin)) {
          const row=document.createElement('li'),choice=document.createElement('button');choice.className='executor-row';
          choice.dataset.sessionId=executor.sessionId;choice.dataset.phase=executor.phase;
          if(executor.sessionId===selected?.sessionId)choice.setAttribute('aria-current','page');
          const name=document.createElement('strong');name.textContent=executor.title||executor.taskId;
          const caption=document.createElement('span');caption.textContent=executor.taskId+' · worktree · '+'Chat';
          const status=document.createElement('span');status.className='executor-status';status.textContent=executor.label+(executor.attempt>1?' · попытка '+executor.attempt:'');
          const time=document.createElement('span');time.dataset.executorTime=executor.sessionId;time.executorTime=executor.time;
          choice.title=executor.workspace;choice.append(name,caption,status,time);
          choice.addEventListener('click',()=>action('selectSession',executor.workspace,executor.sessionId));
          row.append(choice);list.append(row);
        }
        group.append(list);item.append(group);
      }
      fragment.append(item);
    }
    if (!selected) {
      const empty = document.createElement('li'); empty.className = 'empty';
      empty.textContent = 'Откройте меню «Ваши проекты», чтобы создать проект или выбрать его папку.'; fragment.append(empty);
    }
    $('projects').replaceChildren(fragment);
    $('projects').scrollTop = outerScroll;
    for (const workspace of sessionScroll.keys()) if (!state.projects.some(project => project.workspace === workspace)) sessionScroll.delete(workspace);
  }
  const collapseAll = state.projects.some(project => project.workspace===(selected?.parentWorkspace??selected?.workspace)&&project.expanded);
  $('toggle-projects').title = collapseAll ? 'Свернуть сессии проекта' : 'Раскрыть сессии проекта';
  $('toggle-projects').setAttribute('aria-label', $('toggle-projects').title);
  // An executor of an orchestrated plan keeps the plan card: the to-do plan marks the task shown on the right.
  const planExecutor = !!selected?.assignmentId && !!state.orchestratorPlan;
  $('plan-card').hidden = !selected || (!selected.scopeId&&!state.orchestratorPlan?.scopeId&&!state.workProgress?.total) || (!!selected.assignmentId && !planExecutor);
  $('assignment-card').hidden = !selected?.assignmentId || planExecutor;
  const assigned = selected?.assignmentId && state.projects.flatMap(project => project.executors ?? [])
    .find(item => item.assignmentId === selected.assignmentId && item.workspace === selected.workspace);
  $('assignment-title').textContent = assigned?.title ?? selected?.taskId ?? '';
  $('assignment-status').textContent = assigned?.label ?? 'Состояние назначения ещё не подтверждено.';
  const execution=state.execution??{};
  const work=state.workProgress??null;
  // Unknown command outcomes keep their acknowledgement; they live in the problem block.
  const commandIssues=$('command-issues');
  commandIssues.replaceChildren();
  for(const command of execution.commands??[])if(command.state==='unknown'||command.state==='acknowledged_unknown') {
    const line=document.createElement('p');line.className='description';
    line.textContent=command.reason+' · '+command.id;commandIssues.append(line);
    if(command.canAcknowledge) {
      const button=document.createElement('button');button.className='secondary';button.textContent='Разобрать неизвестный исход';
      button.addEventListener('click',()=>action('acknowledgeCommand',{workspace:command.workspace,projectId:command.projectId,id:command.id,digest:command.digest}));
      commandIssues.append(button);
    }
  }
  const parallel=selected?.planExecution?.execution_strategy==='parallel'||(!!selected?.assignmentId&&!planExecutor);
  const orchestrated=state.orchestratorPlan;
  const run = state.planRun;
  const runLabels = { 'not-started': 'Начать выполнение плана', running: 'Пауза', pausing: 'Пауза…', paused: 'Продолжить' };
  $('plan-run-toggle').hidden = !run || run.state === 'complete' || run.complete;
  $('plan-run-toggle').textContent = runLabels[run?.state] ?? '';
  $('plan-run-toggle').dataset.state = run?.state ?? '';
  // A held project keeps the button: pressing it runs the standard Kit recheck.
  $('plan-run-toggle').disabled = actionPending || run?.state === 'pausing' || !!run?.issue&&run.reason!=='blocked';
  // Why the plan is held; the stage, the problem block and the acceptance hint say the rest.
  const runReason = run?.issue ? run.reason==='blocked'?'Выполнение приостановлено. '+run.issue.message:run.issue.message??'Оркестратор плана не определён. Назначьте его в меню сессии.'
    : run?.reason === 'recovery' ? 'Автопродолжение отключено после восстановления Kit (не ручная пауза). '+(run.message??'')
    : run?.reason === 'escalation' ? 'Выполнение на паузе: оркестратор передал проблему. ' + (run.message ?? '')
    : run?.reason === 'refused' ? 'Выполнение на паузе. ' + (run.message ?? '') + ' Исправьте причину и нажмите «Продолжить».'
      : run?.reason === 'unknown' ? 'Выполнение на паузе: исход операции неизвестен. ' + (run.message ?? '') : '';
  $('plan-run-message').hidden = !runReason; $('plan-run-message').textContent = runReason.trim();
  const auto = state.planContinuation ?? { phase: 'off', active: false, message: '' };
  const review=state.planReview??{enabled:false,supported:false,message:''};
  $('plan-review-toggle').textContent=review.enabled?'Выключить Review':'Включить Review';
  $('plan-review-toggle').setAttribute('aria-pressed',String(review.enabled));
  $('plan-review-toggle').disabled=actionPending || !review.supported || !!review.error || !!review.lock;
  // The lock reason replaces the default hint while the switch is frozen.
  $('plan-review-toggle').dataset.hint??=$('plan-review-toggle').title;
  $('plan-review-toggle').title=review.lock||$('plan-review-toggle').dataset.hint;
  $('plan-review-message').hidden=!review.message;
  $('plan-review-text').textContent=review.message;
  const reviewIndicator=review.indicator??'none';
  $('plan-review-indicator').hidden=reviewIndicator==='none';
  $('plan-review-indicator').dataset.state=reviewIndicator;
  $('plan-review-indicator').textContent=({success:'✓',attention:'!',waiting:'·'})[reviewIndicator]??'';
  // One plan button and no PlanContinuation switch: a running plan of the former model only reports its progress here.
  const formerRun = !!run && !orchestrated && !parallel && run.state === 'running';
  const autoMessage = formerRun ? auto.message : '';
  const autoSent = formerRun && auto.continuations > 0 ? `Автоматически отправлено «Продолжай» №${auto.continuations}.` : '';
  $('plan-continuation-message').hidden = !autoMessage && !autoSent;
  $('plan-continuation-message').textContent = [autoSent, autoMessage].filter(Boolean).join(' ');
  $('plan-continuation-message').dataset.reason = auto.reason ?? '';
  // A legacy parallel executor keeps its own plan of the main checkout.
  // Before the first projection arrives the card draws the plan views it already has.
  const sourceTasks=orchestrated?orchestrated.tasks:(selected?.planExecution?.execution_strategy==='parallel'?execution.planView:selected?.planView)?.tasks??[];
  const tasks=work?.tasks??sourceTasks.map(task=>({...task,mode:task.executionLabel??null,elapsedMs:task.stageTime?.elapsedMs??null,
    label:task.label??({done:'Выполнена',current:'В работе',pending:'Не начата'})[task.status]}));
  const kitAcceptance=orchestrated?.deliveryStatus==='READY_FOR_ACCEPTANCE'&&orchestrated?.tasks?.length>0&&orchestrated.tasks.every(task=>task.status==='done');
  const planState=orchestrated?(orchestrated.current===false?'closed':kitAcceptance||run?.state==='complete'?'awaiting-acceptance'
    :run?.state==='not-started'?'ready':['paused','pausing'].includes(run?.state)?'paused':'working')
    :selected?.planView?.state??'not-created';
  const stateLabels={working:'Выполнение',ready:'План готов',paused:'Пауза','awaiting-acceptance':'Ждёт приёмки',closed:'План закрыт',
    blocked:'Нужно внимание','not-created':'План ещё не создан'};
  if (selected) {
    const objective=orchestrated?orchestrated.objective:selected.assignmentId?execution.objective:selected.scopeId?selected.objective:'';
    $('plan-title').textContent=work?.title||objective||(orchestrated?'План оркестратора':'');
    $('plan-title').title=objective||'';
    $('plan-title').hidden=!$('plan-title').textContent;
    $('plan-phase-text').textContent=stateLabels[planState]??stateLabels['not-created'];
    $('plan-phase-spinner').hidden=true;
    const total=work?.total??tasks.length,done=work?.done??tasks.filter(t=>t.status==='done').length;
    $('plan-progress').hidden=!total;
    $('plan-bar-fill').style.width=(total?Math.round(done/total*100):0)+'%';
    $('plan-status').textContent=`в main ${done} из ${total}`;
    $('plan-status').dataset.state=planState;
    const acceptance=work?.phase==='Ждёт приёмки'||planState==='awaiting-acceptance';
    $('plan-note').hidden=planState!=='closed'&&!acceptance;
    $('plan-note').textContent=planState==='closed'?'Проект готов к следующему новому плану.'
      :acceptance?'Все задачи зафиксированы Kit; ожидается ваша приёмка. Сообщите '+(orchestrated?'оркестратору':'агенту плана')+': «Принимаю результат, закрой план». Архив проекта не заменяет приёмку.':'';
    // The problem block: only when the user must act or work really stopped.
    const planReason = selected.planReadError?.message ?? selected.planView?.blockedReason ?? orchestrated?.error ?? '';
    $('plan-reason').hidden = !planReason; $('plan-reason').textContent = planReason;
    const attention=work?.attention;
    $('plan-attention-title').textContent=attention?.title??(planReason?'План недоступен':commandIssues.childElementCount?'Исход команды неизвестен':'');
    $('plan-attention-text').textContent=attention?.text??'';
    const issue=attention?.action;
    $('plan-attention-action').hidden=!issue||!['open-session'].includes(issue.kind);
    $('plan-attention-action').textContent=issue?.label??'Открыть чат';
    $('plan-attention-action').onclick=issue?.kind==='open-session'?()=>action('selectSession',issue.workspace,issue.sessionId):null;
    $('plan-attention').hidden=!attention&&!planReason&&!commandIssues.childElementCount;
    const list=$('plan-tasks'),scrollTop=list.scrollTop;
    list.replaceChildren(...tasks.map(task => {
      const item = document.createElement('li'); item.className = 'plan-task'; item.dataset.status = task.status;
      const mark = document.createElement('span'); mark.className = 'plan-task-state'; mark.setAttribute('role', 'img');
      // The mark alone means nothing to a screen reader: its status is spoken as text.
      mark.setAttribute('aria-label', ({done:'влита в main',current:'выполняется',attention:'нужно внимание'})[task.status]??'не начата');
      if(task.status==='current'){const spin=document.createElement('span');spin.className='wp-spin';mark.append(spin);}
      else mark.textContent = ({done:'✓',attention:'!'})[task.status]??'○';
      const body = document.createElement('div'), head=document.createElement('span'), title = document.createElement('strong');
      head.className='plan-task-title';
      const id=document.createElement('span');id.className='plan-task-id';id.textContent=task.id;
      title.textContent = task.title;head.append(id,title);
      const line=document.createElement('small');line.className='plan-task-line';
      const status=document.createElement('span');status.className='plan-task-stage';status.textContent=({done:'Интегрирована',current:'В работе',attention:'Ожидает решения',pending:'Не начата'})[task.status]??'Состояние не подтверждено';
      if(task.status!=='done'&&task.mode){const mode=document.createElement('span');mode.className='plan-task-mode';mode.textContent=' · '+task.mode;status.append(mode);}
      line.append(status);
      body.append(head,line);
      // A started task opens its executor's session; an unstarted or done one only shows its row.
      if (task.target && task.status !== 'done') {
        const open = document.createElement('button'); open.type = 'button'; open.className = 'plan-task-open';
        open.title = 'Открыть чат исполнителя ' + task.id;
        if (task.target.sessionId === selected.sessionId) { item.dataset.current = 'true'; open.setAttribute('aria-current', 'page'); }
        open.append(mark, body);
        open.addEventListener('click', () => action('selectSession', task.target.workspace, task.target.sessionId));
        item.append(open); return item;
      }
      item.append(mark, body); return item;
    }));
    // Keep the user's scroll; a new problem or a newly running task is brought into view once.
    list.scrollTop=scrollTop;
    const focus=tasks.find(t=>t.status==='attention')??tasks.find(t=>t.status==='current');
    const focusKey=(work?.title??'')+'|'+(focus?focus.id+':'+focus.status:'');
    if(focusKey!==planFocusKey){planFocusKey=focusKey;
      const row=focus&&[...list.children].find(item=>item.querySelector('.plan-task-id')?.textContent===focus.id);
      if(row&&(row.offsetTop<list.scrollTop||row.offsetTop+row.offsetHeight>list.scrollTop+list.clientHeight))list.scrollTop=Math.max(0,row.offsetTop-8);
    }
  } else { $('plan-tasks').replaceChildren(); $('plan-note').hidden = true; $('plan-reason').hidden = true; $('plan-attention').hidden = true; }
  $('review-preference').hidden=!selected||!!state.setup||!!state.settings;
  // Busy participants of the selected project get a spinner in their tree row; text stays in the panel.
  const busyActors=new Set((work?.now??[]).filter(item=>item.kind==='act').map(item=>item.actor));
  for(const row of $('projects').querySelectorAll('.session[data-session-id]')){
    const actor=['orchestrator','planning','self','discussion'].includes(row.dataset.role)?roleActor(row.dataset.role):null;
    const busy=!!actor&&row.dataset.workspace===(selected?.parentWorkspace??selected?.workspace)&&busyActors.has(actor);
    const spin=row.querySelector('.session-copy strong .wp-spin');
    if(busy&&!spin){const node=document.createElement('span');node.className='wp-spin';node.setAttribute('aria-label','занят');row.querySelector('.session-copy strong')?.append(node);}
    else if(!busy&&spin)spin.remove();
  }
  const startup=context.startup||['startup-channel','startup-complete','startup-failed'].includes(context.phase)?startupView(context.startup):null;
  const [title, detail] = startup?[startup.title,startup.detail]:context.phase==='external-session' ? ['Открыто в ChatGPT','Продолжайте разговор в приложении ChatGPT. Эта сессия подключена через плагин Workflow Pilot.'] : phases[context.phase] ?? phases.selected;
  const preparing=['preparing','loading-context','preparing-message','waiting-attachments','waiting-composer','waiting-login','waiting-draft'].includes(context.phase);
  const startupProblem=['startup-stale','startup-failed','startup-uncertain','cancel-pending','startup-cancelled'].includes(startup?.phase);
  const addressPending=context.launch&&context.launch.address!=='confirmed';
  const attention=startupProblem||addressPending||preparing||['waiting-registration','waiting-manual-chat','cancel-pending','startup-cancelled','historical-session','preparation-paused','external-session','error','prepared-stale','chat-changed','send-unknown'].includes(context.phase);
  const started=selected?.manualStart||context.messageSent||['sending','unknown','sent','acknowledged'].includes(selected?.attempt?.state);
  $('session-notice').hidden=!selected||!attention||!!state.setup||!!state.settings;
  $('session-notice-title').textContent=(selected?.title||'Текущая сессия')+' · '+title;
  $('session-notice-detail').textContent=context.phase==='waiting-attachments' && context.uploadProgress
    ? `Готово ${context.uploadProgress.ready} из ${context.uploadProgress.total} частей. Можно отменить ожидание; черновик сохранится.` : startup?.detail??context.error?.message??detail
  // Without the former button the way to a fresh session is the project menu.
  if(startupProblem)$('session-notice-detail').textContent+=' Новую сессию создайте через меню проекта (⋯ → Новый Chat).';
  $('retry-context').hidden=started||!['error','prepared-stale','preparation-paused'].includes(context.phase);
  $('cancel-context').hidden=context.launch?context.launch.cancel!=='none'||context.startup?.complete:started||!preparing;
  $('observe-context').hidden=context.phase!=='send-unknown';
  $('return-chat').hidden = context.phase !== 'chat-changed';
  const startupCovered=!!work?.primary&&context.phase!=='external-session';
  $('session-notice-title').hidden=startupCovered;$('session-notice-detail').hidden=startupCovered;
  if(startupCovered)$('session-notice').hidden=[...$('session-notice').querySelectorAll('button')].every(button=>button.hidden);
  $('connection-detail').textContent = state.localRuntime ? `${state.localRuntime.label} · встроенный MCP` : state.runtimeFolder;
  const delivery = context.delivery;
  $('session-detail').textContent = selected ? `Сессия: ${selected.sessionId}`
    + (delivery ? `\nПередано ${(delivery.contextBytes / 1024).toFixed(1)} КБ · план ${delivery.facts.plan_revision}\n${new Date(delivery.sentAtMs).toLocaleString('ru-RU')}` : '')
    + (Number.isFinite(delivery?.preparationMs) ? `\nПодготовка: ${Math.round(delivery.preparationMs)} мс${delivery.cacheHit ? ' · пакет готов заранее' : ''}` : '')
    + (Number.isFinite(delivery?.deliveryMs) ? `\nОтправка: ${(delivery.deliveryMs / 1000).toFixed(2)} с` : '') : '';
  if (state.fixture) $('connection-detail').textContent = 'TEST FIXTURE · без реального аккаунта и MCP';
  const health = state.workspaceHealth;
  const checking = health?.phase === 'checking', unhealthy = health?.phase === 'error';
  // A background check of the project is silent: only its failure is shown, so switching sessions never shifts the plan card.
  $('workspace-health').hidden = !unhealthy;
  const kitUpgrade = kitUpgradeNeeded(health);
  $('workspace-health-message').textContent = checking ? 'Проверяем проект в фоне…'
    : unhealthy ? (health.error?.message ?? health.issues?.[0]?.reason ?? (kitUpgrade
      ? `Проект использует Workflow Kit ${health.version}. Обновите его до ${health.kitVersion}: планы и документы сохранятся, перед заменой создаётся резервная копия. До обновления чат доступен только для просмотра.`
      : 'Проверка проекта не пройдена. Чат доступен для просмотра.')) : '';
  $('workspace-health-retry').textContent = kitUpgrade ? 'Обновить Workflow Kit' : 'Повторить проверку';
  $('workspace-health-actions').hidden = !unhealthy;
  const error = state.startupError;
  $('error-banner').hidden = !error;
  $('error-banner').textContent = error ? `${error.message} (${error.code})` : '';
  for (const button of document.querySelectorAll('button')) {
    if (button.closest('#startup-panel') || button.id==='open-startup') continue;
    button.disabled = actionPending
      || (button.id==='plan-run-toggle' && (state.planRun?.state==='pausing' || !!state.planRun?.issue&&state.planRun.reason!=='blocked'))
      || (button.id==='plan-review-toggle' && (!review.supported || !!review.error || !!review.lock))
      || (state.storageError && ['create-workspace', 'add-workspace', 'retry-context'].includes(button.id));
  }
  const recovery = state.conversationRecovery;
  $('conversation-recovery').hidden = !recovery || recovery.phase === 'idle' || !!state.setup || !!state.settings;
  $('conversation-recovery-message').textContent = recovery?.message ?? '';
  // A quiet response can be normal tool/review work, not evidence of a connection failure.
  $('reconnect-chat').hidden = !recovery?.canRetry;
  $('reconnect-chat').disabled = actionPending || !recovery?.canRetry;
  setupView.render(state, actionPending);
  settingsView.render(state, actionPending);
  const guidedStartup = !!state.startup?.active && !state.setup && !state.settings;
  $('active-projects').hidden = guidedStartup || !!state.setup || !!state.settings;
  if (guidedStartup) { $('session-notice').hidden = true; $('workspace-health').hidden = true; }

  // Setup briefly hides the tree while checking a folder. Restore only after it is visible.
  for (const list of $('projects').querySelectorAll('.sessions')) {
    if (!list.closest('[hidden]')) {
      const top = sessionScroll.get(list.dataset.workspace) ?? 0;
      if (list.scrollTop !== top) list.scrollTop = top;
    }
  }
  renderExecutorTimes();
  renderElapsedTimes();
}

$('add-workspace').addEventListener('click', () => action('chooseWorkspace'));
$('reload-chat').addEventListener('click', () => action('reload'));
// An outdated Kit opens the regular upgrade preview; the user confirms it there.
$('workspace-health-retry').addEventListener('click', () => action(kitUpgradeNeeded(currentState?.workspaceHealth) ? 'retry' : 'reload'));
$('workspace-health-doctor').addEventListener('click', () => action('openDoctor'));
$('plan-run-toggle').addEventListener('click', () => action('togglePlanExecution'));
$('plan-review-toggle').addEventListener('click', () => action('setPlanReview', {workspace:currentState?.selected?.workspace,enabled:!currentState?.planReview?.enabled}));
$('reconnect-chat').addEventListener('click', () => action('reconnect'));
$('retry-context').addEventListener('click', () => action('retry'));
$('cancel-context').addEventListener('click', () => action('cancelContext'));
$('observe-context').addEventListener('click', () => action('retry'));
$('return-chat').addEventListener('click', () => action('returnToChat'));
const releaseState = api.onState(render);
window.addEventListener('pagehide', () => releaseState?.(), { once: true });
api.getState().then(render).catch(error => { $('error-banner').hidden = false; $('error-banner').textContent = error.message; });
