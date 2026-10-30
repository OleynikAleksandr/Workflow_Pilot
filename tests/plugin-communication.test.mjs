import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
import {AttestedCommunication} from './fixtures/panel-attestation.mjs';
import {createBackendJournal} from '../src/backend/diagnostics.mjs';

async function fixture(t,options={}){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-communication-control-')));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const store=await openCommunicationStore(directory),comm=new AttestedCommunication({store,waitMs:30,...options});
  t.after(()=>comm.dispose());
  const people={};
  for(const role of ['O','E']){
    const metadata={'openai/session':'secret-session-'+role,'openai/subject':'secret-subject'};
    const joined=await comm.join({run_id:'exchange',role,metadata});
    people[role]={run_id:joined.run_id,participant_id:joined.participant_id,metadata,
      panel_instance_id:randomUUID(),frame_instance_id:randomUUID(),protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
    await comm.bind(people[role]);
  }
  return {comm,store,directory,...people};
}
async function enable(comm,input){input.permission_generation=(await comm.enable({...input,message_supported:true})).permission_generation;return input;}
const send=(comm,a,b,extra={})=>comm.send({...a,recipient_id:b.participant_id,kind:'question',body:'What is 2 + 2?',idempotency_key:'question-1',...extra});
const error=code=>({code:'PLUGIN_COMMUNICATION_'+code});

test('recovery discovers only the current identity and never restores a permission',async t=>{
  const {comm,O,E}=await fixture(t);await enable(comm,O);
  const second=await comm.join({run_id:'second',role:'E',metadata:O.metadata});
  const recovered=await comm.recover({metadata:O.metadata});
  assert.deepEqual(recovered.participants,[{run_id:O.run_id,participant_id:O.participant_id,role:'O'},
    {run_id:'second',participant_id:second.participant_id,role:'E'}]);
  assert.doesNotMatch(JSON.stringify(recovered),new RegExp(E.participant_id+'|secret-session|permission_generation'));
  assert.deepEqual((await comm.recover({metadata:{'openai/session':'stranger'}})).participants,[]);
  await assert.rejects(comm.recover({metadata:{}}),error('IDENTITY_REQUIRED'));
});

test('permission lasts thirty minutes, remains live past ten, and expires at the deadline',async t=>{
  let now=Date.now();const start=now,{comm,E}=await fixture(t,{now:()=>now});await enable(comm,E);
  assert.equal((await comm.status(E)).expires_at,start+1800000);
  for(const elapsed of [600001,1799999]){now=start+elapsed;assert.equal((await comm.status(E)).stopped,false);}
  now=start+1800000;assert.equal((await comm.status(E)).stopped,true);
  await assert.rejects(comm.probe({...E,delay_ms:25}),error('STOPPED'));
});

test('automatic Stop is generation-fenced; explicit Stop stays global and repeated Stop is idempotent',async t=>{
  const {comm,E}=await fixture(t);await enable(comm,E);
  const fresh={...E,panel_instance_id:randomUUID()};await comm.bind(fresh);await enable(comm,fresh);
  const generation=fresh.permission_generation;
  const ignored=await comm.stop({...E,scope:'panel'});assert.equal(ignored.stop_applied,false);
  assert.equal(ignored.stopped,false);assert.equal(ignored.permission_generation,generation);
  await Promise.all(Array.from({length:29},()=>comm.stop({...E,scope:'participant'})));
  const stopped=await comm.status(fresh);assert.equal(stopped.stopped,true);assert.equal(stopped.permission_generation,generation+1);
  assert.equal((await comm.journal(E)).events.filter(e=>e.event_type==='stop.confirmed').length,1);
  await enable(comm,fresh);
  assert.equal((await comm.stop({...fresh,permission_generation:generation,scope:'panel'})).stopped,false);
});

test('durable two-participant exchange: authorization, idempotency, reply chain and independent late read',async t=>{
  const {comm,O,E,directory}=await fixture(t);await enable(comm,E);
  const q=await send(comm,O,E);assert.equal((await send(comm,O,E)).message_id,q.message_id);
  await assert.rejects(send(comm,O,E,{body:'different'}),error('CONFLICT'));
  await assert.rejects(send(comm,{...O,metadata:E.metadata},E),error('BINDING'));
  await assert.rejects(comm.read({...O,...q}),error('READ_DENIED'));
  await assert.rejects(send(comm,E,O,{kind:'answer',in_reply_to:randomUUID()}),error('REPLY'));
  const attempts=await Promise.allSettled([comm.claim({...E,...q}),comm.claim({...E,...q})]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  const ticket=attempts.find(x=>x.status==='fulfilled').value;
  await comm.verify({...E,...ticket});await assert.rejects(comm.verify({...E,...ticket}),error('CLAIM_DENIED'));
  const received=await comm.read({...E,...q});assert.equal(received.body,'What is 2 + 2?');
  assert.deepEqual(await comm.report({...E,...ticket,outcome:'accepted'}),{delivery:'accepted',read:true});
  const answer=await send(comm,E,O,{kind:'answer',body:'4',in_reply_to:q.message_id,idempotency_key:'answer-1'});
  await comm.read({...O,...answer});
  const result=await send(comm,O,E,{kind:'result',body:'Correct. End.',in_reply_to:answer.message_id,idempotency_key:'result-1'});
  await comm.read({...E,...result});
  assert.equal((await comm.status(O)).messages.length,3);
  const disk=(await Promise.all((await fs.readdir(directory)).map(f=>fs.readFile(path.join(directory,f),'utf8')))).join('');
  assert.doesNotMatch(disk,/secret-session|secret-subject/);assert.match(disk,/message.persisted/);
});

test('second panel invalidates old permission, Stop fences claim/verify and expiry requires enable',async t=>{
  let now=Date.now();const {comm,O,E}=await fixture(t,{now:()=>now});await enable(comm,E);
  const q=await send(comm,O,E),second={...E,panel_instance_id:randomUUID()};await comm.bind(second);await enable(comm,second);
  await assert.rejects(comm.claim({...E,...q}),error('STOPPED'));
  const ticket=await comm.claim({...second,...q});await comm.stop(second);
  await assert.rejects(comm.verify({...second,...ticket}),error('STOPPED'));
  await enable(comm,second);now+=1800001;
  await assert.rejects(comm.verify({...second,...ticket}),error('STOPPED'));
  await assert.rejects(comm.probe({...second,delay_ms:25}),error('STOPPED'));
  assert.equal((await comm.status(E)).messages[0].delivery,'claimed');
});

test('restart persists Stop/read/outcomes, requires rebind and never replays a scheduled probe or uncertain attempt',async t=>{
  const {comm,O,E,directory}=await fixture(t);await enable(comm,E);await enable(comm,O);
  const q=await send(comm,O,E),ticket=await comm.claim({...E,...q});await comm.verify({...E,...ticket});await comm.read({...E,...q});
  await comm.probe({...O,delay_ms:60000});comm.dispose();await comm.tail;
  const next=new AttestedCommunication({store:await openCommunicationStore(directory)});t.after(()=>next.dispose());await next.ready;
  const state=await next.status(E);assert.equal(state.stopped,true);assert.equal(state.messages[0].delivery,'unknown');assert.equal(state.messages[0].read,true);
  await assert.rejects(next.claim({...E,...q}),error('BINDING'));
  const fresh={...E,panel_instance_id:randomUUID()};await next.bind(fresh);
  await assert.rejects(next.claim({...fresh,...q}),error('STOPPED'));await enable(next,fresh);
  await assert.rejects(next.claim({...fresh,...q}),error('CLAIM_DENIED'));
  assert.deepEqual(next.runs.get(O.run_id).probes,{});
  assert.ok((await next.journal(O)).events.some(e=>e.event_type==='backend.restart'));
  await next.stop(fresh);next.dispose();await next.tail;
  const third=new AttestedCommunication({store:await openCommunicationStore(directory)});t.after(()=>third.dispose());
  assert.equal((await third.status(E)).stopped,true);
});

test('failed save never acknowledges a message or Send intent; critical state remains visible',async t=>{
  const {comm,O,E,store}=await fixture(t);await enable(comm,E);
  const q=await send(comm,O,E),ticket=await comm.claim({...E,...q});
  comm.store={load:store.load,append:async()=>{throw Object.assign(Error('Bearer private'),{code:'PLUGIN_COMMUNICATION_STORE_WRITE'});}};
  await assert.rejects(comm.verify({...E,...ticket}),error('STORE_WRITE'));
  let state=await comm.status(E);assert.equal(state.messages[0].intent,undefined);assert.equal(state.critical_error,'PLUGIN_COMMUNICATION_STORE_WRITE');
  await assert.rejects(send(comm,O,E,{idempotency_key:'q2'}),error('STORE_BLOCKED'));
  assert.equal((await comm.status(O)).messages.length,1);
  assert.doesNotMatch(JSON.stringify(await comm.export(O)),/Bearer|private/);
});

test('save failure exposes a safe storage code without leaking the underlying error',async t=>{
  for(const cause of ['PLUGIN_COMMUNICATION_STORE_VERSION','Bearer private']){
    const {comm,O,E,store}=await fixture(t);await enable(comm,E);
    comm.store={...store,append:async()=>{throw Object.assign(Error('cookie=private; disk details'),{code:cause});}};
    const code=cause==='PLUGIN_COMMUNICATION_STORE_VERSION'?cause:'PLUGIN_COMMUNICATION_STORE_WRITE';
    await assert.rejects(send(comm,O,E),e=>{
      assert.equal(e.code,'PLUGIN_COMMUNICATION_STORE_WRITE');assert.ok(e.message.includes(code));
      assert.doesNotMatch(e.message,/cookie|private|Bearer|disk details/);return true;
    });
    assert.equal(comm.critical,code);
    assert.equal((await comm.status(O)).messages.length,0);
  }
});

test('telemetry is deduplicated, gaps are visible, export is paged/frozen and excludes secrets/other runs',async t=>{
  const {comm,O,E}=await fixture(t);
  const data={event_id:randomUUID(),event_type:'host.handshake',client_sequence:3,client_time:new Date().toISOString(),duration_ms:0,
    error_code:'Bearer private',raw_payload:{cookie:'private'}};
  await comm.telemetry({...O,event:data});assert.equal((await comm.telemetry({...O,event:data})).duplicate,true);
  await assert.rejects(comm.telemetry({...O,event:{...data,event_type:'sdk.error'}}),error('CONFLICT'));
  await assert.rejects(send(comm,O,E,{body:'api_key=secret'}),error('SECRET_INPUT'));
  const other=await comm.join({run_id:'other',role:'O',metadata:O.metadata});
  await assert.rejects(comm.export({...O,run_id:'other'}),error('BINDING'));
  for(let i=4;i<=110;i++)await comm.telemetry({...O,event:{...data,event_id:randomUUID(),client_sequence:i}});
  const first=await comm.export(O);assert.equal(first.complete,false);
  await comm.telemetry({...O,event:{...data,event_id:randomUUID(),client_sequence:111}});
  const second=await comm.export({...O,after_seq:first.after_seq,through_seq:first.through_seq});assert.equal(second.complete,true);
  const events=(first.jsonl+second.jsonl).trim().split('\n').map(JSON.parse);
  assert.equal(events.length,first.through_seq);assert.equal(new Set(events.map(e=>e.event_id)).size,events.length);
  assert.equal(first.summary.gaps.length,1);assert.equal(first.summary.gaps[0].from,1);assert.equal(first.summary.gaps[0].to,2);
  assert.doesNotMatch(first.jsonl+second.jsonl,/Bearer|private|raw_payload|secret-session|api_key/);
  assert.ok(events.every(e=>e.run_id===O.run_id));assert.ok(!events.some(e=>e.participant_id===other.participant_id));
});

test('one wait per panel: timeout, delivery, cancellation and Stop are distinct committed events',async t=>{
  const {comm,O,E}=await fixture(t);await enable(comm,E);
  const controller=new AbortController(),input={...E,after_seq:(await comm.status(E)).seq};
  const pending=comm.wait(input,controller.signal);await delay(5);
  await assert.rejects(comm.wait(input),error('WAIT_ACTIVE'));
  const q=await send(comm,O,E),value=await pending;assert.equal(value.message_id,q.message_id);
  await comm.read({...E,...q});
  const timeout=comm.wait({...E,after_seq:(await comm.status(E)).seq});await delay(40);await timeout;
  const cancelled=comm.wait({...E,after_seq:(await comm.status(E)).seq},controller.signal);await delay(5);controller.abort();await cancelled;
  const stopped=comm.wait({...E,after_seq:(await comm.status(E)).seq});await delay(5);await comm.stop(E);assert.equal((await stopped).stopped,true);
  const types=(await comm.journal(E)).events.map(e=>e.event_type);
  for(const type of ['wait.started','wait.event','wait.timeout','wait.cancel','stop.confirmed'])assert.ok(types.includes(type),type);
});

test('Stop and replacement enable cancel a fired but unclaimed probe; status reflects expiry without a waiter',async t=>{
  let now=Date.now();const {comm,O}=await fixture(t,{now:()=>now});await enable(comm,O);
  const model={run_id:O.run_id,participant_id:O.participant_id,metadata:O.metadata};
  assert.equal((await comm.status(model)).expires_at,now+1800000);
  for(const action of ['stop','enable']){
    await comm.probe({...O,delay_ms:25});await delay(60);
    const probe=(await comm.status(O)).messages.at(-1);assert.equal(probe.delivery,'pending');
    if(action==='stop'){await comm.stop(O);await enable(comm,O);}else await enable(comm,O);
    assert.equal((await comm.status(O)).messages.at(-1).delivery,'rejected');
    await assert.rejects(comm.claim({...O,message_id:probe.message_id}),error('CLAIM_DENIED'));
  }
  now+=1800001;assert.equal((await comm.status(model)).stopped,true);
  await assert.rejects(comm.probe({...O,delay_ms:25}),error('STOPPED'));
  assert.equal((await comm.journal(O)).events.filter(e=>e.event_type==='permission.expired').length,1);
  await enable(comm,O);assert.equal((await comm.status(model)).stopped,false);
});

test('a failed message append is not acknowledged or visible after restart',async t=>{
  const {comm,O,E,store,directory}=await fixture(t);
  comm.store={load:store.load,append:async()=>{throw Error('private disk details');}};
  await assert.rejects(send(comm,O,E),error('STORE_WRITE'));
  assert.deepEqual((await comm.status(E)).messages,[]);comm.dispose();
  const next=new AttestedCommunication({store:await openCommunicationStore(directory)});t.after(()=>next.dispose());
  assert.deepEqual((await next.status(E)).messages,[]);
});

test('every plan participant gets the project progress; a progress change wakes panel waits',async t=>{
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-progress-')));
  const targets=new Map(),calls=[];
  const comm=new AttestedCommunication({store:await openCommunicationStore(directory),waitMs:5000,resolveTarget:id=>targets.get(id)??null,
    workProgress:target=>{calls.push(target.local_session_id);return {version:1,phase:'Выполнение',self:target.role==='E'?target.task_id:target.role};}});
  t.after(async()=>{comm.dispose();await comm.tail;await fs.rm(directory,{recursive:true,force:true});});
  const people={};
  for(const [id,role] of [['orchestrator','O'],['worker','E']]){
    targets.set(id,{project_id:'project',local_session_id:id,origin_session_id:'orchestrator',role,scope_id:'scope',
      assignment_id:role==='E'?'assignment-1':null,task_id:role==='E'?'T001':null});
    const metadata={'openai/session':'private-'+id,'openai/subject':'private-user'};
    const joined=await comm.enroll((await comm.reserve(targets.get(id))).enrollment_ticket,metadata);
    people[role]={...joined,metadata,panel_instance_id:randomUUID(),frame_instance_id:randomUUID(),protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
  }
  for(const role of ['O','E']){
    const value=await comm.status({...people[role],view:'panel'});
    assert.equal(value.work_progress.phase,'Выполнение');
    assert.equal(value.work_progress.self,role==='E'?'T001':'O');
    assert.equal((await comm.status(people[role])).work_progress,undefined,'only the panel view carries progress');
  }
  assert.deepEqual(calls,['orchestrator','worker']);
  // Raw message visibility is unchanged by the shared projection.
  assert.deepEqual(comm.planMessages('project','scope'),[]);
  assert.deepEqual(comm.planMessages('other','scope'),[]);
  const woken=[];
  comm.waiters.set('panel-e',{runId:people.E.run_id,memberId:people.E.participant_id,wake:reason=>woken.push(reason)});
  comm.workProgressChanged('other');assert.deepEqual(woken,[],'another project does not wake');
  comm.workProgressChanged('project');assert.deepEqual(woken,['event']);
  comm.waiters.delete('panel-e');
  const result=comm.waitResult({...people.E,after_seq:0,permission_generation:0});
  assert.equal(result.work_progress.self,'T001');
});

test('an unmatched model identity is journaled outside the WAL and visible in the export of O, without metadata values',async t=>{
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-identity-trace-')));
  const targets=new Map(),file=path.join(directory,'diagnostics','backend-events.jsonl');
  const store=await openCommunicationStore(path.join(directory,'wal'));
  const comm=new AttestedCommunication({store,waitMs:30,resolveTarget:id=>targets.get(id)??null,journal:createBackendJournal(file)});
  t.after(async()=>{comm.dispose();await comm.tail;await fs.rm(directory,{recursive:true,force:true});});
  const people={},keys=['openai/organization','openai/session','openai/subject','progressToken'];
  for(const [id,role] of [['orchestrator','O'],['worker','E']]){
    targets.set(id,{project_id:'project',local_session_id:id,origin_session_id:'orchestrator',role,scope_id:'scope',
      assignment_id:role==='E'?'assignment-1':null,task_id:role==='E'?'T001':null});
    const metadata={'openai/session':'private-'+id,'openai/subject':'private-user'};
    const joined=await comm.enroll((await comm.reserve(targets.get(id))).enrollment_ticket,metadata);
    people[role]={...joined,metadata,panel_instance_id:randomUUID(),frame_instance_id:randomUUID(),protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
  }
  await comm.recover({metadata:people.O.metadata,meta_keys:keys});
  await comm.bind({...people.O,meta_keys:keys});
  const walBefore=JSON.stringify((await store.load()).runs);
  await assert.rejects(comm.readMessage({metadata:{'openai/session':'private-other-client','openai/subject':'private-user'},
    meta_keys:[...keys,'bad key!'],message_id:randomUUID()}),error('BINDING'));
  assert.equal(JSON.stringify((await store.load()).runs),walBefore,'the refusal is not written to the WAL');
  const exported=await comm.export(people.O),records=exported.summary.identity;
  const unmatched=records.find(r=>r.event_type==='identity.unmatched');
  assert.equal(unmatched.source,'model-read');assert.match(unmatched.identity_prefix,/^[0-9a-f]{8}$/);
  assert.deepEqual(unmatched.meta_keys,keys,'only valid key names are kept');assert.equal(unmatched.participants,0);
  assert.deepEqual(records.filter(r=>r.event_type==='identity.observed').map(r=>[r.source,r.delivery_role]),
    [['panel-recover',null],['panel-bind','owner']]);
  assert.equal(records.find(r=>r.source==='panel-bind').panel_instance_id,people.O.panel_instance_id);
  assert.notEqual(records[0].identity_prefix,unmatched.identity_prefix,'different clients have different prefixes');
  assert.equal((await comm.export(people.E)).summary.identity,undefined,'only O receives identity records');
  const journal=await fs.readFile(file,'utf8');
  assert.match(journal,/"event":"identity\.unmatched"[^\n]*"source":"model-read"/);
  assert.doesNotMatch(journal+JSON.stringify(exported),/private-|secret/,'metadata values are never stored');
});

test('panel event memory keeps 1024 digests, accepts legacy signatures and still detects conflicts',async t=>{
  const {comm,O}=await fixture(t),base={event_type:'panel.mount',client_time:new Date().toISOString(),duration_ms:0};
  const first={...base,event_id:randomUUID(),client_sequence:1};
  await comm.telemetry({...O,event:first});
  assert.match(comm.runs.get(O.run_id).clientEvents[first.event_id],/^[0-9a-f]{64}$/);
  assert.equal((await comm.telemetry({...O,event:first})).duplicate,true);
  await assert.rejects(comm.telemetry({...O,event:{...first,event_type:'sdk.error'}}),error('CONFLICT'));
  // A 0.6.4 journal stored the signature text itself.
  const legacy={...base,event_id:randomUUID(),client_sequence:2};await comm.telemetry({...O,event:legacy});
  comm.runs.get(O.run_id).clientEvents[legacy.event_id]=JSON.stringify({panel_instance_id:O.panel_instance_id,event_id:legacy.event_id,
    event_type:legacy.event_type,client_sequence:2,client_time:legacy.client_time,duration_ms:0,duration_kind:'since-panel-mount'});
  assert.equal((await comm.telemetry({...O,event:legacy})).duplicate,true);
  for(let next=3;next<=1100;next+=16)await comm.telemetryBatch({...O,events:Array.from({length:Math.min(16,1101-next)},(_,i)=>
    ({...base,event_id:randomUUID(),client_sequence:next+i}))});
  const memory=comm.runs.get(O.run_id).clientEvents;
  assert.equal(Object.keys(memory).length,1024);assert.equal(memory[first.event_id],undefined);
  assert.ok(Object.values(memory).every(value=>/^[0-9a-f]{64}$/.test(value)));
  await assert.rejects(comm.telemetry({...O,event:first}),error('CONFLICT'));
});

test('diagnostic events stop before the event limit while working events continue',()=>{
  const context={makeId:randomUUID,now:Date.now,backendId:'backend'},event=PluginCommunication.prototype.event;
  const run={id:'limit',events:Array.from({length:15999},(_,i)=>({seq:i+1}))};
  assert.ok(event.call(context,run,'kit.timing'));assert.equal(run.events.length,16000);
  assert.equal(event.call(context,run,'kit.timing'),null);assert.equal(event.call(context,run,'rpc.completed',{component:'frontend'}),null);
  assert.equal(run.events.length,16000);
  assert.ok(event.call(context,run,'message.persisted'));assert.equal(run.events.length,16001);
  run.events.length=20000;
  assert.throws(()=>event.call(context,run,'message.persisted'),error('LIMIT'));
});

test('routine Kit timing is sampled while slow and failed calls are always kept',()=>{
  let now=0;const context={timings:[],timingDrops:0,kitSampled:new Map(),now:()=>now},record=PluginCommunication.prototype.recordKitTiming;
  const target={project_id:'p',scope_id:'s',assignment_id:'a'};
  for(let i=0;i<5;i++)record.call(context,target,{operation:'assignment:dialogue-status',elapsed_ms:20,ok:true});
  assert.equal(context.timings.length,1);
  record.call(context,{...target,assignment_id:'b'},{operation:'assignment:dialogue-status',elapsed_ms:20,ok:true});
  record.call(context,target,{operation:'assignment:dialogue-status',elapsed_ms:1500,ok:true});
  record.call(context,target,{operation:'assignment:dialogue-status',elapsed_ms:20,ok:false});
  assert.equal(context.timings.length,4);
  now=30000;record.call(context,target,{operation:'assignment:dialogue-status',elapsed_ms:20,ok:true});
  assert.equal(context.timings.length,5);assert.deepEqual(context.timings.map(t=>t.outcome),['ok','ok','ok','error','ok']);
});
