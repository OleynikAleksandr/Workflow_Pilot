import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
import {FRESH_DOCUMENT_MS} from '../src/control/plugin/conversation-freshness.mjs';

const meta=id=>({'openai/session':id});
// One backend page per participant. A reload creates a new document and the
// panel of the new document binds again, as the real page remounts its widget.
async function fixture(t,{reloadResult=null,dialogueKit=null}={}){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'conversation-freshness-')));
  const targets=new Map(),pages=new Map(),reloads=[],instances=[];let now=1000000,documents=0;
  const page=id=>pages.get(id);
  const create=async()=>{const c=new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,waitMs:5,
    resolveTarget:id=>targets.get(id),verifyTarget:async id=>targets.get(id),observe:target=>page(target.local_session_id),
    reconcile:async target=>{const p=page(target.local_session_id);p.observationSeq++;return structuredClone(p);},admit:async()=>true,
    attest:async target=>({documentId:page(target.local_session_id).documentId,incarnation:'i',stale:false,
      frames:[{frame_instance_id:page(target.local_session_id).frame}]}),
    dialogueKit,reload:async target=>{reloads.push({target:target.local_session_id,at:now,from:page(target.local_session_id).documentId});
      if(reloadResult)return reloadResult;
      const p=page(target.local_session_id),from=p.documentId;
      Object.assign(p,{documentId:'doc-'+(++documents),documentSince:now,frame:randomUUID(),
        reloadedFrom:{documentId:from,reason:'control',lineage:[...(p.reloadedFrom?.lineage??[]),from]}});
      return {reloaded:true};}});
    instances.push(c);await c.ready;return c;};
  const c=await create();
  const target=(id,role)=>{const value={project_id:'p',scope_id:'s',local_session_id:id,origin_session_id:'o',role,
    assignment_id:role==='E'?'a-'+id:null,task_id:role==='E'?'t-'+id:null,dialogue_version:1};targets.set(id,value);
    pages.set(id,{sdkDocumentReady:true,canSend:true,stopped:true,busy:false,commandsIdle:true,observationSeq:1,
      documentId:'doc-'+(++documents),documentSince:now,frame:randomUUID(),turnId:'a0',userTurnId:'u0',assistantRevision:1,
      userMessagesRevision:1,lastMessageRole:'assistant',turnIdentitySource:'native',manualInputRevision:0,draftPresent:false});return value;};
  const o=target('o','O');
  const bind=async id=>{const t=targets.get(id),invite=await c.reserve(t),member=await c.enroll(invite.enrollment_ticket,meta(id));
    return rebind(member,id);};
  const rebind=async(member,id)=>{const input={...member,metadata:meta(id),panel_instance_id:randomUUID(),frame_instance_id:page(id).frame,
    build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL};
    await c.bind({...input,message_supported:true});
    return {...input,permission_generation:(await c.sync({...input,message_supported:true})).permission_generation};};
  t.after(async()=>{for(const x of instances){x.dispose();await x.tail;}await fs.rm(directory,{recursive:true,force:true});});
  return {c,o,target,targets,pages,page,reloads,bind,rebind,advance:ms=>now+=ms,get now(){return now;}};
}
const queue=(c,o,key)=>c.workflow.enqueue(o,{key,kind:'continue',text:'Сообщение '+key});
const run=(f,b)=>f.c.runs.get(b.run_id);
const attempts=(f,b)=>run(f,b).messages.flatMap(m=>m.notification_attempts??[]).length;
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));

test('a stale document defers the claim without an attempt, reloads the chat once and then delivers',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);let b=await f.bind('o');
  f.advance(FRESH_DOCUMENT_MS+1);
  const first=await queue(f.c,f.o,'one');
  const deferred=await f.c.claimReady({...b,message_id:first.message_id});
  assert.deepEqual({deferred:deferred.deferred,reason:deferred.reason},{deferred:true,reason:'freshness-reload'});
  assert.equal(attempts(f,b),0,'no attempt and no budget');await tick();
  assert.equal(f.reloads.length,1);assert.equal(f.page('o').documentId,'doc-2');
  assert.ok(run(f,b).events.some(e=>e.event_type==='freshness.reload'));
  // The new document mounts its panel later than the freshness window: its first claim still delivers.
  f.advance(FRESH_DOCUMENT_MS+5000);
  b=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'o');
  const ticket=await f.c.claimReady({...b,message_id:first.message_id});
  assert.ok(ticket.delivery_attempt_id,'first claim after a Control reload');
  await f.c.report({...b,...ticket,outcome:'accepted'});assert.equal(f.reloads.length,1,'no reload loop');
  // Idle longer than the window without a turn: the next claim needs a fresh document again.
  await f.c.readMessage({metadata:meta('o'),message_id:first.message_id});
  f.advance(FRESH_DOCUMENT_MS+1);
  const second=await queue(f.c,f.o,'two');
  assert.equal((await f.c.claimReady({...b,message_id:second.message_id})).reason,'freshness-reload');
});

test('a busy or recently observed document delivers at once; q never appears and accepted lets the next one go',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);let b=await f.bind('o');
  const first=await queue(f.c,f.o,'one');
  const ticket=await f.c.claimReady({...b,message_id:first.message_id});assert.ok(ticket.delivery_attempt_id);
  await f.c.report({...b,...ticket,outcome:'accepted'});
  // Accepted lets the next pending go at once in the same fresh document.
  const next=await queue(f.c,f.o,'next');
  const following=await f.c.claimReady({...b,message_id:next.message_id});assert.ok(following.delivery_attempt_id);
  await f.c.report({...b,...following,outcome:'accepted'});
  f.advance(FRESH_DOCUMENT_MS*2);f.page('o').busy=true;b=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'o');
  const second=await queue(f.c,f.o,'two');
  assert.ok((await f.c.claimReady({...b,message_id:second.message_id})).delivery_attempt_id,'busy shows the current turn');
  assert.equal(f.reloads.length,0);
});

test('reload is refused for a draft, a running SDK call, recent manual input and an open turn baseline',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);const b=await f.bind('o');
  f.advance(FRESH_DOCUMENT_MS+1);f.page('o').draftPresent=true;
  const first=await queue(f.c,f.o,'one');
  assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-conflict-draft');
  f.page('o').draftPresent=false;f.page('o').manualInputRevision=1;f.advance(1500);
  assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-reload-deferred');
  await tick();assert.equal(f.reloads.length,0,'the draft and manual input are never discarded');
  assert.equal(attempts(f,b),0);
});

test('an unconfirmed handled turn without native identities forbids reload with a neutral reason',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);let b=await f.bind('o');f.page('o').turnIdentitySource='cycle';
  const first=await queue(f.c,f.o,'one');
  const ticket=await f.c.claimReady({...b,message_id:first.message_id});await f.c.report({...b,...ticket,outcome:'accepted'});
  const message=run(f,b).messages.find(m=>m.message_id===first.message_id);
  message.read=true;message.yielded={reason:'handled',at:f.now,backend_id:f.c.backendId,page:structuredClone(f.page('o'))};
  f.advance(FRESH_DOCUMENT_MS+1);b=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'o');
  const second=await queue(f.c,f.o,'two');
  assert.equal((await f.c.claimReady({...b,message_id:second.message_id})).reason,'awaiting-turn-end');
  await tick();assert.equal(f.reloads.length,0);
});

test('three reloads without a successful claim end with an orange reason, not a loop',async t=>{
  // The page accepts the reload, but the document never changes.
  const f=await fixture(t,{reloadResult:{reloaded:true}});await f.c.workflow.grant(f.o);let b=await f.bind('o');
  const first=await queue(f.c,f.o,'one');
  for(let i=0;i<3;i++){
    f.advance(FRESH_DOCUMENT_MS+1);b=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'o');
    assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-reload');await tick();
    assert.equal(f.reloads.length,i+1);
    // No second reload within the same freshness window.
    f.advance(1500);assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-reload');
    await tick();assert.equal(f.reloads.length,i+1);
  }
  f.advance(FRESH_DOCUMENT_MS+1);b=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'o');
  assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-unavailable');
  await tick();assert.equal(f.reloads.length,3);assert.equal(attempts(f,b),0);
  // Manual input in the window resets the counter.
  f.page('o').manualInputRevision++;
  assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-reload-deferred','typing defers a reload');
  f.advance(11000);b=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'o');
  assert.equal((await f.c.claimReady({...b,message_id:first.message_id})).reason,'freshness-reload');
});

// O sends a task to E through the real dialogue; E's backend page reloads.
function dialogueKitFixture(){
  const effects=new Map(),states=new Map();
  return {status:async(_target,id)=>({dialogue_version:1,contract_digest:'fixture-contract',dialogue:states.get(id)??{attempt:1}}),
    apply:async(target,input)=>{if(effects.has(input.operation_id))return {...effects.get(input.operation_id),duplicate:true};
      const receipt={ok:true,operation_id:input.operation_id,message_id:input.message_id,assignment_id:input.assignment_id,
        task_id:'t-'+input.assignment_id.slice(2),attempt:input.attempt,kind:input.kind};
      effects.set(input.operation_id,receipt);states.set(input.assignment_id,{attempt:input.attempt,grant:input.kind==='task'?{message_id:input.message_id}:null});
      return receipt;}};
}
async function handledTask(t,{native=true}={}){
  const f=await fixture(t,{dialogueKit:dialogueKitFixture()});await f.c.workflow.grant(f.o);
  const e=f.target('e','E');f.page('e').turnIdentitySource=native?'native':'cycle';
  await f.bind('o');const b=await f.bind('e');
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const sent=await f.c.assignmentSend({metadata:meta('o'),recipient,kind:'task',attempt:1,body:'Задача',idempotency_key:'task-one'});
  const ticket=await f.c.claimReady({...b,message_id:sent.message_id});await f.c.report({...b,...ticket,outcome:'accepted'});
  await f.c.readMessage({metadata:meta('e'),message_id:sent.message_id});
  await f.c.assignmentYield({metadata:meta('e'),message_ids:[sent.message_id],reason:'handled'});
  const message=()=>run(f,b).messages.find(m=>m.message_id===sent.message_id);
  const observe=async()=>{await f.c.mutate('observed',{run_id:b.run_id,message_id:sent.message_id});};
  return {f,b,e,sent,message,observe};
}
const reloadPage=(f,id,{reason='control',busy=false,lastMessageRole='assistant'}={})=>{
  const p=f.page(id),from=p.documentId;
  Object.assign(p,{documentId:from+'-r',documentSince:f.now,frame:randomUUID(),busy,stopped:!busy&&lastMessageRole==='assistant',
    canSend:!busy&&lastMessageRole==='assistant',lastMessageRole,turnId:'b1',assistantRevision:1,
    reloadedFrom:{documentId:from,reason,lineage:[...(p.reloadedFrom?.lineage??[]),from]}});
};

test('a turn handled on another client is confirmed on the reloaded document after two idle observations',async t=>{
  const {f,b,e,message,observe}=await handledTask(t);
  await observe();assert.equal(f.reloads.length,0,'within 15 s after yield the page may still show the turn');
  f.advance(15001);await observe();await tick();
  assert.equal(f.reloads.length,1,'yield without busy or new assistant text means another client');
  assert.equal(f.reloads[0].target,'e');
  reloadPage(f,'e');
  await observe();assert.equal(message().reply_observed,false,'one observation is not enough');
  f.advance(1000);await observe();assert.equal(message().reply_observed,false,'two observations less than 2 s apart');
  f.advance(1500);await observe();
  assert.equal(message().reply_observed,true);
  assert.ok(run(f,b).events.some(event=>event.event_type==='freshness.rebased'&&event.message_id===message().message_id));
  // The next step reaches the new document without user action.
  const next=await f.c.workflow.enqueue(e,{key:'next-step',kind:'continue',text:'Следующий шаг'});
  const current=await f.rebind({run_id:b.run_id,participant_id:b.participant_id},'e');
  assert.ok((await f.c.claimReady({...current,message_id:next.message_id})).delivery_attempt_id);
});

test('a reload during a still running foreign turn repeats with growing intervals until the end is visible',async t=>{
  const {f,message,observe}=await handledTask(t);
  f.advance(15001);await observe();await tick();assert.equal(f.reloads.length,1);
  reloadPage(f,'e',{busy:true});
  await observe();f.advance(5000);await observe();await tick();
  assert.equal(f.reloads.length,1,'the next reload waits 20 s');
  f.advance(15001);await observe();await tick();assert.equal(f.reloads.length,2);
  reloadPage(f,'e',{lastMessageRole:'user'});
  f.advance(20000);await observe();await tick();assert.equal(f.reloads.length,2,'then 40 s');
  f.advance(20001);await observe();await tick();assert.equal(f.reloads.length,3);
  reloadPage(f,'e');
  await observe();f.advance(2500);await observe();
  assert.equal(message().reply_observed,true,'transfer across the whole chain of own reloads');
});

test('renderer recovery transfers the confirmation; without native identities nothing moves and reload is refused',async t=>{
  const recovered=await handledTask(t);
  reloadPage(recovered.f,'e',{reason:'recovery'});
  await recovered.observe();recovered.f.advance(2500);await recovered.observe();
  assert.equal(recovered.message().reply_observed,true);
  const cycle=await handledTask(t,{native:false});
  cycle.f.advance(15001);await cycle.observe();await tick();
  assert.equal(cycle.f.reloads.length,0,'no transfer is possible, so no reload');
  const next=await cycle.f.c.workflow.enqueue(cycle.e,{key:'next',kind:'continue',text:'Дальше'});
  cycle.f.advance(FRESH_DOCUMENT_MS+1);const b=await cycle.f.rebind({run_id:cycle.b.run_id,participant_id:cycle.b.participant_id},'e');
  assert.equal((await cycle.f.c.claimReady({...b,message_id:next.message_id})).reason,'awaiting-turn-end');
  // Any other document change is not a reload of this page.
  const other=await handledTask(t);const p=other.f.page('e');p.documentId='unrelated-document';
  await other.observe();other.f.advance(2500);await other.observe();
  assert.equal(other.message().reply_observed,false);
});
