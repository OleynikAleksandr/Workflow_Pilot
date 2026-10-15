import { randomUUID } from 'node:crypto';
import { ChatColors } from './chatgpt-colors.mjs';
import { toolFilterScript } from './chatgpt-tool-filter.mjs';
import { installChatGPTAutoScroll } from './chatgpt-auto-scroll.mjs';

const released = () => Object.assign(new Error('Страница закрыта.'), { code: 'SESSION_RUNTIME_RELEASED' });

// The backend owns every page. A viewer only observes a page by its key:
// attaching, detaching or losing every viewer never changes the page lifetime.
export class BackendBrowserHost {
  #pages = new Map();
  #viewers = new Map();
  #selected = null;
  constructor({ BrowserWindow, screen, partition, preload, secure = secureBackendPage }) {
    Object.assign(this, { BrowserWindow, screen, partition, preload, secure });
  }
  create(id) {
    if (this.#pages.has(id)) throw Object.assign(new Error('Страница уже принадлежит backend.'), { code: 'BROWSER_HOST_CONFLICT' });
    const ratio = Math.max(1, ...this.screen.getAllDisplays().map(display => display.scaleFactor));
    const window = new this.BrowserWindow({ show: false, width: 1000, height: 760, webPreferences: {
      partition: this.partition, preload: this.preload, offscreen: { deviceScaleFactor: ratio },
      backgroundThrottling: false, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    this.secure(window.webContents);
    this.#pages.set(id, { window, viewers: new Set() });
    return window.webContents;
  }
  view(id) {
    const page = this.#pages.get(id);
    return page && !page.window.isDestroyed() ? { webContents: page.window.webContents } : undefined;
  }
  // Selection designates the primary page for workflow; it is not a viewer.
  show(id) { if (!this.#pages.has(id)) throw released(); this.#selected = id; }
  hide() { this.#selected = null; }
  get selected() { return this.#selected; }
  attachViewer(id) {
    const page = this.#pages.get(id);
    if (!page) throw released();
    const viewerId = randomUUID();
    page.viewers.add(viewerId); this.#viewers.set(viewerId, id);
    return viewerId;
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
    const page = this.#pages.get(id);
    if (!page) return;
    for (const viewerId of page.viewers) this.#viewers.delete(viewerId);
    if (this.#selected === id) this.#selected = null;
    this.#pages.delete(id);
    if (!page.window.isDestroyed()) page.window.destroy();
  }
  get count() { return this.#pages.size; }
}

// Popups and authorization windows need a viewer path; T006 provides it.
export function secureBackendPage(contents) {
  contents.on('will-navigate', (event, url) => { if (!url.startsWith('https://')) event.preventDefault(); });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
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
