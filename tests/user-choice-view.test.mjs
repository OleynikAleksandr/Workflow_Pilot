import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountPanel} from '../src/frontend/plugin/panel.mjs';
import {choiceCardCss,renderChoiceCard,choiceOptions} from '../src/contracts/user-choice.mjs';
import {PALETTE} from '../src/contracts/palette.mjs';

const card=(state='offered',extra={})=>{const {question,options}=choiceOptions('refused',{message:'STACK_NOT_CONFIGURED',task_id:'T001'});
  return {choice_id:'c1',generation:1,kind:'refused',state,question,reason:null,
    options:options.map((o,i)=>({id:o.id,label:o.label,detail:o.detail,recommended:i===0})),chosen:null,...extra};};

test('panel blocks: now, the user choice, history, then the collapsed diagnostics',async()=>{
  const html=await fs.readFile(new URL('../src/frontend/plugin/index.html',import.meta.url),'utf8');
  const {window}=new JSDOM(html);const order=[...window.document.querySelector('main.wp').children].map(n=>n.id).filter(Boolean);
  assert.deepEqual(order.slice(order.indexOf('progress-now')),['progress-now','progress-choice','progress-history','progress-diagnostics']);
  assert.equal(window.document.getElementById('progress-diagnostics').open,false);
  const ui=mountPanel({document:window.document}),picked=[];
  ui.onChoice({pick:id=>picked.push(id),reopen:()=>picked.push('reopen')});
  ui.snapshot({messages:[],user_choice:card()});
  const node=window.document.getElementById('progress-choice');
  assert.equal(node.hidden,false);assert.match(node.className,/pulse/,'a new card pulses');
  const rows=[...node.querySelectorAll('.wp-choice-option')];
  assert.equal(rows.length,3);assert.match(rows[0].className,/recommended/);
  assert.match(rows[0].textContent,/\(рекомендую\)/);assert.doesNotMatch(rows[1].textContent,/рекомендую/);
  assert.match(node.textContent,/или напишите ответ в чат своими словами/);
  rows[1].querySelector('button').click();assert.deepEqual(picked,['continue']);
  ui.choice(card());assert.doesNotMatch(node.className,/pulse/,'a redraw of the same card stays still');
  ui.choice(card('chosen',{chosen:{id:'fix',label:'Поручить оркестратору устранить причину',delivered:false}}));
  assert.match(node.textContent,/Выбрано: «Поручить оркестратору устранить причину» · передаётся агенту/);
  ui.choice(card('chosen',{chosen:{id:'fix',label:'X',delivered:true}}));assert.match(node.textContent,/передано агенту/);
  ui.choice(card('postponed'));node.querySelector('button').click();assert.equal(picked.at(-1),'reopen');
  ui.choice(null);assert.equal(node.hidden,true,'a declined or stale card disappears');
});

test('the card has its own orange, a short pulse and no motion when reduced',()=>{
  assert.notEqual(PALETTE.light.choice,PALETTE.light.warn);assert.notEqual(PALETTE.dark.choice,PALETTE.dark.warn);
  assert.match(choiceCardCss,/animation:wp-choice-pulse 1s ease-in-out 3/);
  assert.match(choiceCardCss,/prefers-reduced-motion:reduce\)\{\.wp-choice\.pulse\{animation:none\}/);
  const {window}=new JSDOM('<div id="c"></div>');const container=window.document.getElementById('c');
  renderChoiceCard(window.document,container,card(),{busy:true});
  assert.ok([...container.querySelectorAll('button')].every(b=>b.disabled),'a press in flight disables the card');
});
