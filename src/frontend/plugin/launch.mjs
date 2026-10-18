import { newSessionMessage } from './panel.mjs';

export function mountLaunch({document,callTool,getMessage,uuid=()=>crypto.randomUUID(),sendTimeoutMs=10000}) {
  const button=document.getElementById('launch-arm'),status=document.getElementById('launch-status');
  let busy=false,disposed=false,abort;
  const ready=()=>{button.disabled=busy||disposed||!getMessage();};
  const read=async(name,args,options)=>{
    const result=await callTool(name,args,options);
    if(result.isError)throw new Error('MCP rejected request');
    return result.structuredContent;
  };
  button.addEventListener('click',async()=>{
    if(busy||disposed||!getMessage())return;
    busy=true;ready();const receiverId=uuid();abort=new AbortController();
    status.textContent='Ожидаем одну команду до 45 секунд. В Workflow Pilot выберите проект → «Новый чат через плагин». Оставьте эту панель открытой.';
    try {
      const pending=await read('workflow_plugin_wait',{receiver_id:receiverId},{timeout:50000,signal:abort.signal});
      if(disposed)return;
      if(pending.expired){status.textContent='Время ожидания закончилось. Ничего не отправлено.';return;}
      const request=await read('workflow_plugin_claim',{receiver_id:receiverId,request_id:pending.requestId},{timeout:10000,signal:abort.signal});
      if(disposed)return;
      let outcome='unknown',timer;
      status.textContent='Отправляем начальные инструкции через API ChatGPT…';
      try {
        // Losing the response is UNKNOWN, never permission to send a second time.
        const result=await Promise.race([
          getMessage().send(newSessionMessage(request.projectId,request.requestId),{timeout:sendTimeoutMs}),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),sendTimeoutMs);})
        ]);
        if(!result?.isError)outcome='accepted';
      }catch {}finally{clearTimeout(timer);}
      if(!disposed)status.textContent=outcome==='accepted'
        ?'ChatGPT принял запрос. Перейдите в новый разговор через Open или историю. Контекст придёт через MCP.'
        :'Исход отправки неизвестен. Проверьте новые разговоры ChatGPT. Повтор не выполнялся.';
      await read('workflow_plugin_report',{receiver_id:receiverId,request_id:request.requestId,outcome},{timeout:10000});
    }catch {
      if(!disposed)status.textContent='Проверка не завершена. Проверьте состояние в Workflow Pilot и новые разговоры ChatGPT. Автоматического повтора нет.';
    }finally {busy=false;ready();}
  });
  ready();return {ready,dispose(){disposed=true;abort?.abort();ready();}};
}

// Independent communication UI; legacy launch is removed in T003.
export function mountCommunication({document,callTool,getMessage,uuid=()=>crypto.randomUUID(),sendTimeoutMs=10000}) {
  const $=id=>document.getElementById('communication-'+id);
  const panelId=uuid();let binding=null,enabled=false,disposed=false,epoch=0,abort=null,seq=0,busy=false;
  const status=text=>{$('status').textContent=text;};
  const ready=()=>{
    $('bind').disabled=disposed||busy||enabled;
    $('enable').disabled=disposed||busy||enabled||!binding||!getMessage();
    $('stop').disabled=disposed||!binding;
  };
  const call=async(name,args={},options={})=>{
    const result=await callTool('workflow_communication_'+name,args,{timeout:35000,...options});
    if(result.isError)throw new Error(result.structuredContent?.error?.message??'MCP отклонил запрос.');
    return result.structuredContent;
  };
  function localStop(text) {enabled=false;epoch++;abort?.abort();status(text);ready();}
  async function stop(text='Остановлено локально; ждём подтверждения службы.') {
    localStop(text);if(!binding)return;
    try{await call('stop',{binding});status('Связь остановлена. Служба подтвердила Stop.');}
    catch{status('Остановлено локально. Подтверждение службы не получено.');}
  }
  function feed(events=[]) {
    for(const event of events){const li=document.createElement('li');li.textContent=event.seq+' · '+event.event_type;$('events').append(li);}
  }
  async function listen(generation) {
    abort=new AbortController();let failures=0;
    while(enabled&&!disposed&&epoch===generation) {
      try {
        const update=await call('wait',{binding,after_seq:seq},{signal:abort.signal});
        if(!enabled||disposed||epoch!==generation)return;
        feed(update.events);seq=update.seq;
        if(update.stopped){localStop('Разрешение отозвано.');return;}
        if(!update.message_id){failures=0;continue;}
        const ticket=await call('claim',{binding,message_id:update.message_id},{signal:abort.signal});
        if(!enabled||disposed||epoch!==generation)return;
        const args={binding,message_id:ticket.message_id,delivery_attempt_id:ticket.delivery_attempt_id};
        const verified=await call('verify',args,{signal:abort.signal});
        if(!enabled||disposed||epoch!==generation||verified.expires_at<=Date.now()||!getMessage())return;
        status('Передаём запрос текущему разговору…');
        let outcome='unknown',timer;
        try {
          // No await between the final local checks and starting the real SDK.
          const pending=getMessage().send({role:'user',content:[{type:'text',text:
            'Для включённого пользователем опыта Workflow Pilot вызови workflow_communication_read_message с аргументами '+
            JSON.stringify({run_id:binding.run_id,participant_id:binding.participant_id,message_id:ticket.message_id})+
            '. Не открывай другую панель и не повторяй уведомление. Чтение сообщения — отдельная квитанция.'}],
            _meta:{'openai/message':{target:'active',send:true}}},{timeout:sendTimeoutMs});
          const response=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),sendTimeoutMs);})]);
          outcome=response?.isError?'rejected':'accepted';
        }catch{}finally{clearTimeout(timer);}
        await call('report',{...args,outcome});
        if(!enabled||disposed||epoch!==generation)return;
        status(outcome==='accepted'?'Хост принял запрос; чтение агентом ещё не подтверждено.':
          outcome==='rejected'?'Хост отклонил запрос. Повтора нет.':'Исход отправки неизвестен. Повтора нет.');
        failures=0;
      }catch(error) {
        if(!enabled||disposed||epoch!==generation)return;
        // A failed claim/verify/report is never repeated. Only wait resumes.
        status(error.message);failures++;
        await new Promise(resolve=>{const timer=setTimeout(resolve,Math.min(5000,250*2**Math.min(failures,5)));
          abort.signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});
      }
    }
  }
  $('bind').addEventListener('click',async()=>{
    if(busy||enabled||disposed)return;busy=true;ready();
    const next={run_id:$('run').value.trim(),participant_id:$('participant').value.trim(),panel_instance_id:panelId,
      protocol_version:1,build_id:'communication-v1-t001'};
    try{const result=await call('bind',{binding:next});binding=next;seq=result.seq;
      status('Привязка подтверждена: '+result.role+'. '+(getMessage()?'Включите связь вручную.':'Хост не поддерживает openai/message; отправка недоступна.'));}
    catch(error){binding=null;status(error.message);}finally{busy=false;ready();}
  });
  $('enable').addEventListener('click',async()=>{
    if(busy||enabled||disposed||!binding||!getMessage())return;busy=true;ready();const current=++epoch;
    try{const result=await call('enable',{binding,message_supported:!!getMessage()});
      if(disposed||epoch!==current)return;
      binding={...binding,permission_generation:result.permission_generation};seq=result.seq;enabled=true;
      status('Связь включена до '+new Date(result.expires_at).toLocaleTimeString('ru')+'. Ожидаем сообщение…');
      void listen(current);
    }catch(error){status(error.message);}finally{busy=false;ready();}
  });
  $('stop').addEventListener('click',()=>void stop());
  ready();return {ready,contextChanged(){if(binding)void stop('Контекст хоста изменился; связь остановлена.');},
    dispose(){if(disposed)return;disposed=true;void stop('Панель закрывается; связь остановлена локально.');}};
}
