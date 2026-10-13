import { RuntimeError } from '../../contracts/errors.mjs';
const REQUIRED_TOOLS = ['bridge_status'];

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
      capabilities: {}, clientInfo: { name: 'Workflow Pilot', version: '0.1.0' } });
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
