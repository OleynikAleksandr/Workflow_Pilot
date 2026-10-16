import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { remotePreload } from '../src/backend/remote-gateway.mjs';

// The unchanged Electron preload runs in a browser frame against ipc.js: the
// same webPilot API, routed to the web app host of the parent page.
test('Desktop preload API runs unchanged in a browser frame and reaches the web app host', async () => {
  const calls = [], subscribed = [];
  const parent = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  const host = { invoke: async (channel, input) => { calls.push([channel, input]); return { ok: true, result: null }; },
    subscribe: (channel, listener) => subscribed.push([channel, listener]), unsubscribe() {} };
  const frame = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  Object.defineProperty(frame.window, 'parent', { value: { __wpHost: host } });
  frame.window.eval(await fs.readFile('src/frontend/web/ipc.js', 'utf8'));
  frame.window.eval(remotePreload(await fs.readFile('src/frontend/desktop/preload.cjs', 'utf8')));
  const api = frame.window.webPilot;
  assert.equal(frame.window.__wpRemote, true);
  await api.selectSession('/projects/alpha', 'session-1');
  await api.approveRemoteDevice('pairing-1');
  await api.chooseWorkspace();
  assert.deepEqual(calls.map(call => call[0]), ['pilot:select-session', 'pilot:remote-approve', 'pilot:choose-workspace']);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { workspace: '/projects/alpha', sessionId: 'session-1' });
  const states = [];
  api.onState(state => states.push(state));
  await new Promise(resolve => setTimeout(resolve, 20));
  const [channel, listener] = subscribed.at(-1);
  assert.equal(channel, 'pilot:state-changed');
  listener({}, { projects: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(states)), [{ projects: [] }]);
  parent.window.close(); frame.window.close();
});

test('a frame without the web app host answers with a clear error instead of hanging', async () => {
  const frame = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
  frame.window.eval(await fs.readFile('src/frontend/web/ipc.js', 'utf8'));
  const value = await frame.window.__wpIpc.invoke('pilot:get-state');
  assert.equal(value.error.code, 'REMOTE_HOST_MISSING');
});
