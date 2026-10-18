import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';

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
