import test from 'node:test';
import assert from 'node:assert/strict';
import {ParallelExecution,finalSourceState,deliveryText} from '../src/control/workflow/parallel-execution.mjs';
import {ProjectPlanContinuation} from '../src/control/workflow/project-plan-continuation.mjs';
import {AutomationSendState} from '../src/control/workflow/automation-send-state.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createFixture,planFixture,completeFixture} from '../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import {createAssignment,setupAssignment,assignmentStatus} from '../packages/workflow-kit/src/lib/task-assignment.mjs';
import {readPlan} from '../packages/workflow-kit/src/lib/plan.mjs';
import {integrationStatus,startIntegration} from '../packages/workflow-kit/src/lib/task-integration.mjs';
import {validate} from '../packages/workflow-kit/src/lib/validate.mjs';
import {ParallelKit} from '../src/control/workflow/parallel-kit.mjs';
import {readCommandActivity} from '../src/control/workflow/command-activity.mjs';

const {startFixtureWriter}=createRequire(import.meta.url)('./parallel-execution-smoke-fixture.cjs');

test('normal finalization requests a short truthful report while retaining explicit user analytics and cleanup',()=>{
 const text=deliveryText('/main',null,{head:'verified',plan:{plan_revision:1},assignments:[{parent_task_id:'DOCS',status:'INTEGRATED',cleanup:{status:'PENDING'}}]});
 assert.match(text,/короткий итоговый/);assert.match(text,/без повторного чтения WAL/);
 assert.match(text,/только по прямому запросу пользователя/);assert.match(text,/assignment:cleanup/);
 assert.match(text,/Не называй complete подтверждённым/);
});

function fixture(t) {
 const origin={workspace:'/main',sessionId:'origin',projectId:'project',chatUrl:'https://chatgpt.com/c/main',executionSnapshot:{parallel_allowed:true,max_workers:2}};
 const state={head:'head',confirmed:true,mainClean:true,commandActive:false,integration:{status:'IDLE'},
  plan:{project_id:'project',scope_id:'scope',execution_scope_status:'ACTIVE',execution_strategy:'parallel',
   execution_origin_session_id:'origin',parallel_allowed:true,max_workers:2,tasks:[{id:'T001',commit_status:'PENDING',dependencies:[],parallel_safe:false}]},
  assignments:[{id:'a',parent_task_id:'T001',status:'READY_FOR_INTEGRATION',source_commit:'source',worktree:'/worker'}]};
 const ledger={workspace:'/main',scope:'scope',projectId:'project',originSessionId:'origin',started:true,assignments:{a:{id:'a',taskId:'T001',sessionId:'worker'}},corrections:{}};
 const page={stopped:true,canSend:true,canContinueSend:true,pauseKey:'before',manualSendRevision:0,
  documentId:'doc',lastMessageRole:'assistant',userTurnId:'user-before',userMessagesRevision:1,
  turnId:'assistant-before',assistantRevision:1,manualInputRevision:0,manualStopRevision:0};
 const auth=new ProjectPlanContinuation();auth.set('/main','scope',true,'origin');
 const calls={sent:0,merged:0,saved:[]},receipts=new Map();let sequence=0;
 const enqueue=()=>{const id='sdk-'+(++sequence);receipts.set(id,{delivery:'accepted',reply_observed:false});return {state:'queued',message_id:id};};
 const kit={read:async()=>structuredClone(state),integrate:async()=>{
  calls.merged++;state.plan.tasks[0].commit_status='DONE';state.assignments[0].status='INTEGRATED';return {status:'INTEGRATED'};
 }};
 const runtime=new ParallelExecution({kit,origin:()=>origin,book:{[JSON.stringify(['/main','scope'])]:ledger},
  workerState:()=>({stopped:true}),mainState:()=>page,deliveryReceipt:id=>receipts.get(id),save:async book=>calls.saved.push(structuredClone(book)),
  isEnabled:(w,s)=>auth.enabled(w,s),canFinalize:(w,s)=>auth.finalizationAllowed(w,s),
  onComplete:(w,s)=>auth.sync(w,s,{complete:true,confirmed:true}),restoreWorker:async()=>({sessionId:'worker'}),
  sendFinalization:async(o,text,ready,before)=>{
   assert.equal(o.sessionId,'origin');assert.match(text,/source/);assert.match(text,/провер/i);
   assert.ok(ready());assert.ok(await before());calls.sent++;return enqueue();
  }});
 t.after(()=>runtime.dispose());return {origin,state,ledger,page,auth,calls,kit,runtime,receipts,enqueue};
}
test('dialogue version 1 never merges READY, overlaps final handoff and waits for receipts and cleanup before complete',async t=>{
 const f=fixture(t);Object.assign(f.state.plan,{execution_strategy:'orchestrated',dialogue_version:1});
 await f.runtime.signal('/main');assert.equal(f.calls.merged,0);assert.equal(f.calls.sent,0);
 assert.equal(f.ledger.finalization,undefined,'READY is not a final handoff');
 f.state.plan.tasks[0].commit_status='DONE';f.state.assignments[0].status='INTEGRATED';
 f.runtime.queuedRoute=()=>true;f.runtime.sendFinalization=async(_origin,text)=>{
  assert.match(text,/assignment:cleanup/);f.calls.sent++;return {state:'queued',message_id:'cleanup'};
 };
 f.runtime.channelSettled=()=>false;await f.runtime.signal('/main');assert.equal(f.calls.sent,1);
 await f.runtime.signal('/main');assert.equal(f.calls.sent,1);assert.equal(f.auth.enabled('/main','scope'),true);
 f.runtime.deliveryReceipt=()=>({reply_observed:true});await f.runtime.signal('/main');
 assert.equal(f.auth.enabled('/main','scope'),true,'final words do not prove cleanup');
 assert.equal(f.runtime.view('/main').phase,'finalizing');
 f.state.assignments[0].cleanup={status:'DONE'};await f.runtime.signal('/main');
 assert.equal(f.auth.enabled('/main','scope'),true,'cleanup alone cannot bypass unconfirmed terminal receipts');
 f.runtime.channelSettled=()=>true;await f.runtime.signal('/main');
 assert.equal(f.auth.enabled('/main','scope'),false);assert.equal(f.calls.merged,0);
});
test('final READY returns control before DONE, then requires the correlated SDK handling receipt without replay',async t=>{
 const f=fixture(t);await f.runtime.signal('/main');
 assert.equal(f.calls.sent,1);assert.equal(f.calls.merged,0);assert.equal(f.ledger.finalization.status,'queued');
 f.state.plan.tasks[0].commit_status='DONE';f.state.assignments[0].status='INTEGRATED';
 f.page.assistantRevision=50;f.page.turnId='unrelated';await f.runtime.signal('/main');
 assert.equal(f.ledger.finalization.status,'queued','a page change is not the SDK receipt');
 f.receipts.get(f.ledger.finalization.message_id).reply_observed=true;
 await f.runtime.signal('/main');await f.runtime.signal('/main');
 assert.equal(f.ledger.finalization.status,'reply-observed');assert.equal(f.calls.sent,1);
});
test('pending draft does not delay SDK finalization or transfer ownership to an automatic merge',async t=>{
 const f=fixture(t);f.page.canSend=false;f.page.busy=true;f.page.stopped=false;
 await f.runtime.signal('/main');assert.equal(f.calls.sent,1);assert.equal(f.calls.merged,0);
 assert.equal(f.ledger.finalization.status,'queued');
});
test('manual OFF revokes pending finalization before queue insertion',async t=>{
 const f=fixture(t);f.auth.set('/main','scope',false);
 await f.runtime.signal('/main');assert.equal(f.calls.sent,0);
});
// Existing persisted DOM sends keep their old correlated completion proof;
// this migration fixture never sends another DOM message.
async function legacySent(f){
 f.ledger.finalization={...f.page,status:'sent',projectId:'project',scope:'scope',sessionId:'origin'};
 f.calls.sent=1;await f.runtime.signal('/main');
}
test('restart sending/unknown states never repeat and cannot be mistaken for a main reply',async t=>{
 for(const status of ['sending','unknown']){
  const f=fixture(t);f.ledger.finalization={status,projectId:'project',scope:'scope',sessionId:'origin'};
  await f.runtime.signal('/main');assert.equal(f.calls.sent+f.calls.merged,0);assert.equal(f.ledger.finalization.status,status);
 }
});
test('F18: changing pause, busy without own user or unfinished/foreign reply cannot acknowledge final',async t=>{
 const f=fixture(t);await legacySent(f);
 f.state.plan.tasks[0].commit_status='DONE';f.state.assignments[0].status='INTEGRATED';
 f.page.pauseKey='foreign-pause';f.page.turnId='foreign-assistant';f.page.assistantRevision=20;
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'sent');
 f.page.busy=true;f.page.stopped=false;await f.runtime.signal('/main');
 f.page.busy=false;f.page.stopped=true;f.page.lastMessageRole='assistant';
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'sent','foreign turn and busy do not suffice');
 f.page.userMessagesRevision=2;f.page.userTurnId='user-after-send';f.page.lastMessageRole='user';
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'sent','user only is not a reply');
 f.page.busy=true;f.page.stopped=false;await f.runtime.signal('/main');
 f.page.busy=false;f.page.stopped=true;f.page.lastMessageRole='assistant';
 f.page.turnId='own-answer';f.page.assistantRevision=21;await f.runtime.signal('/main');
 assert.equal(f.ledger.finalization.status,'reply-observed');assert.equal(f.calls.sent,1);
});
test('F18: changed document or manual Send never confirms an old dispatched reply',async t=>{
 const f=fixture(t);await legacySent(f);
 f.state.plan.tasks[0].commit_status='DONE';f.state.assignments[0].status='INTEGRATED';
 f.page.documentId='reloaded';f.page.userTurnId='new-user';f.page.userMessagesRevision=50;
 f.page.turnId='other-reply';f.page.assistantRevision=100;
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'sent');
 f.page.documentId='doc';f.page.manualSendRevision=1;
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'sent');
});
test('F18: two new native turn identities prove a rapid own reply without a sampled busy frame',async t=>{
 const f=fixture(t);await legacySent(f);
 f.state.plan.tasks[0].commit_status='DONE';f.state.assignments[0].status='INTEGRATED';
 f.page.userTurnId='user-after-dispatch';f.page.userMessagesRevision=2;
 f.page.turnId='assistant-after-dispatch';f.page.assistantRevision=2;
 await f.runtime.signal('/main');
 assert.equal(f.ledger.finalization.status,'reply-observed');
});
test('F18: first generated user turn can follow an initial assistant-only plan',async t=>{
 const f=fixture(t);f.page.userTurnId='';await legacySent(f);
 f.state.plan.tasks[0].commit_status='DONE';f.state.assignments[0].status='INTEGRATED';
 f.page.userTurnId='first-user';f.page.userMessagesRevision=2;
 f.page.turnId='assistant-reply';f.page.assistantRevision=2;
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'reply-observed');
});
test('F14: scope, URL, HEAD and manual Stop protections stay with the SDK channel; restored handoff identity must match',async t=>{
 const f=fixture(t);f.ledger.finalization={status:'queued',projectId:'other',scope:'scope',sessionId:'origin',message_id:'foreign'};
 await f.runtime.signal('/main');assert.equal(f.calls.sent,0);assert.equal(f.calls.merged,0);
 assert.equal(f.runtime.view('/main').error.code,'FINALIZATION_IDENTITY');
});
test('F15: failed pre-Send final checkpoint stays pending and never invokes composer',async t=>{
 const f=fixture(t);let called=0;f.runtime.save=async()=>{throw Error('disk full');};
 f.runtime.sendFinalization=async()=>{called++;return {state:'sent'};};
 await f.runtime.signal('/main'); // Scoped identity must be persisted before the final intent can exist.
 assert.equal(called,0);assert.equal(f.runtime.view('/main').phase,'attention');
});
test('a lost queue acknowledgement retries only the same durable SDK intent',async t=>{
 const f=fixture(t),keys=[];let fail=true;
 f.runtime.sendFinalization=async(_o,_text,_ready,_before,meta)=>{keys.push(meta.key);if(fail){fail=false;throw Error('lost acknowledgement');}return f.enqueue();};
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'queuing');
 await f.runtime.signal('/main');assert.equal(f.ledger.finalization.status,'queued');
 assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
});
test('a user Stop is persisted across restore, then cleared only by a new user message',async()=>{
 const selected={workspace:'/main',sessionId:'s',chatUrl:'https://chatgpt.com/c/s',scopeId:'scope'};
 let checkpoint;const automation=new AutomationSendState({save:async x=>{checkpoint=x;}});
 automation.observe(selected,{documentId:'doc',state:{url:selected.chatUrl,userTurnId:'u1',manualStopRevision:1}});
 await automation.stopSave;assert.equal(automation.blocked(selected),true);
 const restored=new AutomationSendState();restored.restore(checkpoint);assert.equal(restored.blocked(selected),true);
 let sent=0;const attempt=()=>restored.send({selected,page:{turnId:'t'},ready:()=>true,perform:async()=>{sent++;return {state:'sent'};}});
 assert.equal((await attempt()).reason,'MANUAL_STOP');assert.equal(sent,0);
 restored.observe(selected,{documentId:'newdoc',state:{url:selected.chatUrl,userTurnId:'u2',manualStopRevision:0}});
 await attempt();assert.equal(sent,1);
});
test('authorization keeps completion OFF distinct from manual OFF after restart and between projects',()=>{
 const auth=new ProjectPlanContinuation();auth.set('/a','one',true);auth.set('/b','two',true);
 auth.sync('/a','one',{complete:true,confirmed:true});
 const restored=new ProjectPlanContinuation({saved:auth.snapshot()});
 assert.equal(restored.finalizationAllowed('/a','one'),true);assert.equal(restored.enabled('/b','two'),true);
 restored.set('/a','one',false);assert.equal(restored.finalizationAllowed('/a','one'),false);
 restored.sync('/a','new');assert.equal(restored.finalizationAllowed('/a','new'),false);
});

test('F07/F08: missing source, dirty child/main and unverified assignment prevent both diagnostic Send and merge',async t=>{
 const f=fixture(t);
 const a=f.state.assignments[0];
 let diagnostics=0;
 f.runtime.sendDiagnostic=async()=>{diagnostics++;return f.enqueue();};
 const writer={id:'writer',state:'running',blocksIntegration:true,reason:'Команда выполняется'};
 a.commands=[writer];a.commandActive=true;
 for(const change of [
  ()=>{a.source_commit=null;},()=>{a.source_commit='source';a.dirty=true;},
  ()=>{a.dirty=false;a.transaction_pending=true;},()=>{a.transaction_pending=false;a.error={code:'BAD_BINDING'};}
 ]){
  change();await f.runtime.signal('/main');
  assert.equal(diagnostics,0);assert.equal(f.calls.merged,0);
 }
 a.error=null;f.state.mainClean=false;await f.runtime.signal('/main');
 assert.equal(diagnostics,0);assert.equal(f.calls.merged,0,'dirty main cannot send diagnostic or merge');
 f.state.mainClean=true;await f.runtime.signal('/main');
 assert.equal(diagnostics,1);assert.equal(f.calls.merged,0);
});

test('source, merge and diagnostic gates remain independent across writer, read-only and dirty main',async t=>{
 const f=fixture(t),a=f.state.assignments[0];
 let projected=finalSourceState(f.state);
 assert.equal(projected.sourceReady,true);assert.equal(projected.mergeSafe,true);
 assert.equal(projected.diagnosticEligible,false);
 a.commandActive=true;a.commands=[{id:'writer-1',state:'unknown',reason:'Нужна проверка',blocksIntegration:true}];
 projected=finalSourceState(f.state);
 assert.equal(projected.sourceReady,true,'write-capable command does not erase source proof');
 assert.equal(projected.mergeSafe,false);assert.equal(projected.diagnosticEligible,true);
 assert.equal(projected.blockers[0].operation,'writer-1');
 f.state.mainClean=false;
 projected=finalSourceState(f.state);
 assert.equal(projected.diagnosticEligible,false,'diagnostic does not outrun a dirty main');
 f.state.mainClean=true;a.commandActive=false;a.commands=[{id:'server',readOnly:true,blocksIntegration:false}];
 projected=finalSourceState(f.state);
 assert.equal(projected.mergeSafe,true,'proved read-only service is not an integration blocker');
 a.transaction_pending=true;
 projected=finalSourceState(f.state);
 assert.equal(projected.sourceReady,false);assert.equal(projected.mergeSafe,false);
});

test('persisted diagnostic UNKNOWN and manual OFF never replay or authorize an unsafe merge',async t=>{
 const f=fixture(t),a=f.state.assignments[0];
 a.commandActive=true;a.commands=[{id:'writer',state:'unknown',blocksIntegration:true,reason:'UNKNOWN'}];
 let deliveries=0;
 f.runtime.sendDiagnostic=async()=>{deliveries++;const result=f.enqueue();f.receipts.get(result.message_id).delivery='unknown';return result;};
 await f.runtime.signal('/main');
 await f.runtime.signal('/main');assert.equal(deliveries,1);assert.equal(f.ledger.diagnostic.status,'unknown');
 a.commandActive=false;a.commands=[];
 await f.runtime.signal('/main');
 assert.equal(deliveries,1);assert.equal(f.calls.merged,0);
 assert.equal(f.ledger.diagnostic.status,'unknown','cleared blocker does not acknowledge ambiguous Send');
 f.auth.set('/main','scope',false);
 await f.runtime.signal('/main');
 assert.equal(deliveries,1);assert.equal(f.calls.sent,0);assert.equal(f.calls.merged,0);
});

test('F16: diagnostic pause is durable, deduplicated and remains read-only after restart even if writer exits',async t=>{
 const f=fixture(t),a=f.state.assignments[0];
 a.commandActive=true;a.commands=[{id:'writer',state:'running',blocksIntegration:true,reason:'Writer'}];
 let diagnostics=0;
 f.runtime.sendDiagnostic=async(_origin,text,ready,before)=>{
  assert.match(text,/ЗАПРЕЩЕНО выполнять integration:start\/continue/);
  assert.ok(ready());assert.equal(await before(),true);diagnostics++;return f.enqueue();
 };
 await Promise.all([f.runtime.signal('/main'),f.runtime.signal('/main')]);
 assert.equal(diagnostics,1);assert.equal(f.ledger.finalization.status,'pending');
 assert.equal(f.ledger.diagnostic.status,'queued');assert.equal(f.calls.merged,0);
 a.commandActive=false;a.commands=[];
 await f.runtime.signal('/main');
 assert.equal(f.calls.merged,0,'no merge before the diagnostic response');
 const original=f.runtime;
 const restored=new ParallelExecution({kit:f.kit,origin:()=>f.origin,book:original.book,
  workerState:()=>({stopped:true}),mainState:()=>f.page,deliveryReceipt:id=>f.receipts.get(id),save:async()=>{},
  isEnabled:(w,s)=>f.auth.enabled(w,s),canFinalize:(w,s)=>f.auth.finalizationAllowed(w,s),
  restoreWorker:async()=>({sessionId:'worker'}),
  sendDiagnostic:async()=>{diagnostics++;return f.enqueue();},
  sendFinalization:async()=>{f.calls.sent++;return f.enqueue();}});
 t.after(()=>restored.dispose());original.dispose();
 await restored.signal('/main');assert.equal(diagnostics,1);assert.equal(f.calls.merged,0);
 f.page.userMessagesRevision=2;f.page.userTurnId='sent-diagnostic';f.page.lastMessageRole='user';
 await restored.signal('/main');
 f.page.turnId='new-assistant';f.page.stopped=true;f.page.lastMessageRole='assistant';f.page.assistantRevision=2;
 f.receipts.get(f.ledger.diagnostic.message_id).reply_observed=true;
 await restored.signal('/main');
 assert.equal(f.ledger.diagnostic.status,'reply-observed');
 // The existing serialized queue may merge only once after the read-only reply.
 assert.equal(f.calls.merged,1);assert.equal(f.calls.sent,1);
 await restored.signal('/main');assert.equal(f.calls.merged,1);assert.equal(diagnostics,1);
});

test('F14: a changed source or scope cannot adopt an old diagnostic intent',async t=>{
 const f=fixture(t),a=f.state.assignments[0];a.commandActive=true;a.commands=[{id:'writer',blocksIntegration:true}];
 f.runtime.sendDiagnostic=async()=>f.enqueue();await f.runtime.signal('/main');
 a.source_commit='replaced';await f.runtime.signal('/main');
 assert.equal(f.runtime.view('/main').error.code,'DIAGNOSTIC_SOURCE_CHANGED');assert.equal(f.calls.merged,0);
});
test('F03: real Git/Kit source, diagnostic read-only reply, terminal event, one verified merge and one final Send',async t=>{
 const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'web-pilot-last-writer-')));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const root=createFixture(directory);
 planFixture(root,'origin');
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const assign=(id,task)=>{
  const created=createAssignment(root,{id,task_id:task,base_commit:git('rev-parse','HEAD'),
   worktree:path.join(directory,id)},readPlan(root).plan_revision);
  assert.equal(setupAssignment(root,id,{npmCi:true}).status,'READY');
  return created;
 };
 // These DONE records come from real Kit integrations, not overwritten flags.
 for(const [id,task] of [['first','T001'],['second','T002']]){
  const item=assign(id,task);completeFixture(item.worktree);
  const proof=assignmentStatus(root,id);assert.equal(proof.status,'READY_FOR_INTEGRATION');
  assert.equal(startIntegration(root,{id,source_commit:proof.source_commit}).status,'INTEGRATED');
 }
 assert.deepEqual(Object.keys(validate(root).resolved).sort(),['T001','T002']);
 const last=assign('last','T003');
 assert.equal(assignmentStatus(root,last.id).status,'READY','last source not yet committed');
 const lastMainHead=git('rev-parse','HEAD');
 completeFixture(last.worktree);
 const lastProof=assignmentStatus(root,last.id);
 assert.equal(lastProof.status,'READY_FOR_INTEGRATION');
 assert.equal(git('rev-parse','HEAD'),lastMainHead,'source commit does not change main');
 const source=lastProof.source_commit;
 const setup={node:async()=>process.execPath,environment:process.env};
 const plans={call:async(_workspace,command,args=[])=>{
  if(command==='integration:status')return integrationStatus(root);
  if(command==='validate')return validate(root);
  if(command==='assignment:status')return assignmentStatus(root,args[1]);
  throw Error('unexpected fixture Kit operation: '+command);
 }};
 const kit=new ParallelKit({setup,plans});
 let writer;
 try {
  // Writer starts AFTER source, and really can write in its temporary checkout.
  writer=await startFixtureWriter(last.worktree);
  assert.equal((await fetch(writer.url+'/write',{method:'POST'})).status,200);
  assert.match(await fs.readFile(path.join(last.worktree,'.harness/runtime/writer-proof.txt'),'utf8'),/fixture write/);
  const activity=await readCommandActivity(last.worktree);
  assert.equal(activity.commandActive,true);
  assert.equal(activity.commands.find(c=>c.id===writer.id)?.readOnly,false);
  const initial=await kit.read(root);
  assert.equal(initial.confirmed,true);
  assert.equal(initial.mainClean,true);
  const actual=initial.assignments.find(a=>a.id===last.id);
  assert.equal(actual.status,'READY_FOR_INTEGRATION');
  assert.equal(actual.source_commit,source);
  assert.equal(actual.commandActive,true);
  assert.equal(actual.dirty,false,'only ignored fixture-runtime files written');
  const auth=new ProjectPlanContinuation();
  auth.set(root,'parallel-fixture',true,'origin');
  const origin={workspace:root,sessionId:'origin',projectId:initial.plan.project_id,
   chatUrl:'https://chatgpt.com/c/fixture',executionSnapshot:{parallel_allowed:true,max_workers:2}};
  const page={stopped:true,canSend:true,canContinueSend:true,pauseKey:'before',manualSendRevision:0,
   documentId:'doc',lastMessageRole:'assistant',userTurnId:'user-before',userMessagesRevision:1,
   turnId:'assistant-before',assistantRevision:1};
  let sends=0,diagnostics=0,merges=0,sequence=0;const receipts=new Map();
  const enqueue=()=>{const id='sdk-'+(++sequence);receipts.set(id,{delivery:'accepted',reply_observed:false});return {state:'queued',message_id:id};};
  const book={[JSON.stringify([root,'parallel-fixture'])]:{
   workspace:root,scope:'parallel-fixture',started:true,assignments:{},corrections:{}}};
  const runtime=new ParallelExecution({kit:{...kit,
    read:()=>kit.read(root),integrate:async(_workspace,a)=>{
     merges++;return startIntegration(root,{id:a.id,source_commit:a.source_commit});
    }},book,origin:()=>origin,mainState:()=>page,workerState:()=>({stopped:true}),deliveryReceipt:id=>receipts.get(id),
   restoreWorker:async()=>({sessionId:'fixture-worker'}),save:async()=>{},
   isEnabled:(workspace,scope)=>auth.enabled(workspace,scope),
   canFinalize:(workspace,scope)=>auth.finalizationAllowed(workspace,scope),
   onComplete:(workspace,scope)=>auth.sync(workspace,scope,{complete:true,confirmed:true}),
   sendDiagnostic:async(_origin,text,ready,before)=>{
    assert.match(text,/ЗАПРЕЩЕНО выполнять integration:start\/continue/);
    assert.match(text,/владеет только очередь/);
    assert.match(text,new RegExp(writer.id));
    assert.ok(ready());assert.equal(await before(),true);
    diagnostics++;return enqueue();
   },
   sendFinalization:async()=>{sends++;return enqueue();}});
  t.after(()=>runtime.dispose());
  // T001 characterized the OLD BUG (no Send/merge). T003 inverts only the
  // diagnostic expectation; unsafe integration remains forbidden.
  await runtime.signal(root);await runtime.signal(root);
  assert.equal(diagnostics,1,'source is ready for a safe diagnostic handoff');
  assert.equal(sends,0,'a diagnostic is not the final instruction');
  assert.equal(merges,0,'writer correctly forbids unsafe integration');
  assert.equal(book[JSON.stringify([root,'parallel-fixture'])].finalization.status,'pending');
  assert.equal(book[JSON.stringify([root,'parallel-fixture'])].diagnostic.status,'queued');
  assert.equal(runtime.view(root).assignments.find(a=>a.id===last.id)?.commandActive,true);
  assert.equal(git('rev-parse','HEAD'),lastMainHead);
  assert.deepEqual(Object.keys(validate(root).resolved).sort(),['T001','T002']);
  page.busy=true;page.stopped=false;page.userTurnId='diagnostic-sent';page.userMessagesRevision=2;
  page.lastMessageRole='user';await runtime.signal(root);
  page.busy=false;page.stopped=true;page.pauseKey='after-diagnostic';
  page.lastMessageRole='assistant';page.turnId='diagnostic-answer';page.assistantRevision=2;
  receipts.get(book[JSON.stringify([root,'parallel-fixture'])].diagnostic.message_id).reply_observed=true;
  await runtime.signal(root);
  assert.equal(book[JSON.stringify([root,'parallel-fixture'])].diagnostic.status,'reply-observed');
  assert.equal(merges,0,'the main chat performed no write in its diagnostic answer');
  // A fixture-owned terminal event clears the marker; explicit reconciliation
  // proves the new safe continuation. Child-event delivery belongs to T002.
  await writer.stop();writer=null;
  assert.equal((await readCommandActivity(last.worktree)).commandActive,false);
  await runtime.signal(root);
  assert.equal(merges,1,'queue alone writes main after terminal event');
  assert.equal(sends,1,'a new final turn is sent only after verified integration');
  assert.equal(book[JSON.stringify([root,'parallel-fixture'])].finalization.status,'queued');
  assert.deepEqual(Object.keys(validate(root).resolved).sort(),['T001','T002','T003']);
  page.busy=true;page.stopped=false;page.userTurnId='final-sent';page.userMessagesRevision=3;
  page.lastMessageRole='user';await runtime.signal(root);
  page.busy=false;page.stopped=true;page.lastMessageRole='assistant';
  page.turnId='final-answer';page.assistantRevision=3;page.pauseKey='after';
  receipts.get(book[JSON.stringify([root,'parallel-fixture'])].finalization.message_id).reply_observed=true;await runtime.signal(root);
  assert.equal(book[JSON.stringify([root,'parallel-fixture'])].finalization.status,'reply-observed');
  assert.equal(auth.enabled(root,'parallel-fixture'),false);
  assert.equal(sends,1,'no duplicate final message');
 }finally{if(writer)await writer.stop();}
});
