import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
import {ROLE_PROTOCOL_VERSION} from '@webpilot/workflow-kit/lib/role-protocol';
import {bridge,client} from './fixtures/plugin-host.mjs';
import {makeSdkBusyProbe} from '../src/execution/plugin/sdk-busy-probe.mjs';
const meta=id=>({'openai/session':id});
async function fixture(t,currentMessage,dialogueKit=null,busyProfile=null){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'workflow-channel-')));
  const targets=new Map(),pages=new Map(),admission=new Map(),instances=[];let now=100000;
  const create=async()=>{const c=new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,waitMs:5,
    resolveTarget:id=>targets.get(id),verifyTarget:async id=>targets.get(id),observe:target=>pages.get(target.local_session_id),
    reconcile:async target=>{const p=pages.get(target.local_session_id);if(!p)return null;
      if(!p.stale)p.observationSeq++;return structuredClone(p);},
    admit:async target=>admission.get(target.local_session_id)!==false,currentMessage,dialogueKit,
    sdkBusyProfile:async()=>busyProfile??{version:1,mode:'off'}});instances.push(c);await c.ready;return c;};
  const c=await create();
  const target=(id,role='E')=>{const value={project_id:'p',scope_id:'s',local_session_id:id,origin_session_id:'o',role,
    assignment_id:role==='E'?'a-'+id:null,task_id:role==='E'?'t-'+id:null,...(dialogueKit?{dialogue_version:1}:{})};targets.set(id,value);
    pages.set(id,{canSend:true,stopped:true,busy:false,commandsIdle:true,sdkCommands:[],observationSeq:1,documentId:'doc-'+id,turnId:'a0',userTurnId:'u0',assistantRevision:1,userMessagesRevision:1});return value;};
  const o=target('o','O');
  const bind=async(c,target)=>{const invite=await c.reserve(target),member=await c.enroll(invite.enrollment_ticket,meta(target.local_session_id));
    const input={...member,metadata:meta(target.local_session_id),panel_instance_id:randomUUID(),build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL};
    await c.bind({...input,message_supported:true});return sync(c,input);};
  const sync=async(c,input)=>({...input,permission_generation:(await c.sync({...input,message_supported:true})).permission_generation});
  t.after(async()=>{for(const c of instances){c.dispose();await c.tail;}await fs.rm(directory,{recursive:true,force:true});});
  return {c,o,target,targets,pages,admission,bind,sync,create,directory,advance:ms=>now+=ms};
}
const queue=(c,target,key='start',text='Начни задачу')=>c.workflow.enqueue(target,{key,kind:'assignment-start',text});
const burstProfile=()=>({version:1,mode:'sdk-busy-burst',test_workspace:true,experiment_id:'busy-test',activation_id:randomUUID(),
  workspace:'/fixture',project_id:'p',scope_id:'s',recipient_role:'O',build_id:COMMUNICATION_BUILD,
  cases:[{case_id:'two-results',busy_kind:'tool-wait',max_notifications:2,task_ids:['t-left','t-right']}]});
async function burstFixture(t,{unrelated=false,busyKind='tool-wait',afterFirst}={}){
  const profile=burstProfile();profile.cases[0].busy_kind=busyKind;
  if(busyKind==='read-only-command')profile.cases[0].preliminary_go='a'.repeat(64);
  const f=await fixture(t,undefined,dialogueKitFixture(),profile);
  await f.c.workflow.grant(f.o);const binding=await f.bind(f.c,f.o),run=()=>f.c.runs.get(binding.run_id);
  const previous=await f.c.workflow.enqueue(f.o,{key:'previous',kind:'diagnostic',text:'Previous work'});
  await sdk(f,binding,previous.message_id);await f.c.readMessage({metadata:meta('o'),message_id:previous.message_id});
  const other=unrelated?await f.c.workflow.enqueue(f.o,{key:'unrelated',kind:'diagnostic',text:'Unrelated unread message'}):null;
  const page=f.pages.get('o');Object.assign(page,{sdkDocumentReady:true,busy:true,canSend:false,stopped:false});
  const results=[];
  for(const name of ['left','right']){
    await f.bind(f.c,f.target(name));results.push(await f.c.assignmentSend({metadata:meta(name),recipient:'orchestrator',kind:'result',
      body:'Checked '+name,source_commit:(name==='left'?'a':'b').repeat(40),attempt:1,idempotency_key:'result'}));
    if(name==='left'&&afterFirst)await afterFirst({...f,binding,run,page,results});
  }
  return {...f,profile,binding,run,page,previous,other,results};
}
test('measurement hold releases both deliveries while its bounded tool remains outstanding, with one interval',async t=>{
  const f=await burstFixture(t),input={metadata:meta('o'),case_id:'two-results',duration_ms:80};
  const held=f.c.experimentHold(input);await new Promise(resolve=>setTimeout(resolve,15));
  assert.equal(pending(f.c,f.binding),f.results[0].message_id,'hold does not lock the mutation queue');
  const again=f.c.experimentHold(input);
  await sdk(f,f.binding,f.results[0].message_id);await sdk(f,f.binding,f.results[1].message_id);
  assert.deepEqual(await held,await again);
  assert.equal(f.run().events.filter(event=>event.event_type==='experiment.hold_started').length,1);
  assert.equal(f.run().events.filter(event=>event.event_type==='experiment.hold_finished').length,1);
  await assert.rejects(f.c.experimentHold({...input,duration_ms:30001}),{code:'PLUGIN_COMMUNICATION_INPUT'});
});
test('real Python MCP and authenticated bridge expose only typed own measurement, without arming a profile',async t=>{
  const f=await burstFixture(t);await bridge(t,{directory:f.directory,plugin:{communication:f.c}});
  const mcp=await client(t,f),tools=(await mcp.listTools()).tools;
  for(const name of ['workflow_delivery_experiment_hold','workflow_delivery_experiment_checkpoint']){
    const tool=tools.find(tool=>tool.name===name);assert.deepEqual(tool._meta.ui.visibility,['model']);
    assert.equal(tool.inputSchema.properties.workspace,undefined);assert.equal(tool.inputSchema.properties.participant_id,undefined);
  }
  const call=(name,args,metadata=meta('o'))=>mcp.callTool({name:'workflow_delivery_experiment_'+name,arguments:args,_meta:metadata});
  assert.equal((await call('hold',{case_id:'two-results',duration_ms:30001})).isError,true);
  assert.equal((await call('hold',{case_id:'two-results',duration_ms:20},meta('left'))).isError,true);
  const hold=call('hold',{case_id:'two-results',duration_ms:80});
  await new Promise(resolve=>setTimeout(resolve,20));await sdk(f,f.binding,f.results[0].message_id);await sdk(f,f.binding,f.results[1].message_id);
  const result=await hold;assert.equal(result.isError,false);assert.ok(result.structuredContent.nonce);
  const done=await call('checkpoint',{case_id:'two-results',marker:'resume',nonce:result.structuredContent.nonce});assert.equal(done.isError,false);
  const exported=await f.c.export(f.binding);assert.match(exported.jsonl,/experiment.hold_started/);assert.match(exported.jsonl,/experiment.hold_finished/);
});
test('readonly checkpoint pins one fresh command hash and id; a second verified readonly service still blocks it',async t=>{
  const f=await burstFixture(t,{busyKind:'read-only-command'});
  f.c.sdkBusyProbe=async input=>makeSdkBusyProbe({...input,python:'/own/runtime/python'});
  const begin=await f.c.experimentCheckpoint({metadata:meta('o'),case_id:'two-results',marker:'begin'});
  assert.equal(pending(f.c,f.binding),null);
  const command={id:'probe',state:'running',readOnly:true,processId:'process',commandHash:begin.probe.command_hash,startedAt:100001};
  f.page.sdkCommands=[command];await observe(f,'o');assert.equal(pending(f.c,f.binding),f.results[0].message_id);
  f.page.sdkCommands.push({...command,id:'service'});assert.equal(pending(f.c,f.binding),null);
  f.page.sdkCommands=[{...command,id:'replacement'}];assert.equal(pending(f.c,f.binding),null,'the observed process cannot be replaced');
});
test('generation waits for fresh same-document content and retains exact resume nonce',async t=>{
  const f=await burstFixture(t,{busyKind:'generation'}),begin=await f.c.experimentCheckpoint({metadata:meta('o'),case_id:'two-results',marker:'begin'});
  assert.equal(pending(f.c,f.binding),null,'checkpoint itself is not generation evidence');
  await observe(f,'o');assert.equal(pending(f.c,f.binding),null);
  f.page.assistantRevision++;await observe(f,'o');assert.equal(pending(f.c,f.binding),f.results[0].message_id);
  await assert.rejects(f.c.experimentCheckpoint({metadata:meta('o'),case_id:'two-results',marker:'resume',nonce:'wrong'}),{code:'PLUGIN_COMMUNICATION_EXPERIMENT_NONCE'});
  const resume=await f.c.experimentCheckpoint({metadata:meta('o'),case_id:'two-results',marker:'resume',nonce:begin.nonce});assert.equal(resume.nonce,begin.nonce);
});
test('local refresh never upgrades a scope started off, never reuses a case, and any cached active command blocks pending',async t=>{
  const f=await burstFixture(t);await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});
  f.page.sdkCommands=[{state:'running',readOnly:true}];assert.equal(pending(f.c,f.binding),null);
  f.page.sdkCommands=[];assert.equal(pending(f.c,f.binding),f.results[0].message_id);
  f.profile.mode='off';await f.c.workflow.refreshExperiment(f.o);assert.equal(f.run().sdk_busy.active,false);
  f.profile.mode='sdk-busy-burst';f.profile.activation_id=randomUUID();
  await assert.rejects(f.c.workflow.refreshExperiment(f.o),{code:'PLUGIN_COMMUNICATION_EXPERIMENT_CASE'});
  const off=await fixture(t);await off.c.workflow.grant(off.o);const binding=await off.bind(off.c,off.o),run=off.c.runs.get(binding.run_id);
  await off.c.mutate('experimentRefresh',{run_id:run.id,target:off.o,profile:burstProfile()});assert.equal(run.sdk_busy,undefined);
});
test('busy burst sends two checked results through claim/verify while preserving the previous gate and unread first result',async t=>{
  const f=await burstFixture(t),ids=f.results.map(message=>message.message_id);
  assert.equal(pending(f.c,f.binding),null,'measurement holds only the selected results');
  const begin=await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});assert.ok(begin.nonce);
  assert.equal(pending(f.c,f.binding),ids[0]);
  const first=await f.c.claimReady({...f.binding,message_id:ids[0]});
  assert.equal(first.sdk_busy.sdk_timeout_ms,90000);assert.ok(f.run().messages.find(message=>message.message_id===ids[0]).handlingGate);
  assert.equal(f.run().members[f.binding.participant_id].deliveryGate.message_id,f.previous.message_id);
  await f.c.report({...f.binding,...first,outcome:'accepted'});
  assert.equal(f.run().messages.find(message=>message.message_id===ids[0]).read,false);
  assert.equal(pending(f.c,f.binding),ids[1],'accepted SDK promise is enough for the second selected result');
  await sdk(f,f.binding,ids[1]);
  assert.equal(f.run().sdk_busy.cases[0].slots.length,2);
  await assert.rejects(f.c.claimReady({...f.binding,message_id:ids[1]}),{code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
  for(const id of ids)await f.c.readMessage({metadata:meta('o'),message_id:id});
  await f.c.assignmentYield({metadata:meta('o'),message_ids:[f.previous.message_id,...ids],reason:'handled'});
  Object.assign(f.page,{busy:false,stopped:true,canSend:true,assistantRevision:2});
  await observe(f,'o');f.advance(600);await observe(f,'o');
  assert.ok(f.run().messages.every(message=>message.reply_observed));
  assert.equal(f.run().members[f.binding.participant_id].deliveryGate,undefined);
  assert.equal(f.run().sdk_busy.cases[0].status,'complete');
});
test('busy burst keeps draft/manual Stop/document/commands and unrelated unread messages as independent barriers',async t=>{
  const f=await burstFixture(t),id=f.results[0].message_id;
  await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});
  for(const [field,value,reason] of [['manualStopped',true,'manual-stop'],['draftPresent',true,'recipient-draft'],['sdkDocumentReady',false,'recipient-unavailable']]){
    const previous=f.page[field];f.page[field]=value;
    assert.equal((await f.c.claimReady({...f.binding,message_id:id})).reason,reason);f.page[field]=previous;
  }
  f.admission.set('o',false);assert.equal((await f.c.claimReady({...f.binding,message_id:id})).reason,'admission-denied');f.admission.delete('o');
  const first=await f.c.claimReady({...f.binding,message_id:id});await f.c.report({...f.binding,...first,outcome:'unknown'});
  assert.equal(pending(f.c,f.binding),null);
  assert.equal(f.run().sdk_busy.cases[0].reason,'sdk-unknown');
  assert.equal(f.run().events.filter(event=>event.event_type==='send.intent').length,2,'only previous work and one result');
});
test('reading a held result invalidates its pair without replay or replacing the original work',async t=>{
  const f=await burstFixture(t);
  await f.c.readMessage({metadata:meta('o'),message_id:f.results[0].message_id});
  assert.equal(f.run().sdk_busy.cases[0].status,'invalid');
  assert.equal(f.run().sdk_busy.cases[0].reason,'early-read');
  await assert.rejects(f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'}),{code:'PLUGIN_COMMUNICATION_EXPERIMENT_CASE'});
  assert.equal(f.run().events.filter(event=>event.event_type==='send.intent').length,1);
});
test('model pull of second selected result after first SDK keeps its receipt, invalidates the pair and consumes no second slot',async t=>{
  const f=await burstFixture(t);await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});
  await sdk(f,f.binding,f.results[0].message_id);
  await f.c.readMessage({metadata:meta('o'),message_id:f.results[1].message_id});
  assert.equal(f.run().sdk_busy.cases[0].status,'invalid');assert.equal(f.run().sdk_busy.cases[0].slots.length,1);
  assert.equal(f.run().messages.find(message=>message.message_id===f.results[0].message_id).delivery,'accepted');
  assert.equal(f.run().messages.find(message=>message.message_id===f.results[1].message_id).read,true);
  assert.equal(pending(f.c,f.binding),null);assert.equal(f.run().events.filter(event=>event.event_type==='send.intent').length,2,'previous work plus first result only');
});
test('explicit context pull before binding the pair invalidates measurement without inventing read or repeating SDK',async t=>{
  let pulled;
  const f=await burstFixture(t,{afterFirst:async value=>{
    const result=value.run().messages.find(message=>message.message_id===value.results[0].message_id);
    const status=await value.c.status(value.binding);assert.equal(status.messages.find(message=>message.message_id===result.message_id).preview,undefined);
    pulled=await value.c.content({metadata:meta('o'),message_id:result.message_id,context_ref:result.context_ref,part:0});
    assert.equal(value.run().sdk_busy.cases[0].status,'invalid');
  }});
  assert.match(pulled.text,/Checked left/);assert.equal(f.run().messages.find(message=>message.message_id===f.results[0].message_id).read,false);
  assert.equal(f.run().messages.find(message=>message.message_id===f.results[0].message_id).delivery_mode,'model-pull');
  assert.equal(pending(f.c,f.binding),null);assert.equal(f.run().events.filter(event=>event.event_type==='experiment.model_pull').length,1);
  assert.equal(f.run().events.filter(event=>event.event_type==='send.intent').length,1,'only the original work');
  f.profile.activation_id=randomUUID();f.profile.cases[0].case_id='fresh-case';await f.c.workflow.refreshExperiment(f.o);
  assert.equal(f.run().sdk_busy.cases[0].status,'armed','local rearm cannot bind a result whose body was already pulled');
  await f.c.readMessage({metadata:meta('o'),message_id:f.results[0].message_id});
  assert.equal(f.run().messages.find(message=>message.message_id===f.results[0].message_id).read,true,'normal explicit reading remains available');
});
test('busy burst does not overtake a different unread message or consume a slot while deferred',async t=>{
  const f=await burstFixture(t,{unrelated:true});await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});
  const id=f.results[0].message_id;
  assert.equal(pending(f.c,f.binding),null);
  assert.equal((await f.c.claimReady({...f.binding,message_id:id})).reason,'previous-message');
  assert.equal(f.run().sdk_busy.cases[0].slots.length,0);
  await f.c.readMessage({metadata:meta('o'),message_id:f.other.message_id});
  assert.equal(pending(f.c,f.binding),id);
});
test('restart never re-arms the same saved experimental activation or repeats an unknown result',async t=>{
  const f=await burstFixture(t);await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});
  const id=f.results[0].message_id;await f.c.claimReady({...f.binding,message_id:id});
  const restarted=await f.create();await restarted.workflow.grant(f.o);const binding=await f.bind(restarted,f.o);
  const run=restarted.runs.get(binding.run_id);
  assert.equal(run.sdk_busy.active,false);assert.equal(run.messages.find(message=>message.message_id===id).delivery,'unknown');
  assert.equal(run.events.filter(event=>event.event_type==='send.intent').length,2);
  await assert.rejects(restarted.experimentBegin({metadata:meta('o'),case_id:'two-results'}),{code:'PLUGIN_COMMUNICATION_EXPERIMENT_DISABLED'});
});
test('a 90-second experimental promise retains its attempt across ordinary 35-second expiry and renewed 60-second leases',async t=>{
  const f=await burstFixture(t);await f.c.experimentBegin({metadata:meta('o'),case_id:'two-results'});
  const id=f.results[0].message_id,ticket=await f.c.claimReady({...f.binding,message_id:id});
  for(const milliseconds of [40000,40000,9000]){
    f.advance(milliseconds);Object.assign(f.binding,await f.sync(f.c,f.binding));
    assert.equal(f.run().messages.find(message=>message.message_id===id).delivery,'claimed');
  }
  await f.c.report({...f.binding,...ticket,outcome:'accepted'});
  assert.equal(pending(f.c,f.binding),f.results[1].message_id);
  assert.equal(f.run().events.filter(event=>event.event_type==='send.unknown'&&event.message_id===id).length,0);
});
test('generation and lease readiness agree for O and two E; sync never grants a paused plan',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);
  const bindings=await Promise.all([f.o,f.target('first'),f.target('second')].map(target=>f.bind(f.c,target)));
  await f.c.workflow.grant(f.o,'paused');await f.c.workflow.grant(f.o);
  for(const b of bindings){
    assert.equal((await f.c.status(b)).channel_ready,false);
    assert.equal(f.c.workflow.progress(f.c.runs.get(b.run_id).members[b.participant_id].target.local_session_id).sdk,false);
    await assert.rejects(f.c.wait({...b,after_seq:0}),{code:'PLUGIN_COMMUNICATION_STOPPED',reason:'generation-mismatch'});
    Object.assign(b,await f.sync(f.c,b));assert.equal((await f.c.status(b)).channel_ready,true);
  }
  f.advance(61000);
  for(const b of bindings){
    assert.equal((await f.c.status(b)).channel_ready,false);
    await assert.rejects(f.c.wait({...b,after_seq:0}),{reason:'lease-expired'});
  }
  await f.c.workflow.grant(f.o,'paused');await f.sync(f.c,bindings[0]);
  assert.equal((await f.c.status(bindings[0])).stopped,true);
  const events=f.c.runs.get(bindings[0].run_id).events;
  assert.ok(events.some(e=>e.event_type==='operation.denied'&&e.reason==='generation-mismatch'));
  assert.ok(events.some(e=>e.event_type==='operation.denied'&&e.reason==='lease-expired'));
  assert.equal(events.filter(e=>e.event_type==='send.intent').length,0);
});
test('a pending permission cannot overtake a newer Stop or a changed control owner',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);const binding=await f.bind(f.c,f.o);
  const generation=f.c.runs.get(binding.run_id).grant.generation;
  await f.c.stop({...binding,scope:'participant'});
  await assert.rejects(f.c.workflow.grant(f.o,'running',{expectedGeneration:generation}),{code:'PLUGIN_COMMUNICATION_PERMISSION_CHANGED'});
  await assert.rejects(f.c.workflow.grant(f.o,'running',{canContinue:()=>false}),{code:'PLUGIN_COMMUNICATION_PERMISSION_CHANGED'});
  assert.equal(f.c.runs.get(binding.run_id).grant.active,false);
  const current=f.c.runs.get(binding.run_id).grant.generation;
  await f.c.workflow.grant(f.o,'running',{expectedGeneration:current,canContinue:()=>true});
  assert.equal(f.c.runs.get(binding.run_id).grant.active,true);
});
test('combined claim persists one send intent and cannot be repeated after a lost response',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);const b=await f.bind(f.c,e);
  const message=await queue(f.c,e);
  const receipt=await f.c.claimReady({...b,message_id:message.message_id});
  assert.ok(receipt.delivery_attempt_id);assert.ok(receipt.expires_at>0);
  assert.equal(f.c.runs.get(b.run_id).messages[0].intent,true);
  await assert.rejects(f.c.claimReady({...b,message_id:message.message_id}),{code:'PLUGIN_COMMUNICATION_CLAIM_DENIED'});
  const restored=await f.create();
  assert.equal(restored.runs.get(b.run_id).messages[0].delivery,'unknown');
  assert.equal(restored.runs.get(b.run_id).events.filter(e=>e.event_type==='send.intent').length,1);
});
test('wait renews only a live lease in its current generation',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);const b=await f.bind(f.c,e);
  await queue(f.c,e);const initial=f.c.panels.get(b.panel_instance_id).expiresAt;
  f.advance(59000);
  const response=await f.c.wait({...b,after_seq:0});
  assert.equal(response.expires_at,initial+59000);
  f.advance(61000);
  await assert.rejects(f.c.wait({...b,after_seq:response.seq}),{code:'PLUGIN_COMMUNICATION_STOPPED'});
  await f.sync(f.c,b);await f.c.workflow.grant(f.o,'paused');
  await assert.rejects(f.c.wait({...b,after_seq:response.seq}),{code:'PLUGIN_COMMUNICATION_STOPPED'});
});
test('batched diagnostic and sibling events do not wake a delivery waiter or scheduler',async t=>{
  const f=await fixture(t),a=f.target('a'),b=f.target('b');await f.c.workflow.grant(f.o);
  const first=await f.bind(f.c,a),second=await f.bind(f.c,b),run=()=>f.c.runs.get(first.run_id);
  f.c.waitMs=1000;let changes=0,finished=false;f.c.onChange=()=>changes++;
  await new Promise(resolve=>setImmediate(resolve));changes=0;
  const waiting=f.c.wait({...first,after_seq:run().events.length}).then(value=>{finished=true;return value;});
  await new Promise(resolve=>setTimeout(resolve,10));
  const events=[1,2].map(n=>({event_id:randomUUID(),client_sequence:n,client_time:new Date().toISOString(),
    duration_ms:n,event_type:'rpc.completed',operation:'status',operation_ms:12}));
  await f.c.telemetryBatch({...second,events});await f.c.telemetryBatch({...second,events});
  assert.equal(changes,0);assert.equal(run().events.filter(e=>e.event_type==='rpc.completed').length,2);
  assert.equal(run().events.find(e=>e.event_type==='rpc.completed').duration_kind,'since-panel-mount');
  await queue(f.c,b,'sibling');await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(finished,false);
  const own=await queue(f.c,a,'own');assert.equal((await waiting).message_id,own.message_id);
});
test('slow full Kit roster cannot delay a sibling claim and panel projection performs no roster reads',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');
  await f.c.workflow.grant(f.o);const o=await f.bind(f.c,f.o),b=await f.bind(f.c,e);
  const message=await queue(f.c,e);let entered,release,reads=0;
  const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r),original=kit.status;
  kit.status=async(...args)=>{reads++;entered();await gate;return original(...args);};
  const slow=f.c.status(o);await started;
  try{
    const panel=await f.c.status({...o,view:'panel'});
    assert.equal(panel.assignments.length,1);assert.equal(reads,1);
    const claimed=await f.c.claimReady({...b,message_id:message.message_id});
    assert.ok(claimed.delivery_attempt_id);
    assert.ok(f.c.runs.get(b.run_id).events.some(e=>e.event_type==='operation.timing'&&e.operation==='claimReady'));
  }finally{release();await slow;}
});
test('bounded backend timing records explicit gaps without waking functional consumers',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);
  const b=await f.bind(f.c,e);let changes=0;
  await new Promise(resolve=>setImmediate(resolve));f.c.onChange=()=>changes++;
  for(let n=0;n<70;n++)f.c.recordKitTiming(e,{operation:'status',elapsed_ms:n,ok:true});
  assert.equal(f.c.timings.length,64);
  await f.c.telemetryBatch({...b,events:[{event_id:randomUUID(),client_sequence:1,
    client_time:new Date().toISOString(),duration_ms:1,event_type:'rpc.completed',operation:'status',operation_ms:1}]});
  const events=f.c.runs.get(b.run_id).events;
  assert.equal(events.filter(e=>e.event_type==='kit.timing').length,64);
  assert.equal(events.find(e=>e.event_type==='diagnostic.gap').dropped,6);
  assert.equal(changes,0);assert.equal(f.c.timingDrops,0);assert.equal(f.c.timings.length,0);
});
test('claim distinguishes draft, manual stop and active commands; structured denial never authorizes verify',async t=>{
  const f=await fixture(t),e=f.target('e');await f.c.workflow.grant(f.o);
  const b=await f.bind(f.c,e),message=await queue(f.c,e),input={...b,message_id:message.message_id};
  const page=f.pages.get('e');
  for(const [field,reason] of [['draftPresent','recipient-draft'],['manualStopped','manual-stop']]){
    page[field]=true;
    assert.deepEqual(await f.c.claim(input),{deferred:true,reason});
    await f.c.claim(input);
    assert.equal(f.c.runs.get(b.run_id).events.filter(e=>e.event_type==='claim.deferred'&&e.reason===reason).length,1);
    page[field]=false;
  }
  f.c.workflow.admission=async()=>({allowed:false,reason:'commands-active'});
  assert.deepEqual(await f.c.claim(input),{deferred:true,reason:'commands-active'});
  f.c.workflow.admission=async()=>({allowed:true});
  const claimed=await f.c.claim(input);
  f.c.workflow.admission=async()=>({allowed:false,reason:'commands-active'});
  await assert.rejects(f.c.verify({...input,...claimed}),{code:'PLUGIN_COMMUNICATION_BUSY'});
});
test('panel status exposes own addressed text and all O assignments without marking messages read',async t=>{
  const f=await fixture(t,undefined,dialogueKitFixture()),e=f.target('e'),other=f.target('other');
  await f.c.workflow.grant(f.o);const o=await f.bind(f.c,f.o),a=await f.bind(f.c,e),b=await f.bind(f.c,other);
  const roster=await f.c.roster({metadata:meta('o')});
  for(const item of roster.assignments)await f.c.assignmentSend({metadata:meta('o'),recipient:item.recipient_ref,attempt:1,
    kind:'task',body:'Private task '+item.task_id,idempotency_key:item.task_id});
  const ov=await f.c.status(o),av=await f.c.status(a),bv=await f.c.status(b);
  assert.equal(ov.assignments.length,2);assert.equal(av.assignments.length,1);
  assert.ok(ov.messages.every(m=>!m.read&&m.preview.startsWith('Private task')));
  assert.equal(av.messages.length,1);assert.equal(bv.messages.length,1);
  assert.equal(av.messages[0].preview,'Private task t-e');assert.equal(bv.messages[0].preview,'Private task t-other');
  assert.ok(av.assignments[0].channel.sdk);assert.equal(JSON.stringify(av).includes('Private task t-other'),false);
});
function dialogueKitFixture(){
  const effects=new Map(),states=new Map();let calls=0;
  return {effects,get calls(){return calls;},
    status:async(_target,id)=>({dialogue_version:1,contract_digest:'fixture-contract',dialogue:states.get(id)??{attempt:1}}),
    apply:async(target,input)=>{if(effects.has(input.operation_id))return {...effects.get(input.operation_id),duplicate:true};
      calls++;const receipt={ok:true,operation_id:input.operation_id,message_id:input.message_id,assignment_id:input.assignment_id,
        task_id:'t-'+input.assignment_id.slice(2),attempt:input.attempt,kind:input.kind};
      effects.set(input.operation_id,receipt);states.set(input.assignment_id,{attempt:input.attempt,grant:input.kind==='task'?{message_id:input.message_id}:null});
      return receipt;}};
}
test('agreed plan packets bind two E before readiness, survive Continue and never recreate a published task',async t=>{
  const kit=dialogueKitFixture(),base=kit.status,sha=text=>createHash('sha256').update(text).digest('hex');
  let foreign=false;
  kit.status=async(target,id)=>({...await base(target,id),...(target.role==='O'?{prepared_task:{version:1,
    project_id:'p',scope_id:'s',author_session_id:foreign?'foreign':'o',body:'Agreed '+id,body_sha256:sha('Agreed '+id),
    contract_digest:sha(id),contexts:[{source:'selected.md',text:'Exact immutable bytes',sha256:sha('Exact immutable bytes'),bytes:21,commit:null}],
    dependency_task_ids:[],dependency_facts:[]}}:{})});
  const f=await fixture(t,undefined,kit),a=f.target('a'),b=f.target('b');
  await f.c.workflow.grant(f.o);const o=await f.bind(f.c,f.o);
  for(const worker of [b,a,a])assert.equal(await f.c.assignment.bindPrepared(worker),true,'known author packet waits for reservation');
  assert.equal(Object.keys(f.c.runs.get(o.run_id).assignment_intents??{}).length,0);
  assert.equal(f.c.runs.get(o.run_id).events.filter(e=>e.event_type==='operation.denied').length,0);
  await f.c.reserve(a);await f.c.reserve(b);
  const cancelled=f.target('cancelled'),invitation=await f.c.reserve(cancelled);
  await f.c.mutate('revokeEnrollment',{run_id:o.run_id,ticket_hash:invitation.ticket_hash,
    owner:{project_id:'p',local_session_id:'cancelled',request_id:null,attempt_generation:null},reason:'fixture'});
  await assert.rejects(f.c.assignment.bindPrepared(cancelled),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_REVOKED'});
  foreign=true;await assert.rejects(f.c.assignment.bindPrepared(a),{code:'PLUGIN_COMMUNICATION_STALE_DRAFT'});foreign=false;
  assert.equal(await f.c.assignment.bindPrepared(a),true);assert.equal(await f.c.assignment.bindPrepared(b),true);
  assert.equal(kit.calls,0,'binding and authorizing precede SDK readiness');
  await f.c.assignment.bindPrepared(a);
  assert.equal(Object.keys(f.c.runs.get(o.run_id).assignment_intents).length,2,'same preparation has one intent');
  await f.c.workflow.grant(f.o,'paused');await f.bind(f.c,a);
  await f.c.assignment.bindPrepared(a);assert.equal(kit.calls,0,'pause cannot be bypassed by agreed content');
  const restarted=await f.create();await restarted.workflow.grant(f.o);await f.bind(restarted,a);
  await restarted.assignment.bindPrepared(a);assert.equal(kit.calls,1,'Continue mechanically authorizes the same immutable packet');
  await restarted.assignment.bindPrepared(a);assert.equal(kit.calls,1,'published task is not repeated');
  const apply=kit.apply;let interrupted=true;
  kit.apply=async(...args)=>{const receipt=await apply(...args);if(interrupted){interrupted=false;throw Object.assign(Error('after Kit before WAL'),{code:'TEST_INTERRUPTION'});}return receipt;};
  await f.bind(restarted,b);await restarted.assignment.bindPrepared(b);assert.equal(kit.calls,2);
  assert.equal(restarted.runs.get(o.run_id).messages.filter(m=>m.kind==='task').length,1,'no publication is invented after the interrupted Kit response');
  const recovered=await f.create();await recovered.workflow.grant(f.o);await f.bind(recovered,b);
  await recovered.assignment.bindPrepared(b);assert.equal(kit.calls,2,'the existing idempotent Kit effect is reconciled across restart');
  const run=recovered.runs.get(o.run_id),tasks=run.messages.filter(m=>m.kind==='task');
  assert.equal(tasks.length,2);assert.ok(tasks.every(m=>m.sender_role==='O'&&m.delivery==='pending'&&!m.read));
  const aBinding=await f.bind(recovered,a),claim=await recovered.claimReady({...aBinding,message_id:tasks.find(m=>m.assignment_id==='a-a').message_id});
  await recovered.report({...aBinding,message_id:claim.message_id??tasks.find(m=>m.assignment_id==='a-a').message_id,
    delivery_attempt_id:claim.delivery_attempt_id,outcome:'unknown'});
  await recovered.assignment.bindPrepared(a);
  assert.equal(recovered.runs.get(o.run_id).messages.find(m=>m.assignment_id==='a-a'&&m.kind==='task').delivery,'unknown');
  assert.equal(recovered.runs.get(o.run_id).messages.filter(m=>m.kind==='task').length,2);assert.equal(kit.calls,2,'UNKNOWN never creates a second Kit effect');
});
test('one O turn explicitly reads queued preparations and authorizes both, without forged receipts or a second SDK turn',async t=>{
  const kit=dialogueKitFixture(),base=kit.status;
  kit.status=async(target,id)=>({...await base(target,id),...(target.role==='O'?{task_brief:'Draft '+id}:{})});
  const f=await fixture(t,undefined,kit),a=f.target('a'),b=f.target('b');
  await f.c.workflow.grant(f.o);const o=await f.bind(f.c,f.o);
  await f.c.reserve(a);await f.c.reserve(b);
  const enqueue=target=>f.c.workflow.enqueue(f.o,{key:'prepare:'+target.assignment_id,kind:'recovery',text:'Prepare',
    subject:{assignment_id:target.assignment_id,task_id:target.task_id},attempt:1});
  const first=await enqueue(a),second=await enqueue(b);
  const one=await f.c.readMessage({metadata:meta('o'),message_id:first.message_id});
  assert.equal(one.task_brief,'Draft a-a');assert.equal(one.preparation_queue.length,1);
  assert.equal(one.preparation_queue[0].message_id,second.message_id);
  assert.equal(f.c.runs.get(o.run_id).messages.find(m=>m.message_id===second.message_id).read,false);
  const two=await f.c.readMessage({metadata:meta('o'),message_id:second.message_id});
  for(const m of [one,two])await f.c.assignmentPrepare({metadata:meta('o'),recipient:m.recipient_ref,attempt:1,
    body:m.task_brief+' verified by O',dispatch_when_ready:true,idempotency_key:m.message_id});
  await f.bind(f.c,a);await f.bind(f.c,b);await f.c.assignment.reconcile('p','s');
  const run=f.c.runs.get(o.run_id),tasks=run.messages.filter(m=>m.kind==='task');
  assert.equal(tasks.length,2);assert.ok(tasks.every(m=>m.sender_role==='O'));
  assert.equal(run.events.filter(e=>e.event_type==='send.intent').length,0,'direct read does not forge an SDK send');
  assert.equal(Object.hasOwn((await f.c.assignmentStatus({metadata:meta('a')})).assignments[0],'task_brief'),false);
  assert.equal((await f.c.assignmentStatus({metadata:meta('o')})).assignments[0].task_brief,'Draft a-a');
});
test('O prepares while E is unbound; only explicit dispatch after live channel grants work once',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.c.reserve(e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const input={metadata:meta('o'),recipient,attempt:1,body:'Selected task',contexts:[{source:'contract',text:'Only necessary context'}],idempotency_key:'draft'};
  const draft=await f.c.assignmentPrepare(input);
  assert.equal(draft.phase,'draft');assert.equal(kit.calls,0);
  await f.c.assignment.reconcile('p','s');assert.equal(kit.calls,0);
  await assert.rejects(f.c.assignmentDispatch({metadata:meta('o'),draft_id:draft.draft_id}),{code:'PLUGIN_COMMUNICATION_CHANNEL_NOT_READY'});
  await assert.rejects(f.c.assignmentSend({...input,kind:'task',idempotency_key:'early'}),{code:'PLUGIN_COMMUNICATION_CHANNEL_NOT_READY'});
  const b=await f.bind(f.c,e);
  const restored=await f.create();await restored.workflow.grant(f.o);await f.bind(restored,e);
  const status=await restored.assignmentStatus({metadata:meta('o')});
  assert.equal(status.pending_intents[0].draft_id,draft.draft_id);
  await assert.rejects(restored.assignmentDispatch({metadata:meta('e'),draft_id:draft.draft_id}),{code:'PLUGIN_COMMUNICATION_ROLE'});
  const sent=await restored.assignmentDispatch({metadata:meta('o'),draft_id:draft.draft_id});
  assert.equal(kit.calls,1);
  assert.equal((await restored.assignmentDispatch({metadata:meta('o'),draft_id:draft.draft_id})).message_id,sent.message_id);
  assert.equal(kit.calls,1);
  const read=await restored.readMessage({metadata:meta('e'),message_id:sent.message_id});
  assert.equal((await restored.content({metadata:meta('e'),message_id:sent.message_id,context_ref:read.context_ref,part:0})).text,'Selected task');
});
test('draft survives pause but rejects changed requirements before grant',async t=>{
  const kit=dialogueKitFixture(),original=kit.status;let digest='original';
  kit.status=async(...args)=>({...await original(...args),contract_digest:digest});
  const f=await fixture(t,undefined,kit),e=f.target('e');await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const d=await f.c.assignmentPrepare({metadata:meta('o'),recipient,attempt:1,body:'Task',idempotency_key:'d'});
  await f.c.workflow.grant(f.o,'paused');
  await assert.rejects(f.c.assignmentDispatch({metadata:meta('o'),draft_id:d.draft_id}),{code:'PLUGIN_COMMUNICATION_CHANNEL_NOT_READY'});
  await f.c.workflow.grant(f.o);await f.sync(f.c,b);digest='changed';
  await assert.rejects(f.c.assignmentDispatch({metadata:meta('o'),draft_id:d.draft_id}),{code:'PLUGIN_COMMUNICATION_STALE_DRAFT'});
  assert.equal(kit.calls,0);
});
test('explicit prepare authorization dispatches on readiness without another O call, suppressing only unsent preparation',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.c.reserve(e);
  const prepare=await f.c.workflow.enqueue(f.o,{key:'prepare:a-e',kind:'recovery',text:'Prepare this task',
    subject:{assignment_id:'a-e',task_id:'t-e'},attempt:1});
  const message=await f.c.readMessage({metadata:meta('o'),message_id:prepare.message_id});
  assert.equal(message.inline_context.complete,true);assert.equal(message.inline_context.text,'Prepare this task');
  assert.equal(message.inline_context.sha256,message.context_ref);
  assert.match(message.instructions,/повторно его не читайте/);
  const ready=await f.c.workflow.enqueue(f.o,{key:'ready:a-e:1',kind:'ready',text:'Ready',
    subject:{assignment_id:'a-e',task_id:'t-e'},attempt:1});
  const input={metadata:meta('o'),recipient:message.recipient_ref,attempt:1,body:'Exact selected task',idempotency_key:'auto',
    dispatch_when_ready:true};
  const prepared=await f.c.assignmentPrepare(input);
  assert.equal(prepared.phase,'authorized');assert.equal(prepared.published,false);assert.equal(kit.calls,0);
  const run=()=>[...f.c.runs.values()][0];
  assert.equal(run().messages.find(m=>m.message_id===prepare.message_id).reply_observed,false,'read notification still needs yield and actual end');
  assert.equal(run().messages.find(m=>m.message_id===ready.message_id).delivery,'superseded');
  await f.c.assignment.reconcile('p','s');assert.equal(kit.calls,0);
  await f.bind(f.c,e);
  await f.c.assignment.reconcile('p','s');assert.equal(kit.calls,1);
  const delivered=run().messages.find(m=>m.message_id===prepared.message_id);
  assert.equal(delivered.sender_role,'O');assert.equal(delivered.kind,'task');assert.equal(delivered.delivery,'pending');
  const lateReady=await f.c.workflow.enqueue(f.o,{key:'ready:a-e:late',kind:'ready',text:'Late ready producer',
    subject:{assignment_id:'a-e',task_id:'t-e'},attempt:1});
  assert.equal(lateReady.delivery,'superseded','a concurrent ready producer cannot enqueue a needless O turn');
  await f.c.assignment.reconcile('p','s');
  assert.equal((await f.c.assignmentPrepare(input)).message_id,prepared.message_id);assert.equal(kit.calls,1);
});
test('pause and restart revoke unconsumed authorization; Continue alone never grants work',async t=>{
  for(const restart of [false,true]){
    const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');
    await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.c.reserve(e);
    const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
    const draft=await f.c.assignmentPrepare({metadata:meta('o'),recipient,attempt:1,body:'Selected',idempotency_key:'auto',dispatch_when_ready:true});
    // Authorized before the executor channel is ready: O is told it is not delivered.
    assert.equal(draft.published,false);assert.equal(draft.delivered,false);
    assert.equal(draft.delivery_stage,'authorized_waiting_channel');assert.match(draft.delivery_note,/ещё не доставлено/);
    const c=restart?await f.create():f.c;
    if(!restart)await c.workflow.grant(f.o,'paused');
    await c.workflow.grant(f.o);await f.bind(c,e);
    await c.assignment.reconcile('p','s');assert.equal(kit.calls,0);
    assert.equal((await c.assignmentStatus({metadata:meta('o')})).pending_intents[0].phase,'needs_confirmation');
    const sent=await c.assignmentDispatch({metadata:meta('o'),draft_id:draft.draft_id,when_ready:true});
    assert.equal(kit.calls,1);
    // Published is not read: the receipt names its proven stage instead of a bare pending.
    assert.equal(sent.delivered,false);assert.ok(['saved','sending','accepted'].includes(sent.delivery_stage),sent.delivery_stage);
    assert.ok(sent.delivery_note);
  }
});
test('changed contract or attempt invalidates authorized draft before any effect',async t=>{
  for(const changed of [{contract_digest:'changed'},{dialogue:{attempt:2}}]){
    const kit=dialogueKitFixture(),original=kit.status,f=await fixture(t,undefined,kit),e=f.target('e');
    await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.c.reserve(e);
    const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
    await f.c.assignmentPrepare({metadata:meta('o'),recipient,attempt:1,body:'Old',idempotency_key:'auto',dispatch_when_ready:true});
    kit.status=async(...args)=>({...await original(...args),...changed});
    await f.bind(f.c,e);await f.c.assignment.reconcile('p','s');
    assert.equal(kit.calls,0);
    assert.equal((await f.c.assignmentStatus({metadata:meta('o')})).pending_intents[0].phase,'needs_confirmation');
  }
});
test('permission Stop serializes with an already authorized effect; SDK UNKNOWN remains untouched',async t=>{
  const kit=dialogueKitFixture(),apply=kit.apply,f=await fixture(t,undefined,kit),e=f.target('e');
  await f.c.workflow.grant(f.o);const o=await f.bind(f.c,f.o);await f.bind(f.c,e);
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const ready=await f.c.workflow.enqueue(f.o,{key:'ready:a-e:1',kind:'ready',text:'Ready',
    subject:{assignment_id:'a-e',task_id:'t-e'},attempt:1});
  const claim=await f.c.claim({...o,message_id:ready.message_id});
  await f.c.verify({...o,message_id:ready.message_id,delivery_attempt_id:claim.delivery_attempt_id});
  await f.c.report({...o,message_id:ready.message_id,delivery_attempt_id:claim.delivery_attempt_id,outcome:'unknown'});
  let entered,release;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  kit.apply=async(...args)=>{entered();await gate;return apply(...args);};
  const sent=f.c.assignmentPrepare({metadata:meta('o'),recipient,attempt:1,body:'Exact',idempotency_key:'auto',dispatch_when_ready:true});
  await started;
  const stop=f.c.workflow.grant(f.o,'paused');release();await sent;await stop;
  assert.equal(kit.calls,1);
  const run=[...f.c.runs.values()][0],unknown=run.messages.find(m=>m.message_id===ready.message_id);
  assert.equal(unknown.delivery,'unknown');assert.equal(unknown.reply_observed,false);assert.ok(!unknown.superseded);
  assert.equal(run.grant.active,false);
});
test('a slow unbound executor does not delay dispatch to a ready sibling; old Kit cannot prepare',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),slow=f.target('slow'),fast=f.target('fast');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.c.reserve(slow);await f.bind(f.c,fast);
  const assignments=(await f.c.roster({metadata:meta('o')})).assignments;
  const drafts=[];
  for(const a of assignments)drafts.push(await f.c.assignmentPrepare({metadata:meta('o'),recipient:a.recipient_ref,attempt:1,
    body:'Selected '+a.task_id,idempotency_key:a.assignment_id}));
  await assert.rejects(f.c.assignmentDispatch({metadata:meta('o'),draft_id:drafts[0].draft_id}),{code:'PLUGIN_COMMUNICATION_CHANNEL_NOT_READY'});
  await f.c.assignmentDispatch({metadata:meta('o'),draft_id:drafts[1].draft_id});assert.equal(kit.calls,1);
  kit.status=async()=>({dialogue_version:1,dialogue:{attempt:1}});
  await assert.rejects(f.c.assignmentPrepare({metadata:meta('o'),recipient:assignments[0].recipient_ref,attempt:1,
    body:'Other',idempotency_key:'old-kit'}),{code:'PLUGIN_COMMUNICATION_CAPABILITY'});
});
test('working API derives author, addresses distinct assignments and sends immutable selected context',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e'),other=f.target('other');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);await f.bind(f.c,e);await f.bind(f.c,other);
  const roster=await f.c.roster({metadata:meta('o')}),recipient=roster.assignments.find(a=>a.task_id==='t-e').recipient_ref;
  assert.notEqual(recipient,roster.assignments.find(a=>a.task_id==='t-other').recipient_ref);
  const text='Выбранный контракт 😀\n'.repeat(2000),input={metadata:meta('o'),recipient,attempt:1,kind:'task',
    body:'Реализуй только модуль e',contexts:[{source:'contract-e.md',commit:'a'.repeat(40),text}],idempotency_key:'task-e'};
  const sent=await f.c.assignmentSend(input),read=await f.c.readMessage({metadata:meta('e'),message_id:sent.message_id});
  assert.equal(read.sender_role,'O');assert.equal(read.assignment_id,'a-e');assert.equal(kit.calls,1);
  assert.equal(read.role_protocol,ROLE_PROTOCOL_VERSION);assert.match(read.instructions,/ДИАЛОГ 1/);
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
  assert.equal(answer.sender_role,'E');assert.match(answer.instructions,/старого brief-only/);
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
  await restored.workflow.grant(f.o);await f.bind(restored,e);
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
  assert.deepEqual(f.c.workflow.progress('e'),{registered:false,sdk:false,permitted:false,generation:null,blocked:false,initial:null});
  const invitation=await f.c.reserve(e);await f.c.enroll(invitation.enrollment_ticket,meta('e'));
  assert.equal(f.c.workflow.progress('e').registered,true);assert.equal(f.c.workflow.progress('e').sdk,false);
  const b=await f.bind(f.c,e),first=await queue(f.c,e);const run=f.c.runs.get(b.run_id),seq=run.events.length;
  assert.deepEqual(f.c.workflow.progress('e'),{registered:true,sdk:true,permitted:true,generation:b.permission_generation,blocked:false,
    incoming:{message_id:first.message_id,created_at:run.messages.find(m=>m.message_id===first.message_id).created_at,delivery_at:null,read_at:null,handled_at:null,
      kind:'assignment-start',task_id:e.task_id,sender_role:'backend',recipient_role:'E',service_action:null,read:false,handled:false,delivery:'pending',reason:null},
    initial:{message_id:first.message_id,delivery:'pending',read:false,handled:false,physical_complete:false}});
  assert.equal(run.events.length,seq,'projection creates no telemetry or grants');
  await delivered(f,b,first.message_id);assert.deepEqual(f.c.workflow.progress('e').initial,{message_id:first.message_id,delivery:'accepted',read:true,handled:false,physical_complete:true});
  f.advance(60001);assert.equal(f.c.workflow.progress('e').sdk,false);
  await f.sync(f.c,b);assert.equal(f.c.workflow.progress('e').sdk,true);
  await f.c.workflow.grant(f.o,'paused');assert.equal(f.c.workflow.progress('e').sdk,false,'old generation is not a current SDK lease');
  f.targets.set('e',{...e,assignment_id:'replacement'});
  assert.deepEqual(f.c.workflow.progress('e'),{registered:false,sdk:false,permitted:false,generation:null,blocked:false,initial:null});
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
test('terminal acceptance survives verified cleanup but cannot authorize another API call',async t=>{
  const kit=dialogueKitFixture(),f=await fixture(t,undefined,kit),e=f.target('e');
  await f.c.workflow.grant(f.o);await f.bind(f.c,f.o);const b=await f.bind(f.c,e);
  const result=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',attempt:1,kind:'result',
    body:'Done',source_commit:'a'.repeat(40),idempotency_key:'result'});
  assert.deepEqual(f.c.workflow.progress('e').result,{delivery:'pending',read:false});
  await f.c.readMessage({metadata:meta('o'),message_id:result.message_id});
  assert.equal(f.c.workflow.progress('e').result.read,true,'executor progress follows the actual orchestrator receipt');
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const acceptance=await f.c.assignmentSend({metadata:meta('o'),recipient,attempt:1,kind:'acceptance',
    result_id:result.message_id,source_commit:'a'.repeat(40),body:'Accepted',idempotency_key:'acceptance'});
  await sdk(f,b,acceptance.message_id);await f.c.readMessage({metadata:meta('e'),message_id:acceptance.message_id});
  const page=f.pages.get('e');page.busy=true;page.stopped=false;
  await f.c.assignmentYield({metadata:meta('e'),message_ids:[acceptance.message_id],reason:'handled'});
  f.targets.delete('e');
  const input={run_id:b.run_id,message_id:acceptance.message_id};
  for(let i=0;i<3;i++)await assert.rejects(f.c.mutate('observed',input),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
  assert.equal(f.c.runs.get(b.run_id).events.filter(e=>e.event_type==='operation.denied'&&e.operation==='observed').length,1);
  f.c.verifyTerminal=async(target,message)=>target===e||target.local_session_id==='e'&&message.message_id===acceptance.message_id;
  page.busy=false;page.stopped=true;page.assistantRevision++;
  await f.c.mutate('observed',input);f.advance(600);await f.c.mutate('observed',input);
  assert.equal(f.c.runs.get(b.run_id).messages.find(m=>m.message_id===acceptance.message_id).reply_observed,true);
  await assert.rejects(f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',attempt:1,kind:'question',
    body:'New work',idempotency_key:'forbidden'}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
});
test('completed grant remains complete after backend restart',async t=>{
  const f=await fixture(t);await f.c.workflow.grant(f.o);const o=await f.bind(f.c,f.o);
  await f.c.workflow.grant(f.o,'complete');f.c.dispose();await f.c.tail;
  const next=await f.create(),grant=next.runs.get(o.run_id).grant;
  assert.equal(grant.phase,'complete');assert.equal(grant.active,false);
});
test('Kit transport acknowledgement follows physical receipt and retries pending cleanup',async t=>{
  const kit=dialogueKitFixture();let pendingCleanup=true,calls=0;
  kit.status=async()=>({dialogue_version:1,phase:'INTEGRATED',dialogue:{attempt:1}});
  kit.close=async(_target,input)=>{calls++;return {ok:true,...input,cleanup:{status:pendingCleanup?'PENDING':'DONE',reason:'executor-command-active'}};};
  const f=await fixture(t,undefined,kit),e=f.target('e');await f.c.workflow.grant(f.o);
  const o=await f.bind(f.c,f.o),b=await f.bind(f.c,e);
  const result=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',attempt:1,kind:'result',body:'Done',idempotency_key:'r'});
  await f.c.readMessage({metadata:meta('o'),message_id:result.message_id});
  const recipient=(await f.c.roster({metadata:meta('o')})).assignments[0].recipient_ref;
  const a=await f.c.assignmentSend({metadata:meta('o'),recipient,attempt:1,kind:'acceptance',result_id:result.message_id,
    source_commit:'a'.repeat(40),body:'Accepted',idempotency_key:'a'});
  await sdk(f,b,a.message_id);await f.c.readMessage({metadata:meta('e'),message_id:a.message_id});
  const page=f.pages.get('e');page.busy=true;page.stopped=false;
  await f.c.assignmentYield({metadata:meta('e'),message_ids:[a.message_id],reason:'handled'});
  await f.c.assignment.reconcile('p','s');assert.equal(calls,0,'yield is not physical completion');
  page.busy=false;page.stopped=true;page.assistantRevision++;
  await observe(f,'e');f.advance(600);await observe(f,'e');
  await f.c.assignment.reconcile('p','s');
  assert.equal(f.c.runs.get(o.run_id).messages.find(m=>m.message_id===a.message_id).kit_transport_closed,undefined);
  pendingCleanup=false;await f.c.assignment.reconcile('p','s');await f.c.assignment.reconcile('p','s');
  assert.equal(calls,2);assert.equal(f.c.runs.get(o.run_id).messages.find(m=>m.message_id===a.message_id).kit_transport_closed,true);
});
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
test('one O turn handles an SDK result and a queued result without another SDK send or false acceptance',async t=>{
  const f=await fixture(t,undefined,dialogueKitFixture());await f.c.workflow.grant(f.o);
  const o=await f.bind(f.c,f.o),ids=[];
  for(const id of ['e1','e2','e3']){
    await f.bind(f.c,f.target(id));
    ids.push((await f.c.assignmentSend({metadata:meta(id),recipient:'orchestrator',kind:'result',attempt:1,
      body:'Checked result',source_commit:'a'.repeat(40),idempotency_key:'result'})).message_id);
  }
  await sdk(f,o,ids[0]);const page=f.pages.get('o');page.busy=true;page.canSend=false;page.stopped=false;
  for(const id of ids.slice(0,2))await f.c.readMessage({metadata:meta('o'),message_id:id});
  await f.c.assignmentYield({metadata:meta('o'),message_ids:ids.slice(0,2),reason:'handled'});
  await observe(f,'o');f.advance(600);await observe(f,'o');
  assert.ok(f.c.runs.get(o.run_id).messages.every(m=>!m.reply_observed),'early yield cannot release any message');
  page.busy=false;page.canSend=true;page.stopped=true;page.commandsIdle=false;
  await observe(f,'o');f.advance(600);await observe(f,'o');
  assert.ok(f.c.runs.get(o.run_id).messages.every(m=>!m.reply_observed),'active commands keep both messages reserved');
  page.commandsIdle=true;await observe(f,'o');f.advance(600);
  // Exercise the bounded probe for the message that has no SDK deliveryGate.
  await f.c.mutate('observed',{run_id:o.run_id,message_id:ids[1]});
  const messages=f.c.runs.get(o.run_id).messages;
  assert.ok(messages.slice(0,2).every(m=>m.reply_observed));
  assert.equal(messages[1].delivery,'pending','direct read is not an SDK accepted report');
  assert.equal(messages[1].intent,undefined);
  assert.equal(messages[2].read,false);assert.equal(pending(f.c,o),ids[2]);
  assert.equal(f.c.runs.get(o.run_id).events.filter(e=>e.event_type==='send.intent').length,1);
});
test('legacy persisted direct read/yield recovers after restart and Continue with fresh restored idle, without resend',async t=>{
  const f=await fixture(t,undefined,dialogueKitFixture());await f.c.workflow.grant(f.o);
  const o=await f.bind(f.c,f.o);await f.bind(f.c,f.target('e'));
  const sent=await f.c.assignmentSend({metadata:meta('e'),recipient:'orchestrator',kind:'result',attempt:1,
    body:'Checked result',source_commit:'a'.repeat(40),idempotency_key:'result'});
  const page=f.pages.get('o');page.busy=true;page.stopped=false;page.canSend=false;
  await f.c.readMessage({metadata:meta('o'),message_id:sent.message_id});
  await f.c.assignmentYield({metadata:meta('o'),message_ids:[sent.message_id],reason:'handled'});
  f.c.dispose();await f.c.tail;const restored=await f.create();f.c=restored;
  page.documentId='restored-doc';page.busy=false;page.stopped=true;page.canSend=true;
  await observe(f,'o');assert.equal(restored.runs.get(o.run_id).messages[0].reply_observed,false,'restart does not authorize completion');
  await restored.workflow.grant(f.o);await f.bind(restored,f.o);
  await observe(f,'o');f.advance(600);await observe(f,'o');f.advance(600);await observe(f,'o');
  const run=restored.runs.get(o.run_id);assert.equal(run.messages[0].reply_observed,true);
  assert.equal(run.messages[0].delivery,'pending');assert.equal(run.events.filter(e=>e.event_type==='send.intent').length,0);
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
    assert.deepEqual(await f.c.claim({...b,message_id:first.message_id}),{deferred:true,reason:'recipient-unavailable'});
    f.pages.get(target.local_session_id).canSend=true;f.admission.set(target.local_session_id,false);
    assert.deepEqual(await f.c.claim({...b,message_id:first.message_id}),{deferred:true,reason:'admission-denied'});f.admission.set(target.local_session_id,true);
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
  assert.equal(value.role_protocol,ROLE_PROTOCOL_VERSION);assert.match(value.instructions,/РОЛЬ: ИСПОЛНИТЕЛЬ/);
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
  assert.deepEqual(await f.c.claim({...other,message_id:second.message_id}),{deferred:true,reason:'previous-message'});
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
test('a user choice reaches a chat without plan permission and carries the role of its recipient',async t=>{
  const f=await fixture(t),d=f.target('d','S');d.scope_id=null;
  const b=await f.bind(f.c,d);
  assert.equal((await f.c.status(b)).stopped,true,'no plan: nothing to deliver');
  await assert.rejects(f.c.workflow.enqueue(d,{key:'plain',kind:'continue',text:'Обычное сообщение'}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
  const message=await f.c.workflow.enqueue(d,{key:'choice:1',kind:'user-choice',text:'Выбор пользователя: «Оркестрация».',role:'planning'});
  const pending=await f.c.status(b);
  assert.equal(pending.stopped,false);assert.equal(pending.user_choice_pending,true);
  const waited=await f.c.wait({...(await f.sync(f.c,b)),after_seq:0});
  assert.equal(waited.message_id,message.message_id);assert.equal(waited.stopped,false);
  const claimed=await f.c.claimReady({...(await f.sync(f.c,b)),message_id:message.message_id});
  assert.ok(claimed.delivery_attempt_id);
  const read=await f.c.read({...b,message_id:message.message_id});
  assert.equal(read.kind,'user-choice');assert.equal(read.recipient_role,'planning');
  assert.match(read.instructions,/РОЛЬ: ПЛАНИРОВАНИЕ/);
});

test('a preplan choice without a user bubble releases two results after publication and Start',async t=>{
  const f=await fixture(t),o={...f.o,scope_id:null};f.targets.set('o',o);
  let b=await f.bind(f.c,o);const page=f.pages.get('o');page.turnId='';page.userTurnId='';
  const choice=await f.c.workflow.enqueue(o,{key:'preplan',kind:'user-choice',text:'Оркестрация',role:'planning'});
  await sdk(f,b,choice.message_id);await f.c.read({...b,message_id:choice.message_id});
  const run=()=>f.c.runs.get(b.run_id),msg=()=>run().messages.find(m=>m.message_id===choice.message_id);
  delete msg().read_page; // A choice persisted by 0.5.34 has only the delivery gate baseline.
  run().members[b.participant_id].deliveryGate={message_id:choice.message_id,documentId:page.documentId,
    observationSeq:1,assistantRevision:1,wait_reason:'confirming-idle'};
  f.c.workflow.turnProbes.set(choice.message_id,{runId:b.run_id,count:120,exhausted:true,timer:null});
  page.busy=true;page.stopped=false;page.canSend=false;f.advance(300000);
  assert.equal(msg().reply_observed,false,'read is not a fabricated end of the response');
  const published={...o,scope_id:'s'};f.targets.set('o',published);
  await f.c.workflow.grant(published);b=await f.sync(f.c,b);
  const results=await Promise.all(['T001','T002'].map(id=>f.c.workflow.enqueue(published,{key:id,kind:'result',text:id})));
  const progress=f.c.workflow.progress('o');
  assert.equal(progress.incoming.message_id,results[0].message_id);
  assert.equal(progress.blocker,undefined,'a read preplan choice no longer occupies the result lane');
  assert.doesNotMatch(JSON.stringify(progress),/Оркестрация|enrollment_ticket|conversation_key/,'projection contains only safe facts');
  assert.equal(pending(f.c,b),null,'the actual busy page still prevents sending');
  assert.equal(f.c.workflow.turnProbes.has(choice.message_id),false,'UI events do not poll for the response');
  page.busy=false;page.stopped=true;page.canSend=true;await observe(f,'o');
  assert.equal(msg().reply_observed,false);assert.equal(page.userMessagesRevision,1);
  assert.equal(f.c.workflow.progress('o').blocker,undefined,'the resolved gate is not a current blocker');
  for(const result of results){
    assert.equal(pending(f.c,b),result.message_id);await sdk(f,b,result.message_id);await f.c.read({...b,message_id:result.message_id});
    // Legacy result uses its original explicit native/revision evidence.
    page.assistantRevision++;page.userMessagesRevision++;await observe(f,'o');
  }
  assert.equal(run().messages.filter(m=>m.kind==='result'&&m.read).length,2);
  assert.equal(run().events.filter(e=>e.event_type==='send.intent').length,3);
});

test('user event completion preserves unknown, manual Stop, stale document and restart barriers',async t=>{
  for(const barrier of ['unknown','manual-stop','document','stale','restart']){
    const f=await fixture(t),b=await f.bind(f.c,f.o),page=f.pages.get('o');
    const choice=await f.c.workflow.enqueue(f.o,{key:barrier,kind:'user-choice',text:barrier});
    await sdk(f,b,choice.message_id,barrier==='unknown'?'unknown':'accepted');await f.c.read({...b,message_id:choice.message_id});
    if(barrier==='manual-stop')page.manualStopped=true;
    if(barrier==='document')page.documentId='other';
    if(barrier==='stale')page.stale=true;
    let c=f.c;
    if(barrier==='restart'){f.c.dispose();await f.c.tail;c=await f.create();page.documentId='restored';}
    page.assistantRevision+=10;
    for(let i=0;i<3;i++){c.observeSession('o');await c.tail;f.advance(600);}
    const run=c.runs.get(b.run_id);assert.equal(run.messages[0].reply_observed,false,barrier);
    assert.equal(run.events.filter(e=>e.event_type==='send.intent').length,1,barrier);
  }
});

test('a directly read UI decision settles delivery without inventing SDK acceptance or a reply',async t=>{
  const f=await fixture(t),b=await f.bind(f.c,f.o),page=f.pages.get('o');
  const choice=await f.c.workflow.enqueue(f.o,{key:'direct-choice',kind:'user-choice',text:'Выбор'});
  const read=await f.c.read({...b,message_id:choice.message_id});assert.match(read.instructions,/workflow_assignment_yield.*не требуются/);
  page.assistantRevision++;await observe(f,'o');f.advance(600);await observe(f,'o');
  const run=f.c.runs.get(b.run_id),message=run.messages[0];
  assert.equal(message.read,true);assert.equal(message.reply_observed,false);assert.equal(message.delivery,'pending');
  assert.equal(f.c.workflow.choicePending(run,run.members[b.participant_id]),false);
  assert.equal(f.c.workflow.turnProbes.size,0);
  assert.equal(run.events.filter(e=>e.event_type==='send.intent').length,0);
});

test('Review preference supersedes only unsent versions and keeps one notification across publication and restart',async t=>{
  let current='on';const f=await fixture(t,(_target,m)=>!m.ui_event||m.ui_event.id===current);
  const target={...f.o,scope_id:null};f.targets.set('o',target);let b=await f.bind(f.c,target);
  const enqueue=(c,id,enabled,revision,t=target)=>c.workflow.enqueue(t,{key:'review-policy:'+id,kind:'user-choice',text:'Review '+enabled,
    ui_event:{type:'review-preference',id,enabled,revision,recipient_session_id:'o'}});
  const on=await enqueue(f.c,'on',true,1);current='off';const off=await enqueue(f.c,'off',false,2);
  assert.equal((await f.c.claimReady({...b,message_id:on.message_id})).delivery_attempt_id,undefined);
  const args=await sdk(f,b,off.message_id);
  const read=await f.c.read({...b,message_id:off.message_id});
  assert.doesNotMatch(read.instructions,/РОЛЬ:/,'a policy event never downgrades an orchestrator to planning');
  assert.match(read.instructions,/не разрешение реализации/);
  const published={...target,scope_id:'s',dialogue_version:1};f.targets.set('o',published);await f.c.workflow.grant(published);
  f.c.dispose();await f.c.tail;const restored=await f.create();
  assert.equal((await enqueue(restored,'off',false,2,published)).message_id,off.message_id,'semantic identity survives a changed plan envelope');
  const run=restored.runs.get(b.run_id);assert.equal(run.events.filter(e=>e.event_type==='send.intent').length,1);
  assert.equal(run.messages.find(m=>m.message_id===on.message_id).superseded,true);
  await assert.rejects(restored.report({...args,outcome:'accepted'}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  assert.equal(run.messages.find(m=>m.message_id===off.message_id).delivery,'accepted');
});

test('an obsolete accepted policy event ends its response; an UNKNOWN event never authorizes the next send',async t=>{
  for(const outcome of ['accepted','unknown']){
    let current='on';const f=await fixture(t,(_target,m)=>!m.ui_event||m.ui_event.id===current),b=await f.bind(f.c,f.o);
    const send=(id,enabled,revision)=>f.c.workflow.enqueue(f.o,{key:'review-policy:'+id,kind:'user-choice',text:id,
      ui_event:{type:'review-preference',id,revision,enabled,recipient_session_id:'o'}});
    const on=await send('on',true,1);await sdk(f,b,on.message_id,outcome);
    current='off';const off=await send('off',false,2);
    const read=await f.c.read({...b,message_id:on.message_id});assert.equal(read.superseded,true);
    assert.doesNotMatch(read.instructions,/вызовите workflow_assignment_yield/);
    const page=f.pages.get('o');page.assistantRevision++;
    await observe(f,'o');f.advance(600);await observe(f,'o');
    assert.equal(pending(f.c,b),outcome==='accepted'?off.message_id:null,outcome);
    assert.equal(f.c.runs.get(b.run_id).events.filter(e=>e.event_type==='send.intent').length,1);
  }
});
