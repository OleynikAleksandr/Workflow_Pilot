import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';

const activeDirectory=workspace=>path.join(workspace,'.harness/runtime/command-activity');
const hash=text=>createHash('sha256').update(text).digest('hex');
const dead=pid=>{if(!Number.isSafeInteger(pid)||pid<1)return false;try{process.kill(pid,0);return false;}catch(e){return e.code==='ESRCH';}};
const issue=(code,message)=>Object.assign(new Error(message),{code});
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
export async function readCommandActivity(workspace,{isDead=dead,bootId=currentBootIdentity()}={}) {
  const directory=activeDirectory(workspace),commands=[];
  for(const name of (await fs.readdir(directory).catch(e=>{if(e.code==='ENOENT')return [];throw e;})).sort()) {
    if(name.endsWith('.tmp'))continue;
    const id=name.replace(/\.json$/,'');
    let record,raw='',valid=false;
    try {
      const stat=await fs.lstat(path.join(directory,name));
      if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)throw Error('invalid');
      raw=await fs.readFile(path.join(directory,name),'utf8');record=JSON.parse(raw);
      valid=record.version===2&&record.id===id&&record.workspace===workspace
        &&typeof record.executor_instance==='string'&&Number.isSafeInteger(record.started_at_ms)&&record.started_at_ms>0
        &&['starting','running','completed','unknown','acknowledged_unknown'].includes(record.state);
    }catch{record={};}
    const knownDead=isDead(record.executor_pid);
    const state=valid&&record.state==='completed'&&Number.isInteger(record.exit_code)?'completed'
      :valid&&record.state==='acknowledged_unknown'&&record.acknowledged_at_ms?'acknowledged_unknown'
      :valid&&!knownDead?record.state==='completed'?'unknown':record.state:'unknown';
    const readOnly=valid&&record.read_only_verified===true&&record.sandbox_policy==='readOnly'
      &&typeof record.process_id==='string'&&record.process_id.length>0;
    const previousBoot=valid&&typeof bootId==='string'&&bootId.length>0
      &&typeof record.boot_id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{18,48}$/i.test(record.boot_id)
      &&record.boot_id.toLowerCase()!==bootId.toLowerCase();
    const acknowledged=state==='acknowledged_unknown';
    commands.push({id,digest:hash(raw),state,readOnly,executorPid:record.executor_pid??null,
      processId:typeof record.process_id==='string'?record.process_id:null,
      cwd:valid&&typeof record.cwd==='string'?record.cwd:workspace,workspace,
      exitCode:state==='completed'?record.exit_code:null,
      canAcknowledge:state==='unknown'&&knownDead&&!readOnly&&!!raw&&/^[a-zA-Z0-9_-]+\.json$/.test(name),
      blocksIntegration:state!=='completed'&&!readOnly&&!acknowledged,
      blocksDeletion:state!=='completed'&&!(acknowledged&&previousBoot&&knownDead),
      reason:state==='completed'?'Завершение подтверждено'
        :acknowledged?(previousBoot&&knownDead?'Признанный неизвестный исход относится к предыдущей загрузке ОС'
          :'Пользователь признал исход неизвестным; удаление ждёт доказанной предыдущей загрузки ОС или безопасной диагностики')
        :state==='unknown'?'Исход команды не подтверждён; требуется сверка конкретной операции'
        :readOnly?'Защищённая команда: файлы доступны только для чтения':'Команда ещё выполняется'});
  }
  return {commands,commandActive:commands.some(c=>c.blocksIntegration),deletionBlocked:commands.some(c=>c.blocksDeletion),
    services:commands.filter(c=>c.readOnly&&c.state!=='completed')};
}
export async function acknowledgeUnknownCommand(workspace,{id,digest,confirmation},{isDead=dead}={}) {
  if(!/^[a-zA-Z0-9_-]+$/.test(id??'')||confirmation!==id)throw issue('COMMAND_CONFIRMATION','Подтвердите точный ID операции.');
  const view=await readCommandActivity(workspace,{isDead}),item=view.commands.find(c=>c.id===id);
  if(!item?.canAcknowledge||item.digest!==digest)throw issue('COMMAND_CHANGED','Состояние команды изменилось. Повторите диагностику.');
  const file=path.join(activeDirectory(workspace),id+'.json'),raw=await fs.readFile(file,'utf8');
  if(hash(raw)!==digest)throw issue('COMMAND_CHANGED','Запись команды изменилась.');
  const record=JSON.parse(raw);
  // The executor generation is absent; no completion is invented, and deletion stays guarded.
  if(!isDead(record.executor_pid))throw issue('COMMAND_LIVE','Исполнитель ещё работает.');
  const next={...record,version:2,id,workspace,cwd:record.cwd??workspace,
    executor_instance:record.executor_instance??'legacy',state:'acknowledged_unknown',
    acknowledged_at_ms:Date.now(),previous_state:record.state??'legacy_unknown'};
  const temp=file+'.tmp';
  await fs.writeFile(temp,JSON.stringify(next),{mode:0o600});await fs.rename(temp,file);
  return readCommandActivity(workspace,{isDead});
}
