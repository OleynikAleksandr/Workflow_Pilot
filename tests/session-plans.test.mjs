import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { emptyPlan, renderPlan, readPlan, writePlan } from '@webpilot/workflow-kit/lib/plan';
import { sessionPlanView, selectPlan, withSessionPlan, ownedPlanPath } from '@webpilot/workflow-kit/lib/session-plans';
import { WorkspaceSetup } from '../src/workspace-setup.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'single-active-plan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = emptyPlan('Fixture');
  const plan = {
    ...base,
    scope_id: 'alpha',
    execution_scope_status: 'ACTIVE',
    baseline_commit: 'a'.repeat(40),
    objective: 'alpha',
    acceptance_criteria: ['done'],
    approved_scope: { functional_paths: [], documentation_paths: ['docs/notes.md'], max_functional_files_per_task: 3 },
    tasks: [{
      id: 'T1', title: 'alpha', why: 'fixture', dependencies: [], functional_paths: [],
      documentation_paths: ['docs/notes.md'], acceptance_criteria: ['done'], verification_ids: [],
      expected_commit_message: 'docs: alpha', implementation_status: 'TODO', commit_status: 'PENDING',
      commit_ref: { scope_id: 'alpha', task_id: 'T1', role: 'implementation' },
    }],
  };
  writePlan(root, plan);
  return { root, plan };
}

test('every chat address projects the same current checkout plan', t => {
  const { root } = fixture(t);
  for (const sessionId of ['session-a', 'session-b', 'session-new']) {
    const view = sessionPlanView(root, sessionId);
    assert.equal(view.plan_id, 'alpha');
    assert.equal(view.plan_path, '.harness/plans/todo-plan.md');
    assert.equal(view.session_id, sessionId);
    assert.deepEqual(view.prepared, []);
    assert.deepEqual(view.unassigned, []);
  }
  assert.equal(selectPlan(root).plan.scope_id, 'alpha');
  assert.equal(selectPlan(root, { sessionId: 'session-a' }).plan.scope_id, 'alpha');
  assert.equal(selectPlan(root, { sessionId: 'session-b', planId: 'alpha' }).plan.scope_id, 'alpha');
  assert.throws(() => selectPlan(root, { sessionId: 'session-a', planId: 'historical' }), { code: 'PLAN_NOT_CURRENT' });
  assert.throws(() => ownedPlanPath('../outside'), { code: 'PLAN_ID' });
});

test('transitional withSessionPlan echoes session metadata but never redirects the plan', async t => {
  const { root } = fixture(t);
  const values = await Promise.all([
    withSessionPlan(root, { sessionId: 'a' }, async selected => {
      await Promise.resolve();
      return [selected.sessionId, readPlan(root).scope_id];
    }),
    withSessionPlan(root, { sessionId: 'b' }, async selected => {
      await Promise.resolve();
      return [selected.sessionId, readPlan(root).scope_id];
    }),
    withSessionPlan(root, {}, async selected => [selected.sessionId, readPlan(root).scope_id]),
  ]);
  assert.deepEqual(values, [['a', 'alpha'], ['b', 'alpha'], [null, 'alpha']]);
  assert.equal(readPlan(root).scope_id, 'alpha');
});

test('Web Pilot fast projection reads only current todo-plan and never executes installed legacy facade', async t => {
  const { root } = fixture(t);
  fs.mkdirSync(path.join(root, '.harness/kit/lib'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/workflow.mjs'), 'throw new Error("untrusted launcher");');
  const marker = path.join(root, 'executed');
  fs.writeFileSync(path.join(root, '.harness/kit/lib/session-plans.mjs'),
    `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'bad'); throw new Error('untrusted facade');`);
  const { readWorkspace } = await import('../src/workspace-session.mjs');
  const a = await readWorkspace(root, 'session-a');
  const b = await readWorkspace(root, 'session-b');
  const c = await readWorkspace(root, 'session-new');
  assert.equal(a.planId, 'alpha'); assert.equal(b.planId, 'alpha'); assert.equal(c.planId, 'alpha');
  assert.equal(a.planRevision, b.planRevision); assert.deepEqual(a.planView, b.planView);
  assert.equal(fs.existsSync(marker), false);
});

const environment = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Plan Test', GIT_AUTHOR_EMAIL: 'plan@example.invalid',
  GIT_COMMITTER_NAME: 'Plan Test', GIT_COMMITTER_EMAIL: 'plan@example.invalid',
};
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX']) delete environment[key];

async function lifecycleFixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'single-active-lifecycle-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const setup = new WorkspaceSetup({ environment });
  const preview = await setup.preview({ mode: 'new', parent, name: 'Single active fixture' });
  const result = await setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result));
  const root = result.workspace;
  const cli = (...args) => {
    let stdout;
    try {
      stdout = execFileSync(process.execPath, ['scripts/workflow.mjs', ...args], {
        cwd: root, env: environment, encoding: 'utf8', maxBuffer: 4e6,
      });
    } catch (error) { stdout = error.stdout; }
    return JSON.parse(stdout);
  };
  const input = value => {
    const file = path.join(root, '.harness/runtime/input.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
    return file;
  };
  const scope = {
    scope_id: 'checkout-plan', objective: 'Checkout plan', approval_note: 'Пользователь согласовал эту проверку.',
    acceptance_criteria: ['Done'],
    approved_scope: { functional_paths: [], documentation_paths: ['docs/architecture/OVERVIEW.md'], max_functional_files_per_task: 3 },
    tasks: [{
      id: 'T1', title: 'Result', why: 'Fixture', dependencies: [], functional_paths: [],
      documentation_paths: ['docs/architecture/OVERVIEW.md'], acceptance_criteria: ['Done'],
      verification_ids: [], expected_commit_message: 'docs: checkout fixture',
    }],
  };
  return { root, cli, input, scope };
}

test('legacy --session is a no-op selector and removed handoff commands stay removed', async t => {
  const { root, cli, input, scope } = await lifecycleFixture(t);
  const created = cli('scope:create', '--session', 'chat-a', '--input', input(scope), '--expected-revision', '1');
  assert.equal(created.ok, true, JSON.stringify(created));

  const direct = cli('plan:view');
  const a = cli('plan:view', '--session', 'chat-a');
  const b = cli('plan:view', '--session', 'chat-b');
  assert.equal(direct.plan_id, 'checkout-plan');
  assert.equal(a.plan_id, 'checkout-plan'); assert.equal(b.plan_id, 'checkout-plan');
  assert.equal(a.plan.plan_revision, b.plan.plan_revision);
  assert.deepEqual(a.prepared, []); assert.deepEqual(b.prepared, []);

  const recovery = cli('recover', '--format', 'json');
  assert.equal(recovery.ok, true, JSON.stringify(recovery));
  assert.equal(recovery.scope_id, 'checkout-plan');

  const prepare = cli('plan:prepare', '--session', 'chat-a', '--input', input(scope), '--expected-revision', String(a.plan.plan_revision));
  assert.equal(prepare.code, 'COMMAND_REMOVED');
  const bind = cli('plan:bind', '--session', 'chat-a', '--plan', 'checkout-plan', '--target-session', 'chat-b', '--experience', 'work',
    '--expected-revision', String(a.plan.plan_revision));
  assert.equal(bind.code, 'COMMAND_REMOVED');

  const started = cli('task:start', 'T1', '--session', 'chat-b');
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.equal(cli('plan:view', '--session', 'chat-a').plan.current_task_id, 'T1');
  assert.equal(cli('plan:view').plan.current_task_id, 'T1');
  assert.equal(fs.existsSync(path.join(root, '.harness/plans/by-session/chat-a.md')), false);
  assert.equal(fs.existsSync(path.join(root, '.harness/plans/by-session/chat-b.md')), false);
});
