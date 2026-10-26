import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountPanel} from '../src/frontend/plugin/panel.mjs';
import {executorStatus} from '../src/control/workflow/execution-projection.mjs';
import {currentPlanTasks,planActivity,activityClock,assignmentStage} from '../src/contracts/dialogue-view.mjs';
import {buildWorkProgress,stageKind} from '../src/contracts/work-progress.mjs';

test('the main panel ignores old busy gates and distinguishes transfer, receipt and manual Stop',async t=>{
  const dom=new JSDOM(await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8'));
  t.after(()=>dom.window.close());const ui=mountPanel({document:dom.window.document});
  const incoming={message_id:'result-two',kind:'result',task_id:'T002',read:false,delivery:'pending'};
  const blocker={message_id:'old-choice',kind:'user-choice',scope_id:null,read:true,delivery:'accepted',reason:'recipient-busy'};
  const render=channel=>{
    const activity=planActivity({run:{state:'running'},channel});
    const item={actor:activity.actor==='Канал связи'?'APP':'O',text:activity.label,reason:activity.reason,kind:stageKind(activity.phase)};
    const value=buildWorkProgress({now:[item]});ui.progress(value);return {activity,value};
  };
  let value=render({incoming,blocker});
  assert.match(dom.window.document.getElementById('progress-now').textContent,/Результат · T002 готов · передаём/);
  assert.equal(dom.window.document.querySelectorAll('#progress-now .wp-row.warn').length,0);
  value=render({incoming,blocker:{...blocker,reason:'commands-active'}});
  assert.match(value.activity.label,/Результат · T002 готов · передаём/);assert.equal(value.value.primary.kind,'act');
  value=render({incoming,blocker:{...blocker,reason:'manual-stop'}});
  assert.equal(value.value.primary.kind,'warn');assert.match(value.activity.reason,/откройте его чат/);
  assert.equal(dom.window.document.querySelectorAll('#progress-now .wp-row.warn').length,1);
  value=render({incoming});
  assert.equal(value.value.primary.kind,'act');assert.match(value.activity.label,/Результат · T002 готов/);
  assert.doesNotMatch(value.activity.label+value.activity.reason,/сохранение|SDK|квитанц|проверяет/i);
  assert.equal(dom.window.document.querySelectorAll('#progress-now .wp-row.warn').length,0,'resolved attention disappears');
  value=render({incoming:{...incoming,read:true,delivery:'unknown'}});
  assert.match(value.activity.label,/Получил результат/);assert.doesNotMatch(value.activity.label,/доставк|передаём/);
  assert.equal(value.value.primary.kind,'wait','receipt does not invent verification work');
  value=render({incoming:{...incoming,delivery:'unknown'}});
  assert.equal(value.value.primary.kind,'warn');assert.match(value.activity.reason,/Проверьте чат/);
  const connected={registered:true,sdk:true,permitted:true};
  assert.match(assignmentStage({dialogue:{result:{}},channel:{...connected,result:{read:false}}}).label,/Результат готов/);
  assert.match(assignmentStage({dialogue:{result:{}},channel:{...connected,result:{read:true}}}).label,/Оркестратор получил результат/);
});

test('preparation delivery names its real recipient and anchors the same message clock after refresh',()=>{
  const incoming={kind:'recovery',task_id:'T001',service_action:'prepare',recipient_role:'O',message_id:'m1',
    created_at:'2026-10-25T09:00:00Z',read:false,delivery:'pending'};
  const input={run:{state:'running'},channel:{sdk:false,incoming}};
  const stage=planActivity(input);
  assert.match(stage.label,/Восстанавливаем соединение с оркестратором/);assert.doesNotMatch(stage.label,/SDK первого исполнителя/);
  assert.equal(stage.recipient,'O');
  const accepted=planActivity({...input,channel:{sdk:false,incoming:{...incoming,delivery:'accepted',delivery_at:'2026-10-25T09:00:10Z'}}});
  assert.equal(accepted.phase,'waiting-read');assert.match(accepted.label,/Сообщение принято ChatGPT/);
  assert.doesNotMatch(accepted.label,/ещё не доставлен/);
  const clock=()=>activityClock({now:()=>0,wallNow:()=>Date.parse('2026-10-25T09:00:20Z')});
  assert.equal(clock()('p',stage).elapsedMs,20000);assert.equal(clock()('p',stage).elapsedMs,20000);
  assert.equal(clock()('p',accepted).elapsedMs,10000,'accepted waits start at the host receipt, not at creation');
  input.channel.incoming={...incoming,kind:'task',service_action:null,recipient_role:'E',delivery:'accepted'};
  assert.match(planActivity(input).label,/Сообщение принято ChatGPT · T001/);
  input.channel.incoming={...incoming,read:true,read_at:'2026-10-25T09:00:15Z'};
  assert.equal(clock()('p',planActivity(input)).elapsedMs,5000,'processing time excludes the preceding delivery queue');
  input.channel.incoming.handled=true;input.channel.incoming.handled_at='2026-10-25T09:00:18Z';
  assert.equal(clock()('p',planActivity(input)).elapsedMs,2000,'physical turn end waits start at the durable yield');
});

test('observable plan stages separate transport, processing, integration, cleanup and durable completion',()=>{
  const execution={planView:{tasks:[{status:'done'}]},assignments:[{cleanup:{status:'PENDING'}}]};
  const input={run:{state:'running'},execution};
  assert.equal(planActivity(input).phase,'cleanup');
  assert.equal(planActivity({...input,channel:{incoming:{kind:'result',task_id:'T001',read:true}}}).phase,'result');
  assert.doesNotMatch(planActivity({...input,channel:{incoming:{kind:'result',read:true}}}).label,/проверка|тест/i);
  assert.equal(planActivity({...input,channel:{incoming:{kind:'result',read:false,delivery:'accepted'}}}).phase,'waiting-read');
  assert.equal(planActivity({...input,channel:{incoming:{kind:'result',read:false,reason:'previous-turn'}}}).reason,'');
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

test('panel shows every current action with its time, a collapsed history and diagnostics in the shared palette',async t=>{
  const dom=new JSDOM(await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8'),{pretendToBeVisual:true});
  t.after(()=>dom.window.close());const document=dom.window.document,ui=mountPanel({document});ui.mode('workflow');
  const $=id=>document.getElementById(id);
  // Default view: no debugging data; every former section lives in the collapsed diagnostics.
  assert.equal($('progress-history').open,false);assert.equal($('progress-diagnostics').open,false);
  for(const id of ['communication-status','communication-bind','communication-stop','communication-roster','communication-messages','communication-events','communication-export'])
    assert.ok($('progress-diagnostics').contains($(id)),id+' stays available in diagnostics');
  const style=$('wp-palette');assert.match(style.textContent,/:root\[data-theme=dark\]\{--wp-page:#1b1d22/);
  assert.match(style.textContent,/prefers-color-scheme:dark\)\{:root:not\(\[data-theme=light\]\)/);
  const value={version:1,title:'JavaScript-утилиты',phase:'Выполнение',busy:true,done:1,total:4,self:'T002',
    now:[{actor:'T003',name:'T003',text:'нет новых событий 12 мин',kind:'warn',elapsedMs:720000},
      {actor:'O',name:'Оркестратор',text:'← вопрос от T002 · отвечает',kind:'act',elapsedMs:35000},
      {actor:'T002',name:'T002',text:'→ вопрос оркестратору · ждёт ответа',kind:'wait',elapsedMs:21000}],
    history:[{at:Date.parse('2026-10-22T10:19:00'),actor:'O',name:'Оркестратор',text:'→ T002 решение: JSON',kind:'done'},
      {at:Date.parse('2026-10-22T10:16:00'),actor:'T002',name:'T002',text:'→ оркестратору вопрос',kind:'done'}],
    tasks:[{id:'T002',timers:{activeMs:101000,waitingMs:41000}}],attention:null};
  ui.snapshot({messages:[],work_progress:value,permission:{phase:'running'},role:'E',task_id:'T002',mode:'workflow',conversation_key:'k'});
  assert.equal($('progress-title').textContent,'JavaScript-утилиты');
  assert.equal($('progress-phase').textContent,'в main 1 из 4');
  assert.equal($('progress-open').textContent,'открыт чат T002');
  const rows=[...$('progress-now').children];
  assert.deepEqual(rows.map(row=>row.className),['wp-row warn','wp-row secondary']);
  assert.equal(rows[1].querySelector('.wp-spin')!==null,true,'an action has a spinner');
  assert.equal(rows.some(row=>row.classList.contains('wait')),false,'ordinary waits do not duplicate the primary reason');
  assert.equal(rows[1].querySelector('.wp-flow').textContent,'← вопрос от T002');
  assert.equal(rows[0].querySelector('.wp-time').textContent,'12:00');
  assert.equal(rows[1].querySelector('.wp-time').textContent,'0:35');
  assert.equal($('progress-history-count').textContent,'2 события');
  assert.deepEqual([...$('progress-events').children].map(li=>li.querySelector('.wp-at').textContent),['10:19','10:16']);
  assert.equal($('progress-events').children[1].className,'me');
  assert.match($('progress-timers').textContent,/T002 · работа 1:41 · ожидание 0:41/);
  assert.doesNotMatch($('progress-now').textContent+$('progress-events').textContent,/[0-9a-f]{8}-[0-9a-f]{4}|SDK|pending|claimed/);
  // Opening the history survives a new projection and the ticking clock.
  $('progress-history').open=true;
  ui.progress({...value,now:[],history:value.history.slice(0,1)});
  assert.equal($('progress-history').open,true);
  assert.equal($('progress-history-count').textContent,'1 событие');
  assert.match($('progress-now').textContent,/Сейчас ничего не выполняется/);
  await new Promise(resolve=>setTimeout(resolve,1100));
  ui.progress(value);const before=$('progress-now').children[1].querySelector('.wp-time').textContent;
  await new Promise(resolve=>setTimeout(resolve,1100));
  assert.notEqual($('progress-now').children[1].querySelector('.wp-time').textContent,before,'the time ticks');
});
