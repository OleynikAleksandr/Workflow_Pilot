import fs from 'node:fs/promises';
import { executeFile } from '../../commands/service.mjs';
import { RuntimeError } from '../../../contracts/errors.mjs';

export function linuxError(code,message) { return Object.assign(new RuntimeError(code,message),{publicMessage:message}); }
export async function inspectLinuxHost({platform=process.platform,arch=process.arch,environment=process.env,
  uid=process.getuid?.(),read=fs.readFile,run=executeFile}={}) {
  if(platform!=='linux'||arch!=='x64')throw linuxError('LINUX_UNSUPPORTED','Поддерживается Ubuntu 24.04 LTS x64 с сеансом X11.');
  if(uid===0)throw linuxError('LINUX_ROOT_UNSUPPORTED','Запустите Workflow Pilot от обычного пользователя, без sudo.');
  const release=await read('/etc/os-release','utf8');
  const fields=Object.fromEntries(release.split('\n').filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{
    const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1).replace(/^"|"$/g,'')];
  }));
  if(fields.ID!=='ubuntu'||fields.VERSION_ID!=='24.04')throw linuxError('LINUX_UNSUPPORTED','Этот выпуск поддерживает Ubuntu 24.04 LTS x64.');
  if(environment.XDG_SESSION_TYPE==='wayland'||environment.WAYLAND_DISPLAY)
    throw linuxError('LINUX_WAYLAND_UNSUPPORTED','Выйдите из сеанса и выберите «Ubuntu on Xorg». Wayland в этом выпуске не поддерживается.');
  if(!environment.DISPLAY)throw linuxError('LINUX_DISPLAY_MISSING','Нужен локальный графический сеанс X11 с доступным DISPLAY.');
  const missing=[];
  for(const [binary,args]of [['/usr/bin/python3',['--version']],['/usr/bin/git',['--version']],['/usr/bin/ssh',['-V']],['/usr/bin/zenity',['--version']],['/usr/bin/systemctl',['--user','show-environment']]]) {
    try{await run(binary,args,{timeout:10000,maxBuffer:65536});}catch{missing.push(binary.split('/').at(-1));}
  }
  if(missing.length)throw linuxError('LINUX_COMPONENTS_MISSING','Не готовы компоненты: '+missing.join(', ')+'. Установите python3, git, openssh-client и zenity через менеджер пакетов Ubuntu; systemd --user должен быть доступен в вашем сеансе. Затем повторите проверку.');
  return {platform:'linux',arch:'x64',session:'x11',git:true};
}
