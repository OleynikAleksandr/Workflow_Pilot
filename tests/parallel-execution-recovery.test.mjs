import test from 'node:test';
import assert from 'node:assert/strict';
import { ParallelExecution } from '../src/control/workflow/parallel-execution.mjs';
import { ParallelKit,projectVerifiedPlan } from '../src/control/workflow/parallel-kit.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {emptyPlan,renderPlan} from '@webpilot/workflow-kit/lib/plan';
import {ChildCommandWatches} from '../src/execution/files/project-input-watch.mjs';
import {readCommandActivity} from '../src/control/workflow/command-activity.mjs';
test('retirement blocks a delivery paused in persistence and all late scheduler callbacks',async t=>{
  const f=fixture(t),entry={status:'pending'};let release,deliveries=0;
  const wait=new Promise(resolve=>release=resolve);f.runtime.save=()=>wait;
  f.runtime.sendFinalization=async()=>{deliveries++;return {message_id:'forbidden'};};
  const pending=f.runtime.queueMessage('/main',{sessionId:'origin'},f.ledger,entry,'context','finalization');
  await f.runtime.retire('/main');release();
  await assert.rejects(pending,{code:'PROJECT_REMOVED'});
  f.runtime.forget(['/main']);f.runtime.observe('/main');await f.runtime.signal('/main');
  assert.equal(deliveries,0);assert.equal(f.runtime.states.has('/main'),false);
  assert.equal(Object.values(f.runtime.book).some(v=>v.workspace==='/main'),false);
});
test('durable handoff recovers the Kit-to-channel gap and separates queued, accepted and replied',async t=>{
  const f=fixture(t),ledger=f.ledger,origin={sessionId:'origin'},entry=ledger.finalization={status:'pending'};
  f.runtime.queuedRoute=()=>true;const calls=[];let lost=true;
  f.runtime.sendFinalization=async(_o,text,_ready,_before,meta)=>{calls.push({text,meta});if(lost)throw Error('connection lost');return {state:'queued',message_id:'durable-id'};};
  await assert.rejects(f.runtime.queueMessage('/main',origin,ledger,entry,'complete context','finalization'));
  assert.equal(entry.status,'queuing');const saved=structuredClone(ledger);f.runtime.book[JSON.stringify(['/main','scope'])]=saved;
  lost=false;let receipt={delivery:'accepted',read:true,reply_observed:false};f.runtime.deliveryReceipt=()=>receipt;
  await f.runtime.reconcileMessages('/main',f.state,origin,saved,()=>true);
  assert.equal(saved.finalization.status,'queued');assert.deepEqual(calls[0],calls[1]);
  await f.runtime.reconcileMessages('/main',f.state,origin,saved,()=>true);assert.equal(calls.length,2);
  receipt.reply_observed=true;await f.runtime.reconcileMessages('/main',f.state,origin,saved,()=>true);
  assert.equal(saved.finalization.status,'reply-observed');
});

test('a staged integration candidate never projects DONE before its Git commit is proven',()=>{
  const plan={tasks:[{id:'A',commit_status:'DONE',implementation_status:'DONE'},{id:'B',commit_status:'DONE',implementation_status:'DONE'}]};
  const view=projectVerifiedPlan(plan,{A:{sha:'actual-merge'},B:{pending:true}});
  assert.equal(view.tasks[0].commit_status,'DONE');assert.equal(view.tasks[1].commit_status,'PENDING');
  assert.equal(plan.tasks[1].commit_status,'DONE','the raw candidate remains available to Kit');
});

test('sequential legacy checkout does not require new assignment commands from its installed Kit',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'parallel-legacy-read-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.mkdir(path.join(root,'.harness/plans'),{recursive:true});
  await fs.writeFile(path.join(root,'.harness/plans/todo-plan.md'),renderPlan(emptyPlan('Legacy')));
  const kit=new ParallelKit({plans:{call:async()=>{throw Error('Legacy Kit cannot run this command');}},setup:{}});
  const result=await kit.read(root);assert.equal(result.integration.status,'IDLE');assert.deepEqual(result.assignments,[]);
});

test('F04: child receipt replacement wakes main without a worker page or polling, and stale watchers close',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'child-command-event-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const child=path.join(directory,'assigned'),other=path.join(directory,'other');
  for(const workspace of [child,other])await fs.mkdir(path.join(workspace,'.harness/runtime/command-activity'),{recursive:true});
  let notify,events=0;const errors=[];
  const watcher=new ChildCommandWatches({onSignal:()=>{events++;notify?.();notify=null;},onError:e=>errors.push(e)});
  t.after(()=>watcher.close());
  watcher.update([child]);
  const marker=path.join(child,'.harness/runtime/command-activity','command.json');
  const record={version:2,id:'command',workspace:child,cwd:child,executor_pid:12345,
    executor_instance:'fixture',started_at_ms:Date.now(),process_id:'fixture',state:'running',sandbox_policy:'dangerFullAccess'};
  const changed=()=>new Promise((resolve,reject)=>{
    // Real macOS filesystem delivery competes with the four-process suite.
    // This deadline bounds a missing event; it is not a product latency SLA.
    const timeout=setTimeout(()=>{notify=null;reject(Error('child watcher missed a real file event'));},15000);
    notify=()=>{clearTimeout(timeout);resolve();};
  });
  let observed=changed();
  await fs.writeFile(marker+'.tmp',JSON.stringify(record));await fs.rename(marker+'.tmp',marker);
  await observed;
  assert.equal((await readCommandActivity(child,{isDead:()=>false})).commandActive,true);
  observed=changed();
  await fs.writeFile(marker+'.tmp',JSON.stringify({...record,state:'completed',exit_code:7}));
  await fs.rename(marker+'.tmp',marker);
  await observed;
  assert.equal((await readCommandActivity(child,{isDead:()=>false})).commandActive,false,'terminal receipt no stdin');
  assert.deepEqual(errors,[]);
  assert.ok(events>=2,'both start and completion signalled the parent');
  watcher.update([other]);assert.deepEqual([...watcher.children.keys()],[other]);
  watcher.close();assert.equal(watcher.children.size,0);
});

function fixture(t) {
  const origin={workspace:'/main',sessionId:'origin',executionSnapshot:{parallel_allowed:true,max_workers:2}};
  const task=id=>({id,title:id,dependencies:[],parallel_safe:true,implementation_status:'TODO',commit_status:'PENDING',functional_paths:[id],documentation_paths:[]});
  const state={head:'main',confirmed:true,mainClean:true,commandActive:false,integration:{status:'IDLE'},assignments:[],
    plan:{scope_id:'scope',execution_scope_status:'ACTIVE',execution_strategy:'parallel',execution_origin_session_id:'origin',parallel_allowed:true,max_workers:2,tasks:[task('A'),task('B')]}};
  const ledger={workspace:'/main',scope:'scope',started:true,assignments:{},corrections:{}};
  const calls={created:0,opened:0,merged:0,continued:0,restored:[]};
  const kit={read:async()=>structuredClone(state),create:async()=>{calls.created++;throw Error('unexpected creation');},
    integrate:async()=>{calls.merged++;throw Error('unexpected merge');},continueIntegration:async()=>{calls.continued++;state.integration={status:'IDLE'};}};
  const runtime=new ParallelExecution({kit,book:{[JSON.stringify(['/main','scope'])]:ledger},origin:()=>origin,
    mainState:()=>({stopped:true}),workerState:()=>({stopped:true}),save:async()=>{},
    openWorker:async()=>{calls.opened++;return {sessionId:'saved-session'};},
    restoreWorker:async a=>{calls.restored.push(a.id);return {sessionId:'saved-session'};}});
  t.after(()=>runtime.dispose());
  const assignment=(id='a',taskId='A',status='READY_FOR_INTEGRATION')=>{
    const a={id,parent_root:'/main',parent_scope_id:'scope',parent_task_id:taskId,worktree:'/trees/'+id,status};
    state.assignments.push(a);ledger.assignments[id]={id,taskId,worktree:a.worktree,phase:'running',sessionId:'saved-session'};return a;
  };
  const grant=async()=>{const previous=runtime.enabled;runtime.setEnabled(true);await runtime.signal('/main');runtime.setEnabled(previous);};
  return {state,ledger,calls,kit,runtime,assignment,grant};
}

test('reserved identities missing in Kit retain capacity and visible uncertainty after restart',async t=>{
  const f=fixture(t);
  f.ledger.assignments.a={id:'a',taskId:'A',phase:'creating'};
  f.ledger.assignments.b={id:'b',taskId:'B',phase:'creating'};
  await f.grant();await f.runtime.signal('/main');
  assert.equal(f.calls.created,0);assert.equal(f.calls.opened,0);
  assert.equal(f.runtime.view('/main').assignments.length,2);
  assert.equal(f.runtime.view('/main').error.code,'ASSIGNMENT_UNKNOWN');
});

test('verified main commit reconciles an unknown merge without repeating source or merge',async t=>{
  const f=fixture(t);f.assignment('a','A','INTEGRATED');
  f.state.plan.tasks[0].commit_status='DONE';f.ledger.assignments.a.integration='unknown';
  await f.runtime.signal('/main');
  assert.equal(f.ledger.assignments.a.integration,'done');assert.equal(f.calls.merged,0);assert.equal(f.calls.opened,0);
});

test('committed Kit journal is finalized once even with no observable main page',async t=>{
  const f=fixture(t);f.assignment('a','A','INTEGRATED');f.state.plan.tasks[0].commit_status='DONE';
  f.state.integration={status:'CHECKING',operation_id:'integration-a',task_id:'A',committed:true};
  f.runtime.restoreOrigin=async()=>{throw Error('page unavailable');};
  await f.runtime.signal('/main');await f.runtime.signal('/main');
  assert.equal(f.calls.continued,1);assert.equal(f.calls.merged,0);assert.equal(f.calls.opened,0);
});

test('unknown merge or active command never replays integration continuation',async t=>{
  const f=fixture(t);f.assignment();
  for(const [status,committed,commandActive] of [['UNKNOWN',false,false],['CHECKING',true,true]]) {
    f.state.integration={status,committed,operation_id:'integration-a'};f.state.commandActive=commandActive;
    await f.runtime.signal('/main');assert.equal(f.calls.continued,0);assert.equal(f.calls.merged,0);
  }
});

test('missing or mismatched saved chat blocks its source, while an independent source remains available',async t=>{
  const f=fixture(t);f.assignment();f.runtime.restoreWorker=async()=>{throw Object.assign(Error('wrong chat'),{code:'EXECUTOR_SESSION_MISMATCH'});};
  await f.runtime.signal('/main');assert.equal(f.calls.merged,0);
  assert.equal(f.runtime.view('/main').assignments[0].error.code,'EXECUTOR_SESSION_MISMATCH');
  assert.equal(f.runtime.view('/main').error.code,'EXECUTOR_SESSION_MISMATCH');
});

test('known unfinished setup resumes only with PlanContinuation, retaining assignment identity',async t=>{
  const f=fixture(t);const a=f.assignment('a','A','NEEDS_SETUP');delete f.ledger.assignments.a.sessionId;
  f.ledger.assignments.a.phase='attention';f.runtime.restoreWorker=async()=>null;
  let setups=0;f.kit.setupAssignment=async()=>{setups++;a.status='READY';return a;};
  f.state.plan.tasks[1].commit_status='DONE';
  await f.runtime.signal('/main');assert.equal(setups,0);
  await f.grant();assert.equal(setups,1);assert.equal(f.calls.opened,1);assert.equal(f.calls.created,0);
});

test('malformed ledger fails closed before any assignment or chat operation',async t=>{
  const f=fixture(t);f.ledger.assignments={a:null};
  await f.grant();assert.equal(f.runtime.view('/main').error.code,'EXECUTION_LEDGER_INVALID');
  assert.equal(f.calls.created+f.calls.opened+f.calls.merged,0);
});

test('an input event resumes a known Kit journal only when its own source and main have stopped',async t=>{
  const f=fixture(t);f.assignment();f.state.integration={status:'CHECKING',operation_id:'integration-a',assignment_id:'a'};
  f.runtime.workerState=()=>({stopped:false});await f.runtime.recheck('/main');assert.equal(f.calls.continued,0);
  f.runtime.workerState=()=>({stopped:true});f.kit.continueIntegration=async()=>{f.calls.continued++;f.state.integration={status:'CONFLICT'};};
  await f.runtime.recheck('/main');assert.equal(f.calls.continued,1);assert.equal(f.calls.opened,0);assert.equal(f.calls.created,0);
});
