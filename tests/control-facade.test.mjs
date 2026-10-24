import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ControlFacade } from '../src/control/facade.mjs';
import { ContextSession } from '../src/control/context/context-session.mjs';
import { sessionStore } from '../src/control/sessions/service.mjs';
import { localParticipantTarget } from '../src/control/plugin/enrollment.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'workflow-pilot-control-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const file = path.join(root,'profile','sessions.json');
  const create = () => new ControlFacade({storageFile:file,execution:{}});
  const project = async name => {
    const folder = path.join(root,name);
    await fs.mkdir(path.join(folder,'.harness/plans'),{recursive:true});
    await fs.mkdir(path.join(folder,'scripts'));
    await fs.writeFile(path.join(folder,'scripts/workflow.mjs'),'// fixture');
    const plan = {schema_version:1,project_id:name,project_name:name,plan_revision:1,
      scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',current_task_id:null,
      tasks:[{id:'T001',title:'Task',implementation_status:'TODO',commit_status:'PENDING'}]};
    await fs.writeFile(path.join(folder,'.harness/plans/todo-plan.md'),
      '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify(plan)+'\n```\n<!-- workflow-state:end -->');
    return folder;
  };
  return {root,file,create,project};
}

test('Control facade restores exact Chat ownership and detached snapshots',async t=>{
  const f=await fixture(t), control=f.create(), store=control.projects;
  await store.load();
  const first=await store.select(await f.project('First'));
  const planFile=path.join(first.workspace,'.harness/plans/todo-plan.md'), before=await fs.readFile(planFile,'utf8');
  await store.bindChat(first.workspace,first.sessionId,'https://chatgpt.com/c/aaaaaaaa',{manual:true});
  await assert.rejects(store.newSession(first.workspace,'work'),{code:'SESSION_EXPERIENCE_UNSUPPORTED'});
  const work=await store.newSession(first.workspace);
  assert.equal(work.experience,'chat');
  const neighbour=await store.select(await f.project('Neighbour'));
  const scoped=sessionStore(store,first);
  await scoped.updateSession(first.workspace,first.sessionId,{attempt:{state:'unknown',requestId:'request-one'}});
  assert.equal(store.selected().workspace,neighbour.workspace);
  assert.throws(()=>scoped.updateSession(neighbour.workspace,neighbour.sessionId,{}),{code:'SESSION_CHANGED'});
  const snapshot=store.snapshot();snapshot.projects.length=0;
  assert.equal(store.snapshot().projects.length,2);
  for(const key of ['data','mutationTail','save','activeRecord','planService','git'])assert.equal(store[key],undefined,key);
  const restarted=f.create().projects;await restarted.load();
  const restored=await restarted.selectSession(first.workspace,first.sessionId);
  assert.equal(restored.chatUrl,'https://chatgpt.com/c/aaaaaaaa');
  assert.equal(restored.attempt.state,'unknown');
  assert.equal(restarted.project(first.workspace,work.sessionId).experience,'chat');
  assert.equal(await fs.readFile(planFile,'utf8'),before,'Kit plan is never copied or changed by logical sessions');
  await assert.rejects(restarted.bindChat(first.workspace,first.sessionId,'https://chatgpt.com/c/bbbbbbbb'),{code:'CHAT_CHANGED'});
  let deliveries=0;
  const controller=new ContextSession({store:sessionStore(restarted,restored),runtime:{},
    composer:{getURL:()=>restored.chatUrl,deliver:async()=>{deliveries++;}}});
  controller.attach(restored);
  assert.equal(await controller.resumePreparation(),false);
  assert.equal(deliveries,0,'UNKNOWN cannot replay context through the restored facade');
  controller.cancel();
});

test('failed Control save rolls back ownership and restart retains the last durable session',async t=>{
  const f=await fixture(t), store=f.create().projects;
  const first=await store.select(await f.project('First'));
  const rename=fs.rename;
  fs.rename=async(from,to)=>{if(to===f.file)throw Object.assign(new Error('fixture write failure'),{code:'EIO'});return rename(from,to);};
  try { await assert.rejects(store.newSession(first.workspace),{code:'EIO'}); }
  finally { fs.rename=rename; }
  assert.equal(store.selected().sessionId,first.sessionId);
  assert.equal(store.snapshot().projects[0].sessions.length,1);
  const restarted=f.create().projects;await restarted.load();
  assert.equal(restarted.selected().sessionId,first.sessionId);
  assert.equal(restarted.snapshot().projects[0].sessions.length,1);
  assert.deepEqual(await fs.readdir(path.dirname(f.file)),['sessions.json']);
});

test('historical mode holds only its project before runtime, registration and continuation',async t=>{
  const f=await fixture(t),initial=f.create().projects;
  const first=await initial.select(await f.project('Historical'));
  const neighbour=await initial.select(await f.project('Active'));
  const raw=initial.snapshot();raw.schemaVersion=6;
  raw.projects.find(p=>p.workspace===first.workspace).sessions[0].experience='work';
  await fs.writeFile(f.file,JSON.stringify(raw));
  const control=f.create(),store=control.projects;await store.load();control.configureProjects({});
  const historical=store.project(first.workspace,first.sessionId);
  assert.equal(historical.availability,'legacy-work');
  assert.equal(localParticipantTarget(store,first.sessionId),null);
  assert.ok(localParticipantTarget(store,neighbour.sessionId));
  const workflow=control.configureWorkflow({getController:()=>null,available:()=>false,contextAvailable:()=>false,
    onChange:()=>{},report:error=>{throw error;},save:async()=>{}});
  workflow.attachSessions({all:()=>[],find:()=>null,visible:null,paused:false});
  t.after(()=>{workflow.closeRecovery();workflow.planContinuation.dispose();workflow.execution.dispose();
    workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();});
  workflow.restore({projectPlanContinuation:{[first.workspace]:{projectId:first.projectId,scopeId:'scope',enabled:true,
    sessionId:first.sessionId,sessions:{}},[neighbour.workspace]:{projectId:neighbour.projectId,scopeId:'scope',enabled:false,
    sessionId:neighbour.sessionId,sessions:{}}}});
  assert.equal(workflow.recoveryStatus(first.workspace).code,'SESSION_MODE_UNSUPPORTED');
  assert.equal(workflow.recoveryStatus(neighbour.workspace),null);
  workflow.restoreBackground();
  assert.throws(()=>workflow.prepareBootstrap(historical),{code:'SESSION_MODE_UNSUPPORTED'});
  await assert.rejects(workflow.setPlanExecution(true,first.workspace),{code:'SESSION_MODE_UNSUPPORTED'});
  assert.equal(workflow.projectPlanContinuation.enabled(neighbour.workspace,'scope'),false,'manual OFF preserved');
  assert.equal(store.project(first.workspace).experience,'work');
});

test('workflow facade restores delivery ledgers and purges only the addressed project',async t=>{
  const f=await fixture(t),control=f.create(),store=control.projects;
  const first=await store.select(await f.project('First'));
  const neighbour=await store.select(await f.project('Neighbour'));
  control.configureProjects({});
  const workflow=control.configureWorkflow({getController:()=>null,available:()=>false,contextAvailable:()=>false,
    onChange:()=>{},report:()=>{},save:async()=>{}});
  workflow.attachSessions({all:()=>[],find:()=>null,visible:null});
  t.after(()=>{workflow.planContinuation.dispose();workflow.execution.dispose();workflow.planMonitor.close();
    workflow.planReview.dispose();workflow.reviewContinuation.dispose();});
  const permissions=Object.fromEntries([first,neighbour].map(p=>[p.workspace,{projectId:p.projectId,scopeId:'scope',
    enabled:true,sessionId:p.sessionId,sessions:{}}]));
  const ledgers=Object.fromEntries([first,neighbour].map(p=>[JSON.stringify([p.workspace,'scope']),{
    workspace:p.workspace,scope:'scope',originSessionId:p.sessionId,assignments:{},corrections:{},finalization:{status:'unknown'}}]));
  const saved={projectPlanContinuation:permissions,parallelExecutionBook:ledgers,reviewCheckpoint:{version:3,entries:[],cycles:[]}};
  workflow.restore(saved);
  saved.projectPlanContinuation[first.workspace].enabled=false;
  assert.equal(workflow.projectPlanContinuation.enabled(first.workspace,'scope'),true);
  const detached=workflow.snapshot();detached.parallelExecutionBook={};detached.projectPlanContinuation[first.workspace].enabled=false;
  assert.equal(workflow.execution.ledgers().length,2);
  assert.equal(workflow.projectPlanContinuation.enabled(first.workspace,'scope'),true);
  assert.equal(workflow.execution.ledgers().every(entry=>entry.finalization.status==='unknown'),true);
  for(const key of ['states','unwatch','queues','book'])assert.equal(workflow.execution[key],undefined);
  assert.equal(workflow.projectPlanContinuation.book,undefined);
  assert.equal(workflow.reviewContinuation.stops,undefined);
  workflow.execution.publish(neighbour.workspace,{assignments:[{id:'foreign',status:'UNKNOWN'}]});
  workflow.execution.view(neighbour.workspace).assignments.length=0;
  assert.equal(workflow.execution.view(neighbour.workspace).assignments.length,1);
  workflow.cleanup([{workspace:first.workspace,projectId:first.projectId,sessionIds:[first.sessionId]}]);
  assert.equal(workflow.projectPlanContinuation.enabled(first.workspace,'scope'),false);
  assert.equal(workflow.projectPlanContinuation.enabled(neighbour.workspace,'scope'),true);
  assert.deepEqual(workflow.execution.ledgers().map(entry=>entry.workspace),[neighbour.workspace]);
  assert.equal(workflow.execution.ledgers()[0].originSessionId,neighbour.sessionId);
  assert.equal(store.selected().sessionId,neighbour.sessionId);
});
