import { createProgress, operationLabel } from './progress.mjs';
const $ = id => document.getElementById(id);
const api = window.webPilotArchive;
const progress = createProgress($('operation-progress'));
let pendingAction = null;
window.addEventListener('pagehide', () => progress.destroy());
let state = null, pending = false, mode = 'projects', projectAnchor = null, sessionAnchor = null, confirmSessionDelete = false;
const selectedProjects = new Set(), selectedSessions = new Set();
const sessionKey = item => `${item.workspace}\t${item.sessionId}`;

function projectItems() {
  const map = new Map((state?.archives ?? []).map(project => [project.workspace, project]));
  return [...selectedProjects].map(workspace => map.get(workspace)).filter(Boolean).map(({ workspace, projectId }) => ({ workspace, projectId }));
}
function sessionItems() {
  const map = new Map((state?.sessionArchives ?? []).map(item => [sessionKey(item), item]));
  return [...selectedSessions].map(key => map.get(key)).filter(Boolean).map(({ workspace, projectId, sessionId }) => ({ workspace, projectId, sessionId }));
}
async function action(method, ...args) {
  if (pending) return false;
  pending = true; pendingAction = method; render();
  try {
    const response = await api[method](...args);
    if (response?.state) state = response.state;
    if (response?.ok === false) throw new Error(response.error?.message ?? 'Операция архива не выполнена.');
    return true;
  } catch (error) {
    state = { ...(state ?? { archives: [], sessionArchives: [] }), notice: error.message };
    return false;
  } finally { pending = false; pendingAction = null; render(); }
}
function choose(list, selected, getKey, item, index, event, anchor, setAnchor) {
  const key = getKey(item);
  if (event.shiftKey && anchor !== null) {
    const anchorIndex = list.findIndex(entry => getKey(entry) === anchor);
    if (anchorIndex >= 0) {
      const range = list.slice(Math.min(anchorIndex, index), Math.max(anchorIndex, index) + 1).map(getKey);
      if (!(event.metaKey || event.ctrlKey)) selected.clear();
      for (const value of range) selected.add(value);
    }
  } else if (event.metaKey || event.ctrlKey) {
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    setAnchor(key);
  } else { selected.clear(); selected.add(key); setAnchor(key); }
  confirmSessionDelete = false; render();
}
function selectMode(value) {
  mode = value; confirmSessionDelete = false;
  if (mode === 'projects') state = { ...state, deletion: state?.deletion ?? null };
  render();
}
function render(next = state) {
  progress.show(operationLabel({}, pendingAction));
  if (next) state = next;
  if (!state) return;
  state.archives ??= []; state.sessionArchives ??= [];
  document.documentElement.dataset.theme = state.theme === 'dark' ? 'dark' : 'light';
  $('project-count').textContent = `(${state.archives.length})`; $('session-count').textContent = `(${state.sessionArchives.length})`;
  $('tab-projects').setAttribute('aria-pressed', String(mode === 'projects')); $('tab-sessions').setAttribute('aria-pressed', String(mode === 'sessions'));
  $('project-toolbar').hidden = mode !== 'projects'; $('session-toolbar').hidden = mode !== 'sessions';
  const projectValid = new Set(state.archives.map(project => project.workspace));
  for (const key of [...selectedProjects]) if (!projectValid.has(key)) selectedProjects.delete(key);
  const sessionValid = new Set(state.sessionArchives.map(sessionKey));
  for (const key of [...selectedSessions]) if (!sessionValid.has(key)) selectedSessions.delete(key);
  if (mode === 'projects' && !selectedProjects.size && state.focusWorkspace && projectValid.has(state.focusWorkspace)) { selectedProjects.add(state.focusWorkspace); projectAnchor = state.focusWorkspace; }
  if (state.deletion?.workspace && projectValid.has(state.deletion.workspace)) { mode = 'projects'; selectedProjects.clear(); selectedProjects.add(state.deletion.workspace); projectAnchor = state.deletion.workspace; }

  const list = mode === 'projects' ? state.archives : state.sessionArchives;
  const selected = mode === 'projects' ? selectedProjects : selectedSessions;
  const keyOf = mode === 'projects' ? item => item.workspace : sessionKey;
  const fragment = document.createDocumentFragment();
  if (!list.length) {
    const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = mode === 'projects' ? 'Архив проектов пуст.' : 'Архив сессий пуст.'; fragment.append(empty);
  } else list.forEach((item, index) => {
    const key = keyOf(item), row = document.createElement('li'); row.className = 'item' + (selected.has(key) ? ' selected' : '');
    row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(selected.has(key))); row.tabIndex = 0;
    if (mode === 'projects') row.dataset.workspace = item.workspace; else { row.dataset.workspace = item.workspace; row.dataset.sessionId = item.sessionId; }
    const name = document.createElement('strong');
    if (mode === 'projects') name.textContent = item.name;
    else { const title = document.createElement('span'); title.textContent = item.title; const tag = document.createElement('span'); tag.className = 'tag'; tag.dataset.experience = item.experience; tag.textContent = item.experience === 'work' ? 'Work' : 'Chat'; name.append(title, tag); }
    const detail = document.createElement('small');
    detail.textContent = mode === 'projects'
      ? `${item.workspace} · ${new Date(item.archivedAt).toLocaleDateString('ru-RU')} · сессий: ${item.sessionCount}` + (item.deletionPending ? ' · удаление ожидает завершения' : '')
      : `Проект: ${item.projectName} · архив ${new Date(item.archivedAt).toLocaleString('ru-RU')}`;
    row.append(name, detail);
    row.addEventListener('click', event => mode === 'projects'
      ? choose(list, selectedProjects, item => item.workspace, item, index, event, projectAnchor, value => projectAnchor = value)
      : choose(list, selectedSessions, sessionKey, item, index, event, sessionAnchor, value => sessionAnchor = value));
    row.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); row.click(); } });
    fragment.append(row);
  });
  $('archive-list').replaceChildren(fragment);

  const pickedProjects = state.archives.filter(project => selectedProjects.has(project.workspace));
  const blocked = pickedProjects.some(project => project.deletionPending);
  $('restore').disabled = pending || !pickedProjects.length || blocked; $('forget').disabled = pending || !pickedProjects.length || blocked;
  $('delete').disabled = pending || pickedProjects.length !== 1 || blocked; $('recover').hidden = !pickedProjects.some(project => project.deletionPending); $('recover').disabled = pending;
  const pickedSessions = state.sessionArchives.filter(item => selectedSessions.has(sessionKey(item)));
  $('restore-sessions').disabled = pending || !pickedSessions.length; $('delete-sessions').disabled = pending || !pickedSessions.length;
  $('notice').hidden = !state.notice; $('notice').textContent = state.notice ?? '';

  const preview = state.deletion;
  $('delete-panel').hidden = mode !== 'projects' || !preview;
  if (preview) {
    $('delete-name').textContent = preview.name; $('delete-path').textContent = preview.workspace;
    $('delete-meta').textContent = preview.missing ? `Папка отсутствует · локальных сессий: ${preview.sessionCount}` : `${preview.files.toLocaleString('ru-RU')} файлов · ${(preview.bytes / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ · сессий: ${preview.sessionCount}`;
    if ($('delete-confirmation').dataset.token !== preview.token) { $('delete-confirmation').dataset.token = preview.token; $('delete-confirmation').value = ''; }
    $('delete-confirmation').disabled = pending; $('confirm-delete').disabled = pending || $('delete-confirmation').value !== preview.name;
  } else { $('delete-confirmation').dataset.token = ''; $('delete-confirmation').value = ''; }
  $('session-delete-panel').hidden = mode !== 'sessions' || !confirmSessionDelete || !pickedSessions.length;
  $('session-delete-summary').textContent = pickedSessions.length ? `${pickedSessions.length} ${pickedSessions.length === 1 ? 'сессия' : 'сессии'} · ${[...new Set(pickedSessions.map(item => item.projectName))].join(', ')}` : '';
  $('confirm-session-delete').disabled = pending || !pickedSessions.length;
}

$('tab-projects').addEventListener('click', () => selectMode('projects')); $('tab-sessions').addEventListener('click', () => selectMode('sessions'));
$('restore').addEventListener('click', () => action('restore', projectItems())); $('forget').addEventListener('click', () => action('forget', projectItems()));
$('delete').addEventListener('click', () => { const [item] = projectItems(); if (item) action('previewDelete', item); }); $('recover').addEventListener('click', () => action('recoverDeletions'));
$('cancel-delete').addEventListener('click', () => action('cancelDelete')); $('delete-confirmation').addEventListener('input', () => render());
$('confirm-delete').addEventListener('click', () => { if (state?.deletion) action('deleteProject', state.deletion.token, $('delete-confirmation').value); });
$('restore-sessions').addEventListener('click', async () => { if (await action('restoreSessions', sessionItems())) { selectedSessions.clear(); sessionAnchor = null; } });
$('delete-sessions').addEventListener('click', () => { confirmSessionDelete = selectedSessions.size > 0; render(); });
$('cancel-session-delete').addEventListener('click', () => { confirmSessionDelete = false; render(); });
$('confirm-session-delete').addEventListener('click', async () => { if (await action('deleteSessions', sessionItems())) { selectedSessions.clear(); sessionAnchor = null; confirmSessionDelete = false; render(); } });
$('close').addEventListener('click', () => api.close());
api.onState(render); api.getState().then(render).catch(error => { state = { archives: [], sessionArchives: [], notice: error.message }; render(); });
