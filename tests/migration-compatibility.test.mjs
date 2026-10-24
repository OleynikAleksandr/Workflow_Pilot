import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { install } from '@webpilot/workflow-kit/lib/installer';
import { VERSION } from '@webpilot/workflow-kit/lib/common';
import { readPlan } from '@webpilot/workflow-kit/lib/plan';
import { resolveReferences } from '@webpilot/workflow-kit/lib/validate';
import { ControlFacade } from '../src/control/facade.mjs';
import { ExecutionFacade } from '../src/execution/facade.mjs';

const PLAN = '.harness/plans/todo-plan.md';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const resourceDir = fileURLToPath(new URL('../resources/', import.meta.url));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-donor-172-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project'), old = path.join(root, 'old');
  fs.mkdirSync(project); fs.mkdirSync(old);
  const base = new URL('./fixtures/released-kit/', import.meta.url);
  const entry = JSON.parse(fs.readFileSync(new URL('manifest.json', base))).archives.find(x => x.version === '1.7.2');
  const archive = fs.readFileSync(new URL(entry.file, base));
  assert.equal(sha(archive), entry.sha256, 'immutable pre-migration runtime, not relabelled current source');
  execFileSync('tar', ['-x', '-C', old], { input: gunzipSync(archive) });
  const env = { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' };
  for (const key of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'WORKFLOW_TEST_FAILPOINT']) delete env[key];
  const run = (exe, args, extra = {}) => execFileSync(exe, args, { cwd: project, env: { ...env, ...extra }, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const cli = (...args) => JSON.parse(run(process.execPath, ['scripts/workflow.mjs', ...args]));
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(project, file)), { recursive: true }); fs.writeFileSync(path.join(project, file), value); };
  run('git', ['init', '-q', '-b', 'main']);
  run('git', ['config', '--local', 'user.name', 'Fixture']);
  run('git', ['config', '--local', 'user.email', 'fixture@example.invalid']);
  run(process.execPath, [path.join(old, '.harness/kit/install.mjs'), '--project', project]);
  cli('install:commit');
  assert.equal(cli('status').version, '1.7.2');
  const createPlan = () => {
    write('docs/planning/continue.md', '# Continue donor project\n');
    write('.harness/runtime/input.json', JSON.stringify({ id: 'donor-continuation', objective: 'Continue without importing app state',
      spec: 'docs/planning/continue.md', tasks: [
        { id: 'T001', title: 'First', files: ['README.md'], commit: 'docs: first' },
        { id: 'T002', title: 'Second', files: ['README.md'], dependencies: ['T001'], commit: 'docs: second' },
      ] }));
    cli('plan:create', '--input', '.harness/runtime/input.json');
  };
  const change = () => fs.appendFileSync(path.join(project, 'README.md'), '\nFixture task change.\n');
  const control = () => {
    const instance = new ControlFacade({ storageFile: path.join(root, 'new-profile/sessions.json'), execution: new ExecutionFacade() });
    instance.configureProjects({ resourceDir, nodeCandidates: [process.execPath], environment: env });
    return instance;
  };
  const snapshot = () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(project, '.harness/kit-manifest.json')));
    const files = [...new Set([PLAN, '.harness/kit-manifest.json', ...manifest.files.filter(x => x.kind !== 'git-hook').map(x => x.path)])];
    return { head: run('git', ['rev-parse', 'HEAD']), index: run('git', ['ls-files', '--stage']),
      files: Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(project, file)))])) };
  };
  return { root, project, run, cli, write, createPlan, change, control, snapshot };
}

for (const state of ['NONE', 'ACTIVE', 'PARTIAL_DONE']) test('donor 1.7.2 ' + state + ': open folder, upgrade, new session, recovery and continuation', async t => {
  const f = fixture(t);
  if (state !== 'NONE') {
    f.createPlan(); f.cli('task:start', 'T001');
    if (state === 'PARTIAL_DONE') { f.change(); f.cli('commit', '--task', 'T001'); f.cli('task:start', 'T002'); }
    f.change(); // Active edits belong to the old task and survive the service commit.
  }
  const before = readPlan(f.project), bytes = fs.readFileSync(path.join(f.project, PLAN));
  const refs = resolveReferences(f.project, before), history = f.run('git', ['rev-list', 'HEAD']).trim().split('\n');
  const content = fs.readFileSync(path.join(f.project, 'README.md'));
  const control = f.control();
  await control.projects.load();
  assert.equal(control.projects.snapshot().projects.length, 0, 'new app profile has no donor app-state');
  const preview = await control.setup.preview({ mode: 'existing', workspace: f.project });
  assert.equal(preview.action, 'upgrade'); assert.equal(preview.version, '1.7.2');
  assert.equal((await control.setup.apply(preview.token)).ready, true);
  assert.equal(f.cli('status').version, VERSION);
  assert.deepEqual(fs.readFileSync(path.join(f.project, PLAN)), bytes);
  assert.deepEqual(fs.readFileSync(path.join(f.project, 'README.md')), content);
  assert.deepEqual(resolveReferences(f.project, readPlan(f.project)), refs);
  assert.deepEqual(f.run('git', ['rev-list', 'HEAD']).trim().split('\n').slice(1), history, 'one kit-update, unchanged donor history');
  const first = await control.projects.select(f.project, { experience: 'chat' });
  const second = await control.projects.newSession(first.workspace, 'chat');
  assert.equal(first.projectId, before.project_id); assert.equal(second.projectId, before.project_id);
  assert.notEqual(first.sessionId, second.sessionId); assert.equal(first.chatUrl, null); assert.equal(second.chatUrl, null);
  const packet = await control.plans.loadContext(first.workspace);
  assert.equal(packet.completeness, 'COMPLETE'); assert.equal(packet.facts.project_id, before.project_id);
  assert.equal(packet.plan_id, before.scope_id); assert.equal(packet.facts.task_id, before.current_task_id);
  assert.deepEqual(fs.readFileSync(path.join(f.project, PLAN)), bytes, 'sessions and recovery never copy or reset the plan');
  const restarted = f.control(); await restarted.projects.load();
  assert.equal(restarted.projects.selected().sessionId, second.sessionId);
  assert.equal((await restarted.plans.loadContext(first.workspace)).facts.project_id, before.project_id);
  if (state === 'NONE') { f.createPlan(); f.cli('task:start', 'T001'); f.change(); }
  const task = readPlan(f.project).current_task_id;
  assert.equal(f.cli('commit', '--task', task).ok, true);
  const continued = readPlan(f.project);
  assert.equal(continued.project_id, before.project_id);
  assert.equal(continued.tasks.find(x => x.id === task).commit_status, 'DONE');
  if (refs.T001) assert.equal(resolveReferences(f.project, continued).T001.sha, refs.T001.sha);
});

test('donor guards preserve unknown versions, foreign operation locks and interrupted transactions', async t => {
  const f = fixture(t), control = f.control(), manifestFile = path.join(f.project, '.harness/kit-manifest.json');
  const original = fs.readFileSync(manifestFile, 'utf8'), manifest = JSON.parse(original);
  f.write('.harness/kit-manifest.json', JSON.stringify({ ...manifest, version: '99.0.0' }));
  let before = f.snapshot();
  assert.equal((await control.setup.preview({ mode: 'existing', workspace: f.project })).action, null);
  assert.throws(() => install({ project: f.project, update: true }), { code: 'UNSUPPORTED_MIGRATION' });
  assert.deepEqual(f.snapshot(), before);
  f.write('.harness/kit-manifest.json', original);

  const lock = '.git/workflow-kit/operation.lock', owner = JSON.stringify({ pid: process.pid, client: 'donor' });
  f.write(lock, owner); before = f.snapshot();
  assert.equal((await control.setup.preview({ mode: 'existing', workspace: f.project })).action, null);
  await assert.rejects(control.setup.ready(f.project), { code: 'READINESS_BUSY' });
  assert.throws(() => install({ project: f.project, update: true }), { code: 'WORKFLOW_LOCKED' });
  assert.deepEqual(f.snapshot(), before); assert.equal(fs.readFileSync(path.join(f.project, lock), 'utf8'), owner);
  fs.unlinkSync(path.join(f.project, lock));

  f.createPlan(); f.cli('task:start', 'T001'); f.change();
  assert.throws(() => f.run(process.execPath, ['scripts/workflow.mjs', 'commit', '--task', 'T001'], { WORKFLOW_TEST_FAILPOINT: 'prepared' }),
    error => String(error.stdout).includes('TEST_INTERRUPTION'));
  const journalFile = path.join(f.project, '.git/workflow-kit/transaction.json'), journal = fs.readFileSync(journalFile);
  before = f.snapshot();
  assert.equal((await control.setup.preview({ mode: 'existing', workspace: f.project })).action, null);
  assert.throws(() => install({ project: f.project, update: true }), { code: 'TRANSACTION_PENDING' });
  assert.deepEqual(f.snapshot(), before); assert.deepEqual(fs.readFileSync(journalFile), journal);
  assert.equal(f.cli('recover', '--format', 'json').transaction_pending, true);
  assert.equal(f.cli('commit', '--task', 'T001').ok, true, 'old runtime finishes its own transaction');
  assert.equal(install({ project: f.project, update: true }).upgraded, true);
  assert.equal(readPlan(f.project).tasks[0].commit_status, 'DONE');
});
