import test from 'node:test';
import assert from 'node:assert/strict';
import {CHATGPT_CHAT_ENTRYPOINT,isChatGPTChatUrl,isPendingChatGPTConversation,hasChatGPTQuery,chatGPTRefreshTarget} from '../src/chatgpt-experience.mjs';
import {normalizeChatUrl} from '../src/contracts/browser.mjs';
test('Chat entry and conversation routes form a strict allowlist',()=>{
  assert.equal(CHATGPT_CHAT_ENTRYPOINT,'https://chatgpt.com/');
  for(const url of ['https://chatgpt.com/','https://chatgpt.com/?q=hello','https://chatgpt.com/c/aaaaaaaa','https://chatgpt.com/g/example/c/aaaaaaaa'])assert.equal(isChatGPTChatUrl(url),true,url);
  for(const url of ['https://chatgpt.com/unsupported/','https://chatgpt.com/auth/login','https://chatgpt.com/?surface=unsupported','http://chatgpt.com/','https://example.com/c/aaaaaaaa','https://chatgpt.com:444/c/aaaaaaaa','https://user@chatgpt.com/c/aaaaaaaa']){
    assert.equal(isChatGPTChatUrl(url),false,url);assert.equal(normalizeChatUrl(url),null,url);
  }
});
test('optimistic addresses are allowed but are never persistent chat IDs',()=>{
  for(const prefix of ['WEB','local-chatgpt'])for(const colon of [':','%3A']){
    const url='https://chatgpt.com/c/'+prefix+colon+'12345678-1234-1234-1234-123456789abc';
    assert.equal(isPendingChatGPTConversation(url),true);assert.equal(isChatGPTChatUrl(url),true);assert.equal(normalizeChatUrl(url),null);
  }
  for(const url of ['https://evil.test/c/WEB:12345678-1234-1234-1234-123456789abc','https://chatgpt.com/c/WEB:bad','https://chatgpt.com/c/aaaaaaaa'])assert.equal(isPendingChatGPTConversation(url),false);
});
test('refresh discards every bootstrap query instead of replaying it',()=>{
  const url='https://chatgpt.com/?q=hello';assert.equal(hasChatGPTQuery(url),true);
  assert.equal(chatGPTRefreshTarget(url),CHATGPT_CHAT_ENTRYPOINT);
  assert.equal(chatGPTRefreshTarget('https://chatgpt.com/c/aaaaaaaa',url),CHATGPT_CHAT_ENTRYPOINT);
  assert.equal(chatGPTRefreshTarget('https://chatgpt.com/c/aaaaaaaa'),'https://chatgpt.com/c/aaaaaaaa');
});
