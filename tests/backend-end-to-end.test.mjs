import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {processAlive} from '../src/backend/identity.mjs';
import {launchMode} from '../src/contracts/launch.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=100)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,label,timeoutMs=30000) {
  const deadline=Date.now()+timeoutMs;
  for(;;){const value=await predicate();if(value)return value;if(Date.now()>deadline)assert.fail('Timed out: '+label);await settle();}
}

test('the only dynamic entries of main are the three launch modes',async()=>{
  const main=await fsp.readFile(path.join(project,'src/main.mjs'),'utf8');
  assert.deepEqual([...main.matchAll(/import\('([^']+)'\)/g)].map(match=>match[1]).sort(),
    ['./backend/main.mjs','./frontend/desktop/bootstrap.mjs','./frontend/desktop/client.mjs']);
  assert.match(main,/launch\.mode==='in-process'/);
  assert.notEqual(launchMode(['app','--event-runtime-checker'],{packaged:true}).mode,'in-process','a release never reaches the in-process window');
});

function desktopClient(electron,root,env) {
  const child=spawn(electron,['.','--desktop-client','--client-fixture','--client-backend-root='+root,'--client-root='+path.join(root,'client')],
    {cwd:project,env,stdio:['pipe','pipe','pipe']});
  const waiting=[];
  readline.createInterface({input:child.stdout}).on('line',line=>{let value;try{value=JSON.parse(line);}catch{return;}
    for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}});
  const next=match=>new Promise(resolve=>waiting.push({match,resolve}));
  return {child,ready:next(value=>value.clientReady),
    probe:async()=>{const reply=next(value=>value.op==='probe');child.stdin.write('{"op":"probe"}\n');return (await reply).value;},
    exited:new Promise(resolve=>child.once('exit',resolve))};
}

test('launcher → work → client crash → work continues → reconnect to the same page and operation → safe stop',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:240000},async t=>{
  const root=await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(),'wp-end-to-end-')));
  const workspace=path.join(root,'alpha');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'e2e-alpha',project_name:'Alpha',plan_revision:1,scope_id:'scope',
      execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  const selected=await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
  const store=new WorkspaceSessions(path.join(root,'workspaces.json'));await store.load();
  await store.bindChat(selected.workspace,selected.sessionId,'https://chatgpt.com/c/end-to-end-chat');
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  let backendPid=null;
  t.after(async()=>{if(backendPid&&processAlive(backendPid))try{process.kill(backendPid,'SIGKILL');}catch{}
    await settle(300);await fsp.rm(root,{recursive:true,force:true,maxRetries:20,retryDelay:100});});
  // Ordinary launch: the client finds no backend and starts exactly one.
  const first=desktopClient(electron,root,env);t.after(()=>{if(first.child.exitCode===null)first.child.kill('SIGKILL');});
  assert.equal((await first.ready).connected,true);
  const descriptor=JSON.parse(fs.readFileSync(path.join(root,'.backend-host','service.json'),'utf8'));backendPid=descriptor.pid;
  await until(async()=>{const value=await first.probe();return value.control&&value.frame;},'client controls and shows the page');
  // An independent API client without preload: same state, explicit takeover for its own operation.
  const api=new BackendConnection({port:descriptor.port,token:descriptor.token});t.after(()=>api.close());
  await api.connect();
  const ui=new Map();api.subscribe({onUi:(kind,value)=>ui.set(kind,value)});
  await until(()=>ui.get('state')?.selected?.sessionId===selected.sessionId,'API sees the restored selected session');
  const page=async()=>(await api.json('/v1/browser/fixture-state'));
  const before=await until(async()=>{const value=await page();return value.page&&value;},'fixture page');
  assert.equal(before.url,'https://chatgpt.com/c/end-to-end-chat');
  await api.acquire({takeover:true});
  const operation=await api.submit('ui.invoke',{surface:'local',channel:'pilot:rename-project',input:{workspace:selected.workspace,name:'Сквозной'}},{requestId:'end-to-end-rename'});
  assert.equal(operation.status,'accepted');
  // The client process dies; the backend, its page and the operation continue.
  first.child.kill('SIGKILL');await first.exited;
  await settle(500);
  assert.equal(processAlive(backendPid),true);
  assert.equal((await api.wait(operation.operationId)).status,'completed');
  const after=await page();
  assert.equal(after.page.bootId,before.page.bootId,'no reload');assert.ok(after.page.ticks>before.page.ticks,'work continued without a client');
  assert.equal(after.webContentsId,before.webContentsId);
  const repeat=await api.submit('ui.invoke',{surface:'local',channel:'pilot:rename-project',input:{workspace:selected.workspace,name:'Сквозной'}},{requestId:'end-to-end-rename'});
  assert.equal(repeat.operationId,operation.operationId,'the same operation, no second effect');
  // MCP and the plugin bridge serve agents with no desktop window at all.
  const python=path.join(project,'.harness/runtime/test-python/bin/python');
  if(fs.existsSync(python)) {
    const mcp=new Client({name:'end-to-end',version:'1'});
    await mcp.connect(new StdioClientTransport({command:python,args:['-B',path.join(project,'tests/fixtures/plugin-server.py'),
      path.join(project,'tools/codex-app-server-mcp'),path.join(root,'plugin')],stderr:'pipe'}));
    const panel=await mcp.callTool({name:'workflow_pilot_panel',arguments:{}});
    assert.equal(panel.isError,false);assert.equal(panel.structuredContent.projects,undefined);assert.equal(panel.structuredContent.communication.protocol_version,1);
    const joined=await mcp.callTool({name:'workflow_communication_join',arguments:{run_id:'backend-e2e',role:'O'},
      _meta:{'openai/session':'isolated-backend-e2e'}});
    assert.equal(joined.isError,false);assert.equal(joined.structuredContent.role,'O');
    assert.ok(joined.structuredContent.participant_id,'communication also belongs to the backend without a desktop client');
    await mcp.close();
  }
  // A new client reconnects to the same backend and page; control returns only when released.
  const second=desktopClient(electron,root,env);t.after(()=>{if(second.child.exitCode===null)second.child.kill('SIGKILL');});
  assert.equal((await second.ready).connected,true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.backend-host','service.json'),'utf8')).pid,backendPid,'no second backend');
  const observing=await until(async()=>{const value=await second.probe();return value.state&&!value.control&&value;},'observer while the API client controls');
  assert.match(observing.title,/наблюдение/);
  await api.release();
  const resumed=await until(async()=>{const value=await second.probe();return value.control&&value.frame&&value;},'control returns to the window');
  assert.match(resumed.sidebar,/Сквозной/);
  assert.equal((await page()).page.bootId,before.page.bootId,'the same page after reconnect');
  // Safe stop through the API: draining, exit, released profile.
  const stopper=new BackendConnection({port:descriptor.port,token:descriptor.token});t.after(()=>stopper.close());
  await stopper.connect();await stopper.acquire({takeover:true});
  assert.equal((await stopper.submit('service.stop',{})).status,'accepted');
  await until(()=>!processAlive(backendPid),'backend stopped',20000);
  assert.equal(fs.existsSync(path.join(root,'.backend-host','owner.json')),false);
  const lost=await until(async()=>{const value=await second.probe();return value.stale&&value;},'the window shows the stopped service');
  assert.match(lost.title,/нет связи/);
  await settle(2500);
  assert.equal(fs.existsSync(path.join(root,'.backend-host','service.json')),false,'the client does not restart a stopped service');
  second.child.kill('SIGTERM');await second.exited;
});
