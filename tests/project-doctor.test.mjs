import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { install } from '@webpilot/workflow-kit/lib/installer';
import { VERSION } from '@webpilot/workflow-kit/lib/common';
import { inspectProject, repairProject } from '../resources/project-doctor/core.mjs';
import { backupAndWrite, readFile } from '../resources/project-doctor/files.mjs';
import { WorkspaceSetup } from '../src/workspace-setup.mjs';
import { gitPath } from '@webpilot/workflow-kit/lib/git';
const env = { ...process.env, GIT_AUTHOR_NAME: 'Doctor Test', GIT_AUTHOR_EMAIL: 'doctor@example.invalid', GIT_COMMITTER_NAME: 'Doctor Test', GIT_COMMITTER_EMAIL: 'doctor@example.invalid' };
function fixture(t) {
  const parent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'web-pilot-doctor-test-')));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'Проект'); fs.mkdirSync(root);
  execFileSync('git', ['init','-b','main'], { cwd: root, env });
  execFileSync('git', ['config','user.name','Doctor Test'], { cwd: root });
  execFileSync('git', ['config','user.email','doctor@example.invalid'], { cwd: root });
  install({ project: root, mode: 'existing' });
  return root;
}
const text = (root, name) => fs.readFileSync(path.join(root,name),'utf8');
function stale(root) {
  const file = path.join(root,'.harness/kit-manifest.json'), data=JSON.parse(fs.readFileSync(file));
  data.version='1.2.0'; for(const e of data.files.filter(e=>e.kind==='owned'))e.hash='0'.repeat(64);
  fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n'); return fs.readFileSync(file);
}
test('stale manifest repaired from trusted complete kit, backup and user staging preserved, repeat is no-op', async t => {
  const root=fixture(t), original=stale(root), plan=text(root,'.harness/plans/todo-plan.md');
  fs.writeFileSync(path.join(root,'user.txt'),'user work');execFileSync('git',['add','user.txt'],{cwd:root});
  const index=fs.readFileSync(gitPath(root,'index')), head=execFileSync('git',['rev-parse','HEAD'],{cwd:root});
  const before=inspectProject(root);assert.equal(before.issues.length,0,JSON.stringify(before.issues));assert.ok(before.repairs.length);
  assert.deepEqual(fs.readFileSync(path.join(root,'.harness/kit-manifest.json')),original);
  const repaired=repairProject(root,before.fingerprint);assert.equal(repaired.issues.length,0);assert.ok(repaired.backupPath);
  const journal=JSON.parse(fs.readFileSync(path.join(repaired.backupPath,'repair.json')));
  const backup=journal.entries.find(e=>e.file.endsWith('kit-manifest.json'));
  assert.deepEqual(fs.readFileSync(path.join(repaired.backupPath,backup.backup)),original);
  assert.deepEqual(fs.readFileSync(gitPath(root,'index')),index);assert.deepEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:root}),head);
  assert.equal(text(root,'.harness/plans/todo-plan.md'),plan);assert.equal(text(root,'user.txt'),'user work');
  assert.equal((await new WorkspaceSetup({environment:env}).preview({mode:'existing',workspace:root})).ready,true);
  assert.equal(repairProject(root).repaired,false);
});
test('missing owned file and hooks restored, command permissions repaired', async t=>{
  const root=fixture(t);fs.unlinkSync(path.join(root,'.harness/kit/lib/recovery.mjs'));fs.unlinkSync(gitPath(root,'hooks/pre-commit'));
  if(process.platform!=='win32')fs.chmodSync(path.join(root,'scripts/workflow'),0o644);
  const result=repairProject(root);assert.equal(result.issues.length,0,JSON.stringify(result.issues));assert.ok(result.repairs.length>=2);
  assert.equal((await new WorkspaceSetup({environment:env}).preview({mode:'existing',workspace:root})).ready,true);
});
test('unknown modification blocks all writes even with stale manifest', t=>{
  const root=fixture(t), original=stale(root), file=path.join(root,'.harness/kit/lib/common.mjs');fs.appendFileSync(file,'\n// unknown change\n');
  const content=fs.readFileSync(file);const r=repairProject(root);assert.ok(r.issues.length);assert.equal(r.backupPath,undefined);
  assert.deepEqual(fs.readFileSync(file),content);assert.deepEqual(fs.readFileSync(path.join(root,'.harness/kit-manifest.json')),original);
});
test('unknown extra runtime file blocks reconciliation',t=>{
  const root=fixture(t);stale(root);fs.writeFileSync(path.join(root,'.harness/kit/extra.mjs'),'throw Error("never execute")');
  assert.ok(repairProject(root).issues.some(e=>e.path.includes('extra.mjs')));
});
test('broken manifest and semantic plan do not get guessed',t=>{
  const root=fixture(t), mf=path.join(root,'.harness/kit-manifest.json'),original=fs.readFileSync(mf);
  fs.writeFileSync(mf,'{');assert.ok(repairProject(root).issues.length);assert.equal(fs.readFileSync(mf,'utf8'),'{');
  fs.writeFileSync(mf,original);fs.writeFileSync(path.join(root,'.harness/plans/todo-plan.md'),'lost plan');assert.ok(repairProject(root).issues.length);
});
test('readable projection rebuilt from valid canonical plan only',t=>{
  const root=fixture(t),file=path.join(root,'.harness/plans/todo-plan.md'),original=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,original+'\nwrong projection\n');const r=repairProject(root);assert.equal(r.issues.length,0,JSON.stringify(r.issues));assert.equal(fs.readFileSync(file,'utf8'),original);
});
test('changed snapshot rejected and modified hook preserved',t=>{
  const root=fixture(t);stale(root);const before=inspectProject(root);fs.appendFileSync(path.join(root,'docs/architecture/OVERVIEW.md'),'\nnew user text');
  assert.throws(()=>repairProject(root,before.fingerprint),{code:'DOCTOR_CHANGED'});
  const hook=gitPath(root,'hooks/pre-commit');fs.writeFileSync(hook,fs.readFileSync(hook,'utf8').replace('git-hook pre-commit','git-hook changed'));
  assert.ok(repairProject(root).issues.some(e=>e.path==='Git/pre-commit'));
});
test('symlink target never read or overwritten', {skip:process.platform==='win32'},t=>{
  const root=fixture(t),file=path.join(root,'.harness/kit/lib/common.mjs'),outside=path.join(path.dirname(root),'outside');fs.writeFileSync(outside,'PRIVATE');fs.unlinkSync(file);fs.symlinkSync(outside,file);
  assert.ok(repairProject(root).issues.some(e=>e.code==='DOCTOR_SYMLINK'));assert.equal(fs.readFileSync(outside,'utf8'),'PRIVATE');
});
test('write failure rolls back already written files and leaves recovery backup',t=>{
  const root=fixture(t),first=path.join(root,'first.txt'),second=path.join(root,'second.txt');fs.writeFileSync(first,'original');fs.writeFileSync(second,'keep');
  // A late invalid mode makes the second atomic write fail after the first succeeded.
  assert.throws(()=>backupAndWrite(root,[{file:first,content:'changed',mode:0o644,label:'one'},{file:second,content:'change',mode:-1,label:'two'}]));
  assert.equal(readFile(first).content.toString(),'original');assert.equal(readFile(second).content.toString(),'keep');
});

test('interrupted commit is finished only when the exact commit already exists',t=>{
  const root=fixture(t);
  // Generate a real managed scope/commit with the bundled CLI and deterministic failpoint.
  const cli=path.join(root,'scripts/workflow.mjs');
  const draft={scope_id:'doctor-test',objective:'Doctor transaction fixture',approval_note:'Approved isolated doctor transaction fixture',acceptance_criteria:['Stored'],approved_scope:{functional_paths:[],documentation_paths:['README.md'],max_functional_files_per_task:3},context_pack:{documents:[],include_last_completed_task:false,dependency_task_ids:[]},tasks:[{id:'T001',title:'Fixture',why:'Test recovery',dependencies:[],functional_paths:[],documentation_paths:['README.md'],acceptance_criteria:['Stored'],verification_ids:[],expected_commit_message:'docs: fixture'}]};
  const input=path.join(root,'.harness/runtime/draft.json');fs.writeFileSync(input,JSON.stringify(draft));
  execFileSync(process.execPath,[cli,'scope:create','--input',input],{cwd:root,env});
  execFileSync(process.execPath,[cli,'task:start','T001'],{cwd:root,env});fs.appendFileSync(path.join(root,'README.md'),'\nfixture\n');
  assert.throws(()=>execFileSync(process.execPath,[cli,'commit','--task','T001'],{cwd:root,env:{...env,WORKFLOW_TEST_FAILPOINT:'prepared'},stdio:'pipe'}));
  const blocked=repairProject(root);assert.ok(blocked.issues.some(e=>e.code==='DOCTOR_PENDING'));
  assert.throws(()=>execFileSync(process.execPath,[cli,'commit','--task','T001'],{cwd:root,env:{...env,WORKFLOW_TEST_FAILPOINT:'committed'},stdio:'pipe'}));
  const before=execFileSync('git',['rev-parse','HEAD'],{cwd:root});
  const fixed=repairProject(root);assert.equal(fixed.issues.length,0,JSON.stringify(fixed.issues));assert.ok(fixed.backupPath);
  assert.equal(fs.existsSync(gitPath(root,'workflow-kit/transaction.json')),false);assert.deepEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:root}),before);
});

import { withSessionPlan, listPlans } from '@webpilot/workflow-kit/lib/session-plans';
import { createScope, preparePlan } from '@webpilot/workflow-kit/lib/actions';
test('Doctor and readiness ignore historical plan payloads and preserve them byte-for-byte', async t => {
  const root=fixture(t);
  const historyDir=path.join(root,'.harness/plans/archive/legacy-session-plans/by-session');
  fs.mkdirSync(historyDir,{recursive:true});
  const historical=path.join(historyDir,'oversized-legacy.md');
  const bytes='invalid historical plan\n'+'x'.repeat(220000);
  fs.writeFileSync(historical,bytes);

  const inspected=inspectProject(root);
  assert.deepEqual(inspected.issues,[],JSON.stringify(inspected.issues));
  assert.equal(fs.readFileSync(historical,'utf8'),bytes);
  const repaired=repairProject(root);
  assert.deepEqual(repaired.issues,[],JSON.stringify(repaired.issues));
  assert.equal(fs.readFileSync(historical,'utf8'),bytes);
  const health=await new WorkspaceSetup({environment:env}).preview({mode:'existing',workspace:root});
  assert.equal(health.ready,true,JSON.stringify(health));
  assert.equal(fs.readFileSync(historical,'utf8'),bytes);
});

test('1.4.0 manifest reconciles to the trusted bundled Kit and missing task-required documents block repair', t => {
  const root = fixture(t), manifestFile = path.join(root, '.harness/kit-manifest.json');
  const manifest = JSON.parse(text(root, '.harness/kit-manifest.json')); manifest.version = '1.4.0';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  const repaired = repairProject(root);
  assert.deepEqual(repaired.issues, []); assert.ok(repaired.backupPath);
  assert.equal(JSON.parse(text(root, '.harness/kit-manifest.json')).version, VERSION);
  const required = 'docs/task-required.md'; fs.writeFileSync(path.join(root, required), '# Task required\n');
  withSessionPlan(root, { sessionId: 'task-document' }, () => createScope(root, {
    scope_id: 'task-document', objective: 'Task document fixture', approval_note: 'Approved fixture', acceptance_criteria: ['Checked'],
    approved_scope: { functional_paths: [], documentation_paths: [required], max_functional_files_per_task: 3 },
    tasks: [{ id: 'T1', title: 'Fixture', why: 'Required context', dependencies: [], functional_paths: [], documentation_paths: [required],
      context_pack: { documents: [{ path: required, required: true, revision: 'WORKTREE' }] },
      acceptance_criteria: ['Checked'], verification_ids: [], expected_commit_message: 'docs: fixture' }],
  }));
  fs.unlinkSync(path.join(root, required));
  const before = fs.readFileSync(manifestFile), result = repairProject(root);
  assert.ok(result.issues.some(issue => issue.path === required));
  assert.equal(result.backupPath, undefined); assert.deepEqual(fs.readFileSync(manifestFile), before);
});

test('Doctor accepts every version Workspace Setup supports and rejects unknown ones', t => {
  const root = fixture(t), manifestFile = path.join(root, '.harness/kit-manifest.json');
  const original = fs.readFileSync(manifestFile, 'utf8');
  const withVersion = version => { const data = JSON.parse(original); data.version = version; fs.writeFileSync(manifestFile, JSON.stringify(data)); };
  for (const version of ['1.0.0', '1.4.13', '1.5.0', '1.5.6', '1.6.0', VERSION]) {
    withVersion(version);
    assert.ok(!inspectProject(root).issues.some(item => item.code === 'DOCTOR_VERSION'), version);
  }
  withVersion('0.9.0');
  assert.ok(inspectProject(root).issues.some(item => item.code === 'DOCTOR_VERSION'));
});
