import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UserChoices, collectChoiceFacts } from '../src/control/workflow/user-choices.mjs';
import { createFixture } from '../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import { requestExecutionMode, readExecutionMode } from '../packages/workflow-kit/src/lib/execution-mode.mjs';
import { readPlanningOwner } from '../packages/workflow-kit/src/lib/planning-owner.mjs';
import { readReview } from '../packages/workflow-kit/src/lib/plan-review.mjs';
import { choiceOptions, choiceView } from '../src/contracts/user-choice.mjs';

function fixture(initial = []) {
  let facts = initial, now = 1000, ids = 0;
  const acts = [], delivered = [], receipts = new Map();
  const choices = new UserChoices({ facts: () => facts, now: () => now, id: () => 'c' + (++ids),
    act: async (record, option) => { acts.push(option.id); },
    deliver: async (record, option) => { delivered.push({ session: record.session_id, option: option.id, role: record.role }); return { message_id: 'm' + delivered.length }; },
    receipt: id => receipts.get(id) ?? null });
  const page = (session, revision, busy, documentId = 'doc') => choices.page(session, { documentId, state: { manualSendRevision: revision, busy } });
  return { choices, acts, delivered, receipts, page, set: value => { facts = value; }, tick: ms => { now += ms; } };
}
const refused = { session_id: 'o', workspace: '/w', kind: 'refused', key: 'refused:s:x', data: { message: 'Kit отказал в назначении T001: STACK', task_id: 'T001' }, role: 'orchestrator' };
test('each of the three mode buttons completes the decision at durable save, before delivery',async()=>{
  const fact={session_id:'o',workspace:'/w',kind:'mode',key:'mode:1',data:{recommended:'orchestrated',reason:'fixture'},role:'planning'};
  for(const option of choiceOptions('mode',fact.data).options){
    const f=fixture([fact]);f.choices.reconcile();const view=f.choices.view('o');
    await f.choices.choose({session_id:'o',choice_id:view.choice_id,generation:view.generation,option_id:option.id});
    assert.equal(f.choices.pending('o'),false,option.id);
    assert.ok(f.choices.snapshot().records[0].chosen_at,option.id);
    assert.equal(f.delivered.length,1,option.id);
    assert.equal(f.receipts.size,0,'no model read or reply was needed');
    await assert.rejects(f.choices.choose({session_id:'o',choice_id:view.choice_id,generation:view.generation,option_id:option.id}),{code:'USER_CHOICE_CHANGED'});
  }
});
test('a chosen receipt waits for durable save; failure restores offered options before any effect',async()=>{
  const f=fixture([refused]);f.choices.reconcile();let release,entered;
  const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);let fail=true;
  f.choices.persist=async()=>{entered();await gate;if(fail)throw Error('fixture storage refused');};
  const before=f.choices.view('o'),pending=f.choices.choose({session_id:'o',choice_id:before.choice_id,generation:before.generation,option_id:'fix'});
  await started;assert.equal(f.choices.view('o').state,'saving');assert.equal(f.acts.length,0);assert.equal(f.delivered.length,0);
  assert.equal(f.choices.pending('o'),true,'an uncommitted press is not a saved decision');
  release();await assert.rejects(pending,{code:'USER_CHOICE_SAVE'});
  assert.equal(f.choices.view('o').state,'offered');assert.match(f.choices.view('o').error,/storage refused/);
  assert.equal(f.choices.view('o').generation,before.generation);assert.equal(f.delivered.length,0);
  fail=false;const saved=await f.choices.choose({session_id:'o',choice_id:before.choice_id,generation:before.generation,option_id:'fix'});
  assert.equal(saved.state,'chosen');f.receipts.set('m1',{delivery:'accepted'});f.choices.reconcile();assert.equal(f.choices.view('o').state,'chosen');
  assert.equal(f.choices.pending('o'),false,'a saved decision does not wait for the model response');
  f.receipts.set('m1',{read:true});assert.equal(f.choices.view('o'),null,'read retires the current confirmation without waiting for the model turn');
  f.choices.reconcile();const ids=f.choices.workspaceHistory('/w').map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
  const count=ids.length;f.choices.reconcile();assert.equal(f.choices.history.length,count,'receipt replay creates no history duplicate');
});

test('one card per session follows priority; a press acts once and stale generations are refused', async () => {
  const f = fixture([{ ...refused, kind: 'acceptance', key: 'acceptance:s', data: { scope_id: 's' } }, refused]);
  f.choices.reconcile();
  const view = f.choices.view('o');
  assert.equal(view.kind, 'refused', 'the refused pause outranks acceptance');
  assert.equal(view.options[0].recommended, true);assert.equal(view.options.filter(o => o.recommended).length, 1);
  assert.match(view.question, /T001/);
  await assert.rejects(f.choices.choose({ session_id: 'o', choice_id: view.choice_id, option_id: 'fix', generation: view.generation + 1 }), { code: 'USER_CHOICE_CHANGED' });
  const chosen = await f.choices.choose({ session_id: 'o', choice_id: view.choice_id, option_id: 'fix', generation: view.generation, source: 'panel' });
  assert.equal(chosen.state, 'chosen');assert.equal(chosen.chosen.label, 'Поручить оркестратору устранить причину');
  assert.deepEqual(f.delivered, [{ session: 'o', option: 'fix', role: 'orchestrator' }]);
  await assert.rejects(f.choices.choose({ session_id: 'o', choice_id: view.choice_id, option_id: 'fix', generation: chosen.generation }), { code: 'USER_CHOICE_CHANGED' });
  assert.equal(f.delivered.length, 1, 'a repeated press never acts twice');
  f.choices.reconcile();
  assert.equal(f.choices.view('o').kind, 'acceptance', 'a saved decision does not occupy the next choice');
  f.receipts.set('m1', { read: true });f.page('o', 0, true);f.page('o', 0, false);
  assert.equal(f.choices.view('o').kind, 'acceptance', 'late delivery cannot replace the current choice');
});

test('the user answering in the chat declines the card; a persistent cause returns once after the turn', async () => {
  const f = fixture([refused]);
  f.page('o', 0, false);f.choices.reconcile();
  const first = f.choices.view('o');
  f.page('o', 1, true);
  assert.equal(f.choices.view('o'), null, 'own message removes the buttons');
  assert.match(f.choices.history.at(-1).text, /ответил в чате сам; выбор снят/);assert.equal(f.choices.history.at(-1).actor, 'USER');
  f.choices.reconcile();assert.equal(f.choices.view('o'), null, 'not before the recipient finished its turn');
  f.page('o', 1, false);
  const again = f.choices.view('o');
  assert.ok(again && again.choice_id !== first.choice_id, 'the persisting cause is offered again with a new card');
  f.page('o', 2, true);f.choices.reconcile();assert.equal(f.choices.view('o'), null);
  f.set([]);f.page('o', 2, false);
  assert.equal(f.choices.view('o'), null, 'a resolved cause does not return');
});

test('one-time causes, staleness, postponing and restart', async () => {
  const second = { session_id: 'b', workspace: '/w', kind: 'second-session', key: 'second:a:1', data: {}, role: 'discussion' };
  const mode = { session_id: 'a', workspace: '/w', kind: 'mode', key: 'mode:1', data: { recommended: 'sequential', reason: 'Small connected tasks', generation: 1 }, role: 'planning' };
  const f = fixture([second, mode]);
  f.page('b', 0, false);f.choices.reconcile();
  f.page('b', 1, true);f.page('b', 1, false);
  assert.equal(f.choices.view('b'), null, 'the second-session card is shown once');
  const card = f.choices.view('a');
  assert.deepEqual(card.options.map(o => o.id), ['sequential', 'orchestrated', 'spec'], 'the agent recommendation comes first');
  assert.equal(card.reason, 'Small connected tasks');
  f.set([second]);f.choices.reconcile();
  assert.equal(f.choices.view('a'), null);assert.match(f.choices.history.at(-1).text, /неактуален/);
  f.set([second, { ...mode, key: 'mode:2', data: { ...mode.data, recommended: 'orchestrated', generation: 2 } }]);f.choices.reconcile();
  const next = f.choices.view('a');assert.equal(next.options[0].id, 'orchestrated');
  const restored = new UserChoices({ facts: () => [], now: () => 0 });restored.restore(f.choices.snapshot());
  assert.equal(restored.view('a').choice_id, next.choice_id, 'cards survive a restart');
  await f.choices.choose({ session_id: 'a', choice_id: next.choice_id, option_id: 'orchestrated', generation: next.generation, source: 'window' });
  assert.deepEqual(f.acts, ['orchestrated']);assert.equal(f.choices.records.get('a').source, 'window');

  const g = fixture([{ ...refused, kind: 'acceptance', key: 'acceptance:s', data: { scope_id: 's' } }]);
  g.choices.reconcile();const offered = g.choices.view('o');
  const later = await g.choices.choose({ session_id: 'o', choice_id: offered.choice_id, option_id: 'later', generation: offered.generation });
  assert.equal(later.state, 'postponed');assert.equal(g.delivered.length, 0, 'postponing sends nothing');
  const reopened = g.choices.reopen({ session_id: 'o', choice_id: offered.choice_id, generation: later.generation });
  assert.equal(reopened.state, 'offered');
});

test('choice texts: recommendation first, existing operations only', () => {
  const acceptance = choiceOptions('acceptance', { scope_id: 'scope-a' });
  assert.match(acceptance.options[0].message, /archive --scope scope-a/);
  const review = choiceOptions('review');
  assert.match(review.options[1].message, /review:resolve --action publish/);assert.match(review.options[2].message, /review:resolve --action retry/);
  assert.equal(choiceOptions('refused', { message: 'm' }).options[1].action, 'continue');
  assert.equal(choiceView({ state: 'declined' }), null);
  assert.throws(() => choiceOptions('unknown'), { code: 'USER_CHOICE_KIND' });
});

test('a saved action failure remains visible after restart and never repeats the effect',async()=>{
  let effects=0;const choices=new UserChoices({facts:()=>[{session_id:'o',workspace:'/fixture',kind:'mode',key:'mode:failed'}],
    act:async()=>{effects++;throw Error('KIT_LOCKED');},report:()=>{}});
  choices.reconcile();const card=choices.view('o');
  await choices.choose({session_id:'o',choice_id:card.choice_id,generation:card.generation,option_id:'orchestrated'});
  assert.equal(choices.view('o').chosen.uncertain,true);assert.match(choices.view('o').chosen.error,/KIT_LOCKED/);
  const next=new UserChoices({facts:()=>[],act:()=>effects++});next.restore(choices.snapshot());next.reconcile();
  assert.equal(next.view('o').state,'chosen');assert.equal(effects,1);
});

test('an agent mode request in Kit is a mode card of its session; a later message elsewhere is a second-session card', t => {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'choice-facts-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = createFixture(directory);
  const listed = { workspace: root, sessions: [{ sessionId: 'a', role: 'planning' }, { sessionId: 'b', role: 'discussion' }] };
  const sources = manual => ({ manual, projects: [listed], project: () => ({ scopeStatus: 'NONE' }), execution: () => null,
    review: readReview, mode: readExecutionMode, owner: readPlanningOwner });
  assert.deepEqual(collectChoiceFacts(sources(new Map())), []);
  requestExecutionMode(root, { session_id: 'a', recommended: 'orchestrated', reason: 'Independent tasks of the fixture' });
  const [mode] = collectChoiceFacts(sources(new Map()));
  assert.equal(mode.kind, 'mode');assert.equal(mode.session_id, 'a');assert.equal(mode.role, 'planning');
  assert.equal(mode.data.recommended, 'orchestrated');
  const claimed = Date.parse(readPlanningOwner(root).claimed_at);
  assert.equal(collectChoiceFacts(sources(new Map([['b', claimed - 1]]))).length, 1, 'a message before the claim is not a cause');
  const second = collectChoiceFacts(sources(new Map([['b', claimed + 1]]))).find(f => f.kind === 'second-session');
  assert.equal(second.session_id, 'b');
});
