import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {PluginCommunication,COMMUNICATION_BUILD,COMMUNICATION_PROTOCOL} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
const meta=id=>({'openai/session':id});
async function fixture(t,currentMessage){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'workflow-channel-')));
  const targets=new Map(),pages=new Map(),admission=new Map(),instances=[];let now=100000;
  const create=async()=>{const c=new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,waitMs:5,
    resolveTarget:id=>targets.get(id),verifyTarget:async id=>targets.get(id),observe:target=>pages.get(target.local_session_id),
    admit:async target=>admission.get(target.local_session_id)!==false,currentMessage});instances.push(c);await c.ready;return c;};
  const c=await create();
  const target=(id,role='E')=>{const value={project_id:'p',scope_id:'s',local_session_id:id,origin_session_id:'o',role,
    assignment_id:role==='E'?'a-'+id:null,task_id:role==='E'?'t-'+id:null};targets.set(id,value);
    pages.set(id,{canSend:true,stopped:true,busy:false,documentId:'doc-'+id,turnId:'a0',userTurnId:'u0',assistantRevision:1,userMessagesRevision:1});return value;};
  const o=target('o','O');
  const bind=async(c,target)=>{const invite=await c.reserve(target),member=await c.enroll(invite.enrollment_ticket,meta(target.local_session_id));
    const input={...member,metadata:meta(target.local_session_id),panel_instance_id:randomUUID(),build_id:COMMUNICATION_BUILD,protocol_version:COMMUNICATION_PROTOCOL};
    await c.bind({...input,message_supported:true});return sync(c,input);};
  const sync=async(c,input)=>({...input,permission_generation:(await c.sync({...input,message_supported:true})).permission_generation});
  t.after(async()=>{for(const c of instances){c.dispose();await c.tail;}await fs.rm(directory,{recursive:true,force:true});});
  return {c,o,target,targets,pages,admission,bind,sync,create,directory,advance:ms=>now+=ms};
}
const queue=(c,target,key='start',text='Начни задачу')=>c.workflow.enqueue(target,{key,kind:'assignment-start',text});
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
  assert.equal(value.role_protocol,2);assert.match(value.instructions,/РОЛЬ: ИСПОЛНИТЕЛЬ/);
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
