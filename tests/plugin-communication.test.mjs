import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';

async function fixture(t,options={}){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-communication-control-')));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const store=await openCommunicationStore(directory),comm=new PluginCommunication({store,waitMs:30,...options});
  t.after(()=>comm.dispose());
  const people={};
  for(const role of ['O','E']){
    const metadata={'openai/session':'secret-session-'+role,'openai/subject':'secret-subject'};
    const joined=await comm.join({run_id:'exchange',role,metadata});
    people[role]={run_id:joined.run_id,participant_id:joined.participant_id,metadata,
      panel_instance_id:randomUUID(),protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
    await comm.bind(people[role]);
  }
  return {comm,store,directory,...people};
}
async function enable(comm,input){input.permission_generation=(await comm.enable({...input,message_supported:true})).permission_generation;return input;}
const send=(comm,a,b,extra={})=>comm.send({...a,recipient_id:b.participant_id,kind:'question',body:'What is 2 + 2?',idempotency_key:'question-1',...extra});
const error=code=>({code:'PLUGIN_COMMUNICATION_'+code});

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
  await enable(comm,second);now+=600001;
  await assert.rejects(comm.verify({...second,...ticket}),error('STOPPED'));
  await assert.rejects(comm.probe({...second,delay_ms:25}),error('STOPPED'));
  assert.equal((await comm.status(E)).messages[0].delivery,'claimed');
});

test('restart persists Stop/read/outcomes, requires rebind and never replays a scheduled probe or uncertain attempt',async t=>{
  const {comm,O,E,directory}=await fixture(t);await enable(comm,E);await enable(comm,O);
  const q=await send(comm,O,E),ticket=await comm.claim({...E,...q});await comm.verify({...E,...ticket});await comm.read({...E,...q});
  await comm.probe({...O,delay_ms:60000});comm.dispose();await comm.tail;
  const next=new PluginCommunication({store:await openCommunicationStore(directory)});t.after(()=>next.dispose());await next.ready;
  const state=await next.status(E);assert.equal(state.stopped,true);assert.equal(state.messages[0].delivery,'unknown');assert.equal(state.messages[0].read,true);
  await assert.rejects(next.claim({...E,...q}),error('BINDING'));
  const fresh={...E,panel_instance_id:randomUUID()};await next.bind(fresh);
  await assert.rejects(next.claim({...fresh,...q}),error('STOPPED'));await enable(next,fresh);
  await assert.rejects(next.claim({...fresh,...q}),error('CLAIM_DENIED'));
  assert.deepEqual(next.runs.get(O.run_id).probes,{});
  assert.ok((await next.journal(O)).events.some(e=>e.event_type==='backend.restart'));
  await next.stop(fresh);next.dispose();await next.tail;
  const third=new PluginCommunication({store:await openCommunicationStore(directory)});t.after(()=>third.dispose());
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
  assert.equal((await comm.status(model)).expires_at,now+600000);
  for(const action of ['stop','enable']){
    await comm.probe({...O,delay_ms:25});await delay(60);
    const probe=(await comm.status(O)).messages.at(-1);assert.equal(probe.delivery,'pending');
    if(action==='stop'){await comm.stop(O);await enable(comm,O);}else await enable(comm,O);
    assert.equal((await comm.status(O)).messages.at(-1).delivery,'rejected');
    await assert.rejects(comm.claim({...O,message_id:probe.message_id}),error('CLAIM_DENIED'));
  }
  now+=600001;assert.equal((await comm.status(model)).stopped,true);
  await assert.rejects(comm.probe({...O,delay_ms:25}),error('STOPPED'));
  assert.equal((await comm.journal(O)).events.filter(e=>e.event_type==='permission.expired').length,1);
  await enable(comm,O);assert.equal((await comm.status(model)).stopped,false);
});

test('a failed message append is not acknowledged or visible after restart',async t=>{
  const {comm,O,E,store,directory}=await fixture(t);
  comm.store={load:store.load,append:async()=>{throw Error('private disk details');}};
  await assert.rejects(send(comm,O,E),error('STORE_WRITE'));
  assert.deepEqual((await comm.status(E)).messages,[]);comm.dispose();
  const next=new PluginCommunication({store:await openCommunicationStore(directory)});t.after(()=>next.dispose());
  assert.deepEqual((await next.status(E)).messages,[]);
});
