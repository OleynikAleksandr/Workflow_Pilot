import {BACKEND_LIMITS} from '../contracts/backend.mjs';
import {createBackendEventLog} from './protocol.mjs';

const STREAM_BUFFER_BYTES=4*1024*1024;
const UI_STATE_BYTES=1024*1024;
const frame=(type,value)=>`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`;

// State events for any number of clients. Control changes are coalesced; a
// slow or broken stream is closed and resyncs, it never delays a writer.
export function createBackendEvents({bootGeneration,state,heartbeatMs=15000,coalesceMs=40,onStreams=()=>{}}) {
  const log=createBackendEventLog({bootGeneration,state:state()});
  const streams=new Set();
  const counted=()=>{try{onStreams(streams.size);}catch{ /* diagnostics never block streams */ }};
  // Desktop UI state is a latest value, not history: every stream gets the
  // current one on connect and each change; nothing large is retained.
  const ui=new Map();
  const setUi=(kind,value)=>{
    let serialized;
    try{serialized=JSON.stringify(value);}catch{return false;}
    if(new TextEncoder().encode(serialized).byteLength>UI_STATE_BYTES||ui.get(kind)===serialized)return false;
    ui.set(kind,serialized);
    const text=`event: ui\ndata: {"kind":${JSON.stringify(kind)},"value":${serialized}}\n\n`;
    for(const stream of streams)stream.write(text);
    return true;
  };
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
  function open(req,res,{generation,afterSequence,clientId=null,remote=false}) {
    let closed=false,unsubscribe=()=>{};
    const close=()=>{if(closed)return;closed=true;unsubscribe();streams.delete(stream);res.destroy();counted();};
    const stream={clientId,remote,write:text=>{
      if(closed)return;
      // Bounded per-client buffer: a reader that cannot keep up must resync.
      if(res.writableLength+text.length>STREAM_BUFFER_BYTES){close();return;}
      res.write(text);
    },close};
    res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-accel-buffering':'no'});
    res.flushHeaders?.();
    streams.add(stream);counted();
    req.on('close',close);res.on('error',close);
    const send=event=>stream.write(frame('event',event));
    if(afterSequence!==null) {
      const result=log.subscribeSince({generation,afterSequence,listener:send});
      if(result.status==='subscribed'){
        unsubscribe=result.unsubscribe;
        for(const [kind,serialized] of ui)stream.write(`event: ui\ndata: {"kind":${JSON.stringify(kind)},"value":${serialized}}\n\n`);
        return stream;
      }
    }
    // Snapshot and registration happen synchronously, so no event falls between.
    const subscription=log.snapshotAndSubscribe(send);unsubscribe=subscription.unsubscribe;
    stream.write(frame('snapshot',subscription.snapshot));
    for(const [kind,serialized] of ui)stream.write(`event: ui\ndata: {"kind":${JSON.stringify(kind)},"value":${serialized}}\n\n`);
    return stream;
  }
  const browserTypes=new Set(['document','file-chooser','page-opened','page-closed','download-ready','download-failed','presentation-error']);
  const uiTypes=new Set(['open-archive','close-archive','open-colors','theme','layout','focus']);
  return Object.freeze({open,changed,
    ui:setUi,
    // Requests to a client window (open archive, colours, focus, layout). They
    // are addressed: to: a clientId (the initiator), 'local' (Mac windows) or
    // 'all'. Not part of the replayed sequence: a reconnecting window does not
    // reopen an old archive.
    uiCommand:(type,data={},{to='all'}={})=>{
      if(!uiTypes.has(type))return 0;
      const text=frame('command',{type:'ui.'+type,data});let sent=0;
      for(const stream of streams)
        if(to==='all'||(to==='local'&&!stream.remote)||(to!=='local'&&to!=='all'&&stream.clientId===to)){stream.write(text);sent++;}
      return sent;
    },
    clientConnected:clientId=>[...streams].some(stream=>stream.clientId===clientId),
    operation:view=>log.publish('operation',view),
    // Browser notifications carry ids and generations only, never page content.
    browser:(type,data)=>{if(browserTypes.has(type))log.publish('browser.'+type,data);},
    snapshot:()=>log.snapshot(),
    // A revoked device: its open streams end at once.
    closeClient:clientId=>{for(const stream of [...streams])if(stream.clientId===clientId)stream.close();},
    get clients(){return streams.size;},
    get localClients(){return [...streams].filter(stream=>!stream.remote).length;},
    close(){clearInterval(heartbeat);if(timer)clearTimeout(timer);for(const stream of [...streams])stream.close();},
    limits:{events:BACKEND_LIMITS.pendingEvents,bufferBytes:STREAM_BUFFER_BYTES}});
}
