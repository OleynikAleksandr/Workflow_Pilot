export function newSessionMessage(projectId,requestId) {
  const panelArgs=JSON.stringify({project_id:projectId});
  const text='Подключи этот разговор к локальному проекту Workflow Pilot. Первым вызовом инструмента выполни workflow_pilot_panel с аргументами '+
    panelArgs+', чтобы сразу открыть панель проекта рядом с этим разговором, до получения и чтения контекста. '+
    'Затем вызови workflow_connect_project с аргументами '+JSON.stringify({project_id:projectId,request_id:requestId})+
    '. После успешного подключения прочитай весь полученный контекст. '+
    'Затем повторно вызови workflow_pilot_panel с аргументами '+panelArgs+', чтобы обновить список сессий после подключения этого разговора. '+
    'После этого кратко подтверди готовность: назови проект, полноту контекста, текущую задачу и перечисли полученные разделы контекста. '+
    'Если подключение или открытие панели не удалось, сообщи об ошибке; не утверждай, что панель видна, только по успеху инструмента. '+
    'Не создавай другой разговор и не начинай реализацию без моей задачи.';
  return {role:'user',content:[{type:'text',text}],_meta:{'openai/message':{target:'new',send:true}}};
}
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
    if(data?.project){
      if(Array.isArray(data.projects))render({projects:data.projects});
      showProject(data);status('Проект открыт. Можно создать сессию.');controls();return;
    }
    if(!Array.isArray(data?.projects))return;
    $('projects').replaceChildren();
    const current=selected&&data.projects.find(p=>p.id===selected.id);
    if(current)showProject({project:current,sessions:current.sessions});
    else if(selected){selected=null;created=false;$('project-detail').hidden=true;$('sessions').replaceChildren();}
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
    else status(selected?'Данные проекта обновлены.':'Выберите проект.');
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
    // Never retry an uncertain send: the host may already have created the conversation.
    created=true;
    status('Создаём разговор…');
    try {
      const result=await message.send(newSessionMessage(selected.id,requestId));
      if(result?.isError)throw new Error('Клиент отклонил создание разговора.');
      status('Запрос передан ChatGPT. Сессия появится в Workflow Pilot после подключения агента к проекту.');
    }catch {status('Результат отправки не подтверждён. Проверьте новые разговоры в ChatGPT; повторно сообщение не отправлено.');}
  }));
  controls();
  return {render,ready:controls,error:message=>status(message)};
}
