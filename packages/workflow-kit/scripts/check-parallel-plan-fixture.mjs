import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { install } from '../src/lib/installer.mjs';
import { buildScopePlan, createScope, applyPlan, startTask } from '../src/lib/actions.mjs';
import { createSimplePlan } from '../src/lib/simple-workflow.mjs';
import { extendPlan } from '../src/lib/extend-plan.mjs';
import { updateTask } from '../src/lib/task-update.mjs';
import { readPlan, validatePlan, renderPlan, parsePlan, parallelTasksCompatible } from '../src/lib/plan.mjs';
import { recover } from '../src/lib/recovery.mjs';
import { setReviewEnabled, prepareReview, readReview, respondReview, publishReview, reviewPlanDigest } from '../src/lib/plan-review.mjs';
import { runReview, REVIEW_MODEL } from '../src/lib/claude-review.mjs';

const roots = [];
const git = (root, ...args) => execFileSync('git', args, {cwd:root, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
const write = (root, file, text) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), {recursive:true});
  fs.writeFileSync(path.join(root, file), text);
};
const expect = (code, fn) => assert.throws(fn, error => error.code === code);
const policy = {parallel_allowed:true, max_workers:2, execution_strategy:'parallel', execution_reason:'Independent documents'};
const task = (id, file, dependencies = []) => ({id, title:'Update '+file, why:'Fixture', dependencies,
  functional_paths:[], documentation_paths:[file], verification_ids:[],
  acceptance_criteria:['Document is updated'], expected_commit_message:'docs: update '+file});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-parallel-plan-')); roots.push(root);
  git(root,'init','-b','main'); git(root,'config','user.name','Parallel Fixture'); git(root,'config','user.email','fixture@test.local');
  write(root,'README.md','# Fixture\n'); write(root,'GUIDE.md','# Guide\n');
  git(root,'add','README.md','GUIDE.md'); git(root,'commit','-m','baseline');
  install({project:root,mode:'existing'});
  write(root,'docs/planning/parallel.md','# Parallel plan fixture\n');
  const scope = {scope_id:'parallel-fixture', objective:'Validate parallel model', approval_note:'User requests fixture execution',
    acceptance_criteria:['Model and workflow are consistent'],
    approved_scope:{functional_paths:[], documentation_paths:['README.md','GUIDE.md','docs/planning/parallel.md']},
    context_pack:{documents:[{path:'docs/planning/parallel.md',required:true}], include_last_completed_task:false, dependency_task_ids:[]},
    tasks:[task('T001','README.md'), task('T002','GUIDE.md')]};
  return {root, scope};
}
const build = (root, scope) => buildScopePlan(root, scope, readPlan(root));
function commit(root, expectedCode) {
  const result = spawnSync(process.execPath, [path.join(root,'scripts/workflow.mjs'),'commit','--task','T001'], {cwd:root,encoding:'utf8'});
  if (expectedCode) {
    assert.notEqual(result.status,0,result.stdout);
    assert.ok((result.stdout+result.stderr).includes(expectedCode),result.stdout+result.stderr);
  } else assert.equal(result.status,0,result.stdout+result.stderr);
}
const approve = root => runReview(root, {}, {spawn:(_command,args,options) => {
  const child = new EventEmitter(); child.stdin = new EventEmitter();
  child.stdin.end = () => queueMicrotask(() => {
    fs.writeSync(options.stdio[1],JSON.stringify({subtype:'success',is_error:false,
      session_id:args[args.indexOf(args.includes('--resume')?'--resume':'--session-id')+1],
      modelUsage:{[REVIEW_MODEL]:{}},structured_output:{verdict:'approved',summary:'Fixture approved',findings:[]}}));
    child.emit('close',0);
  }); return child;
}});

try {
  {
    const {root, scope} = fixture();
    const legacy = build(root,scope);
    assert.equal(Object.hasOwn(legacy,'parallel_allowed'),false);
    assert.equal(Object.hasOwn(legacy.tasks[0],'parallel_safe'),false);
    assert.deepEqual(parsePlan(renderPlan(legacy)),legacy);
    assert.doesNotMatch(renderPlan(legacy),/Параллельность:/);
    const forward = structuredClone(scope); forward.tasks[0].dependencies = ['T002'];
    assert.doesNotThrow(() => build(root,forward),'legacy forward references remain valid');
    const modern = {...structuredClone(scope),...policy};
    const normalized = build(root,modern);
    const originated=build(root,{...modern,execution_origin_session_id:'web-pilot-author'});
    assert.equal(parsePlan(renderPlan(originated)).execution_origin_session_id,'web-pilot-author');
    for(const execution_origin_session_id of [null,12,'','../other'])
      expect('PLAN_EXECUTION_ORIGIN',()=>build(root,{...modern,execution_origin_session_id}));
    assert.deepEqual(normalized.tasks.map(t=>t.parallel_safe),[false,false]);
    assert.deepEqual(parsePlan(renderPlan(normalized)),normalized);
    for (const bad of [
      {parallel_allowed:false}, {max_workers:1}, {max_workers:0}, {max_workers:-1},
      {max_workers:1.5}, {max_workers:'2'}, {max_workers:Number.MAX_SAFE_INTEGER+1},
      {parallel_allowed:'true'}, {execution_strategy:'auto'}, {execution_reason:' '}
    ]) expect('PLAN_EXECUTION_POLICY',()=>build(root,{...modern,...bad}));
    for (const key of Object.keys(policy)) {
      const bad = structuredClone(modern); delete bad[key];
      expect('PLAN_EXECUTION_POLICY',()=>build(root,bad));
    }
    const orphan = structuredClone(scope); orphan.tasks[0].parallel_safe = false;
    expect('PLAN_EXECUTION_POLICY',()=>build(root,orphan));
    const invalidMarker = structuredClone(modern); invalidMarker.tasks[0].parallel_safe = 'yes';
    expect('PLAN_EXECUTION_POLICY',()=>build(root,invalidMarker));
    for (const settings of [{parallel_allowed:false,max_workers:2},{parallel_allowed:true,max_workers:1},{parallel_allowed:true,max_workers:2}])
      assert.equal(build(root,{...modern,...settings,execution_strategy:'sequential'}).execution_strategy,'sequential');
    const badOrder = {...forward,...policy};
    expect('TASK_ORDER',()=>build(root,badOrder));
    const missing = structuredClone(modern); missing.tasks[0].dependencies=['UNKNOWN'];
    expect('PLAN_SCHEMA',()=>build(root,missing));
    const self = structuredClone(modern); self.tasks[0].dependencies=['T001'];
    expect('PLAN_SCHEMA',()=>build(root,self));
    const cycle = structuredClone(modern); cycle.tasks[0].dependencies=['T002']; cycle.tasks[1].dependencies=['T001'];
    expect('PLAN_CYCLE',()=>build(root,cycle));
    const safe = structuredClone(modern); safe.tasks.forEach(t=>t.parallel_safe=true);
    const pair = build(root,safe).tasks;
    assert.equal(parallelTasksCompatible(...pair),true);
    assert.equal(parallelTasksCompatible(pair[0],pair[0]),false);
    assert.equal(parallelTasksCompatible(pair[0],{...pair[1],parallel_safe:false}),false);
    const overlap = structuredClone(safe); overlap.tasks[1].documentation_paths=['README.md'];
    const overlapping = build(root,overlap);
    assert.equal(parallelTasksCompatible(...overlapping.tasks),false,'overlap serializes without rejecting the plan');
    assert.equal(parallelTasksCompatible({...pair[0],documentation_paths:['docs']},{...pair[1],documentation_paths:['docs/file.md']}),false);
    for (const file of ['docs/*.md','docs/','docs/[ab].md','docs/{a,b}.md']) {
      const unknown = structuredClone(safe);
      unknown.tasks[0].documentation_paths=[file]; unknown.approved_scope.documentation_paths.push(file);
      assert.throws(()=>build(root,unknown),'unknown write area cannot be marked safe');
    }
    const pending = structuredClone(normalized); pending.tasks[0].commit_ref.source_commit = 'a'.repeat(40);
    expect('PLAN_SCHEMA',()=>validatePlan(pending));
    const done = structuredClone(normalized); done.tasks[0].implementation_status='DONE'; done.tasks[0].commit_status='DONE';
    expect('PLAN_SCHEMA',()=>validatePlan(done),'a worker implementation reference cannot close the parent');
    done.tasks[0].commit_ref={scope_id:done.scope_id,task_id:'T001',role:'integration',operation_id:'merge-1',source_commit:'a'.repeat(40)};
    assert.doesNotThrow(()=>validatePlan(done),'the model supports future managed integration evidence');
    assert.match(renderPlan(done),/Source: a{40}/);
    const incomplete = structuredClone(done); delete incomplete.tasks[0].commit_ref.operation_id;
    expect('PLAN_SCHEMA',()=>validatePlan(incomplete));
    createScope(root,scope); startTask(root,'T001'); write(root,'README.md','# Legacy still executes\n');
    commit(root);
    assert.equal(readPlan(root).tasks[0].commit_status,'DONE');
  }
  {
    const {root} = fixture();
    const input = {id:'simple-parallel',spec:'docs/planning/parallel.md',objective:'Simple normalized model',...policy,
      tasks:[{id:'T001',title:'One',files:['README.md'],parallel_safe:true},{id:'T002',title:'Two',files:['GUIDE.md']}]};
    const beforeHead = git(root,'rev-parse','HEAD'), beforeConfig = fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8');
    expect('PLAN_EXECUTION_POLICY',()=>createSimplePlan(root,{...input,max_workers:0,stack:'Must not persist',checks:[]}));
    assert.equal(git(root,'rev-parse','HEAD'),beforeHead);
    assert.equal(fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8'),beforeConfig);
    createSimplePlan(root,input);
    let p=readPlan(root);
    assert.equal(p.max_workers,2); assert.equal(p.execution_strategy,'parallel');
    assert.deepEqual(p.tasks.map(t=>t.parallel_safe),[true,false]);
    assert.equal(parallelTasksCompatible(...p.tasks),false,'the shared writable spec is not silently ignored');
    extendPlan(root,{tasks:[{id:'T003',title:'Third',files:['THIRD.md'],dependencies:['T001'],parallel_safe:true}]},p.plan_revision);
    p=readPlan(root); assert.equal(p.tasks[2].parallel_safe,true);
    extendPlan(root,{tasks:[{id:'T004',title:'Exclusive',files:['FOURTH.md']}]},p.plan_revision);
    p=readPlan(root); assert.equal(p.tasks[3].parallel_safe,false);
    updateTask(root,'T003',{files:['THIRD-EXTRA.md'],acceptance:['Extra requirement']},p.plan_revision);
    p=readPlan(root); assert.equal(p.tasks[2].parallel_safe,true); assert.equal(p.max_workers,2);
    expect('MANAGED_FIELDS',()=>applyPlan(root,{max_workers:3},p.plan_revision));
    const forged=structuredClone(p.tasks); forged[0].commit_ref.role='integration';
    expect('MANAGED_FIELDS',()=>applyPlan(root,{tasks:forged},p.plan_revision));
    const recovery=recover(root).text;
    assert.match(recovery,/"execution_strategy":"parallel"/);
    assert.match(recovery,/исключительное выполнение; в parallel-плане отдельный исполнитель/);
    const before=git(root,'rev-parse','HEAD'), beforePlan=fs.readFileSync(path.join(root,'.harness/plans/todo-plan.md'),'utf8');
    expect('PARALLEL_MAIN_READ_ONLY',()=>startTask(root,'T001'));
    assert.equal(fs.readFileSync(path.join(root,'.harness/plans/todo-plan.md'),'utf8'),beforePlan);
    assert.equal(git(root,'rev-parse','HEAD'),before);
    assert.equal(readPlan(root).tasks[0].commit_status,'PENDING');
  }
  {
    const {root,scope}=fixture();
    createScope(root,{...scope,...policy,parallel_allowed:false,max_workers:1,execution_strategy:'sequential',execution_reason:'Dependencies require one worker'});
    startTask(root,'T001'); write(root,'README.md','# Sequential policy executes\n'); commit(root);
    assert.equal(readPlan(root).tasks[0].commit_status,'DONE');
  }
  {
    const {root,scope}=fixture(); setReviewEnabled(root,true);
    const input={scope:{...scope,...policy},documents:['docs/planning/parallel.md'],recipient_mode:'manual'};
    const prepared=prepareReview(root,input);
    const candidate=JSON.parse(fs.readFileSync(path.join(prepared.run_directory,prepared.plan_file),'utf8'));
    assert.equal(candidate.tasks[0].parallel_safe,false);
    assert.equal(reviewPlanDigest(candidate),prepared.plan_digest);
    for(const mutate of [
      p=>p.max_workers=3,p=>p.parallel_allowed=false,p=>p.execution_strategy='sequential',
      p=>p.execution_reason='Changed decision',p=>p.tasks[0].parallel_safe=true,
      p=>p.execution_origin_session_id='another-session'
    ]) {const changed=structuredClone(candidate);mutate(changed);assert.notEqual(reviewPlanDigest(changed),prepared.plan_digest);}
    await approve(root);
    respondReview(root,{round:readReview(root).review_history.at(-1).round,disposition:'accept',
      position:'The normalized execution policy and task markers are correct. No additional changes to the reviewed pair are required.'});
    expect('REVIEW_STALE',()=>createScope(root,{...input.scope,max_workers:3}));
    const changed=structuredClone(input.scope);changed.tasks[0].parallel_safe=true;
    expect('REVIEW_STALE',()=>createScope(root,changed));
    publishReview(root);
    const published=readPlan(root);assert.equal(published.max_workers,2);assert.equal(published.tasks[0].parallel_safe,false);
  }
  console.log('parallel-plan fixture: legacy execution, policy validation, safe/exclusive areas, amendments, recovery, Review binding and parent DONE guard passed');
} finally {
  for (const root of roots) fs.rmSync(root,{recursive:true,force:true});
}

