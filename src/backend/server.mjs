import http from 'node:http';
import {authorizeLoopback} from './protocol.mjs';
import {BACKEND_API_VERSION,BACKEND_LIMITS,protocolError,validateHandshake,validateResult} from '../contracts/backend.mjs';

const STATUS={BACKEND_ACCESS_DENIED:403,BACKEND_MESSAGE_SIZE:413,BACKEND_BOOT_STALE:409,BACKEND_LEASE_STALE:409,BACKEND_LEASE_HELD:409,
  BACKEND_LEASE_REQUIRED:409,BACKEND_REQUEST_CONFLICT:409,BACKEND_QUEUE_LIMIT:429,BACKEND_ROUTE_NOT_FOUND:404,
  BACKEND_OPERATION_NOT_FOUND:404,BACKEND_OPERATION_NOT_AVAILABLE:404,BACKEND_JOURNAL_UNCERTAIN:503,
  BROWSER_PAGE_NOT_FOUND:404,BACKEND_TRANSFER_NOT_FOUND:404,BROWSER_DOCUMENT_CHANGED:409,BROWSER_INPUT_REPLAY:409,
  BROWSER_CHOOSER_STALE:409,BROWSER_CHOOSER_SINGLE:409,BACKEND_TRANSFER_INCOMPLETE:409,BACKEND_TRANSFER_EXISTS:409,
  REMOTE_DEVICE_REQUIRED:401,REMOTE_DEVICE_REVOKED:401,REMOTE_PAIRING_EXPIRED:410,REMOTE_RATE_LIMIT:429,REMOTE_DISABLED:503};
const MESSAGES={BACKEND_ACCESS_DENIED:'Доступ запрещён.',BACKEND_BOOT_STALE:'Backend перезапущен. Обновите состояние.',
  BACKEND_LEASE_STALE:'Право управления устарело.',BACKEND_LEASE_HELD:'Управление у другого окна Workflow Pilot.',BACKEND_LEASE_REQUIRED:'Нужно право управления.',
  BACKEND_REQUEST_CONFLICT:'requestId уже использован для другой операции.',BACKEND_QUEUE_LIMIT:'Backend занят. Повторите позже.',
  BACKEND_OPERATION_NOT_AVAILABLE:'Операция пока недоступна.',REMOTE_DISABLED:'Доступ с других устройств выключен на компьютере.',
  REMOTE_OWNER_MISMATCH:'Подключение разрешено только через Tailscale владельца компьютера.',REMOTE_HOST_INVALID:'Неверный адрес.',
  REMOTE_ORIGIN_INVALID:'Запрос с чужой страницы отклонён.',REMOTE_DEVICE_REQUIRED:'Устройство не подключено. Подтвердите его на компьютере.',
  REMOTE_DEVICE_REVOKED:'Устройство отключено на компьютере.',REMOTE_PAIRING_EXPIRED:'Код подключения устарел. Начните заново.',
  REMOTE_RATE_LIMIT:'Слишком много попыток. Подождите минуту.'};
const codeOf=error=>error?.code==='SESSION_RUNTIME_RELEASED'?'BROWSER_PAGE_NOT_FOUND'
  :typeof error?.code==='string'&&/^BACKEND_|^BROWSER_|^PLUGIN_|^REMOTE_/.test(error.code)?error.code:'BACKEND_UNAVAILABLE';

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

export function respondJson(res,code,value) {
  if(res.headersSent)return res.destroy();
  const body=Buffer.from(JSON.stringify(value));
  res.writeHead(code,{'content-type':'application/json; charset=utf-8','content-length':body.length,'cache-control':'no-store'});
  res.end(body);
}
export function respondError(res,error) {
  const code=codeOf(error);
  respondJson(res,STATUS[code]??(/_INVALID$|_ARGS/.test(code)?400:/^REMOTE_/.test(code)?403:503),{error:{code,message:MESSAGES[code]??(typeof error?.publicMessage==='string'?error.publicMessage:'Операция недоступна.')}});
}

// The API routes shared by the loopback server (bearer) and the remote gateway
// (device cookie). context.clientId is set only by the gateway.
export function createApiRoute({claim,identity='workflow-pilot',readiness=()=>'ready',appVersion,capabilities={},operations,events,status,extra=null}) {
  const respond=respondJson;
  const handshake=()=>validateHandshake({apiVersion:BACKEND_API_VERSION,identity,bootGeneration:claim.generation,
    capabilities:{commands:true,events:true,...capabilities},readiness:readiness(),...appVersion?{appVersion}:{}});
  return async(req,res,url,context={})=>{
    if(req.method==='GET'&&url.pathname==='/v1/handshake')return respond(res,200,handshake());
    if(req.method==='GET'&&url.pathname==='/v1/status')return respond(res,200,status());
    if(req.method==='GET'&&url.pathname==='/v1/snapshot')return respond(res,200,events.snapshot());
    if(req.method==='GET'&&url.pathname==='/v1/events') {
      const after=url.searchParams.get('after'),client=url.searchParams.get('client');
      if(after!==null&&!/^\d{1,15}$/.test(after))throw protocolError('BACKEND_SUBSCRIPTION_INVALID');
      if(client!==null&&!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(client))throw protocolError('BACKEND_SUBSCRIPTION_INVALID');
      return events.open(req,res,{generation:url.searchParams.get('generation')??claim.generation,afterSequence:after===null?null:Number(after),
        clientId:context.clientId??client,remote:!!context.clientId});
    }
    if(req.method==='POST'&&url.pathname==='/v1/commands') {
      const result=validateResult(await operations.submit(await readJson(req),context));
      return respond(res,result.status==='accepted'?202:200,result);
    }
    const match=req.method==='GET'&&url.pathname.match(/^\/v1\/operations\/(op:[a-f0-9]{40})$/);
    if(match) {
      const view=operations.operation(match[1]);
      if(!view)throw protocolError('BACKEND_OPERATION_NOT_FOUND');
      return respond(res,200,view);
    }
    if(extra&&await extra(req,res,url,context)!==false)return;
    throw protocolError('BACKEND_ROUTE_NOT_FOUND');
  };
}

// Loopback HTTP API. Every request, including the event stream, carries the
// bearer token in a header and passes the exact Host/Origin check first.
export async function startBackendServer({claim,identity='workflow-pilot',readiness=()=>'ready',appVersion,
  capabilities={},operations,events,status,allowedOrigins=[],extra=null}) {
  const route=createApiRoute({claim,identity,readiness,appVersion,capabilities,operations,events,status,extra});
  const server=http.createServer(async(req,res)=>{
    try {
      authorizeLoopback(req.headers,{port:server.address().port,token:claim.token,allowedOrigins});
      await route(req,res,new URL(req.url,'http://127.0.0.1'));
    }catch(error){respondError(res,error);}
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
