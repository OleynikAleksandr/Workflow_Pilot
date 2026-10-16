import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TailscaleCli, TAILSCALE_CANDIDATES } from '../src/execution/runtime/tailscale.mjs';
import { createRemoteAccess, addressQr } from '../src/backend/remote-access.mjs';

const status = (backend = 'Running', extra = {}) => JSON.stringify({ BackendState: backend, Self: { DNSName: 'mac.tail1234.ts.net.', UserID: 7 },
  User: { 7: { LoginName: 'Owner@Example.com' } }, CertDomains: ['mac.tail1234.ts.net'], CurrentTailnet: { Name: 'example.com' }, ...extra });

function fakeCli({ platform = 'darwin', installed = true, statusJson = status(), serveJson = '{}' } = {}) {
  const calls = [];
  const cli = new TailscaleCli({ platform, exists: file => installed && file === TAILSCALE_CANDIDATES[platform][0],
    run: async (file, args) => { calls.push(args.join(' '));
      if (args[0] === 'status') return { code: 0, stdout: statusJson, stderr: '' };
      if (args.join(' ') === 'serve status --json') return { code: 0, stdout: serveJson, stderr: '' };
      return { code: 0, stdout: '', stderr: '' }; } });
  return { cli, calls };
}

test('Tailscale CLI: found inside the macOS app, status parsed, never Funnel or a reset', async () => {
  assert.equal(new TailscaleCli({ platform: 'darwin', exists: () => false }).locate(), null);
  assert.deepEqual(await new TailscaleCli({ platform: 'darwin', exists: () => false }).state(),
    { installed: false, running: false, loggedIn: false, httpsEnabled: false, login: null, dnsName: null, tailnet: null });
  assert.match(TAILSCALE_CANDIDATES.darwin[0], /Tailscale\.app\/Contents\/MacOS\/Tailscale$/);
  assert.ok(TAILSCALE_CANDIDATES.win32.length && TAILSCALE_CANDIDATES.linux.length, 'three platforms');
  const { cli, calls } = fakeCli();
  const state = await cli.state();
  assert.deepEqual({ ...state, backend: undefined }, { installed: true, running: true, loggedIn: true, httpsEnabled: true,
    login: 'owner@example.com', dnsName: 'mac.tail1234.ts.net', tailnet: 'example.com', backend: undefined });
  const loggedOut = await fakeCli({ statusJson: status('NeedsLogin') }).cli.state();
  assert.equal(loggedOut.loggedIn, false);
  const noHttps = await fakeCli({ statusJson: status('Running', { CertDomains: null }) }).cli.state();
  assert.equal(noHttps.httpsEnabled, false);
  await cli.serveOn(18854); await cli.serveOff(18854);
  assert.deepEqual(calls.slice(-2), ['serve --bg --https=443 http://127.0.0.1:18854', 'serve --https=443 http://127.0.0.1:18854 off']);
  assert.equal(calls.some(call => /funnel|reset/.test(call)), false);
});

test('Serve ownership: only our own entry is ours; another HTTPS 443 setup is a conflict, never overwritten', async () => {
  const ours = JSON.stringify({ TCP: { 443: { HTTPS: true } }, Web: { 'mac.tail1234.ts.net:443': { Handlers: { '/': { Proxy: 'http://127.0.0.1:18854' } } } } });
  const other = JSON.stringify({ TCP: { 443: { HTTPS: true } }, Web: { 'mac.tail1234.ts.net:443': { Handlers: { '/': { Proxy: 'http://127.0.0.1:3000' } } } } });
  assert.deepEqual(await fakeCli({ serveJson: ours }).cli.serveState(18854), { known: true, ours: true, conflict: false });
  assert.deepEqual(await fakeCli({ serveJson: other }).cli.serveState(18854), { known: true, ours: false, conflict: true });
  assert.deepEqual(await fakeCli({ serveJson: '{}' }).cli.serveState(18854), { known: true, ours: false, conflict: false });
});

function fakeGateway() {
  let config = null; const port = 18854;
  return { enable: async value => { config = value; return { enabled: true, port, ...value }; }, disable: async () => { config = null; },
    status: () => ({ enabled: !!config, port: config ? port : null, dnsName: config?.dnsName ?? null, owner: config?.owner ?? null }), get config() { return config; } };
}
function fakeTailscale(state, serve = { known: true, ours: false, conflict: false }) {
  const calls = [];
  return { calls, state: async () => ({ ...state }), serveState: async () => ({ ...serve }),
    serveOn: async port => { calls.push('on ' + port); serve = { known: true, ours: true, conflict: false }; },
    serveOff: async port => { calls.push('off ' + port); serve = { known: true, ours: false, conflict: false }; } };
}
const ready = { installed: true, running: true, loggedIn: true, httpsEnabled: true, login: 'owner@example.com', dnsName: 'mac.tail1234.ts.net' };

test('enabling checks each step in order, then serves the gateway, keeps the Mac awake and survives a restart', async t => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'wp-remote-access-')); t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  for (const [state, code] of [[{ installed: false }, 'TAILSCALE_NOT_INSTALLED'], [{ ...ready, loggedIn: false }, 'TAILSCALE_LOGGED_OUT'],
    [{ ...ready, httpsEnabled: false }, 'TAILSCALE_HTTPS_DISABLED']]) {
    const access = createRemoteAccess({ gateway: fakeGateway(), tailscale: fakeTailscale(state), dir });
    await assert.rejects(access.action({ op: 'enable' }), { code });
    assert.equal(access.view().error.code, code, 'the reason is shown to the user');
  }
  const power = { started: [], stopped: [], start(kind) { this.started.push(kind); return 1; }, stop(id) { this.stopped.push(id); } };
  const gateway = fakeGateway(), tailscale = fakeTailscale(ready), opened = [];
  const access = createRemoteAccess({ gateway, tailscale, dir, power, openExternal: async url => opened.push(url) });
  const view = await access.action({ op: 'enable' });
  assert.deepEqual(gateway.config, { owner: 'owner@example.com', dnsName: 'mac.tail1234.ts.net' });
  assert.deepEqual(tailscale.calls, ['on 18854']);
  assert.equal(view.address, 'https://mac.tail1234.ts.net');assert.match(view.qr, /^data:image\/svg\+xml;base64,/);
  assert.deepEqual(power.started, ['prevent-app-suspension']);
  // A restart restores the user's choice without another click.
  const restarted = createRemoteAccess({ gateway: fakeGateway(), tailscale: fakeTailscale(ready, { known: true, ours: true, conflict: false }), dir });
  assert.equal((await restarted.restore()).enabled, true);
  await access.action({ op: 'disable' });
  assert.deepEqual(tailscale.calls, ['on 18854', 'off 18854']);assert.deepEqual(power.stopped, [1]);
  assert.equal(gateway.status().enabled, false);
  assert.equal((await createRemoteAccess({ gateway: fakeGateway(), tailscale: fakeTailscale(ready), dir }).restore()).enabled, false);
  await access.action('open-download'); await access.action('open-admin');
  assert.deepEqual(opened, ['https://tailscale.com/download', 'https://login.tailscale.com/admin/dns']);
});

test('another Serve setup on HTTPS 443 stops enabling and leaves the gateway closed', async t => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'wp-remote-conflict-')); t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const gateway = fakeGateway(), tailscale = fakeTailscale(ready, { known: true, ours: false, conflict: true });
  const access = createRemoteAccess({ gateway, tailscale, dir });
  await assert.rejects(access.action({ op: 'enable' }), { code: 'TAILSCALE_SERVE_CONFLICT' });
  assert.equal(gateway.status().enabled, false);assert.deepEqual(tailscale.calls, [], 'nothing of the user is overwritten');
  assert.equal(addressQr(null), null);
});

test('the Tailscale CLI runs in CLI mode without a terminal and a refusal is explained', async () => {
  const { tailscaleEnvironment } = await import('../src/execution/runtime/tailscale.mjs');
  const env = tailscaleEnvironment({ HOME: '/Users/x', PATH: '/usr/bin' });
  assert.equal(env.TAILSCALE_BE_CLI, '1');assert.equal(env.HOME, '/Users/x');
  const refused = new TailscaleCli({ platform: 'darwin', exists: () => true,
    run: async () => ({ code: 1, stdout: '', stderr: 'The Tailscale GUI failed to start: (Tailscale.CLIError error 3.)' }) });
  const state = await refused.state();
  assert.equal(state.installed, true);assert.equal(state.running, false);
  assert.equal(state.error, 'TAILSCALE_COMMAND_FAILED');assert.match(state.detail, /GUI failed to start/, 'the reason reaches the settings');
  // On a Mac with Tailscale, a service-like process without a terminal still reads the status.
  const real = new TailscaleCli();
  if (process.platform === 'darwin' && real.locate()) {
    const { execFileSync } = await import('node:child_process');
    const output = execFileSync(real.locate(), ['status', '--json'], { env: tailscaleEnvironment({ HOME: process.env.HOME }), encoding: 'utf8', timeout: 15000 });
    assert.match(output, /"BackendState"/);
  }
});
