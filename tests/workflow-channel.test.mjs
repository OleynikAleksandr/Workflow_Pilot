import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
const meta=id=>({'openai/session':id});
async function fixture(t,currentMessage,dialogueKit=null){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'workflow-channel-')));
  const targets=new Map(),pages=new Map(),admission=new Map(),instances=[];let now=100000;
  const create=async()=>{const c=new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,waitMs:5,
    resolveTarget:id=>targets.get(id),verifyTarget:async id=>targets.get(id),observe:target=>pages.get(target.local_session_id),
    reconcile:async target=>{const p=pages.get(target.local_session_id);if(!p)return null;
      if(!p.stale)p.observationSeq++;return structuredClone(p);},
    admit:async target=>admission.get(target.local_session_id)!==false,currentMessage,dialogueKit});instances.push(c);await c.ready;return c;};
  const c=await create();
  const target=(id,role='E')=>{const value={project_id:'p',scope_id:'s',local_session_id:id,origin_session_id:'o',role,
    assignment_id:role==='E'?'a-'+id:null,task_id:role==='E'?'t-'+id:null,...(dialogueKit?{dialogue_version:1}:{})};targets.set(id,value);
    pages.set(id,{canSend:true,stopped:true,busy:false,commandsIdle:true,observationSeq:1,documentId:'doc-'+id,turnId:'a0',userTurnId:'u0',assistantRevision:1,userMessagesRevision:1});return value;};
  const o=target('o','O');
  const bind=async(c,target)=>{const invite=await c.reserve(target),member=await c.enroll(invite.enrollment_ticket,meta(target.local_session_id));
    const input={...member,metadata:meta(target.local_session_id),panel_instance_id:randomUUID(),build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL};
    await c.bind({...input,message_supported:true});return sync(c,input);};
  const sync=async(c,input)=>({...input,permission_generation:(await c.sync({...input,message_supported:true})).permission_generation});
  t.after(async()=>{for(const c of instances){c.dispose();await c.tail;}await fs.rm(directory,{recursive:true,force:true});});
  return {c,o,target,targets,pages,admission,bind,sync,create,directory,advance:ms=>now+=ms};
}
const queue=(c,target,key='start',text='Начни задачу')=>c.workflow.enqueue(target,{key,kind:'assignment-start',text});
function dialogueKitFixture(){
  const effects=new Map(),states=new Map();let calls=0;
  return {effects,get calls(){return calls;},
    status:async(_target,id)=>({dialogue_version:1,dialogue:states.get(id)??{attempt:1}}),
    apply:async(target,input)=>{if(effects.has(input.operation_id))return {...effects.get(input.operation_id),duplicate:true};
      calls++;const receipt={ok:true,operation_id:input.operation_id,message_id:input.message_id,assignment_id:input.assignment_id,
        task_id:'t-'+input.assignment_id.slice(2),attempt:input.attempt,kind:input.kind};
      effects.set(input.operation_id,receipt);states.set(input.assignment_id,{attempt:input.attempt,grant:input.kind==='task'?{message_id:input.message_id}:null});
      return receipt;}};
}
test('working API derives author, addresses distinct assignments and sends immutable selected context',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e'),other=f.target('other');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.bind(f.c,e);await f.bind(f.c,other);
  const roster=await f.c.roster({metadata:meta('o')}),recipient=roster.assignments.find(a=>a.task_id==='t-e').recipient_ref;
  assert.notEqual(recipient,roster.assignments.find(a=>a.task_id==='t-other').recipient_ref);
  const text='Выбранный контракт 😀\n'.repeat(2000),input={metadata:meta('o'),recipient,attempt:1,kind:'task',
    body:'Реализуй только модуль e',contexts:[{source:'contract-e.md',commit:'a'.repeat(40),text}],idempotency_key:'task-e'};
  const sent=await f.c.assignmentSend(input),read=await f.c.readMessage({metadata:meta('e'),message_id:sent.message_id});
  assert.equal(read.sender_role,'O');assert.equal(read.assignment_id,'a-e');assert.equal(kit.calls,1);
  assert.equal(read.role_protocol,3);assert.match(read.instructions,/ДИАЛОГ 1/);
  assert.match(read.instructions,/обязательно отправь orchestrator result/);
  assert.doesNotMatch(read.instructions,/Полный context_pack — в recovery/);
  let content='';for(let part=0,total=1;part<total;part++){
    const c=await f.c.content({metadata:meta('e'),message_id:sent.message_id,context_ref:read.contexts[0].sha256,part});
    total=c.total;content+=c.text;assert.equal(c.source,'contract-e.md');assert.equal(c.commit,'a'.repeat(40));}
  assert.equal(content,text);
  await assert.rejects(f.c.content({metadata:meta('other'),message_id:sent.message_id,context_ref:read.contexts[0].sha256}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  assert.equal((await f.c.assignmentSend(input)).message_id,sent.message_id);assert.equal(kit.calls,1);
  await assert.rejects(f.c.assignmentSend({...input,body:'changed'}),{code:'PLUGIN_COMMUNICATION_CONFLICT'});
  f.pages.get('e').canSend=false;
  const question=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',attempt:1,kind:'question',
    body:'Уточни пустой ввод',in_reply_to:sent.message_id,idempotency_key:'question-e'});
  const answer=await f.c.readMessage({metadata:meta('o'),message_id:question.message_id});
  assert.equal(answer.sender_role,'E');assert.match(answer.instructions,/сам отправь task/);
  assert.match(answer.instructions,/Не жди общего финального поручения/);
  await assert.rejects(f.c.assignmentSend({...input,metadata:meta('e'),idempotency_key:'spoof'}),{code:'PLUGIN_COMMUNICATION_ROLE'});
  await assert.rejects(f.c.assignmentYield({metadata:meta('other'),message_ids:[sent.message_id],reason:'handled'}),{code:'PLUGIN_COMMUNICATION_YIELD_DENIED'});
  const yieldReceipt=await f.c.assignmentYield({metadata:meta('e'),message_ids:[sent.message_id],reason:'awaiting_reply'});
  assert.equal(yieldReceipt.physical_completion,false);
  const result=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',attempt:1,kind:'result',
    body:'Готово, проверки пройдены',source_commit:'b'.repeat(40),idempotency_key:'result-e'});
  const acceptance={metadata:meta('o'),recipient,attempt:1,kind:'acceptance',body:'Diff проверен',source_commit:'b'.repeat(40),result_id:result.message_id,idempotency_key:'accept-e'};
  await assert.rejects(f.c.assignmentSend(acceptance),{code:'PLUGIN_COMMUNICATION_RESULT_UNREAD'});
  await f.c.readMessage({metadata:meta('o'),message_id:result.message_id});await f.c.assignmentSend(acceptance);
  const before=kit.calls;await f.c.assignmentStatus({metadata:meta('o')});assert.equal(kit.calls,before,'status has no effects');
});
test('persisted intent resumes the same Kit effect after publication failure and restart',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const input={metadata:meta('o'),recipient,attempt:1,kind:'task',body:'Exact work',idempotency_key:'durable-task'};
  const store=f.c.store;f.c.store={...store,append:async(state,events)=>{
    if(events.some(e=>e.event_type==='message.persisted'))throw Error('fixture disk interruption');
    return store.append(state,events);}};
  await assert.rejects(f.c.assignmentSend(input),{code:'PLUGIN_COMMUNICATION_STORE_WRITE'});
  assert.equal(kit.calls,1);assert.equal(f.c.runs.get(b.run_id).messages.length,0);
  const restored=await f.create(),status=await restored.assignmentStatus({metadata:meta('o')});
  assert.equal(status.pending_intents.length,1);assert.equal(kit.calls,1);
  await restored.assignment.reconcile('p','s');
  const result=restored.runs.get(b.run_id).messages[0];
  assert.equal(result.message_id,status.pending_intents[0].message_id);assert.equal(kit.calls,1);
  assert.equal(restored.runs.get(b.run_id).messages.length,1);
  assert.equal((await restored.assignmentStatus({metadata:meta('o')})).pending_intents.length,0);
});
test('an intent saved before Kit failure is never delivered and concurrent retries share one effect',async t=>{
  const kit=dialogueKitFixture(),apply=kit.apply;let failOnce=true;
  kit.apply=async(...args)=>{if(failOnce){failOnce=false;throw Object.assign(Error('fixture interrupted before effect'),{code:'TEST_INTERRUPTION'});}return apply(...args);};
  const f=await fixture(t,undefined,kit),e=f.target('e');await f.c.workflow.grant(f.o);
  await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const input={metadata:meta('o'),recipient,attempt:1,kind:'task',body:'One operation',idempotency_key:'retry'};
  const deferred=await f.c.assignmentSend(input);assert.equal(deferred.published,false);assert.equal(deferred.phase,'deferred');
  assert.equal(kit.calls,0);assert.equal(f.c.runs.get(b.run_id).messages.length,0);
  const pending=(await f.c.assignmentStatus({metadata:meta('o')})).pending_intents[0];assert.ok(pending.message_id);
  const results=await Promise.all([f.c.assignmentSend(input),f.c.assignmentSend(input),f.c.assignmentSend(input)]);
  assert.ok(results.every(r=>r.message_id===pending.message_id));assert.equal(kit.calls,1);
  assert.equal(f.c.runs.get(b.run_id).messages.length,1);
});
test('startup progress reads current assignment and live SDK separately without exposing or mutating protocol data',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);
  assert.deepEqual(f.c.workflow.progress('e'),{registered:false,sdk:false,permitted:false,initial:null});
  const invitation=await f.c.reserve(e);await f.c.enroll(invitation.enrollment_ticket,meta('e'));
  assert.equal(f.c.workflow.progress('e').registered,true);assert.equal(f.c.workflow.progress('e').sdk,false);
  const b=await f.bind(f.c,e),first=await queue(f.c,e);const run=f.c.runs.get(b.run_id),seq=run.events.length;
  assert.deepEqual(f.c.workflow.progress('e'),{registered:true,sdk:true,permitted:true,initial:{delivery:'pending',read:false}});
  assert.equal(run.events.length,seq,'projection creates no telemetry or grants');
  await delivered(f,b,first.message_id);assert.deepEqual(f.c.workflow.progress('e').initial,{delivery:'accepted',read:true});
  f.advance(60001);assert.equal(f.c.workflow.progress('e').sdk,false);
  await f.sync(f.c,b);assert.equal(f.c.workflow.progress('e').sdk,true);
  await f.c.workflow.grant(f.o,'paused');assert.equal(f.c.workflow.progress('e').sdk,false,'old generation is not a current SDK lease');
  f.targets.set('e',{...e,assignment_id:'replacement'});
  assert.deepEqual(f.c.workflow.progress('e'),{registered:false,sdk:false,permitted:false,initial:null});
  assert.equal(f.c.workflow.progress('missing'),null);
});
test('pausing blocks new SDK wakeups but preserves active executor outbox and retries one deferred Kit operation',async t=>{
  const kit=dialogueKitFixture(),apply=kit.apply;let paused=true;
  kit.apply=async(target,input)=>{if(input.kind==='task'&&paused)throw Object.assign(Error('Plan paused'),{code:'PLAN_PAUSED'});return apply(target,input);};
  const f=await fixture(t,undefined,kit),e=f.target('e');await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);let b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const intent=await f.c.assignmentSend({metadata:meta('o'),recipient,attempt:1,kind:'task',body:'Task',idempotency_key:'paused-task'});
  assert.equal(intent.published,false);const runId=b.run_id,events=f.c.runs.get(runId).events.length;
  await f.c.assignment.reconcile('p','s');await f.c.assignment.reconcile('p','s');assert.equal(f.c.runs.get(runId).events.length,events,'unchanged deferral does not spin the event queue');
  await f.c.workflow.grant(f.o,'pausing');b=await f.sync(f.c,b);assert.equal(f.c.runs.get(runId).grant.active,false);
  const result=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',attempt:1,kind:'question',body:'Saved question',idempotency_key:'outbox'});
  assert.equal(result.delivery,'pending');assert.equal(pending(f.c,b),null);
  paused=false;await f.c.workflow.grant(f.o);b=await f.sync(f.c,b);await f.c.assignment.reconcile('p','s');
  assert.equal(pending(f.c,b),intent.message_id);assert.equal(kit.calls,2);
});
test('explicit migration requires O and a paused plan and never clears historical UNKNOWN',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');let calls=0;
  kit.migrate=async(_target,input)=>{calls++;return {migrated:true,operation_id:input.operation_id};};
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  await assert.rejects(f.c.assignmentMigrate({metadata:meta('o')}),{code:'PLUGIN_COMMUNICATION_MIGRATION_PAUSE'});
  await f.c.workflow.grant(f.o,'paused');
  await assert.rejects(f.c.assignmentMigrate({metadata:meta('e')}),{code:'PLUGIN_COMMUNICATION_MIGRATION_PAUSE'});
  const migrated=await f.c.assignmentMigrate({metadata:meta('o')});assert.equal(migrated.migrated,true);assert.equal(calls,1);
  await f.c.workflow.grant(f.o);const panel=await f.sync(f.c,b),message=await queue(f.c,e,'uncertain-before-migration');
  await sdk(f,panel,message.message_id,'unknown');await f.c.workflow.grant(f.o,'paused');
  await assert.rejects(f.c.assignmentMigrate({metadata:meta('o')}),{code:'PLUGIN_COMMUNICATION_MIGRATION_UNKNOWN'});
  const value=f.c.runs.get(b.run_id).messages.at(-1);assert.equal(value.delivery,'unknown');assert.equal(value.read,false);assert.equal(calls,1);
});
test('removal during a Kit effect retires its durable intent and cannot publish a late callback',async t=>{
  const kit=dialogueKitFixture(),apply=kit.apply;let release,entered;
  const started=new Promise(resolve=>entered=resolve),wait=new Promise(resolve=>release=resolve);
  kit.apply=async(...args)=>{entered();await wait;return apply(...args);};
  const f=await fixture(t,undefined,kit),e=f.target('e');await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const sending=f.c.assignmentSend({metadata:meta('o'),recipient,attempt:1,kind:'task',body:'Task',idempotency_key:'late'});
  await started;await f.c.removeProjects([{sessionIds:['o','e']}]);release();
  await assert.rejects(sending,{code:'PLUGIN_COMMUNICATION_INTENT'});
  await f.c.assignment.reconcile('p','s');const run=f.c.runs.get(b.run_id);
  assert.equal(run.removed,true);assert.equal(Object.values(run.assignment_intents)[0].phase,'retired');assert.equal(run.messages.length,0);
});
test('an obsolete UNKNOWN delivery requires actual notification read and yield; no payload read is fabricated',async t=>{
  const stale=new Set(),kit=dialogueKitFixture(),f=await fixture(t,async(_target,m)=>!stale.has(m.message_id),kit),e=f.target('e');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const sent=await f.c.assignmentSend({metadata:meta('o'),recipient,attempt:1,kind:'task',body:'Original task',idempotency_key:'obsolete'});
  await sdk(f,b,sent.message_id,'unknown');stale.add(sent.message_id);
  const notice=await f.c.readMessage({metadata:meta('e'),message_id:sent.message_id});assert.equal(notice.superseded,true);
  let message=f.c.runs.get(b.run_id).messages[0];assert.equal(message.read,false);assert.equal(message.delivery,'unknown');
  const page=f.pages.get('e');page.busy=true;page.stopped=false;
  await f.c.assignmentYield({metadata:meta('e'),message_ids:[sent.message_id],reason:'handled'});
  page.busy=false;page.stopped=true;await observe(f,'e');f.advance(600);await observe(f,'e');
  message=f.c.runs.get(b.run_id).messages[0];assert.equal(message.read,false);assert.equal(message.reply_observed,true);
  assert.equal(f.c.runs.get(b.run_id).events.filter(e=>e.event_type==='send.intent').length,1);
});
test('project removal revokes pending and uncertain deliveries durably without touching a neighbour',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);const b=await f.bind(f.c,e);
  const first=await queue(f.c,e,'claimed'),second=await queue(f.c,e,'pending');
  await f.c.claim({...b,message_id:first.message_id});
  const other={...f.target('other','O'),project_id:'neighbour',origin_session_id:'other'};
  f.targets.set('other',other);await f.c.workflow.grant(other);const neighbour=await f.bind(f.c,other);
  await f.c.removeProjects([{sessionIds:['o','e']}]);
  const run=f.c.runs.get(b.run_id);assert.equal(run.removed,true);assert.equal(run.grant.active,false);
  assert.equal(run.messages.find(m=>m.id===first.message_id||m.message_id===first.message_id)?.delivery,'unknown');
  assert.equal(run.messages.find(m=>m.id===second.message_id||m.message_id===second.message_id)?.delivery,'rejected');
  await assert.rejects(f.c.workflow.grant(f.o),{code:'PLUGIN_COMMUNICATION_PROJECT_REMOVED'});
  await assert.rejects(queue(f.c,e,'late'),{code:'PLUGIN_COMMUNICATION_PROJECT_REMOVED'});
  assert.equal((await f.c.status(neighbour)).stopped,false);
  f.c.dispose();await f.c.tail;const restored=await f.create();
  assert.throws(()=>restored.reserve(e),{code:'PLUGIN_COMMUNICATION_PROJECT_REMOVED'});
  assert.equal(restored.runs.get(neighbour.run_id).removed,undefined);
});
const pending=(c,b)=>c.waitResult({...b,after_seq:c.runs.get(b.run_id).events.length}).message_id;
async function sdk(f,b,id,outcome='accepted'){
  const attempt=await f.c.claim({...b,message_id:id});assert.ok(attempt.delivery_attempt_id);
  const args={...b,...attempt};await f.c.verify(args);await f.c.report({...args,outcome});return args;
}
async function observe(f,id){f.c.observeSession(id);await f.c.tail;}
test('dialogue gate needs correlated yield and fresh physical completion, never a new user bubble',async t=>{
  const f=await fixture(t,undefined,dialogueKitFixture()),e=f.target('e');await f.c.workflow.grant(f.o);
  const o=await f.bind(f.c,f.o),b=await f.bind(f.c,e),page=f.pages.get('e');
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const send=(kind,key)=>f.c.assignmentSend({metadata:meta('o'),recipient,kind,body:key,attempt:1,idempotency_key:key});
  const first=await send('task','task'),second=await send('context','context');
  await sdk(f,b,first.message_id);await f.c.readMessage({metadata:meta('e'),message_id:first.message_id});
  page.assistantRevision++;await observe(f,'e');assert.equal(pending(f.c,b),null,'read alone cannot release');
  await f.c.assignmentYield({metadata:meta('e'),message_ids:[first.message_id],reason:'awaiting_reply'});
  page.stale=true;await observe(f,'e');f.advance(1000);await observe(f,'e');
  assert.equal(pending(f.c,b),null,'old idle is not current completion');
  page.stale=false;await observe(f,'e');f.advance(1000);await observe(f,'e');
  assert.equal(pending(f.c,b),null,'fresh snapshot of pre-yield bubble is insufficient');
  page.busy=true;page.stopped=false;page.canSend=false;await observe(f,'e');
  const question=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',kind:'question',body:'Уточни правило',
    attempt:1,idempotency_key:'question',in_reply_to:first.message_id});
  assert.equal(pending(f.c,o),question.message_id,'outgoing question is independent of incoming gate');
  page.busy=false;page.stopped=true;page.canSend=true;page.commandsIdle=false;await observe(f,'e');
  assert.equal(pending(f.c,b),null,'active command keeps physical gate');
  page.commandsIdle=true;await observe(f,'e');f.advance(600);page.assistantRevision++;await observe(f,'e');
  assert.equal(pending(f.c,b),null,'final text after yield restarts idle confirmation');
  f.advance(600);await observe(f,'e');assert.equal(pending(f.c,b),second.message_id);
  assert.equal(page.userMessagesRevision,1);assert.equal(page.userTurnId,'u0');
  assert.equal(f.c.runs.get(b.run_id).messages.find(m=>m.message_id===first.message_id).reply_observed,true);
});
test('five independent recipients yield results to one FIFO, including read after UNKNOWN and late callbacks',async t=>{
  const f=await fixture(t,undefined,dialogueKitFixture());await f.c.workflow.grant(f.o);let o=await f.bind(f.c,f.o);
  const results=[];
  for(let i=0;i<5;i++){
    const id='e'+i;await f.bind(f.c,f.target(id));
    results.push(await f.c.assignmentSend({metadata:meta(id),recipient:'orchestrator',kind:'result',body:'Готово '+i,
      attempt:1,source_commit:'a'.repeat(40),idempotency_key:'result'}));
  }
  for(let i=0;i<5;i++){
    assert.equal(pending(f.c,o),results[i].message_id);
    const args=await sdk(f,o,results[i].message_id,i===0?'unknown':'accepted'),page=f.pages.get('o');
    page.busy=true;page.canSend=false;page.stopped=false;
    await f.c.readMessage({metadata:meta('o'),message_id:results[i].message_id});
    await f.c.assignmentYield({metadata:meta('o'),message_ids:[results[i].message_id],reason:'handled'});
    assert.equal(pending(f.c,o),null);
    if(i===0){await f.c.report({...args,outcome:'unknown'});
      assert.equal(f.c.runs.get(o.run_id).messages[0].delivery,'accepted','late callback cannot erase explicit recipient evidence');}
    page.busy=false;page.stopped=true;page.canSend=true;await observe(f,'o');f.advance(600);await observe(f,'o');
  }
  assert.equal(pending(f.c,o),null);assert.equal(f.pages.get('o').userMessagesRevision,1);
  assert.equal(f.c.runs.get(o.run_id).events.filter(e=>e.event_type==='send.intent').length,5);
  assert.equal(f.c.runs.get(o.run_id).messages.filter(m=>m.reply_observed).length,5);
});
test('pause, timeout, changed document and stale attempt never manufacture physical completion',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');await f.c.workflow.grant(f.o);
  await f.bind(f.c,f.o);let b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const message=await f.c.assignmentSend({metadata:meta('o'),recipient,kind:'task',body:'Работа',attempt:1,idempotency_key:'task'});
  await sdk(f,b,message.message_id);await f.c.readMessage({metadata:meta('e'),message_id:message.message_id});
  const page=f.pages.get('e');page.busy=true;page.stopped=false;
  await f.c.assignmentYield({metadata:meta('e'),message_ids:[message.message_id],reason:'handled'});
  await f.c.workflow.grant(f.o,'paused');page.busy=false;page.stopped=true;page.assistantRevision++;
  await observe(f,'e');f.advance(1000);await observe(f,'e');
  assert.equal(f.c.runs.get(b.run_id).messages[0].reply_observed,false);
  assert.equal(f.c.workflow.turnProbes.size,0,'pause cancels bounded read-only probes');
  await f.c.workflow.grant(f.o);b=await f.sync(f.c,b);page.documentId='reloaded-document';
  await observe(f,'e');f.advance(1000);await observe(f,'e');
  assert.equal(f.c.runs.get(b.run_id).messages[0].reply_observed,false,'unrelated document is not turn evidence');
  await f.c.mutate('turnTimeout',{run_id:b.run_id,message_id:message.message_id});
  assert.equal(f.c.runs.get(b.run_id).members[b.participant_id].deliveryGate.wait_reason,'physical-completion-unconfirmed');
  kit.status=async()=>({dialogue_version:1,dialogue:{attempt:2}});
  await assert.rejects(f.c.assignmentYield({metadata:meta('e'),message_ids:[message.message_id],reason:'handled'}),{code:'PLUGIN_COMMUNICATION_STALE_ATTEMPT'});
});
async function delivered(f,b,message_id){
  const attempt=await f.c.claim({...b,message_id});assert.ok(attempt.delivery_attempt_id);
  const args={...b,...attempt};await f.c.verify(args);await f.c.report({...args,outcome:'accepted'});
  await f.c.readMessage({message_id,metadata:b.metadata});
  const page=f.pages.get(b.local_session_id);page.turnId+='a';page.userTurnId+='u';page.assistantRevision++;page.userMessagesRevision++;
  f.c.observeSession(b.local_session_id);await f.c.tail;
}
test('one plan Start covers five later enrollments, expires only its SDK lease, and serializes a conversation',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);
  for(let i=0;i<5;i++){
    const target=f.target('e'+i),first=await queue(f.c,target,'first-'+i),second=await queue(f.c,target,'second-'+i);
    let b=await f.bind(f.c,target);assert.equal((await f.c.status(b)).stopped,false);
    assert.equal(pending(f.c,b),first.message_id);
    f.pages.get(target.local_session_id).canSend=false;assert.equal(pending(f.c,b),null);
    assert.deepEqual(await f.c.claim({...b,message_id:first.message_id}),{deferred:true});
    f.pages.get(target.local_session_id).canSend=true;f.admission.set(target.local_session_id,false);
    assert.deepEqual(await f.c.claim({...b,message_id:first.message_id}),{deferred:true});f.admission.set(target.local_session_id,true);
    await delivered(f,b,first.message_id);assert.equal(pending(f.c,b),second.message_id);
    f.advance(31*60*1000);assert.equal((await f.c.status(b)).stopped,false,'plan permission has no 30-minute deadline');
    await assert.rejects(f.c.claim({...b,message_id:second.message_id}),{code:'PLUGIN_COMMUNICATION_STOPPED'});
    b=await f.sync(f.c,b);assert.equal(pending(f.c,b),second.message_id,'automatic SDK renewal needs no Enable');
    await delivered(f,b,second.message_id);
  }
});
test('lifecycle detachment preserves plan permission; explicit Stop and restart require plan Continue',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);let b=await f.bind(f.c,e);
  const message=await queue(f.c,e);
  await f.c.stop({...b,scope:'panel'});assert.equal((await f.c.status(b)).stopped,false);
  b=await f.sync(f.c,b);await f.c.stop({...b,scope:'participant'});assert.equal((await f.c.status(b)).stopped,true);
  b=await f.sync(f.c,b);assert.equal((await f.c.status(b)).stopped,true,'presence cannot grant permission');
  await f.c.workflow.grant(f.o);b=await f.sync(f.c,b);
  const attempt=await f.c.claim({...b,message_id:message.message_id});assert.ok(attempt.delivery_attempt_id);
  f.c.dispose();await f.c.tail;const next=await f.create();let restored=await f.bind(next,e);
  assert.equal((await next.status(restored)).stopped,true);
  assert.equal(next.runs.get(b.run_id).messages[0].delivery,'unknown','lost claim cannot replay');
  await next.workflow.grant(f.o);restored=await f.sync(next,restored);
  assert.equal(pending(next,restored),null);
  await assert.rejects(next.claim({...restored,message_id:message.message_id}),{code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
});
test('large UTF-8 context is complete, immutable, identity scoped and persists without copying it into the WAL',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);const b=await f.bind(f.c,e);
  const text='Строка ✓ 😀\n'.repeat(5000),m=await queue(f.c,e,'large',text);
  assert.equal((await queue(f.c,e,'large',text)).message_id,m.message_id);
  await assert.rejects(queue(f.c,e,'large',text+'!'),{code:'PLUGIN_COMMUNICATION_CONFLICT'});
  const value=await f.c.readMessage({message_id:m.message_id,metadata:meta('e')});let complete='';
  assert.equal(value.role_protocol,3);assert.match(value.instructions,/РОЛЬ: ИСПОЛНИТЕЛЬ/);
  assert.match(value.instructions,/не повторяют recovery и не запускают задачу заново/);
  for(let part=0,total=1;part<total;part++){
    const page=await f.c.content({message_id:m.message_id,context_ref:value.context_ref,part,metadata:meta('e')});
    complete+=page.text;total=page.total;assert.ok(Buffer.byteLength(page.text)<=12000);
  }
  assert.equal(complete,text);assert.equal(value.context_ref,createHash('sha256').update(text).digest('hex'));
  const other=await f.bind(f.c,f.target('stranger'));
  await assert.rejects(f.c.content({...other,message_id:m.message_id,context_ref:value.context_ref}),{code:'PLUGIN_COMMUNICATION_READ_DENIED'});
  await assert.rejects(f.c.readMessage({message_id:m.message_id,metadata:meta('unknown')}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  const logs=(await fs.readdir(f.directory)).filter(n=>n.endsWith('.jsonl'));
  for(const name of logs)assert.ok(!(await fs.readFile(path.join(f.directory,name),'utf8')).includes('Строка'));
  const next=await f.create(),restored=await next.content({message_id:m.message_id,context_ref:value.context_ref,metadata:meta('e')});
  assert.ok(restored.total>1);assert.ok(text.startsWith(restored.text));assert.equal(restored.bytes,Buffer.byteLength(text));
  assert.equal(await next.store.readContent(value.context_ref),text);
  f.targets.set('e',{...e,assignment_id:'replaced'});
  await assert.rejects(f.c.content({...b,message_id:m.message_id,context_ref:value.context_ref}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
});
test('obsolete decisions skip SDK and cannot expose work after an already accepted notification',async t=>{
  const stale=new Set(),f=await fixture(t,async(_target,m)=>!stale.has(m.message_id)),e=f.target('e');
  await f.c.workflow.grant(f.o);const b=await f.bind(f.c,e);
  const first=await queue(f.c,e,'before-claim');stale.add(first.message_id);
  assert.deepEqual(await f.c.claim({...b,message_id:first.message_id}),{deferred:true,superseded:true});
  const second=await queue(f.c,e,'before-verify'),attempt=await f.c.claim({...b,message_id:second.message_id});
  stale.add(second.message_id);assert.deepEqual(await f.c.verify({...b,...attempt}),{superseded:true,expires_at:0});
  const third=await queue(f.c,e,'after-send'),sent=await f.c.claim({...b,message_id:third.message_id});
  await f.c.verify({...b,...sent});await f.c.report({...b,...sent,outcome:'accepted'});stale.add(third.message_id);
  const response=await f.c.readMessage({message_id:third.message_id,metadata:meta('e')});
  assert.equal(response.superseded,true);assert.equal(response.context_ref,undefined);
  const message=f.c.runs.get(b.run_id).messages.at(-1);
  await assert.rejects(f.c.content({message_id:third.message_id,context_ref:message.context_ref,metadata:meta('e')}),{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'});
  const fourth=await queue(f.c,e,'next');assert.equal(pending(f.c,b),null,'the already started model turn still owns the conversation');
  const page=f.pages.get('e');page.turnId+='a';page.userTurnId+='u';page.assistantRevision++;page.userMessagesRevision++;
  f.c.observeSession('e');await f.c.tail;assert.equal(pending(f.c,b),fourth.message_id);
  const restored=await f.create();assert.equal(restored.runs.get(b.run_id).messages[0].delivery,'superseded');
});
test('two live panels consume at most one delivery and cannot skip an uncertain predecessor',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);const b=await f.bind(f.c,e),other=await f.bind(f.c,e);
  const first=await queue(f.c,e,'first'),second=await queue(f.c,e,'second');
  const results=await Promise.allSettled([f.c.claim({...b,message_id:first.message_id}),f.c.claim({...other,message_id:first.message_id})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.deepEqual(await f.c.claim({...other,message_id:second.message_id}),{deferred:true});
  assert.equal(pending(f.c,other),null);
});
test('context files reject corruption and symlink substitution without changing the target',async t=>{
  const f=await fixture(t),ref=await f.c.store.putContent('immutable');const file=path.join(f.directory,ref+'.context');
  await fs.writeFile(file,'changed');await assert.rejects(f.c.store.readContent(ref),{code:'PLUGIN_COMMUNICATION_CONTEXT'});
  await fs.rm(file);const outside=path.join(f.directory,'outside');await fs.writeFile(outside,'immutable');await fs.symlink(outside,file);
  await assert.rejects(f.c.store.readContent(ref),{code:'PLUGIN_COMMUNICATION_CONTEXT'});
  await assert.rejects(f.c.store.putContent('immutable'),{code:'PLUGIN_COMMUNICATION_CONTEXT'});
  assert.equal(await fs.readFile(outside,'utf8'),'immutable');
});
