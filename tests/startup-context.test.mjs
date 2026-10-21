import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
import {DialogueDelivery} from '../src/control/workflow/dialogue-delivery.mjs';
import {startupView} from '../src/contracts/startup-view.mjs';
import {PluginProjects} from '../src/control/plugin/service.mjs';
import {localParticipantTarget} from '../src/control/plugin/enrollment.mjs';
const metadata={'openai/session':'startup-fixture','openai/subject':'local-test'};
const target={project_id:'p',local_session_id:'o',origin_session_id:'o',role:'O',scope_id:null,assignment_id:null,task_id:null};
test('ordinary chats receive complete panel recovery for every plan strategy without acquiring a grant',async t=>{
  for(const strategy of ['sequential','parallel','orchestrated'])for(const status of ['NONE','ACTIVE','BLOCKED']){
    const session={sessionId:'chat',role:status==='NONE'?'orchestrator':'discussion'};
    const project={workspace:'/fixture',projectId:'p',scopeId:status==='NONE'?null:'scope',scopeStatus:status,
      deliveryStatus:'READY_FOR_ACCEPTANCE',sessions:[session],planExecution:{execution_strategy:strategy,execution_origin_session_id:'other'}};
    const projects={snapshot:()=>({projects:[project]}),project:()=>project,inspect:async()=>project};
    const plugin=new PluginProjects({projects});t.after(()=>plugin.communication.dispose());
    const target=localParticipantTarget(projects,'chat');assert.equal(target.role,status==='NONE'?'O':'S');
    const invitation=await plugin.reserveParticipant('chat');
    const text='Полный контекст 🪟\n'.repeat(2000);
    await plugin.communication.startup.stage(target,{request_id:'startup',text});
    const opened=await plugin.panel({enrollment_ticket:invitation.enrollment_ticket,metadata});
    const first=opened.startup_context;assert.equal(first.part,0);assert.ok(first.total>1);
    await assert.rejects(plugin.communication.startupComplete({metadata,message_id:first.message_id,context_sha256:first.context_ref}),{code:'PLUGIN_COMMUNICATION_INCOMPLETE'});
    const parts=[first.text];
    for(let part=1;part<first.total;part++)parts.push((await plugin.communication.content({metadata,message_id:first.message_id,context_ref:first.context_ref,part})).text);
    assert.equal(parts.join(''),text);
    assert.equal((await plugin.communication.startupComplete({metadata,message_id:first.message_id,context_sha256:first.context_ref})).complete,true);
    const run=plugin.communication.runs.get(opened.registration.run_id);assert.equal(run.grant,undefined);
    assert.equal(run.events.some(e=>e.event_type==='send.intent'),false);
    if(target.role==='S')await assert.rejects(plugin.communication.workflow.grant(target),{code:'PLUGIN_COMMUNICATION_MODE'});
    assert.equal(session.role,status==='NONE'?'orchestrator':'discussion');
  }
});

test('executor startup is addressed separately and gates work until its own all-parts receipt',async t=>{
  const e={...target,local_session_id:'e',role:'E',scope_id:'scope',assignment_id:'a',task_id:'T001'};
  const c=new PluginCommunication({resolveTarget:id=>id==='e'?e:target,observe:()=>({canSend:true}),admit:async()=>true});t.after(()=>c.dispose());
  const invitation=await c.reserve(e);await c.startup.stage(e,{request_id:'e-start',text:'Правила назначения'});
  const joined=await c.enroll(invitation.enrollment_ticket,metadata),run=c.runs.get(joined.run_id),member=run.members[joined.participant_id];
  const m=c.startup.message(run,'e');
  assert.equal(await c.workflow.claimBlockReason(run,member,{message_id:'task',kind:'task'}),'previous-message');
  const first=await c.startupOpen({metadata,message_id:m.message_id});assert.equal(first.text,'Правила назначения');
  assert.equal((await c.startupComplete({metadata,message_id:m.message_id,context_sha256:first.context_ref})).complete,true);
  assert.equal(c.startup.active(c.runs.get(joined.run_id),member),false);assert.equal(c.runs.get(joined.run_id).grant,undefined);
});
async function fixture(t,{delivery_mode='sdk-notification'}={}){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-startup-'))),instances=[];
  let valid=true,current=true,canSend=true,admitted=true;
  const create=async()=>{
    const c=new PluginCommunication({store:await openCommunicationStore(directory),resolveTarget:()=>valid?target:null,
      observe:()=>({canSend,stopped:canSend,busy:!canSend}),admit:async()=>admitted,currentMessage:async()=>current,waitMs:10});
    instances.push(c);await c.ready;return c;
  };
  const c=await create(),invitation=await c.reserve(target);
  const staged=await c.startup.stage(target,{request_id:'request-1',text:'Полный контекст 🪟\n'.repeat(4000),delivery_mode});
  const registration=await c.enroll(invitation.enrollment_ticket,metadata);
  const bind=async comm=>{
    const input={...registration,metadata,panel_instance_id:randomUUID(),protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD,message_supported:true};
    const result=await comm.bind(input);return {...input,permission_generation:result.permission_generation};
  };
  const input={...await bind(c),message_id:staged.message_id};
  t.after(async()=>{for(const comm of instances){comm.dispose();await comm.tail;}await fs.rm(directory,{recursive:true,force:true});});
  return {c,input,staged,create,bind,directory,setValid:v=>valid=v,setCurrent:v=>current=v,setBusy:v=>canSend=!v,setAdmitted:v=>admitted=v};
}
async function readAll(c,input){
  const m=await c.readMessage(input),parts=[];
  for(let i=0,total=1;i<total;i++){
    const p=await c.content({...input,context_ref:m.context_ref,part:i});total=p.total;parts.push(p.text);
  }
  return {m,text:parts.join('')};
}

test('pre-plan startup uses binding and physical admission, all UTF-8 parts and an explicit receipt without plan permission',async t=>{
  const f=await fixture(t),{c,input}=f;
  const run=()=>c.runs.get(input.run_id),member=()=>run().members[input.participant_id];
  assert.equal(run().grant,undefined);assert.equal(c.workflow.permitted(run(),member()),false);
  await assert.rejects(c.claimReady({...input,panel_instance_id:randomUUID()}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  f.setBusy(true);assert.equal((await c.claimReady(input)).deferred,true);
  f.setBusy(false);f.setAdmitted(false);assert.equal((await c.claimReady(input)).reason,'admission-denied');f.setAdmitted(true);
  const ticket=await c.claimReady(input);assert.ok(ticket.delivery_attempt_id);
  await c.report({...input,...ticket,outcome:'accepted'});
  const m=await c.readMessage(input);assert.match(m.instructions,/workflow_startup_complete/);assert.equal(m.inline_context,undefined);
  await assert.rejects(c.startupComplete({...input,context_sha256:m.context_ref}),{code:'PLUGIN_COMMUNICATION_INCOMPLETE'});
  await assert.rejects(c.content({...input,context_ref:'0'.repeat(64)}),{code:'PLUGIN_COMMUNICATION_READ_DENIED'});
  await assert.rejects(c.content({...input,context_ref:m.context_ref,metadata:{'openai/session':'other'}}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  const result=await readAll(c,input);assert.equal(result.text,'Полный контекст 🪟\n'.repeat(4000));
  assert.ok(c.startup.progress('o','request-1').total_parts>2);
  await assert.rejects(c.startupComplete({...input,context_sha256:'0'.repeat(64)}),{code:'PLUGIN_COMMUNICATION_CONTEXT'});
  const complete=await c.startupComplete({...input,context_sha256:m.context_ref});assert.equal(complete.complete,true);
  assert.deepEqual(await c.startupComplete({...input,context_sha256:m.context_ref}),complete);
  assert.equal(run().grant,undefined);assert.equal(c.workflow.pending(run(),member()),null);
  assert.equal(member().deliveryGate,undefined);assert.equal(run().messages[0].reply_observed,false,'ack is not a physical reply observation');
  await assert.rejects(c.workflow.enqueue(target,{key:'not-authorized',kind:'continue',text:'Do work'}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
  assert.equal((await c.status(input)).stopped,true);
  const log=(await c.export(input)).jsonl;assert.doesNotMatch(log,/Полный контекст|local-test|startup-fixture/);
  f.setCurrent(false);
  await assert.rejects(c.content({...input,context_ref:m.context_ref}),{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'});
});

test('partial startup receipts survive reconnect and restart; UNKNOWN is never sent again',async t=>{
  const f=await fixture(t),{c,input}=f;
  delete c.runs.get(input.run_id).messages[0].delivery_mode; // Actual 0.5.20 WAL shape.
  const ticket=await c.claimReady(input),m=await c.readMessage(input);
  await c.content({...input,context_ref:m.context_ref,part:0});
  c.dispose();await c.tail;
  const next=await f.create(),bound={...await f.bind(next),message_id:m.message_id};
  assert.equal(next.startup.progress('o','request-1').delivery,'unknown');
  assert.equal(next.startup.progress('o','request-1').parts_read,1);
  await assert.rejects(next.claimReady(bound),{code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
  await assert.rejects(next.verify({...bound,...ticket}),{code:'PLUGIN_COMMUNICATION_STOPPED'});
  await readAll(next,bound);
  assert.equal((await next.startupComplete({...bound,context_sha256:m.context_ref})).complete,true);
  next.dispose();await next.tail;const last=await f.create();
  assert.equal(last.startup.progress('o','request-1').complete,true);
  assert.equal(last.runs.get(input.run_id).events.filter(e=>e.event_type==='send.intent').length,1);
});

test('immutable packets reject replacement after intent and stale or removed recipients cannot read or ack',async t=>{
  const f=await fixture(t),{c,input}=f;
  await assert.rejects(c.startup.stage(target,{request_id:'request-1',text:'different'}),{code:'PLUGIN_COMMUNICATION_CONFLICT'});
  await c.claimReady(input);
  await assert.rejects(c.startup.stage(target,{request_id:'request-2',text:'new'}),{code:'PLUGIN_COMMUNICATION_CONFLICT'});
  const m=await c.readMessage(input);f.setCurrent(false);
  await assert.rejects(c.content({...input,context_ref:m.context_ref}),{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'});
  await assert.rejects(c.startupComplete({...input,context_sha256:m.context_ref}),{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'});
  f.setValid(false);await assert.rejects(c.content({...input,context_ref:m.context_ref}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
});

test('pending startup reconnect resumes once; no lease or SDK means no delivery',async t=>{
  const f=await fixture(t),{c,input}=f;
  await c.stop({...input,scope:'panel'});
  await assert.rejects(c.claimReady(input),{code:'PLUGIN_COMMUNICATION_STOPPED'});
  c.dispose();await c.tail;const next=await f.create(),bound={...await f.bind(next),message_id:input.message_id};
  await next.sync({...bound,message_supported:false});
  await assert.rejects(next.claimReady(bound),{code:'PLUGIN_COMMUNICATION_STOPPED'});
  await next.sync({...bound,message_supported:true});
  assert.ok((await next.claimReady(bound)).delivery_attempt_id);
  await assert.rejects(next.claimReady(bound),{code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
});

test('startup admission requires the persisted sent attempt and fresh packet, not a running plan',async()=>{
  const project={workspace:'/fixture',sessionId:'o',attempt:{requestId:'r',state:'prepared',contextTransport:'panel',packet:{}}};
  const d=new DialogueDelivery({store:{inspect:async()=>({})},record:()=>({controller:{packetIsCurrent:async()=>true}})});
  d.project=()=>project;d.observe=()=>({canSend:true});
  const m={kind:'startup-context',request_id:'r'};
  assert.equal((await d.admit(target,m)).allowed,false);
  project.preparationPaused=true;assert.equal(await d.currentMessage(target,m),false);
  delete project.preparationPaused;project.attempt.requestId='other';assert.equal(await d.currentMessage(target,m),false);
});

test('UI separates bootstrap, reading, confirmation and uncertain delivery',()=>{
  assert.equal(startupView(null).phase,'startup-channel');
  assert.equal(startupView({read:true,parts_read:1,total_parts:3}).phase,'startup-reading');
  assert.match(startupView({read:true,parts_read:1,total_parts:3}).detail,/1 из 3/);
  assert.equal(startupView({complete:true}).phase,'startup-ready');
  assert.equal(startupView({delivery:'unknown'}).phase,'startup-uncertain');
});

test('model-pull startup is durable, idempotent and never schedules SDK even before the first read',async t=>{
  const f=await fixture(t,{delivery_mode:'model-pull'}),{c,input}=f;
  const run=()=>c.runs.get(input.run_id),member=()=>run().members[input.participant_id];
  assert.equal(c.workflow.pending(run(),member()),null);
  await assert.rejects(c.claimReady(input),{code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
  f.setBusy(true);c.panels.clear(); // Tool reading does not await idle page or iframe.
  const first=await c.startupOpen({metadata,message_id:input.message_id});
  assert.equal(first.part,0);assert.ok(first.total>2);assert.ok(Buffer.byteLength(JSON.stringify(first))<28000);
  assert.equal(c.startup.progress('o','request-1').parts_read,1);
  assert.deepEqual(await c.readMessage({metadata,message_id:first.message_id}),first);
  await assert.rejects(c.startup.stage(target,{request_id:'replacement',text:'changed'}),{code:'PLUGIN_COMMUNICATION_CONFLICT'});
  await assert.rejects(c.startupComplete({...input,context_sha256:first.context_ref}),{code:'PLUGIN_COMMUNICATION_INCOMPLETE'});
  await assert.rejects(c.startupOpen({metadata:{'openai/session':'foreign'},message_id:first.message_id}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  c.dispose();await c.tail;
  const next=await f.create();
  assert.deepEqual(await next.startupOpen({metadata,message_id:first.message_id}),first);
  const parts=await Promise.all(Array.from({length:first.total-1},(_,i)=>next.content({metadata,message_id:first.message_id,context_ref:first.context_ref,part:i+1})));
  assert.equal(first.text+parts.map(p=>p.text).join(''),'Полный контекст 🪟\n'.repeat(4000));
  const ack=await next.startupComplete({metadata,message_id:first.message_id,context_sha256:first.context_ref});
  assert.equal(ack.complete,true);assert.equal(next.runs.get(input.run_id).grant,undefined);
  assert.equal(next.runs.get(input.run_id).messages[0].reply_observed,false);
  assert.equal(next.runs.get(input.run_id).events.filter(e=>e.event_type==='send.intent').length,0);
  f.setCurrent(false);await assert.rejects(next.startupOpen({metadata,message_id:first.message_id}),{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'});
  f.setValid(false);await assert.rejects(next.startupComplete({metadata,message_id:first.message_id,context_sha256:first.context_ref}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
});

test('failed model-pull content read cannot persist a receipt; legacy intent cannot switch transport',async t=>{
  const f=await fixture(t,{delivery_mode:'model-pull'}),{c,input}=f;
  const original=c.store;c.store={...original,readContent:async()=>{throw Error('fixture read failure');}};
  await assert.rejects(c.startupOpen(input),/fixture read failure/);
  assert.equal(c.startup.progress('o','request-1').read,false);assert.equal(c.startup.progress('o','request-1').parts_read,0);
  c.store=original;
  f.setCurrent(false);await assert.rejects(c.startupOpen(input),{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'});
  f.setCurrent(true);await c.startupOpen(input);
  const old=await fixture(t);await old.c.claimReady(old.input);
  await assert.rejects(old.c.startupOpen(old.input),{code:'PLUGIN_COMMUNICATION_MODE'});
});

test('model-pull rejects an enrolled executor and a removed project',async t=>{
  const f=await fixture(t,{delivery_mode:'model-pull'}),{c,input}=f;
  const executor={...target,local_session_id:'e',role:'E',assignment_id:'assignment',task_id:'T001'};
  c.enrollment.resolveTarget=id=>id==='o'?target:id==='e'?executor:null;
  const ticket=await c.reserve(executor),eMeta={'openai/session':'executor-fixture'};
  await c.enroll(ticket.enrollment_ticket,eMeta);
  await assert.rejects(c.startupOpen({message_id:input.message_id,metadata:eMeta}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  await c.startupOpen(input);
  await c.removeProjects([{sessionIds:['o']}]);
  await assert.rejects(c.startupOpen(input),{code:'PLUGIN_COMMUNICATION_PROJECT_REMOVED'});
});
