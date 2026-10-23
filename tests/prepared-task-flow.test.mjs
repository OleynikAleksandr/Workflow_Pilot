import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createFixture} from '../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import {createSimplePlan} from '../packages/workflow-kit/src/lib/simple-workflow.mjs';
import {readPlan,validatePlan,renderPlan,parsePlan} from '../packages/workflow-kit/src/lib/plan.mjs';
import {reviewPlanDigest} from '../packages/workflow-kit/src/lib/review-state.mjs';
import {createAssignment,setupAssignment,assignmentStatus} from '../packages/workflow-kit/src/lib/task-assignment.mjs';
import {applyAssignmentDialogue,assignmentDialogueStatus} from '../packages/workflow-kit/src/lib/assignment-dialogue.mjs';
import {setPlanPermission} from '../packages/workflow-kit/src/lib/plan-permission.mjs';
import {recover} from '../packages/workflow-kit/src/lib/recovery.mjs';
import {startTask} from '../packages/workflow-kit/src/lib/actions.mjs';
import {commitTask} from '../packages/workflow-kit/src/lib/transaction.mjs';
import {startIntegration} from '../packages/workflow-kit/src/lib/task-integration.mjs';
import {userChoseMode} from './fixtures/execution-mode.mjs';

test('planning briefs survive simple DOCS normalization, review digest and verified integration without becoming E bootstrap',t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'prepared-plan-')));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const root=createFixture(directory),spec='docs/planning/prepared.md';
  fs.mkdirSync(path.dirname(path.join(root,spec)),{recursive:true});fs.writeFileSync(path.join(root,spec),'# Selected scope\n');
  const brief='PRIVATE_PLANNING_BRIEF: update only README and return exact proof.';
  userChoseMode(root,'fixture-o');
  createSimplePlan(root,{id:'brief-plan',spec,objective:'Prepared assignments',parallel_allowed:false,max_workers:1,
    execution_strategy:'orchestrated',execution_reason:'Isolated fixture',execution_origin_session_id:'fixture-o',release:false,
    tasks:[{id:'T001',title:'Update README',files:['README.md'],task_brief:brief},
      {id:'DOCS',title:'Documents',files:[spec],task_brief:'DOCS_BASE: add verified results later.'}]});
  const plan=readPlan(root);
  assert.equal(plan.tasks[0].task_brief,brief);assert.match(plan.tasks[1].task_brief,/DOCS_BASE/);
  assert.equal(parsePlan(renderPlan(plan)).tasks[0].task_brief,brief);
  const changed=structuredClone(plan);changed.tasks[0].task_brief+=' changed';
  assert.notEqual(reviewPlanDigest(plan),reviewPlanDigest(changed));
  for(const value of ['',null,42,' ','я'.repeat(6001)]){
    const invalid=structuredClone(plan);invalid.tasks[0].task_brief=value;
    assert.throws(()=>validatePlan(invalid),{code:'PLAN_SCHEMA'});
  }
  const legacy=structuredClone(plan);delete legacy.tasks[0].task_brief;assert.doesNotThrow(()=>validatePlan(legacy));
  setPlanPermission(root,{scope_id:plan.scope_id,backend_id:'fixture',backend_pid:process.pid,active:true});
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  const a=createAssignment(root,{id:'brief-e',task_id:'T001',base_commit:git('rev-parse','HEAD'),worktree:path.join(directory,'worker')},plan.plan_revision);
  setupAssignment(root,a.id,{npmCi:true});
  assert.equal(readPlan(a.worktree).tasks[0].task_brief,brief,'immutable child contract retained');
  assert.equal(assignmentDialogueStatus(root,a.id).task_brief,brief);
  assert.equal(Object.hasOwn(assignmentDialogueStatus(a.worktree,a.id),'task_brief'),false);
  for(const reason of ['startup','compact','manual'])assert.doesNotMatch(recover(a.worktree,reason).text,/PRIVATE_PLANNING_BRIEF/);
  assert.match(recover(root,'compact',{role:'orchestrator'}).text,/PRIVATE_PLANNING_BRIEF/);
  const digest=assignmentDialogueStatus(root,a.id).contract_digest;
  const send=(where,kind,id,extra={})=>applyAssignmentDialogue(where,{assignment_id:a.id,attempt:1,kind,message_id:id,operation_id:id,...extra});
  assert.throws(()=>send(root,'task','stale',{contract_digest:'wrong'}),{code:'ASSIGNMENT_CONTRACT_CHANGED'});
  send(root,'task','task',{contract_digest:digest});
  startTask(a.worktree,'T001');fs.writeFileSync(path.join(a.worktree,'README.md'),'# Checked worker result\n');
  commitTask(a.worktree,'T001');
  const sha=assignmentStatus(root,a.id).source_commit;
  send(a.worktree,'result','result',{source_commit:sha});send(root,'acceptance','accept',{source_commit:sha,result_id:'result'});
  assert.equal(startIntegration(root,{id:a.id,source_commit:sha}).status,'INTEGRATED');
  assert.equal(readPlan(root).tasks[0].task_brief,brief);
});
