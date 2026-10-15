import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createPackage,extractFile,uncache} from '@electron/asar';
import {launchMode} from '../src/contracts/launch.mjs';
import {validateHandshake} from '../src/contracts/backend.mjs';
import {installMacBundle} from '../scripts/release-mac.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=50)=>new Promise(resolve=>setTimeout(resolve,ms));

test('packaged builds ignore every test flag; development keeps the fixture modes',()=>{
  const argv=['app','--backend-host','--backend-fixture-root=/tmp/x','--backend-lease-ttl-ms=10'];
  assert.deepEqual(launchMode(argv,{packaged:true}),{mode:'backend',fixtureRoot:null,leaseTtlMs:null});
  assert.deepEqual(launchMode(argv,{packaged:false}),{mode:'backend',fixtureRoot:'/tmp/x',leaseTtlMs:10});
  assert.equal(launchMode(['app','--smoke'],{packaged:true}).mode,'client','no in-process smoke in a release');
  assert.equal(launchMode(['app','--smoke'],{packaged:false}).mode,'in-process');
  assert.deepEqual(launchMode(['app','--client-fixture','--client-backend-root=/tmp/b'],{packaged:true}),
    {mode:'client',backendRoot:null,clientRoot:null,fixture:false});
  assert.deepEqual(launchMode(['app'],{packaged:true}),{mode:'client',backendRoot:null,clientRoot:null,fixture:false});
});

test('handshake carries a validated product version for an explicit switch',()=>{
  const base={apiVersion:1,identity:'workflow-pilot',bootGeneration:'boot',capabilities:{commands:true},readiness:'ready'};
  assert.equal(validateHandshake({...base,appVersion:'0.2.0'}).appVersion,'0.2.0');
  assert.equal(validateHandshake(base).appVersion,undefined);
  assert.throws(()=>validateHandshake({...base,appVersion:'0.2.0; rm -rf'}),{code:'BACKEND_HANDSHAKE_INVALID'});
  assert.equal(JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8')).version,'0.2.0');
});

test('no source resolves its own folder through URL.pathname (packaged paths contain spaces)',async()=>{
  const offenders=[];
  const walk=async directory=>{for(const entry of await fsp.readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())await walk(file);
    else if(/\.(mjs|cjs|js)$/.test(entry.name)&&/import\.meta\.url\)\.pathname/.test(await fsp.readFile(file,'utf8')))offenders.push(file);
  }};
  await walk(path.join(project,'src'));
  assert.deepEqual(offenders,[]);
});

async function bundle(root,version,marker) {
  const source=path.join(root,'build-'+version,'Workflow Pilot.app'),resources=path.join(source,'Contents/Resources');
  await fs.promises.mkdir(resources,{recursive:true});
  await fsp.writeFile(path.join(source,'Contents/Info.plist'),'<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.oleynik.WorkflowPilot</string><key>CFBundleShortVersionString</key><string>'+version+'</string></dict></plist>');
  const input=path.join(root,'input-'+version);await fsp.mkdir(input,{recursive:true});
  await fsp.writeFile(path.join(input,'package.json'),JSON.stringify({name:'workflow-pilot',version}));
  await fsp.writeFile(path.join(input,'marker.txt'),marker);
  await createPackage(input,path.join(resources,'app.asar'));
  return source;
}
const marker=app=>{const archive=path.join(app,'Contents/Resources/app.asar');uncache(archive);return extractFile(archive,'marker.txt').toString();};

test('installer never replaces the bundle of a live backend; the verified switch waits and completes later',{skip:process.platform!=='darwin'},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-upgrade-install-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const verifySignature=async()=>({identity:'fixture',identifier:'com.oleynik.WorkflowPilot',cdhash:'fixture',requirement:'fixture'});
  const target=path.join(root,'Applications','Workflow Pilot.app'),backupRoot=path.join(root,'backups.noindex');
  await installMacBundle({source:await bundle(root,'0.1.6','old'),target,backupRoot,version:'0.1.6',verifySignature,backendExecutable:async()=>null});
  const identity=fs.statSync(target).ino;
  const live=path.join(target,'Contents/MacOS/Workflow Pilot');
  const deferred=await installMacBundle({source:await bundle(root,'0.2.0','new'),target,backupRoot,version:'0.2.0',verifySignature,
    backendExecutable:async()=>live});
  assert.equal(deferred.pending,true);assert.equal(deferred.reason,'BACKEND_RUNNING');
  assert.equal(marker(target),'old','the running backend keeps its own files');assert.equal(marker(deferred.staged),'new');
  const other=await installMacBundle({source:path.join(root,'build-0.2.0','Workflow Pilot.app'),target,backupRoot,version:'0.2.0',verifySignature,
    backendExecutable:async()=>'/Applications/Other.app/Contents/MacOS/Other'});
  assert.equal(other.pending,undefined,'an unrelated process does not block the switch');assert.equal(marker(target),'new');
  assert.equal(fs.statSync(target).ino,identity,'the app folder identity stays for Finder aliases');
});

async function profile0_1_6(root) {
  const workspace=path.join(root,'legacy-project');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'legacy',project_name:'Legacy',plan_revision:3,scope_id:'scope',
      execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
  await fsp.writeFile(path.join(root,'settings.json'),JSON.stringify({chatgptChannel:'secure-tunnel',shellTheme:'dark',hideToolCalls:false,
    sidebarWidth:400,chatColors:{},projectsParent:null},null,2));
}

test('a 0.1.6 profile is used in place with the same schema for rollback; a foreign lock is reported',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:120000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-upgrade-profile-'));
  t.after(()=>fsp.rm(root,{recursive:true,force:true,maxRetries:20,retryDelay:100}));
  await profile0_1_6(root);
  const before=Object.fromEntries(['workspaces.json','settings.json'].map(name=>[name,fs.readFileSync(path.join(root,name))]));
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],{cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGKILL');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('startup timeout '+errors)),30000);
    readline.createInterface({input:backend.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.ready){clearTimeout(timer);resolve(value);}}catch{}});});
  const client=new BackendConnection({port:ready.port,token:ready.token});
  const handshake=await client.connect();assert.equal(handshake.appVersion,'0.2.0');
  const projects=(await client.read('projects.list')).projects;
  assert.equal(projects[0].projectId,'legacy','the 0.1.6 project list is used in place');
  assert.equal((await client.read('settings.get')).theme,'dark');
  client.close();
  backend.stdin.end('stop\n');await new Promise(resolve=>backend.once('exit',resolve));
  // 0.1.6 reads the same schema: only the ordinary open timestamps move.
  const withoutOpenTimes=value=>JSON.parse(JSON.stringify(value,(key,item)=>key==='lastOpenedAt'?undefined:item));
  const stores=name=>JSON.parse(name in before?before[name].toString():'{}');
  const after=JSON.parse(fs.readFileSync(path.join(root,'workspaces.json'),'utf8'));
  assert.equal(after.schemaVersion,6);assert.deepEqual(withoutOpenTimes(after),withoutOpenTimes(stores('workspaces.json')));
  assert.deepEqual(fs.readFileSync(path.join(root,'settings.json')),before['settings.json'],'settings are not rewritten');
  // An earlier release holding the profile lock: the client explains it and starts nothing else.
  const holderScript=path.join(root,'hold-lock.mjs');
  await fsp.writeFile(holderScript,`import {app} from 'electron';app.setName('Workflow Pilot');app.setPath('userData',${JSON.stringify(root)});
app.whenReady().then(()=>{if(!app.requestSingleInstanceLock()){app.exit(9);return;}process.stdout.write('locked\\n');});`);
  const holder=spawn(electron,[holderScript],{env,stdio:['ignore','pipe','pipe']});t.after(()=>{if(holder.exitCode===null)holder.kill('SIGKILL');});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('lock holder did not start')),15000);
    readline.createInterface({input:holder.stdout}).on('line',line=>{if(line==='locked'){clearTimeout(timer);resolve();}});});
  const ui=spawn(electron,['.','--desktop-client','--client-fixture','--client-backend-root='+root,'--client-root='+path.join(root,'client')],{cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(ui.exitCode===null)ui.kill('SIGKILL');});
  const waiting=[];readline.createInterface({input:ui.stdout}).on('line',line=>{let value;try{value=JSON.parse(line);}catch{return;}
    for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}});
  const next=match=>new Promise(resolve=>waiting.push({match,resolve}));
  assert.equal((await next(value=>value.clientReady)).connected,false);
  const reply=next(value=>value.op==='probe');ui.stdin.write('{"op":"probe"}\n');
  const probe=(await reply).value;
  assert.equal(probe.error,'BACKEND_OWNER_CONFLICT');
  assert.match(probe.sidebar,/занят другой запущенной копией/,'the sidebar renders the reason');
  assert.equal(fs.existsSync(path.join(root,'.backend-host','service.json')),false,'no second owner was created');
  const gone=child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve));
  ui.kill('SIGTERM');holder.kill('SIGTERM');await Promise.all([gone(ui),gone(holder)]);
});
