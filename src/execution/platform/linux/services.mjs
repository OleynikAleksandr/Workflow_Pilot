import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeFile } from '../../commands/service.mjs';
import { linuxError } from './startup.mjs';

export const LINUX_SERVICE='workflow-pilot-executor.service';
export const xdgDirectory=(value,fallback)=>typeof value==='string'&&path.posix.isAbsolute(value)?value:fallback;
// systemd parses its own quoted argv (not shell syntax), expands % specifiers
// and $ variables in Exec*. Escape those even in quoted values.
export function unitQuote(value) {
  if(/[\0\r\n]/.test(value))throw new TypeError('Invalid service argument');
  return '"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('%','%%').replaceAll('$',()=> '$$')+'"';
}
export function linuxServiceUnit({python,control,stateDir,environment}) {
  const command=action=>[python,'-B',control,action].map(unitQuote).join(' ');
  const values={WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR:stateDir,PYTHONDONTWRITEBYTECODE:'1',
    ...Object.fromEntries(['XDG_CONFIG_HOME','XDG_STATE_HOME','PATH','CODEX_APP_SERVER_BIN','WORKFLOW_PILOT_UV'].filter(k=>environment[k]).map(k=>[k,environment[k]]))};
  // Environment= does not expand $, unlike ExecStart=.
  const env=Object.entries(values).map(([k,v])=>'Environment='+unitQuote(k+'='+v).replaceAll('$$','$')).join('\n');
  // Session variables come from the user manager, refreshed at login. Do not
  // freeze an old DISPLAY/XAUTHORITY in the installed unit. Ordering after the
  // pre-target avoids a cycle with the target that wants this service.
  return `[Unit]\nDescription=Workflow Pilot local executor\nPartOf=graphical-session.target\nAfter=graphical-session-pre.target\n\n[Service]\nType=oneshot\nRemainAfterExit=yes\nUMask=0077\n${env}\nExecStart=${command('selector-start')}\nExecStop=${command('stop')}\nExecStop=${command('vps-stop')}\nKillMode=control-group\nTimeoutStartSec=120\nTimeoutStopSec=30\n\n[Install]\nWantedBy=graphical-session.target\n`;
}
export class LinuxServices {
  constructor({homeDir=os.homedir(),environment=process.env,run=executeFile}={}) {
    this.environment=environment;this.run=run;
    this.directory=path.join(xdgDirectory(environment.XDG_CONFIG_HOME,path.join(homeDir,'.config')),'systemd/user');
    this.file=path.join(this.directory,LINUX_SERVICE);
  }
  async install(options) {
    const stat=await fs.lstat(this.file).catch(e=>{if(e.code!=='ENOENT')throw e;});
    if(stat?.isSymbolicLink())throw linuxError('LINUX_SERVICE_OWNER_CONFLICT','Файл службы перенаправлен. Проверьте собственную конфигурацию Workflow Pilot.');
    if(stat&&!String(await fs.readFile(this.file)).includes('Description=Workflow Pilot local executor\n'))
      throw linuxError('LINUX_SERVICE_OWNER_CONFLICT','Имя службы занято другой конфигурацией.');
    await fs.mkdir(this.directory,{recursive:true,mode:0o700});
    const temp=this.file+'.tmp';await fs.rm(temp,{force:true});await fs.writeFile(temp,linuxServiceUnit(options),{mode:0o600,flag:'wx'});await fs.rename(temp,this.file);
    await this.command(['daemon-reload']);
    await this.command(['import-environment',...['DISPLAY','XAUTHORITY','XDG_SESSION_TYPE'].filter(k=>this.environment[k])]);
    await this.command(['enable',LINUX_SERVICE]);
  }
  command(args) { return this.run('/usr/bin/systemctl',['--user',...args],{env:this.environment,timeout:130000,maxBuffer:65536}); }
  restart() { return this.command(['restart',LINUX_SERVICE]); }
}
