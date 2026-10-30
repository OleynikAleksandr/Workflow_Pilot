// Shared, DOM-only compatibility contract. No account APIs or page internals.
export const CHATGPT_SELECTORS = Object.freeze({
  editor: '#prompt-textarea,textarea[data-testid="prompt-textarea"],[data-testid="composer-text-input"],[contenteditable="true"][role="textbox"]',
  send: '[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Send message"],button[aria-label="Отправить сообщение"],button[aria-label="Отправить"]',
  stop: '[data-testid="stop-button"],button[aria-label="Stop streaming"],button[aria-label="Остановить генерацию"],button[aria-label="Stop generating"],button[aria-label="Остановить"],button[aria-label="Stop"]',
  user: '[data-message-author-role="user"],[data-testid="user-message"],[data-user-message-bubble]',
  assistant: '[data-message-author-role="assistant"],[data-testid="assistant-message"],[data-markdown-text-style="assistant-message"]',
  userBubble: '.user-message-bubble-color,.user-message-bubble,[data-user-message-bubble]',
  activity: 'div[class~="group/activity-header"]',
  scroller: '.thread-scroll-container',
  login: '[data-testid="login-button"],[data-testid="signup-button"],a[href="/auth/login"],a[href="https://chatgpt.com/auth/login"]',
  profile: '[data-testid="profile-button"],[data-testid="accounts-profile-button"],[data-testid="user-menu-button"],[data-testid="profile-menu-button"],[data-testid="user-menu-dropdown"]',
  // Variant switch of an edited user turn ("< 2/2 >"); read only, never clicked.
  variantSwitch: 'button[aria-label="Previous response"],button[aria-label="Next response"],button[aria-label="Предыдущий ответ"],button[aria-label="Следующий ответ"],button[aria-label="Previous message"],button[aria-label="Next message"]',
  turn: 'article,[data-testid^="conversation-turn-"]',
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
  const editor = () => first(selectors.editor);
  const account = () => {
    // Only application chrome counts. A quoted profile button or chat link is not an account.
    const excluded = selectors.user + ',' + selectors.assistant + ',pre,code,blockquote,[contenteditable="true"]';
    const chrome = node => visible(node) && !node.closest(excluded);
    const loginControl = [...document.querySelectorAll(selectors.login)].some(chrome);
    const profileName = /^(?:open\s+)?(?:profile|user|account)\s+menu$|^(?:открыть\s+)?меню\s+(?:профиля|пользователя|аккаунта)$/i;
    const profileControl = [...document.querySelectorAll(selectors.profile)].some(chrome)
      || [...document.querySelectorAll('button,[role="button"]')].some(node => {
        if (!chrome(node)) return false;
        const labelled = (node.getAttribute('aria-labelledby') ?? '').split(/\s+/)
          .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        return [node.getAttribute('aria-label'), labelled, node.getAttribute('title')]
          .some(name => profileName.test((name ?? '').replace(/\s+/g, ' ').trim()));
      });
    let historyLink = false, projectLink = false;
    for (const link of document.querySelectorAll('nav a[href],aside a[href],[role="navigation"] a[href],#sidebar a[href],[data-testid="sidebar"] a[href]')) {
      if (!chrome(link)) continue;
      let url;
      try { url = new URL(link.href, location.href); } catch { continue; }
      if (url.origin !== 'https://chatgpt.com') continue;
      historyLink ||= /^\/(?:c|g\/[^/]+\/c)\/[a-zA-Z0-9_-]{8,}\/?$/.test(url.pathname);
      projectLink ||= /^\/g\/g-p-[a-zA-Z0-9_-]+(?:\/project)?\/?$/.test(url.pathname)
        || /^\/projects?\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
    }
    const editorAvailable = !!editor();
    const reason = loginControl ? 'login-control' : profileControl ? 'profile-control'
      : editorAvailable && historyLink && projectLink ? 'account-navigation' : 'no-account-signal';
    return { login: reason === 'login-control' ? 'signed-out'
      : ['profile-control', 'account-navigation'].includes(reason) ? 'signed-in' : 'unknown',
      loginEvidence: { reason, loginControl, profileControl, historyLink, projectLink, editorAvailable } };
  };
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
  // single | multiple | unknown for the last user turn: whether ChatGPT shows
  // a variant switch, which marks a branch made by editing that turn.
  const turnVariant = node => {
    if (!node) return 'unknown';
    const turn = node.closest(selectors.turn) ?? node.parentElement;
    if (!turn) return 'unknown';
    const switches = [...turn.querySelectorAll(selectors.variantSwitch)].filter(e => !e.closest('pre,code,[contenteditable="true"]'));
    const counter = [...turn.querySelectorAll('div,span')].some(e => e.children.length === 0
      && /^\s*\d+\s*\/\s*\d+\s*$/.test(e.textContent ?? '') && Number((e.textContent ?? '').split('/')[1]) > 1
      && !e.closest(selectors.user + ',' + selectors.assistant + ',pre,code'));
    return switches.length || counter ? 'multiple' : 'single';
  };
  return { selectors, visible, first, messages, connectionError, editor, account, sendButton, turnVariant, busy: () => !!first(selectors.stop) };
}
export const chatGPTDOMScript = () => `(${createChatGPTDOM.toString()})(${JSON.stringify(CHATGPT_SELECTORS)})`;
