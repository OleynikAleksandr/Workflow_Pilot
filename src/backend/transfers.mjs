import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {BACKEND_LIMITS,protocolError,validateTransfer} from '../contracts/backend.mjs';

const MAX_ACTIVE=8;
const DOWNLOAD_TTL_MS=10*60*1000;
const safeName=name=>{
  const base=path.basename(String(name||'download')).replace(/[\u0000-\u001f\\/]/g,'_').slice(0,180);
  return base&&base!=='.'&&base!=='..'?base:'download';
};

// Files cross between a client device and backend pages only through this
// private directory. The backend chooses every local path; a client supplies
// a validated name and bytes, never a path.
export function createTransfers({directory,emit=()=>{},now=Date.now}) {
  fs.rmSync(directory,{recursive:true,force:true});
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const transfers=new Map();
  const folder=transferId=>{
    const target=path.join(directory,transferId);
    fs.mkdirSync(target,{mode:0o700});return target;
  };
  const remove=transferId=>{transfers.delete(transferId);fs.rmSync(path.join(directory,transferId),{recursive:true,force:true});};
  const expire=()=>{for(const [id,item] of transfers)if(item.expiresAt<=now())remove(id);};
  const get=(transferId,direction)=>{
    expire();
    const item=transfers.get(transferId);
    if(!item||item.direction!==direction)throw protocolError('BACKEND_TRANSFER_NOT_FOUND','Файл не найден.');
    return item;
  };
  return Object.freeze({
    startUpload(input) {
      const transfer=validateTransfer(input);
      if(transfer.direction!=='upload')throw protocolError('BACKEND_TRANSFER_INVALID');
      expire();
      if(transfers.has(transfer.transferId))throw protocolError('BACKEND_TRANSFER_EXISTS','Передача уже начата.');
      if(transfers.size>=MAX_ACTIVE)throw protocolError('BACKEND_QUEUE_LIMIT');
      const file=path.join(folder(transfer.transferId),transfer.name);
      fs.writeFileSync(file,'',{flag:'wx',mode:0o600});
      transfers.set(transfer.transferId,{...transfer,file,written:0,complete:false,expiresAt:now()+DOWNLOAD_TTL_MS});
      return {transferId:transfer.transferId,chunkBytes:BACKEND_LIMITS.transferChunkBytes};
    },
    // Chunks are strictly sequential; a gap, overlap or excess is refused.
    appendUpload(transferId,offset,chunk) {
      const item=get(transferId,'upload');
      if(item.complete||offset!==item.written||chunk.length===0||chunk.length>BACKEND_LIMITS.transferChunkBytes
        ||item.written+chunk.length>item.size)throw protocolError('BACKEND_TRANSFER_INVALID','Некорректная часть файла.');
      fs.appendFileSync(item.file,chunk);item.written+=chunk.length;item.expiresAt=now()+DOWNLOAD_TTL_MS;
      return {written:item.written};
    },
    finishUpload(transferId) {
      const item=get(transferId,'upload');
      if(item.written!==item.size||fs.statSync(item.file).size!==item.size)
        throw protocolError('BACKEND_TRANSFER_INCOMPLETE','Файл передан не полностью.');
      item.complete=true;return item.file;
    },
    // Electron download item: saved privately, then offered to viewers.
    download(item,browserSessionId) {
      const transferId='dl-'+randomUUID(),name=safeName(item.getFilename()),file=path.join(folder(transferId),name);
      item.setSavePath(file);
      item.once('done',(_event,state)=>{
        if(state!=='completed'){remove(transferId);return;}
        const size=fs.statSync(file,{throwIfNoEntry:false})?.size??0;
        if(size>BACKEND_LIMITS.transferBytes){remove(transferId);emit('download-failed',{browserSessionId,code:'BACKEND_TRANSFER_TOO_LARGE'});return;}
        transfers.set(transferId,{transferId,direction:'download',name,size,mime:item.getMimeType?.()||undefined,file,complete:true,
          expiresAt:now()+DOWNLOAD_TTL_MS});
        emit('download-ready',{transferId,name,size,browserSessionId});
      });
    },
    readDownload(transferId) {
      const item=get(transferId,'download');
      return {name:item.name,size:item.size,mime:item.mime,stream:fs.createReadStream(item.file)};
    },
    discard:transferId=>{if(transfers.has(transferId)){remove(transferId);return true;}return false;},
    get active(){return transfers.size;},
    close(){transfers.clear();fs.rmSync(directory,{recursive:true,force:true});},
  });
}
