import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {RuntimeError} from '../../contracts/errors.mjs';
import {isProcessDead} from '../commands/activity-probe.mjs';

// Private backend-to-executor control. No MCP tool and no service start/stop.
export class ProjectCommands {
  constructor(directory,{request=fetch}={}) {this.directory=directory;this.request=request;this.tail=Promise.resolve();}
  async read(file) {
    const stat=await fs.lstat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    if(!stat)return null;
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)throw new RuntimeError('PROJECT_COMMAND_CONTROL_INVALID','Некорректный файл управления командами.');
    return JSON.parse(await fs.readFile(file,'utf8'));
  }
  update(workspaces,retired) {
    const job=this.tail.then(async()=>{
      const directory=path.join(this.directory,'private');
      for(const target of [this.directory,directory]){
        await fs.mkdir(target,{recursive:true,mode:0o700});
        if(await fs.realpath(target)!==path.resolve(target))throw new RuntimeError('RUNTIME_OWNER_CONFLICT','Папка исполнителя заменена ссылкой.');
      }
      const file=path.join(directory,'project-command-stops.json'),old=await this.read(file)??{version:1,workspaces:[]};
      if(old.version!==1||!Array.isArray(old.workspaces))throw new RuntimeError('PROJECT_COMMAND_CONTROL_INVALID','Журнал остановки команд повреждён.');
      const entries=new Set(old.workspaces);
      for(const workspace of workspaces){if(!path.isAbsolute(workspace)||path.normalize(workspace)!==workspace)throw new TypeError('Absolute workspace required');
        if(retired)entries.add(workspace);else entries.delete(workspace);}
      const temporary=file+'.'+randomUUID()+'.tmp';
      await fs.writeFile(temporary,JSON.stringify({version:1,workspaces:[...entries]}),{mode:0o600,flag:'wx',flush:true});
      await fs.rename(temporary,file);
    });this.tail=job.catch(()=>{});return job;
  }
  async retire(workspaces) {
    await this.update(workspaces,true);
    const descriptor=await this.read(path.join(this.directory,'private','command-control.json'));
    if(!descriptor)return {operations:[]};
    if(descriptor.version!==1||!Number.isInteger(descriptor.port)||descriptor.port<1||descriptor.port>65535
      ||!Number.isInteger(descriptor.pid)||descriptor.pid<1||!/^[a-f0-9]{64}$/.test(descriptor.token??''))
      throw new RuntimeError('PROJECT_COMMAND_CONTROL_INVALID','Адрес управления исполнителем не подтверждён.');
    if(isProcessDead(descriptor.pid))return {operations:[]};
    const operation=randomUUID();let response;
    try{response=await this.request('http://127.0.0.1:'+descriptor.port+'/workflow-project-control',{
      method:'POST',redirect:'error',headers:{authorization:'Bearer '+descriptor.token,'content-type':'application/json'},
      body:JSON.stringify({operation,workspaces}),signal:AbortSignal.timeout(35000)});}catch{
      throw new RuntimeError('PROJECT_COMMAND_CONTROL_UNAVAILABLE','Исполнитель не подтвердил остановку команд проекта. Повторите очистку.');
    }
    const result=await response.json();
    if(!response.ok||result.operation!==operation||!Array.isArray(result.operations))
      throw new RuntimeError('PROJECT_COMMAND_STOP_UNCONFIRMED','Остановка команд не подтверждена: '+String(result.error??'неполный ответ').slice(0,300));
    return result;
  }
}
