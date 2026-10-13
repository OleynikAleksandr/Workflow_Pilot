const owner=p=>p?.workspace && p?.sessionId && p?.chatUrl ? JSON.stringify([p.workspace,p.sessionId,p.chatUrl]):null;
// Shared by both automations. Scope changes must not make an already-used conversation pause new.
export class AutomationSendState {
  constructor({save=async()=>{}}={}){this.save=save;this.entries=new Map();this.cycles=new Map();this.inFlight=false;}
  restore(data) {
    for(const e of data?.entries??[])if(typeof e.key==='string' && ['sending','sent'].includes(e.status))this.entries.set(e.key,e);
    for(const c of data?.cycles??[])if(typeof c.key==='string' && Number.isSafeInteger(c.generation))this.cycles.set(c.key,c);
  }
  observe(selected,event) {
    const key=owner(selected),p=event.state;
    if(!key || event.reset || !p || p.url!==selected.chatUrl)return;
    const old=this.cycles.get(key)??{key,generation:0,busy:false};
    const next={...old,key,generation:old.generation+(p.busy&&!old.busy?1:0),busy:!!p.busy,
      documentId:event.documentId??old.documentId,manualStopRevision:p.manualStopRevision??0,manualSendRevision:p.manualSendRevision??0};
    if((p.manualStopRevision??0)>(old.documentId===next.documentId?(old.manualStopRevision??0):0))
      next.stop={userTurnId:p.userTurnId??null};
    if(next.stop&&((p.userTurnId&&p.userTurnId!==next.stop.userTurnId)
      ||old.documentId===next.documentId&&(p.manualSendRevision??0)>(old.manualSendRevision??0)))delete next.stop;
    this.cycles.set(key,next);
    if(JSON.stringify(old.stop)!==JSON.stringify(next.stop)||this.persistenceError)
      this.stopSave=this.persist().then(()=>{this.persistenceError=false;},()=>{this.persistenceError=true;});
  }
  blocked(selected){return this.persistenceError||!!this.cycles.get(owner(selected))?.stop;}
  key(selected,page){const k=owner(selected);return k && JSON.stringify([k,page?.turnId || 'cycle:'+(this.cycles.get(k)?.generation??0)]);}
  async persist(){
    while(this.entries.size>400)this.entries.delete(this.entries.keys().next().value);
    while(this.cycles.size>400)this.cycles.delete(this.cycles.keys().next().value);
    await this.save({version:1,entries:[...this.entries.values()],cycles:[...this.cycles.values()]});
  }
  async send({selected,page,ready,perform,kind='plan'}) {
    await this.stopSave;
    if(this.blocked(selected))return {state:'cancelled',reason:this.persistenceError?'SEND_CHECKPOINT_ERROR':'MANUAL_STOP'};
    const key=this.key(selected,page);
    if(!key || this.inFlight)return {state:'cancelled',reason:'AUTOMATION_BUSY'};
    const previous=this.entries.get(key);
    // Keep AutoPlan's existing new-scope contract; the cross-automation handoff consumes the pause.
    if(previous && !(kind==='plan' && previous.kind==='plan' && previous.status==='sent' && previous.scopeId!==selected.scopeId))
      return {state:'unknown',reason:'PAUSE_CONSUMED'};
    this.inFlight=true;
    try {
      if(!ready())return {state:'cancelled'};
      this.entries.set(key,{key,status:'sending',kind,scopeId:selected.scopeId});
      try {await this.persist();}
      catch(error){if(previous)this.entries.set(key,previous);else this.entries.delete(key);throw error;}
      const result=ready()?await perform():{state:'cancelled'};
      if(result.state==='sent')this.entries.set(key,{key,status:'sent',kind,scopeId:selected.scopeId});
      else if(result.state!=='unknown'){if(previous)this.entries.set(key,previous);else this.entries.delete(key);}
      await this.persist();return result;
    } finally {this.inFlight=false;}
  }
}
