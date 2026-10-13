import path from 'node:path';
import { AutoPlan } from './auto-plan.mjs';
import { reviewStatus, acknowledgeReview } from '@webpilot/workflow-kit/lib/plan-review';

const eligible=s=>s?.enabled && ['PREPARED','AUTHOR_PENDING','AGREED','NEEDS_USER'].includes(s.stage)
  && !(s.stage==='NEEDS_USER' && s.notification_handled);
const owner=p=>JSON.stringify([p?.workspace,p?.sessionId,p?.chatUrl]);
export function reviewContinueMessage(workspace,s) {
  return ['Продолжи ревью нового плана.',
    'Прочитай ./scripts/workflow review:status. Это продолжение разрешённого пользователем Review, не разрешение выполнения задач.',
    'Workspace: '+JSON.stringify(workspace),
    'Состояние: '+s.stage+'; раунд '+s.round+'. Папка: '+JSON.stringify(path.join(workspace,'.harness/runtime/plan-review',s.run_id)),
    s.stage==='NEEDS_USER'?'Если есть успешный отзыв, сохрани содержательную позицию через review:respond. Сообщи пользователю проблему и спроси, что делать дальше. Выполни review:acknowledge перед финальным вопросом. Без ответа пользователя не повторяй вызов и не публикуй.':
      'Прочитай полный результат, если он есть. После каждого успешного отзыва, включая approved, сохрани содержательную позицию через review:respond. Существенные решения перенеси в spec/критерии до окончательного ревью. Неизменённую согласованную пару с accept публикуй через review:publish без лишнего раунда; после изменений — prepare и новое согласие в той же Claude-сессии. При существенном споре — needs_user и вопрос пользователю. Не меняй Review или AutoPlan.',
    'Если цикл уже изменился, действуй по актуальному status. Не повторяй неизвестный запуск или Send.'
  ].join('\n');
}
export class ReviewContinuation {
  constructor({selected,client,send,available,saveCheckpoint,onChange=()=>{},status=reviewStatus,acknowledge=acknowledgeReview,...timing}) {
    Object.assign(this,{selected,client,status,acknowledge});this.stops=new Map();this.signature='';this.persistenceError=false;
    this.flow=new AutoPlan({...timing,selected:()=>this.selection(),available:()=>available()&&!this.stops.has(owner(selected()))&&!this.persistenceError,
      inspectPlan:async()=>this.inspect(),saveCheckpoint:async checkpoint=>{
        await saveCheckpoint({...checkpoint,version:3,entries:checkpoint?.entries??[],cycles:checkpoint?.cycles??[],reviewStops:[...this.stops.values()]});
      },onChange,
      send:async(_text,ready,before)=>{
        const p=this.selected(),s=this.client.state;
        if(!p || !eligible(s) || s.recipient_session_id!==p.sessionId || !ready())return {state:'cancelled'};
        const same=latest=>owner(this.selected())===owner(p) && eligible(latest)
          && latest.run_id===s.run_id && latest.generation===s.generation && latest.recipient_session_id===p.sessionId;
        const current=()=>ready() && same(this.client.state);
        const beforeSend=async()=>{
          // Recheck persisted routing at the final send boundary, not only after the file event.
          if(!current() || !same(this.status(p.workspace)))return false;
          return await before() && current() && same(this.status(p.workspace));
        };
        const result=await send(reviewContinueMessage(p.workspace,s),current,beforeSend,this.flow);
        if(result.state==='sent' && s.stage==='NEEDS_USER'){
          this.acknowledge(p.workspace,s.run_id);this.client.refresh();
        }
        return result;
      }});
  }
  selection() {
    const p=this.selected(),s=this.client.state;
    if(!p)return null;
    return {...p,scopeId:this.client.workspace===p.workspace
      && s?.run_id && s.recipient_session_id===p.sessionId?'review:'+s.run_id:null};
  }
  inspect() {
    const p=this.selection();
    if(!p?.scopeId)return {confirmed:false};
    const s=this.status(p.workspace);this.client.refresh();
    const ready=eligible(s) && s.recipient_session_id===p.sessionId && p.scopeId==='review:'+s.run_id;
    return {confirmed:ready,scopeId:p.scopeId,scopeStatus:'ACTIVE',planView:{tasks:ready?[{id:'review',status:'pending'}]:[]},
      nextTask:{id:s.run_id+':'+s.generation,title:'Продолжить ревью'}};
  }
  update() {
    const p=this.selected();
    const signature=JSON.stringify([p?.workspace,p?.sessionId,p?.chatUrl,this.client.state?.generation,this.client.state?.enabled]);
    if(signature===this.signature){this.flow.availabilityChanged();return;}
    this.signature=signature;
    const enabled=this.client.state?.enabled===true;
    if(enabled && !this.flow.enabled)void this.flow.start();
    else if(!enabled && this.flow.enabled){this.flow.disable();this.stops.delete(owner(this.selected()));this.saveStops();}
    else {this.flow.selectionChanged();this.flow.availabilityChanged();void this.flow.planChanged();}
  }
  observe(event) {
    const p=this.selected(),previous=this.flow.page,current=event.state;
    const key=owner(p);let changed=false;
    if(!event.reset && previous?.documentId===(event.documentId??previous.documentId)) {
      if((current.manualStopRevision??0)>(previous.manualStopRevision??0)){this.stops.set(key,{key,userTurnId:current.userTurnId??null});changed=true;}
      if((current.manualSendRevision??0)>(previous.manualSendRevision??0)){changed=this.stops.delete(key)||changed;}
    }
    if(!event.reset && current?.userTurnId && this.stops.has(key) && this.stops.get(key).userTurnId!==current.userTurnId)changed=this.stops.delete(key)||changed;
    if(changed)this.saveStops();
    this.flow.observe(event);
  }
  saveStops(){while(this.stops.size>400)this.stops.delete(this.stops.keys().next().value);void this.flow.saveCheckpoint(this.flow.checkpointState()).catch(()=>{this.persistenceError=true;this.flow.pause('Не удалось сохранить остановку ревью. Повторите после восстановления доступа к настройкам.','SEND_CHECKPOINT_ERROR');});}
  restore(checkpoint){for(const s of checkpoint?.reviewStops??[])if(typeof s.key==='string')this.stops.set(s.key,s);this.flow.restore(false,checkpoint);}
  dispose(){this.flow.dispose();}
}
