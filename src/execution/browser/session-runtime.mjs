import { PageStateSource } from './page-state.mjs';
import { ChatGPTComposer } from './chatgpt-composer.mjs';
import { connectPageState } from './page-state-bridge.mjs';
import { browserError } from '../../contracts/browser.mjs';
import { openStartupPage } from './browser-startup.mjs';

// No projects, stores, recovery decisions or selected cwd cross this boundary.
export class BrowserSessions {
  #records = new Map();
  // recoverCrashed: a page whose renderer died (crash, external kill, OOM) is
  // reloaded at its own address after recoveryDelayMs, at most recoveryLimit
  // times per recoveryWindowMs. Reload restores the page only: an interrupted
  // Send stays UNKNOWN and nothing is typed or sent again.
  constructor({ host, ipc, connect = connectPageState,
    createComposer = (contents, options) => new ChatGPTComposer(contents, options),
    recoverCrashed = false, recoveryDelayMs = 1000, recoveryLimit = 3, recoveryWindowMs = 10 * 60 * 1000, now = Date.now }) {
    Object.assign(this, { host, ipc, connect, createComposer, recoverCrashed, recoveryDelayMs, recoveryLimit, recoveryWindowMs, now });
  }
  open(id) {
    if (typeof id !== 'string' || !id) throw new TypeError('BROWSER_SESSION_ID_REQUIRED');
    if (this.#records.has(id)) return this.#records.get(id).port;
    const contents = this.host.create(id), source = new PageStateSource();
    const record = { id, contents, source, loading: false, epoch: 0, disposed: false, crashed: false,
      listeners: new Set(), cleanups: [] };
    let composer;
    try { composer = this.createComposer(contents, { pageState: source }); }
    catch (error) { source.dispose(); this.host.close(id); throw error; }
    record.composer = composer;
    const snapshot = () => ({ id, loading: record.loading, epoch: record.epoch, disposed: record.disposed,
      crashed: record.crashed, url: contents.isDestroyed() ? '' : contents.getURL(), inFlight: composer.inFlight });
    const emit = (type, fields = {}) => {
      const event = { type, ...fields, snapshot: snapshot() };
      for (const listener of [...record.listeners]) listener(structuredClone(event));
    };
    const assertOpen = () => {
      if (record.disposed) throw Object.assign(new Error('Страница закрыта.'), { code: 'SESSION_RUNTIME_RELEASED' });
    };
    const call = async (method, args = {}) => {
      assertOpen();
      const epoch = record.epoch, canContinue = args.canContinue ?? (() => true);
      const result = await composer[method]({ ...args,
        canContinue: () => !record.disposed && record.epoch === epoch && canContinue() });
      return structuredClone(result);
    };
    const composerPort = Object.freeze({
      get inFlight() { return composer.inFlight; },
      getURL: () => snapshot().url,
      hasFilled: requestId => composer.hasFilled(requestId),
      inspect: args => call('inspect', args),
      deliver: args => call('deliver', args),
      sendUserMessage: args => call('sendUserMessage', args),
      clearNewSessionDraft: args => call('clearNewSessionDraft', args),
    });
    const pageState = Object.freeze({
      get current() { return structuredClone(source.current); },
      get version() { return source.version; },
      subscribe: listener => source.subscribe(event => listener(structuredClone(event))),
      waitForChange: async (version, options) => structuredClone(await source.waitForChange(version, options)),
    });
    record.port = Object.freeze({ id, pageState, composer: composerPort, snapshot,
      subscribe: listener => {
        if (record.disposed) return () => {};
        record.listeners.add(listener); return () => record.listeners.delete(listener);
      },
      setDiagnostic: listener => { assertOpen(); composer.onDiagnostic = listener; },
      navigate: async (url, { reload = false, startup = false, isCurrent = () => true } = {}) => {
        assertOpen();
        if (!reload && contents.getURL() === url) return snapshot();
        const epoch = ++record.epoch; record.loading = true; emit('navigation-start');
        try {
          if (startup) await openStartupPage(contents, url, {
            isCurrent: () => !record.disposed && record.epoch === epoch && isCurrent(),
          });
          else await contents.loadURL(url);
          if (record.disposed || epoch !== record.epoch) return null;
          record.loading = false; return snapshot();
        } catch (error) {
          if (!record.disposed && epoch === record.epoch) {
            record.loading = false; emit('error', { error: browserError(error) });
          }
          throw error;
        }
      },
      release: () => this.#release(record),
    });
    const on = (name, listener) => {
      contents.on(name, listener); record.cleanups.push(() => contents.removeListener(name, listener));
    };
    try {
      record.cleanups.push(this.connect(contents, this.ipc, source, { onFailure: code => emit('error', {
        error: { code, message: 'Наблюдатель ChatGPT недоступен. Повторите открытие страницы.' },
      }) }));
      on('did-start-navigation', (event, _url, inPlace, mainFrame) => {
        if ((event.isMainFrame ?? mainFrame) && !(event.isSameDocument ?? inPlace)) {
          record.loading = true; emit('navigation-start');
        }
      });
      on('did-finish-load', () => { record.loading = false; record.crashed = false; emit('loaded'); });
      on('did-navigate-in-page', () => emit('navigated'));
      // A lost renderer is a page failure. Viewer changes never emit page events.
      on('render-process-gone', (_event, details = {}) => {
        record.loading = false; record.crashed = true; record.epoch++;
        const reason = typeof details.reason === 'string' ? details.reason : 'unknown';
        const exitCode = Number.isSafeInteger(details.exitCode) ? details.exitCode : null;
        const recovering = this.#scheduleRecovery(record);
        emit('crashed', { reason, exitCode, recovering, error: { code: 'RENDER_PROCESS_GONE',
          message: recovering ? 'Страница ChatGPT закрылась и перезагружается. Прерванная отправка не повторяется.'
            : 'Страница ChatGPT закрылась. Повторите открытие страницы.' } });
      });
      this.#records.set(id, record);
      return record.port;
    } catch (error) { this.#release(record); throw error; }
  }
  #scheduleRecovery(record) {
    if (!this.recoverCrashed || record.disposed) return false;
    const now = this.now();
    record.recoveries = (record.recoveries ?? []).filter(at => now - at < this.recoveryWindowMs);
    if (record.recoveries.length >= this.recoveryLimit) return false;
    record.recoveries.push(now);
    clearTimeout(record.recoveryTimer);
    record.recoveryTimer = setTimeout(() => {
      record.recoveryTimer = null;
      if (record.disposed || !record.crashed || record.contents.isDestroyed()) return;
      record.loading = true;
      try { record.contents.reload(); } catch { record.loading = false; }
    }, this.recoveryDelayMs);
    record.recoveryTimer.unref?.();
    return true;
  }
  #release(record) {
    if (record.disposed) return false;
    clearTimeout(record.recoveryTimer); record.recoveryTimer = null;
    record.disposed = true; record.epoch++;
    record.source.dispose();
    for (const cleanup of record.cleanups.splice(0).reverse()) cleanup();
    record.listeners.clear(); record.composer.onDiagnostic = null;
    this.host.close(record.id); this.#records.delete(record.id);
    return true;
  }
  dispose() { for (const record of [...this.#records.values()]) this.#release(record); }
}
