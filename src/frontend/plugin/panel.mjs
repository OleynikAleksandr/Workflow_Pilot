// UI logic depends on an MCP App port, so fixture hosts exercise the same buttons.
export function mountPanel({document,callTool,getMessage,uuid=()=>crypto.randomUUID()}) {
  const $=id=>document.getElementById(id);
  let selected=null,busy=false,created=false;
  function status(text){$('status').textContent=text;}
  function controls(){
    $('new-session').disabled=busy||!selected||!getMessage()||created;
    $('refresh').disabled=busy;
    for(const button of $('projects').querySelectorAll('button'))button.disabled=busy;
    $('capability').hidden=!!getMessage();
  }
  function showProject(data){
    selected=data.project;
    $('project-name').textContent=selected.name;
    $('project-detail').hidden=false;
    $('sessions').replaceChildren();
    for(const session of data.sessions??[]){const li=document.createElement('li');li.textContent=session.title;$('sessions').append(li);}
  }
  function render(data){
    if(data?.error){status(data.error.message);return;}
    if(data?.project){showProject(data);controls();return;}
    if(!Array.isArray(data?.projects))return;
    $('projects').replaceChildren();
    if(selected&&!data.projects.some(p=>p.id===selected.id)){selected=null;$('project-detail').hidden=true;}
    for(const p of data.projects){
      const button=document.createElement('button');button.type='button';button.textContent=p.name;
      button.addEventListener('click',()=>run(async()=>{
        const result=await callTool('workflow_open_project',{project_id:p.id});
        if(result.isError)throw new Error(result.structuredContent?.error?.message??'Не удалось открыть проект.');
        created=false;showProject(result.structuredContent);status('Проект открыт. Можно создать сессию.');
      }));
      $('projects').append(button);
    }
    if(!data.projects.length)status('Сначала откройте локальный проект в приложении Workflow Pilot, затем обновите список.');
    else status('Выберите проект.');
    controls();
  }
  async function run(action){if(busy)return;busy=true;controls();try{await action();}catch(error){status(error.message||'Не удалось выполнить действие.');}finally{busy=false;controls();}}
  $('refresh').addEventListener('click',()=>run(async()=>{
    const result=await callTool('workflow_pilot_panel',{});render(result.structuredContent);
    if(result.isError)status(result.structuredContent?.error?.message??'Workflow Pilot недоступен.');
  }));
  $('new-session').addEventListener('click',()=>run(async()=>{
    const message=getMessage();if(!selected||!message||created)return;
    const requestId=uuid();
    const text='Подключи этот разговор к локальному проекту Workflow Pilot. Вызови workflow_connect_project с аргументами '+
      JSON.stringify({project_id:selected.id,request_id:requestId})+'. Прочитай весь полученный контекст и кратко подтверди готовность. Не начинай реализацию без моей задачи.';
    // Never retry an uncertain send: the host may already have created the conversation.
    created=true;
    status('Создаём разговор…');
    try {
      const result=await message.send({role:'user',content:[{type:'text',text}],_meta:{'openai/message':{target:'new',send:true}}});
      if(result?.isError)throw new Error('Клиент отклонил создание разговора.');
      status('Запрос передан ChatGPT. Сессия появится в Workflow Pilot после подключения агента к проекту.');
    }catch {status('Результат отправки не подтверждён. Проверьте новые разговоры в ChatGPT; повторно сообщение не отправлено.');}
  }));
  controls();
  return {render,ready:controls,error:message=>status(message)};
}
