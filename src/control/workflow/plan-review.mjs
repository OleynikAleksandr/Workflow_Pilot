import { desktopFiles as fs } from '../../execution/facade.mjs';
import { safePath } from '@webpilot/workflow-kit/lib/common';
import { reviewStatus, readReview, setReviewEnabled } from '@webpilot/workflow-kit/lib/plan-review';
import {USER_EVENT_RULE} from '@webpilot/workflow-kit/lib/role-protocol';

export const reviewPreferenceMessage=p=>[
  'Пользователь изменил Review: '+(p.enabled?'ON':'OFF')+'; версия решения '+p.revision+'.',
  p.enabled?'До публикации спецификация и ToDo Plan должны пройти согласование Claude через Workflow Kit.'
    :'До публикации нового плана разрешён обычный путь без рецензирования; уже опубликованный план не меняется.',
  USER_EVENT_RULE,
].join('\n');

const messages={IDLE:'',PREPARED:'Документы готовы к ревью.',RUNNING:'Claude проверяет документы.',
  AUTHOR_PENDING:'Основной агент рассматривает замечания.',AGREED:'Документы согласованы.',
  NEEDS_USER:'Нужно решение пользователя.',STALE:'Документы изменились; требуется обновить ревью.',
  CANCELLED:'Ревью отменено.',PUBLISHING:'Публикуется согласованный план.',PUBLISHED:'Согласованный план опубликован.'};
// Why the switch is frozen. Kit enforces the same rules; the view only explains them.
const LOCK_PUBLISHED='Review применяется к новому плану; текущий план уже опубликован. Переключение доступно после закрытия плана.';
const LOCK_BUSY='Идёт ревью; переключение доступно после его завершения.';
function projection(s,{supported,error=null,activityError=null,published=false}={}){
  const enabled=s?.enabled===true;
  const attention=error||s?.cleanup_error||activityError||(enabled&&(s?.error||['NEEDS_USER','STALE'].includes(s?.stage)));
  const indicator=attention?'attention':!enabled?'none':['RUNNING','PUBLISHING'].includes(s?.stage)?'working'
    :['AGREED','PUBLISHED'].includes(s?.stage)?'success':['PREPARED','AUTHOR_PENDING'].includes(s?.stage)?'waiting':'none';
  const lock=!supported||error?null:published?LOCK_PUBLISHED:['RUNNING','PUBLISHING'].includes(s?.stage)?LOCK_BUSY:null;
  return {enabled,supported,error,stage:s?.stage??'IDLE',round:s?.round??0,indicator,lock,
    runId:s?.run_id??null,startedAt:s?.started_at??null,
    recipientSessionId:s?.recipient_session_id??null,events:s?.review_events??[],
    legacyHistory:(s?.review_history??[]).map(h=>({round:h.round,verdict:h.verdict,review_sha256:h.review_sha256,
      completed_at:h.completed_at??null,author_response:h.author_response?{sha256:h.author_response.sha256,
        disposition:h.author_response.disposition,recorded_at:h.author_response.recorded_at??null}:null})),
    message:error||s?.cleanup_error||activityError||(enabled?[s?.round?`Раунд ${s.round}.`:'',messages[s?.stage]??'',s?.error?.message??''].filter(Boolean).join(' '):'')};
}

// Data comes from the checkout. Never import or execute a module from that checkout in the app.
export class PlanReviewClient {
  constructor({selected,onChange=()=>{},read=reviewStatus,readSnapshot=readReview,write=setReviewEnabled,published=()=>false,
    deliverPreference=null,
    schedule=setTimeout,cancel=clearTimeout,now=Date.now,
    supports=workspace=>fs.existsSync(safePath(workspace,'.harness/kit/lib/plan-review.mjs'))}) {
    Object.assign(this,{selected,onChange,read,readSnapshot,write,published,supports,schedule,cancel,now,deliverPreference});
    this.workspace=null;this.state=null;this.error=null;this.supported=false;this.signature='';
    this.timer=null;this.activityError=null;this.disposed=false;
    this.preferencesTail=Promise.resolve();this.queuedPreferences=new Set();this.preferenceErrors=new Map();
  }
  observeSelection() {
    const workspace=this.selected()?.workspace??null;
    if(workspace===this.workspace)return;
    this.workspace=workspace;this.refresh();
  }
  refresh() {
    if(this.disposed)return;
    this.cancel(this.timer);this.timer=null;this.activityError=null;
    this.error=null;this.state=null;this.supported=false;
    if(this.workspace)try{
      this.supported=this.supports(this.workspace);
      if(this.supported)this.state=this.read(this.workspace);
      else this.error='Для Review обновите Workflow Kit проекта через Доктор.';
    }catch(e){this.error=e.message;}
    // Bounded watchdog for an active runner only; no functional polling at idle.
    const s=this.state;
    if(s?.enabled && s.stage==='RUNNING') {
      const deadline=Date.parse(s.started_at)+905000;
      if(!Number.isSafeInteger(s.runner_pid) || s.runner_pid<=0 || !Number.isFinite(deadline))
        this.activityError='Не удалось подтвердить процесс ревью. Проверьте его состояние; автоматический повтор не выполняется.';
      else if(this.now()>=deadline)
        this.activityError='Время ожидания ревью истекло. Проверьте результат процесса; автоматический повтор не выполняется.';
      else {
        this.timer=this.schedule(()=>{this.timer=null;this.refresh();},Math.min(15000,deadline-this.now()));
        this.timer?.unref?.();
      }
    }
    const signature=JSON.stringify([this.workspace,this.state,this.error,this.supported,this.activityError]);
    if(signature!==this.signature){this.signature=signature;this.onChange();}
    if(this.workspace&&this.deliverPreference)void this.reconcilePreferences(this.workspace).catch(()=>{});
  }
  setEnabled({workspace,sessionId,enabled}={}) {
    const selected=this.selected();
    if(typeof enabled!=='boolean' || !workspace || workspace!==selected?.workspace
      ||selected.sessionId&&sessionId!==selected.sessionId)
      throw Object.assign(new Error('Выбранный проект изменился. Повторите переключение Review.'),{code:'REVIEW_SELECTION_CHANGED'});
    this.observeSelection();
    if(!this.supported || this.error)throw Object.assign(new Error(this.error??'Review недоступен.'),{code:'REVIEW_UNAVAILABLE'});
    // A refused switch (published plan, running review) still resyncs the view with Kit.
    try{this.write(workspace,enabled,{recipient_session_id:selected.sessionId??null});}finally{this.refresh();}
    return this.view();
  }
  reconcilePreferences(workspace){
    if(!this.deliverPreference||this.disposed)return Promise.resolve();
    const next=this.preferencesTail.then(async()=>{
      if(this.disposed||!this.supports(workspace))return;
      const s=this.readSnapshot(workspace);
      const events=s.review_events??(s.preference?[{...s.preference,type:'preference'}]:[]);
      for(const p of events){
        if(p.type!=='preference'||!p.id||!p.recipient_session_id)continue;
        const key=workspace+'\n'+p.id;if(this.queuedPreferences.has(key))continue;
        await this.deliverPreference(workspace,structuredClone(p));
        this.queuedPreferences.add(key);
        if(this.queuedPreferences.size>4096)this.queuedPreferences.delete(this.queuedPreferences.values().next().value);
      }
      if(this.preferenceErrors.delete(workspace))this.onChange();
    }).catch(error=>{
      const message='Настройка Review сохранена; уведомление агента ожидает восстановления связи. '+error.message;
      if(this.preferenceErrors.get(workspace)!==message){this.preferenceErrors.set(workspace,message);this.onChange();}
      throw error;
    });
    this.preferencesTail=next.catch(()=>{});return next;
  }
  currentPreference(workspace,event,sessionId){
    const state=this.readSnapshot(workspace),p=state.preference;
    return event.type==='review-preference'&&p?.id===event.id&&p.revision===event.revision&&p.enabled===event.enabled
      &&state.enabled===p.enabled&&p.recipient_session_id===sessionId;
  }
  view() {
    return projection(this.state,{supported:this.supported,error:this.error,activityError:this.activityError??this.preferenceErrors.get(this.workspace),published:this.published(this.workspace)});
  }
  viewFor(workspace){
    try{const supported=!!workspace&&this.supports(workspace);
      const state=supported?this.readSnapshot(workspace):null;
      // sync/wait reads the canonical state even if a filesystem notification
      // was missed. A cached IDLE must not hide a running reviewer in the panel.
      const same=workspace===this.workspace&&state?.generation===this.state?.generation;
      return projection(state,{supported,published:this.published(workspace),
        activityError:(same?this.activityError:null)??this.preferenceErrors.get(workspace)});
    }catch(error){return projection(null,{supported:false,error:error.message});}
  }
  dispose(){this.disposed=true;this.cancel(this.timer);this.timer=null;}
}
