import http from 'node:http';
import {authorizeLoopback} from './protocol.mjs';
import {BACKEND_API_VERSION,BACKEND_LIMITS,protocolError,validateHandshake,validateResult} from '../contracts/backend.mjs';

const STATUS={BACKEND_ACCESS_DENIED:403,BACKEND_MESSAGE_SIZE:413,BACKEND_BOOT_STALE:409,BACKEND_LEASE_STALE:409,
  BACKEND_LEASE_REQUIRED:409,BACKEND_REQUEST_CONFLICT:409,BACKEND_QUEUE_LIMIT:429,BACKEND_ROUTE_NOT_FOUND:404,
  BACKEND_OPERATION_NOT_FOUND:404,BACKEND_OPERATION_NOT_AVAILABLE:404,BACKEND_JOURNAL_UNCERTAIN:503};
const MESSAGES={BACKEND_ACCESS_DENIED:'Доступ запрещён.',BACKEND_BOOT_STALE:'Backend перезапущен. Обновите состояние.',
  BACKEND_LEASE_STALE:'Право управления устарело.',BACKEND_LEASE_REQUIRED:'Нужно право управления.',
  BACKEND_REQUEST_CONFLICT:'requestId уже использован для другой операции.',BACKEND_QUEUE_LIMIT:'Backend занят. Повторите позже.',
  BACKEND_OPERATION_NOT_AVAILABLE:'Операция пока недоступна.'};
const codeOf=error=>typeof error?.code==='string'&&/^BACKEND_|^BROWSER_|^PLUGIN_/.test(error.code)?error.code:'BACKEND_UNAVAILABLE';

function readJson(req) {
  return new Promise((resolve,reject)=>{
    if(!/^application\/json(;|$)/.test(req.headers['content-type']??''))return reject(protocolError('BACKEND_MESSAGE_INVALID'));
    const declared=Number(req.headers['content-length']);
    if(Number.isFinite(declared)&&declared>BACKEND_LIMITS.messageBytes)return reject(protocolError('BACKEND_MESSAGE_SIZE'));
    let size=0;const chunks=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>BACKEND_LIMITS.messageBytes){req.removeAllListeners('data');req.resume();reject(protocolError('BACKEND_MESSAGE_SIZE'));}
      else chunks.push(chunk);
    });
    req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(protocolError('BACKEND_MESSAGE_INVALID'));}});
    req.on('error',reject);
  });
}

// Loopback HTTP API. Every request, including the event stream, carries the
// bearer token in a header and passes the exact Host/Origin check first.
export async function startBackendServer({claim,identity='workflow-pilot',readiness=()=>'ready',
  capabilities={},operations,events,status,allowedOrigins=[],extra=null}) {
  const respond=(res,code,value)=>{
    if(res.headersSent)return res.destroy();
    const body=Buffer.from(JSON.stringify(value));
    res.writeHead(code,{'content-type':'application/json; charset=utf-8','content-length':body.length,'cache-control':'no-store'});
    res.end(body);
  };
  const fail=(res,error)=>{
    const code=codeOf(error);
    respond(res,STATUS[code]??(/_INVALID$|_ARGS/.test(code)?400:503),{error:{code,message:MESSAGES[code]??'Операция недоступна.'}});
  };
  const handshake=()=>validateHandshake({apiVersion:BACKEND_API_VERSION,identity,bootGeneration:claim.generation,
    capabilities:{commands:true,events:true,...capabilities},readiness:readiness()});
  const route=async(req,res,url)=>{
    if(req.method==='GET'&&url.pathname==='/v1/handshake')return respond(res,200,handshake());
    if(req.method==='GET'&&url.pathname==='/v1/status')return respond(res,200,status());
    if(req.method==='GET'&&url.pathname==='/v1/snapshot')return respond(res,200,events.snapshot());
    if(req.method==='GET'&&url.pathname==='/v1/events') {
      const after=url.searchParams.get('after');
      if(after!==null&&!/^\d{1,15}$/.test(after))throw protocolError('BACKEND_SUBSCRIPTION_INVALID');
      return events.open(req,res,{generation:url.searchParams.get('generation')??claim.generation,afterSequence:after===null?null:Number(after)});
    }
    if(req.method==='POST'&&url.pathname==='/v1/commands') {
      const result=validateResult(await operations.submit(await readJson(req)));
      return respond(res,result.status==='accepted'?202:200,result);
    }
    const match=req.method==='GET'&&url.pathname.match(/^\/v1\/operations\/(op:[a-f0-9]{40})$/);
    if(match) {
      const view=operations.operation(match[1]);
      if(!view)throw protocolError('BACKEND_OPERATION_NOT_FOUND');
      return respond(res,200,view);
    }
    if(extra&&await extra(req,res,url)!==false)return;
    throw protocolError('BACKEND_ROUTE_NOT_FOUND');
  };
  const server=http.createServer(async(req,res)=>{
    try {
      authorizeLoopback(req.headers,{port:server.address().port,token:claim.token,allowedOrigins});
      await route(req,res,new URL(req.url,'http://127.0.0.1'));
    }catch(error){fail(res,error);}
  });
  // Slow or idle senders cannot hold the backend.
  Object.assign(server,{headersTimeout:5000,requestTimeout:10000,maxConnections:64});
  await new Promise((resolve,reject)=>{
    const onError=error=>reject(error);server.once('error',onError);
    server.listen(0,'127.0.0.1',()=>{server.off('error',onError);resolve();});
  });
  return Object.freeze({port:server.address().port,
    close:async()=>{events.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
}
