import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {sdkBusyProfile} from '../../contracts/plugin-communication.mjs';

const failure=()=>Object.assign(Error('Путь или файл SDK-опыта небезопасен; профиль не применён.'),{code:'SDK_BUSY_PATH_UNSAFE'});
export const SDK_BUSY_PROFILE_PATH='.harness/runtime/experiments/sdk-busy.json';
async function safePath(file,{parents=false}={}){
  let current=path.parse(file).root;
  const parts=file.slice(current.length).split(path.sep);
  for(let i=0;i<parts.length;i++){
    current=path.join(current,parts[i]);
    let stat;
    try{stat=await fs.lstat(current);}catch(error){if(error.code!=='ENOENT')throw error;
      if(!parents)throw error;
      if(i===parts.length-1)return;
      await fs.mkdir(current,{mode:0o700});stat=await fs.lstat(current);
    }
    if(stat.isSymbolicLink()||(i<parts.length-1?!stat.isDirectory():!stat.isFile()))throw failure();
  }
}
export async function readSdkBusyExperiment(workspace,expected){
  if(!path.isAbsolute(workspace))throw failure();
  const file=path.join(workspace,SDK_BUSY_PROFILE_PATH);
  try{await safePath(file);}catch(error){if(error.code==='ENOENT')return {version:1,mode:'off'};throw error;}
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{
    const stat=await handle.stat();if(!stat.isFile()||stat.size>32768)throw failure();
    return sdkBusyProfile(JSON.parse(await handle.readFile('utf8')),{...expected,workspace});
  }finally{await handle.close();}
}
export async function writeSdkBusyExperiment(workspace,value,expected){
  if(!path.isAbsolute(workspace)||workspace!==path.resolve(workspace))throw failure();
  const profile=sdkBusyProfile(value,{...expected,workspace}),file=path.join(workspace,SDK_BUSY_PROFILE_PATH);
  // Validate the complete route before creating any parent; never follow a link.
  await safePath(file,{parents:true});
  const temporary=file+'.tmp-'+randomUUID();let handle;
  try{
    handle=await fs.open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW??0),0o600);
    await handle.writeFile(JSON.stringify(profile,null,2)+'\n','utf8');await handle.sync();await handle.close();handle=null;
    await safePath(file,{parents:true});await fs.rename(temporary,file);
    if(process.platform!=='win32'){const directory=await fs.open(path.dirname(file),'r');try{await directory.sync();}finally{await directory.close();}}
    return profile;
  }finally{await handle?.close();await fs.rm(temporary,{force:true});}
}
