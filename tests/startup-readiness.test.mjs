import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StartupReadiness, inspectMacGit, installMacGit } from '../src/startup-readiness.mjs';
const service = { mcp: { ready: true }, tunnel: { configured: true, ready: true } };
function fixture(overrides = {}) {
  const calls = [], updates = [];
  const flow = new StartupReadiness({
    probeNode: async () => '/bundled/node', probeGit: async () => true,
    inspectRuntime: async () => null, prepareRuntime: async () => { calls.push('prepare'); return service; },
    installGit: async () => { calls.push('install'); }, configureTunnel: async () => ({ cancelled: true }),
    onChange: state => updates.push(state), ...overrides,
  });
  return { flow, calls, updates };
}
test('inspection on a clean Mac never invokes the Git shim or installer', async () => {
  const calls = [];
  const ready = await inspectMacGit(async command => { calls.push(command); throw new Error('no developer directory'); });
  assert.equal(ready, false); assert.deepEqual(calls, ['/usr/bin/xcode-select']);
});
test('missing Git is actionable, retry prepares runtime and does not invent an account login', async () => {
  let installed = false;
  const f = fixture({ probeGit: async () => installed });
  await f.flow.check({ prepare: true });
  assert.equal(f.flow.snapshot().phase, 'git'); assert.deepEqual(f.calls, []);
  await f.flow.install(); assert.deepEqual(f.calls, ['install']);
  assert.equal(f.flow.snapshot().phase, 'git-installing');
  installed = true; await f.flow.check({ prepare: true });
  assert.deepEqual(f.calls, ['install', 'prepare']);
  assert.equal(f.flow.snapshot().phase, 'connected');
  assert.equal(f.flow.snapshot().account, 'unknown');
});
test('cancelled tunnel setup never starts or configures a tunnel', async () => {
  const f = fixture();
  await f.flow.configure();
  assert.equal(f.flow.snapshot().phase, 'tunnel'); assert.deepEqual(f.calls, []);
});
test('page timeout and stale completion are distinct from component readiness', () => {
  let timeout;
  const f = fixture({ schedule: fn => { timeout = fn; return 1; }, cancel: () => {} });
  f.flow.beginPage(1); timeout(); assert.equal(f.flow.snapshot().page, 'slow');
  f.flow.beginPage(2); f.flow.finishPage(1, 'ERR_FAILED');
  assert.equal(f.flow.snapshot().page, 'loading');
  f.flow.finishPage(2); f.flow.observe(2, { login: 'unknown' });
  assert.equal(f.flow.snapshot().account, 'unknown', 'absence of Login is not proof of authentication');
  f.flow.observe(2, { login: 'signed-out' }); assert.equal(f.flow.snapshot().account, 'signed-out');
  f.flow.observe(2, { login: 'signed-in' }); assert.equal(f.flow.snapshot().account, 'signed-in');
  f.flow.observe(1, { login: 'signed-out' }); assert.equal(f.flow.snapshot().account, 'signed-in');
  f.flow.dispose();
});
test('parallel clicks share one operation; late results after disposal are ignored', async () => {
  let resolve;
  const f = fixture({ prepareRuntime: () => new Promise(r => { resolve = r; }) });
  const a = f.flow.check({ prepare: true });
  const b = f.flow.check({ prepare: true });
  await new Promise(r => setImmediate(r));
  f.flow.dispose(); const n = f.updates.length;
  resolve(service); await Promise.all([a, b]);
  assert.equal(f.updates.length, n);
  assert.equal(f.flow.snapshot().runtime, false);
});
test('raw runtime errors never leak commands or secrets into public state', async () => {
  const f = fixture({ inspectRuntime: async () => { throw new Error('secret command sk-example-value'); } });
  await f.flow.check(); assert.equal(f.flow.snapshot().phase, 'error');
  assert.doesNotMatch(JSON.stringify(f.flow.snapshot()), /sk-example-value/);
});

import { offerMacInstallation } from '../src/startup-readiness.mjs';
test('existing profile and installation cancellation never move the app', async () => {
  let moved = 0, prompted = 0;
  const app = { isInApplicationsFolder: () => false, moveToApplicationsFolder: () => { moved++; return true; } };
  const dialog = { showMessageBox: async () => { prompted++; return { response: 1 }; } };
  assert.equal(await offerMacInstallation({ app, dialog, fresh: false }), false);
  assert.equal(prompted, 0);
  assert.equal(await offerMacInstallation({ app, dialog, fresh: true }), false);
  assert.equal(prompted, 1); assert.equal(moved, 0);
});
test('an installation conflict cannot silently replace another app', async () => {
  let replaced = false;
  const app = { isInApplicationsFolder: () => false, moveToApplicationsFolder: ({ conflictHandler }) => {
    replaced = conflictHandler('exists'); return replaced;
  } };
  const dialog = { showMessageBox: async () => ({ response: 0 }), showMessageBoxSync: () => 1 };
  assert.equal(await offerMacInstallation({ app, dialog, fresh: true }), false);
  assert.equal(replaced, false);
});

test('Apple installer is activated after launch; repeated clicks share the same handoff', async () => {
  let launched;
  const calls = [];
  const f = fixture({ probeGit: async () => false, installGit: () => installMacGit(async (command, args) => {
    calls.push({ command, args });
    if (command === '/usr/bin/xcode-select') await new Promise(resolve => { launched = resolve; });
  }) });
  await f.flow.check();
  const first = f.flow.install(), second = f.flow.install();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 1, 'do not activate the helper before the install request succeeds');
  assert.equal(f.flow.snapshot().busy, true);
  launched(); await Promise.all([first, second]);
  assert.deepEqual(calls, [
    { command: '/usr/bin/xcode-select', args: ['--install'] },
    { command: '/usr/bin/open', args: ['-a', '/System/Library/CoreServices/Install Command Line Developer Tools.app'] },
  ]);
  assert.equal(f.flow.snapshot().phase, 'git-installing');
  assert.equal(f.flow.snapshot().git, false, 'showing the installer is not proof of installation');
});
test('failed Apple installation request does not activate the helper', async () => {
  const calls = [];
  await assert.rejects(installMacGit(async command => {
    calls.push(command); throw new Error('private command details');
  }), error => /Не удалось открыть установку Apple/.test(error.publicMessage));
  assert.deepEqual(calls, ['/usr/bin/xcode-select']);
});
test('failed installer activation remains an accepted installation with visible recovery and no duplicate launch', async () => {
  let launches = 0;
  const f = fixture({ probeGit: async () => false, installGit: () => installMacGit(async command => {
    if (command === '/usr/bin/xcode-select') launches++;
    if (command === '/usr/bin/open') throw new Error('private launch error');
  }) });
  await f.flow.check(); await f.flow.install();
  assert.equal(f.flow.snapshot().phase, 'git-installing');
  assert.equal(f.flow.snapshot().gitInstallationRequested, true);
  assert.match(f.flow.snapshot().error, /Сверните Web Pilot жёлтой кнопкой/);
  assert.doesNotMatch(f.flow.snapshot().error, /private launch error/);
  assert.equal(f.flow.snapshot().git, false);
  await f.flow.install();
  assert.equal(f.flow.snapshot().phase, 'git-installing');
  assert.equal(launches, 1);
  f.flow.dispose();
});

test('known setup error explains the cause, preserves installed Git and supports retry without leaking stderr', async () => {
 let failed = true;
 const f = fixture({ inspectRuntime: async () => {
  if (failed) throw Object.assign(new Error('private sk-runtime-secret'), {code:'RUNTIME_STATUS_INVALID',stderr:'private token'});
  return {mcp:{ready:true},tunnel:{ready:false,configured:false}};
 } });
 await f.flow.check();
 assert.equal(f.flow.snapshot().git,true);
 assert.equal(f.flow.snapshot().phase,'error');
 assert.match(f.flow.snapshot().error,/RUNTIME_STATUS_INVALID/);
 assert.doesNotMatch(f.flow.snapshot().error,/интернет|private|sk-runtime/);
 failed=false;await f.flow.check();
 assert.equal(f.flow.snapshot().error,null);
 assert.equal(f.flow.snapshot().runtime,true);
 assert.equal(f.flow.snapshot().phase,'tunnel');
});
test('unknown preparation errors do not blame the network or publish an arbitrary error code', async () => {
 const f=fixture({inspectRuntime:async()=>{throw Object.assign(new Error('private error'),{code:'private-secret-code'});}});
 await f.flow.check();
 assert.match(f.flow.snapshot().error,/Проверить и продолжить/);
 assert.doesNotMatch(f.flow.snapshot().error,/private|интернет/);
});

function gitWatchFixture(overrides = {}) {
 const timers = new Map(); let id = 0;
 const f = fixture({ gitPollLimit: 3, scheduleGit: callback => { timers.set(++id,callback); return id; },
  cancelGit: token => timers.delete(token), ...overrides });
 return { ...f, timers, tick: async () => {
  const next=timers.entries().next().value; assert.ok(next,'expected a scheduled Git check');
  timers.delete(next[0]); await next[1]();
 } };
}
test('Apple completion is detected automatically after a focus warning without preparing or reinstalling', async () => {
 let installed=false;
 const f=gitWatchFixture({probeGit:async()=>installed,installGit:async()=>({warning:'Installer stays behind the app'})});
 await f.flow.check(); await f.flow.install();
 await f.tick(); assert.equal(f.flow.snapshot().git,false);assert.equal(f.timers.size,1);
 installed=true; await f.tick();
 assert.equal(f.flow.snapshot().git,true);assert.equal(f.flow.snapshot().phase,'prepare');
 assert.equal(f.flow.snapshot().gitInstallationRequested,false);assert.equal(f.flow.snapshot().error,null);
 assert.equal(f.timers.size,0);assert.deepEqual(f.calls,[],'preparation requires the next explicit action');
 await f.flow.install();assert.deepEqual(f.calls,[]);
 await f.flow.check({prepare:true});assert.deepEqual(f.calls,['prepare']);
 f.flow.dispose();
});
test('Git watcher has no overlapping probes and ignores results after disposal', async () => {
 let finish;
 const f=gitWatchFixture({probeGit:()=>new Promise(resolve=>{finish=resolve;})});
 await f.flow.install();
 const inFlight=f.tick(); assert.equal(f.timers.size,0);
 const before=f.updates.length; f.flow.dispose();finish(true);await inFlight;
 assert.equal(f.updates.length,before);assert.equal(f.flow.snapshot().git,false);assert.equal(f.timers.size,0);
});
test('manual verification invalidates a stale watcher and keeps one watcher while installation is pending', async () => {
 let pendingProbe,call=0;
 const f=gitWatchFixture({probeGit:async()=>++call===1 ? new Promise(resolve=>{pendingProbe=resolve;}) : false});
 await f.flow.install();const stale=f.tick();
 await f.flow.check();assert.equal(f.flow.snapshot().phase,'git-installing');assert.equal(f.timers.size,1);
 pendingProbe(true);await stale;
 assert.equal(f.flow.snapshot().git,false,'obsolete completion cannot overwrite a fresh manual result');
 assert.equal(f.timers.size,1);f.flow.dispose();assert.equal(f.timers.size,0);
});
test('bounded Git polling offers manual recovery and never marks missing Git ready', async () => {
 const f=gitWatchFixture({probeGit:async()=>{throw new Error('private probe failure');},gitPollLimit:2});
 await f.flow.install();await f.tick();await f.tick();
 assert.equal(f.timers.size,0);assert.equal(f.flow.snapshot().git,false);
 assert.equal(f.flow.snapshot().gitInstallationRequested,false);
 assert.match(f.flow.snapshot().error,/Проверить и продолжить/);
 assert.doesNotMatch(f.flow.snapshot().error,/private probe/);
 f.flow.dispose();
});


test('automatic credentials stay out of readiness state and success still requires ready tunnel', async () => {
  const received = [], states = [], data = { tunnelId: 'tunnel_fixture1234567890123456', key: 'sk-fixture-private-1234567890' };
  let ready = false;
  const f = new StartupReadiness({ probeNode: async () => {}, probeGit: async () => true,
    inspectRuntime: async () => ({ mcp: { ready: true }, tunnel: { configured: false, ready: false } }),
    configureTunnel: async input => { received.push({ ...input }); return { configured: true }; },
    prepareRuntime: async () => ({ mcp: { ready: true }, tunnel: { configured: true, ready } }),
    onChange: state => states.push(state),
  });
  await f.configure(data); assert.equal(f.snapshot().tunnel, false);
  ready = true; await f.configure(data); assert.equal(f.snapshot().tunnel, true);
  assert.deepEqual(received, [data, data]);
  assert.doesNotMatch(JSON.stringify(states), /sk-fixture|tunnel_fixture/);
  f.dispose();
});


test('failed automatic tunnel retains working MCP, captured ID and a usable next attempt', async t => {
  const { TunnelClipboard } = await import('../src/tunnel-clipboard.mjs');
  const { createStartupView } = await import('../src/ui/startup.mjs');
  const { JSDOM } = await import('jsdom');
  const fs = await import('node:fs/promises');
  const dom = new JSDOM(await fs.readFile(new URL('../src/ui/index.html', import.meta.url), 'utf8'));
  t.after(() => dom.window.close());
  let copied = '', succeed = false;
  const f = new StartupReadiness({ probeNode: async () => {}, probeGit: async () => true,
    inspectRuntime: async () => ({ mcp: { ready: true }, tunnel: { configured: true, ready: false } }),
    configureTunnel: async () => ({ configured: true }),
    prepareRuntime: async () => { if (!succeed) throw new Error('fixture connection failed');
      return { mcp: { ready: true }, tunnel: { configured: true, ready: true } }; },
  });
  const c = new TunnelClipboard({ readText: () => copied, configure: async input => {
    await f.configure(input); if (!f.snapshot().tunnel) throw new Error('not ready');
  } });
  t.after(() => { c.dispose(); f.dispose(); });
  await c.tick({ active: true });
  copied = 'tunnel_fixture1234567890123456'; await c.tick({ active: true });
  copied = 'sk-fixture-invalid1234567890'; await c.tick({ active: true });
  assert.equal(f.snapshot().runtime, true); assert.equal(f.snapshot().tunnel, false);
  await c.tick({ active: true, ready: f.snapshot().runtime });
  assert.equal(c.snapshot().step, 'key'); assert.equal(c.snapshot().hasTunnelId, true);
  const view = createStartupView({ document: dom.window.document, api: {} });
  view.render({ startup: { ...f.snapshot(), active: true, account: 'signed-in', page: 'loaded', clipboard: c.snapshot() } });
  assert.equal(dom.window.document.querySelector('#startup-tunnel-body').hidden, false);
  assert.equal(dom.window.document.querySelector('[data-startup=configure-tunnel]').disabled, false);
  assert.equal(dom.window.document.querySelector('#startup-error').textContent, c.snapshot().error);
  succeed = true; copied = 'sk-fixture-correct1234567890'; await c.tick({ active: true });
  assert.equal(f.snapshot().tunnel, true); assert.equal(c.snapshot().step, 'done');
});

test('failed post-error inspection cannot claim local or tunnel readiness', async () => {
  let inspections = 0;
  const f = new StartupReadiness({ probeNode: async () => {}, probeGit: async () => true,
    inspectRuntime: async () => { if (++inspections > 1) throw new Error('unavailable');
      return { mcp: { ready: true }, tunnel: { configured: false, ready: false } }; },
    configureTunnel: async () => ({ configured: true }),
    prepareRuntime: async () => { throw new Error('unavailable'); },
  });
  await f.configure(); assert.equal(f.snapshot().runtime, false); assert.equal(f.snapshot().tunnel, false);
  f.dispose();
});
