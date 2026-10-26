import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {sdkBusyProfile} from '../src/contracts/plugin-communication.mjs';
import {readSdkBusyExperiment,writeSdkBusyExperiment,SDK_BUSY_PROFILE_PATH} from '../src/execution/plugin/sdk-busy-experiment.mjs';
import {prepareSdkBusyExperiment} from '../scripts/prepare-sdk-busy-experiment.mjs';

async function fixture(t){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sdk-busy-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const workspace=await fs.realpath(directory),expected={workspace,project_id:randomUUID(),scope_id:'test-burst',role:'O',build_id:'fixture-build'};
  const profile={version:1,mode:'sdk-busy-burst',test_workspace:true,experiment_id:'experiment',activation_id:randomUUID(),
    project_id:expected.project_id,scope_id:expected.scope_id,workspace,build_id:expected.build_id,recipient_role:'O',
    cases:[{case_id:'first',busy_kind:'tool-wait',max_notifications:2,task_ids:['T001','T002']}]};
  return {directory,workspace,expected,profile};
}
test('busy profile is absent by default; real atomic IO binds its exact project scope build and recipient',async t=>{
  const {workspace,expected,profile}=await fixture(t);
  assert.deepEqual(await readSdkBusyExperiment(workspace,expected),{version:1,mode:'off'});
  await writeSdkBusyExperiment(workspace,profile,expected);
  assert.deepEqual(await readSdkBusyExperiment(workspace,expected),profile);
  for(const change of [{project_id:randomUUID()},{scope_id:'other'},{role:'E'},{build_id:'old'}])
    await assert.rejects(readSdkBusyExperiment(workspace,{...expected,...change}),{code:'SDK_BUSY_PROFILE_INVALID'});
  const copy=sdkBusyProfile(profile,expected);copy.cases[0].task_ids[0]='foreign';assert.equal(profile.cases[0].task_ids[0],'T001');
  await writeSdkBusyExperiment(workspace,{version:1,mode:'off'},expected);
  assert.deepEqual(await readSdkBusyExperiment(workspace,expected),{version:1,mode:'off'});
});
test('busy IO refuses links and oversized profiles without modifying a different project',async t=>{
  const {workspace,expected,profile}=await fixture(t),outside=await fixture(t);
  await fs.symlink(outside.workspace,path.join(workspace,'.harness'),'dir');
  await assert.rejects(readSdkBusyExperiment(workspace,expected),{code:'SDK_BUSY_PATH_UNSAFE'});
  await assert.rejects(writeSdkBusyExperiment(workspace,profile,expected),{code:'SDK_BUSY_PATH_UNSAFE'});
  assert.deepEqual(await fs.readdir(outside.workspace),[]);
  await fs.unlink(path.join(workspace,'.harness'));
  await writeSdkBusyExperiment(workspace,profile,expected);
  const file=path.join(workspace,SDK_BUSY_PROFILE_PATH);await fs.writeFile(file,' '.repeat(32769));
  await assert.rejects(readSdkBusyExperiment(workspace,expected),{code:'SDK_BUSY_PATH_UNSAFE'});
  await fs.unlink(file);await fs.symlink(path.join(outside.workspace,'payload'),file);
  await assert.rejects(writeSdkBusyExperiment(workspace,profile,expected),{code:'SDK_BUSY_PATH_UNSAFE'});
});
test('busy limits cannot be raised through configuration, duplicate cases or unknown fields',async t=>{
  const {profile,expected}=await fixture(t);
  for(const mutate of [p=>{p.global=true;},p=>{p.cases[0].max_notifications=3;},p=>{p.cases[0].task_ids=['T001','T001'];},
    p=>{p.cases.push({...p.cases[0]});},p=>{p.cases[0].busy_kind='shell';},p=>{p.test_workspace=false;},p=>{p.recipient_role='E';}]){
    const value=structuredClone(profile);mutate(value);assert.throws(()=>sdkBusyProfile(value,expected),{code:'SDK_BUSY_PROFILE_INVALID'});
  }
});
test('local preparation requires a named test workspace and unpublished effects, never a selected sidebar identity',async t=>{
  const {workspace,expected}=await fixture(t);
  const plan={project_id:expected.project_id,scope_id:expected.scope_id,execution_scope_status:'ACTIVE',execution_strategy:'orchestrated',
    tasks:['T001','T002'].map(id=>({id,parallel_safe:true,dependencies:[],commit_status:'PENDING'}))};
  const options={workspace,testWorkspace:true,caseId:'local',inspect:()=>plan,buildId:expected.build_id};
  await assert.rejects(prepareSdkBusyExperiment({...options,testWorkspace:false}),/test-workspace/);
  await assert.rejects(prepareSdkBusyExperiment({...options,scopeId:'foreign'}),/опубликованный/);
  const prepared=await prepareSdkBusyExperiment(options);
  assert.deepEqual(await readSdkBusyExperiment(workspace,expected),prepared);
  const rearmed=await prepareSdkBusyExperiment(options);assert.notEqual(prepared.activation_id,rearmed.activation_id);
  plan.tasks[0].commit_status='DONE';await assert.rejects(prepareSdkBusyExperiment(options),/независимые/);
  await prepareSdkBusyExperiment({...options,off:true});assert.deepEqual(await readSdkBusyExperiment(workspace,expected),{version:1,mode:'off'});
});
