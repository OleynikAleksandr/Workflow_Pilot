import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
export const isProcessDead = pid => {if(!Number.isSafeInteger(pid)||pid<1)return false;try{process.kill(pid,0);return false;}catch(e){return e.code==='ESRCH';}};
// A wall-clock boot estimate can jump after NTP/manual clock changes. Never
// interpret it as proof that an unknown writer belongs to an earlier boot.
export function currentBootIdentity({platform=process.platform,run=execFileSync,readFile=readFileSync}={}) {
  try {
    let id;
    if(platform==='darwin')id=run('/usr/sbin/sysctl',['-n','kern.bootsessionuuid'],{
      encoding:'utf8',timeout:2500,windowsHide:true}).trim();
    else if(platform==='linux')id=readFile('/proc/sys/kernel/random/boot_id','utf8').trim();
    return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{18,48}$/i.test(id)?id.toLowerCase():null;
  }catch{return null;}
}
