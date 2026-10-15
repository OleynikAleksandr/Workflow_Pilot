import {BACKEND_LIMITS} from '../contracts/backend.mjs';
import {createBackendEventLog} from './protocol.mjs';

const STREAM_BUFFER_BYTES=1024*1024;
const frame=(type,value)=>`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`;

// State events for any number of clients. Control changes are coalesced; a
// slow or broken stream is closed and resyncs, it never delays a writer.
export function createBackendEvents({bootGeneration,state,heartbeatMs=15000,coalesceMs=40}) {
  const log=createBackendEventLog({bootGeneration,state:state()});
  const streams=new Set();
  let timer=null,lastState=JSON.stringify(state());
  const publishState=()=>{
    timer=null;
    let next;try{next=state();}catch{return;}
    const serialized=JSON.stringify(next);
    if(serialized===lastState)return;
    lastState=serialized;
    try{log.publish('state',{},next);}catch{log.publish('state-error',{code:'BACKEND_STATE_INVALID'});}
  };
  const changed=()=>{if(timer===null){timer=setTimeout(publishState,coalesceMs);timer.unref?.();}};
  const heartbeat=setInterval(()=>{for(const stream of streams)stream.write(':\n\n');},heartbeatMs);heartbeat.unref?.();
  function open(req,res,{generation,afterSequence}) {
    let closed=false,unsubscribe=()=>{};
    const close=()=>{if(closed)return;closed=true;unsubscribe();streams.delete(stream);res.destroy();};
    const stream={write:text=>{
      if(closed)return;
      // Bounded per-client buffer: a reader that cannot keep up must resync.
      if(res.writableLength+text.length>STREAM_BUFFER_BYTES){close();return;}
      res.write(text);
    },close};
    res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-accel-buffering':'no'});
    res.flushHeaders?.();
    streams.add(stream);
    req.on('close',close);res.on('error',close);
    const send=event=>stream.write(frame('event',event));
    if(afterSequence!==null) {
      const result=log.subscribeSince({generation,afterSequence,listener:send});
      if(result.status==='subscribed'){unsubscribe=result.unsubscribe;return stream;}
    }
    // Snapshot and registration happen synchronously, so no event falls between.
    const subscription=log.snapshotAndSubscribe(send);unsubscribe=subscription.unsubscribe;
    stream.write(frame('snapshot',subscription.snapshot));
    return stream;
  }
  return Object.freeze({open,changed,
    operation:view=>log.publish('operation',view),
    snapshot:()=>log.snapshot(),
    get clients(){return streams.size;},
    close(){clearInterval(heartbeat);if(timer)clearTimeout(timer);for(const stream of [...streams])stream.close();},
    limits:{events:BACKEND_LIMITS.pendingEvents,bufferBytes:STREAM_BUFFER_BYTES}});
}
