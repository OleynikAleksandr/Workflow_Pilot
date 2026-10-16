import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionControl } from '../src/control/workflow/execution-control.mjs';

const W = '/projects/main', SCOPE = 'orchestrated-scope';
function control(projectId = 'project-1') {
  const changes = [];
  const value = new ExecutionControl({ identity: () => projectId, now: () => 1000, onChange: workspace => changes.push(workspace) });
  return { value, changes };
}

test('button: start → pause request → paused once executors finish → continue', () => {
  const { value, changes } = control();
  assert.deepEqual(value.view(W, SCOPE), { state: 'not-started', reason: null, message: null }, 'publication does not start execution');
  assert.equal(value.enabled(W, SCOPE), false);
  assert.equal(value.toggle(W, SCOPE).state, 'running');assert.equal(value.enabled(W, SCOPE), true);
  assert.deepEqual(value.toggle(W, SCOPE), { state: 'pausing', reason: 'manual', message: null });
  assert.equal(value.issuing(W, SCOPE), false, 'no new task is issued while pausing');
  assert.throws(() => value.toggle(W, SCOPE), { code: 'PLAN_PAUSING' });
  assert.equal(value.settle(W, SCOPE, { busy: true }).state, 'pausing', 'running executors finish first');
  assert.equal(value.settle(W, SCOPE, { busy: false }).state, 'paused');
  assert.equal(value.toggle(W, SCOPE).state, 'running');
  assert.equal(value.complete(W, SCOPE).state, 'complete');
  assert.throws(() => value.toggle(W, SCOPE), { code: 'PLAN_COMPLETE' });
  assert.ok(changes.length >= 5 && changes.every(item => item === W));
});

test('button: escalation and unknown outcomes pause with their reason; idle states are not paused', () => {
  const { value } = control();
  assert.equal(value.pause(W, SCOPE, 'escalation').state, 'not-started', 'a plan that never started is not paused');
  value.toggle(W, SCOPE);
  assert.deepEqual(value.pause(W, SCOPE, 'escalation', 'Orchestrator cannot fix the build'),
    { state: 'pausing', reason: 'escalation', message: 'Orchestrator cannot fix the build' });
  value.settle(W, SCOPE, { busy: false });
  assert.deepEqual(value.pause(W, SCOPE, 'unknown'), { state: 'paused', reason: 'unknown', message: null });
  assert.throws(() => value.pause(W, SCOPE, 'tired'), { code: 'PLAN_EXECUTION_INVALID' });
  assert.equal(value.toggle(W, SCOPE).state, 'running');
});

test('button: state survives a restart and never transfers to another plan or project', () => {
  const { value } = control();
  value.toggle(W, SCOPE);
  const restored = new ExecutionControl({ saved: value.snapshot(), identity: () => 'project-1' });
  assert.equal(restored.view(W, SCOPE).state, 'running', 'a backend restart continues the plan');
  assert.equal(restored.view(W, 'next-scope').state, 'not-started', 'a new plan starts with its own button');
  const replaced = new ExecutionControl({ saved: value.snapshot(), identity: () => 'another-project' });
  assert.equal(replaced.view(W, SCOPE).state, 'not-started', 'a replaced project does not inherit the state');
  const invalid = new ExecutionControl({ saved: { relative: { scopeId: SCOPE, state: 'running' }, [W]: { scopeId: '../x', state: 'running' },
    '/other': { scopeId: SCOPE, state: 'flying' }, '/third': { scopeId: SCOPE, state: 'paused', reason: 'bored' } } });
  assert.deepEqual(invalid.snapshot(), {}, 'invalid saved entries are dropped');
  assert.throws(() => value.toggle('relative', SCOPE), { code: 'PLAN_EXECUTION_INVALID' });
});

test('button: removing a project clears its state', () => {
  const { value } = control();
  value.toggle(W, SCOPE);
  assert.equal(value.forget(['/elsewhere']), false);
  assert.equal(value.forget([W]), true);
  assert.equal(value.view(W, SCOPE).state, 'not-started');
});

test('button command: only a published orchestrated plan starts, the state is saved and purged with its project', async t => {
  const fs = await import('node:fs/promises'), path = await import('node:path'), os = await import('node:os');
  const { ControlFacade } = await import('../src/control/facade.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-pilot-button-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, 'Main');
  await fs.mkdir(path.join(folder, '.harness/plans'), { recursive: true });await fs.mkdir(path.join(folder, 'scripts'));
  await fs.writeFile(path.join(folder, 'scripts/workflow.mjs'), '// fixture');
  const write = state => fs.writeFile(path.join(folder, '.harness/plans/todo-plan.md'), '<!-- workflow-state:begin -->\n```json\n'
    + JSON.stringify({ schema_version: 1, project_id: 'main-id', project_name: 'Main', plan_revision: 1, scope_id: null,
      execution_scope_status: 'NONE', delivery_status: 'IN_PROGRESS', current_task_id: null, tasks: [], ...state }) + '\n```\n<!-- workflow-state:end -->');
  await write({});
  const create = () => {
    const control = new ControlFacade({ storageFile: path.join(root, 'profile/sessions.json'), execution: {} });
    control.configureProjects({});
    const workflow = control.configureWorkflow({ getController: () => null, available: () => false, contextAvailable: () => false,
      onChange: () => {}, report: () => {}, save: async () => {} });
    workflow.attachSessions({ all: () => [], find: () => null, visible: null, paused: true });
    t.after(() => { workflow.autoPlan.dispose(); workflow.execution.dispose(); workflow.planMonitor.close(); workflow.planReview.dispose(); workflow.reviewContinuation.dispose(); });
    return { control, workflow };
  };
  const { control, workflow } = create();
  const main = await control.projects.select(folder);
  await assert.rejects(workflow.setPlanExecution(), { code: 'PLAN_EXECUTION_UNAVAILABLE' });
  await write({ scope_id: 'legacy', execution_scope_status: 'ACTIVE', plan_revision: 2,
    tasks: [{ id: 'T001', title: 'Task', implementation_status: 'TODO', commit_status: 'PENDING' }] });
  await assert.rejects(workflow.setPlanExecution(), { code: 'PLAN_EXECUTION_UNAVAILABLE' }, 'a legacy plan keeps AutoPlan');
  await write({ scope_id: SCOPE, execution_scope_status: 'ACTIVE', plan_revision: 3, parallel_allowed: true, max_workers: 2,
    execution_strategy: 'orchestrated', execution_reason: 'Fixture', execution_origin_session_id: main.sessionId, release: false,
    tasks: [{ id: 'T001', title: 'Task', implementation_status: 'TODO', commit_status: 'PENDING' }] });
  assert.equal(workflow.executionControl.view(main.workspace, SCOPE).state, 'not-started');
  assert.equal((await workflow.setPlanExecution()).state, 'running');
  await assert.rejects(workflow.setAutoPlan(true), { code: 'PLAN_EXECUTION_BUTTON' }, 'the legacy switch does not drive an orchestrated plan');
  const saved = workflow.snapshot();
  assert.equal(saved.executionControl[main.workspace].state, 'running');
  await control.projects.whenIdle();
  const second = create();await second.control.projects.load();const restarted = second.workflow;restarted.restore(saved);
  assert.equal(restarted.executionControl.view(main.workspace, SCOPE).state, 'running');
  restarted.cleanup([{ workspace: main.workspace, projectId: main.projectId, sessionIds: [main.sessionId] }]);
  assert.equal(restarted.executionControl.view(main.workspace, SCOPE).state, 'not-started');
});
