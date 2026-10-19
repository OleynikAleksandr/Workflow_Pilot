import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountPanel} from '../src/frontend/plugin/panel.mjs';
import {executorStatus} from '../src/control/workflow/execution-projection.mjs';

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
  ui.unbound();assert.equal(ui.$('roster').textContent,'');assert.equal(ui.$('roster-section').hidden,true);
});
