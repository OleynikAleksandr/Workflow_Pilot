// Bounded trace of host identities seen by panel and model calls during this
// backend boot. Only an 8-character identity hash prefix, the names of host
// _meta keys, the call source, the panel instance and its delivery role are
// kept: never metadata values, texts, tickets or secrets.
const KEY_NAME=/^[A-Za-z0-9_./:-]{1,64}$/;
const UUID=/^[0-9a-f-]{36}$/i;
export const IDENTITY_SOURCES=Object.freeze(['panel-recover','panel-bind','model-panel','model-read','model-yield','model-call']);

export function metaKeyNames(value){
  return Array.isArray(value)?[...new Set(value.filter(key=>typeof key==='string'&&KEY_NAME.test(key)))].sort().slice(0,32):[];
}

export class IdentityTrace {
  constructor({now=Date.now,journal=null,limit=500}={}){Object.assign(this,{now,journal,limit});this.entries=[];}
  record(type,{identity=null,source,input={},role=null,participants=null}){
    if(!IDENTITY_SOURCES.includes(source))source='model-call';
    const entry={event_type:type,time:new Date(this.now()).toISOString(),source,
      identity_prefix:typeof identity==='string'&&/^[0-9a-f]{64}$/.test(identity)?identity.slice(0,8):null,
      panel_instance_id:typeof input?.panel_instance_id==='string'&&UUID.test(input.panel_instance_id)?input.panel_instance_id:null,
      delivery_role:role==='owner'||role==='observer'?role:null,meta_keys:metaKeyNames(input?.meta_keys),
      ...(Number.isSafeInteger(participants)?{participants}:{})};
    this.entries.push(entry);
    if(this.entries.length>this.limit)this.entries.splice(0,this.entries.length-this.limit);
    try{this.journal?.record?.(type,{...entry,event_type:undefined,time:undefined,meta_keys:entry.meta_keys.join(',')});}catch{/* Diagnostics never block delivery. */}
    return entry;
  }
  // Records of this boot within [since, now]; callers pass their run start.
  since(time){return this.entries.filter(e=>!time||e.time>=time).map(e=>({...e,meta_keys:[...e.meta_keys]}));}
}
