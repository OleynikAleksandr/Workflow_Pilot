import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanningOwners } from '../src/control/workflow/planning-owner.mjs';

function fixture({ session = {}, supported = true, locks = 0 } = {}) {
  const calls = [], reconciled = [];
  const view = { workspace: '/project', sessionId: 's1', role: 'orchestrator', scopeStatus: 'NONE', attempt: { state: 'sent' }, ...session };
  const store = { project: () => view, reconcileRoles: async workspace => { reconciled.push(workspace); } };
  let remaining = locks;
  const owners = new PlanningOwners({ store, supports: () => supported, wait: async () => {}, attempts: 5,
    claim: (workspace, input) => { calls.push(['claim', workspace, input]);
      if (remaining-- > 0) throw Object.assign(new Error('locked'), { code: 'WORKFLOW_LOCKED' });
      return { ok: true, claimed: true, session_id: input.session_id }; },
    release: (workspace, input) => { calls.push(['release', workspace, input]); return { ok: true, released: input.session_id === 's1' }; } });
  const record = { identity: { workspace: '/project', sessionId: 's1' } };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  return { owners, calls, reconciled, record, settle, view };
}
const send = (revision = 1) => ({ state: { manualSendRevision: revision } });

test('the first manual send of a delivered candidate claims planning, retrying a busy Kit lock', async () => {
  const f = fixture({ locks: 2 });
  f.owners.observe(f.record, send(0));await f.settle();
  assert.equal(f.calls.length, 0, 'an automation message is not the user task');
  f.owners.observe(f.record, send());await f.settle();await f.settle();
  assert.deepEqual(f.calls.map(c => c[0]), ['claim', 'claim', 'claim']);
  assert.deepEqual(f.calls.at(-1)[2], { session_id: 's1', transfer: false });
  assert.deepEqual(f.reconciled, ['/project']);
});

test('only an undelivered or non-candidate chat, an owned project or a published plan are left alone', async () => {
  for (const session of [{ attempt: { state: 'pending' } }, { role: 'discussion' }, { orchestratorScopeId: 'scope' },
    { closedPlanCommit: 'c'.repeat(40) }, { scopeStatus: 'ACTIVE' }, { planningOwnerSessionId: 's2' }, { external: { provider: 'chatgpt-plugin' } }]) {
    const f = fixture({ session });f.owners.observe(f.record, send());await f.settle();
    assert.equal(f.calls.length, 0, JSON.stringify(session));
  }
  const old = fixture({ supported: false });old.owners.observe(old.record, send());await old.settle();
  assert.equal(old.calls.length, 0, 'an older installed Kit keeps the publication binding');
  await assert.rejects(old.owners.assign('/project', 's1', { transfer: true }), { code: 'KIT_UPGRADE_REQUIRED' });
});

test('an archived owner releases planning; another session cannot release it', async () => {
  const f = fixture();
  await f.owners.forget('/project', 's2');assert.deepEqual(f.reconciled, []);
  await f.owners.forget('/project', 's1');assert.deepEqual(f.reconciled, ['/project']);
  await f.owners.assign('/project', 's2', { transfer: true });
  assert.deepEqual(f.calls.at(-1)[2], { session_id: 's2', transfer: true });
});
