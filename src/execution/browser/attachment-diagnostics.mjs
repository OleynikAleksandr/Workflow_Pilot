// Metadata only: never retain URLs, headers, filenames or response bodies.
function stageOf(request) {
  try {
    const url = new URL(request?.url);
    if (url.protocol !== 'https:') return null;
    if (url.hostname === 'chatgpt.com' && request.method === 'POST') {
      if (url.pathname === '/backend-api/files') return 'create';
      if (/^\/backend-api\/files\/[^/]+$/.test(url.pathname)) return 'processing';
    }
    if (request.method === 'PUT' && (url.hostname === 'files.oaiusercontent.com'
      || url.hostname.endsWith('.oaiusercontent.com'))) return 'upload';
  } catch {}
  return null;
}

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export class AttachmentDiagnostics {
  constructor(record, { now = () => performance.now(), maxRequests = 256 } = {}) {
    this.record = record;
    this.now = now;
    this.maxRequests = Math.max(1, Math.min(256, maxRequests));
    this.requests = new Map();
    this.timer = null;
  }

  start() {
    if (!this.timer) this.timer = setInterval(() => this.sweep(), 15000);
    this.timer.unref?.();
  }

  emit(event, item, extra = {}) {
    const now = this.now();
    this.record(event, { requestId: item.id, stage: item.stage, status: item.status,
      stream: item.stream, elapsedMs: Math.round(now - item.started),
      idleMs: Math.round(now - item.progress), chunks: item.chunks, bytes: item.bytes, ...extra });
  }

  observe(method, params = {}) {
    const id = params.requestId;
    if (typeof id !== 'string' || id.length > 128) return;
    const now = this.now();
    if (method === 'Network.requestWillBeSent') {
      const stage = stageOf(params.request);
      if (this.requests.has(id)) {
        this.emit('replaced', this.requests.get(id));
        this.requests.delete(id);
      }
      if (!stage) return;
      if (this.requests.size >= this.maxRequests) {
        const oldest = this.requests.values().next().value;
        this.emit('evicted', oldest);
        this.requests.delete(oldest.id);
      }
      const item = { id, stage, started: now, progress: now, reported: now,
        status: null, stream: false, chunks: 0, bytes: 0, stalled: false };
      this.requests.set(id, item);
      this.emit('started', item);
      return;
    }
    const item = this.requests.get(id);
    if (!item) return;
    if (method === 'Network.responseReceived' || method === 'Network.dataReceived') {
      const resumed = item.stalled;
      item.progress = now;
      item.stalled = false;
      if (method === 'Network.responseReceived') {
        item.status = count(params.response?.status);
        item.stream = params.response?.mimeType === 'text/event-stream';
        this.emit('response', item);
      } else {
        item.chunks++;
        item.bytes = Math.min(Number.MAX_SAFE_INTEGER, item.bytes + count(params.dataLength));
        if (resumed || item.chunks === 1 || now - item.reported >= 15000) {
          this.emit(resumed ? 'resumed' : 'progress', item);
          item.reported = now;
        }
      }
    } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
      this.emit(method.endsWith('Finished') ? 'finished' : 'failed', item,
        { encodedBytes: count(params.encodedDataLength), canceled: params.canceled === true });
      this.requests.delete(id);
    }
  }

  sweep() {
    const now = this.now();
    for (const item of this.requests.values()) {
      if (now - item.started >= 600000) {
        this.emit('expired', item);
        this.requests.delete(item.id);
      } else if (now - item.progress >= 30000 && (!item.stalled || now - item.reported >= 30000)) {
        item.stalled = true;
        item.reported = now;
        this.emit('no-progress', item);
      }
    }
  }

  clear(reason) {
    const boundary = ['navigation', 'detached', 'renderer-gone', 'closed'].includes(reason) ? reason : 'closed';
    for (const item of this.requests.values()) this.emit('observation-ended', item, { boundary });
    this.requests.clear();
    clearInterval(this.timer);
    this.timer = null;
  }
}
