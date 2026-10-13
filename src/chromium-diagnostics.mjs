import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { queueDiagnosticFile } from './common.mjs';
import { StartupNetworkTrace } from './startup-network-trace.mjs';

const STARTUP_EVENTS = new Set(['session-start', 'navigation-requested', 'navigation-waiting', 'load-url-failed',
      'did-start-navigation', 'did-start-loading', 'dom-ready', 'main-document-response', 'did-finish-load',
      'did-stop-loading', 'did-fail-load', 'did-fail-provisional-load', 'render-process-gone',
      'unresponsive', 'responsive', 'attach-failed', 'attached', 'loading-failed']);

const SAFE_SIGNAL_KEYS = new Set(['type', 'event', 'event_type', 'eventType', 'method', 'kind', 'op', 'action']);
const TOKEN_USAGE_KEYS = new Set([
  'input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens',
  'reasoning_output_tokens', 'total_tokens',
]);
const CONTEXT_NUMBER_KEYS = new Set([
  ...TOKEN_USAGE_KEYS, 'model_context_window', 'context_tokens', 'context_window', 'context_length',
  'max_context_tokens', 'remaining_tokens', 'window_number',
]);
const TELEMETRY_OBJECT_KEYS = new Set(['last_token_usage', 'total_token_usage', 'usage', 'token_usage']);
const TELEMETRY_MARKERS = new Set([
  'token_count', 'compacted', 'ContextCompaction', 'context_compaction', 'conversation.compaction',
  'response.compact', 'response.compaction', 'contextCompaction',
]);
const PRESENCE_KEYS = new Set(['compaction_response_id', 'window_id', 'previous_window_id', 'first_window_id']);
const TELEMETRY_KEY_PATTERN = /(token|context|usage|window|compact)/i;
const SAFE_KEY_SEGMENT = /^[A-Za-z0-9_.:-]{1,80}$/;
const SKIP_TELEMETRY_SUBTREES = new Set([
  'content', 'parts', 'text', 'message', 'replacement_history', 'guardian_history',
  'tool_output', 'toolOutput', 'output_text', 'input_text',
]);
const NESTED_JSON_MAX_CHARS = 256 * 1024;
const SAFE_IDENTIFIER = /^[A-Za-z0-9_.:/-]{1,96}$/;
const LONG_PATH_ID = /^[A-Za-z0-9_-]{20,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redactPathname(pathname) {
  return pathname.split('/').map(segment => (UUID.test(segment) || LONG_PATH_ID.test(segment)) ? ':id' : segment).join('/');
}

export function safeUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol === 'data:') return { origin: 'data://', path: '[redacted]', queryKeys: [] };
    return {
      origin: url.origin === 'null' ? `${url.protocol}//` : url.origin,
      path: redactPathname(url.pathname),
      queryKeys: [...new Set([...url.searchParams.keys()])].sort(),
    };
  } catch {
    return { invalid: true };
  }
}

function networkError(value) {
  return typeof value === 'string' && /^(?:net::)?ERR_[A-Z0-9_]+$/.test(value) ? value : null;
}

function safeSignal(value) {
  return typeof value === 'string' && SAFE_IDENTIFIER.test(value) ? value : null;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function addMetric(metrics, key, value) {
  const number = finiteNumber(value);
  if (number === null) return;
  const current = metrics[key] ?? [];
  if (!current.includes(number)) current.push(number);
  metrics[key] = current.slice(0, 8);
}

function addCandidateMetric(metrics, path, value) {
  const number = finiteNumber(value);
  if (number === null || !path) return;
  const current = metrics[path] ?? [];
  if (!current.includes(number)) current.push(number);
  metrics[path] = current.slice(0, 8);
}

function collectUsageObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const usage = {};
  for (const key of TOKEN_USAGE_KEYS) {
    const number = finiteNumber(value[key]);
    if (number !== null) usage[key] = number;
  }
  return Object.keys(usage).length ? usage : null;
}

function nestedJsonValue(value, budget) {
  if (typeof value !== 'string' || value.length < 2 || value.length > NESTED_JSON_MAX_CHARS) return null;
  if ((budget.nested ?? 0) >= 12) return null;
  const text = value.trim();
  if (!((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']')))) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    budget.nested = (budget.nested ?? 0) + 1;
    return parsed;
  } catch {
    return null;
  }
}

function nestedSseValues(value, budget) {
  if (typeof value !== 'string' || value.length < 6 || value.length > NESTED_JSON_MAX_CHARS) return [];
  if ((budget.nested ?? 0) >= 12 || !/(^|\n)(event|data):/.test(value)) return [];
  const values = [];
  for (const line of value.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const text = line.slice(5).trim();
    if (!text || text === '[DONE]') continue;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') values.push(parsed);
    } catch {}
  }
  if (values.length) budget.nested = (budget.nested ?? 0) + 1;
  return values.slice(0, 40);
}

function collectTelemetry(value, out, depth = 0, budget = { left: 800, nested: 0 }, path = []) {
  if (!value || typeof value !== 'object' || depth > 10 || budget.left-- <= 0) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectTelemetry(item, out, depth + 1, budget, path);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    const safeKey = SAFE_KEY_SEGMENT.test(key) ? key : null;
    const nextPath = safeKey ? [...path, safeKey] : path;
    const candidatePath = safeKey ? nextPath.join('.') : null;
    if (SAFE_SIGNAL_KEYS.has(key) && typeof item === 'string' && TELEMETRY_MARKERS.has(item)) out.markers.add(item);
    if (CONTEXT_NUMBER_KEYS.has(key)) addMetric(out.metrics, key, item);
    if (PRESENCE_KEYS.has(key) && item != null) out.presence.add(key);
    if (safeKey && TELEMETRY_KEY_PATTERN.test(key)
        && !CONTEXT_NUMBER_KEYS.has(key) && !TELEMETRY_OBJECT_KEYS.has(key) && !PRESENCE_KEYS.has(key)) {
      const number = finiteNumber(item);
      if (number !== null) addCandidateMetric(out.candidateMetrics, candidatePath, number);
      else if (item != null) out.candidatePresence.add(candidatePath);
    }
    if (TELEMETRY_OBJECT_KEYS.has(key)) {
      const usage = collectUsageObject(item);
      if (usage) {
        if (key === 'last_token_usage') out.lastTokenUsage.push(usage);
        else if (key === 'total_token_usage') out.totalTokenUsage.push(usage);
        else out.usage.push(usage);
      }
    }
    if (SKIP_TELEMETRY_SUBTREES.has(key)) continue;
    if (item && typeof item === 'object') {
      collectTelemetry(item, out, depth + 1, budget, nextPath);
      continue;
    }
    const nested = nestedJsonValue(item, budget);
    if (nested) collectTelemetry(nested, out, depth + 1, budget, nextPath);
    else for (const nestedItem of nestedSseValues(item, budget)) collectTelemetry(nestedItem, out, depth + 1, budget, nextPath);
  }
}

function telemetryCollector() {
  return {
    markers: new Set(), presence: new Set(), metrics: {},
    candidateMetrics: {}, candidatePresence: new Set(),
    lastTokenUsage: [], totalTokenUsage: [], usage: [],
  };
}

function finalizeTelemetry(out) {
  const result = {};
  if (out.markers.size) result.markers = [...out.markers].sort();
  if (out.presence.size) result.presence = [...out.presence].sort();
  if (Object.keys(out.metrics).length) result.metrics = Object.fromEntries(Object.entries(out.metrics).sort(([a], [b]) => a.localeCompare(b)));
  if (Object.keys(out.candidateMetrics).length) {
    result.candidateMetrics = Object.fromEntries(Object.entries(out.candidateMetrics).sort(([a], [b]) => a.localeCompare(b)).slice(0, 48));
  }
  if (out.candidatePresence.size) result.candidatePresence = [...out.candidatePresence].sort().slice(0, 48);
  if (out.lastTokenUsage.length) result.lastTokenUsage = out.lastTokenUsage.slice(0, 8);
  if (out.totalTokenUsage.length) result.totalTokenUsage = out.totalTokenUsage.slice(0, 8);
  if (out.usage.length) result.usage = out.usage.slice(0, 8);
  return Object.keys(result).length ? result : null;
}

function telemetryFromJson(text) {
  try {
    const value = JSON.parse(text);
    const out = telemetryCollector();
    collectTelemetry(value, out);
    return finalizeTelemetry(out);
  } catch {
    return null;
  }
}

function telemetryFromSse(text) {
  if (!/(^|\n)(event|data):/.test(text)) return null;
  const out = telemetryCollector();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const json = line.slice(5).trim();
    if (!json || json === '[DONE]') continue;
    try { collectTelemetry(JSON.parse(json), out); } catch {}
  }
  return finalizeTelemetry(out);
}

export function contextTelemetry(data) {
  const text = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString('utf8') : String(data ?? '');
  return telemetryFromJson(text) ?? telemetryFromSse(text);
}

export function contextServiceMetadata(kind, data) {
  const text = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString('utf8') : String(data ?? '');
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  if (kind === 'models') {
    const models = Array.isArray(value?.models) ? value.models : [];
    const model = models.find(item => item?.slug === 'gpt-5-6-thinking');
    const maxTokens = finiteNumber(model?.max_tokens);
    return maxTokens && maxTokens > 0 ? { modelSlug: 'gpt-5-6-thinking', maxTokens } : null;
  }
  if (kind === 'conversation') {
    if (!Object.prototype.hasOwnProperty.call(value ?? {}, 'context_truncation_continuation')) return null;
    const continuation = value.context_truncation_continuation;
    return {
      continuationPresent: continuation != null,
      continuationType: continuation == null ? 'null' : Array.isArray(continuation) ? 'array' : typeof continuation,
      summaryMetadataPresent: value.summary_metadata != null,
      hasPreviousPage: value.page_info?.has_previous_page === true,
    };
  }
  return null;
}

function collectSignals(value, out, depth = 0, budget = { left: 80 }) {
  if (!value || typeof value !== 'object' || depth > 3 || budget.left-- <= 0) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 12)) collectSignals(item, out, depth + 1, budget);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (SAFE_SIGNAL_KEYS.has(key)) {
      const signal = safeSignal(item);
      if (signal) out.add(`${key}=${signal}`);
    }
    if (item && typeof item === 'object') collectSignals(item, out, depth + 1, budget);
  }
}

function structuralJson(text) {
  try {
    const value = JSON.parse(text);
    const signals = new Set();
    collectSignals(value, signals);
    return {
      format: 'json',
      keys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort().slice(0, 40) : [],
      signals: [...signals].sort(),
    };
  } catch {
    return null;
  }
}

function structuralSse(text) {
  if (!/(^|\n)(event|data):/.test(text)) return null;
  const signals = new Set();
  for (const line of text.split(/\r?\n/).slice(0, 100)) {
    if (line.startsWith('event:')) {
      const event = safeSignal(line.slice(6).trim());
      if (event) signals.add(`event=${event}`);
    } else if (line.startsWith('data:')) {
      const meta = structuralJson(line.slice(5).trim());
      for (const signal of meta?.signals ?? []) signals.add(signal);
    }
  }
  return { format: 'sse', keys: [], signals: [...signals].sort() };
}

export function payloadMetadata(data) {
  const text = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString('utf8') : String(data ?? '');
  const structural = structuralJson(text) ?? structuralSse(text) ?? { format: 'opaque', keys: [], signals: [] };
  const telemetry = contextTelemetry(text);
  return {
    bytes: Buffer.byteLength(text),
    sha256: createHash('sha256').update(text).digest('hex'),
    ...structural,
    ...(telemetry ? { telemetry } : {}),
  };
}

export class DiagnosticJsonl {
  constructor(file, { maxBytes = 25 * 1024 * 1024, now = () => new Date(), sessionId = randomUUID(), owner = () => ({}) } = {}) {
    this.file = file;
    this.maxBytes = maxBytes;
    this.now = now;
    this.sessionId = sessionId;this.owner=owner;
    this.size = 0;
    this.sequence = 0;
    this.startupBeginning = []; this.startupRecent = []; this.startupCount = 0;
    this.tail = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    this.size = (await fs.stat(this.file).catch(() => null))?.size ?? 0;
  }

  record(source, event, fields = {}) {
    const entry = { ts: this.now().toISOString(), seq: ++this.sequence, diagnosticSession: this.sessionId, source, event, ...this.owner(), ...fields };
    if (STARTUP_EVENTS.has(event)) {
      this.startupCount++;
      if (this.startupBeginning.length < 31) this.startupBeginning.push(entry);
      this.startupRecent.push(entry);
      if (this.startupRecent.length > 30) this.startupRecent.shift();
    }
    const line = JSON.stringify(entry) + '\n';
    this.tail = this.tail.then(() => this.#append(line)).catch(() => {});
    return entry;
  }

  #append(line) {
   return queueDiagnosticFile(this.file,async()=>{
    this.size=(await fs.stat(this.file).catch(e=>{if(e.code==='ENOENT')return null;throw e;}))?.size??0;
    const bytes = Buffer.byteLength(line);
    if (this.size > 0 && this.size + bytes > this.maxBytes) await this.#rotate();
    await fs.appendFile(this.file, line, { encoding: 'utf8', mode: 0o600 });
    this.size += bytes;
   });
  }

  async #rotate() {
    await fs.rm(this.file + '.1', { force: true });
    await fs.rename(this.file, this.file + '.1').catch(error => { if (error.code !== 'ENOENT') throw error; });
    this.size = 0;
  }

  async flush() { await this.tail; }
}

const IGNORED_CDP = new Set([
  'Network.dataReceived', 'Network.requestServedFromCache', 'Network.resourceChangedPriority',
  'Page.frameRequestedNavigation', 'Page.frameStartedLoading', 'Page.frameStoppedLoading',
]);

export class ChromiumDiagnostics {
  constructor(contents, { file, maxBytes, allowFixture = false, startupNetwork = false, onConversationRateLimit = () => {}, owner } = {}) {
    if (!contents || !file) throw new TypeError('ChromiumDiagnostics requires contents and file');
    this.contents = contents;
    this.onConversationRateLimit = onConversationRateLimit;
    this.allowFixture = allowFixture;
    this.log = new DiagnosticJsonl(file, { maxBytes, owner });
    this.networkTrace = startupNetwork ? new StartupNetworkTrace(contents.session?.netLog, path.join(path.dirname(file), 'startup-network.json')) : null;
    this.handlers = [];
    this.lastDomPulse = null;
    this.lastPageState = null;
    this.attachedByUs = false;
    this.started = false;
    this.streamResponses = new Map();
    this.serviceResponses = new Map();
    this.modelContextLimit = null;
    this.lastContextUsage = null;
    this.onDebuggerMessage = this.onDebuggerMessage.bind(this);
    this.onDebuggerDetach = this.onDebuggerDetach.bind(this);
  }

  async start(metadata = {}) {
    if (this.started) return;
    this.started = true;
    await this.log.init();
    this.log.record('diagnostics', 'session-start', metadata);
    this.#listenNative();
    await this.networkTrace?.start();
    // CDP may wait for the first renderer; it must never delay that navigation.
    void this.#attachDebugger();

  }


  #on(name, handler) {
    this.contents.on(name, handler);
    this.handlers.push([name, handler]);
  }

  #listenNative() {
    this.#on('did-start-navigation', (event, url, isInPlace, isMainFrame) => this.log.record('webContents', 'did-start-navigation', {
      url: safeUrl(event.url ?? url), isMainFrame: event.isMainFrame ?? isMainFrame,
      isSameDocument: event.isSameDocument ?? isInPlace,
    }));
    this.#on('dom-ready', () => {
      const url = this.contents.getURL();
      this.log.record('webContents', 'dom-ready', { url: safeUrl(url) });
      if (url && url !== 'about:blank') void this.networkTrace?.finish('dom-ready');
    });
    this.#on('did-frame-navigate', (_event, url, status, _statusText, isMainFrame) => {
      if (isMainFrame) this.log.record('webContents', 'main-document-response', { url: safeUrl(url), status });
    });
    for (const name of ['did-fail-load', 'did-fail-provisional-load']) this.#on(name, (_event, code, description, url, isMainFrame) => {
      this.log.record('webContents', name, { url: safeUrl(url), errorCode: code, errorName: networkError(description), isMainFrame });
      if (isMainFrame && name === 'did-fail-load') void this.networkTrace?.finish('load-failed');
    });
    this.#on('did-start-loading', () => this.log.record('webContents', 'did-start-loading', { url: safeUrl(this.contents.getURL()) }));
    this.#on('did-stop-loading', () => this.log.record('webContents', 'did-stop-loading', { url: safeUrl(this.contents.getURL()) }));
    this.#on('did-finish-load', () => this.log.record('webContents', 'did-finish-load', { url: safeUrl(this.contents.getURL()) }));
    this.#on('did-navigate', (_event, url) => {
      this.lastContextUsage = null;
      this.log.record('webContents', 'did-navigate', { url: safeUrl(url) });
    });
    this.#on('did-navigate-in-page', (_event, url, isMainFrame) => {
      if (isMainFrame) this.lastContextUsage = null;
      this.log.record('webContents', 'did-navigate-in-page', { url: safeUrl(url), isMainFrame });
    });
    this.#on('unresponsive', () => this.log.record('webContents', 'unresponsive'));
    this.#on('responsive', () => this.log.record('webContents', 'responsive'));
    this.#on('render-process-gone', (_event, details) => this.log.record('webContents', 'render-process-gone', { reason: details?.reason, exitCode: details?.exitCode }));
  }

  async #attachDebugger() {
    const debug = this.contents.debugger;
    try {
      if (debug.isAttached()) {
        this.log.record('cdp', 'attach-skipped', { reason: 'already-attached' });
        return;
      }
      debug.attach('1.3');
      this.attachedByUs = true;
      debug.on('message', this.onDebuggerMessage);
      debug.on('detach', this.onDebuggerDetach);
      await Promise.all(['Network.enable', 'Page.enable', 'Log.enable'].map(command => debug.sendCommand(command)));
      await debug.sendCommand('Page.setLifecycleEventsEnabled', { enabled: true }).catch(() => {});
      this.log.record('cdp', 'attached', { protocolVersion: '1.3' });
    } catch (error) {
      this.log.record('cdp', 'attach-failed', { name: error?.name ?? 'Error', code: error?.code ?? null });
    }
  }

  onDebuggerDetach(_event, reason) {
    this.attachedByUs = false;
    this.log.record('cdp', 'detached', { reason: safeSignal(reason) ?? 'unknown' });
  }

  onDebuggerMessage(_event, method, params = {}) {
    const base = { method };
    if (method === 'Network.requestWillBeSent') {
      return this.log.record('cdp', 'request', { ...base, requestId: params.requestId, requestMethod: params.request?.method,
        resourceType: params.type, url: safeUrl(params.request?.url) });
    }
    if (method === 'Network.responseReceived') {
      const url = safeUrl(params.response?.url);
      try {
        const rawUrl = new URL(params.response?.url);
        const limited = rawUrl.pathname.match(/^\/backend-api\/conversations?\/([^/]+)$/);
        if (rawUrl.origin === 'https://chatgpt.com' && limited && params.response?.status === 429) {
          const headers = params.response.headers ?? {};
          const retry = Object.entries(headers).find(([key]) => key.toLowerCase() === 'retry-after')?.[1];
          const seconds = Number(retry) || Math.max(0, (Date.parse(retry) - Date.now()) / 1000) || 60;
          this.onConversationRateLimit(decodeURIComponent(limited[1]), seconds);
        }
        if (rawUrl.origin === 'https://chatgpt.com' && params.response?.mimeType === 'application/json') {
          if (rawUrl.pathname === '/backend-api/models') this.serviceResponses.set(params.requestId, { kind: 'models', url });
          else if (/^\/backend-api\/conversations?\/[^/]+$/.test(rawUrl.pathname)) this.serviceResponses.set(params.requestId, { kind: 'conversation', url });
        }
      } catch {}
      if (url.origin === 'https://chatgpt.com' && url.path === '/backend-api/f/conversation'
          && params.response?.mimeType === 'text/event-stream') {
        this.streamResponses.set(params.requestId, { url, mimeType: params.response.mimeType });
      }
      return this.log.record('cdp', 'response', { ...base, requestId: params.requestId, resourceType: params.type,
        status: params.response?.status, mimeType: params.response?.mimeType, protocol: params.response?.protocol, url });
    }
    if (method === 'Network.loadingFinished') {
      const entry = this.log.record('cdp', 'loading-finished', { ...base, requestId: params.requestId, encodedDataLength: params.encodedDataLength });
      const service = this.serviceResponses.get(params.requestId);
      if (service) {
        this.serviceResponses.delete(params.requestId);
        void this.#inspectServiceResponse(params.requestId, service);
      }
      const stream = this.streamResponses.get(params.requestId);
      if (stream) {
        this.streamResponses.delete(params.requestId);
        void this.#inspectConversationStream(params.requestId, stream);
      }
      return entry;
    }
    if (method === 'Network.loadingFailed') {
      this.streamResponses.delete(params.requestId);
      this.serviceResponses.delete(params.requestId);
      return this.log.record('cdp', 'loading-failed', { ...base, requestId: params.requestId, errorType: safeSignal(params.type) ?? null,
        errorName: networkError(params.errorText), canceled: !!params.canceled, blockedReason: safeSignal(params.blockedReason) ?? null });
    }
    if (method === 'Network.webSocketCreated') {
      return this.log.record('cdp', 'websocket-created', { ...base, requestId: params.requestId, url: safeUrl(params.url) });
    }
    if (method === 'Network.webSocketClosed') {
      return this.log.record('cdp', 'websocket-closed', { ...base, requestId: params.requestId });
    }
    if (method === 'Network.webSocketFrameReceived' || method === 'Network.webSocketFrameSent') {
      const payload = payloadMetadata(params.response?.payloadData ?? '');
      const entry = this.log.record('cdp', method.endsWith('Received') ? 'websocket-frame-received' : 'websocket-frame-sent', {
        ...base, requestId: params.requestId, opcode: params.response?.opcode, payload,
      });
      if (method.endsWith('Received') && payload.telemetry) this.#recordContextTelemetry('websocket', payload.telemetry, { requestId: params.requestId });
      return entry;
    }
    if (method === 'Network.eventSourceMessageReceived') {
      const payload = payloadMetadata(params.data ?? '');
      const entry = this.log.record('cdp', 'eventsource-message', { ...base, requestId: params.requestId,
        eventName: safeSignal(params.eventName) ?? null, eventIdPresent: !!params.eventId, payload });
      if (payload.telemetry) this.#recordContextTelemetry('eventsource', payload.telemetry, { requestId: params.requestId });
      return entry;
    }
    if (method === 'Page.lifecycleEvent') {
      return this.log.record('cdp', 'lifecycle', { ...base, name: safeSignal(params.name) ?? null, frameId: params.frameId });
    }
    if (method === 'Log.entryAdded') {
      const entry = params.entry ?? {};
      return this.log.record('cdp', 'browser-log', { ...base, source: safeSignal(entry.source) ?? null,
        level: safeSignal(entry.level) ?? null, url: safeUrl(entry.url), lineNumber: entry.lineNumber });
    }
    if (!IGNORED_CDP.has(method)) this.log.record('cdp', 'event', base);
  }

  #recordContextTelemetry(origin, telemetry, fields = {}) {
    const markers = telemetry?.markers ?? [];
    const directCompact = markers.some(marker => ['compacted', 'ContextCompaction', 'context_compaction', 'conversation.compaction',
      'response.compact', 'response.compaction', 'contextCompaction'].includes(marker))
      || (telemetry?.presence ?? []).includes('compaction_response_id');
    const usage = telemetry?.lastTokenUsage?.at(-1) ?? telemetry?.usage?.at(-1) ?? null;
    const windowValues = telemetry?.metrics?.model_context_window ?? telemetry?.metrics?.context_window
      ?? telemetry?.metrics?.max_context_tokens ?? [];
    const modelContextWindow = windowValues.at(-1) ?? this.modelContextLimit ?? null;
    const metricInputs = telemetry?.metrics?.input_tokens ?? [];
    const inputTokens = usage?.input_tokens ?? (metricInputs.length === 1 ? metricInputs[0] : null);
    const usedPercent = Number.isFinite(inputTokens) && Number.isFinite(modelContextWindow) && modelContextWindow > 0
      ? Math.round((inputTokens / modelContextWindow) * 1000) / 10 : null;
    let compactSignal = directCompact ? 'direct' : null;
    const previous = this.lastContextUsage;
    if (!compactSignal && previous && Number.isFinite(inputTokens) && previous.usedPercent >= 75) {
      if (inputTokens === 0) compactSignal = 'token-reset';
      else if (inputTokens < previous.inputTokens * 0.5) compactSignal = 'token-drop';
    }
    const known = Number.isFinite(inputTokens) && inputTokens > 0
      && Number.isFinite(modelContextWindow) && modelContextWindow > 0;
    if (known) this.lastContextUsage = { inputTokens, modelContextWindow, usedPercent };
    else if (compactSignal) this.lastContextUsage = null;
    this.log.record('telemetry', 'context', {
      origin, ...fields, markers, presence: telemetry?.presence ?? [],
      inputTokens, modelContextWindow, usedPercent, compactSignal, telemetry,
    });
  }

  async #inspectServiceResponse(requestId, service) {
    try {
      const response = await this.contents.debugger.sendCommand('Network.getResponseBody', { requestId });
      const body = response?.base64Encoded ? Buffer.from(response.body ?? '', 'base64') : Buffer.from(response?.body ?? '', 'utf8');
      const metadata = contextServiceMetadata(service.kind, body);
      if (!metadata) return;
      if (service.kind === 'models') {
        this.modelContextLimit = metadata.maxTokens;
        this.log.record('telemetry', 'model-limit', { requestId, url: service.url, ...metadata });
      } else {
        this.log.record('telemetry', 'context-truncation-state', { requestId, url: service.url, ...metadata });
      }
    } catch (error) {
      this.log.record('telemetry', 'service-metadata-inspection-failed', { requestId, kind: service.kind, url: service.url, name: error?.name ?? 'Error', code: error?.code ?? null });
    }
  }

  async #inspectConversationStream(requestId, stream) {
    try {
      const response = await this.contents.debugger.sendCommand('Network.getResponseBody', { requestId });
      const body = response?.base64Encoded ? Buffer.from(response.body ?? '', 'base64') : Buffer.from(response?.body ?? '', 'utf8');
      const metadata = payloadMetadata(body);
      this.log.record('telemetry', 'conversation-stream-inspected', {
        requestId, url: stream.url, bytes: metadata.bytes, sha256: metadata.sha256, telemetryFound: !!metadata.telemetry,
      });
      if (metadata.telemetry) this.#recordContextTelemetry('conversation-sse', metadata.telemetry, { requestId, url: stream.url });
    } catch (error) {
      this.log.record('telemetry', 'conversation-stream-inspection-failed', {
        requestId, url: stream.url, name: error?.name ?? 'Error', code: error?.code ?? null,
      });
    }
  }

  observePage(state) {
    if (!this.started || !state) return;
    const pulse = { url: safeUrl(state.url), userMessages: state.userMessageCount,
      busy: state.busy, composer: state.editorAvailable, visibility: state.visibility,
      manualStopRevision: state.manualStopRevision ?? 0, assistantRevision: state.assistantRevision ?? 0,
      turnId: /^[a-f0-9]{1,8}$/.test(state.turnId ?? '') ? state.turnId : '',
      userTurnId: /^[a-f0-9]{1,8}$/.test(state.userTurnId ?? '') ? state.userTurnId : '',
      identitySource: ['native', 'cycle', 'none'].includes(state.turnIdentitySource) ? state.turnIdentitySource : 'none',
      lastMessageRole: ['user', 'assistant'].includes(state.lastMessageRole) ? state.lastMessageRole : null,
      connectionError: state.connectionError ?? null };
    const signature = JSON.stringify(pulse);
    if (signature === this.lastDomPulse) return;
    this.lastDomPulse = signature;
    this.log.record('dom', 'state', pulse);
  }

  async stop() {
    if (!this.started) return;
    this.started = false;
    this.lastDomPulse = null;
    this.streamResponses.clear();
    this.serviceResponses.clear();
    for (const [name, handler] of this.handlers) this.contents.removeListener(name, handler);
    this.handlers = [];
    const debug = this.contents.debugger;
    if (this.attachedByUs && debug.isAttached()) {
      debug.removeListener('message', this.onDebuggerMessage);
      debug.removeListener('detach', this.onDebuggerDetach);
      try { debug.detach(); } catch {}
      this.attachedByUs = false;
    }
    void this.networkTrace?.finish('closed');
    this.log.record('diagnostics', 'session-stop');
    await this.log.flush();
  }

  async startupReport() {
    await this.log.flush();
    const events = [...new Map([...this.log.startupBeginning, ...this.log.startupRecent].map(e => [e.seq, e])).values()]
      .sort((a, b) => a.seq - b.seq);
    const network = await this.networkTrace?.snapshot();
    return JSON.stringify({ report: 'Web Pilot browser startup', eventsOmitted: this.log.startupCount - events.length,
      events, ...(network ? { network } : {}) }, null, 2);
  }

  async flush() { await this.log.flush(); }
}
