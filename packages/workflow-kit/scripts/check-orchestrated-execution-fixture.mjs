import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createFixture} from './check-parallel-execution-fixture.mjs';
import {createScope,startTask,applyConfig} from '../src/lib/actions.mjs';
import {readPlan} from '../src/lib/plan.mjs';
import {createAssignment,setupAssignment,assignmentStatus,cleanupAssignments} from '../src/lib/task-assignment.mjs';
import {startIntegration} from '../src/lib/task-integration.mjs';
import {extendPlan} from '../src/lib/extend-plan.mjs';
import {blockTask,messageAssignment,escalatePlan,readSignals,blockedTasks} from '../src/lib/signals.mjs';
import {commitTask} from '../src/lib/transaction.mjs';
import {validate,readConfig} from '../src/lib/validate.mjs';
import {recover} from '../src/lib/recovery.mjs';

const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(root,file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
const SPEC='docs/planning/orchestration.md';
const task=(id,file,dependencies,parallel_safe,checks=[])=>({id,title:'Write '+file,why:'Orchestrated fixture',dependencies,parallel_safe,
  functional_paths:[],documentation_paths:[file],verification_ids:checks,acceptance_criteria:['Output committed'],expected_commit_message:'docs: '+file});

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
    tasks:[task('T001','README.md',[],false),task('T002','SECOND.md',['T001'],true,['dependency']),task('T003','THIRD.md',['T001'],true),
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
  assert.throws(()=>messageAssignment(root,'missing','Hello there'),{code:'ASSIGNMENT_ID'});
  messageAssignment(root,first.id,'Proceed with the current text');
  assert.deepEqual(blockedTasks(root,readPlan(root)),[]);
  escalatePlan(root,'Fixture escalation');
  assert.deepEqual(readSignals(first.worktree).map(s=>s.kind),['task-blocked','assignment-message','plan-escalated']);
  assert.ok(readSignals(root).every(s=>s.scope_id==='orchestrated-fixture'));
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
