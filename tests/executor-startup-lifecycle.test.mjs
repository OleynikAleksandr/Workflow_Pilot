import test from 'node:test';
import assert from 'node:assert/strict';
import {executorStatus} from '../src/control/workflow/execution-projection.mjs';

test('executor startup separates bootstrap, SDK registration and first notification from working or paused',()=>{
  const assignment={id:'a',status:'RUNNING'};
  const record={ready:true,controller:{state:{phase:'preparing'}},pageState:{current:{state:{busy:true,login:'signed-in'}}}};
  const status=channel=>executorStatus(assignment,record,null,{channel});
  assert.match(status().label,/Подготовка службы/);
  record.controller.state.phase='waiting-chat';assert.match(status().label,/постоянный адрес/);
  record.controller.state.phase='send-unknown';assert.equal(status().phase,'unknown');
  record.controller.state.phase='delivered';
  const channel={registered:false,sdk:false,permitted:false,initial:null};
  assert.match(status(channel).label,/регистрацию/);
  channel.registered=true;assert.match(status(channel).label,/SDK/,'ready page does not prove a panel');
  channel.sdk=true;assert.match(status(channel).label,/приостановлена/);
  channel.permitted=true;assert.match(status(channel).label,/загрузочный ход/);
  record.pageState.current.state.busy=false;assert.match(status(channel).label,/рабочее уведомление/);
  channel.initial={delivery:'claimed',read:false};assert.match(status(channel).label,/Отправляется/);
  channel.initial.delivery='accepted';assert.match(status(channel).label,/прочтение/);
  channel.initial.delivery='unknown';assert.equal(status(channel).phase,'attention');
  channel.initial={delivery:'accepted',read:true};record.pageState.current.state.busy=true;
  assert.equal(status(channel).label,'Работает');
  assert.equal(status().label,'Работает','legacy path is unchanged');
  assignment.status='INTEGRATED';assert.equal(status(channel).phase,'done');
});
