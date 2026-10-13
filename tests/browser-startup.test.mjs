import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { openStartupPage } from '../src/browser-startup.mjs';

const url = 'https://chatgpt.com/';
function fixture(load) {
  const wc = new EventEmitter();
  wc.calls = []; wc.url = '';
  wc.getURL = () => wc.url;
  wc.stop = () => wc.calls.push('stop');
  wc.session = {
    closeAllConnections: async () => { wc.calls.push('connections'); },
    clearHostResolverCache: async () => { wc.calls.push('dns'); },
  };
  wc.loadURL = target => { wc.calls.push('load'); return load(wc, target); };
  return wc;
}
const options = { timeoutMs: 20 };
function ready(wc) { wc.url = url; wc.emit('did-frame-navigate', {}, url, 200, 'OK', true); wc.emit('dom-ready'); }

test('first DOM is usable while resource loading remains pending', async () => {
  const wc = fixture(wc => { queueMicrotask(() => ready(wc)); return new Promise(() => {}); });
  assert.deepEqual(await openStartupPage(wc, url, options), { recovered: false });
  assert.deepEqual(wc.calls, ['load']);
  assert.equal(wc.listenerCount('dom-ready'), 0);
});

test('the first request remains uninterrupted after 105 seconds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const wc = fixture(() => new Promise(() => {}));
  const opening = openStartupPage(wc, url);
  t.mock.timers.tick(105000);
  assert.deepEqual(wc.calls, ['load']);
  ready(wc);
  await opening;
  assert.deepEqual(wc.calls, ['load']);
});

test('the final deadline stops one request without retry or DNS reset', async () => {
  const wc = fixture(() => new Promise(() => {}));
  await assert.rejects(openStartupPage(wc, url, options), { code: 'PAGE_RESPONSE_TIMEOUT' });
  assert.deepEqual(wc.calls, ['load', 'stop']);
  assert.equal(wc.listenerCount('dom-ready'), 0);
});

test('a committed document is not discarded if DOM preparation is slow', async () => {
  const wc = fixture(wc => {
    queueMicrotask(() => { wc.url = url; wc.emit('did-frame-navigate', {}, url, 200, 'OK', true); });
    return new Promise(() => {});
  });
  await assert.rejects(openStartupPage(wc, url, options), { code: 'PAGE_DOCUMENT_TIMEOUT' });
  assert.deepEqual(wc.calls, ['load']);
});

test('an immediate certificate error is returned without retry', async () => {
  const wc = fixture(() => Promise.reject(Object.assign(new Error('certificate'), { code: 'ERR_CERT_DATE_INVALID' })));
  await assert.rejects(openStartupPage(wc, url, options), { code: 'ERR_CERT_DATE_INVALID' });
  assert.deepEqual(wc.calls, ['load']);
});

test('superseded navigation leaves the new request untouched', async () => {
  let current = true;
  const wc = fixture(() => { queueMicrotask(() => { current = false; }); return new Promise(() => {}); });
  await assert.rejects(openStartupPage(wc, url, { ...options, isCurrent: () => current }), { code: 'NAVIGATION_SUPERSEDED' });
  assert.deepEqual(wc.calls, ['load']);
  assert.equal(wc.listenerCount('dom-ready'), 0);
});

test('initial about:blank DOM does not complete a remote opening', async () => {
  const wc = fixture(wc => {
    queueMicrotask(() => { wc.url = 'about:blank'; wc.emit('dom-ready'); });
    return new Promise(() => {});
  });
  await assert.rejects(openStartupPage(wc, url, options), { code: 'PAGE_RESPONSE_TIMEOUT' });
  assert.deepEqual(wc.calls, ['load', 'stop']);
});
