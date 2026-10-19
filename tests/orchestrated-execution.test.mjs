import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createFixture } from '../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import { createScope, startTask, applyConfig } from '../packages/workflow-kit/src/lib/actions.mjs';
import { readPlan } from '../packages/workflow-kit/src/lib/plan.mjs';
import { readConfig } from '../packages/workflow-kit/src/lib/validate.mjs';
import { commitTask } from '../packages/workflow-kit/src/lib/transaction.mjs';
import { startIntegration } from '../packages/workflow-kit/src/lib/task-integration.mjs';
import { cleanupAssignments, assignmentStatus } from '../packages/workflow-kit/src/lib/task-assignment.mjs';
import { blockTask, messageAssignment, escalatePlan } from '../packages/workflow-kit/src/lib/signals.mjs';
import { ParallelExecution } from '../src/control/workflow/parallel-execution.mjs';
import { ParallelKit } from '../src/control/workflow/parallel-kit.mjs';
import { ExecutionControl } from '../src/control/workflow/execution-control.mjs';
import { SessionPlans } from '../src/control/sessions/session-plans.mjs';

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const write = (root, file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text); };
const SPEC = 'docs/planning/orchestration.md';
const task = (id, file, dependencies, parallel_safe) => ({ id, title: 'Write ' + file, why: 'End-to-end fixture', dependencies, parallel_safe,
  functional_paths: [], documentation_paths: [file], verification_ids: [], acceptance_criteria: ['Output committed'], expected_commit_message: 'docs: ' + file });

// The whole orchestrated plan: real Kit CLI and Git, the Control queue and the run button.
// The test plays the executors and the orchestrator with Kit commands; no model runs.
test('orchestrated plan runs end to end: waves, pause, block and escalation, delivery in main, cleanup', { timeout: 300000 }, async t => {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-orchestrated-e2e-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = createFixture(directory);
  const config = readConfig(root);
  config.profile = 'DEVELOPMENT'; config.stack = 'Node fixture';
  config.checks.push({ id: 'pkg', kind: 'package', executable: process.execPath, args: ['-e', '0'], required: false, timeout_ms: 30000, evidence: 'Fixture package' });
  config.delivery_tail = [{ verification_ids: ['pkg'], verification_kind: 'package' }];
  applyConfig(root, config);
  write(root, SPEC, '# Orchestration end to end\n');
  createScope(root, { scope_id: 'e2e', objective: 'End to end orchestration', approval_note: 'Isolated automated fixture',
    parallel_allowed: true, max_workers: 2, execution_strategy: 'orchestrated', execution_reason: 'Sequential base, parallel pair, delivery',
    execution_origin_session_id: 'orchestrator', release: true, acceptance_criteria: ['Only main remains'],
    approved_scope: { functional_paths: ['release.txt'], documentation_paths: ['README.md', 'SECOND.md', 'THIRD.md', SPEC, 'docs/architecture/OVERVIEW.md'] },
    context_pack: { documents: [{ path: SPEC, required: true }], dependency_task_ids: [], include_last_completed_task: false },
    tasks: [task('S1', 'README.md', [], false), task('P1', 'SECOND.md', ['S1'], true), task('P2', 'THIRD.md', ['S1'], true),
      { id: 'R001', title: 'Deliver', why: 'Delivery in main', dependencies: [], functional_paths: ['release.txt'], documentation_paths: [],
        verification_ids: ['pkg'], verification_kind: 'package', acceptance_criteria: ['Delivered'], expected_commit_message: 'release: deliver' }] });
  const plan = readPlan(root);
  assert.deepEqual(plan.tasks.map(item => item.id), ['S1', 'P1', 'P2', 'DOCS', 'R001']);

  const setup = { node: async () => process.execPath, environment: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))) };
  const kit = new ParallelKit({ plans: new SessionPlans({ setup }), setup });
  const origin = { workspace: root, sessionId: 'orchestrator', projectId: plan.project_id, chatUrl: 'https://chatgpt.com/c/orchestrator',
    executionSnapshot: { parallel_allowed: true, max_workers: 2 } };
  const control = new ExecutionControl({ identity: () => plan.project_id });
  const page = { documentId: 'doc', stopped: true, canSend: true, lastMessageRole: 'assistant', userMessagesRevision: 0, assistantRevision: 0, manualSendRevision: 0 };
  const workers = new Map(), sent = [], corrections = [], toWorkers = [];
  let book = {};
  const runtime = new ParallelExecution({ kit, book, origin: (_w, id) => id === 'orchestrator' ? origin : null, orchestrator: () => 'orchestrator',
    isEnabled: (w, s) => ['running', 'pausing'].includes(control.view(w, s).state), isIssuing: (w, s) => control.issuing(w, s),
    canFinalize: (w, s) => control.issuing(w, s), onComplete: (w, s) => control.complete(w, s),
    onSettle: (w, s, facts) => control.settle(w, s, facts), onPause: (w, s, reason, message) => control.pause(w, s, reason, message ?? null),
    openWorker: async assignment => { workers.set(assignment.id, { assignment, stopped: false }); return { sessionId: 'session-' + assignment.id }; },
    workerState: assignment => ({ stopped: workers.get(assignment.id)?.stopped ?? false, canSend: true }), mainState: () => ({ ...page }),
    save: async data => { book = structuredClone(data); },
    sendCorrection: async (_origin, text) => { corrections.push(text); return { state: 'sent' }; },
    sendWorker: async (assignment, _entry, text) => { toWorkers.push({ id: assignment.id, text }); return { state: 'sent' }; },
    sendFinalization: async (_origin, text, ready, before) => { assert.ok(ready()); assert.ok(await before()); sent.push(text); return { state: 'sent' }; } });
  t.after(() => runtime.dispose());
  runtime.observe(root);
  const signal = () => runtime.signal(root);
  const view = () => runtime.view(root);
  const assignmentOf = id => [...workers.values()].find(entry => entry.assignment.parent_task_id === id);
  const work = (id, file, text = '# ' + id + '\n') => {
    const entry = assignmentOf(id), worktree = entry.assignment.worktree;
    startTask(worktree, id); write(worktree, file, text); commitTask(worktree, id); entry.stopped = true;
  };
  const reply = async () => { page.userMessagesRevision++; await signal(); page.assistantRevision++; await signal(); };

  await signal();
  assert.equal(workers.size, 0, 'publication does not start execution');
  control.toggle(root, 'e2e'); await signal();
  assert.deepEqual([...workers.values()].map(entry => entry.assignment.parent_task_id), ['S1'], 'the sequential task runs alone');
  assert.throws(() => startTask(root, 'S1'), { code: 'ORCHESTRATED_MAIN_READ_ONLY' }, 'the orchestrator cannot take the task in main');
  work('S1', 'README.md'); await signal();
  assert.equal(readPlan(root).tasks.find(item => item.id === 'S1').commit_status, 'DONE');
  assert.equal(fs.existsSync(assignmentOf('S1').assignment.worktree), false, 'the integrated worktree is removed at once');
  assert.deepEqual([...workers.values()].map(entry => entry.assignment.parent_task_id), ['S1', 'P1', 'P2'], 'the parallel pair starts together');

  // P1 blocks; the orchestrator answers it through Kit; the answer reaches the executor.
  const p1 = assignmentOf('P1');
  startTask(p1.assignment.worktree, 'P1'); write(p1.assignment.worktree, 'SECOND.md', '# draft\n');
  const blocked=blockTask(p1.assignment.worktree, 'P1', 'Which wording should the guide use?'); p1.stopped = true; await signal();
  assert.equal(corrections.length, 1); assert.match(corrections[0], /Which wording/);
  messageAssignment(root, p1.assignment.id, 'Use the short wording',undefined,blocked.signal.block_id); await signal();
  assert.deepEqual(toWorkers.map(item => item.id), [p1.assignment.id]); assert.match(toWorkers[0].text, /short wording/);

  // The user pauses the plan: running executors finish and integrate, then the pause takes effect.
  control.toggle(root, 'e2e');
  write(p1.assignment.worktree, 'SECOND.md', '# worker-b\n'); commitTask(p1.assignment.worktree, 'P1'); await signal();
  assert.equal(control.view(root, 'e2e').state, 'pausing', 'P2 is still working');
  work('P2', 'THIRD.md'); await signal();
  assert.equal(control.view(root, 'e2e').state, 'paused');
  assert.equal(assignmentOf('DOCS'), undefined, 'no new task while paused');
  control.toggle(root, 'e2e'); await signal();
  assert.ok(assignmentOf('DOCS'), 'continue issues DOCS to an executor');

  // DOCS retires the specification in its worktree; the orchestrator gets the final handoff.
  const docs = assignmentOf('DOCS');
  startTask(docs.assignment.worktree, 'DOCS'); fs.rmSync(path.join(docs.assignment.worktree, SPEC)); commitTask(docs.assignment.worktree, 'DOCS');
  docs.stopped = true; await signal();
  assert.equal(sent.length, 1); assert.match(sent[0], /^Заверши интеграции плана оркестратора/);
  const docsStatus = assignmentStatus(root, docs.assignment.id);
  assert.equal(startIntegration(root, { id: docs.assignment.id, source_commit: docsStatus.source_commit }).status, 'INTEGRATED');
  assert.match(readPlan(root).context_pack.documents.find(doc => doc.path === SPEC).revision, /^[a-f0-9]{40}$/, 'main pins the retired specification');
  await reply();
  assert.equal(sent.length, 2); assert.match(sent[1], /task:start R001/, 'delivery is handed to the orchestrator');

  // The orchestrator escalates a problem: the plan pauses; the user continues after the discussion.
  escalatePlan(root, 'Signing identity is missing'); await signal();
  assert.deepEqual(control.view(root, 'e2e'), { state: 'paused', reason: 'escalation', message: 'Signing identity is missing' });
  control.toggle(root, 'e2e');
  startTask(root, 'R001'); write(root, 'release.txt', 'delivered\n'); commitTask(root, 'R001');
  await reply();
  assert.equal(sent.length, 3); assert.match(sent[2], /assignment:cleanup/);
  const sweep = cleanupAssignments(root);
  assert.equal(sweep.only_main, true);
  await reply();
  assert.equal(control.view(root, 'e2e').state, 'complete'); assert.equal(view().phase, 'complete');
  assert.equal(readPlan(root).delivery_status, 'READY_FOR_ACCEPTANCE');
  assert.equal(git(root, 'worktree', 'list').split('\n').length, 1, 'only main remains');
  assert.deepEqual(git(root, 'branch', '--format=%(refname:short)').split('\n'), ['main']);
  await signal(); assert.equal(sent.length, 3, 'a completed plan sends nothing more');
});
