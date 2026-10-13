import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { summarizeStartupNetwork, StartupNetworkTrace } from '../src/startup-network-trace.mjs';
const constants = { logEventTypes: { URL_REQUEST_START_JOB: 1, BIND: 2, TCP_CONNECT: 3, SSL_CONNECT: 4,
  HTTP_TRANSACTION_SEND_REQUEST_HEADERS: 5, HTTP_TRANSACTION_READ_RESPONSE_HEADERS: 6, HOST_RESOLVER_MANAGER_REQUEST: 7 } };
const event = (type, id, time, params = {}, phase = 0) => ({ type, source: { id }, time: String(time), params, phase });
const data = { constants, events: [
  event(1, 1, 100, { url: 'https://chatgpt.com/?token=PRIVATE_QUERY', headers: ['Cookie: PRIVATE_COOKIE'] }, 1),
  event(2, 1, 101, { source_dependency: { id: 2 } }),
  event(2, 2, 101, { source_dependency: { id: 3 } }),
  event(7, 3, 102, { host: 'PRIVATE_HOST', net_error: 0 }, 2),
  event(3, 2, 104, { address_list: ['172.64.155.209:443', 'PRIVATE_PROXY'] }, 1),
  event(4, 2, 106, { negotiated_protocol: 'h2', certificate: 'PRIVATE_CERT' }, 2),
  event(5, 1, 108, { headers: ['Authorization: PRIVATE_AUTH'], line: 'PRIVATE_LINE' }),
  event(6, 1, 90000, { headers: ['HTTP/1.1 200 OK', 'Set-Cookie: PRIVATE_COOKIE'] }),
  event(1, 9, 110, { url: 'https://unrelated.invalid/PRIVATE_PATH' }),
  event(3, 9, 111, { address: '192.0.2.9:443' }),
] };
test('network summary links the main request to DNS/TCP/TLS and keeps only approved metadata', () => {
  const s = summarizeStartupNetwork(data), text = JSON.stringify(s);
  assert.equal(s.matchedRequests, 1);
  assert.ok(s.events.some(e => e.stage === 'HOST_RESOLVER_MANAGER_REQUEST'));
  assert.ok(s.events.some(e => e.protocol === 'h2'));
  assert.equal(s.events.at(-1).status, 200);
  assert.equal(s.events.at(-1).tMs, 89900);
  assert.doesNotMatch(text, /PRIVATE_|192\.0\.2\.9|token|"headers":|"certificate":/i);
  assert.match(text, /172\.64\.155\.209/);
});
test('a bounded summary preserves the beginning and end, including unfinished stages', () => {
  const events = [data.events[0], ...Array.from({ length: 300 }, (_, i) => event(5, 1, 101 + i)),
    event(6, 1, 1000, { net_error: -118 }, 2)];
  const s = summarizeStartupNetwork({ constants, events });
  assert.equal(s.events.length, 160); assert.equal(s.eventsOmitted, 142);
  assert.equal(s.events[0].phase, 'begin'); assert.equal(s.events.at(-1).netError, -118);
});
test('netLog capture uses default mode, finishes once, and removes the raw file', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-netlog-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'raw.json'); let stops = 0;
  const trace = new StartupNetworkTrace({
    currentlyLogging: false,
    startLogging: async (p, options) => { assert.equal(p, file); assert.equal(options.captureMode, 'default'); assert.equal(options.maxFileSize, undefined); },
    stopLogging: async () => { stops++; await fs.writeFile(file, JSON.stringify(data)); },
  }, file);
  await trace.start(); await Promise.all([trace.finish('dom-ready'), trace.snapshot()]);
  assert.equal(stops, 1); assert.equal(trace.summary.state, 'complete');
  await assert.rejects(fs.stat(file), { code: 'ENOENT' });
});
test('an existing netLog is not overwritten or stopped', async () => {
  const trace = new StartupNetworkTrace({ currentlyLogging: true, stopLogging: () => { throw new Error('Not ours'); } }, '/unused');
  await trace.start(); assert.equal((await trace.snapshot()).state, 'unavailable');
});
test('late netLog startup does not block navigation and is cleaned up when it finishes', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-netlog-late-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'raw.json'); let resolve, stops = 0;
  const trace = new StartupNetworkTrace({ currentlyLogging: false,
    startLogging: () => new Promise(r => { resolve = r; }),
    stopLogging: async () => { stops++; await fs.writeFile(file, JSON.stringify(data)); },
  }, file, { startWaitMs: 20 });
  await trace.start(); assert.equal(stops, 0);
  resolve(); await trace.finish();
  assert.equal(stops, 1); await assert.rejects(fs.stat(file), { code: 'ENOENT' });
});

test('application size guard stops capture once and removes the raw journal', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-netlog-size-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'raw.json'); let stops = 0;
  const trace = new StartupNetworkTrace({ currentlyLogging: false,
    startLogging: async () => { await fs.writeFile(file, JSON.stringify(data)); },
    stopLogging: async () => { stops++; },
  }, file, { maxBytes: 100, sizePollMs: 5 });
  t.after(() => trace.finish('cleanup'));
  await trace.start();
  const end = Date.now() + 2000;
  while (!trace.stopping && Date.now() < end) await new Promise(r => setTimeout(r, 5));
  assert.ok(trace.stopping, 'size guard must initiate shutdown');
  await trace.stopping;
  assert.equal(stops, 1); assert.equal(trace.summary.stopReason, 'size-limit');
  assert.equal(trace.summary.state, 'complete');
  await assert.rejects(fs.stat(file), { code: 'ENOENT' });
});
