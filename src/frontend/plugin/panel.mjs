import {assignmentStage,OBSERVER_DELIVERY_LABEL} from '../../contracts/dialogue-view.mjs';
import {startupView} from '../../contracts/startup-view.mjs';
import {paletteCss,spinnerCss} from '../../contracts/palette.mjs';
import {choiceCardCss,renderChoiceCard} from '../../contracts/user-choice.mjs';
import {mountCurrentActions,currentActionsCss} from '../desktop/ui/current-actions.mjs';
const progressClock=ms=>{const seconds=Math.max(0,Math.floor(ms/1000));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
const openedChat=self=>({O:'открыт чат оркестратора',S:'открыт чат агента',P:'открыт чат агента',SELF:'открыт чат агента'})[self]??(self?'открыт чат '+self:'');
const delivery={pending:'Подготовлено в Kit · ожидает SDK (не доставлено)',claimed:'SDK отправляет · подтверждения ещё нет',accepted:'Принято хостом (SDK accepted) · чтение не подтверждено',rejected:'Отклонено',unknown:'Исход неизвестен',superseded:'Устарело'};
const sender=message=>message.sender_role==='O'?'Оркестратор':message.sender_role==='E'?'Исполнитель':message.kind==='user-choice'?'Пользователь':'Приложение';
const label=message=>[sender(message)+' → '+(message.kind==='user-choice'?'агент · выбор':message.sender_role==='E'?'Оркестратор':message.task_id?'Исполнитель':'Оркестратор'),
  message.task_id,message.attempt?'попытка '+message.attempt:null].filter(Boolean).join(' · ');
const handled=message=>message.dialogue_version===1?' · '+(message.yielded?'обработано':'обработка не подтверждена')+
  ' · '+(message.reply_observed?'ход завершён':'завершение хода не подтверждено'):'';
const deliveryLabel=message=>message.kind==='startup-context'&&message.startup_complete?'Контекст подтверждён'
  :message.superseded?'Устарело':message.read&&message.delivery==='accepted'?'Принято хостом (SDK accepted) · прочитано адресатом'
  :message.read?'Прочитано адресатом'
  :delivery[message.delivery]??'Неизвестная стадия';
const intentLabel=phase=>({draft:'Черновик подготовлен',prepared:'Поручение подготовлено · разрешение Kit ожидается',
  authorized:'Разрешено Kit · ожидает канал',needs_confirmation:'Нужна повторная авторизация',
  deferred:'Отложено · ждём подтверждение',published:'Сохранено в Kit · ожидает SDK',
  failed:'Не выполнено',retired:'Отозвано'})[phase]??'Состояние не подтверждено';
// Rendering only; participant authorization and durable state belong to Control.
export function mountPanel({document}) {
  // The panel shares the sidebar palette; the host theme attribute selects light or dark.
  const palette=document.createElement('style');palette.id='wp-palette';
  palette.textContent=paletteCss({mode:'host',aliases:false})+spinnerCss+choiceCardCss+currentActionsCss;document.head.append(palette);
  const nodes=new Map([...document.querySelectorAll('[id]')].map(node=>[node.id,node]));
  let lastProgress=null,lastChoice=null,choiceHandlers={},choiceBusy=false;
  const current=mountCurrentActions({document,now:nodes.get('progress-now'),events:nodes.get('progress-events'),count:nodes.get('progress-history-count'),
    announce:nodes.get('progress-announcement')});
  // The user's choice card: the same contract and markup as in the window.
  // A panel document of an older resource has no card block; the choice still reaches the agent.
  function renderChoice(value){lastChoice=value??null;const node=nodes.get('progress-choice');
    if(node)renderChoiceCard(document,node,lastChoice,{...choiceHandlers,busy:choiceBusy});
    if(lastProgress)current.render(lastProgress,{choice:lastChoice});}
  // Work progress of the whole plan: header, every current action with its time, the history and executor timers.
  function renderProgress(value){
    if(!value)return;
    lastProgress=value;
    const node=id=>nodes.get(id),make=(tag,className)=>{const element=document.createElement(tag);if(className)element.className=className;return element;};
    node('progress-title').textContent=value.title||'Workflow Pilot';
    node('progress-phase').textContent=value.total?'в main '+value.done+' из '+value.total:'';
    node('progress-open').textContent=openedChat(value.self);
    current.render(value,{choice:lastChoice});
    const timers=(value.tasks??[]).filter(task=>task.timers);
    node('progress-timers').replaceChildren(...(timers.length?timers.map(task=>{const li=make('li');
      li.textContent=task.id+' · работа '+progressClock(task.timers.activeMs??0)+' · ожидание '+progressClock(task.timers.waitingMs??0);return li;})
      :[Object.assign(make('li','muted'),{textContent:'Нет данных.'})]));
  }
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
  // A finished plan whose participant was detached by the closure ends without a spinner.
  function renderClosed(){
    if(!lastProgress?.total||lastProgress.done!==lastProgress.total)return false;
    renderChoice(null);
    renderProgress({...lastProgress,phase:'План закрыт',now:[],primary:null,closed:true});return true;
  }
  return {$,progress:renderProgress,closed:renderClosed,choice:renderChoice,currentChoice:()=>lastChoice,
    onChoice(handlers){choiceHandlers=handlers;renderChoice(lastChoice);},choiceBusy(value){choiceBusy=!!value;renderChoice(lastChoice);},status:(value,state='idle')=>{text('status',value);$('status').dataset.state=state;},
    mode(value){workflow=value==='workflow';
      for(const id of ['legacy-fields','bind','enable'])$(id).hidden=workflow;
      if(workflow){$('run-selection').hidden=true;
        document.getElementById('binding-title').textContent='Участник плана';
        document.getElementById('permission-title').textContent='Связь во время выполнения';
        text('stop','Остановить отправку плана');
        text('stop-help','Остановка запрещает новые отправки всего плана. Для возобновления используйте «Продолжить» в плане. Уже переданный хосту запрос отменить нельзя.');
        text('address-help','Адресат определяется назначением. Сообщения передаются через SDK; порядок их обработки определяет ChatGPT. Выбор чата в боковой панели не меняет адресата; проверка и SDK Send не атомарны.');
        text('binding-help','Назначение определено по текущему разговору. Привязка выполняется автоматически.');
        text('permission-help','Связь управляется кнопкой выполнения плана. Отдельное включение для каждого исполнителя не требуется.');
      }
    },
    // The owner keeps the usual view; an observer names who delivers.
    role(value){if(!workflow)return;text('permission-help',value==='observer'
      ?OBSERVER_DELIVERY_LABEL+'. Эта панель показывает ход работы и принимает ваш выбор и остановку плана; уведомления агенту отсюда не отправляются.'
      :'Связь управляется кнопкой выполнения плана. Отдельное включение для каждого исполнителя не требуется.');
      $('permission-help').dataset.deliveryRole=value;},
    unbound(){renderChoice(null);text('identity','Участник не подтверждён');text('binding','Проверяем принадлежность текущему разговору.');
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
      if('user_choice' in value)renderChoice(value.user_choice);
      if(value.work_progress)renderProgress(value.work_progress);
      if(value.assignments){$('roster-section').hidden=false;$('roster').replaceChildren();
        for(const assignment of value.assignments){const li=document.createElement('li'),detail=document.createElement('span');
          li.textContent=assignment.task_id+' · попытка '+(assignment.attempt??1)+' · '+(assignment.error?.message??assignmentStage(assignment).label);
          detail.textContent=assignment.terminal?'Работа интегрирована; worktree очищен.':['Назначение '+assignment.assignment_id,'SDK: '+(assignment.channel?.sdk?'подключён':'не подтверждён'),
            'поколение '+(assignment.channel?.generation??'—'),assignment.physical?.busy?'ход выполняется':assignment.physical?.stopped?'физическая остановка подтверждена':'состояние хода неизвестно',
            assignment.dialogue?.result?.source_commit?'результат Kit · коммит '+assignment.dialogue.result.source_commit:null,
            assignment.channel?.initial?.read?'Задание прочитано исполнителем':assignment.channel?.initial?.delivery==='accepted'?'SDK принял задание · чтение не подтверждено':null,
            assignment.phase==='RUNNING'?'Задача начата по Kit':null].filter(Boolean).join(' · ');
          li.append(detail);$('roster').append(li);}
      text('outbox',(value.pending_intents??[]).map(i=>`${i.assignment_id}: ${intentLabel(i.phase)}${i.error?' · '+i.error.message:''}`).join('\n'));}
      text('identity',value.mode==='workflow'?(value.role==='O'?'Оркестратор плана':value.role==='S'?'Чат проекта':`Исполнитель · ${value.task_id}\nНазначение ${value.assignment_id}`):`Роль ${value.role} · участник ${value.participant_id}`);
      text('binding',`Привязка подтверждена · ${value.conversation_key}`);
      text('permission',value.mode==='workflow'?(value.permission?.phase==='complete'
        ?`Выполнение завершено · ${(value.assignments??[]).filter(a=>a.phase==='INTEGRATED').length}/${(value.assignments??[]).length} · связь отключена. Ожидается ваша приёмка: сообщите оркестратору «Принимаю результат, закрой план».`
        :`План: ${value.permission?.phase??'ожидает запуска'} · ${value.stopped?'отправка приостановлена':'связь разрешена на время выполнения'}. Интеграции назначений: ${(value.assignments??[]).filter(a=>a.phase==='INTEGRATED').length}/${(value.assignments??[]).length}. Завершение всего плана ещё не подтверждено.`):
        `Поколение ${value.permission_generation} · ${value.expires_at?'до '+new Date(value.expires_at).toLocaleTimeString('ru'):'разрешение не выдано'}`);
      if(value.startup&&(!value.permission?.active||value.startup.cancelled||value.startup.launch&&value.startup.launch.cancel!=='none')){
        const view=startupView(value.startup);text('permission',view.title+'. '+view.detail);
        $('stop').hidden=!value.permission?.scope_id;
      }else $('stop').hidden=false;
      const incoming=value.messages.filter(m=>m.recipient_id===value.participant_id&&!m.superseded);
      text('queue',`${incoming.filter(m=>!m.read&&!m.startup_complete).length} непрочитанных · ${incoming.filter(m=>m.delivery==='pending'&&!m.read&&!m.startup_complete).length} ожидают уведомления`);
      const lastMessage=value.messages.at(-1);
      text('last',lastMessage?`${workflow?label(lastMessage)+'\n':''}${lastMessage.kind} · ${deliveryLabel(lastMessage)} · ${lastMessage.read?'прочитано':'чтение не подтверждено'}${handled(lastMessage)}\n${lastMessage.preview??lastMessage.body}`:'Сообщений пока нет.');
      $('messages').replaceChildren();
      for(const message of value.messages.slice(-30)){
        const li=document.createElement('li');li.textContent=`${workflow?label(message)+' · ':''}${message.kind} · ${deliveryLabel(message)} · ${message.read?'прочитано':'не прочитано'}${handled(message)} · ${message.message_id}`;
        if(message.preview){const body=document.createElement('p');body.textContent=message.preview;li.append(body);}
        if(message.in_reply_to){const correlation=document.createElement('span');correlation.textContent='В ответ на '+message.in_reply_to;li.append(correlation);}
        $('messages').append(li);
      }
    },
    exportResult(value,summary){$('export-text').value=value;text('export-summary',JSON.stringify(summary,null,2));$('export-result').hidden=false;},
  };
}
