import fs from 'node:fs';
import { safePath } from '@webpilot/workflow-kit/lib/common';
import { reviewStatus, setReviewEnabled } from '@webpilot/workflow-kit/lib/plan-review';

const messages={IDLE:'',PREPARED:'Документы готовы к ревью.',RUNNING:'Claude проверяет документы.',
  AUTHOR_PENDING:'Основной агент рассматривает замечания.',AGREED:'Документы согласованы.',
  NEEDS_USER:'Нужно решение пользователя.',STALE:'Документы изменились; требуется обновить ревью.',
  CANCELLED:'Ревью отменено.',PUBLISHING:'Публикуется согласованный план.',PUBLISHED:'Согласованный план опубликован.'};

// Data comes from the checkout. Never import or execute a module from that checkout in the app.
export class PlanReviewClient {
  constructor({selected,onChange=()=>{},read=reviewStatus,write=setReviewEnabled,
    schedule=setTimeout,cancel=clearTimeout,now=Date.now,
    supports=workspace=>fs.existsSync(safePath(workspace,'.harness/kit/lib/plan-review.mjs'))}) {
    Object.assign(this,{selected,onChange,read,write,supports,schedule,cancel,now});
    this.workspace=null;this.state=null;this.error=null;this.supported=false;this.signature='';
    this.timer=null;this.activityError=null;this.disposed=false;
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
  }
  setEnabled({workspace,enabled}={}) {
    if(typeof enabled!=='boolean' || !workspace || workspace!==this.selected()?.workspace)
      throw Object.assign(new Error('Выбранный проект изменился. Повторите переключение Review.'),{code:'REVIEW_SELECTION_CHANGED'});
    this.observeSelection();
    if(!this.supported || this.error)throw Object.assign(new Error(this.error??'Review недоступен.'),{code:'REVIEW_UNAVAILABLE'});
    this.write(workspace,enabled);this.refresh();
    return this.view();
  }
  view() {
    const s=this.state,enabled=s?.enabled===true;
    const attention=this.error || s?.cleanup_error || this.activityError || (enabled && (s?.error || ['NEEDS_USER','STALE'].includes(s?.stage)));
    const indicator=attention?'attention':!enabled?'none':['RUNNING','PUBLISHING'].includes(s?.stage)?'working'
      :['AGREED','PUBLISHED'].includes(s?.stage)?'success':['PREPARED','AUTHOR_PENDING'].includes(s?.stage)?'waiting':'none';
    return {enabled,supported:this.supported,error:this.error,stage:s?.stage??'IDLE',round:s?.round??0,indicator,
      message:this.error || s?.cleanup_error || this.activityError || (enabled?[s?.round?`Раунд ${s.round} из ${s.max_rounds??4}.`:'',messages[s?.stage]??'',s?.error?.message??''].filter(Boolean).join(' '):'')};
  }
  dispose(){this.disposed=true;this.cancel(this.timer);this.timer=null;}
}
