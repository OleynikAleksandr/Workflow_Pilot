import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {startServeProxy} from './fixtures/remote-serve-proxy.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=100)=>new Promise(resolve=>setTimeout(resolve,ms));

function lines(child) {
  const waiting=[],seen=[];
  readline.createInterface({input:child.stdout}).on('line',line=>{
    let value;try{value=JSON.parse(line);}catch{return;}
    seen.push(value);
    for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}
  });
  return (match,label,timeoutMs=40000)=>{
    const found=seen.find(match);if(found)return Promise.resolve(found);
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('timeout: '+label)),timeoutMs);
      waiting.push({match,resolve:value=>{clearTimeout(timer);resolve(value);}});});
  };
}

test('remote web client in Chromium: pairing on the Mac, the same UI and page, window requests stay on the device',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:180000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-web-client-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const workspace=path.join(root,'alpha');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),'<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,
    project_id:'fixture-alpha',project_name:'Alpha',plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
    tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],{cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  const fromBackend=lines(backend);
  const ready=await fromBackend(value=>value.ready,'backend');
  backend.stdin.write(JSON.stringify({op:'remote-enable'})+'\n');
  const enabled=await fromBackend(value=>value.op==='remote-enable','remote enable');
  assert.ok(enabled.remote?.port,'the gateway listens after an explicit enable');
  const proxy=await startServeProxy({targetPort:enabled.remote.port});t.after(()=>proxy.close());
  // A Mac window of the same backend: it must not receive the device's window requests.
  const mac=new BackendConnection({port:ready.port,token:ready.token});t.after(()=>mac.close());
  await mac.connect();const macCommands=[];
  mac.subscribe({onCommand:command=>macCommands.push(command.type)});
  const browser=spawn(electron,[path.join(project,'tests/fixtures/web-client-browser.mjs'),`http://127.0.0.1:${proxy.port}/`],
    {cwd:project,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(browser.exitCode===null)browser.kill('SIGKILL');});
  const fromBrowser=lines(browser);await fromBrowser(value=>value.ready,'browser');
  let id=0;
  const probe=async code=>{const request=++id;browser.stdin.write(JSON.stringify({op:'eval',id:request,code})+'\n');
    const answer=await fromBrowser(value=>value.id===request,'probe '+code);if(answer.error)throw new Error(answer.error);return answer.value;};
  const until=async(code,label)=>{for(let i=0;i<200;i++){const value=await probe(code).catch(()=>null);if(value)return value;await settle(150);}assert.fail('timeout: '+label);};
  const code=await until("(/^\\d{6}$/.test(document.getElementById('pairing-code').textContent)&&document.getElementById('pairing-code').textContent)",'pairing code');
  assert.match(code,/^\d{6}$/,'the device shows a code and waits for the Mac');
  backend.stdin.write(JSON.stringify({op:'remote-approve'})+'\n');
  await fromBackend(value=>value.op==='remote-approve','approve');
  await until("document.getElementById('app')?.classList.contains('ready')",'connected web client');
  const sidebar=await until("document.getElementById('sidebar').contentDocument?.body?.innerText?.includes('Alpha')&&document.getElementById('sidebar').contentDocument.body.innerText",'sidebar state');
  assert.match(sidebar,/alpha/i,'the same Desktop UI renders backend state');
  await until("document.getElementById('status').textContent.includes('этого устройства')",'control on the device');
  await until("document.getElementById('frame').src.startsWith('blob:')",'page frame');
  const mime=await probe("document.getElementById('frame').dataset.mime");
  assert.equal(mime,'image/jpeg','the remote device receives compressed frames');
  await probe("document.getElementById('sidebar').contentWindow.webPilot.openArchive().then(()=>true)");
  await until("document.getElementById('archive-overlay').classList.contains('open')",'archive inside the page');
  await settle(300);
  assert.equal(macCommands.includes('ui.open-archive'),false,'the Mac window opens nothing for the device');
  assert.equal(await probe("document.getElementById('sidebar').contentWindow.__wpRemote===true"),true);
  browser.stdin.write(JSON.stringify({op:'quit'})+'\n');
  backend.stdin.end('stop\n');
});
