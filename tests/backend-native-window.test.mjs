import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {BackendConnection} from '../src/frontend/client/connection.mjs';
import {createBackendOperations} from '../src/backend/operations.mjs';
import {WorkspaceSessions} from '../src/control/sessions/workspace-session.mjs';
import {execFileSync} from 'node:child_process';

const settle=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));

async function startFixtureBackend(t,prepare=async()=>{}) {
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-native-window-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  await prepare(root);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+root],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGTERM');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout}),replies=[];
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);else if(value.op)replies.push(value);}catch{}});
      backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('backend startup timeout: '+errors)),25000);}),
  ]).finally(()=>clearTimeout(deadline));
  const until=async(predicate,label,limit=300)=>{for(let i=0;i<limit;i++){const value=await predicate();if(value)return value;await settle(25);}assert.fail('Timed out: '+label);};
  // Each command gets its own reply: earlier replies of the same op are consumed.
  const command=async(op)=>{
    const seen=replies.length;backend.stdin.write(JSON.stringify({op})+'\n');
    return until(()=>{const index=replies.findIndex((reply,i)=>i>=seen&&reply.op===op);return index>=0&&replies.splice(index,1)[0];},op);
  };
  const stop=async()=>{
    backend.stdin.end('stop\n');
    return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('backend did not stop')),10000);
      backend.once('exit',value=>{clearTimeout(timeout);resolve(value);});});
  };
  return {root,electron,env,ready,until,command,stop,errors:()=>errors};
}

test('native window of the backend: state, control, the real page, an HTTP client beside it, and close without stopping work',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:120000},async t=>{
  const backend=await startFixtureBackend(t);
  const http=new BackendConnection({port:backend.ready.port,token:backend.ready.token});t.after(()=>http.close());
  await http.connect();
  // The fixture page exists before the window opens.
  const first=await backend.until(async()=>{const value=await http.json('/v1/browser/fixture-state',{});return value.page&&value;},'fixture page');
  assert.deepEqual(await backend.command('native-open'),{op:'native-open',opened:true});
  const opened=await backend.until(async()=>{const value=await backend.command('native-probe');
    return value.native?.open&&value.native.control&&value.native.sidebar.length>0&&value;},'native window with state and control');
  assert.match(opened.native.clientId,/^native-/);
  // The selected page is the real view inside the window.
  const shown=await backend.until(async()=>{const value=await backend.command('native-probe');return value.native.page&&value.attached&&value;},'page shown in the window');
  const draft=await http.json('/v1/fixture/rect',{method:'POST',body:{selector:'#draft'}});
  assert.equal(shown.native.page,draft.browserSessionId,'the window shows the selected backend page');
  assert.equal(first.visible,false);
  // The HTTP client takes control; the native window becomes an observer.
  // Without the lease an HTTP client cannot act; the window holds it.
  await assert.rejects(http.acquire(),{code:'BACKEND_LEASE_HELD'});
  await http.acquire({takeover:true});
  await backend.until(async()=>{const value=await backend.command('native-probe');return value.native.control===false&&value;},'native window observes');
  await http.release();
  await backend.until(async()=>(await backend.command('native-probe')).native.control,'native window takes the free lease back');
  // Closing the window returns the page to its hidden host; the page keeps running.
  const before=(await http.json('/v1/browser/fixture-state',{})).page;
  await backend.command('native-close');
  const closed=await backend.until(async()=>{const value=await backend.command('native-probe');return value.native===null&&value;},'window closed');
  assert.equal(closed.attached,false,'the page left the closed window');
  const after=await backend.until(async()=>{const value=(await http.json('/v1/browser/fixture-state',{})).page;return value.ticks>before.ticks+5&&value;},'page keeps running');
  assert.equal(after.bootId,before.bootId,'closing the window never reloads the page');
  // The window opens again with the same page.
  await backend.command('native-open');
  await backend.until(async()=>{const value=await backend.command('native-probe');return value.native?.open&&value.attached&&value;},'reopened window shows the page');
  assert.equal(await backend.stop(),0,backend.errors());
});

test('window.open: presentation without the lease or the journal, refused for a remote device',async()=>{
  const operations=createBackendOperations({bootGeneration:'boot-1',journal:{},catalog:{'window.open':()=>({opened:true})}});
  const command={requestId:'r1',operation:'window.open',args:{},bootGeneration:'boot-1'};
  assert.deepEqual(await operations.submit(command),{requestId:'r1',status:'completed',value:{opened:true}});
  await assert.rejects(operations.submit({...command,requestId:'r2'},{clientId:'device-1'}),{code:'REMOTE_LOCAL_ONLY'});
  operations.dispose();
});

test('a launch of the app asks the running backend for its native window and exits',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:120000},async t=>{
  const backend=await startFixtureBackend(t);
  const launcher=spawn(backend.electron,['.','--client-fixture','--client-launcher','--client-backend-root='+backend.root,
    '--client-root='+path.join(backend.root,'launcher')],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:backend.env,stdio:['ignore','pipe','pipe']});
  t.after(()=>{if(launcher.exitCode===null)launcher.kill('SIGKILL');});
  let output='';launcher.stdout.setEncoding('utf8');launcher.stdout.on('data',chunk=>{output+=chunk;});
  const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('launcher did not exit: '+output)),45000);
    launcher.once('exit',value=>{clearTimeout(timer);resolve(value);});});
  assert.equal(code,0);assert.match(output,/"launcherOpened":true/,'the launcher opened the native window, not a client window');
  assert.doesNotMatch(output,/clientReady/);
  await backend.until(async()=>(await backend.command('native-probe')).native?.open,'native window opened by the launch');
  // A second launch focuses the same window.
  const again=spawn(backend.electron,['.','--client-fixture','--client-launcher','--client-backend-root='+backend.root,
    '--client-root='+path.join(backend.root,'launcher-2')],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:backend.env,stdio:['ignore','ignore','ignore']});
  assert.equal(await new Promise(resolve=>again.once('exit',resolve)),0);
  const probe=await backend.command('native-probe');
  assert.equal(probe.native.open,true);
  assert.equal(await backend.stop(),0,backend.errors());
});

// One registered project with a plan; the backend selects its chat (the fixture page).
async function alphaProject(root) {
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
  await new WorkspaceSessions(path.join(root,'workspaces.json')).select(workspace);
}
function startHttpClient(backend) {
  const child=spawn(backend.electron,['.','--http-client','--client-fixture','--client-backend-root='+backend.root,'--client-root='+path.join(backend.root,'http-client')],
    {cwd:fileURLToPath(new URL('../',import.meta.url)),env:backend.env,stdio:['pipe','pipe','pipe']});
  const waiting=[];
  readline.createInterface({input:child.stdout}).on('line',line=>{let value;try{value=JSON.parse(line);}catch{return;}
    for(const entry of [...waiting])if(entry.match(value)){waiting.splice(waiting.indexOf(entry),1);entry.resolve(value);}});
  const next=(match,label)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('client timeout: '+label)),40000);
    waiting.push({match,resolve:value=>{clearTimeout(timer);resolve(value);}});});
  const call=command=>{const reply=next(value=>value.op===command.op||value.op==='error',command.op);child.stdin.write(JSON.stringify(command)+'\n');return reply;};
  return {child,ready:next(value=>value.clientReady,'ready'),call};
}

test('native window and HTTP client on one backend: one writer, typing through the HTTP client, close and reopen during work',
  {skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:180000},async t=>{
  const backend=await startFixtureBackend(t,alphaProject);
  const http=new BackendConnection({port:backend.ready.port,token:backend.ready.token});t.after(()=>http.close());
  await http.connect();
  await backend.command('native-open');
  const native=await backend.until(async()=>{const value=await backend.command('native-probe');
    return value.native?.control&&/Alpha/.test(value.native.sidebar)&&value.attached&&value;},'native window shows the project and its chat');
  // The HTTP client beside it observes: the native window holds the lease.
  const client=startHttpClient(backend);t.after(()=>{if(client.child.exitCode===null)client.child.kill('SIGKILL');});
  assert.equal((await client.ready).connected,true);
  const observing=await backend.until(async()=>{const value=(await client.call({op:'probe'})).value;return value.state&&value.viewers>0&&value;},'HTTP client sees the page');
  assert.equal(observing.control,false);assert.match(observing.title,/наблюдение/);
  assert.match(observing.sidebar,/Alpha/,'both windows show the same state');
  // Closing the native window during work hands control to the HTTP client.
  const before=(await http.json('/v1/browser/fixture-state',{})).page;
  await backend.command('native-close');
  await backend.until(async()=>(await client.call({op:'probe'})).value.control,'HTTP client takes the free lease');
  const draft=await http.json('/v1/fixture/rect',{method:'POST',body:{selector:'#draft'}});
  // Under a loaded suite the first input can precede the client's own lease; an attempt repeats until the text is in.
  const typed=async()=>(await http.json('/v1/browser/fixture-state',{})).page.draft.includes('из HTTP-клиента');
  for(let attempt=0;attempt<10&&!await typed();attempt++) {
    await client.call({op:'page-click',x:draft.x,y:draft.y});
    await client.call({op:'paste',text:'из HTTP-клиента'});
    for(let i=0;i<20&&!await typed();i++)await settle(50);
  }
  assert.equal(await typed(),true,'typing through the HTTP client');
  // The native window opens again on the same live page and observes.
  await backend.command('native-open');
  const reopened=await backend.until(async()=>{const value=await backend.command('native-probe');return value.native?.open&&value.attached&&value;},'reopened');
  assert.equal(reopened.native.control,false,'the HTTP client keeps control until taken over');
  const after=(await http.json('/v1/browser/fixture-state',{})).page;
  assert.equal(after.bootId,before.bootId,'the page was never reloaded');assert.match(after.draft,/из HTTP-клиента/);
  assert.notEqual(native.native.clientId,reopened.native.clientId,'a reopened window is a new client');
  client.child.kill('SIGTERM');
  assert.equal(await backend.stop(),0,backend.errors());
});
