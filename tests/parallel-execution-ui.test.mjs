import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { executorStatus,projectExecutors,projectExecutionPlan,integrationProblem,executionFinalStages } from '../src/execution-projection.mjs';

test('F20: worker source and HTTP preview never equal verified main or a final reply',()=>{
  const assignment={id:'a',status:'READY_FOR_INTEGRATION',source_commit:'sha',worktree:'/worktree',commandActive:true,
    commands:[{id:'op-1',blocksIntegration:true}]};
  const execution={assignments:[assignment],integration:{status:'IDLE'},planView:{completed:0,total:1}};
  let view=executionFinalStages(execution);
  assert.equal(view.source.status,'ready');assert.equal(view.main.status,'blocked');
  assert.match(view.source.text,/ещё не проверка main/);assert.match(view.action,/op-1/);
  assert.match(view.action,/Не останавливайте сервер/);
  execution.diagnosticStatus='sent';view=executionFinalStages(execution);
  assert.equal(view.diagnostic.status,'sent');assert.equal(view.main.status,'blocked');
  assignment.commandActive=false;assignment.status='INTEGRATED';execution.planView.completed=1;
  execution.finalizationStatus='sent';view=executionFinalStages(execution);
  assert.equal(view.main.status,'done');assert.equal(view.reply.status,'waiting');
  execution.finalizationStatus='reply-observed';view=executionFinalStages(execution);
  assert.equal(view.reply.status,'done');assert.match(view.action,/приёмка пользователя/);
});

test('F07/F08/F15: missing proof, unknown merge and uncertain send never become DONE',()=>{
  const execution={assignments:[{status:'UNKNOWN'}],integration:{status:'UNKNOWN'},planView:{completed:0,total:1},
    diagnosticStatus:'unknown',finalizationStatus:'unknown'};
  const view=executionFinalStages(execution);
  assert.equal(view.source.status,'unknown');assert.equal(view.main.status,'unknown');
  assert.equal(view.diagnostic.status,'unknown');assert.equal(view.final.status,'unknown');
  assert.equal(view.reply.status,'waiting');assert.match(view.action,/Не повторяйте сообщение/);
});

test('status distinguishes observed work, unknown, source readiness and verified integration without inventing a user question',()=>{
  const record={pageState:{current:{state:{busy:true,lastMessageRole:'assistant'}}}};
  assert.equal(executorStatus({status:'RUNNING'},record).phase,'working');
  assert.match(executorStatus({status:'READY_FOR_INTEGRATION'},record).label,/ответ продолжается/);
  record.pageState.current.state.busy=false;
  assert.equal(executorStatus({status:'READY_FOR_INTEGRATION'},record).phase,'ready');
  assert.equal(executorStatus({status:'RUNNING'},record).label,'Пауза · задача не завершена');
  assert.equal(executorStatus({status:'INTEGRATED'},record).phase,'done');
  assert.equal(executorStatus({id:'a',status:'READY_FOR_INTEGRATION'},record,{assignment_id:'a',status:'CHECKING'}).phase,'merging');
  assert.equal(executorStatus({id:'a'},record,{assignment_id:'a',status:'CONFLICT'}).phase,'attention');
  assert.equal(executorStatus({status:'RUNNING'},null).phase,'unknown');
});

test('saved executor belongs to its original main session, keeps totals without a live page and never copies conversation text',()=>{
  const projects=[{workspace:'/main',projectId:'parent'},{workspace:'/tree',parentWorkspace:'/main',parentProjectId:'parent',sessions:[{sessionId:'child',assignmentId:'a',taskId:'T1',
    executionOriginSessionId:'original',title:'Task',experience:'work',executionTime:{activeMs:10,waitingMs:20},attempt:{text:'PRIVATE'}}]}];
  const view=projectExecutors(projects,'/main',{assignments:[{id:'a',status:'READY_FOR_INTEGRATION'}]},()=>null);
  assert.equal(view.length,1);assert.equal(view[0].originSessionId,'original');assert.equal(view[0].phase,'unknown');
  assert.equal(view[0].time.activeMs,10);assert.equal(view[0].time.waitingMs,20);assert.equal(view[0].time.phase,'unknown');
  assert.ok(!JSON.stringify(view).includes('PRIVATE'));
});

test('real sidebar renders executor group, worktree/status/time, protected action names and parent completion',async t=>{
  const html=await fs.readFile(new URL('../src/ui/index.html',import.meta.url),'utf8');
  const source=await fs.readFile(new URL('../src/ui/sidebar.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://fixture.invalid/'});
  t.after(()=>dom.window.close());const {window}=dom,{document}=window,calls=[];
  const query=document.querySelectorAll.bind(document);
  document.querySelectorAll=selector=>query(selector.replaceAll(':popover-open','[data-test-open]'));
  let listener;
  const executor={workspace:'/tree',sessionId:'child',assignmentId:'a',originSessionId:'author',taskId:'T1',title:'T1 — Worker',experience:'work',
    phase:'ready',label:'Готово к слиянию',time:{activeMs:2000,waitingMs:3000,phase:'unknown'}};
  let state={projects:[{workspace:'/main',name:'Main',expanded:true,sessions:[{sessionId:'author',title:'Планировщик',createdAt:1000}],executors:[executor]}],
    selected:{workspace:'/main',sessionId:'author',scopeId:'scope',planExecution:{execution_strategy:'parallel'},planView:{state:'working',completed:0,total:1,tasks:[{id:'T1',title:'Task',status:'current'}]}},
    execution:{phase:'waiting',scopeId:'scope',assignments:[],planView:{state:'working',completed:0,total:1,tasks:[{id:'T1',title:'Task',status:'current'}]}},context:{phase:'delivered'}};
  const action=name=>async(...args)=>{calls.push([name,...args]);return {state};};
  window.webPilot={getState:async()=>state,onState:fn=>{listener=fn;},
    selectSession:action('selectSession')};
  window.eval('const createProgress=()=>({show(){},destroy(){}});const operationLabel=()=>"";const settingsPanelView=()=>({render(){}});const workspaceSetupView=()=>({render(){}});'
    +'const executionFinalStages='+executionFinalStages.toString()+';\n'+source.replace(/^import .*;\n/gm,''));
  const settle=()=>new Promise(resolve=>setTimeout(resolve,0));await settle();
  assert.match(document.querySelector('.executor-group summary').textContent,/Исполнители · Планировщик/);
  assert.match(document.querySelector('.executor-row').textContent,/worktree/);
  assert.match(document.querySelector('.executor-row').textContent,/Готово к слиянию/);
  assert.match(document.querySelector('[data-executor-time]').textContent,/Работа 00:02 · ожидание 00:03/);
  document.querySelector('.executor-row').click();await settle();assert.deepEqual(calls.pop(),['selectSession','/tree','child']);
  assert.match(document.getElementById('auto-plan-message').textContent,/Автовыполнение этого проекта выключено/);
  assert.equal(document.getElementById('execute-tasks'),null);assert.equal(document.getElementById('reconcile-execution'),null);
  assert.equal(document.querySelectorAll('#execution-stages li').length,5);
  assert.equal(document.getElementById('execution-stages').getAttribute('aria-label'),'Проверяемые этапы завершения');
  assert.equal(document.getElementById('execution-next-action').getAttribute('role'),'status');
  assert.equal(document.querySelector('#execution-stages [data-stage=reply]').dataset.status,'waiting');
  state={...state,selected:{...state.selected,workspace:'/tree',parentWorkspace:'/main',assignmentId:'a',sessionId:'child',
    planView:{state:'awaiting-acceptance',completed:1,total:1,tasks:[{id:'T1',title:'Task',status:'done'}]}},
    execution:{...state.execution,phase:'integration',integration:{status:'CONFLICT'}}};
  listener(state);
  assert.equal(document.querySelector('.executor-row').getAttribute('aria-current'),'page');
  assert.equal(document.getElementById('plan-card').hidden,true);
  assert.equal(document.getElementById('assignment-card').hidden,false);
  assert.match(document.getElementById('assignment-status').textContent,/Готово к слиянию/);
  assert.equal(document.getElementById('correct-integration'),null);
  state={...state,selected:{workspace:'/main',sessionId:'author',scopeId:'scope',planExecution:{execution_strategy:'parallel'},
    planView:{state:'working',completed:0,total:1,tasks:[{id:'T1',title:'Task',status:'pending'}]}}};
  listener(state);
  assert.equal(document.getElementById('assignment-card').hidden,true);
  assert.equal(document.getElementById('plan-card').hidden,false);
  assert.equal(document.querySelector('.plan-task').dataset.status,'current','main uses assignment projection, not stale main TODO');
  state={...state,execution:{...state.execution,phase:'blocked',assignments:[{id:'a',parent_task_id:'T1',
    status:'READY_FOR_INTEGRATION',source_commit:'sha',worktree:'/tree',commandActive:true,
    commands:[{id:'op-9',blocksIntegration:true}]}],diagnosticStatus:'sent',finalizationStatus:'pending'}};
  listener(state);
  assert.equal(document.querySelector('[data-stage=source]').dataset.status,'ready');
  assert.equal(document.querySelector('[data-stage=main]').dataset.status,'blocked');
  assert.equal(document.querySelector('[data-stage=diagnostic]').dataset.status,'sent');
  assert.match(document.getElementById('execution-next-action').textContent,/op-9/);
  state={...state,execution:{...state.execution,planView:{state:'awaiting-acceptance',completed:1,total:1,tasks:[{id:'T1',title:'Task',status:'done'}]},assignments:[{id:'a',parent_task_id:'T1',status:'INTEGRATED'}],
    phase:'complete',finalizationStatus:'reply-observed',diagnosticStatus:'reply-observed'}};
  listener(state);
  assert.equal(document.querySelector('[data-stage=main]').dataset.status,'done');
  assert.equal(document.querySelector('[data-stage=reply]').dataset.status,'done');
  assert.match(document.getElementById('execution-next-action').textContent,/приёмка пользователя/);
});

test('parent projection distinguishes assigned, ready and integrated results; launch failure is not a code conflict',()=>{
  const plan={tasks:[{id:'T1',title:'Base',commit_status:'PENDING'}]},assignment={id:'a',parent_task_id:'T1',status:'READY'};
  assert.equal(projectExecutionPlan(plan,[],{}).tasks[0].status,'pending');
  assert.equal(projectExecutionPlan(plan,[assignment],{}).tasks[0].status,'current');
  assignment.status='READY_FOR_INTEGRATION';
  assert.equal(projectExecutionPlan(plan,[assignment],{}).tasks[0].label,'Готово к интеграции');
  assert.equal(projectExecutionPlan(plan,[assignment],{}).completed,0);
  plan.tasks[0].commit_status='DONE';assert.equal(projectExecutionPlan(plan,[assignment],{}).completed,1);
  const failure={status:'CHECKS_FAILED',error:JSON.stringify({details:{result:{id:'test',status:'FAILED',exit_code:null,output:'spawnSync node ENOENT'}}})};
  assert.equal(integrationProblem(failure).code,'INTEGRATION_CHECK_START_FAILED');
  failure.error=JSON.stringify({details:{result:{status:'FAILED',exit_code:1}}});assert.equal(integrationProblem(failure),null);
});

// Traceability only: this inventory cannot turn an unexecuted fixture into
// evidence. Kit's unit-all/electron-smoke run the linked cases; a separate
// live ChatGPT, native Windows and clean-OS acceptance remain with the user.
test('F01-F20/A01-A06 map to named regression cases rather than invented PASS claims',async()=>{
  const root=new URL('./',import.meta.url);
  const cases={
    F01:['parallel-finalization.test.mjs','final READY returns control before DONE'],
    F02:['codex-app-server-mcp.test.mjs','real command completion is witnessed without polling and read-only preview'],
    F03:['parallel-finalization.test.mjs','F03: real Git/Kit source'],
    F04:['parallel-execution-recovery.test.mjs','F04: child receipt replacement wakes main'],
    F05:['command-activity.test.mjs','F05 previous-boot deletion exception'],
    F06:['command-activity.test.mjs','read-only UNKNOWN after restart'],
    F07:['parallel-finalization.test.mjs','F07/F08: missing source'],
    F08:['parallel-finalization.test.mjs','F07/F08: missing source'],
    F09:['parallel-execution.test.mjs','conflict keeps main exclusive'],
    F10:['parallel-execution.test.mjs','a failed launch is visible'],
    F11:['parallel-execution.test.mjs','ON waits for main readiness'],
    F12:['automation-send-state.test.mjs','F11/F12: cancelled pre-click'],
    F13:['parallel-finalization.test.mjs','manual OFF revokes pending finalization'],
    F14:['parallel-finalization.test.mjs','F14: scope, URL, HEAD'],
    F15:['automation-send-state.test.mjs','F15: the sending reservation'],
    F16:['parallel-finalization.test.mjs','F16: diagnostic pause is durable'],
    F17:['parallel-finalization.test.mjs','pending draft permits verified integration'],
    F18:['parallel-finalization.test.mjs','F18: changing pause, busy'],
    F19:['project-auto-plan.test.mjs','A01/A02/A04/A06: two main monitors in one project'],
    F20:['parallel-execution-ui.test.mjs','F20: worker source and HTTP preview'],
    A01:['project-auto-plan.test.mjs','A01-A05: awaitingPlan survives'],
    A02:['project-auto-plan.test.mjs','A01/A02/A04/A06: two main monitors'],
    A03:['project-auto-plan.test.mjs','A03/A06: only the user records manual OFF'],
    A04:['project-auto-plan.test.mjs','A04/A05: a new archived-plan epoch'],
    A05:['project-auto-plan.test.mjs','only confirmed completion disables'],
    A06:['auto-plan.test.mjs','A03/A06: executor-style and Review disables'],
  };
  assert.deepEqual(Object.keys(cases).sort(),[
    ...Array.from({length:20},(_,i)=>'F'+String(i+1).padStart(2,'0')),
    ...Array.from({length:6},(_,i)=>'A'+String(i+1).padStart(2,'0'))].sort());
  for(const [id,[file,title]] of Object.entries(cases)){
    const contents=await fs.readFile(new URL(file,root),'utf8');
    assert.ok(contents.includes("test('"+title)||contents.includes('test("'+title),id+' missing test: '+file);
  }
});
