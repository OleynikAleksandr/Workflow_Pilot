import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {migrateAssignmentDialogue} from '../packages/workflow-kit/src/lib/dialogue-migration.mjs';
import {setPlanPermission} from '../packages/workflow-kit/src/lib/plan-permission.mjs';
import {applyAssignmentDialogue} from '../packages/workflow-kit/src/lib/assignment-dialogue.mjs';
import {assignmentStatus,cleanupAssignments,acknowledgeAssignmentTransport} from '../packages/workflow-kit/src/lib/task-assignment.mjs';
import {startIntegration} from '../packages/workflow-kit/src/lib/task-integration.mjs';
import {readPlan} from '../packages/workflow-kit/src/lib/plan.mjs';
import {recover} from '../packages/workflow-kit/src/lib/recovery.mjs';
import {validate} from '../packages/workflow-kit/src/lib/validate.mjs';
import {WorkspaceSetup} from '../src/control/projects/workspace-setup.mjs';
import {userChoseMode} from './fixtures/execution-mode.mjs';

const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
test('released 0.5.7 assignments migrate in a safe pause, preserve existing results and support checked revision',async t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'dialogue-released-upgrade-')));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const previous=path.join(directory,'previous'),root=path.join(directory,'main');fs.mkdirSync(previous);fs.mkdirSync(root);
  const archive=fileURLToPath(new URL('./fixtures/released-kit/kit-1.8.2.tar.gz',import.meta.url));
  const inventory=JSON.parse(fs.readFileSync(new URL('./fixtures/released-kit/manifest.json',import.meta.url)));
  assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),inventory.archives.find(e=>e.version==='1.8.2').sha256);
  execFileSync('tar',['-xzf',archive,'-C',previous]);
  const old=async name=>import(pathToFileURL(path.join(previous,'lib',name+'.mjs')).href);
  const installer=await old('installer'),actions=await old('actions'),assignments=await old('task-assignment'),transaction=await old('transaction'),integration=await old('task-integration');
  git(root,'init','-b','main');git(root,'config','user.name','Migration Fixture');git(root,'config','user.email','fixture@example.invalid');
  for(const file of ['README.md','FIRST.md','SECOND.md','THIRD.md'])fs.writeFileSync(path.join(root,file),'# Baseline\n');
  git(root,'add','.');git(root,'commit','-m','fixture');installer.install({project:root,mode:'existing'});
  const config=JSON.parse(fs.readFileSync(path.join(root,'.harness/workflow.json')));config.checks=[];actions.applyConfig(root,config);
  const task=(id,file)=>({id,title:'Write '+file,why:'Released upgrade fixture',dependencies:[],parallel_safe:true,
    functional_paths:[],documentation_paths:[file],verification_ids:[],acceptance_criteria:['Checked commit'],expected_commit_message:'docs: '+file});
  userChoseMode(root,'origin');
  actions.createScope(root,{scope_id:'migration',objective:'Preserve released assignments',approval_note:'Isolated fixture',
    execution_strategy:'orchestrated',parallel_allowed:true,max_workers:3,execution_reason:'Independent files',execution_origin_session_id:'origin',release:false,
    acceptance_criteria:['Existing commits survive'],approved_scope:{functional_paths:[],documentation_paths:['README.md','FIRST.md','SECOND.md','THIRD.md']},
    context_pack:{documents:[],dependency_task_ids:[],include_last_completed_task:false},
    tasks:[task('T000','README.md'),task('T001','FIRST.md'),task('T002','SECOND.md'),task('T003','THIRD.md')]});
  const create=id=>assignments.createAssignment(root,{id:'worker-'+id,task_id:id,base_commit:git(root,'rev-parse','HEAD'),worktree:path.join(directory,id)},readPlan(root).plan_revision);
  const finish=(a,file)=>{assignments.setupAssignment(root,a.id,{npmCi:true});actions.startTask(a.worktree,a.parent_task_id);
    fs.writeFileSync(path.join(a.worktree,file),'# Existing checked result\n');transaction.commitTask(a.worktree,a.parent_task_id);return assignments.assignmentStatus(root,a.id).source_commit;};
  const integrated=create('T000'),integratedSha=finish(integrated,'README.md');integration.startIntegration(root,{id:integrated.id,source_commit:integratedSha});
  const one=create('T001'),shaOne=finish(one,'FIRST.md'),two=create('T002'),shaTwo=finish(two,'SECOND.md'),three=create('T003');
  const input={operation_id:'migrate-released-057',scope_id:'migration'};
  assert.throws(()=>migrateAssignmentDialogue(root,input),{code:'DIALOGUE_MIGRATION_PAUSE'});
  const permission=active=>setPlanPermission(root,{scope_id:'migration',backend_id:'fixture',backend_pid:process.pid,active});permission(false);
  fs.writeFileSync(path.join(one.worktree,'FIRST.md'),'dirty');
  assert.throws(()=>migrateAssignmentDialogue(root,input),{code:'DIALOGUE_MIGRATION_BUSY'});
  git(one.worktree,'restore','FIRST.md');
  for(const stage of ['dialogue-migration-prepared','dialogue-migration-files','dialogue-migration-runtime','dialogue-migration-final-receipt','dialogue-migration-committed']){
    process.env.WORKFLOW_TEST_FAILPOINT=stage;
    try{assert.throws(()=>migrateAssignmentDialogue(root,input),{code:'TEST_INTERRUPTION'});}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
  }
  const setup=new WorkspaceSetup({resourceDir:fileURLToPath(new URL('../resources/',import.meta.url)),nodeCandidates:[process.execPath]});
  const result=await setup.call({action:'dialogue-migrate',mode:'existing',project:root,migration:input,
    permission:{scope_id:'migration',backend_id:'fixture',backend_pid:process.pid,active:false}});assert.equal(result.migrated,true);
  const migratedHead=git(root,'rev-parse','HEAD');assert.equal(migrateAssignmentDialogue(root,input).duplicate,true);assert.equal(git(root,'rev-parse','HEAD'),migratedHead);
  assert.equal(readPlan(root).dialogue_version,1);assert.equal(git(root,'status','--porcelain'),'');
  assert.equal(assignmentStatus(root,one.id).source_commit,shaOne);assert.equal(assignmentStatus(root,two.id).source_commit,shaTwo);
  assert.equal(validate(root).resolved.T000.source_commit,integratedSha);
  assert.equal(recover(one.worktree,'manual').recovery_profile,'assignment-dialogue-v1');
  const send=(a,role,kind,id,extra={})=>applyAssignmentDialogue(role==='E'?a.worktree:root,{assignment_id:a.id,
    scope_id:'migration',attempt:1,kind,message_id:id,operation_id:id,...extra});
  // Saving an existing checked result is allowed in the pause; integration is not.
  send(one,'E','result','result-one',{source_commit:shaOne});send(one,'O','acceptance','accept-one',{source_commit:shaOne,result_id:'result-one'});
  assert.throws(()=>startIntegration(root,{id:one.id,source_commit:shaOne}),{code:'PLAN_PAUSED'});permission(true);
  startIntegration(root,{id:one.id,source_commit:shaOne});assert.equal(validate(root).resolved.T001.source_commit,shaOne);
  send(two,'E','result','result-two',{source_commit:shaTwo});send(two,'O','revision_request','revise-two',{source_commit:shaTwo,result_id:'result-two'});
  const cli=(workspace,...args)=>JSON.parse(execFileSync(process.execPath,[path.join(workspace,'scripts/workflow.mjs'),...args,'--json'],{cwd:workspace,encoding:'utf8',maxBuffer:2*1024*1024}));
  cli(two.worktree,'task:start','T002');fs.writeFileSync(path.join(two.worktree,'SECOND.md'),'# Revised result\n');cli(two.worktree,'commit','--task','T002');
  const revised=assignmentStatus(root,two.id).source_commit;
  send(two,'E','result','result-two-new',{attempt:2,source_commit:revised});send(two,'O','acceptance','accept-two',{attempt:2,source_commit:revised,result_id:'result-two-new'});
  startIntegration(root,{id:two.id,source_commit:revised});assert.equal(validate(root).resolved.T002.source_commit,revised);
  send(three,'O','task','task-three');cli(three.worktree,'task:start','T003');
  assert.equal(readPlan(three.worktree).current_task_id,'T003');
  assert.equal(cleanupAssignments(root).pending.length,2,'migrated dialogue also waits for physical terminal receipts');
  acknowledgeAssignmentTransport(root,{assignment_id:one.id,message_id:'accept-one',attempt:1,source_commit:shaOne});
  acknowledgeAssignmentTransport(root,{assignment_id:two.id,message_id:'accept-two',attempt:2,source_commit:revised});
  assert.equal(cleanupAssignments(root).pending.length,0,'verified installer-only tip is cleaned after its terminal receipt');
});
