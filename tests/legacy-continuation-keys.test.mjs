import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {SettingsService} from '../src/control/settings/service.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';

test('settings saved by 0.4.6 and earlier keep their continuation permissions under the new name',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wp-legacy-settings-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const file=path.join(root,'settings.json'),saved={'/project':{projectId:'p',scopeId:'s',enabled:true}};
  await fs.writeFile(file,JSON.stringify({shellTheme:'dark',projectAutoPlan:saved,reviewCheckpoint:null}));
  const settings=new SettingsService({file,files:{readJson:async name=>JSON.parse(await fs.readFile(name,'utf8'))},workflowSnapshot:()=>({})});
  const workflow=await settings.load();
  assert.deepEqual(workflow.projectPlanContinuation,saved);
  assert.equal(Object.hasOwn(workflow,'projectAutoPlan'),false,'the former name is not passed on');
});

test('an executor checkpoint saved by 0.4.6 and earlier moves to the new name on load',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wp-legacy-sessions-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const folder=path.join(root,'Main');
  await fs.mkdir(path.join(folder,'.harness/plans'),{recursive:true});await fs.mkdir(path.join(folder,'scripts'));
  await fs.writeFile(path.join(folder,'scripts/workflow.mjs'),'// fixture');
  await fs.writeFile(path.join(folder,'.harness/plans/todo-plan.md'),'<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,
    project_id:'main-id',project_name:'Main',plan_revision:1,scope_id:null,execution_scope_status:'NONE',delivery_status:'IN_PROGRESS',current_task_id:null,tasks:[]})+'\n```\n<!-- workflow-state:end -->');
  const store=new WorkspaceSessions(path.join(root,'sessions.json'));
  const main=await store.select(folder);
  const raw=JSON.parse(await fs.readFile(store.file,'utf8'));
  raw.projects[0].sessions[0].executionAutomation={autoPlanCheckpoint:{version:3,entries:[]}};
  await fs.writeFile(store.file,JSON.stringify(raw));
  const restarted=new WorkspaceSessions(store.file);await restarted.load();
  assert.deepEqual(restarted.project(main.workspace,main.sessionId).executionAutomation,{continuationCheckpoint:{version:3,entries:[]}});
  const rewritten=JSON.parse(await fs.readFile(store.file,'utf8')).projects[0].sessions[0].executionAutomation;
  assert.deepEqual(rewritten,{continuationCheckpoint:{version:3,entries:[]}},'the store is rewritten under the new name');
});
