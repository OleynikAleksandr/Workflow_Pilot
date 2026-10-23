import test from 'node:test';
import assert from 'node:assert/strict';
import {planPhase,buildWorkProgress,commitProgress,commitProgressLabel,eventCount,messageEvent,plural,stageKind,participantName} from '../src/contracts/work-progress.mjs';

test('Russian plural forms of the history count',()=>{
  assert.deepEqual([0,1,2,4,5,11,12,14,21,22,25,34,111].map(eventCount),['0 событий','1 событие','2 события','4 события','5 событий',
    '11 событий','12 событий','14 событий','21 событие','22 события','25 событий','34 события','111 событий']);
  assert.equal(plural(3,'a','b','c'),'3 b');
});

test('Kit commit progress is versioned and bounded; old Kit and damaged records give nothing',()=>{
  const value={version:1,task_id:'T001',check_id:'unit-all',index:2,total:3,check_started_at_ms:2000,run_started_at_ms:1000};
  const progress=commitProgress(value);
  assert.deepEqual(progress,{taskId:'T001',checkId:'unit-all',index:2,total:3,checkStartedAt:2000,runStartedAt:1000});
  assert.equal(commitProgressLabel(progress),'Kit проверяет коммит · unit-all · 2 из 3');
  for(const bad of [null,undefined,{},{...value,version:2},{...value,index:4},{...value,index:0},{...value,check_id:''},
    {...value,total:65,index:1},{...value,check_started_at_ms:'now'}])assert.equal(commitProgress(bad),null);
});

test('stage phases map to action, waiting and attention',()=>{
  for(const phase of ['working','dispatch','starting','merging','command','integration','delivery','prepare'])assert.equal(stageKind(phase),'act');
  for(const phase of ['waiting','waiting-task','question','review','report','accepted','ready','paused','complete'])assert.equal(stageKind(phase),'wait');
  assert.equal(stageKind('attention'),'warn');
  assert.equal(stageKind('waiting',{busy:true}),'act','an answering chat is acting');
  assert.deepEqual(['O','S','APP','KIT','PLAN','T002'].map(participantName),['Оркестратор','Обсуждение','Приложение','Workflow Kit','План','T002']);
});

test('history keeps messages in plain words and hides service mechanics',()=>{
  const at='2026-10-22T10:16:00.000Z',titles={T001:'Нормализация названий'};
  assert.deepEqual(messageEvent({message_id:'m1',kind:'task',sender_role:'O',task_id:'T001',created_at:at},{titles}),
    {at:Date.parse(at),actor:'O',text:'→ T001 задание «Нормализация названий»',kind:'done',id:'m1'});
  assert.equal(messageEvent({kind:'result',sender_role:'E',task_id:'T001',created_at:at,source_commit:'1a2b3c4d5e'}).text,'→ оркестратору результат · коммит 1a2b3c4');
  assert.equal(messageEvent({kind:'result',sender_role:'E',task_id:'T001',created_at:at}).actor,'T001');
  assert.equal(messageEvent({kind:'acceptance',sender_role:'O',task_id:'T001',created_at:at,source_commit:'1a2b3c4d5e'}).text,'принял T001 · коммит 1a2b3c4');
  assert.equal(messageEvent({kind:'question',sender_role:'E',task_id:'T002',created_at:at,preview_text:'JSON или текст?'}).text,'→ оркестратору вопрос: JSON или текст?');
  for(const kind of ['ready','recovery','probe','startup-context'])assert.equal(messageEvent({kind,sender_role:'APP',created_at:at}),null);
  assert.equal(messageEvent({kind:'task',sender_role:'O',task_id:'T001',created_at:at,superseded:true}),null);
  assert.equal(messageEvent({kind:'task',sender_role:'O',created_at:'not a date'}),null);
});

test('projection orders problems, actions and waits; history is newest first and bounded',()=>{
  const value=buildWorkProgress({title:'План',phase:'Выполнение',busy:true,done:1,total:4,
    tasks:[{id:'T001',title:'A',status:'done',label:'Интеграция проверена',mode:'Параллельно',elapsedMs:null},
      {id:'T002',title:'B',status:'current',label:'Выполняет поручение оркестратора',mode:'Параллельно',elapsedMs:1234.6,timers:{workMs:5,waitMs:6}}],
    now:[{actor:'O',text:'ждёт результатов',kind:'wait',elapsedMs:5},{actor:'T002',text:'работает',kind:'act',elapsedMs:7},
      {actor:'T003',text:'нет новых событий',kind:'warn'},{actor:'T004',text:''}],
    history:Array.from({length:205},(_,i)=>({at:1000+i,actor:'O',text:'событие '+i})),
    attention:{title:'T003 молчит',text:'Ответа нет.',action:{kind:'open-session'}}});
  assert.deepEqual(value.now.map(i=>i.kind),['warn','act','wait']);
  assert.equal(value.now[1].name,'T002');assert.equal(value.now[2].name,'Оркестратор');
  assert.equal(value.tasks[1].elapsedMs,1235);assert.deepEqual(value.tasks[1].timers,{workMs:5,waitMs:6});assert.equal(value.tasks[0].timers,null);
  assert.equal(value.history.length,200);assert.equal(value.history[0].text,'событие 204');
  assert.equal(value.attention.action.kind,'open-session');
  assert.equal(buildWorkProgress().attention,null);
});

test('plan stage follows the prototype order of states',()=>{
  assert.deepEqual(planPhase(),['Ждёт задачи',false],'no plan and nobody planning: the project waits for a task');
  assert.deepEqual(planPhase({starting:true,acting:true}),['Подготовка',true]);
  assert.deepEqual(planPhase({acting:true}),['Обсуждение',true],'a chat answers before anyone plans');
  assert.deepEqual(planPhase({planning:true}),['Подготовка плана',false],'a session owns planning');
  assert.deepEqual(planPhase({planning:true,acting:true}),['Подготовка плана',true]);
  const scope='scope';
  assert.deepEqual(planPhase({scope,notStarted:true}),['План готов',false]);
  assert.deepEqual(planPhase({scope,notStarted:true,started:true}),['Выполнение',false],'an outside agent already works on the plan');
  assert.deepEqual(planPhase({scope,preparing:true}),['Запуск',true]);
  assert.deepEqual(planPhase({scope,running:true}),['Выполнение',true]);
  assert.deepEqual(planPhase({scope,running:true,attention:true}),['Нужно внимание',false]);
  assert.deepEqual(planPhase({scope,paused:true}),['Пауза',false]);
  assert.deepEqual(planPhase({scope,allDone:true,acting:true}),['Завершение',true]);
  assert.deepEqual(planPhase({scope,allDone:true}),['Завершение',false],'a deferred cleanup waits without a spinner');
  assert.deepEqual(planPhase({scope,allDone:true,complete:true,attention:true}),['Ждёт приёмки',false]);
});
