import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { settingsPanelView } from '../src/frontend/desktop/ui/settings-panel.mjs';

async function fixture(t) {
  const dom = new JSDOM(await fs.readFile(new URL('../src/frontend/desktop/ui/index.html', import.meta.url), 'utf8'));
  const before = globalThis.document; globalThis.document = dom.window.document;
  t.after(() => { globalThis.document = before; dom.window.close(); });
  const calls = [], view = settingsPanelView((...args) => calls.push(args));
  return { view, calls, $: id => dom.window.document.getElementById(id) };
}

const vpsReady = { configured: true, ready: true, running: true, conflict: false, portMatches: true,
  mcpPort: 17852, forwardPort: 17852, lastError: null, error: null, connector: 'https://vps.example/mcp/…/mcp' };
function state({ platform = 'darwin', channel = 'secure-tunnel', tunnelReady = true, vps = vpsReady } = {}) {
  return { platform, projects: [{ workspace: '/one', name: 'Первый' }], selected: { workspace: '/one' },
    settings: { workspace: '/one' }, context: {}, archives: [], hideToolCalls: true, theme: 'light',
    localRuntime: { label: 'Workflow Pilot Local Mac', chatgptChannel: channel,
      service: { mcpReady: true, tunnelReady, tunnelConfigured: true }, vps } };
}

test('ChatGPT channel section sits under the macOS runtime status and switches channels', async t => {
  const f = await fixture(t);
  f.view.render(state(), false);
  const section = f.$('chatgpt-channel-section');
  assert.equal(section.hidden, false);
  assert.equal(f.$('local-runtime-section').nextElementSibling, section);
  assert.equal(f.$('chatgpt-channel-secure').getAttribute('aria-pressed'), 'true');
  assert.equal(f.$('chatgpt-channel-vps').getAttribute('aria-pressed'), 'false');
  assert.equal(f.$('chatgpt-channel-vps').disabled, false);
  assert.match(f.$('chatgpt-channel-status').textContent, /Secure MCP Tunnel\. Туннель готов/);
  assert.equal(f.$('local-runtime-status').textContent, 'Workflow Pilot Local Mac: MCP и Secure MCP Tunnel готовы.');
  // One backend: nothing to switch and no second runtime to name.
  assert.equal(f.$('mac-runtime-local'), null);
  assert.equal(f.$('mac-runtime-app-server'), null);
  assert.doesNotMatch(f.$('local-runtime-section').textContent, /Codex Local Mac/);
  assert.match(f.$('chatgpt-channel-hint').textContent, /включите плагин Secure MCP Tunnel/);
  assert.equal(f.$('vps-status').textContent, 'Туннель VPS работает: сервер → MCP на порту 17852.');
  assert.equal(f.$('vps-status').dataset.ready, 'true');
  assert.equal(f.$('vps-connector').hidden, false);
  assert.equal(f.$('vps-connector-url').textContent, 'https://vps.example/mcp/…/mcp');

  f.$('chatgpt-channel-vps').click();
  f.$('vps-connector-copy').click();
  f.$('chatgpt-channel-refresh').click();
  f.$('chatgpt-channel-secure').click();
  assert.deepEqual(f.calls, [['setChatgptChannel', 'vps'], ['copyVpsConnectorUrl'], ['refreshChatgptChannel'], ['setChatgptChannel', 'secure-tunnel']]);

  f.view.render(state({ channel: 'vps' }), false);
  assert.equal(f.$('chatgpt-channel-vps').getAttribute('aria-pressed'), 'true');
  assert.match(f.$('chatgpt-channel-status').textContent, /через VPS\. Канал готов/);
  assert.match(f.$('local-runtime-status').textContent, /MCP и канал VPS готовы/);
  assert.match(f.$('chatgpt-channel-hint').textContent, /включите плагин с адресом своего сервера/);

  f.view.render(state(), true);
  for (const id of ['chatgpt-channel-secure', 'chatgpt-channel-vps', 'chatgpt-channel-refresh', 'vps-connector-copy']) assert.equal(f.$(id).disabled, true, id);
});

test('VPS cannot be chosen until its tunnel works, and the reason is shown', async t => {
  const f = await fixture(t);
  const cases = [
    [null, /ещё не проверено/],
    [{ ...vpsReady, configured: false, ready: false, running: false, connector: null }, /^Свой VPS не настроен\. Требуется собственный маршрут/],
    [{ ...vpsReady, conflict: true, ready: false }, /RemoteForward/],
    [{ ...vpsReady, ready: false, portMatches: false, forwardPort: 17842 }, /ведёт на порт 17842, а MCP работает на 17852/],
    [{ ...vpsReady, ready: false, running: false, lastError: { message: 'Connection refused', at: '2026-10-04T10:00:00.000Z' } }, /не запущен\. Последняя ошибка .*Connection refused/],
    [{ ...vpsReady, ready: false, running: false, error: 'launchctl недоступен' }, /Туннель VPS: launchctl недоступен/],
  ];
  for (const [vps, text] of cases) {
    f.view.render(state({ vps }), false);
    assert.equal(f.$('chatgpt-channel-vps').disabled, true);
    assert.match(f.$('vps-status').textContent, text);
    assert.equal(f.$('vps-status').dataset.ready, 'false');
  }
  assert.equal(f.$('vps-connector').hidden, false);
  f.view.render(state({ vps: { ...vpsReady, connector: null, ready: false, running: false } }), false);
  assert.equal(f.$('vps-connector').hidden, true);

  // While VPS is selected the user can always return to the Secure Tunnel.
  f.view.render(state({ channel: 'vps', tunnelReady: false, vps: { ...vpsReady, ready: false, running: false } }), false);
  assert.equal(f.$('chatgpt-channel-secure').disabled, false);
  assert.equal(f.$('chatgpt-channel-vps').disabled, false);
  assert.match(f.$('chatgpt-channel-status').textContent, /Выбран VPS\. Канал ещё не готов/);
});

test('Windows shows the same two sections: local tools and the ChatGPT channel with the VPS button that needs a working server', async t => {
  const f = await fixture(t);
  f.view.render(state(), false);
  assert.equal(f.$('local-runtime-title').textContent, 'Локальные инструменты macOS');
  assert.match(f.$('local-runtime-help').textContent, /при входе в macOS/);
  const windows = (extra = {}) => ({ ...state({ platform: 'win32' }), localRuntime: { label: 'Workflow Pilot Local Windows', chatgptChannel: 'secure-tunnel',
    service: { mcpReady: true, tunnelReady: true, tunnelConfigured: true }, vps: vpsReady, ...extra } });
  f.view.render(windows(), false);
  assert.equal(f.$('local-runtime-section').hidden, false);
  assert.equal(f.$('local-runtime-title').textContent, 'Локальные инструменты Windows');
  assert.equal(f.$('local-runtime-status').textContent, 'Workflow Pilot Local Windows: MCP и Secure MCP Tunnel готовы.');
  assert.match(f.$('local-runtime-help').textContent, /при входе в Windows/);
  assert.equal(f.$('chatgpt-channel-section').hidden, false, 'the same channel section as on macOS');
  assert.equal(f.$('chatgpt-channel-secure').getAttribute('aria-pressed'), 'true');
  assert.equal(f.$('chatgpt-channel-vps').disabled, false);
  assert.equal(f.$('vps-status').textContent, 'Туннель VPS работает: сервер → MCP на порту 17852.');
  f.$('chatgpt-channel-vps').click();
  assert.deepEqual(f.calls.at(-1), ['setChatgptChannel', 'vps']);

  // A server that is not set up on this computer cannot be chosen; the tunnel of OpenAI stays the channel.
  f.view.render(windows({ vps: { ...vpsReady, configured: false, ready: false, running: false, connector: null } }), false);
  assert.equal(f.$('chatgpt-channel-vps').disabled, true);
  assert.equal(f.$('chatgpt-channel-secure').disabled, false);
  assert.match(f.$('vps-status').textContent, /^Свой VPS не настроен\. Требуется собственный маршрут/);
  f.view.render(windows({ vps: null }), false);
  assert.equal(f.$('chatgpt-channel-vps').disabled, true, 'an unknown state is not a working server');
  f.view.render(windows({ chatgptChannel: 'vps', vps: { ...vpsReady, ready: false, running: false } }), false);
  assert.equal(f.$('chatgpt-channel-vps').disabled, false, 'the selected channel stays visible as selected');
  assert.equal(f.$('chatgpt-channel-secure').disabled, false, 'switching back is always possible');

  f.view.render({ ...state({ platform: 'win32' }), localRuntime: null }, false);
  assert.equal(f.$('local-runtime-status').textContent, 'Workflow Pilot Local Windows: службы ещё не подтвердили полную готовность.');
  for (const id of ['windows-runtime-section', 'configure-windows-tunnel', 'refresh-windows-runtime'])
    assert.equal(f.$(id), null, 'nothing of the previous Windows runtime is left in the settings: ' + id);
  f.view.render({ ...state({ platform: 'linux' }), localRuntime: null }, false);
  assert.equal(f.$('local-runtime-section').hidden, true);
  assert.equal(f.$('chatgpt-channel-section').hidden, true);
});
