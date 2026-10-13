import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { VpsTunnel, WindowsVpsTunnel, VPS_TUNNEL_LABEL, loopbackMcpPort, maskConnectorUrl } from '../src/execution/runtime/vps.mjs';

const SECRET = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-xyz';

async function configureRoute(home) {
  const folder = path.join(home, '.config/workflow-pilot/vps');
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, 'route.json'), JSON.stringify({ schema_version: 1, product: 'workflow-pilot',
    ssh_host: 'workflow-pilot-vps', remote_port: 18842 }));
  await fs.writeFile(path.join(folder, 'mcp-url'), `https://vps.example/mcp/${SECRET}/mcp\n`);
}

async function fixture(t, { sshConfig = 'hostname 31.70.155.58\nuser mcptunnel\n', bootstrapFailures = 0 } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'web-pilot-vps-'));
  await configureRoute(home);
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const calls = [];
  const agent = { loaded: false, pid: null, nextPid: 4100 };
  let failures = bootstrapFailures;
  const execute = async (file, args) => {
    calls.push([path.basename(file), ...args].join(' '));
    if (file === '/usr/bin/ssh') {
      if (sshConfig === null) throw Object.assign(new Error('ssh failed'), { stderr: 'bad' });
      return { stdout: sshConfig, stderr: '' };
    }
    if (file === '/bin/launchctl' && args[0] === 'print') {
      if (!agent.loaded) throw Object.assign(new Error('not loaded'), { stderr: 'Could not find service' });
      return { stdout: `gui/501/${VPS_TUNNEL_LABEL} = {\n\tstate = running\n\tpid = ${agent.pid}\n\tendpoints = {\n\t\tstate = active\n\t}\n}\n`, stderr: '' };
    }
    if (file === '/bin/launchctl' && args[0] === 'bootout') { agent.loaded = false; agent.pid = null; return { stdout: '' }; }
    if (file === '/bin/launchctl' && args[0] === 'bootstrap') {
      if (failures > 0) { failures -= 1; throw Object.assign(new Error('Bootstrap failed: 5'), { stderr: 'Bootstrap failed: 5: Input/output error' }); }
      agent.loaded = true; agent.pid = agent.nextPid++; return { stdout: '' };
    }
    throw new Error('unexpected ' + file);
  };
  const tunnel = new VpsTunnel({ homeDir: home, uid: 501, execute, sleep: async () => {}, settleMs: 0 });
  return { home, calls, agent, tunnel };
}

test('loopback MCP port and masked connector address', () => {
  assert.equal(loopbackMcpPort('http://127.0.0.1:17852/mcp'), 17852);
  assert.equal(loopbackMcpPort('http://localhost:17852/mcp'), null);
  assert.equal(loopbackMcpPort('http://127.0.0.1:80/mcp'), null);
  assert.equal(loopbackMcpPort('not a url'), null);
  const masked = maskConnectorUrl(`https://vps.example/mcp/${SECRET}/mcp`);
  assert.equal(masked, 'https://vps.example/mcp/…/mcp');
  assert.equal(masked.includes(SECRET), false);
});

test('apply writes the forward to the current MCP port and reloads only when the port changes', async t => {
  const f = await fixture(t);
  const first = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  const plist = await fs.readFile(path.join(f.home, 'Library/LaunchAgents', VPS_TUNNEL_LABEL + '.plist'), 'utf8');
  assert.match(plist, /<string>-R<\/string><string>127\.0\.0\.1:18842:127\.0\.0\.1:17852<\/string><string>workflow-pilot-vps<\/string>/);
  assert.match(plist, /<string>ExitOnForwardFailure=yes<\/string>/);
  assert.match(plist, /<key>KeepAlive<\/key><true\/>/);
  assert.ok(plist.includes(path.join(f.home, 'Library/Logs/workflow-pilot-vps.log')));
  assert.equal(first.ready, true);
  assert.equal(first.forwardPort, 17852);
  assert.equal(first.mcpPort, 17852);
  assert.ok(f.calls.includes(`launchctl bootstrap gui/501 ${path.join(f.home, 'Library/LaunchAgents', VPS_TUNNEL_LABEL + '.plist')}`));

  f.calls.length = 0;
  const same = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.equal(same.ready, true);
  assert.equal(f.calls.some(call => / bootout | bootstrap /.test(' ' + call + ' ')), false);

  f.calls.length = 0;
  const pid = f.agent.pid;
  const moved = await f.tunnel.apply('http://127.0.0.1:17842/mcp');
  assert.equal(moved.forwardPort, 17842);
  assert.equal(moved.ready, true);
  assert.notEqual(f.agent.pid, pid);
  assert.ok(f.calls.includes(`launchctl bootout gui/501/${VPS_TUNNEL_LABEL}`));
  assert.ok(f.calls.some(call => call.startsWith('launchctl bootstrap gui/501 ')));

  // Status for another port reports the mismatch instead of claiming readiness.
  const stale = await f.tunnel.status('http://127.0.0.1:17852/mcp');
  assert.equal(stale.portMatches, false);
  assert.equal(stale.ready, false);
});

test('bootstrap retries while launchd finishes the previous bootout', async t => {
  const f = await fixture(t, { bootstrapFailures: 2 });
  const status = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.equal(status.ready, true);
  assert.equal(f.calls.filter(call => call.startsWith('launchctl bootstrap')).length, 3);
});

test('a RemoteForward left in ~/.ssh/config blocks the takeover', async t => {
  const f = await fixture(t, { sshConfig: 'hostname 31.70.155.58\nremoteforward [127.0.0.1]:17842 [127.0.0.1]:17852\n' });
  const status = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.equal(status.configured, true);
  assert.equal(status.conflict, true);
  assert.equal(status.ready, false);
  await assert.rejects(fs.access(path.join(f.home, 'Library/LaunchAgents', VPS_TUNNEL_LABEL + '.plist')));
  assert.equal(f.calls.some(call => call.includes('bootstrap')), false);
});

test('an unconfigured host is reported without touching launchd', async t => {
  for (const sshConfig of ['hostname workflow-pilot-vps\nuser me\n', null]) {
    const f = await fixture(t, { sshConfig });
    const status = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
    assert.equal(status.configured, false);
    assert.equal(status.ready, false);
    assert.equal(f.calls.some(call => call.startsWith('launchctl')), false);
  }
});

test('the connector address is masked in status and read in full only for copying', async t => {
  const f = await fixture(t);
  const urlFile = path.join(f.home, '.config/workflow-pilot/vps/mcp-url');
  await fs.mkdir(path.dirname(urlFile), { recursive: true });
  await fs.writeFile(urlFile, `https://vps.example/mcp/${SECRET}/mcp\n`, { mode: 0o600 });
  await fs.mkdir(path.join(f.home, 'Library/Logs'), { recursive: true });
  await fs.writeFile(path.join(f.home, 'Library/Logs/workflow-pilot-vps.log'), 'old line\nConnection closed by remote host\n\n');
  const status = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.equal(status.connector, 'https://vps.example/mcp/…/mcp');
  assert.equal(JSON.stringify(status).includes(SECRET), false);
  assert.equal(status.lastError.message, 'Connection closed by remote host');
  assert.equal(await f.tunnel.connectorUrl(), `https://vps.example/mcp/${SECRET}/mcp`);
  await fs.writeFile(urlFile, 'http://vps.example/mcp/short/mcp\n');
  await assert.rejects(f.tunnel.connectorUrl(), /повреждён/);
  assert.equal((await f.tunnel.status('http://127.0.0.1:17852/mcp')).connector, null);
});

test('apply rejects a non-loopback MCP address', async t => {
  const f = await fixture(t);
  await assert.rejects(f.tunnel.apply('https://example.com/mcp'), /Некорректный адрес/);
  assert.equal(f.calls.length, 0);
});

test('VPS requires an explicit product route and rejects donor mappings before launching', async t => {
  const f = await fixture(t);
  const routeFile = path.join(f.home, '.config/workflow-pilot/vps/route.json');
  await fs.unlink(routeFile);
  assert.equal((await f.tunnel.apply('http://127.0.0.1:18852/mcp')).configured, false);
  assert.deepEqual(f.calls, []);
  for (const route of [
    { ssh_host: 'vps-mcp-tunnel', remote_port: 18842 },
    { ssh_host: 'workflow-pilot-vps', remote_port: 17842 },
  ]) {
    await fs.writeFile(routeFile, JSON.stringify({ schema_version: 1, product: 'workflow-pilot', ...route }));
    await assert.rejects(f.tunnel.apply('http://127.0.0.1:18852/mcp'), { code: 'VPS_ROUTE_INVALID' });
    assert.deepEqual(f.calls, []);
  }
  await fs.writeFile(routeFile, JSON.stringify({ schema_version: 1, product: 'workflow-pilot', ssh_host: 'workflow-pilot-vps-test', remote_port: 19842 }));
  assert.equal((await f.tunnel.apply('http://127.0.0.1:18852/mcp')).ready, true);
  const plist = await fs.readFile(f.tunnel.plistFile, 'utf8');
  assert.ok(plist.includes('127.0.0.1:19842:127.0.0.1:18852'));
  assert.ok(plist.includes('<string>workflow-pilot-vps-test</string>'));
});

test('VPS refuses to overwrite a foreign service even at the product label', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.dirname(f.tunnel.plistFile), { recursive: true });
  await fs.writeFile(f.tunnel.plistFile, '<foreign-service>');
  f.agent.loaded = true; f.agent.pid = 8100;
  await assert.rejects(f.tunnel.apply('http://127.0.0.1:18852/mcp'), { code: 'VPS_OWNER_CONFLICT' });
  assert.equal(await fs.readFile(f.tunnel.plistFile, 'utf8'), '<foreign-service>');
  assert.equal(f.calls.some(call => /bootout|bootstrap/.test(call)), false);
  const status = await f.tunnel.status('http://127.0.0.1:18852/mcp');
  assert.equal(status.ready, false); assert.equal(status.conflict, true); assert.equal(status.owned, false);
});

// Windows: the same forward, kept by control.py of the executor instead of a LaunchAgent.
async function windowsFixture(t, { sshConfig = 'hostname 31.70.155.58\r\nuser mcptunnel\r\n', sshSurvives = true } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'web-pilot-vps-win-'));
  await configureRoute(home);
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const calls = [], service = { supervised: false, running: false, pid: null, forward_port: null, last_error: null, nextPid: 5200 };
  const state = { sshConfig };
  const execute = async (file, args, options) => {
    calls.push([path.basename(file), ...args].join(' '));
    assert.equal(file, path.join('D:\\Windows', 'System32', 'OpenSSH', 'ssh.exe'), 'the OpenSSH client of Windows');
    assert.equal(options.windowsHide, true);
    if (state.sshConfig === null) throw Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
    return { stdout: state.sshConfig, stderr: '' };
  };
  const control = async args => {
    calls.push('control ' + args.join(' '));
    if (args[0] === 'vps-apply') {
      const port = Number(args[2]);
      if (!service.supervised || service.forward_port !== port) {
        Object.assign(service, { supervised: true, forward_port: port, running: sshSurvives, pid: sshSurvives ? service.nextPid++ : null,
          last_error: sshSurvives ? null : { message: 'Error: remote port forwarding failed for listen port 17842', at: '2026-10-06T09:00:00Z' } });
      }
    } else if (args[0] === 'vps-stop') Object.assign(service, { supervised: false, running: false, pid: null, forward_port: null });
    else if (args[0] !== 'vps-status') throw new Error('unexpected control command');
    const { nextPid, ...vps } = service;
    return { ok: true, vps: { ...vps, ssh_host: 'workflow-pilot-vps', remote_port: 18842 } };
  };
  const tunnel = new WindowsVpsTunnel({ control, homeDir: home, environment: { SystemRoot: 'D:\\Windows' }, execute, sleep: async () => {}, settleMs: 0, startTimeoutMs: 20 });
  return { home, calls, service, state, tunnel };
}

test('Windows: the forward follows the MCP port through control.py and restarts only when the port changes', async t => {
  const f = await windowsFixture(t);
  await fs.mkdir(path.join(f.home, '.config/workflow-pilot/vps'), { recursive: true });
  await fs.writeFile(path.join(f.home, '.config/workflow-pilot/vps/mcp-url'), `https://vps.example/mcp/${SECRET}/mcp\n`);
  assert.deepEqual(await f.tunnel.status('http://127.0.0.1:17852/mcp'), { configured: true, conflict: false, running: false, pid: null, ready: false, owned: true,
    mcpPort: 17852, forwardPort: null, portMatches: false, lastError: null, connector: 'https://vps.example/mcp/…/mcp' }, 'the same status fields as on macOS');
  f.calls.length = 0;
  const first = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.deepEqual([first.ready, first.running, first.pid, first.forwardPort, first.portMatches, first.conflict], [true, true, 5200, 17852, true, false]);
  assert.equal(f.calls[0], 'ssh.exe -G -T workflow-pilot-vps');
  assert.ok(f.calls.includes('control vps-apply --port 17852'));
  assert.equal(f.calls.some(call => /launchctl/.test(call)), false);
  assert.equal(await fs.access(path.join(f.home, 'Library')).then(() => true, () => false), false, 'nothing of macOS is written');

  f.calls.length = 0;
  const same = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.equal(same.pid, 5200, 'the same port keeps the running ssh');
  f.calls.length = 0;
  const moved = await f.tunnel.apply('http://127.0.0.1:17842/mcp');
  assert.deepEqual([moved.ready, moved.forwardPort, moved.pid], [true, 17842, 5201]);
  // Status for another port reports the mismatch instead of claiming readiness.
  const mismatch = await f.tunnel.status('http://127.0.0.1:17852/mcp');
  assert.deepEqual([mismatch.ready, mismatch.portMatches, mismatch.running], [false, false, true]);
  assert.equal(await f.tunnel.connectorUrl(), `https://vps.example/mcp/${SECRET}/mcp`);
  await assert.rejects(f.tunnel.apply('http://example.com:17852/mcp'), /Некорректный адрес/);
  assert.throws(() => new WindowsVpsTunnel({}), TypeError);
});

test('Windows: a refused forward, a RemoteForward in the config and a server that is no longer set up', async t => {
  const refused = await windowsFixture(t, { sshSurvives: false });
  const status = await refused.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.deepEqual([status.configured, status.ready, status.running, status.forwardPort], [true, false, false, 17852]);
  assert.deepEqual(status.lastError, { message: 'Error: remote port forwarding failed for listen port 17842', at: '2026-10-06T09:00:00Z' });

  const conflict = await windowsFixture(t, { sshConfig: 'hostname 31.70.155.58\r\nremoteforward 127.0.0.1:17842 [127.0.0.1]:17842\r\n' });
  const blocked = await conflict.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.deepEqual([blocked.configured, blocked.conflict, blocked.ready], [true, true, false]);
  assert.equal(conflict.calls.some(call => call.startsWith('control vps-apply')), false, 'a forward of the config is never taken over');

  const f = await windowsFixture(t);
  await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  f.state.sshConfig = 'hostname workflow-pilot-vps\r\n'; // no Host block: ssh echoes the alias itself
  f.calls.length = 0;
  const removed = await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.deepEqual(removed, { configured: false, conflict: false, running: false, ready: false, owned: false, pid: null,
    mcpPort: 17852, forwardPort: null, portMatches: false, lastError: null, connector: null });
  assert.ok(f.calls.includes('control vps-stop'), 'nothing keeps dialling a server that was removed');
  assert.equal(f.service.supervised, false);
  f.calls.length = 0;
  await f.tunnel.apply('http://127.0.0.1:17852/mcp');
  assert.equal(f.calls.includes('control vps-stop'), false, 'and nothing is stopped twice');

  const noClient = await windowsFixture(t, { sshConfig: null });
  assert.equal((await noClient.tunnel.status('http://127.0.0.1:17852/mcp')).configured, false, 'without the OpenSSH client the server counts as not set up');
  assert.equal(noClient.calls.some(call => call.startsWith('control ')), false);
});
