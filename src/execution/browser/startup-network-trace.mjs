import fs from 'node:fs/promises';
import { isIP } from 'node:net';

const STAGES = new Set([
  'URL_REQUEST_START_JOB', 'PROXY_RESOLUTION_SERVICE', 'PROXY_RESOLUTION_SERVICE_RESOLVED_PROXY_LIST',
  'HOST_RESOLVER_MANAGER_REQUEST', 'HOST_RESOLVER_MANAGER_JOB', 'HOST_RESOLVER_SYSTEM_TASK',
  'HOST_RESOLVER_DNS_TASK', 'DNS_TRANSACTION', 'DNS_TRANSACTION_QUERY', 'DNS_TRANSACTION_RESPONSE',
  'TCP_CONNECT', 'TCP_CONNECT_ATTEMPT', 'SSL_CONNECT', 'SSL_HANDSHAKE_ERROR',
  'HTTP_STREAM_REQUEST', 'HTTP_STREAM_JOB', 'HTTP_STREAM_JOB_INIT_CONNECTION',
  'HTTP_TRANSACTION_SEND_REQUEST', 'HTTP_TRANSACTION_SEND_REQUEST_HEADERS',
  'HTTP_TRANSACTION_READ_HEADERS', 'HTTP_TRANSACTION_READ_RESPONSE_HEADERS',
  'HTTP2_SESSION_SEND_HEADERS', 'HTTP2_SESSION_RECV_HEADERS', 'HTTP2_SESSION_CLOSE',
  'QUIC_SESSION', 'QUIC_SESSION_CRYPTO_HANDSHAKE_MESSAGE_SENT', 'QUIC_SESSION_CRYPTO_HANDSHAKE_MESSAGE_RECEIVED',
]);
function endpoint(value) {
  if (typeof value !== 'string') return null;
  const ip = value.replace(/^\[([^\]]+)\](?::\d+)?$/, '$1').replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, '$1');
  return isIP(ip) ? value : null;
}
function dependencyIds(value, result = [], depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return result;
  for (const [key, item] of Object.entries(value)) {
    if (/dependency/.test(key) && Number.isInteger(item?.id)) result.push(item.id);
    else if (item && typeof item === 'object') dependencyIds(item, result, depth + 1);
  }
  return result;
}

// Never return arbitrary params, headers, URLs, request bodies, or client configuration.
export function summarizeStartupNetwork(data, { origin = 'https://chatgpt.com' } = {}) {
  const types = Object.fromEntries(Object.entries(data.constants?.logEventTypes ?? {}).map(([k, v]) => [v, k]));
  const events = data.events ?? [], roots = new Set(), graph = new Map();
  for (const e of events) {
    const id = e.source?.id;
    if (!Number.isInteger(id)) continue;
    if (types[e.type] === 'URL_REQUEST_START_JOB') {
      try { const u = new URL(e.params?.url); if (u.origin === origin && ['/', '/auth/login'].includes(u.pathname)) roots.add(id); } catch {}
    }
    for (const other of dependencyIds(e.params)) {
      if (!graph.has(id)) graph.set(id, new Set());
      if (!graph.has(other)) graph.set(other, new Set());
      graph.get(id).add(other); graph.get(other).add(id);
    }
  }
  const connected = new Set(roots), queue = [...roots];
  for (let i = 0; i < queue.length; i++) for (const other of graph.get(queue[i]) ?? []) {
    if (!connected.has(other)) { connected.add(other); queue.push(other); }
  }
  const firstTime = events.map(e => Number(e.time)).find(Number.isFinite) ?? 0;
  const selected = [];
  for (const e of events) {
    const stage = types[e.type], time = Number(e.time);
    if (!STAGES.has(stage) || !connected.has(e.source?.id) || !Number.isFinite(time)) continue;
    const p = e.params ?? {}, entry = { tMs: time - firstTime, stage, source: e.source.id,
      phase: ({ 0: 'point', 1: 'begin', 2: 'end' })[e.phase] ?? 'unknown' };
    if (Number.isInteger(p.net_error)) entry.netError = p.net_error;
    const addresses = [p.address, p.remote_endpoint, p.remote_address, ...(Array.isArray(p.address_list) ? p.address_list : []),
      ...(Array.isArray(p.addresses) ? p.addresses : [])].map(endpoint).filter(Boolean);
    if (addresses.length) entry.addresses = [...new Set(addresses)].slice(0, 8);
    if (Array.isArray(p.headers)) {
      const status = p.headers.map(h => typeof h === 'string' ? h.match(/^(?:HTTP\/[\d.]+\s+|:status:\s*)(\d{3})(?:\s|$)/i)?.[1] : null).find(Boolean);
      if (status) entry.status = Number(status);
    }
    if (['h2', 'h3', 'http/1.1'].includes(p.negotiated_protocol)) entry.protocol = p.negotiated_protocol;
    selected.push(entry);
  }
  const retained = selected.length <= 160 ? selected : [...selected.slice(0, 120), ...selected.slice(-40)];
  return { state: 'complete', timeOrigin: 'first-netlog-event', matchedRequests: roots.size,
    eventsOmitted: selected.length - retained.length, events: retained };
}
async function within(promise, ms) {
  let timer;
  try { return await Promise.race([promise.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), ms); })]); }
  finally { clearTimeout(timer); }
}

export class StartupNetworkTrace {
  constructor(netLog, file, { durationMs = 125000, startWaitMs = 1000, maxBytes = 4 * 1024 * 1024, sizePollMs = 250, origin } = {}) {
    Object.assign(this, { netLog, file, durationMs, startWaitMs, maxBytes, sizePollMs, origin });
    this.summary = { state: 'idle' }; this.owned = false;
  }
  async start() {
    if (this.starting || this.summary.state !== 'idle') return;
    if (!this.netLog || this.netLog.currentlyLogging) {
      this.summary = { state: 'unavailable', reason: 'netlog-unavailable-or-busy' }; return;
    }
    this.startedAt = new Date().toISOString();
    this.summary = { state: 'starting', startedAt: this.startedAt };
    this.starting = (async () => {
      await fs.writeFile(this.file, '', { mode: 0o600 });
      // Chromium's bounded exporter needs a scratch directory unavailable in the
      // sandboxed network service. Keep the sandbox and enforce limits here.
      await this.netLog.startLogging(this.file, { captureMode: 'default' });
      this.owned = true; this.summary = { state: 'recording', startedAt: this.startedAt };
    })().catch(() => { this.summary = { state: 'unavailable', reason: 'start-failed' }; });
    if (!await within(this.starting, this.startWaitMs)) { void this.finish('start-pending'); return; }
    if (this.owned && !this.stopping) {
      this.timer = setTimeout(() => { void this.finish('capture-limit'); }, this.durationMs); this.timer.unref?.();
      this.sizeTimer = setInterval(async () => {
        if (this.checkingSize || this.stopping) return;
        this.checkingSize = true;
        try { if ((await fs.stat(this.file)).size >= this.maxBytes) void this.finish('size-limit'); }
        catch { /* File can disappear during finish. */ }
        finally { this.checkingSize = false; }
      }, this.sizePollMs);
      this.sizeTimer.unref?.();
    }
    else await fs.rm(this.file, { force: true }).catch(() => {});
  }
  finish(reason = 'report-requested') {
    if (this.stopping) return this.stopping;
    if (!this.starting) return Promise.resolve(this.summary);
    clearTimeout(this.timer); clearInterval(this.sizeTimer);
    this.stopping = (async () => {
      try {
        await this.starting;
        if (!this.owned) return this.summary;
        await this.netLog.stopLogging(); this.owned = false;
        const info = await fs.stat(this.file);
        if (info.size > 8 * 1024 * 1024) throw new Error('Oversized trace');
        const data = JSON.parse(await fs.readFile(this.file, 'utf8'));
        this.summary = { ...summarizeStartupNetwork(data, { origin: this.origin }), startedAt: this.startedAt, stopReason: reason };
      } catch { this.summary = { state: 'unavailable', reason: 'capture-incomplete', startedAt: this.startedAt }; }
      finally { await fs.rm(this.file, { force: true }).catch(() => {}); }
      return this.summary;
    })();
    return this.stopping;
  }
  async snapshot() {
    await within(this.finish(), 2000);
    return structuredClone(this.summary);
  }
}
