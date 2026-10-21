import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {execFileSync} from 'node:child_process';
import {createFixture} from '../../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs';
import {readPlan} from '../../packages/workflow-kit/src/lib/plan.mjs';
import {ControlFacade} from '../../src/control/facade.mjs';
import {SessionPlans} from '../../src/control/sessions/session-plans.mjs';
import {sessionStore} from '../../src/control/sessions/service.mjs';
import {ContextSession} from '../../src/control/context/context-session.mjs';
import {createWorkflowCoordination} from '../../src/control/workflow/coordination.mjs';
import {openCommunicationStore} from '../../src/execution/plugin/communication-store.mjs';
import {bridge,communicationHtml} from './plugin-host.mjs';
import {dialogueRuntime,dialogueApi} from './dialogue-runtime.mjs';

// Physical service lifecycle commands, ChatGPT/model and composer are simulated.
// Runtime coordination, HTTP API/MCP, SDK, scheduler, persistence and Kit/Git are real.
export async function automaticDialogue(t,experience='chat',{owned=false,conversation=false,workers=2,batchResults=false}={}){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-dialogue-e2e-')));
  const cleanups=[],testPort={after:fn=>cleanups.unshift(fn)},errors=[],records=new Map(),jobs=new Set(),notifications=[];
  let workflow,plugin,c,runtime,closed=false,sharedRepair=null,sharedRepairs=0,earlyCleanup=false,setupLockChecked=false,docsOverlap=false,finalOverlap=false;
  const drafts=new Map();let preparationTurn=false;
  const fast=owned&&batchResults,modelCalls=[];
  const root=createFixture(directory,{setupDelayMs:owned&&batchResults?1500:0}),setup={node:async()=>process.execPath,
    environment:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),
      GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}};
  const plans=new SessionPlans({setup});
  if(owned&&batchResults){
    // Hold the real setup lock long enough to exercise a concurrent O command.
    const invoke=plans.call.bind(plans);
    plans.call=async(workspace,command,args=[],...rest)=>{
      const id=command==='assignment:setup'?args[args.indexOf('--id')+1]:null;
      const assignment=id&&JSON.parse(await fs.readFile(path.join(root,'.git/workflow-kit/assignments',id+'.json'),'utf8'));
      if(assignment?.parent_task_id!=='DOCS')return invoke(workspace,command,args,...rest);
      const before=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
      const pending=invoke(workspace,command,args,...rest);
      await wait(async()=>!!await fs.stat(path.join(assignment.worktree,'.harness/runtime/setup-hook-ready')).catch(()=>null),'DOCS setup entered npm');
      await assert.rejects(invoke(root,'assignment:cleanup'),{code:'WORKFLOW_LOCKED'});
      assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}),before,'rejected O command has no effect');
      const result=await pending;setupLockChecked=true;return result;
    };
  }
  const control=new ControlFacade({storageFile:path.join(directory,'sessions.json'),execution:{},
    getExecutionSettings:()=>({parallel_allowed:true,max_workers:workers})});
  const store=control.projects;await store.load();await store.select(root);
  const origin=await store.newSession(root,experience);
  const error=e=>{if(!closed)errors.push(e);};
  const reportPage=record=>{if(!closed&&!record.disposed)workflow.observePage(record.pageState.current,record);};
  const finish=record=>{
    const page=record.pageState.current.state;
    page.busy=false;page.lastMessageRole='assistant';page.assistantRevision++;page.turnId='a'+page.assistantRevision;
    reportPage(record);
  };
  const taskFile={T001:'README.md',T002:'SECOND.md',T003:'THIRD.md',T004:'TOOL-A.md',T005:'TOOL-B.md',T006:'TOOL-C.md'};
  const independent=workers===5?['T001','T002','T004','T005','T006']:['T001','T002'];
  const runAgent=async(record,request)=>{
    const metadata=record.metadata,notice=request.content.find(item=>item.type==='text').text;
    const args=JSON.parse(notice.match(/аргументами (\{[^\n]+?\})\./)[1]);
    const call=async(name,input)=>{
      modelCalls.push(name);
      const r=await c.callTool({name:name.startsWith('assignment_')?'workflow_'+name:'workflow_communication_'+name,arguments:input,_meta:metadata});
      assert.equal(r.isError,false,JSON.stringify({name,response:r.structuredContent,task:record.project()?.taskId}));return r.structuredContent;
    };
    if(fast&&!record.project().assignmentId&&record.startupComplete&&!preparationTurn){
      // Hold only the first work turn, after the separate startup receipt.
      preparationTurn=true;
      await wait(()=>[...plugin.communication.runs.values()].flatMap(r=>r.messages)
        .filter(m=>m.idempotency_key?.startsWith('prepare:')).length===2,'two queued preparations');
    }
    const message=await call('read_message',args);
    if(message.kind==='startup-context'){
      for(let part=0,total=1;part<total;part++){
        const value=await call('read_context',{message_id:message.message_id,context_ref:message.context_ref,part});total=value.total;
      }
      const result=await c.callTool({name:'workflow_startup_complete',arguments:{message_id:message.message_id,context_sha256:message.context_ref},_meta:metadata});
      assert.equal(result.isError,false);record.startupComplete=true;return;
    }
    assert.equal(message.role_protocol,6);
    let text=fast&&message.inline_context?.complete?message.inline_context.text:'';
    for(let part=0,total=text?0:1;part<total;part++){
      const value=await call('read_context',{message_id:message.message_id,context_ref:message.context_ref,part});
      text+=value.text;total=value.total;
    }
    const project=record.project();notifications.push({...message,text,sessionId:project.sessionId});
    if(owned){
      assert.equal(message.dialogue_version,1);
      const handled=[message.message_id];
      const roster=()=>call('participants',{});
      const send=payload=>call('assignment_send',{attempt:message.attempt??1,in_reply_to:message.assignment_id?message.message_id:undefined,
        idempotency_key:message.kind+':'+message.message_id,...payload});
      const completeWork=async()=>{
        if(!readPlan(project.workspace).current_task_id)await plans.call(project.workspace,'task:start',[project.taskId]);
        if(project.taskId==='DOCS')await fs.rm(path.join(project.workspace,'docs/planning/dialogue.md'));
        else await fs.writeFile(path.join(project.workspace,taskFile[project.taskId]),'# worker-'+project.taskId+' attempt '+message.attempt+'\n');
        const committed=await plans.call(project.workspace,'commit',['--task',project.taskId]);
        const status=await plans.call(root,'assignment:status',['--id',project.assignmentId]);
        assert.equal(status.status,'READY_FOR_INTEGRATION');assert.equal(committed.ok,true);
        await send({recipient:'orchestrator',kind:'result',source_commit:status.source_commit,body:'Checked result '+project.taskId});
      };
      const repairAndResume=async target=>{
        if(!target.parked)return;
        assert.equal(target.block.block_id,sharedRepair.block_id);
        await fs.writeFile(path.join(root,'.harness/runtime/shared-rule'),'checked task-local fallback\n');sharedRepairs++;
        await send({recipient:target.recipient_ref,kind:'decision',block_id:sharedRepair.block_id,resume:true,
          body:'Shared setting repaired while parked. Use task-local fallback and validate it. Continue from the preserved task state.'});
        sharedRepair=null;
      };
      if(message.kind==='ready'){
        assert.equal(fast,false,'authorized preparation needs no extra ready model turn');
        assert.equal(message.sender_role,'backend');
        if(message.task_id==='T003')assert.ok(readPlan(root).tasks.filter(t=>independent.includes(t.id)).every(t=>t.commit_status==='DONE'));
        if(message.task_id==='DOCS')assert.ok(readPlan(root).tasks.filter(t=>t.id!=='DOCS').every(t=>t.commit_status==='DONE'));
        const target=(await roster()).assignments.find(a=>a.assignment_id===message.assignment_id);assert.ok(target);
        assert.ok(drafts.has(message.assignment_id),'O has already prepared before ready');
        await call('assignment_dispatch',{draft_id:drafts.get(message.assignment_id)});
      }else if(message.kind==='task'){
        assert.equal(message.sender_role,'O');assert.equal(record.bootstrapCount,1);
        let selected='';for(let part=0,total=1;part<total;part++){
          const v=await call('read_context',{message_id:message.message_id,context_ref:message.contexts[0].sha256,part});selected+=v.text;total=v.total;
        }
        assert.equal(selected,'Selected context for '+project.taskId);
        if(workers===5&&independent.includes(project.taskId))await wait(()=>
          new Set(notifications.filter(n=>n.kind==='task'&&independent.includes(n.task_id)).map(n=>n.assignment_id)).size===5,
          'five simultaneously active addressed tasks');
        if(conversation&&project.taskId==='T001'){
          assert.equal(readPlan(project.workspace).current_task_id,null);
          await send({recipient:'orchestrator',kind:'context_request',body:'Need the exact local normalization policy before task:start.'});
        }else await completeWork();
      }else if(message.kind==='context_request'){
        const target=(await roster()).assignments.find(a=>a.assignment_id===message.assignment_id);
        await send({recipient:target.recipient_ref,kind:'context',body:'Use the task-local policy; report a missing fixture setting without changing shared state.'});
      }else if(message.kind==='context'){
        await plans.call(project.workspace,'task:start',[project.taskId]);
        const r=await send({recipient:'orchestrator',kind:'question',blocking:true,problem_id:'local-rule',body:'Local setting absent; checked both sources; commands are finished. Need a decision.'});
        record.blockId=(await call('assignment_status',{})).assignments[0].block.block_id;assert.ok(r.message_id);
      }else if(message.kind==='question'){
        const target=(await roster()).assignments.find(a=>a.assignment_id===message.assignment_id);
        assert.equal(target.block.block_id,message.block_id);
        await send({recipient:target.recipient_ref,kind:'clarification',block_id:message.block_id,body:'Which two local sources were checked?'});
      }else if(message.kind==='clarification'){
        if(project.assignmentId){
          assert.equal(message.block_id,record.blockId);
          const state=(await call('assignment_status',{})).assignments[0];assert.equal(state.block.attempt,1);
          await send({recipient:'orchestrator',kind:'clarification',block_id:message.block_id,body:'Both task-local sources absent; no running command, no shared edits.'});
        }else{
          const target=(await roster()).assignments.find(a=>a.assignment_id===message.assignment_id);
          assert.equal(target.block.attempt,1);
          sharedRepair={assignment_id:message.assignment_id,block_id:message.block_id};
          await repairAndResume(target);
        }
      }else if(message.kind==='decision'){
        assert.equal(message.block_id,record.blockId);assert.equal(message.resume,true);
        assert.equal((await call('assignment_status',{})).assignments[0].block,null);
        await completeWork();
      }else if(message.kind==='revision_request'){
        assert.equal(message.attempt,2);await completeWork();
      }else if(message.kind==='recovery'){
        assert.equal(message.sender_role,'backend');
        if(text.includes('workflow_assignment_prepare')){
          const preparations=[message];
          if(fast)for(const item of message.preparation_queue??[]){
            const other=await call('read_message',{message_id:item.message_id});
            preparations.push(other);handled.push(other.message_id);
            notifications.push({...other,sessionId:project.sessionId,directPreparation:true});
          }
          for(const preparation of preparations){
          if(preparation.task_id==='DOCS')assert.ok(readPlan(root).tasks.filter(t=>t.id!=='DOCS').every(t=>t.commit_status==='DONE'));
          const target=fast?{recipient_ref:preparation.recipient_ref}:(await roster()).assignments.find(a=>a.assignment_id===preparation.assignment_id);
          assert.ok(target?.recipient_ref);
          if(fast){
            assert.equal(preparation.inline_context?.complete,true,'small service message includes its complete context');
            assert.equal(preparation.task_brief,readPlan(root).tasks.find(t=>t.id===preparation.task_id).task_brief,'saved planning brief is read by O');
          }
          const prepared=await call('assignment_prepare',{recipient:target.recipient_ref,attempt:preparation.attempt,
            body:preparation.task_brief??'Implement only '+preparation.task_id+' and return the checked commit.',
            contexts:[{source:'orchestrator-selection',text:'Selected context for '+preparation.task_id}],
            idempotency_key:'prepare:'+preparation.assignment_id,...(fast?{dispatch_when_ready:true}:{})});
          assert.equal(prepared.published,false);
          const record=[...records.values()].find(r=>r.project()?.assignmentId===preparation.assignment_id);
          if(record)assert.equal(record.bootstrapCount,0,'preparation overlaps unfinished bootstrap');
          const state=(await call('assignment_status',{})).assignments.find(a=>a.assignment_id===preparation.assignment_id);
          assert.ok(!state.dialogue?.grant,'draft does not grant work');
          assert.equal([...plugin.communication.runs.values()].flatMap(r=>r.messages)
            .some(m=>m.assignment_id===preparation.assignment_id&&m.kind==='task'),false);
          drafts.set(preparation.assignment_id,prepared.draft_id);
          }
        }
        if(sharedRepair?.assignment_id===message.assignment_id){
          const target=(await roster()).assignments.find(a=>a.assignment_id===message.assignment_id);
          await repairAndResume(target);
        }
      }else if(message.kind==='result'){
        const results=[message];
        if(batchResults&&independent.includes(message.task_id)){
          const sibling=()=>[...plugin.communication.runs.values()].flatMap(r=>r.messages)
            .find(m=>m.kind==='result'&&independent.includes(m.task_id)&&m.message_id!==message.message_id);
          await wait(()=>sibling(),'second result queued while O handles first');
          assert.equal(sibling().delivery,'pending');
          const other=await call('read_message',{message_id:sibling().message_id});
          results.push(other);handled.push(other.message_id);
          notifications.push({...other,sessionId:project.sessionId,directRead:true});
        }
        for(const result of results){
          assert.equal(result.sender_role,'E');
          const target=(await roster()).assignments.find(a=>a.assignment_id===result.assignment_id);
          const status=await plans.call(root,'assignment:status',['--id',result.assignment_id]);
          assert.equal(status.source_commit,result.source_commit);assert.equal(status.status,'READY_FOR_INTEGRATION');
          const diff=await workflow.executionKit.git(root,['show','--stat',result.source_commit]);assert.ok(diff);
          if(conversation&&result.task_id==='T001'&&result.attempt===1){
            await send({recipient:target.recipient_ref,kind:'revision_request',result_id:result.message_id,source_commit:result.source_commit,body:'Revise the exact result for the second approved iteration.'});
          }else{
            await send({recipient:target.recipient_ref,kind:'acceptance',result_id:result.message_id,source_commit:result.source_commit,
              in_reply_to:result.message_id,idempotency_key:'accept:'+result.message_id,body:'Exact diff and checks accepted'});
            await plans.call(root,'integration:start',[],{id:result.assignment_id,source_commit:result.source_commit});
            if(batchResults&&result.task_id==='DOCS'){
              const cleanup=await plans.call(root,'assignment:cleanup');
              assert.equal(cleanup.only_main,false);
              assert.ok(cleanup.pending.some(a=>a.id===result.assignment_id&&a.reason==='terminal-receipt-pending'));
              earlyCleanup=true;
            }
          }
        }
        if(batchResults&&results.some(r=>independent.includes(r.task_id))
          &&readPlan(root).tasks.filter(t=>independent.includes(t.id)).every(t=>t.commit_status==='DONE')){
          await wait(()=>[...records.values()].some(r=>r.project()?.taskId==='DOCS'),'DOCS bootstrap before O ends its result turn');
          assert.equal(record.pageState.current.state.busy,true);docsOverlap=true;
        }
      }else if(message.kind==='acceptance'){
        assert.equal(message.sender_role,'O');
        await wait(async()=>JSON.parse(await fs.readFile(path.join(root,'.git/workflow-kit/assignments',project.assignmentId+'.json'),'utf8')).phase==='INTEGRATED',
          'integration before late acceptance receipt');
        if(batchResults&&project.taskId==='DOCS'){
          await wait(()=>earlyCleanup,'early cleanup request before terminal yield');
          await wait(()=>notifications.some(n=>n.kind==='finalization'),'final O starts before E terminal yield');
        }
        assert.ok((await fs.stat(project.workspace)).isDirectory(),'worktree survives until acceptance is handled');
      }
      else if(message.kind==='finalization'){
        assert.equal(message.sender_role,'backend');
        if(batchResults){
          const docs=[...records.values()].find(r=>r.project()?.taskId==='DOCS');
          assert.equal(docs.pageState.current.state.busy,true);finalOverlap=true;
        }
        if(text.includes('assignment:cleanup')){
          const cleanup=await plans.call(root,'assignment:cleanup');
          assert.ok(cleanup.only_main||cleanup.pending.length>0,'early finalization keeps real pending receipts');
        }else assert.match(text,/Очистка всех назначений подтверждена/);
      }else throw Error('Unexpected owned dialogue: '+message.kind);
      await call('assignment_yield',{message_ids:handled,reason:'handled'});return;
    }
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
      pageState:{current:{documentId:'doc-'+project.sessionId,seq:1,state:{url:project.experience==='work'?'https://chatgpt.com/work/':'https://chatgpt.com/',
        busy:false,editorAvailable:true,writable:true,draftPresent:false,login:'signed-in',lastMessageRole:'assistant',
        userMessagesRevision:0,assistantRevision:0,turnId:'a0',userTurnId:'u0'}}}};
    const page=record.pageState.current.state;
    const composer=record.composer={inFlight:false,getURL:()=>page.url,clearNewSessionDraft:async()=>({action:'draft-cleared'}),
      observeSnapshot:async()=>{record.pageState.current.seq++;return true;},
      inspect:async({action}={})=>({...page,login:false,draftLength:0,messageSeen:record.bootstrapCount>0,
        ...(action==='select-experience'?{action:'experience-confirmed'}:{})}),
      sendUserMessage:async()=>{record.domWorkSends++;throw Error('Working message attempted DOM fallback');},
      deliver:async input=>{
        assert.equal(record.bootstrapCount,0,'initial context is not replayed');
        assert.equal(input.attachments.length>0,!!project.assignmentId);
        await input.onBeforeFill();await input.onBeforeSend();composer.inFlight=true;page.busy=true;
        const bootstrap=async()=>{
          if(owned&&project.assignmentId)await wait(()=>drafts.has(project.assignmentId),'O prepares while E bootstrap is unfinished');
          const invitation=JSON.parse(input.text.match(/workflow_pilot_panel с аргументами (\{"enrollment_ticket":"[a-f0-9]+"\})/)[1]);
          const registered=await c.callTool({name:'workflow_pilot_panel',arguments:invitation,_meta:record.metadata});
          assert.equal(registered.isError,false,JSON.stringify(registered.structuredContent));
          const startup=registered.structuredContent.startup_context;
          if(startup){
            assert.equal(project.assignmentId,undefined);
            for(let part=1;part<startup.total;part++){
              const value=await c.callTool({name:'workflow_communication_read_context',arguments:{
                message_id:startup.message_id,context_ref:startup.context_ref,part},_meta:record.metadata});
              assert.equal(value.isError,false);
            }
            const ack=await c.callTool({name:'workflow_startup_complete',arguments:{
              message_id:startup.message_id,context_sha256:startup.context_ref},_meta:record.metadata});
            assert.equal(ack.isError,false);record.startupComplete=true;
          }
          record.bootstrapCount++;record.registration=registered.structuredContent.registration;
          record.ui=await communicationHtml(testPort,c,{hostMetadata:record.metadata,timerMs:ms=>ms===2000?40:ms,
            onMessage:request=>{
              assert.equal(page.busy,false,'the physical conversation is idle before SDK notification');
              page.busy=true;
              if(!owned){page.userMessagesRevision++;page.userTurnId='u'+page.userMessagesRevision;page.lastMessageRole='user';}
              record.pageState.current.seq++;reportPage(record);
              const job=runAgent(record,request).catch(error).finally(()=>{jobs.delete(job);finish(record);});jobs.add(job);
              return {}; // Host acceptance precedes the model's asynchronous work.
            }});
          page.url='https://chatgpt.com/c/'+project.sessionId;page.userMessagesRevision++;page.userTurnId='u'+page.userMessagesRevision;
          finish(record);return {state:'sent'};
        };
        try{
          if(fast&&project.assignmentId){
            // Sending the bootstrap does not await the simulated model turn.
            const job=bootstrap().then(async()=>{
              await record.controller.tick();await record.controller.tick();reportPage(record);
            }).catch(error).finally(()=>jobs.delete(job));jobs.add(job);
            return {state:'sent'};
          }
          return await bootstrap();
        }finally{composer.inFlight=false;}
      }};
    record.controller=new ContextSession({store:sessionStore(store,record.identity),composer,
      runtime:{ensure:()=>runtime.ensure(),loadContext:(workspace,role)=>plans.loadContext(workspace,role),prepareBootstrap:p=>workflow.prepareBootstrap(p),
        stageStartup:(...args)=>workflow.stageStartup(...args),startupProgress:(...args)=>workflow.startupProgress(...args)},
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
  plugin=control.createPlugin({plans,loadContext:(workspace)=>plans.loadContext(workspace),communicationStore:await openCommunicationStore(path.join(directory,'communication')),
    observe:workflow.observeParticipant,admit:workflow.admitParticipant,reconcile:workflow.reconcileParticipant,currentMessage:workflow.currentMessage,onCommunicationChange:workflow.communicationChanged});
  await plugin.communication.ready;plugin.communication.waitMs=40;
  t.after(async()=>{
    closed=true;workflow.execution.dispose();workflow.planMonitor.close();workflow.planReview.dispose();workflow.reviewContinuation.dispose();
    for(const record of records.values())live.release(record);
    await Promise.allSettled([...jobs]);for(const fn of cleanups)await fn();
    plugin.communication.dispose();await plugin.communication.tail;await store.whenIdle();
    await fs.rm(directory,{recursive:true,force:true,maxRetries:3});
  });
  await bridge(testPort,{directory,plugin});runtime=await dialogueRuntime(testPort,directory);c=runtime.client;
  const api=await dialogueApi(testPort,directory,{control,workflow,settings:{},sessions:live,pages:{list:()=>[]}});
  const wait=async(check,label,timeout=180000)=>{
    const end=Date.now()+timeout;
    while(Date.now()<end){if(errors.length)throw errors[0];if(await check())return;await delay(50);}
    throw Error(label+': '+JSON.stringify({execution:workflow.execution.view(root),
      messages:[...plugin.communication.runs.values()].flatMap(r=>r.messages.slice(-5).map(m=>({kind:m.kind,task:m.task_id,read:m.read,handled:!!m.yielded,finished:m.reply_observed}))),
      panels:[...records.values()].map(r=>({
      session:r.project().sessionId,url:r.project().chatUrl,page:r.pageState.current,pending:r.controller.pending,
      phase:r.controller.state.phase,errors:r.ui?.errors,diagnostic:r.ui?.$('diagnostics')?.textContent,
      body:r.ui?.dom.window.document.body.textContent.slice(0,2500),calls:r.ui?.calls.slice(-20)
    }))}));
  };
  const o=live.visible=ensure(origin);await live.navigate(o,o.composer.getURL(),{freshDraft:true});
  assert.ok(o.ui,JSON.stringify(o.controller.state));
  await wait(()=>o.ui.$('binding').textContent.includes('подтверждена'),'orchestrator bootstrap');
  assert.equal((await plugin.communication.recover({metadata:o.metadata})).participants.length,1);
  await wait(()=>[...plugin.communication.runs.values()].some(r=>r.messages.some(m=>m.kind==='startup-context'&&m.startup_complete)),'startup context receipt');
  await wait(()=>!o.pageState.current.state.busy,'startup physical end');
  assert.equal(o.ui.messages.length,0,'startup context is read in the opening tool turn without an SDK notification');
  await fs.mkdir(path.join(root,'docs/planning'),{recursive:true});
  await fs.writeFile(path.join(root,'docs/planning/dialogue.md'),'# Isolated automatic dialogue\n');
  const task=(id,file,dependencies=[])=>({id,title:'Write '+file,why:'Actual automatic dialogue fixture',dependencies,parallel_safe:true,
    files:[file],checks:['dependency'],acceptance:['Checked output committed'],commit:'docs: '+file,
    ...(fast?{task_brief:'Implement only '+id+' and return the checked commit.'}:{})});
  await plans.call(root,'plan:create',[],{id:'dialogue-fixture',spec:'docs/planning/dialogue.md',stack:'Node fixture',objective:'Two independent assignments, a question and a dependent result',approval:'Isolated fixture authorized',
    parallel_allowed:true,max_workers:workers,execution_strategy:'orchestrated',execution_reason:'Independent files, then verified integration',execution_origin_session_id:origin.sessionId,release:false,...(owned?{}:{dialogue_version:0}),
    acceptance:['One Start; complete work without manual panel action'],checks:[{id:'dependency',executable:'npm',args:['test'],required:false,timeout_ms:30000}],
    tasks:[...independent.map(id=>task(id,taskFile[id])),...(batchResults?[]:[task('T003','THIRD.md',independent)]),
      ...(fast?[task('DOCS','docs/planning/dialogue.md',independent)]:[])]});
  if(owned&&batchResults)await plans.call(root,'task:update',['--task','DOCS','--expected-revision',String(readPlan(root).plan_revision)],
    {checks:['dependency']});
  assert.equal(readPlan(root).dialogue_version,owned?1:0,'new owned plan defaults to dialogue; legacy fixture opts into its former contract');
  await store.reconcileRoles(root);await store.selectSession(root,origin.sessionId);workflow.execution.observe(root);
  await workflow.execution.signal(root);assert.equal(records.size,1,'publication alone opens no executor');
  const start=await api.submit('plan.continue',{}),started=await api.wait(start.operationId);
  assert.equal(started.status,'completed',JSON.stringify(started));
  assert.equal(workflow.executionControl.view(root,'dialogue-fixture').state,'running','HTTP API runs the real plan button coordinator');
  await wait(()=>{
    if(errors.length)throw errors[0];
    const state=workflow.executionControl.view(root,'dialogue-fixture');
    if(state.state==='paused')throw Error('Unexpected pause: '+JSON.stringify({state,
      messages:[...plugin.communication.runs.values()].flatMap(r=>r.messages.map(m=>({id:m.message_id,kind:m.kind,task:m.task_id,
        delivery:m.delivery,read:m.read,handled:!!m.yielded,finished:m.reply_observed,attempt:m.attempt}))),
      events:[...plugin.communication.runs.values()].flatMap(r=>r.events.slice(-20))}));
    return state.state==='complete';
  },'plan completion',workers===5?270000:180000);
  assert.equal(readPlan(root).delivery_status,'READY_FOR_ACCEPTANCE');
  const taskCount=workers+(batchResults?1:2);
  assert.deepEqual(readPlan(root).tasks.map(task=>task.commit_status),Array(taskCount).fill('DONE'));
  assert.equal(records.size,taskCount+1,'one O and one E for each task including DOCS');
  for(const record of records.values()){
    assert.equal(record.bootstrapCount,1);assert.equal(record.domWorkSends,0);
    assert.equal(record.ui.calls.includes('workflow_communication_enable'),false);assert.equal(record.ui.calls.includes('workflow_communication_join'),false);
    assert.equal(record.project().experience,record===o?experience:'chat');
  }
  if(owned){
    assert.equal(drafts.size,taskCount);
    for(const kind of ['ready','task','result','acceptance'])assert.equal(notifications.filter(n=>n.kind===kind).length,
      fast&&kind==='ready'?0:taskCount+(conversation&&kind==='result'?1:0),kind);
    if(fast){
      assert.equal(modelCalls.filter(n=>n==='assignment_prepare').length,taskCount);
      assert.equal(modelCalls.filter(n=>n==='assignment_dispatch').length,0,'no second model call to authorize dispatch');
      assert.equal(notifications.filter(n=>n.directPreparation).length,1,'two preparations handled within one SDK turn');
    }
    if(batchResults)assert.equal(notifications.filter(n=>n.directRead).length,1,'one result is read within the other SDK turn');
    if(conversation){
      assert.equal(sharedRepairs,1,'shared repair requires fresh parked facts and no user continuation');
      for(const kind of ['context_request','question','decision','revision_request'])assert.equal(notifications.filter(n=>n.kind===kind).length,1,kind);
      assert.equal(notifications.filter(n=>n.kind==='clarification').length,2);
    }
    assert.equal(notifications.some(n=>['assignment-start','continue'].includes(n.kind)),false);
    assert.ok([...records.values()].every(r=>r.pageState.current.state.userMessagesRevision===1),'SDK creates no user bubble');
    const completed=await c.callTool({name:'workflow_communication_participants',arguments:{},_meta:o.metadata});
    assert.equal(completed.isError,false);
    assert.equal(completed.structuredContent.assignments.length,taskCount);
    assert.ok(completed.structuredContent.assignments.every(a=>a.phase==='INTEGRATED'&&!a.error),'cleanup preserves O read-only completion view');
  }else{assert.equal(notifications.filter(n=>n.kind==='question').length,1);assert.equal(notifications.filter(n=>n.kind==='decision').length,1);}
  assert.equal((await plans.call(root,'assignment:cleanup')).only_main,true);
  const run=[...plugin.communication.runs.values()][0];assert.equal(run.grant.phase,'complete');assert.equal(run.grant.active,false);
  if(fast){
    await wait(()=>o.ui.dom.window.document.body.textContent.includes('Ожидание сообщений остановлено'),'panel observes durable complete');
    const count=()=>o.ui.calls.filter(n=>['workflow_communication_wait','workflow_communication_sync'].includes(n)).length;
    const settled=count();await delay(160);
    assert.equal(count(),settled,'complete stops wait and sync, including the accelerated sync timer');
    assert.equal(o.ui.calls.includes('workflow_communication_stop'),false,'complete needs no automatic Stop');
  }
  if(owned)for(const [assignmentId,draftId] of drafts){
    const prepared=run.events.find(e=>e.event_type==='task.prepared'&&e.message_id===draftId);
    const member=Object.values(run.members).find(m=>m.target.assignment_id===assignmentId);
    const bound=run.events.find(e=>e.event_type==='binding.confirmed'&&e.participant_id===member.id);
    const sent=run.events.find(e=>e.event_type==='message.persisted'&&e.message_id===draftId);
    assert.ok(prepared.seq<bound.seq&&bound.seq<sent.seq,'prepare precedes binding; dispatch follows binding');
    if(fast){
      const authorized=run.events.find(e=>e.event_type==='task.dispatch_requested'&&e.message_id===draftId);
      assert.ok(authorized&&authorized.seq<bound.seq,'explicit authorization is saved before readiness');
    }
  }
  if(batchResults){assert.equal(earlyCleanup,true);assert.equal(setupLockChecked,true);assert.equal(docsOverlap,true);assert.equal(finalOverlap,true);}
  assert.equal(workflow.executionControl.snapshot()[root].route,'plugin-v1');
  runtime.verify();
  return {notifications,run,root};
}
