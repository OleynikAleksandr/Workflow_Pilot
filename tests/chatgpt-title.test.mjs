import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { chatGPTTitleScript, conversationIdFromChatUrl } from '../src/chatgpt-title.mjs';

const response = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

function page(url, calls, { patchStatus = 200, initialTitle = 'Старое имя', verifyTitle = null, authStatus = 200 } = {}) {
  const dom = new JSDOM('', { url, runScripts: 'outside-only' });
  let reads = 0;
  dom.window.fetch = async (path, options = {}) => {
    calls.push({ path, options: structuredClone(options) });
    if (path === '/api/auth/session') return response(authStatus, authStatus < 300 ? { accessToken: 'renderer-only-token' } : {});
    if (options.method === 'PATCH') return response(patchStatus, { success: patchStatus < 300 });
    const title = reads++ === 0 ? initialTitle : (verifyTitle ?? initialTitle);
    return response(200, { title });
  };
  return dom;
}

test('conversation id follows the same concrete ChatGPT URL contract', () => {
  assert.equal(conversationIdFromChatUrl('https://chatgpt.com/c/aaaaaaaa-bbbb'), 'aaaaaaaa-bbbb');
  assert.equal(conversationIdFromChatUrl('https://chatgpt.com/work/cccccccc-dddd'), 'cccccccc-dddd');
  assert.equal(conversationIdFromChatUrl('https://example.com/c/aaaaaaaa'), null);
  assert.equal(conversationIdFromChatUrl('https://chatgpt.com/'), null);
});

test('title page adapter reads before patching and verifies a changed server title', async () => {
  const calls = [];
  const url = 'https://chatgpt.com/c/aaaaaaaa-bbbb-cccc-dddd';
  const title = 'Автоназвания Web Pilot';
  const dom = page(url, calls, { initialTitle: 'Старое имя', verifyTitle: title });
  const result = await dom.window.eval(chatGPTTitleScript({ expectedUrl: url, title }));
  assert.deepEqual({ ...result }, { ok: true, title, matched: false, changed: true });
  assert.equal(calls.length, 4);
  assert.equal(calls[0].path, '/api/auth/session');
  assert.equal(calls[1].path, '/backend-api/conversation/aaaaaaaa-bbbb-cccc-dddd');
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(calls[2].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[2].options.body), { title });
  assert.match(calls[2].options.headers.Authorization, /^Bearer /);
  assert.equal(calls[3].options.method, 'GET');
  assert.equal(JSON.stringify(result).includes('renderer-only-token'), false, 'access token never leaves the page adapter');
});

test('title page adapter skips PATCH when native ChatGPT already has the desired title', async () => {
  const calls = [];
  const url = 'https://chatgpt.com/c/aaaaaaaa-bbbb-cccc-dddd';
  const title = 'Уже совпадает';
  const dom = page(url, calls, { initialTitle: title });
  const result = await dom.window.eval(chatGPTTitleScript({ expectedUrl: url, title }));
  assert.deepEqual({ ...result }, { ok: true, title, matched: true, changed: false });
  assert.equal(calls.length, 2);
  assert.equal(calls.some(call => call.options.method === 'PATCH'), false);
});

test('title page adapter fails closed on another conversation and never sends a request', async () => {
  const calls = [];
  const expected = 'https://chatgpt.com/c/aaaaaaaa-bbbb-cccc-dddd';
  const dom = page('https://chatgpt.com/c/ffffffff-1111-2222-3333', calls);
  const result = await dom.window.eval(chatGPTTitleScript({ expectedUrl: expected, title: 'Новый заголовок' }));
  assert.deepEqual({ ...result }, { ok: false, code: 'CHAT_CHANGED', status: null });
  assert.equal(calls.length, 0);
});

test('title page adapter reports server refusal and verification mismatch', async () => {
  const url = 'https://chatgpt.com/c/aaaaaaaa-bbbb-cccc-dddd';
  let calls = [];
  let dom = page(url, calls, { patchStatus: 429, initialTitle: 'Старое имя' });
  let result = await dom.window.eval(chatGPTTitleScript({ expectedUrl: url, title: 'Заголовок' }));
  assert.equal(result.code, 'RATE_LIMITED'); assert.equal(result.status, 429);
  assert.equal(calls.length, 3);

  calls = [];
  dom = page(url, calls, { initialTitle: 'Старое имя', verifyTitle: 'Всё ещё старое' });
  result = await dom.window.eval(chatGPTTitleScript({ expectedUrl: url, title: 'Заголовок' }));
  assert.equal(result.code, 'VERIFY_MISMATCH');
  assert.equal(calls.length, 4);
});

test('title page adapter applies the same concise server-safe title limit', async () => {
  const calls = [];
  const url = 'https://chatgpt.com/c/aaaaaaaa-bbbb-cccc-dddd';
  const source = 'Я'.repeat(120);
  const expected = 'Я'.repeat(80);
  const dom = page(url, calls, { initialTitle: 'Старое имя', verifyTitle: expected });
  const result = await dom.window.eval(chatGPTTitleScript({ expectedUrl: url, title: source }));
  assert.equal(result.title, expected);
  assert.equal(Array.from(result.title).length, 80);
  assert.ok(new TextEncoder().encode(result.title).length <= 200);
});

test('title script normalizes whitespace and rejects invalid targets before renderer execution', () => {
  const script = chatGPTTitleScript({
    expectedUrl: 'https://chatgpt.com/c/aaaaaaaa-bbbb-cccc-dddd',
    title: '  Новое   имя  ',
  });
  assert.match(script, /Новое имя/);
  assert.throws(() => chatGPTTitleScript({ expectedUrl: 'https://chatgpt.com/', title: 'Имя' }), /CHAT_URL_INVALID/);
  assert.throws(() => chatGPTTitleScript({ expectedUrl: 'https://chatgpt.com/c/aaaaaaaa', title: '   ' }), /TITLE_INVALID/);
});
