export const CHATGPT_CHAT_ENTRYPOINT = 'https://chatgpt.com/';
export const CHATGPT_SIGNIN_ENTRYPOINT = 'https://chatgpt.com/auth/login';
export const CHATGPT_WORK_ENTRYPOINT = 'https://chatgpt.com/work/';

function parsedChatGPTUrl(input) {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

export function chatGPTEntrypoint(experience) {
  if (experience === 'chat') return CHATGPT_CHAT_ENTRYPOINT;
  if (experience === 'work') return CHATGPT_WORK_ENTRYPOINT;
  throw Object.assign(new Error('Неизвестный ChatGPT experience.'), { code: 'CHATGPT_EXPERIENCE' });
}

export function chatGPTExperienceForUrl(input) {
  const url = parsedChatGPTUrl(input);
  if (!url) return null;
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/work' || pathname.startsWith('/work/')) return 'work';
  if (pathname === '/' && ['work', 'tpp'].includes(url.searchParams.get('surface'))) return 'work';
  if (pathname === '/' || /^\/c\/[a-zA-Z0-9_-]{8,}$/.test(pathname)
      || /^\/g\/[a-zA-Z0-9_-]+\/c\/[a-zA-Z0-9_-]{8,}$/.test(pathname)) return 'chat';
  return null;
}

export function chatGPTUrlMatchesExperience(input, experience) {
  return chatGPTExperienceForUrl(input) === experience;
}

// ChatGPT briefly uses these optimistic URLs after clicking Send; it is never a persisted chatUrl.
export function isPendingChatGPTConversation(input) {
  const url = parsedChatGPTUrl(input);
  return !!url && /^\/c\/(?:WEB|local-chatgpt)(?::|%3A)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(url.pathname);
}
