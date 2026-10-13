import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { TunnelClipboard } from '../src/tunnel-clipboard.mjs';
import { StartupReadiness } from '../src/startup-readiness.mjs';
import { createStartupView } from '../src/frontend/desktop/ui/startup.mjs';
async function fixture(t, startup = {}) {
  const html = await fs.readFile(new URL('../src/frontend/desktop/ui/index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'https://fixture.invalid/' });
  t.after(() => dom.window.close());
  const document = dom.window.document, calls = [];
  let state = { startup: { active: true, phase: 'git', node: true, git: false, runtime: false,
    tunnel: false, busy: false, account: 'signed-out', page: 'loaded', ...startup } };
  const api = {
    startup: async action => { calls.push(action); return { ok: true, state }; },
    chooseWorkspace: async () => { calls.push('chooseWorkspace'); return { ok: true, state: { ...state, setup: { phase: 'preview', mode: 'existing' } } }; },
    beginCreate: async () => { calls.push('beginCreate'); return { ok: true, state: { ...state, setup: { phase: 'form' } } }; },
  };
  const view = createStartupView({ document, api });
  const emit = patch => { state = { ...state, startup: { ...state.startup, ...patch } }; view.render(state); };
  view.render(state);
  return { document, api, calls, emit, render: view.render, settle: () => new Promise(r => setImmediate(r)) };
}
test('new account route is explicit and cannot pass as authenticated guest chat', async t => {
  const f = await fixture(t);
  assert.equal(f.document.querySelector('#startup-panel').hidden, false);
  const signup = f.document.querySelector('[data-startup=signup]');
  assert.match(signup.textContent, /нет аккаунта/); signup.click(); await f.settle();
  assert.deepEqual(f.calls, [], 'explaining registration must not reload an already visible login page');
  assert.equal(f.document.querySelector('#startup-signup-help').hidden, false);
  assert.equal(f.document.querySelector('#startup-continue').disabled, true);
  assert.equal(f.document.querySelector('#startup-project-body').hidden, true);
});
test('pending first connection cannot be restarted but final failure can be retried', async t => {
  const f = await fixture(t, { page: 'slow', busy: true, account: 'unknown' });
  assert.match(f.document.querySelector('#startup-account-status').textContent, /двух минут/);
  const button = f.document.querySelector('[data-startup=chat]');
  assert.equal(button.disabled, true); button.click(); await f.settle();
  assert.deepEqual(f.calls, []);
  assert.equal(f.document.querySelector('#startup-copy-diagnostics').disabled, false);
  f.emit({ page: 'failed', pageError: 'PAGE_RESPONSE_TIMEOUT' });
  assert.match(f.document.querySelector('#startup-account-status').textContent, /не ответил за две минуты/);
  assert.equal(button.disabled, false); button.click(); await f.settle();
  assert.deepEqual(f.calls, ['chat']);
});
test('missing Apple component has one installation action and keeps later steps unavailable', async t => {
  const f = await fixture(t, { account: 'signed-in' });
  const install = f.document.querySelector('#startup-install-git');
  assert.equal(install.hidden, false); assert.equal(install.disabled, false);
  install.click(); await f.settle(); assert.deepEqual(f.calls, ['install-git']);
  assert.equal(f.document.querySelector('#startup-tunnel-body').hidden, true);
  f.emit({ phase: 'git-installing' });
  assert.equal(install.hidden, true, 'wait for system installation, then verify; do not reopen installer');
});
test('tunnel instructions include account access and never ask for a key in the renderer', async t => {
  const f = await fixture(t, { account: 'signed-in', git: true, runtime: true });
  assert.equal(f.document.querySelector('#startup-tunnel-body').hidden, false);
  assert.match(f.document.querySelector('#startup-tunnel-body').textContent, /завершите регистрацию/);
  assert.match(f.document.querySelector('#startup-tunnel-body').textContent, /Read.*Manage/);
  assert.equal(f.document.querySelectorAll('#startup-panel input').length, 0);
  f.document.querySelector('[data-startup=paste-tunnel-id]').click(); await f.settle();
  assert.deepEqual(f.calls, ['paste-tunnel-id']);
});
test('only confirmed login and local readiness expose the first project; transition preserves setup', async t => {
  const f = await fixture(t, { account: 'unknown', git: true, runtime: true, tunnel: true });
  assert.equal(f.document.querySelector('#startup-project-body').hidden, true);
  f.emit({ account: 'signed-in' });
  assert.equal(f.document.querySelector('#startup-project-body').hidden, false);
  f.document.querySelector('#startup-continue').click(); await f.settle();
  assert.deepEqual(f.calls, ['continue', 'beginCreate']);
  assert.equal(f.document.querySelector('#startup-panel').hidden, true);
});

test('blank pages never direct the user to missing login controls and expose a copyable report', async t => {
  const f = await fixture(t, { page: 'loading', account: 'unknown' });
  for (const page of ['idle', 'loading', 'slow', 'failed', 'loaded']) {
    f.emit({ page, account: 'unknown' });
    assert.equal(f.document.querySelector('#startup-account-instructions').hidden, true);
    assert.equal(f.document.querySelector('#startup-signup').hidden, true);
    assert.equal(f.document.querySelector('#startup-account-check').hidden, true);
  }
  const copy = f.document.querySelector('#startup-copy-diagnostics');
  assert.equal(copy.hidden, false); assert.equal(copy.disabled, false);
  copy.click(); await f.settle();
  assert.deepEqual(f.calls, ['copy-diagnostics']);
  assert.equal(f.document.querySelector('#startup-diagnostics-copied').hidden, false);
  f.emit({ page: 'loaded', account: 'signed-out' });
  assert.equal(f.document.querySelector('#startup-account-instructions').hidden, false);
  assert.equal(f.document.querySelector('#startup-signup').hidden, false);
  assert.equal(f.document.querySelector('#startup-account-check').hidden, false);
  assert.equal(copy.hidden, false, 'success must still allow copying the first-request report');
});
test('specific browser error is explained and report failures never claim successful copying', async t => {
  const f = await fixture(t, { page: 'failed', account: 'unknown', pageError: 'ERR_NAME_NOT_RESOLVED' });
  assert.match(f.document.querySelector('#startup-account-status').textContent, /Не удалось найти адрес/);
  f.api.startup = async () => ({ ok: false, error: { message: 'Не удалось прочитать журнал.' } });
  f.document.querySelector('#startup-copy-diagnostics').click(); await f.settle();
  assert.equal(f.document.querySelector('#startup-diagnostics-copied').hidden, true);
  assert.match(f.document.querySelector('#startup-error').textContent, /Не удалось прочитать журнал/);
});
test('diagnostics stay available while retry is waiting for a network response', async t => {
  const f = await fixture(t, { page: 'failed', account: 'unknown' });
  let finish;
  f.api.startup = action => action === 'chat' ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ ok: true });
  f.document.querySelector('#startup-open-chat').click();
  const copy = f.document.querySelector('#startup-copy-diagnostics');
  assert.equal(copy.disabled, false); copy.click(); await f.settle();
  assert.equal(f.document.querySelector('#startup-diagnostics-copied').hidden, false);
  finish({ ok: true }); await f.settle();
});

test('loading copy remains available and a loaded unknown screen is not described as absent', async t => {
  const f = await fixture(t, { page: 'loading', account: 'unknown' });
  assert.equal(f.document.querySelector('#startup-copy-diagnostics').hidden, false);
  assert.equal(f.document.querySelector('#startup-open-chat').disabled, true);
  f.emit({ page: 'loaded' });
  assert.match(f.document.querySelector('#startup-account-status').textContent, /Страница открыта/);
  assert.equal(f.document.querySelector('#startup-open-chat').disabled, false);
});


test('Apple completion updates the actual view without another install or automatic preparation', async t => {
  const f = await fixture(t, { account: 'signed-in' });
  let installed = false, installs = 0, prepares = 0, next;
  const controller = new StartupReadiness({
    probeNode: async () => {}, probeGit: async () => installed,
    inspectRuntime: async () => ({ mcp: { ready: false } }),
    prepareRuntime: async () => { prepares++; return { mcp: { ready: true } }; },
    installGit: async () => { installs++; return { warning: 'Установка запущена, окно не удалось вывести вперёд.' }; },
    scheduleGit: fn => { next = fn; return 1; }, cancelGit: () => { next = null; },
    onChange: state => f.emit({ ...state, active: true, account: 'signed-in', page: 'loaded' }),
  });
  t.after(() => controller.dispose());
  f.api.startup = async action => {
    if (action === 'install-git') await controller.install();
    if (action === 'check') await controller.check({ prepare: true });
    return { ok: true };
  };
  await controller.check();
  const install = f.document.querySelector('#startup-install-git');
  const check = f.document.querySelector('[data-startup=check]');
  install.click(); await f.settle();
  assert.equal(installs, 1); assert.equal(install.hidden, true); assert.equal(install.disabled, true);
  assert.match(f.document.querySelector('#startup-components-help').textContent, /сам проверит/);
  install.click(); await f.settle(); assert.equal(installs, 1);
  installed = true; await next();
  assert.equal(install.hidden, true); assert.equal(install.disabled, true);
  assert.equal(f.document.querySelector('#startup-components-status').textContent, 'Компонент Apple установлен');
  assert.equal(f.document.querySelector('#startup-error').hidden, true);
  assert.equal(prepares, 0); assert.equal(check.disabled, false);
  check.click(); await f.settle();
  assert.equal(prepares, 1); assert.equal(installs, 1);
  assert.equal(f.document.querySelector('#startup-components-status').textContent, 'Компоненты готовы');
  assert.equal(f.document.querySelector('#startup-tunnel-body').hidden, false);
});
test('accepted Apple request remains protected across errors and a failed launch permits retry', async t => {
  const f = await fixture(t, { account: 'signed-in', phase: 'error', gitInstallationRequested: true });
  const install = f.document.querySelector('#startup-install-git');
  assert.equal(install.hidden, true); assert.equal(install.disabled, true);
  install.click(); await f.settle(); assert.deepEqual(f.calls, []);
  f.emit({ gitInstallationRequested: false });
  assert.equal(install.hidden, false); assert.equal(install.disabled, false);
  install.click(); await f.settle(); assert.deepEqual(f.calls, ['install-git']);
});


test('copied credentials advance the visible tunnel instructions without completion buttons', async t => {
  const f = await fixture(t, { account: 'signed-in', git: true, runtime: true });
  const create = f.document.querySelector('#startup-tunnel-create'), key = f.document.querySelector('#startup-tunnel-key');
  const input = f.document.querySelector('[data-startup=configure-tunnel]');
  assert.equal(create.hidden, false); assert.equal(key.hidden, true);
  assert.match(create.textContent, /Command\+C.*Ctrl\+C/s);
  f.emit({ clipboard: { step: 'key', hasTunnelId: true } });
  assert.equal(create.hidden, true); assert.equal(key.hidden, false); assert.equal(input.disabled, false);
  assert.match(key.textContent, /API keys/); assert.match(key.textContent, /ID уже сохранён/);
  f.emit({ clipboard: { step: 'connecting', hasTunnelId: true }, busy: true });
  assert.equal(create.hidden, true); assert.equal(key.hidden, true); assert.equal(input.disabled, true);
  f.emit({ clipboard: { step: 'key', hasTunnelId: true, error: 'Проверьте ключ.' }, busy: false });
  assert.equal(key.hidden, false); assert.equal(input.disabled, false);
  assert.equal(f.document.querySelector('#startup-error').textContent, 'Проверьте ключ.');
  input.click(); await f.settle(); assert.deepEqual(f.calls, ['configure-tunnel']);
  assert.equal(f.document.querySelectorAll('#startup-panel input').length, 0);
  f.emit({ tunnel: true, clipboard: { step: 'done' } });
  assert.equal(f.document.querySelector('#startup-tunnel-body').hidden, true);
  assert.equal(f.document.querySelector('#startup-project-body').hidden, false);
});


test('automatic step transition keeps its next instruction visible without repeated scrolling', async t => {
  const f = await fixture(t, { account: 'signed-in', git: true, runtime: true });
  const scrolled = [];
  f.document.querySelector('#startup-tunnel-progress').scrollIntoView = () => scrolled.push('key');
  f.document.querySelector('#startup-plugin-body').scrollIntoView = () => scrolled.push('plugin');
  f.emit({ clipboard: { step: 'key' } }); f.emit({ clipboard: { step: 'key' } });
  f.emit({ tunnel: true, clipboard: { step: 'done' } });
  assert.deepEqual(scrolled, ['key', 'plugin']);
  assert.equal(f.document.querySelector('#startup-tunnel-input').closest('ol'), null);
});


test('connection instructions stay visible while optional troubleshooting is collapsed', async t => {
  const f = await fixture(t, { account: 'signed-in', git: true, runtime: true, tunnel: true });
  const help = f.document.querySelector('#startup-plugin-help');
  assert.equal(help.open, false);
  assert.equal(f.document.querySelector('[data-startup=plugins]').closest('details'), null);
  assert.equal(f.document.querySelector('#startup-plugin-body').hidden, false);
  assert.equal(f.document.querySelector('#startup-continue').disabled, false);
  assert.match(f.document.querySelector('#startup-plugin-body').textContent, /повторно добавлять его не нужно/);
  f.document.querySelector('#startup-continue').click(); await f.settle();
  assert.deepEqual(f.calls, ['continue', 'beginCreate']);
});

test('Windows prepares bundled components without an Apple installation action', async t => {
  const f = await fixture(t, { platform: 'win32', account: 'signed-in' });
  const install = f.document.querySelector('#startup-install-git');
  assert.equal(install.hidden, true); assert.equal(install.disabled, true);
  install.click(); await f.settle(); assert.deepEqual(f.calls, []);
  assert.match(f.document.querySelector('#startup-components-help').textContent, /комплектные Python и Git и запустит локальный MCP/);
  assert.match(f.document.querySelector('#startup-components-help').textContent, /должен быть установлен Codex CLI/);
  assert.doesNotMatch(f.document.querySelector('#startup-components-status').textContent, /Apple/);
  f.emit({ busy: true, phase: 'preparing-components' });
  assert.match(f.document.querySelector('#startup-components-help').textContent, /профиль/);
  f.emit({ busy: false, phase: 'error', error: 'Комплект повреждён.' });
  assert.equal(f.document.querySelector('#startup-error').textContent, 'Комплект повреждён.');
  assert.equal(f.document.querySelector('[data-startup=check]').disabled, false);
  f.document.querySelector('[data-startup=check]').click(); await f.settle();
  assert.deepEqual(f.calls, ['check']);
  f.emit({ git: true, runtime: true, phase: 'tunnel', error: null });
  assert.equal(f.document.querySelector('#startup-tunnel-body').hidden, false);
});
test('Windows connection guidance is visible after tunnel startup and never claims plugin verification', async t => {
  const f = await fixture(t, { platform: 'win32', account: 'signed-in', git: true, runtime: true, tunnel: true });
  const help = f.document.querySelector('#startup-plugin-help');
  assert.equal(help.open, true);
  assert.equal(f.document.querySelector('#startup-plugin-platform').hidden, false);
  assert.match(f.document.querySelector('#startup-plugin-platform').textContent, /«Workflow Pilot Local Windows»/);
  assert.match(f.document.querySelector('#startup-plugin-platform').textContent, /«Codex Local Windows MCP» с этим же туннелем, новое подключение не нужно/);
  assert.match(f.document.querySelector('#startup-plugin-platform').textContent, /нужно проверить/);
  help.open = false; f.emit({}); assert.equal(help.open, false, 'status updates preserve a manually collapsed guide');
  f.document.querySelector('[data-startup=plugins]').click(); await f.settle();
  assert.deepEqual(f.calls, ['plugins']);
  f.render({ platform: 'win32', startup: null });
  assert.equal(f.document.querySelector('#host-platform-label').textContent, 'На вашем Windows PC');
  assert.equal(f.document.querySelector('#startup-panel').hidden, true);
  f.render({ platform: 'darwin', startup: null });
  assert.equal(f.document.querySelector('#host-platform-label').textContent, 'На вашем Mac');
});

for (const platform of ['darwin', 'win32']) test(`${platform}: ID and API key have separate actions and a visible key-page button`, async t => {
  const f = await fixture(t, { platform, account: 'signed-in', git: true, runtime: true });
  const byId = id => f.document.getElementById(id);
  const keyPage = f.document.querySelector('[data-startup=keys]');
  const paste = f.document.querySelector('[data-startup=paste-tunnel-id]');
  const manual = f.document.querySelector('[data-startup=configure-tunnel]');
  assert.equal(byId('startup-tunnel-input').hidden, true);
  assert.equal(manual.disabled, true);
  manual.click(); await f.settle(); assert.deepEqual(f.calls, []);
  paste.click(); await f.settle(); assert.deepEqual(f.calls, ['paste-tunnel-id']);
  f.emit({ clipboard: { step: 'key', hasTunnelId: true } });
  assert.equal(byId('startup-tunnel-create').hidden, true);
  assert.equal(byId('startup-tunnel-key').hidden, false);
  assert.equal(byId('startup-tunnel-input').hidden, false);
  assert.equal(paste.disabled, true);
  assert.equal(keyPage.closest('details'), null, 'key page must not be hidden in a disclosure');
  assert.equal(keyPage.closest('li'), byId('startup-tunnel-key'));
  assert.match(byId('startup-tunnel-key').textContent, /Create new secret key/);
  assert.match(byId('startup-tunnel-key').textContent, /весь секретный ключ sk-/);
  assert.match(byId('startup-tunnel-key').textContent, /Ввести API key.*Command\+V.*Ctrl\+V/s);
  keyPage.click(); await f.settle();
  manual.click(); await f.settle();
  assert.deepEqual(f.calls, ['paste-tunnel-id', 'keys', 'configure-tunnel']);
  f.emit({ busy: true, clipboard: { step: 'connecting', hasTunnelId: true } });
  assert.equal(byId('startup-tunnel-input').hidden, true); assert.equal(manual.disabled, true);
  f.emit({ busy: false, clipboard: { step: 'key', hasTunnelId: true, error: 'Повторите ввод.' } });
  assert.equal(keyPage.closest('li').hidden, false); assert.equal(manual.disabled, false);
});

for (const platform of ['darwin', 'win32']) test(`${platform}: clicking ID with empty clipboard waits for a native dialog before showing API key`, async t => {
  const f = await fixture(t, { platform, account: 'signed-in', git: true, runtime: true });
  let confirm, prompts = 0; const configured = [];
  const flow = new TunnelClipboard({ readText: () => '',
    promptTunnelId: () => { prompts++; return new Promise(resolve => { confirm = resolve; }); },
    configure: async values => configured.push(values),
    onChange: clipboard => f.emit({ clipboard }),
  });
  f.api.startup = async action => {
    if (action === 'paste-tunnel-id') await flow.pasteTunnelId();
    else if (action === 'configure-tunnel') await flow.configureManually(async values => configured.push(values));
  };
  const paste = f.document.querySelector('[data-startup=paste-tunnel-id]');
  assert.match(f.document.getElementById('startup-tunnel-create').textContent, /системном окне.*Command\+V.*Ctrl\+V/s);
  paste.click(); await f.settle();
  assert.equal(prompts, 1); assert.equal(paste.disabled, true);
  assert.equal(f.document.getElementById('startup-error').hidden, true);
  assert.equal(f.document.getElementById('startup-tunnel-key').hidden, true);
  confirm({ cancelled: true }); await f.settle();
  assert.equal(paste.disabled, false); assert.equal(f.document.getElementById('startup-error').hidden, true);
  paste.click(); await f.settle();
  confirm({ tunnelId: 'tunnel_fixture1234567890123456' }); await f.settle();
  assert.equal(prompts, 2); assert.deepEqual(configured, []);
  assert.equal(f.document.getElementById('startup-tunnel-key').hidden, false);
  f.document.querySelector('[data-startup=configure-tunnel]').click(); await f.settle();
  assert.deepEqual(configured, [{ tunnelId: 'tunnel_fixture1234567890123456' }]);
  flow.dispose();
});

for (const platform of ['darwin', 'win32']) test(`${platform}: explicit ChatGPT connection step precedes project and is not a file-access receipt`, async t => {
  const f = await fixture(t, { platform, account: 'signed-in', git: true, runtime: true });
  const guide = f.document.querySelector('#startup-plugin-body');
  const project = f.document.querySelector('#startup-project-body');
  assert.equal(guide.hidden, true);
  f.emit({ tunnel: true, clipboard: { step: 'done' } });
  assert.equal(guide.hidden, false);
  assert.equal(guide.compareDocumentPosition(project) & 4, 4);
  assert.equal(f.document.querySelector('#startup-plugin-name').textContent, platform === 'win32' ? 'Workflow Pilot Local Windows' : 'Workflow Pilot Local Mac');
  assert.match(project.textContent, /меню инструментов/);
  assert.match(project.textContent, /ещё не подтверждают доступ/);
  f.document.querySelector('[data-startup=plugins]').click(); await f.settle();
  assert.deepEqual(f.calls, ['plugins']);
  f.emit({ account: 'signed-out' }); assert.equal(guide.hidden, true);
});

for (const platform of ['darwin', 'win32']) {
  test(`first project can connect an existing folder on ${platform}`, async t => {
    const f = await fixture(t, { platform, account: 'signed-in', git: true, runtime: true, tunnel: false });
    const button = f.document.querySelector('#startup-existing');
    assert.equal(button.disabled, true);
    button.click(); await f.settle(); assert.deepEqual(f.calls, []);
    f.emit({ tunnel: true });
    assert.equal(button.disabled, false);
    button.click(); await f.settle();
    assert.deepEqual(f.calls, ['continue', 'chooseWorkspace']);
    assert.equal(f.document.querySelector('#startup-panel').hidden, true, 'existing-folder preview replaces onboarding');
  });
}
test('readiness rejection keeps onboarding and never opens a folder dialog', async t => {
  const f = await fixture(t, { account: 'signed-in', git: true, runtime: true, tunnel: true });
  f.api.startup = async () => ({ ok: false, error: { message: 'Подключение потеряно' } });
  f.document.querySelector('#startup-existing').click(); await f.settle();
  assert.deepEqual(f.calls, []);
  assert.equal(f.document.querySelector('#startup-error').textContent, 'Подключение потеряно');
});
test('existing folder cancellation returns to onboarding and retry is available', async t => {
  const f = await fixture(t, { account: 'signed-in', git: true, runtime: true, tunnel: true });
  let resolve;
  f.api.chooseWorkspace = () => new Promise(r => { resolve = r; });
  f.document.querySelector('#startup-existing').click(); await f.settle();
  assert.equal(f.document.querySelector('#startup-existing').disabled, true);
  assert.equal(f.document.querySelector('#startup-continue').disabled, true);
  resolve({ ok: true }); await f.settle();
  assert.equal(f.document.querySelector('#startup-panel').hidden, false);
  assert.equal(f.document.querySelector('#startup-existing').disabled, false);
});
