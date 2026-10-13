import { createChatGPTDOM, CHATGPT_SELECTORS, chatGPTDOMScript } from './chatgpt-dom.mjs';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

class ComposerError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// Runs only in the visible ChatGPT document. No page internals, cookies or API requests.
export function pageOperation({ action = 'inspect', text = '', requestId = '', expectedExperience = null, diagnose = false, draftToken = '', attachments = [] } = {}, dom = createChatGPTDOM(CHATGPT_SELECTORS)) {
  const { first } = dom;
  const editor = dom.editor();
  const busy = dom.busy();
  const connectionError = dom.connectionError();
  const login = !!first('[data-testid="login-button"],a[href="/auth/login"],a[href="https://chatgpt.com/auth/login"]');
  const draft = () => editor ? (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT'
    ? editor.value : editor.innerText ?? editor.textContent ?? '') : '';
  const normalized = value => value.replace(/\r\n/g, '\n').replace(/\n+/g, '\n').replace(/\u00a0/g, ' ').trim();
  const messages = dom.messages('user');
  const messageSeen = !!requestId && messages.some(message => (message.innerText ?? message.textContent ?? '').includes(requestId));
  const button = dom.sendButton();
  const draftText = draft(), actual = normalized(draftText), expected = normalized(text);
  const draftLength = actual.length;
  const draftMatches = !!text && actual === expected;
  const writable = !!editor && !editor.disabled && !editor.readOnly && editor.getAttribute('contenteditable') !== 'false';
  const sendEnabled = !!button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
  const modeButtons = dom.modeButtons();
  const modeOf = dom.modeOf;
  const experience = dom.experience();
  const result = { connectionError, url: location.href, editorAvailable: !!editor, writable, login, busy,
    draftLength, draftMatches, sendEnabled, messageSeen, userMessageCount: messages.length, experience };
  // Only visible composer cards count. Message history cannot prove draft uploads.
  const attachmentKey = Symbol.for('web-pilot-file-paste');
  if (attachments.length) {
    const nodes = [...document.querySelectorAll('[title],[aria-label],span,div,p')].filter(node => dom.visible(node)
      && !node.closest(dom.selectors.user + ',' + dom.selectors.assistant + ',pre,code,[contenteditable="true"]'));
    const cards = attachments.map(file => {
      const labels = nodes.filter(node => node.getAttribute('title') === file.name || node.getAttribute('aria-label') === file.name
        || (!node.children.length && (node.textContent ?? '').trim() === file.name));
      for (const label of labels) {
        for (let card = label, depth = 0; card && depth < 5 && card.tagName !== 'FORM'; card = card.parentElement, depth++) {
          const remove = [...card.querySelectorAll('button')].some(button => /remove|delete|удалить/i.test(button.getAttribute('aria-label') ?? button.getAttribute('title') ?? button.textContent ?? ''));
          if (remove) return card;
        }
      }
      return null;
    });
    const progress = '[role="progressbar"],[aria-busy="true"],[data-state="uploading"],[data-testid="upload-progress"],.animate-spin';
    const failed = card => card.matches('[role="alert"],[data-state="error"]') || !!card.querySelector('[role="alert"],[data-state="error"]')
      || /upload failed|failed to upload|ошибка загрузки|не удалось загрузить/i.test(card.textContent ?? '');
    result.attachmentsPresent = cards.filter(Boolean).length;
    result.attachmentsFailed = cards.some(card => card && failed(card));
    result.attachmentsReady = cards.every(card => card && !failed(card) && !card.matches(progress) && !card.querySelector(progress))
      && new Set(cards).size === attachments.length && sendEnabled;
  }
  if (diagnose) {
    let mismatchIndex = 0;
    while (mismatchIndex < Math.min(actual.length, expected.length) && actual[mismatchIndex] === expected[mismatchIndex]) mismatchIndex++;
    const kind = (value, index) => index >= value.length ? 'end' : value[index] === ' ' ? 'space'
      : value[index] === '\n' ? 'newline' : value[index] === '\t' ? 'tab'
      : /\s/.test(value[index]) ? 'whitespace' : /[\u200b-\u200d\ufeff]/.test(value[index]) ? 'invisible' : 'text';
    const counts = value => ({ newlines: (value.match(/\n/g) ?? []).length, tabs: (value.match(/\t/g) ?? []).length,
      nbsp: (value.match(/\u00a0/g) ?? []).length, invisible: (value.match(/[\u200b-\u200d\ufeff]/g) ?? []).length });
    const whiteSpace = editor ? getComputedStyle(editor).whiteSpace : '';
    result.diagnostic = {
      editorKind: !editor ? 'missing' : editor.tagName === 'TEXTAREA' ? 'textarea' : editor.tagName === 'INPUT' ? 'input' : 'contenteditable',
      whiteSpace: ['normal','nowrap','pre','pre-wrap','pre-line','break-spaces'].includes(whiteSpace) ? whiteSpace : 'other',
      expectedLength: expected.length, actualLength: actual.length,
      expectedRawLength: text.length, actualRawLength: draftText.length,
      mismatchIndex: actual === expected ? null : mismatchIndex,
      expectedKind: actual === expected ? null : kind(expected, mismatchIndex),
      actualKind: actual === expected ? null : kind(actual, mismatchIndex),
      nonWhitespaceMatches: !!text && actual.replace(/\s/g, '') === expected.replace(/\s/g, ''),
      textContentMatches: !!text && !!editor && normalized(editor.textContent ?? '') === expected,
      expectedCounts: counts(text), actualCounts: counts(draftText),
      button: { found: !!button, connected: !!button?.isConnected, disabled: !!button?.disabled,
        ariaDisabled: button?.getAttribute('aria-disabled') === 'true',
        submit: button?.type === 'submit' },
    };
  }
  const ownershipKey = Symbol.for('web-pilot-owned-draft');
  if (action === 'clear-owned-draft') {
    const owned = editor?.[ownershipKey];
    if (!owned || owned.token !== draftToken || owned.touched || !draftMatches || busy || !writable)
      return { ...result, action: 'deferred', reason: 'DRAFT_CHANGED' };
    editor.focus();
    if (editor.tagName === 'TEXTAREA') {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, '');
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const selection = getSelection(), range = document.createRange();
      range.selectNodeContents(editor); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand('delete', false)) return { ...result, action: 'deferred', reason: 'DRAFT_CLEAR_FAILED' };
    }
    delete editor[ownershipKey];
    return { ...result, action: 'draft-cleared' };
  }
  if (action === 'inspect') return result;
  if (messageSeen) return { ...result, action: 'already-sent' };
  if (connectionError) return { ...result, action: 'deferred', reason: 'CONNECTION_INTERRUPTED' };
  if (login || !writable) return { ...result, action: 'deferred', reason: 'LOGIN_REQUIRED' };
  if (busy) return { ...result, action: 'deferred', reason: 'GENERATION_ACTIVE' };
  if (action === 'clear-new-draft') {
    // Explicit New Chat/Work only. A conversation (even empty) is never cleared.
    if (!['/', '/work', '/work/'].includes(location.pathname) || messages.length)
      return { ...result, action: 'deferred', reason: 'CHAT_CHANGED' };
    if (draftLength) {
      editor.focus();
      if (editor.tagName === 'TEXTAREA') {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, '');
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const selection = getSelection(), range = document.createRange();
        range.selectNodeContents(editor); selection.removeAllRanges(); selection.addRange(range);
        if (!document.execCommand('delete', false))
          return { ...result, action: 'deferred', reason: 'DRAFT_CLEAR_FAILED' };
      }
    }
    return { ...result, draftLength: normalized(draft()).length,
      action: normalized(draft()).length ? 'deferred' : 'draft-cleared',
      reason: normalized(draft()).length ? 'DRAFT_CLEAR_FAILED' : null };
  }
  if (expectedExperience) {
    const entry = location.pathname.replace(/\/+$/, '') || '/';
    const atEntrypoint = entry === '/' || entry === '/work';
    if (!atEntrypoint || messages.length) return { ...result, action: 'deferred', reason: 'CHAT_CHANGED' };
    if (action === 'select-experience') {
      if (experience === expectedExperience) return { ...result, action: 'experience-confirmed' };
      if (draftLength) return { ...result, action: 'deferred', reason: 'DRAFT_PRESENT' };
      const target = modeButtons.find(element => modeOf(element) === expectedExperience);
      if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') {
        return { ...result, action: 'deferred', reason: 'EXPERIENCE_UNCONFIRMED' };
      }
      target.click();
      // Confirmation requires a fresh observation after React processes the native click.
      return { ...result, action: 'experience-selecting' };
    }
    if (experience !== expectedExperience) return { ...result, action: 'deferred', reason: 'EXPERIENCE_UNCONFIRMED' };
  }
  if (action === 'attach') {
    if (!attachments.length || !requestId || attachments.some(file => !file.name || typeof file.text !== 'string'))
      throw new Error('INVALID_ATTACHMENTS');
    const identity = JSON.stringify(attachments);
    let previous = editor[attachmentKey];
    if (previous && previous.requestId !== requestId && messages.some(message =>
      (message.innerText ?? message.textContent ?? '').includes(previous.requestId))) {
      delete editor[attachmentKey]; previous = null;
    }
    if (previous) return { ...result, action: 'deferred', reason: previous.requestId === requestId && previous.identity === identity
      ? 'ATTACHMENTS_PENDING' : 'ATTACHMENTS_CHANGED' };
    const data = new DataTransfer();
    for (const file of attachments) data.items.add(new File([file.text], file.name, { type: 'text/markdown', lastModified: 0 }));
    // Mark before dispatch: a thrown event or partial upload must never cause a second paste.
    editor[attachmentKey] = { requestId, identity };
    editor.focus();
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    return { ...result, action: 'attachments-dispatched' };
  }
  if (action === 'fill' || action === 'paste') {
    // Reuse a restored exact packet; equality never gates Send after insertion.
    if (requestId && draftMatches) return { ...result, action: 'filled' };
    // Recovery owns this insertion. User additions are explicitly allowed.
    if (!requestId && draftLength) return { ...result, action: 'deferred', reason: 'DRAFT_PRESENT' };
    if (draftToken && !draftLength) {
      const listenerKey = Symbol.for('web-pilot-owned-draft-listener');
      if (!editor[listenerKey]) {
        editor.addEventListener('input', event => {
          if (event.isTrusted && editor[ownershipKey]) editor[ownershipKey].touched = true;
        });
        editor[listenerKey] = true;
      }
      editor[ownershipKey] = { token: draftToken, touched: false };
    }
    editor.focus();
    if (editor.tagName === 'TEXTAREA') {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, draftText + text);
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const selection = getSelection();
      const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
      selection.removeAllRanges(); selection.addRange(range);
      if (action === 'fill') return { ...result, action: 'paste-ready' };
      // ProseMirror's paste pipeline inserts a whole slice in one transaction.
      // Escape source text: no packet content becomes markup or executable HTML.
      const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = text.replace(/\r\n?/g, '\n').split('\n').map((line, index) =>
        '<p' + (index === 0 ? ' data-pm-slice="0 0 []"' : '') + '>' + (line ? escape(line) : '<br>') + '</p>').join('');
      const data = new DataTransfer();
      data.setData('text/plain', text); data.setData('text/html', html);
      const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      editor.dispatchEvent(event);
      return { ...result, action: event.defaultPrevented ? 'filled' : 'deferred',
        reason: event.defaultPrevented ? null : 'PASTE_UNHANDLED',
        insertionMethod: 'ClipboardEvent.paste', pasteHandled: event.defaultPrevented };
    }
    return { ...result, action: 'filled' };
  }
  if (action === 'send') {
    if (attachments.length && !result.attachmentsReady)
      return { ...result, action: 'deferred', reason: result.attachmentsFailed ? 'ATTACHMENTS_FAILED' : 'ATTACHMENTS_PENDING' };
    // User authorized sending the editor as-is after our insertion.
    if (!sendEnabled) return { ...result, action: 'deferred', reason: 'SEND_UNAVAILABLE' };
    button.click();
    return { ...result, action: 'clicked' };
  }
  throw new Error('INVALID_COMPOSER_ACTION');
}

export function pageScript(args) { return `(${pageOperation.toString()})(${JSON.stringify(args)}, ${chatGPTDOMScript()})`; }

export class ChatGPTComposer {
  constructor(contents, { wait = pause, now = Date.now, settleMs = 200, timeoutMs = 12000,
    attachmentTimeoutMs = 120000, allowFixture = false, pageState = null, onDiagnostic = null } = {}) {
    this.contents = contents;
    this.wait = wait;
    this.pageState = pageState;
    this.now = now;
    this.settleMs = settleMs;
    this.timeoutMs = timeoutMs;
    this.attachmentTimeoutMs = attachmentTimeoutMs;
    this.allowFixture = allowFixture;
    this.inFlight = false;
    this.onDiagnostic = onDiagnostic;
    this.lastDiagnostic = '';
    this.filledRequest = null;
  }

  async inspect({ text = '', requestId = '', action = 'inspect', expectedExperience = null, canContinue = () => true, draftToken = '', attachments = [] } = {}) {
    const current = this.contents.getURL();
    let url;
    try { url = new URL(current); } catch { return { login: true, editorAvailable: false, url: current }; }
    const isChat = url.protocol === 'https:' && url.hostname === 'chatgpt.com';
    if (!isChat && !(this.allowFixture && url.protocol === 'file:')) {
      return { login: true, editorAvailable: false, url: current };
    }
    const diagnose = typeof this.onDiagnostic === 'function' && !!text;
    const started = this.now();
    if (diagnose && action !== 'inspect') this.trace('action-start', { action, requestId });
    const documentKey = this.documentKey();
    let observation = await this.contents.executeJavaScript(pageScript({ action, text, requestId, expectedExperience, diagnose, draftToken, attachments }), action !== 'inspect');
    if (observation.action === 'paste-ready') {
      if (!canContinue() || this.documentKey() !== documentKey)
        return { action: 'deferred', reason: 'CHAT_CHANGED' };
      observation = await this.contents.executeJavaScript(pageScript({
        action: 'paste', text, requestId, expectedExperience, diagnose, draftToken, attachments,
      }), true);
    }
    if (diagnose) {
      const { diagnostic, editorAvailable, writable, login, busy, draftLength, draftMatches, sendEnabled,
        messageSeen, userMessageCount, experience, connectionError, insertionMethod, pasteHandled,
        attachmentsPresent, attachmentsReady, attachmentsFailed, action: outcome, reason } = observation;
      this.trace('observation', { action, requestId, diagnostic, editorAvailable, writable, login, busy,
        draftLength, draftMatches, sendEnabled, messageSeen, userMessageCount, experience, connectionError, insertionMethod, pasteHandled,
        attachmentsPresent, attachmentsReady, attachmentsFailed, outcome, reason },
        Math.max(0, this.now() - started));
    }
    if (observation.reason === 'PASTE_UNHANDLED')
      throw new ComposerError('PASTE_UNHANDLED', 'Редактор не принял вставку Paste. Контекст не отправлен.');
    return observation;
  }

  documentKey() { return this.pageState?.current?.documentId ?? this.contents.getURL(); }
  hasFilled(requestId) {
    return !!requestId && this.filledRequest?.requestId === requestId
      && this.filledRequest.documentKey === this.documentKey();
  }

  trace(event, fields = {}, elapsedMs) {
    if (!this.onDiagnostic) return;
    // Only fixed metadata is passed here. Never log arguments, draft text, HTML or exception messages.
    const signature = JSON.stringify({ event, ...fields });
    if (event === 'observation' && signature === this.lastDiagnostic) return;
    this.lastDiagnostic = signature;
    try { this.onDiagnostic({ event, ...fields, ...(elapsedMs === undefined ? {} : { elapsedMs }) }); } catch {}
  }

  async traceDelivery(operation, args, run) {
    const started = this.now(), requestId = args.requestId ?? null;
    this.trace('delivery-start', { operation, requestId, textLength: args.text?.length ?? 0 });
    try {
      const result = await run();
      this.trace('delivery-result', { operation, requestId, state: result.state, reason: result.reason ?? null,
        recovered: !!result.recovered }, Math.max(0, this.now() - started));
      return result;
    } catch (error) {
      this.trace('delivery-error', { operation, requestId,
        code: /^[A-Z_]{1,80}$/.test(error.code ?? '') ? error.code : 'UNCLASSIFIED' }, Math.max(0, this.now() - started));
      throw error;
    }
  }

  sendUserMessage(args) { return this.traceDelivery('user-message', args, () => this.sendUserMessageInternal(args)); }
  deliver(args) { return this.traceDelivery('recovery', args, () => this.deliverInternal(args)); }

  async clearNewSessionDraft({ canContinue = () => true } = {}) {
    if (!canContinue()) return { action: 'deferred', reason: 'CHAT_CHANGED' };
    const documentId = this.pageState?.current?.documentId;
    if (!documentId) return { action: 'deferred', reason: 'EDITOR_UNAVAILABLE' };
    // Verify the isolated observer's identity in the same renderer turn as deletion.
    // A queued operation from the previous document cannot erase the next chat.
    const code = `globalThis.__webPilotObserverDocumentId === ${JSON.stringify(documentId)}
      ? ${pageScript({ action: 'clear-new-draft' })}
      : ({ action: 'deferred', reason: 'CHAT_CHANGED' })`;
    const result = await this.contents.executeJavaScriptInIsolatedWorld(999, [{ code }], true);
    if (result.reason === 'DRAFT_CLEAR_FAILED')
      throw new ComposerError('NEW_SESSION_DRAFT_CLEAR_FAILED', 'Не удалось очистить поле нового чата. Уберите старый черновик и повторите.');
    return result;
  }

  async waitForSendReady(args, version, canContinue) {
    const deadline = this.now() + (args.attachments?.length ? this.attachmentTimeoutMs : this.timeoutMs);
    let observation;
    do {
      if (!canContinue()) return observation ?? {};
      observation = await this.inspect(args);
      if (observation.messageSeen || observation.login || observation.busy || observation.connectionError
          || observation.attachmentsFailed || (observation.sendEnabled && observation.writable
            && (!args.attachments?.length || observation.attachmentsReady))) return observation;
      const signal = await this.waitForObservedChange(version, args.attachments?.length ? Math.min(deadline, this.now() + 500) : deadline, canContinue);
      version = signal.version ?? version;
      if (signal.cancelled || signal.timeout && !args.attachments?.length) return observation;
    } while (this.now() < deadline);
    return observation;
  }

  async waitForObservedChange(version, deadline, canContinue) {
    if (!this.pageState) {
      await this.wait(this.settleMs);
      return { changed: true, version };
    }
    const remaining = Math.max(0, deadline - this.now());
    if (!remaining) return { changed: false, timeout: true, version: this.pageState.version };
    return this.pageState.waitForChange(version, { timeoutMs: remaining, canContinue });
  }

  async sendUserMessageInternal({ text, canContinue = () => true, waitForAcknowledgement = true, onBeforeSend = async () => true, cleanupOnCancel = false }) {
    if (this.inFlight) throw new ComposerError('SEND_IN_PROGRESS', 'Другая отправка ещё не завершилась.');
    if (typeof text !== 'string' || !text.trim()) throw new ComposerError('MESSAGE_INVALID', 'Не подготовлено пользовательское сообщение.');
    this.inFlight = true;
    let sendAttempted = false;
    const draftToken = cleanupOnCancel ? crypto.randomUUID() : '';
    try {
      if (!canContinue()) return { state: 'cancelled' };
      let observation = await this.inspect({ text });
      const beforeCount = observation.userMessageCount ?? 0;
      if (observation.login || !observation.editorAvailable || !observation.writable) return { state: 'deferred', reason: 'LOGIN_REQUIRED', observation };
      if (observation.busy) return { state: 'deferred', reason: 'GENERATION_ACTIVE', observation };
      if (observation.draftLength) return { state: 'deferred', reason: 'DRAFT_PRESENT', observation };
      if (!canContinue()) return { state: 'cancelled' };
      const fillVersion = this.pageState?.version ?? 0;
      observation = await this.inspect({ action: 'fill', text, canContinue, draftToken });
      if (observation.action !== 'filled') return { state: 'deferred', reason: observation.reason ?? 'SEND_UNAVAILABLE', observation };
      observation = await this.waitForSendReady({ text }, fillVersion, canContinue);
      if (!canContinue()) return { state: 'cancelled' };
      if (!observation.sendEnabled || observation.busy) {
        return { state: 'deferred', reason: observation.busy ? 'GENERATION_ACTIVE' : 'SEND_UNAVAILABLE', observation };
      }
      if (!await onBeforeSend() || !canContinue()) return { state: 'cancelled' };
      sendAttempted = true;
      observation = await this.inspect({ action: 'send', text });
      if (observation.action !== 'clicked') return { state: 'deferred', reason: observation.reason ?? 'SEND_UNAVAILABLE', observation };
      if (!waitForAcknowledgement) return { state: 'sent', completion: 'send-dispatched' };
      const deadline = this.now() + this.timeoutMs;
      let observedVersion = this.pageState?.version ?? 0;
      do {
        if (!canContinue()) return { state: 'unknown', reason: 'CHAT_CHANGED' };
        observation = await this.inspect();
        if ((observation.userMessageCount ?? 0) > beforeCount) return { state: 'sent', observation };
        const signal = await this.waitForObservedChange(observedVersion, deadline, canContinue);
        observedVersion = signal.version ?? observedVersion;
        if (signal.cancelled) return { state: 'unknown', reason: 'CHAT_CHANGED' };
        if (signal.timeout) break;
      } while (this.now() < deadline);
      return { state: 'unknown', reason: 'SEND_NOT_OBSERVED' };
    } catch (error) {
      if (sendAttempted) return { state: 'unknown', reason: 'PAGE_UNAVAILABLE' };
      throw error;
    } finally {
      if (draftToken && !sendAttempted) {
        try { await this.inspect({ action: 'clear-owned-draft', text, draftToken }); } catch {}
      }
      this.inFlight = false;
    }
  }

  async deliverInternal({ text, requestId, attachments = [], expectedExperience = null, canContinue = () => true, onBeforeFill = async () => {}, onBeforeSend = async () => {} }) {
    if (this.inFlight) throw new ComposerError('SEND_IN_PROGRESS', 'Другая отправка ещё не завершилась.');
    if (typeof text !== 'string' || !text || !requestId || !text.includes(requestId)) throw new ComposerError('MESSAGE_INVALID', 'Не подготовлено стартовое сообщение.');
    this.inFlight = true;
    let clicked = false;
    try {
      if (!canContinue()) return { state: 'cancelled' };
      if (this.dispatchedRequestId === requestId)
        return { state: 'sent', completion: 'send-dispatched', recovered: true };
      if (this.uncertainRequestId === requestId) return { state: 'unknown', reason: 'SEND_NOT_OBSERVED' };
      let observation = await this.inspect({ text, requestId });
      if (observation.messageSeen) return { state: 'sent', recovered: true, observation };
      if (!canContinue()) return { state: 'cancelled' };
      const fillVersion = this.pageState?.version ?? 0;
      if (attachments.length && (this.attachmentRequest?.requestId !== requestId || this.attachmentRequest.documentKey !== this.documentKey())) {
        await onBeforeFill();
        if (!canContinue()) return { state: 'cancelled' };
        this.attachmentRequest = { requestId, documentKey: this.documentKey() };
        observation = await this.inspect({ action: 'attach', attachments, requestId, expectedExperience });
        if (!['attachments-dispatched', 'deferred'].includes(observation.action))
          return { state: 'deferred', reason: observation.reason ?? 'ATTACHMENTS_PENDING', observation };
        if (observation.reason && observation.reason !== 'ATTACHMENTS_PENDING') {
          this.attachmentRequest = null; // The page refused this attempt before dispatch.
          return { state: 'deferred', reason: observation.reason, observation };
        }
      }
      if (!this.hasFilled(requestId)) {
        await onBeforeFill();
        if (!canContinue()) return { state: 'cancelled' };
        const documentKey = this.documentKey();
        observation = await this.inspect({ action: 'fill', text, requestId, expectedExperience, canContinue });
        if (observation.action === 'already-sent') return { state: 'sent', recovered: true, observation };
        if (observation.action !== 'filled') return { state: 'deferred', reason: observation.reason ?? 'LOGIN_REQUIRED', observation };
        if (!canContinue() || this.documentKey() !== documentKey) return { state: 'cancelled' };
        this.filledRequest = { requestId, documentKey };
      }
      observation = await this.waitForSendReady({ text, requestId, attachments }, fillVersion, canContinue);
      if (!canContinue()) return { state: 'cancelled' };
      if (observation.messageSeen) return { state: 'sent', recovered: true, observation };
      if (attachments.length && !observation.attachmentsReady)
        throw new ComposerError(observation.attachmentsFailed ? 'ATTACHMENTS_FAILED' : 'ATTACHMENTS_PENDING',
          'Не подтверждена загрузка всех частей контекста. Сообщение не отправлено; проверьте вложения.');
      if (!observation.sendEnabled || observation.busy) {
        return { state: 'deferred', reason: observation.busy ? 'GENERATION_ACTIVE' : 'SEND_UNAVAILABLE', observation };
      }
      // Persist an uncertain attempt BEFORE the click, so a crash never triggers a second send.
      this.trace('before-send-start', { requestId });
      await onBeforeSend();
      this.trace('before-send-complete', { requestId });
      if (!canContinue()) return { state: 'cancelled' };
      clicked = true; // An exception after dispatch has an uncertain outcome, never replay automatically.
      this.uncertainRequestId = requestId;
      observation = await this.inspect({ action: 'send', text, requestId, expectedExperience, attachments });
      if (observation.action === 'already-sent') return { state: 'sent', recovered: true, observation };
      if (observation.action !== 'clicked') { clicked = false; this.uncertainRequestId = null; return { state: 'deferred', reason: observation.reason, observation }; }
      clicked = true;
      this.dispatchedRequestId = requestId;
      this.uncertainRequestId = null;
      // Send dispatch completes recovery. The site may render it as an attachment,
      // so neither DOM marker discovery nor an agent response is a completion gate.
      return { state: 'sent', completion: 'send-dispatched', observation };
    } catch (error) {
      if (clicked) return { state: 'unknown', reason: 'PAGE_UNAVAILABLE' };
      throw error;
    } finally { this.inFlight = false; }
  }
}
