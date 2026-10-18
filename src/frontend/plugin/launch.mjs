import {mountPanel} from './panel.mjs';
import {COMMUNICATION_PROTOCOL as PROTOCOL,COMMUNICATION_BUILD as BUILD} from '../../contracts/backend.mjs';
const terminal=code=>/^PLUGIN_COMMUNICATION_(BINDING|IDENTITY_REQUIRED|VERSION|STOPPED|STORE_|CLOSED|LIMIT)/.test(code??'');
export function mountCommunication({document,callTool,getMessage,uuid=()=>crypto.randomUUID(),sendTimeoutMs=10000}) {
  const ui=mountPanel({document}),$=ui.$,clock=()=>document.defaultView.performance.now(),started=clock();let panelId=uuid();
  let binding=null,enabled=false,disposed=false,epoch=0,abort=null,seq=0,busy=false,stopping=false,loop=null,expiry=null,expiresAt=0;
  let clientSequence=0,telemetry=[],flushing=null,dropped=0,exported='',exportRun='',serverError=null;
  let connected=false,suspended=false,contextBlocked=false,recovery=null,stopPromise=null,candidates=[],resumePending=false,recovered=false;
  const status=(text,state)=>{if(!disposed)ui.status(text,state);};
  const ready=()=>{
    const unavailable=disposed||suspended||!connected;
    const reason=disposed?'Панель завершена. Откройте её заново.':suspended?'Панель приостановлена до возвращения.':
      !connected?'SDK не подключён. Переоткройте панель, если подключение не завершится.':serverError?serverError:
      contextBlocked?'Контекст изменился. Нажмите «Восстановить данные».':busy?'Восстанавливаем данные или выполняем действие…':
      stopping?'Ждём подтверждения остановки.':!binding?'Привязка не подтверждена. Восстановите данные или выберите запуск.':
      !getMessage()?'Хост не предоставил openai/message. Отправка недоступна.':enabled?'Связь включена.':loop?'Завершаем прежнее ожидание…':'Можно включить связь на 30 минут.';
    $('bind').disabled=unavailable||busy||enabled||!!binding||contextBlocked;
    $('recover').disabled=unavailable||busy||stopping||enabled;
    $('runs').disabled=unavailable||busy||enabled||!!binding;
    $('enable').disabled=unavailable||contextBlocked||busy||stopping||!!loop||enabled||!binding||!getMessage()||!!serverError;
    $('stop').disabled=disposed||!binding||stopping;
    $('refresh').disabled=disposed||busy||enabled||!binding;
    $('export').disabled=disposed||busy||!binding;
    $('run').disabled=$('participant').disabled=!!binding||busy;
    if(!disposed){$('enable-reason').textContent=reason;ui.diagnostics(`SDK: ${connected?'подключён':'не подключён'}; openai/message: ${getMessage()?'доступен':'не предоставлен'}.\nПанель ${BUILD}, протокол ${PROTOCOL}.\nПривязка: ${binding&&!contextBlocked?'подтверждена':'не подтверждена'}. Ожидание: ${enabled&&loop?'запущено':'остановлено'}.\n${reason}`);}
    if(resumePending&&!busy&&!recovery&&!stopping&&!suspended&&!disposed){resumePending=false;queueMicrotask(()=>recover());}
  };
  const call=async(name,args={},options={})=>{
    const result=await callTool('workflow_communication_'+name,args,{timeout:35000,...options});
    if(result.isError)throw Object.assign(new Error(result.structuredContent?.error?.message??'MCP отклонил запрос.'),{code:result.structuredContent?.error?.code});
    return result.structuredContent;
  };
  function flush(){
    if(flushing||!binding||!telemetry.length)return flushing;
    flushing=(async()=>{while(telemetry.length){const entry=telemetry[0];
      if(!entry.binding){if(entry.panelId!==panelId){telemetry.shift();dropped++;continue;}entry.binding={...binding};}
      try{await call('telemetry',{binding:entry.binding,event:entry.event});telemetry.shift();}catch{break;}
      if(!disposed)ui.localEvents(telemetry.length,dropped);
    }})().finally(()=>{flushing=null;});return flushing;
  }
  function record(event_type,fields={}){
    const event={event_id:uuid(),event_type,client_sequence:++clientSequence,client_time:new Date().toISOString(),duration_ms:clock()-started,...fields};
    if(telemetry.length>=64)dropped++;else telemetry.push({event,panelId,binding:binding?{...binding}:null});
    if(!disposed)ui.localEvents(telemetry.length,dropped);void flush();
  }
  function localStop(text,state='idle'){
    enabled=false;epoch++;abort?.abort();clearTimeout(expiry);status(text,state);ready();
  }
  function stop(text='Остановлено локально; ждём подтверждения службы.',finalText=null,finalState='unknown',scope='panel'){
    if(stopPromise)return stopPromise;
    localStop(text);if(!binding)return Promise.resolve();const current={...binding},generation=epoch;
    if(scope==='panel'&&current.permission_generation===undefined)return Promise.resolve();
    stopping=true;ready();record('stop.local');
    stopPromise=(async()=>{
      try{const result=await call('stop',{binding:current,scope});if(epoch!==generation)return;
        if(!disposed)ui.snapshot({...result,expires_at:0});status(finalText??'Связь остановлена. Служба подтвердила Stop.',finalText?finalState:'idle');}
      catch{record('stop.failed',{error_code:'NETWORK_ERROR'});if(epoch===generation)status((finalText?finalText+' ':'')+'Остановлено локально. Подтверждение службы не получено.','error');}
      finally{stopping=false;stopPromise=null;ready();}
    })();return stopPromise;
  }
  async function refresh(reset=false){
    const current=binding,generation=epoch;
    const value=await call('status',{run_id:current.run_id,participant_id:current.participant_id});
    if(binding!==current||epoch!==generation||disposed||suspended)return value;
    if(!disposed){ui.snapshot({...value,expires_at:value.stopped?0:expiresAt});if(value.critical_error){serverError=value.critical_error;localStop('Журнал недоступен. Отправка заблокирована.','error');}}
    if(reset){let cursor=Math.max(0,value.seq-200);ui.feed([],cursor);
      while(cursor<value.seq){const page=await call('journal',{run_id:current.run_id,participant_id:current.participant_id,after_seq:cursor});
        if(disposed||binding!==current||epoch!==generation)return;ui.feed(page.events);cursor=page.seq;}seq=cursor;
    }return value;
  }
  async function deliver(message_id,generation,signal){
    const current={...binding};
    const ticket=await call('claim',{binding:current,message_id},{signal});
    if(!enabled||disposed||epoch!==generation)return;
    const args={binding:current,message_id:ticket.message_id,delivery_attempt_id:ticket.delivery_attempt_id};
    const verified=await call('verify',args,{signal});
    if(!enabled||disposed||epoch!==generation||verified.expires_at<=Date.now()||!getMessage())return;
    status('Передаём запрос текущему разговору…','sending');
    let outcome='unknown',timer;
    try {
      // These checks and the SDK invocation have no intervening await.
      const pending=getMessage().send({role:'user',content:[{type:'text',text:
        'Для включённого пользователем опыта Workflow Pilot вызови workflow_communication_read_message с аргументами '+
        JSON.stringify({run_id:current.run_id,participant_id:current.participant_id,message_id})+
        '. Не открывай другую панель и не повторяй уведомление. Чтение сообщения — отдельная квитанция.'}],
        _meta:{'openai/message':{target:'active',send:true}}},{timeout:sendTimeoutMs});
      record('sdk.invoked',{message_id});
      const response=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('timeout'),{code:'SDK_TIMEOUT'})),sendTimeoutMs);})]);
      outcome=response?.isError?'rejected':'accepted';record('sdk.'+outcome,{message_id});
    }catch(error){const timeout=error.code==='SDK_TIMEOUT'||error.code===-32001;
      record(timeout?'sdk.timeout':'sdk.error',{message_id,error_code:timeout?'SDK_TIMEOUT':'SDK_ERROR'});}
    finally{clearTimeout(timer);}
    try{await call('report',{...args,outcome});}catch(error){record('report.failed',{message_id,error_code:'MCP_ERROR'});throw error;}
    if(!enabled||disposed||epoch!==generation)return;
    status(outcome==='accepted'?'Хост принял запрос; чтение агентом проверяется отдельно.':
      outcome==='rejected'?'Хост отклонил запрос. Повтора нет.':'Исход отправки неизвестен. Повтора нет.',outcome==='unknown'?'unknown':'waiting');
  }
  async function listen(generation){
    const controller=new AbortController();abort=controller;let failures=0;
    const current=()=>enabled&&!disposed&&epoch===generation;
    while(current()){
      let update;
      try{update=await call('wait',{binding,after_seq:seq},{signal:controller.signal});}
      catch(error){
        if(!current())return;
        if(terminal(error.code)){localStop(error.message,'error');return;}
        record('wait.error',{error_code:'NETWORK_ERROR'});status('Связь со службой потеряна. Повторяем только ожидание…','error');failures++;
        await new Promise(resolve=>{const finish=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',finish);resolve();};
          const timer=setTimeout(finish,Math.min(5000,250*2**Math.min(failures-1,5)));controller.signal.addEventListener('abort',finish,{once:true});if(controller.signal.aborted)finish();});
        continue;
      }
      if(!current())return;
      if(failures){record('connection.restored');status('Связь восстановлена. Ожидаем сообщение…','waiting');}failures=0;
      ui.feed(update.events);seq=update.seq;void flush();
      if(update.stopped||update.critical_error){localStop(update.critical_error?'Ошибка журнала. Отправка запрещена.':'Разрешение отозвано.','error');return;}
      if(update.message_id){
        try{await deliver(update.message_id,generation,controller.signal);}
        catch{if(current())await stop('Доставка остановлена локально.','Исход попытки или отчёт не подтверждён. Повтора нет.');return;}
      }
      if(current())try{await refresh();}catch{status('Не удалось обновить состояния. Журнал остаётся в службе.','error');}
    }
  }
  async function bind(){
    if(binding||disposed||suspended||contextBlocked)return;
    const generation=epoch;
    const next={run_id:$('run').value.trim(),participant_id:$('participant').value.trim(),panel_instance_id:panelId,protocol_version:PROTOCOL,build_id:BUILD};
    try{const result=await call('bind',{binding:next});if(disposed||suspended||epoch!==generation)return;binding=next;serverError=result.critical_error;
      record('host.handshake',{message_supported:!!getMessage()});await refresh(true);
      if(disposed||suspended||epoch!==generation)return;
      status('Привязка подтверждена: '+result.role+'. '+(getMessage()?'Включите связь вручную.':'Хост не поддерживает openai/message; отправка недоступна.'));}
    catch(error){if(epoch===generation)status(error.message,'error');}finally{ready();}
  }
  function choose(value){$('run').value=value.run_id;$('participant').value=value.participant_id;}
  function recover(){
    if(recovery||disposed||suspended||!connected||busy)return recovery;
    localStop('Восстанавливаем данные текущего разговора…');const generation=epoch;
    busy=true;serverError=null;contextBlocked=false;ready();
    recovery=(async()=>{
      await stopPromise;await loop;
      if(disposed||suspended||epoch!==generation)return;
      if(recovered){panelId=uuid();clientSequence=0;}recovered=true;binding=null;expiresAt=0;seq=0;ui.unbound();
      const result=await call('recover');
      if(disposed||suspended||epoch!==generation)return;
      if(result.build_id!==BUILD||result.protocol_version!==PROTOCOL)throw Error('Несовместимая панель. Переоткройте Workflow Pilot.');
      serverError=result.critical_error;candidates=result.participants;ui.candidates(candidates);
      if(candidates.length===1){choose(candidates[0]);await bind();}
      else status(candidates.length?'Найдено несколько запусков. Выберите нужный.':'В этом разговоре участник ещё не зарегистрирован. Выполните join и нажмите «Восстановить данные».');
    })().catch(error=>{if(epoch===generation){serverError=error.message;status('Не удалось восстановить данные: '+error.message,'error');}})
      .finally(()=>{recovery=null;busy=false;ready();});return recovery;
  }
  $('recover').addEventListener('click',()=>void recover());
  $('runs').addEventListener('change',async()=>{
    const selected=candidates.find(c=>c.run_id===$('runs').value);if(!selected||busy||binding)return;
    choose(selected);busy=true;ready();try{await bind();}finally{busy=false;ready();}
  });
  $('bind').addEventListener('click',async()=>{
    if(busy||binding||disposed||suspended||!connected)return;busy=true;ready();try{await bind();}finally{busy=false;ready();}
  });
  $('enable').addEventListener('click',async()=>{
    if(busy||stopping||loop||enabled||disposed||suspended||contextBlocked||!connected||!binding||!getMessage()||serverError)return;busy=true;ready();const current=++epoch,requested={...binding};
    try{const result=await call('enable',{binding:requested,message_supported:true});
      if(disposed||suspended||epoch!==current){await call('stop',{binding:{...requested,permission_generation:result.permission_generation},scope:'panel'});return;}
      binding={...binding,permission_generation:result.permission_generation};expiresAt=result.expires_at;enabled=true;ui.snapshot(result);
      status('Связь включена. Ожидаем сообщение…','waiting');
      expiry=setTimeout(()=>void stop('Срок разрешения истёк.','Срок разрешения истёк. Служба подтвердила Stop.','expired'),Math.max(0,result.expires_at-Date.now()));
      loop=listen(current).finally(()=>{loop=null;ready();});
    }catch(error){status(error.message,'error');}finally{busy=false;ready();}
  });
  $('stop').addEventListener('click',()=>void stop(undefined,null,'unknown','participant'));
  $('refresh').addEventListener('click',async()=>{if(!binding||busy||enabled)return;busy=true;ready();try{await flush();await refresh(true);}catch{status('Не удалось обновить журнал. Повторите вручную.','error');}finally{busy=false;ready();}});
  $('export').addEventListener('click',async()=>{
    if(!binding||busy)return;busy=true;ready();let after_seq=0,through_seq,parts=[],summary;
    try{do{const result=await call('export',{run_id:binding.run_id,participant_id:binding.participant_id,after_seq,...(through_seq===undefined?{}:{through_seq})});
      if(disposed)return;parts.push(result.jsonl);after_seq=result.after_seq;through_seq=result.through_seq;summary=result.summary;if(result.complete)break;
    }while(true);exported=parts.join('');exportRun=binding.run_id;ui.exportResult(exported,summary);}
    catch{status('Экспорт не завершён. Журнал сохранён в службе; повторите экспорт.','error');}finally{busy=false;ready();}
  });
  $('select').addEventListener('click',()=>{$('export-text').focus();$('export-text').select();});
  $('download').addEventListener('click',()=>{
    try{const window=document.defaultView,url=window.URL.createObjectURL(new window.Blob([exported],{type:'application/x-ndjson;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='workflow-communication-'+exportRun+'.jsonl';link.click();setTimeout(()=>window.URL.revokeObjectURL(url),1000);}
    catch{status('Хост не разрешил скачивание. Используйте «Выделить журнал» и сохраните текст.','error');}
  });
  record('panel.mount');ready();return {ready,recover,connected(){connected=true;ready();return recover();},
    contextChanged(fields=[]){
      const presentation=new Set(['theme','styles','containerDimensions','displayMode','availableDisplayModes','safeAreaInsets']);
      if(fields.length&&fields.every(field=>presentation.has(field)))return;
      if(contextBlocked||disposed||suspended)return;contextBlocked=true;
      record('host.context_changed',{error_code:'CONTEXT_CHANGED'});void stop('Контекст хоста изменился; восстановите привязку.');ready();},
    visibilityChanged(){record('visibility.changed');},
    connectionError(){connected=false;serverError='SDK не подключён.';void stop('Не удалось подключить панель. Переоткройте её внутри ChatGPT.');ready();},
    suspend(){if(disposed||suspended)return;record('panel.pagehide');suspended=true;void stop('Панель приостановлена.');ready();},
    resume(){if(disposed||!suspended)return;suspended=false;record('panel.resume');resumePending=true;ready();},
    dispose(reason='dispose'){if(disposed)return;record(reason==='pagehide'?'panel.pagehide':'panel.dispose');disposed=true;void stop('Панель закрывается; связь остановлена локально.');},
  };
}
