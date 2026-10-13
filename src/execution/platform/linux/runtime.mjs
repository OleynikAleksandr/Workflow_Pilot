import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { LINUX_ASSETS } from './toolchain.mjs';
import { inspectLinuxHost,linuxError } from './startup.mjs';
import { MacSelectedRuntime,CHATGPT_CHANNELS,CHATGPT_CHANNEL_SECURE } from '../../runtime/service.mjs';

export async function verifyLinuxTools(root) {
  let manifest;
  try {manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));}
  catch {throw linuxError('LINUX_PAYLOAD_MISSING','Нет комплектных компонентов Linux. Полностью распакуйте архив Workflow Pilot.');}
  if(manifest.platform!=='linux'||manifest.arch!=='x64')throw linuxError('LINUX_PAYLOAD_INVALID','Неверная платформа комплектных компонентов.');
  const realRoot=await fs.realpath(root);
  const tools={};
  for(const asset of LINUX_ASSETS) {
    const item=manifest.tools?.[asset.id];
    if(!item||item.archive_sha256!==asset.sha256||typeof item.path!=='string'||path.isAbsolute(item.path))
      throw linuxError('LINUX_PAYLOAD_INVALID','Не совпадает manifest компонентов Linux.');
    const file=path.resolve(root,item.path);
    let real;
    try {real=await fs.realpath(file);}
    catch {throw linuxError('LINUX_PAYLOAD_MISSING','Отсутствует компонент '+asset.id+'. Распакуйте полный архив заново.');}
    if(!real.startsWith(realRoot+path.sep))throw linuxError('LINUX_PAYLOAD_INVALID','Компонент выходит за пределы поставки.');
    const stat=await fs.stat(real);
    if(!stat.isFile()||!(stat.mode&0o111))throw linuxError('LINUX_EXECUTABLE_MISSING','Компонент '+asset.id+' не имеет права выполнения. Распакуйте полный архив заново.');
    const digest=createHash('sha256').update(await fs.readFile(real)).digest('hex');
    if(digest!==item.sha256)throw linuxError('LINUX_PAYLOAD_INVALID','Повреждён компонент '+asset.id+'.');
    tools[asset.id]=file;
  }
  return {manifest,tools};
}
export class LinuxExecutorBootstrap {
  constructor({payloadDir,stateDir,environment=process.env,inspectHost=inspectLinuxHost}) {
    this.payloadDir=payloadDir;this.stateDir=stateDir;this.environment=environment;this.inspectHost=inspectHost;this.pending=null;
    this.toolsDir=path.join(stateDir,'runtime/tools');
  }
  async inspect() {try{const result=await verifyLinuxTools(this.toolsDir);return {toolsReady:true,...result};}catch{return {toolsReady:false};}}
  ensure() {return this.pending??=(async()=>{
    await this.inspectHost({environment:this.environment});
    const payload=await verifyLinuxTools(this.payloadDir),current=await this.inspect();
    for(const folder of [this.stateDir,path.dirname(this.toolsDir)]) {
      const entry=await fs.lstat(folder).catch(e=>{if(e.code!=='ENOENT')throw e;});
      if(entry?.isSymbolicLink())throw linuxError('LINUX_OWNER_CONFLICT','Каталог runtime перенаправлен.');
    }
    if(current.toolsReady&&JSON.stringify(current.manifest)===JSON.stringify(payload.manifest))return current;
    const stat=await fs.lstat(this.toolsDir).catch(e=>{if(e.code!=='ENOENT')throw e;});
    if(stat?.isSymbolicLink())throw linuxError('LINUX_OWNER_CONFLICT','Каталог компонентов перенаправлен.');
    await fs.mkdir(path.dirname(this.toolsDir),{recursive:true,mode:0o700});
    const stage=this.toolsDir+'.stage';await fs.rm(stage,{recursive:true,force:true});
    await fs.cp(this.payloadDir,stage,{recursive:true});
    await verifyLinuxTools(stage);
    await fs.rm(this.toolsDir,{recursive:true,force:true});await fs.rename(stage,this.toolsDir);
    return {toolsReady:true,...await verifyLinuxTools(this.toolsDir)};
  })().finally(()=>{this.pending=null;});}
  async workflowEnvironment() {
    const {tools}=await this.ensure();
    return {...this.environment,PATH:[...new Set(Object.values(tools).map(file=>path.dirname(file))),'/usr/bin','/bin',this.environment.PATH??''].join(':'),
      CODEX_APP_SERVER_BIN:tools.codex,WORKFLOW_PILOT_UV:tools.uv,WORKFLOW_PILOT_LINUX_TOOLS:this.toolsDir};
  }
}
// Same channel semantics and MCP client as the other platforms; only preparation
// and the per-user lifecycle differ. No model requests are made here.
export class LinuxRuntimeSwitcher {
  constructor({appServerRuntime,vpsTunnel,services,bootstrap}) {Object.assign(this,{appServerRuntime,vpsTunnel,services,bootstrap});}
  createRuntime(channel=CHATGPT_CHANNEL_SECURE,prepare=null) {
    return new MacSelectedRuntime({appServerRuntime:this.appServerRuntime,vpsTunnel:this.vpsTunnel,channel,prepare});
  }
  async activate(runtime,{chatgptChannel=runtime.channel,retireLegacy=null}={}) {
    if(retireLegacy)throw linuxError('LEGACY_RUNTIME_FORBIDDEN','Службы другого приложения не изменяются.');
    if(!CHATGPT_CHANNELS.includes(chatgptChannel))throw new TypeError('Unknown channel');
    const app=this.appServerRuntime;app.activationAttempted=true;
    await this.bootstrap.ensure();await app.syncSource();
    app.environment={...app.environment,...await this.bootstrap.workflowEnvironment()};
    await app.configureSelector();await app.configureChannel(chatgptChannel);runtime.channel=chatgptChannel;
    const before=await app.control('status');
    if(!before.setup_complete)await app.control('setup');
    await this.services.install({python:app.python,control:path.join(app.installedSource,'control.py'),stateDir:app.stateDir,environment:app.controlEnvironment()});
    // The systemd cgroup owns the processes even after the desktop application exits.
    await app.control('stop');await app.vpsControl(['vps-stop']);
    await this.services.restart();
    const backend=await app.ensureMcpOnly(),vps=await runtime.applyVps(backend.mcp_url);
    const status=runtime.combine(backend,vps);app.activated=true;
    return {runtime,status,legacyRetired:false};
  }
}
