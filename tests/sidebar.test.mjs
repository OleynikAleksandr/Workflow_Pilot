import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { executionFinalStages } from '../src/control/workflow/execution-projection.mjs';
import {startupView} from '../src/contracts/startup-view.mjs';
import {paletteCss,spinnerCss,PALETTE,shellBackground} from '../src/contracts/palette.mjs';
import {choiceCardCss,renderChoiceCard,choiceOptions} from '../src/contracts/user-choice.mjs';
import {roleActor,participantName} from '../src/contracts/work-progress.mjs';
import {mountCurrentActions,currentActionsCss} from '../src/frontend/desktop/ui/current-actions.mjs';

test('normal panel startup is not written under the session; only a startup problem is, with the project menu',async t=>{
  const f=await fixture(t),$=id=>f.document.getElementById(id);
  for(const startup of [{read:true,parts_read:1,total_parts:3},{complete:true},{delivery:'accepted'}]){
    f.emit({...f.state,context:{phase:'startup-channel',messageSent:true,startup}});
    assert.equal($('session-notice').hidden,true,'the panel shows the startup progress');
  }
  f.emit({...f.state,context:{phase:'startup-complete',messageSent:true,startup:{complete:true,delivery:'pending',read:true}}});
  assert.equal($('session-notice').hidden,true);
  f.emit({...f.state,context:{phase:'startup-failed',messageSent:true,error:{code:'STORE_BLOCKED',message:'WAL недоступен'},
    startup:{delivery:'pending',error:{code:'STORE_BLOCKED',message:'WAL недоступен'}}}});
  assert.equal($('session-notice').hidden,false);
  assert.match($('session-notice-detail').textContent,/WAL недоступен.*меню проекта/s);
  assert.equal($('new-context-session'),null);
  f.emit({...f.state,context:{phase:'startup-failed',messageSent:true,
    startup:{delivery:'pending',error:{code:'PLUGIN_COMMUNICATION_STALE_MESSAGE'}}}});
  assert.match($('session-notice-title').textContent,/устарел/);
  assert.match($('session-notice-detail').textContent,/Новый Chat/);assert.doesNotMatch($('session-notice-detail').textContent,/Новый Work/);
});

test('Kit recovery hold reports next action instead of an empty chat, and distinguishes technical OFF from manual pause',async t=>{
  const f=await fixture(t),base=f.state,$=id=>f.document.getElementById(id);
  const info='Незавершённая транзакция Kit. Выполните status, затем commit или repair.';
  const selected={...base.selected,scopeId:'scope',planExecution:{execution_strategy:'sequential'}};
  f.emit({...base,selected,planRun:{state:'paused',reason:'recovery',message:info,recoveryHeld:true},
    context:{phase:'error',messageSent:false,error:{code:'PROJECT_RECOVERY_REQUIRED',message:info}}});
  assert.equal($('session-notice').hidden,false);assert.match($('session-notice-detail').textContent,/status.*repair/);
  // The button stays the explicit recheck: setPlanExecution refuses while the
  // transaction is still open (execution-control.test.mjs).
  assert.equal($('plan-run-toggle').disabled,false,'held project keeps the explicit Kit recheck');
  assert.match($('plan-run-message').textContent,/не ручная пауза/);
  f.emit({...base,selected,planRun:{state:'paused',reason:'recovery',message:'Kit завершён, нажмите Продолжить',recoveryHeld:false},
    context:{phase:'selected',messageSent:false}});
  assert.equal($('plan-run-toggle').disabled,false,'confirmed release permits explicit restart');
  assert.match($('plan-run-message').textContent,/Автопродолжение отключено/);
  f.emit({...base,selected,planRun:{state:'paused',reason:'manual',message:null,recoveryHeld:false}});
  assert.doesNotMatch($('plan-run-message').textContent,/после восстановления Kit/);
});

test('three integrations keep the observed final stage and Pause until durable complete, then explain acceptance',async t=>{
  const f=await fixture(t),base=f.state,$=id=>f.document.getElementById(id);
  const plan={scopeId:'scope',objective:'Опыт',current:true,tasks:['T001','T002','DOCS'].map(id=>
    ({id,title:id,status:'done',label:'Интеграция проверена'}))};
  const state={...base,selected:{...base.selected,scopeId:'scope'},orchestratorPlan:plan,
    planRun:{state:'running',complete:false,activity:{phase:'cleanup',label:'План завершается',
      actor:'Workflow Kit',reason:'Ожидаем квитанции и очистку.',elapsedMs:65000}}};
  f.emit(state);
  assert.equal($('plan-status').textContent,'в main 3 из 3');
  assert.equal($('plan-status').dataset.state,'working');
  assert.equal($('plan-run-toggle').hidden,false);
  assert.equal($('plan-phase-text').textContent,'Выполнение');
  f.emit({...state,workProgress:{version:1,title:'Опыт',phase:'Завершение',busy:true,done:3,total:3,tasks:plan.tasks,
    now:[{actor:'KIT',text:'План завершается',kind:'act',elapsedMs:65000}],history:[],attention:null}});
  assert.equal($('plan-phase-text').textContent,'Выполнение');assert.equal($('plan-phase-spinner').hidden,true);
  assert.equal($('current-now'),null,'detailed progress is only in the MCP panel');
  assert.equal($('plan-note').hidden,true);
  assert.doesNotMatch($('plan-card').textContent,/Все 3 задачи выполнены/);
  f.emit({...state,planRun:{state:'complete',complete:true,activity:{phase:'complete',
    label:'Выполнение завершено — ожидается ваша приёмка',actor:'План',elapsedMs:0}}});
  assert.equal($('plan-run-toggle').hidden,true);
  assert.equal($('plan-run-message').hidden,true,'the acceptance hint alone tells what to do');
  assert.match($('plan-note').textContent,/Принимаю результат, закрой план/);
  assert.equal($('plan-status').dataset.state,'awaiting-acceptance');
  f.emit({...state,orchestratorPlan:{...plan,current:false},planRun:null});
  assert.equal($('plan-status').dataset.state,'closed');
  assert.match($('plan-note').textContent,/следующему новому плану/);
});

test('orchestrated result receipts and Kit integrations progress independently through 2/1, 2/2, 4/4',async t=>{
  const f=await fixture(t),base=f.state,$=id=>f.document.getElementById(id);
  const tasks=['T001','T002','T003','DOCS'].map(id=>({id,title:id,status:'pending',executionLabel:'Параллельно'}));
  const state={...base,selected:{...base.selected,scopeId:'scope',planExecution:{execution_strategy:'orchestrated'}},
    orchestratorPlan:{scopeId:'scope',objective:'Проект',current:true,deliveryStatus:'IN_PROGRESS',tasks,
      evidence:{received:2,total:4,integrated:1,totalTasks:4}},
    planRun:{state:'running',complete:false}};
  tasks[0].status='done';f.emit(state);
  assert.equal($('plan-status').textContent,'в main 1 из 4');
  assert.equal($('plan-status').dataset.state,'working');
  tasks[1].status='done';f.emit({...state,orchestratorPlan:{...state.orchestratorPlan,
    evidence:{received:2,total:4,integrated:2,totalTasks:4}}});
  assert.equal($('plan-status').textContent,'в main 2 из 4');
  for(const task of tasks)task.status='done';tasks[3].docsChecksHint='DOCS checks:[] в Kit — проверки приложения не запускаются этим коммитом.';
  f.emit({...state,orchestratorPlan:{...state.orchestratorPlan,deliveryStatus:'READY_FOR_ACCEPTANCE',
    evidence:{received:4,total:4,integrated:4,totalTasks:4}},planRun:{state:'running',complete:false}});
  assert.equal($('plan-status').textContent,'в main 4 из 4');
  assert.equal($('plan-status').dataset.state,'awaiting-acceptance');
  assert.match($('plan-note').textContent,/ожидается ваша приёмка/);
  assert.equal(f.document.querySelector('.plan-task-check-note'),null,'no technical DOCS note');
  assert.doesNotMatch($('plan-card').textContent,/checks:\[\]/);
  for(const task of tasks)task.status='pending';
  f.emit({...state,planRun:{state:'not-started'},orchestratorPlan:{...state.orchestratorPlan,
    evidence:{received:0,total:4,integrated:0,totalTasks:4}}});
  assert.equal($('plan-status').dataset.state,'ready','ACTIVE is not observed work');
  assert.doesNotMatch($('plan-note').textContent,/ожидается ваша приёмка/);
});

test('external conversation stays visibly external; there is no PlanContinuation switch, only the plan button',async t=>{
  const f=await fixture(t),base=f.state;
  assert.equal(f.document.getElementById('plan-continuation-toggle'),null,'no PlanContinuation button at all');
  assert.equal(typeof f.window.webPilot.setPlanContinuation,'undefined');
  f.emit({...base,selected:{...base.selected,external:{provider:'chatgpt-plugin'},manualStart:true},
    context:{phase:'external-session',servicesReady:true,messageSent:true},planRun:null,
    workProgress:{primary:{actor:'PLAN',text:'Ожидаем результаты',kind:'wait'},now:[],history:[]}});
  const button=f.document.getElementById('plan-run-toggle');
  assert.equal(button.hidden,true,'an external session has no plan button');
  assert.equal(f.document.getElementById('session-notice').hidden,false);
  assert.match(f.document.getElementById('session-notice-title').textContent,/Открыто в ChatGPT/);
  assert.equal(f.document.getElementById('new-context-session'),null);
  // A plan of the former model has the same one button.
  f.emit({...base,planRun:{state:'not-started',reason:null,issue:null,complete:false}});
  assert.equal(button.hidden,false);assert.equal(button.textContent,'Начать выполнение плана');
  f.emit({...base,planRun:{state:'running',reason:null,issue:null,complete:false},planContinuation:{enabled:true,message:'Выполнение плана запущено. Агент работает.',continuations:2}});
  assert.equal(button.textContent,'Пауза');
  assert.match(f.document.getElementById('plan-continuation-message').textContent,/№2.*Выполнение плана запущено/);
  f.emit({...base,planRun:{state:'paused',reason:null,issue:null,complete:false}});
  assert.equal(button.textContent,'Продолжить');assert.equal(f.document.getElementById('plan-continuation-message').hidden,true);
  f.emit({...base,planRun:{state:'running',complete:false},
    execution:{phase:'finalizing',finalizationReason:'Ожидаем последние квитанции.'}});
  assert.equal(button.hidden,false,'stop remains available while finalizing');
  assert.equal(f.document.getElementById('plan-run-message').hidden,true,'the plan stage, not a message, reports finalization');
  f.emit({...base,planRun:{state:'complete',complete:true},execution:{phase:'complete'}});
  assert.equal(button.hidden,true);assert.equal(f.document.getElementById('plan-run-message').hidden,true);
  assert.doesNotMatch(f.document.body.textContent,/втовыполнени/,'no text speaks of PlanContinuation');
});

test('project picker searches, marks current/background work, keeps one parent and supports keyboard escape',async t=>{
  const f=await fixture(t),base=f.state,other={workspace:'/other',name:'Другой',activity:'working',expanded:true,sessions:[{sessionId:'other-chat',createdAt:1000,title:'Другой чат'}]};
  f.emit({...base,version:'0.6.110',projects:[...base.projects,other]});
  assert.equal(f.document.querySelectorAll('.workspace-tree').length,1);
  assert.equal(f.document.querySelectorAll('[data-project-choice]').length,2);
  assert.match(f.document.querySelector('[data-project-choice="/other"]').textContent,/Работает в фоне/);
  assert.equal(f.document.getElementById('prototype-version').textContent,'0.6.110');
  assert.ok(f.document.getElementById('open-settings').closest('.brand'));
  const search=f.document.getElementById('project-search'),menu=f.document.getElementById('project-actions');
  menu.open=true;search.value='другой';search.dispatchEvent(new f.window.Event('input'));
  assert.equal(f.document.querySelectorAll('[data-project-choice]').length,1);
  // Any project, also one whose folder is gone and cannot be selected, is archived from the list.
  const archiveCalls=[];f.window.webPilot.archiveProject=async(workspace,options)=>{archiveCalls.push([workspace,options]);return {state:f.state};};
  f.document.querySelector('.project-choice-archive').click();await f.settle();
  assert.equal(archiveCalls.length,1);assert.equal(archiveCalls[0][0],'/other');assert.equal(archiveCalls[0][1],undefined,'no plan: no confirmation needed');
  assert.equal(f.document.querySelector('.project-choice-archive').getAttribute('aria-label'),'Перенести в архив: Другой');
  search.focus();search.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
  assert.equal(f.document.activeElement.dataset.projectChoice,'/other');
  f.document.activeElement.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(menu.open,false);assert.equal(f.document.activeElement,menu.querySelector('summary'));
  f.emit({...base,projects:[...base.projects,other],selected:{workspace:'/tree',parentWorkspace:'/demo',sessionId:'worker',assignmentId:'a'}});
  assert.equal(f.document.querySelector('.project').dataset.workspace,'/demo');
  assert.equal(f.document.getElementById('plan-card').hidden,true);
  f.emit({...base,projects:[...base.projects,other],selected:{workspace:'/other',sessionId:'other-chat'}});
  assert.equal(f.document.querySelector('.project').dataset.workspace,'/other');
  assert.equal(f.document.querySelectorAll('.workspace-tree').length,1);
  f.emit(base);assert.equal(f.document.querySelector('.project').dataset.workspace,'/demo');
});

test('a background project check is silent; only its failure is shown',async t=>{
  const f=await fixture(t),base=f.state;
  f.emit({...base,workspaceHealth:{workspace:'/demo',phase:'checking',ready:false}});
  assert.equal(f.document.getElementById('workspace-health').hidden,true,'switching sessions does not shift the plan card');
  f.emit({...base,workspaceHealth:{workspace:'/demo',phase:'error',ready:false,error:{message:'Git недоступен'}}});
  assert.equal(f.document.getElementById('workspace-health').hidden,false);
  assert.match(f.document.getElementById('workspace-health-message').textContent,/Git недоступен/);
});

test('sidebar settings reserve an accessible recovery block separate from project/archive lists',async t=>{
  const f=await fixture(t);
  const section=f.document.getElementById('executor-recovery');
  assert.ok(section.closest('#settings-panel'));
  assert.equal(section.getAttribute('aria-live'),'polite');
  assert.match(section.textContent,/Облачные чаты ChatGPT сохраняются/);
  assert.ok(f.document.getElementById('executor-recovery-items'));
  assert.ok(!section.closest('#active-projects'));
});

test('plan rows separate identity, planned mode and current status, including final handoff',async t=>{
  const f=await fixture(t),base=f.state;
  f.emit({...base,selected:{...base.selected,scopeId:'scope',planExecution:{execution_strategy:'parallel'}},
    execution:{finalizationStatus:'sent',planView:{state:'working',total:1,completed:0,tasks:[{
      id:'T003',title:'Результат',status:'current',executionLabel:'После T001 · Параллельно',label:'Готово к интеграции'}]}}});
  assert.equal(f.document.querySelector('.plan-task-id').textContent,'T003');
  assert.equal(f.document.querySelector('.plan-task strong').textContent,'Результат');
  assert.match(f.document.querySelector('.plan-task-mode').textContent,/После T001/);
  assert.match(f.document.querySelector('.plan-task-stage').textContent,/^В работе · После T001/);
});


test('upload wait offers cancellation and errors allow a fresh session without a locked sidebar',async t=>{
  const f=await fixture(t),base=f.state,$=id=>f.document.getElementById(id);
  f.window.webPilot.cancelContext=async()=>{f.calls.push(['cancelContext']);return {};};
  f.emit({...base,context:{phase:'waiting-attachments',uploadProgress:{ready:1,total:2}}});
  assert.equal($('cancel-context').hidden,false);assert.match($('session-notice-detail').textContent,/1 из 2/);
  $('cancel-context').click();await new Promise(resolve=>setImmediate(resolve));
  assert.ok(f.calls.some(call=>call[0]==='cancelContext'));assert.equal($('open-settings').disabled,false);
  f.emit({...base,context:{phase:'preparation-paused'}});
  assert.equal($('retry-context').hidden,false);assert.equal($('new-context-session'),null);
});

async function fixture(t) {
  const html = await fs.readFile(new URL('../src/frontend/desktop/ui/index.html', import.meta.url), 'utf8');
  const source = await fs.readFile(new URL('../src/frontend/desktop/ui/sidebar.mjs', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://fixture.invalid/' });
  t.after(async () => { await new Promise(resolve => setTimeout(resolve, 0)); dom.window.close(); });
  const { window } = dom, document = window.document, calls = [];
  window.startupView=startupView;window.paletteCss=paletteCss;window.spinnerCss=spinnerCss;
  window.choiceCardCss=choiceCardCss;window.renderChoiceCard=renderChoiceCard;window.roleActor=roleActor;
  Object.assign(window,{participantName,mountCurrentActions,currentActionsCss});
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  // JSDOM has no top layer. Electron smoke verifies native popover geometry.
  const query = document.querySelectorAll.bind(document);
  document.querySelectorAll = selector => query(selector.replaceAll(':popover-open', '[data-test-open]'));
  const matches = window.Element.prototype.matches;
  window.Element.prototype.matches = function(selector) { return matches.call(this, selector.replaceAll(':popover-open', '[data-test-open]')); };
  for (const [method, open] of [['showPopover', true], ['hidePopover', false]]) {
    window.HTMLElement.prototype[method] = function() {
      this.toggleAttribute('data-test-open', open);
      const event = new window.Event('toggle'); event.newState = open ? 'open' : 'closed'; this.dispatchEvent(event);
    };
  }
  let state = {
    projects: [{ workspace: '/demo', name: 'Проект', expanded: true, sessions: [4, 3, 2, 1].map(n => ({
      sessionId: 's' + n, createdAt: n * 1000, title: 'Сессия ' + n, chatUrl: 'https://fixture.invalid/c/' + n,
    })) }], selected: { workspace: '/demo', sessionId: 's4' }, context: { phase: 'delivered' },
  };
  let onState;
  const emit = value => { state = structuredClone(value); onState(state); };
  const api = {
    getState: async () => structuredClone(state), onState: listener => { onState = listener; },
    async selectSession(workspace, sessionId) { calls.push(['selectSession', workspace, sessionId]); state.selected = { workspace, sessionId }; return { state: structuredClone(state) }; },
    async selectWorkspace(workspace) { calls.push(['selectWorkspace', workspace]); state.selected = { workspace, sessionId: state.projects[0].sessions[0].sessionId }; state.projects[0].expanded = true; return { state: structuredClone(state) }; },
    async setExpanded(workspace, expanded) { calls.push(['setExpanded', workspace, expanded]); state.projects.find(p => p.workspace === workspace).expanded = expanded; return { state: structuredClone(state) }; },
    async chooseWorkspace() { calls.push(['chooseWorkspace']); return { state: structuredClone(state) }; },
  };
  window.webPilot = api;
  window.eval(`const createProgress = () => ({show(){},destroy(){}}); const operationLabel = () => ''; const settingsPanelView = () => ({render(){}}); const workspaceSetupView = () => ({render(state){document.getElementById('projects').hidden=!!state.setup;}});\n`
    + 'const executionFinalStages='+executionFinalStages.toString()+';\n'+source.replace(/^import .*;\n/gm, ''));
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  await settle();
  return { window, document, calls, emit, get state() { return structuredClone(state); }, settle };
}

test('retired plugin launch is absent while the normal project menu remains',async t=>{
  const f=await fixture(t);
  assert.equal(f.document.querySelector('.new-project-plugin'),null);
  assert.equal(f.document.getElementById('plugin-launch-notice'),null);
  assert.ok(f.document.getElementById('project-actions'));
});

test('native project actions stay open after focus changes, close on outside click and invoke existing action', async t => {
  const f = await fixture(t), header = f.document.getElementById('project-actions');
  const summary = header.querySelector('summary');
  summary.click(); assert.equal(header.open, true);
  summary.dispatchEvent(new f.window.FocusEvent('focusout', { bubbles: true }));
  assert.equal(header.open, true, 'focusout must not immediately close disclosure');
  f.document.getElementById('add-workspace').click(); await f.settle();
  assert.equal(header.open, false); assert.deepEqual(f.calls, [['chooseWorkspace']]);
  summary.click(); f.document.body.click(); assert.equal(header.open, false);
  summary.click(); summary.click(); assert.equal(header.open, false);
});

test('old session selection preserves scroll and order, project click resets to newest and arrow only folds', async t => {
  const f = await fixture(t), list = () => f.document.querySelector('.sessions');
  const ids = () => [...f.document.querySelectorAll('.session')].map(button => button.dataset.sessionId);
  list().scrollTop = 144;
  f.document.querySelector('[data-session-id=s1]').click(); await f.settle();
  assert.equal(list().scrollTop, 144); assert.deepEqual(ids(), ['s4', 's3', 's2', 's1']);
  assert.equal(f.document.querySelector('.session.active').dataset.sessionId, 's1');
  const changed = f.state; changed.projects[0].sessions[0].title = 'Обновлённый заголовок'; f.emit(changed);
  assert.equal(list().scrollTop, 144, 'metadata refresh retains scroll');
  f.document.querySelector('.expand-project').click(); await f.settle();
  assert.equal(list().hidden, true); assert.equal(f.state.selected.sessionId, 's1');
  f.document.querySelector('.expand-project').click(); await f.settle();
  assert.equal(list().hidden, false); assert.equal(list().scrollTop, 144);
  f.document.querySelector('.project').click(); await f.settle();
  assert.equal(f.state.selected.sessionId, 's4'); assert.equal(list().scrollTop, 0);
  assert.equal(f.calls.filter(call => call[0] === 'selectWorkspace').length, 1, 'one immediate project action');
});


test('active session outline continues the accent project tree around the full row', async t => {
  const f = await fixture(t);
  const css = f.document.querySelector('style').textContent.replace(/\s+/g, ' ');
  const activeRow = f.document.querySelector('.session.active').closest('.session-row');
  assert.ok(activeRow.querySelector('.session-experience'), 'outline row contains Chat/Work badge');
  assert.ok(activeRow.querySelector('.session-menu-button'), 'outline row contains session menu');
  assert.ok(css.includes('border-left:.5px solid var(--tree-guide);border-bottom:.5px solid var(--tree-guide);border-bottom-left-radius:6px'), 'last branch is rounded');
  assert.ok(css.includes('#projects .expand-project{border:0;background:transparent;width:51px;align-self:stretch;flex:0 0 51px;display:grid;place-items:center;padding:0;border-radius:10px;color:var(--tree-guide)}'));
  assert.ok(css.includes('#projects .expand-project .tree-icon{width:20px;height:20px;stroke-width:.5;transition:transform .16s}'));
  assert.ok(css.includes('background:var(--tree-guide);pointer-events:none}'), 'project trunk uses accent');
  assert.ok(css.includes('width:23.5px;height:.5px;background:var(--tree-guide)}'), 'session branch uses half-pixel muted line');
  assert.ok(css.includes('#projects .session-row{position:relative;display:flex;align-items:center;gap:1px;flex:1;min-width:0;border:.5px solid transparent;border-radius:8px;padding-right:4px}'));
  assert.ok(css.includes('#projects .session-row:has(.session.active){background:var(--tree-selected);border-color:var(--tree-guide)}'));
  assert.ok(!css.includes('.session-row:has(.session.active)::before'), 'legacy vertical active marker is removed');
});

test('newly added session starts at top while global folding preserves current session', async t => {
  const f = await fixture(t);
  f.document.querySelector('.sessions').scrollTop = 144;
  const changed = f.state;
  changed.projects[0].sessions.unshift({ sessionId: 's5', createdAt: 5000, title: 'Новая', });
  changed.selected.sessionId = 's5'; f.emit(changed);
  assert.equal(f.document.querySelector('.sessions').scrollTop, 0);
  f.document.getElementById('toggle-projects').click(); await f.settle();
  assert.equal(f.document.querySelector('.sessions').hidden, true); assert.equal(f.state.selected.sessionId, 's5');
  f.document.getElementById('toggle-projects').click(); await f.settle();
  assert.equal(f.document.querySelector('.sessions').hidden, false); assert.equal(f.state.selected.sessionId, 's5');
});


test('temporary workspace validation preserves scroll across hidden and replaced lists', async t => {
  const f = await fixture(t), list = () => f.document.querySelector('.sessions');
  list().scrollTop = 144;
  const checking = f.state; checking.setup = { phase: 'checking' }; f.emit(checking);
  assert.equal(f.document.getElementById('projects').hidden, true);
  const detached = list(); detached.scrollTop = 0;
  detached.dispatchEvent(new f.window.Event('scroll'));
  const selected = f.state; selected.selected.sessionId = 's1'; f.emit(selected);
  assert.notEqual(list(), detached, 'selection changed while tree was hidden');
  detached.dispatchEvent(new f.window.Event('scroll'));
  const ready = f.state; ready.setup = null; f.emit(ready);
  assert.equal(f.document.getElementById('projects').hidden, false);
  assert.equal(list().scrollTop, 144, 'hidden browser scroll reset is ignored');
  assert.equal(f.document.querySelector('.session.active').dataset.sessionId, 's1');
});

test('one project plan stays visible for the selected chat and legacy ownership metadata has no UI', async t => {
  const f=await fixture(t),state=f.state;
  state.selected={...state.selected,scopeId:'current',objective:'Текущий план проекта',
    planBinding:'unresolved',originSessionId:'old-session',preparedPlans:[{planId:'legacy-future'}],
    unassignedPlans:[{plan_id:'legacy'}],
    planView:{state:'awaiting-acceptance',completed:1,total:1,tasks:[{id:'T1',title:'Сохранённый результат',status:'done'}]}};
  f.emit(state);
  assert.equal(f.document.querySelector('#plan-card .eyebrow'),null);
  assert.equal(f.document.getElementById('plan-title').textContent,'Текущий план проекта');
  assert.equal(f.document.querySelector('#plan-tasks strong').textContent,'Сохранённый результат');
  assert.equal(f.document.getElementById('plan-status').textContent,'в main 1 из 1');
  assert.equal(f.document.getElementById('plan-phase-text').textContent,'Ждёт приёмки');
  assert.equal(f.document.querySelector('#plan-tasks .plan-task-state').getAttribute('aria-label'),'влита в main');
  assert.equal(f.document.getElementById('prepared-card'),null);
  assert.equal(f.document.getElementById('plan-origin'),null);
  // A sequential plan waits for the user's acceptance just like an orchestrated one.
  assert.equal(f.document.getElementById('plan-note').hidden,false);
  assert.match(f.document.getElementById('plan-note').textContent,/ожидается ваша приёмка.*агенту плана/);
});

test('rapid A-B-A navigation reaches IPC immediately and ignores obsolete responses', async t => {
  const f = await fixture(t), pending = [];
  f.window.webPilot.selectSession = (workspace, sessionId) => new Promise(resolve => pending.push({ workspace, sessionId, resolve }));
  for (const id of ['s1', 's2', 's1']) f.document.querySelector(`[data-session-id=${id}]`).click();
  assert.deepEqual(pending.map(p => p.sessionId), ['s1', 's2', 's1']);
  const response = (i, title) => {
    const state = f.state; state.selected.sessionId = pending[i].sessionId;
    state.projects[0].sessions.find(s => s.sessionId === pending[i].sessionId).title = title;
    pending[i].resolve({ state });
  };
  response(2, 'Самый свежий план'); await f.settle();
  response(1, 'Старый B'); response(0, 'Старый A'); await f.settle();
  assert.equal(f.document.querySelector('.session.active').dataset.sessionId, 's1');
  assert.match(f.document.querySelector('.session.active').textContent, /Самый свежий план/);
});

test('outdated Workflow Kit notice names both versions and opens the regular upgrade preview', async t => {
  const f = await fixture(t);
  f.window.webPilot.retry = async () => { f.calls.push(['retry']); return {}; };
  f.window.webPilot.reload = async () => { f.calls.push(['reload']); return {}; };
  f.emit({ ...f.state, workspaceHealth: { phase: 'error', ready: false, action: 'upgrade', version: '1.4.12', kitVersion: '1.4.13', issues: [], workspace: '/demo' } });
  const message = f.document.getElementById('workspace-health-message').textContent;
  assert.match(message, /Workflow Kit 1\.4\.12/); assert.match(message, /1\.4\.13/);
  assert.equal(f.document.getElementById('workspace-health-retry').textContent, 'Обновить Workflow Kit');
  f.document.getElementById('workspace-health-retry').click(); await f.settle();
  assert.deepEqual(f.calls, [['retry']]);
  f.emit({ ...f.state, workspaceHealth: { phase: 'error', ready: false, issues: [{ reason: 'Нет файла' }], workspace: '/demo' } });
  assert.equal(f.document.getElementById('workspace-health-retry').textContent, 'Повторить проверку');
  f.document.getElementById('workspace-health-retry').click(); await f.settle();
  assert.deepEqual(f.calls, [['retry'], ['reload']]);
});

test('delivered chat shows local tools from the last confirmed runtime status without restarting services', async t => {
  const f = await fixture(t);
  f.emit({ ...f.state, context: { phase: 'delivered', servicesReady: false, messageSent: true } });
  assert.equal(f.document.getElementById('state-service'), null);
  f.emit({ ...f.state, context: { phase: 'delivered', servicesReady: false, messageSent: true },
    localRuntime: { label: 'Workflow Pilot Local Mac', service: { mcpReady: true, tunnelReady: true, tunnelConfigured: true } } });
  assert.ok(f.document.getElementById('connection-detail').closest('#settings-panel'));
  f.emit({ ...f.state, localRuntime: { label: 'Workflow Pilot Local Mac', service: { mcpReady: true, tunnelReady: false, tunnelConfigured: true } } });
  assert.equal(f.document.querySelector('footer'),null);
  // One built-in backend on both systems: its name is shown and there is no folder to choose.
  assert.equal(f.document.getElementById('connection-detail').textContent, 'Workflow Pilot Local Mac · встроенный MCP');
  f.emit({ ...f.state, platform: 'win32', localRuntime: { label: 'Workflow Pilot Local Windows', service: null } });
  assert.equal(f.document.getElementById('connection-detail').textContent, 'Workflow Pilot Local Windows · встроенный MCP');
  assert.equal(f.document.getElementById('choose-runtime'), null);
});

test('context has no permanent card; only pre-send recovery can retry and unknown only observes',async t=>{
  const f=await fixture(t),node=id=>f.document.getElementById(id);
  assert.equal(node('context-card'),null);
  for(const phase of ['delivered','stale','legacy-session','manual-session','waiting-chat']) {
    f.emit({...f.state,context:{phase,messageSent:true}});
    assert.equal(node('session-notice').hidden,true);
    assert.equal(node('retry-context').hidden,true);
  }
  f.emit({...f.state,selected:{workspace:'/demo',sessionId:'s4',attempt:{state:'prepared'}},context:{phase:'error',error:{message:'Ошибка вложения'}}});
  assert.equal(node('session-notice').hidden,false);assert.equal(node('retry-context').hidden,false);
  assert.match(node('session-notice-detail').textContent,/Ошибка вложения/);
  f.emit({...f.state,selected:{workspace:'/demo',sessionId:'s4',attempt:{state:'unknown'}},context:{phase:'send-unknown'}});
  assert.equal(node('retry-context').hidden,true);assert.equal(node('observe-context').hidden,false);
  assert.equal(node('new-context-session'),null,'fresh sessions come only from the project menu');
  assert.match(node('session-notice-detail').textContent,/Повторной отправки нет/);
});

test('published plan keeps its button and progress; current operation and timers are outside the sidebar',async t=>{
  const f=await fixture(t),base=f.state,$=id=>f.document.getElementById(id);
  assert.equal($('agent-time'),null,'session time without a caption is gone');
  assert.equal($('execution-stages'),null);assert.equal($('execution-next-action'),null);
  const card=$('plan-card'),list=$('plan-tasks');
  assert.deepEqual([...card.children].map(node=>node.id||node.className),['plan-top','plan-tasks','plan-foot']);
  assert.ok(card.querySelector('.plan-top #plan-phase'));
  for(const id of ['plan-run-toggle','plan-note'])assert.ok($('plan-foot').contains($(id)),id+' stays pinned');
  assert.ok(card.contains($('plan-attention')));assert.equal(card.contains($('plan-review-toggle')),false);
  const tasks=Array.from({length:12},(_,i)=>({id:'T0'+String(i+1).padStart(2,'0'),title:'Задача '+(i+1),status:i<3?'done':i===3?'current':'pending',
    label:i<3?'Интеграция проверена':i===3?'Kit проверяет коммит · unit-all · 2 из 3':'Не начата',mode:'Параллельно',elapsedMs:i===3?61000:null,target:null}));
  f.emit({...base,selected:{...base.selected,role:'orchestrator',scopeId:'scope',planView:{state:'working'}},planRun:{state:'running',complete:false},
    workProgress:{version:1,title:'Большой план',phase:'Выполнение',busy:true,done:3,total:12,tasks,
      now:[{actor:'O',text:'ждёт результатов',kind:'wait'},{actor:'T004',text:'Kit проверяет коммит',kind:'act'}],history:[],attention:null}});
  assert.equal($('plan-title').textContent,'Большой план');
  assert.equal($('plan-phase-text').textContent,'Выполнение');assert.equal($('plan-phase-spinner').hidden,true);
  assert.equal($('plan-status').textContent,'в main 3 из 12');assert.equal($('plan-bar-fill').style.width,'25%');
  assert.equal(list.children.length,12);
  const running=list.children[3];
  assert.equal(running.querySelector('.plan-task-state .wp-spin')!==null,true);
  assert.match(running.querySelector('.plan-task-stage').textContent,/^В работе · Параллельно$/);
  assert.equal(running.querySelector('.plan-task-time'),null);
  assert.equal($('current-now'),null,'the sidebar has no second current action feed');
  assert.equal(list.children[0].querySelector('.plan-task-mode'),null,'a done task does not repeat its mode');
  assert.equal($('plan-attention').hidden,true,'no problem, no alarm');
  // The orchestrator row is busy only while it acts.
  const orchestratorRow=()=>f.document.querySelector('.session[data-session-id="s4"]');
  orchestratorRow().dataset.role='orchestrator';
  f.emit({...f.state,workProgress:{...f.state.workProgress,now:[{actor:'O',text:'проверяет результат',kind:'act'}]}});
  assert.ok(orchestratorRow().querySelector('.wp-spin'));
  f.emit({...f.state,workProgress:{...f.state.workProgress,now:[{actor:'O',text:'ждёт',kind:'wait'}]}});
  assert.equal(orchestratorRow().querySelector('.wp-spin'),null);
});

test('problem block names the cause and one action; the acceptance hint and Review stay in the pinned foot',async t=>{
  const f=await fixture(t),base=f.state,$=id=>f.document.getElementById(id);
  const work={version:1,title:'План',phase:'Нужно внимание',busy:false,done:2,total:4,
    tasks:[{id:'T003',title:'Совместный пример',status:'attention',label:'Активность сейчас не наблюдается',mode:'Последовательно',elapsedMs:720000,
      target:{workspace:'/demo-T003',sessionId:'e3'}}],now:[],history:[],
    attention:{title:'T003 молчит',text:'Активность сейчас не наблюдается',action:{kind:'open-session',workspace:'/demo-T003',sessionId:'e3',label:'Открыть чат T003'}}};
  f.emit({...base,selected:{...base.selected,scopeId:'scope'},planRun:{state:'running',complete:false},planReview:{enabled:true,supported:true,message:''},workProgress:work});
  assert.equal($('plan-attention').hidden,false);
  assert.equal($('plan-attention-title').textContent,'T003 молчит');
  assert.equal($('plan-attention-action').textContent,'Открыть чат T003');
  assert.equal(f.document.querySelector('.plan-task[data-status=attention] .plan-task-state').textContent,'!');
  $('plan-attention-action').click();await f.settle();
  assert.deepEqual(f.calls.at(-1),['selectSession','/demo-T003','e3']);
  assert.equal($('plan-review-toggle').getAttribute('aria-pressed'),'true');
  const hint=$('plan-review-toggle').title;assert.match(hint,/Ревью нового плана/);
  assert.equal($('plan-review-toggle').disabled,false);
  const lock='Review применяется к новому плану; текущий план уже опубликован. Переключение доступно после закрытия плана.';
  f.emit({...f.state,planReview:{enabled:true,supported:true,message:'',lock}});
  assert.equal($('plan-review-toggle').disabled,true,'a published plan freezes Review');
  assert.equal($('plan-review-toggle').title,lock);
  f.emit({...f.state,planReview:{enabled:false,supported:true,message:'',lock:null}});
  assert.equal($('plan-review-toggle').disabled,false);assert.equal($('plan-review-toggle').title,hint,'the default hint returns');
  f.emit({...f.state,workProgress:{...work,phase:'Ждёт приёмки',attention:null,tasks:[]},planRun:{state:'complete',complete:true}});
  assert.equal($('plan-attention').hidden,true);
  assert.equal($('plan-note').hidden,false);assert.match($('plan-note').textContent,/Принимаю результат, закрой план/);
});
test('startup deletion recovery error remains visible until settings are closed',async t=>{
  const f=await fixture(t),banner=f.document.getElementById('error-banner');
  f.emit({...f.state,settings:{workspace:'/recovery'},startupError:{code:'DELETE_RECOVERY',message:'Не удалось завершить удаление'}});
  assert.equal(banner.hidden,false);assert.equal(banner.textContent,'Не удалось завершить удаление (DELETE_RECOVERY)');
  f.emit({...f.state,settings:null,startupError:null});
  assert.equal(banner.hidden,true);assert.equal(banner.textContent,'');
});

test('project menu copies the line for an external client next to the full path', async t => {
  const f = await fixture(t);
  f.window.webPilot.copyWorkspacePath = async workspace => { f.calls.push(['copyWorkspacePath', workspace]); return { state: f.state }; };
  f.window.webPilot.copyExternalClientLine = async workspace => { f.calls.push(['copyExternalClientLine', workspace]); return { state: f.state }; };
  const items = [...f.document.querySelectorAll('.project-menu button')];
  const labels = items.map(button => button.textContent);
  const path = labels.indexOf('Скопировать полный путь');
  assert.ok(path >= 0);
  assert.equal(labels[path + 1], 'Скопировать строку для внешнего клиента', 'right after the path');
  assert.ok(items[path + 1].classList.contains('copy-external-client-line'));
  items[path + 1].click(); await f.settle();
  assert.deepEqual(f.calls, [['copyExternalClientLine', '/demo']], 'one clipboard action with the project folder, nothing else');
});

test('orchestrated plan: the tree shows roles, the to-do plan opens executor sessions, one button runs the plan',async t=>{
  const f=await fixture(t),base=f.state;
  f.window.webPilot.togglePlanExecution=async()=>{f.calls.push(['togglePlanExecution']);return {state:f.state};};
  f.window.webPilot.assignOrchestrator=async sessionId=>{f.calls.push(['assignOrchestrator',sessionId]);return {state:f.state};};
  const project={...base.projects[0],orchestrationIssue:null,sessions:[
    {sessionId:'s4',createdAt:4000,title:'План',role:'orchestrator',orchestratorScopeId:'scope',orchestratorState:{state:'running',label:'Выполняется · 1/4',progress:'1/4'}},
    {sessionId:'s3',createdAt:3000,title:'Вопрос',role:'discussion'}],
    executors:[{workspace:'/tree/a',sessionId:'worker-a',originSessionId:'s4',parentScopeId:'scope',taskId:'T001',title:'T001',label:'Готово',phase:'done'}]};
  const orchestratorPlan={scopeId:'scope',objective:'План оркестратора',current:true,tasks:[
    {id:'T001',title:'Основа',status:'done',executionLabel:'Последовательно',target:{workspace:'/tree/a',sessionId:'worker-a'}},
    {id:'T002',title:'Экран',status:'current',executionLabel:'Параллельно',target:{workspace:'/tree/b',sessionId:'worker-b'}},
    {id:'T003',title:'Журнал',status:'pending',executionLabel:'Параллельно',target:null},
    {id:'T004',title:'Выпуск',status:'pending',executionLabel:'Оркестратор в main',target:null}]};
  const emit=(run,extra={})=>f.emit({...base,projects:[{...project,...extra}],selected:{...base.selected,scopeId:'scope',role:'orchestrator'},
    orchestratorPlan,planRun:run,planContinuation:{enabled:false}});
  emit({state:'not-started',reason:null,issue:null,complete:false});
  const roles=[...f.document.querySelectorAll('.session-role')].map(node=>node.textContent);
  // One compact line: the plan stage is not repeated in the tree.
  assert.deepEqual(roles,['Оркестратор','Агент']);
  const card=f.document.querySelector('.session[data-session-id="s4"]');
  assert.match(card.querySelector('.session-meta').textContent,/^\d{2}\.\d{2}, \d{2}:\d{2}( · новая)?Оркестратор$/);
  assert.equal(card.querySelectorAll('small').length,1,'date and role share one line');
  assert.equal(f.document.querySelectorAll('.executor-group').length,0,'executors of an orchestrated plan are not grouped in the tree');
  assert.equal(f.document.getElementById('plan-title').textContent,'План оркестратора');
  const rows=[...f.document.querySelectorAll('.plan-task')];
  assert.equal(rows.length,4);assert.equal(f.document.querySelectorAll('.plan-task-open').length,1,'only a started task opens a session');
  rows[0].click();await f.settle();
  assert.ok(!f.calls.some(call=>call[0]==='selectSession'),'a done task keeps the orchestrator in the right pane');
  assert.deepEqual(rows.map(row=>row.querySelector('.plan-task-state .wp-spin')?'spinner':row.querySelector('.plan-task-state').textContent),['✓','spinner','○','○']);
  rows[1].querySelector('.plan-task-open').click();await f.settle();
  assert.deepEqual(f.calls.at(-1),['selectSession','/tree/b','worker-b']);
  const button=f.document.getElementById('plan-run-toggle');
  assert.equal(button.hidden,false);assert.equal(button.textContent,'Начать выполнение плана');
  assert.equal(f.document.getElementById('plan-continuation-toggle'),null,'there is no PlanContinuation button');
  button.click();await f.settle();assert.deepEqual(f.calls.at(-1),['togglePlanExecution']);
  for(const [state,label,disabled] of [['running','Пауза',false],['pausing','Пауза…',true],['paused','Продолжить',false]]) {
    emit({state,reason:null,issue:null,complete:false});
    assert.equal(button.textContent,label);assert.equal(button.disabled,disabled);
  }
  emit({state:'paused',reason:'escalation',message:'Сборка не проходит',issue:null,complete:false});
  assert.match(f.document.getElementById('plan-run-message').textContent,/Сборка не проходит/);
  emit({state:'complete',reason:null,issue:null,complete:true});assert.equal(button.hidden,true);
  emit(null);assert.equal(button.hidden,true,'no button without a published orchestrated plan');
  // A plan without a usable orchestrator offers the explicit choice in the session menu.
  emit({state:'not-started',reason:null,issue:'ORIGIN_MISMATCH',complete:false},{orchestrationIssue:'ORIGIN_MISMATCH'});
  assert.equal(button.disabled,true);
  f.document.querySelector('.assign-orchestrator').click();await f.settle();
  assert.deepEqual(f.calls.at(-1),['assignOrchestrator','s3']);
  // An executor session shows its orchestrator's plan with the current task highlighted.
  f.emit({...base,projects:[project],selected:{workspace:'/tree/b',parentWorkspace:'/demo',sessionId:'worker-b',assignmentId:'b',parentScopeId:'scope'},
    orchestratorPlan,planRun:{state:'running',reason:null,issue:null,complete:false}});
  assert.equal(f.document.querySelector('.plan-task[data-current=true] .plan-task-id').textContent,'T002');
  assert.equal(f.document.getElementById('plan-card').hidden,false,'the to-do plan stays in the sidebar');
  assert.equal(f.document.getElementById('assignment-card').hidden,true,'no separate executor card');
  assert.equal(f.document.getElementById('execution-actions'),null,'stages live in the stage line and the panel');
  assert.equal(f.document.getElementById('plan-continuation-message').hidden,true,'no PlanContinuation text in the new scheme');
  assert.equal(f.document.querySelector('.project').dataset.workspace,'/demo','the tree keeps the parent project');
  // The backend checks first; only a confirmed unfinished run asks to stop.
  f.window.webPilot.archiveProject=async(workspace,options)=>{f.calls.push(['archiveProject',workspace,options]);
    return options?.stopExecution?{ok:true,state:f.state}:{ok:false,error:{code:'PLAN_ACTIVE'},state:f.state};};
  const archive=()=>{f.document.querySelector('.archive-project').click();};
  const before=f.calls.length;f.window.confirm=()=>false;archive();await f.settle();
  assert.equal(f.calls.length,before+1,'one backend check, no stop after refusal');
  let question='';f.window.confirm=text=>{question=text;return true;};archive();await f.settle();
  assert.match(question,/Выполнение плана будет остановлено/);
  assert.equal(JSON.stringify(f.calls.at(-1)),JSON.stringify(['archiveProject','/demo',{stopExecution:true}]));
  // A stale running card cannot force a false warning after completion.
  question='';f.window.webPilot.archiveProject=async(workspace,options)=>{
    f.calls.push(['archiveProject',workspace,options]);return {ok:true,state:f.state};};
  archive();await f.settle();assert.equal(question,'');
  assert.equal(f.calls.at(-1)[2],undefined,'complete is archived without stop');
  emit({state:'complete',complete:true},{sessions:project.sessions.map(s=>s.role==='orchestrator'
    ?{...s,orchestratorState:{state:'complete',label:'Выполнено'}}:s)});
  f.window.webPilot.archiveProject=async(workspace,options)=>{f.calls.push(['archiveProject',workspace,options]);
    return options?.stopExecution?{ok:true,state:f.state}:{ok:false,error:{code:'PLAN_ACTIVE'},state:f.state};};
  question='';archive();await f.settle();
  assert.match(question,/незавершённое выполнение/,'fresh backend state overrides a stale complete card');
  // Back to the orchestrator: its row in the tree loads its dialog.
  f.document.querySelector('.session[data-session-id="s4"]').click();await f.settle();
  assert.deepEqual(f.calls.at(-1),['selectSession','/demo','s4']);
  // And to the started task of the same plan; the done one stays a plain row.
  f.document.querySelector('.plan-task-open').click();await f.settle();
  assert.deepEqual(f.calls.at(-1),['selectSession','/tree/b','worker-b']);
});

test('one palette: the sidebar style, both themes, the window background and the HTTP client use the agreed tokens',async t=>{
  const f=await fixture(t),style=f.document.getElementById('wp-palette');
  assert.ok(style,'the sidebar inserts the shared palette as an inline style');
  assert.equal(style.parentNode,f.document.head);
  assert.equal(f.document.head.lastElementChild,style,'it follows and overrides the former tokens');
  for(const [theme,tokens] of Object.entries(PALETTE)){
    const rule=theme==='light'?style.textContent.split(':root[data-theme=dark]')[0]:style.textContent.split(':root[data-theme=dark]')[1];
    for(const [name,value] of [['accent',tokens.accent],['line',tokens.line],['warn',tokens.warn]])assert.match(rule,new RegExp('--wp-'+name+':'+value));
    assert.match(rule,new RegExp('--teal:'+tokens.accent+';--muted:'+tokens.muted+';--line:'+tokens.line));
  }
  assert.match(style.textContent,/prefers-reduced-motion:reduce/);
  assert.deepEqual(shellBackground,{light:'#f4f6f8',dark:'#1b1d22'});
  const web=await fs.readFile(new URL('../src/frontend/web/index.html',import.meta.url),'utf8');
  for(const tokens of Object.values(PALETTE))for(const value of [tokens.page,tokens.line,tokens.accent,tokens.fg,tokens.muted])assert.ok(web.includes(value),'HTTP client token '+value);
  for(const file of ['../src/frontend/desktop/application.mjs','../src/frontend/desktop/client.mjs']){
    const text=await fs.readFile(new URL(file,import.meta.url),'utf8');
    assert.match(text,/import \{ shellBackground \} from '\.\.\/\.\.\/contracts\/palette\.mjs';/);
    assert.doesNotMatch(text,/#1b1d22|#f4f6f8/,'no second copy of the window background');
  }
  assert.match(paletteCss({mode:'media'}),/@media \(prefers-color-scheme:dark\)/);
});

test('the sidebar keeps neutral roles without a duplicate choice or current actions entry', async t => {
  const f = await fixture(t), base = f.state, picks = [];
  f.window.webPilot.chooseOption = async input => { picks.push(JSON.parse(JSON.stringify(input))); return null; };
  const { question, options } = choiceOptions('mode', { recommended: 'sequential', reason: 'Небольшие связанные задачи' });
  const userChoice = { choice_id: 'c1', generation: 2, kind: 'mode', state: 'offered', question, reason: 'Небольшие связанные задачи',
    options: options.map((o, i) => ({ id: o.id, label: o.label, detail: o.detail, recommended: i === 0 })), chosen: null };
  f.emit({ ...base, projects: [{ ...base.projects[0], sessions: [
    { sessionId: 's4', createdAt: 4000, title: 'Владелец', role: 'planning', choicePending: true },
    { sessionId: 's3', createdAt: 3000, title: 'Исполняет', role: 'self' },
    { sessionId: 's2', createdAt: 2000, title: 'Второй', role: 'discussion' }] }], userChoice });
  assert.deepEqual([...f.document.querySelectorAll('.session-role')].map(n => n.textContent), ['Агент', 'Агент', 'Агент']);
  const badges = [...f.document.querySelectorAll('.session-choice-wait')];
  assert.equal(badges.length, 0);assert.equal(f.document.getElementById('plan-card').hidden,true);
  for(const id of ['plan-choice','current-actions-dialog','open-current-actions','close-current-actions'])assert.equal(f.document.getElementById(id),null);
  assert.deepEqual(picks,[]);
  assert.equal(f.document.getElementById('review-preference').hidden,false);
});

test('all session rows are Chat and the project offers one new Chat action',async t=>{
  const f=await fixture(t);
  assert.ok(f.document.querySelector('.new-project-chat'));
  assert.ok([...f.document.querySelectorAll('.session-experience')].every(n=>n.textContent==='Chat'));
});
test('URL startup exposes registration, lost address, partial reading and cancellation after prior completion',async t=>{
  const f=await fixture(t),$=id=>f.document.getElementById(id);
  const launch={registration:'pending',address:'pending',cancel:'none'};
  const emit=(startup,l=launch)=>f.emit({...f.state,context:{phase:'startup-channel',launch:l,startup:{...startup,launch:l}}});
  emit({read:false});assert.match($('session-notice-title').textContent,/регистрацию/);assert.equal($('cancel-context').hidden,false);
  emit({read:true,parts_read:1,total_parts:3},{...launch,registration:'confirmed',address:'lost'});
  assert.match($('session-notice-detail').textContent,/1 из 3/);assert.match($('session-notice-detail').textContent,/Адрес чата утрачен/);
  emit({complete:true},{...launch,registration:'confirmed',cancel:'registered-stopped'});
  assert.match($('session-notice-title').textContent,/Запуск остановлен/);assert.match($('session-notice-detail').textContent,/до остановки/);
  assert.equal($('cancel-context').hidden,true);
});
