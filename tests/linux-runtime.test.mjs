import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LINUX_ASSETS } from '../src/execution/platform/linux/toolchain.mjs';
import { LinuxExecutorBootstrap,LinuxRuntimeSwitcher,verifyLinuxTools } from '../src/execution/platform/linux/runtime.mjs';
import { LinuxServices,linuxServiceUnit,LINUX_SERVICE } from '../src/execution/platform/linux/services.mjs';
import { defaultRuntimeFolder } from '../src/execution/platform/paths.mjs';
import { runtimeLabel,CodexAppServerRuntime } from '../src/execution/runtime/service.mjs';
import { ProcessVpsTunnel } from '../src/execution/runtime/vps.mjs';
import { prepareLinuxToolchain } from '../scripts/prepare-linux-toolchain.mjs';
const execute=promisify(execFile),root=path.resolve(import.meta.dirname,'..');
async function temporary(t) {const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pilot Linux Юникод '));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
async function payload(folder) {
  const manifest={platform:'linux',arch:'x64',tools:{}};await fs.mkdir(folder,{recursive:true});
  for(const asset of LINUX_ASSETS) {
    const data=Buffer.from('isolated fixture '+asset.id),file=path.join(folder,asset.id,'bin',asset.binary);
    await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data,{mode:0o755});
    manifest.tools[asset.id]={path:path.relative(folder,file),archive_sha256:asset.sha256,sha256:createHash('sha256').update(data).digest('hex')};
  }
  await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest));return manifest;
}
test('Linux identity uses absolute XDG state and its own MCP name',()=>{
  assert.equal(defaultRuntimeFolder('/home/Юзер','linux',{XDG_STATE_HOME:'/data/Мой state'}),'/data/Мой state/WorkflowPilotCodexExecutor');
  assert.equal(defaultRuntimeFolder('/home/a','linux',{XDG_STATE_HOME:'relative'}),'/home/a/.local/state/WorkflowPilotCodexExecutor');
  assert.equal(runtimeLabel('linux'),'Workflow Pilot Local Linux');
});
test('Linux payload verifies hashes, exact key case and executable bits; installation survives restart',async t=>{
  const dir=await temporary(t),source=path.join(dir,'payload'),stateDir=path.join(dir,'own state');const manifest=await payload(source);
  const options={payloadDir:source,stateDir,inspectHost:async()=>{},environment:{PATH:'/custom'}};
  const bootstrap=new LinuxExecutorBootstrap(options);
  const [a,b]=await Promise.all([bootstrap.ensure(),bootstrap.ensure()]);assert.equal(a,b);
  assert.equal((await new LinuxExecutorBootstrap(options).inspect()).toolsReady,true);
  const env=await bootstrap.workflowEnvironment();assert(env.PATH.includes('Юникод'));assert(env.CODEX_APP_SERVER_BIN.startsWith(stateDir));
  const node=path.join(source,manifest.tools.node.path);await fs.chmod(node,0o644);
  await assert.rejects(verifyLinuxTools(source),{code:'LINUX_EXECUTABLE_MISSING'});await fs.chmod(node,0o755);
  await fs.writeFile(node,'corrupt');await assert.rejects(bootstrap.ensure(),{code:'LINUX_PAYLOAD_INVALID'});
  assert.equal((await new LinuxExecutorBootstrap(options).inspect()).toolsReady,true,'failed source does not destroy installed tools');
  await payload(source);manifest.tools.Node=manifest.tools.node;delete manifest.tools.node;
  await fs.writeFile(path.join(source,'manifest.json'),JSON.stringify(manifest));
  await assert.rejects(verifyLinuxTools(source),{code:'LINUX_PAYLOAD_INVALID'});
  await assert.rejects(verifyLinuxTools(path.join(dir,'missing')),{code:'LINUX_PAYLOAD_MISSING'});
});
test('Linux preparation refuses redirected runtime instead of writing into a neighbor',async t=>{
  const dir=await temporary(t),source=path.join(dir,'payload'),neighbor=path.join(dir,'neighbor');await payload(source);await fs.mkdir(neighbor);
  const stateDir=path.join(dir,'state');await fs.symlink(neighbor,stateDir);
  await assert.rejects(new LinuxExecutorBootstrap({payloadDir:source,stateDir,inspectHost:async()=>{}}).ensure(),{code:'LINUX_OWNER_CONFLICT'});
  assert.deepEqual(await fs.readdir(neighbor),[]);
});
test('systemd user service quotes Unicode, spaces and specifiers, imports graphical environment and refuses foreign ownership',async t=>{
  const dir=await temporary(t),calls=[],environment={XDG_CONFIG_HOME:path.join(dir,'config % $'),DISPLAY:':1',XAUTHORITY:path.join(dir,'X auth')};
  const services=new LinuxServices({homeDir:dir,environment,run:async(file,args)=>{calls.push([file,args]);}});
  const options={python:'/usr/bin/python3',control:path.join(dir,'100% $name/control.py'),stateDir:path.join(dir,'state'),environment};
  const unit=linuxServiceUnit(options);assert.match(unit,/100%% \$\$name/);assert.match(unit,/PartOf=graphical-session.target/);assert(!unit.includes('sudo'));
  assert.match(unit,/After=graphical-session-pre.target/);assert(!unit.includes('After=graphical-session.target'));
  assert(!unit.includes('Environment="DISPLAY=')&&!unit.includes('Environment="XAUTHORITY='),'login environment must not be frozen in unit');
  await services.install(options);await services.restart();
  assert(calls.every(([file,args])=>file==='/usr/bin/systemctl'&&args[0]==='--user'));
  assert(calls.some(([,args])=>args.join(' ')==='--user import-environment DISPLAY XAUTHORITY'));
  assert.deepEqual(calls.at(-1)[1],['--user','restart',LINUX_SERVICE]);
  assert.equal((await fs.stat(services.file)).mode&0o777,0o600);
  await fs.writeFile(services.file,'foreign unit');await assert.rejects(services.install(options),{code:'LINUX_SERVICE_OWNER_CONFLICT'});
});
test('Linux activation uses real runtime channel operations and systemd; failure is retryable without donor lifecycle',async()=>{
  const calls=[];let fail=true;
  const status={mcp:{ready:true,owned:true},tunnel:{ready:false,configured:false},mcp_url:'http://127.0.0.1:18852/mcp',setup_complete:false};
  const app={python:'/usr/bin/python3',installedSource:'/tmp/fixture/source',stateDir:'/tmp/fixture/state',environment:{},
    syncSource:async()=>calls.push('sync'),configureSelector:async()=>calls.push('selector'),configureChannel:async c=>calls.push(c),
    control:async c=>{calls.push(c);return status;},vpsControl:async args=>calls.push(args[0]),
    controlEnvironment:()=>({DISPLAY:':1'}),ensureMcpOnly:async()=>status};
  const switcher=new LinuxRuntimeSwitcher({appServerRuntime:app,bootstrap:{ensure:async()=>{},workflowEnvironment:async()=>({PATH:'/fixture'})},
    services:{install:async()=>calls.push('unit'),restart:async()=>{calls.push('restart');if(fail)throw new Error('user bus unavailable');}}});
  const runtime=switcher.createRuntime('vps');await assert.rejects(switcher.activate(runtime),/user bus/);
  assert.notEqual(app.activated,true);fail=false;await switcher.activate(runtime);
  assert.equal(app.activated,true);assert.equal(runtime.channel,'vps');assert.equal(runtime.lastStatus.tunnel.ready,false);
  assert(calls.includes('setup'));assert(calls.indexOf('unit')<calls.indexOf('restart'));
  await assert.rejects(switcher.activate(runtime,{retireLegacy:true}),{code:'LEGACY_RUNTIME_FORBIDDEN'});
});
test('Linux runtime invokes its own control with packaged environment and allows both channel operations',async t=>{
  const dir=await temporary(t),source=path.join(dir,'source');await fs.mkdir(source);await fs.writeFile(path.join(source,'control.py'),'# fixture');
  const calls=[];const app=new CodexAppServerRuntime({sourceDir:source,stateDir:path.join(dir,'state'),platform:'linux',
    bootstrap:{ensure:async()=>{},workflowEnvironment:async()=>({CODEX_APP_SERVER_BIN:'/own/codex',PATH:'/own/bin'})},
    execute:async(file,args,options)=>{calls.push({file,args,options});return {stdout:JSON.stringify(args.includes('vps-status')?{vps:{ready:false}}:
      {mcp:{running:false},tunnel:{running:false},mcp_url:'http://127.0.0.1:18852/mcp'})};}});
  await app.control('status');await app.vpsControl(['vps-status']);
  assert(calls.every(c=>c.file==='/usr/bin/python3'&&c.options.env.CODEX_APP_SERVER_BIN==='/own/codex'));
  assert.equal(app.expectedServerName,'Workflow Pilot Local Linux');
  const vps=new ProcessVpsTunnel({platform:'linux',homeDir:dir,environment:{XDG_CONFIG_HOME:path.join(dir,'config')},control:async()=>({vps:{}})});
  assert.equal(vps.ssh,'/usr/bin/ssh');assert.equal(vps.routeFile,path.join(dir,'config/workflow-pilot/vps/route.json'));
  assert.equal((await vps.status('http://127.0.0.1:18852/mcp')).configured,false);
});
test('Linux preparation rejects an archive with a wrong digest before extraction',async t=>{
  const dir=await temporary(t);let extracted=false;
  await assert.rejects(prepareLinuxToolchain({root:dir,assets:[LINUX_ASSETS[0]],download:async(_url,file)=>fs.writeFile(file,'wrong'),run:async()=>{extracted=true;}}),/SHA-256/);
  assert.equal(extracted,false);
});
test('Linux Python adapters: X11 pixels, unsupported sessions, process identity, private credentials and service argv (isolated fixture)',async t=>{
  const dir=await temporary(t);
  const {stdout}=await execute(path.join(root,'.harness/runtime/test-python/bin/python'),['-B',path.join(root,'tests/fixtures/linux-platform.py'),path.join(root,'tools/codex-app-server-mcp'),dir],
    {env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},timeout:30000,maxBuffer:100000});
  assert.deepEqual(JSON.parse(stdout),{linuxFixtures:true,nativeLinux:false,x11Pixels:true,privateCredentials:true,processIdentity:true});
});
