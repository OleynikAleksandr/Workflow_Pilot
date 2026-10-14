// User-driven navigation experiment. Never creates chats or infers a URL from anonymous IDs.
const METHODS=['sdk','compat','compat-direct','anchor-blank','anchor-top'];
const OUTCOMES=['desktop','browser','panel','nothing','error'];
const STORAGE='workflow-pilot-navigation-probe-v1';
export function conversationUrl(value){
  try{
    const url=new URL(value.trim());
    if(url.origin!=='https://chatgpt.com'||url.username||url.password||url.search||url.hash||
      !/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/[A-Za-z0-9-]+\/?$/.test(url.pathname))return null;
    return url.href;
  }catch{return null;}
}
export function mountNavigationProbe({document,getPorts,storage,timeoutMs=10000}){
  const $=id=>document.getElementById(id);
  let busy=false,events=[],storageAvailable=true;
  try{
    const saved=JSON.parse(storage?.getItem(STORAGE)??'[]');
    if(Array.isArray(saved))events=saved.slice(-20).filter(e=>METHODS.includes(e.method)&&
      ['attempt','accepted','rejected','unknown','observed'].includes(e.phase)&&
      Number.isFinite(e.time)&&(!e.outcome||OUTCOMES.includes(e.outcome)))
      .map(({method,phase,time,outcome})=>({method,phase,time,...(outcome?{outcome}:{})}));
    if(!storage)storageAvailable=false;
  }catch{storageAvailable=false;}
  const message=text=>{$('probe-status').textContent=text;};
  function report(){
    const ports=getPorts();
    $('probe-report').value=JSON.stringify({version:'0.1.5',available:{sdk:!!ports.sdk,compat:!!ports.compat},
      storageAvailable,events},null,2);
  }
  function record(method,phase,outcome){
    events.push({method,phase,time:Date.now(),...(outcome?{outcome}:{})});events=events.slice(-20);
    try{if(storage)storage.setItem(STORAGE,JSON.stringify(events));}catch{storageAvailable=false;}
    report();
  }
  function ready(){
    const url=conversationUrl($('probe-url').value),ports=getPorts();
    for(const method of METHODS){
      const el=$('probe-'+method),available=method==='sdk'?!!ports.sdk:method.startsWith('compat')?!!ports.compat:true;
      if(el.tagName==='A'){
        if(url&&!busy)el.href=url;else el.removeAttribute('href');
        el.setAttribute('aria-disabled',String(!url||busy));
      }else el.disabled=!url||busy||!available;
    }
    $('probe-availability').textContent='MCP openLink: '+(ports.sdk?'доступен':'не предоставлен')+
      '. ChatGPT openExternal: '+(ports.compat?'доступен':'не предоставлен')+'.';
    report();
  }
  async function navigate(method){
    const url=conversationUrl($('probe-url').value);if(!url||busy)return;
    const ports=getPorts(),call=method==='sdk'?ports.sdk:ports.compat;if(!call)return;
    busy=true;ready();record(method,'attempt');message('Запрос отправляется. Отметьте, где открылся диалог.');
    let timer;
    try{
      const response=await Promise.race([
        Promise.resolve(call(method==='sdk'?{url}:method==='compat'?{href:url}:{href:url,redirectUrl:false})),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),timeoutMs);})
      ]);
      const failed=response?.isError===true;
      record(method,failed?'rejected':'accepted');
      message(failed?'Хост отклонил запрос.':'API вернул управление без ошибки. Это не подтверждает переход: отметьте результат ниже.');
    }catch{record(method,'unknown');message('Ошибка или время ожидания истекло. Фактический переход не подтверждён; автоматического повтора нет.');}
    finally{clearTimeout(timer);busy=false;ready();}
  }
  for(const method of METHODS){
    const el=$('probe-'+method);
    el.addEventListener('click',event=>{
      if(!conversationUrl($('probe-url').value)||busy){event.preventDefault();return;}
      $('probe-method').value=method;
      if(method.startsWith('anchor')){
        record(method,'attempt');message('Обычная ссылка нажата. Её может отклонить sandbox; отметьте наблюдаемый результат.');
      }else void navigate(method);
    });
  }
  $('probe-url').addEventListener('input',()=>{
    ready();message(conversationUrl($('probe-url').value)?'Ссылка готова. Проверяйте способы по одному.':
      'Нужен обычный адрес диалога https://chatgpt.com/c/… (или /g/…/c/…), без Share, параметров и фрагмента.');
  });
  $('probe-save').addEventListener('click',()=>{
    const method=$('probe-method').value,outcome=$('probe-outcome').value;
    if(METHODS.includes(method)&&OUTCOMES.includes(outcome)){record(method,'observed',outcome);message('Ваше наблюдение добавлено в отчёт.');}
  });
  $('probe-select').addEventListener('click',()=>{$('probe-report').focus();$('probe-report').select();});
  ready();return {ready};
}
