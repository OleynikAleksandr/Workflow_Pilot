import { PageStateSource } from './page-state.mjs';
import { ChatGPTComposer } from './chatgpt-composer.mjs';
import { connectPageState } from './page-state-bridge.mjs';
import { browserError } from '../../contracts/browser.mjs';
import { openStartupPage } from './browser-startup.mjs';
import { randomUUID } from 'node:crypto';
import { CHATGPT_CHAT_ENTRYPOINT, hasChatGPTQuery, chatGPTRefreshTarget } from './chatgpt-experience.mjs';
import { safeUrl } from './diagnostics.mjs';
import { attestPanelFrames } from './panel-frame-attestation.mjs';

// No projects, stores, recovery decisions or selected cwd cross this boundary.
export class BrowserSessions {
  #records = new Map();
  // recoverCrashed: a page whose renderer died (crash, external kill, OOM) is
  // reloaded at its own address after recoveryDelayMs, at most recoveryLimit
  // times per recoveryWindowMs. Reload restores the page only: an interrupted
  // Send stays UNKNOWN and nothing is typed or sent again.
  constructor({ host, ipc, connect = connectPageState,
    createComposer = (contents, options) => new ChatGPTComposer(contents, options),
    attestFrames = attestPanelFrames,
    prepareNavigation = null,
    recoverCrashed = false, recoveryDelayMs = 1000, recoveryLimit = 3, recoveryWindowMs = 10 * 60 * 1000, now = Date.now }) {
    Object.assign(this, { host, ipc, connect, createComposer, attestFrames, prepareNavigation, recoverCrashed, recoveryDelayMs, recoveryLimit, recoveryWindowMs, now });
  }
  open(id) {
    if (typeof id !== 'string' || !id) throw new TypeError('BROWSER_SESSION_ID_REQUIRED');
    if (this.#records.has(id)) return this.#records.get(id).port;
    const contents = this.host.create(id), source = new PageStateSource();
    const record = { id, incarnation: randomUUID(), contents, source, loading: false, epoch: 0, disposed: false, crashed: false,
      navigationSequence: 0, navigationRequest: 0, preparationVersion: 0, navigationOwner: null, bootstrapTokens: new Set(), startDispatched: false, ownEnter: 0,
      listeners: new Set(), cleanups: [] };
    let composer;
    try { composer = this.createComposer(contents, { pageState: source }); }
    catch (error) { source.dispose(); this.host.close(id); throw error; }
    record.composer = composer;
    const snapshot = () => ({ id, loading: record.loading, epoch: record.epoch, disposed: record.disposed,
      crashed: record.crashed, incarnation: record.incarnation, navigationSequence: record.navigationSequence,
      navigationOwner: record.navigationOwner,
      url: contents.isDestroyed() ? '' : contents.getURL(), inFlight: composer.inFlight });
    const emit = (type, fields = {}) => {
      const event = { type, ...fields, snapshot: snapshot() };
      for (const listener of [...record.listeners]) listener(structuredClone(event));
    };
    const assertOpen = () => {
      if (record.disposed) throw Object.assign(new Error('Страница закрыта.'), { code: 'SESSION_RUNTIME_RELEASED' });
    };
    const navigation = (type, url, isMainFrame, navigationKind) => {
      if(record.disposed)return;
      if(isMainFrame)record.preparationVersion++;
      record.navigationSequence++;
      emit(type,{url:typeof url==='string'?url:'',isMainFrame:isMainFrame===true,navigationKind,
        navigationSequence:record.navigationSequence,navigationOwner:record.navigationOwner});
    };
    record.navigation=navigation;
    const interrupt = reason => {
      record.preparationVersion++;
      if(!record.navigationOwner)return;
      record.navigationOwner=null;
      navigation('navigation-interrupted',contents.getURL(),true,reason);
    };
    const loadError = (error, url) => {
      const value=browserError(error);
      if(hasChatGPTQuery(url)||hasChatGPTQuery(contents.getURL())) {
        value.code=/^[A-Z][A-Z0-9_]{0,95}$/.test(value.code)?value.code:'BROWSER_ERROR';
        value.message='Не удалось загрузить страницу ChatGPT. Первоначальная команда не повторяется.';
        composer.onDiagnostic?.({event:'navigation-failed',code:value.code,url:safeUrl(url)});
      }
      return Object.assign(new Error(value.message),{code:value.code});
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
      navigationSnapshot: snapshot,
      openChatEntrypoint: () => record.port.navigate(CHATGPT_CHAT_ENTRYPOINT),
      // The start's only Send: trusted input in the verified document. The token
      // owns this page from its Enter on, without a navigation or a new epoch; any
      // other input or navigation before Enter cancels it and nothing is sent.
      submitStartup: async ({ text, navigationToken, canContinue = () => true }) => {
        assertOpen();
        if (typeof navigationToken !== 'string' || !navigationToken)
          throw Object.assign(new Error('Некорректный токен старта.'), { code: 'BOOTSTRAP_NAVIGATION_INVALID' });
        if (record.bootstrapTokens.has(navigationToken))
          throw Object.assign(new Error('Первоначальная команда уже запускалась. Повтор запрещён.'), { code: 'BOOTSTRAP_ALREADY_DISPATCHED' });
        const epoch = record.epoch, version = record.preparationVersion;
        const current = () => !record.disposed && !record.loading && !record.crashed && record.epoch === epoch
          && record.preparationVersion === version && record.navigationOwner === null && canContinue();
        try {
          return structuredClone(await composer.submitStartup({ text, canContinue: current, onBeforeEnter: () => {
            if (!current() || record.bootstrapTokens.has(navigationToken)) return false;
            record.bootstrapTokens.add(navigationToken); record.startDispatched = true;
            record.navigationOwner = navigationToken; record.ownEnter = 1;
            return true;
          } }));
        } finally { record.ownEnter = 0; }
      },
      // Control ends the start's navigation authority once its address is bound:
      // only the same token, without a navigation, a new epoch or an event.
      endStartupNavigation: token => {
        if (typeof token === 'string' && token && record.navigationOwner === token) record.navigationOwner = null;
        return record.navigationOwner === null;
      },
      hasFilled: requestId => composer.hasFilled(requestId),
      inspect: args => call('inspect', args),
      observeSnapshot: async () => {
        const epoch = record.epoch, message = await call('observeSnapshot');
        if (record.disposed || record.epoch !== epoch || !message) return false;
        return source.accept(message).accepted;
      },
      deliver: args => call('deliver', args),
      sendUserMessage: args => call('sendUserMessage', args),
      clearNewSessionDraft: args => call('clearNewSessionDraft', args),
    });
    // The time this page first observed its current document. A reload ordered
    // by safeReload records the document it replaced, so Control can transfer
    // a turn confirmation only across its own reload.
    record.document = { id: null, since: null, reloadedFrom: null };
    const lineage = from => [...(record.document.id === from ? record.document.reloadedFrom?.lineage ?? [] : []), from].slice(-8);
    record.lineage = lineage;
    record.cleanups.push(source.subscribe(() => {
      const documentId = source.current?.documentId ?? null;
      if (documentId === record.document.id) return;
      const reloadedFrom = documentId && record.reloadOrigin ? record.reloadOrigin : null;
      // lineage: earlier documents of this page connected only by its own reloads.
      if (documentId) record.reloadOrigin = null;
      record.document = { id: documentId, since: documentId ? this.now() : null, reloadedFrom };
    }));
    const pageState = Object.freeze({
      get current() { return structuredClone(source.current); },
      get document() { return structuredClone(record.document); },
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
      // A q address is never loaded: the first command is typed (submitStartup).
      navigate: async (url, { reload = false, startup = false, isCurrent = () => true } = {}) => {
        assertOpen();
        if(!isCurrent())return null;
        const request=++record.navigationRequest,previousEpoch=record.epoch,preparationVersion=record.preparationVersion;
        if(this.prepareNavigation) {
          await this.prepareNavigation(url);
          if(record.disposed||record.navigationRequest!==request||record.epoch!==previousEpoch||record.preparationVersion!==preparationVersion||!isCurrent())return null;
        }
        url=reload?chatGPTRefreshTarget(contents.getURL(),url):hasChatGPTQuery(url)?CHATGPT_CHAT_ENTRYPOINT:url;
        clearTimeout(record.recoveryTimer);record.recoveryTimer=null;
        if (!reload && contents.getURL() === url) return snapshot();
        record.navigationOwner=null;
        const epoch = ++record.epoch; record.loading = true; navigation('navigation-start',url,true,'command');
        try {
          if(!isCurrent()){record.loading=false;interrupt('cancelled');return null;}
          if (startup) await openStartupPage(contents, url, {
            isCurrent: () => !record.disposed && record.epoch === epoch && isCurrent(),
          });
          else await contents.loadURL(url);
          if (record.disposed || epoch !== record.epoch) return null;
          record.loading = false; return snapshot();
        } catch (error) {
          const safeError=loadError(error,url);
          if (!record.disposed && epoch === record.epoch) {
            record.loading = false;interrupt('load-failed');emit('error', { error: browserError(safeError) });
          }
          throw safeError;
        }
      },
      // Panel frames mounted in this page's current document. A navigation or
      // reload during enumeration discards the result: it belongs to no document.
      attestPanelFrames: async () => {
        assertOpen();
        const before = { incarnation: record.incarnation, documentId: source.current?.documentId ?? null,
          navigationSequence: record.navigationSequence, epoch: record.epoch };
        const frames = before.documentId && !record.loading && !record.crashed ? await this.attestFrames(contents) : [];
        const stale = record.disposed || record.epoch !== before.epoch || record.navigationSequence !== before.navigationSequence
          || (source.current?.documentId ?? null) !== before.documentId;
        return { browserSessionId: id, incarnation: before.incarnation, documentId: before.documentId,
          frames: stale ? [] : frames, stale, attestedAt: this.now() };
      },
      // Reload the saved conversation only: never a q address, never during a
      // send, a start navigation or a page load. It creates no attempt or ticket.
      safeReload: async chatUrl => {
        assertOpen();
        const reason = typeof chatUrl !== 'string' || hasChatGPTQuery(chatUrl) || !/^https:\/\/chatgpt\.com\//.test(chatUrl) ? 'invalid-address'
          : composer.inFlight ? 'composer-in-flight' : record.navigationOwner ? 'startup-navigation'
            : record.loading ? 'loading' : record.crashed ? 'crashed' : null;
        if (reason) return { reloaded: false, reason };
        const from = source.current?.documentId ?? null;
        record.reloadOrigin = from ? { documentId: from, reason: 'control', lineage: lineage(from) } : null;
        try { await record.port.navigate(chatUrl, { reload: true }); }
        catch (error) { record.reloadOrigin = null; return { reloaded: false, reason: 'load-failed', code: error.code ?? 'BROWSER_ERROR' }; }
        return { reloaded: true, from };
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
      on('did-start-navigation', (event, url, inPlace, mainFrame) => {
        if ((event.isMainFrame ?? mainFrame) && !(event.isSameDocument ?? inPlace)) {
          record.loading = true; navigation('navigation-start',event.url??url,true,'start');
        }
      });
      on('did-finish-load', () => { record.loading = false; record.crashed = false; emit('loaded'); });
      on('did-navigate-in-page', (event={},url,mainFrame) => navigation('navigated',event.url??url,event.isMainFrame??mainFrame,'in-page'));
      on('did-navigate', (event={},url) => navigation('navigated',event.url??url,true,'navigate'));
      on('did-redirect-navigation', (event={},url,_inPlace,mainFrame) => navigation('navigated',event.url??url,event.isMainFrame??mainFrame,'redirect'));
      on('before-input-event', (event,input={}) => {
        if(!['keyDown','rawKeyDown'].includes(input.type))return;
        // Exactly the runtime's own startup Enter is not user input; any other key is.
        if(record.ownEnter>0&&input.key==='Enter'&&!input.shift&&!input.control&&!input.alt&&!input.meta){record.ownEnter--;return;}
        interrupt('user-input');
        const refresh=input.key==='F5'||String(input.key).toLowerCase()==='r'&&(input.control||input.meta);
        if(refresh&&hasChatGPTQuery(contents.getURL())) {
          event.preventDefault?.();void record.port.navigate(CHATGPT_CHAT_ENTRYPOINT,{reload:true}).catch(()=>{});
        }
      });
      on('before-mouse-event', (_event,input={}) => {if(input.type==='mouseDown')interrupt('user-input');});
      on('will-navigate',(event,url)=>{
        try{if(new URL(event.url??url).origin!=='https://chatgpt.com')interrupt('foreign-navigation');}
        catch{interrupt('foreign-navigation');}
      });
      // A lost renderer is a page failure. Viewer changes never emit page events.
      on('render-process-gone', (_event, details = {}) => {
        interrupt('crashed');
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
      const current=record.contents.getURL();
      // The runtime needs no attempt/store to prevent replay, even if the dead
      // renderer lost its URL before control could preserve a conversation.
      if(hasChatGPTQuery(current)||!current&&record.startDispatched) {
        void record.port.navigate(CHATGPT_CHAT_ENTRYPOINT,{reload:true}).catch(()=>{});
      } else {
        record.navigationOwner=null;record.epoch++;
        if(record.document?.id)record.reloadOrigin={documentId:record.document.id,reason:'recovery',lineage:record.lineage(record.document.id)};
        record.navigation('navigation-start',current,true,'recovery');
        try { record.contents.reload(); } catch { record.loading = false; }
      }
    }, this.recoveryDelayMs);
    record.recoveryTimer.unref?.();
    return true;
  }
  #release(record) {
    if (record.disposed) return false;
    clearTimeout(record.recoveryTimer); record.recoveryTimer = null;
    record.disposed = true; record.navigationOwner=null;record.epoch++;
    record.source.dispose();
    for (const cleanup of record.cleanups.splice(0).reverse()) cleanup();
    record.listeners.clear(); record.composer.onDiagnostic = null;
    this.host.close(record.id); this.#records.delete(record.id);
    return true;
  }
  dispose() { for (const record of [...this.#records.values()]) this.#release(record); }
}
