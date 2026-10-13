import test from 'node:test';
import assert from 'node:assert/strict';
import { CHATGPT_CHAT_ENTRYPOINT, CHATGPT_WORK_ENTRYPOINT, chatGPTEntrypoint,
  isPendingChatGPTConversation, chatGPTExperienceForUrl, chatGPTUrlMatchesExperience } from '../src/chatgpt-experience.mjs';

test('Chat and Work use explicit top-level entrypoints', () => {
  assert.equal(chatGPTEntrypoint('chat'), CHATGPT_CHAT_ENTRYPOINT);
  assert.equal(chatGPTEntrypoint('work'), CHATGPT_WORK_ENTRYPOINT);
  assert.throws(() => chatGPTEntrypoint('astra'), { code: 'CHATGPT_EXPERIENCE' });
});

test('experience classifier accepts only matching chatgpt.com routes', () => {
  for (const url of ['https://chatgpt.com/', 'https://chatgpt.com/c/aaaaaaaa',
    'https://chatgpt.com/g/example/c/aaaaaaaa']) assert.equal(chatGPTExperienceForUrl(url), 'chat');
  for (const url of ['https://chatgpt.com/work/', 'https://chatgpt.com/work/aaaaaaaa',
    'https://chatgpt.com/work/c/aaaaaaaa']) assert.equal(chatGPTExperienceForUrl(url), 'work');
  for (const url of ['https://chatgpt.com/auth/login', 'https://example.com/work/', 'http://chatgpt.com/work/'])
    assert.equal(chatGPTExperienceForUrl(url), null);
  assert.equal(chatGPTUrlMatchesExperience('https://chatgpt.com/work/', 'work'), true);
  assert.equal(chatGPTUrlMatchesExperience('https://chatgpt.com/', 'work'), false);
});

test('optimistic WEB URLs are pending only on the exact HTTPS ChatGPT origin', async () => {
  const { isPendingChatGPTConversation } = await import('../src/chatgpt-experience.mjs');
  const { normalizeChatUrl } = await import('../src/workspace-session.mjs');
  const route = '/c/WEB:12345678-1234-1234-1234-123456789abc';
  for (const path of [route, route.replace(':', '%3A')]) {
    assert.equal(isPendingChatGPTConversation('https://chatgpt.com' + path), true);
    assert.equal(normalizeChatUrl('https://chatgpt.com' + path), null);
  }
  for (const url of ['https://evil.test'+route, 'http://chatgpt.com'+route, 'https://chatgpt.com:444'+route,
    'https://user@chatgpt.com'+route, 'https://chatgpt.com/c/WEB:bad', 'https://chatgpt.com/c/aaaaaaaa']) {
    assert.equal(isPendingChatGPTConversation(url), false);
  }
  assert.equal(chatGPTUrlMatchesExperience('https://chatgpt.com/?surface=work', 'chat'), false);
  assert.equal(chatGPTUrlMatchesExperience('https://chatgpt.com/?surface=tpp', 'chat'), false);
});

test('September optimistic local-chatgpt URL is pending, never a confirmed experience', () => {
  for (const colon of [':','%3A']) {
    const url = 'https://chatgpt.com/c/local-chatgpt' + colon + '21abfec7-868e-4077-8cfd-c0a399a8757f';
    assert.equal(isPendingChatGPTConversation(url), true);
    assert.equal(chatGPTExperienceForUrl(url), null);
  }
  assert.equal(isPendingChatGPTConversation('https://example.com/c/local-chatgpt:21abfec7-868e-4077-8cfd-c0a399a8757f'), false);
});
