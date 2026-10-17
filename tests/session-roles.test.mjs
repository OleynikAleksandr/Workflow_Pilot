import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { WorkspaceSessions, applySessionRoles, newSessionRole } from '../src/control/sessions/workspace-session.mjs';

const CLOSED = 'c'.repeat(40);
async function fixture(t, plan = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-roles-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, 'Project'), id = randomUUID();
  await fs.mkdir(path.join(folder, '.harness/plans'), { recursive: true });
  await fs.mkdir(path.join(folder, 'scripts'), { recursive: true });
  await fs.writeFile(path.join(folder, 'scripts/workflow.mjs'), '// fixture');
  const write = async state => {
    const value = { schema_version: 1, project_id: id, project_name: 'Project', plan_revision: 1, scope_id: null,
      execution_scope_status: 'NONE', delivery_status: 'IN_PROGRESS', current_task_id: null, tasks: [], ...state };
    await fs.writeFile(path.join(folder, '.harness/plans/todo-plan.md'),
      '<!-- workflow-state:begin -->\n```json\n' + JSON.stringify(value) + '\n```\n<!-- workflow-state:end -->');
  };
  await write(plan);
  const gitCalls = [];
  const store = new WorkspaceSessions(path.join(root, 'app-data/sessions.json'), {
    git: async (_workspace, args) => { gitCalls.push(args); return args.some(arg => arg === '--grep=Workflow-Role: archive') ? CLOSED : ''; } });
  return { root, folder: await fs.realpath(folder), store, write, gitCalls, id };
}
const orchestrated = (origin, extra = {}) => ({ scope_id: 'orchestrated-scope', execution_scope_status: 'ACTIVE', plan_revision: 2,
  objective: 'Orchestrated plan', parallel_allowed: true, max_workers: 2, execution_strategy: 'orchestrated',
  execution_reason: 'Fixture', execution_origin_session_id: origin, release: false,
  tasks: [{ id: 'T001', title: 'Task', implementation_status: 'TODO', commit_status: 'PENDING' }], ...extra });
const session = (store, folder, id) => store.snapshot().projects.find(p => p.workspace === folder).sessions.find(s => s.sessionId === id);

test('roles: a session without a plan is a candidate, publication picks the origin, the rest become discussion chats', async t => {
  const { folder, store, write } = await fixture(t);
  const first = await store.select(folder);
  assert.equal(first.role, 'orchestrator');
  const second = await store.newSession(folder, 'chat');
  assert.equal(second.role, 'orchestrator');assert.equal(second.orchestratorScopeId, undefined);
  // A legacy session from an earlier version has no role.
  const legacy = await store.newSession(folder, 'chat');
  delete store.data.projects[0].sessions.find(s => s.sessionId === legacy.sessionId).role;
  await write(orchestrated(second.sessionId));
  assert.equal(await store.reconcileRoles(folder), true);
  assert.equal(session(store, folder, second.sessionId).role, 'orchestrator');
  assert.equal(session(store, folder, second.sessionId).orchestratorScopeId, 'orchestrated-scope');
  for (const id of [first.sessionId, legacy.sessionId]) assert.equal(session(store, folder, id).role, 'discussion');
  assert.equal(store.project(folder).orchestrationIssue, null);
  assert.equal(await store.reconcileRoles(folder), false, 'repeat changes nothing');
  const third = await store.newSession(folder, 'work');
  assert.equal(third.role, 'discussion', 'a new session beside the active plan is a discussion chat');
  // Roles survive a restart; derived state is not persisted.
  const restarted = new WorkspaceSessions(store.file);await restarted.load();
  assert.equal(restarted.project(folder, second.sessionId).role, 'orchestrator');
  assert.equal(JSON.parse(await fs.readFile(store.file, 'utf8')).projects[0].orchestrationIssue, undefined);
});

test('roles: the orchestrator of an active plan and its project cannot be archived; discussion chats can', async t => {
  const { folder, store, write } = await fixture(t);
  const orchestrator = await store.select(folder), chat = await store.newSession(folder, 'chat');
  await write(orchestrated(orchestrator.sessionId));await store.reconcileRoles(folder);
  await assert.rejects(store.setSessionArchived(folder, orchestrator.sessionId, true), { code: 'ORCHESTRATOR_ACTIVE' });
  await assert.rejects(store.setArchived(folder, true), { code: 'PLAN_ACTIVE' });
  assert.equal((await store.setSessionArchived(folder, chat.sessionId, true)).selectedSessionId, orchestrator.sessionId);
});

test('roles: a closed plan keeps its orchestrator with the closing commit; the next plan gets a new one', async t => {
  const { folder, store, write, gitCalls } = await fixture(t);
  const first = await store.select(folder);
  await write(orchestrated(first.sessionId));await store.reconcileRoles(folder);
  await write({ plan_revision: 3, archived_scope_id: 'orchestrated-scope' });
  assert.equal(await store.reconcileRoles(folder), true);
  const closed = session(store, folder, first.sessionId);
  assert.equal(closed.role, 'orchestrator');assert.equal(closed.closedPlanCommit, CLOSED);
  assert.ok(gitCalls.some(args => args.includes('--grep=Workflow-Scope: orchestrated-scope')));
  assert.equal(await store.setSessionArchived(folder, first.sessionId, false) && true, true);
  const next = await store.newSession(folder, 'chat');assert.equal(next.role, 'orchestrator');
  await write(orchestrated(next.sessionId, { scope_id: 'second-scope', plan_revision: 4 }));await store.reconcileRoles(folder);
  assert.equal(session(store, folder, first.sessionId).orchestratorScopeId, 'orchestrated-scope', 'earlier orchestrators keep their plan');
  assert.equal(session(store, folder, next.sessionId).orchestratorScopeId, 'second-scope');
});

test('roles: an unknown origin needs the user, who explicitly assigns the orchestrator', async t => {
  const { folder, store, write } = await fixture(t);
  const first = await store.select(folder), second = await store.newSession(folder, 'chat');
  await write(orchestrated('web-pilot-unknown'));await store.reconcileRoles(folder);
  assert.equal(store.project(folder).orchestrationIssue, 'ORIGIN_MISMATCH');
  for (const id of [first.sessionId, second.sessionId]) assert.equal(session(store, folder, id).role, 'discussion');
  await assert.rejects(store.assignOrchestrator(folder, 'missing'), { code: 'SESSION_NOT_FOUND' });
  const chosen = await store.assignOrchestrator(folder, first.sessionId);
  assert.equal(chosen.role, 'orchestrator');assert.equal(chosen.orchestratorScopeId, 'orchestrated-scope');
  await store.reconcileRoles(folder);
  assert.equal(store.project(folder).orchestrationIssue, null);
  assert.equal(session(store, folder, first.sessionId).role, 'orchestrator');
  await assert.rejects(store.assignOrchestrator(folder, second.sessionId), { code: 'ORCHESTRATOR_PRESENT' });
});

test('roles: a legacy active plan keeps role-less sessions and plugin sessions get no role', async t => {
  const { folder, store, write, id } = await fixture(t, { scope_id: 'legacy', execution_scope_status: 'ACTIVE',
    tasks: [{ id: 'T001', title: 'Task', implementation_status: 'TODO', commit_status: 'PENDING' }] });
  const first = await store.select(folder);
  assert.equal(first.role, undefined);assert.equal((await store.newSession(folder, 'chat')).role, undefined);
  const plugin = await store.connectExternal(folder, { projectId: id, requestId: randomUUID(), conversationKey: 'a'.repeat(64) });
  assert.equal(plugin.role, undefined);
  await write(orchestrated(first.sessionId, { scope_id: 'next', plan_revision: 5 }));await store.reconcileRoles(folder);
  assert.equal(session(store, folder, plugin.sessionId).role, undefined, 'plugin sessions stay outside roles');
  assert.equal(newSessionRole({ scopeStatus: 'NONE' }), 'orchestrator');
  assert.equal(newSessionRole({ scopeStatus: 'ACTIVE', planExecution: { execution_strategy: 'parallel' } }), undefined);
  assert.equal(applySessionRoles({ scopeStatus: 'NONE', sessions: [] }), false);
});

test('roles: an executor keeps its saved projection and chat after Kit removes the integrated worktree', async t => {
  const { root, folder, store } = await fixture(t);
  store.getExecutionSettings = () => ({ parallel_allowed: true, max_workers: 2 });
  const main = await store.select(folder);
  const worktree = path.join(root, 'worktree');
  await fs.mkdir(path.join(worktree, '.harness/plans'), { recursive: true });await fs.mkdir(path.join(worktree, 'scripts'), { recursive: true });
  await fs.writeFile(path.join(worktree, 'scripts/workflow.mjs'), '// fixture');
  await fs.writeFile(path.join(worktree, '.harness/plans/todo-plan.md'), await fs.readFile(path.join(folder, '.harness/plans/todo-plan.md')));
  const executor = await store.ensureExecutor({ id: 'wp-one', worktree, parent_root: folder, parent_scope_id: 'scope', parent_task_id: 'T001', title: 'Task' }, main);
  assert.equal(executor.role, 'executor');
  await fs.rm(worktree, { recursive: true, force: true });
  const info = await store.inspect(executor.workspace, executor.sessionId);
  assert.equal(info.worktreeRemoved, true);assert.equal(info.projectId, executor.projectId);
  const selected = await store.selectSession(executor.workspace, executor.sessionId);
  assert.equal(selected.assignmentId, 'wp-one');assert.equal(selected.role, 'executor');assert.equal(selected.taskId, 'T001');
  assert.equal(JSON.parse(await fs.readFile(store.file, 'utf8')).projects.some(p => 'worktreeRemoved' in p), false);
  await assert.rejects(store.inspect(path.join(root, 'never-existed')), { code: 'WORKFLOW_NOT_INSTALLED' });
});

test('roles: stored roles are validated on load', async t => {
  const { folder, store } = await fixture(t);
  await store.select(folder);await store.mutationTail;
  const data = JSON.parse(await fs.readFile(store.file, 'utf8'));
  data.projects[0].sessions[0].role = 'author';
  await fs.writeFile(store.file, JSON.stringify(data));
  await assert.rejects(new WorkspaceSessions(store.file).load(), { code: 'SESSIONS_INVALID' });
});

test('roles: recovery is requested with the session role and cached separately per role', async t => {
  const { SessionPlans } = await import('../src/control/sessions/session-plans.mjs');
  const { ContextService } = await import('../src/control/context/service.mjs');
  const calls = [];
  const plans = new SessionPlans({ setup: { node: async () => process.execPath, environment: {} }, files: {},
    run: async (_node, args) => { calls.push(args); return { stdout: JSON.stringify({ ok: true }) }; } });
  await plans.loadContext('/project', 'discussion');await plans.loadContext('/project');
  assert.deepEqual(calls[0].slice(-4), ['--format', 'packet', '--role', 'discussion']);
  assert.ok(!calls[1].includes('--role'), 'a legacy session keeps the plain recovery');
  const workspace = path.join(os.tmpdir(), 'roles-context'), loads = [];
  const { createHash } = await import('node:crypto');
  const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
  const packet = role => { const context = 'context ' + role; return { ok: true, delivery_protocol: 'inline-context-v1', ack_required: false,
    status: 'ready', completeness: 'COMPLETE', workspace, role, context, context_bytes: Buffer.byteLength(context), context_sha256: sha(context),
    parts: [{ index: 1, total: 1, text: context, bytes: Buffer.byteLength(context), sha256: sha(context) }], budget: { document_bytes: 28000 },
    signature: 'x', generated_at_ms: Date.now(), facts: { project_id: 'p', project_name: 'P', plan_revision: 1, scope_id: null,
      execution_scope_status: 'NONE', delivery_status: 'IN_PROGRESS', task_id: null, task_title: null } }; };
  const service = new ContextService({ execution: { ensureServices: async () => {} }, plans: {}, getRuntime: () => null, onChange() {},
    setup: { ready: async target => ({ ready: true, workspace: target, inputKey: 'same-inputs' }) },
    loadFixture: async (target, role) => { loads.push(role); return packet(role); } });
  const orchestrator = await service.cache.load(workspace, 'orchestrator');
  assert.equal(orchestrator.workspace, workspace, 'the packet is validated against the folder, not the role key');
  assert.equal((await service.cache.load(workspace, 'discussion')).role, 'discussion');
  await service.cache.load(workspace, 'orchestrator');
  assert.deepEqual(loads.slice(0, 2), ['orchestrator', 'discussion'], 'each role gets its own packet');
  assert.equal(service.cache.isBuilding(workspace), false);
});
