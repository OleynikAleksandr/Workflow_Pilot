import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseWorkflowPlan,ClosedPlanCache} from '../src/contracts/workflow-plan.mjs';
import {install} from '@webpilot/workflow-kit/lib/installer';
import {createScope} from '@webpilot/workflow-kit/lib/actions';

const block=plan=>'<!-- workflow-state:begin -->\n```json\n'+JSON.stringify(plan,null,2)+'\n```\n<!-- workflow-state:end -->\n';
const plan={schema_version:1,project_id:'p',scope_id:'s',objective:'Проверка',execution_origin_session_id:'o',
  tasks:[{id:'T001',title:'Пример',implementation_status:'DONE',commit_status:'DONE',task_brief:'```json\n{"текст":"кавычки и \\""}\n```',prepared_task:{contexts:[{text:'```sh\necho hello\n```'}]}}]};
const target={workspace:'/same',workspaceId:'w',projectId:'p',scopeId:'s',sessionId:'o',commit:'a'.repeat(40)};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('full workflow block preserves embedded fences, Unicode and escaping and rejects corrupt containers',()=>{
  assert.deepEqual(parseWorkflowPlan(block(plan)),plan);
  assert.deepEqual(parseWorkflowPlan(block(plan).replaceAll('\n','\r\n')),plan);
  for(const text of [block(plan).replace('"schema_version": 1','"schema_version": 99'),block(plan).replace('<!-- workflow-state:end -->',''),
    block(plan)+'<!-- workflow-state:end -->\n',block(plan).replace('"project_id": "p"','"project_id": '),block({...plan,tasks:null})])
    assert.throws(()=>parseWorkflowPlan(text),{code:'WORKFLOW_PLAN_INVALID'});
});
test('closed cache isolates identities, ignores late replies and retries unavailable history on refresh',async()=>{
  let live=true,resolve,changes=0,now=0;
  const cache=new ClosedPlanCache({load:()=>new Promise(r=>resolve=r),isCurrent:()=>live,changed:()=>changes++,now:()=>now});
  assert.equal(cache.read(target),null);await flush();live=false;resolve(block(plan));await flush();
  assert.equal(changes,0,'deleted workspace cannot publish its late result');
  live=true;cache.load=async()=>{throw Error('private Git exception with payload');};
  const next={...target,workspaceId:'replacement'};cache.read(next);await flush();
  assert.equal(cache.read(next).detailsUnavailable,true);assert.doesNotMatch(JSON.stringify(cache.read(next)),/private|payload/);
  cache.load=async()=>block(plan);now=2001;assert.equal(cache.read(next),null);await flush();
  assert.equal(cache.read(next).tasks[0].status,'done');
  for(const bad of [{...plan,project_id:'foreign'},{...plan,scope_id:'foreign'},{...plan,execution_origin_session_id:'foreign'},
    {...plan,tasks:[{...plan.tasks[0],commit_status:'PENDING'}]}]){
    const c=new ClosedPlanCache({load:async()=>block(bad),isCurrent:()=>true,changed:()=>{}});c.read(target);await flush();
    assert.equal(c.read(target).detailsUnavailable,true);assert.deepEqual(c.read(target).tasks,[]);
  }
});
test('unavailable closed history has a finite refresh budget; explicit navigation can retry it',async()=>{
  let calls=0,now=0;const cache=new ClosedPlanCache({load:async()=>{calls++;throw Error('Git unavailable');},isCurrent:()=>true,changed:()=>{},now:()=>now});
  for(let i=0;i<20;i++){now+=3000;cache.read(target);await flush();}
  assert.equal(calls,2);cache.retryUnavailable();cache.read(target);await flush();assert.equal(calls,3);
});

test('real Kit archive with fenced task briefs projects its exact parent as four completed tasks', {timeout:120000},async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'wp-closed-plan-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();git('init','-q','-b','main');
  install({project:root,mode:'existing','git-name':'Fixture','git-email':'fixture@example.invalid'});
  const run=(...args)=>JSON.parse(execFileSync(process.execPath,['scripts/workflow.mjs',...args],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024}));
  run('install:commit');
  const config=JSON.parse(fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8'));config.stack='Node.js fixture';config.profile='DEVELOPMENT';
  const input=(name,data)=>{const file=path.join(root,'.harness/runtime',name+'.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data));return file;};
  run('config:apply','--input',input('config',config));
  fs.mkdirSync(path.join(root,'docs/planning'),{recursive:true});fs.writeFileSync(path.join(root,'docs/planning/test.md'),'# Проверка\n');
  const ids=['T001','T002','T003','DOCS'];
  const tasks=ids.map(id=>({id,title:id==='DOCS'?'Актуализация всех документов проекта':id,
    files:[id==='DOCS'?'docs/architecture/OVERVIEW.md':'docs/'+id+'.md'],checks:[],acceptance:['Сохранён текст'],task_brief:'Инструкция\n```json\n{"пример":"текст"}\n```'}));
  createScope(root,{scope_id:'closed-fixture',objective:'Исторический план',approval_note:'Fixture user authorizes this plan.',acceptance_criteria:['Сохранены четыре задачи'],
    approved_scope:{functional_paths:[],documentation_paths:['docs/planning/test.md',...tasks.flatMap(t=>t.files)]},
    context_pack:{documents:[{path:'docs/planning/test.md',required:true}],include_last_completed_task:false,dependency_task_ids:[]},
    tasks:tasks.map(t=>({id:t.id,title:t.title,why:'Проверка исторической карточки',dependencies:[],functional_paths:[],documentation_paths:t.files,
      verification_ids:[],acceptance_criteria:t.acceptance,expected_commit_message:'docs: '+t.id,task_brief:t.task_brief}))});
  for(const id of ids){run('task:start',id);const file=path.join(root,id==='DOCS'?'docs/architecture/OVERVIEW.md':'docs/'+id+'.md');
    fs.appendFileSync(file,'\n# '+id+'\nГотово.\n');run('commit','--task',id);}
  run('archive','--scope','closed-fixture','--approval-note','Fixture user explicitly accepts and closes this plan.');
  assert.equal(run('status').scope_status,'NONE');assert.equal(git('status','--porcelain'),'');
  const text=git('show','HEAD^:.harness/plans/todo-plan.md'),original=parseWorkflowPlan(text);
  assert.throws(()=>JSON.parse(text.match(/```json\s*([\s\S]*?)```/)[1]),SyntaxError,'reproduces the old truncation');
  const cache=new ClosedPlanCache({load:async()=>text,isCurrent:()=>true,changed:()=>{}});
  const address={...target,projectId:original.project_id,scopeId:'closed-fixture',commit:git('rev-parse','HEAD')};
  cache.read(address);await flush();const closed=cache.read(address);
  assert.equal(closed.objective,'Исторический план');assert.equal(closed.tasks.length,4);assert.ok(closed.tasks.every(t=>t.status==='done'));
});
