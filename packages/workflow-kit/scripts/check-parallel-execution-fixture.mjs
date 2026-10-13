import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {install} from '../src/lib/installer.mjs';
import {createScope,startTask,commitDocumentation,applyConfig} from '../src/lib/actions.mjs';
import {readPlan,writePlan} from '../src/lib/plan.mjs';
import {beginTaskFiles} from '../src/lib/task-files.mjs';
import {createAssignment,setupAssignment,assignmentStatus} from '../src/lib/task-assignment.mjs';
import {startIntegration,continueIntegration} from '../src/lib/task-integration.mjs';
import {commitTask} from '../src/lib/transaction.mjs';
import {validate,readConfig} from '../src/lib/validate.mjs';

const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(root,file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
const npm=(root,args)=>{
  if(process.platform==='win32') {
    const cli=[path.dirname(process.execPath),...(process.env.Path??process.env.PATH??'').split(path.delimiter)]
      .map(dir=>path.join(dir,'node_modules/npm/bin/npm-cli.js')).find(file=>fs.existsSync(file));
    assert.ok(cli,'npm CLI must accompany Node');return execFileSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  }
  return execFileSync('npm',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
};
export function createFixture(directory) {
  fs.mkdirSync(directory,{recursive:true});const root=path.join(fs.realpathSync(directory),'main');fs.mkdirSync(root);
  git(root,'init','-b','main');git(root,'config','user.name','Parallel Fixture');git(root,'config','user.email','fixture@example.invalid');
  write(root,'.gitignore','node_modules/\n');
  for(const file of ['README.md','SECOND.md','THIRD.md','FOUNDATION.md','TOOL-A.md','TOOL-B.md','TOOL-C.md','RESULT.md'])write(root,file,'# Original\n');
  write(root,'verify-five.mjs',"import assert from 'node:assert/strict';import fs from 'node:fs';if(fs.readFileSync('RESULT.md','utf8').includes('worker-e'))for(const f of ['FOUNDATION.md','TOOL-A.md','TOOL-B.md','TOOL-C.md'])assert.match(fs.readFileSync(f,'utf8'),/worker-/);\n");
  write(root,'vendor/fixture-dep/package.json',JSON.stringify({name:'fixture-dep',version:'1.0.0',type:'module',exports:'./index.mjs'}));
  write(root,'vendor/fixture-dep/index.mjs','export const value=37;\n');
  write(root,'package.json',JSON.stringify({name:'parallel-fixture',version:'1.0.0',private:true,type:'module',
    scripts:{test:'node verify.mjs'},dependencies:{'fixture-dep':'file:vendor/fixture-dep'}}));
  write(root,'verify.mjs',"import assert from 'node:assert/strict';import fs from 'node:fs';import {value} from 'fixture-dep';assert.equal(value,37);if(fs.readFileSync('THIRD.md','utf8').includes('worker-c'))for(const f of ['README.md','SECOND.md'])assert.match(fs.readFileSync(f,'utf8'),/worker-/);\n");
  npm(root,['install','--package-lock-only','--ignore-scripts','--offline','--no-audit','--no-fund']);
  git(root,'add','.');git(root,'commit','-m','fixture baseline');install({project:root,mode:'existing'});
  const config=readConfig(root);config.checks=[{id:'dependency',executable:'npm',args:['test'],required:false,timeout_ms:30000}];applyConfig(root,config);
  npm(root,['ci','--offline','--no-audit','--no-fund']);return root;
}
export function planFixture(root,origin='fixture-origin') {
  const task=(id,file,dependencies=[])=>({id,title:'Write '+file,why:'Parallel fixture',dependencies,parallel_safe:true,
    functional_paths:[],documentation_paths:[file],verification_ids:['dependency'],acceptance_criteria:['Dependency available and output committed'],
    expected_commit_message:'docs: '+file,context_pack:{documents:[{path:'README.md',required:false}],dependency_task_ids:[],include_last_completed_task:false}});
  return createScope(root,{scope_id:'parallel-fixture',objective:'Two independent workers and a dependent task',approval_note:'Isolated automated fixture',
    parallel_allowed:true,max_workers:2,execution_strategy:'parallel',execution_reason:'Independent files',execution_origin_session_id:origin,
    acceptance_criteria:['Independent sources and checked main'],approved_scope:{functional_paths:[],documentation_paths:['README.md','SECOND.md','THIRD.md']},
    context_pack:{documents:[],dependency_task_ids:[],include_last_completed_task:false},
    tasks:[task('T001','README.md'),task('T002','SECOND.md'),task('T003','THIRD.md',['T001','T002'])]});
}
export function planFiveFixture(root,origin) {
  const files=['FOUNDATION.md','TOOL-A.md','TOOL-B.md','TOOL-C.md','RESULT.md'];
  const config=readConfig(root);
  config.checks.push({id:'five',executable:process.execPath,args:['verify-five.mjs'],required:false,timeout_ms:30000});
  applyConfig(root,config);
  const task=(id,file,dependencies,parallel_safe)=>({id,title:'Write '+file,why:'Verified dependency result',dependencies,parallel_safe,
    functional_paths:[],documentation_paths:[file],verification_ids:['dependency','five'],
    acceptance_criteria:['Output committed and dependencies available'],expected_commit_message:'docs: '+file,
    context_pack:{documents:[{path:'README.md',required:false}],dependency_task_ids:[],include_last_completed_task:false}});
  return createScope(root,{scope_id:'parallel-fixture',objective:'Foundation, independent tools, verified final result',
    approval_note:'Isolated automated fixture',parallel_allowed:true,max_workers:3,execution_strategy:'parallel',
    execution_reason:'Foundation precedes independent tools; final result uses their verified integrations.',execution_origin_session_id:origin,
    acceptance_criteria:['Five verified sources, one final response and working main preview'],
    approved_scope:{functional_paths:[],documentation_paths:files},
    context_pack:{documents:[],dependency_task_ids:[],include_last_completed_task:false},
    tasks:[task('T001',files[0],[],false),task('T002',files[1],['T001'],true),task('T003',files[2],['T001'],true),
      task('T004',files[3],['T001'],true),task('T005',files[4],['T002','T003','T004'],false)]});
}
export function legacyStartFixture(root) {
  const plan=readPlan(root),task=plan.tasks[0];beginTaskFiles(root,plan,task);
  task.implementation_status='IN_PROGRESS';plan.current_task_id=task.id;plan.plan_revision++;writePlan(root,plan);
  write(root,'README.md','# worker-a\n');return {legacyStart:true};
}
export function completeFixture(root) {
  const task=readPlan(root).tasks[0];
  if(task.documentation_paths[0]==='THIRD.md')for(const file of ['README.md','SECOND.md'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/worker-/);
  startTask(root,task.id);write(root,task.documentation_paths[0],'# worker-'+({T001:'a',T002:'b',T003:'c',T004:'d',T005:'e'}[task.id])+'\n');
  return commitTask(root,task.id);
}
export function conflictFixture(root) {
  write(root,'README.md','# Main explicit edit\n');return commitDocumentation(root,['README.md'],'docs: fixture concurrent edit');
}
export function correctFixture(root,id) {
  write(root,'README.md','# worker-a resolved in main\n');git(root,'add','--','README.md');return continueIntegration(root,id);
}
export function runFixture() {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kit-parallel-e2e-')));
  try {
    const root=createFixture(directory);planFixture(root);const base=git(root,'rev-parse','HEAD');
    const assign=(id,task_id)=>{
      const result=createAssignment(root,{id,task_id,base_commit:git(root,'rev-parse','HEAD'),worktree:path.join(directory,id)},readPlan(root).plan_revision);
      assert.equal(result.status,'NEEDS_SETUP');
      assert.throws(()=>startTask(result.worktree,task_id),{code:'NEEDS_SETUP'});
      assert.throws(()=>execFileSync(process.execPath,['verify.mjs'],{cwd:result.worktree,stdio:'pipe'}));
      assert.equal(setupAssignment(root,id,{npmCi:true}).status,'READY');
      execFileSync(process.execPath,['verify.mjs'],{cwd:result.worktree});return result;
    };
    const a=assign('first','T001'),b=assign('second','T002');assert.notEqual(a.worktree,b.worktree);
    assert.equal(git(root,'rev-parse','HEAD'),base);completeFixture(a.worktree);completeFixture(b.worktree);
    assert.equal(git(root,'rev-parse','HEAD'),base);assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8'),'# Original\n');
    conflictFixture(root);const first=assignmentStatus(root,a.id),second=assignmentStatus(root,b.id);
    assert.equal(startIntegration(root,{id:a.id,source_commit:first.source_commit}).status,'CONFLICT');
    assert.throws(()=>startTask(root,'T003'),{code:'INTEGRATION_PENDING'});
    assert.throws(()=>startIntegration(root,{id:b.id,source_commit:second.source_commit}),{code:'INTEGRATION_PENDING'});
    const corrected=correctFixture(root,'integration-'+a.id);assert.equal(corrected.status,'INTEGRATED');
    assert.equal(startIntegration(root,{id:a.id,source_commit:first.source_commit}).already_integrated,true);
    startIntegration(root,{id:b.id,source_commit:second.source_commit});
    const third=assign('third','T003');assert.equal(third.base_commit,git(root,'rev-parse','HEAD'));
    completeFixture(third.worktree);startIntegration(root,{id:third.id,source_commit:assignmentStatus(root,third.id).source_commit});
    assert.equal(Object.keys(validate(root).resolved).length,3);
    assert.equal(git(root,'rev-list','--count','--merges',base+'..HEAD'),'3');
    // Documentation pinning after completion must not invalidate historical integrations.
    fs.unlinkSync(path.join(root,'README.md'));commitDocumentation(root,['README.md'],'docs: retire completed context');
    assert.equal(Object.keys(validate(root).resolved).length,3);
    return {parallelExecutionFixture:true,realDependency:true,conflict:true,dependentBase:true,historicalContext:true};
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [mode,root,value]=process.argv.slice(2);
  const result=mode==='--create'?{root:createFixture(root)}:mode==='--plan'?planFixture(root,value)
    :mode==='--plan-five'?planFiveFixture(root,value)
    :mode==='--legacy-start'?legacyStartFixture(root):mode==='--complete'?completeFixture(root):mode==='--conflict'?conflictFixture(root)
      :mode==='--correct'?correctFixture(root,value):runFixture();
  console.log(JSON.stringify(result));
}
