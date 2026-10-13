import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {install} from '../src/lib/installer.mjs';
import {createScope,startTask} from '../src/lib/actions.mjs';
import {readPlan,writePlan} from '../src/lib/plan.mjs';
import {beginTaskFiles} from '../src/lib/task-files.mjs';
import {handoffParallelTask,assertHandoffCommand} from '../src/lib/task-handoff.mjs';
import {commitCandidate,commitTask} from '../src/lib/transaction.mjs';
import {startIntegration} from '../src/lib/task-integration.mjs';
const roots=[];
const git=(r,...args)=>execFileSync('git',args,{cwd:r,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(r,f,s)=>{fs.mkdirSync(path.dirname(path.join(r,f)),{recursive:true});fs.writeFileSync(path.join(r,f),s);};
const fail=(code,fn)=>assert.throws(fn,e=>e.code===code);
function fixture(){
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kit-handoff-')));roots.push(dir);
 const root=path.join(dir,'main');fs.mkdirSync(root);git(root,'init','-b','main');git(root,'config','user.name','Fixture');git(root,'config','user.email','fixture@test.local');
 write(root,'README.md','# Original\n');write(root,'DELETE.md','# To remove\n');git(root,'add','.');git(root,'commit','-m','baseline');install({project:root,mode:'existing'});
 createScope(root,{scope_id:'handoff',objective:'Recover legacy start',approval_note:'User requests fixture',parallel_allowed:true,max_workers:2,execution_strategy:'parallel',execution_reason:'Fixture',acceptance_criteria:['No data loss'],approved_scope:{functional_paths:[],documentation_paths:['README.md','NEW.md','DELETE.md']},context_pack:{documents:[],include_last_completed_task:false,dependency_task_ids:[]},tasks:[{id:'T001',title:'Foundation',why:'Fixture',dependencies:[],parallel_safe:false,functional_paths:[],documentation_paths:['README.md','NEW.md','DELETE.md'],verification_ids:[],acceptance_criteria:['Files recovered'],expected_commit_message:'docs: foundation'}]});
 const base=git(root,'rev-parse','HEAD'),published=fs.readFileSync(path.join(root,'.harness/plans/todo-plan.md'),'utf8');
 fail('PARALLEL_MAIN_READ_ONLY',()=>startTask(root,'T001'));assert.equal(fs.readFileSync(path.join(root,'.harness/plans/todo-plan.md'),'utf8'),published);
 // Reproduce 1.7.0's accepted task:start without weakening the new guard.
 const plan=readPlan(root),task=plan.tasks[0];beginTaskFiles(root,plan,task);task.implementation_status='IN_PROGRESS';plan.current_task_id='T001';plan.plan_revision++;writePlan(root,plan);
 write(root,'README.md','# Recovered\n');write(root,'NEW.md','# New work\n');fs.unlinkSync(path.join(root,'DELETE.md'));
 const input={id:'recovered',task_id:'T001',worktree:path.join(dir,'worker'),base_commit:base};return {root,base,published,input,revision:plan.plan_revision};
}
try{
 for(const point of [null,'handoff-file-restored','handoff-restored','handoff-file-copied','handoff-copied']){
  const {root,base,published,input,revision}=fixture();
  if(point){process.env.WORKFLOW_TEST_FAILPOINT=point;try{fail('TEST_INTERRUPTION',()=>handoffParallelTask(root,input,revision));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}fail('HANDOFF_PENDING',()=>assertHandoffCommand(root,'task:start'));}
  const result=handoffParallelTask(root,input,revision);assert.equal(result.handoff,true);
  assert.equal(git(root,'rev-parse','HEAD'),base);assert.equal(git(root,'status','--porcelain'),'');assert.equal(fs.readFileSync(path.join(root,'.harness/plans/todo-plan.md'),'utf8'),published);
  assert.equal(fs.readFileSync(path.join(input.worktree,'README.md'),'utf8'),'# Recovered\n');assert.equal(fs.readFileSync(path.join(input.worktree,'NEW.md'),'utf8'),'# New work\n');assert.equal(fs.existsSync(path.join(input.worktree,'DELETE.md')),false);
  handoffParallelTask(root,input,revision);assert.equal(git(root,'worktree','list','--porcelain').split('worktree ').length-1,2);
  startTask(input.worktree,'T001');const committed=commitTask(input.worktree,'T001');assert.equal(committed.excluded_changes.length,0);assert.equal(readPlan(root).tasks[0].commit_status,'PENDING');
  startIntegration(root,{id:input.id,source_commit:committed.sha});assert.equal(readPlan(root).tasks[0].commit_status,'DONE');assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8'),'# Recovered\n');
 }
 // The real installer commits the active plan as part of kit-update. Recover
 // that exact managed transition without rewinding Git or marking the task DONE.
 for(const point of [null,'prepared','handoff-reset-committed']) {
  const {root,input,revision}=fixture();
  commitCandidate(root,{plan:readPlan(root),role:'kit-update',selected:[],message:'chore: fixture Kit upgrade',beforeHead:input.base_commit});
  input.base_commit=git(root,'rev-parse','HEAD');
  if(point) {process.env.WORKFLOW_TEST_FAILPOINT=point;try{fail('TEST_INTERRUPTION',()=>handoffParallelTask(root,input,revision));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}}
  handoffParallelTask(root,input,revision);
  assert.equal(git(root,'status','--porcelain'),'');assert.notEqual(git(root,'rev-parse','HEAD'),input.base_commit);
  assert.equal(readPlan(root).current_task_id,null);assert.equal(readPlan(root).tasks[0].implementation_status,'TODO');
  assert.match(git(root,'log','-1','--format=%B'),/Workflow-Role: plan-adjustment/);
  assert.equal(fs.readFileSync(path.join(input.worktree,'NEW.md'),'utf8'),'# New work\n');
  startTask(input.worktree,'T001');const committed=commitTask(input.worktree,'T001');startIntegration(root,{id:input.id,source_commit:committed.sha});
  assert.equal(readPlan(root).tasks[0].commit_status,'DONE');
 }
 {
  const {root,input,revision}=fixture();write(root,'FOREIGN.md','keep');fail('HANDOFF_SCOPE',()=>handoffParallelTask(root,input,revision));assert.equal(fs.readFileSync(path.join(root,'FOREIGN.md'),'utf8'),'keep');assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8'),'# Recovered\n');
 }
 {
  const {root,input,revision}=fixture();git(root,'add','README.md');fail('HANDOFF_STAGED',()=>handoffParallelTask(root,input,revision));assert.equal(git(root,'diff','--cached','--name-only'),'README.md');
 }
 {
  const {root,input,revision}=fixture();process.env.WORKFLOW_TEST_FAILPOINT='handoff-restored';try{fail('TEST_INTERRUPTION',()=>handoffParallelTask(root,input,revision));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
  write(root,'README.md','# External edit\n');fail('HANDOFF_CONCURRENT',()=>handoffParallelTask(root,input,revision));assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8'),'# External edit\n');
 }
 console.log('task-handoff fixture: early guard, durable recovery, idempotent interruption, verified integration, foreign/staged/concurrent preservation passed');
}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;for(const p of roots)fs.rmSync(p,{recursive:true,force:true});}
