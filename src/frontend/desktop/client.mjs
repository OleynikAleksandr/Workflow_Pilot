import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DESKTOP_CHANNELS } from '../../contracts/desktop.mjs';
import { BackendConnection } from '../client/connection.mjs';
import { BrowserView } from '../client/browser-view.mjs';
import { DesktopIpc } from './ipc.mjs';
import { ChatColorsWindow } from './chat-colors-window.mjs';

const shellBackground = { light: '#f4f6f8', dark: '#1b1d22' };
const settle = ms => new Promise(resolve => setTimeout(resolve, ms));
const MAX_UPLOAD = 32 * 1024 * 1024;
const RENEW_MS = 10000;

const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; } };

// The backend writes its private descriptor only after proving ownership.
function readDescriptor(file) {
  const stat = fs.lstatSync(file, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value?.product === 'workflow-pilot' && Number.isSafeInteger(value.port) && typeof value.token === 'string' ? value : null;
  } catch { return null; }
}

// Separate Desktop client. Its process owns windows only: closing it, Cmd+Q or
// a crash disconnects from the backend, which keeps pages and work running.
export function startDesktopClient(electron, { backendRoot = null, clientRoot = null, fixture = false } = {}) {
  const { app, BaseWindow, BrowserWindow, WebContentsView, Menu, ipcMain, dialog, nativeTheme, clipboard } = electron;
  // A file path, not URL.pathname: the packaged bundle path contains spaces.
  const desktopDir = fileURLToPath(new URL('./', import.meta.url));
  const dataDir = backendRoot ?? path.join(app.getPath('appData'), 'Workflow Pilot');
  const ownDir = clientRoot ?? path.join(app.getPath('appData'), 'Workflow Pilot Client');
  fs.mkdirSync(ownDir, { recursive: true, mode: 0o700 });
  // Bounded local diagnostics of this window: connection and control changes
  // only, never tokens, chat text or page content.
  const clientLog = path.join(ownDir, 'client-events.jsonl');
  const logClient = (event, data = {}) => {
    try {
      if ((fs.statSync(clientLog, { throwIfNoEntry: false })?.size ?? 0) > 512 * 1024) fs.renameSync(clientLog, clientLog + '.1');
      fs.appendFileSync(clientLog, JSON.stringify({ ts: new Date().toISOString(), pid: process.pid, event, ...data }) + '\n', { mode: 0o600 });
    } catch { /* diagnostics never break the client */ }
  };
  app.setName('Workflow Pilot');
  app.setPath('userData', ownDir);
  app.setPath('sessionData', path.join(ownDir, 'browser'));
  const sidebarUrl = pathToFileURL(path.join(desktopDir, 'ui/index.html')).href;
  const archiveUrl = pathToFileURL(path.join(desktopDir, 'ui/archive.html')).href;
  const viewerUrl = pathToFileURL(path.join(desktopDir, 'ui/browser-view.html')).href;
  let window = null, sidebar = null, pageView = null, archiveWindow = null, colorEditor = null;
  let connection = null, stream = null, uiState = null, archiveState = null, colorsState = null, sidebarWidth = 312, theme = 'light';
  let service = { phase: 'running', reasons: [] };
  // control: this window holds the writer lease; stale: the backend is not reachable.
  let control = false, stale = false, renewTimer = null, watchdog = null, descriptorSeen = null, incompatible = null;
  // leaseHolder: the clientId the backend last reported; another one means a real observer.
  let acquiring = null, retryTimer = null, retryDelay = 1000, leaseHolder = null;
  const windowClientId = 'client-' + globalThis.crypto.randomUUID();
  const otherHolder = () => !!leaseHolder && leaseHolder !== windowClientId;
  const viewers = new Map();
  // Without a backend the sidebar still renders a complete, empty state with the reason.
  const unavailableState = error => ({ projects: [], executorRecovery: [], archives: [], settings: null, doctor: null,
    parallelExecution: {}, execution: { phase: 'idle', assignments: [], commands: [], error: null },
    conversationRecovery: { phase: 'idle', message: '', canRetry: false }, autoPlan: { enabled: false, phase: 'idle', message: '' },
    planReview: {}, selected: null, context: { phase: 'selected', servicesReady: false, messageSent: false }, contextPreparation: { busy: false },
    runtimeFolder: '', platform: process.platform, pluginLaunch: null,
    localRuntime: { label: '', chatgptChannel: 'secure-tunnel', service: null, vps: null }, startup: null, theme,
    hideToolCalls: true, sidebarWidth, sidebarMinWidth: 312, pageLoading: false, startupError: error, storageError: false,
    setup: null, workspaceHealth: null, version: app.getVersion(), fixture });
  const report = (code, message) => {
    uiState = uiState ? { ...uiState, startupError: { code, message } } : unavailableState({ code, message });
    sidebar?.webContents.send('pilot:state-changed', uiState);
  };

  const descriptorFile = path.join(dataDir, '.backend-host', 'service.json');
  const liveDescriptor = () => { const value = readDescriptor(descriptorFile); return value && alive(value.pid) ? value : null; };
  async function backendConnection({ start = true } = {}) {
    let descriptor = readDescriptor(descriptorFile);
    // A descriptor left by a crashed backend is not a running service; the new
    // backend recovers that stale owner itself.
    if (descriptor && !alive(descriptor.pid)) descriptor = null;
    if (!descriptor && !start) throw Object.assign(new Error('Фоновая служба Workflow Pilot не запущена.'), { code: 'BACKEND_UNAVAILABLE' });
    if (!descriptor) {
      // Started detached in its own process group: the backend outlives this client.
      const args = [...(app.isPackaged ? [] : [app.getAppPath()]), '--backend-host', ...(backendRoot ? ['--backend-fixture-root=' + backendRoot] : [])];
      const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
      const child = spawn(process.execPath, args, { detached: true, stdio: 'ignore', env });
      let exitCode = null, exitedAt = 0;
      child.once('exit', code => { exitCode = code; exitedAt = Date.now(); });
      child.unref();
      for (let attempt = 0; attempt < 300 && !descriptor; attempt++) {
        await settle(100);
        // Exit 2: the profile lock is held by another running copy (for example an earlier release).
        // A concurrent launcher may own the profile and publish its descriptor a moment later.
        if (exitCode === 2 && Date.now() - exitedAt > 5000 && !liveDescriptor()) throw Object.assign(new Error('Профиль Workflow Pilot занят другой запущенной копией (возможно, предыдущей версии). Закройте её и откройте Workflow Pilot снова.'), { code: 'BACKEND_OWNER_CONFLICT' });
        const candidate = readDescriptor(descriptorFile);
        descriptor = candidate && alive(candidate.pid) ? candidate : null;
      }
      if (!descriptor) throw Object.assign(new Error('Backend Workflow Pilot не запустился.'), { code: 'BACKEND_UNAVAILABLE' });
    }
    const next = new BackendConnection({ port: descriptor.port, token: descriptor.token, clientId: windowClientId });
    const handshake = await next.connect();
    // A backend of another release keeps running; this client only explains the switch.
    incompatible = handshake.appVersion && handshake.appVersion !== app.getVersion() ? handshake.appVersion : null;
    descriptorSeen = { port: descriptor.port, generation: next.bootGeneration };
    return next;
  }
  // Control is explicit. A free lease is taken automatically; a held one only
  // by the user's own choice. Renewal every 10 s keeps it. One acquire runs at
  // a time, so the first lease event and connect() never race two generations.
  // A transient failure is retried; only another window's lease makes this
  // window an observer.
  function scheduleControlRetry() {
    if (retryTimer || !connection || stale || incompatible || control) return;
    retryTimer = setTimeout(() => { retryTimer = null; void takeControl().catch(() => {}); }, retryDelay);
    retryTimer.unref?.(); retryDelay = Math.min(retryDelay * 2, 10000);
  }
  function takeControl({ takeover = false } = {}) {
    if (acquiring && !takeover) return acquiring;
    const attempt = (async () => {
      const current = connection;
      if (!current || incompatible || stale) { showService(); installMenu(); return false; }
      try {
        await current.acquire({ takeover });
        if (current !== connection) return false;
        control = true; leaseHolder = current.clientId; retryDelay = 1000;
      } catch (error) {
        if (current !== connection) return false;
        control = false;
        if (error.code !== 'BACKEND_LEASE_HELD') scheduleControlRetry();
        logClient('control-acquire-failed', { code: error.code ?? 'BACKEND_UNAVAILABLE', takeover });
      }
      clearInterval(renewTimer); renewTimer = null;
      if (control) {
        renewTimer = setInterval(() => void current.renew().catch(error => {
          if (current !== connection) return;
          control = false; clearInterval(renewTimer); renewTimer = null; showService(); installMenu();
          logClient('control-renew-failed', { code: error.code ?? 'BACKEND_UNAVAILABLE' });
          // Our own lease went stale or the request failed: take it back unless another window holds it.
          void takeControl().catch(() => {});
        }), RENEW_MS);
        renewTimer.unref?.();
      }
      showService(); installMenu();
      return control;
    })();
    acquiring = attempt;
    attempt.finally(() => { if (acquiring === attempt) acquiring = null; }).catch(() => {});
    return attempt;
  }

  // One viewer per displayed backend page; frames are pulled while it is open.
  function attachViewer(contents, browserSessionId) {
    const view = new BrowserView(connection, browserSessionId), entry = { view, contents, active: true };
    viewers.set(contents.id, entry);
    void (async () => {
      try {
        await view.attach();
        while (entry.active && !contents.isDestroyed()) {
          try {
            const frame = await view.nextFrame();
            if (frame && entry.active && !contents.isDestroyed()) contents.send('browser:frame', { meta: frame.meta, png: frame.png });
          } catch (error) {
            if (!entry.active) return;
            contents.send('browser:status', { message: 'Страница недоступна. Ожидаем backend…' });
            await settle(500);
          }
        }
      } catch { contents.send('browser:status', { message: 'Страница backend недоступна.' }); }
    })();
    return entry;
  }
  function detachViewer(contents) {
    const entry = viewers.get(contents.id);
    if (!entry) return;
    entry.active = false; viewers.delete(contents.id);
    void entry.view.detach().catch(() => {});
  }
  async function showSelectedPage() {
    if (!pageView || !connection) return;
    const { pages } = await connection.json('/v1/browser/pages');
    const selected = pages.find(page => page.selected && page.kind === 'page');
    const current = viewers.get(pageView.webContents.id);
    if (!selected || current?.view.browserSessionId === selected.browserSessionId) return;
    detachViewer(pageView.webContents);
    attachViewer(pageView.webContents, selected.browserSessionId);
    syncViewport();
  }
  function syncViewport() {
    const entry = pageView && viewers.get(pageView.webContents.id);
    if (!entry || !window || window.isDestroyed()) return;
    const [width, height] = window.getContentSize();
    // The controlling client sets the server viewport; observers only scale frames.
    void entry.view.setViewport(Math.max(320, Math.min(4096, width - sidebarWidth)), Math.max(320, Math.min(4096, height))).catch(() => {});
  }
  function layout() {
    if (!window || window.isDestroyed()) return;
    const [width, height] = window.getContentSize();
    sidebar.setBounds({ x: 0, y: 0, width: sidebarWidth, height });
    pageView.setBounds({ x: sidebarWidth, y: 0, width: Math.max(0, width - sidebarWidth), height });
    syncViewport();
  }
  function applyTheme(next) {
    theme = next; nativeTheme.themeSource = next; colorEditor?.publish();
    if (window && !window.isDestroyed()) window.setBackgroundColor(shellBackground[next]);
  }
  const viewerWindow = (title, browserSessionId) => {
    const popup = new BrowserWindow({ title, width: 980, height: 780, show: !fixture, focusable: !fixture,
      backgroundColor: shellBackground[theme], webPreferences: { preload: path.join(desktopDir, 'browser-view-preload.cjs'),
        nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    popup.webContents.on('will-navigate', event => event.preventDefault());
    popup.webContents.once('did-finish-load', () => attachViewer(popup.webContents, browserSessionId));
    popup.on('closed', () => detachViewer(popup.webContents));
    void popup.loadURL(viewerUrl);
    return popup;
  };
  const popups = new Map();
  async function onEvent(event) {
    const data = event.data ?? {};
    if (event.type === 'ui.focus') { if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); if (!fixture) { window.show(); window.focus(); } } return; }
    if (event.type === 'ui.open-archive') return openArchive();
    if (event.type === 'ui.close-archive') return archiveWindow?.close();
    if (event.type === 'ui.open-colors') return colorEditor.open();
    if (event.type === 'ui.theme') return applyTheme(data.theme);
    if (event.type === 'ui.layout' && Number.isSafeInteger(data.sidebarWidth)) { sidebarWidth = data.sidebarWidth; return layout(); }
    if (event.type === 'browser.page-opened' && data.kind === 'popup') popups.set(data.browserSessionId, viewerWindow('Окно ChatGPT — Workflow Pilot', data.browserSessionId));
    if (event.type === 'browser.page-closed') { const popup = popups.get(data.browserSessionId); popups.delete(data.browserSessionId); popup?.destroy(); }
    const entry = [...viewers.values()].find(item => item.view.browserSessionId === data.browserSessionId);
    if (event.type === 'browser.file-chooser' && entry) {
      const result = await dialog.showOpenDialog(window, { properties: data.multiple ? ['openFile', 'multiSelections'] : ['openFile'] });
      if (result.canceled || !result.filePaths.length) return entry.view.cancelChooser(data.chooserId).catch(() => {});
      const file = result.filePaths[0], size = fs.statSync(file).size;
      if (size > MAX_UPLOAD) { void entry.view.cancelChooser(data.chooserId).catch(() => {}); return dialog.showErrorBox('Workflow Pilot', 'Файл больше 32 МБ.'); }
      await entry.view.upload({ chooserId: data.chooserId, name: path.basename(file), bytes: fs.readFileSync(file) }).catch(error =>
        dialog.showErrorBox('Workflow Pilot', 'Не удалось передать файл: ' + error.message));
    }
    if (event.type === 'browser.download-ready') {
      const owner = entry ?? [...viewers.values()][0];
      if (!owner) return;
      const target = await dialog.showSaveDialog(window, { defaultPath: data.name });
      const file = await owner.view.download(data.transferId);
      if (!target.canceled && target.filePath) fs.writeFileSync(target.filePath, file.bytes);
    }
    if (event.type === 'state' || event.type === 'operation') void showSelectedPage().catch(() => {});
  }
  async function openArchive() {
    if (archiveWindow && !archiveWindow.isDestroyed()) { if (!fixture) { archiveWindow.show(); archiveWindow.focus(); } return; }
    archiveWindow = new BrowserWindow({ title: 'Архив — Workflow Pilot', width: 780, height: 720, minWidth: 620, minHeight: 480,
      focusable: !fixture, show: !fixture, backgroundColor: shellBackground[theme],
      webPreferences: { preload: path.join(desktopDir, 'archive-preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    archiveWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    archiveWindow.webContents.on('will-navigate', event => event.preventDefault());
    archiveWindow.webContents.on('did-finish-load', () => { if (archiveState) archiveWindow.webContents.send('pilot-archive:state-changed', archiveState); });
    archiveWindow.on('closed', () => { archiveWindow = null; });
    await archiveWindow.loadURL(archiveUrl);
  }
  const desktopIpc = new DesktopIpc(ipcMain, {
    local: () => ({ contents: sidebar?.webContents, url: sidebarUrl }),
    archive: () => ({ contents: archiveWindow?.webContents, url: archiveUrl }),
  });
  // The same envelope as the former in-process IPC; state is the backend's latest.
  async function relay(surface, channel, input) {
    if (channel === 'pilot:get-state') return uiState;
    if (channel === 'archive:get-state') return archiveState;
    if (!connection || stale) return { ok: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Нет связи с фоновой службой Workflow Pilot. Данные могут быть устаревшими; изменения заблокированы до восстановления связи.' }, state: uiState };
    if (incompatible) return { ok: false, error: { code: 'BACKEND_VERSION_INCOMPATIBLE', message: `Работает фоновая служба Workflow Pilot ${incompatible}. Остановите её (значок или меню Workflow Pilot), затем откройте ${app.getVersion()} снова.` }, state: uiState };
    if (!control) {
      if (!otherHolder()) void takeControl().catch(() => {});
      return { ok: false, error: { code: 'BACKEND_LEASE_HELD', message: otherHolder()
        ? 'Управление у другого окна Workflow Pilot. Меню Workflow Pilot → «Взять управление».'
        : 'Окно получает право управления фоновой службой. Повторите действие через несколько секунд.' }, state: uiState };
    }
    try {
      const value = await connection.invoke(surface, channel, input);
      return { ok: value.ok, result: value.result, ...(value.error ? { error: value.error } : {}), state: surface === 'archive' ? archiveState : uiState };
    } catch (error) {
      return { ok: false, error: { code: error.code ?? 'BACKEND_UNAVAILABLE', message: error.message }, state: surface === 'archive' ? archiveState : uiState };
    }
  }
  ipcMain.handle('browser:input', async (event, { type, data, bounds }) => {
    const entry = viewers.get(event.sender.id);
    if (!entry || !entry.view.frame) return false;
    const point = 'x' in data && 'y' in data ? entry.view.point(data.x, data.y, bounds) : null;
    await entry.view.input(type, point ? { ...data, x: point.x, y: point.y } : data);
    return true;
  });
  // Clipboard by explicit user action only: the client device's own clipboard.
  ipcMain.handle('browser:copy', async event => {
    const entry = viewers.get(event.sender.id);
    if (!entry) return false;
    clipboard.writeText(await entry.view.selection()); return true;
  });
  ipcMain.handle('browser:paste', async event => {
    const entry = viewers.get(event.sender.id), text = clipboard.readText();
    if (!entry || !text) return false;
    await entry.view.paste(text.slice(0, 60 * 1024)); return true;
  });

  // Status and stop of the background service, also where no tray exists.
  function showService() {
    if (!window || window.isDestroyed()) return;
    const reason = service.reasons?.[0]?.message;
    const base = fixture ? 'Workflow Pilot — CLIENT FIXTURE' : 'Workflow Pilot';
    window.setTitle(incompatible ? base + ` — работает фоновая служба версии ${incompatible}; для перехода на ${app.getVersion()} остановите её`
      : stale ? base + ' — нет связи, данные могут быть устаревшими'
      : service.phase === 'draining' ? base + ' — остановка: ' + (reason ?? 'ждём безопасной точки')
      : service.phase === 'stopping' ? base + ' — фоновая служба останавливается'
      : !control ? base + (otherHolder() ? ' — наблюдение (управление у другого окна)' : ' — получение управления…') : base);
  }
  async function requestStop() {
    if (!connection) return;
    const answer = await dialog.showMessageBox(window, { type: 'question', buttons: ['Остановить', 'Отмена'], defaultId: 1, cancelId: 1,
      message: 'Остановить фоновую службу Workflow Pilot?',
      detail: 'Новые отправки и назначения не начнутся. Текущий ответ ChatGPT, инструменты и команды Kit завершатся; затем службы остановятся. Принудительного завершения нет.' });
    logClient('stop-dialog', { response: answer.response });
    if (answer.response !== 0) return;
    // Stopping needs control; an older service is stopped the same safe way.
    if (!control) { try { await connection.acquire(); control = true; } catch (error) { logClient('stop-failed', { code: error.code ?? null }); return dialog.showErrorBox('Workflow Pilot', error.message); } }
    await connection.run('service.stop').then(() => logClient('stop-requested'), error => { logClient('stop-failed', { code: error.code ?? null }); dialog.showErrorBox('Workflow Pilot', error.message); });
  }
  function installMenu() {
    const draining = service.phase === 'draining';
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Workflow Pilot', submenu: [{ role: 'about', label: 'О Workflow Pilot' }, { type: 'separator' },
        control ? { label: 'Управление у этого окна', enabled: false }
          : { label: 'Взять управление', enabled: !!connection && !stale, click: () => void takeControl({ takeover: true }).catch(() => {}) },
        ...(!connection || stale ? [{ label: 'Запустить фоновую службу', click: () => void reconnect({ start: true }) }] : []),
        draining ? { label: 'Отменить остановку фоновой службы', click: () => void connection?.run('service.cancel-stop').catch(() => {}) }
          : { label: 'Остановить фоновую службу…', enabled: service.phase === 'running' && !!connection, click: () => void requestStop() },
        { type: 'separator' },
        { role: 'hide', label: 'Скрыть' }, { role: 'quit', label: 'Закрыть окно (работа продолжится в фоне)' }] },
      { label: 'Правка', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: 'Вид', submenu: [{ label: 'Обновить ChatGPT', accelerator: 'CmdOrCtrl+R', click: () => void relay('local', 'pilot:reload') },
        { role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    ]));
  }

  // A new backend boot means a new connection: viewers and control are taken
  // again; nothing is resent. A stopped service is not restarted implicitly.
  async function reconnect({ start = false } = {}) {
    try {
      stream?.close(); clearInterval(renewTimer); renewTimer = null; control = false;
      clearTimeout(retryTimer); retryTimer = null; retryDelay = 1000; acquiring = null;
      for (const contents of [...viewers.keys()]) { const entry = viewers.get(contents); entry.active = false; viewers.delete(contents); }
      for (const popup of popups.values()) popup.destroy(); popups.clear();
      connection = null;
      await connect({ start });
      stale = false;
      void showSelectedPage().catch(() => {});
    } catch { stale = true; }
    showService(); installMenu();
  }
  function watch() {
    clearInterval(watchdog);
    watchdog = setInterval(() => {
      if (!stale) return;
      const descriptor = liveDescriptor();
      if (descriptor && (!descriptorSeen || descriptor.port !== descriptorSeen.port || descriptor.pid !== descriptorSeen.pid)) void reconnect();
    }, 2000);
    watchdog.unref?.();
  }
  async function connect({ start = true } = {}) {
    connection = await backendConnection({ start });
    descriptorSeen = { ...descriptorSeen, pid: readDescriptor(descriptorFile)?.pid };
    stream = connection.subscribe({
      onUi: (kind, value) => {
        if (kind === 'state') { uiState = value; theme = value.theme ?? theme; sidebarWidth = value.sidebarWidth ?? sidebarWidth;
          sidebar?.webContents.send('pilot:state-changed', value); layout(); void showSelectedPage().catch(() => {}); }
        if (kind === 'archive') { archiveState = value; archiveWindow?.webContents.send('pilot-archive:state-changed', value); }
        if (kind === 'colors') { colorsState = value; colorEditor?.publish(); }
        if (kind === 'service') { service = value; showService(); installMenu(); }
        if (kind === 'lease') {
          const mine = value.holder === connection?.clientId;
          leaseHolder = value.holder ?? null;
          logClient('lease', { holder: mine ? 'self' : value.holder ? 'other' : null, generation: value.generation ?? null });
          if (control && !mine) { control = false; connection?.forgetLease(); clearInterval(renewTimer); renewTimer = null; }
          // A short drop let the lease lapse, or this window's own lease survived
          // a reconnect: take it back while no other window holds it.
          if ((!value.holder || mine) && !control && !stale) void takeControl().catch(() => {});
          showService(); installMenu();
        }
      },
      onEvent: event => { void onEvent(event).catch(() => {}); },
      onSnapshot: () => { if (stale) { stale = false; logClient('stream-resynced'); showService(); installMenu(); if (!control) void takeControl().catch(() => {}); } },
      onError: () => { if (!stale) { stale = true; logClient('stream-lost'); showService(); installMenu(); } },
    });
    logClient('connected', { bootGeneration: connection.bootGeneration, incompatible });
    await takeControl();
  }

  if (!fixture && !app.requestSingleInstanceLock()) { app.quit(); return; }
  const focusWindow = () => { if (!window || window.isDestroyed()) return; if (window.isMinimized()) window.restore(); if (!fixture) { window.show(); window.focus(); } };
  app.on('second-instance', focusWindow);
  // macOS reopen of the same bundle reaches whichever process is registered.
  app.on('activate', focusWindow);
  // Closing the client is only a disconnect; nothing here stops the backend.
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { stream?.close(); for (const contents of [...viewers.keys()]) viewers.get(contents)?.view.detach().catch(() => {}); });
  app.whenReady().then(async () => {
    installMenu();
    window = new BaseWindow({ title: fixture ? 'Workflow Pilot — CLIENT FIXTURE' : 'Workflow Pilot', show: !fixture, focusable: !fixture,
      width: 1440, height: 940, minWidth: 980, minHeight: 700, backgroundColor: shellBackground[theme] });
    sidebar = new WebContentsView({ webPreferences: { preload: path.join(desktopDir, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    pageView = new WebContentsView({ webPreferences: { preload: path.join(desktopDir, 'browser-view-preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    for (const view of [sidebar, pageView]) {
      window.contentView.addChildView(view);
      view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      view.webContents.on('will-navigate', event => event.preventDefault());
    }
    colorEditor = new ChatColorsWindow({ passive: fixture, sourceDir: desktopDir, getBounds: () => window?.getBounds(),
      getState: () => colorsState ?? { colors: {}, defaults: {}, theme },
      change: async input => { const value = await connection.invoke('colors', 'colors:change', input); if (!value.ok) throw new Error(value.error?.message ?? 'Не удалось изменить цвет.'); return value.result; },
      reset: async () => { const value = await connection.invoke('colors', 'colors:reset'); if (!value.ok) throw new Error(value.error?.message ?? 'Не удалось сбросить цвета.'); return value.result; } });
    for (const surface of ['local', 'archive'])
      for (const channel of DESKTOP_CHANNELS[surface]) desktopIpc.handle(surface, channel, input => relay(surface, channel, input));
    window.on('resize', layout);
    window.on('closed', () => { window = null; detachViewer(pageView.webContents); });
    layout();
    await Promise.all([sidebar.webContents.loadURL(sidebarUrl), pageView.webContents.loadURL(viewerUrl)]);
    watch();
    try { await connect(); }
    catch (error) {
      stale = true;
      pageView.webContents.send('browser:status', { message: 'Нет связи с backend Workflow Pilot: ' + error.message });
      report(error.code ?? 'BACKEND_UNAVAILABLE', error.code === 'BACKEND_OWNER_CONFLICT' ? error.message
        : 'Нет связи с фоновой службой Workflow Pilot. Меню Workflow Pilot → «Запустить фоновую службу».');
    }
    if (fixture) {
      process.stdout.write(JSON.stringify({ clientReady: true, connected: !!connection, pid: process.pid }) + '\n');
      // Isolated test probes: read what the windows render, call the sidebar's own API.
      process.stdin.setEncoding('utf8');
      let buffer = '';
      process.stdin.on('data', chunk => {
        buffer += chunk;
        for (let index; (index = buffer.indexOf('\n')) >= 0;) {
          const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
          void (async () => {
            const command = JSON.parse(line);
            let value;
            if (command.op === 'probe') value = {
              sidebar: await sidebar.webContents.executeJavaScript('document.body.innerText'),
              frame: await pageView.webContents.executeJavaScript("document.getElementById('frame').src.startsWith('blob:')"),
              viewers: viewers.size, state: !!uiState, control, stale, title: window?.getTitle() ?? '',
              error: uiState?.startupError?.code ?? null, incompatible };
            if (command.op === 'rename') value = await sidebar.webContents.executeJavaScript(
              `window.webPilot.renameProject(${JSON.stringify(command.workspace)}, ${JSON.stringify(command.name)})`);
            process.stdout.write(JSON.stringify({ op: command.op, value }) + '\n');
          })().catch(error => process.stdout.write(JSON.stringify({ op: 'error', message: error.message }) + '\n'));
        }
      });
    }
  }).catch(error => {
    console.error('Workflow Pilot client:', error.message);
    if (!fixture) dialog.showErrorBox('Workflow Pilot', error.message);
    app.exit(1);
  });
  // Fixture probes for tests only: read what the client renders.
  return Object.freeze({ get sidebar() { return sidebar; }, get pageView() { return pageView; }, viewers, get state() { return uiState; } });
}
