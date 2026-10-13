import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {install} from '../src/lib/installer.mjs';
import {createScope,startTask,commitDocumentation,applyConfig} from '../src/lib/actions.mjs';
import {readPlan} from '../src/lib/plan.mjs';
import {createAssignment} from '../src/lib/task-assignment.mjs';
import {startIntegration,continueIntegration,integrationStatus,inspectIntegrationSource} from '../src/lib/task-integration.mjs';
import {commitTask} from '../src/lib/transaction.mjs';
import {validate,readConfig} from '../src/lib/validate.mjs';
import {localPath,gitPath,allChanges} from '../src/lib/git.mjs';
import {PLAN} from '../src/lib/common.mjs';
const roots=[];
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(root,file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
const fail=(code,fn)=>assert.throws(fn,e=>e.code===code,code);
const cli=(root,...args)=>{
  const r=spawnSync(process.execPath,[path.join(root,'scripts/workflow.mjs'),...args],{cwd:root,encoding:'utf8'});
  return {status:r.status,...JSON.parse(r.stdout)};
};
function fixture() {
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'kit-integration-')));roots.push(directory);
  const root=path.join(directory,'main');fs.mkdirSync(root);git(root,'init','-b','main');
  git(root,'config','user.name','Integration Fixture');git(root,'config','user.email','fixture@test.local');
  write(root,'README.md','# Original\n');write(root,'GUIDE.md','# Original\n');write(root,'THIRD.md','# Original\n');
  git(root,'add','.');git(root,'commit','-m','baseline');install({project:root,mode:'existing'});
  const config=readConfig(root);
  config.checks=[{id:'combined',executable:process.execPath,args:['-e',"const fs=require('fs');if(fs.readFileSync('README.md','utf8').includes('BLOCK')&&fs.readFileSync('GUIDE.md','utf8').includes('worker-b'))process.exit(1)"],required:false,timeout_ms:10000}];
  applyConfig(root,config);
  const task=(id,file,deps=[])=>({id,title:'Write '+file,why:'Integration fixture',dependencies:deps,functional_paths:[],documentation_paths:[file],
    verification_ids:['combined'],acceptance_criteria:['Updated document'],expected_commit_message:'docs: '+file,parallel_safe:true});
  createScope(root,{scope_id:'integrations',objective:'Checked sequential integration',approval_note:'User requests integration fixtures',
    parallel_allowed:true,max_workers:2,execution_strategy:'parallel',execution_reason:'Independent document areas',
    acceptance_criteria:['Source and merge evidence'],approved_scope:{functional_paths:[],documentation_paths:['README.md','GUIDE.md','THIRD.md']},
    context_pack:{documents:[],include_last_completed_task:false,dependency_task_ids:[]},
    tasks:[task('T001','README.md'),task('T002','GUIDE.md'),task('T003','THIRD.md',['T001','T002'])]});
  const assign=(id,task_id)=>{
    const input={id,task_id,worktree:path.join(directory,id),base_commit:git(root,'rev-parse','HEAD')};
    createAssignment(root,input,readPlan(root).plan_revision);return input;
  };
  const complete=(worker,contents)=>{
    const task=readPlan(worker.worktree).tasks[0];startTask(worker.worktree,task.id);
    write(worker.worktree,task.documentation_paths[0],contents);return commitTask(worker.worktree,task.id).sha;
  };
  return {root,assign,complete};
}
try {
  {
    const {root,assign,complete}=fixture(), a=assign('worker-a','T001'), b=assign('worker-b','T002');
    const sourceA=complete(a,'# worker-a\n'), sourceB=complete(b,'# worker-b\n');
    const config=fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8');
    const original=readPlan(root);write(root,'untracked.md','keep');
    fail('INTEGRATION_DIRTY',()=>startIntegration(root,{id:a.id,source_commit:sourceA}));
    assert.equal(fs.readFileSync(path.join(root,'untracked.md'),'utf8'),'keep');fs.unlinkSync(path.join(root,'untracked.md'));
    fail('INTEGRATION_NOT_READY',()=>startIntegration(root,{id:a.id,source_commit:sourceB}));
    process.env.WORKFLOW_TEST_FAILPOINT='integration-prepared';
    try {fail('TEST_INTERRUPTION',()=>startIntegration(root,{id:a.id,source_commit:sourceA}));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
    const firstHead=git(root,'rev-parse','HEAD');
    fail('INTEGRATION_PENDING',()=>startIntegration(root,{id:b.id,source_commit:sourceB}));
    fail('INTEGRATION_PENDING',()=>startTask(root,'T003'));
    assert.equal(cli(root,'plan:extend','--input','missing.json').code,'INTEGRATION_PENDING');
    process.env.WORKFLOW_TEST_FAILPOINT='integration-finalized';
    try {fail('TEST_INTERRUPTION',()=>continueIntegration(root,'integration-'+a.id));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
    assert.equal(fs.existsSync(localPath(root,'transaction.json')),false,'commit receipt survives journal cleanup');
    const result=continueIntegration(root,'integration-'+a.id);
    assert.equal(result.status,'INTEGRATED');
    assert.equal(git(root,'show','-s','--format=%P',result.integration_commit),firstHead+' '+sourceA);
    assert.equal(git(root,'show','-s','--format=%P',sourceA).split(' ').length,1);
    assert.equal(startIntegration(root,{id:a.id,source_commit:sourceA}).already_integrated,true);
    assert.equal(git(root,'rev-parse','HEAD'),result.integration_commit);
    const plan=readPlan(root);assert.equal(plan.tasks.length,3);assert.equal(plan.objective,original.objective);
    assert.equal(plan.tasks[0].commit_ref.source_commit,sourceA);assert.equal(plan.tasks[1].commit_status,'PENDING');
    assert.equal(fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8'),config);
    assert.equal(validate(root).resolved.T001.source_commit,sourceA);
    // Independent second source was based on the old main; preserve T001 while merging T002.
    process.env.WORKFLOW_TEST_FAILPOINT='integration-committed';
    try {fail('TEST_INTERRUPTION',()=>startIntegration(root,{id:b.id,source_commit:sourceB}));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
    const committed=git(root,'rev-parse','HEAD');
    assert.equal(continueIntegration(root,'integration-'+b.id).integration_commit,committed);
    assert.equal(git(root,'rev-parse','HEAD'),committed);assert.deepEqual(allChanges(root),[]);
    const c=assign('dependent','T003');assert.equal(c.base_commit,committed);
    const sourceC=complete(c,'# dependent\n');
    write(root,'.harness/runtime/integrate.json',JSON.stringify({id:c.id,source_commit:sourceC}));
    const viaCli=cli(root,'integration:start','--input','.harness/runtime/integrate.json');
    assert.equal(viaCli.status,'INTEGRATED',JSON.stringify(viaCli));
    const final=validate(root);assert.equal(final.plan.delivery_status,'READY_FOR_ACCEPTANCE');
    assert.equal(Object.keys(final.resolved).length,3);
    assert.equal(cli(root,'validate').ok,true);
    const evidence=JSON.parse(fs.readFileSync(localPath(root,'verification/by-commit/'+viaCli.integration_commit+'.json'),'utf8'));
    assert.equal(evidence.checks[0].status,'PASSED');assert.equal(evidence.commit,viaCli.integration_commit);
  }
  {
    const {root,assign,complete}=fixture(), a=assign('conflict','T001'), b=assign('other','T002');
    const source=complete(a,'# worker changes the same line\n'), sourceB=complete(b,'# worker-b\n');
    write(root,'README.md','# main changes the same line\n');commitDocumentation(root,['README.md'],'docs: main correction');
    assert.equal(startIntegration(root,{id:a.id,source_commit:source}).status,'CONFLICT');
    assert.deepEqual(integrationStatus(root).conflicts,['README.md']);
    assert.equal(readPlan(root).tasks[0].commit_status,'PENDING');
    assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8').includes('<<<<<<<'),true);
    fail('INTEGRATION_PENDING',()=>startIntegration(root,{id:b.id,source_commit:sourceB}));
    write(root,'README.md','# Explicitly reconciled by correction agent\n');git(root,'add','README.md');
    write(root,'foreign.md','preserve');
    fail('INTEGRATION_SCOPE',()=>continueIntegration(root,'integration-'+a.id));
    assert.equal(fs.readFileSync(path.join(root,'foreign.md'),'utf8'),'preserve');fs.unlinkSync(path.join(root,'foreign.md'));
    assert.equal(continueIntegration(root,'integration-'+a.id).status,'INTEGRATED');
    assert.equal(fs.readFileSync(path.join(root,'README.md'),'utf8'),'# Explicitly reconciled by correction agent\n');
    assert.equal(validate(root).resolved.T001.source_commit,source);
  }
  {
    const {root,assign,complete}=fixture(), a=assign('blocking','T001'), b=assign('checked','T002');
    const sourceA=complete(a,'# BLOCK\n'), sourceB=complete(b,'# worker-b\n');
    startIntegration(root,{id:a.id,source_commit:sourceA});const before=git(root,'rev-parse','HEAD');
    fail('INTEGRATION_CHECKS_FAILED',()=>startIntegration(root,{id:b.id,source_commit:sourceB}));
    assert.equal(git(root,'rev-parse','HEAD'),before);assert.equal(readPlan(root).tasks[1].commit_status,'PENDING');
    assert.equal(integrationStatus(root).status,'CHECKS_FAILED');assert.equal(fs.existsSync(gitPath(root,'MERGE_HEAD')),true);
    write(root,'GUIDE.md','# compatible correction\n');
    assert.equal(continueIntegration(root,'integration-'+b.id).status,'INTEGRATED');
    assert.equal(validate(root).resolved.T002.source_commit,sourceB);
    // A third ordinary commit is not a valid worker result, even if files are allowed.
    const tree=git(root,'rev-parse',sourceB+'^{tree}');
    const foreign=execFileSync('git',['commit-tree',tree,'-p',sourceB],{cwd:root,input:'foreign commit\n',encoding:'utf8'}).trim();
    fail('INTEGRATION_HISTORY',()=>inspectIntegrationSource(root,foreign,readPlan(root).tasks[1],'integrations'));
  }
  console.log('task-integration fixture: CLI, two parents, source proof, dependencies, serial merges, parent plan, conflicts, checks, preserved foreign edits, crash retries and Git recovery passed');
} finally {
  delete process.env.WORKFLOW_TEST_FAILPOINT;
  for(const root of roots)fs.rmSync(root,{recursive:true,force:true});
}
