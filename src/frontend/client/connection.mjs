import {BACKEND_API_VERSION,protocolError,validateEvent,validateHandshake,validateOperation,validateResult,validateSnapshot} from '../../contracts/backend.mjs';

const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const remoteError=value=>protocolError(typeof value?.code==='string'?value.code:'BACKEND_UNAVAILABLE',
  typeof value?.message==='string'?value.message:'Операция недоступна.');

// Unprivileged client of the backend API: HTTP plus an authenticated event
// stream. It never touches stores, files or Electron and never resends a
// mutation after the backend boot generation changed.
export class BackendConnection {
  #base; #token; #fetch; #identity; #randomId; #handshake=null; #lease=null; #streams=new Set();
  constructor({port,token,fetch=globalThis.fetch,identity='workflow-pilot',randomId=()=>globalThis.crypto.randomUUID()}) {
    if(!Number.isSafeInteger(port)||port<1||port>65535||typeof token!=='string'||token.length<16)
      throw protocolError('BACKEND_AUTH_CONFIG');
    this.#base=`http://127.0.0.1:${port}`;this.#token=token;this.#fetch=fetch;this.#identity=identity;this.#randomId=randomId;
  }
  get bootGeneration(){return this.#handshake?.bootGeneration??null;}
  get leaseGeneration(){return this.#lease;}
  async #request(path,{method='GET',body,signal}={}) {
    const response=await this.#fetch(this.#base+path,{method,signal,
      headers:{authorization:'Bearer '+this.#token,...body!==undefined?{'content-type':'application/json'}:{}},
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
  async acquire() {
    const result=await this.submit('control.acquire',{});
    this.#lease=result.value.leaseGeneration;return this.#lease;
  }
  async release() {
    const result=await this.submit('control.release',{});this.#lease=null;return result.value;
  }
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
  subscribe({onSnapshot=()=>{},onEvent=()=>{},onError=()=>{},retryMs=250}={}) {
    const controller=new AbortController();
    let generation=null,last=null,active=true;
    const stream={close:()=>{active=false;controller.abort();this.#streams.delete(stream);}};
    this.#streams.add(stream);
    const accept=(type,data)=>{
      if(type==='snapshot') {
        const snapshot=validateSnapshot(JSON.parse(data));
        generation=snapshot.bootGeneration;last=snapshot.sequence;onSnapshot(snapshot);return true;
      }
      if(type!=='event')return true;
      const event=validateEvent(JSON.parse(data));
      if(event.bootGeneration!==generation||last===null)return false;
      if(event.sequence<=last)return true;
      if(event.sequence!==last+1)return false;
      last=event.sequence;onEvent(event);return true;
    };
    const loop=async()=>{
      while(active) {
        try {
          const query=generation!==null&&last!==null?`?generation=${encodeURIComponent(generation)}&after=${last}`:'';
          const response=await this.#fetch(this.#base+'/v1/events'+query,{signal:controller.signal,
            headers:{authorization:'Bearer '+this.#token,accept:'text/event-stream'}});
          if(!response.ok)throw remoteError((await response.json().catch(()=>null))?.error);
          const reader=response.body.getReader(),decoder=new TextDecoder();
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
        }catch(error){if(!active)return;onError(error);}
        if(active)await settle(retryMs);
      }
    };
    void loop();
    return stream;
  }
  close(){for(const stream of [...this.#streams])stream.close();}
}
