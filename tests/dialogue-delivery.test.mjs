import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueDelivery} from '../src/control/workflow/dialogue-delivery.mjs';
import {ParallelKit} from '../src/control/workflow/parallel-kit.mjs';
import {PluginProjects} from '../src/control/plugin/service.mjs';

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

test('read retries a Git replacement window but rejects persistent plan corruption',async()=>{
  const kit=new ParallelKit({});let reads=0;
  kit.readSnapshot=async()=>{if(++reads===1)throw Object.assign(Error('partial Git write'),{code:'PLAN_JSON'});return {confirmed:true};};
  assert.deepEqual(await kit.read('/fixture'),{confirmed:true});assert.equal(reads,2);
  reads=0;kit.readSnapshot=async()=>{reads++;throw Object.assign(Error('corrupt'),{code:'PLAN_JSON'});};
  await assert.rejects(kit.read('/fixture'),{code:'PLAN_JSON'});assert.equal(reads,3);
});
