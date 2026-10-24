
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { install } from '@webpilot/workflow-kit/lib/installer';
import { createScope } from '@webpilot/workflow-kit/lib/actions';
import { withSessionPlan } from '@webpilot/workflow-kit/lib/session-plans';
import { WorkspaceSetup } from '../src/control/projects/workspace-setup.mjs';
import { SessionPlans } from '../src/control/sessions/session-plans.mjs';
import { readWorkspace } from '../src/control/sessions/workspace-session.mjs';
import { ContextCache } from '../src/control/context/context-cache.mjs';
import { readinessContextKey } from '../src/control/context/context-inputs.mjs';
import { ContextSession } from '../src/control/context/context-session.mjs';

test('production readiness and canonical recovery block insertion after real input mutations', async t => {
  for (const kind of ['document', 'index', 'HEAD', 'plan', 'transaction']) await t.test(kind, async t => {
    const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-send-inputs-')));
    t.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const git = (...args) => execFileSync('git', args, { cwd: workspace, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
    git('init', '-b', 'main'); git('config', 'user.name', 'Send Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    install({ project: workspace, mode: 'existing' });
    const sessionId = 'send-fixture', planId = 'send-inputs';
    withSessionPlan(workspace, { sessionId }, () => createScope(workspace, {
      scope_id: planId, objective: 'Send fixture', approval_note: 'Isolated verification', acceptance_criteria: ['Current inputs'],
      approved_scope: { functional_paths: [], documentation_paths: ['README.md'], max_functional_files_per_task: 3 },
      tasks: [{ id: 'T1', title: 'Fixture', why: 'Freshness', dependencies: [], functional_paths: [], documentation_paths: ['README.md'],
        acceptance_criteria: ['Current'], verification_ids: [], expected_commit_message: 'docs: fixture' }],
    }));
    if (kind === 'index') await fs.writeFile(path.join(workspace, 'index-fixture.txt'), 'stage before fill');
    const setup = new WorkspaceSetup(), plans = new SessionPlans({ setup });
    const indexFile = path.resolve(workspace, git('rev-parse', '--git-path', 'index'));
    const indexBefore = await fs.readFile(indexFile);
    const unchanged = path.join(workspace, 'README.md');
    await fs.utimes(unchanged, new Date(1000), new Date(1000));
    assert.equal((await setup.ready(workspace)).ready, true);
    assert.deepEqual(await fs.readFile(indexFile), indexBefore, 'readiness must not refresh index stat cache itself');
    let saved = { ...await readWorkspace(workspace, sessionId), workspace, sessionId, planId, chatUrl: null, attempt: null };
    const store = { selected: () => structuredClone(saved), project: () => structuredClone(saved),
      inspect: () => readWorkspace(workspace, sessionId),
      updateSession: async (_w, _s, patch) => (saved = { ...saved, ...structuredClone(patch) }),
      patchAttempt:async(_w,_s,expected,patch)=>{
        if(expected?saved.attempt?.requestId!==expected.requestId||saved.attempt?.attemptGeneration!==expected.attemptGeneration:!!saved.attempt)return null;
        saved.attempt={...saved.attempt,...(typeof patch==='function'?patch(structuredClone(saved.attempt)):patch)};return structuredClone(saved);},
      bindChat: async (_w, _s, chatUrl) => (saved = { ...saved, chatUrl }) };
    let loads = 0, sends = 0, fills = 0;
    const cache = new ContextCache({ load: w => { loads++; return plans.loadContext(w); },
      inputKey: w => readinessContextKey(setup, w) });
    const composer = { getURL: () => 'https://chatgpt.com/',navigationSnapshot:()=>({id:'fixture',incarnation:'fixture',epoch:1,navigationSequence:0}),
      inspect: async options => ({ url: 'https://chatgpt.com/', editorAvailable: true, writable: true, draftLength: 0,
        documentId:'preflight',accountStatus:'signed-in',busy: false, login: false, messageSeen: false }),
      startChat:async()=>{sends++;},deliver:async()=>{fills++;throw Error('DOM fallback forbidden');}};
    const controller = new ContextSession({ store, runtime: {
      ensure: async () => ({}),
      prepareBootstrap: async () => ({context_transport:'panel',enrollment_ticket:'a'.repeat(64),
        run_id:'fixture',ticket_hash:'b'.repeat(64),expires_at:Date.now()+1800000}),
      cancelStartup:async()=>({status:'revoked'}),
      stageStartup: async () => {
        assert.equal(saved.attempt.state, 'prepared');
        if (kind === 'document') await fs.appendFile(path.join(workspace, 'docs/architecture/OVERVIEW.md'), '\nChanged before fill\n');
        if (kind === 'index') git('add', 'index-fixture.txt');
        if (kind === 'HEAD') {
          // Synthetic fixture history only; no user repository or hook configuration is changed.
          const next = git('commit-tree', git('rev-parse', 'HEAD^{tree}'), '-p', git('rev-parse', 'HEAD'), '-m', 'Fixture HEAD movement');
          git('update-ref', 'HEAD', next);
        }
        if (kind === 'plan') execFileSync(process.execPath, [path.join(workspace, 'scripts/workflow.mjs'), 'task:start', 'T1', '--session', sessionId], { cwd: workspace });
        if (kind === 'transaction') await fs.writeFile(path.resolve(workspace, git('rev-parse', '--git-path', 'workflow-kit/transaction.json')), '{}');
        return {message_id:'fixture-startup'};
      }
    }, composer, contextCache: cache });
    controller.attach(saved); await controller.tick();
    assert.equal(loads, 1); assert.equal(fills, 0); assert.equal(sends, 0);
    assert.ok(['startup-cancelled','error'].includes(controller.state.phase),JSON.stringify(controller.state));
    assert.equal(saved.attempt.state, 'prepared'); assert.equal(saved.attempt.sendStartedAtMs, null);
  });
});
