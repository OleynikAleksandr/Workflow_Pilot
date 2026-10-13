import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { contextServiceMetadata, contextTelemetry, DiagnosticJsonl, payloadMetadata, safeUrl } from '../src/chromium-diagnostics.mjs';

test('safeUrl keeps endpoint shape but strips query values, fragments and long identifiers', () => {
  const result = safeUrl('https://chatgpt.com/backend-api/conversation/123e4567-e89b-42d3-a456-426614174000?token=SUPER_SECRET&mode=compact#private');
  assert.deepEqual(result, { origin: 'https://chatgpt.com', path: '/backend-api/conversation/:id', queryKeys: ['mode', 'token'] });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('SUPER_SECRET'), false);
  assert.equal(serialized.includes('private'), false);
});

test('payload metadata preserves only structure, digest and safe event identifiers', () => {
  const payload = JSON.stringify({ type: 'conversation.compaction', message: 'PRIVATE USER TEXT', nested: { event_type: 'context_compaction' }, token: 'SECRET' });
  const meta = payloadMetadata(payload);
  assert.equal(meta.format, 'json');
  assert.equal(meta.sha256.length, 64);
  assert.ok(meta.bytes > 0);
  assert.deepEqual(meta.keys, ['message', 'nested', 'token', 'type']);
  assert.deepEqual(meta.signals, ['event_type=context_compaction', 'type=conversation.compaction']);
  const serialized = JSON.stringify(meta);
  assert.equal(serialized.includes('PRIVATE USER TEXT'), false);
  assert.equal(serialized.includes('SECRET'), false);

  const sse = payloadMetadata('event: message\ndata: {"type":"response.compact","text":"DO NOT LOG"}\n');
  assert.equal(sse.format, 'sse');
  assert.deepEqual(sse.signals, ['event=message', 'type=response.compact']);
  assert.equal(JSON.stringify(sse).includes('DO NOT LOG'), false);
});

test('context telemetry extracts Codex token_count numbers without message content', () => {
  const payload = JSON.stringify({
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        total_token_usage: { input_tokens: 1565554, cached_input_tokens: 1536768, output_tokens: 3368, reasoning_output_tokens: 1196, total_tokens: 1568922 },
        last_token_usage: { input_tokens: 111809, cached_input_tokens: 111360, output_tokens: 420, reasoning_output_tokens: 309, total_tokens: 112229 },
        model_context_window: 258400,
      },
      message: 'PRIVATE CHAT TEXT',
      token: 'SECRET_VALUE',
    },
  });
  const telemetry = contextTelemetry(payload);
  assert.deepEqual(telemetry.markers, ['token_count']);
  assert.deepEqual(telemetry.metrics.model_context_window, [258400]);
  assert.deepEqual(telemetry.metrics.input_tokens.sort((a, b) => a - b), [111809, 1565554]);
  assert.deepEqual(telemetry.lastTokenUsage, [{ input_tokens: 111809, cached_input_tokens: 111360, output_tokens: 420, reasoning_output_tokens: 309, total_tokens: 112229 }]);
  const serialized = JSON.stringify(telemetry);
  assert.equal(serialized.includes('PRIVATE CHAT TEXT'), false);
  assert.equal(serialized.includes('SECRET_VALUE'), false);
});

test('context telemetry recognizes direct compact signatures and SSE without recording summary text', () => {
  const compacted = contextTelemetry(JSON.stringify({
    type: 'compacted',
    payload: {
      message: 'VERY PRIVATE SUMMARY',
      replacement_history: [{ role: 'user', content: 'DO NOT LOG' }],
      window_number: 7,
      previous_window_id: 'window-before-secret-id',
      window_id: 'window-after-secret-id',
      compaction_response_id: 'resp_secret',
    },
  }));
  assert.deepEqual(compacted.markers, ['compacted']);
  assert.deepEqual(compacted.metrics.window_number, [7]);
  assert.deepEqual(compacted.presence, ['compaction_response_id', 'previous_window_id', 'window_id']);
  assert.equal(JSON.stringify(compacted).includes('VERY PRIVATE SUMMARY'), false);
  assert.equal(JSON.stringify(compacted).includes('window-before-secret-id'), false);

  const sse = [
    'event: message',
    'data: {"type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":229043,"cached_input_tokens":220000,"total_tokens":229153},"model_context_window":258400},"message":"PRIVATE"}}',
    '',
    'data: {"type":"event_msg","payload":{"type":"item_completed","item":{"type":"ContextCompaction","id":"secret-item-id"}}}',
    '',
  ].join('\n');
  const telemetry = contextTelemetry(sse);
  assert.deepEqual(telemetry.markers, ['ContextCompaction', 'token_count']);
  assert.deepEqual(telemetry.metrics.model_context_window, [258400]);
  assert.deepEqual(telemetry.lastTokenUsage, [{ input_tokens: 229043, cached_input_tokens: 220000, total_tokens: 229153 }]);
  const serialized = JSON.stringify(telemetry);
  assert.equal(serialized.includes('PRIVATE'), false);
  assert.equal(serialized.includes('secret-item-id'), false);
});

test('context telemetry discovers Web-style candidate keys without recording values from message content', () => {
  const payload = JSON.stringify({
    type: 'conversation-turn-stream',
    payload: {
      type: 'stream-item',
      item: {
        metadata: {
          context_usage: {
            used_token_count: 184321,
            context_window_size: 258400,
            usage_ratio: 0.713,
            context_label: 'PRIVATE CONTEXT LABEL',
          },
          prompt_token_count: 184321,
          compact_generation: 4,
        },
        content: {
          context_secret_number: 999999,
          token_secret: 'DO NOT LOG THIS',
        },
      },
    },
  });
  const telemetry = contextTelemetry(payload);
  assert.deepEqual(telemetry.candidateMetrics['payload.item.metadata.context_usage.used_token_count'], [184321]);
  assert.deepEqual(telemetry.candidateMetrics['payload.item.metadata.context_usage.context_window_size'], [258400]);
  assert.deepEqual(telemetry.candidateMetrics['payload.item.metadata.context_usage.usage_ratio'], [0.713]);
  assert.deepEqual(telemetry.candidateMetrics['payload.item.metadata.prompt_token_count'], [184321]);
  assert.deepEqual(telemetry.candidateMetrics['payload.item.metadata.compact_generation'], [4]);
  assert.ok(telemetry.candidatePresence.includes('payload.item.metadata.context_usage'));
  assert.ok(telemetry.candidatePresence.includes('payload.item.metadata.context_usage.context_label'));
  const serialized = JSON.stringify(telemetry);
  assert.equal(serialized.includes('PRIVATE CONTEXT LABEL'), false);
  assert.equal(serialized.includes('DO NOT LOG THIS'), false);
  assert.equal(serialized.includes('context_secret_number'), false, 'content subtree is never inspected for candidate telemetry');
  assert.equal(serialized.includes('999999'), false);
});

test('context telemetry unwraps nested JSON stream envelopes but never parses message/content strings', () => {
  const nestedUsage = JSON.stringify({
    type: 'stream-item',
    payload: JSON.stringify({
      type: 'token_count',
      info: {
        last_token_usage: { input_tokens: 201234, cached_input_tokens: 198000, total_tokens: 201345 },
        model_context_window: 258400,
      },
      content: JSON.stringify({ input_tokens: 999999, model_context_window: 999999, token_secret: 'PRIVATE CONTENT' }),
    }),
  });
  const payload = JSON.stringify({
    type: 'conversation-turn-stream',
    data: nestedUsage,
    message: JSON.stringify({ input_tokens: 888888, model_context_window: 888888, context_secret: 'PRIVATE MESSAGE' }),
  });
  const telemetry = contextTelemetry(payload);
  assert.deepEqual(telemetry.markers, ['token_count']);
  assert.deepEqual(telemetry.lastTokenUsage, [{ input_tokens: 201234, cached_input_tokens: 198000, total_tokens: 201345 }]);
  assert.deepEqual(telemetry.metrics.model_context_window, [258400]);
  const serialized = JSON.stringify(telemetry);
  assert.equal(serialized.includes('999999'), false);
  assert.equal(serialized.includes('888888'), false);
  assert.equal(serialized.includes('PRIVATE CONTENT'), false);
  assert.equal(serialized.includes('PRIVATE MESSAGE'), false);
});

test('context telemetry unwraps nested SSE encoded_item safely', () => {
  const encoded = [
    'event: delta_encoding',
    'data: "v1"',
    '',
    'data: {"type":"token_count","info":{"last_token_usage":{"input_tokens":203456,"total_tokens":203600},"model_context_window":262144},"content":{"input_tokens":999999}}',
    '',
  ].join('\n');
  const payload = JSON.stringify({ type: 'conversation-turn-stream', payload: { type: 'stream-item', encoded_item: encoded } });
  const telemetry = contextTelemetry(payload);
  assert.deepEqual(telemetry.markers, ['token_count']);
  assert.deepEqual(telemetry.lastTokenUsage, [{ input_tokens: 203456, total_tokens: 203600 }]);
  assert.deepEqual(telemetry.metrics.model_context_window, [262144]);
  assert.equal(JSON.stringify(telemetry).includes('999999'), false);
});

test('service metadata extracts only model limit and truncation state', () => {
  assert.deepEqual(contextServiceMetadata('models', JSON.stringify({ models: [
    { slug: 'other', max_tokens: 123 },
    { slug: 'gpt-5-6-thinking', max_tokens: 262144, description: 'PRIVATE' },
  ] })), { modelSlug: 'gpt-5-6-thinking', maxTokens: 262144 });
  assert.deepEqual(contextServiceMetadata('conversation', JSON.stringify({
    context_truncation_continuation: null,
    page_info: { has_previous_page: true },
    messages: [{ content: { parts: ['PRIVATE HISTORY'] } }],
  })), { continuationPresent: false, continuationType: 'null', summaryMetadataPresent: false, hasPreviousPage: true });
  assert.deepEqual(contextServiceMetadata('conversation', JSON.stringify({
    context_truncation_continuation: { opaque: 'DO NOT LOG' }, summary_metadata: { opaque: 'PRIVATE' }, page_info: {},
  })), { continuationPresent: true, continuationType: 'object', summaryMetadataPresent: true, hasPreviousPage: false });
});

test('DiagnosticJsonl writes valid JSONL and rotates bounded files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-diagnostics-'));
  const file = path.join(dir, 'chromium-events.jsonl');
  const fixed = new Date('2026-09-12T10:00:00.000Z');
  const log = new DiagnosticJsonl(file, { maxBytes: 420, now: () => fixed, sessionId: 'test-session' });
  await log.init();
  for (let i = 0; i < 12; i++) log.record('test', 'event', { index: i, padding: 'x'.repeat(45) });
  await log.flush();
  const current = await fs.readFile(file, 'utf8');
  const rotated = await fs.readFile(file + '.1', 'utf8');
  for (const text of [current, rotated]) {
    assert.ok(text.length > 0);
    for (const line of text.trim().split('\n')) assert.doesNotThrow(() => JSON.parse(line));
  }
  assert.ok((await fs.stat(file)).size <= 600);
  await fs.rm(dir, { recursive: true, force: true });
});

import { EventEmitter } from 'node:events';
import { ChromiumDiagnostics } from '../src/chromium-diagnostics.mjs';

async function startupDiagnostics(t, { pendingDebugger = false } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-early-diagnostics-'));
  const contents = new EventEmitter(), debug = new EventEmitter();
  let attached = false;
  debug.attach = () => { attached = true; };
  debug.isAttached = () => attached;
  debug.detach = () => { attached = false; };
  debug.sendCommand = () => pendingDebugger ? new Promise(() => {}) : Promise.resolve({});
  contents.debugger = debug; contents.getURL = () => 'about:blank';
  contents.isDestroyed = () => false;
  contents.executeJavaScript = async () => { throw new Error('Do not inspect a document that has not loaded'); };
  const file = path.join(dir, 'chromium-events.jsonl');
  const diagnostics = new ChromiumDiagnostics(contents, { file, allowFixture: true, sampleIntervalMs: 60000 });
  await diagnostics.start({ appVersion: 'test' });
  t.after(async () => { await diagnostics.stop(); await fs.rm(dir, { recursive: true, force: true }); });
  return { diagnostics, contents, file };
}

test('first navigation failure is recorded before a successful page without logging URL secrets', async t => {
  const { diagnostics, contents, file } = await startupDiagnostics(t);
  const url = 'https://chatgpt.com/?token=PRIVATE_QUERY#PRIVATE_FRAGMENT';
  contents.emit('did-start-navigation', { url, isMainFrame: true, isSameDocument: false });
  contents.emit('did-fail-provisional-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', url, true);
  contents.emit('did-fail-load', {}, -105, 'ERR_NAME_NOT_RESOLVED', url, true);
  diagnostics.onDebuggerMessage({}, 'Network.loadingFailed', { requestId: 'fixture', type: 'Document', errorText: 'net::ERR_NAME_NOT_RESOLVED' });
  const report = JSON.parse(await diagnostics.startupReport());
  assert.equal(report.events[0].event, 'session-start');
  const failure = report.events.find(e => e.event === 'did-fail-load');
  assert.equal(failure.errorCode, -105); assert.equal(failure.errorName, 'ERR_NAME_NOT_RESOLVED');
  assert.equal(failure.isMainFrame, true);
  assert.equal(report.events.some(e => e.event === 'did-finish-load'), false);
  assert.ok(report.events.some(e => e.errorName === 'net::ERR_NAME_NOT_RESOLVED'));
  const text = await fs.readFile(file, 'utf8');
  assert.equal(/PRIVATE_QUERY|PRIVATE_FRAGMENT/.test(text), false);
});

test('startup report stays bounded and excludes chat telemetry and previous diagnostic sessions', async t => {
  const { diagnostics, contents, file } = await startupDiagnostics(t);
  await diagnostics.flush();
  await fs.appendFile(file, JSON.stringify({ diagnosticSession: 'previous-session', event: 'navigation-requested', marker: 'OLD_SESSION' }) + '\n');
  diagnostics.log.record('telemetry', 'context', { marker: 'CHAT_TELEMETRY' });
  for (let i = 0; i < 100; i++) contents.emit('did-frame-navigate', {}, 'https://chatgpt.com/', 503, 'PRIVATE_STATUS_TEXT', true);
  contents.emit('did-fail-load', {}, -2, 'PRIVATE_ERROR_MESSAGE', 'https://chatgpt.com/', true);
  const text = await diagnostics.startupReport(), report = JSON.parse(text);
  assert.ok(report.events.length <= 61);
  assert.equal(report.events[0].event, 'session-start');
  assert.ok(report.events.some(e => e.event === 'main-document-response' && e.status === 503));
  assert.equal(report.events.at(-1).errorName, null);
  assert.equal(/OLD_SESSION|CHAT_TELEMETRY|PRIVATE_STATUS_TEXT|PRIVATE_ERROR_MESSAGE/.test(text), false);
});

test('native startup logging does not wait for a debugger awaiting its first renderer', async t => {
  let timer;
  const f = await Promise.race([
    startupDiagnostics(t, { pendingDebugger: true }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Diagnostic channel blocked first navigation')), 1000); }),
  ]).finally(() => clearTimeout(timer));
  f.contents.emit('did-fail-load', {}, -106, 'ERR_INTERNET_DISCONNECTED', 'https://chatgpt.com/', true);
  assert.match(await f.diagnostics.startupReport(), /ERR_INTERNET_DISCONNECTED/);
});

test('startup report preserves the earliest request after later attempts and file rotation', async t => {
  const { diagnostics, contents } = await startupDiagnostics(t);
  diagnostics.log.maxBytes = 1200;
  diagnostics.log.record('app', 'navigation-requested', { generation: 1, url: { origin: 'https://chatgpt.com', path: '/' } });
  for (let i = 0; i < 200; i++) contents.emit('did-frame-navigate', {}, 'https://chatgpt.com/', 200, 'OK', true);
  diagnostics.log.record('app', 'load-url-failed', { generation: 50, errorName: 'PAGE_RESPONSE_TIMEOUT' });
  const report = JSON.parse(await diagnostics.startupReport());
  assert.ok(report.events.some(e => e.event === 'navigation-requested' && e.generation === 1));
  assert.ok(report.events.some(e => e.event === 'load-url-failed' && e.generation === 50));
  assert.ok(report.eventsOmitted > 0);
  assert.ok(report.events.length <= 61);
});

test('identical page events are recorded once without executing DOM code', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-dom-pulse-'));
  const contents = new EventEmitter(), debug = new EventEmitter();
  let attached = false;
  debug.attach = () => { attached = true; }; debug.isAttached = () => attached; debug.detach = () => { attached = false; };
  debug.sendCommand = async () => ({});
  contents.debugger = debug; contents.getURL = () => 'https://chatgpt.com/c/fixture'; contents.isDestroyed = () => false;
  contents.executeJavaScript = () => { throw new Error('DOM probing is forbidden'); };
  const file = path.join(dir, 'events.jsonl');
  const diagnostics = new ChromiumDiagnostics(contents, { file, allowFixture: true, sampleIntervalMs: 60000 });
  t.after(async () => { await diagnostics.stop(); await fs.rm(dir, { recursive: true, force: true }); });
  await diagnostics.start();
  const state = { url: contents.getURL(), userMessageCount: 2, busy: false, editorAvailable: true, visibility: 'visible' };
  diagnostics.observePage(state); diagnostics.observePage(state); await diagnostics.flush();
  const records = (await fs.readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(records.filter(entry => entry.source === 'dom' && entry.event === 'state').length, 1);
});

test('data URL payloads never reach diagnostic logs', () => {
  const result = safeUrl('data:text/plain;base64,UFJJVkFURV9DT05URU5U');
  assert.deepEqual(result, { origin: 'data://', path: '[redacted]', queryKeys: [] });
});
