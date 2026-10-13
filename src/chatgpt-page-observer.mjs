// DOM-only observer; bundled with the same adapter used by composer.inspect.
export function installPageObserver(dom, send) {
  const documentId = crypto.randomUUID();
  Object.defineProperty(globalThis, '__webPilotObserverDocumentId', { value: documentId });
  let manualSendRevision = 0, manualCandidate = null;
  let manualStopRevision = 0, manualInputRevision = 0, assistantRevision = 0;
  let reportedAssistantRevision = 0, lastProgressAt = 0, progressTimer = null;
  let seq = 0, draftRevision = 0, userMessagesRevision = 0, editorRevision = 0;
  let editorIdentity = null, pending = false, lastSignature = '', live = true;
  const loginSelector = '[data-testid="login-button"],[data-testid="signup-button"],a[href="/auth/login"],a[href="https://chatgpt.com/auth/login"]';
  const profileSelector = '[data-testid="profile-button"],[data-testid="accounts-profile-button"],[data-testid="user-menu-button"],button[aria-label="Open Profile Menu"],button[aria-label="Открыть меню профиля"]';
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  // Stable across document reloads; store an opaque identity, never conversation text.
  const fingerprint = text => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16);
  };
  const editorText = editor => editor ? normalize(editor.value ?? editor.innerText ?? editor.textContent ?? '') : '';
  const captureManualSend = event => {
    if (!event.isTrusted) return;
    const editor = dom.editor(), button = dom.sendButton(), target = event.target;
    const click = event.type === 'click' && button && (target === button || button.contains(target));
    const enter = event.type === 'keydown' && event.key === 'Enter' && !event.shiftKey && !event.isComposing
      && editor && (target === editor || editor.contains(target));
    const text = editorText(editor);
    if ((click || enter) && text && !dom.busy() && button && !button.disabled)
      manualCandidate = { text, editor, count: dom.messages('user').length };
  };
  const snapshot = () => {
    if (manualCandidate && dom.messages('user').length > manualCandidate.count && !editorText(dom.editor()) && dom.messages('user').some(message =>
        normalize(message.innerText ?? message.textContent ?? '') === manualCandidate.text)) {
      manualSendRevision++; manualCandidate = null;
    }
    const editor = dom.editor() ?? null;
    if (!dom.busy() || Date.now() - lastProgressAt >= 5000) {
      reportedAssistantRevision = assistantRevision; lastProgressAt = Date.now();
    }
    const assistants = dom.messages('assistant'), users = dom.messages('user');
    const assistant = assistants.at(-1), user = users.at(-1);
    // Native IDs may be inside the outer semantic wrapper (Work) or on its ancestor.
    // DOM counts are not identities: virtualized history keeps a bounded window.
    const machineId = node => node?.getAttribute('data-message-id')
      || node?.closest('[data-message-id]')?.getAttribute('data-message-id')
      || node?.querySelector('[data-message-id]')?.getAttribute('data-message-id')
      || node?.closest('[data-turn-id]')?.getAttribute('data-turn-id') || '';
    const assistantId = machineId(assistant), userId = machineId(user);
    const turnId = assistantId ? fingerprint(assistantId) : '';
    const userTurnId = userId ? fingerprint(userId) : '';
    const turnIdentitySource = assistantId ? 'native' : assistant ? 'cycle' : 'none';
    const lastMessageRole = user && (!assistant || assistant.compareDocumentPosition(user) & 4) ? 'user'
      : assistant ? 'assistant' : null;
    if (editor !== editorIdentity) { editorIdentity = editor; editorRevision++; draftRevision++; }
    const button = dom.sendButton();
    const login = dom.first(loginSelector) ? 'signed-out' : dom.first(profileSelector) ? 'signed-in' : 'unknown';
    return {
      url: location.href, experience: dom.experience(), login,
      visibility: document.visibilityState,
      editorAvailable: !!editor, editorRevision,
      writable: !!editor && !editor.disabled && !editor.readOnly && editor.getAttribute('contenteditable') !== 'false',
      connectionError: dom.connectionError(),
      busy: dom.busy(), sendEnabled: !!button && !button.disabled && button.getAttribute('aria-disabled') !== 'true',
      manualStopRevision, manualInputRevision, assistantRevision: reportedAssistantRevision, turnId, userTurnId, turnIdentitySource, lastMessageRole, draftPresent: !!editorText(editor),
      manualSendRevision, draftRevision, userMessageCount: dom.messages('user').length, userMessagesRevision,
    };
  };
  Object.defineProperty(globalThis, '__webPilotObserverSnapshot', { value: snapshot, configurable: true });
  const emit = () => {
    pending = false;
    if (!live || location.origin !== 'https://chatgpt.com') return;
    const state = snapshot(), signature = JSON.stringify(state);
    if (signature === lastSignature) return;
    lastSignature = signature;
    send({ version: 1, documentId, seq: ++seq, state });
  };
  const schedule = () => { if (!pending) { pending = true; queueMicrotask(emit); } };
  const elementOf = node => node?.nodeType === 1 ? node : node?.parentElement;
  const inUser = node => !!elementOf(node)?.closest(dom.selectors.user);
  const containsUser = node => !!elementOf(node)?.matches(dom.selectors.user)
    || !!(node?.nodeType === 1 && node.querySelector(dom.selectors.user));
  const observer = new MutationObserver(records => {
    let draftChanged = false, usersChanged = false, relevant = false, assistantChanged = false;
    for (const record of records) {
      const textChange = record.type === 'characterData' || record.type === 'childList';
      if (textChange && editorIdentity && (record.target === editorIdentity || editorIdentity.contains(record.target))) draftChanged = true;
      if (textChange && (inUser(record.target) || [...record.addedNodes, ...record.removedNodes].some(containsUser))) usersChanged = true;
      // Streaming assistant text alone is irrelevant to delivery and agent busy state.
      const inAssistant = elementOf(record.target)?.closest(dom.selectors.assistant);
      if (textChange && (inAssistant || [...record.addedNodes, ...record.removedNodes].some(node =>
          elementOf(node)?.matches(dom.selectors.assistant) || node.nodeType === 1 && node.querySelector(dom.selectors.assistant))))
        assistantChanged = true;
      const onlyText = record.type === 'characterData' || (record.type === 'childList'
        && [...record.addedNodes, ...record.removedNodes].every(n => n.nodeType === 3));
      if (!(inAssistant && onlyText) || elementOf(record.target)?.closest('[role="alert"],[data-testid="conversation-error"],.text-token-text-error')) relevant = true;
    }
    if (assistantChanged) {
      assistantRevision++;
      // One trailing progress notification, only after real content mutations.
      // Animated attributes and an unchanged spinner do not keep a turn alive.
      if (dom.busy() && progressTimer === null) progressTimer = setTimeout(() => {
        progressTimer = null;
        reportedAssistantRevision = assistantRevision; lastProgressAt = Date.now();
        emit();
      }, 5000);
    }
    if (draftChanged) draftRevision++;
    if (usersChanged) userMessagesRevision++;
    if (relevant || draftChanged || usersChanged || assistantChanged && !dom.busy()) schedule();
  });
  const start = () => {
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['disabled', 'readonly', 'contenteditable', 'aria-disabled', 'aria-hidden', 'hidden',
        'data-message-id', 'data-turn-id', 'id', 'data-state', 'aria-checked', 'aria-pressed', 'class', 'style', 'data-testid', 'data-message-author-role'] });
    document.addEventListener('click', event => {
      if (event.isTrusted && elementOf(event.target)?.closest(dom.selectors.stop)) {
        manualStopRevision++; emit();
      }
      captureManualSend(event);
    }, true);
    document.addEventListener('keydown', captureManualSend, true);
    document.addEventListener('input', event => {
      if (event.isTrusted && editorIdentity && (event.target === editorIdentity || editorIdentity.contains(event.target))) {
        manualInputRevision++; emit();
      }
      if (manualCandidate && editorText(manualCandidate.editor) && editorText(manualCandidate.editor) !== manualCandidate.text) manualCandidate = null;
      if (editorIdentity && (event.target === editorIdentity || editorIdentity.contains(event.target))) { draftRevision++; schedule(); }
    }, true);
    document.addEventListener('change', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    addEventListener('pageshow', schedule);
    addEventListener('resize', schedule);
    addEventListener('popstate', schedule);
    addEventListener('hashchange', schedule);
    // Navigation API observes main-world SPA changes from the isolated world too.
    globalThis.navigation?.addEventListener('currententrychange', schedule);
    emit();
  };
  if (document.documentElement) start();
  else addEventListener('DOMContentLoaded', start, { once: true });
  return () => {
    live = false; observer.disconnect(); if (progressTimer !== null) clearTimeout(progressTimer);
    delete globalThis.__webPilotObserverSnapshot;
  };
}
