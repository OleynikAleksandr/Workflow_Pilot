import path from 'node:path';
import os from 'node:os';
import { AsyncLocalStorage } from 'node:async_hooks';
import { normalizeChatUrl, activeSessionsNewestFirst, externalClientLine,
  pruneOrphanProjectSettings, validateParallelSettings, projectExecutors } from '../control/facade.mjs';
import { startupPlatformOptions, startupSupported, publicVpsState, publicRuntimeState } from '../control/facade.mjs';
import { DESKTOP_CHANNELS } from '../contracts/desktop.mjs';

// The Desktop product model: projects, sessions, settings, archive, Doctor,
// onboarding and workflow. It owns no window; a surface presents its state
// (in-process legacy window or a remote client) and supplies the page host.
export function createDesktopModel({electron,sourceDir,dataDir,partition,smoke,eventBaseline,eventRuntimeChecker,executionServices,createControl,dependencies,
  browserHost,surface,remotePages=false,fixture=null,offline=false,pluginDirectory=null,recoverCrashedPages=false,remoteAccess=null}) {
const {app,session,ipcMain,dialog,clipboard,shell}=electron;
const {LinuxExecutorBootstrap,LinuxRuntimeSwitcher,LinuxServices,bundledLinuxNode}=dependencies;
const {ChromiumDiagnostics,safeUrl,appendDiagnostic,inspectMacGit,installMacGit,chatGPTTitleScript, toolFilterScript, installChatGPTAutoScroll, ChatColors, normalizeChatColors, validateColorChange, DEFAULT_COLORS, chatGPTEntrypoint, CHATGPT_SIGNIN_ENTRYPOINT, BUNDLED_NODE_VERSION, defaultRuntimeFolder, bundledMacNode, nodeExecutableCandidates, WindowsExecutorBootstrap, WINDOWS_RUNTIME_ARCHIVE, CodexAppServerRuntime, MacRuntimeSwitcher, runtimeLabel, CHATGPT_CHANNEL_SECURE, CHATGPT_CHANNELS, VpsTunnel, WindowsVpsTunnel}=dependencies;
// Allowlisted handlers by surface; the surface authenticates its own callers.
const handlers = { local: new Map(), archive: new Map(), colors: new Map() };
const desktopIpc = {
  handle(surfaceName, channel, action) {
    if (!DESKTOP_CHANNELS[surfaceName]?.includes(channel) || handlers[surfaceName].has(channel))
      throw Object.assign(new Error('Недопустимый или повторный канал Desktop.'), { code: 'IPC_CHANNEL_INVALID' });
    handlers[surfaceName].set(channel, action);
  },
  dispose() { for (const map of Object.values(handlers)) map.clear(); },
};
const settingsFile = path.join(dataDir, 'settings.json');

const chromiumDiagnosticsFile = path.join(dataDir, 'diagnostics', 'chromium-events.jsonl');
const control = createControl({storageFile:path.join(dataDir, 'workspaces.json'),
  getExecutionSettings:()=>preferences.parallelExecution, git:(workspace,args)=>executionKit.git(workspace,['--no-optional-locks',...args])});
const preferences=control.configureSettings({file:settingsFile,workflowSnapshot:()=>workflow.snapshot()});
const store = control.projects;
const deletionHooks = smoke ? {beforeFinish:null} : null;
// State of the Codex App Server executor, the local MCP backend of both systems.
const runtimeFolder = defaultRuntimeFolder(os.homedir(), process.platform);
let appServerRuntime = null, runtimeSwitcher = null, runtimeActivation = null, vpsTunnel = null;
let linuxBootstrap = null;
let chatColorStyles;
const SIDEBAR_MIN_WIDTH = 312;
const BROWSER_MIN_WIDTH = 600;
let browser, runtime, controller, chromiumDiagnostics, windowsBootstrap, closed = false;
let eventRuntimeCheckerTimer = null, lastEventRuntimeCheckerMismatch = '';
let navigationId = 0;
const runtimeMetrics = {
  executeJavaScript: 0, ipcSnapshots: 0, workerNodeStarts: 0,
  reset() { this.executeJavaScript = 0; this.ipcSnapshots = 0; this.workerNodeStarts = 0; },
  snapshot() { return { executeJavaScript: this.executeJavaScript, ipcSnapshots: this.ipcSnapshots, workerNodeStarts: this.workerNodeStarts }; },
};
const actionContext = new AsyncLocalStorage();
let pageLoading = false;
let startupClipboard = null;
let startupFlow = null, startupActive = false;
let startupError = null;
let storageError = false;
let plugin = null;
let lastDiagnostic = '';
let actionTail = Promise.resolve();
const titleSyncSuccess = new Map();
const titleSyncPending = new Map();
const windowsPortableNode = process.platform === 'win32'
  ? (app.isPackaged
      ? path.join(process.resourcesPath, 'windows-node', `node-v${BUNDLED_NODE_VERSION}-win-x64`, 'node.exe')
      : path.join(sourceDir, `../.harness/runtime/windows-node/node-v${BUNDLED_NODE_VERSION}-win-x64/node.exe`))
  : null;
const workspaceSetup = control.configureProjects({
  executeNode: executionServices.executeFile, files: executionServices.files,
  resourceDir: app.isPackaged ? path.join(process.resourcesPath, 'resources') : path.join(sourceDir, '../resources'),
  nodeCandidates: windowsPortableNode
    ? [windowsPortableNode, ...nodeExecutableCandidates({ platform: 'win32', environment: process.env, electron: true })]
    : process.platform === 'darwin'
      ? [bundledMacNode(app.isPackaged ? process.resourcesPath : path.join(sourceDir, '../.harness/runtime')), ...nodeExecutableCandidates()]
      : process.platform==='linux'?[bundledLinuxNode(app.isPackaged?process.resourcesPath:path.join(sourceDir,'../.harness/runtime')),...nodeExecutableCandidates()]:undefined,
  // Workflow Kit needs only the Git of the package: the tools are unpacked without starting any service.
  prepareEnvironment: process.platform === 'win32' && !smoke ? async () => {
    await windowsBootstrap.ensureTools();
    return windowsBootstrap.workflowEnvironment();
  } : process.platform==='linux'&&!smoke ? async()=>linuxBootstrap.workflowEnvironment() : undefined,
  onWorkerStart: () => { if (eventBaseline) runtimeMetrics.workerNodeStarts++; },
});
const {runtime:sessionContextRuntime, cache:contextCache} = control.configureContext({getRuntime:()=>runtime,
  loadFixture:smoke ? workspace=>runtime.loadContext(workspace) : null, onChange:()=>publish()});
// Agent time: wall clock while ChatGPT shows its Stop control; each finished request is added to its own session.
let agentTimer, pageState, conversationRecovery;
function observeManualConversation(state, record = liveSessions.visible) {
  return liveSessions.observeManualConversation(state, record);
}
const workflow = control.configureWorkflow({getController:()=>store.selected()?.external?null:controller,
  contextAvailable:()=>!store.selected()?.external&&!pageLoading&&!setupState&&!settingsState,
  available:()=>!store.selected()?.external&&!liveSessions?.paused&&!!controller&&!controller.composer.inFlight&&!pageLoading&&!setupState&&!settingsState
    &&workspaceHealth?.ready&&workspaceHealth.workspace===store.selected()?.workspace,
  onChange:()=>publish(),report,save:overrides=>saveSettings(overrides)});
const {projectAutoPlan,autoPlan,planMonitor,planReview,reviewContinuation,execution,executionKit}=workflow;
const configurePrimary=record=>workflow.configurePrimary(record);
function applyObservedPage(event, record = liveSessions.visible) {
  if(!record||record.disposed)return;
  if(record===liveSessions.visible&&!event.reset)observeStartupAccount(event.state);
  if(!event.reset) {
    record.diagnostics?.observePage(event.state);
    if(!record.loading)observeManualConversation(event.state,record);
  }
  workflow.observePage(event,record);
}
function sessionRuntimeError(record,error) {
  record.diagnostics?.recordObserverFailure(error?.code);
  record.error=publicError(error);
  if(record===liveSessions.visible&&!settingsState&&!setupState)report(error);else publish();
}
executionServices.attachBrowser({host:browserHost,ipc:ipcMain,recoverCrashed:recoverCrashedPages});
const sessionView = record => browserHost.view(record.key);
const liveSessions = control.attachSessions({
  presentation:{show:id=>surface.showPage(id),hide:()=>surface.hidePage()},
  onChange:record=>{
    // A page reloaded after its renderer died is usable again: drop the crash notice.
    if(!record.loading&&record.error?.code==='RENDER_PROCESS_GONE'&&!record.browser.snapshot().crashed){
      record.error=null;if(startupError?.code==='RENDER_PROCESS_GONE')startupError=null;}
    if(record===liveSessions.visible)pageLoading=record.loading;workflow.sessionChanged(record);
    publish();
  },
  onChatBound:record=>{if(record===liveSessions.visible)void syncSelectedSessionTitle({force:true,reason:'chat-bound'});},
  onPage:(record,event)=>applyObservedPage(event,record),onError:sessionRuntimeError,decorate:decorateSessionRuntime});
workflow.attachSessions(liveSessions);
const liveRecord=project=>project&&liveSessions.find(project);
let setupState = null;
let workspaceHealth = null;
let settingsState = null;
let doctorState = null;
const projectDoctor = control.doctor;
let archiveState = { deletion: null, notice: null, focusWorkspace: null };
let deletion;
const lifecycle=control.configureLifecycle({
  confirm:options=>dialog.showMessageBox(options),settingsOpen:()=>!!settingsState,getDeletion:()=>deletion,
  awaitSettings:()=>preferences.whenIdle(),saveSettings,
  onDeleted:identities=>{if(identities.some(p=>p.workspace===workspaceHealth?.workspace))workspaceHealth=null;},
  purgeState:(dir,identities)=>{return preferences.purge(dir,identities);},
});

function applyShellTheme() { surface.applyTheme(preferences.shellTheme); }

async function applyToolCallVisibility(view = browser) {
  if (!view || view.webContents.isDestroyed()) return;
  const url = view.webContents.getURL();
  if (!url.startsWith('https://chatgpt.com/')) return;
  await view.webContents.executeJavaScript(toolFilterScript(preferences.hideToolCalls), true).catch(() => {});
}

function saveSettings(overrides={}) { return preferences.save(overrides); }

const prepareProjectRemoval=job=>lifecycle.prepareProjectRemoval(job);
const cleanupDeletedProject=job=>lifecycle.cleanupDeletedProject(job);
async function setChatColors(colors) {
  const next=normalizeChatColors(colors);
  await saveSettings({chatColors:next});
  await Promise.all([...liveSessions.all()].map(record=>record.colors.set(next)));
}
async function changeChatColor(input) {
  await preferences.setColor(input);
  await Promise.all([...liveSessions.all()].map(record=>record.colors.set(preferences.chatColors)));
}

function openSettings(workspace = null) {
  workspace ??= setupState?.workspace ?? store.selected()?.workspace ?? null;
  if (doctorState?.workspace !== workspace) doctorState = { workspace, phase: 'idle' };
  pauseForSetup(); workspaceSetup.clear(); setupState = null; deletion.clear();
  settingsState = { workspace };
}
function closeSettings() {
  deletion.clear(); settingsState = null; startupError = null;
  const current = store.landing(); if (current) void selectWorkspace(current.workspace, { resume: true }).catch(report);
  else if (startupFlow) { startupActive = true; void navigate(null); }
}

function publicError(error) { return { code: error.code ?? 'APP_ERROR', message: String(error.message ?? error).slice(0, 700) }; }
function projectedArchives() {
  return store.snapshot().projects.filter(project => project.archivedAt&&!project.parentWorkspace).map(({ workspace, projectId, name, displayName, archivedAt, sessions }) => ({
    workspace, projectId, name: displayName || name, archivedAt, sessionCount: sessions.length, deletionPending: deletion?.isPending(workspace) ?? false,
  }));
}
function projectedSessionArchives() {
  return store.snapshot().projects.filter(project => !project.archivedAt&&!project.parentWorkspace).flatMap(project => project.sessions
    .filter(session => session.archivedAt)
    .map((session, index) => ({ workspace: project.workspace, projectId: project.projectId, projectName: project.displayName || project.name,
      sessionId: session.sessionId, title: session.title || `Сессия ${index + 1}`, experience: session.experience,
      chatUrl: session.chatUrl, archivedAt: session.archivedAt, createdAt: session.createdAt })));
}
function archiveSnapshot() {
  return { archives: projectedArchives(), sessionArchives: projectedSessionArchives(), deletion: archiveState.deletion, notice: archiveState.notice,
    focusWorkspace: archiveState.focusWorkspace, theme: preferences.shellTheme, fixture: smoke };
}
function publishArchive() { surface.publishArchive(archiveSnapshot()); }
function snapshot() {
  const saved = store.selected();
  const projects=store.snapshot().projects;
  const info = planMonitor.view(saved, controller?.state.projectInfo);
  const selected = saved && { ...saved, attempt: saved.attempt && { protocol: saved.attempt.protocol,
    requestId: saved.attempt.requestId, state: saved.attempt.state }, receipt: undefined,
    ...(info?.workspace === saved.workspace && info.inspectedSessionId === saved.sessionId ? info : {}),
    planReadError: planMonitor.error ?? planMonitor.watchError, agentRun: agentTimer?.view(saved) ?? null };
  return { projects: projects.filter(p => !p.archivedAt&&!p.parentWorkspace)
    .map(({ workspace, projectId, name, displayName, selectedSessionId, expanded, sessions }) => ({
    workspace, projectId, name: displayName || name, selectedSessionId, expanded,
    activity:[...liveSessions.all()].some(r=>(r.identity?.workspace===workspace
      ||store.project(r.identity?.workspace)?.parentWorkspace===workspace)&&r.pageState.current?.state.busy)?'working'
      :execution.view(workspace).error||sessions.some(s=>liveRecord({workspace,sessionId:s.sessionId})?.controller.state.error)?'attention':'idle',
    executors:projectExecutors(projects,workspace,execution.view(workspace),liveRecord),
    sessions: activeSessionsNewestFirst(sessions).map(({ sessionId, experience, chatUrl, title, createdAt, external }) => ({ sessionId, experience, chatUrl, title, createdAt, external:!!external })),
  })),
    executorRecovery:projects.filter(p=>p.parentWorkspace&&!projects.some(parent=>parent.workspace===p.parentWorkspace&&parent.projectId===p.parentProjectId))
      .map(p=>({workspace:p.workspace,projectId:p.projectId,name:p.displayName||p.name,
        message:'Связь с родителем не подтверждена. Для отсутствующих папок можно убрать только локальную запись. Облачные чаты ChatGPT сохраняются.'})),
    archives: projectedArchives(), settings: settingsState, doctor: doctorState, parallelExecution: { ...preferences.parallelExecution },
    execution: {...execution.view(saved?.parentWorkspace??saved?.workspace),commands:(execution.view(saved?.parentWorkspace??saved?.workspace).commands??[])
      .map(c=>({...c,projectId:store.project(c.workspace)?.projectId}))},
    conversationRecovery: saved?.external ? {phase:'idle',message:'',canRetry:false} : conversationRecovery?.view() ?? { phase: 'idle', message: '', canRetry: false },
    autoPlan: {...(liveSessions.visible?.executor?.flow.view()??autoPlan.view()),
      enabled:!saved?.external&&projectAutoPlan.enabled(saved?.parentWorkspace??saved?.workspace,saved?.parentScopeId??info?.scopeId??saved?.scopeId)},
    planReview: {...planReview.view(),...(reviewContinuation.persistenceError?{message:reviewContinuation.message,indicator:'attention'}: {})},
    selected, context: saved?.external ? {phase:'external-session',servicesReady:true,messageSent:true} : controller?.state ?? { phase: 'selected', servicesReady: false, messageSent: false },
    contextPreparation: { busy: selected ? contextCache.isBuilding(selected.workspace) : false },
    runtimeFolder, platform: process.platform, pluginLaunch:plugin?.launch.snapshot()??null,
    // The same view on both systems: the executor, the selected ChatGPT channel and the state of its services.
    localRuntime: {
      label: runtimeLabel(),
      chatgptChannel:preferences.chatgptChannel,
      service: runtime?.lastStatus ? {
        mcpReady: !!runtime.lastStatus.mcp?.ready,
        tunnelReady: !!runtime.lastStatus.tunnel?.ready,
        tunnelConfigured: !!runtime.lastStatus.tunnel?.configured,
      } : null,
      vps: vpsView(runtime?.lastStatus?.vps),
    },
    startup: startupFlow ? { ...startupFlow.snapshot(), clipboard: startupClipboard?.snapshot(), active: startupActive } : null,
    theme: preferences.shellTheme, hideToolCalls:preferences.hideToolCalls, sidebarWidth:preferences.sidebarWidth, sidebarMinWidth: SIDEBAR_MIN_WIDTH, pageLoading, startupError, storageError, setup: setupState, workspaceHealth, version: app.getVersion(), fixture: smoke,
    remoteAccess: remoteAccess?.current?.view?.() ?? null };
}

let publishListener = () => {};
const colorsState = () => ({ colors: { ...preferences.chatColors }, defaults: DEFAULT_COLORS[preferences.shellTheme], theme: preferences.shellTheme });
function publish() {
  planMonitor.observeSelection();
  planReview.observeSelection();
  reviewContinuation.update();
  autoPlan.selectionChanged();
  autoPlan.availabilityChanged();
  observeStartupClipboard();
  rememberSessionTitle();
  rememberScopeTitle();
  const state = snapshot();
  try { publishListener(); } catch { /* a remote surface never stops the model */ }
  surface.publishColors?.(colorsState());
  chromiumDiagnostics?.observeStartup(state.startup);
  if (surface.publish(state) && eventBaseline) runtimeMetrics.ipcSnapshots++;
  publishArchive();
  const record = { phase: state.context.phase, workspace: state.selected?.workspace, sessionId: state.selected?.sessionId,
    requestId: state.selected?.attempt?.requestId, contextSha256: state.context.delivery?.contextSha256,
    planRevision: state.context.projectInfo?.planRevision, errorCode: state.context.error?.code ?? startupError?.code,
    appVersion: app.getVersion(), page: state.startup?.page, pageError: state.startup?.pageError };
  const signature = JSON.stringify(record);
  if (signature !== lastDiagnostic) {
    lastDiagnostic = signature;
    executionServices.files.mkdir(dataDir, { recursive: true, mode: 0o700 })
      .then(() => appendDiagnostic(path.join(dataDir, 'diagnostics.jsonl'), JSON.stringify({ at: new Date().toISOString(), fixture: smoke, ...record }) + '\n'))
      .catch(() => {});
  }
}


function checkEventRuntimeState() {
  if (!eventRuntimeChecker || !chromiumDiagnostics || pageLoading || planMonitor.pending || planMonitor.rerunRequested
      || controller?.pending || controller?.rerunRequested || controller?.inputsChanged) return;
  const generation = navigationId;
  const selected = store.selected();
  const mismatches = [];
  const card = selected ? planMonitor.view(selected) : null;
  const context = controller?.state?.projectInfo ?? null;
  if (selected && controller?.active?.workspace === selected.workspace && controller.active.sessionId === selected.sessionId
      && card && context) {
    for (const key of ['scopeId', 'planRevision', 'nextTaskId', 'deliveryStatus']) {
      if (card[key] !== context[key]) mismatches.push('plan:' + key);
    }
  }
  const observed = pageState.current?.state;
  if (startupActive && startupFlow && observed && isChatGPTOrigin(observed.url)) {
    const startup = startupFlow.snapshot();
    if (!['loading', 'slow'].includes(startup.page) && observed.login !== 'unknown' && startup.account !== observed.login)
      mismatches.push('startup:account');
  }
  if (generation !== navigationId) return;
  const signature = mismatches.sort().join(',');
  if (signature === lastEventRuntimeCheckerMismatch) return;
  const previous = lastEventRuntimeCheckerMismatch;
  lastEventRuntimeCheckerMismatch = signature;
  if (signature) chromiumDiagnostics.log.record('event-checker', 'state-divergence', { generation, mismatches });
  else if (previous) chromiumDiagnostics.log.record('event-checker', 'state-converged', { generation });
}

function rememberSessionTitle() {
  if (!browser?.webContents || browser.webContents.isDestroyed() || pageLoading) return;
  const selected = store.selected();
  if (!selected?.chatUrl || normalizeChatUrl(browser.webContents.getURL()) !== selected.chatUrl) return;
  const title = browser.webContents.getTitle().replace(/\s*[-–—|]\s*ChatGPT$/i, '').trim();
  if (!title || /^(ChatGPT|New chat|Новый чат)$/i.test(title) || selected.title === title) return;
  void store.setSessionTitle(selected.workspace, selected.sessionId, title)
    .then(changed => { if (changed) publish(); }).catch(() => {});
}

function rememberScopeTitle() {
  const selected = store.selected();
  const info = planMonitor.view(selected, controller?.state?.projectInfo);
  if (!selected || !info || info.workspace !== selected.workspace || info.inspectedSessionId !== selected.sessionId
      || !['ACTIVE', 'BLOCKED'].includes(info.scopeStatus)
      || typeof info.scopeId !== 'string' || !info.scopeId || typeof info.objective !== 'string' || !info.objective.trim()) return;
  void store.applyScopeTitle(selected.workspace, selected.sessionId, info)
    .then(changed => {
      if (!changed) return;
      publish();
      void syncSelectedSessionTitle({ force: true, reason: 'scope-title-changed' });
    }).catch(() => {});
}

function selectedTitleCandidate() {
  const selected = store.selected();
  if (!selected?.chatUrl || !selected.title || !['manual', 'scope'].includes(selected.titleSource)) return null;
  return { workspace: selected.workspace, sessionId: selected.sessionId, chatUrl: selected.chatUrl, title: selected.title };
}

function selectedTitleSyncTarget(candidate = selectedTitleCandidate()) {
  if (!candidate || !browser?.webContents || browser.webContents.isDestroyed() || pageLoading) return null;
  if (normalizeChatUrl(browser.webContents.getURL()) !== candidate.chatUrl) return null;
  return candidate;
}

function recordTitleSync(target, result, reason = 'event') {
  chromiumDiagnostics?.log.record('app', 'title-sync', {
    sessionId: target?.sessionId ?? null,
    ok: result?.ok === true,
    code: typeof result?.code === 'string' ? result.code : null,
    status: Number.isInteger(result?.status) ? result.status : null,
    changed: result?.changed === true,
    matched: result?.matched === true,
    reason,
  });
}

async function syncSelectedSessionTitle({ force = false, reason = 'event' } = {}) {
  const candidate = selectedTitleCandidate();
  if (!candidate) return { ok: false, code: 'TITLE_SYNC_NO_EXPLICIT_TITLE' };
  const target = selectedTitleSyncTarget(candidate);
  if (!target) return { ok: false, code: 'TITLE_SYNC_NOT_READY' };
  if (!force && titleSyncSuccess.get(target.sessionId) === target.title)
    return { ok: true, skipped: true, title: target.title };
  const pending = titleSyncPending.get(target.sessionId);
  if (pending) return pending;

  const operation = browser.webContents.executeJavaScript(chatGPTTitleScript({
    expectedUrl: target.chatUrl, title: target.title,
  }), true).then(result => {
    const value = result ?? { ok: false, code: 'TITLE_SYNC_FAILED' };
    recordTitleSync(target, value, reason);
    if (value.ok) titleSyncSuccess.set(target.sessionId, target.title);
    return value;
  }, () => {
    const value = { ok: false, code: 'TITLE_SYNC_EXECUTION_FAILED' };
    recordTitleSync(target, value, reason);
    return value;
  }).finally(() => {
    if (titleSyncPending.get(target.sessionId) === operation) titleSyncPending.delete(target.sessionId);
    const current = selectedTitleCandidate();
    if (current?.sessionId === target.sessionId && current.title !== target.title)
      queueMicrotask(() => void syncSelectedSessionTitle({ force: true, reason: 'title-changed-during-sync' }));
  });
  titleSyncPending.set(target.sessionId, operation);
  return operation;
}

function report(error) { startupError = publicError(error); if (setupState) setupState = { ...setupState, phase: 'error', error: startupError }; publish(); }
function remotePreferences() {
  return { partition, preload: undefined, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true };
}

function isChatGPTOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'chatgpt.com' && (!url.port || url.port === '443');
  } catch { return false; }
}

function permissionAllowed(permission, origin, details = {}, contents = null) {
  if (!isChatGPTOrigin(origin)) return false;
  if (permission === 'clipboard-sanitized-write') {
    const primary = browser?.webContents;
    return Boolean(contents && primary && !primary.isDestroyed() && contents.id === primary.id);
  }
  if (permission === 'geolocation' || permission === 'geolocation-approximate') return true;
  if (permission !== 'media') return false;
  const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes
    : details.mediaType ? [details.mediaType] : [];
  return mediaTypes.length > 0 && mediaTypes.every(type => type === 'audio');
}

function secureRemote(contents) {
  contents.on('will-navigate', (event, url) => { if (!url.startsWith('https://')) event.preventDefault(); });
  contents.setWindowOpenHandler(({ url }) => ({ action: url.startsWith('https://') ? 'allow' : 'deny',
    overrideBrowserWindowOptions: { width: 980, height: 780, webPreferences: remotePreferences() } }));
  contents.on('did-create-window', child => {
    secureRemote(child.webContents);
    if (contents === browser?.webContents) child.once('closed', () => { void refreshStartupAccount(); });
  });
}

function clampedSidebarWidth(value = preferences.sidebarWidth) {
  const windowWidth = surface.contentWidth() ?? 1440;
  const max = Math.max(SIDEBAR_MIN_WIDTH, windowWidth - BROWSER_MIN_WIDTH);
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(max, Math.round(Number(value) || SIDEBAR_MIN_WIDTH)));
}

function layout() { surface.layout(clampedSidebarWidth()); }

const archiveRecords=(...args)=>lifecycle.archiveRecords(...args);
const sessionArchiveRecords=(...args)=>lifecycle.sessionArchiveRecords(...args);
function registerArchiveAction(channel, action) {
  desktopIpc.handle('archive', channel, input => {
    const operation = actionTail.catch(() => {}).then(async () => {
      try {
        const result = await action(input); publish();
        return { ok: true, state: archiveSnapshot(), result };
      } catch (error) {
        archiveState = { ...archiveState, notice: publicError(error).message }; publishArchive();
        return { ok: false, error: publicError(error), state: archiveSnapshot() };
      }
    });
    actionTail = operation; return operation;
  });
}

function registerAction(channel, action, { navigation = false } = {}) {
  desktopIpc.handle('local', channel, input => {
    const run = () => actionContext.run({ generation: navigationId }, async () => {
      const owner = actionContext.getStore();
      try {
        const result = await action(input);
        if (navigationCurrent(owner.generation)) publish();
        return { ok: true, state: snapshot(), result };
      } catch (error) {
        if (navigationCurrent(owner.generation)) report(error);
        return { ok: false, error: publicError(error), state: snapshot() };
      }
    });
    if (navigation) return run();
    const operation = actionTail.catch(() => {}).then(run);
    actionTail = operation;
    return operation;
  });
}

async function openArchiveWindow(workspace = null) {
  archiveState = { deletion: null, notice: null, focusWorkspace: workspace }; deletion.clear();
  await surface.openArchive(); publishArchive();
}
function archiveClosed() { deletion.clear(); archiveState = { deletion: null, notice: null, focusWorkspace: null }; }

function nextNavigation() {
  planMonitor.invalidate();
  const owner = actionContext.getStore();
  // An older async action cannot reclaim navigation after a newer user selection.
  if (owner && owner.generation !== navigationId) return owner.generation;
  const generation = ++navigationId;
  if (owner) owner.generation = generation;
  return generation;
}
function navigationCurrent(generation) {
  return generation === navigationId && !closed && surface.alive() && browser && !browser.webContents.isDestroyed();
}
function attachController(project, { freshDraft = false } = {}) {
  if(project?.external)return false;
  const selected = store.selected();
  if (!project || !navigationCurrent(workspaceHealth?.generation) || !workspaceHealth?.ready
      || workspaceHealth.workspace !== project.workspace || workspaceHealth.sessionId !== project.sessionId
      || selected?.workspace !== project.workspace || selected.sessionId !== project.sessionId
      || pageLoading || setupState || settingsState) return false;
  const record=liveSessions.visible;
  if(record?.identity?.workspace!==project.workspace||record.identity.sessionId!==project.sessionId)return false;
  record.ready=true;
  if(!controller.active)controller.attach(project,{freshDraft:freshDraft||record.freshDraft===true});
  record.freshDraft=false;
  return true;
}

async function navigate(project = store.selected(), { refresh = false, generation = null, resume = false, entryUrl = null, freshDraft = false } = {}) {
  if(project?.external) {liveSessions.hide();pageLoading=false;publish();return;}
  if (!project && pageLoading) return;
  const ownNavigation = generation ?? nextNavigation();
  if (!navigationCurrent(ownNavigation)) return;
  const record=selectLiveSession(project);
  if (workspaceHealth?.ready && workspaceHealth.workspace === project?.workspace
      && (generation === null || workspaceHealth.generation === ownNavigation))
    workspaceHealth = { ...workspaceHealth, generation: ownNavigation, sessionId: project.sessionId };
  pageLoading = record.loading; startupFlow?.beginPage(ownNavigation); publish();
  void planMonitor.refresh();
  const target = entryUrl ?? project?.chatUrl
    ?? (project ? chatGPTEntrypoint(project.experience ?? 'chat') : CHATGPT_SIGNIN_ENTRYPOINT);
  const began = Date.now();
  chromiumDiagnostics?.log.record('app', 'navigation-requested', { generation: ownNavigation, url: safeUrl(target), ...surface.bounds() });
  const waiting = setTimeout(() => {
    if (navigationCurrent(ownNavigation) && pageLoading) chromiumDiagnostics?.log.record('app', 'navigation-waiting', {
      generation: ownNavigation, elapsedMs: Date.now() - began, url: safeUrl(target),
      currentUrl: safeUrl(browser.webContents.getURL()), loading: browser.webContents.isLoading(),
    });
  }, 15000);
  waiting.unref?.();
  try {
    const alreadyOpen = !refresh && !entryUrl && record.composer.getURL() === target;
    if (!alreadyOpen) {
      const firstOpening = !project && !record.composer.getURL();
      pageLoading=true;
      if (firstOpening) await record.browser.navigate(target, { startup:true,
        isCurrent: () => navigationCurrent(ownNavigation),
      });
      else await liveSessions.navigate(record,target,{reload:refresh||!!entryUrl,freshDraft});
    }
    if (!navigationCurrent(ownNavigation)) return;
    pageLoading = false; startupFlow?.finishPage(ownNavigation);
    void refreshStartupAccount();
    if (attachController(project && store.project(project.workspace), { freshDraft })) {
      if (refresh) await controller.retry();
      else void controller.tick();
      if (pageState.current) applyObservedPage({ state: pageState.current.state });
    }
    publish();
    void syncSelectedSessionTitle({ force: true, reason: 'navigation-loaded' });
  } catch (error) {
    if (!navigationCurrent(ownNavigation)) return;
    chromiumDiagnostics?.log.record('app', 'load-url-failed', { generation: ownNavigation, url: safeUrl(target),
      elapsedMs: Date.now() - began, errorCode: Number.isFinite(error.errno) ? error.errno : null,
      errorName: /^(?:ERR|PAGE)_[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : null });
    pageLoading = false; startupFlow?.finishPage(ownNavigation, error.code ?? 'PAGE_LOAD_FAILED');
    const code = /^(?:ERR|PAGE)_[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'PAGE_LOAD_FAILED';
    report(Object.assign(new Error(code === 'PAGE_RESPONSE_TIMEOUT'
      ? 'ChatGPT не ответил за две минуты. Скопируйте диагностику перед повтором.'
      : 'Не удалось открыть сайт ChatGPT. Скопируйте диагностику и повторите открытие.'), { code }));
  } finally { clearTimeout(waiting); }
}

function pauseForSetup() {
  const generation = nextNavigation();
  if (!navigationCurrent(generation)) return false;
  pageLoading = false; startupError = null;
  startupFlow?.beginPage(generation);
  if (!browser.webContents.isLoading()) startupFlow?.finishPage(generation);
  return true;
}
function cancelSetup() {
  workspaceSetup.clear(); setupState = null; startupError = null;
  const current = store.landing(); if (current) void selectWorkspace(current.workspace, { resume: true }).catch(report);
  else if (startupFlow) { startupActive = true; void navigate(null); }
  publish();
}
async function reviewWorkspace(workspace, openReady = false, { generation = null } = {}) {
  if (storageError) throw new Error('Сначала нужно восстановить сохранённый список проектов. Исходный файл оставлен без изменений.');
  const ownNavigation = generation ?? nextNavigation();
  if (!navigationCurrent(ownNavigation)) return false;
  pageLoading = false; startupError = null;
  const canonical = await executionServices.canonicalPath(workspace).catch(() => workspace);
  if (!navigationCurrent(ownNavigation)) return false;
  if (store.project(canonical)?.archivedAt) { await openArchiveWindow(canonical); publish(); return false; }
  settingsState = null; deletion.clear();
  const firstSessionExperience = 'chat';
  setupState = { phase: 'checking', mode: 'existing', workspace, firstSessionExperience }; publish();
  const preview = await workspaceSetup.preview({ mode: 'existing', workspace });
  if (!navigationCurrent(ownNavigation)) return false;
  const firstSessionRequired = !store.project(preview.workspace);
  setupState = { ...preview, phase: 'preview', firstSessionRequired, firstSessionExperience: firstSessionRequired ? firstSessionExperience : 'chat' };
  if (preview.ready && openReady) {
    workspaceHealth = { ...preview, phase: 'ready', generation: ownNavigation }; setupState = null; workspaceSetup.clear();
    return true;
  }
  publish(); return false;
}
async function openConnectedSession(input, sessionId = null, { latest = false, resume = false } = {}) {
  const explicitSession = sessionId !== null;
  const generation = nextNavigation();
  const current = () => navigationCurrent(generation);
  if (!current()) return null;
  if (storageError) throw new Error('Сначала нужно восстановить сохранённый список проектов.');
  settingsState = null; setupState = null;
  startupError = null; pageLoading = true;
  workspaceHealth = { workspace: input, sessionId, generation, phase: 'checking', ready: false }; publish();
  try {
    if (typeof input !== 'string' || !path.isAbsolute(input)) throw new Error('Выберите папку проекта.');
    const workspace = await executionServices.canonicalPath(input);
    if (!current()) return null;
    const record = store.snapshot().projects.find(p => p.workspace === workspace);
    if (record?.archivedAt) { pageLoading = false; workspaceHealth = null; await openArchiveWindow(workspace); return null; }
    // Only the first connection needs the complete strict setup path.
    if (!record) {
      if (!await reviewWorkspace(workspace, true, { generation })) return null;
      const project = explicitSession && record
        ? await store.selectSession(workspace, sessionId, { isCurrent: current })
        : await store.select(workspace, { latest, isCurrent: current });
      if (!current()) return null;
      workspaceHealth = { ...workspaceHealth, sessionId: project.sessionId };
      publish(); void navigate(project, { generation, resume, freshDraft: true }); return project;
    }
    sessionId ??= latest ? activeSessionsNewestFirst(record.sessions)[0]?.sessionId : record.selectedSessionId;
    workspaceHealth = { workspace, sessionId, generation, phase: 'checking', ready: false };
    const project = await store.selectSession(workspace, sessionId, { isCurrent: current, expand: latest || explicitSession });
    if (!current() || !project) return null;
    publish();
    if(project.external) {
      workspaceHealth={workspace,sessionId,generation,phase:'ready',ready:true};
      await navigate(project,{generation});void planMonitor.refresh();return project;
    }
    const sessionRecord=liveSessions.ensure(project);
    sessionRecord.ready=false;sessionRecord.readyBeforeCrash=false;
    const readinessEpoch=++sessionRecord.readinessEpoch;
    void navigate(project, { generation, resume });
    // Inspection runs in the existing worker and never holds the IPC or store queue.
    void workspaceSetup.ready(workspace).then(result => {
      if(sessionRecord.disposed||sessionRecord.readinessEpoch!==readinessEpoch)return;
      sessionRecord.ready=result.ready;
      if(result.ready)liveSessions.tick(sessionRecord);else sessionRecord.controller.cancel();
      if (!current()) return;
      workspaceHealth = { ...result, workspace, sessionId, generation, phase: result.ready ? 'ready' : 'error' };
      if (attachController(project)) void controller.tick();
      publish();
    }).catch(error => {
      if(sessionRecord.disposed||sessionRecord.readinessEpoch!==readinessEpoch)return;
      sessionRecord.ready=false;sessionRecord.error=publicError(error);sessionRecord.controller.cancel();
      if (!current()) return;
      workspaceHealth = { workspace, sessionId, generation, phase: 'error', ready: false, error: publicError(error) }; publish();
    });
    return project;
  } catch (error) {
    if (!current()) return null;
    pageLoading = false;
    workspaceHealth = { ...workspaceHealth, phase: 'error', ready: false, error: publicError(error) };
    report(error); return null;
  }
}
async function selectWorkspace(input, { latest = false, resume = false } = {}) {
  return openConnectedSession(input, null, { latest, resume });
}

const vpsView = publicVpsState;

function appServerSourceFolder() {
  return app.isPackaged ? path.join(process.resourcesPath, 'codex-app-server-mcp')
    : path.join(sourceDir, '../tools/codex-app-server-mcp');
}

function ensureRuntimeSwitcher() {
  if (smoke) return null;
  const windows = process.platform === 'win32';
  appServerRuntime ??= new CodexAppServerRuntime({
    sourceDir: appServerSourceFolder(), stateDir: runtimeFolder, execute: executionServices.executeFile,
    ...(process.platform==='linux'?{bootstrap:linuxBootstrap}:windows
      // Windows has no system Python: the tools of the package and the private Python are prepared first.
      ? { bootstrap: windowsBootstrap }
      // The bundled uv builds the executor's Python on a Mac that has only the system one.
      : { uv: path.join(app.isPackaged ? process.resourcesPath : path.join(sourceDir, '../.harness/runtime'), 'mac-tools', 'uv') }),
  });
  // The forward of the user's own server: a LaunchAgent on macOS, a supervisor of control.py on Windows.
  if (process.platform === 'darwin') vpsTunnel ??= new VpsTunnel();
  else if (windows||process.platform==='linux') vpsTunnel ??= new WindowsVpsTunnel({platform:process.platform, control: args => appServerRuntime.vpsControl(args) });
  runtimeSwitcher ??= process.platform==='linux'
    ? new LinuxRuntimeSwitcher({appServerRuntime,vpsTunnel,bootstrap:linuxBootstrap,services:new LinuxServices({run:executionServices.executeFile})})
    : new MacRuntimeSwitcher({ appServerRuntime, vpsTunnel, execute: executionServices.executeFile });
  return runtimeSwitcher;
}

// Brings the local services up once per app run. Every caller shares the same attempt; a failed one is
// forgotten, so the next use of the services tries again.
function activateRuntime() {
  if (smoke) return Promise.resolve(null);
  runtimeActivation ??= (async () => {
    const result = await ensureRuntimeSwitcher().activate(runtime, { chatgptChannel:preferences.chatgptChannel });
    if (process.platform === 'win32') workspaceSetup.setRuntimeEnvironment(await windowsBootstrap.workflowEnvironment());
    if (process.platform === 'linux') workspaceSetup.setRuntimeEnvironment(await linuxBootstrap.workflowEnvironment());
    contextCache.clear();
    return result.status;
  })().catch(error => { runtimeActivation = null; throw error; });
  return runtimeActivation;
}

function createStartupFlow() {
  if (offline || !startupSupported(process.platform, smoke)) return;
  startupActive = store.snapshot().projects.length === 0;
  const startup = control.configureStartup({readiness:{
    ...startupPlatformOptions({ platform: process.platform, setup: workspaceSetup,
      bootstrap: appServerRuntime, components: linuxBootstrap??windowsBootstrap,
      ensureRuntime: activateRuntime, control: (command, options) => {
        if (command === 'status') return executionServices.inspectServices();
        if (command === 'start') return options?.mcpOnly ? executionServices.startMcpOnly() : executionServices.ensureServices();
        throw new Error('Неизвестная операция готовности служб.');
      },
      inspectGit: () => inspectMacGit(), installGit: () => installMacGit() }),
    onChange: publish,
  }, clipboard:{
    readText: () => clipboard.readText(),
    promptTunnelId: () => appServerRuntime.promptTunnelId(),
    onChange: publish,
  }});
  startupFlow=startup.flow;startupClipboard=startup.clipboard;
}
function observeStartupClipboard() {
  if (!startupClipboard || !startupFlow) return;
  const s = startupFlow.snapshot();
  startupClipboard.observe({
    active: startupActive && !settingsState && !setupState && s.account === 'signed-in' && !s.tunnel,
    ready: s.node && s.git && s.runtime, busy: s.busy,
  });
}
function observeStartupAccount(observation = pageState.current?.state) {
  if (!startupFlow || !startupActive || !browser || browser.webContents.isDestroyed()) return false;
  const generation = navigationId;
  const record = reason => chromiumDiagnostics?.recordAccountCheck({ reason, observedLogin: observation?.login,
    observationPresent: !!observation, generation });
  if (!observation) { record('observer-unavailable'); return false; }
  if (!navigationCurrent(generation)) { record('stale-navigation'); return false; }
  if (!isChatGPTOrigin(observation.url)) { record('origin-mismatch'); return false; }
  if (observation.url !== browser.webContents.getURL()) { record('url-mismatch'); return false; }
  if (['loading', 'slow', 'idle'].includes(startupFlow.snapshot().page)) startupFlow.finishPage(generation);
  startupFlow.observe(generation, observation);
  record(startupFlow.snapshot().page === 'failed' ? 'page-failed' : 'applied');
  chromiumDiagnostics?.observePage(observation);
  return true;
}
async function refreshStartupAccount() {
  if (!startupFlow || !startupActive || !browser || browser.webContents.isDestroyed()) return false;
  const generation = navigationId;
  if (!navigationCurrent(generation) || !isChatGPTOrigin(browser.webContents.getURL())) return false;
  try {
    const observation = await browser.webContents.executeJavaScriptInIsolatedWorld(999, [{ code: 'globalThis.__webPilotObserverSnapshot?.()' }]);
    if (!navigationCurrent(generation)) return false;
    return observeStartupAccount(observation) || observeStartupAccount();
  } catch {
    chromiumDiagnostics?.recordObserverFailure('PAGE_OBSERVER_READ_FAILED');
    return observeStartupAccount();
  }
}
async function startupAction(action) {
  if (!startupFlow) throw new Error('Начальная настройка недоступна на этой платформе.');
  if (action === 'show') {
    settingsState = null; setupState = null; workspaceSetup.clear(); startupError = null; startupActive = true;
    if (!store.selected()) void navigate(null);
    else void refreshStartupAccount();
    return startupFlow.check({ prepare: process.platform === 'win32' });
  }
  if (!startupActive) throw new Error('Сначала откройте начальную настройку.');
  if (action === 'copy-diagnostics') {
    await refreshStartupAccount();
    await clipboard.writeText(await chromiumDiagnostics.startupReport());
    return true;
  }
  if (action === 'check-account') {
    chromiumDiagnostics?.recordAccountCheck({ reason: 'manual-check', generation: navigationId });
    await refreshStartupAccount();
    return true;
  }
  if (action === 'check') { await refreshStartupAccount(); return startupFlow.check({ prepare: true }); }
  if (action === 'install-git') return startupFlow.install();
  if (action === 'paste-tunnel-id' || action === 'configure-tunnel') {
    const s = startupFlow.snapshot();
    if (s.busy || !s.node || !s.git || !s.runtime || s.tunnel || s.account !== 'signed-in')
      throw new Error('Завершите вход и подготовку компьютера перед настройкой подключения.');
    if (action === 'paste-tunnel-id') return startupClipboard.pasteTunnelId();
    return startupClipboard.configureManually(credentials => startupFlow.configure(credentials));
  }
  if (action === 'chat' || action === 'signup') { startupError = null; return navigate(null); }
  if (action === 'plugins') { startupError = null; return navigate(null, { entryUrl: 'https://chatgpt.com/plugins' }); }
  const pages = {
    tunnels: 'https://platform.openai.com/settings/organization/tunnels',
    keys: 'https://platform.openai.com/api-keys',
    help: 'https://developers.openai.com/api/docs/guides/secure-mcp-tunnels',
  };
  if (Object.hasOwn(pages, action)) return shell.openExternal(pages[action]);
  if (action === 'continue') {
    await startupFlow.check();
    await refreshStartupAccount();
    const state = startupFlow.snapshot();
    if (state.busy || !state.node || !state.git || !state.runtime || !state.tunnel || state.account !== 'signed-in')
      throw new Error('Завершите вход и проверку подключения перед созданием проекта.');
    startupActive = false; startupError = null; return true;
  }
  throw new Error('Неизвестное действие начальной настройки.');
}

function connectController() {
  for(const record of liveSessions.all())record.controller.runtime=sessionContextRuntime;
}
function selectLiveSession(project=null) {
  const record=liveSessions.ensure(project);
  if(project?.planExecution?.execution_strategy==='parallel')execution.observe(project.workspace);
  const changed=liveSessions.visible!==record;
  browser=sessionView(record);controller=record.controller;pageState=record.pageState;
  agentTimer=record.timer;conversationRecovery=record.recovery;
  chromiumDiagnostics=record.diagnostics;chatColorStyles=record.colors;pageLoading=record.loading;
  liveSessions.show(record);layout();
  if(changed)applyObservedPage(record.pageState.current??{reset:true},record);
  return record;
}
function decorateSessionRuntime(record) {
  configurePrimary(record);
  record.controller.canSendContext=project=>!project.assignmentId||projectAutoPlan.enabled(project.parentWorkspace,project.parentScopeId);
  const contents=sessionView(record).webContents, handlers=[];
  const on=(event,fn)=>{contents.on(event,fn);handlers.push([event,fn]);};
  if(eventBaseline) {
    const execute=contents.executeJavaScript.bind(contents);
    contents.executeJavaScript=(...args)=>{runtimeMetrics.executeJavaScript++;return execute(...args);};
  }
  if (remotePages) secureRemote(contents);
  record.colors=new ChatColors(contents,preferences.chatColors);
  record.diagnostics=new ChromiumDiagnostics(contents,{file:chromiumDiagnosticsFile,allowFixture:smoke,
    owner:()=>({workspace:record.identity?.workspace,sessionId:record.identity?.sessionId}),
    onConversationRateLimit:(id,seconds)=>record.recovery.rateLimited(id,seconds),
    startupNetwork:!smoke&&!record.identity&&store.snapshot().projects.length===0});
  void record.diagnostics.start({appVersion:app.getVersion(),platform:process.platform,electron:process.versions.electron,
    chromium:process.versions.chrome,fixture:smoke}).catch(()=>{});
  record.browser.setDiagnostic(({event,...fields})=>record.diagnostics.log.record('composer',event,{sessionId:record.identity?.sessionId??null,...fields}));
  on('page-title-updated',()=>{if(record===liveSessions.visible)rememberSessionTitle();});
  on('did-start-navigation',(event,_url,inPlace,mainFrame)=>{
    if(record===liveSessions.visible&&(event.isMainFrame??mainFrame)&&!(event.isSameDocument??inPlace)&&startupActive)
      startupFlow?.beginPage(navigationId);
  });
  on('did-navigate-in-page',()=>{
    void applyToolCallVisibility(sessionView(record));void installChatGPTAutoScroll(contents);
    if(record===liveSessions.visible)void syncSelectedSessionTitle({reason:'session-navigated'});
  });
  on('did-finish-load',()=>{
    if(record===liveSessions.visible) {
      pageLoading=false;
      if(startupActive){startupFlow?.finishPage(navigationId);void refreshStartupAccount();}
      attachController(record.project());
    }
    void applyToolCallVisibility(sessionView(record));void installChatGPTAutoScroll(contents,{forceFollow:true});publish();
  });
  return ()=>{
    for(const [event,fn] of handlers)contents.removeListener(event,fn);
    record.colors.dispose();void record.diagnostics.stop().catch(()=>{});
  };
}

function registerIpc() {
  desktopIpc.handle('local', 'pilot:get-state', snapshot);
  registerAction('pilot:auto-plan', enabled => {if(store.selected()?.external)throw new Error('Автовыполнение для внешней сессии пока не поддерживается.');return workflow.setAutoPlan(enabled);});
  registerAction('pilot:plan-review', input => planReview.setEnabled(input));
  registerAction('pilot:acknowledge-command', input=>lifecycle.acknowledgeCommand(input));
  registerAction('pilot:set-parallel-execution', async input => {
    if (!settingsState) throw new Error('Откройте настройки.');
    const next = validateParallelSettings(input ?? null);
    await saveSettings({ parallelExecution: next });
  });
  registerAction('pilot:clear-orphan-executor', input=>lifecycle.clearOrphanExecutor(input));
  registerAction('pilot:reconnect', () => {if(!store.selected()?.external)return conversationRecovery.requestRetry();});
  registerAction('pilot:startup', action => startupAction(action), { navigation: true });
  registerAction('pilot:open-archive-window', input => openArchiveWindow(typeof input === 'string' ? input : null));
  registerAction('pilot:open-settings', () => openSettings());
  registerAction('pilot:open-chat-colors', () => surface.openColors());
  registerAction('pilot:open-doctor', () => openSettings(setupState?.workspace ?? (workspaceHealth?.phase === 'error' ? workspaceHealth.workspace : null) ?? store.selected()?.workspace));
  const doctorWorkspace = input => {
    if (typeof input !== 'string' || (!store.project(input) && input !== doctorState?.workspace)) throw new Error('Выберите проект в настройках.');
    return input;
  };
  registerAction('pilot:doctor-select', input => {
    if (!settingsState) throw new Error('Откройте настройки.');
    doctorState = { workspace: doctorWorkspace(input), phase: 'idle' };
  });
  registerAction('pilot:doctor-run', async input => {
    if (!settingsState) throw new Error('Откройте настройки.');
    const workspace = doctorWorkspace(input);
    pauseForSetup(); contextCache.clear();
    const result = await projectDoctor.run(workspace, report => { doctorState = report; publish(); });
    doctorState = { ...result, phase: 'done' }; startupError = null;
  });
  registerAction('pilot:doctor-backup', async () => {
    if (!doctorState?.backupPath) throw new Error('Резервная копия ещё не создана.');
    const error = await shell.openPath(doctorState.backupPath);
    if (error) throw new Error('Не удалось открыть папку резервной копии.');
  });
  registerAction('pilot:doctor-review', async () => {
    if (!doctorState?.workspace) throw new Error('Выберите проект.');
    await reviewWorkspace(doctorState.workspace);
  });
  registerAction('pilot:doctor-continue', async mode => {
    if (!['open','chat','work'].includes(mode) || doctorState?.phase !== 'done' || !doctorState.projectReady || !doctorState.servicesReady || doctorState.issues.length) throw new Error('Выберите открытие чата или новую сессию после проверки проекта.');
    const workspace = doctorState.workspace;
    if (!await reviewWorkspace(workspace, true)) return;
    const generation = navigationId, existing = store.project(workspace);
    let project = await store.select(workspace, { experience: mode === 'work' ? 'work' : 'chat', isCurrent: () => navigationCurrent(generation) });
    if (!navigationCurrent(generation) || !project) return;
    if (['chat','work'].includes(mode) && existing) project = await store.newSession(workspace, mode);
    if (!navigationCurrent(generation)) return;
    await navigate(project, { generation, freshDraft: !existing || ['chat','work'].includes(mode) });
  });
  registerAction('pilot:close-settings', closeSettings);
  registerAction('pilot:set-sidebar-width', async input => {
    if (!Number.isFinite(input)) throw new Error('Некорректная ширина сайдбара.');
    const next = clampedSidebarWidth(input);
    if (next === preferences.sidebarWidth) { layout(); return next; }
    await saveSettings({ sidebarWidth: next }); layout();
    return next;
  });
  registerAction('pilot:set-theme', async input => {
    if (!['light', 'dark'].includes(input)) throw new Error('Неизвестная тема оформления.');
    if (input === preferences.shellTheme) return;
    await saveSettings({ shellTheme: input });
    applyShellTheme(input);
  });
  registerAction('pilot:set-hide-tool-calls', async input => {
    if (typeof input !== 'boolean') throw new Error('Некорректная настройка отображения инструментов.');
    if (input === preferences.hideToolCalls) return;
    await saveSettings({ hideToolCalls: input });
    await Promise.all([...liveSessions.all()].map(record=>applyToolCallVisibility(sessionView(record))));
  });
  registerAction('pilot:set-chatgpt-channel', async input => {
    if (smoke || typeof runtime?.setChannel !== 'function') throw new Error('Выбор канала ChatGPT недоступен на этой платформе.');
    if (!CHATGPT_CHANNELS.includes(input)) throw new Error('Неизвестный канал ChatGPT.');
    if (input === preferences.chatgptChannel && runtime.channel === input) return { channel: preferences.chatgptChannel };
    try {
      return { channel: input, status: publicRuntimeState(await executionServices.selectChannel(input)) };
    } finally {
      // The selector may already hold the new channel even if starting it failed.
      if (runtime.channel !== preferences.chatgptChannel) { await saveSettings({ chatgptChannel:runtime.channel }); }
    }
  });
  registerAction('pilot:refresh-chatgpt-channel', async () => {
    if (smoke || typeof runtime?.setChannel !== 'function') throw new Error('Проверка канала ChatGPT недоступна на этой платформе.');
    await executionServices.inspectServices();
  });
  registerAction('pilot:copy-vps-connector-url', async () => {
    ensureRuntimeSwitcher();
    if (!vpsTunnel) throw new Error('Канал VPS недоступен на этой платформе.');
    // The full address goes straight to the clipboard; it is never returned, published or logged.
    await clipboard.writeText(await vpsTunnel.connectorUrl());
    return { copied: true };
  });
  registerAction('pilot:copy-workspace-path', async input => {
    const project = store.project(input);
    if (!project || project.archivedAt) throw new Error('Выберите активный проект.');
    await clipboard.writeText(project.workspace);
    return project.workspace;
  });
  registerAction('pilot:copy-external-client-line', async input => {
    const project = store.project(input);
    if (!project || project.archivedAt) throw new Error('Выберите активный проект.');
    // Clipboard only: nothing is sent to a chat, and the line holds no connector address or key.
    const line = externalClientLine({ name: project.displayName || project.name, workspace: project.workspace });
    await clipboard.writeText(line);
    return line;
  });
  registerAction('pilot:rename-project', async input => {
    if (typeof input?.workspace !== 'string') throw new Error('Выберите активный проект.');
    return store.setProjectDisplayName(input.workspace, input.name);
  });
  registerAction('pilot:rename-session', async input => {
    if (typeof input?.workspace !== 'string' || typeof input?.sessionId !== 'string') throw new Error('Выберите сессию проекта.');
    const changed = await store.renameSession(input.workspace, input.sessionId, input.name);
    if (changed && store.selected()?.workspace === input.workspace && store.selected()?.sessionId === input.sessionId)
      void syncSelectedSessionTitle({ force: true, reason: 'manual-rename' });
    return changed;
  });
  registerAction('pilot:archive-project', async input => {
    const project = store.project(input);
    if (!project || project.archivedAt || storageError) throw new Error('Выберите активный проект.');
    const selected = store.selected()?.workspace === input;
    if (selected) { if(!project.external)controller.cancel(); nextNavigation(); }
    const generation = navigationId;
    try { await store.setArchived(input, true); }
    catch (error) { if (selected && navigationCurrent(generation)) await selectWorkspace(project.workspace, { resume: true }); throw error; }
    if (!navigationCurrent(generation)) return;
    startupError = null;
    if (selected) { workspaceHealth = null; await navigate(null, { generation }); }
  });
  registerAction('pilot:archive-session', async input => {
    if (typeof input?.workspace !== 'string' || typeof input?.sessionId !== 'string') throw new Error('Выберите сессию проекта.');
    const current = store.selected(); const selected = current?.workspace === input.workspace && current.sessionId === input.sessionId;
    if (selected) { if(!current.external)controller.cancel(); nextNavigation(); }
    const generation = navigationId;
    try { await store.setSessionArchived(input.workspace, input.sessionId, true); }
    catch (error) { if (selected && current && navigationCurrent(generation)) await selectWorkspace(current.workspace, { resume: true }); throw error; }
    if (!navigationCurrent(generation)) return;
    startupError = null;
    if (selected) { const fallback = store.selected(); if (fallback) await selectWorkspace(fallback.workspace); }
  });
  registerAction('pilot:begin-create', () => {
    if (storageError) throw new Error('Сначала нужно восстановить сохранённый список проектов.');
    settingsState = null; deletion.clear(); pauseForSetup(); workspaceSetup.clear();
    setupState = { phase: 'form', mode: 'new', name: '', firstSessionRequired: true, firstSessionExperience: 'chat', parent: preferences.projectsParent };
  });
  registerAction('pilot:choose-parent', async input => {
    if (setupState?.mode !== 'new') return;
    const name = typeof input?.name === 'string' ? input.name.slice(0, 120) : setupState.name;
    const result = await surface.showOpenDialog({ title: 'Выбрать расположение папки для проектов', buttonLabel: 'Выбрать папку',
      properties: ['openDirectory'], ...(setupState.parent ? { defaultPath: setupState.parent } : {}) });
    const parent = result.canceled ? setupState.parent : result.filePaths[0];
    if (!result.canceled) {
      if (typeof parent !== 'string' || !path.isAbsolute(parent)) throw new Error('Выберите папку для проектов.');
      await saveSettings({ projectsParent: parent });
    }
    setupState = { phase: 'form', mode: 'new', name, firstSessionRequired: true, firstSessionExperience: setupState.firstSessionExperience ?? 'chat', parent };
  });
  registerAction('pilot:preview-new', async input => {
    if (setupState?.mode !== 'new') throw new Error('Сначала нажмите «Создать проект».');
    const parent = setupState.parent, name = input?.name, firstSessionExperience = setupState.firstSessionExperience ?? 'chat';
    if (typeof parent !== 'string' || !path.isAbsolute(parent)) throw new Error('Сначала выберите расположение папки для проектов.');
    setupState = { phase: 'checking', mode: 'new', parent, name, firstSessionRequired: true, firstSessionExperience }; publish();
    const preview = await workspaceSetup.preview({ mode: 'new', parent, name });
    setupState = { ...preview, phase: 'preview', parent, name, firstSessionRequired: true, firstSessionExperience };
  });
  registerAction('pilot:refresh-setup', async () => {
    if (!setupState) return;
    const { mode, parent, name, workspace } = setupState;
    const firstSessionExperience = setupState.firstSessionExperience ?? 'chat';
    setupState = { phase: 'checking', mode, parent, name, workspace, firstSessionRequired: setupState.firstSessionRequired, firstSessionExperience }; startupError = null; publish();
    const preview = await workspaceSetup.preview({ mode, parent, name, workspace });
    const firstSessionRequired = !store.project(preview.workspace);
    setupState = { ...preview, phase: 'preview', parent, name: preview.name, firstSessionRequired, firstSessionExperience: firstSessionRequired ? firstSessionExperience : 'chat' };
  });
  registerAction('pilot:set-first-session-experience', input => {
    if (!setupState?.firstSessionRequired || !['chat', 'work'].includes(input)) throw new Error('Выберите Chat или Work для первой сессии.');
    setupState = { ...setupState, firstSessionExperience: input };
    return input;
  });
  registerAction('pilot:cancel-setup', cancelSetup);
  registerAction('pilot:apply-setup', async input => {
    if (!setupState?.token || input?.token !== setupState.token) throw new Error('Сначала проверьте выбранную папку.');
    if (input.experience !== undefined && !['chat', 'work'].includes(input.experience))
      throw new Error('Выберите Chat или Work для первой сессии.');
    const firstSessionRequired = !!setupState.firstSessionRequired;
    const requestedExperience = input.experience ?? setupState.firstSessionExperience;
    const firstSessionExperience = firstSessionRequired && requestedExperience === 'work' ? 'work' : 'chat';
    setupState = { ...setupState, phase: 'applying', error: null }; startupError = null; publish();
    const generation = navigationId;
    const result = await workspaceSetup.apply(input.token);
    if (!navigationCurrent(generation)) return;
    setupState = { ...result, phase: 'preview', mode: 'existing', firstSessionRequired, firstSessionExperience };
    if (!result.ready) return;
    workspaceHealth = result;
    const project = await store.select(result.workspace, { experience: firstSessionExperience, isCurrent: () => navigationCurrent(generation) });
    if (!navigationCurrent(generation) || !project) return;
    workspaceHealth = { ...workspaceHealth, generation };
    setupState = null; publish(); void navigate(project, { generation, freshDraft: firstSessionRequired });
  });
  registerAction('pilot:choose-workspace', async () => {
    pauseForSetup();
    const result = await surface.showOpenDialog({ title: 'Открыть папку проекта',
      buttonLabel: 'Проверить папку', properties: ['openDirectory'], defaultPath: path.join(os.homedir(), 'VSCODE') });
    if (result.canceled) { cancelSetup(); return; }
    return reviewWorkspace(result.filePaths[0]);
  });
  registerAction('pilot:select-workspace', input => {
    if (typeof input !== 'string' || !store.project(input)) throw new Error('Выберите проект из списка.');
    return store.setExpanded(input,true).then(()=>selectWorkspace(input, { latest: false }));
  }, { navigation: true });
  registerAction('pilot:select-session', async input => {
    if (storageError) throw new Error('Сначала нужно восстановить сохранённый список проектов.');
    if (typeof input?.workspace !== 'string' || typeof input?.sessionId !== 'string') throw new Error('Выберите сессию из дерева проекта.');
    return openConnectedSession(input.workspace, input.sessionId);
  }, { navigation: true });
  registerAction('pilot:set-expanded', input => {
    if (storageError) throw new Error('Сначала нужно восстановить сохранённый список проектов.');
    return store.setExpanded(input?.workspace, input?.expanded);
  });
  registerAction('pilot:new-session', async input => {
    if (typeof input?.workspace !== 'string' || !['chat', 'work'].includes(input?.experience)) throw new Error('Выберите проект и тип новой сессии.');
    if (!store.project(input.workspace)) throw new Error('Выберите активный проект.');
    if (!await reviewWorkspace(input.workspace, true)) return;
    const generation = navigationId;
    await store.select(input.workspace, { isCurrent: () => navigationCurrent(generation) });
    if (!navigationCurrent(generation)) return;
    const project = await store.newSession(input.workspace, input.experience);
    if (!navigationCurrent(generation)) return;
    startupError = null; void navigate(project, { generation, freshDraft: true });
  });
  registerAction('pilot:new-plugin-session', async workspace => {
    if(storageError||typeof workspace!=='string'||!plugin)throw new Error('Подключение плагина недоступно. Проверьте Workflow Pilot.');
    const project=store.project(workspace);
    if(!project||project.archivedAt||project.parentWorkspace)throw new Error('Выберите активный проект.');
    const opened=await plugin.open(project.projectId);
    const result=plugin.launch.request(opened.project);
    startupError=null;return result;
  });
  registerAction('pilot:return-chat', async () => { const current = store.selected(); if (current) await selectWorkspace(current.workspace); }, { navigation: true });
  registerAction('pilot:retry', async () => {
    const selected = store.selected(); if (selected && !await reviewWorkspace(selected.workspace, true)) return;
    startupError = null;
    const current = store.selected();
    if (current) workspaceHealth = { ...workspaceHealth, sessionId: current.sessionId };
    if (attachController(current)) await controller.retry();
  });
  // Devices are confirmed and removed only from the Mac, never from a remote client.
  const localRemote = () => {
    const remote = remoteAccess?.current;
    if (!remote) throw Object.assign(new Error('Доступ с других устройств недоступен.'), { code: 'REMOTE_DISABLED' });
    if (remote.initiatorIsRemote()) throw Object.assign(new Error('Подтверждать и отключать устройства можно только на компьютере.'), { code: 'REMOTE_LOCAL_ONLY' });
    return remote;
  };
  registerAction('pilot:remote-approve', input => localRemote().approve(String(input ?? '')));
  registerAction('pilot:remote-reject', input => localRemote().reject(String(input ?? '')));
  registerAction('pilot:remote-revoke', input => localRemote().revoke(String(input ?? '')));
  registerAction('pilot:remote-access', input => localRemote().action(input));
  registerAction('pilot:reload', async () => { startupError = null; const current = store.selected(); if (current) await selectWorkspace(current.workspace); else void navigate(); }, { navigation: true });

  desktopIpc.handle('archive', 'archive:get-state', archiveSnapshot);
  registerArchiveAction('archive:restore', async input => {
    const projects = archiveRecords(input);
    for (const project of projects) {
      if (deletion.isPending(project.workspace)) throw new Error('Сначала завершите подтверждённое удаление.');
    }
    for (const project of projects) await store.setArchived(project.workspace, false);
    deletion.clear(); archiveState = { deletion: null, notice: `Возвращено в активные: ${projects.length}.`, focusWorkspace: null };
    return projects.length;
  });
  registerArchiveAction('archive:forget', async input => {
    const projects = archiveRecords(input);
    for (const project of projects) if (deletion.isPending(project.workspace)) throw new Error('Сначала завершите подтверждённое удаление.');
    const count = await store.forgetArchivedMany(projects.map(project => ({ workspace: project.workspace, projectId: project.projectId })));
    deletion.clear(); archiveState = { deletion: null, notice: `Убрано из списка: ${count}. Папки на диске сохранены.`, focusWorkspace: null };
    return count;
  });
  registerArchiveAction('archive:restore-sessions', async input => {
    const records = sessionArchiveRecords(input);
    for (const { project, session } of records) await store.setSessionArchived(project.workspace, session.sessionId, false);
    archiveState = { ...archiveState, notice: `Возвращено сессий: ${records.length}.` };
    return records.length;
  });
  registerArchiveAction('archive:delete-sessions', async input => {
    const records = sessionArchiveRecords(input);
    const count = await store.forgetArchivedSessions(records.map(({ project, session }) => ({ workspace: project.workspace, projectId: project.projectId, sessionId: session.sessionId })));
    archiveState = { ...archiveState, notice: `Удалено локальных сессий: ${count}. Облачные чаты ChatGPT сохранены.` };
    return count;
  });
  registerArchiveAction('archive:preview-delete', async input => {
    const [project] = archiveRecords([input], { single: true });
    archiveState = { deletion: null, notice: 'Проверяем содержимое папки…', focusWorkspace: project.workspace }; publishArchive();
    const preview = await deletion.preview(project.workspace);
    archiveState = { deletion: preview, notice: null, focusWorkspace: project.workspace }; return preview;
  });
  registerArchiveAction('archive:cancel-delete', () => { deletion.clear(); archiveState = { ...archiveState, deletion: null, notice: null }; });
  registerArchiveAction('archive:delete-project', async input => {
    if (!archiveState.deletion || input?.token !== archiveState.deletion.token) throw new Error('Откройте подтверждение удаления заново.');
    await deletion.apply(input.token, input.confirmation);
    archiveState = { deletion: null, notice: 'Папка и локальная история удалены. Чаты ChatGPT сохранены.', focusWorkspace: null };
  });
  registerArchiveAction('archive:recover-deletions', async () => {
    const errors = await deletion.recover();
    archiveState = { deletion: null, notice: errors.length ? null : 'Локальная очистка завершена.', focusWorkspace: errors[0]?.workspace ?? null };
    if (errors.length) throw Object.assign(new Error(errors[0].message), { code: errors[0].code });
  });
  desktopIpc.handle('archive', 'archive:close', () => { surface.closeArchive(); return { ok: true }; });
  // The same envelope as the in-process colour window.
  const colorAction = action => async input => {
    try { const result = await action(input); publish(); return { ok: true, state: colorsState(), result }; }
    catch (error) { return { ok: false, error: { message: error.message }, state: colorsState() }; }
  };
  desktopIpc.handle('colors', 'colors:get-state', colorAction(() => null));
  desktopIpc.handle('colors', 'colors:change', colorAction(input => changeChatColor(input)));
  desktopIpc.handle('colors', 'colors:reset', colorAction(() => setChatColors({})));
}

// Window lifecycle reported by the surface. Closing a window is never a page
// or automation event; dispose is the end of the whole model.
function windowFocused() { void planMonitor.refresh(); planReview.refresh(); observeStartupClipboard(); }
function dispose() {
  if (closed) return;
  closed = true;
  ++navigationId; desktopIpc.dispose(); startupClipboard?.dispose(); startupClipboard = null; startupFlow?.dispose(); startupFlow = null;
  autoPlan.dispose(); execution.dispose(); conversationRecovery?.reset(); controller?.cancel(); planMonitor.close();
  reviewContinuation.dispose(); planReview.dispose();
  if (eventRuntimeCheckerTimer !== null) clearInterval(eventRuntimeCheckerTimer);
  eventRuntimeCheckerTimer = null; liveSessions.dispose(); contextCache.clear(); workspaceSetup.invalidateReadiness();
  chromiumDiagnostics = null;
  void executionServices.dispose().catch(report);
}

async function openWindow() {
  await surface.create();
  selectLiveSession(null);
  layout();
  // Observe the first request, including failure before a document ever loads.
  if (smoke) {
    await executionServices.files.mkdir(dataDir + '-projects', { recursive: true });
    runtime = await fixture.createRuntime({ browser: browser.webContents, session: session.fromPartition(partition), dataDir });
  } else if (offline) {
    // Isolated backend fixture: no executor, tunnel, onboarding or plugin service starts.
    runtime = null;
  } else {
    runtime = ensureRuntimeSwitcher().createRuntime(preferences.chatgptChannel, activateRuntime);
    executionServices.attachRuntime(runtime);
    // Installed services are brought up before the window is ready, as before. A computer where they are not
    // installed yet is left to the first-run wizard, which shows progress. A failure here is shown in the
    // sidebar and the next use of the services tries again: it must never keep the app from opening.
    if (await appServerRuntime.prepared() && (process.platform !== 'darwin' || await inspectMacGit()))
      await activateRuntime().catch(error => { startupError = publicError(error); });
  }
  if (smoke) executionServices.attachRuntime(runtime);
  connectController();
  createStartupFlow();
  registerIpc();
  await surface.loadUi();
  if (startupFlow) void startupFlow.check({ prepare: startupActive });
  if (eventRuntimeChecker) {
    eventRuntimeCheckerTimer = setInterval(checkEventRuntimeState, 2000);
    eventRuntimeCheckerTimer.unref?.();
  }
  if (smoke) {
    await surface.runFixture({ app, browser: browser.webContents,
      store, controller, plugin, selectWorkspace, workspaceSetup, snapshot, permissionAllowed, dataDir,
      chromiumDiagnostics, chromiumDiagnosticsFile, navigate, openArchiveWindow, chatColorStyles, eventBaseline, runtimeMetrics, pageState, autoPlan,
      liveSessions,sessionView,deletion,deletionHooks,execution,getLive:()=>({browser:browser.webContents,controller,pageState,chromiumDiagnostics,chatColorStyles}),
      withStartupFixture: async (flow, run) => {
        startupFlow = flow; startupActive = true; flow.onChange = publish;
        flow.beginPage(navigationId); flow.finishPage(navigationId); publish();
        try { await run(); }
        finally { flow.dispose(); startupFlow = null; startupActive = false; publish(); }
      } });
    await chromiumDiagnostics.stop(); chromiumDiagnostics = null;
    surface.close(); app.quit();
  } else { const current = store.selected(); if (current && !storageError && !settingsState) void selectWorkspace(current.workspace).catch(report); else void navigate(); }
}

function reloadSelected() {
  const current = store.selected();
  if (current) void selectWorkspace(current.workspace).catch(report); else if (browser) void navigate();
}

// Startup of the model after the application is ready. A surface may stop it
// before the window (for example the offer to install the macOS application).
async function start() {
  let restoredWorkflow = {};
  try {
    restoredWorkflow = await preferences.load();
  } catch (error) { if (error.code !== 'ENOENT') startupError = { code: 'SETTINGS_INVALID', message: 'Не удалось прочитать локальные настройки Web Pilot. Проверьте настройки подключения.' }; }
  workflow.restore(restoredWorkflow);
  applyShellTheme(preferences.shellTheme);
  try { await store.load(); } catch (error) { startupError = publicError(error); storageError = true; }
  if(!storageError) {
    const before=workflow.snapshot();
    const cleaned=pruneOrphanProjectSettings(before,store.snapshot().projects);
    if(JSON.stringify(before)!==JSON.stringify(cleaned)) {
      workflow.restore(cleaned);await saveSettings();
    }
  }
  if (await surface.beforeWindow({ fresh: store.snapshot().projects.length === 0, storageError })) return false;
  if (process.platform === 'win32') {
    const payloadFile = app.isPackaged
      ? path.join(process.resourcesPath, 'windows-payload', WINDOWS_RUNTIME_ARCHIVE)
      : path.join(sourceDir, '../.harness/runtime/windows-payload', WINDOWS_RUNTIME_ARCHIVE);
    windowsBootstrap = new WindowsExecutorBootstrap({ payloadFile, stateDir: runtimeFolder });
  }
  if(process.platform==='linux')linuxBootstrap=new LinuxExecutorBootstrap({stateDir:runtimeFolder,
    payloadDir:path.join(app.isPackaged?process.resourcesPath:path.join(sourceDir,'../.harness/runtime'),'linux-tools')});
  deletion = control.createDeletion({ beforeFinish:job=>deletionHooks?.beforeFinish?.(job), journalDir: path.join(dataDir, 'deletions'), protectedPaths: [app.getAppPath(), runtimeFolder], prepare:prepareProjectRemoval, cleanup:cleanupDeletedProject, purgeState:(dir,identities)=>{
    return preferences.purge(dir,identities);
  } });
  if (!storageError) {
    const errors = await deletion.recover();
    if (errors.length) { startupError = errors[0]; settingsState = { workspace: errors[0].workspace }; }
  }
  const remoteSession = session.fromPartition(partition);
  remoteSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    const origin = details?.securityOrigin ?? details?.requestingUrl ?? contents.getURL();
    callback(permissionAllowed(permission, origin, details, contents));
  });
  remoteSession.setPermissionCheckHandler((_contents, permission, requestingOrigin, details) => {
    const origin = details?.securityOrigin ?? requestingOrigin ?? details?.requestingUrl;
    return permissionAllowed(permission, origin, details, _contents);
  });
  if(!storageError)plugin=control.createPlugin({onChange:()=>publish(),
    ...(smoke?{loadContext:workspace=>runtime.loadContext(workspace)}:{})});
  // The plugin bridge belongs to whoever runs the model (the backend); an
  // isolated fixture names its own directory instead of the user's runtime folder.
  if(plugin&&!smoke&&(!offline||pluginDirectory)) {
    await executionServices.attachPlugin({directory:pluginDirectory??runtimeFolder,list:()=>plugin.list(),
      open:id=>plugin.open(id),connect:input=>plugin.connect(input),
      wait:(id,signal)=>plugin.launch.wait(id,signal),claim:input=>plugin.launch.claim(input),report:input=>plugin.launch.report(input)})
      .catch(()=>{startupError={code:'PLUGIN_BRIDGE_UNAVAILABLE',message:'Не удалось включить подключение панели ChatGPT. Проверьте, не открыта ли другая копия Workflow Pilot.'};});
  }
  await openWindow();
  if(!storageError&&!smoke)workflow.restoreBackground();
  return true;
}

// Draining: what still runs. A safe point is reached when nothing is listed;
// nothing here cancels an answer, a tool or a Kit command.
function drainState() {
  const name = record => { const project = record.project(); return project ? (project.displayName || project.name || path.basename(project.workspace)) : 'ChatGPT'; };
  const reasons = [];
  for (const record of liveSessions.all()) {
    if (record.pageState.current?.state.busy) reasons.push({ code: 'ANSWER_RUNNING', message: `Ждём завершения ответа ChatGPT: ${name(record)}.` });
    else if (record.composer.inFlight) reasons.push({ code: 'SEND_RUNNING', message: `Ждём завершения отправки: ${name(record)}.` });
    else if (record.controller.pending) reasons.push({ code: 'CONTEXT_RUNNING', message: `Ждём подготовки контекста: ${name(record)}.` });
  }
  for (const state of execution.allStates())
    if ((state.commands ?? []).some(command => command.state && command.state !== 'completed'))
      reasons.push({ code: 'COMMAND_RUNNING', message: `Ждём завершения команды Kit: ${path.basename(state.workspace ?? '') || 'проект'}.` });
  return reasons;
}
function pause(value) {
  liveSessions.pause(value === true);
  if (value === true) { publish(); return; }
  // Resume exactly where automation waited: availability is re-evaluated.
  for (const record of liveSessions.all()) { workflow.sessionChanged(record); liveSessions.tick(record); }
  for (const state of execution.allStates()) if (state.workspace) void execution.signal(state.workspace);
  publish();
}

// One entry for every surface: the same allowlist, queue and result envelope
// as the former IPC handlers.
async function invoke(surfaceName, channel, input) {
  const action = handlers[surfaceName]?.get(channel);
  if (!action) throw Object.assign(new Error('Недопустимый канал Desktop.'), { code: 'IPC_CHANNEL_INVALID' });
  return action(input);
}

return Object.freeze({ start, invoke, dispose, windowFocused, archiveClosed, reloadSelected, snapshot, archiveSnapshot, publish,
  hideSelectedPage: () => liveSessions.hide(), get sessions() { return liveSessions; },
  colors: Object.freeze({
    state: colorsState,
    change: input => changeChatColor(input), reset: () => setChatColors({}),
  }),
  get theme() { return preferences.shellTheme; }, get sidebarWidth() { return clampedSidebarWidth(); },
  report: error => report(error),
  onPublish: listener => { publishListener = typeof listener === 'function' ? listener : () => {}; },
  drainState, pause,
  // Product services for the backend API; Control stays the store owner.
  services: Object.freeze({ control, execution: executionServices, workflow, settings: preferences, setup: workspaceSetup,
    get sessions() { return liveSessions; } }),
});
}
