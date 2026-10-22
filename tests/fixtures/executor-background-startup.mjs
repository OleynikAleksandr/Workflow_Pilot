import {app,BaseWindow,BrowserWindow,WebContentsView,nativeImage,screen,session,ipcMain} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ExecutionFacade,BackendBrowserHost} from '../../src/execution/facade.mjs';
import {SessionRuntimes} from '../../src/control/sessions/service.mjs';

const root=process.argv[2],baseline=process.argv.includes('--baseline');
assert.ok(path.basename(root).startsWith('pilot-background-startup-'));
app.setPath('userData',path.join(root,'profile'));
app.on('window-all-closed',()=>{});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const hash=text=>createHash('sha256').update(text).digest('hex');
const html=`<!doctype html><style>#prompt-textarea{display:none}</style>
<button data-testid="profile-button">Account</button>
<button data-tpp-toggle-value="work" data-state="on">Work</button><button data-tpp-toggle-value="chat" data-state="off">Chat</button>
<form><textarea id="prompt-textarea"></textarea><button data-testid="send-button">Send</button></form><main></main>
<script>
window.starts=[];window.files=[];window.readyAt=0;
// CSSOM layout change: no DOM MutationObserver event, even though the editor is now usable.
setTimeout(()=>{document.styleSheets[0].deleteRule(0);window.readyAt=Date.now()},1200);
for(const b of document.querySelectorAll('[data-tpp-toggle-value]'))b.onclick=()=>{
 for(const other of document.querySelectorAll('[data-tpp-toggle-value]'))other.dataset.state=other===b?'on':'off';
};
document.querySelector('textarea').onpaste=event=>{
 if(!event.clipboardData.files.length)return;event.preventDefault();
 for(const f of event.clipboardData.files){const card=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');
 label.textContent=f.name;remove.setAttribute('aria-label','Remove file');card.append(label,remove);document.querySelector('textarea').before(card);
 f.text().then(text=>window.files.push(text));}
};
document.querySelector('form').onsubmit=event=>{event.preventDefault();const editor=document.querySelector('textarea');window.starts.push(editor.value);
 const user=document.createElement('article');user.dataset.messageAuthorRole='user';user.textContent=editor.value;document.querySelector('main').append(user);editor.value='';
 history.replaceState(null,'','/c/'+crypto.randomUUID());const assistant=document.createElement('article');assistant.dataset.messageAuthorRole='assistant';assistant.textContent='Bootstrap complete';document.querySelector('main').append(assistant);
};
</script>`;

async function run(){
await app.whenReady();
const partition='persist:isolated-background-startup',ownSession=session.fromPartition(partition);
await ownSession.protocol.handle('https',()=>new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}}));
const host=new BackendBrowserHost({BrowserWindow,BaseWindow,WebContentsView,nativeImage,screen,session:ownSession,
  partition,preload:path.resolve('resources/chatgpt-page-observer-preload.cjs'),pageMode:'view'});
const execution=new ExecutionFacade();execution.attachBrowser({host,ipc:ipcMain});
const results=[];
try{
  for(const count of [2,5]){
    const projects=new Map(),errors=[];
    const store={project:(workspace,id)=>{const p=projects.get(workspace);return !id||p?.sessionId===id?p:null;},
      inspect:async workspace=>{const {attempt,chatUrl,...p}=projects.get(workspace);return p;},
      updateSession:async(w,_id,patch)=>Object.assign(projects.get(w),patch),
      bindChat:async(w,_id,url)=>Object.assign(projects.get(w),{chatUrl:url}),recordAgentTime:async()=>{}};
    const staged=[];
    const runtime={ensure:async()=>{},prepareBootstrap:async()=>({context_transport:'panel',enrollment_ticket:'a'.repeat(64),expires_at:Date.now()+60000}),
      stageStartup:async(project,attempt)=>{staged.push({sessionId:project.sessionId,text:attempt.startupText});return {message_id:project.sessionId};},
      loadContext:async workspace=>{
        const p=projects.get(workspace),text='MANDATORY RULES ONLY';
        return {delivery_protocol:'inline-context-v1',ack_required:false,status:'ready',completeness:'COMPLETE',workspace,
          recovery_profile:'assignment-dialogue-v1',signature:hash(text),generated_at_ms:Date.now(),context:text,context_bytes:Buffer.byteLength(text),context_sha256:hash(text),
          parts:[{index:1,total:1,text,bytes:Buffer.byteLength(text),sha256:hash(text)}],
          facts:{project_id:p.projectId,project_name:p.name,plan_revision:1,scope_id:p.scopeId,execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',task_id:p.taskId,task_title:p.nextTaskTitle}};
      }};
    const sessions=new SessionRuntimes({store,runtime:()=>runtime,execution,onError:(_r,e)=>errors.push(e),
      presentation:{show:()=>{throw Error('No selection/show allowed');},hide:()=>{}}});
    const records=[];
    for(let i=0;i<count;i++){
      const workspace=path.join(root,`${count}-${i}`);await fs.mkdir(workspace);
      const p={workspace,projectId:`p-${count}-${i}`,name:'Fixture',sessionId:`s-${count}-${i}`,role:'executor',experience:'chat',
        assignmentId:`a-${count}-${i}`,taskId:'T001',parentWorkspace:root,scopeId:'assignment-'+i,scopeStatus:'ACTIVE',deliveryStatus:'IN_PROGRESS',
        planRevision:1,nextTaskId:'T001',nextTaskTitle:'Own task',chatUrl:null,attempt:null};projects.set(workspace,p);
      const r=sessions.ensure(p);r.ready=true;records.push(r);await sessions.navigate(r,'https://chatgpt.com/',{freshDraft:true});
    }
    const deadline=Date.now()+12000;
    while(Date.now()<deadline&&!records.every(r=>r.project().attempt?.state==='sent'))await delay(50);
    const pages=[];
    for(const r of records){
      const raw=await host.view(r.key).webContents.executeJavaScript('({starts,files,readyAt,visible:document.visibilityState})');
      pages.push({starts:raw.starts.length,ready:!!raw.readyAt,observedEditor:r.pageState.current?.state.editorAvailable,
        actualEditor:(await r.composer.inspect()).editorAvailable,phase:r.controller.state.phase});
      if(!baseline){assert.equal(raw.starts.length,1);assert.deepEqual(raw.files,[],'model-pull does not send attachments');
        assert.match(raw.starts[0],/workflow_pilot_panel/);assert.doesNotMatch(raw.starts[0],/MANDATORY RULES ONLY/);
        assert.ok(staged.some(s=>s.sessionId===r.project().sessionId&&s.text.includes('MANDATORY RULES ONLY')));
        assert.ok(r.project().chatUrl);}
    }
    assert.equal(errors.length,0);assert.equal(sessions.visible,null);
    results.push({count,pages});sessions.dispose();
    if(baseline)break;
  }
  console.log(JSON.stringify({backgroundBootstrap:!baseline,baseline,results}));
  execution.dispose();app.exit(0);
}catch(error){console.error(error);execution.dispose();app.exit(1);}
}
void run().catch(error=>{console.error(error);app.exit(1);});
