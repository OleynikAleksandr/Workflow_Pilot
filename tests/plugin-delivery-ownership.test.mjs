import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';

const meta=id=>({'openai/session':id});
const OBSERVER='PLUGIN_COMMUNICATION_DELIVERY_OBSERVER';
// The backend page of each participant hosts only the frames listed in `hosted`.
async function fixture(t){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'delivery-ownership-')));
  const targets=new Map(),pages=new Map(),hosted=new Map(),instances=[];let now=100000,attestCalls=0;
  const create=async()=>{const c=new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,waitMs:5,
    resolveTarget:id=>targets.get(id),verifyTarget:async id=>targets.get(id),observe:target=>pages.get(target.local_session_id),
    reconcile:async target=>structuredClone(pages.get(target.local_session_id)),admit:async()=>true,
    attest:async target=>{attestCalls++;const page=pages.get(target.local_session_id);
      return {browserSessionId:target.local_session_id,incarnation:page.incarnation,documentId:page.documentId,stale:false,
        frames:[...(hosted.get(target.local_session_id)??[])].map(frame_instance_id=>({frame_instance_id}))};}});
    instances.push(c);await c.ready;return c;};
  const c=await create();
  const target=(id,role='E')=>{const value={project_id:'p',scope_id:'s',local_session_id:id,origin_session_id:'o',role,
    assignment_id:role==='E'?'a-'+id:null,task_id:role==='E'?'t-'+id:null};targets.set(id,value);
    pages.set(id,{sdkDocumentReady:true,canSend:true,stopped:true,busy:false,commandsIdle:true,sdkCommands:[],observationSeq:1,
      documentId:'doc-'+id+'-1',incarnation:'incarnation-1',turnId:'a0',userTurnId:'u0',assistantRevision:1,userMessagesRevision:1});return value;};
  const o=target('o','O');
  let member;
  // A panel mounted in a frame; `inPage` hosts that frame in the backend page.
  const panel=async(comm,{frame=randomUUID(),inPage=false}={})=>{
    if(inPage)hosted.set('o',new Set([...(hosted.get('o')??[]),frame]));
    if(!member){const invite=await comm.reserve(o);member=await comm.enroll(invite.enrollment_ticket,meta('o'));}
    const input={...member,metadata:meta('o'),panel_instance_id:randomUUID(),frame_instance_id:frame,build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL};
    const bound=await comm.bind({...input,message_supported:true});
    const synced=await comm.sync({...input,message_supported:true});
    return {...input,permission_generation:synced.permission_generation,bound,synced};
  };
  t.after(async()=>{for(const comm of instances){comm.dispose();await comm.tail;}await fs.rm(directory,{recursive:true,force:true});});
  return {get c(){return instances.at(-1);},o,pages,hosted,panel,create,advance:ms=>now+=ms,get attestCalls(){return attestCalls;}};
}
const pending=(c,b)=>c.waitResult({...b,after_seq:c.runs.get(b.run_id).events.length}).message_id;
const attempts=(c,b)=>c.runs.get(b.run_id).messages.flatMap(m=>m.notification_attempts??[]).length;
const queue=(c,o,key='start')=>c.workflow.enqueue(o,{key,kind:'assignment-start',text:'Начни задачу'});

test('only the attested backend panel delivers; another client of the same identity observes without attempts',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);
  const observer=await f.panel(f.c),owner=await f.panel(f.c,{inPage:true});
  assert.equal(observer.synced.delivery_role,'observer');assert.equal(owner.synced.delivery_role,'owner');
  assert.equal(owner.synced.delivery_owner_generation,1);
  const message=await queue(f.c,f.o),run=()=>f.c.runs.get(owner.run_id);
  assert.equal(pending(f.c,observer),null,'an observer never receives a message to deliver');
  assert.equal(pending(f.c,owner),message.message_id);
  const events=run().events.length;
  for(const operation of ['claim','claimReady'])
    await assert.rejects(f.c[operation]({...observer,message_id:message.message_id}),{code:OBSERVER});
  await assert.rejects(f.c.verify({...observer,message_id:message.message_id,delivery_attempt_id:randomUUID()}),{code:OBSERVER});
  assert.equal(attempts(f.c,owner),0,'no attempt and no budget spent');assert.equal(run().messages[0].delivery,'pending');
  assert.equal(run().events.length,events,'an observer refusal is not a journal incident');
  // An observer cannot open or confirm a notification recovery incident.
  const recovery=await f.c.sync({...observer,message_supported:true,recover_notifications:true});
  assert.equal(recovery.notification_recovery_id,undefined);assert.equal(run().members[owner.participant_id].notification_connection,undefined);
  const ticket=await f.c.claimReady({...owner,message_id:message.message_id});
  await f.c.report({...owner,...ticket,outcome:'accepted'});
  assert.equal(run().messages[0].delivery,'accepted');assert.equal(attempts(f.c,owner),1);
  assert.equal((await f.c.status({run_id:owner.run_id,participant_id:owner.participant_id,metadata:meta('o')})).channel_ready,true);
});

test('owner generation changes on a new frame or document only, affects new claims and never turns an in-flight attempt UNKNOWN',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);
  const frame=randomUUID(),first=await f.panel(f.c,{frame,inPage:true});
  assert.equal(first.synced.delivery_owner_generation,1);
  // A repeated recover in the same frame is a new panel instance of the same owner.
  const recovered=await f.panel(f.c,{frame});
  assert.equal(recovered.synced.delivery_role,'owner');assert.equal(recovered.synced.delivery_owner_generation,1);
  assert.equal((await f.c.sync({...first,message_supported:true})).delivery_role,'observer','the older instance yields');
  const message=await queue(f.c,f.o),ticket=await f.c.claimReady({...recovered,message_id:message.message_id});
  // The host remounts the widget while the SDK call is in flight: a new frame owns new claims.
  const remounted=await f.panel(f.c,{inPage:true});
  assert.equal(remounted.synced.delivery_role,'owner');assert.equal(remounted.synced.delivery_owner_generation,2);
  const reported=await f.c.report({...recovered,...ticket,outcome:'accepted'});
  assert.equal(reported.delivery,'accepted');
  const run=f.c.runs.get(recovered.run_id);
  assert.equal(run.messages[0].delivery,'accepted');assert.equal(run.events.some(e=>e.event_type==='send.unknown'),false);
  // A reload creates another document: the stored attestation no longer counts.
  f.pages.get('o').documentId='doc-o-2';
  const reloaded=await f.c.sync({...remounted,message_supported:true});
  assert.equal(reloaded.delivery_role,'owner','attestation repeated for the current document');
  assert.equal(reloaded.delivery_owner_generation,3);
});

test('without an attested owner delivery waits neutrally; Stop and the choice remain available to an observer',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);
  const observer=await f.panel(f.c),message=await queue(f.c,f.o);
  assert.equal(observer.synced.delivery_role,'observer');assert.equal(observer.synced.channel_ready,false);
  assert.equal(pending(f.c,observer),null);
  const run=f.c.runs.get(observer.run_id);
  assert.equal(run.messages[0].delivery,'pending');assert.ok(!run.messages[0].read);
  assert.equal(run.events.some(e=>/unknown|denied/.test(e.event_type)),false,'not a refusal and not UNKNOWN');
  assert.equal(f.c.workflow.progress('o').incoming.reason,'owner-unavailable','the view names the missing owner neutrally');
  const stopped=await f.c.stop({...observer,scope:'participant'});
  assert.equal(stopped.stopped,true,'explicit Stop of the plan from any client');
  assert.equal(message.delivery,'pending');
});

test('restart discards in-memory panels: no owner until the backend page binds and is attested again',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);
  const frame=randomUUID();await f.panel(f.c,{frame,inPage:true});
  f.c.dispose();await f.c.tail;await f.create();await f.c.workflow.grant(f.o);
  const observer=await f.panel(f.c);
  assert.equal(observer.synced.delivery_role,'observer');
  const owner=await f.panel(f.c,{frame});
  assert.equal(owner.synced.delivery_role,'owner');assert.ok(f.attestCalls>0);
});
