import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {PluginCommunication} from '../src/control/plugin/communication.mjs';
import {localParticipantTarget} from '../src/control/plugin/enrollment.mjs';
import {PluginProjects} from '../src/control/plugin/service.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';

const metadata=id=>({'openai/session':'private-'+id,'openai/subject':'private-user'});
const target=(id,role='E')=>({project_id:'project',local_session_id:id,origin_session_id:'orchestrator',role,
  scope_id:'scope',assignment_id:role==='E'?'assignment-'+id:null,task_id:role==='E'?'task-'+id:null});
async function fixture(t) {
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-enrollment-'))),targets=new Map();let now=100000;
  const create=async()=>new PluginCommunication({store:await openCommunicationStore(directory),now:()=>now,
    resolveTarget:id=>targets.get(id)??null});
  const comm=await create();
  t.after(async()=>{comm.dispose();await comm.tail;await fs.rm(directory,{recursive:true,force:true});});
  return {comm,directory,targets,create,advance:ms=>{now+=ms;}};
}

const correlatedOwner=(scope,correlation)=>({project_id:scope.project_id,local_session_id:scope.local_session_id,...correlation});
test('same named working copies with a common project ID have distinct plugin recipients and histories',async t=>{
  const copies=['one','two'].map(id=>({projectId:'shared',workspaceId:id,name:'Same',workspace:'/copies/'+id,archivedAt:null,
    sessions:[{sessionId:id,role:'planning',archivedAt:null}]}));
  const projects={snapshot:()=>({projects:copies}),project:w=>copies.find(p=>p.workspace===w),
    inspect:async w=>({projectId:copies.find(p=>p.workspace===w).projectId})};
  const plugin=new PluginProjects({projects});t.after(()=>plugin.communication.dispose());
  assert.deepEqual(plugin.list().projects.map(p=>p.id),['one','two']);
  assert.throws(()=>plugin.project('shared'),{code:'PLUGIN_PROJECT_UNAVAILABLE'});
  assert.equal((await plugin.open('two')).sessions[0].id,'two');
  const target=await plugin.participantTarget('two');assert.equal(target.workspace_id,'two');
  const invite=await plugin.communication.reserve(target);await plugin.communication.enroll(invite.enrollment_ticket,metadata('two'));
  const c=plugin.communication,run=c.runs.get(invite.run_id);
  run.messages.push({message_id:'m',scope_id:'scope',kind:'result'});
  assert.equal(c.planMessages('shared','scope',copies[0]).length,0);
  assert.equal(c.planMessages('shared','scope',copies[1]).length,1);
  run.removed=true;assert.equal(c.planMessages('shared','scope',copies[1]).length,0);
});
test('an existing session binding cannot be used with another workspace identity',async t=>{
  const f=await fixture(t),scope={...target('own'),workspace_id:'copy-one',origin_workspace_id:'root-one'};
  f.targets.set('own',scope);const invite=await f.comm.reserve(scope);
  f.targets.set('own',{...scope,workspace_id:'copy-two'});
  await assert.rejects(f.comm.enroll(invite.enrollment_ticket,metadata('own')),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
});
test('correlated invitation revocation survives restart, rejects the same identity and cannot resume stage',async t=>{
  const f=await fixture(t),scope=target('cancelled');f.targets.set('cancelled',scope);
  const correlation={request_id:'request-cancelled',attempt_generation:'generation-one'},owner=correlatedOwner(scope,correlation);
  const invite=await f.comm.reserve(scope,correlation),ref={run_id:invite.run_id,ticket_hash:invite.ticket_hash};
  assert.match(invite.ticket_hash,/^[a-f0-9]{64}$/);
  await assert.rejects(f.comm.reserve(scope,correlation),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_EXISTS'});
  await f.comm.startup.stage(scope,{...correlation,text:'Immutable context'});
  await assert.rejects(f.comm.cancelStartup({...owner,local_session_id:'foreign'},ref),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_OWNER'});
  assert.equal((await f.comm.cancelStartup(owner,ref)).status,'revoked');
  assert.equal((await f.comm.cancelStartup(owner,ref)).status,'revoked','idempotent lost-response recovery');
  await assert.rejects(f.comm.enroll(invite.enrollment_ticket,metadata('cancelled')),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_REVOKED'});
  await assert.rejects(f.comm.startup.stage(scope,{...correlation,text:'Immutable context'}),{code:'PLUGIN_COMMUNICATION_STARTUP_CANCELLED'});
  f.targets.delete('cancelled');
  assert.equal((await f.comm.cancelStartup(owner,ref)).status,'revoked','revocation works after the target was retired');
  f.comm.dispose();await f.comm.tail;
  const recovered=await f.create();t.after(()=>recovered.dispose());await recovered.ready;
  await assert.rejects(recovered.enroll(invite.enrollment_ticket,metadata('cancelled')),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_REVOKED'});
  assert.equal(Object.keys(recovered.runs.get(invite.run_id).members).length,0);
});

test('enrollment winning cancellation retains binding, stops context and prevents a new URL ticket for that session',async t=>{
  const f=await fixture(t),scope=target('registered');f.targets.set('registered',scope);
  const correlation={request_id:'request-registered',attempt_generation:'generation-one'},owner=correlatedOwner(scope,correlation);
  const invite=await f.comm.reserve(scope,correlation),ref={run_id:invite.run_id,ticket_hash:invite.ticket_hash};
  await f.comm.startup.stage(scope,{...correlation,text:'Context'});
  const joined=await f.comm.enroll(invite.enrollment_ticket,metadata('registered'));
  assert.equal((await f.comm.enrollmentEvidence(ref,owner)).participant_id,joined.participant_id);
  const result=await f.comm.cancelStartup(owner,ref);
  assert.equal(result.status,'registered-stopped');assert.equal(result.participant_id,joined.participant_id);
  const message=f.comm.runs.get(invite.run_id).messages.find(m=>m.request_id===correlation.request_id);
  await assert.rejects(f.comm.startupOpen({metadata:metadata('registered'),message_id:message.message_id}),{code:'PLUGIN_COMMUNICATION_STARTUP_CANCELLED'});
  assert.equal(f.comm.runs.get(invite.run_id).members[joined.participant_id].target.local_session_id,scope.local_session_id);
  await assert.rejects(f.comm.reserve(scope,{request_id:'new-request',attempt_generation:'generation-two'}),{code:'PLUGIN_COMMUNICATION_BINDING'});
  const legacy=await f.comm.reserve(scope);
  await assert.rejects(f.comm.enroll(legacy.enrollment_ticket,metadata('foreign-conversation')),{code:'PLUGIN_COMMUNICATION_BINDING'});
  await assert.rejects(f.comm.enrollmentEvidence(ref,{...owner,request_id:'other-request'}),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_OWNER'});
});

test('registration evidence waits for WAL persistence rather than exposing an in-flight member',async t=>{
  const f=await fixture(t),scope=target('durable');f.targets.set('durable',scope);
  const correlation={request_id:'durable-request',attempt_generation:'generation-one'},owner=correlatedOwner(scope,correlation);
  const invite=await f.comm.reserve(scope,correlation),store=f.comm.store;let entered,release,settled=false;
  const writing=new Promise(resolve=>{entered=resolve;});
  f.comm.store={...store,append:async(...args)=>{entered();await new Promise(resolve=>{release=resolve;});return store.append(...args);}};
  const joining=f.comm.enroll(invite.enrollment_ticket,metadata('durable'));await writing;
  const proof=f.comm.enrollmentEvidence({run_id:invite.run_id,ticket_hash:invite.ticket_hash},owner).then(value=>{settled=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  release();const joined=await joining;assert.equal((await proof).participant_id,joined.participant_id);
});

test('failed revocation preserves the old registry, denies success and blocks the damaged writer',async t=>{
  const f=await fixture(t),scope=target('write-failure');f.targets.set('write-failure',scope);
  const correlation={request_id:'failed-cancel',attempt_generation:'generation-one'},owner=correlatedOwner(scope,correlation);
  const invite=await f.comm.reserve(scope,correlation);await f.comm.startup.stage(scope,{...correlation,text:'Keep read history'});
  const store=f.comm.store;f.comm.store={...store,append:async()=>{throw Error('fixture disk failure');}};
  await assert.rejects(f.comm.cancelStartup(owner,{run_id:invite.run_id,ticket_hash:invite.ticket_hash}),{code:'PLUGIN_COMMUNICATION_STORE_WRITE'});
  assert.equal(f.comm.runs.get(invite.run_id).enrollments[invite.ticket_hash].status,'active');
  assert.equal(f.comm.runs.get(invite.run_id).messages[0].cancelled,undefined);
  await assert.rejects(f.comm.enroll(invite.enrollment_ticket,metadata('write-failure')),{code:'PLUGIN_COMMUNICATION_STORE_BLOCKED'});
  await assert.rejects(f.comm.cancelStartup({...owner,request_id:'no-record'}),{code:'PLUGIN_COMMUNICATION_STORE_BLOCKED'});
});

test('one orchestrator and five executors register independently and survive durable restart',async t=>{
  const f=await fixture(t),registrations=[],tickets=[];
  for(const [id,role] of [['orchestrator','O'],...Array.from({length:5},(_,i)=>['executor-'+i,'E'])]){
    const scope=target(id,role);f.targets.set(id,scope);
    const invitation=await f.comm.reserve(scope);tickets.push(invitation.enrollment_ticket);
    const joined=await f.comm.enroll(invitation.enrollment_ticket,metadata(id));registrations.push(joined);
    assert.deepEqual(await f.comm.enroll(invitation.enrollment_ticket,metadata(id)),joined);
    const member=f.comm.runs.get(joined.run_id).members[joined.participant_id];assert.equal(member.target.assignment_id,scope.assignment_id);
    await assert.rejects(f.comm.enroll(invitation.enrollment_ticket,metadata('stranger')),{code:'PLUGIN_COMMUNICATION_BINDING'});
  }
  assert.equal(new Set(registrations.map(r=>r.run_id)).size,1);
  assert.equal(new Set(registrations.map(r=>r.participant_id)).size,6);
  const executor=registrations[1],own={...executor,metadata:metadata(executor.local_session_id)};
  const journal=await f.comm.journal(own),exported=await f.comm.export(own);
  assert.equal(exported.complete,true);assert.equal(exported.after_seq,journal.total_seq);
  for(const other of registrations.slice(2)){
    assert.ok(!JSON.stringify(journal.events).includes(other.participant_id));
    assert.ok(!exported.jsonl.includes(other.assignment_id));
  }
  const disk=(await Promise.all((await fs.readdir(f.directory)).map(file=>fs.readFile(path.join(f.directory,file),'utf8')))).join('');
  for(const ticket of tickets)assert.equal(disk.includes(ticket),false);
  assert.doesNotMatch(disk,/private-user|private-executor|private-orchestrator/);
  f.comm.dispose();await f.comm.tail;
  const next=await f.create();t.after(()=>next.dispose());await next.ready;
  for(const r of registrations){
    const recovered=await next.recover({metadata:metadata(r.local_session_id)});
    assert.deepEqual(recovered.participants,[r]);
    assert.equal((await next.status({...r,metadata:metadata(r.local_session_id)})).stopped,true);
  }
});

test('tickets are scoped, expire before first use and cannot revive a replaced assignment',async t=>{
  const f=await fixture(t),scope=target('worker');f.targets.set('worker',scope);
  const first=await f.comm.reserve(scope);f.advance(1800001);
  await assert.rejects(f.comm.enroll(first.enrollment_ticket,metadata('worker')),{code:'PLUGIN_COMMUNICATION_ENROLLMENT_EXPIRED'});
  const fresh=await f.comm.reserve(scope),joined=await f.comm.enroll(fresh.enrollment_ticket,metadata('worker'));
  f.advance(1800001);assert.deepEqual(await f.comm.enroll(fresh.enrollment_ticket,metadata('worker')),joined,'lost response can be recovered by same identity');
  await assert.rejects(f.comm.join({run_id:joined.run_id,role:'E',metadata:metadata('worker')}),{code:'PLUGIN_COMMUNICATION_MODE'});
  await assert.rejects(f.comm.probe({...joined,metadata:metadata('worker'),delay_ms:25}),{code:'PLUGIN_COMMUNICATION_MODE'});
  f.targets.set('worker',{...scope,assignment_id:'replacement'});
  await assert.rejects(f.comm.status({...joined,metadata:metadata('worker')}),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
  await assert.rejects(f.comm.enroll(fresh.enrollment_ticket,metadata('worker')),{code:'PLUGIN_COMMUNICATION_ASSIGNMENT_CHANGED'});
  assert.deepEqual((await f.comm.recover({metadata:metadata('worker')})).participants,[]);
  await assert.rejects(f.comm.enroll(randomUUID().replaceAll('-','').repeat(2),metadata('worker')),{code:'PLUGIN_COMMUNICATION_ENROLLMENT'});
});

test('a failed enrollment write cannot acknowledge registration or consume its invitation',async t=>{
  const f=await fixture(t),scope=target('worker');f.targets.set('worker',scope);
  const invite=await f.comm.reserve(scope),store=f.comm.store;
  f.comm.store={load:store.load,append:async()=>{throw Error('disk failure');}};
  await assert.rejects(f.comm.enroll(invite.enrollment_ticket,metadata('worker')),{code:'PLUGIN_COMMUNICATION_STORE_WRITE'});
  assert.deepEqual(Object.values(f.comm.runs.get(invite.run_id).members),[]);
  assert.ok(Object.values(f.comm.runs.get(invite.run_id).enrollments).every(v=>!v.participant_id));
});

test('local session resolver refuses external, archived, wrong origin and unrelated project assignments',()=>{
  const origin={sessionId:'orchestrator',role:'orchestrator'};
  const parent={workspace:'/parent',projectId:'project',scopeId:null,scopeStatus:'NONE',sessions:[origin]};
  const session={sessionId:'worker',role:'executor',parentWorkspace:'/parent',parentProjectId:'project',
    parentScopeId:'scope',executionOriginSessionId:'orchestrator',assignmentId:'assignment-worker',taskId:'task-worker'};
  const child={workspace:'/worktree',parentWorkspace:'/parent',ownershipState:'confirmed',sessions:[session]};
  const projects={snapshot:()=>({projects:structuredClone([parent,child])})};
  assert.equal(localParticipantTarget(projects,'orchestrator').scope_id,null);
  assert.equal(localParticipantTarget(projects,'worker'),null);
  Object.assign(parent,{scopeId:'scope',scopeStatus:'ACTIVE',planExecution:{execution_origin_session_id:'orchestrator'}});
  origin.orchestratorScopeId='scope';assert.deepEqual(localParticipantTarget(projects,'worker'),target('worker'));
  session.external={provider:'chatgpt-plugin'};assert.equal(localParticipantTarget(projects,'worker'),null);delete session.external;
  parent.projectId='other';assert.equal(localParticipantTarget(projects,'worker'),null);parent.projectId='project';
  origin.archivedAt='today';assert.equal(localParticipantTarget(projects,'worker'),null);delete origin.archivedAt;
  parent.planExecution.execution_origin_session_id='other';assert.equal(localParticipantTarget(projects,'orchestrator').role,'S');
  assert.equal(localParticipantTarget(projects,'worker'),null);
});

test('an orchestrator registered before publication retains its identity when its own plan appears',async t=>{
  const f=await fixture(t),before={...target('orchestrator','O'),scope_id:null};f.targets.set('orchestrator',before);
  const invite=await f.comm.reserve(before),joined=await f.comm.enroll(invite.enrollment_ticket,metadata('orchestrator'));
  f.targets.set('orchestrator',target('orchestrator','O'));
  assert.equal((await f.comm.status({...joined,metadata:metadata('orchestrator')})).participant_id,joined.participant_id);
});
test('a planning or self-executing session keeps the plan-owner channel role through its mode choice', () => {
  for (const role of ['planning', 'self', 'orchestrator']) {
    const project = { projectId: 'p', workspace: '/p', scopeStatus: 'NONE', sessions: [{ sessionId: 's1', role }] };
    const target = localParticipantTarget({ snapshot: () => ({ projects: [project] }) }, 's1');
    assert.equal(target.role, 'O', role);
  }
  const discussion = { projectId: 'p', workspace: '/p', scopeStatus: 'NONE', sessions: [{ sessionId: 's1', role: 'discussion' }] };
  assert.equal(localParticipantTarget({ snapshot: () => ({ projects: [discussion] }) }, 's1').role, 'S');
});
