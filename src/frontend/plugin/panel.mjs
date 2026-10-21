import {assignmentStage} from '../../contracts/dialogue-view.mjs';
import {startupView} from '../../contracts/startup-view.mjs';
const delivery={pending:'Сохранено · в очереди',claimed:'Попытка начата',accepted:'Принято хостом',rejected:'Отклонено',unknown:'Исход неизвестен',superseded:'Устарело'};
const sender=message=>message.sender_role==='O'?'Оркестратор':message.sender_role==='E'?'Исполнитель':'Приложение';
const label=message=>[sender(message)+' → '+(message.sender_role==='E'?'Оркестратор':message.task_id?'Исполнитель':'Оркестратор'),
  message.task_id,message.attempt?'попытка '+message.attempt:null].filter(Boolean).join(' · ');
const handled=message=>message.dialogue_version===1?' · '+(message.yielded?'обработано':'обработка не подтверждена')+
  ' · '+(message.reply_observed?'ход завершён':'завершение хода не подтверждено'):'';
// Rendering only; participant authorization and durable state belong to Control.
export function mountPanel({document}) {
  const nodes=new Map([...document.querySelectorAll('[id]')].map(node=>[node.id,node]));
  const $=id=>nodes.get('communication-'+id);let events=[],last=0,trimmed=false,workflow=false;
  const text=(id,value)=>{$(id).textContent=value;};
  function renderEvents(){
    const message=$('filter-message').value.trim(),participant=$('filter-participant').value.trim(),errors=$('filter-errors').checked;
    $('events').replaceChildren();
    for(const event of events.filter(e=>(!message||e.message_id?.includes(message))&&(!participant||e.participant_id?.includes(participant))&&
      (!errors||e.severity!=='info'||e.error_code||/unknown|failed|error|rejected|gap/.test(e.event_type)))) {
      const li=document.createElement('li'),head=document.createElement('strong'),detail=document.createElement('span');
      head.textContent=event.seq+' · '+event.event_type;
      detail.textContent=[event.server_time,event.participant_id,event.message_id,event.error_code].filter(Boolean).join(' · ');
      li.append(head,detail);$('events').append(li);
    }
    text('event-count',`${events.length} событий в ленте${trimmed?' · показаны последние 200':''}. Полный журнал — в экспорте.`);
  }
  for(const id of ['filter-message','filter-participant','filter-errors'])$(id).addEventListener('input',renderEvents);
  return {$,status:(value,state='idle')=>{text('status',value);$('status').dataset.state=state;},
    mode(value){workflow=value==='workflow';
      for(const id of ['legacy-fields','bind','enable'])$(id).hidden=workflow;
      if(workflow){$('run-selection').hidden=true;
        document.getElementById('binding-title').textContent='Участник плана';
        document.getElementById('permission-title').textContent='Связь во время выполнения';
        text('stop','Остановить отправку плана');
        text('stop-help','Остановка запрещает новые отправки всего плана. Для возобновления используйте «Продолжить» в плане. Уже переданный хосту запрос отменить нельзя.');
        text('address-help','Адресат определяется назначением. Backend наблюдает занятость и черновик разговора. Выбор чата в боковой панели не меняет адресата; проверка и SDK Send не атомарны.');
        text('binding-help','Назначение определено по текущему разговору. Привязка выполняется автоматически.');
        text('permission-help','Связь управляется кнопкой выполнения плана. Отдельное включение для каждого исполнителя не требуется.');
      }
    },
    unbound(){text('identity','Участник не подтверждён');text('binding','Проверяем принадлежность текущему разговору.');
      $('roster-section').hidden=true;$('roster').replaceChildren();text('outbox','');
      $('run').value='';$('participant').value='';text('permission','Разрешение не выдано');text('queue','Очередь пока недоступна');
      text('last','Сообщений пока нет.');$('messages').replaceChildren();$('export-result').hidden=true;events=[];last=0;renderEvents();},
    candidates(values){$('run-selection').hidden=values.length<2;$('runs').replaceChildren();
      const empty=document.createElement('option');empty.value='';empty.textContent='Выберите запуск';$('runs').append(empty);
      for(const value of values){const option=document.createElement('option');option.value=value.run_id;option.textContent=value.run_id+' · '+value.role;$('runs').append(option);}},
    diagnostics:value=>text('diagnostics',value),localEvents:(pending,dropped)=>text('local-events',
      `Событий без подтверждения: ${pending}. Потеряно локальным буфером: ${dropped}. Последние события закрытой панели могут быть ненаблюдаемы.`),
    feed(values,base){
      if(base!==undefined){events=[];last=base;trimmed=base>0;}
      for(const event of values??[]){if(event.seq<=last)continue;
        if(!workflow&&event.seq!==last+1)text('gap',`Пробел журнала: ожидалось ${last+1}, получено ${event.seq}. Сохраните экспорт.`);
        last=event.seq;events.push(event);
      }
      if(events.length>200){events=events.slice(-200);trimmed=true;}renderEvents();
    },
    snapshot(value){
      if(value.assignments){$('roster-section').hidden=false;$('roster').replaceChildren();
        for(const assignment of value.assignments){const li=document.createElement('li'),detail=document.createElement('span');
          li.textContent=assignment.task_id+' · попытка '+(assignment.attempt??1)+' · '+(assignment.error?.message??assignmentStage(assignment).label);
          detail.textContent=assignment.terminal?'Работа интегрирована; worktree очищен.':['Назначение '+assignment.assignment_id,'SDK: '+(assignment.channel?.sdk?'подключён':'не подтверждён'),
            'поколение '+(assignment.channel?.generation??'—'),assignment.physical?.busy?'ход выполняется':assignment.physical?.stopped?'физическая остановка подтверждена':'состояние хода неизвестно',
            assignment.dialogue?.result?.source_commit?'коммит '+assignment.dialogue.result.source_commit:null].filter(Boolean).join(' · ');
          li.append(detail);$('roster').append(li);}
        text('outbox',(value.pending_intents??[]).map(i=>`${i.assignment_id}: ${i.phase}${i.error?' · '+i.error.message:''}`).join('\n'));}
      text('identity',value.mode==='workflow'?(value.role==='O'?'Оркестратор плана':`Исполнитель · ${value.task_id}\nНазначение ${value.assignment_id}`):`Роль ${value.role} · участник ${value.participant_id}`);
      text('binding',`Привязка подтверждена · ${value.conversation_key}`);
      text('permission',value.mode==='workflow'?(value.permission?.phase==='complete'
        ?`Выполнение завершено · ${(value.assignments??[]).filter(a=>a.phase==='INTEGRATED').length}/${(value.assignments??[]).length} · связь отключена. Ожидается ваша приёмка: сообщите оркестратору «Принимаю результат, закрой план».`
        :`План: ${value.permission?.phase??'ожидает запуска'} · ${value.stopped?'отправка приостановлена':'связь разрешена на время выполнения'}. Интеграции назначений: ${(value.assignments??[]).filter(a=>a.phase==='INTEGRATED').length}/${(value.assignments??[]).length}. Завершение всего плана ещё не подтверждено.`):
        `Поколение ${value.permission_generation} · ${value.expires_at?'до '+new Date(value.expires_at).toLocaleTimeString('ru'):'разрешение не выдано'}`);
      if(value.startup&&!value.permission?.active){
        const view=startupView(value.startup);text('permission',view.title+'. '+view.detail);
        $('stop').hidden=!value.permission?.scope_id;
      }else $('stop').hidden=false;
      const incoming=value.messages.filter(m=>m.recipient_id===value.participant_id&&!m.superseded);
      text('queue',`${incoming.filter(m=>!m.read).length} непрочитанных · ${incoming.filter(m=>m.delivery==='pending'&&!m.read).length} ожидают уведомления`);
      const lastMessage=value.messages.at(-1);
      text('last',lastMessage?`${workflow?label(lastMessage)+'\n':''}${lastMessage.kind} · ${lastMessage.superseded?'Устарело':delivery[lastMessage.delivery]} · ${lastMessage.read?'прочитано':'чтение не подтверждено'}${handled(lastMessage)}\n${lastMessage.preview??lastMessage.body}`:'Сообщений пока нет.');
      $('messages').replaceChildren();
      for(const message of value.messages.slice(-30)){
        const li=document.createElement('li');li.textContent=`${workflow?label(message)+' · ':''}${message.kind} · ${message.superseded?'Устарело':delivery[message.delivery]} · ${message.read?'прочитано':'не прочитано'}${handled(message)} · ${message.message_id}`;
        if(message.preview){const body=document.createElement('p');body.textContent=message.preview;li.append(body);}
        if(message.in_reply_to){const correlation=document.createElement('span');correlation.textContent='В ответ на '+message.in_reply_to;li.append(correlation);}
        $('messages').append(li);
      }
    },
    exportResult(value,summary){$('export-text').value=value;text('export-summary',JSON.stringify(summary,null,2));$('export-result').hidden=false;},
  };
}
