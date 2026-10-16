import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';

const MAX_BYTES=1024*1024;
const KEY=/^[A-Za-z][A-Za-z0-9_]{0,39}$/;
// Only small scalar facts are written: never tokens, chat text, URLs or paths.
function clean(data) {
  const out={};
  for(const [key,value] of Object.entries(data??{})) {
    if(!KEY.test(key))continue;
    if(value===null||typeof value==='boolean'||Number.isFinite(value))out[key]=value;
    else if(typeof value==='string')out[key]=value.slice(0,120);
  }
  return out;
}

// Bounded journal of backend process events (clients, lease, Dock type,
// child process exits). One rotation keeps the previous megabyte.
export function createBackendJournal(file,{now=()=>new Date().toISOString(),pid=process.pid}={}) {
  let failed=false;
  const record=(event,data={})=>{
    if(failed||typeof event!=='string'||!KEY.test(event.replace(/-/g,'_')))return false;
    try {
      fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
      if((fs.statSync(file,{throwIfNoEntry:false})?.size??0)>MAX_BYTES)fs.renameSync(file,file+'.1');
      fs.appendFileSync(file,JSON.stringify({ts:now(),pid,event,...clean(data)})+'\n',{mode:0o600});
      return true;
    }catch{failed=true;return false;}
  };
  return Object.freeze({record,file});
}

// macOS LaunchServices type of this process: Foreground shows a Dock tile,
// UIElement does not. Other platforms answer null.
export function launchServicesType(pid=process.pid,{platform=process.platform,run=execFile}={}) {
  if(platform!=='darwin')return Promise.resolve(null);
  return new Promise(resolve=>{
    run('/usr/bin/lsappinfo',['info','-only','ApplicationType',String(pid)],{timeout:3000},(error,stdout)=>{
      resolve(error?null:String(stdout).match(/(?:ApplicationType"?\s*=\s*|\btype=)"?([A-Za-z]+)/)?.[1]??null);
    });
  });
}
