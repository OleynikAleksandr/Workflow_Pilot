import { normalizeChatUrl } from './workspace-session.mjs';

function normalizeTitle(value) {
  if (typeof value !== 'string') throw new TypeError('TITLE_INVALID');
  const normalized = value.replace(/\s+/g, ' ').trim();
  const result = []; let bytes = 0;
  for (const character of normalized) {
    const size = new TextEncoder().encode(character).length;
    if (result.length >= 80 || bytes + size > 200) break;
    result.push(character); bytes += size;
  }
  const title = result.join('').trim().replace(/[\s—–-]+$/u, '').trim();
  if (!title) throw new TypeError('TITLE_INVALID');
  return title;
}

export function conversationIdFromChatUrl(input) {
  const normalized = normalizeChatUrl(input);
  if (!normalized) return null;
  const path = new URL(normalized).pathname;
  return path.match(/^\/(?:c|work\/c|work|g\/[A-Za-z0-9_-]+\/c)\/([A-Za-z0-9_-]{8,})$/)?.[1] ?? null;
}

// Runs inside the authenticated ChatGPT renderer. The access token is read and
// consumed inside that renderer and is never returned to or persisted by Web Pilot.
async function renameChatGPTConversationPage({ expectedUrl, title }) {
  const fail = (code, status = null) => ({ ok: false, code, status });
  try {
    const exact = new URL(expectedUrl);
    const current = location.origin + location.pathname.replace(/\/$/, '');
    if (location.origin !== 'https://chatgpt.com' || current !== exact.origin + exact.pathname.replace(/\/$/, '')) return fail('CHAT_CHANGED');

    const match = exact.pathname.match(/^\/(?:c|work\/c|work|g\/[A-Za-z0-9_-]+\/c)\/([A-Za-z0-9_-]{8,})$/);
    if (!match) return fail('CHAT_URL_INVALID');
    const id = match[1];

    const sessionResponse = await fetch('/api/auth/session', { credentials: 'include' });
    if (!sessionResponse.ok) return fail('AUTH_SESSION', sessionResponse.status);
    const session = await sessionResponse.json().catch(() => null);
    if (!session?.accessToken) return fail('AUTH_SESSION');

    const headers = { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
    const endpoint = `/backend-api/conversation/${encodeURIComponent(id)}`;
    const readTitle = async (code) => {
      const response = await fetch(endpoint, {
        method: 'GET', headers: { Authorization: headers.Authorization }, credentials: 'include',
      });
      if (!response.ok) return { error: fail(code, response.status) };
      const data = await response.json().catch(() => null);
      return { title: typeof data?.title === 'string' ? data.title : null };
    };

    const before = await readTitle('READ_FAILED');
    if (before.error) return before.error;
    if (before.title === title) return { ok: true, title, matched: true, changed: false };

    const patch = await fetch(endpoint, {
      method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ title }),
    });
    if (!patch.ok) return fail(patch.status === 429 ? 'RATE_LIMITED' : 'RENAME_FAILED', patch.status);

    const after = await readTitle('VERIFY_FAILED');
    if (after.error) return after.error;
    if (after.title !== title) return fail('VERIFY_MISMATCH');
    return { ok: true, title, matched: false, changed: true };
  } catch {
    return fail('NETWORK_OR_PAGE_ERROR');
  }
}

export function chatGPTTitleScript({ expectedUrl, title }) {
  const normalized = normalizeChatUrl(expectedUrl);
  const conversationId = conversationIdFromChatUrl(normalized);
  if (!normalized || !conversationId) throw new TypeError('CHAT_URL_INVALID');
  const desired = normalizeTitle(title);
  return `(${renameChatGPTConversationPage.toString()})(${JSON.stringify({ expectedUrl: normalized, title: desired })})`;
}
