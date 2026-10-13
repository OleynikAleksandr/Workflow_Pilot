import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { JSDOM } from 'jsdom';
import { chatGPTDOMScript } from '../src/chatgpt-dom.mjs';
import { installPageObserver } from '../src/chatgpt-page-observer.mjs';
import { PageStateSource, PAGE_STATE_CHANNEL, normalizePageObservation } from '../src/page-state.mjs';
import { connectPageState } from '../src/page-state-bridge.mjs';

const turn = () => new Promise(resolve => setImmediate(resolve));

test('many live pages share one IPC listener and release it after the last page',()=>{
  const ipc=new EventEmitter(),stops=[];
  for(let i=0;i<20;i++) {
    const contents=new EventEmitter();contents.isDestroyed=()=>false;
    stops.push(connectPageState(contents,ipc,new PageStateSource()));
  }
  assert.equal(ipc.listenerCount(PAGE_STATE_CHANNEL),1);
  for(const stop of stops.slice(0,-1))stop();assert.equal(ipc.listenerCount(PAGE_STATE_CHANNEL),1);
  stops.at(-1)();assert.equal(ipc.listenerCount(PAGE_STATE_CHANNEL),0);
});
const observation = (seq = 1, documentId = 'document-1111', patch = {}) => ({ version: 1, seq, documentId,
  state: { url: 'https://chatgpt.com/', experience: 'chat', login: 'unknown', visibility: 'visible',
    editorAvailable: true, editorRevision: 1, writable: true, busy: false, sendEnabled: true,
    draftRevision: 1, userMessageCount: 0, userMessagesRevision: 0, ...patch } });

test('observer catches equal-length drafts, late user text, attributes and busy without frame scheduling', async () => {
  const dom = new JSDOM('<form><div id="prompt-textarea" contenteditable="true">aa</div><button data-testid="send-button">Send</button></form><article data-message-author-role="assistant"><span>stream</span></article>',
    { url: 'https://chatgpt.com/', runScripts: 'outside-only' });
  const w = dom.window;
  w.HTMLElement.prototype.getClientRects = function () { return this.hidden ? [] : [{}]; };
  w.requestAnimationFrame = () => { throw Error('Logic must work without frames'); };
  const messages = []; w.reportObservation = m => messages.push(m);
  const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
  assert.equal(typeof w.__webPilotObserverSnapshot, 'function');
  await turn();
  const editor = w.document.querySelector('#prompt-textarea');
  const initial = messages.at(-1);
  assert.equal(initial.state.login, 'unknown', 'an editor alone does not prove authentication');
  const login = w.document.createElement('button'); login.dataset.testid = 'login-button'; w.document.body.append(login); await turn();
  assert.equal(messages.at(-1).state.login, 'signed-out');
  login.remove(); const profile = w.document.createElement('button'); profile.setAttribute('aria-label', 'Open Profile Menu'); w.document.body.append(profile); await turn();
  assert.equal(messages.at(-1).state.login, 'signed-in');
  assert.equal(w.__webPilotObserverSnapshot().login, 'signed-in', 'explicit checks reuse the observer snapshot');
  editor.textContent = 'bb'; await turn();
  assert.ok(messages.at(-1).state.draftRevision > initial.state.draftRevision);
  let revision = messages.at(-1).state.draftRevision;
  editor.className = 'cosmetic'; await turn();
  assert.equal(messages.at(-1).state.draftRevision, revision);
  const user = w.document.createElement('article'); user.dataset.messageAuthorRole = 'user'; w.document.body.append(user); await turn();
  revision = messages.at(-1).state.userMessagesRevision;
  user.textContent = 'late requestId'; await turn();
  assert.equal(messages.at(-1).state.userMessageCount, 1);
  assert.ok(messages.at(-1).state.userMessagesRevision > revision);
  const count = messages.length;
  w.document.querySelector('article[data-message-author-role="assistant"] span').firstChild.data += ' token'; await turn();
  assert.ok(messages.length > count, 'idle reply changes are observed without a footer');
  assert.equal(messages.at(-1).state.busy, false);
  const stop = w.document.createElement('button'); stop.dataset.testid = 'stop-button'; w.document.body.append(stop); await turn();
  assert.equal(messages.at(-1).state.busy, true);
  stop.remove(); await turn(); assert.equal(messages.at(-1).state.busy, false);
  dispose(); assert.equal(w.__webPilotObserverSnapshot, undefined); w.close();
});

test('turn identity survives reload and a newer user message does not change the previous turn', async () => {
  const markup = '<article data-message-author-role="user">Request</article><article data-message-author-role="assistant" data-message-id="answer-id">Микрозадача выполнена и сохранена.</article><form><div id="prompt-textarea" contenteditable="true">Saved draft</div><button data-testid="send-button">Send</button></form>';
  const states = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const dom = new JSDOM(markup, { url: 'https://chatgpt.com/c/fixture', runScripts: 'outside-only' });
    const w = dom.window;
    w.HTMLElement.prototype.getClientRects = function () { return [{}]; };
    const observations = []; w.reportObservation = m => observations.push(m);
    const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
    await turn();
    states.push(observations.at(-1));
    assert.equal(Object.hasOwn(states.at(-1).state, 'turnSignal'), false);
    assert.equal(states.at(-1).state.draftPresent, true);
    const user = w.document.createElement('article'); user.dataset.messageAuthorRole = 'user';
    user.textContent = 'New request'; w.document.body.append(user); await turn();
    assert.equal(Object.hasOwn(observations.at(-1).state, 'turnSignal'), false);
    assert.equal(observations.at(-1).state.turnId, states.at(-1).state.turnId);
    dispose(); w.close();
  }
  assert.notEqual(states[0].documentId, states[1].documentId);
  assert.equal(states[0].state.turnId, states[1].state.turnId);
});

test('source rejects stale documents/sequences and closes the check-subscribe gap', async () => {
  const source = new PageStateSource();
  source.accept(observation());
  const version = source.version;
  source.accept(observation(2, 'document-1111', { draftRevision: 2 }));
  assert.equal((await source.waitForChange(version)).changed, true);
  assert.equal(source.accept(observation()).accepted, false);
  const waiting = source.waitForChange(source.version);
  source.reset();
  assert.equal((await waiting).changed, true);
  assert.equal(source.accept(observation(3)).accepted, false);
  assert.equal(source.accept(observation(1, 'document-2222')).accepted, true);
  assert.throws(() => normalizePageObservation({ ...observation(), padding: 'x'.repeat(9000) }));
});

test('bridge rejects wrong senders, frames, origins and late hello from former document', async () => {
  const ipc = new EventEmitter(), contents = new EventEmitter(), source = new PageStateSource();
  const frame = { url: 'https://chatgpt.com/' };
  contents.mainFrame = frame; contents.getURL = () => frame.url; contents.isDestroyed = () => false;
  let liveId = 'document-1111', reads = 0;
  contents.executeJavaScriptInIsolatedWorld = async () => { reads++; return liveId; };
  const stop = connectPageState(contents, ipc, source);
  const emit = (message, patch = {}) => ipc.emit(PAGE_STATE_CHANNEL, { sender: contents, senderFrame: frame, ...patch }, message);
  emit(observation(), { sender: {} }); emit(observation(), { senderFrame: { url: frame.url } }); await turn();
  assert.equal(reads, 0);
  emit(observation()); await turn(); assert.equal(source.current.documentId, liveId);
  contents.emit('did-start-navigation', {}, frame.url, false, true);
  liveId = 'document-2222';
  emit(observation(2)); await turn(); assert.equal(source.current, null);
  emit(observation(1, liveId)); await turn(); assert.equal(source.current.documentId, liveId);
  const version = source.version;
  frame.url = 'https://evil.example/'; emit(observation(2, liveId)); await turn();
  assert.equal(source.version, version);
  stop(); assert.equal(ipc.listenerCount(PAGE_STATE_CHANNEL), 0);
});

for (const errorText of ['ChatGPT stream recovery polling timed out', 'Resume stream unavailable']) {
  for (const errorUI of ['alert', 'retry']) {
    test(errorText + ': ' + errorUI + ' UI signals an error, quoted prose does not', async () => {
      const dom = new JSDOM('<div id="prompt-textarea" contenteditable="true"></div>'
        + '<article data-message-author-role="user"><div role="alert">' + errorText + '</div></article>'
        + '<article data-message-author-role="assistant">' + errorText + '</article>'
        + '<pre><div role="alert">' + errorText + '</div></pre>'
        + '<blockquote><div role="alert">' + errorText + '</div></blockquote>',
        { url: 'https://chatgpt.com/c/one', runScripts: 'outside-only' });
      const w = dom.window; w.HTMLElement.prototype.getClientRects = function () { return this.hidden ? [] : [{}]; };
      const messages = []; w.reportObservation = m => messages.push(m);
      const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
      assert.equal(messages.at(-1).state.connectionError, null);
      const alert = w.document.createElement('div');
      if (errorUI === 'alert') alert.setAttribute('role', 'alert');
      alert.textContent = errorText;
      if (errorUI === 'retry') {
        const button = w.document.createElement('button'); button.textContent = 'Повторить'; alert.append(button);
      }
      w.document.body.append(alert); await turn();
      assert.equal(messages.at(-1).state.connectionError, 'stream-interrupted');
      alert.remove(); await turn(); assert.equal(messages.at(-1).state.connectionError, null);
      dispose(); w.close();
    });
  }
}

test('stream content progress is coalesced, decorative mutations do not count, final ordinary reply is observed', async () => {
  const dom = new JSDOM('<div id="prompt-textarea" contenteditable="true"></div><button data-testid="stop-button">Stop</button><article data-message-author-role="assistant"><span>start</span></article>',
    { url: 'https://chatgpt.com/c/fixture', runScripts: 'outside-only' });
  const w = dom.window; w.HTMLElement.prototype.getClientRects = () => [{}];
  const timers = new Map(); let id = 0, clock = 10000;
  w.Date.now = () => clock; w.setTimeout = fn => { timers.set(++id, fn); return id; }; w.clearTimeout = key => timers.delete(key);
  const messages = []; w.reportObservation = m => messages.push(m);
  const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
  const first = messages.at(-1).state.assistantRevision;
  const text = w.document.querySelector('article span').firstChild;
  for (let i = 0; i < 4; i++) { text.data += ' token'; await turn(); }
  assert.equal(timers.size, 1);
  clock += 5000; const callback = [...timers.values()][0]; timers.clear(); callback();
  assert.ok(messages.at(-1).state.assistantRevision > first);
  const progress = messages.at(-1).state.assistantRevision;
  w.document.querySelector('article').className = 'animated'; await turn();
  assert.equal(messages.at(-1).state.assistantRevision, progress);
  w.document.querySelector('button').remove(); text.data = 'Микрозадача выполнена и сохранена.'; await turn();
  assert.equal(messages.at(-1).state.busy, false);
  assert.ok(messages.at(-1).state.assistantRevision > progress);
  assert.equal(Object.hasOwn(messages.at(-1).state, 'turnSignal'), false);
  dispose(); assert.equal(timers.size, 0); w.close();
});
test('trailing progress survives a quick idle and next busy answer', async () => {
  const dom = new JSDOM('<div id="prompt-textarea" contenteditable="true"></div><button data-testid="stop-button">Stop</button><article data-message-author-role="assistant">start</article>',
    { url: 'https://chatgpt.com/c/fixture', runScripts: 'outside-only' });
  const w = dom.window; w.HTMLElement.prototype.getClientRects = () => [{}];
  const timers = new Map(); let id = 0, clock = 10000;
  w.Date.now = () => clock; w.setTimeout = fn => { timers.set(++id, fn); return id; }; w.clearTimeout = key => timers.delete(key);
  const messages = []; w.reportObservation = m => messages.push(m);
  const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
  const article = w.document.querySelector('article');
  article.textContent = 'first progress'; await turn();
  assert.equal(timers.size, 1);
  clock = 11000; w.document.querySelector('button').remove(); await turn();
  const stop = w.document.createElement('button'); stop.dataset.testid = 'stop-button'; w.document.body.append(stop); await turn();
  article.textContent = 'second answer progress'; await turn();
  const before = messages.at(-1).state.assistantRevision;
  clock = 15000; const callback = [...timers.values()][0]; timers.clear(); callback();
  assert.equal(messages.at(-1).state.busy, true);
  assert.ok(messages.at(-1).state.assistantRevision > before,
    'trailing real content is reported even when idle refreshed the throttle timestamp');
  dispose(); w.close();
});
test('machine turn identities survive content edits, reload and DOM replacement without native IDs', async () => {
  for (const native of [false, true]) {
    const ids = [];
    for (const text of ['Начало ответа', 'Совсем другой текст ответа']) {
      const markup = '<article data-message-author-role="user">Request</article><article data-message-author-role="assistant"'
        + (native ? ' data-message-id="stable-message-id"' : '') + '><span>' + text + '</span></article><div id="prompt-textarea" contenteditable="true"></div>';
      const dom = new JSDOM(markup, { url: 'https://chatgpt.com/c/fixture', runScripts: 'outside-only' });
      const w = dom.window; w.HTMLElement.prototype.getClientRects = () => [{}];
      const messages = []; w.reportObservation = m => messages.push(m);
      const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', reportObservation)');
      ids.push(messages.at(-1).state.turnId);
      assert.equal(messages.at(-1).state.lastMessageRole, 'assistant');
      const assistant = w.document.querySelector('[data-message-author-role="assistant"]');
      assistant.querySelector('span').textContent = 'Позднее изменение готового ответа'; await turn();
      assert.equal(messages.at(-1).state.turnId, ids.at(-1));
      const replacement = assistant.cloneNode(true); assistant.replaceWith(replacement); await turn();
      assert.equal(messages.at(-1).state.turnId, ids.at(-1));
      const user = w.document.createElement('article'); user.dataset.messageAuthorRole = 'user'; user.textContent = 'New request';
      w.document.body.append(user); await turn();
      assert.equal(messages.at(-1).state.lastMessageRole, 'user');
      assert.equal(messages.at(-1).state.turnId, ids.at(-1));
      const next = w.document.createElement('article'); next.dataset.messageAuthorRole = 'assistant'; next.textContent = 'New reply';
      w.document.body.append(next); await turn();
      assert.equal(messages.at(-1).state.lastMessageRole, 'assistant');
      if (native) assert.notEqual(messages.at(-1).state.turnId, ids.at(-1));
      else assert.equal(messages.at(-1).state.turnId, '', 'counts never masquerade as an identity');
      dispose(); w.close();
    }
    assert.equal(ids[0], ids[1], 'text differences never create another identity on reload');
  }
});
test('source normalizes only opaque identities and fixed machine roles', () => {
  const normalized = normalizePageObservation(observation(1, 'document-1111', {
    turnId: 'a1234', userTurnId: 'b1234', lastMessageRole: 'user',
  }));
  assert.equal(normalized.state.userTurnId, 'b1234');
  assert.equal(normalized.state.lastMessageRole, 'user');
  const invalid = normalizePageObservation(observation(1, 'document-1111', {
    userTurnId: 'private conversation text', lastMessageRole: 'arbitrary prose',
  }));
  assert.equal(invalid.state.userTurnId, '');
  assert.equal(invalid.state.lastMessageRole, null);
});

test('observer finds native IDs inside Work wrappers and avoids positional fallback', async () => {
  const dom = new JSDOM('<div data-markdown-text-style="assistant-message"><span data-message-id="native-one">Same answer</span></div><div id="prompt-textarea" contenteditable="true"></div>',
    { url: 'https://chatgpt.com/c/fixture', runScripts: 'outside-only' });
  const w = dom.window; w.HTMLElement.prototype.getClientRects = () => [{}];
  const messages = []; w.report = m => messages.push(m);
  const dispose = w.eval('(' + installPageObserver.toString() + ')(' + chatGPTDOMScript() + ', report)');
  const first = messages.at(-1).state.turnId;
  assert.ok(first); assert.equal(messages.at(-1).state.turnIdentitySource, 'native');
  w.document.querySelector('span').dataset.messageId = 'native-two'; await turn();
  assert.notEqual(messages.at(-1).state.turnId, first);
  w.document.querySelector('span').removeAttribute('data-message-id'); await turn();
  assert.equal(messages.at(-1).state.turnId, '');
  assert.equal(messages.at(-1).state.turnIdentitySource, 'cycle');
  dispose(); w.close();
});
