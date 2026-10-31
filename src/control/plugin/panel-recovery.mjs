// Presence is sampled on the recipient's own backend page. An absent panel
// cannot drive the clock, and an empty message queue does not stop the clock.
const INTERVAL_MS=5000, CONFIRM_MS=10000;
const canClaim=(previous,source,now,doc)=>!previous || previous.documentId!==doc
  || (source==='backend' && previous.source==='agent' && now-previous.at>=60000);
const unknown=()=>({presence:'unknown',open_here:false});

export class PanelRecovery {
  constructor(communication,{attest,reopen}){
    this.c=communication;this.attest=attest;this.reopen=reopen;
    this.missing=new Map();this.inFlight=new Set();
    if(attest && reopen){
      this.timer=setInterval(()=>this.tick(),INTERVAL_MS);
      this.timer.unref?.();
    }
  }
  dispose(){clearInterval(this.timer);this.missing.clear();}
  context(runId,id){
    const c=this.c,run=c.runs.get(runId),member=run?.members[id];
    if(c.disposed||c.critical||!member||run.mode!=='workflow'||run.removed||member.removed
        ||!c.workflow.permitted(run,member)||run.grant.phase!=='running'||member.branch_conflict)return null;
    try{c.enrollment.current(member.target);}catch{return null;}
    const startup=c.startup.message(run,member.target.local_session_id);
    if(startup&&!startup.startup_complete)return null;
    const page=c.workflow.observe(member.target);
    if(!page?.sdkDocumentReady||!page.documentId||page.connectionError||page.manualStopped||page.legacySendUnknown)return null;
    return {run,member,page};
  }
  async sample(runId,id){
    const current=this.context(runId,id);
    if(!current){this.missing.delete(id);return unknown();}
    const {member,page}=current;
    let scan;
    try{scan=await this.attest?.(member.target);}catch{}
    const after=this.context(runId,id);
    if(!after || !scan?.incarnation || scan.stale || scan.browserSessionId!==member.target.local_session_id
        || scan.documentId!==page.documentId || after.page.documentId!==scan.documentId || after.member.generation!==member.generation){
      this.missing.delete(id);return unknown();
    }
    if(scan.presence!=='absent'){
      this.missing.delete(id);
      return {presence:scan.presence==='present'?'present':'unknown',open_here:false};
    }
    const key=[runId,member.generation,scan.incarnation,scan.documentId].join('/');
    let missing=this.missing.get(id);
    if(missing?.key!==key){missing={key,since:this.c.now()};this.missing.set(id,missing);}
    if(this.c.now()-missing.since<CONFIRM_MS)return unknown();
    return {presence:'absent',open_here:false,documentId:scan.documentId,key};
  }
  // Serialized in the existing WAL before Enter or an agent's open_here reply.
  claim(input){
    const current=this.context(input.run_id,input.participant_id);
    if(!current||current.page.documentId!==input.documentId||this.missing.get(input.participant_id)?.key!==input.key
        ||!canClaim(current.member.panel_reopen,input.source,this.c.now(),input.documentId) || this.c.workflow.livePanel(current.run,current.member))return false;
    current.member.panel_reopen={documentId:input.documentId,source:input.source,id:input.attempt,at:this.c.now()};
    this.c.event(current.run,'panel.reopen_requested',{participant_id:input.participant_id,source:input.source,document_id:input.documentId});
    return true;
  }
  release(input){
    const run=this.c.runs.get(input.run_id),member=run?.members[input.participant_id];
    if(!member || member.panel_reopen?.id!==input.attempt)return;
    delete member.panel_reopen;
    this.c.event(run,'panel.reopen_not_sent',{participant_id:member.id});
  }
  bound(run,member,panel){
    if(!member.panel_reopen||!panel.messageSupported||this.c.ownership.role(run,member,panel)!=='owner')return;
    delete member.panel_reopen;
    this.missing.delete(member.id);
    this.c.event(run,'panel.reopen_restored',{participant_id:member.id});
  }
  async check(runId,id,source){
    if(this.inFlight.has(id))return unknown();
    this.inFlight.add(id);
    try{
      const result=await this.sample(runId,id),current=this.context(runId,id);
      if(result.presence!=='absent'||!current||!canClaim(current.member.panel_reopen,source,this.c.now(),result.documentId))return {presence:result.presence,open_here:false};
      const input={run_id:runId,participant_id:id,documentId:result.documentId,key:result.key,attempt:this.c.makeId(),source};
      const claim=()=>this.c.mutate('panelReopenClaim',input);
      if(source==='agent')return {presence:'absent',open_here:await claim()};
      if(!current.page.canSend||current.page.busy||current.page.draftPresent)return result;
      const allowed=()=>{
        const live=this.context(runId,id);
        return !!live&&live.page.documentId===input.documentId && !live.page.busy
          && (canClaim(live.member.panel_reopen,source,this.c.now(),input.documentId)||live.member.panel_reopen.id===input.attempt)
          && !this.c.workflow.livePanel(live.run,live.member);
      };
      // Check again at the composer boundary; a natural remount wins the race.
      const sent=await this.reopen(current.member.target,input.documentId,allowed,async()=>{
        const fresh=await this.sample(runId,id);
        return fresh.presence==='absent'&&fresh.key===input.key&&allowed()&&await claim();
      });
      if(sent?.state==='not-sent' && this.c.runs.get(runId)?.members[id]?.panel_reopen?.id===input.attempt)
        await this.c.mutate('panelReopenRelease',input);
      return result;
    }finally{this.inFlight.delete(id);}
  }
  tick(){
    const checks=[];
    for(const run of this.c.runs.values())for(const member of Object.values(run.members)){
      if(this.context(run.id,member.id))checks.push(this.check(run.id,member.id,'backend'));
      else this.missing.delete(member.id);
    }
    return Promise.allSettled(checks);
  }
}
