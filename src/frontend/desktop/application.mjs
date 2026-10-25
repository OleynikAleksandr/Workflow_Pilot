import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ChatColorsWindow } from './chat-colors-window.mjs';
import { offerMacInstallation } from './mac-installation.mjs';
import { DesktopBrowserHost } from './browser-host.mjs';
import { DesktopIpc } from './ipc.mjs';
import { DESKTOP_CHANNELS } from '../../contracts/desktop.mjs';
import { shellBackground } from '../../contracts/palette.mjs';


// In-process Desktop: the window, sidebar, archive and colour windows over the
// Desktop model, with ChatGPT pages shown as native views.
export function startDesktopApplication({electron,sourceDir,desktopDir,dataDir,partition,smoke,eventBaseline,eventRuntimeChecker,
  executionServices,createControl,dependencies,createDesktopModel}) {
const {app,BaseWindow,BrowserWindow,WebContentsView,Menu,ipcMain,dialog,nativeTheme}=electron;
const sidebarUrl = pathToFileURL(path.join(desktopDir, 'ui/index.html')).href;
const archiveUrl = pathToFileURL(path.join(desktopDir, 'ui/archive.html')).href;
let window = null, sidebar = null, archiveWindow = null, colorEditor = null, model = null, fixture = null;
let sidebarReady = false, lastSidebarStateSignature = null;
const desktopIpc = new DesktopIpc(ipcMain, {
  local:()=>({contents:sidebar?.webContents,url:sidebarUrl}),
  archive:()=>({contents:archiveWindow?.webContents,url:archiveUrl}),
});
const remotePreferences = () => ({ partition, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true });
const browserHost = new DesktopBrowserHost(()=>new WebContentsView({webPreferences:{...remotePreferences(),backgroundThrottling:false,
  preload:app.isPackaged?path.join(process.resourcesPath,'resources/chatgpt-page-observer-preload.cjs')
    :path.join(sourceDir,'../resources/chatgpt-page-observer-preload.cjs')}}));
const sendArchive = state => {
  if (archiveWindow && !archiveWindow.isDestroyed() && !archiveWindow.webContents.isDestroyed())
    archiveWindow.webContents.send('pilot-archive:state-changed', state);
};
function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Workflow Pilot', submenu: [{ role: 'about', label: 'О Workflow Pilot' }, { type: 'separator' },
      { role: 'hide', label: 'Скрыть' }, { role: 'quit', label: 'Завершить Workflow Pilot' }] },
    { label: 'Правка', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Вид', submenu: [{ label: 'Обновить ChatGPT', accelerator: 'CmdOrCtrl+R', click: () => model?.reloadSelected() },
      { role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
  ]));
}
const surface = {
  alive: () => !!window && !window.isDestroyed(),
  contentWidth: () => window && !window.isDestroyed() ? window.getContentSize()[0] : null,
  layout(sidebarWidth) {
    if (!window || window.isDestroyed()) return;
    const [width, height] = window.getContentSize();
    sidebar.setBounds({ x: 0, y: 0, width: sidebarWidth, height });
    browserHost.visibleView()?.setBounds({ x: sidebarWidth, y: 0, width: Math.max(0, width - sidebarWidth), height });
  },
  bounds: () => ({ browserBounds: browserHost.visibleView()?.getBounds() ?? null, windowSize: window?.getContentSize() ?? null }),
  showPage: id => browserHost.show(id, window?.contentView),
  hidePage: () => browserHost.hide(),
  applyTheme(theme) {
    nativeTheme.themeSource = theme;
    colorEditor?.publish();
    if (window && !window.isDestroyed()) window.setBackgroundColor(shellBackground[theme]);
  },
  publish(state) {
    if (!sidebarReady || !sidebar || sidebar.webContents.isDestroyed()) return false;
    const signature = JSON.stringify(state);
    if (signature === lastSidebarStateSignature) return false;
    lastSidebarStateSignature = signature;
    sidebar.webContents.send('pilot:state-changed', state);
    return true;
  },
  publishArchive: sendArchive,
  async openArchive() {
    if (archiveWindow && !archiveWindow.isDestroyed()) { if (!smoke) { archiveWindow.show(); archiveWindow.focus(); } return; }
    archiveWindow = new BrowserWindow({ title: 'Архив — Workflow Pilot', width: 780, height: 720, minWidth: 620, minHeight: 480,
      focusable:!smoke, show:!smoke,
      backgroundColor: shellBackground[model.theme], webPreferences: { preload: path.join(desktopDir, 'archive-preload.cjs'),
        nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    archiveWindow.setWindowOpenHandler?.(() => ({ action: 'deny' }));
    archiveWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    archiveWindow.webContents.on('will-navigate', event => event.preventDefault());
    archiveWindow.webContents.on('did-finish-load', () => sendArchive(model.archiveSnapshot()));
    archiveWindow.on('closed', () => { archiveWindow = null; model.archiveClosed(); });
    await archiveWindow.loadURL(archiveUrl);
  },
  closeArchive: () => archiveWindow?.close(),
  openColors: () => colorEditor.open(),
  showOpenDialog: options => dialog.showOpenDialog(window, options),
  beforeWindow: async ({ fresh, storageError }) => !smoke && app.isPackaged && process.platform === 'darwin' && !storageError
    && await offerMacInstallation({ app, dialog, fresh }),
  async create() {
    installMenu();
    window = new BaseWindow({ name: 'main-window', title: smoke ? 'Workflow Pilot — TEST FIXTURE' : 'Workflow Pilot',
      focusable:!smoke, show:!smoke,
      width: 1440, height: 940, minWidth: 980, minHeight: 700, backgroundColor: shellBackground[model.theme],
      windowStatePersistence: { bounds: true, displayMode: false } });
    sidebar = new WebContentsView({ webPreferences: { preload: path.join(desktopDir, 'preload.cjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    window.contentView.addChildView(sidebar);
    colorEditor = new ChatColorsWindow({
      passive:smoke,
      sourceDir:desktopDir, getBounds: () => window?.getBounds(),
      getState: () => model.colors.state(), change: input => model.colors.change(input), reset: () => model.colors.reset(),
    });
    sidebar.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    sidebar.webContents.on('will-navigate', event => event.preventDefault());
    sidebar.webContents.on('did-start-loading', () => { sidebarReady = false; lastSidebarStateSignature = null; });
    sidebar.webContents.on('did-finish-load', () => { sidebarReady = true; lastSidebarStateSignature = null; model.publish(); });
    window.on('resize', () => surface.layout(model.sidebarWidth));
    window.on('focus', () => model.windowFocused());
    window.on('close', () => model.hideSelectedPage());
    window.on('closed', () => {
      try { desktopIpc.dispose(); colorEditor?.dispose(); model.dispose(); }
      finally {
        // Auth/help popups and hidden auxiliary windows must not keep the UI alive.
        // Independent MCP/tunnel processes are deliberately not stopped here.
        for (const child of BrowserWindow.getAllWindows()) if (!child.isDestroyed()) child.destroy();
        if (sidebar && !sidebar.webContents.isDestroyed()) sidebar.webContents.close({ waitForBeforeUnload: false });
        window = null;
        if (!smoke) app.quit();
      }
    });
    for (const surfaceName of ['local', 'archive'])
      for (const channel of DESKTOP_CHANNELS[surfaceName]) desktopIpc.handle(surfaceName, channel, input => model.invoke(surfaceName, channel, input));
  },
  loadUi: () => sidebar.webContents.loadURL(sidebarUrl),
  runFixture: handles => fixture.run({ ...handles, window, sidebar: sidebar.webContents,
    assertLocalSender: event => desktopIpc.assert('local', event),
    getArchiveWindow: () => archiveWindow, getColorWindow: () => colorEditor.window }),
  close: () => window?.close(),
};

if (!smoke && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    if (smoke) {
      // Fixture windows must never activate the application or steal the user's desktop focus.
      if(process.platform==='darwin')app.setActivationPolicy('accessory');
      fixture = await import('../../../tests/electron-smoke.mjs');
      await fixture.prepareStartup({ dataDir });
    }
    model = createDesktopModel({electron,sourceDir,dataDir,partition,smoke,eventBaseline,eventRuntimeChecker,executionServices,
      createControl,dependencies,browserHost,surface,remotePages:true,fixture});
    await model.start();
  }).catch(error => {
    console.error('Workflow Pilot:', smoke ? (error.stack || error) : error.message);
    if (!smoke) dialog.showErrorBox('Workflow Pilot', error.message);
    app.exit(1);
  });
}
}
