import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountPanel} from '../src/frontend/plugin/panel.mjs';
import {executorStatus} from '../src/control/workflow/execution-projection.mjs';
import {currentPlanTasks,planActivity,activityClock,assignmentStage} from '../src/contracts/dialogue-view.mjs';

test('observable plan stages separate transport, processing, integration, cleanup and durable completion',()=>{
  const execution={planView:{tasks:[{status:'done'}]},assignments:[{cleanup:{status:'PENDING'}}]};
  const input={run:{state:'running'},execution};
  assert.equal(planActivity(input).phase,'cleanup');
  assert.equal(planActivity({...input,channel:{incoming:{kind:'result',task_id:'T001',read:true}}}).phase,'result');
  assert.doesNotMatch(planActivity({...input,channel:{incoming:{kind:'result',read:true}}}).label,/проверка|тест/i);
  assert.equal(planActivity({...input,channel:{incoming:{kind:'result',read:false,delivery:'accepted'}}}).phase,'delivery');
  assert.match(planActivity({...input,channel:{incoming:{kind:'result',read:false,reason:'previous-turn'}}}).reason,/предыдущего хода/);
  assert.equal(planActivity({...input,channel:{incoming:{kind:'recovery',read:true}}}).phase,'prepare');
  assert.equal(planActivity({...input,channel:{incoming:{kind:'finalization',read:true}}}).phase,'final');
  assert.equal(planActivity({...input,channel:{incoming:{kind:'finalization',read:true,handled:true}}}).phase,'turn-end');
  assert.match(planActivity({...input,channel:{incoming:{kind:'finalization',read:true,handled:true}}}).label,/итоговый ответ/);
  assert.equal(planActivity({...input,execution:{...execution,integration:{status:'RUNNING'}}}).phase,'integration');
  assert.equal(planActivity({...input,execution:{...execution,commands:[{state:'running',reason:'Проверка main'}]}}).phase,'command');
  execution.assignments[0].cleanup.status='DONE';
  assert.equal(planActivity(input).phase,'finalizing','cleanup alone is not complete');
  assert.equal(planActivity({...input,run:{state:'complete'}}).phase,'complete');
  assert.equal(planActivity({...input,run:{state:'paused'}}).phase,'paused');
  assert.equal(assignmentStage({channel:{registered:false,draft:{phase:'authorized'}}}).phase,'waiting-channel');
  let now=10;const clock=activityClock({now:()=>now,limit:2}),stage={phase:'result',label:'Результат'};
  assert.equal(clock('one',stage).elapsedMs,0);now=1010;
  assert.equal(clock('one',stage).elapsedMs,1000,'unchanged observations preserve elapsed time');
  assert.equal(clock('one',{...stage,phase:'final'}).elapsedMs,0,'new stage starts a new interval');
  clock('two',stage);clock('three',stage);now=2010;
  assert.equal(clock('one',stage).elapsedMs,0,'bounded observation cache does not invent old durations');
});

test('orchestrator card and plan use current integration facts instead of an older project snapshot',()=>{
  const tasks=[{id:'T001',status:'done'},{id:'T002',status:'done'},{id:'DOCS',status:'pending'}];
  const project={scopeId:'s',planExecution:{execution_strategy:'orchestrated'},
    planView:{tasks:tasks.map(t=>t.id==='T002'?{...t,status:'working'}:t)}};
  const execution={scopeId:'s',planView:{tasks}};
  assert.equal(currentPlanTasks(project,execution).filter(t=>t.status==='done').length,2);
  assert.equal(currentPlanTasks(project,execution).length,3);
  assert.equal(currentPlanTasks(project,{...execution,scopeId:'old'}),project.planView.tasks);
  assert.equal(currentPlanTasks({...project,planExecution:{execution_strategy:'sequential'}},execution),project.planView.tasks);
});

test('working UI separates report, acceptance and integration and renders addressed dialogue without HTML execution',async t=>{
  const dom=new JSDOM(await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8'));
  t.after(()=>dom.window.close());const ui=mountPanel({document:dom.window.document});ui.mode('workflow');
  const channel={registered:true,sdk:true,permitted:true,initial:{read:true}},record={pageState:{current:{state:{busy:false}}}};
  const assignment={dialogue_version:1,status:'READY_FOR_INTEGRATION',dialogue:{attempt:2,grant:{}}};
  assert.equal(executorStatus(assignment,record,null,{channel}).phase,'report');
  assignment.dialogue.result={source_commit:'a'.repeat(40)};
  assert.equal(executorStatus(assignment,record,null,{channel}).phase,'review');
  assignment.dialogue.acceptance={};assert.equal(executorStatus(assignment,record,null,{channel}).phase,'accepted');
  assignment.status='INTEGRATED';assert.equal(executorStatus(assignment,record,null,{channel}).phase,'done');
  ui.snapshot({mode:'workflow',role:'O',participant_id:'o',permission:{phase:'running'},messages:[{
    message_id:'m',sender_role:'E',recipient_id:'o',task_id:'T002',attempt:2,dialogue_version:1,
    kind:'result',delivery:'accepted',read:true,yielded:{},reply_observed:false,preview:'<script>unsafe()</script>',in_reply_to:'task-two'}],
    assignments:[{...assignment,phase:'INTEGRATED',task_id:'T002',assignment_id:'a-two',attempt:2,channel,physical:{stopped:true}}]});
  assert.match(ui.$('messages').textContent,/Исполнитель → Оркестратор.*T002/);
  assert.match(ui.$('messages').textContent,/обработано.*завершение хода не подтверждено/);
  assert.match(ui.$('messages').textContent,/В ответ на task-two/);
  assert.equal(ui.$('messages').querySelector('script'),null);
  assert.match(ui.$('roster').textContent,/T002.*Интеграция проверена/);
  ui.snapshot({mode:'workflow',role:'O',participant_id:'o',permission:{phase:'complete'},stopped:true,messages:[],
    assignments:['T001','T002','DOCS'].map(task_id=>({task_id,assignment_id:task_id,phase:'INTEGRATED',terminal:true}))});
  assert.match(ui.$('permission').textContent,/Выполнение завершено.*3\/3.*связь отключена/);
  assert.match(ui.$('permission').textContent,/Принимаю результат, закрой план/);
  assert.doesNotMatch(ui.$('roster').textContent,/SDK:.*не подтверждён/);
  ui.unbound();assert.equal(ui.$('roster').textContent,'');assert.equal(ui.$('roster-section').hidden,true);
});

test('panel displays a completed startup receipt instead of the historical pending delivery',async t=>{
  const dom=new JSDOM(await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8'));
  t.after(()=>dom.window.close());const ui=mountPanel({document:dom.window.document});ui.mode('workflow');
  const startup={message_id:'startup-m',kind:'startup-context',sender_role:'backend',recipient_id:'session',
    delivery:'pending',read:true,parts_read:[0,1,2],total_parts:3,startup_complete:true};
  ui.snapshot({mode:'workflow',role:'S',participant_id:'session',permission:{phase:'not-started'},stopped:true,
    startup:{delivery:'pending',complete:true,read:true,parts_read:3,total_parts:3},messages:[startup]});
  assert.match(ui.$('permission').textContent,/Контекст восстановлен/);
  assert.match(ui.$('last').textContent,/Контекст подтверждён/);
  assert.doesNotMatch(ui.$('last').textContent,/в очереди/);
  assert.match(ui.$('messages').textContent,/Контекст подтверждён/);
  assert.match(ui.$('queue').textContent,/0 непрочитанных · 0 ожидают/);
});

test('panel keeps Kit prepared and authorized separate from SDK accepted and executor start',async t=>{
  const dom=new JSDOM(await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8'));
  t.after(()=>dom.window.close());const ui=mountPanel({document:dom.window.document});ui.mode('workflow');
  const assignment={assignment_id:'a',task_id:'T001',phase:'READY',channel:{sdk:true,initial:{delivery:'pending',read:false}}};
  const message={message_id:'m',recipient_id:'e',sender_role:'O',kind:'task',delivery:'pending',read:false};
  const snapshot=(phase,delivery)=>ui.snapshot({mode:'workflow',role:'E',participant_id:'e',permission:{phase:'running'},
    assignments:[assignment],pending_intents:[{assignment_id:'a',phase}],messages:[{...message,delivery}]});
  snapshot('prepared','pending');
  assert.match(ui.$('outbox').textContent,/Поручение подготовлено/);
  assert.match(ui.$('last').textContent,/не доставлено/);
  snapshot('authorized','accepted');
  assert.match(ui.$('outbox').textContent,/Разрешено Kit · ожидает канал/);
  assert.match(ui.$('last').textContent,/Принято хостом \(SDK accepted\) · чтение не подтверждено/);
  assignment.phase='RUNNING';assignment.channel.initial.read=true;
  snapshot('published','accepted');
  assert.match(ui.$('roster').textContent,/Задача начата по Kit/);
});
