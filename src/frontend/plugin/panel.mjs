const delivery={pending:'В очереди',claimed:'Попытка начата',accepted:'Принято хостом',rejected:'Отклонено',unknown:'Исход неизвестен'};
// Rendering only; participant authorization and durable state belong to Control.
export function mountPanel({document}) {
  const nodes=new Map([...document.querySelectorAll('[id]')].map(node=>[node.id,node]));
  const $=id=>nodes.get('communication-'+id);let events=[],last=0,trimmed=false;
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
    unbound(){text('identity','Участник не подтверждён');text('binding','Проверяем принадлежность текущему разговору.');
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
        if(event.seq!==last+1)text('gap',`Пробел журнала: ожидалось ${last+1}, получено ${event.seq}. Сохраните экспорт.`);
        last=event.seq;events.push(event);
      }
      if(events.length>200){events=events.slice(-200);trimmed=true;}renderEvents();
    },
    snapshot(value){
      text('identity',`Роль ${value.role} · участник ${value.participant_id}`);
      text('binding',`Привязка подтверждена · ${value.conversation_key}`);
      text('permission',`Поколение ${value.permission_generation} · ${value.expires_at?'до '+new Date(value.expires_at).toLocaleTimeString('ru'):'разрешение не выдано'}`);
      const incoming=value.messages.filter(m=>m.recipient_id===value.participant_id);
      text('queue',`${incoming.filter(m=>!m.read).length} непрочитанных · ${incoming.filter(m=>m.delivery==='pending'&&!m.read).length} ожидают уведомления`);
      const lastMessage=value.messages.at(-1);
      text('last',lastMessage?`${lastMessage.kind} · ${delivery[lastMessage.delivery]} · ${lastMessage.read?'прочитано':'чтение не подтверждено'}\n${lastMessage.body}`:'Сообщений пока нет.');
      $('messages').replaceChildren();
      for(const message of value.messages.slice(-30)){
        const li=document.createElement('li');li.textContent=`${message.kind} · ${delivery[message.delivery]} · ${message.read?'прочитано':'не прочитано'} · ${message.message_id}`;
        $('messages').append(li);
      }
    },
    exportResult(value,summary){$('export-text').value=value;text('export-summary',JSON.stringify(summary,null,2));$('export-result').hidden=false;},
  };
}
