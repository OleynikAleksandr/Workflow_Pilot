import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {install} from '../src/lib/installer.mjs';
import {createScope,startTask,applyPlan} from '../src/lib/actions.mjs';
import {readPlan} from '../src/lib/plan.mjs';
import {createAssignment,assignmentStatus,setupAssignment,readAssignment,assertAssignment} from '../src/lib/task-assignment.mjs';
import {commitTask} from '../src/lib/transaction.mjs';
import {localPath,gitPath} from '../src/lib/git.mjs';
import {withLock,PLAN} from '../src/lib/common.mjs';
import {recover} from '../src/lib/recovery.mjs';
const roots=[];
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(root,file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
const fail=(code,fn)=>assert.throws(fn,e=>e.code===code);
function fixture({environment=false}={}) {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kit-assignment-')));roots.push(directory);
  const root=path.join(directory,'main');fs.mkdirSync(root);git(root,'init','-b','main');
  git(root,'config','user.name','Assignment Fixture');git(root,'config','user.email','fixture@test.local');
  write(root,'README.md','# Fixture\n');write(root,'GUIDE.md','# Guide\n');write(root,'.gitignore','generated/\nnode_modules/\n');
  if(environment) {
    write(root,'fixture-dep/package.json',JSON.stringify({name:'fixture-dep',version:'1.0.0'}));
    write(root,'package.json',JSON.stringify({name:'assignment-fixture',version:'1.0.0',private:true,devDependencies:{'fixture-dep':'file:./fixture-dep'},scripts:{
      pretest:'node generate.cjs',test:'node verify.cjs'}}));
    write(root,'generate.cjs',"const fs=require('fs');fs.mkdirSync('generated',{recursive:true});fs.writeFileSync('generated/ready','yes');\n");
    write(root,'verify.cjs',"require('assert').equal(require('fs').readFileSync('generated/ready','utf8'),'yes');\n");
    execFileSync(process.platform==='win32'?'npm.cmd':'npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],{cwd:root,stdio:'pipe'});
  }
  git(root,'add','.');git(root,'commit','-m','baseline');install({project:root,mode:'existing'});
  if(environment) {
    const config=JSON.parse(fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8'));
    config.checks=[{id:'fixture',executable:process.platform==='win32'?'npm.cmd':'npm',args:['test'],required:false,timeout_ms:30000}];
    // Configure through the managed API before creating the parent scope.
    write(root,'.harness/runtime/config.json',JSON.stringify(config));
    const r=spawnSync(process.execPath,[path.join(root,'scripts/workflow.mjs'),'config:apply','--input',path.join(root,'.harness/runtime/config.json')],{cwd:root,encoding:'utf8'});
    assert.equal(r.status,0,r.stdout+r.stderr);
  }
  const task=(id,file,deps=[])=>({id,title:'Write '+file,why:'Fixture',dependencies:deps,functional_paths:[],documentation_paths:[file],
    verification_ids:environment?['fixture']:[],acceptance_criteria:['Updated document'],expected_commit_message:'docs: '+file,parallel_safe:true});
  createScope(root,{scope_id:'assignments',objective:'Independent worktrees',approval_note:'User requests assignment fixtures',
    parallel_allowed:true,max_workers:2,execution_strategy:'parallel',execution_reason:'Independent document areas',
    acceptance_criteria:['Independent commits'],approved_scope:{functional_paths:[],documentation_paths:['README.md','GUIDE.md','THIRD.md']},
    context_pack:{documents:[],include_last_completed_task:false,dependency_task_ids:[]},
    tasks:[task('T001','README.md'),task('T002','GUIDE.md'),task('T003','THIRD.md',['T001'])]});
  const base=git(root,'rev-parse','HEAD'), revision=readPlan(root).plan_revision;
  const input=(id,task_id)=>({id,task_id,worktree:path.join(directory,id),base_commit:base});
  return {root,directory,base,revision,input};
}
try {
  {
    const {root,base,revision,input,directory}=fixture();
    const a=input('worker-a','T001'), b=input('worker-b','T002');
    const hooks=fs.readFileSync(gitPath(root,'hooks/pre-commit'),'utf8');
    fail('DEPENDENCY_PENDING',()=>createAssignment(root,input('dependent','T003'),revision));
    const occupied=path.join(directory,'occupied');fs.mkdirSync(occupied);write(occupied,'keep','mine');
    fail('ASSIGNMENT_PATH',()=>createAssignment(root,{...a,worktree:occupied},revision));
    assert.equal(fs.readFileSync(path.join(occupied,'keep'),'utf8'),'mine');
    fs.symlinkSync(directory,path.join(directory,'linked'),'dir');
    fail('SYMLINK_PATH',()=>createAssignment(root,{...a,worktree:path.join(directory,'linked','child')},revision));
    git(root,'branch','workflow/occupied');
    fail('ASSIGNMENT_BRANCH',()=>createAssignment(root,{...input('occupied','T001'),worktree:path.join(directory,'unused')},revision));
    const first=createAssignment(root,a,revision);
    assert.equal(first.status,'READY');assert.equal(git(root,'rev-parse','HEAD'),base);
    assert.equal(readPlan(root).tasks[0].commit_status,'PENDING');
    const childPlan=readPlan(a.worktree);
    assert.equal(childPlan.tasks.length,1);assert.equal(childPlan.assignment.parent_task_id,'T001');
    assert.equal(childPlan.assignment.base_commit,base);assert.deepEqual(childPlan.tasks[0].dependencies,[]);
    assert.notEqual(childPlan.scope_id,readPlan(root).scope_id);
    const initial=git(a.worktree,'rev-parse','HEAD');
    assert.equal(createAssignment(root,a,revision).status,'READY');
    assert.equal(git(a.worktree,'rev-parse','HEAD'),initial,'retry does not create another commit');
    fail('ASSIGNMENT_REUSE',()=>createAssignment(root,{...a,task_id:'T002'},revision));
    fail('ASSIGNMENT_EXISTS',()=>createAssignment(root,input('duplicate','T001'),revision));
    fail('ASSIGNMENT_NESTED',()=>createAssignment(a.worktree,b,1));
    fail('ASSIGNMENT_READ_ONLY',()=>applyPlan(a.worktree,{objective:'Expanded'},1));
    const forged=structuredClone(childPlan);forged.tasks[0].verification_ids.push('other');
    fail('ASSIGNMENT_CONTRACT',()=>assertAssignment(a.worktree,forged));
    fail('ASSIGNMENT_MISSING',()=>assertAssignment(root,{...childPlan}));
    createAssignment(root,b,revision);
    assert.notEqual(localPath(root,'operation.lock'),localPath(a.worktree,'operation.lock'));
    assert.notEqual(localPath(a.worktree,'transaction.json'),localPath(b.worktree,'transaction.json'));
    assert.notEqual(gitPath(a.worktree,'index'),gitPath(b.worktree,'index'));
    withLock(localPath(a.worktree,'operation.lock'),()=>startTask(b.worktree,'T002'));
    startTask(a.worktree,'T001');
    write(a.worktree,'README.md','# Worker A\n');write(a.worktree,'EXTRA.md','# Outside\n');
    fail('ASSIGNMENT_CONTRACT',()=>commitTask(a.worktree,'T001'));
    assert.equal(git(root,'rev-parse','HEAD'),base);
    fs.unlinkSync(path.join(a.worktree,'EXTRA.md'));
    write(b.worktree,'GUIDE.md','# Worker B\n');
    const resultA=commitTask(a.worktree,'T001'),resultB=commitTask(b.worktree,'T002');
    assert.ok(resultA.sha&&resultB.sha);
    assert.equal(assignmentStatus(root,a.id).status,'READY_FOR_INTEGRATION');
    assert.equal(assignmentStatus(a.worktree).source_commit,resultA.sha);
    assert.equal(createAssignment(root,a,revision).source_commit,resultA.sha);
    assert.equal(readPlan(root).tasks[0].commit_status,'PENDING');
    assert.equal(git(root,'rev-parse','HEAD'),base);
    assert.equal(fs.readFileSync(gitPath(root,'hooks/pre-commit'),'utf8'),hooks);
    assert.match(recover(a.worktree).text,/готово к интеграции/);
    const forbidden=spawnSync(process.execPath,[path.join(a.worktree,'scripts/workflow.mjs'),'plan:extend','--input','missing.json'],{cwd:a.worktree,encoding:'utf8'});
    assert.equal(forbidden.status,1);assert.match(forbidden.stdout,/ASSIGNMENT_READ_ONLY/);
  }
  {
    const {root,revision,input,base}=fixture();const a=input('interrupted','T001');
    process.env.WORKFLOW_TEST_FAILPOINT='assignment-worktree';
    try {fail('TEST_INTERRUPTION',()=>createAssignment(root,a,revision));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
    assert.equal(git(a.worktree,'rev-parse','HEAD'),base);
    assert.equal(createAssignment(root,a,revision).status,'READY');
    assert.equal(git(root,'worktree','list','--porcelain').split('worktree ').length-1,2);
  }
  {
    const {root,revision,input}=fixture({environment:true});const a=input('setup','T001');
    assert.equal(createAssignment(root,a,revision).status,'NEEDS_SETUP');
    fail('NEEDS_SETUP',()=>startTask(a.worktree,'T001'));
    assert.equal(readPlan(a.worktree).current_task_id,null,'blocked setup does not start task');
    const shared=path.join(root,'node_modules');fs.mkdirSync(shared);
    fs.symlinkSync(shared,path.join(a.worktree,'node_modules'),'dir');
    fail('SYMLINK_PATH',()=>setupAssignment(root,a.id,{npmCi:true}));
    fs.unlinkSync(path.join(a.worktree,'node_modules'));
    assert.equal(setupAssignment(root,a.id,{npmCi:true}).status,'READY');
    assert.equal(readAssignment(a.worktree).setup[a.worktree].status,'PASSED');
    assert.equal(fs.existsSync(path.join(a.worktree,'generated/ready')),true,'setup runs the standard pretest before dispatch');
    fs.unlinkSync(path.join(a.worktree,'generated/ready'));
    startTask(a.worktree,'T001');write(a.worktree,'README.md','# Own environment\n');commitTask(a.worktree,'T001');
    assert.equal(fs.readFileSync(path.join(a.worktree,'generated/ready'),'utf8'),'yes','standard pretest generated ignored assets in its own tree');
    assert.equal(fs.existsSync(path.join(root,'generated/ready')),false);
  }
  console.log('task-assignment fixture: isolated Git state, managed local plan, ownership, retries, worker scope, npm ci and pretest resources passed');
} finally {
  delete process.env.WORKFLOW_TEST_FAILPOINT;
  for(const root of roots)fs.rmSync(root,{recursive:true,force:true});
}

