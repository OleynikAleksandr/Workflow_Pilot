import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createFixture} from './check-parallel-execution-fixture.mjs';
import {createScope,startTask,applyConfig,status,commitDocumentation} from '../src/lib/actions.mjs';
import {readPlan} from '../src/lib/plan.mjs';
import {createAssignment,setupAssignment,assignmentStatus,cleanupAssignments} from '../src/lib/task-assignment.mjs';
import {startIntegration} from '../src/lib/task-integration.mjs';
import {extendPlan} from '../src/lib/extend-plan.mjs';
import {blockTask,messageAssignment,escalatePlan,readSignals,blockedTasks} from '../src/lib/signals.mjs';
import {commitTask} from '../src/lib/transaction.mjs';
import {validate,readConfig} from '../src/lib/validate.mjs';
import {recover,contextPacket} from '../src/lib/recovery.mjs';
import {applyAssignmentDialogue,assignmentDialogueStatus} from '../src/lib/assignment-dialogue.mjs';

const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(root,file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
const SPEC='docs/planning/orchestration.md';
const task=(id,file,dependencies,parallel_safe,checks=[])=>({id,title:'Write '+file,why:'Orchestrated fixture',dependencies,parallel_safe,
  functional_paths:[],documentation_paths:[file],verification_ids:checks,acceptance_criteria:['Output committed'],expected_commit_message:'docs: '+file});

if(!process.argv.includes('--dialogue-only')) {
const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kit-orchestrated-')));
try {
  const root=createFixture(directory);
  const config=readConfig(root);
  config.checks.push({id:'pkg',kind:'package',executable:process.execPath,args:['-e','0'],required:false,timeout_ms:30000,evidence:'Fixture package'});
  config.profile='DEVELOPMENT';config.stack='Node fixture';
  config.delivery_tail=[{verification_ids:['pkg'],verification_kind:'package'}];
  applyConfig(root,config);
  write(root,SPEC,'# Orchestration fixture\n');
  createScope(root,{scope_id:'orchestrated-fixture',objective:'Waves, delivery in main and worktree cleanup',approval_note:'Isolated automated fixture',
    parallel_allowed:true,max_workers:2,execution_strategy:'orchestrated',execution_reason:'Sequential foundation, two parallel tasks, sequential finish',
    execution_origin_session_id:'orchestrator-fixture',release:true,acceptance_criteria:['Only main remains'],
    approved_scope:{functional_paths:['release.txt'],documentation_paths:['README.md','SECOND.md','THIRD.md','FOUNDATION.md','TOOL-A.md',SPEC,'docs/architecture/OVERVIEW.md']},
    context_pack:{documents:[{path:SPEC,required:true}],dependency_task_ids:[],include_last_completed_task:false},
    tasks:[{...task('T001','README.md',[],false),context_pack:{documents:[{path:'SECOND.md',required:true}],dependency_task_ids:[],include_last_completed_task:false}},task('T002','SECOND.md',['T001'],true,['dependency']),task('T003','THIRD.md',['T001'],true),
      task('T004','FOUNDATION.md',['T002','T003'],false),
      {id:'DOCS',title:'Актуализация всех документов проекта',why:'Retire the released specification',dependencies:[],functional_paths:[],
        documentation_paths:[SPEC,'docs/architecture/OVERVIEW.md'],verification_ids:[],acceptance_criteria:['Specification retired'],expected_commit_message:'docs: retire spec'},
      {id:'R001',title:'Deliver',why:'Delivery in main',dependencies:[],functional_paths:['release.txt'],documentation_paths:[],verification_ids:['pkg'],
        verification_kind:'package',acceptance_criteria:['Delivered'],expected_commit_message:'release: deliver'}]});
  assert.deepEqual(readPlan(root).tasks.map(t=>t.id),['T001','T002','T003','T004','DOCS','R001']);
  const assign=id_=>{
    const plan=readPlan(root);
    return createAssignment(root,{id:'wp-'+id_.toLowerCase(),task_id:id_,base_commit:git(root,'rev-parse','HEAD'),worktree:path.join(directory,id_)},plan.plan_revision);
  };
  const finish=(assignment,file,text)=>{
    startTask(assignment.worktree,assignment.parent_task_id);
    if(text===null)fs.rmSync(path.join(assignment.worktree,file));else write(assignment.worktree,file,text);
    commitTask(assignment.worktree,assignment.parent_task_id);
    return startIntegration(root,{id:assignment.id,source_commit:assignmentStatus(root,assignment.id).source_commit});
  };
  const gone=assignment=>{
    assert.equal(fs.existsSync(assignment.worktree),false,'worktree removed: '+assignment.parent_task_id);
    assert.equal(git(root,'branch','--list',assignment.branch),'','branch removed: '+assignment.branch);
  };
  // The orchestrator never executes ordinary work or DOCS in main; delivery waits for everything else.
  assert.throws(()=>startTask(root,'T001'),{code:'ORCHESTRATED_MAIN_READ_ONLY'});
  assert.throws(()=>startTask(root,'DOCS'),{code:'ORCHESTRATED_MAIN_READ_ONLY'});
  assert.throws(()=>startTask(root,'R001'),{code:'DELIVERY_NOT_READY'});
  assert.throws(()=>assign('R001'),{code:'ASSIGNMENT_TASK'});
  assert.throws(()=>assign('T002'),{code:'ASSIGNMENT_BARRIER'},'parallel work waits for the earlier sequential task');
  const first=assign('T001');
  assert.equal(first.status,'READY','a task without checks needs no npm ci');
  assert.throws(()=>assign('T003'),{code:'ASSIGNMENT_BARRIER'});
  // Signals: executor block, orchestrator answer and escalation share one journal.
  startTask(first.worktree,'T001');write(first.worktree,'README.md','# worker-a\n');
  const blocked=blockTask(first.worktree,'T001','Needs a decision');
  assert.equal(blocked.duplicate,false);assert.equal(blocked.signal.assignment_id,first.id);
  assert.equal(blockTask(first.worktree,'T001','Needs a decision').duplicate,true);
  assert.equal(readPlan(first.worktree).tasks[0].implementation_status,'IN_PROGRESS');
  assert.equal(fs.readFileSync(path.join(first.worktree,'README.md'),'utf8'),'# worker-a\n','block keeps files');
  assert.deepEqual(blockedTasks(root,readPlan(root)).map(b=>b.task_id),['T001']);
  assert.throws(()=>escalatePlan(first.worktree,'Not allowed here'),{code:'ASSIGNMENT_READ_ONLY'});
  // Recovery by role: the executor sees only its task context; main shows executors and blocks.
  const executor=recover(first.worktree,'manual',{role:'executor'});
  assert.match(executor.text,/РОЛЬ: ИСПОЛНИТЕЛЬ/);assert.equal(executor.role,'executor');
  assert.ok(executor.included.includes('SECOND.md'),'task context_pack is delivered');
  assert.ok(!executor.included.includes(SPEC)&&!executor.text.includes('# Orchestration fixture'),'plan documents are not delivered to an executor');
  assert.doesNotMatch(executor.text,/РАБОЧИЕ СПЕЦИФИКАЦИИ/);
  assert.throws(()=>recover(root,'manual',{role:'executor'}),{code:'RECOVERY_ROLE'});
  assert.throws(()=>recover(root,'manual',{role:'author'}),{code:'RECOVERY_ROLE'});
  const discussion=recover(root,'manual',{role:'discussion'});
  assert.match(discussion.text,/РОЛЬ: ЧАТ ОБСУЖДЕНИЯ/);assert.match(discussion.text,/\.workflow-temp\//);
  assert.match(discussion.text,/T001: Needs a decision/);assert.ok(discussion.included.includes(SPEC));
  assert.match(recover(root,'manual',{role:'orchestrator'}).text,/РОЛЬ: ОРКЕСТРАТОР/);
  const plain=recover(root);assert.equal(plain.role,null);assert.doesNotMatch(plain.text,/РОЛЬ:/);
  assert.match(plain.text,/выполняет приложение Workflow Pilot/);assert.doesNotMatch(plain.text,/Начать через task:start/);
  assert.deepEqual(status(root).blocked_tasks.map(b=>b.task_id),['T001']);
  assert.match(fs.readFileSync(path.join(root,'.gitignore'),'utf8'),/^\.workflow-temp\/$/m);
  write(root,'.workflow-temp/notes.md','# Temporary\n');
  assert.ok(!status(root).changes.some(file=>file.startsWith('.workflow-temp')),'temporary documents stay outside Git');
  assert.throws(()=>messageAssignment(root,'missing','Hello there'),{code:'ASSIGNMENT_ID'});
  messageAssignment(root,first.id,'Proceed with the current text',undefined,blocked.signal.block_id);
  assert.deepEqual(blockedTasks(root,readPlan(root)),[]);
  escalatePlan(root,'Fixture escalation');
  assert.deepEqual(readSignals(first.worktree).map(s=>s.kind),['task-blocked','assignment-message','plan-escalated']);
  assert.ok(readSignals(root).every(s=>s.scope_id==='orchestrated-fixture'));
  // A repeated real problem is a new block; neither a late answer nor a lost-response retry clears it.
  const secondBlock=blockTask(first.worktree,'T001','Needs a decision');
  assert.equal(secondBlock.signal.attempt,2);assert.notEqual(secondBlock.signal.block_id,blocked.signal.block_id);
  assert.throws(()=>messageAssignment(root,first.id,'Missing correlation'),{code:'BLOCK_REQUIRED'});
  assert.throws(()=>messageAssignment(root,first.id,'Late different answer',undefined,blocked.signal.block_id),{code:'BLOCK_STALE'});
  assert.equal(messageAssignment(root,first.id,'Proceed with the current text',undefined,blocked.signal.block_id).duplicate,true);
  assert.equal(blockedTasks(root,readPlan(root))[0].block_id,secondBlock.signal.block_id);
  messageAssignment(root,first.id,'Try the verified local dependency','decision-2',secondBlock.signal.block_id);
  assert.throws(()=>messageAssignment(root,first.id,'Changed content','decision-2',secondBlock.signal.block_id),{code:'SIGNAL_CONFLICT'});
  const thirdBlock=blockTask(first.worktree,'T001','Same dependency still fails after repair','block-3',blocked.signal.problem_id);
  assert.equal(thirdBlock.signal.attempt,3);assert.equal(thirdBlock.signal.escalation_required,true);
  assert.equal(blockTask(first.worktree,'T001','Same dependency still fails after repair','block-3',blocked.signal.problem_id).duplicate,true);
  assert.throws(()=>blockTask(first.worktree,'T001','Changed error','block-3',blocked.signal.problem_id),{code:'SIGNAL_CONFLICT'});
  assert.throws(()=>messageAssignment(root,first.id,'Blindly retry again',undefined,thirdBlock.signal.block_id),{code:'BLOCK_ESCALATION_REQUIRED'});
  assert.match(recover(root,'manual',{role:'orchestrator'}).text,/escalation_required":true/);
  messageAssignment(root,first.id,'Use the user-approved dependency',undefined,thirdBlock.signal.block_id,'Fixture user explicitly selected local package A');
  const nextCycle=blockTask(first.worktree,'T001','New observation',undefined,blocked.signal.problem_id);
  assert.equal(nextCycle.signal.attempt,1,'only explicit user resolution opens a new bounded cycle');
  messageAssignment(root,first.id,'Finish with the approved local package',undefined,nextCycle.signal.block_id);
  assert.deepEqual(blockedTasks(root,readPlan(root)),[]);
  assert.throws(()=>blockTask(root,'T002','Not started'),{code:'TASK_NOT_ACTIVE'});
  // The orchestrator may extend the plan while an executor works; its task and edits survive.
  extendPlan(root,{tasks:[{id:'T005',title:'Write TOOL-A.md',files:['TOOL-A.md']}]},readPlan(root).plan_revision);
  assert.deepEqual(readPlan(root).tasks.map(t=>t.id),['T001','T002','T003','T004','T005','DOCS','R001']);
  commitTask(first.worktree,'T001');
  const merged=startIntegration(root,{id:first.id,source_commit:assignmentStatus(root,first.id).source_commit});
  assert.equal(merged.status,'INTEGRATED');assert.equal(merged.cleanup.status,'DONE');gone(first);
  assert.equal(assignmentStatus(root,first.id).status,'INTEGRATED');
  // Parallel wave: two executors at once, the next sequential task waits for both integrations.
  const second=assign('T002'),third=assign('T003');
  assert.equal(second.status,'NEEDS_SETUP');assert.equal(setupAssignment(root,second.id,{npmCi:true}).status,'READY');
  assert.ok(fs.existsSync(path.join(second.worktree,'node_modules')));
  assert.throws(()=>assign('T004'),{code:'ASSIGNMENT_BARRIER'});
  assert.equal(finish(second,'SECOND.md','# worker-b\n').cleanup.status,'DONE','ignored node_modules does not block removal');gone(second);
  git(root,'worktree','lock',third.worktree);
  const locked=finish(third,'THIRD.md','# worker-c\n');
  assert.equal(locked.status,'INTEGRATED');assert.equal(locked.cleanup.status,'PENDING','a failed removal keeps the integration');
  assert.ok(fs.existsSync(third.worktree));
  git(root,'worktree','unlock',third.worktree);
  for(const [id,file] of [['T004','FOUNDATION.md'],['T005','TOOL-A.md']]) {const next=assign(id);assert.equal(finish(next,file,'# '+id+'\n').cleanup.status,'DONE');gone(next);}
  // DOCS in a worktree retires the specification; main pins the revision before the merge.
  const docs=assign('DOCS');assert.equal(docs.status,'READY');
  const beforeDocs=git(root,'rev-parse','HEAD');
  assert.equal(finish(docs,SPEC,null).status,'INTEGRATED');
  const pinned=readPlan(root).context_pack.documents.find(d=>d.path===SPEC);
  assert.equal(pinned.revision,beforeDocs);assert.equal(fs.existsSync(path.join(root,SPEC)),false);
  assert.doesNotThrow(()=>recover(root),'recovery reads the pinned revision');
  assert.equal(Object.keys(validate(root).resolved).length,6);
  // Delivery runs in main after every other task; its commit sits on top of merge commits.
  startTask(root,'R001');write(root,'release.txt','delivered\n');commitTask(root,'R001');
  assert.equal(readPlan(root).delivery_status,'READY_FOR_ACCEPTANCE');
  assert.equal(Object.keys(validate(root).resolved).length,7);
  const sweep=cleanupAssignments(root);
  assert.deepEqual(sweep.removed.map(r=>r.task_id),['T003']);assert.equal(sweep.only_main,true);
  assert.equal(cleanupAssignments(root).removed.length,0,'repeat is safe');
  assert.equal(git(root,'worktree','list').split('\n').length,1);
  assert.deepEqual(git(root,'branch','--format=%(refname:short)').split('\n'),['main']);
  console.log(JSON.stringify({orchestratedExecutionFixture:true,mainReadOnly:true,barrier:true,signals:true,worktreeCleanup:true,docsPin:true,delivery:true}));
} finally {fs.rmSync(directory,{recursive:true,force:true});}
}

const dialogueDirectory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kit-dialogue-')));
try {
  const root=createFixture(dialogueDirectory);
  fs.appendFileSync(path.join(root,'AGENTS.md'),'\nMANDATORY_ASSIGNMENT_CONSTRAINT\n');
  commitDocumentation(root,['AGENTS.md'],'docs: mandatory fixture restriction');
  write(root,SPEC,'# Addressed dialogue\nUNSELECTED_PARENT_CONTEXT\n');
  createScope(root,{scope_id:'dialogue-fixture',objective:'Orchestrator accepts a specific executor result',approval_note:'Isolated dialogue fixture',
    dialogue_version:1,parallel_allowed:false,max_workers:1,execution_strategy:'orchestrated',execution_reason:'One checked assignment',
    execution_origin_session_id:'orchestrator-fixture',release:false,acceptance_criteria:['Accepted source only'],
    approved_scope:{functional_paths:[],documentation_paths:['README.md',SPEC]},
    context_pack:{documents:[{path:SPEC,required:true}],dependency_task_ids:[],include_last_completed_task:false},
    tasks:[{...task('T001','README.md',[],false),context_pack:{documents:[{path:SPEC,required:true}],dependency_task_ids:[],include_last_completed_task:false}}]});
  const a=createAssignment(root,{id:'dialogue-e',task_id:'T001',base_commit:git(root,'rev-parse','HEAD'),worktree:path.join(dialogueDirectory,'worker')},readPlan(root).plan_revision);
  setupAssignment(root,a.id,{npmCi:true});
  const limitedRecovery=()=>{
    for(const reason of ['startup','compact','manual']){
      const p=recover(a.worktree,reason);
      assert.equal(p.recovery_profile,'assignment-dialogue-v1');assert.equal(p.role,'executor');
      assert.match(p.text,/MANDATORY_ASSIGNMENT_CONSTRAINT/);assert.match(p.text,/workflow_assignment_send/);
      assert.doesNotMatch(p.text,/UNSELECTED_PARENT_CONTEXT|Orchestrator accepts a specific executor result/);
      assert.equal(p.included.includes(SPEC),false);assert.ok(p.text.includes(a.worktree));
    }
    assert.equal(contextPacket(a.worktree).recovery_profile,'assignment-dialogue-v1');
  };
  limitedRecovery();assert.match(recover(root,'manual',{role:'orchestrator'}).text,/UNSELECTED_PARENT_CONTEXT/);
  assert.throws(()=>recover(a.worktree,'manual',{role:'orchestrator'}),{code:'RECOVERY_ROLE'});
  const send=(where,kind,id,extra={})=>applyAssignmentDialogue(where,{assignment_id:a.id,attempt:1,kind,message_id:id,operation_id:id,...extra});
  assert.throws(()=>startTask(a.worktree,'T001'),{code:'ASSIGNMENT_NOT_DISPATCHED'});
  assert.throws(()=>send(a.worktree,'task','bad-role'),{code:'ASSIGNMENT_ROLE'});
  assert.throws(()=>send(a.worktree,'context_request','foreign',{assignment_id:'another-e'}),{code:'ASSIGNMENT_OWNER'});
  assert.throws(()=>send(root,'task','foreign-scope',{scope_id:'another-scope'}),{code:'ASSIGNMENT_CHANGED'});
  send(root,'task','task-1');assert.equal(send(root,'task','task-1').duplicate,true);
  assert.throws(()=>send(root,'task','task-1',{message_id:'different'}),{code:'ASSIGNMENT_DIALOGUE_CONFLICT'});
  startTask(a.worktree,'T001');write(a.worktree,'README.md','# first result\n');commitTask(a.worktree,'T001');
  limitedRecovery();
  const first=assignmentStatus(root,a.id).source_commit;
  assert.throws(()=>startIntegration(root,{id:a.id,source_commit:first}),{code:'ASSIGNMENT_NOT_ACCEPTED'});
  assert.throws(()=>send(root,'result','fake-result',{source_commit:first}),{code:'ASSIGNMENT_ROLE'});
  send(a.worktree,'result','result-1',{source_commit:first});
  assert.throws(()=>send(a.worktree,'acceptance','self-accept',{source_commit:first,result_id:'result-1'}),{code:'ASSIGNMENT_ROLE'});
  assert.throws(()=>send(root,'acceptance','wrong-result',{source_commit:first,result_id:'not-result-1'}),{code:'ASSIGNMENT_RESULT_STALE'});
  send(root,'acceptance','accept-1',{source_commit:first,result_id:'result-1'});
  process.env.WORKFLOW_TEST_FAILPOINT='prepared';
  try {assert.throws(()=>send(root,'revision_request','revise-1',{source_commit:first,result_id:'result-1'}),{code:'TEST_INTERRUPTION'});}
  finally {delete process.env.WORKFLOW_TEST_FAILPOINT;}
  send(root,'revision_request','revise-1',{source_commit:first,result_id:'result-1'});
  assert.equal(send(root,'revision_request','revise-1',{source_commit:first,result_id:'result-1'}).duplicate,true);
  assert.equal(readPlan(a.worktree).tasks[0].commit_ref.iteration,2);
  assert.equal(assignmentDialogueStatus(root,a.id).dialogue.history[0].result.source_commit,first);
  assert.throws(()=>startIntegration(root,{id:a.id,source_commit:first}),{code:'ASSIGNMENT_NOT_ACCEPTED'});
  assert.throws(()=>send(root,'acceptance','stale-accept',{source_commit:first,result_id:'result-1'}),{code:'ASSIGNMENT_STALE'});
  startTask(a.worktree,'T001');write(a.worktree,'README.md','# revised result\n');commitTask(a.worktree,'T001');
  const second=assignmentStatus(root,a.id).source_commit;
  send(a.worktree,'result','result-2',{attempt:2,source_commit:second});
  send(root,'acceptance','accept-2',{attempt:2,source_commit:second,result_id:'result-2'});
  write(a.worktree,'README.md','# uncommitted change\n');
  assert.throws(()=>startIntegration(root,{id:a.id,source_commit:second}));
  write(a.worktree,'README.md','# revised result\n');
  assert.equal(startIntegration(root,{id:a.id,source_commit:second}).status,'INTEGRATED');
  assert.equal(validate(root).resolved.T001.source_commit,second);
  assert.equal(git(root,'show',first+':README.md'),'# first result','previous proof is immutable');
  console.log(JSON.stringify({assignmentDialogue:true,dispatchRequired:true,acceptanceRequired:true,revisionHistory:true}));
} finally {fs.rmSync(dialogueDirectory,{recursive:true,force:true});}
