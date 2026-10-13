import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanMonitor } from '../src/plan-monitor.mjs';
const selected = { workspace: '/project', projectId: 'p', sessionId: 's' };
const info = (revision, s = selected) => ({ workspace: s.workspace, projectId: s.projectId,
  inspectedSessionId: s.sessionId, scopeId: 'plan', planRevision: revision, planView: { completed: revision } });

test('plan advances independently, without repeated notifications or delivery calls', async () => {
  let revision = 2, changes = 0;
  const monitor = new PlanMonitor({ selected: () => selected, inspect: async () => info(revision), onChange: () => changes++ });
  await monitor.tick(); await monitor.tick();
  assert.equal(changes, 1);
  revision = 15; await monitor.tick();
  assert.equal(monitor.view(selected, info(2)).planView.completed, 15);
  assert.equal(changes, 2);
});

test('late results cannot overwrite another session or a closed monitor', async () => {
  let active = selected, resolve;
  const monitor = new PlanMonitor({ selected: () => active, inspect: () => new Promise(r => { resolve = r; }) });
  const pending = monitor.tick();
  active = { ...selected, sessionId: 'other' };
  resolve(info(2)); await pending;
  assert.equal(monitor.view(active), null);
  const next = monitor.tick(); monitor.close(); resolve(info(3, active)); await next;
  assert.equal(monitor.info, null);
});

test('transient read failures retry and preserve only the matching plan', async () => {
  let fail = false;
  const monitor = new PlanMonitor({ selected: () => selected, inspect: async () => {
    if (fail) throw Error('transaction in progress'); return info(5);
  } });
  await monitor.tick(); fail = true; await monitor.tick();
  assert.equal(monitor.view(selected).planRevision, 5);
  assert.equal(monitor.view({ ...selected, projectId: 'replacement' }), null);
  assert.equal(monitor.pending, false);
  fail = false; await monitor.tick();
  assert.equal(monitor.view(selected, info(6)).planRevision, 6);
});

test('signals during an active read collapse into one rerun and publish the latest projection', async () => {
  let revision = 1, release, calls = 0, activeReads = 0, maxReads = 0, changes = 0;
  const monitor = new PlanMonitor({
    selected: () => selected,
    inspect: async () => {
      calls++; activeReads++; maxReads = Math.max(maxReads, activeReads);
      if (calls === 1) await new Promise(resolve => { release = resolve; });
      activeReads--;
      return info(revision);
    },
    onChange: () => changes++,
  });
  const first = monitor.tick();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  revision = 9;
  void monitor.tick(); void monitor.tick();
  release();
  await first;
  assert.equal(calls, 2);
  assert.equal(maxReads, 1);
  assert.equal(changes, 1, 'both reads collapse to the latest semantic projection');
  assert.equal(monitor.view(selected).planRevision, 9);
});

test('read failures have bounded recovery and expose a persistent error until a later success', async () => {
  let calls = 0, fail = true, errors = 0, recoveries = 0;
  const monitor = new PlanMonitor({
    selected: () => selected,
    inspect: async () => { calls++; if (fail) throw Error('temporary replace'); return info(4); },
    retryDelays: [0, 0],
    wait: async () => {},
    onError: error => { errors++; assert.equal(error.code, 'PLAN_READ_FAILED'); },
    onChange: (_value, meta) => { if (meta.recovered) recoveries++; },
  });
  await monitor.tick();
  assert.equal(calls, 3); assert.equal(errors, 1); assert.equal(monitor.error.code, 'PLAN_READ_FAILED');
  await monitor.tick();
  assert.equal(errors, 1, 'the same persistent failure is not republished');
  fail = false;
  await monitor.tick();
  assert.equal(monitor.view(selected).planRevision, 4);
  assert.equal(monitor.error, null);
  assert.equal(recoveries, 0, 'first valid projection is a semantic initial change, not recovery-only');
});

