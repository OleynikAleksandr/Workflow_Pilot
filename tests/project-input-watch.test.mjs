import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { ProjectInputWatch } from '../src/project-input-watch.mjs';
import { PlanMonitor } from '../src/plan-monitor.mjs';
import { readWorkspace } from '../src/workspace-session.mjs';

const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve)); };
const idle = async monitor => {
  const deadline = Date.now() + 2000;
  while (monitor.pending) { assert.ok(Date.now() < deadline, 'monitor settles'); await new Promise(resolve => setTimeout(resolve, 1)); }
};
async function fixture(t) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-watch-')));
  const document = 'docs/planning/nested/scope.md';
  const plan = { schema_version: 1, project_id: 'project', project_name: 'Project', plan_revision: 1,
    scope_id: 'scope', execution_scope_status: 'ACTIVE', delivery_status: 'IN_PROGRESS', objective: 'Fallback', tasks: [],
    context_pack: { documents: [{ path: document, required: true }] } };
  const writePlan = async () => fs.writeFile(path.join(workspace, '.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n' + JSON.stringify(plan) + '\n```\n<!-- workflow-state:end -->');
  for (const directory of ['.harness/plans', 'scripts', path.dirname(document)]) await fs.mkdir(path.join(workspace, directory), { recursive: true });
  await fs.writeFile(path.join(workspace, document), '# First title\n');
  await fs.writeFile(path.join(workspace, 'scripts/workflow.mjs'), ''); await writePlan();
  const handles = new Map(), timers = new Map(); let next = 0, fail = false;
  const options = {
    watchDirectory: (directory, _options, callback) => {
      if (fail && directory === path.join(workspace, '.harness/plans')) throw Object.assign(Error('denied'), { code: 'EACCES' });
      const handle = new EventEmitter(); Object.assign(handle, { callback, closed: false,
        close() { this.closed = true; if (handles.get(directory) === this) handles.delete(directory); } });
      handles.set(directory, handle); return handle;
    },
    schedule: callback => { timers.set(++next, callback); return next; }, unschedule: timer => timers.delete(timer),
  };
  let signals = 0;
  const selected = { workspace, projectId: 'project', sessionId: 'session' };
  let active = selected, reads = 0, beforeRead = async () => {};
  const monitor = new PlanMonitor({ selected: () => active,
    inspect: async (...args) => { reads++; await beforeRead(); return readWorkspace(...args); }, wait: async () => {},
    createWatcher: args => new ProjectInputWatch({ ...args, ...options }), onInputsChanged: () => signals++ });
  const drain = async () => {
    for (let i = 0; timers.size; i++) {
      assert.ok(i < 12, 'retries must be bounded');
      const callbacks = [...timers.values()]; timers.clear(); for (const callback of callbacks) callback();
      await idle(monitor);
    }
    await idle(monitor);
  };
  monitor.observeSelection(); await idle(monitor);
  t.after(async () => { monitor.close(); await fs.rm(workspace, { recursive: true, force: true }); });
  return { workspace, document, plan, writePlan, monitor, handles, timers, selected, drain,
    signals: () => signals, reads: () => reads, setFail: value => { fail = value; },
    setActive: value => { active = value; }, beforeRead: callback => { beforeRead = callback; },
    event: (directory, filename, kind = 'rename') => handles.get(path.join(workspace, directory)).callback(kind, filename) };
}

test('named inputs, nested H1 and atomic plan replacement update independently; unrelated Git tree is ignored', async t => {
  const f = await fixture(t);
  assert.equal(f.monitor.info.scopeTitle, 'First title');
  assert.ok(f.handles.has(path.join(f.workspace, 'docs/planning/nested')));
  assert.ok(![...f.handles.keys()].some(p => p.includes('/.git')));
  const before = f.reads(); f.event('', 'unrelated.txt', 'change'); await f.drain(); assert.equal(f.reads(), before);
  await fs.writeFile(path.join(f.workspace, f.document), '# Changed title\n');
  f.event(path.dirname(f.document), path.basename(f.document), 'change'); await f.drain();
  assert.equal(f.monitor.info.scopeTitle, 'Changed title'); assert.equal(f.monitor.info.planRevision, 1);
  const planFile = path.join(f.workspace, '.harness/plans/todo-plan.md');
  const text = await fs.readFile(planFile, 'utf8');
  await fs.writeFile(planFile + '.tmp', text.replace('"plan_revision":1', '"plan_revision":2'));
  await fs.rename(planFile + '.tmp', planFile);
  for (let i = 0; i < 5; i++) f.event('.harness/plans', i === 0 ? null : 'todo-plan.md');
  await f.drain(); assert.equal(f.monitor.info.planRevision, 2); assert.equal(f.signals(), 2);
  await fs.rm(path.join(f.workspace, 'scripts/workflow.mjs'));
  f.event('scripts', 'workflow.mjs'); await f.drain(); assert.equal(f.monitor.error.code, 'PLAN_READ_FAILED');
  await fs.writeFile(path.join(f.workspace, 'scripts/workflow.mjs'), '');
  f.event('scripts', null); await f.drain(); assert.equal(f.monitor.error, null);
});

test('directory removal and return rearm from parent without functional polling', async t => {
  const f = await fixture(t); const directory = path.join(f.workspace, '.harness/plans');
  const old = f.handles.get(directory);
  await fs.rename(directory, directory + '-old'); f.event('.harness', 'plans'); await f.drain();
  assert.equal(old.closed, true); assert.equal(f.monitor.error.code, 'PLAN_READ_FAILED');
  assert.equal(f.timers.size, 0);
  await fs.mkdir(directory); f.plan.plan_revision = 5; await f.writePlan();
  f.event('.harness', 'plans'); await f.drain();
  assert.equal(f.monitor.info.planRevision, 5); assert.equal(f.monitor.error, null);
  assert.notEqual(f.handles.get(directory), old);
  old.callback('rename', null); assert.equal(f.timers.size, 0);
});

test('watch errors have bounded rearm, visible state, and explicit recovery', async t => {
  const f = await fixture(t); f.setFail(true);
  f.handles.get(path.join(f.workspace, '.harness/plans')).emit('error', Object.assign(Error('watch failed'), { code: 'EACCES' }));
  await f.drain(); assert.equal(f.monitor.watchError.code, 'PLAN_WATCH_FAILED'); assert.equal(f.timers.size, 0);
  const before = f.reads(); await settle(); assert.equal(f.reads(), before);
  f.setFail(false); await f.monitor.refresh(); await f.drain(); assert.equal(f.monitor.watchError, null);
});

test('event during read reruns; selection A to B to A rejects the old result and closes old handles', async t => {
  const f = await fixture(t); let release, first = true;
  f.beforeRead(async () => { if (first) { first = false; await new Promise(resolve => { release = resolve; }); } });
  const running = f.monitor.tick(); await settle();
  f.plan.plan_revision = 7; await f.writePlan(); f.event('.harness/plans', null);
  // Deliver the queued event while inspect is still pending.
  const callbacks = [...f.timers.values()]; f.timers.clear(); callbacks.forEach(callback => callback());
  const handles = [...f.handles.values()];
  f.setActive({ ...f.selected, sessionId: 'B' }); f.monitor.observeSelection();
  assert.ok(handles.every(handle => handle.closed));
  f.setActive(f.selected); f.monitor.observeSelection();
  release(); await running; await f.drain();
  assert.equal(f.monitor.info.inspectedSessionId, 'session'); assert.equal(f.monitor.info.planRevision, 7);
  f.monitor.close(); assert.equal(f.handles.size, 0); assert.equal(f.timers.size, 0);
});
