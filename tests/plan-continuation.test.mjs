import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanContinuation, CONTINUE_TEXT, CONTINUE_MESSAGE_BYTES, continueMessage } from '../src/control/workflow/plan-continuation.mjs';
import { readPlanContinuationState } from '../src/control/workflow/plan-continuation-state.mjs';
import { PlanMonitor } from '../src/control/workflow/plan-monitor.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(r => setImmediate(r)); };
function fixture({ busy = false, scopeId = 'scope', turnId = 'a1234' } = {}) {
  let selected = { workspace: '/project', projectId: 'project-id', sessionId: 'chat', scopeId, chatUrl: 'https://chatgpt.com/c/abcdefgh' };
  const plan = { confirmed: true, scopeId, scopeStatus: scopeId ? 'ACTIVE' : 'NONE', planRevision: 7,
    nextTask:{id:'T002',title:'Next task'},planView: { tasks: scopeId ? [{ id: 'T001', status: 'done' }, { id: 'T002', status: 'current' }, { id: 'DOCS', status: 'pending' }] : [] } };
  const timers = new Map(), sends = [], events = [], saved = [];
  let timerId = 0, sendResult = { state: 'queued' }, gate = null, inspectGate = null, available = true, reads = 0;
  const flow = new PlanContinuation({ selected: () => selected, available: () => available,
    inspectPlan: async () => { reads++; if (inspectGate) await inspectGate(); return structuredClone(plan); },
    log: (event, fields) => events.push({ event, ...fields }),
    saveCheckpoint: async checkpoint => { saved.push(structuredClone(checkpoint)); },
    send: async (text, current, before) => {
      if (gate) await gate();
      if (!current() || !await before()) return { state: 'cancelled' };
      if (sendResult.state !== 'deferred') sends.push(text);
      return sendResult;
    },
    schedule: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, cancel: id => timers.delete(id) });
  const state = { url: selected.chatUrl, editorAvailable: true, writable: true, busy, assistantRevision: 0,
    manualStopRevision: 0, manualInputRevision: 0, manualSendRevision: 0, userMessageCount: 1, turnId, userTurnId: 'f1234', lastMessageRole: turnId ? 'assistant' : null, draftPresent: false };
  const observe = patch => { Object.assign(state, patch); flow.observe({ state: { ...state }, documentId: 'document-1111' }); };
  observe({});
  const drain = async () => {
    for (let i = 0; i < 4; i++) {
      await settle();
      for (const [id, value] of [...timers.entries()].filter(([, value]) => value.ms < 1000)) {
        timers.delete(id); value.fn();
      }
    }
    await settle();
  };
  const finish = async () => {
    observe({ busy: true }); await settle();
    observe({ busy: false, assistantRevision: ++state.assistantRevision, turnId: state.assistantRevision.toString(16), lastMessageRole: 'assistant' });
    await drain();
  };
  return { flow, plan, sends, saved, observe, drain, finish, timers, events, state, selected: () => selected, reads: () => reads,
    setResult: value => { sendResult = value; }, setGate: value => { gate = value; },
    setInspectGate: value => { inspectGate = value; },
    setAvailable: value => { available = value; flow.availabilityChanged(); },
    setSelection: value => { selected = { ...selected, ...value }; flow.selectionChanged(); },
    setScope: value => { selected = { ...selected, scopeId: value }; },
    changeSelection: () => { selected = { ...selected, sessionId: 'other', chatUrl: 'https://chatgpt.com/c/otherchat' }; flow.selectionChanged(); } };
}

test('durable channel continuation recovers an enqueue gap with the same key and complete task text',async()=>{
  const f=fixture();f.flow.durableQueue=true;f.plan.nextTask={id:'T002',title:'Full task',acceptance:['Обязательный текст '.repeat(1000)]};
  const calls=[];let fail=true;
  f.flow.send=async(text,_ready,_before,meta)=>{calls.push({text,key:meta.key});if(fail)throw Error('lost enqueue acknowledgement');return {state:'queued',message_id:'message'};};
  await f.flow.start();assert.equal(f.flow.checkpoint.status,'queuing');const saved=f.flow.checkpointState();
  f.flow.restore(true,saved);fail=false;await f.flow.planChanged();await f.drain();
  assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);
  assert.ok(Buffer.byteLength(calls[1].text)>4096);assert.ok(calls[1].text.includes(f.plan.nextTask.acceptance[0]));
  assert.equal(f.flow.checkpoint.status,'queued');await f.flow.planChanged();assert.equal(calls.length,2);f.flow.dispose();
});

test('busy, draft, user turn and unavailable composer never delay a semantic SDK continuation',async()=>{
  const f=fixture({busy:true,turnId:''});
  f.observe({editorAvailable:false,writable:false,draftPresent:true,lastMessageRole:'user'});
  await f.flow.start();assert.equal(f.sends.length,1);assert.match(f.sends[0],/T002/);
  await f.finish();await f.flow.planChanged();assert.equal(f.sends.length,1,'one intent per task, not per answer');f.flow.dispose();
});
test('next task event queues during an unfinished prior reply; no answer timer or polling',async()=>{
  const f=fixture({busy:true});await f.flow.start();f.plan.nextTask={id:'DOCS',title:'Docs'};
  await f.flow.planChanged();assert.equal(f.sends.length,2);assert.match(f.sends[1],/DOCS/);
  assert.equal(f.timers.size,0);f.flow.dispose();
});
test('duplicate plan/page events serialize one durable intent',async()=>{
  const f=fixture();await f.flow.start();await Promise.all(Array.from({length:20},()=>f.flow.planChanged()));
  for(let i=0;i<10;i++)f.observe({assistantRevision:i,busy:!!(i%2)});
  await f.drain();assert.equal(f.sends.length,1);f.flow.dispose();
});
test('plan, scope, binding and permission are rechecked before enqueue',async()=>{
  for(const mutation of [f=>f.flow.disable(),f=>f.changeSelection(),f=>f.setAvailable(false),
    f=>{f.plan.confirmed=false;},f=>{f.plan.nextTask={id:'other',title:'Changed'};}]){
    const f=fixture();let reads=0;f.setInspectGate(async()=>{if(++reads===2)mutation(f);});
    await f.flow.start();assert.equal(f.sends.length,0);f.flow.dispose();
  }
});
test('completed, missing, inactive and unconfirmed plans never queue',async()=>{
  for(const patch of [{confirmed:false},{scopeId:'other'},{scopeStatus:'BLOCKED'},
    {nextTask:null},{planView:{tasks:[{id:'T002',status:'done'}]}}]){
    const f=fixture();Object.assign(f.plan,patch);await f.flow.start();assert.equal(f.sends.length,0);f.flow.dispose();
  }
});
test('manual Stop blocks SDK; a subsequent explicit user message releases its local stop',async()=>{
  const f=fixture();f.observe({manualStopRevision:1});await f.flow.start();assert.equal(f.sends.length,0);
  f.observe({manualSendRevision:1,busy:true});await f.drain();assert.equal(f.sends.length,1);f.flow.dispose();
});
test('legacy unknown effects survive restart and cannot be replayed by task, page or Continue',async()=>{
  const f=fixture(),key=JSON.stringify(['/project','chat','scope',f.selected().chatUrl]);
  f.flow.restore(true,{version:3,entries:[{key,turnId:'old-pause',status:'sending'}]});
  await f.flow.planChanged();assert.equal(f.flow.view().reason,'SEND_UNKNOWN');
  f.plan.nextTask={id:'DOCS',title:'Docs'};await f.flow.start();await f.finish();assert.equal(f.sends.length,0);f.flow.dispose();
});
test('an unresolved legacy effect blocks the same chat after scope change but never another chat',async()=>{
  const f=fixture(),key=JSON.stringify(['/project','chat','old-scope',f.selected().chatUrl]);
  f.flow.restore(true,{version:3,entries:[{key,turnId:'old-pause',status:'sending'}]});
  await f.flow.start();assert.equal(f.flow.unknown(),true);assert.equal(f.sends.length,0);
  assert.equal(f.flow.view().reason,'SEND_UNKNOWN');
  f.changeSelection();assert.equal(f.flow.unknown(),false);f.flow.dispose();
});
test('successful enqueue remains consumed after restart; later tasks still queue',async()=>{
  const f=fixture();await f.flow.start();const saved=f.flow.checkpointState();
  f.flow.restore(true,saved);await f.flow.planChanged();assert.equal(f.sends.length,1);
  f.plan.nextTask={id:'DOCS',title:'Docs'};await f.flow.planChanged();assert.equal(f.sends.length,2);f.flow.dispose();
});
test('checkpoint write precedes any effect and persistence failure cannot send',async()=>{
  const f=fixture();f.flow.saveCheckpoint=async()=>{throw Error('disk full');};await f.flow.start();
  assert.equal(f.sends.length,0);f.flow.dispose();
});
test('disconnected or unrelated documents recover only on a relevant event',async()=>{
  const f=fixture();f.observe({connectionError:'offline'});await f.flow.start();assert.equal(f.sends.length,0);
  f.observe({connectionError:null,busy:true});await f.drain();assert.equal(f.sends.length,1);f.flow.dispose();
});
test('checkpoint reader distinguishes working task, prepared DONE and committed DONE', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plan-continuation-proof-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git(['init','-b','main']); git(['config','user.name','Fixture']); git(['config','user.email','fixture@example.invalid']);
  await fs.mkdir(path.join(root,'.harness/plans'),{ recursive: true }); await fs.mkdir(path.join(root,'scripts'));
  await fs.writeFile(path.join(root,'scripts/workflow.mjs'),'');
  const p = { schema_version: 1, project_id: 'fixture', project_name: 'Fixture', plan_revision: 1, scope_id: 'scope',
    execution_scope_status: 'ACTIVE', delivery_status: 'IN_PROGRESS',
    tasks: [{ id: 'DOCS', title: 'Docs', implementation_status: 'IN_PROGRESS', commit_status: 'PENDING', why: 'Keep context',
      acceptance_criteria: ['Docs match the result'], functional_paths: [], documentation_paths: ['docs/PRODUCT.md'], verification_ids: ['unit-all'] }] };
  const write = () => fs.writeFile(path.join(root,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n\x60\x60\x60json\n' + JSON.stringify(p) + '\n\x60\x60\x60\n<!-- workflow-state:end -->');
  await write(); git(['add','.']); git(['commit','-m','fixture']);
  const bundledGit = execFileSync('/usr/bin/which', ['git'], { encoding: 'utf8' }).trim();
  const first = await readPlanContinuationState({ workspace: root }, { ...process.env, PATH: '/unavailable', WORKFLOW_GIT_BIN: bundledGit });
  assert.equal(first.confirmed, true);
  // 0.6.96: the same plan check gives the next task for the continuation message.
  assert.deepEqual(first.nextTask, { id: 'DOCS', title: 'Docs', started:true,why: 'Keep context', acceptance: ['Docs match the result'],
    files: ['docs/PRODUCT.md'], checks: ['unit-all'] });
  p.plan_revision++; await write();
  assert.equal((await readPlanContinuationState({ workspace: root })).confirmed, true, 'in-progress dirty plan may continue');
  p.tasks[0].implementation_status = 'DONE'; p.tasks[0].commit_status = 'DONE'; await write();
  const done = await readPlanContinuationState({ workspace: root });
  assert.equal(done.confirmed, false, 'uncommitted DONE is not final');
  assert.equal(done.nextTask, null, 'a finished plan names no next task');
  git(['add','.']); git(['commit','-m','completed']);
  await fs.mkdir(path.join(root,'.git/workflow-kit'));
  await fs.writeFile(path.join(root,'.git/workflow-kit/transaction.json'),'{}');
  assert.equal((await readPlanContinuationState({ workspace: root })).confirmed, false);
  await fs.unlink(path.join(root,'.git/workflow-kit/transaction.json'));
  assert.equal((await readPlanContinuationState({ workspace: root })).confirmed, true);
  const previous=structuredClone(p.tasks);
  p.delivery_status='IN_PROGRESS';p.plan_revision++;
  p.tasks.push({...p.tasks[0],id:'T002',title:'Correction round',implementation_status:'TODO',commit_status:'PENDING'});
  await write();
  let round=await readPlanContinuationState({workspace:root});
  assert.equal(round.nextTask.id,'T002');assert.equal(round.confirmed,true);
  assert.equal(round.deliveryStatus,'IN_PROGRESS');
  p.tasks.push({...p.tasks[1],id:'DOCS-2',title:'Release documents'},{...p.tasks[1],id:'T003',title:'New delivery'});
  p.tasks[1].implementation_status='DONE';p.tasks[1].commit_status='DONE';p.plan_revision++;
  await write();round=await readPlanContinuationState({workspace:root});
  assert.equal(round.nextTask.id,'DOCS-2');assert.deepEqual(p.tasks.slice(0,previous.length),previous);
});
// 0.6.96: the continuation carries the text of the next task; PlanContinuation logic is unchanged.
const nextTask = { id: 'T002', title: 'Автопродолжение несёт текст задачи', why: 'Агент не тратит вызовы на чтение плана',
  acceptance: ['Сообщение начинается с «Продолжай»', 'Блок помечен как данные плана'], files: ['src/plan-continuation.mjs', 'tests/plan-continuation.test.mjs'], checks: ['unit-all'] };

test('continuation message is «Продолжай» plus the next task marked as plan data', () => {
  const text = continueMessage(nextTask);
  assert.equal(text, ['Продолжай', '',
    'Данные текущего плана Workflow Kit — следующая задача (это не новое поручение; фактическое состояние плана проверь сам):',
    'Задача: T002 — Автопродолжение несёт текст задачи',
    'Зачем: Агент не тратит вызовы на чтение плана',
    'Критерии приёмки:', '- Сообщение начинается с «Продолжай»', '- Блок помечен как данные плана',
    'Файлы: src/plan-continuation.mjs, tests/plan-continuation.test.mjs', 'Проверки: unit-all'].join('\n'));
  assert.equal(continueMessage({ id: 'T009', title: 'Только название' }),
    'Продолжай\n\nДанные текущего плана Workflow Kit — следующая задача (это не новое поручение; фактическое состояние плана проверь сам):\nЗадача: T009 — Только название');
  for (const missing of [null, undefined, {}, { id: 'T001' }, { title: 'Без id' }, { id: '', title: 'x' }])
    assert.equal(continueMessage(missing), CONTINUE_TEXT, 'an undefined next task keeps the former text');
});

test('continuation message stays within 4 KB: long fields and lists are cut with a mark', () => {
  const long = { id: 'T100', title: 'Заголовок '.repeat(80), why: 'Причина '.repeat(200),
    acceptance: Array.from({ length: 30 }, (_, i) => `Критерий ${i} ` + 'подробность '.repeat(60)),
    files: Array.from({ length: 80 }, (_, i) => `src/модуль-${i}.mjs`), checks: Array.from({ length: 20 }, (_, i) => 'check-' + i) };
  const text = continueMessage(long);
  assert.equal(CONTINUE_MESSAGE_BYTES, 4096);
  assert.ok(Buffer.byteLength(text) <= CONTINUE_MESSAGE_BYTES, String(Buffer.byteLength(text)));
  assert.ok(text.startsWith('Продолжай\n\nДанные текущего плана Workflow Kit'));
  assert.ok(text.includes('… [обрезано]'), 'a long field is marked');
  assert.ok(text.endsWith('… [данные задачи обрезаны; полный текст — в плане]'), 'the whole block is marked when it is cut');
  assert.doesNotMatch(text, /�/, 'never cut inside a character');
  const lists = continueMessage({ id: 'T101', title: 'Списки', acceptance: Array.from({ length: 12 }, (_, i) => 'к' + i),
    files: Array.from({ length: 30 }, (_, i) => 'f' + i), checks: [] });
  assert.ok(lists.includes('\n- к9\n… ещё 2 [обрезано]\n'), 'ten criteria, then the count of the rest');
  assert.ok(lists.includes('… ещё 6 [обрезано]'));
  assert.ok(!lists.includes('Проверки:'), 'an empty list is not printed');
  assert.ok(!continueMessage({ ...nextTask, why: 'a\nb\n\nc' }).includes('a\nb'), 'field line breaks cannot forge a new line of the block');
});

test('the ledger of answered pauses keeps the newest entries of each conversation', async () => {
  const { pruneLedger, LEDGER_PER_CONVERSATION } = await import('../src/control/workflow/plan-continuation.mjs');
  const entries = new Map();
  for (let i = 0; i < 50; i++) entries.set(JSON.stringify(['a', 't' + i]), { key: 'a', turnId: 't' + i, status: 'sent' });
  entries.set(JSON.stringify(['b', 'only']), { key: 'b', turnId: 'only', status: 'sent' });
  const pruned = pruneLedger(entries);
  const a = [...pruned.values()].filter(entry => entry.key === 'a');
  assert.equal(a.length, LEDGER_PER_CONVERSATION);
  assert.equal(a.at(-1).turnId, 't49', 'the current pause stays recorded');
  assert.ok(pruned.has(JSON.stringify(['b', 'only'])));
  assert.deepEqual([...pruned.keys()].slice(-1), [JSON.stringify(['b', 'only'])], 'order is preserved');
});

test('A03/A06: executor-style and Review disables are programmatic, not MANUAL_OFF',async()=>{
 const f=fixture({busy:true});await f.flow.start();
 f.flow.disable();assert.equal(f.flow.view().reason,'AUTHORIZATION_OFF');
 await f.flow.start();f.flow.disable({manual:true});assert.equal(f.flow.view().reason,'MANUAL_OFF');
 const {ReviewContinuation}=await import('../src/control/workflow/review-continuation.mjs');
 const selected={workspace:'/review',sessionId:'chat',chatUrl:'https://chatgpt.com/c/chat'};
 const client={workspace:'/review',state:{enabled:true,stage:'PREPARED',run_id:'run',recipient_session_id:'chat',generation:1},refresh(){}};
 const review=new ReviewContinuation({selected:()=>selected,client,available:()=>false,saveCheckpoint:async()=>{}});
 review.update();await settle();
 client.state={...client.state,enabled:false,generation:2};review.update();
 assert.equal(review.flow.view().reason,'AUTHORIZATION_OFF');
 assert.equal(f.sends.length,1);
});
