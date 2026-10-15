import { randomUUID } from 'node:crypto';
import { ChatColors } from './chatgpt-colors.mjs';
import { toolFilterScript } from './chatgpt-tool-filter.mjs';
import { installChatGPTAutoScroll } from './chatgpt-auto-scroll.mjs';
import { PagePresentation } from './presentation/host.mjs';

const released = () => Object.assign(new Error('Страница закрыта.'), { code: 'SESSION_RUNTIME_RELEASED' });
const httpsOnly = url => { try { return new URL(url).protocol === 'https:'; } catch { return false; } };
// Authorization popups often open blank and then navigate to https.
const popupAllowed = url => url === 'about:blank' || httpsOnly(url);

// The backend owns every page. A viewer only observes a page by its key:
// attaching, detaching or losing every viewer never changes the page lifetime.
// Popups (authorization, help) are backend pages too and never need a window.
export class BackendBrowserHost {
  #pages = new Map();
  #sessions = new Map();
  #viewers = new Map();
  #selected = null;
  // emit and onDownload are assigned by the backend once its event log and
  // private transfer directory exist; until then a download is cancelled.
  constructor({ BrowserWindow, screen, partition, preload, emit = () => {}, onDownload = null, session = null,
    platform = process.platform }) {
    Object.assign(this, { BrowserWindow, screen, partition, preload, emit, onDownload, platform });
    session?.on('will-download', (_event, item, contents) => {
      if (typeof this.onDownload !== 'function') return item.cancel();
      this.onDownload(item, this.#entryOf(contents)?.presentation.browserSessionId ?? null);
    });
  }
  #ratio() { return Math.max(1, ...this.screen.getAllDisplays().map(display => display.scaleFactor)); }
  #preferences(preload) {
    return { partition: this.partition, ...(preload ? { preload } : {}), offscreen: { deviceScaleFactor: this.#ratio() },
      backgroundThrottling: false, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true };
  }
  #entryOf(contents) { for (const entry of this.#pages.values()) if (entry.window.webContents === contents) return entry; return null; }
  #register(id, window, { kind = 'page', parentId = null } = {}) {
    const browserSessionId = (kind === 'popup' ? 'popup-' : 'page-') + randomUUID();
    const presentation = new PagePresentation({ window, browserSessionId, kind, parentId, platform: this.platform,
      emit: (type, data) => this.emit(type, data) });
    const entry = { id, window, viewers: new Set(), presentation };
    this.#pages.set(id, entry); this.#sessions.set(browserSessionId, entry);
    this.#secure(window.webContents, browserSessionId);
    void presentation.start().catch(() => this.emit('presentation-error', { browserSessionId, code: 'BROWSER_CDP_UNAVAILABLE' }));
    return entry;
  }
  #secure(contents, browserSessionId) {
    contents.on('will-navigate', (event, url) => { if (!httpsOnly(url)) event.preventDefault(); });
    // Electron does not paint offscreen popups, so a popup is a hidden window
    // created by the backend; Chromium keeps its opener link for authorization.
    contents.setWindowOpenHandler(({ url }) => popupAllowed(url) ? { action: 'allow', createWindow: options => {
      const child = new this.BrowserWindow({ ...options, show: false, width: 980, height: 780,
        webPreferences: { ...options.webPreferences, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
      const id = 'popup:' + randomUUID(), entry = this.#register(id, child, { kind: 'popup', parentId: browserSessionId });
      child.once('closed', () => this.#forget(id));
      this.emit('page-opened', { browserSessionId: entry.presentation.browserSessionId, kind: 'popup', parentId: browserSessionId });
      return child.webContents;
    } } : { action: 'deny' });
  }
  #forget(id) {
    const entry = this.#pages.get(id);
    if (!entry) return null;
    for (const viewerId of entry.viewers) this.#viewers.delete(viewerId);
    if (this.#selected === id) this.#selected = null;
    this.#pages.delete(id); this.#sessions.delete(entry.presentation.browserSessionId);
    entry.presentation.dispose();
    this.emit('page-closed', { browserSessionId: entry.presentation.browserSessionId, kind: entry.presentation.kind });
    return entry;
  }
  create(id) {
    if (this.#pages.has(id)) throw Object.assign(new Error('Страница уже принадлежит backend.'), { code: 'BROWSER_HOST_CONFLICT' });
    const window = new this.BrowserWindow({ show: false, width: 1000, height: 760, webPreferences: this.#preferences(this.preload) });
    this.#register(id, window);
    return window.webContents;
  }
  view(id) {
    const page = this.#pages.get(id);
    return page && !page.window.isDestroyed() ? { webContents: page.window.webContents } : undefined;
  }
  presentation(browserSessionId) { return this.#sessions.get(browserSessionId)?.presentation ?? null; }
  browserSessionId(id) { return this.#pages.get(id)?.presentation.browserSessionId ?? null; }
  pages() {
    return [...this.#pages.values()].map(({ id, viewers, presentation }) => ({ id, browserSessionId: presentation.browserSessionId,
      kind: presentation.kind, parentId: presentation.parentId, documentGeneration: presentation.documentGeneration, viewers: viewers.size }));
  }
  // Selection designates the primary page for workflow; it is not a viewer.
  show(id) { if (!this.#pages.has(id)) throw released(); this.#selected = id; }
  hide() { this.#selected = null; }
  get selected() { return this.#selected; }
  attachViewer(id) {
    const page = this.#pages.get(id) ?? this.#sessions.get(id);
    if (!page) throw released();
    const viewerId = randomUUID();
    page.viewers.add(viewerId); this.#viewers.set(viewerId, page.id);
    return viewerId;
  }
  viewerPage(viewerId) {
    const page = this.#pages.get(this.#viewers.get(viewerId));
    return page ? page.presentation : null;
  }
  detachViewer(viewerId) {
    const id = this.#viewers.get(viewerId);
    if (id === undefined) return false;
    this.#viewers.delete(viewerId); this.#pages.get(id)?.viewers.delete(viewerId);
    return true;
  }
  viewers(id) { return this.#pages.get(id)?.viewers.size ?? 0; }
  // Only an explicit page release reaches this method, never a viewer change.
  close(id) {
    const page = this.#forget(id);
    if (page && !page.window.isDestroyed()) page.window.destroy();
  }
  get count() { return this.#pages.size; }
}

// Page behaviour that does not depend on a visible window. The caller disposes
// it together with the page record.
export function decorateBackendPage(contents, { colors = {}, hideToolCalls = () => false } = {}) {
  const handlers = [];
  const on = (event, handler) => { contents.on(event, handler); handlers.push([event, handler]); };
  const chatColors = new ChatColors(contents, colors);
  const applyToolCalls = async () => {
    if (contents.isDestroyed() || !contents.getURL().startsWith('https://chatgpt.com/')) return;
    await contents.executeJavaScript(toolFilterScript(hideToolCalls()), true).catch(() => {});
  };
  on('did-navigate-in-page', () => { void applyToolCalls(); void installChatGPTAutoScroll(contents); });
  on('did-finish-load', () => { void applyToolCalls(); void installChatGPTAutoScroll(contents, { forceFollow: true }); });
  return Object.freeze({ colors: chatColors, applyToolCalls, dispose() {
    for (const [event, handler] of handlers.splice(0)) contents.removeListener(event, handler);
    chatColors.dispose();
  } });
}
