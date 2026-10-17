import { randomUUID } from 'node:crypto';
import { PageInput } from './input.mjs';

const presentationError = (code, message = 'Страница недоступна.') => Object.assign(new Error(message), { code });
// Fixed read of the user's own selection; it runs in an isolated world and
// returns text only. No client-supplied script is ever executed.
const SELECTION_SCRIPT = `(() => { const active = document.activeElement;
  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') && typeof active.selectionStart === 'number')
    return active.value.slice(active.selectionStart, active.selectionEnd);
  return String(globalThis.getSelection?.() ?? ''); })()`;
const SELECTION_WORLD = 1001;
const MAX_SELECTION = 60 * 1024;

// Presentation of one backend page: frames, addressed input and the file
// chooser. It never navigates, reloads or releases the page.
export class PagePresentation {
  #input; #chooser = null; #attachedByUs = false; #handlers = []; #frameWaiters = new Set(); #disposed = false;
  // decodeImage (nativeImage.createFromBuffer) turns a CDP screenshot into an image: a view page in a
  // hidden host has no display surface for capturePage, but the renderer still answers CDP.
  constructor({ window, contents = window.webContents, browserSessionId, kind = 'page', parentId = null, emit = () => {},
    platform = process.platform, decodeImage = null }) {
    Object.assign(this, { window, contents, browserSessionId, kind, parentId, emit, decodeImage });
    this.documentGeneration = 0;
    this.frameSequence = 0;
    this.#input = new PageInput((method, params) => this.#command(method, params), { platform });
    const on = (event, handler) => { contents.on(event, handler); this.#handlers.push([contents, event, handler]); };
    on('did-start-navigation', (event, _url, inPlace, mainFrame) => {
      if ((event?.isMainFrame ?? mainFrame) && !(event?.isSameDocument ?? inPlace)) this.#newDocument();
    });
    on('render-process-gone', () => this.#newDocument());
    on('paint', () => { this.frameSequence++; for (const wake of [...this.#frameWaiters]) wake(); });
  }
  #newDocument() {
    this.documentGeneration++;
    this.#chooser = null;
    this.emit('document', { browserSessionId: this.browserSessionId, documentGeneration: this.documentGeneration });
  }
  get debugger() { return this.contents.debugger; }
  async #command(method, params) {
    if (this.#disposed || this.contents.isDestroyed()) throw presentationError('SESSION_RUNTIME_RELEASED', 'Страница закрыта.');
    return this.debugger.sendCommand(method, params);
  }
  // One shared CDP attachment from page creation: file choosers are
  // intercepted before any viewer exists, so no native dialog ever opens.
  async start() {
    const debug = this.debugger;
    if (!debug.isAttached()) { debug.attach('1.3'); this.#attachedByUs = true; }
    const onMessage = (_event, method, params) => {
      if (method !== 'Page.fileChooserOpened' || this.#disposed) return;
      this.#chooser = { chooserId: randomUUID(), backendNodeId: params.backendNodeId, mode: params.mode,
        documentGeneration: this.documentGeneration };
      this.emit('file-chooser', { browserSessionId: this.browserSessionId, chooserId: this.#chooser.chooserId,
        multiple: params.mode === 'selectMultiple', documentGeneration: this.documentGeneration });
    };
    debug.on('message', onMessage);this.#handlers.push([debug, 'message', onMessage]);
    await debug.sendCommand('Page.enable');
    await debug.sendCommand('Page.setInterceptFileChooserDialog', { enabled: true });
  }
  get chooser() { return this.#chooser ? { ...this.#chooser } : null; }
  async setFiles(chooserId, files) {
    const chooser = this.#chooser;
    if (!chooser || chooser.chooserId !== chooserId || chooser.documentGeneration !== this.documentGeneration)
      throw presentationError('BROWSER_CHOOSER_STALE', 'Окно выбора файла уже закрыто.');
    if (chooser.mode !== 'selectMultiple' && files.length > 1) throw presentationError('BROWSER_CHOOSER_SINGLE', 'Можно выбрать один файл.');
    this.#chooser = null;
    await this.#command('DOM.setFileInputFiles', { files, backendNodeId: chooser.backendNodeId });
  }
  cancelChooser(chooserId) { if (this.#chooser?.chooserId === chooserId) this.#chooser = null; }
  #paint(waitMs) {
    return new Promise(resolve => {
      const wake = () => { clearTimeout(timer); this.#frameWaiters.delete(wake); resolve(); };
      const timer = setTimeout(wake, waitMs); this.#frameWaiters.add(wake);
    });
  }
  // format 'jpeg' with quality and maxScale serves a remote viewer: a smaller
  // frame at a density the device needs. The Mac window keeps PNG.
  async frame({ after = null, waitMs = 0, format = 'png', quality = 70, maxScale = null } = {}) {
    if (after !== null && after >= this.frameSequence && waitMs > 0 && this.contents.isOffscreen()) {
      await this.#paint(waitMs);
      if (after >= this.frameSequence) return null;
    }
    if (!this.contents.isOffscreen()) {
      // Hidden popup windows emit no paint events: bounded capture rate instead.
      if (after !== null) await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 250)));
      this.frameSequence++;
    } else if (this.frameSequence === 0) await this.#paint(Math.max(waitMs, 1000)); // not painted yet
    if (this.#disposed || this.contents.isDestroyed()) throw presentationError('SESSION_RUNTIME_RELEASED', 'Страница закрыта.');
    const sequence = this.frameSequence;
    let image = await this.#capture();
    if (image.isEmpty()) return null;
    const [logicalWidth, logicalHeight] = this.window.getContentSize();
    if (maxScale && image.getSize().width > Math.round(logicalWidth * maxScale))
      image = image.resize({ width: Math.round(logicalWidth * maxScale), height: Math.round(logicalHeight * maxScale), quality: 'good' });
    const size = image.getSize();
    const jpeg = format === 'jpeg';
    return { png: jpeg ? image.toJPEG(Math.max(30, Math.min(95, quality))) : image.toPNG(), mime: jpeg ? 'image/jpeg' : 'image/png', meta: { browserSessionId: this.browserSessionId, documentGeneration: this.documentGeneration,
      frameSequence: sequence, logicalWidth, logicalHeight, pixelWidth: size.width, pixelHeight: size.height,
      scale: Math.max(1, Math.min(5, size.width / Math.max(1, logicalWidth))) } };
  }
  async #capture() {
    if (!this.decodeImage) return this.contents.capturePage();
    const shot = await this.#command('Page.captureScreenshot', { format: 'png' });
    return this.decodeImage(Buffer.from(shot.data, 'base64'));
  }
  dispatch(input) { return this.#input.dispatch(input); }
  release() { return this.#input.releaseAll(); }
  get pressed() { return this.#input.pressed; }
  async selection() {
    if (this.contents.isDestroyed()) throw presentationError('SESSION_RUNTIME_RELEASED', 'Страница закрыта.');
    const text = await this.contents.executeJavaScriptInIsolatedWorld(SELECTION_WORLD, [{ code: SELECTION_SCRIPT }]);
    return typeof text === 'string' ? text.slice(0, MAX_SELECTION) : '';
  }
  paste(text) { return this.#command('Input.insertText', { text }); }
  // Files received from the client are dropped at a page point as a real drag:
  // the page sees dragenter, dragover and drop with these files.
  async drop(files, { x, y }) {
    const data = { items: [], files, dragOperationsMask: 1 };
    for (const type of ['dragEnter', 'dragOver', 'drop']) await this.#command('Input.dispatchDragEvent', { type, x, y, data });
  }
  setViewport(width, height) {
    if (this.#disposed || this.window.isDestroyed()) throw presentationError('SESSION_RUNTIME_RELEASED', 'Страница закрыта.');
    this.window.setContentSize(width, height);
  }
  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const wake of [...this.#frameWaiters]) wake();
    for (const [target, event, handler] of this.#handlers.splice(0)) target.removeListener(event, handler);
    if (this.#attachedByUs && !this.contents.isDestroyed() && this.debugger.isAttached()) { try { this.debugger.detach(); } catch {} }
  }
}
