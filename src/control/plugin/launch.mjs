import { randomUUID } from 'node:crypto';

const invalid = (code, message) => Object.assign(new Error(message), {code});
const validId = id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);

// One explicit, bounded experiment. No background polling, replay or browser port.
export class PluginLaunch {
  #listener = null;
  #operation = null;
  #state = {phase:'idle', message:''};
  #timer = null;
  constructor({onChange=()=>{}, waitMs=45000, now=Date.now}={}) {
    Object.assign(this,{onChange,waitMs,now});
  }
  snapshot() { return {...this.#state,transport:'plugin-api',domUsed:false}; }
  #set(phase,message,extra={}) {
    this.#state={phase,message,...extra};this.onChange();
  }
  #uncertainAfter(ms) {
    clearTimeout(this.#timer);
    const op=this.#operation;
    this.#timer=setTimeout(()=>{
      if(this.#operation===op && this.#state.phase!=='context-delivered')this.#set('unknown',
        'Подтверждение не получено. Проверьте новые разговоры ChatGPT; автоматического повтора нет.',{projectName:op.projectName});
    },ms);
    this.#timer.unref?.();
  }
  wait(receiverId,signal) {
    if(!validId(receiverId))throw invalid('PLUGIN_RECEIVER_INVALID','Подготовьте проверку в панели ChatGPT.');
    if(this.#listener)throw invalid('PLUGIN_RECEIVER_BUSY','Другая панель уже ожидает команду. Завершите её ожидание.');
    if(this.#operation && ['dispatched','sending'].includes(this.#state.phase))
      throw invalid('PLUGIN_LAUNCH_PENDING','Предыдущая отправка ещё не завершена. Проверьте ChatGPT.');
    if(signal?.aborted)return Promise.resolve({expired:true});
    clearTimeout(this.#timer);this.#operation=null;
    return new Promise(resolve=>{
      const listener={receiverId,deadline:this.now()+this.waitMs,finish:null};
      const finish=(value,phase)=>{
        if(this.#listener!==listener)return;
        clearTimeout(timer);signal?.removeEventListener('abort',abort);this.#listener=null;
        if(phase)this.#set(phase,'Ожидание команды завершено. Для новой проверки подготовьте панель ChatGPT ещё раз.');
        resolve(value);
      };
      const abort=()=>finish({expired:true},'cancelled');
      const timer=setTimeout(()=>finish({expired:true},'expired'),this.waitMs);
      listener.finish=finish;this.#listener=listener;
      signal?.addEventListener('abort',abort,{once:true});
      this.#set('ready','Панель ChatGPT ожидает одну команду. Выберите «Новый чат через плагин» в меню проекта.');
    });
  }
  request(project) {
    const listener=this.#listener;
    if(!listener || listener.deadline<=this.now())throw invalid('PLUGIN_RECEIVER_REQUIRED',
      'Откройте панель Workflow Pilot в ChatGPT и нажмите «Подготовить запуск из приложения», затем повторите этот пункт меню.');
    const requestId=randomUUID();
    this.#operation={requestId,receiverId:listener.receiverId,projectId:project.id,projectName:project.name,
      deadline:this.now()+15000,claimed:false};
    listener.finish({requestId,projectId:project.id});
    this.#set('dispatched','Команда передана панели. Ожидаем отправку через API ChatGPT.',{projectName:project.name});
    this.#uncertainAfter(15000);
    return {requestId};
  }
  claim({receiverId,requestId}) {
    const op=this.#operation;
    if(!op||op.receiverId!==receiverId||op.requestId!==requestId||op.claimed||op.deadline<=this.now())
      throw invalid('PLUGIN_LAUNCH_EXPIRED','Команда уже использована или истекла. Автоматического повтора нет.');
    op.claimed=true;
    this.#set('sending','Панель получила разрешение на одну отправку. Если ответ не придёт, проверьте новые разговоры ChatGPT.',{projectName:op.projectName});
    this.#uncertainAfter(15000);
    return {requestId:op.requestId,projectId:op.projectId};
  }
  report({receiverId,requestId,outcome}) {
    const op=this.#operation;
    if(!op||op.receiverId!==receiverId||op.requestId!==requestId||!op.claimed||!['accepted','unknown'].includes(outcome))
      throw invalid('PLUGIN_LAUNCH_INVALID','Результат не относится к текущей проверке.');
    clearTimeout(this.#timer);
    if(this.#state.phase!=='context-delivered')this.#set(outcome,outcome==='accepted'
      ?'ChatGPT принял запрос. Ожидаем подключения нового разговора и выдачи контекста.'
      :'Исход отправки неизвестен. Проверьте новые разговоры ChatGPT; повтор не выполнялся.',{projectName:op.projectName});
    return this.snapshot();
  }
  connected({requestId,projectId,contextBytes,contextSha256}) {
    const op=this.#operation;
    if(op?.claimed && op.requestId===requestId && op.projectId===projectId) {clearTimeout(this.#timer);this.#set('context-delivered',
      'Новый разговор подключён. Полный проверенный контекст выдан через MCP. Чтение подтвердит агент в ChatGPT.',
      {projectName:op.projectName,contextBytes,contextSha256});}
  }
}
