import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
import {openCommunicationStore as openReleasedStore} from './fixtures/released-communication-0.5.41/communication-store.mjs';

const meta=id=>({'openai/session':id});
const RELEASED={build_id:'0.5.41-communication-8',protocol_version:8};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// One O participant whose backend page hosts the listed panel frames.
async function fixture(t,directory){
  const targets=new Map(),pages=new Map(),hosted=new Set(),instances=[],reloads=[];let now=1_000_000;
  const create=async()=>{const c=new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,waitMs:5,
    resolveTarget:id=>targets.get(id),verifyTarget:async id=>targets.get(id),observe:target=>pages.get(target.local_session_id),
    reconcile:async target=>structuredClone(pages.get(target.local_session_id)),admit:async()=>true,
    attest:async target=>{const page=pages.get(target.local_session_id);
      return {browserSessionId:target.local_session_id,incarnation:page.incarnation,documentId:page.documentId,stale:false,
        frames:[...hosted].map(frame_instance_id=>({frame_instance_id}))};},
    reload:async target=>{reloads.push(target.local_session_id);const page=pages.get(target.local_session_id);
      Object.assign(page,{documentId:'doc-'+(reloads.length+1),documentSince:now,observationSeq:page.observationSeq+1});return {reloaded:true};}});
    instances.push(c);await c.ready;return c;};
  const o={project_id:'p',scope_id:'s',local_session_id:'o',origin_session_id:'o',role:'O',assignment_id:null,task_id:null};
  targets.set('o',o);
  pages.set('o',{sdkDocumentReady:true,canSend:true,stopped:true,busy:false,commandsIdle:true,sdkCommands:[],observationSeq:1,
    documentId:'doc-1',documentSince:now-60_000,incarnation:'incarnation-1',turnId:'a0',userTurnId:'u0',assistantRevision:1,userMessagesRevision:1});
  let member;
  const panel=async(comm,versions={build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL})=>{
    const frame=randomUUID();hosted.add(frame);
    if(!member){const invite=await comm.reserve(o);member=await comm.enroll(invite.enrollment_ticket,meta('o'));}
    const input={...member,metadata:meta('o'),panel_instance_id:randomUUID(),frame_instance_id:frame,...versions};
    await comm.bind({...input,message_supported:true});
    const synced=await comm.sync({...input,message_supported:true});
    return {...input,permission_generation:synced.permission_generation,synced};
  };
  t.after(async()=>{for(const comm of instances){comm.dispose();await comm.tail;}});
  await create();
  return {get c(){return instances.at(-1);},o,pages,panel,create,reloads,advance:ms=>now+=ms};
}
const queue=(c,o,key)=>c.workflow.enqueue(o,{key,kind:'assignment-start',text:'Начни задачу '+key});

test('a 0.6.0 journal with owner, freshness, branch and identity facts is read and recovered by the released 0.5.41 store',async t=>{
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'shared-conversation-compat-')));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const f=await fixture(t,directory);await f.c.workflow.grant(f.o);
  const owner=await f.panel(f.c);assert.equal(owner.synced.delivery_role,'owner');
  // The stale server page is reloaded first; the claim waits without an attempt.
  const first=await queue(f.c,f.o,'first');
  assert.deepEqual(await f.c.claim({...owner,message_id:first.message_id}),{deferred:true,reason:'freshness-reload'});
  await tick();assert.deepEqual(f.reloads,['o']);
  await f.c.sync({...owner,message_supported:true});
  const ticket=await f.c.claimReady({...owner,message_id:first.message_id});
  await f.c.report({...owner,...ticket,outcome:'unknown'});
  const second=await queue(f.c,f.o,'second');
  // Facts of later 0.6.0 stages (branch, rebase, identity) are appended by the same store.
  const live=f.c.runs.get(owner.run_id),{events,...state}=structuredClone(live);
  state.members[owner.participant_id].branch_conflict={user_turn_id:'u7',raised_at:new Date(0).toISOString()};
  state.messages.find(m=>m.message_id===second.message_id).claim_wait_reason='freshness-conflict-branch';
  const extra=['freshness.rebased','freshness.branch','freshness.variant_unknown','delivery.owner','identity.unmatched'].map((event_type,i)=>({
    schema_version:1,event_id:randomUUID(),seq:events.length+i+1,run_id:live.id,component:'control',event_type,severity:'info',
    server_time:new Date(0).toISOString(),backend_instance_id:'backend',message_id:first.message_id}));
  await f.c.store.append(state,extra);
  f.c.dispose();await f.c.tail;

  // Rollback: the released store opens the same directory without refusal.
  const released=await openReleasedStore(directory),loaded=released.load();
  assert.deepEqual(loaded.issues,[]);assert.equal(loaded.runs.length,1);
  const run=loaded.runs[0];
  assert.deepEqual(run.messages.map(m=>[m.message_id,m.delivery]),[[first.message_id,'unknown'],[second.message_id,'pending']],'messages and UNKNOWN survive');
  assert.equal(run.events.length,events.length+extra.length);
  for(const type of ['claim.deferred','freshness.rebased','freshness.branch','identity.unmatched'])
    assert.ok(run.events.some(e=>e.event_type===type),type+' is kept');
  assert.equal(run.events.find(e=>e.event_type==='claim.deferred').reason,'freshness-reload');
  // 0.5.41 keeps working on the same journal; new optional fields are carried as data.
  const {events:old,...after}=run;after.messages[1].read=true;
  await released.append(after,[{...old.at(-1),event_id:randomUUID(),seq:old.length+1,event_type:'message.read',message_id:second.message_id}]);

  // Forward again: 0.6.0 restores what 0.5.41 wrote, UNKNOWN stays without a repeat.
  const again=await f.create(),restored=again.runs.get(owner.run_id);
  assert.equal(again.critical,null);
  assert.equal(restored.messages[0].delivery,'unknown');assert.equal(restored.messages[1].read,true);
  assert.equal(restored.members[owner.participant_id].role,'O');
});

test('protocol 9 transition and rollback: an old panel is refused, the renewed panel owns delivery after Continue, history stays',async t=>{
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'shared-conversation-migrate-')));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const f=await fixture(t,directory);await f.c.workflow.grant(f.o);
  const owner=await f.panel(f.c),message=await queue(f.c,f.o,'kept');
  // Pause before installation; nothing is sent while the plan is paused.
  await f.c.workflow.grant(f.o,'paused');
  f.c.dispose();await f.c.tail;
  // 0.6.0 is installed: the iframe of the old connector snapshot is refused with an instruction.
  const upgraded=await f.create();
  await assert.rejects(f.panel(upgraded,RELEASED),error=>error.code==='PLUGIN_COMMUNICATION_VERSION'
    &&/протокол 8/.test(error.message)&&/workflow_pilot_panel/.test(error.message));
  // After the connector update the model calls workflow_pilot_panel again and the user presses Continue.
  const renewed=await f.panel(upgraded);
  assert.equal(renewed.synced.delivery_role,'owner');
  await upgraded.workflow.grant(f.o,'running');f.advance(1);
  const pending=upgraded.waitResult({...renewed,permission_generation:(await upgraded.sync({...renewed,message_supported:true})).permission_generation,
    after_seq:upgraded.runs.get(renewed.run_id).events.length});
  assert.equal((await pending).message_id,message.message_id,'the saved message is delivered after Continue, not duplicated');
  assert.equal(upgraded.runs.get(renewed.run_id).messages.length,1);
  // Rollback: pause, stop the service, the released store reads the journal written by 0.6.0.
  await upgraded.workflow.grant(f.o,'paused');upgraded.dispose();await upgraded.tail;
  const released=(await openReleasedStore(directory)).load();
  assert.deepEqual(released.issues,[]);
  assert.deepEqual(released.runs[0].messages.map(m=>m.message_id),[message.message_id]);
  assert.equal(owner.run_id,renewed.run_id,'the same run and participant continue in both directions');
});
