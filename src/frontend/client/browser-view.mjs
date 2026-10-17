import {BACKEND_LIMITS,protocolError} from '../../contracts/backend.mjs';
import {clientPointToBrowser,validateFrame} from '../../contracts/browser-presentation.mjs';

const remote=async response=>{
  const value=await response.json().catch(()=>null);
  return protocolError(value?.error?.code??'BACKEND_UNAVAILABLE',value?.error?.message??'Операция недоступна.');
};

// One viewer of one backend page. It shows frames and forwards addressed
// input; OS clipboard and file pickers stay with the client application.
export class BrowserView {
  #connection; #viewerId=null; #sequence=0; #frame=null;
  constructor(connection,browserSessionId) { this.#connection=connection;this.browserSessionId=browserSessionId; }
  get viewerId(){return this.#viewerId;}
  get frame(){return this.#frame?structuredClone(this.#frame):null;}
  async attach() {
    const result=await this.#connection.json('/v1/browser/viewers',{method:'POST',body:{browserSessionId:this.browserSessionId}});
    this.#viewerId=result.viewerId;this.#sequence=0;
    return result;
  }
  async detach() {
    if(!this.#viewerId)return false;
    const id=this.#viewerId;this.#viewerId=null;
    return (await this.#connection.json('/v1/browser/viewers/'+id,{method:'DELETE'})).detached;
  }
  #viewer(){if(!this.#viewerId)throw protocolError('BROWSER_PAGE_NOT_FOUND','Зритель не подключён.');return this.#viewerId;}
  // Long-poll: resolves with a new frame, or null when nothing was painted.
  // format/maxScale: a compressed frame for a remote device (JPEG, density cap).
  async nextFrame({after=this.#frame?.frameSequence??null,signal,format=null,quality=null,maxScale=null}={}) {
    const query=`?viewer=${this.#viewer()}`+(after===null?'':`&after=${after}`)+(format?`&format=${format}`:'')
      +(quality?`&quality=${quality}`:'')+(maxScale?`&maxScale=${maxScale}`:'');
    const response=await this.#connection.fetch('/v1/browser/frame'+query,{signal});
    if(response.status===204)return null;
    if(!response.ok)throw await remote(response);
    const meta=validateFrame(JSON.parse(response.headers.get('x-browser-frame')));
    if(meta.browserSessionId!==this.browserSessionId)throw protocolError('BROWSER_DOCUMENT_CHANGED');
    this.#frame=meta;
    return {meta:structuredClone(meta),png:new Uint8Array(await response.arrayBuffer()),mime:response.headers.get('content-type')??'image/png'};
  }
  // Client pixels -> logical page coordinates of the frame being displayed.
  point(x,y,bounds) {
    if(!this.#frame)throw protocolError('BROWSER_DOCUMENT_CHANGED');
    return clientPointToBrowser({x,y,bounds,frame:this.#frame});
  }
  async input(type,data) {
    if(!this.#frame)throw protocolError('BROWSER_DOCUMENT_CHANGED','Сначала получите кадр страницы.');
    const leaseGeneration=this.#connection.leaseGeneration;
    if(leaseGeneration===null)throw protocolError('BACKEND_LEASE_REQUIRED','Нужно право управления.');
    const input={browserSessionId:this.browserSessionId,documentGeneration:this.#frame.documentGeneration,
      sequence:++this.#sequence,leaseGeneration,type,data};
    return this.#connection.json('/v1/browser/input',{method:'POST',body:{viewerId:this.#viewer(),input}});
  }
  selection(){return this.#connection.json('/v1/browser/clipboard/selection',{method:'POST',body:{viewerId:this.#viewer()}}).then(value=>value.text);}
  paste(text){return this.#connection.json('/v1/browser/clipboard/paste',{method:'POST',
    body:{viewerId:this.#viewer(),text,leaseGeneration:this.#connection.leaseGeneration}});}
  setViewport(width,height){return this.#connection.json('/v1/browser/viewport',{method:'POST',
    body:{viewerId:this.#viewer(),width,height,leaseGeneration:this.#connection.leaseGeneration}});}
  // A client file answers the page's own chooser; it is attached only after
  // every byte reached the backend.
  async #send({name,bytes,mime}) {
    const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    const transferId='up-'+globalThis.crypto.randomUUID();
    const start=await this.#connection.json('/v1/browser/transfers',{method:'POST',
      body:{transfer:{transferId,name,size:data.byteLength,direction:'upload',...mime?{mime}:{}},leaseGeneration:this.#connection.leaseGeneration}});
    const step=Math.min(start.chunkBytes,BACKEND_LIMITS.transferChunkBytes);
    for(let offset=0;offset<data.byteLength;offset+=step) {
      const response=await this.#connection.fetch(`/v1/browser/transfers/${transferId}?offset=${offset}`,{method:'PUT',
        headers:{'content-type':'application/octet-stream'},body:data.subarray(offset,offset+step)});
      if(!response.ok)throw await remote(response);
    }
    return transferId;
  }
  async upload({chooserId,name,bytes,mime}) {
    const transferId=await this.#send({name,bytes,mime});
    return this.#connection.json(`/v1/browser/transfers/${transferId}/attach`,{method:'POST',
      body:{viewerId:this.#viewer(),chooserId,leaseGeneration:this.#connection.leaseGeneration}});
  }
  // Client files dropped (or pasted) at a page point: sent completely first, then dropped together.
  async drop({files,x,y}) {
    const transferIds=[];
    for(const file of files)transferIds.push(await this.#send(file));
    return this.#connection.json('/v1/browser/drop',{method:'POST',
      body:{viewerId:this.#viewer(),transferIds,x,y,leaseGeneration:this.#connection.leaseGeneration}});
  }
  cancelChooser(chooserId){return this.#connection.json('/v1/browser/choosers/cancel',{method:'POST',
    body:{viewerId:this.#viewer(),chooserId,leaseGeneration:this.#connection.leaseGeneration}});}
  async download(transferId) {
    const response=await this.#connection.fetch('/v1/browser/transfers/'+transferId);
    if(!response.ok)throw await remote(response);
    const name=decodeURIComponent(response.headers.get('x-transfer-name')??'download');
    const bytes=new Uint8Array(await response.arrayBuffer());
    await this.#connection.json('/v1/browser/transfers/'+transferId,{method:'DELETE'});
    return {name,bytes};
  }
}
