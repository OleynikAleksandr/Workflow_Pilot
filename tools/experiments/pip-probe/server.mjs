import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {registerAppTool, registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {build} from 'esbuild';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
export async function buildProbeResources() {
  const resources = [];
  for (const kind of ['plan', 'dialogue']) {
    const bundled = await build({
      stdin: {
        contents: `import {App} from '@modelcontextprotocol/ext-apps';
          import {mountProbe} from './view.mjs';
          const app=new App({name:'PiP probe ${kind}',version:'1.3.0'},
            ${JSON.stringify(kind === 'dialogue' ? {} : {availableDisplayModes: ['inline', 'fullscreen']})});
          const view=mountProbe({app,document,kind:${JSON.stringify(kind)}});
          view.start().catch(()=>{document.getElementById('connection').textContent='SDK не подключён';});`,
        resolveDir: directory, sourcefile: 'probe-entry.mjs',
      },
      bundle: true, write: false, format: 'iife', platform: 'browser', target: 'chrome120',
    });
    const title = kind === 'plan' ? 'Тестовая панель плана' : 'Тестовая переписка · PiP';
    const script = bundled.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    const html = `<!doctype html><html lang="ru"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
      <style>:root{color-scheme:light dark}body{font:15px system-ui;margin:16px}
      h1{font-size:19px}p{line-height:1.5}dl{display:grid;grid-template-columns:auto 1fr;gap:8px}
      dd{margin:0;overflow-wrap:anywhere}button{font:inherit;padding:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:260px;overflow:auto}</style>
      <h1>${title}</h1><p>Изолированный опыт. Это тестовые данные, не рабочий план и не сообщения агентов.</p>
      ${kind === 'dialogue' ? '<p>Опыт 0.5.16: PiP по кнопке. Начальное представление — только площадка запуска, а не успешный PiP. Автоматических запросов нет.</p>' : ''}
      <dl><dt>Начальный режим</dt><dd id="initial">ожидается</dd>
      <dt>Режим</dt><dd id="actual">ожидается</dd><dt>Доступны</dt><dd id="available">ожидается</dd>
      <dt>Готовность</dt><dd id="ready">ожидаем результат инструмента</dd>
      <dt>Совместимый API</dt><dd id="compat">ожидается</dd><dt>Режим window.openai</dt><dd id="compat-mode">ожидается</dd>
      <dt>Время сервера</dt><dd id="clock">—</dd><dt>Секунд работы</dt><dd id="tick">0</dd>
      <dt>Обновлений окна</dt><dd id="count">0</dd></dl>
      <p id="connection">Подключаем SDK…</p><p id="request"></p>
      <button id="pip" disabled>1. Запросить PiP через MCP</button>
      <button id="pip-compat" disabled>2. Запросить PiP через window.openai</button>
      <p>Нажимайте по одной кнопке. Второй путь — отдельный опыт, только если API доступен. Другие режимы не запрашиваются.</p>
      <details open><summary>Диагностика режима (последние 50 событий)</summary><pre id="diagnostics"></pre></details>
      <p>Закройте только окно переписки и проверьте, что счётчик основной панели продолжает расти.</p>
      <script>${script}</script></html>`;
    const uri = `ui://workflow-pilot-probe/${kind}-${createHash('sha256').update(html).digest('hex')}.html`;
    resources.push({kind, title, uri, html});
  }
  return resources;
}
export async function createProbeServer() {
  const server = new McpServer({name: 'Workflow Pilot isolated PiP probe', version: '1.0.0'});
  const started = Date.now(), instance = randomUUID();
  registerAppTool(server, 'pip_probe_status', {
    description: 'Synthetic clock only. No project, agent, permission or message data.',
    inputSchema: {},
    annotations: {readOnlyHint: true, destructiveHint: false, openWorldHint: false},
    _meta: {ui: {visibility: ['app']}},
  }, async () => ({
    content: [],
    structuredContent: {synthetic: true, instance, serverTime: new Date().toISOString(),
      tick: Math.floor((Date.now() - started) / 1000)},
  }));
  for (const {kind, title, uri, html} of await buildProbeResources()) {
    registerAppResource(server, `pip_probe_${kind}`, uri, {}, async () => ({contents: [{
      uri, mimeType: RESOURCE_MIME_TYPE, text: html,
      _meta: {
        ui: {csp: {connectDomains: [], resourceDomains: []}},
        ...(kind === 'plan' ? {'openai/ui': {availableDisplayModes: ['inline', 'fullscreen'],
          preferredDisplayMode: 'inline'}} : {}),
      },
    }]}));
    registerAppTool(server, `pip_probe_open_${kind}`, {
      title,
      description: kind === 'plan'
        ? 'Open the isolated plan placeholder first. Keep it visible for the two-view experiment.'
        : 'Open a passive PiP experiment. Wait for the tool result, then ask the user to press the MCP PiP button. No automatic mode change. Do not claim coexistence until visually confirmed.',
      inputSchema: {},
      annotations: {readOnlyHint: true, destructiveHint: false, openWorldHint: false},
      _meta: {ui: {resourceUri: uri}, ...(kind === 'plan'
        ? {'openai/ui': {preferredModelDisplayMode: 'inline'}} : {})},
    }, async () => ({structuredContent: {synthetic: true, kind, probeVersion: '1.3.0'},
      content: [{type: 'text', text: `${title}: открыта площадка запуска. Для PiP пользователь нажимает кнопку; режим и совместная видимость ещё не подтверждены.`}]}));
  }
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createProbeServer();
  await server.connect(new StdioServerTransport());
}
