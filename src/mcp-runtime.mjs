import { createHash } from 'node:crypto';

// The executor catalogue carries tools only; Web Pilot recognises its own server by the status tool.
const REQUIRED_TOOLS = ['bridge_status'];
export const CONTEXT_PROTOCOL = 'inline-context-v1';

export class RuntimeError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function validateContextPacket(packet, workspace) {
  if (packet?.delivery_protocol !== CONTEXT_PROTOCOL || packet.ack_required !== false) {
    throw new RuntimeError('MCP_UPDATE_REQUIRED', 'Нужна обновлённая версия локальных инструментов с прямой передачей контекста.');
  }
  if (packet.workspace !== workspace) throw new RuntimeError('MCP_CONTEXT_MISMATCH', 'Получен контекст другой папки.');
  const facts = packet.facts;
  const factNames = ['project_id', 'project_name', 'plan_revision', 'scope_id', 'execution_scope_status', 'delivery_status', 'task_id', 'task_title'];
  if (packet.status !== 'ready' || packet.completeness !== 'COMPLETE' || typeof packet.context !== 'string'
      || !packet.context.trim() || typeof packet.signature !== 'string' || !packet.signature
      || !facts || factNames.some(key => !(key in facts)) || Object.keys(facts).length !== factNames.length
      || typeof facts.project_id !== 'string' || !facts.project_id || typeof facts.project_name !== 'string'
      || !Number.isSafeInteger(facts.plan_revision) || facts.plan_revision < 0
      || !Number.isFinite(packet.generated_at_ms) || ['probe_id', 'challenge'].some(key => key in packet)) {
    throw new RuntimeError('MCP_CONTEXT_INCOMPLETE', 'Получен неполный пакет контекста.');
  }
  const bytes = Buffer.byteLength(packet.context, 'utf8');
  if (bytes > 180000) throw new RuntimeError('MCP_CONTEXT_TOO_LARGE', 'Пакет контекста слишком велик. Нужно уменьшить его состав в Workflow Kit.');
  if (bytes !== packet.context_bytes || createHash('sha256').update(packet.context, 'utf8').digest('hex') !== packet.context_sha256) {
    throw new RuntimeError('MCP_CONTEXT_DAMAGED', 'Полный текст контекста не прошёл проверку целостности.');
  }
  const parts = packet.parts, limit = packet.budget?.document_bytes ?? 28000;
  if (!Number.isSafeInteger(limit) || limit < 1 || !Array.isArray(parts) || !parts.length)
    throw new RuntimeError('MCP_UPDATE_REQUIRED', 'Workflow Kit должен подготовить части контекста для вложений.');
  if (parts.some((part, index) => typeof part.text !== 'string' || part.index !== index + 1
      || part.total !== parts.length || Buffer.byteLength(part.text, 'utf8') !== part.bytes
      || part.bytes > limit || createHash('sha256').update(part.text, 'utf8').digest('hex') !== part.sha256)
      || parts.map(part => part.text).join('\n\n') !== packet.context)
    throw new RuntimeError('MCP_CONTEXT_DAMAGED', 'Части контекста не прошли проверку состава, размера или целостности.');
  return packet;
}

export function validateEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new RuntimeError('MCP_URL_INVALID', 'Неверный адрес локальных инструментов.'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/mcp'
      || url.username || url.password || url.search || url.hash) {
    throw new RuntimeError('MCP_URL_INVALID', 'Инструменты должны быть доступны локально на этом компьютере.');
  }
  return url.href;
}

async function responseMessage(response, id) {
  if (response.status === 202 || response.status === 204) return null;
  if (!response.ok) {
    await response.body?.cancel();
    throw new RuntimeError('MCP_HTTP_ERROR', `Локальный MCP вернул HTTP ${response.status}.`);
  }
  const sse = (response.headers.get('content-type') ?? '').includes('text/event-stream');
  if (!response.body) throw new RuntimeError('MCP_EMPTY_RESPONSE', 'MCP вернул пустой ответ.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) { bytes += value.byteLength; buffer += decoder.decode(value, { stream: !done }); }
      if (bytes > 2 * 1024 * 1024) throw new RuntimeError('MCP_RESPONSE_TOO_LARGE', 'Ответ MCP превышает допустимый размер.');
      if (sse) {
        buffer = buffer.replace(/\r\n/g, '\n');
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          const message = JSON.parse(data);
          if (message.id === id) return message;
        }
      } else if (done) {
        const message = JSON.parse(buffer);
        if (message.id !== id) throw new RuntimeError('MCP_ID_MISMATCH', 'MCP вернул ответ другой операции.');
        return message;
      }
      if (done) throw new RuntimeError('MCP_RESPONSE_MISSING', 'MCP закрыл соединение без ответа.');
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export class LocalMcpClient {
  // expectedServerName is the backend of this platform: another MCP server on the same local port is refused.
  constructor(endpoint, { fetchImpl = globalThis.fetch, timeoutMs = 10000, expectedServerName, requiredTools = REQUIRED_TOOLS } = {}) {
    if (typeof expectedServerName !== 'string' || !expectedServerName) throw new TypeError('LocalMcpClient requires expectedServerName');
    this.requiredTools = [...requiredTools];
    this.endpoint = validateEndpoint(endpoint);
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.expectedServerName = expectedServerName;
    this.sessionId = null;
    this.protocolVersion = '2025-03-26';
    this.sequence = 0;
    this.ready = null;
  }

  async request(method, params = {}) {
    // The shell only checks that its own server answers: it never calls a tool. The tools belong to the model.
    if (!['initialize', 'notifications/initialized', 'tools/list'].includes(method)) {
      throw new RuntimeError('MCP_READ_ONLY', 'Оболочка только проверяет локальные инструменты и не вызывает их.');
    }
    const notification = method.startsWith('notifications/');
    const id = notification ? undefined : ++this.sequence;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    if (method !== 'initialize') headers['MCP-Protocol-Version'] = this.protocolVersion;
    let response;
    try {
      response = await this.fetch(this.endpoint, { method: 'POST', headers,
        body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, params }),
        signal: AbortSignal.timeout(this.timeoutMs), redirect: 'error' });
      if (method === 'initialize') this.sessionId = response.headers.get('mcp-session-id');
      const message = await responseMessage(response, id);
      if (message?.error) throw new RuntimeError('MCP_RPC_ERROR', String(message.error.message ?? 'Ошибка MCP.'));
      return message?.result ?? null;
    } catch (error) {
      if (error instanceof RuntimeError) throw error;
      throw new RuntimeError('MCP_UNAVAILABLE', 'Не удалось связаться с локальными инструментами. Проверьте подключение.');
    }
  }

  async initialize() {
    if (this.ready) return this.ready;
    const init = await this.request('initialize', { protocolVersion: this.protocolVersion,
      capabilities: {}, clientInfo: { name: 'Workflow Pilot', version: '0.2.0' } });
    if (init?.serverInfo?.name !== this.expectedServerName) {
      throw new RuntimeError('MCP_SERVER_MISMATCH', 'Локальный адрес занят другим MCP-сервером.');
    }
    this.protocolVersion = init.protocolVersion;
    await this.request('notifications/initialized');
    const names = [];
    let cursor;
    for (let page = 0; page < 8; page++) {
      const result = await this.request('tools/list', cursor ? { cursor } : {});
      if (!Array.isArray(result?.tools)) throw new RuntimeError('MCP_TOOLS_INVALID', 'MCP не вернул список инструментов.');
      names.push(...result.tools.map(tool => tool.name));
      cursor = result.nextCursor;
      if (!cursor) break;
    }
    const missing = this.requiredTools.filter(name => !names.includes(name));
    if (missing.length) {
      throw new RuntimeError('MCP_TOOLS_MISSING', 'В подключении отсутствуют: ' + missing.join(', ') + '. Нужен актуальный MCP.');
    }
    this.ready = { serverName: init.serverInfo.name, toolCount: names.length, protocolVersion: this.protocolVersion };
    return this.ready;
  }
}
