import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionControl } from '../src/control/workflow/execution-control.mjs';

const W = '/projects/main', SCOPE = 'orchestrated-scope';
test('backend restart revokes only the plan channel and one Continue restores the pinned route',()=>{
  const value=new ExecutionControl();value.selectRoute(W,SCOPE,'plugin-v1');value.toggle(W,SCOPE);
  value.selectRoute('/legacy',SCOPE,'legacy-dom');value.toggle('/legacy',SCOPE);
  const restored=new ExecutionControl({saved:value.snapshot()});restored.revokeAfterRestart();
  assert.equal(restored.view(W,SCOPE).state,'paused');assert.equal(restored.view(W,SCOPE).reason,'restart');
  assert.equal(restored.view('/legacy',SCOPE).state,'running');assert.equal(restored.toggle(W,SCOPE).state,'running');
  assert.equal(restored.route(W,SCOPE),'plugin-v1');
});
test('the working transport is pinned per plan and old saved plans retain DOM',()=>{
  const c=new ExecutionControl();assert.equal(c.selectRoute(W,SCOPE,'plugin-v1'),'plugin-v1');c.toggle(W,SCOPE);
  assert.equal(c.selectRoute(W,SCOPE,'legacy-dom'),'plugin-v1');
  const restored=new ExecutionControl({saved:c.snapshot()});assert.equal(restored.route(W,SCOPE),'plugin-v1');
  const old=new ExecutionControl({saved:{[W]:{scopeId:SCOPE,state:'running'}}});
  assert.equal(old.selectRoute(W,SCOPE,'plugin-v1'),'legacy-dom');
  assert.equal(restored.selectRoute(W,'next-scope','legacy-dom'),'legacy-dom');
});
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

test('button: archiving stops a started plan at once and leaves idle states alone', () => {
  const { value } = control();
  assert.equal(value.stop(W, SCOPE).state, 'not-started', 'a plan that never started stays not started');
  value.toggle(W, SCOPE);
  assert.deepEqual(value.stop(W, SCOPE), { state: 'paused', reason: 'manual', message: null }, 'no waiting for executors');
  assert.equal(value.enabled(W, SCOPE), false);
  assert.equal(value.toggle(W, SCOPE).state, 'running', 'the plan continues after the project returns');
  value.complete(W, SCOPE);
  assert.equal(value.stop(W, SCOPE).state, 'complete');
});

test('button: removing a project clears its state', () => {
  const { value } = control();
  value.toggle(W, SCOPE);
  assert.equal(value.forget(['/elsewhere']), false);
  assert.equal(value.forget([W]), true);
  assert.equal(value.view(W, SCOPE).state, 'not-started');
});

test('technical block persists its paths and Continue clears only that block; manual and UNKNOWN win',()=>{
  const {value}=control(),issue={code:'MAIN_DIRTY',message:'Check src/user.txt',paths:['src/user.txt']};
  assert.equal(value.block(W,SCOPE,issue).state,'paused');
  const restored=new ExecutionControl({saved:value.snapshot()});restored.revokeAfterRestart();
  assert.equal(restored.view(W,SCOPE).reason,'blocked');assert.deepEqual(restored.view(W,SCOPE).issue.paths,issue.paths);
  restored.toggle(W,SCOPE);assert.equal(restored.view(W,SCOPE).issue,undefined);
  restored.block(W,SCOPE,issue,{busy:true});assert.equal(restored.settle(W,SCOPE,{busy:true}).state,'pausing');
  assert.equal(restored.settle(W,SCOPE,{busy:false}).state,'paused');
  restored.toggle(W,SCOPE);restored.toggle(W,SCOPE);
  assert.equal(restored.block(W,SCOPE,issue).reason,'manual');
  restored.settle(W,SCOPE,{busy:false});restored.toggle(W,SCOPE);restored.pause(W,SCOPE,'unknown');
  assert.equal(restored.block(W,SCOPE,issue).reason,'unknown');
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
  const live = [],preflight={mainClean:true,mainChanges:[],assignments:[],commandActive:false,confirmed:true,
    plan:{project_id:'main-id',scope_id:SCOPE},integration:{status:'IDLE'}};
  let inspectGate=null,inspectionStarted=null;
  const create = () => {
    const control = new ControlFacade({ storageFile: path.join(root, 'profile/sessions.json'), execution: {} });
    control.configureProjects({});
    const workflow = control.configureWorkflow({ getController: () => null, available: () => false, contextAvailable: () => false,
      onChange: () => {}, report: () => {}, save: async () => {},inspectExecution:async()=>{
        inspectionStarted?.();if(inspectGate)await inspectGate;return preflight;
      } });
    workflow.attachSessions({ all: () => live, find: () => null, visible: null, paused: true });
    t.after(() => { workflow.planContinuation.dispose(); workflow.execution.dispose(); workflow.planMonitor.close(); workflow.planReview.dispose(); workflow.reviewContinuation.dispose(); });
    return { control, workflow };
  };
  const { control, workflow } = create();
  const main = await control.projects.select(folder);
  await assert.rejects(workflow.setPlanExecution(), { code: 'PLAN_EXECUTION_UNAVAILABLE' });
  await write({ scope_id: 'legacy', execution_scope_status: 'ACTIVE', plan_revision: 2,
    tasks: [{ id: 'T001', title: 'Task', implementation_status: 'TODO', commit_status: 'PENDING' }] });
  // A plan of the former model is driven by the same button (this fixture has no real Kit to start it).
  await assert.rejects(workflow.setPlanExecution(), error => error.code !== 'PLAN_EXECUTION_UNAVAILABLE', 'the button accepts a former plan');
  assert.equal(workflow.setPlanContinuation, undefined, 'no PlanContinuation switch');
  await write({ scope_id: SCOPE, execution_scope_status: 'ACTIVE', plan_revision: 3, parallel_allowed: true, max_workers: 2,
    execution_strategy: 'orchestrated', execution_reason: 'Fixture', execution_origin_session_id: main.sessionId, release: false,
    tasks: [{ id: 'T001', title: 'Task', implementation_status: 'TODO', commit_status: 'PENDING' }] });
  assert.equal(workflow.executionControl.view(main.workspace, SCOPE).state, 'not-started');
  // An executor follows the plan button only; the legacy PlanContinuation switch plays no part.
  const enabled = [];
  live.push({ project: () => ({ parentWorkspace: main.workspace, parentScopeId: SCOPE }),
    executor: { setEnabled: value => enabled.push(value) }, controller: { signal: () => {} } });
  assert.equal(workflow.executorEnabled(main.workspace, SCOPE), false, 'not started: the executor waits');
  preflight.mainClean=false;preflight.mainChanges=[{path:'src/user file.txt',status:'??'}];
  const blocked=await workflow.setPlanExecution();
  assert.equal(blocked.state,'paused');assert.equal(blocked.reason,'blocked');
  assert.deepEqual(blocked.issue.paths,['src/user file.txt']);assert.equal(workflow.executorEnabled(main.workspace,SCOPE),false);
  assert.equal((await workflow.setPlanExecution(true)).state,'paused','dirty Continue creates no work');
  preflight.mainClean=true;preflight.mainChanges=[];
  preflight.integration.status='UNKNOWN';
  assert.equal((await workflow.setPlanExecution(true)).reason,'unknown');
  assert.equal(workflow.executorEnabled(main.workspace,SCOPE),false,'Continue does not clear a real UNKNOWN');
  preflight.integration.status='IDLE';
  let release;inspectGate=new Promise(resolve=>release=resolve);
  const entered=new Promise(resolve=>inspectionStarted=resolve),lateContinue=workflow.setPlanExecution(true);
  await entered;await workflow.stopPlanExecution(main.workspace);release();inspectGate=null;inspectionStarted=null;
  assert.equal((await lateContinue).reason,'manual','a newer Stop cancels an in-flight clean preflight');
  assert.equal((await workflow.setPlanExecution()).state, 'running');
  assert.equal(workflow.executorEnabled(main.workspace, SCOPE), true);
  assert.equal(workflow.projectPlanContinuation.enabled(main.workspace, SCOPE), false, 'PlanContinuation stays off');
  assert.equal(enabled.at(-1),true);assert.ok(enabled.slice(0,-1).every(value=>value===false),'nothing enables the executor before the final clean Continue');
  live.length = 0;
  const saved = workflow.snapshot();
  assert.equal(saved.executionControl[main.workspace].state, 'running');
  await control.projects.whenIdle();
  const second = create();await second.control.projects.load();const restarted = second.workflow;restarted.restore(saved);
  assert.equal(restarted.executionControl.view(main.workspace, SCOPE).state, 'running');
  await restarted.holdProjectsForRecovery([main.workspace]);
  assert.equal(restarted.executionControl.view(main.workspace,SCOPE).state,'paused');
  assert.equal(restarted.executorEnabled(main.workspace,SCOPE),false);
  await assert.rejects(restarted.setPlanExecution(true),{code:'PROJECT_RECOVERY_REQUIRED'});
  assert.throws(()=>restarted.prepareBootstrap(main),{code:'PROJECT_RECOVERY_REQUIRED'});
  assert.throws(()=>restarted.execution.recheck(main.workspace),{code:'PROJECT_RECOVERY_REQUIRED'});
  assert.doesNotThrow(()=>restarted.execution.observe(main.workspace),'sidebar observation cannot restart held work');
  await restarted.stopPlanExecution(main.workspace);
  const completed=restarted.snapshot();
  completed.executionControl[main.workspace]={...completed.executionControl[main.workspace],state:'complete',route:'plugin-v1'};
  const third=create();await third.control.projects.load();await third.control.projects.reconcileRoles(main.workspace);third.workflow.restore(completed);
  assert.equal((await third.workflow.stopPlanExecution(main.workspace)).state,'complete',
    'archiving an already complete run preserves completion instead of revoking it into pause');
  restarted.cleanup([{ workspace: main.workspace, projectId: main.projectId, sessionIds: [main.sessionId] }]);
  assert.equal(restarted.executionControl.view(main.workspace, SCOPE).state, 'not-started');
});
