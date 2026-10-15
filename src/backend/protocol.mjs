// Backend-only transport rules. Transport adapters in T005 will use these
// contracts; this module does not open a port, browser, store or MCP service.
import {createHash,timingSafeEqual} from 'node:crypto';
import {
  BACKEND_API_VERSION,BACKEND_LIMITS,BACKEND_OPERATIONS,PLUGIN_ACTION_CLASS,
  protocolError,validateCommand,validateEvent,validateSnapshot,wireCopy,
} from '../contracts/backend.mjs';

const bounded = (n,min,max) => Number.isSafeInteger(n) && n>=min && n<=max;
const stable = value => Array.isArray(value)?value.map(stable)
  : value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;

export function checkBackendCompatibility(handshake, {identity,apiVersion=BACKEND_API_VERSION}={}) {
  if(handshake.apiVersion!==apiVersion)throw protocolError('BACKEND_VERSION_INCOMPATIBLE');
  if(handshake.identity!==identity)throw protocolError('BACKEND_IDENTITY_MISMATCH');
  if(!handshake.bootGeneration)throw protocolError('BACKEND_HANDSHAKE_INVALID');
  return handshake.bootGeneration;
}

// Transport-neutral check, also used for WebSocket upgrades. No token in URL,
// no wildcard CORS, and no implicit trust of same-machine web pages.
export function authorizeLoopback({host,origin,authorization},{port,token,allowedOrigins=[]}) {
  if(!bounded(port,1,65535) || typeof token!=='string' || token.length<16)
    throw protocolError('BACKEND_AUTH_CONFIG');
  if(host!==`127.0.0.1:${port}` && host!==`localhost:${port}`)
    throw protocolError('BACKEND_ACCESS_DENIED');
  if(origin!==undefined && origin!==null && !allowedOrigins.includes(origin))
    throw protocolError('BACKEND_ACCESS_DENIED');
  const supplied=Buffer.from(typeof authorization==='string'?authorization:'');
  const expected=Buffer.from('Bearer '+token);
  if(supplied.length!==expected.length || !timingSafeEqual(supplied,expected))
    throw protocolError('BACKEND_ACCESS_DENIED');
  return true;
}

export function verifyControlLease(command,lease) {
  const checked=validateCommand(command),operationClass=BACKEND_OPERATIONS[checked.operation];
  if(operationClass==='read' || checked.operation==='control.acquire')return true;
  if(!lease || !bounded(lease.generation,0,Number.MAX_SAFE_INTEGER)
    || checked.leaseGeneration!==lease.generation
    || checked.bootGeneration!==lease.bootGeneration)
    throw protocolError('BACKEND_LEASE_STALE');
  return true;
}

// Plugin UI commands go through the same writer lease as desktop mutations.
// The independent agent MCP channel does not acquire or depend on that lease.
export function pluginPermission(action) {
  if(!Object.hasOwn(PLUGIN_ACTION_CLASS,action))throw protocolError('PLUGIN_ACTION_INVALID');
  return PLUGIN_ACTION_CLASS[action];
}

export function createBackendEventLog({bootGeneration,limit=BACKEND_LIMITS.pendingEvents,state={}}) {
  if(typeof bootGeneration!=='string'||!bootGeneration || !bounded(limit,1,BACKEND_LIMITS.pendingEvents))
    throw protocolError('BACKEND_EVENT_LOG_CONFIG');
  let sequence=0,revision=0,current=wireCopy(state),events=[];
  const listeners=new Map();
  const snapshot=()=>validateSnapshot({bootGeneration,sequence,revision,state:current});
  function publish(type,data={},nextState) {
    if(nextState!==undefined){current=wireCopy(nextState);revision++;}
    const event=validateEvent({bootGeneration,sequence:++sequence,revision,type,data});
    events.push(event);if(events.length>limit)events.shift();
    for(const [listener,subscriber] of [...listeners]){
      if(subscriber.replaying){subscriber.pending.push(event);continue;}
      try{listener(wireCopy(event));}catch{ /* listener faults never stop backend writers */ }
    }
    return event;
  }
  function subscribeSince({generation=bootGeneration,afterSequence,listener}) {
    if(typeof listener!=='function' || !bounded(afterSequence,0,Number.MAX_SAFE_INTEGER))
      throw protocolError('BACKEND_SUBSCRIPTION_INVALID');
    if(generation!==bootGeneration || afterSequence>sequence || afterSequence < (events[0]?.sequence??sequence+1)-1)
      return {status:'resync',snapshot:snapshot(),unsubscribe:()=>{}};
    // Register first, then synchronously replay. No asynchronous gap between
    // snapshot and subscription; consumers dedupe by event.sequence.
    const replay=events.filter(event=>event.sequence>afterSequence);
    const subscriber={replaying:true,pending:[]};
    listeners.set(listener,subscriber);
    for(const event of replay){
      try{listener(wireCopy(event));}catch{ /* stale subscriber cannot interrupt replay */ }
    }
    while(subscriber.pending.length)for(const event of subscriber.pending.splice(0)){
      try{listener(wireCopy(event));}catch{ /* same boundary */ }
    }
    subscriber.replaying=false;
    return {status:'subscribed',unsubscribe:()=>listeners.delete(listener)};
  }
  function snapshotAndSubscribe(listener) {
    if(typeof listener!=='function')throw protocolError('BACKEND_SUBSCRIPTION_INVALID');
    listeners.set(listener,{replaying:false,pending:[]});
    return {snapshot:snapshot(),unsubscribe:()=>listeners.delete(listener)};
  }
  return Object.freeze({snapshot,publish,subscribeSince,snapshotAndSubscribe});
}

function requestDigest(request) {
  // requestId is not a dedup discriminator of the arguments. Include the
  // precise operation, server generation, revision and lease generation.
  return createHash('sha256').update(JSON.stringify(stable({
    operation:request.operation,args:request.args,bootGeneration:request.bootGeneration,
    revision:request.revision??null,leaseGeneration:request.leaseGeneration??null,
  }))).digest('hex');
}

// lookup and acceptIfAbsent are owned by durable Control/Execution storage.
// acceptIfAbsent MUST atomically return {inserted:boolean,record:storedRecord};
// the server MUST await it before invoking the real operation.
// This registry intentionally does not execute or retry any operation.
export async function registerBackendCommand(command,{bootGeneration,lookup,acceptIfAbsent}) {
  const request=validateCommand(command);
  if(request.bootGeneration!==bootGeneration)throw protocolError('BACKEND_BOOT_STALE');
  if(typeof lookup!=='function'||typeof acceptIfAbsent!=='function')
    throw protocolError('BACKEND_JOURNAL_REQUIRED');
  const fingerprint=requestDigest(request);
  const previous=await lookup(request.requestId);
  const decision=record=>{
    if(!record || record.requestId!==request.requestId || typeof record.operationId!=='string')
      throw protocolError('BACKEND_JOURNAL_UNCERTAIN');
    if(record.bootGeneration!==bootGeneration || record.status==='unknown')
      return {status:'unknown',requestId:request.requestId,operationId:record.operationId};
    if(record.fingerprint!==fingerprint)throw protocolError('BACKEND_REQUEST_CONFLICT');
    return wireCopy({status:'existing',requestId:request.requestId,operationId:record.operationId});
  };
  if(previous!==undefined && previous!==null)return decision(previous);
  // The ID is unique to a request and generation. On partial failure the
  // durable record, not a local Map, decides whether it can run.
  const operationId='op:'+createHash('sha256').update(bootGeneration+'\u0000'+request.requestId).digest('hex').slice(0,40);
  const accepted=wireCopy({requestId:request.requestId,operationId,
    fingerprint,bootGeneration,status:'accepted'});
  const receipt=await acceptIfAbsent(accepted);
  if(!receipt || typeof receipt.inserted!=='boolean' || !receipt.record)
    throw protocolError('BACKEND_JOURNAL_UNCERTAIN');
  if(!receipt.inserted)return decision(receipt.record);
  if(receipt.record.requestId!==request.requestId || receipt.record.operationId!==operationId
    || receipt.record.fingerprint!==fingerprint || receipt.record.bootGeneration!==bootGeneration
    || receipt.record.status!=='accepted')throw protocolError('BACKEND_JOURNAL_UNCERTAIN');
  return {status:'accepted',requestId:request.requestId,operationId};
}

export function validateBackendQueue({pendingCommands,pendingEvents,chunkBytes}) {
  if(!bounded(pendingCommands,0,BACKEND_LIMITS.pendingCommands)
    || !bounded(pendingEvents,0,BACKEND_LIMITS.pendingEvents)
    || !bounded(chunkBytes,0,BACKEND_LIMITS.transferChunkBytes))
    throw protocolError('BACKEND_QUEUE_LIMIT');
  return true;
}
