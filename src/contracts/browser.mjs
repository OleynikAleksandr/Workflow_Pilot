// Shared URL validation, independent of project stores and Electron.
export function normalizeChatUrl(input) {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'chatgpt.com' || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/(?:c|work\/c|work|g\/[a-zA-Z0-9_-]+\/c)\/([a-zA-Z0-9_-]{8,})\/?$/);
    return match ? url.origin + url.pathname.replace(/\/$/, '') : null;
  } catch { return null; }
}

export const browserError = error => ({
  code: typeof error?.code === 'string' ? error.code : 'BROWSER_ERROR',
  message: typeof error?.message === 'string' ? error.message : 'Ошибка страницы.',
});
