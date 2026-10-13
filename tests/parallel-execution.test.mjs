import test from 'node:test';
import assert from 'node:assert/strict';
import { ParallelExecution,executionOrigin,availableTasks } from '../src/parallel-execution.mjs';
import { startupMessage } from '../src/context-session.mjs';
import { executorPageState } from '../src/executor-session.mjs';

const task=(id,dependencies=[])=>({id,title:id,dependencies,parallel_safe:true,implementation_status:'TODO',commit_status:'PENDING',
  functional_paths:['src/'+id+'.mjs'],documentation_paths:[]});
function fixture(t) {
  const origin={workspace:'/main',sessionId:'author',experience:'work',executionSnapshot:{parallel_allowed:true,max_workers:2}};
  const state={workspace:'/main',head:'base',confirmed:true,mainClean:true,commandActive:false,integration:{status:'IDLE'},assignments:[],
    plan:{scope_id:'scope',execution_scope_status:'ACTIVE',plan_revision:4,parallel_allowed:true,max_workers:2,
      execution_strategy:'parallel',execution_origin_session_id:'author',tasks:[task('A'),task('B'),task('C',['A'])]}};
  const pages=new Map(),calls={created:[],opened:[],merged:[],saved:[],corrections:[]};let sequence=0;
  const kit={read:async()=>structuredClone(state),
    create:async(workspace,plan,task,id,base)=>{
      calls.created.push({workspace,id,task:task.id,base});
      const a={id,worktree:'/trees/'+id,parent_task_id:task.id,parent_scope_id:plan.scope_id,parent_root:workspace,status:'READY'};
      state.assignments.push(a);return a;
    },setupAssignment:async()=>{throw Error('not needed');},
    integrate:async(workspace,a)=>{
      calls.merged.push(a.id);state.assignments.find(x=>x.id===a.id).status='INTEGRATED';
      state.plan.tasks.find(x=>x.id===a.parent_task_id).commit_status='DONE';state.head+='-merge';state.plan.plan_revision++;
      return {status:'INTEGRATED'};
    }};
  const runtime=new ParallelExecution({kit,origin:(_w,id)=>id==='author'?origin:null,
    openWorker:async a=>{calls.opened.push(a);pages.set(a.id,{stopped:false});return {sessionId:'session-'+a.id};},
    workerState:a=>pages.get(a.id)??{stopped:false},mainState:()=>({stopped:true,canSend:true}),
    save:async data=>calls.saved.push(data),uuid:()=>String(++sequence),now:()=>sequence,
    sendCorrection:async(_origin,text,ready,before)=>{assert.ok(ready());assert.ok(await before());calls.corrections.push(text);return {state:'sent'};}});
  t.after(()=>runtime.dispose());
  const finish=id=>{const a=state.assignments.find(x=>x.parent_task_id===id);a.status='READY_FOR_INTEGRATION';a.source_commit='source-'+id;pages.set(a.id,{stopped:true});return a;};
  const grant=async()=>{const previous=runtime.enabled;runtime.setEnabled(true);runtime.observe('/main');await runtime.signal('/main');runtime.setEnabled(previous);};
  return {runtime,state,kit,calls,origin,pages,finish,grant};
}

test('origin is exact immutable session metadata; unknown/OFF/mismatched policy fails closed',()=>{
  const plan={execution_strategy:'parallel',execution_origin_session_id:'author',parallel_allowed:true,max_workers:2};
  const origin={sessionId:'author',executionSnapshot:{parallel_allowed:true,max_workers:2}};
  assert.equal(executionOrigin(plan,id=>id==='author'?origin:null),origin);
  for(const saved of [null,{...origin,sessionId:'selected-other'},{...origin,executionSnapshot:undefined},{...origin,assignmentId:'child'}])
    assert.throws(()=>executionOrigin(plan,()=>saved),{code:'EXECUTION_ORIGIN_UNKNOWN'});
  for(const executionSnapshot of [{parallel_allowed:false,max_workers:2},{parallel_allowed:true,max_workers:1},{parallel_allowed:true,max_workers:3}])
    assert.throws(()=>executionOrigin(plan,()=>({...origin,executionSnapshot})),{code:'EXECUTION_POLICY_MISMATCH'});
  assert.equal(executionOrigin({...plan,execution_strategy:'sequential'},()=>null),null);
});

test('ON group is bounded, duplicate events do not clone worktrees or chats, OFF launches no next group',async t=>{
  const f=fixture(t);
  f.runtime.setEnabled(true);await Promise.all([f.runtime.signal('/main'),f.runtime.signal('/main')]);f.runtime.setEnabled(false);
  assert.deepEqual(f.calls.created.map(x=>x.task),['A','B']);assert.equal(f.calls.opened.length,2);
  assert.equal(new Set(f.calls.created.map(x=>x.id)).size,2);
  const a=f.finish('A');await f.runtime.signal('/main');
  assert.deepEqual(f.calls.merged,[a.id]);assert.equal(f.calls.created.length,2);
  await f.grant();assert.equal(f.calls.created.at(-1).task,'C');
  assert.equal(f.calls.created.at(-1).base,'base-merge');
});

test('ON waits for main readiness and OFF prevents subsequent assignment',async t=>{
  const f=fixture(t);f.runtime.mainState=()=>({stopped:false});f.runtime.observe('/main');f.runtime.setEnabled(true);
  await f.runtime.signal('/main');assert.equal(f.calls.created.length,0);
  assert.equal(f.runtime.view('/main').error.code,'MAIN_CHAT_NOT_READY');
  f.runtime.mainState=()=>({stopped:true});await f.runtime.signal('/main');
  assert.deepEqual(f.calls.created.map(x=>x.task),['A','B']);
  f.runtime.setEnabled(false);f.finish('A');await f.runtime.signal('/main');assert.equal(f.calls.created.length,2);
});

test('ON starts subsequent ready tasks only from the integrated base; a busy or active-command source never merges',async t=>{
  const f=fixture(t);f.runtime.setEnabled(true);await f.grant();
  const a=f.finish('A');f.pages.set(a.id,{stopped:false});await f.runtime.signal('/main');assert.equal(f.calls.merged.length,0);
  f.pages.set(a.id,{stopped:true});a.commandActive=true;await f.runtime.signal('/main');assert.equal(f.calls.merged.length,0);
  a.commandActive=false;a.dirty=true;await f.runtime.signal('/main');assert.equal(f.calls.merged.length,0);
  a.dirty=false;await f.runtime.signal('/main');assert.equal(f.calls.merged.length,1);
  assert.deepEqual(f.calls.created.map(x=>[x.task,x.base]),[['A','base'],['B','base'],['C','base-merge']]);
});

test('ready queue does not wait for an earlier unfinished independent task and remains serialized',async t=>{
  const f=fixture(t);await f.grant();const b=f.finish('B');
  let release;const merge=f.kit.integrate;
  f.kit.integrate=async(...args)=>{await new Promise(resolve=>{release=resolve;});return merge(...args);};
  const pending=f.runtime.signal('/main');await new Promise(resolve=>setImmediate(resolve));
  const repeated=f.runtime.signal('/main');assert.equal(f.calls.merged.length,0);release();await Promise.all([pending,repeated]);
  assert.deepEqual(f.calls.merged,[b.id]);assert.equal(f.state.plan.tasks[0].commit_status,'PENDING');
});

test('exclusive barrier waits for all earlier assignments to integrate; overlap and unknown occupancy block a slot',()=>{
  const a=task('A'),b={...task('B'),parallel_safe:false},c=task('C');
  const plan={max_workers:2,tasks:[a,b,c]};
  assert.deepEqual(availableTasks(plan,[],()=>({stopped:false})).map(t=>t.id),['A']);
  assert.deepEqual(availableTasks(plan,[{parent_task_id:'A',status:'READY_FOR_INTEGRATION'}],()=>({stopped:true})),[]);
  a.commit_status='DONE';assert.deepEqual(availableTasks(plan,[{parent_task_id:'A',status:'INTEGRATED'}],()=>({stopped:true})).map(t=>t.id),['B']);
  const p={max_workers:1,tasks:[task('A'),task('B')]};
  assert.deepEqual(availableTasks(p,[{parent_task_id:'A',status:'UNKNOWN'}],()=>({stopped:false})),[]);
  p.max_workers=2;p.tasks[1].functional_paths=p.tasks[0].functional_paths;
  assert.deepEqual(availableTasks(p,[],()=>({stopped:false})).map(t=>t.id),['A']);
});

test('unpublished or Review-blocked plan, OFF origin and sequential strategy never create an assignment',async t=>{
  const f=fixture(t);f.state.confirmed=false;await f.grant();
  assert.equal(f.runtime.view('/main').error.code,'PLAN_NOT_READY');assert.equal(f.calls.created.length,0);
  f.state.confirmed=true;f.origin.executionSnapshot.parallel_allowed=false;await f.grant();
  assert.equal(f.runtime.view('/main').error.code,'EXECUTION_POLICY_MISMATCH');
  f.state.plan.execution_strategy='sequential';await f.grant();assert.equal(f.calls.created.length,0);
});

test('unknown integration outcome is preserved without repeating merge or launching dependent work',async t=>{
  const f=fixture(t);await f.grant();f.finish('A');let attempts=0;
  f.kit.integrate=async()=>{attempts++;throw Error('connection ended');};
  await f.runtime.signal('/main');await f.runtime.signal('/main');await f.grant();
  assert.equal(attempts,1);assert.equal(f.runtime.view('/main').error.code,'INTEGRATION_UNKNOWN');
  assert.equal(f.calls.created.length,2);
});

test('conflict keeps main exclusive and explicit correction is delivered once; UNKNOWN cannot replay',async t=>{
  const f=fixture(t);await f.grant();
  f.state.integration={status:'CONFLICT',operation_id:'integration-wp-1',task_id:'A',conflicts:['src/A.mjs']};
  await f.runtime.signal('/main');assert.equal(f.runtime.view('/main').phase,'integration');
  await f.runtime.correct('/main');await f.runtime.correct('/main');
  assert.equal(f.calls.corrections.length,1);assert.match(f.calls.corrections[0],/integration:continue --id integration-wp-1/);
  f.state.integration.operation_id='integration-wp-2';f.runtime.sendCorrection=async()=>({state:'unknown'});
  await f.runtime.correct('/main');assert.equal((await f.runtime.correct('/main')).reason,'CORRECTION_ALREADY_REQUESTED');
  assert.equal(f.calls.created.length,2);
});

test('admitted correction permits its own composer operation while a new busy page still cancels it',async t=>{
  const f=fixture(t);let sending=false,busy=false;
  f.state.integration={status:'CONFLICT',operation_id:'integration-one'};
  f.runtime.mainState=()=>({stopped:!sending&&!busy,canSend:!sending&&!busy,canContinueSend:!busy});
  f.runtime.sendCorrection=async(_origin,_text,ready,before)=>{
    sending=true;assert.equal(ready(),true);assert.equal(await before(),true);
    busy=true;assert.equal(ready(),false);return {state:'cancelled'};
  };
  assert.equal((await f.runtime.correct('/main')).state,'cancelled');
  assert.equal(f.runtime.view('/main').correctionStatus,null);
});

test('explicit correction waits for the running reconciliation instead of racing its published conflict',async t=>{
  const f=fixture(t);f.state.integration={status:'CONFLICT',operation_id:'integration-wait'};
  const read=f.kit.read;let release;
  f.kit.read=async()=>{await new Promise(resolve=>{release=resolve;});f.kit.read=read;return read();};
  const reconciliation=f.runtime.signal('/main');await new Promise(resolve=>setImmediate(resolve));
  const correction=f.runtime.correct('/main');await f.runtime.signal('/main');
  assert.equal(f.calls.corrections.length,0);release();await reconciliation;
  assert.equal((await correction).state,'sent');assert.equal(f.calls.corrections.length,1);
});

test('assigned startup starts exactly its task, names worktree/main and does not ask for a second user instruction',()=>{
  const text=startupMessage({name:'Project',workspace:'/trees/a',sessionId:'worker',assignmentId:'a',taskId:'T002',
    parentWorkspace:'/main',executionSnapshot:{parallel_allowed:true,max_workers:2}},'request',{parts:[{}]});
  assert.match(text,/task:start T002/);assert.match(text,/commit --task T002/);assert.match(text,/"\/trees\/a"/);
  assert.match(text,/Основной checkout: "\/main"/);assert.match(text,/После коммита не бери следующую задачу/);
  assert.doesNotMatch(text,/Файлы проекта не меняй|Дальнейшую работу начнём/);
});

test('source needs an observed final assistant pause in the exact chat, with no outstanding delivery',()=>{
  const record={project:()=>({chatUrl:'https://chatgpt.com/c/abcdefgh'}),ready:true,controller:{pending:false},composer:{inFlight:false},
    pageState:{current:{state:{url:'https://chatgpt.com/c/abcdefgh',busy:false,lastMessageRole:'assistant',editorAvailable:true,writable:true}}}};
  assert.equal(executorPageState(record).stopped,true);
  for(const patch of [{busy:true},{lastMessageRole:'user'},{url:'https://chatgpt.com/c/other-chat'},{connectionError:'stream-interrupted'}]) {
    const state=record.pageState.current.state;record.pageState.current.state={...state,...patch};
    assert.equal(executorPageState(record).stopped,false);record.pageState.current.state=state;
  }
  record.controller.pending=true;assert.equal(executorPageState(record).stopped,false);
  assert.equal(executorPageState(null).stopped,false);
});

test('project-scoped AutoPlan starts first groups independently and OFF is rechecked after assignment preparation',async t=>{
  const a=fixture(t),b=fixture(t);let allowedA=false,allowedB=true;
  a.runtime.isEnabled=(workspace,scope)=>workspace==='/main'&&scope==='scope'&&allowedA;
  b.runtime.isEnabled=(workspace,scope)=>workspace==='/main'&&scope==='scope'&&allowedB;
  await Promise.all([a.runtime.signal('/main'),b.runtime.signal('/main')]);
  assert.equal(a.calls.created.length,0);assert.equal(b.calls.created.length,2);
  const create=a.kit.create;a.kit.create=async(...args)=>{const result=await create(...args);allowedA=false;return result;};
  allowedA=true;await a.runtime.signal('/main');
  assert.equal(a.calls.created.length,1);assert.equal(a.calls.opened.length,0,'OFF during create prevents delivery and next assignment');
  a.kit.create=create;allowedA=true;await a.runtime.signal('/main');assert.equal(a.calls.opened.length,2);
});

test('legacy task handoff waits for safe main, reuses identity after interruption and resumes automatically',async t=>{
  const f=fixture(t);f.state.plan.current_task_id='A';f.state.plan.tasks[0].implementation_status='IN_PROGRESS';
  f.state.confirmed=false;f.state.mainClean=false;f.runtime.setEnabled(true);
  let stopped=false,calls=0,identity;
  f.runtime.mainState=()=>({stopped,canSend:stopped});
  f.kit.handoff=async(workspace,plan,task,id,base)=>{
    calls++;if(identity)assert.equal(id,identity);identity=id;
    if(calls===1)throw Object.assign(Error('Interrupted transfer'),{code:'HANDOFF_INTERRUPTED'});
    f.state.plan.current_task_id=null;f.state.plan.tasks[0].implementation_status='TODO';f.state.confirmed=true;f.state.mainClean=true;
    return f.kit.create(workspace,plan,task,id,base);
  };
  await f.runtime.signal('/main');assert.equal(calls,0);assert.equal(f.runtime.view('/main').error.code,'MAIN_CHAT_NOT_READY');
  stopped=true;f.state.commandActive=true;await f.runtime.signal('/main');assert.equal(calls,0);
  assert.equal(f.runtime.view('/main').error.code,'COMMAND_ACTIVE');
  f.state.commandActive=false;await f.runtime.signal('/main');assert.equal(calls,1);
  await f.runtime.signal('/main');assert.equal(calls,2);assert.equal(f.calls.opened.length,2);
  assert.equal(f.calls.created.filter(x=>x.task==='A').length,1);
});

test('published-plan diagnostics retain actual Kit reason instead of a generic launch message',async t=>{
  const f=fixture(t);f.runtime.setEnabled(true);f.state.confirmed=false;
  for(const code of ['PLAN_UNPUBLISHED_OR_CHANGED','TRANSACTION_PENDING','REVIEW_PENDING']) {
    f.state.confirmationError={code,message:'Concrete '+code};await f.runtime.signal('/main');
    assert.equal(f.runtime.view('/main').error.code,code);assert.equal(f.calls.created.length,0);
  }
});

test('AutoPlan requests a conflict correction once, waits for readiness and respects OFF and UNKNOWN',async t=>{
  const f=fixture(t);await f.grant();
  f.state.integration={status:'CONFLICT',operation_id:'integration-auto',task_id:'A',conflicts:['src/A.mjs']};
  await f.runtime.signal('/main');assert.equal(f.calls.corrections.length,0);
  f.runtime.mainState=()=>({stopped:true,canSend:false});f.runtime.setEnabled(true);
  await f.runtime.signal('/main');assert.equal(f.calls.corrections.length,0,'draft blocks correction');
  f.runtime.mainState=()=>({stopped:true,canSend:true});f.state.commandActive=true;
  await f.runtime.signal('/main');assert.equal(f.calls.corrections.length,0,'command blocks correction');
  f.state.commandActive=false;await f.runtime.signal('/main');
  assert.equal(f.calls.corrections.length,1);
  await Promise.all([f.runtime.signal('/main'),f.runtime.signal('/main')]);assert.equal(f.calls.corrections.length,1);
  f.state.integration.operation_id='integration-unknown';let attempts=0;
  f.runtime.sendCorrection=async()=>{attempts++;return {state:'unknown'};};
  await f.runtime.signal('/main');await f.runtime.signal('/main');assert.equal(attempts,1);
});

test('a failed launch is visible and never sent as a code correction',async t=>{
  const f=fixture(t);await f.grant();f.runtime.setEnabled(true);
  f.state.integration={status:'CHECKS_FAILED',operation_id:'launch-failed',error:JSON.stringify({details:{result:{id:'test',status:'FAILED',exit_code:null,output:'spawnSync node ENOENT'}}})};
  await f.runtime.signal('/main');assert.equal(f.calls.corrections.length,0);
  assert.equal(f.runtime.view('/main').error.code,'INTEGRATION_CHECK_START_FAILED');
  await assert.rejects(f.runtime.correct('/main'),{code:'INTEGRATION_CHECK_START_FAILED'});
});

test('a genuine test failure is corrected automatically, but OFF before Send cancels permission',async t=>{
  const f=fixture(t);await f.grant();f.runtime.setEnabled(true);
  f.state.integration={status:'CHECKS_FAILED',operation_id:'test-failed',error:JSON.stringify({details:{result:{status:'FAILED',exit_code:1}}})};
  f.runtime.sendCorrection=async(_origin,text,ready,before)=>{
    assert.match(text,/Причина проверки/);f.runtime.setEnabled(false);
    assert.equal(ready(),false);assert.equal(await before(),false);return {state:'cancelled'};
  };
  await f.runtime.signal('/main');assert.equal(f.runtime.view('/main').correctionStatus,null);
});

test('recreated project with the same scope discards another project ledger and starts fresh',async t=>{
 const f=fixture(t);f.state.plan.project_id='new';f.runtime.origin=()=>({workspace:'/main',projectId:'new',sessionId:'author',executionSnapshot:{parallel_allowed:true,max_workers:2}});
 const key=JSON.stringify(['/main','scope']);f.runtime.book[key]={workspace:'/main',scope:'scope',projectId:'old',started:true,assignments:{old:{id:'old',taskId:'A',phase:'running',sessionId:'old-chat'}},corrections:{}};
 await f.grant();assert.deepEqual(f.calls.created.map(a=>a.task),['A','B']);assert.equal(f.runtime.book[key].projectId,'new');assert.equal(f.runtime.book[key].assignments.old,undefined);
});
test('legacy ledger binds to verified source identity, while unrelated deleted history does not block a new project',async t=>{
 const f=fixture(t);f.state.plan.project_id='new';f.runtime.origin=()=>({workspace:'/main',projectId:'new',sessionId:'author',executionSnapshot:{parallel_allowed:true,max_workers:2}});
 const key=JSON.stringify(['/main','scope']);f.runtime.book[key]={workspace:'/main',scope:'scope',started:true,assignments:{old:{id:'old',taskId:'A',base:'deleted-base',phase:'running'}},corrections:{}};
 f.kit.projectIdentity=async()=>null;await f.grant();assert.equal(f.calls.created.length,2);assert.equal(f.runtime.book[key].assignments.old,undefined);
});
test('same project UNKNOWN reservation remains visibly current after the final reconciliation',async t=>{
 const f=fixture(t);f.state.plan.project_id='same';f.runtime.origin=()=>({workspace:'/main',projectId:'same',sessionId:'author',executionSnapshot:{parallel_allowed:true,max_workers:2}});
 const key=JSON.stringify(['/main','scope']);f.runtime.book[key]={workspace:'/main',scope:'scope',projectId:'same',started:true,assignments:{old:{id:'old',taskId:'A',phase:'creating'}},corrections:{}};
 await f.grant();const task=f.runtime.view('/main').planView.tasks.find(t=>t.id==='A');assert.equal(task.status,'current');assert.equal(task.label,'Назначение требует сверки');assert.equal(f.calls.created.some(a=>a.task==='A'),false);
});
