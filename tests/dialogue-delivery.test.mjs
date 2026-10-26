import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueDelivery} from '../src/control/workflow/dialogue-delivery.mjs';
import {ParallelKit} from '../src/control/workflow/parallel-kit.mjs';
import {PluginProjects} from '../src/control/plugin/service.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFixture,planFixture} from '../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import {readPlan} from '../packages/workflow-kit/src/lib/plan.mjs';

test('bootstrap preparation uses a new immutable message key when upgraded instructions change',async()=>{
  const sent=[],project={role:'executor',workspace:'/child',parentWorkspace:'/main',parentScopeId:'scope',
    sessionId:'e',assignmentId:'a',taskId:'T001',executionOriginSessionId:'o'};
  const origin={workspace:'/main',sessionId:'o'};
  const delivery=new DialogueDelivery({store:{project:()=>({planExecution:{dialogue_version:1}})},
    getPlugin:()=>({reserveParticipant:async()=>({ticket:'fixture'})}),route:()=> 'plugin-v1'});
  delivery.project=()=>origin;delivery.send=async(_origin,text,kind,options)=>sent.push({text,kind,...options});
  await delivery.prepareBootstrap(project);await delivery.prepareBootstrap(project);
  assert.equal(sent[0].key,'prepare:a:v2');assert.equal(sent[1].key,sent[0].key);
  assert.match(sent[0].text,/dispatch_when_ready=true/);
});
test('assignment contract reads tolerate a Git replacement window but not persistent corruption',async()=>{
  let calls=0,broken=false;
  const target={local_session_id:'o',role:'O',scope_id:'scope',assignment_id:null};
  const plugin=new PluginProjects({projects:{snapshot:()=>({projects:[{workspace:'/fixture',sessions:[{sessionId:'o'}]}]})},
    plans:{call:async()=>{if(broken||++calls<3)throw Object.assign(Error('replacement'),{code:'PLAN_JSON'});return {ok:true};}}});
  plugin.participantTarget=async()=>target;
  try{
    assert.deepEqual(await plugin.dialogueOperation(target,'assignment:dialogue-status','a'),{ok:true});
    assert.equal(calls,3);broken=true;
    await assert.rejects(plugin.dialogueOperation(target,'assignment:dialogue-status','a'),{code:'PLUGIN_ASSIGNMENT_PLAN_JSON'});
  }finally{plugin.communication.dispose();await plugin.communication.tail;}
});

test('finalization waits for live effects and unread deliveries, but a rejected intent cannot strand a corrected plan',()=>{
  const run={mode:'workflow',project_id:'project',grant:{scope_id:'scope'},messages:[],assignment_intents:{}};
  const delivery=new DialogueDelivery({store:{project:()=>({projectId:'project'})},getPlugin:()=>({communication:{runs:new Map([['run',run]])}})});
  const settled=()=>delivery.settled('/workspace','scope');
  for(const phase of ['authorized','needs_confirmation','prepared','deferred','published','failed','retired']){
    run.assignment_intents.one={effect:{scope_id:'scope'},phase};
    assert.equal(settled(),!['authorized','needs_confirmation','prepared','deferred'].includes(phase),phase);
  }
  run.messages.push({scope_id:'scope',reply_observed:false});assert.equal(settled(),false);
  run.messages[0].reply_observed=true;assert.equal(settled(),true);
  run.assignment_intents.other={effect:{scope_id:'another'},phase:'prepared'};assert.equal(settled(),true);
});

test('removed checkout terminal proof is narrow and requires parent identity and recorded idle cleanup',async()=>{
  const target={role:'E',project_id:'p',scope_id:'s',local_session_id:'e',origin_session_id:'o',assignment_id:'a',task_id:'T001'};
  const message={kind:'acceptance',assignment_id:'a',scope_id:'s',message_id:'m',attempt:1,source_commit:'a'.repeat(40),read:true,yielded:{}};
  const child={workspace:'/worker',sessions:[{sessionId:'e',role:'executor',assignmentId:'a',taskId:'T001',
    parentProjectId:'p',parentScopeId:'s',parentWorkspace:'/main',executionOriginSessionId:'o'}]};
  const projects={snapshot:()=>({projects:[{workspace:'/main',projectId:'p',sessions:[]},child]})};
  const plugin=new PluginProjects({projects,loadContext:async()=>null});
  const state={phase:'INTEGRATED',scope_id:'s',task_id:'T001',worktree:'/worker',
    cleanup:{status:'DONE',commands_idle:true},dialogue:{acceptance:message}};
  plugin.participantTarget=async()=>({role:'O',project_id:'p',scope_id:'s'});
  plugin.dialogueOperation=async()=>state;
  try{
    assert.equal(await plugin.terminalTarget(target,message),true);
    assert.equal(await plugin.terminalTarget(target,{...message,kind:'task'}),false);
    assert.equal(await plugin.terminalTarget(target,{...message,attempt:2}),false);
    delete state.cleanup.commands_idle;assert.equal(await plugin.terminalTarget(target,message),false);
    state.cleanup.commands_idle=true;child.sessions[0].parentProjectId='other';
    assert.equal(await plugin.terminalTarget(target,message),false);
  }finally{plugin.communication.dispose();await plugin.communication.tail;}
});

test('scope-bound UI receipts settle the channel without completing a model turn',()=>{
  const message={kind:'user-choice',scope_id:'scope',recipient_session_id:'o',delivery:'accepted',intent:true,
    read:true,reply_observed:false};
  const run={mode:'workflow',project_id:'p',grant:{scope_id:'scope'},messages:[message],assignment_intents:{}};
  const delivery=new DialogueDelivery({store:{project:()=>({projectId:'p'})},route:()=> 'plugin-v1',
    getPlugin:()=>({communication:{runs:new Map([['r',run]])}})});
  const project={sessionId:'o',scopeId:'scope'};
  assert.equal(delivery.reserved(project),false);assert.equal(delivery.settled('/main','scope'),true);
  message.ui_event={type:'review-preference'};assert.equal(delivery.settled('/main','scope'),true);
  message.read=false;assert.equal(delivery.reserved(project),true);assert.equal(delivery.settled('/main','scope'),false);
  message.read=true;message.delivery='unknown';assert.equal(delivery.settled('/main','scope'),false);
  message.delivery='pending';delete message.intent;assert.equal(delivery.settled('/main','scope'),true);
  assert.equal(message.reply_observed,false);
});

test('participant validation retries transient integration reads but never retains stale ownership',async()=>{
  const plugin=new PluginProjects({projects:{snapshot:()=>({projects:[]})},loadContext:async()=>null});
  let calls=0;const target={role:'O',local_session_id:'o'};
  plugin.participantSnapshot=async()=>{
    if(++calls===1)throw Object.assign(Error('plan replacement'),{code:'WORKFLOW_PLAN_INVALID'});
    return calls===2?null:target;
  };
  try{
    assert.deepEqual(await plugin.participantTarget('o'),target);assert.equal(calls,3);
    calls=0;plugin.participantSnapshot=async()=>{calls++;return null;};
    assert.equal(await plugin.participantTarget('o'),null);assert.equal(calls,3);
    plugin.participantSnapshot=async()=>{throw Object.assign(Error('invalid'),{code:'WORKFLOW_PLAN_INVALID'});};
    await assert.rejects(plugin.participantTarget('o'),{code:'WORKFLOW_PLAN_INVALID'});
  }finally{plugin.communication.dispose();await plugin.communication.tail;}
});

test('only issued S model-pull snapshots skip revision freshness; replacement and cancellation still deny',async()=>{
  const s={role:'S',local_session_id:'s'};
  const project={workspace:'/fixture',sessionId:'s',attempt:{requestId:'request-5',contextTransport:'panel',packet:{revision:5}}};
  let revision=5,checks=0;
  const delivery=new DialogueDelivery({store:{inspect:async()=>({revision})},record:()=>({controller:{
    packetIsCurrent:async packet=>{checks++;return packet.revision===revision;}
  }})});
  delivery.project=()=>project;
  const message={kind:'startup-context',request_id:'request-5',delivery_mode:'model-pull',read:false,parts_read:[]};
  assert.equal(await delivery.currentMessage(s,message),true);
  revision=6;
  assert.equal(await delivery.currentMessage(s,message),false,'before first part freshness is mandatory');
  message.read=true;
  assert.equal(await delivery.currentMessage(s,message),false,'read marker alone is not a returned part');
  message.parts_read=[0];
  const before=checks;
  assert.equal(await delivery.currentMessage(s,message),true);
  assert.equal(checks,before,'issued S snapshot does not query a changing plan revision');
  assert.equal(await delivery.currentMessage({...s,role:'E'},message),false);
  assert.equal(await delivery.currentMessage({...s,role:'O'},message),false);
  assert.equal(await delivery.currentMessage(s,{...message,delivery_mode:'sdk-notification'}),false);
  project.preparationPaused=true;
  await assert.rejects(delivery.currentMessage(s,message),{code:'PLUGIN_COMMUNICATION_STARTUP_PAUSED'});
  project.preparationPaused=false;project.attempt.requestId='replacement';
  assert.equal(await delivery.currentMessage(s,message),false,'different request cannot inherit the receipt');
  project.attempt.requestId='request-5';project.attempt.contextTransport='attachments';
  assert.equal(await delivery.currentMessage(s,message),false,'legacy transport cannot inherit model-pull receipt');
  delivery.project=()=>null;
  assert.equal(await delivery.currentMessage(s,message),false,'removed project cannot complete');
});

test('durable cancellation intent and pending navigation deny even an issued S snapshot before WAL revoke',async()=>{
  const project={workspace:'/fixture',sessionId:'s',attempt:{requestId:'r',contextTransport:'panel',cancelState:'none'}};
  let finishNavigation,finishStore,settled=false;
  const navigationTail=new Promise(resolve=>{finishNavigation=resolve;});
  const storeWrite=new Promise(resolve=>{finishStore=resolve;});
  const delivery=new DialogueDelivery({store:{whenIdle:()=>storeWrite},record:()=>({navigationTail})});
  delivery.project=()=>project;
  const read=delivery.currentMessage({role:'S',local_session_id:'s'},
    {kind:'startup-context',request_id:'r',delivery_mode:'model-pull',read:true,parts_read:[0]}).then(result=>{settled=true;return result;});
  finishNavigation();await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  project.attempt.cancelState='requested';finishStore();await assert.rejects(read,{code:'PLUGIN_COMMUNICATION_STARTUP_CANCELLED'});
  assert.equal((await delivery.admit({local_session_id:'s'},{kind:'startup-context',request_id:'r'})).allowed,false);
});

test('read retries a Git replacement window but rejects persistent plan corruption',async()=>{
  const kit=new ParallelKit({});let reads=0;
  for(const code of ['ASSIGNMENT_CONTRACT','MISSING_FILE','ENOENT','PLAN_COMMIT_MISMATCH']){
    reads=0;kit.readSnapshot=async()=>{if(++reads===1)throw Object.assign(Error('concurrent replacement'),{code});return {confirmed:true};};
    assert.deepEqual(await kit.read('/fixture'),{confirmed:true});assert.equal(reads,2);
    reads=0;kit.readSnapshot=async()=>{reads++;throw Object.assign(Error('persistent corruption'),{code});};
    await assert.rejects(kit.read('/fixture'),{code});assert.equal(reads,3);
  }
  reads=0;
  kit.readSnapshot=async()=>{if(++reads===1)throw Object.assign(Error('partial Git write'),{code:'PLAN_JSON'});return {confirmed:true};};
  assert.deepEqual(await kit.read('/fixture'),{confirmed:true});assert.equal(reads,2);
  reads=0;kit.readSnapshot=async()=>{reads++;throw Object.assign(Error('corrupt'),{code:'PLAN_JSON'});};
  await assert.rejects(kit.read('/fixture'),{code:'PLAN_JSON'});assert.equal(reads,3);
});

test('a child commit lock defers inconsistent proof; persistent missing proof remains UNKNOWN',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'wp-child-proof-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const root=createFixture(directory);planFixture(root,'origin');
  const plan=readPlan(root),gitDir=path.join(root,'.git'),childGit=path.join(directory,'child-git');
  const records=path.join(gitDir,'workflow-kit','assignments'),lock=path.join(childGit,'workflow-kit','operation.lock');
  await fs.mkdir(records,{recursive:true});await fs.mkdir(path.dirname(lock),{recursive:true});
  await fs.writeFile(path.join(records,'a.json'),JSON.stringify({id:'a',parent_scope_id:plan.scope_id,
    parent_task_id:'T001',worktree:path.join(directory,'child'),phase:'ACTIVE'}));
  await fs.writeFile(lock,'fixture writer');
  const text=await fs.readFile(path.join(root,'.harness/plans/todo-plan.md'),'utf8');
  const kit=new ParallelKit({plans:{call:async(_root,command)=>{
    if(command==='integration:status')return {status:'IDLE'};
    if(command==='validate')return {resolved:{},plan_revision:plan.plan_revision};
    throw Object.assign(Error('DONE before commit visibility'),{code:'PLAN_COMMIT_MISMATCH'});
  }}});
  kit.git=async(workspace,args)=>args.includes('--absolute-git-dir')?(workspace===root?gitDir:childGit)
    :args[0]==='show'?text.trim():args[0]==='status'?'':'head';
  await assert.rejects(kit.read(root),{code:'WORKFLOW_LOCKED'});
  await fs.rm(lock);
  const result=await kit.read(root);
  assert.equal(result.assignments[0].status,'UNKNOWN');
  assert.equal(result.assignments[0].error.code,'PLAN_COMMIT_MISMATCH');
});
test('a user choice is admitted without plan permission but keeps the physical checks',async()=>{
  const workspace=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'choice-admit-')));
  try{
    let canSend=true;
    const delivery=new DialogueDelivery({store:{project:()=>({workspace,sessionId:'d'})},route:()=>null,state:()=>({state:'not-started'})});
    delivery.project=()=>({workspace,sessionId:'d'});delivery.observe=()=>({canSend});
    const target={local_session_id:'d',role:'S',scope_id:null};
    assert.deepEqual(await delivery.admit(target,{kind:'user-choice'}),{allowed:true});
    assert.equal((await delivery.admit(target,{kind:'continue'})).allowed,false,'ordinary work still needs the running plan');
    canSend=false;
    assert.equal((await delivery.admit(target,{kind:'user-choice'})).allowed,false,'a busy or drafted chat waits');
  }finally{await fs.rm(workspace,{recursive:true,force:true});}
});
