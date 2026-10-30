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
test('Chat DOM observes editor and messages without surface controls', () => {
  const d = fixture('<div data-user-message-bubble>request-48</div><div data-markdown-text-style="assistant-message">request-quote</div><div role="textbox" contenteditable="true"></div><button aria-label="Stop"></button>');
  const r = d.window.eval(pageScript({requestId:'request-48'}));
  assert.equal(r.messageSeen,true);assert.equal(r.busy,true);assert.equal(r.editorAvailable,true);
  assert.equal(Object.hasOwn(r,'experience'),false);
  assert.equal(d.window.eval(pageScript({requestId:'request-quote'})).messageSeen,false);
});
test('nested old/new message wrappers count once; code is not message evidence', () => {
  const d = fixture('<div data-message-author-role="user"><div data-user-message-bubble>one</div></div><pre><div data-user-message-bubble>fake</div></pre>');
  const api = d.window.eval(chatGPTDOMScript()); assert.equal(api.messages('user').length, 1);
});

test('turn variant detection keeps public DOM exports and never clicks a switch', () => {
  const d = fixture('<article><div data-message-author-role="user">one</div><button aria-label="Предыдущий ответ"></button></article>');
  const api = d.window.eval(chatGPTDOMScript());let clicks = 0;
  d.window.document.querySelector('button').addEventListener('click', () => clicks++);
  assert.equal(api.turnVariant(api.messages('user').at(-1)), 'multiple');assert.equal(api.turnVariant(null), 'unknown');
  assert.equal(clicks, 0);
  for (const name of ['selectors','visible','first','messages','connectionError','editor','account','sendButton','busy'])
    assert.ok(api[name], name);
});
