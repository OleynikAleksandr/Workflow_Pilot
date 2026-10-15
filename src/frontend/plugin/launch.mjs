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
