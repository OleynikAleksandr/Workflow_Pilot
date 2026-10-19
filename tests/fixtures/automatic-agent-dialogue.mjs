import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {createFixture} from '../../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import {readPlan} from '../../packages/workflow-kit/src/lib/plan.mjs';
import {ControlFacade} from '../../src/control/facade.mjs';
import {SessionPlans} from '../../src/control/sessions/session-plans.mjs';
import {sessionStore} from '../../src/control/sessions/service.mjs';
import {ContextSession} from '../../src/control/context/context-session.mjs';
import {createWorkflowCoordination} from '../../src/control/workflow/coordination.mjs';
import {openCommunicationStore} from '../../src/execution/plugin/communication-store.mjs';
import {bridge,client,communicationHtml} from './plugin-host.mjs';

// Only the ChatGPT host/model and the physical composer are simulated. Registration,
// SDK, Python MCP, plan button, scheduler, sessions, persistence and Kit/Git are real.
export async function automaticDialogue(t,experience='chat'){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-dialogue-e2e-')));
  const cleanups=[],testPort={after:fn=>cleanups.unshift(fn)},errors=[],records=new Map(),jobs=new Set(),notifications=[];
  let workflow,plugin,c,closed=false;
  const root=createFixture(directory),setup={node:async()=>process.execPath,
    environment:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),
      GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}};
  const plans=new SessionPlans({setup});
  const control=new ControlFacade({storageFile:path.join(directory,'sessions.json'),execution:{},
    getExecutionSettings:()=>({parallel_allowed:true,max_workers:2})});
  const store=control.projects;await store.load();await store.select(root);
  const origin=await store.newSession(root,experience);
  const error=e=>{if(!closed)errors.push(e);};
  const reportPage=record=>{if(!closed&&!record.disposed)workflow.observePage(record.pageState.current,record);};
  const finish=record=>{
    const page=record.pageState.current.state;
    page.busy=false;page.lastMessageRole='assistant';page.assistantRevision++;page.turnId='a'+page.assistantRevision;
    reportPage(record);
  };
  const taskFile={T001:'README.md',T002:'SECOND.md',T003:'THIRD.md'};
  const runAgent=async(record,request)=>{
    const metadata=record.metadata,notice=request.content.find(item=>item.type==='text').text;
    const args=JSON.parse(notice.match(/аргументами (\{[^\n]+?\})\./)[1]);
    const call=async(name,input)=>{
      const r=await c.callTool({name:'workflow_communication_'+name,arguments:input,_meta:metadata});
      assert.equal(r.isError,false,JSON.stringify(r.structuredContent));return r.structuredContent;
    };
    const message=await call('read_message',args);
    assert.equal(message.role_protocol,2);
    let text='';for(let part=0,total=1;part<total;part++){
      const value=await call('read_context',{message_id:message.message_id,context_ref:message.context_ref,part});
      text+=value.text;total=value.total;
    }
    const project=record.project();notifications.push({...message,text,sessionId:project.sessionId});
    if(project.assignmentId){
      if(message.kind==='assignment-start'){
        assert.equal(record.bootstrapCount,1);assert.equal(record.controller.state.messageSent,true);
        await plans.call(project.workspace,'task:start',[project.taskId]);
        if(project.taskId==='T001'){
          await wait(()=>notifications.some(n=>n.task_id==='T002'&&n.kind==='assignment-start'),'two independent workers started');
          const result=await plans.call(project.workspace,'task:block',['--task','T001','--reason','Local policy is not specified; checked both local choices; no commands remain active. Resume by writing the orchestrator-selected wording.']);
          record.blockId=result.signal.block_id;return;
        }
      }else if(message.kind==='decision'){
        assert.equal(message.block_id,record.blockId);assert.match(text,/worker-a/);
        assert.equal(readPlan(project.workspace).current_task_id,'T001','the decision resumes the same task');
      }else throw new Error('Unexpected executor message: '+message.kind);
      if(project.taskId==='DOCS')await fs.rm(path.join(project.workspace,'docs/planning/dialogue.md'));
      else await fs.writeFile(path.join(project.workspace,taskFile[project.taskId]),'# worker-'+({T001:'a',T002:'b',T003:'c'}[project.taskId])+'\n');
      await plans.call(project.workspace,'commit',['--task',project.taskId]);
    }else if(message.kind==='question'){
      assert.equal(message.task_id,'T001');assert.ok(message.assignment_id);assert.ok(message.sender_id);
      await plans.call(root,'assignment:message',['--id',message.assignment_id,'--block-id',message.block_id,'--text','Use worker-a; validate the local dependency and commit the same task.']);
    }else if(message.kind==='finalization'){
      for(const assignment of workflow.execution.view(root).assignments??[])if(assignment.status==='READY_FOR_INTEGRATION'){
        const status=await plans.call(root,'assignment:status',['--id',assignment.id]);
        await plans.call(root,'integration:start',[],{id:assignment.id,source_commit:status.source_commit});
      }
      if(text.includes('assignment:cleanup'))assert.equal((await plans.call(root,'assignment:cleanup')).only_main,true);
    }else throw new Error('Unexpected orchestrator message: '+message.kind);
  };
  function ensure(project){
    if(records.has(project.sessionId))return records.get(project.sessionId);
    const record={identity:{workspace:project.workspace,sessionId:project.sessionId,assignmentId:project.assignmentId},ready:true,
      disposed:false,loading:false,paused:false,cleanups:[],bootstrapCount:0,domWorkSends:0,
      project:()=>store.project(project.workspace,project.sessionId),metadata:{'openai/session':project.sessionId,'openai/subject':'fixture-owner'},
      pageState:{current:{documentId:'doc-'+project.sessionId,state:{url:project.experience==='work'?'https://chatgpt.com/work/':'https://chatgpt.com/',
        busy:false,editorAvailable:true,writable:true,draftPresent:false,login:'signed-in',lastMessageRole:'assistant',
        userMessagesRevision:0,assistantRevision:0,turnId:'a0',userTurnId:'u0'}}}};
    const page=record.pageState.current.state;
    const composer=record.composer={inFlight:false,getURL:()=>page.url,clearNewSessionDraft:async()=>({action:'draft-cleared'}),
      inspect:async({action}={})=>({...page,login:false,draftLength:0,messageSeen:record.bootstrapCount>0,
        ...(action==='select-experience'?{action:'experience-confirmed'}:{})}),
      sendUserMessage:async()=>{record.domWorkSends++;throw Error('Working message attempted DOM fallback');},
      deliver:async input=>{
        assert.equal(record.bootstrapCount,0,'initial context is not replayed');assert.ok(input.attachments.length);
        await input.onBeforeFill();await input.onBeforeSend();composer.inFlight=true;page.busy=true;
        try{
          const invitation=JSON.parse(input.text.match(/workflow_pilot_panel с аргументами (\{"enrollment_ticket":"[a-f0-9]+"\})/)[1]);
          const registered=await c.callTool({name:'workflow_pilot_panel',arguments:invitation,_meta:record.metadata});
          assert.equal(registered.isError,false,JSON.stringify(registered.structuredContent));
          record.bootstrapCount++;record.registration=registered.structuredContent.registration;
          record.ui=await communicationHtml(testPort,c,{hostMetadata:record.metadata,timerMs:ms=>ms===2000?40:ms,
            onMessage:request=>{
              assert.equal(page.busy,false,'the physical conversation is idle before SDK notification');
              page.busy=true;page.userMessagesRevision++;page.userTurnId='u'+page.userMessagesRevision;page.lastMessageRole='user';reportPage(record);
              const job=runAgent(record,request).catch(error).finally(()=>{jobs.delete(job);finish(record);});jobs.add(job);
              return {}; // Host acceptance precedes the model's asynchronous work.
            }});
          page.url='https://chatgpt.com/c/'+project.sessionId;page.userMessagesRevision++;page.userTurnId='u'+page.userMessagesRevision;
          finish(record);return {state:'sent'};
        }finally{composer.inFlight=false;}
      }};
    record.controller=new ContextSession({store:sessionStore(store,record.identity),composer,
      runtime:{ensure:async()=>{},loadContext:(workspace,role)=>plans.loadContext(workspace,role),prepareBootstrap:p=>workflow.prepareBootstrap(p)},
      onChange:()=>{if(record.controller?.state.phase==='error')error(new Error(JSON.stringify(record.controller.state.error)));}});
    records.set(project.sessionId,record);return record;
  }
  const live={visible:null,paused:false,all:()=>[...records.values()],find:project=>records.get(project?.sessionId),ensure,
    navigate:async(record,url,{freshDraft}={})=>{
      record.pageState.current.state.url=url;record.controller.attach(record.project(),{freshDraft});
      await record.controller.tick();await record.controller.tick();reportPage(record);return record;
    },release:record=>{record.disposed=true;record.controller.cancel();for(const fn of record.cleanups.splice(0))fn();}};
  workflow=createWorkflowCoordination({store,setup,plans,getController:()=>live.visible?.controller,
    available:()=>false,contextAvailable:()=>false,onChange:()=>{},report:error,save:async()=>{},getPlugin:()=>plugin});
  workflow.attachSessions(live);
  plugin=control.createPlugin({loadContext:(workspace)=>plans.loadContext(workspace),communicationStore:await openCommunicationStore(path.join(directory,'communication')),
    observe:workflow.observeParticipant,admit:workflow.admitParticipant,currentMessage:workflow.currentMessage,onCommunicationChange:workflow.communicationChanged});
  await plugin.communication.ready;plugin.communication.waitMs=40;
  await bridge(testPort,{directory,plugin});c=await client(testPort,{directory});
  t.after(async()=>{
    closed=true;workflow.execution.dispose();workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();
    for(const record of records.values())live.release(record);
    await Promise.allSettled([...jobs]);for(const fn of cleanups)await fn();
    plugin.communication.dispose();await plugin.communication.tail;await store.whenIdle();
    await fs.rm(directory,{recursive:true,force:true,maxRetries:3});
  });
  const wait=async(check,label,timeout=180000)=>{
    const end=Date.now()+timeout;
    while(Date.now()<end){if(errors.length)throw errors[0];if(await check())return;await delay(50);}
    throw Error(label+': '+JSON.stringify({execution:workflow.execution.view(root),panels:[...records.values()].map(r=>({
      session:r.project().sessionId,url:r.project().chatUrl,page:r.pageState.current,pending:r.controller.pending,
      phase:r.controller.state.phase,errors:r.ui?.errors,diagnostic:r.ui?.$('diagnostics')?.textContent,
      body:r.ui?.dom.window.document.body.textContent.slice(0,2500),calls:r.ui?.calls.slice(-20)
    }))}));
  };
  const o=live.visible=ensure(origin);await live.navigate(o,o.composer.getURL(),{freshDraft:true});
  assert.ok(o.ui,JSON.stringify(o.controller.state));
  await wait(()=>o.ui.$('binding').textContent.includes('подтверждена'),'orchestrator bootstrap');
  assert.equal((await plugin.communication.recover({metadata:o.metadata})).participants.length,1);
  assert.equal(o.ui.messages.length,0,'bootstrap before scope has no permission');
  await fs.mkdir(path.join(root,'docs/planning'),{recursive:true});
  await fs.writeFile(path.join(root,'docs/planning/dialogue.md'),'# Isolated automatic dialogue\n');
  const task=(id,file,dependencies=[])=>({id,title:'Write '+file,why:'Actual automatic dialogue fixture',dependencies,parallel_safe:true,
    files:[file],checks:['dependency'],acceptance:['Checked output committed'],commit:'docs: '+file});
  await plans.call(root,'plan:create',[],{id:'dialogue-fixture',spec:'docs/planning/dialogue.md',stack:'Node fixture',objective:'Two independent assignments, a question and a dependent result',approval:'Isolated fixture authorized',
    parallel_allowed:true,max_workers:2,execution_strategy:'orchestrated',execution_reason:'Two independent files, then verified integration',execution_origin_session_id:origin.sessionId,release:false,
    acceptance:['One Start; complete work without manual panel action'],checks:[{id:'dependency',executable:'npm',args:['test'],required:false,timeout_ms:30000}],
    tasks:[task('T001','README.md'),task('T002','SECOND.md'),task('T003','THIRD.md',['T001','T002'])]});
  await store.reconcileRoles(root);await store.selectSession(root,origin.sessionId);workflow.execution.observe(root);
  await workflow.execution.signal(root);assert.equal(records.size,1,'publication alone opens no executor');
  assert.equal((await workflow.setPlanExecution()).state,'running','actual plan button entry point');
  await wait(()=>workflow.executionControl.view(root,'dialogue-fixture').state==='complete','plan completion');
  assert.equal(readPlan(root).delivery_status,'READY_FOR_ACCEPTANCE');
  assert.deepEqual(readPlan(root).tasks.map(task=>task.commit_status),['DONE','DONE','DONE','DONE']);
  assert.equal(records.size,5,'one O, three substantive E, and a DOCS assignment');
  for(const record of records.values()){
    assert.equal(record.bootstrapCount,1);assert.equal(record.domWorkSends,0);
    assert.equal(record.ui.calls.includes('workflow_communication_enable'),false);assert.equal(record.ui.calls.includes('workflow_communication_join'),false);
    assert.equal(record.project().experience,record===o?experience:'chat');
  }
  assert.equal(notifications.filter(n=>n.kind==='question').length,1);assert.equal(notifications.filter(n=>n.kind==='decision').length,1);
  assert.equal((await plans.call(root,'assignment:cleanup')).only_main,true);
  const run=[...plugin.communication.runs.values()][0];assert.equal(run.grant.phase,'complete');assert.equal(run.grant.active,false);
  assert.equal(workflow.executionControl.snapshot()[root].route,'plugin-v1');
  return {notifications,run,root};
}
