import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {AttestedCommunication} from './fixtures/panel-attestation.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const state={id:'store-test',members:{},messages:[],probes:{},clientEvents:{},clientSequences:{}};
const event=seq=>({run_id:state.id,seq,event_id:randomUUID(),event_type:'test'});
async function directory(t){const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-communication-')));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
const file=dir=>path.join(dir,hash(state.id)+'.jsonl');

test('communication WAL serializes fsynced transactions and recovers contiguous events with state',async t=>{
  const dir=await directory(t),store=await openCommunicationStore(dir);
  await Promise.all([store.append(state,[event(1)]),store.append({...state,stopped:true},[event(2),event(3)])]);
  const loaded=(await openCommunicationStore(dir)).load();
  assert.deepEqual(loaded.issues,[]);assert.equal(loaded.runs[0].stopped,true);
  assert.deepEqual(loaded.runs[0].events.map(e=>e.seq),[1,2,3]);
  const records=(await fs.readFile(file(dir),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(records[1].previous,records[0].checksum);
  if(process.platform!=='win32')assert.equal((await fs.stat(file(dir))).mode&0o777,0o600);
});

test('a partial tail preserves the acknowledged prefix and blocks all writes without truncation',async t=>{
  const dir=await directory(t),store=await openCommunicationStore(dir);await store.append(state,[event(1)]);
  await fs.appendFile(file(dir),'{"unfinished":');const before=await fs.readFile(file(dir),'utf8');
  const recovered=await openCommunicationStore(dir),loaded=recovered.load();
  assert.equal(loaded.issues[0].error_code,'PLUGIN_COMMUNICATION_STORE_TAIL');
  assert.equal(loaded.runs[0].events.length,1);
  await assert.rejects(recovered.append(state,[event(2)]),{code:'PLUGIN_COMMUNICATION_STORE_BLOCKED'});
  assert.equal(await fs.readFile(file(dir),'utf8'),before);
});

test('checksum corruption, sequence gaps and duplicate event IDs are detected even in a complete last line',async t=>{
  for(const kind of ['checksum','sequence','duplicate'])await t.test(kind,async t=>{
    const dir=await directory(t),store=await openCommunicationStore(dir),first=event(1);
    await store.append(state,[first]);await store.append(state,[event(2)]);
    const lines=(await fs.readFile(file(dir),'utf8')).trim().split('\n'),{checksum,...last}=JSON.parse(lines[1]);
    if(kind==='checksum')last.state.changed=true;
    if(kind==='sequence')last.seq=last.events[0].seq=5;
    if(kind==='duplicate')last.event_id=last.events[0].event_id=first.event_id;
    lines[1]=JSON.stringify({...last,checksum:kind==='checksum'?checksum:hash(JSON.stringify(last))});
    await fs.writeFile(file(dir),lines.join('\n')+'\n');
    const loaded=(await openCommunicationStore(dir)).load();
    assert.equal(loaded.issues[0].error_code,'PLUGIN_COMMUNICATION_STORE_CORRUPT');
    assert.equal(loaded.runs[0].events.length,1);
  });
});

test('fsync failure never acknowledges a mutation and blocks subsequent appends',async t=>{
  const dir=await directory(t);let failSync=false;
  const files={...fs,async open(...args){const handle=await fs.open(...args);return new Proxy(handle,{get(target,key){
    if(key==='sync')return async()=>{if(failSync)throw Object.assign(Error('disk token=private'),{code:'ENOSPC'});return target.sync();};
    const value=target[key];return typeof value==='function'?value.bind(target):value;
  }});}};
  const store=await openCommunicationStore(dir,{files});await store.append(state,[event(1)]);failSync=true;
  await assert.rejects(store.append(state,[event(2)]),e=>e.code==='PLUGIN_COMMUNICATION_STORE_WRITE'&&!e.message.includes('private'));
  assert.equal(store.load().runs[0].events.length,1);
  await assert.rejects(store.append(state,[event(2)]),{code:'PLUGIN_COMMUNICATION_STORE_BLOCKED'});
  // A full but unacknowledged write may survive; recovery treats it as uncertain state.
  assert.equal((await openCommunicationStore(dir)).load().runs[0].events.length,2);
});

test('symlink destinations and external edits cannot redirect or silently extend the journal',async t=>{
  const dir=await directory(t),outside=path.join(dir,'outside');await fs.mkdir(outside);
  const link=path.join(dir,'link');await fs.symlink(outside,link);
  await assert.rejects(openCommunicationStore(link),{code:'PLUGIN_COMMUNICATION_STORE_UNSAFE'});
  const store=await openCommunicationStore(dir);await store.append(state,[event(1)]);
  await fs.appendFile(file(dir),'unexpected');
  await assert.rejects(store.append(state,[event(2)]),{code:'PLUGIN_COMMUNICATION_STORE_WRITE'});
  assert.deepEqual(await fs.readdir(outside),[]);
});

test('an unsupported registry or WAL version blocks writes without rewriting the source',async t=>{
  const dir=await directory(t),store=await openCommunicationStore(dir);
  await assert.rejects(store.append({...state,registry_version:3},[event(1)]),{code:'PLUGIN_COMMUNICATION_STORE_VERSION'});
  await store.append(state,[event(1)]);
  const record=JSON.parse((await fs.readFile(file(dir),'utf8')).trim());delete record.checksum;record.schema_version=99;
  const text=JSON.stringify({...record,checksum:hash(JSON.stringify(record))})+'\n';await fs.writeFile(file(dir),text);
  const next=await openCommunicationStore(dir);
  assert.equal(next.load().issues[0].error_code,'PLUGIN_COMMUNICATION_STORE_VERSION');
  await assert.rejects(next.append(state,[event(1)]),{code:'PLUGIN_COMMUNICATION_STORE_BLOCKED'});
  assert.equal(await fs.readFile(file(dir),'utf8'),text);
});

test('workflow WAL persists O, E and S while rejecting unknown roles before changing the journal',async t=>{
  const dir=await directory(t),store=await openCommunicationStore(dir);
  const workflow={...state,registry_version:2,mode:'workflow',enrollments:{},members:Object.fromEntries(
    ['O','E','S'].map(role=>[role,{id:role,role,target:{role}}]))};
  await store.append(workflow,[event(1)]);
  const next=await openCommunicationStore(dir),loaded=next.load();
  assert.deepEqual(loaded.issues,[]);assert.deepEqual(loaded.runs[0].members,workflow.members);
  const before=await fs.readFile(file(dir),'utf8');
  await assert.rejects(next.append({...workflow,members:{X:{id:'X',role:'X',target:{role:'X'}}}},[event(2)]),{code:'PLUGIN_COMMUNICATION_STORE_VERSION'});
  assert.equal(await fs.readFile(file(dir),'utf8'),before);
  await next.append(workflow,[event(2)]);
  assert.equal((await openCommunicationStore(dir)).load().runs[0].events.length,2);
});

test('NET/UNKNOWN: lost SDK outcome survives durable restart, never reclaims or duplicates Send intent',async t=>{
  const dir=await directory(t),instances=[];
  const create=async()=>{
    const c=new AttestedCommunication({store:await openCommunicationStore(dir),waitMs:20});
    instances.push(c);await c.ready;return c;
  };
  t.after(async()=>{for(const c of instances){c.dispose();await c.tail;}});
  const c=await create(),participants={};
  for(const role of ['O','E']){
    const metadata={'openai/session':'isolated-net-'+role};
    const joined=await c.join({run_id:'net-interruption',role,metadata});
    participants[role]={...joined,metadata,panel_instance_id:randomUUID(),frame_instance_id:randomUUID(),
      protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
    await c.bind(participants[role]);
  }
  const {O,E}=participants;
  E.permission_generation=(await c.enable({...E,message_supported:true})).permission_generation;
  const args={...O,recipient_id:E.participant_id,kind:'question',body:'Isolated network boundary',idempotency_key:'net-1'};
  const message=await c.send(args);
  assert.equal((await c.status(E)).messages.find(m=>m.message_id===message.message_id).delivery,'pending',
    'persisted intent is not SDK acceptance');
  const claim=await c.claim({...E,message_id:message.message_id});
  await c.verify({...E,...claim});
  // Deliberately omit report(accepted/rejected): simulate a disconnect after
  // SDK invocation but before its receipt reaches Control. No network change.
  c.dispose();await c.tail;
  const recovered=await create();
  const state=await recovered.status(E),uncertain=state.messages.find(m=>m.message_id===message.message_id);
  assert.equal(uncertain.delivery,'unknown');
  assert.equal(uncertain.read,false);
  assert.equal((await recovered.journal(E)).events.filter(e=>e.event_type==='send.intent').length,1);
  await assert.rejects(recovered.claim({...E,message_id:message.message_id}),
    {code:'PLUGIN_COMMUNICATION_BINDING'},'a restored backend has no remembered physical SDK panel');
  await recovered.bind(E);
  E.permission_generation=(await recovered.enable({...E,message_supported:true})).permission_generation;
  await assert.rejects(recovered.claim({...E,message_id:message.message_id}),
    {code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
  await assert.rejects(recovered.verify({...E,...claim}),
    {code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
  const repeat=await recovered.send(args);
  assert.equal(repeat.message_id,message.message_id,'retry with same idempotency key reuses saved message');
  assert.equal((await recovered.status(E)).messages.filter(m=>m.message_id===message.message_id).length,1);
  const events=(await recovered.journal(E)).events;
  assert.equal(events.filter(e=>e.event_type==='send.intent').length,1,'a lost receipt cannot cause another SDK Send');
  assert.equal(recovered.critical,null);
});
