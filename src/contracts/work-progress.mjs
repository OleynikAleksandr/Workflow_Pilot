// One projection of plan progress for the sidebar, the HTTP client and the plugin panel.
// Pure: Control and the backend collect facts, clients only draw the result.

// Item kinds: act — an action runs (spinner); wait — someone waits (no spinner); warn — needs the user.
export const WORK_KINDS=['warn','act','wait'];
// A waiting participant without a new stage for this long is reported as silent.
export const WORK_SILENCE_MS=15*60*1000;
export const WORK_HISTORY_LIMIT=200;

export function plural(count,one,few,many) {
  const tail=count%10,teen=count%100;
  return count+' '+(tail===1&&teen!==11?one:tail>=2&&tail<=4&&(teen<12||teen>14)?few:many);
}
export const eventCount=count=>plural(count,'событие','события','событий');

export function participantName(actor) {
  return actor==='O'?'Оркестратор':['S','P','SELF'].includes(actor)?'Агент':actor==='USER'?'Пользователь'
    :actor==='REVIEW'?'Рецензент':actor==='APP'?'Приложение':actor==='KIT'?'Workflow Kit':actor==='PLAN'?'План'
    :actor?'Исполнитель '+actor:'';
}
export const PLAN_READY_TEXT='ждёт вашей проверки и запуска. Нажмите «Начать выполнение плана» слева';

export function reviewActivity(review,now=Date.now()){
  if(!review?.enabled||['IDLE','PUBLISHED','CANCELLED'].includes(review.stage))return null;
  const words={RUNNING:'Рецензирование плана · Claude · раунд '+review.round,
    PREPARED:'Ожидаем начала рецензирования',AUTHOR_PENDING:'Агент рассматривает замечания рецензента',
    AGREED:'План согласован · ожидаем публикацию',PUBLISHING:'Публикуется согласованный план',
    NEEDS_USER:'Рецензирование ждёт решения пользователя',STALE:'Рецензирование требует актуализации документов'};
  const started=Date.parse(review.startedAt??''),kind=review.indicator==='attention'?'warn'
    :['RUNNING','PUBLISHING','AUTHOR_PENDING'].includes(review.stage)?'act':'wait';
  return {actor:'REVIEW',name:'',stage:'plan-review',text:words[review.stage]??'Проверяем состояние рецензирования',kind,
    reason:kind==='warn'?review.message??'':null,elapsedMs:Number.isFinite(started)&&review.stage==='RUNNING'?Math.max(0,now-started):null,
    key:'review:'+(review.runId??'unknown')+':'+review.round+':'+review.stage};
}

// Kit 1.9.5 writes this record while commit checks run; older Kit writes nothing.
export function commitProgress(value) {
  if(!value||typeof value!=='object'||value.version!==1)return null;
  const {task_id,check_id,index,total,check_started_at_ms,run_started_at_ms}=value;
  if(typeof check_id!=='string'||!check_id||check_id.length>80||!Number.isSafeInteger(index)||!Number.isSafeInteger(total)
    ||index<1||index>total||total>64||!Number.isSafeInteger(check_started_at_ms)||!Number.isSafeInteger(run_started_at_ms))return null;
  return {taskId:typeof task_id==='string'?task_id:null,checkId:check_id,index,total,checkStartedAt:check_started_at_ms,runStartedAt:run_started_at_ms};
}
export const commitProgressLabel=progress=>'Kit проверяет коммит · '+progress.checkId+' · '+progress.index+' из '+progress.total;

// Stage phases of assignmentStage/executorStatus/executorDispatchStage and planActivity by kind.
const WAIT_PHASES=new Set(['waiting','waiting-task','waiting-channel','question','review','report','accepted','ready','setup',
  'paused','complete','turn-end','waiting-read']);
const WARN_PHASES=new Set(['attention']);
export function stageKind(phase,{busy=false}={}) {
  if(WARN_PHASES.has(phase))return 'warn';
  if(busy)return 'act';
  return WAIT_PHASES.has(phase)?'wait':'act';
}

// Service traffic is mechanics, not an event: readiness, recovery, probes and replaced messages.
const SERVICE_KINDS=new Set(['ready','recovery','probe','startup-context']);
const MESSAGE_WORDS={task:'задание',question:'вопрос',clarification:'уточнение',decision:'решение',result:'результат',
  acceptance:'результат принят',revision_request:'на доработку',finalization:'поручение на итог',message:'сообщение'};
const short=(text,limit=90)=>{const value=String(text??'').replace(/\s+/g,' ').trim();return value.length>limit?value.slice(0,limit-1)+'…':value;};
export function messageActor(message) {
  return message.sender_role==='O'?'O':message.sender_role==='E'?message.task_id??'E':message.sender_role==='S'?'S':'APP';
}
export function messageRecipient(message) {
  return message.sender_role==='E'?'O':message.task_id&&message.sender_role!=='E'&&message.kind!=='finalization'?message.task_id:'O';
}
// A finished message as one history line: «Оркестратор → T002 задание «Сводка чисел»».
export function messageEvent(message,{titles={}}={}) {
  if(!message||message.superseded||SERVICE_KINDS.has(message.kind))return null;
  const at=Date.parse(message.created_at);if(!Number.isFinite(at))return null;
  const actor=messageActor(message),recipient=messageRecipient(message),word=MESSAGE_WORDS[message.kind]??MESSAGE_WORDS.message;
  const to=recipient==='O'?'оркестратору':recipient;
  let detail='';
  if(message.kind==='task'&&titles[message.task_id])detail=' «'+titles[message.task_id]+'»';
  else if(['result','acceptance'].includes(message.kind)&&message.source_commit)detail=' · коммит '+String(message.source_commit).slice(0,7);
  else if(message.preview_text)detail=': '+short(message.preview_text);
  const text=message.kind==='acceptance'?'принял '+(message.task_id??'результат')+detail:'→ '+to+' '+word+detail;
  return {at,actor,text,kind:'done',id:message.message_id??null};
}

// The session role as a participant of the progress: orchestrator O, planning P, own sequential plan SELF, discussion S.
export const roleActor=role=>({orchestrator:'O',planning:'P',self:'SELF'})[role]??'S';
// The plan stage shown at the top of the sidebar card and the panel header: [label, busy].
// Without a plan: «Подготовка плана» once a session owns planning, otherwise «Ждёт задачи» or «Обсуждение» while a chat answers.
export function planPhase({scope=null,starting=false,acting=false,complete=false,attention=false,paused=false,allDone=false,started=false,
  notStarted=false,preparing=false,running=false,planning=false,review=null,choice=false}={}) {
  if(attention&&!complete)return ['Нужно внимание',false];
  if(choice&&!complete)return ['Ждёт вашего выбора',false];
  if(review?.enabled&&review.stage==='RUNNING')return ['Рецензирование плана',true];
  if(review?.enabled&&review.stage==='PREPARED')return ['Ожидает рецензирования',false];
  if(review?.enabled&&review.stage==='AUTHOR_PENDING')return ['Доработка плана',true];
  if(!scope)return starting?['Подготовка',true]:planning?['Подготовка плана',!!acting]:acting?['Обсуждение',true]:['Ждёт задачи',false];
  if(complete)return ['Ждёт приёмки',false];
  if(attention)return ['Нужно внимание',false];
  if(paused)return ['Пауза',false];
  if(allDone)return ['Завершение',!!acting];
  if(notStarted&&!started)return ['План готов',false];
  if(preparing)return ['Запуск',true];
  return ['Выполнение',running||acting];
}

const order=item=>WORK_KINDS.indexOf(item.kind);
// Normalizes the collected facts; times are elapsed milliseconds measured by the backend.
export function buildWorkProgress({title='',phase='',busy=false,done=0,total=0,strategy=null,tasks=[],now=[],history=[],attention=null,self=null,generatedAt=Date.now()}={}) {
  const current=now.filter(item=>item&&item.text).map(item=>({actor:item.actor,name:item.name??participantName(item.actor),text:String(item.text),
    kind:WORK_KINDS.includes(item.kind)?item.kind:'act',elapsedMs:item.elapsedMs==null?null:Math.max(0,Math.round(item.elapsedMs)),key:item.key??item.actor+':'+item.text,
    stage:item.stage??null,recipient:item.recipient??null,reason:item.reason??null,choiceId:item.choiceId??null,
    action:item.action??null,priority:item.priority??(item.stage==='choice'?1:item.kind==='warn'?0:item.kind==='act'?2:3)}))
    .sort((a,b)=>a.priority-b.priority||order(a)-order(b));
  const unique=new Map();
  for(const item of history)if(item&&item.text){const id=item.id??JSON.stringify([item.at,item.actor,item.text]);if(!unique.has(id))unique.set(id,{...item,id});}
  const events=[...unique.values()].filter(item=>item.at===null||Number.isFinite(item.at))
    .sort((a,b)=>(b.at??-Infinity)-(a.at??-Infinity)).slice(0,WORK_HISTORY_LIMIT)
    .map(item=>({id:item.id,at:item.at,actor:item.actor,name:item.name??participantName(item.actor),text:item.text,kind:item.kind==='warn'?'warn':'done'}));
  const primary=attention?{actor:'APP',name:'',text:attention.title,reason:attention.text??'',action:attention.action??null,
    key:attention.id??'attention:'+attention.title+':'+(attention.text??''),stage:'attention',kind:'warn',elapsedMs:null}
    :current[0]??null;
  return {version:1,title,phase,busy:!!busy,done,total,strategy,generatedAt,self,
    tasks:tasks.map(task=>({id:task.id,title:task.title,status:task.status,label:task.label,mode:task.mode??null,
      elapsedMs:task.elapsedMs==null?null:Math.max(0,Math.round(task.elapsedMs)),target:task.target??null,
      // Accumulated work and wait timers of the executor page, shown only in the panel diagnostics.
      timers:task.timers??null})),
    now:current,primary,history:events,attention:attention?{title:attention.title,text:attention.text??'',action:attention.action??null}:null};
}
