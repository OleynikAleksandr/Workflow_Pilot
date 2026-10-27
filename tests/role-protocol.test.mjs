import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {roleText,roleUpdate,INCOMING_WORK_RULE,USER_EVENT_RULE,ROLE_PROTOCOL_VERSION} from '@webpilot/workflow-kit/lib/role-protocol';
import {install} from '@webpilot/workflow-kit/lib/installer';
import {recover} from '@webpilot/workflow-kit/lib/recovery';
import {reviewPreferenceMessage} from '../src/control/workflow/plan-review.mjs';
import {STARTUP_INSTRUCTIONS} from '../src/control/plugin/startup-context.mjs';

test('every delivered role preserves prior accepted requests and the permission/task boundary',()=>{
  for(const role of ['planning','self','discussion','orchestrator','executor'])for(const version of [0,1]){
    const text=roleText(role,version);
    assert.ok(text.includes(INCOMING_WORK_RULE),role+' receives the canonical obligation');
    assert.match(text,/новый вход не отменяет прежние/);
    assert.match(text,/следующую задачу начинает штатный Start\/Continue приложения/);
    assert.match(text,/Сохраняются Stop, scope и подтверждения хоста/);
    assert.ok(roleUpdate(role,version).includes(INCOMING_WORK_RULE));
  }
});

test('Review preference continues permitted work and does not create work when none is pending',()=>{
  for(const enabled of [true,false]){
    const text=reviewPreferenceMessage({enabled,revision:2});
    assert.ok(text.includes(INCOMING_WORK_RULE));
    assert.ok(text.includes(USER_EVENT_RULE));
    assert.match(text,/продолжи ранее принятое разрешённое поручение/);
    assert.match(text,/не создавай задачу ради переключателя/);
    assert.doesNotMatch(text,/учти решение и заверши ответ/);
    assert.match(text,/не разрешение реализации или Start/);
  }
  assert.ok(STARTUP_INSTRUCTIONS.includes(INCOMING_WORK_RULE));
  assert.match(STARTUP_INSTRUCTIONS,/Bootstrap не разрешает начинать задачу/);
});

test('installed self recovery agrees with canonical obligations and one task per turn',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pilot-intake-role-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
  git('init','-q');git('config','user.name','Role Fixture');git('config','user.email','fixture@example.invalid');
  fs.writeFileSync(path.join(root,'README.md'),'# Isolated role fixture\n');git('add','README.md');git('commit','-qm','fixture');
  install({project:root,mode:'existing'});
  const packet=recover(root,'manual',{role:'self'}),text=JSON.stringify(packet);
  assert.equal(packet.role,'self');
  assert.ok(text.includes(INCOMING_WORK_RULE));
  assert.ok(/одна микрозадача/i.test(text),'the actual recovery keeps one plan task per turn');
  assert.ok(/Граница одной задачи\/коммита\/отчёта\/конца хода сохраняется/.test(text),'the actual Workflow Core agrees with the role');
  assert.ok(/не требуя от пользователя «Продолжай» только из-за служебного события/.test(text),'a service event cannot discard the pending request');
  assert.equal(ROLE_PROTOCOL_VERSION,14);
});
