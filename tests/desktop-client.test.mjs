import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {processAlive} from '../src/backend/identity.mjs';

const project=fileURLToPath(new URL('../',import.meta.url));
const settle=(ms=50)=>new Promise(resolve=>setTimeout(resolve,ms));

function startClient(electron,root,env) {
  const child=spawn(electron,['.','--desktop-client','--client-fixture','--client-backend-root='+root,'--client-root='+path.join(root,'client')],
    {cwd:project,env,stdio:['pipe','pipe','pipe']});
  let errors='';child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{errors+=chunk;});
  const waiting=[],lines=readline.createInterface({input:child.stdout});
  lines.on('line',line=>{let value;try{value=JSON.parse(line);}catch{return;}for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}});
  const next=(match,label,timeoutMs=40000)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('client timeout: '+label+' '+errors)),timeoutMs);
    waiting.push({match,resolve:value=>{clearTimeout(timer);resolve(value);}});
  });
  const call=command=>{const reply=next(value=>value.op===command.op||value.op==='error',command.op);child.stdin.write(JSON.stringify(command)+'\n');return reply;};
  const exited=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  return {child,ready:next(value=>value.clientReady,'ready'),call,exited};
}

test('separate Desktop client starts the backend, renders it, and its crash leaves the backend working',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:180000},async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-desktop-client-'));
  const workspace=path.join(root,'alpha');
  await fsp.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});
  await fsp.mkdir(path.join(workspace,'scripts'),{recursive:true});
  await fsp.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
  await fsp.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fsp.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'fixture-alpha',project_name:'Alpha',
      plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',
      tasks:[],current_task_id:null})+'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  const selected=await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const serviceFile=path.join(root,'.backend-host','service.json');
  let backendPid=null;
  t.after(async()=>{
    if(backendPid&&processAlive(backendPid)){process.kill(backendPid,'SIGTERM');for(let i=0;i<100&&processAlive(backendPid);i++)await settle();}
    await fsp.rm(root,{recursive:true,force:true});
  });
  const first=startClient(electron,root,env);t.after(()=>{if(first.child.exitCode===null)first.child.kill('SIGKILL');});
  const ready=await first.ready;
  assert.equal(ready.connected,true,'the client started and reached its own backend');
  const descriptor=JSON.parse(fs.readFileSync(serviceFile,'utf8'));backendPid=descriptor.pid;
  assert.notEqual(descriptor.pid,ready.pid,'the backend is a separate process');
  const request=async(route,{method='GET',body}={})=>{
    const response=await fetch(`http://127.0.0.1:${descriptor.port}${route}`,{method,headers:{authorization:'Bearer '+descriptor.token,
      ...body?{'content-type':'application/json'}:{}},body:body&&JSON.stringify(body)});
    assert.equal(response.status,200,route);return response.json();
  };
  let probe;
  for(let i=0;i<200;i++){probe=(await first.call({op:'probe'})).value;if(probe.state&&probe.frame&&probe.sidebar.includes(path.basename(workspace)))break;await settle(100);}
  assert.equal(probe.state,true);assert.match(probe.sidebar,/alpha/i,'the sidebar renders backend state');
  assert.equal(probe.frame,true,'the page view shows a backend frame');
  // Paste and the context menu go through the client's real renderer and main process;
  // the fixture clipboard keeps the system clipboard of the test machine untouched.
  for(let i=0;i<100&&!probe.control;i++){await settle(100);probe=(await first.call({op:'probe'})).value;}
  assert.equal(probe.control,true,'the client holds the writer lease');
  const draft=await request('/v1/fixture/rect',{method:'POST',body:{selector:'#draft'}});
  await first.call({op:'page-click',x:draft.x,y:draft.y});
  const pageState=async()=>(await request('/v1/browser/fixture-state')).page;
  const until=async(check,label)=>{for(let i=0;i<100;i++){const value=await check();if(value)return value;await settle(50);}throw new Error('timeout: '+label);};
  assert.equal((await first.call({op:'paste',text:'Вставка из клиента'})).value,false,'the renderer takes over the paste event');
  await until(async()=>(await pageState()).draft==='Вставка из клиента','paste reaches the page');
  const menu=(await first.call({op:'context-menu'})).value;
  assert.deepEqual(menu.map(item=>item.label),['Вырезать','Копировать','Вставить','Выделить всё']);
  assert.deepEqual(menu.filter(item=>!item.enabled).map(item=>item.label),['Вырезать','Копировать'],'nothing is selected yet');
  await first.call({op:'menu-click',label:'Выделить всё'});
  const menuSelected=await until(async()=>{const items=(await first.call({op:'context-menu'})).value;return items[0].enabled&&items;},'select all');
  assert.equal(menuSelected.every(item=>item.enabled),true);
  await first.call({op:'menu-click',label:'Вырезать'});
  await until(async()=>(await pageState()).draft==='','cut removes the selection');
  assert.equal((await first.call({op:'clipboard'})).value,'Вставка из клиента','cut copies to the client clipboard');
  const renamed=(await first.call({op:'rename',workspace:selected.workspace,name:'Бета'})).value;
  assert.equal(renamed.ok,true,'a sidebar action goes through the API');
  for(let i=0;i<100;i++){probe=(await first.call({op:'probe'})).value;if(probe.sidebar.includes('Бета'))break;await settle(50);}
  assert.match(probe.sidebar,/Бета/);
  const before=await request('/v1/browser/fixture-state');
  assert.equal(before.sessionId,selected.sessionId);
  first.child.kill('SIGKILL');await first.exited;
  await settle(400);
  assert.equal(processAlive(backendPid),true,'a client crash does not end the backend');
  const after=await request('/v1/browser/fixture-state');
  assert.equal(after.page.bootId,before.page.bootId,'the page was not reloaded');assert.ok(after.page.ticks>before.page.ticks);
  assert.equal(fs.existsSync(path.join(root,'.backend-host','owner.json')),true);
  // A new client attaches to the same backend, nothing is started twice.
  const second=startClient(electron,root,env);t.after(()=>{if(second.child.exitCode===null)second.child.kill('SIGKILL');});
  assert.equal((await second.ready).connected,true);
  assert.equal(JSON.parse(fs.readFileSync(serviceFile,'utf8')).pid,backendPid);
  for(let i=0;i<200;i++){probe=(await second.call({op:'probe'})).value;if(probe.sidebar.includes('Бета')&&probe.frame)break;await settle(100);}
  assert.match(probe.sidebar,/Бета/);assert.equal(probe.frame,true);
  second.child.kill('SIGTERM');await second.exited;
  assert.equal(processAlive(backendPid),true,'quitting the client only disconnects');
  process.kill(backendPid,'SIGTERM');
  for(let i=0;i<100&&processAlive(backendPid);i++)await settle();
  assert.equal(processAlive(backendPid),false);assert.equal(fs.existsSync(path.join(root,'.backend-host','owner.json')),false);
});
