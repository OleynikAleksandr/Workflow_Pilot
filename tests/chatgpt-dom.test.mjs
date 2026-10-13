import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { chatGPTDOMScript } from '../src/chatgpt-dom.mjs';
import { pageScript } from '../src/chatgpt-composer.mjs';
const fixture = html => {
  const dom = new JSDOM(html, { url: 'https://chatgpt.com/', runScripts: 'outside-only' });
  dom.window.HTMLElement.prototype.getClientRects = function () { return this.style.display === 'none' ? [] : [{}]; };
  return dom;
};
test('September DOM recognizes pressed modes, new messages, composer and stop', () => {
  const d = fixture(`<div role="group" aria-label="Режим редактора"><button aria-pressed="false">Чат</button><button aria-pressed="true">Работа</button></div>
    <div data-user-message-bubble>request-48</div><div data-markdown-text-style="assistant-message">request-quote</div>
    <div role="textbox" contenteditable="true"></div><button aria-label="Остановить"></button>`);
  const r = d.window.eval(pageScript({ requestId: 'request-48' }));
  assert.equal(r.experience, 'work'); assert.equal(r.messageSeen, true); assert.equal(r.busy, true); assert.equal(r.editorAvailable, true);
  assert.equal(d.window.eval(pageScript({ requestId: 'request-quote' })).messageSeen, false);
});
test('nested old/new message wrappers count once; code is not message evidence', () => {
  const d = fixture('<div data-message-author-role="user"><div data-user-message-bubble>one</div></div><pre><div data-user-message-bubble>fake</div></pre>');
  const api = d.window.eval(chatGPTDOMScript()); assert.equal(api.messages('user').length, 1);
});
test('Work can be confirmed on / and Chat on /work, but never in another conversation', () => {
  const d = fixture('<div role="group" aria-label="Режим редактора"><button aria-pressed="true">Чат</button><button aria-pressed="false">Работа</button></div><textarea id="prompt-textarea"></textarea>');
  d.reconfigure({url:'https://chatgpt.com/work/'});
  assert.equal(d.window.eval(pageScript({ action:'select-experience',expectedExperience:'chat' })).action,'experience-confirmed');
  d.reconfigure({url:'https://chatgpt.com/c/foreign-chat'});
  assert.equal(d.window.eval(pageScript({ action:'select-experience',expectedExperience:'chat' })).reason,'CHAT_CHANGED');
});
