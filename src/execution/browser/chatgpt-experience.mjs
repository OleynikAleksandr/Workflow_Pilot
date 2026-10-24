export const CHATGPT_CHAT_ENTRYPOINT = 'https://chatgpt.com/';
export const CHATGPT_SIGNIN_ENTRYPOINT = 'https://chatgpt.com/auth/login';

function parsedChatGPTUrl(input) {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

export const hasChatGPTQuery = input => parsedChatGPTUrl(input)?.searchParams.has('q') === true;
export function chatGPTRefreshTarget(current, target = current) {
  return hasChatGPTQuery(current) || hasChatGPTQuery(target) ? CHATGPT_CHAT_ENTRYPOINT : target;
}

export function isChatGPTChatUrl(input) {
  const url = parsedChatGPTUrl(input);
  if (!url || url.searchParams.has('surface')) return false;
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  return pathname === '/' || /^\/c\/[a-zA-Z0-9_-]{8,}$/.test(pathname)
    || /^\/g\/[a-zA-Z0-9_-]+\/c\/[a-zA-Z0-9_-]{8,}$/.test(pathname)
    || isPendingChatGPTConversation(input);
}

// ChatGPT briefly uses these optimistic URLs after clicking Send; it is never a persisted chatUrl.
export function isPendingChatGPTConversation(input) {
  const url = parsedChatGPTUrl(input);
  return !!url && !url.searchParams.has('surface') && /^\/c\/(?:WEB|local-chatgpt)(?::|%3A)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(url.pathname);
}
