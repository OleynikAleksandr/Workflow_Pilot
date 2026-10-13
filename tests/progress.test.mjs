import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { operationLabel, createProgress } from '../src/ui/progress.mjs';
test('operations show stages; idle, errors and user input waits never spin',()=>{
  for(const phase of ['preparing','loading-context','preparing-message','sending']) {
    assert.ok(operationLabel({context:{phase}}));
  }
  for(const phase of ['delivered','waiting-login','waiting-draft','prepared-stale','error','chat-changed','waiting-chat','send-unknown']) {
    assert.equal(operationLabel({context:{phase}}),null);
  }
  // 0.6.96: one delivery mode — the full context in the start message; a stale contextMode changes nothing.
  assert.equal(operationLabel({context:{phase:'sending'}}),'Отправляем контекст');
  assert.equal(operationLabel({context:{phase:'preparing-message'}}),'Вставляем контекст в сообщение');
  assert.equal(operationLabel({context:{phase:'sending',contextMode:'mcp'}}),'Отправляем контекст');
  assert.equal(operationLabel({pageLoading:true}),'Открываем ChatGPT');
  assert.equal(operationLabel({setup:{phase:'applying'}}),'Подготавливаем проект');
  assert.equal(operationLabel({context:{phase:'delivered'},contextPreparation:{busy:true}}),'Подготавливаем контекст заранее');
  assert.equal(operationLabel({context:{phase:'error'},contextPreparation:{busy:true}}),null);
  assert.equal(operationLabel({},'deleteSessions'),'Удаляем локальные сессии');
  assert.equal(operationLabel({},'restore'),'Восстанавливаем проекты');
  assert.equal(operationLabel({},'chooseParent'),null);
});
test('progress persists timer across re-renders and clears it on completion or disposal',()=>{
  const dom=new JSDOM('<div id="progress" role="status" aria-live="polite"></div>');
  const element=dom.window.document.getElementById('progress');
  let clock=0, tick, schedules=0,cancelled=0;
  const p=createProgress(element,{now:()=>clock,schedule:fn=>{tick=fn;schedules++;return 1;},cancel:()=>cancelled++});
  assert.equal(element.hidden,true);
  p.show('Подготавливаем контекст');assert.equal(element.hidden,false);assert.equal(schedules,1);
  clock=2400;tick();assert.equal(element.querySelector('.operation-elapsed').textContent,'2 с');
  p.show('Подготавливаем контекст');assert.equal(schedules,1);
  p.show('Отправляем контекст');assert.equal(cancelled,1);assert.equal(schedules,2);
  assert.equal(element.querySelector('.operation-elapsed').textContent,'0 с');
  p.show(null);assert.equal(element.hidden,true);assert.equal(cancelled,2);
  p.show('Проверяем папку');p.destroy();assert.equal(cancelled,3);assert.equal(element.hidden,true);
  dom.window.close();
});

test('Send completion and old unknown attempts hide the progress bar and stop its clock',()=>{
  for(const phase of ['waiting-chat','send-unknown']){
    const dom=new JSDOM('<div id="progress"></div>');
    const element=dom.window.document.getElementById('progress');
    let cancelled=0;
    const progress=createProgress(element,{schedule:()=>1,cancel:()=>cancelled++});
    progress.show(operationLabel({context:{phase:'sending'}}));
    assert.equal(element.hidden,false);
    progress.show(operationLabel({context:{phase},contextPreparation:{busy:true}}));
    assert.equal(element.hidden,true);assert.equal(cancelled,1);
    assert.equal(element.querySelector('.operation-label').textContent,'');
    assert.equal(element.querySelector('.operation-elapsed').textContent,'');
    progress.destroy();dom.window.close();
  }
});
