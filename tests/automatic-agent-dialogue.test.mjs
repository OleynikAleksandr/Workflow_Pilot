import test from 'node:test';
import {automaticDialogue,interruptionRegression} from './fixtures/automatic-agent-dialogue.mjs';
test('O1/O2 acceptance-before-merge, E1 checked-before-result and E2 block recovery use one Kit ledger',
  {timeout:180000},async t=>{await interruptionRegression(t);});
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createWorkflowCoordination} from '../src/control/workflow/coordination.mjs';
import {PluginCommunication} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';
test('automatic dialogue through startup and Start: Chat orchestrator, Chat executors, question/decision/commit and third assignment',
  {timeout:300000},async t=>{await automaticDialogue(t);});
test('orchestrator-owned dialogue: context request, multihop block, revision/result/acceptance, explicit integration and DOCS without user bubbles',
  {timeout:300000},async t=>{await automaticDialogue(t,{owned:true,conversation:true});});
test('five simultaneous executors receive O-selected tasks and return checked results through real Start/MCP/SDK/Kit',
  {timeout:300000},async t=>{await automaticDialogue(t,{owned:true,workers:5});});
test('authorized fast cycle: inline preparation, no ready turn, two results, overlapping DOCS and finalization',
  {timeout:300000},async t=>{await automaticDialogue(t,{owned:true,batchResults:true});});

test('recovery hold: durable Kit journal blocks startup, file close automatically releases it without auto-continue',
  {timeout:30000},async t=>{
    const temp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-recovery-hold-')));
    t.after(()=>fs.rm(temp,{recursive:true,force:true}));
    const root=path.join(temp,'main'),sibling=path.join(temp,'sibling'),git=path.join(root,'.git/workflow-kit');
    await fs.mkdir(root);await fs.mkdir(sibling);execFileSync('git',['init','-q',root]);
    await fs.mkdir(git,{recursive:true});
    const txn=path.join(git,'transaction.json');await fs.writeFile(txn,JSON.stringify({task_id:'T001',phase:'PREPARED'}));
    const project={workspace:root,projectId:'kit-project',sessionId:'session-s',scopeId:'scope',scopeStatus:'ACTIVE',
      planExecution:{execution_strategy:'sequential'},sessions:[{sessionId:'session-s'}]};
    const other={...project,workspace:sibling,projectId:'other-project',sessionId:'other',sessions:[{sessionId:'other'}]};
    const store={snapshot:()=>({projects:[project,other]}),selected:()=>project,
      project:workspace=>workspace===root?project:workspace===sibling?other:null,inspect:async()=>project};
    let checks=0,unreadable=false,reported=0;
    const setup={invalidateReadiness:()=>{},ready:async workspace=>{
      checks++;if(unreadable)throw Object.assign(Error('Kit read failed'),{code:'PLAN_READ_FAILED'});
      if(workspace===root)try{await fs.access(txn);return {ready:false};}catch(error){if(error.code!=='ENOENT')throw error;}
      return {ready:true};
    }};
    const target={project_id:'kit-project',local_session_id:'session-s',origin_session_id:'session-s',
      role:'S',scope_id:'scope',assignment_id:null,task_id:null};
    await fs.mkdir(path.join(temp,'wal'));
    const communication=new PluginCommunication({store:await openCommunicationStore(path.join(temp,'wal')),
      resolveTarget:id=>id==='session-s'?target:null,currentMessage:async()=>true});
    await communication.ready;
    const plugin={communication,reserveParticipant:async()=>communication.reserve(target),
      participantTarget:async()=>target};
    const workflow=createWorkflowCoordination({store,setup,plans:{call:async()=>{}},getPlugin:()=>plugin,
      getController:()=>null,available:()=>false,contextAvailable:()=>false,onChange:()=>{},
      report:()=>reported++,save:async()=>{}});
    workflow.attachSessions({all:()=>[],find:()=>null,visible:null,paused:true});
    t.after(()=>{workflow.closeRecovery();workflow.planContinuation.dispose();workflow.execution.dispose();
      workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();communication.dispose();});
    workflow.restore({projectPlanContinuation:{[root]:{projectId:'kit-project',scopeId:'scope',enabled:true,
      sessionId:'session-s',sessions:{}}}});
    await workflow.holdProjectsForRecovery([root]);
    assert.equal(workflow.recoveryStatus(root)?.code,'PROJECT_RECOVERY_REQUIRED');
    assert.equal(workflow.recoveryStatus(sibling),null,'unrelated projects are unaffected');
    assert.equal(workflow.projectPlanContinuation.snapshot()[root].offReason,'recovery');
    assert.equal(workflow.projectPlanContinuation.enabled(root,'scope'),false);
    assert.throws(()=>workflow.prepareBootstrap(project),{code:'PROJECT_RECOVERY_REQUIRED'});
    const siblingBootstrap=await workflow.prepareBootstrap(other);
    assert.ok(siblingBootstrap.enrollment_ticket,'unheld neighbor can prepare startup');
    await new Promise(resolve=>setTimeout(resolve,80));
    assert.equal(workflow.recoveryStatus(root)?.held,true,'open Kit journal cannot release the project');
    unreadable=true;await fs.unlink(txn);
    await new Promise(resolve=>setTimeout(resolve,150));
    assert.equal(workflow.recoveryStatus(root)?.held,true,'an unreadable Kit status is never treated as success');
    unreadable=false;
    // The first file close was unknown. A new Kit transaction followed by its
    // normal journal removal must cause a fresh watcher event, without Start.
    await fs.writeFile(txn,JSON.stringify({phase:'PREPARED'}));
    await new Promise(resolve=>setTimeout(resolve,75));
    assert.equal(workflow.recoveryStatus(root)?.held,true);
    await fs.unlink(txn);
    const deadline=Date.now()+8000;
    while(workflow.recoveryStatus(root)&&Date.now()<deadline){
      await new Promise(resolve=>setTimeout(resolve,65));
    }
    assert.equal(workflow.recoveryStatus(root),null,'closing transaction automatically lifts hold');
    assert.equal(workflow.projectPlanContinuation.enabled(root,'scope'),false,'release is not an implicit Start');
    assert.equal(workflow.projectPlanContinuation.snapshot()[root].offReason,'recovery','technical OFF survives release');
    const bootstrap=await workflow.prepareBootstrap(project),metadata={'openai/session':'recovery-fixture'};
    assert.ok(bootstrap.enrollment_ticket);
    const staged=await communication.startup.stage(target,{request_id:'after-kit-close',text:'Safe recovery\n'.repeat(3500)});
    const enrolled=await communication.enroll(bootstrap.enrollment_ticket,metadata);
    const first=await communication.startupOpen({metadata,message_id:staged.message_id});
    const parts=[first.text];for(let part=1;part<first.total;part++)parts.push((await communication.content({metadata,
      message_id:staged.message_id,context_ref:first.context_ref,part})).text);
    assert.equal(parts.join(''),'Safe recovery\n'.repeat(3500));
    assert.equal((await communication.startupComplete({metadata,message_id:staged.message_id,
      context_sha256:first.context_ref})).complete,true);
    const run=communication.runs.get(enrolled.run_id);
    assert.equal(run.events.filter(e=>e.event_type==='startup.complete').length,1);
    assert.equal(run.events.filter(e=>e.event_type==='send.intent').length,0);
    assert.equal(run.grant,undefined);
    assert.ok(checks>=2);assert.equal(reported,0);
  });

test('recovery hold retains a prior manual OFF and orchestrated manual pause', {timeout:10000},async t=>{
  const temp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-hold-manual-')));
  t.after(()=>fs.rm(temp,{recursive:true,force:true}));
  execFileSync('git',['init','-q',temp]);
  const txn=path.join(temp,'.git/workflow-kit/transaction.json');
  await fs.mkdir(path.dirname(txn),{recursive:true});await fs.writeFile(txn,'{"phase":"PREPARED"}');
  const p={workspace:temp,projectId:'manual-project',sessionId:'session',scopeId:'scope',scopeStatus:'ACTIVE',
    sessions:[{sessionId:'session'}]};
  const store={snapshot:()=>({projects:[p]}),selected:()=>p,project:()=>p,inspect:async()=>p};
  const workflow=createWorkflowCoordination({store,setup:{invalidateReadiness:()=>{},ready:async()=>({ready:false})},
    plans:{call:async()=>{}},getController:()=>null,available:()=>false,contextAvailable:()=>false,
    onChange:()=>{},report:()=>{},save:async()=>{}});
  workflow.attachSessions({all:()=>[],find:()=>null,visible:null,paused:true});
  t.after(()=>{workflow.closeRecovery();workflow.planContinuation.dispose();workflow.execution.dispose();
    workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();});
  workflow.restore({projectPlanContinuation:{[temp]:{projectId:'manual-project',scopeId:'scope',enabled:false,
    offReason:'manual',sessionId:'session',sessions:{}}},executionControl:{[temp]:{projectId:'manual-project',
    scopeId:'scope',state:'paused',reason:'manual',route:'plugin-v1'}}});
  await workflow.holdProjectsForRecovery([temp]);
  assert.equal(workflow.projectPlanContinuation.snapshot()[temp].offReason,'manual');
  assert.equal(workflow.executionControl.view(temp,'scope').reason,'manual');
  assert.equal(workflow.recoveryStatus(temp)?.held,true);
});
