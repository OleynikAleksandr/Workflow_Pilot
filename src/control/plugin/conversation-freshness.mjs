// The backend page sends only from a document that reflects the conversation
// as it is now, including turns made on other clients. A document is fresh
// while it shows a running turn, while it was first observed recently, or for
// its first claim after Control reloaded it for freshness. Otherwise Control
// defers the claim (no attempt, no budget) and reloads the canonical chatUrl.
export const FRESH_DOCUMENT_MS=20000;
export const MAX_FRESHNESS_RELOADS=3;
const MANUAL_INPUT_QUIET_MS=10000;
const FOREIGN_TURN_MS=15000,FOREIGN_RETRY_MAX_MS=5*60*1000;
const HOLD_MS=1000;
export const FRESHNESS_REASONS=Object.freeze({reload:'freshness-reload',draft:'freshness-conflict-draft',
  turnEnd:'awaiting-turn-end',deferred:'freshness-reload-deferred',unavailable:'freshness-unavailable'});

export class ConversationFreshness {
  constructor(communication,{reload=null}={}){this.c=communication;this.reloadPort=reload;this.pages=new Map();}
  get enabled(){return typeof this.reloadPort==='function';}
  // In-memory per backend page: a restart observes every document anew.
  state(target,page){
    const key=target.local_session_id,now=this.c.now(),documentId=page?.documentId??null;
    let s=this.pages.get(key);
    if(!s){s={documentId,since:page?.documentSince??now,claims:0,reloadedByControl:false,consecutive:0,lastReloadAt:0,
      requestedFrom:null,manualRevision:page?.manualInputRevision??0,manualAt:0,holdUntil:0};this.pages.set(key,s);}
    if(s.documentId!==documentId){
      const requested=s.requestedFrom!==null&&s.requestedFrom===s.documentId;
      Object.assign(s,{documentId,since:page?.documentSince??now,claims:0,reloadedByControl:requested,requestedFrom:null});
    }
    if((page?.manualInputRevision??0)!==s.manualRevision){s.manualRevision=page?.manualInputRevision??0;s.manualAt=now;s.consecutive=0;}
    return s;
  }
  fresh(s,page){
    const now=this.c.now();
    return page?.busy===true||now-s.since<=FRESH_DOCUMENT_MS||s.reloadedByControl&&s.claims===0;
  }
  held(target){return this.enabled&&(this.pages.get(target.local_session_id)?.holdUntil??0)>this.c.now();}
  holdDelay(target){const until=this.pages.get(target.local_session_id)?.holdUntil??0;return until>this.c.now()?until-this.c.now():Infinity;}
  // Reasons a reload must not happen now. None of them creates an attempt.
  reloadBlock(run,member,page,s){
    if(page?.draftPresent)return FRESHNESS_REASONS.draft;
    if(run.messages.some(m=>m.recipient_id===member.id&&m.delivery==='claimed'))return FRESHNESS_REASONS.deferred;
    // Without native turn identities a confirmation cannot move to a new document.
    if(this.openBaseline(run,member)&&page?.turnIdentitySource!=='native')return FRESHNESS_REASONS.turnEnd;
    if(s.manualAt&&this.c.now()-s.manualAt<MANUAL_INPUT_QUIET_MS)return FRESHNESS_REASONS.deferred;
    return null;
  }
  // A handled turn whose end is not confirmed yet: its baseline belongs to this
  // document. A delivered message without yield has no confirmation to lose.
  openBaseline(run,member){
    return run.messages.some(m=>m.recipient_id===member.id&&m.dialogue_version===1&&!m.reply_observed&&!m.superseded
      &&m.yielded?.page);
  }
  blockReason(run,member,message,page){
    if(!this.enabled||message.kind==='startup-context')return null;
    const s=this.state(member.target,page);
    if(this.fresh(s,page))return null;
    const now=this.c.now();s.holdUntil=now+HOLD_MS;
    const blocked=this.reloadBlock(run,member,page,s);
    if(blocked)return blocked;
    // A reload of this window is still loading; only then is the limit decided.
    if(now-s.lastReloadAt<FRESH_DOCUMENT_MS)return FRESHNESS_REASONS.reload;
    if(s.consecutive>=MAX_FRESHNESS_RELOADS)return FRESHNESS_REASONS.unavailable;
    s.lastReloadAt=now;s.consecutive++;s.requestedFrom=s.documentId;
    const target=structuredClone(member.target);
    // The reload is a page operation outside the transaction; it never creates an attempt.
    queueMicrotask(()=>{Promise.resolve(this.reloadPort(target)).then(result=>{
      if(result?.reloaded===false&&s.requestedFrom===s.documentId){s.requestedFrom=null;s.lastReloadAt=0;s.consecutive=Math.max(0,s.consecutive-1);}
    },()=>{s.requestedFrom=null;});});
    this.c.event(run,'freshness.reload',{participant_id:member.id,message_id:message.message_id,attempt:s.consecutive});
    return FRESHNESS_REASONS.reload;
  }
  // A turn confirmation moves to a new document only across this page's own
  // reload (Control or renderer recovery), never across any other change.
  transferable(baselineDocumentId,page){
    return !!baselineDocumentId&&page?.documentId!==baselineDocumentId
      &&Array.isArray(page?.reloadedFrom?.lineage)&&page.reloadedFrom.lineage.includes(baselineDocumentId);
  }
  // A handled turn the backend page never showed: it ran on another client.
  // Reload to see its end; repeat 20, 40, 80 s … up to 5 minutes while open.
  foreignTurn(run,member,message,gate,page){
    if(!this.enabled||page?.turnIdentitySource!=='native')return false;
    const now=this.c.now(),retry=gate.foreign_reload;
    if(!retry&&now-message.yielded.at<FOREIGN_TURN_MS)return false;
    if(retry&&now<retry.next_at)return false;
    const s=this.state(member.target,page);
    if(page.draftPresent||run.messages.some(m=>m.recipient_id===member.id&&m.delivery==='claimed')
      ||s.manualAt&&now-s.manualAt<MANUAL_INPUT_QUIET_MS)return false;
    const count=(retry?.count??0)+1;
    gate.foreign_reload={count,next_at:now+Math.min(FOREIGN_RETRY_MAX_MS,FRESH_DOCUMENT_MS*2**(count-1))};
    s.lastReloadAt=now;s.requestedFrom=s.documentId;
    const target=structuredClone(member.target);
    queueMicrotask(()=>{Promise.resolve(this.reloadPort(target)).catch(()=>{});});
    this.c.event(run,'freshness.reload',{participant_id:member.id,message_id:message.message_id,reason:'foreign-turn',attempt:count});
    return true;
  }
  claimed(member,page){const s=this.state(member.target,page);s.claims++;s.consecutive=0;s.holdUntil=0;}
  forget(sessionIds){for(const id of sessionIds)this.pages.delete(id);}
}
