import {protocolError} from '../contracts/backend.mjs';

export const LEASE_RENEW_MS=10000;
export const LEASE_TTL_MS=45000;
const clientId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(value);

// One writer per backend boot. The lease is taken and released explicitly,
// renewed by its holder and expires after a missed renewal window. A takeover
// is explicit; any request of an older generation is refused.
export function createControlLease({bootGeneration,ttlMs=LEASE_TTL_MS,now=Date.now,onChange=()=>{}}) {
  let lease=null,generation=0,timer=null;
  const expired=()=>lease!==null&&lease.expiresAt<=now();
  const view=()=>{
    if(expired()){lease=null;}
    return lease?{generation:lease.generation,holder:lease.clientId,expiresAt:lease.expiresAt,ttlMs}:{generation:null,holder:null,expiresAt:null,ttlMs};
  };
  const changed=()=>{
    clearTimeout(timer);timer=null;
    if(lease){timer=setTimeout(()=>{if(expired()){lease=null;changed();}},Math.max(0,lease.expiresAt-now())+5);timer.unref?.();}
    try{onChange(view());}catch{ /* listeners never block the lease */ }
  };
  return Object.freeze({
    view,
    current:()=>{view();return lease?{generation:lease.generation,bootGeneration}:null;},
    acquire({clientId:id,takeover=false}) {
      if(!clientId(id)||typeof takeover!=='boolean')throw protocolError('BACKEND_ARGS_INVALID','Некорректные параметры операции.');
      view();
      if(lease&&lease.clientId!==id&&!takeover)
        throw protocolError('BACKEND_LEASE_HELD','Управление у другого окна Workflow Pilot. Возьмите его явно.');
      lease={generation:++generation,clientId:id,expiresAt:now()+ttlMs};changed();
      return view();
    },
    renew({clientId:id,leaseGeneration}) {
      view();
      if(!lease||lease.clientId!==id||lease.generation!==leaseGeneration)throw protocolError('BACKEND_LEASE_STALE','Право управления устарело.');
      lease.expiresAt=now()+ttlMs;changed();
      return view();
    },
    release({clientId:id,leaseGeneration}) {
      view();
      if(!lease||lease.clientId!==id||lease.generation!==leaseGeneration)return {released:false};
      lease=null;changed();
      return {released:true};
    },
    holder(){view();return lease?.clientId??null;},
    // Owner-side end of a client's control (a revoked remote device): no
    // generation from the client is needed and nothing else changes hands.
    revoke(id) {
      view();
      if(!lease||lease.clientId!==id)return {revoked:false};
      lease=null;changed();
      return {revoked:true};
    },
    dispose(){clearTimeout(timer);timer=null;},
  });
}
