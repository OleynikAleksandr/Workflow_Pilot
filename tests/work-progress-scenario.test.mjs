import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {buildWorkProgress,commitProgress,commitProgressLabel,messageEvent,planPhase,eventCount,PLAN_READY_TEXT} from '../src/contracts/work-progress.mjs';
import {paletteCss,spinnerCss} from '../src/contracts/palette.mjs';
import {choiceCardCss,renderChoiceCard} from '../src/contracts/user-choice.mjs';
import {roleActor} from '../src/contracts/work-progress.mjs';
import {startupView} from '../src/contracts/startup-view.mjs';
import {mountPanel} from '../src/frontend/plugin/panel.mjs';

// The sidebar of the app with its real markup and module, imports replaced by the same contracts.
async function sidebarFixture(t){
  const html=await fs.readFile(new URL('../src/frontend/desktop/ui/index.html',import.meta.url),'utf8');
  const source=await fs.readFile(new URL('../src/frontend/desktop/ui/sidebar.mjs',import.meta.url),'utf8');
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://fixture.invalid/'});
  t.after(async()=>{await new Promise(resolve=>setTimeout(resolve,0));dom.window.close();});
  const {window}=dom,calls=[];let listener;
  Object.assign(window,{startupView,paletteCss,spinnerCss,choiceCardCss,renderChoiceCard,roleActor});
  const base={projects:[{workspace:'/demo',name:'Проект',expanded:true,sessions:[{sessionId:'o',createdAt:1,title:'План',role:'orchestrator',
    orchestratorScopeId:'scope',orchestratorState:{state:'running',label:'Выполняется'}},{sessionId:'s',createdAt:2,title:'Обсуждение',role:'discussion'}]}],
    selected:{workspace:'/demo',sessionId:'o',role:'orchestrator',scopeId:'scope'},context:{phase:'delivered'},planReview:{enabled:true,supported:true,message:''}};
  window.webPilot={getState:async()=>base,onState:fn=>{listener=fn;},selectSession:async(...args)=>{calls.push(args);return {state:base};}};
  window.eval('const createProgress=()=>({show(){},destroy(){}});const operationLabel=()=>"";const settingsPanelView=()=>({render(){}});const workspaceSetupView=()=>({render(){}});\n'
    +source.replace(/^import .*;\n/gm,''));
  await new Promise(resolve=>setTimeout(resolve,0));
  return {document:window.document,calls,emit:(work,extra={})=>listener(structuredClone({...base,workProgress:work,...extra}))};
}

const titles={T001:'Нормализация названий',T002:'Сводка чисел',T003:'Совместный JSON-пример',DOCS:'Документация проекта'};
const mode={T001:'Параллельно',T002:'Параллельно',T003:'Последовательно',DOCS:'Последовательно'};
const at=minute=>'2026-10-22T10:'+String(minute).padStart(2,'0')+':00.000Z';
const W='Выполняет поручение оркестратора',D='Интеграция проверена';
// The prototype scenario: [step, plan facts, task stages, current actions, messages so far].
const kit=commitProgress({version:1,task_id:'T001',check_id:'unit-all',index:2,total:3,check_started_at_ms:Date.now()-60000,run_started_at_ms:Date.now()-90000});
const steps=[
  ['Старт сессии',{scope:null,starting:true},{},[['O','читает стартовый контекст · часть 2 из 3','act']],0],
  ['Оркестратор готовит план',{scope:null},{},[['O','работает над ответом','act']],0],
  ['Обсуждение',{scope:null},{},[['O','ждёт вашего сообщения','wait']],0],
  ['План готов',{scope:'s',notStarted:true},{},[['PLAN',PLAN_READY_TEXT,'wait']],0],
  ['Запуск',{scope:'s',preparing:true},{T001:['current','Загружается контекст'],T002:['current','Подготовка службы и контекста']},
    [['KIT','Подготовка исполнителей','act'],['T001','Загружается контекст','act'],['T002','Подготовка службы и контекста','act']],0],
  ['Отправка заданий',{scope:'s',running:true},{T001:['current','Задание оркестратора в доставке · чтение не подтверждено'],T002:['current','Задание оркестратора в доставке · чтение не подтверждено']},
    [['O','Ожидаем результаты и события','wait'],['T001','Задание оркестратора в доставке · чтение не подтверждено','act'],['T002','Задание оркестратора в доставке · чтение не подтверждено','act']],2],
  ['Вопрос исполнителя',{scope:'s',running:true},{T001:['current',W],T002:['current','Вопрос оркестратору · ожидаем решение']},
    [['O','Обрабатывает вопрос исполнителя · T002','act'],['T001',W,'act'],['T002','Вопрос оркестратору · ожидаем решение','wait']],3],
  ['Проверка коммита',{scope:'s',running:true},{T001:['current',commitProgressLabel(kit)],T002:['current',W]},
    [['T001',commitProgressLabel(kit),'act'],['T002',W,'act'],['O','Ожидаем результаты и события','wait']],4],
  ['Слияние',{scope:'s',running:true},{T001:['done',D],T002:['current','Интегрируется']},[['KIT','Проверка и интеграция в main','act']],6],
  ['Пример проблемы',{scope:'s',running:true,attention:true},{T001:['done',D],T002:['done',D],T003:['attention','Активность сейчас не наблюдается']},
    [['T003','нет новых событий 12 мин · Активность сейчас не наблюдается','warn'],['O','Ожидаем результаты и события','wait']],8],
  ['Документация',{scope:'s',running:true},{T001:['done',D],T002:['done',D],T003:['done',D],DOCS:['current',W]},[['DOCS',W,'act']],10],
  ['Завершение',{scope:'s',running:true,allDone:true},{T001:['done',D],T002:['done',D],T003:['done',D],DOCS:['done',D]},[['KIT','План завершается','act']],12],
  ['Очистка ждёт',{scope:'s',running:true,allDone:true},{T001:['done',D],T002:['done',D],T003:['done',D],DOCS:['done',D]},[['T003','очистка ждёт конца хода исполнителя','wait']],12],
  ['Готово',{scope:'s',complete:true,allDone:true},{T001:['done',D],T002:['done',D],T003:['done',D],DOCS:['done',D]},[['O','Выполнение завершено — ожидается ваша приёмка','wait']],13],
];
const messages=[
  {kind:'task',sender_role:'O',task_id:'T001',created_at:at(16)},{kind:'task',sender_role:'O',task_id:'T002',created_at:at(16)},
  {kind:'ready',sender_role:'APP',task_id:'T002',created_at:at(16)},
  {kind:'question',sender_role:'E',task_id:'T002',created_at:at(18),preview_text:'JSON или текст?'},
  {kind:'decision',sender_role:'O',task_id:'T002',created_at:at(19)},
  {kind:'result',sender_role:'E',task_id:'T001',created_at:at(24),source_commit:'1a2b3c4d'},
  {kind:'acceptance',sender_role:'O',task_id:'T001',created_at:at(25),source_commit:'1a2b3c4d'},
  {kind:'result',sender_role:'E',task_id:'T002',created_at:at(26),source_commit:'5d6e7f80'},
  {kind:'acceptance',sender_role:'O',task_id:'T002',created_at:at(26),source_commit:'5d6e7f80'},
  {kind:'task',sender_role:'O',task_id:'T003',created_at:at(28)},
  {kind:'result',sender_role:'E',task_id:'T003',created_at:at(43),source_commit:'9a8b7c60'},
  {kind:'task',sender_role:'O',task_id:'DOCS',created_at:at(44)},
  {kind:'finalization',sender_role:'APP',created_at:at(53)},
];

function projection([,facts,stages,now,seen]){
  const [phase,busy]=planPhase({...facts,acting:now.some(item=>item[2]==='act')});
  const tasks=facts.scope?Object.keys(titles).map(id=>({id,title:titles[id],mode:mode[id],status:stages[id]?.[0]??'pending',
    label:stages[id]?.[1]??'Не начата',elapsedMs:['current','attention'].includes(stages[id]?.[0])?45000:null,target:null})):[];
  const history=messages.slice(0,seen).map(message=>messageEvent(message,{titles})).filter(Boolean);
  const warn=now.find(item=>item[2]==='warn');
  return buildWorkProgress({title:facts.scope?'JavaScript-утилиты и совместный пример':'',phase,busy,done:tasks.filter(t=>t.status==='done').length,
    total:tasks.length,tasks,now:now.map(([actor,text,kind])=>({actor,text,kind,elapsedMs:30000})),history,
    attention:warn?{title:warn[0]+' молчит',text:'Активность сейчас не наблюдается',action:null}:null});
}

test('the prototype scenario: sidebar and panel show the same projection at every step',async t=>{
  const sidebar=await sidebarFixture(t),$=id=>sidebar.document.getElementById(id);
  const panelDom=new JSDOM(await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8'),{pretendToBeVisual:true});
  t.after(()=>panelDom.window.close());
  const panel=mountPanel({document:panelDom.window.document}),p=id=>panelDom.window.document.getElementById(id);
  const phases=[];
  for(const step of steps){
    const value=projection(step),name=step[0];
    sidebar.emit(value,{planRun:{state:step[1].complete?'complete':step[1].notStarted?'not-started':'running',complete:!!step[1].complete}});
    panel.progress({...value,self:'O'});
    phases.push(value.phase+(value.busy?'*':''));
    // One stage, one progress, one list of tasks in both places.
    assert.equal($('plan-phase-text').textContent,value.phase,name);
    assert.ok(p('progress-phase').textContent.startsWith(value.phase),name);
    assert.equal($('plan-phase-spinner').hidden,!value.busy,name+': the stage spinner follows the work');
    if(value.total){
      assert.equal($('plan-status').textContent,'в main '+value.done+' из '+value.total,name);
      assert.ok(p('progress-phase').textContent.endsWith('в main '+value.done+' из '+value.total),name);
    }else assert.equal($('plan-progress').hidden,true,name);
    assert.deepEqual([...sidebar.document.querySelectorAll('.plan-task')].map(row=>row.dataset.status),value.tasks.map(task=>task.status),name);
    assert.deepEqual([...sidebar.document.querySelectorAll('.plan-task-stage')].map(node=>node.firstChild.textContent),value.tasks.map(task=>task.label),name);
    // Every current action is a row of the panel, problems first, then actions, then waits.
    const rows=[...p('progress-now').children].filter(row=>!/Сейчас ничего/.test(row.textContent));
    assert.deepEqual(rows.map(row=>row.querySelector('.wp-spin')?'act':row.classList.contains('warn')?'warn':'wait'),value.now.map(item=>item.kind),name);
    assert.deepEqual(rows.map(row=>row.querySelector('.wp-what').textContent),value.now.map(item=>item.name+' '+item.text),name);
    assert.equal(p('progress-history-count').textContent,eventCount(value.history.length),name);
    if(name==='План готов')assert.match(p('progress-now').textContent,/План ждёт вашей проверки и запуска\. Нажмите «Начать выполнение плана» слева/,'a ready plan is a wait for the user, not an empty list');
    // The problem block appears only with a problem; the foot stays pinned.
    assert.equal($('plan-attention').hidden,!value.attention,name);
    assert.ok($('plan-foot').contains($('plan-review-toggle')),name);
  }
  // A spinner (*) only while someone acts: an answering orchestrator spins, a deferred cleanup waits.
  assert.deepEqual(phases,['Подготовка*','Обсуждение*','Ждёт задачи','План готов','Запуск*','Выполнение*','Выполнение*','Выполнение*','Выполнение*',
    'Нужно внимание','Выполнение*','Завершение*','Завершение','Ждёт приёмки']);
  // History: plain words, no service mechanics, newest first.
  const last=projection(steps.at(-1));
  assert.equal(last.history.length,12,'the ready message is mechanics, not an event');
  assert.equal(last.history[0].text,'→ оркестратору поручение на итог');
  assert.ok(last.history.some(item=>item.text==='→ оркестратору вопрос: JSON или текст?'));
  assert.ok(last.history.some(item=>item.text==='принял T001 · коммит 1a2b3c4'));
  assert.doesNotMatch(p('progress-events').textContent+p('progress-now').textContent,/ready|SDK|pending|claimed|[0-9a-f]{8}-[0-9a-f]{4}/);
  assert.equal($('plan-note').hidden,false);assert.match($('plan-note').textContent,/Принимаю результат, закрой план/);
  assert.equal($('plan-run-toggle').hidden,true);
});

test('a large plan keeps the stage, the run button, the problem and Review out of the scrolling list',async t=>{
  const sidebar=await sidebarFixture(t),$=id=>sidebar.document.getElementById(id);
  const tasks=Array.from({length:40},(_,i)=>({id:'T'+String(i+1).padStart(3,'0'),title:'Задача '+(i+1),mode:'Параллельно',
    status:i<20?'done':i===35?'attention':i===21?'current':'pending',label:i<20?D:i===35?'Активность сейчас не наблюдается':i===21?W:'Не начата',elapsedMs:null,target:null}));
  sidebar.emit(buildWorkProgress({title:'Большой план',phase:'Нужно внимание',done:20,total:40,tasks,now:[],history:[],
    attention:{title:'T036 молчит',text:'Активность сейчас не наблюдается',action:null}}),{planRun:{state:'running',complete:false}});
  const card=$('plan-card'),list=$('plan-tasks');
  assert.equal(list.children.length,40);
  for(const id of ['plan-phase','plan-progress'])assert.equal(card.querySelector('.plan-top').contains($(id)),true,id+' is pinned above');
  for(const id of ['plan-run-toggle','plan-attention','plan-review-toggle'])assert.equal($('plan-foot').contains($(id)),true,id+' is pinned below');
  assert.equal(list.contains($('plan-run-toggle')),false);
  // The pinning rules of the stylesheet: only the list scrolls inside a card that may shrink.
  const css=[...sidebar.document.querySelectorAll('style')].map(node=>node.textContent).join('\n');
  assert.match(css,/#plan-card>\.plan-tasks\{[^}]*overflow-y:auto/);
  assert.match(css,/#plan-card\{[^}]*flex-direction:column[^}]*min-height:0/);
  assert.match(css,/#plan-card>\*\{flex:0 0 auto\}/);
  assert.equal($('plan-attention').hidden,false);assert.equal($('plan-attention-title').textContent,'T036 молчит');
});
