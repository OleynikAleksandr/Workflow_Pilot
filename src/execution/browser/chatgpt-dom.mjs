// Shared, DOM-only compatibility contract. No account APIs or page internals.
export const CHATGPT_SELECTORS = Object.freeze({
  editor: '#prompt-textarea,textarea[data-testid="prompt-textarea"],[data-testid="composer-text-input"],[contenteditable="true"][role="textbox"]',
  send: '[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Send message"],button[aria-label="Отправить сообщение"],button[aria-label="Отправить"]',
  stop: '[data-testid="stop-button"],button[aria-label="Stop streaming"],button[aria-label="Остановить генерацию"],button[aria-label="Stop generating"],button[aria-label="Остановить"],button[aria-label="Stop"]',
  user: '[data-message-author-role="user"],[data-testid="user-message"],[data-user-message-bubble]',
  assistant: '[data-message-author-role="assistant"],[data-testid="assistant-message"],[data-markdown-text-style="assistant-message"]',
  userBubble: '.user-message-bubble-color,.user-message-bubble,[data-user-message-bubble]',
  modeGroup: '[aria-label="Select chat surface"],[aria-label="Выберите режим чата"],[role="group"][aria-label="Режим редактора"],[role="group"][aria-label="Composer mode"]',
  activity: 'div[class~="group/activity-header"]',
  scroller: '.thread-scroll-container',
});

export function createChatGPTDOM(selectors) {
  const visible = e => !!e && !e.hidden && e.getAttribute('aria-hidden') !== 'true'
    && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0;
  const first = s => [...document.querySelectorAll(s)].find(visible);
  // Prefer the outer semantic message, avoiding duplicate nested legacy/new wrappers.
  const messages = role => {
    const nodes = [...document.querySelectorAll(selectors[role])].filter(e => !e.closest('pre,code,[contenteditable="true"]'));
    return nodes.filter(e => !nodes.some(other => other !== e && other.contains(e)));
  };
  const modeOf = e => {
    const v = e.getAttribute('data-tpp-toggle-value');
    if (v === 'chatgpt') return 'chat';
    if (v === 'work') return 'work';
    const label = (e.innerText ?? e.textContent ?? '').trim();
    return /^(Chat|Чат)$/.test(label) ? 'chat' : /^(Work|Работа)$/.test(label) ? 'work' : null;
  };
  const modeButtons = () => {
    const native = [...document.querySelectorAll('button[data-tpp-toggle-value]')].filter(visible);
    if (native.length) return native;
    return [...document.querySelectorAll(selectors.modeGroup)].filter(visible).flatMap(g => [...g.querySelectorAll('button')].filter(visible));
  };
  const experience = () => {
    const selected = [...new Set(modeButtons().filter(e => e.getAttribute('data-state') === 'on'
      || e.getAttribute('aria-checked') === 'true' || e.getAttribute('aria-pressed') === 'true').map(modeOf).filter(Boolean))];
    return selected.length === 1 ? selected[0] : null;
  };
  const editor = () => first(selectors.editor);
  const sendButton = () => first(selectors.send) ?? [...(editor()?.closest('form')?.querySelectorAll('button[type="submit"]') ?? [])].find(visible);
  const connectionError = () => {
    // Inspect error UI, never ordinary message prose or code quoted by the user.
    const candidates = [...document.querySelectorAll('[role="alert"],[data-testid="conversation-error"],.text-token-text-error')];
    for (const button of document.querySelectorAll('button')) {
      if (/^(Retry|Try again|Повторить|Попробовать снова)$/i.test((button.innerText ?? button.textContent ?? '').trim())) {
        let node = button.parentElement;
        for (let i = 0; node && i < 3; i++, node = node.parentElement)
          if ((node.textContent ?? '').length < 1200) candidates.push(node);
      }
    }
    for (const node of candidates) {
      if (!visible(node) || node.closest(selectors.user + ',pre,code,blockquote,[contenteditable="true"]')) continue;
      const text = (node.innerText ?? node.textContent ?? '').trim();
      if (text.length > 1200) continue;
      if (/ChatGPT stream recovery polling timed out|resume stream unavailable|network error|connection (?:was )?(?:lost|interrupted)|ошибка сети|соединение (?:прервано|потеряно)/i.test(text))
        return 'stream-interrupted';
    }
    return null;
  };
  return { selectors, visible, first, messages, connectionError, modeOf, modeButtons, experience, editor, sendButton, busy: () => !!first(selectors.stop) };
}
export const chatGPTDOMScript = () => `(${createChatGPTDOM.toString()})(${JSON.stringify(CHATGPT_SELECTORS)})`;
