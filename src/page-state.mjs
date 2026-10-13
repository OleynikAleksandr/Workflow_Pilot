export const PAGE_STATE_CHANNEL = 'pilot:page-observation';
const MAX_MESSAGE_BYTES = 8192;
const allowedLogin = new Set(['signed-in', 'signed-out', 'unknown']);
const allowedExperience = new Set(['chat', 'work', null]);
const allowedVisibility = new Set(['visible', 'hidden', 'prerender', 'unknown']);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function normalizePageObservation(message) {
  if (!message || typeof message !== 'object' || Buffer.byteLength(JSON.stringify(message)) > MAX_MESSAGE_BYTES)
    throw Object.assign(new Error('Некорректное сообщение наблюдателя страницы.'), { code: 'PAGE_OBSERVATION_INVALID' });
  if (message.version !== 1 || typeof message.documentId !== 'string' || !/^[A-Za-z0-9-]{8,80}$/.test(message.documentId)
      || !integer(message.seq) || message.seq < 1 || !message.state || typeof message.state !== 'object')
    throw Object.assign(new Error('Некорректная схема наблюдателя страницы.'), { code: 'PAGE_OBSERVATION_INVALID' });
  const state = message.state;
  const url = typeof state.url === 'string' && state.url.length <= 2048 ? state.url : '';
  const experience = allowedExperience.has(state.experience) ? state.experience : null;
  const login = allowedLogin.has(state.login) ? state.login : 'unknown';
  const visibility = allowedVisibility.has(state.visibility) ? state.visibility : 'unknown';
  for (const key of ['editorRevision', 'draftRevision', 'userMessageCount', 'userMessagesRevision']) {
    if (!integer(state[key])) throw Object.assign(new Error('Некорректная ревизия страницы.'), { code: 'PAGE_OBSERVATION_INVALID' });
  }
  for (const key of ['editorAvailable', 'writable', 'busy', 'sendEnabled']) {
    if (typeof state[key] !== 'boolean') throw Object.assign(new Error('Некорректный признак страницы.'), { code: 'PAGE_OBSERVATION_INVALID' });
  }
  return {
    version: 1,
    documentId: message.documentId,
    seq: message.seq,
    state: {
      url, experience, login, visibility,
      connectionError: state.connectionError === 'stream-interrupted' ? state.connectionError : null,
      editorAvailable: state.editorAvailable,
      editorRevision: state.editorRevision,
      writable: state.writable,
      busy: state.busy,
      sendEnabled: state.sendEnabled,
      manualSendRevision: integer(state.manualSendRevision) ? state.manualSendRevision : 0,
      manualStopRevision: integer(state.manualStopRevision) ? state.manualStopRevision : 0,
      manualInputRevision: integer(state.manualInputRevision) ? state.manualInputRevision : 0,
      assistantRevision: integer(state.assistantRevision) ? state.assistantRevision : 0,
      turnId: typeof state.turnId === 'string' && /^[a-f0-9]{1,8}$/.test(state.turnId) ? state.turnId : '',
      userTurnId: typeof state.userTurnId === 'string' && /^[a-f0-9]{1,8}$/.test(state.userTurnId) ? state.userTurnId : '',
      turnIdentitySource: ['native', 'cycle', 'none'].includes(state.turnIdentitySource) ? state.turnIdentitySource : 'none',
      lastMessageRole: ['user', 'assistant'].includes(state.lastMessageRole) ? state.lastMessageRole : null,
      draftPresent: state.draftPresent === true,
      draftRevision: state.draftRevision,
      userMessageCount: state.userMessageCount,
      userMessagesRevision: state.userMessagesRevision,
    },
  };
}

export class PageStateSource {
  constructor({ schedule = setTimeout, cancel = clearTimeout } = {}) {
    Object.assign(this, { schedule, cancel });
    this.current = null;
    this.version = 0;
    this.listeners = new Set();
    this.retired = new Set();
  }

  reset() {
    if (this.current?.documentId) {
      this.retired.add(this.current.documentId);
      while (this.retired.size > 32) this.retired.delete(this.retired.values().next().value);
    }
    this.current = null;
    this.version++;
    this.#notify({ reset: true, version: this.version, state: null });
  }

  accept(raw) {
    const message = normalizePageObservation(raw);
    if (this.retired.has(message.documentId)) return { accepted: false, reason: 'retired-document' };
    if (this.current && this.current.documentId !== message.documentId) return { accepted: false, reason: 'unexpected-document' };
    if (this.current && message.seq <= this.current.seq) return { accepted: false, reason: 'out-of-order' };
    const previous = this.current;
    this.current = message;
    const changed = !previous || !same(previous.state, message.state);
    if (changed) {
      this.version++;
      this.#notify({ reset: false, version: this.version, state: message.state, documentId: message.documentId, seq: message.seq,
        initial: !previous });
    }
    return { accepted: true, changed, initial: !previous, version: this.version, state: message.state };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  waitForChange(afterVersion, { timeoutMs = 12000, canContinue = () => true } = {}) {
    if (!canContinue()) return Promise.resolve({ changed: false, cancelled: true, version: this.version, state: this.current?.state ?? null });
    if (this.version !== afterVersion) return Promise.resolve({ changed: true, version: this.version, state: this.current?.state ?? null });
    return new Promise(resolve => {
      let done = false;
      const finish = result => {
        if (done) return;
        done = true;
        unsubscribe();
        this.cancel(timer);
        resolve(result);
      };
      const unsubscribe = this.subscribe(event => {
        if (!canContinue()) finish({ changed: false, cancelled: true, version: this.version, state: this.current?.state ?? null });
        else if (event.version !== afterVersion) finish({ changed: true, version: this.version, state: this.current?.state ?? null });
      });
      const timer = this.schedule(() => finish({ changed: false, timeout: true, version: this.version, state: this.current?.state ?? null }), timeoutMs);
      timer?.unref?.();
    });
  }

  #notify(event) {
    for (const listener of [...this.listeners]) {
      try { listener(event); } catch {}
    }
  }
}
