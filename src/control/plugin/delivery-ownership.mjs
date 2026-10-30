import {deliveryView} from '../../contracts/plugin-communication.mjs';

const ATTESTED_OPERATIONS=new Set(['bind','sync','claim','claimReady','verify']);
const ATTEST_TIMEOUT_MS=2500;
// Only the panel attested by Execution inside the participant's own backend page
// delivers. A client's claims (role, user agent, order of connection) are ignored.
// Panels and attestations live in memory: after restart every panel binds again.
export class DeliveryOwnership {
  constructor(communication,attest=null){
    this.c=communication;this.attestPort=attest;this.attestations=new Map();this.owners=new Map();this.sequence=0;
  }
  // Runs before the transaction queue: Execution reads frames of a live page.
  async prefetch(name,input){
    if(!ATTESTED_OPERATIONS.has(name)||!this.attestPort)return;
    const run=this.c.runs.get(input?.run_id),member=run?.mode==='workflow'&&Object.values(run.members).find(m=>m.id===input.participant_id);
    if(!member?.target?.local_session_id)return;
    let timer;
    try{
      // The frame hint lets an isolated host fixture model its own mounted panel;
      // Execution reads the page itself and never trusts it.
      const value=await Promise.race([Promise.resolve(this.attestPort(member.target,{frame_instance_id:input.frame_instance_id??null})),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ATTEST_TIMEOUT_MS);timer.unref?.();})]);
      if(value&&!value.stale&&Array.isArray(value.frames))this.attestations.set(member.target.local_session_id,{
        documentId:value.documentId??null,incarnation:value.incarnation??null,
        frames:new Set(value.frames.map(f=>f?.frame_instance_id).filter(id=>typeof id==='string').map(id=>id.toLowerCase()))});
      else if(value)this.attestations.delete(member.target.local_session_id);
    }catch{this.attestations.delete(member.target.local_session_id);}
    finally{clearTimeout(timer);}
  }
  bound(panel,input){
    panel.frameId=typeof input.frame_instance_id==='string'&&/^[0-9a-f-]{36}$/i.test(input.frame_instance_id)?input.frame_instance_id.toLowerCase():null;
    panel.boundSequence=++this.sequence;
  }
  // The attestation is valid only for the document the backend page shows now.
  current(member){
    const value=this.attestations.get(member.target.local_session_id);
    return value&&value.documentId===(this.c.workflow.observe(member.target)?.documentId??null)?value:null;
  }
  // The newest bound panel of the newest attested frame owns delivery. The same
  // frame keeps its generation across repeated recover (a new panel instance).
  owner(run,member){
    const key=run.id+':'+member.id,attested=this.current(member);
    const panels=[...this.c.panels.values()].filter(p=>p.runId===run.id&&p.memberId===member.id&&p.identity===member.identity
      &&p.frameId&&attested?.frames.has(p.frameId)).sort((a,b)=>b.boundSequence-a.boundSequence);
    const panel=panels[0]??null,previous=this.owners.get(key);
    const identity=panel?[panel.frameId,attested.documentId,attested.incarnation].join(':'):null;
    if(identity&&previous?.identity!==identity)this.owners.set(key,{identity,generation:(previous?.generation??0)+1});
    else if(!identity&&previous?.identity)this.owners.set(key,{identity:null,generation:previous.generation});
    return {panel,generation:this.owners.get(key)?.generation??0};
  }
  role(run,member,panel){return panel&&this.owner(run,member).panel?.id===panel.id?'owner':'observer';}
  view(run,member,panel){const {generation}=this.owner(run,member);return deliveryView(this.role(run,member,panel),generation);}
  snapshot(){return new Map([...this.owners].map(([key,value])=>[key,{...value}]));}
  restore(owners){this.owners=owners;}
  forget(sessionIds){for(const id of sessionIds)this.attestations.delete(id);}
}
