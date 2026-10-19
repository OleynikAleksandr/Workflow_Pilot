import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pendingKitTransactions} from '../src/backend/bootstrap.mjs';

const kitProject=(root,name)=>{
  const folder=path.join(root,name);fs.mkdirSync(path.join(folder,'.harness'),{recursive:true});
  fs.writeFileSync(path.join(folder,'.harness/workflow.json'),'{}');return folder;
};

test('startup: missing, broken and pending Kit projects do not stop the service; pending active work is held',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'wp-bootstrap-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const healthy=kitProject(root,'Healthy');execFileSync('git',['init','-q',healthy]);
  // A worktree of a deleted project: its .git points to a repository that no longer exists.
  const orphan=kitProject(root,'Orphan worktree');
  fs.writeFileSync(path.join(orphan,'.git'),'gitdir: '+path.join(root,'Deleted/.git/worktrees/orphan')+'\n');
  const projects=[{workspace:healthy},{workspace:orphan},{workspace:path.join(root,'Gone')},{workspace:'relative'}];
  assert.deepEqual(pendingKitTransactions(projects),[],'the real Kit journal read skips the broken worktree');
  assert.deepEqual(pendingKitTransactions(projects,{readJournal:workspace=>{
    if(workspace===orphan)throw Object.assign(new Error('not a git repository'),{code:'COMMAND_FAILED'});return null;}}),[]);
  assert.deepEqual(pendingKitTransactions(projects,{readJournal:workspace=>workspace===healthy?{phase:'PREPARED'}:null}),[healthy]);
  let archivedReads=0;
  assert.deepEqual(pendingKitTransactions([{workspace:healthy,projectId:'parent',archivedAt:1},
    {workspace:orphan,parentWorkspace:healthy,parentProjectId:'parent'}],{readJournal:()=>{archivedReads++;return {phase:'PREPARED'};}}),[]);
  assert.equal(archivedReads,0);
  assert.deepEqual(pendingKitTransactions([{workspace:healthy,archivedAt:1}],{readJournal:()=>({phase:'PREPARED'})}),[]);
});
