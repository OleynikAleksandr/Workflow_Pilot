import { createChatGPTDOM, CHATGPT_SELECTORS, chatGPTDOMScript } from './chatgpt-dom.mjs';
import { startupCommand, STARTUP_TICKET_PLACEHOLDER } from '../../contracts/context.mjs';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

class ComposerError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// Runs only in the visible ChatGPT document. No page internals, cookies or API requests.
export function pageOperation({ action = 'inspect', text = '', requestId = '', expectedUrl = null, diagnose = false, draftToken = '', attachments = [], attachmentIndex = null, startupTemplate = '', startupPlaceholder = '' } = {}, dom = createChatGPTDOM(CHATGPT_SELECTORS)) {
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
  const result = { connectionError, url: location.href, editorAvailable: !!editor, writable, login,
    accountStatus: dom.account().login, busy,
    draftLength, draftMatches, sendEnabled, messageSeen, userMessageCount: messages.length };
  if (expectedUrl !== null && location.href !== expectedUrl)
    return { ...result, action: 'deferred', reason: 'CHAT_CHANGED' };
  // Only visible composer cards count. Message history cannot prove draft uploads.
  const attachmentKey = Symbol.for('web-pilot-file-paste');
  const owner = editor?.[attachmentKey];
  const owned = owner?.requestId === requestId && owner.identity === JSON.stringify(attachments) ? owner : null;
  let cards = [], attachmentStates = [], attachmentMatches = [];
  if (attachments.length) {
    const nodes = [...document.querySelectorAll('[title],[aria-label],span,div,p')].filter(node => dom.visible(node)
      && !node.closest(dom.selectors.user + ',' + dom.selectors.assistant + ',pre,code,[contenteditable="true"]'));
    cards = attachments.map((file, index) => {
      const expectedName = owned?.retryNames?.[index] ?? file.name;
      // A server duplicate suffix is accepted only for the unguessable name
      // created by our own retry in this document, never for arbitrary files.
      const dot = expectedName.lastIndexOf('.'), stem = dot < 0 ? expectedName : expectedName.slice(0, dot);
      const extension = dot < 0 ? '' : expectedName.slice(dot);
      const matchName = value => value === expectedName ? 'exact' : owned?.retryNames?.[index]
        && value?.startsWith(stem) && value.endsWith(extension)
        && /^ ?\([1-9]\d*\)$/.test(value.slice(stem.length, extension ? -extension.length : undefined)) ? 'retry-renamed' : null;
      const labels = nodes.map(node => ({node, match: matchName(node.getAttribute('title'))
        ?? matchName(node.getAttribute('aria-label')) ?? (!node.children.length && matchName((node.textContent ?? '').trim()))})).filter(x => x.match);
      const matches = new Map(); let renamed = false;
      for (const {node: label, match} of labels) {
        for (let card = label, depth = 0; card && depth < 5 && card.tagName !== 'FORM'; card = card.parentElement, depth++) {
          const remove = [...card.querySelectorAll('button')].filter(button => /remove|delete|удалить/i.test(button.getAttribute('aria-label') ?? button.getAttribute('title') ?? button.textContent ?? ''));
          if (remove.length > 1) break;
          if (remove.length === 1) {
            const previous = matches.get(remove[0]);
            if (!previous || card.contains(previous)) matches.set(remove[0], card);
            renamed ||= match === 'retry-renamed'; break;
          }
        }
      }
      attachmentMatches.push({index, candidates: matches.size, match: matches.size > 1 ? 'ambiguous'
        : matches.size === 0 ? 'missing' : renamed ? 'retry-renamed' : 'exact', retry: !!owned?.retryNames?.[index]});
      return matches.size === 1 ? [...matches.values()][0] : null;
    });
    const progress = '[role="progressbar"],[aria-busy="true"],[data-state="uploading"],[data-testid="upload-progress"],.animate-spin';
    const failed = card => card.matches('[role="alert"],[data-state="error"]') || !!card.querySelector('[role="alert"],[data-state="error"]')
      || /upload failed|failed to upload|ошибка загрузки|не удалось загрузить/i.test(card.textContent ?? '');
    attachmentStates = cards.map((card, index) => attachmentMatches[index].candidates > 1 ? 'ambiguous' : !card ? 'missing' : cards.filter(other => other === card).length !== 1 ? 'ambiguous'
      : failed(card) ? 'failed' : card.matches(progress) || card.querySelector(progress) ? 'pending' : 'ready');
    result.attachmentStates = attachmentStates;
    result.attachmentMatches = attachmentMatches;
    result.attachmentOwnershipChanged = !!owned?.touched;
    result.attachmentsTotal = attachments.length;
    result.attachmentsReadyCount = attachmentStates.filter(state => state === 'ready').length;
    result.attachmentsPresent = cards.filter(Boolean).length;
    result.attachmentsFailed = cards.some(card => card && failed(card));
    result.attachmentsReady = cards.every(card => card && !failed(card) && !card.matches(progress) && !card.querySelector(progress))
      && new Set(cards).size === attachments.length && sendEnabled && !owned?.touched;
    if (owned) {
      owned.cards ??= [];
      cards.forEach((card, index) => { if (card && !owned.cards[index]) owned.cards[index] = card; });
    }
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
    // Explicit New Chat only. A conversation (even empty) is never cleared.
    if (location.pathname !== '/' || messages.length)
      return { ...result, action: 'deferred', reason: 'CHAT_CHANGED' };
    // Restored startup command only: the exact template with one ticket, nothing added.
    if (startupTemplate && draftLength) {
      const ticket = actual.match(/"enrollment_ticket":"([a-f0-9]{64})"/)?.[1];
      // Restored text may differ in whitespace only (the editor rewraps lines).
      const compact = value => value.replace(/\s+/g, ' ').trim();
      if (!ticket || !startupPlaceholder || compact(actual) !== compact(startupTemplate.split(startupPlaceholder).join(ticket)))
        return { ...result, action: 'deferred', reason: 'DRAFT_NOT_STARTUP' };
    }
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
  if (action === 'retry-remove-attachment' || action === 'retry-paste-attachment') {
    const owned = editor[attachmentKey], index = attachmentIndex, card = cards[index];
    if (!Number.isInteger(index) || !attachments[index] || !owned || owned.requestId !== requestId
        || owned.identity !== JSON.stringify(attachments) || owned.touched || !draftMatches)
      return { ...result, action: 'deferred', reason: 'ATTACHMENTS_CHANGED' };
    if (action === 'retry-remove-attachment') {
      if (owned.replacing != null) return { ...result, action: owned.replacing === index && !card ? 'attachment-removed' : 'deferred', reason: 'ATTACHMENTS_PENDING' };
      if (attachmentStates.some(state => ['missing','ambiguous'].includes(state)))
        return { ...result, action: 'deferred', reason: 'ATTACHMENTS_CHANGED' };
      if (owned.cards?.[index] !== card) return { ...result, action: 'deferred', reason: 'ATTACHMENTS_CHANGED' };
      if (attachmentStates[index] === 'ready') return { ...result, action: 'attachment-ready' };
      const buttons = [...card.querySelectorAll('button')].filter(button => dom.visible(button)
        && /remove|delete|удалить/i.test(button.getAttribute('aria-label') ?? button.getAttribute('title') ?? button.textContent ?? ''));
      if (buttons.length !== 1 || buttons[0].disabled || buttons[0].getAttribute('aria-disabled') === 'true')
        return { ...result, action: 'deferred', reason: 'ATTACHMENTS_CHANGED' };
      owned.replacing = index; // Record before clicking: an uncertain removal is never clicked twice.
      buttons[0].click();
      return { ...result, action: 'attachment-removing' };
    }
    if (owned.replacing !== index || card || attachmentStates.some((state, i) => i !== index && ['missing','ambiguous'].includes(state)))
      return { ...result, action: 'deferred', reason: 'ATTACHMENTS_CHANGED' };
    const data = new DataTransfer(), file = attachments[index];
    const dot = file.name.lastIndexOf('.'), stem = dot < 0 ? file.name : file.name.slice(0, dot), extension = dot < 0 ? '' : file.name.slice(dot);
    const name = `${stem}-retry-${crypto.randomUUID()}${extension}`;
    owned.retryNames ??= []; owned.retryNames[index] = name;
    data.items.add(new File([file.text], name, { type: 'text/markdown', lastModified: 0 }));
    owned.replacing = null; // Mark before paste; a thrown event must not duplicate a file.
    owned.cards[index] = null;
    editor.focus();
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    return { ...result, action: 'attachment-restarted' };
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
    const listenerKey = Symbol.for('web-pilot-file-edit-listener');
    if (!editor[listenerKey]) {
      const edited = event => {
        if (!event.isTrusted) return;
        const target = event.target, scope = editor.closest('form') ?? editor.parentElement;
        if (!scope?.contains(target)) return;
        const button = target.closest?.('button');
        const remove = button && /remove|delete|удалить/i.test(button.getAttribute('aria-label') ?? button.getAttribute('title') ?? button.textContent ?? '');
        if (event.type === 'drop' || event.type === 'paste' && event.clipboardData?.files?.length
            || event.type === 'change' && target.type === 'file' || event.type === 'click' && remove)
          if (editor[attachmentKey]) editor[attachmentKey].touched = true;
      };
      for (const type of ['paste','drop','change','click']) document.addEventListener(type, edited, true);
      editor[listenerKey] = true;
    }
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

  async inspect({ text = '', requestId = '', action = 'inspect', expectedUrl = null, canContinue = () => true, draftToken = '', attachments = [], attachmentIndex = null } = {}) {
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
    let observation = await this.contents.executeJavaScript(pageScript({ action, text, requestId, expectedUrl, diagnose, draftToken, attachments, attachmentIndex }), action !== 'inspect');
    if (observation.action === 'paste-ready') {
      if (!canContinue() || this.documentKey() !== documentKey)
        return { action: 'deferred', reason: 'CHAT_CHANGED' };
      observation = await this.contents.executeJavaScript(pageScript({
        action: 'paste', text, requestId, diagnose, draftToken, attachments,
      }), true);
    }
    if (diagnose) {
      const { diagnostic, editorAvailable, writable, login, busy, draftLength, draftMatches, sendEnabled,
        messageSeen, userMessageCount, connectionError, insertionMethod, pasteHandled,
        attachmentsPresent, attachmentsReady, attachmentsFailed, attachmentsTotal, attachmentsReadyCount, attachmentStates, attachmentMatches, attachmentOwnershipChanged, action: outcome, reason } = observation;
      this.trace('observation', { action, requestId, diagnostic, editorAvailable, writable, login, busy,
        draftLength, draftMatches, sendEnabled, messageSeen, userMessageCount, connectionError, insertionMethod, pasteHandled,
        attachmentsPresent, attachmentsReady, attachmentsFailed, attachmentsTotal, attachmentsReadyCount, attachmentStates, attachmentMatches, attachmentOwnershipChanged, outcome, reason },
        Math.max(0, this.now() - started));
    }
    if (observation.reason === 'PASTE_UNHANDLED')
      throw new ComposerError('PASTE_UNHANDLED', 'Редактор не принял вставку Paste. Контекст не отправлен.');
    return {...observation,documentId:this.documentKey()===documentKey?this.pageState?.current?.documentId??null:null};
  }

  getURL() { return this.contents.getURL(); }
  async observeSnapshot() {
    const key = this.documentKey();
    const message = await this.contents.executeJavaScriptInIsolatedWorld(999,
      [{ code: 'globalThis.__webPilotObserverRead?.() ?? null' }]);
    if (this.documentKey() !== key || !message || message.documentId !== key) return null;
    return message;
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

  async clearNewSessionDraft({ canContinue = () => true, startupOnly = false } = {}) {
    if (!canContinue()) return { action: 'deferred', reason: 'CHAT_CHANGED' };
    const documentId = this.pageState?.current?.documentId;
    if (!documentId) return { action: 'deferred', reason: 'EDITOR_UNAVAILABLE' };
    // Verify the isolated observer's identity in the same renderer turn as deletion.
    // A queued operation from the previous document cannot erase the next chat.
    const code = `globalThis.__webPilotObserverDocumentId === ${JSON.stringify(documentId)}
      ? ${pageScript({ action: 'clear-new-draft', ...(startupOnly ? { startupTemplate: startupCommand(STARTUP_TICKET_PLACEHOLDER),
        startupPlaceholder: STARTUP_TICKET_PLACEHOLDER } : {}) })}
      : ({ action: 'deferred', reason: 'CHAT_CHANGED' })`;
    const result = await this.contents.executeJavaScriptInIsolatedWorld(999, [{ code }], true);
    if (result.reason === 'DRAFT_CLEAR_FAILED')
      throw new ComposerError('NEW_SESSION_DRAFT_CLEAR_FAILED', 'Не удалось очистить поле нового чата. Уберите старый черновик и повторите.');
    return result;
  }

  async waitForSendReady(args, version, canContinue, onUploadProgress = () => {}) {
    const started = this.now(), deadline = started + (args.attachments?.length ? this.attachmentTimeoutMs : this.timeoutMs);
    let observation, signature = '', changedAt = started, loggedAt = started; const seen = new Set(), missingSince = new Map();
    do {
      if (!canContinue()) return observation ?? {};
      observation = await this.inspect(args);
      if (args.attachments?.length) {
        if (observation.attachmentOwnershipChanged)
          throw new ComposerError('ATTACHMENTS_CHANGED', 'Вложения изменены вручную. Автоматическая отправка остановлена.');
        observation.attachmentStates?.forEach((state, index) => {
          if (state === 'missing' && seen.has(index)) {
            if (!missingSince.has(index)) missingSince.set(index, this.now());
          } else missingSince.delete(index);
        });
        if ([...missingSince.values()].some(time => this.now() - time >= 750))
          throw new ComposerError('ATTACHMENTS_CHANGED', 'Не удалось повторно распознать вложение. Отправка остановлена; проверьте полный пакет.');
        observation.attachmentStates?.forEach((state, index) => { if (state !== 'missing') seen.add(index); });
        onUploadProgress({ ready: observation.attachmentsReadyCount ?? 0, total: args.attachments.length });
        const next = JSON.stringify([observation.attachmentStates, observation.attachmentMatches, observation.sendEnabled]);
        if (next !== signature) { signature = next; changedAt = this.now(); }
        if (this.now() - loggedAt >= 15000) {
          this.trace('attachment-wait', {requestId: args.requestId, attachmentStates: observation.attachmentStates,
            attachmentMatches: observation.attachmentMatches, waitMs: this.now() - started, unchangedMs: this.now() - changedAt});
          loggedAt = this.now();
        }
      }
      if (observation.messageSeen || observation.login || observation.busy || observation.connectionError
          || observation.attachmentsFailed || (observation.sendEnabled && observation.writable
            && (!args.attachments?.length || observation.attachmentsReady))) return observation;
      const signal = await this.waitForObservedChange(version, args.attachments?.length ? Math.min(deadline, this.now() + 500) : deadline, canContinue);
      version = signal.version ?? version;
      if (signal.cancelled || signal.timeout && !args.attachments?.length) return observation;
    } while (this.now() < deadline);
    if (missingSince.size) throw new ComposerError('ATTACHMENTS_CHANGED', 'Не удалось распознать полный пакет вложений. Отправка остановлена.');
    return observation;
  }

  async restartAttachments(args, canContinue) {
    const documentKey = this.documentKey(), current = () => canContinue() && this.documentKey() === documentKey;
    const snapshot = await this.inspect(args);
    if (!snapshot.draftMatches || snapshot.attachmentStates?.some(state => ['missing','ambiguous'].includes(state)))
      throw new ComposerError('ATTACHMENTS_CHANGED', 'Черновик или вложения изменены. Автоматический повтор отменён; создайте новую сессию.');
    for (const [attachmentIndex, state] of (snapshot.attachmentStates ?? []).entries()) {
      if (state === 'ready') continue;
      if (!current()) return false;
      let result = await this.inspect({ ...args, attachmentIndex, action: 'retry-remove-attachment' });
      if (result.action === 'attachment-ready') continue;
      if (!['attachment-removing','attachment-removed'].includes(result.action))
        throw new ComposerError('ATTACHMENTS_CHANGED', 'Не удалось подтвердить принадлежность вложения. Оно сохранено; начните новую сессию.');
      const deadline = this.now() + this.timeoutMs;
      while (current()) {
        const observed = await this.inspect(args);
        if (observed.attachmentStates?.[attachmentIndex] === 'missing') break;
        if (this.now() >= deadline) throw new ComposerError('ATTACHMENT_REMOVE_PENDING', 'ChatGPT не подтвердил удаление вложения. Повторная загрузка не начата.');
        await this.waitForObservedChange(this.pageState?.version ?? 0, Math.min(deadline, this.now() + 250), current);
      }
      if (!current()) return false;
      result = await this.inspect({ ...args, attachmentIndex, action: 'retry-paste-attachment' });
      if (result.action !== 'attachment-restarted') throw new ComposerError('ATTACHMENTS_CHANGED', 'Вложения изменились. Повторная загрузка остановлена.');
      // React may mount the new card asynchronously. Do not remove the next
      // pending part while the previous replacement is still unaccounted for.
      const appearDeadline = this.now() + this.timeoutMs;
      while (current()) {
        const observed = await this.inspect(args), state = observed.attachmentStates?.[attachmentIndex];
        if (observed.attachmentOwnershipChanged || state === 'ambiguous')
          throw new ComposerError('ATTACHMENTS_CHANGED', 'Повторное вложение не удалось однозначно распознать.');
        if (state && state !== 'missing') break;
        if (this.now() >= appearDeadline) throw new ComposerError('ATTACHMENTS_PENDING', 'ChatGPT ещё не показал повторное вложение. Отправка не выполнялась.');
        await this.waitForObservedChange(this.pageState?.version ?? 0, Math.min(appearDeadline, this.now() + 250), current);
      }
    }
    return current();
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

  async deliverInternal({ text, requestId, attachments = [], retryAttachments = false, onUploadProgress = () => {}, canContinue = () => true, onBeforeFill = async () => {}, onBeforeSend = async () => {} }) {
    if (this.inFlight) throw new ComposerError('SEND_IN_PROGRESS', 'Другая отправка ещё не завершилась.');
    if (typeof text !== 'string' || !text || !requestId || !text.includes(requestId)) throw new ComposerError('MESSAGE_INVALID', 'Не подготовлено стартовое сообщение.');
    this.inFlight = true;
    const expectedUrl = this.getURL(), expectedDocument = this.documentKey();
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
      if (retryAttachments && attachments.length) {
        await onBeforeFill();
        if (!canContinue() || !await this.restartAttachments({ text, requestId, attachments }, canContinue)) return { state: 'cancelled' };
      }
      if (attachments.length && (this.attachmentRequest?.requestId !== requestId || this.attachmentRequest.documentKey !== this.documentKey())) {
        await onBeforeFill();
        if (!canContinue()) return { state: 'cancelled' };
        this.attachmentRequest = { requestId, documentKey: this.documentKey() };
        observation = await this.inspect({ action: 'attach', attachments, requestId });
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
        observation = await this.inspect({ action: 'fill', text, requestId, canContinue });
        if (observation.action === 'already-sent') return { state: 'sent', recovered: true, observation };
        if (observation.action !== 'filled') return { state: 'deferred', reason: observation.reason ?? 'LOGIN_REQUIRED', observation };
        if (!canContinue() || this.documentKey() !== documentKey) return { state: 'cancelled' };
        this.filledRequest = { requestId, documentKey };
      }
      observation = await this.waitForSendReady({ text, requestId, attachments }, fillVersion, canContinue, onUploadProgress);
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
      if (this.getURL() !== expectedUrl || this.documentKey() !== expectedDocument)
        return { state: 'cancelled', reason: 'CHAT_CHANGED' };
      clicked = true; // An exception after dispatch has an uncertain outcome, never replay automatically.
      this.uncertainRequestId = requestId;
      observation = await this.inspect({ action: 'send', text, requestId, expectedUrl, attachments });
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
