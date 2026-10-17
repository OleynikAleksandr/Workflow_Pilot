import {BACKEND_API_VERSION,protocolError,validateEvent,validateHandshake,validateOperation,validateResult,validateSnapshot} from '../../contracts/backend.mjs';

const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const remoteError=value=>protocolError(typeof value?.code==='string'?value.code:'BACKEND_UNAVAILABLE',
  typeof value?.message==='string'?value.message:'Операция недоступна.');

// Unprivileged client of the backend API: HTTP plus an authenticated event
// stream. It never touches stores, files or Electron and never resends a
// mutation after the backend boot generation changed.
export class BackendConnection {
  #base; #token; #fetch; #identity; #randomId; #handshake=null; #lease=null; #streams=new Set(); #clientId;
  // A window keeps one clientId across reconnects, so its own earlier lease is
  // taken back at once instead of blocking it until that lease expires.
  // origin: a browser page served by the remote gateway; the device cookie
  // authenticates it and the gateway assigns its clientId.
  constructor({port,token,origin=null,fetch=globalThis.fetch,identity='workflow-pilot',randomId=()=>globalThis.crypto.randomUUID(),clientId=null}) {
    if(origin!==null&&(typeof origin!=='string'||!/^https?:\/\/[^/]+$/.test(origin)))throw protocolError('BACKEND_AUTH_CONFIG');
    if(origin===null&&(!Number.isSafeInteger(port)||port<1||port>65535||typeof token!=='string'||token.length<16))
      throw protocolError('BACKEND_AUTH_CONFIG');
    if(clientId!==null&&(typeof clientId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(clientId)))
      throw protocolError('BACKEND_AUTH_CONFIG');
    this.#base=origin??`http://127.0.0.1:${port}`;this.#token=origin?null:token;this.#fetch=fetch;this.#identity=identity;this.#randomId=randomId;
    this.#clientId=clientId??'client-'+randomId();
  }
  get clientId(){return this.#clientId;}
  #auth(){return this.#token?{authorization:'Bearer '+this.#token}:{};}
  get bootGeneration(){return this.#handshake?.bootGeneration??null;}
  // Authenticated request to this backend only; the token never enters a URL.
  fetch(path,{method='GET',headers={},body,signal}={}) {
    if(typeof path!=='string'||!path.startsWith('/v1/'))throw protocolError('BACKEND_ROUTE_NOT_FOUND');
    return this.#fetch(this.#base+path,{method,body,signal,headers:{...headers,...this.#auth()}});
  }
  async json(path,{method='GET',body}={}) {
    const response=await this.fetch(path,{method,body:body===undefined?undefined:JSON.stringify(body),
      headers:body===undefined?{}:{'content-type':'application/json'}});
    const value=await response.json().catch(()=>null);
    if(!response.ok)throw remoteError(value?.error);
    return value;
  }
  get leaseGeneration(){return this.#lease;}
  async #request(path,{method='GET',body,signal}={}) {
    const response=await this.#fetch(this.#base+path,{method,signal,
      headers:{...this.#auth(),...body!==undefined?{'content-type':'application/json'}:{}},
      body:body===undefined?undefined:JSON.stringify(body)});
    const value=await response.json().catch(()=>null);
    if(!response.ok)throw remoteError(value?.error);
    return value;
  }
  async connect() {
    const handshake=validateHandshake(await this.#request('/v1/handshake'));
    if(handshake.apiVersion!==BACKEND_API_VERSION)throw protocolError('BACKEND_VERSION_INCOMPATIBLE');
    if(handshake.identity!==this.#identity)throw protocolError('BACKEND_IDENTITY_MISMATCH');
    if(this.#handshake&&this.#handshake.bootGeneration!==handshake.bootGeneration)this.#lease=null;
    this.#handshake=handshake;return structuredClone(handshake);
  }
  #command(operation,args,requestId,withLease) {
    if(!this.#handshake)throw protocolError('BACKEND_NOT_CONNECTED','Нет подключения к backend.');
    return {requestId,operation,args,bootGeneration:this.#handshake.bootGeneration,
      ...withLease&&this.#lease!==null?{leaseGeneration:this.#lease}:{}};
  }
  // A transport failure is retried with the same requestId only while the
  // backend generation is the same; otherwise the caller must reconcile.
  async submit(operation,args={},{requestId=this.#randomId(),attempts=3}={}) {
    const command=this.#command(operation,args,requestId,true);
    for(let attempt=1;;attempt++) {
      try{return validateResult(await this.#request('/v1/commands',{method:'POST',body:command}));}
      catch(error){
        if(error?.code||attempt>=attempts)throw error;
        const before=command.bootGeneration;
        await settle(50*attempt);
        let current;
        try{current=await this.connect();}catch{continue;}
        if(current.bootGeneration!==before)
          throw Object.assign(protocolError('BACKEND_BOOT_CHANGED','Backend перезапущен. Проверьте результат операции.'),{requestId});
      }
    }
  }
  async read(operation,args={}) {
    const result=await this.submit(operation,args);
    if(result.status==='failed')throw remoteError(result.error);
    return result.value;
  }
  // Control is explicit: a held lease is refused unless takeover is requested.
  async acquire({takeover=false}={}) {
    const result=await this.submit('control.acquire',{clientId:this.#clientId,takeover});
    if(result.status==='failed')throw remoteError(result.error);
    this.#lease=result.value.leaseGeneration;return this.#lease;
  }
  async renew() {
    try {
      const result=await this.submit('control.renew',{clientId:this.#clientId});
      if(result.status==='failed')throw remoteError(result.error);
      return result.value;
    }catch(error){if(error.code==='BACKEND_LEASE_STALE'||error.code==='BACKEND_LEASE_REQUIRED')this.#lease=null;throw error;}
  }
  async release() {
    const result=await this.submit('control.release',{clientId:this.#clientId});this.#lease=null;return result.value;
  }
  forgetLease(){this.#lease=null;}
  async operation(operationId) {
    if(typeof operationId!=='string'||!/^op:[a-f0-9]{40}$/.test(operationId))throw protocolError('BACKEND_OPERATION_INVALID');
    return validateOperation(await this.#request('/v1/operations/'+operationId));
  }
  async wait(operationId,{timeoutMs=60000,intervalMs=50}={}) {
    const deadline=Date.now()+timeoutMs;
    for(;;) {
      const view=await this.operation(operationId);
      if(['completed','failed','unknown'].includes(view.status))return view;
      if(Date.now()>deadline)throw protocolError('BACKEND_OPERATION_TIMEOUT','Операция ещё выполняется.');
      await settle(intervalMs);
    }
  }
  // A Desktop channel through the API: the same envelope as the former IPC.
  async invoke(surface,channel,input) {
    const value=await this.run('ui.invoke',{surface,channel,...input===undefined?{}:{input}});
    return value;
  }
  async run(operation,args={},options={}) {
    const result=await this.submit(operation,args,options);
    if(result.status==='completed')return result.value;
    if(result.status==='failed'||result.status==='rejected')throw remoteError(result.error);
    if(result.status==='unknown')throw Object.assign(protocolError('BACKEND_OPERATION_UNKNOWN','Исход операции не подтверждён.'),{operationId:result.operationId});
    const view=await this.wait(result.operationId,options);
    if(view.status==='completed')return view.result?.value??null;
    if(view.status==='failed')throw remoteError(view.result?.error);
    throw Object.assign(protocolError('BACKEND_OPERATION_UNKNOWN','Исход операции не подтверждён.'),{operationId:result.operationId});
  }
  // Events arrive in sequence order. A gap or generation change becomes a
  // fresh snapshot; already seen events are dropped by sequence.
  // onOpen: the stream is live again (snapshot or resume by sequence). A failing
  // handler is reported through onHandlerError and never ends the stream.
  subscribe({onSnapshot=()=>{},onEvent=()=>{},onUi=()=>{},onError=()=>{},onCommand=onEvent,onOpen=()=>{},onHandlerError=()=>{},retryMs=250}={}) {
    const controller=new AbortController();
    let generation=null,last=null,active=true;
    const stream={close:()=>{active=false;controller.abort();this.#streams.delete(stream);}};
    this.#streams.add(stream);
    const handle=(kind,run)=>{try{run();}catch(error){try{onHandlerError(kind,error);}catch{ /* reporting never ends the stream */ }}};
    const accept=(type,data)=>{
      if(type==='snapshot') {
        const snapshot=validateSnapshot(JSON.parse(data));
        generation=snapshot.bootGeneration;last=snapshot.sequence;handle('snapshot',()=>onSnapshot(snapshot));return true;
      }
      // Desktop UI state is a latest value outside the event sequence.
      if(type==='ui'){const value=JSON.parse(data);if(typeof value?.kind==='string')handle('ui:'+value.kind,()=>onUi(value.kind,value.value));return true;}
      // Window requests addressed to this client; not part of the sequence.
      if(type==='command'){const value=JSON.parse(data);if(typeof value?.type==='string')handle('command',()=>onCommand({type:value.type,data:value.data??{}}));return true;}
      if(type!=='event')return true;
      // An event this client cannot read is not replayed forever: a fresh snapshot replaces it.
      let event;
      try{event=validateEvent(JSON.parse(data));}catch(error){handle('invalid-event',()=>{throw error;});return false;}
      if(event.bootGeneration!==generation||last===null)return false;
      if(event.sequence<=last)return true;
      if(event.sequence!==last+1)return false;
      last=event.sequence;handle('event',()=>onEvent(event));return true;
    };
    const loop=async()=>{
      while(active) {
        let reader=null;
        try {
          const query='?client='+encodeURIComponent(this.#clientId)+(generation!==null&&last!==null?`&generation=${encodeURIComponent(generation)}&after=${last}`:'');
          const response=await this.#fetch(this.#base+'/v1/events'+query,{signal:controller.signal,
            headers:{...this.#auth(),accept:'text/event-stream'}});
          if(!response.ok)throw remoteError((await response.json().catch(()=>null))?.error);
          reader=response.body.getReader();const decoder=new TextDecoder();
          handle('open',()=>onOpen());
          let buffer='',resync=false;
          while(!resync) {
            const {value,done}=await reader.read();
            if(done)break;
            buffer+=decoder.decode(value,{stream:true});
            let index;
            while((index=buffer.indexOf('\n\n'))>=0) {
              const block=buffer.slice(0,index);buffer=buffer.slice(index+2);
              const type=/^event: (.+)$/m.exec(block)?.[1],data=/^data: (.*)$/m.exec(block)?.[1];
              if(!type||data===undefined)continue;
              if(!accept(type,data)){generation=null;last=null;resync=true;break;}
            }
          }
          if(resync)await reader.cancel().catch(()=>{});
        }catch(error){
          // The old connection is closed, so the backend does not keep a dead stream.
          await reader?.cancel().catch(()=>{});
          if(!active)return;onError(error);
        }
        if(active)await settle(retryMs);
      }
    };
    void loop();
    return stream;
  }
  close(){for(const stream of [...this.#streams])stream.close();}
}
