import test from 'node:test';
import {bridge,client,eventually,communicationHtml} from './fixtures/plugin-host.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM} from 'jsdom';
import {Script} from 'node:vm';
import {pluginHtml} from '../scripts/stage-chatgpt-plugin.mjs';
import {ControlFacade} from '../src/control/facade.mjs';
import {startPluginBridge} from '../src/execution/plugin/bridge.mjs';
import {COMMUNICATION_PROTOCOL,COMMUNICATION_BUILD} from '../src/control/plugin/communication.mjs';
import {openCommunicationStore} from '../src/execution/plugin/communication-store.mjs';

const root=path.resolve(import.meta.dirname,'..');
const digest=text=>createHash('sha256').update(text).digest('hex');
const metadata={'openai/session':'conversation-fixture','openai/subject':'user-fixture'};
test('HTML staging preserves replacement tokens and refuses broken JavaScript',()=>{
  const source='globalThis.sample='+JSON.stringify(['$&',"$'",'$`','$$','</script>','кириллица'])+';';
  const dom=new JSDOM(pluginHtml('<body><!-- plugin-script --></body>',source),{runScripts:'dangerously'});
  assert.deepEqual(Array.from(dom.window.sample),['$&',"$'",'$`','$$','</script>','кириллица']);
  assert.equal(dom.window.document.scripts.length,1);dom.window.close();
  assert.throws(()=>pluginHtml('<!-- plugin-script -->','broken('),SyntaxError);
  assert.throws(()=>pluginHtml('',source),/exactly one/);
});
function packet(workspace,name){
  const context='Контекст проекта '+name+'\nПолный текст: ✓';const bytes=Buffer.byteLength(context);
  return {delivery_protocol:'inline-context-v1',ack_required:false,workspace,status:'ready',completeness:'COMPLETE',
    signature:'fixture-signature',generated_at_ms:Date.now(),context,context_bytes:bytes,context_sha256:digest(context),
    facts:{project_id:name,project_name:name,plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',
      delivery_status:'IN_PROGRESS',task_id:null,task_title:null},
    parts:[{index:1,total:1,text:context,bytes,sha256:digest(context)}]};
}
async function fixture(t){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-plugin-')));
  let plugin;
  t.after(async()=>{
    // UI Stop/telemetry may still be settling when a test returns. Drain the
    // writer before removing its directory, including after a failed assertion.
    plugin?.communication.dispose();await plugin?.communication.ready;await plugin?.communication.tail;
    plugin?.communication.dispose();await fs.rm(directory,{recursive:true,force:true});
  });
  const file=path.join(directory,'sessions.json');
  const control=new ControlFacade({storageFile:file,execution:{}});
  const store=control.projects;await store.load();
  for(const name of ['Первый','Second']){
    const workspace=path.join(directory,name);
    await fs.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});await fs.mkdir(path.join(workspace,'scripts'));
    await fs.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
    await fs.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
      '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:name,project_name:name,
        plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',current_task_id:null,
        tasks:[{id:'T001',title:'Task',implementation_status:'TODO',commit_status:'PENDING'}]})+'\n```\n<!-- workflow-state:end -->');
    await store.select(workspace);
  }
  const loadContext=async workspace=>packet(workspace,path.basename(workspace));
  let changes=0;
  plugin=control.createPlugin({loadContext,onChange:()=>changes++,communicationStore:await openCommunicationStore(path.join(directory,'communication'))});
  return {directory,file,control,store,plugin,loadContext,changes:()=>changes};
}

const communicationTools=['bind','claim','enable','export','join','journal','participants','probe','read_context','read_message','recover','report','send_message','status','stop','sync','telemetry','verify','wait'];
test('the real project projection reserves the published origin even though persistence omits planExecution',async t=>{
  const f=await fixture(t),workspace=path.join(f.directory,'Первый'),file=path.join(workspace,'.harness/plans/todo-plan.md');
  const write=async state=>fs.writeFile(file,'<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'Первый',project_name:'Первый',
    plan_revision:2,scope_id:null,execution_scope_status:'NONE',delivery_status:'IN_PROGRESS',current_task_id:null,tasks:[],...state})+'\n```\n<!-- workflow-state:end -->');
  await write({});const origin=await f.store.newSession(workspace,'work');
  const initial=await f.plugin.reserveParticipant(origin.sessionId);
  await write({scope_id:'automatic',execution_scope_status:'ACTIVE',execution_strategy:'orchestrated',parallel_allowed:true,max_workers:2,
    execution_reason:'fixture',execution_origin_session_id:origin.sessionId,release:false,
    tasks:[{id:'T001',title:'Task',implementation_status:'TODO',commit_status:'PENDING'}]});
  const duringPublication=await f.plugin.participantTarget(origin.sessionId);
  assert.equal(duringPublication.scope_id,'automatic','fresh published origin remains valid before role reconciliation');
  await f.store.reconcileRoles(workspace);
  assert.equal(f.store.snapshot().projects.find(p=>p.workspace===workspace).planExecution,undefined);
  const registered=await f.plugin.panel({enrollment_ticket:initial.enrollment_ticket,metadata});
  assert.equal(registered.registration.local_session_id,origin.sessionId);
  const next=await f.plugin.reserveParticipant(origin.sessionId);assert.equal(next.run_id,initial.run_id);
  const discussion=await f.store.newSession(workspace,'chat');
  await assert.rejects(f.plugin.reserveParticipant(discussion.sessionId),{code:'PLUGIN_PARTICIPANT_UNAVAILABLE'});
});
test('real MCP panel enrolls an existing assignment using fresh host identity without an external session',async t=>{
  const f=await fixture(t),before=f.store.snapshot(),target={project_id:'fixture',local_session_id:'worker',
    origin_session_id:'origin',role:'E',scope_id:'scope',assignment_id:'assignment',task_id:'T001'};
  f.plugin.communication.enrollment.resolveTarget=f.plugin.communication.enrollment.verifyTarget=id=>id==='worker'?target:null;
  const invitation=await f.plugin.communication.reserve(target);
  await bridge(t,f);const c=await client(t,f);
  const args={name:'workflow_pilot_panel',arguments:{enrollment_ticket:invitation.enrollment_ticket},_meta:metadata};
  const first=await c.callTool(args);assert.equal(first.isError,false);
  assert.equal(first.structuredContent.registration.assignment_id,'assignment');
  assert.deepEqual((await c.callTool(args)).structuredContent.registration,first.structuredContent.registration);
  assert.equal((await c.callTool({...args,_meta:{...metadata,'openai/session':'wrong'}})).structuredContent.error.code,'PLUGIN_COMMUNICATION_BINDING');
  assert.equal((await c.callTool({...args,_meta:{}})).structuredContent.error.code,'PLUGIN_COMMUNICATION_IDENTITY_REQUIRED');
  assert.deepEqual(f.store.snapshot(),before);
});
test('communication MCP contracts reject missing identity, wrong binding and stale protocol; Stop cancels probe',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const tools=(await c.listTools()).tools;
  assert.match(tools.find(t=>t.name==='workflow_communication_enable').description,/Working plans reject Enable/);
  assert.match(tools.find(t=>t.name==='workflow_communication_stop').description,/whole plan/);
  assert.match(tools.find(t=>t.name==='workflow_communication_stop').description,/only detaches/);
  const appOnly=['bind','claim','enable','recover','report','stop','sync','telemetry','verify','wait'];
  for(const suffix of communicationTools){const tool=tools.find(t=>t.name==='workflow_communication_'+suffix);
    assert.ok(tool);assert.equal(tool._meta.ui.resourceUri,undefined,'data operations cannot recreate UI');
    assert.deepEqual(tool._meta.ui.visibility,appOnly.includes(suffix)?['app']:['journal','status','export'].includes(suffix)?['app','model']:['model']);
    assert.equal(tool.annotations.readOnlyHint,['journal','status','export','recover','participants','read_context'].includes(suffix));
    assert.equal(tool.inputSchema.properties.ctx,undefined);
  }
  const call=(name,args,meta=metadata)=>c.callTool({name:'workflow_communication_'+name,arguments:args,_meta:meta});
  assert.equal((await call('join',{run_id:'contract',role:'O'},{})).structuredContent.error.code,'PLUGIN_COMMUNICATION_IDENTITY_REQUIRED');
  const joined=(await call('join',{run_id:'contract',role:'O'})).structuredContent;
  const binding={run_id:'contract',participant_id:joined.participant_id,panel_instance_id:randomUUID(),
    protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
  const secondMeta={...metadata,'openai/session':'different'};
  assert.equal((await call('bind',{binding},secondMeta)).structuredContent.error.code,'PLUGIN_COMMUNICATION_BINDING');
  assert.equal((await call('bind',{binding:{...binding,build_id:'old'}})).structuredContent.error.code,'PLUGIN_COMMUNICATION_VERSION');
  assert.equal((await call('bind',{binding})).isError,false);
  assert.equal((await call('enable',{binding,message_supported:false})).structuredContent.error.code,'PLUGIN_COMMUNICATION_UNSUPPORTED');
  const enabled=(await call('enable',{binding,message_supported:true})).structuredContent;
  binding.permission_generation=enabled.permission_generation;
  const model={run_id:binding.run_id,participant_id:binding.participant_id};
  assert.equal((await call('probe',{...model,delay_ms:150})).isError,false);
  assert.equal((await call('stop',{binding})).isError,false);
  await delay(180);
  const state=(await call('status',model)).structuredContent;
  assert.deepEqual(state.messages,[]);assert.equal(state.stopped,true);
  const events=(await call('journal',model)).structuredContent.events;
  assert.ok(events.some(e=>e.event_type==='probe.cancelled'));
  assert.ok(!JSON.stringify(events).includes('conversation-fixture'));
});


test('workflow panel automatically binds its current assignment after late SDK and recovers a new instance without manual IDs',async t=>{
  const f=await fixture(t),target={project_id:'fixture',local_session_id:'worker',origin_session_id:'origin',role:'E',scope_id:'scope',assignment_id:'assignment',task_id:'T001'};
  f.plugin.communication.enrollment.resolveTarget=f.plugin.communication.enrollment.verifyTarget=id=>id==='worker'?target:null;
  const invite=await f.plugin.communication.reserve(target);await bridge(t,f);const c=await client(t,f);
  await c.callTool({name:'workflow_communication_join',arguments:{run_id:'older-experiment',role:'E'},_meta:metadata});
  await c.callTool({name:'workflow_pilot_panel',arguments:{enrollment_ticket:invite.enrollment_ticket},_meta:metadata});
  let connect;const handshake=new Promise(resolve=>{connect=resolve;});
  const pending=communicationHtml(t,c,{handshake});await delay(25);
  assert.equal(f.plugin.communication.panels.size,0);connect();const ui=await pending;
  await eventually(()=>ui.$('binding').textContent.includes('подтверждена'));
  assert.equal(ui.$('run').value,invite.run_id);assert.equal(ui.$('legacy-fields').hidden,true);
  assert.equal(ui.$('enable').hidden,true);assert.equal(ui.$('bind').hidden,true);assert.equal(ui.$('run-selection').hidden,true);
  assert.equal(ui.$('stop').textContent,'Остановить отправку плана');
  assert.match(ui.$('stop-help').textContent,/всего плана/);
  assert.equal(ui.calls.filter(c=>c==='workflow_communication_enable').length,0);assert.equal(ui.messages.length,0);
  const participant=(await f.plugin.communication.recover({metadata})).participants.find(p=>p.mode==='workflow');
  assert.equal((await f.plugin.communication.status({...participant,metadata})).channel_ready,true);
  const next=await communicationHtml(t,c,{initialToolResult:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:{registration:{run_id:'stale'}}}}});
  await eventually(()=>next.$('binding').textContent.includes('подтверждена'));
  assert.equal(next.$('participant').value,participant.participant_id);assert.equal(next.messages.length,0);
  const unsupported=await communicationHtml(t,c,{messageSupported:false});
  await eventually(()=>unsupported.$('diagnostics').textContent.includes('Привязка: подтверждена'));
  assert.match(unsupported.$('diagnostics').textContent,/openai\/message: не предоставлен/);
  assert.equal(unsupported.messages.length,0);
});

test('lost automatic bind response is recovered with bounded reads and no model call',async t=>{
  const f=await fixture(t),target={project_id:'fixture',local_session_id:'worker',origin_session_id:'origin',role:'E',scope_id:'scope',assignment_id:'assignment',task_id:'T001'};
  f.plugin.communication.enrollment.resolveTarget=f.plugin.communication.enrollment.verifyTarget=()=>target;
  const invite=await f.plugin.communication.reserve(target);await f.plugin.communication.enroll(invite.enrollment_ticket,metadata);
  await bridge(t,f);const c=await client(t,f);let dropped=false;
  const ui=await communicationHtml(t,c,{toolReply:async(request,result)=>{
    if(request.name==='workflow_communication_bind'&&!dropped){dropped=true;return {transportError:true};}return result;
  }});
  await eventually(()=>ui.$('binding').textContent.includes('подтверждена'));
  assert.equal(ui.calls.filter(c=>c==='workflow_communication_bind').length,2);
  assert.equal(ui.messages.length,0);assert.equal(ui.$('enable').hidden,true);
});

test('real SDK working channel starts automatically, reads full context and waits for the completed reply',async t=>{
  const f=await fixture(t),comm=f.plugin.communication;
  const o={project_id:'fixture',local_session_id:'origin',origin_session_id:'origin',role:'O',scope_id:'scope',assignment_id:null,task_id:null};
  const e={...o,local_session_id:'worker',role:'E',assignment_id:'assignment',task_id:'T001'};
  comm.enrollment.resolveTarget=comm.enrollment.verifyTarget=id=>id==='origin'?o:id==='worker'?e:null;
  const page={canSend:false,stopped:false,busy:true,documentId:'doc',turnId:'a0',userTurnId:'u0',assistantRevision:1,userMessagesRevision:1};
  comm.workflow.observe=()=>page;comm.workflow.admit=async()=>page.canSend;comm.waitMs=30;
  const invitation=await comm.reserve(e);await bridge(t,f);const c=await client(t,f);
  await c.callTool({name:'workflow_pilot_panel',arguments:{enrollment_ticket:invitation.enrollment_ticket},_meta:metadata});
  const contexts=[];
  const ui=await communicationHtml(t,c,{timerMs:ms=>ms===2000?30:ms,onMessage:async request=>{
    const args=notificationArgs(request);assert.deepEqual(Object.keys(args),['message_id']);
    const message=await modelTool(c,metadata,'read_message',args);let text='';
    assert.equal(message.role_protocol,2);assert.match(message.instructions,/РОЛЬ: ИСПОЛНИТЕЛЬ/);
    for(let part=0,total=1;part<total;part++){
      const content=await modelTool(c,metadata,'read_context',{message_id:message.message_id,context_ref:message.context_ref,part});
      text+=content.text;total=content.total;
    }contexts.push(text);
  }});
  await eventually(()=>ui.$('binding').textContent.includes('подтверждена'));
  await comm.workflow.grant(o);
  const text='Рабочее поручение — полный контекст ✓\n'.repeat(500);
  await comm.workflow.enqueue(e,{key:'first',kind:'assignment-start',text});
  await comm.workflow.enqueue(e,{key:'second',kind:'continue',text:'Второе поручение'});
  await delay(100);assert.equal(ui.messages.length,0,'bootstrap still busy');
  Object.assign(page,{canSend:true,stopped:true,busy:false});comm.observeSession('worker');
  await eventually(()=>contexts.length===1);assert.equal(contexts[0],text);
  await delay(80);assert.equal(ui.messages.length,1,'SDK/read alone cannot release the next turn');
  Object.assign(page,{turnId:'a1',userTurnId:'u1',assistantRevision:2,userMessagesRevision:2});comm.observeSession('worker');
  await eventually(()=>contexts.length===2);assert.equal(contexts[1],'Второе поручение');
  assert.equal(ui.calls.includes('workflow_communication_enable'),false);
  assert.equal(ui.calls.includes('workflow_communication_join'),false);assert.equal(ui.maxWaits,1);
  ui.$('stop').click();await eventually(async()=>!(comm.runs.get(invitation.run_id).grant.active));
  await delay(80);assert.equal(ui.messages.length,2);assert.deepEqual(ui.errors,[]);
});

test('real staged SDK -> Python MCP -> bridge -> Control: bind/enable/probe/wait/claim/verify/Send/report/read',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const modelCall=(name,args)=>c.callTool({name:'workflow_communication_'+name,arguments:args,_meta:metadata});
  const joined=(await modelCall('join',{run_id:'real-sdk',role:'O'})).structuredContent;
  const model={run_id:'real-sdk',participant_id:joined.participant_id};let read;
  const ui=await communicationHtml(t,c,{onMessage:async request=>{
    assert.deepEqual(JSON.parse(JSON.stringify(request._meta)),{'openai/message':{target:'active',send:true}});
    const match=request.content[0].text.match(/аргументами (\{[^}]+\})/);
    read=await modelCall('read_message',JSON.parse(match[1]));assert.equal(read.isError,false);
  }});
  const selected=f.store.selected();ui.$('run').value=model.run_id;ui.$('participant').value=model.participant_id;
  ui.$('bind').click();await eventually(()=>ui.$('status').textContent.includes('Привязка подтверждена'));
  ui.$('enable').click();await eventually(()=>ui.calls.includes('workflow_communication_wait'));
  assert.equal((await modelCall('probe',{...model,delay_ms:50})).isError,false);
  await eventually(()=>ui.calls.includes('workflow_communication_report'));
  await eventually(async()=>(await f.plugin.communication.status({...model,metadata})).messages[0]?.delivery==='accepted');
  assert.equal(ui.messages.length,1);assert.equal(read.structuredContent.kind,'probe');
  assert.equal(f.store.selected().sessionId,selected.sessionId,'sidebar is not addressing');
  assert.equal((await f.plugin.communication.status({...model,metadata})).messages[0].read,true,'late report preserves read');
  const events=(await modelCall('journal',model)).structuredContent.events.map(e=>e.event_type);
  for(const expected of ['join.confirmed','binding.confirmed','permission.enabled','probe.scheduled','probe.fired','claim.granted','binding.verified','send.intent','send.report','message.read'])assert.ok(events.includes(expected),expected);
  ui.$('stop').click();await eventually(()=>ui.$('status').textContent.includes('подтвердила Stop'));
  assert.deepEqual(ui.errors,[]);
});

test('fresh app-only metadata gates delivery, unsupported SDK cannot enable',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const args={run_id:'changed-host',role:'O'};
  const joined=(await c.callTool({name:'workflow_communication_join',arguments:args,_meta:metadata})).structuredContent;
  const ui=await communicationHtml(t,c,{messageSupported:false});
  ui.$('run').value=args.run_id;ui.$('participant').value=joined.participant_id;ui.$('bind').click();
  await eventually(()=>ui.$('status').textContent.includes('Привязка подтверждена'));
  assert.equal(ui.$('enable').disabled,true);assert.equal(ui.messages.length,0);
  const binding={run_id:args.run_id,participant_id:joined.participant_id,panel_instance_id:randomUUID(),
    protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD};
  const comm=f.plugin.communication;await comm.bind({...binding,metadata});
  binding.permission_generation=(await comm.enable({...binding,metadata,message_supported:true})).permission_generation;
  await comm.probe({...binding,metadata,delay_ms:25});await delay(40);
  const message_id=(await comm.status({...binding,metadata})).messages[0].message_id;
  const ticket=await comm.claim({...binding,metadata,message_id});
  const changed=await c.callTool({name:'workflow_communication_verify',arguments:{binding,...ticket},_meta:{'openai/session':'new-location'}});
  assert.equal(changed.structuredContent.error.code,'PLUGIN_COMMUNICATION_BINDING');
  await comm.stop({...binding,metadata});
  await assert.rejects(comm.verify({...binding,metadata,...ticket}),{code:'PLUGIN_COMMUNICATION_STOPPED'});
  assert.equal((await comm.status({...binding,metadata})).messages[0].delivery,'claimed','no automatic requeue after an uncertain boundary');
});

test('served SDK panel renders themes, queue, filters, complete export and host-context Stop',async t=>{
  for(const theme of ['light','dark'])await t.test(theme,async t=>{
    const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
    const joined=(await c.callTool({name:'workflow_communication_join',arguments:{run_id:'ui-'+theme,role:'O'},_meta:metadata})).structuredContent;
    const model={run_id:joined.run_id,participant_id:joined.participant_id};
    const ui=await communicationHtml(t,c,{theme});
    assert.equal(ui.dom.window.document.documentElement.getAttribute('data-theme'),theme);
    assert.equal(ui.dom.window.document.getElementById('projects'),null);
    ui.$('run').value=model.run_id;ui.$('participant').value=model.participant_id;ui.$('bind').click();
    await eventually(()=>ui.$('status').textContent.includes('Привязка подтверждена'));
    assert.match(ui.$('identity').textContent,/Роль O/);assert.equal(ui.$('run').disabled,true);
    ui.$('enable').click();await eventually(()=>ui.calls.includes('workflow_communication_wait'));
    await c.callTool({name:'workflow_communication_probe',arguments:{...model,delay_ms:25},_meta:metadata});
    await eventually(()=>ui.$('last').textContent.includes('Принято хостом'));
    assert.equal(ui.messages.length,1);assert.equal(ui.maxWaits,1);assert.match(ui.$('queue').textContent,/1 непрочитанных/);
    ui.$('filter-message').value='missing-message';ui.$('filter-message').dispatchEvent(new ui.dom.window.Event('input'));
    assert.equal(ui.$('events').children.length,0);
    ui.$('filter-message').value='';ui.$('filter-message').dispatchEvent(new ui.dom.window.Event('input'));
    assert.ok(ui.$('events').children.length>0);
    ui.$('export').click();await eventually(()=>!ui.$('export-result').hidden);
    const events=ui.$('export-text').value.trim().split('\n').map(JSON.parse);
    assert.ok(events.every((event,i)=>event.seq===i+1&&event.run_id===model.run_id));
    for(const type of ['host.handshake','send.intent','sdk.invoked','sdk.accepted','send.report'])assert.ok(events.some(e=>e.event_type===type),type);
    assert.doesNotMatch(ui.$('export-text').value,/conversation-fixture|user-fixture/);
    ui.notify({jsonrpc:'2.0',method:'ui/notifications/host-context-changed',params:{theme:theme==='dark'?'light':'dark'}});
    await eventually(()=>ui.dom.window.document.documentElement.getAttribute('data-theme')!==theme);
    assert.equal((await f.plugin.communication.status({...model,metadata})).stopped,false);
    ui.notify({jsonrpc:'2.0',method:'ui/notifications/host-context-changed',params:{locale:'en'}});
    await eventually(()=>ui.$('status').textContent.includes('подтвердила Stop'));
    assert.equal((await f.plugin.communication.status({...model,metadata})).stopped,true);
    assert.deepEqual(ui.errors,[]);
  });
});

const historicalToolResult=structuredContent=>({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{content:[],structuredContent}});

test('fresh backend incompatibility blocks recovery even after a matching historical result',async t=>{
  for(const mismatch of [{build_id:'other-build'},{protocol_version:999}])await t.test(JSON.stringify(mismatch),async t=>{
    const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
    await modelTool(c,metadata,'join',{run_id:'incompatible-backend',role:'E'});
    const ui=await communicationHtml(t,c,{toolReply:async(request,result)=>request.name==='workflow_communication_recover'?
      {...result,structuredContent:{...result.structuredContent,...mismatch}}:result});
    await eventually(()=>ui.$('status').textContent.includes('Несовместимая панель'));
    ui.notify(historicalToolResult({communication:{protocol_version:COMMUNICATION_PROTOCOL,build_id:COMMUNICATION_BUILD}}));
    await delay(30);
    assert.match(ui.$('enable-reason').textContent,/Несовместимая панель/);
    assert.equal(ui.$('run').value,'');assert.equal(ui.$('participant').value,'');
    assert.equal(ui.calls.includes('workflow_communication_bind'),false);
    assert.equal(ui.$('enable').disabled,true);assert.equal(ui.messages.length,0);assert.deepEqual(ui.errors,[]);
  });
});

const modelTool=(c,meta,name,args)=>c.callTool({name:'workflow_communication_'+name,arguments:args,_meta:meta}).then(result=>{
  assert.equal(result.isError,false,JSON.stringify(result.structuredContent));return result.structuredContent;
});
async function bindAndEnable(ui,model){
  ui.$('run').value=model.run_id;ui.$('participant').value=model.participant_id;ui.$('bind').click();
  await eventually(()=>ui.$('status').textContent.includes('Привязка подтверждена'));
  ui.$('enable').click();await eventually(()=>ui.calls.includes('workflow_communication_wait'));
}
const notificationArgs=request=>JSON.parse(request.content[0].text.match(/аргументами (\{[^}]+\})/)[1]);

test('real SDK: historical tool results cannot cancel restoration or stop an enabled panel',async t=>{
  const oldResult={communication:{build_id:'0.5.3-communication-1',protocol_version:COMMUNICATION_PROTOCOL}};
  const cases=[
    {phase:'before initialize',value:oldResult},
    {phase:'during recover',value:oldResult},
    {phase:'after bind',value:oldResult},
    {phase:'while enabled',value:oldResult},
    {phase:'during recover',value:{communication:{build_id:'0.5.2-communication-1',protocol_version:COMMUNICATION_PROTOCOL}}},
    {phase:'during recover',value:{communication:{build_id:COMMUNICATION_BUILD,protocol_version:999}}},
    {phase:'during recover',value:{error:{code:'PLUGIN_UNAVAILABLE',message:'Historical unavailable'}}},
    {phase:'after bind',value:{error:{code:'PLUGIN_UNAVAILABLE',message:'Historical unavailable'}}},
  ];
  for(const {phase,value} of cases)await t.test(phase+' '+JSON.stringify(value),async t=>{
    const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
    const recipient=await modelTool(c,metadata,'join',{run_id:'historical-reopen',role:'E'});
    const senderMeta={...metadata,'openai/session':'historical-sender'};
    const sender=await modelTool(c,senderMeta,'join',{run_id:recipient.run_id,role:'O'});
    const message=await modelTool(c,senderMeta,'send_message',{run_id:sender.run_id,participant_id:sender.participant_id,
      recipient_id:recipient.participant_id,kind:'question',body:'Pending across history replay',idempotency_key:'historical-pending'});
    let release,reached=false;const gate=new Promise(resolve=>{release=resolve;});t.after(()=>release());
    const notification=historicalToolResult(value);
    const ui=await communicationHtml(t,c,{
      initialToolResult:phase==='before initialize'?notification:undefined,
      toolReply:async(request,result)=>{if(phase==='during recover'&&request.name==='workflow_communication_recover'){reached=true;await gate;}return result;},
      onMessage:request=>modelTool(c,metadata,'read_message',notificationArgs(request)).then(()=>({})),
    });
    if(phase==='during recover'){await eventually(()=>reached);ui.notify(notification);await delay(30);release();}
    await eventually(()=>!ui.$('enable').disabled);
    if(phase==='after bind'){ui.notify(notification);await delay(30);}
    assert.equal(ui.$('run').value,recipient.run_id);assert.equal(ui.$('participant').value,recipient.participant_id);
    assert.equal(ui.calls.filter(name=>name==='workflow_communication_recover').length,1,'no manual recovery or new panel call');
    assert.equal(ui.calls.filter(name=>name==='workflow_communication_bind').length,1);
    assert.equal(ui.calls.includes('workflow_communication_enable'),false);assert.equal(ui.messages.length,0);
    assert.equal(ui.$('enable').disabled,false);assert.match(ui.$('diagnostics').textContent,/SDK: подключён/);
    ui.$('enable').click();await eventually(()=>ui.calls.includes('workflow_communication_wait'));
    if(phase==='while enabled'){ui.notify(notification);await delay(30);}
    await eventually(async()=>(await f.plugin.communication.status({...recipient,metadata})).messages[0]?.read);
    await eventually(()=>ui.calls.includes('workflow_communication_report'));
    const state=await f.plugin.communication.status({...recipient,metadata});
    assert.equal(state.stopped,false);assert.equal(ui.messages.length,1);
    assert.equal(notificationArgs(ui.messages[0]).message_id,message.message_id);
    assert.match(ui.$('diagnostics').textContent,/Ожидание: запущено/);
    assert.equal(ui.calls.includes('workflow_communication_stop'),false);assert.equal(ui.maxWaits,1);
    ui.$('stop').click();await eventually(()=>ui.$('status').textContent.includes('подтвердила Stop'));
    assert.deepEqual(ui.errors,[]);
  });
});

test('real SDK: reopen restores fields and delivers old pending exactly once only after user Enable',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const recipient=await modelTool(c,metadata,'join',{run_id:'reopen-pending',role:'E'});
  const senderMeta={...metadata,'openai/session':'reopen-sender'};
  const sender=await modelTool(c,senderMeta,'join',{run_id:recipient.run_id,role:'O'});
  const first=await communicationHtml(t,c);await eventually(()=>!first.$('enable').disabled);
  assert.equal(first.$('run').value,recipient.run_id);assert.equal(first.$('participant').value,recipient.participant_id);
  first.$('enable').click();await eventually(()=>first.calls.includes('workflow_communication_wait'));
  first.dom.window.dispatchEvent(new first.dom.window.Event('pagehide'));
  await eventually(async()=>(await f.plugin.communication.status({...recipient,metadata})).stopped);
  const message=await modelTool(c,senderMeta,'send_message',{run_id:sender.run_id,participant_id:sender.participant_id,
    recipient_id:recipient.participant_id,kind:'question',body:'Saved while closed',idempotency_key:'closed-question'});
  const next=await communicationHtml(t,c,{onMessage:request=>modelTool(c,metadata,'read_message',notificationArgs(request)).then(()=>({}))});
  await eventually(()=>!next.$('enable').disabled);assert.equal(next.$('run').value,recipient.run_id);
  assert.equal(next.$('participant').value,recipient.participant_id);assert.equal(next.messages.length,0);
  assert.equal(next.calls.includes('workflow_communication_enable'),false);assert.match(next.$('queue').textContent,/1 ожидают/);
  next.$('enable').click();await eventually(async()=>(await f.plugin.communication.status({...recipient,metadata})).messages[0]?.read);
  await eventually(()=>next.calls.includes('workflow_communication_report'));
  assert.equal(next.messages.length,1);assert.equal(notificationArgs(next.messages[0]).message_id,message.message_id);
  // Closing an older instance after the new permission must not revoke it.
  first.dom.window.dispatchEvent(new first.dom.window.Event('pageshow'));
  await eventually(()=>first.calls.filter(x=>x==='workflow_communication_recover').length===2);
  await eventually(()=>!first.$('enable').disabled);
  first.dom.window.dispatchEvent(new first.dom.window.Event('pagehide'));
  assert.equal((await f.plugin.communication.status({...recipient,metadata})).stopped,false);
  next.$('stop').click();await eventually(async()=>(await f.plugin.communication.status({...recipient,metadata})).stopped);
  assert.equal(next.maxWaits,1);assert.deepEqual(next.errors,[]);
});

test('real SDK: pageshow restores the same document; multiple runs require a choice and unknown identity exposes none',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const one=await modelTool(c,metadata,'join',{run_id:'choice-one',role:'O'});
  const two=await modelTool(c,metadata,'join',{run_id:'choice-two',role:'E'});
  const ui=await communicationHtml(t,c);await eventually(()=>!ui.$('run-selection').hidden);
  assert.equal(ui.$('run').value,'');assert.equal(ui.$('enable').disabled,true);
  ui.$('runs').value=two.run_id;ui.$('runs').dispatchEvent(new ui.dom.window.Event('change'));
  await eventually(()=>!ui.$('enable').disabled);assert.equal(ui.$('participant').value,two.participant_id);
  ui.dom.window.dispatchEvent(new ui.dom.window.Event('pagehide'));ui.dom.window.dispatchEvent(new ui.dom.window.Event('pageshow'));
  await eventually(()=>ui.calls.filter(x=>x==='workflow_communication_recover').length===2&&!ui.$('runs').disabled);
  ui.$('runs').value=one.run_id;ui.$('runs').dispatchEvent(new ui.dom.window.Event('change'));
  await eventually(()=>!ui.$('enable').disabled);assert.equal(ui.$('participant').value,one.participant_id);
  assert.equal(ui.calls.includes('workflow_communication_enable'),false);
  const foreign=await communicationHtml(t,c,{hostMetadata:{'openai/session':'foreign'}});
  await eventually(()=>foreign.$('status').textContent.includes('ещё не зарегистрирован'));
  assert.equal(foreign.$('runs').options.length,1);assert.equal(foreign.$('participant').value,'');
});

test('real SDK: repeated unknown context produces one Stop; late enable cannot stop a newer panel',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);let release,reached=false;
  const joined=await modelTool(c,metadata,'join',{run_id:'late-enable',role:'O'}),gate=new Promise(resolve=>{release=resolve;});
  const old=await communicationHtml(t,c,{toolReply:async(request,result)=>{
    if(request.name==='workflow_communication_enable'){reached=true;await gate;}return result;
  }});
  await eventually(()=>!old.$('enable').disabled);old.$('enable').click();await eventually(()=>reached);
  old.dom.window.dispatchEvent(new old.dom.window.Event('pagehide'));
  const fresh=await communicationHtml(t,c);await bindAndEnable(fresh,joined);release();
  await eventually(()=>old.calls.includes('workflow_communication_stop'));
  await delay(40);assert.equal((await f.plugin.communication.status({...joined,metadata})).stopped,false);
  for(let i=0;i<29;i++)fresh.notify({jsonrpc:'2.0',method:'ui/notifications/host-context-changed',params:{locale:'en'}});
  await eventually(()=>fresh.$('status').textContent.includes('подтвердила Stop'));
  assert.equal(fresh.calls.filter(x=>x==='workflow_communication_stop').length,1);
  assert.match(fresh.$('enable-reason').textContent,/Восстановить данные/);
  fresh.$('recover').click();await eventually(()=>!fresh.$('enable').disabled);
});

test('real SDK: finite two-conversation question/answer/result, each notification read once',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f),people={},panels={};
  for(const role of ['O','E']){
    const meta={...metadata,'openai/session':'chain-'+role};
    people[role]={meta,...await modelTool(c,meta,'join',{run_id:'finite-chain',role})};
  }
  const received=[];
  for(const role of ['O','E']){
    const own=people[role],other=people[role==='O'?'E':'O'];
    panels[role]=await communicationHtml(t,c,{hostMetadata:own.meta,onMessage:async request=>{
      const message=await modelTool(c,own.meta,'read_message',notificationArgs(request));received.push(message.kind);
      if(message.kind!=='result')await modelTool(c,own.meta,'send_message',{run_id:own.run_id,participant_id:own.participant_id,
        recipient_id:other.participant_id,kind:message.kind==='question'?'answer':'result',body:message.kind==='question'?'4':'Correct. End.',
        idempotency_key:'reply-'+message.kind,in_reply_to:message.message_id});
    }});
    await bindAndEnable(panels[role],own);
  }
  await modelTool(c,people.O.meta,'send_message',{run_id:people.O.run_id,participant_id:people.O.participant_id,
    recipient_id:people.E.participant_id,kind:'question',body:'What is 2 + 2?',idempotency_key:'first'});
  await eventually(async()=>{const value=await f.plugin.communication.status({...people.O,metadata:people.O.meta});
    return value.messages.length===3&&value.messages.every(m=>m.read&&m.delivery==='accepted');});
  await delay(80);assert.deepEqual(received,['question','answer','result']);
  assert.equal(panels.O.messages.length+panels.E.messages.length,3);
  for(const ui of Object.values(panels)){assert.equal(ui.maxWaits,1);assert.deepEqual(ui.errors,[]);ui.$('stop').click();}
});

test('real SDK: lost claim/report response never retries delivery, and late read survives',async t=>{
  for(const boundary of ['claim','report'])await t.test(boundary,async t=>{
    const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
    const joined=await modelTool(c,metadata,'join',{run_id:'lost-'+boundary,role:'O'});
    const ui=await communicationHtml(t,c,{toolReply:async(request,result)=>request.name==='workflow_communication_'+boundary?{transportError:true}:result,
      onMessage:request=>modelTool(c,metadata,'read_message',notificationArgs(request)).then(()=>({}))});
    await bindAndEnable(ui,joined);await modelTool(c,metadata,'probe',{run_id:joined.run_id,participant_id:joined.participant_id,delay_ms:25});
    await eventually(()=>ui.$('status').textContent.includes('Исход попытки'));
    await delay(60);const state=await f.plugin.communication.status({...joined,metadata});
    assert.equal(state.stopped,true);assert.equal(ui.messages.length,boundary==='claim'?0:1);
    assert.equal(state.messages[0].delivery,boundary==='claim'?'claimed':'accepted');
    assert.equal(state.messages[0].read,boundary==='report');
    assert.equal(ui.calls.filter(n=>n==='workflow_communication_claim').length,1);
    if(boundary==='report')await eventually(async()=>(await f.plugin.communication.journal({...joined,metadata})).events.some(e=>e.event_type==='report.failed'));
    assert.deepEqual(ui.errors,[]);
  });
});

test('real SDK: missing Send response becomes unknown; a rejection is distinct, neither repeats',async t=>{
  for(const outcome of ['unknown','rejected'])await t.test(outcome,async t=>{
    const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
    const joined=await modelTool(c,metadata,'join',{run_id:'sdk-'+outcome,role:'O'});
    const ui=await communicationHtml(t,c,{timerMs:ms=>ms===10000?80:ms,onMessage:async()=>outcome==='unknown'?{drop:true}:{isError:true}});
    await bindAndEnable(ui,joined);await modelTool(c,metadata,'probe',{run_id:joined.run_id,participant_id:joined.participant_id,delay_ms:25});
    await eventually(async()=>(await f.plugin.communication.status({...joined,metadata})).messages[0]?.delivery===outcome);
    await delay(100);assert.equal(ui.messages.length,1);
    const events=(await f.plugin.communication.journal({...joined,metadata})).events;
    assert.ok(events.some(e=>e.event_type===(outcome==='unknown'?'sdk.timeout':'sdk.rejected')));
    ui.$('stop').click();assert.deepEqual(ui.errors,[]);
  });
});

test('real SDK: context change between claim and verify prevents Send',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const joined=await modelTool(c,metadata,'join',{run_id:'navigation-boundary',role:'O'});let ui;
  ui=await communicationHtml(t,c,{toolReply:async(request,result)=>{
    if(request.name==='workflow_communication_claim')ui.setMetadata({...metadata,'openai/session':'changed'});return result;
  }});
  await bindAndEnable(ui,joined);await modelTool(c,metadata,'probe',{run_id:joined.run_id,participant_id:joined.participant_id,delay_ms:25});
  await eventually(()=>ui.$('status').textContent.includes('Подтверждение службы не получено'));
  assert.equal(ui.messages.length,0);assert.equal(ui.calls.filter(n=>n==='workflow_communication_verify').length,1);
  assert.deepEqual(ui.errors,[]);
});

test('real SDK: Stop before Send prevents invocation; Stop after invocation preserves outcome and read',async t=>{
  for(const boundary of ['before','after'])await t.test(boundary,async t=>{
    const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
    const joined=await modelTool(c,metadata,'join',{run_id:'stop-'+boundary,role:'O'});let ui,release;
    const gate=new Promise(resolve=>{release=resolve;});let reached=false;
    ui=await communicationHtml(t,c,{toolReply:async(request,result)=>{
      if(boundary==='before'&&request.name==='workflow_communication_verify'){reached=true;await gate;}return result;
    },onMessage:async request=>{if(boundary==='after'){reached=true;await gate;await modelTool(c,metadata,'read_message',notificationArgs(request));}return {};}});
    await bindAndEnable(ui,joined);await modelTool(c,metadata,'probe',{run_id:joined.run_id,participant_id:joined.participant_id,delay_ms:25});
    await eventually(()=>reached);ui.$('stop').click();await eventually(()=>ui.$('status').textContent.includes('подтвердила Stop'));release();
    if(boundary==='after')await eventually(async()=>(await f.plugin.communication.status({...joined,metadata})).messages[0]?.delivery==='accepted');
    await delay(50);const state=await f.plugin.communication.status({...joined,metadata});
    assert.equal(state.stopped,true);assert.equal(ui.messages.length,boundary==='before'?0:1);
    assert.equal(state.messages[0].read,boundary==='after');assert.deepEqual(ui.errors,[]);
  });
});

test('real SDK: two panels share one delivery; pagehide revokes permission and new panel remains stopped',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const joined=await modelTool(c,metadata,'join',{run_id:'two-panels',role:'O'});
  const first=await communicationHtml(t,c);await bindAndEnable(first,joined);
  const second=await communicationHtml(t,c);await bindAndEnable(second,joined);
  await modelTool(c,metadata,'probe',{run_id:joined.run_id,participant_id:joined.participant_id,delay_ms:25});
  await eventually(()=>second.messages.length===1);assert.equal(first.messages.length,0);
  second.dom.window.dispatchEvent(new second.dom.window.Event('pagehide'));
  await eventually(async()=>(await f.plugin.communication.status({...joined,metadata})).stopped);
  const third=await communicationHtml(t,c);third.$('run').value=joined.run_id;third.$('participant').value=joined.participant_id;third.$('bind').click();
  await eventually(()=>third.$('status').textContent.includes('Привязка подтверждена'));
  assert.equal(third.calls.includes('workflow_communication_enable'),false);assert.equal(third.messages.length,0);
  for(const ui of [first,second,third]){assert.ok(ui.maxWaits<=1);assert.deepEqual(ui.errors,[]);}
});

test('real SDK: export response failure is visible and keeps the previous export and server journal',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);let fail=false;
  const joined=await modelTool(c,metadata,'join',{run_id:'export-failure',role:'O'});
  const ui=await communicationHtml(t,c,{toolReply:async(request,result)=>fail&&request.name==='workflow_communication_export'?{transportError:true}:result});
  await bindAndEnable(ui,joined);ui.$('stop').click();await eventually(()=>ui.$('status').textContent.includes('подтвердила Stop'));
  ui.$('export').click();await eventually(()=>!ui.$('export-result').hidden);const previous=ui.$('export-text').value;
  fail=true;ui.$('export').click();await eventually(()=>ui.$('status').textContent.includes('Экспорт не завершён'));
  assert.equal(ui.$('export-text').value,previous);assert.ok((await f.plugin.communication.export({...joined,metadata})).through_seq>0);
  fail=false;ui.$('export').click();await eventually(()=>!ui.$('export').disabled);assert.ok(ui.$('export-text').value.length>=previous.length);
  assert.deepEqual(ui.errors,[]);
});

test('real SDK: failed wait reconnects with one waiter, while local expiry and pagehide stop waiting',async t=>{
  for(const ending of ['expiry','pagehide'])await t.test(ending,async t=>{
    const f=await fixture(t);f.plugin.communication.waitMs=30;await bridge(t,f);const c=await client(t,f);let lost=false;
    const joined=await modelTool(c,metadata,'join',{run_id:'wait-'+ending,role:'O'});
    const ui=await communicationHtml(t,c,{timerMs:ms=>ending==='expiry'&&ms>590000?650:ms,toolReply:async(request,result)=>{
      if(request.name==='workflow_communication_wait'&&!lost){lost=true;return {transportError:true};}return result;
    }});
    await bindAndEnable(ui,joined);
    await eventually(async()=>(await f.plugin.communication.journal({...joined,metadata})).events.some(e=>e.event_type==='connection.restored'));
    if(ending==='pagehide')ui.dom.window.dispatchEvent(new ui.dom.window.Event('pagehide'));
    await eventually(async()=>(await f.plugin.communication.status({...joined,metadata})).stopped);
    await delay(60);const waits=ui.calls.filter(n=>n==='workflow_communication_wait').length;await delay(80);
    assert.equal(ui.calls.filter(n=>n==='workflow_communication_wait').length,waits);assert.equal(ui.messages.length,0);assert.equal(ui.maxWaits,1);
    if(ending==='expiry')assert.match(ui.$('status').textContent,/Срок разрешения истёк/);
    assert.deepEqual(ui.errors,[]);
  });
});

test('external conversation is durable, idempotent and cannot take over another project',async t=>{
  const f=await fixture(t),projectId='Первый',requestId=randomUUID(),input={projectId,requestId,metadata};
  const selected=f.store.selected();const count=()=>f.store.snapshot().projects.flatMap(p=>p.sessions).length;
  const start=count();
  await assert.rejects(f.plugin.connect({...input,metadata:{}}),{code:'PLUGIN_SESSION_REQUIRED'});
  assert.equal(count(),start);
  const [a,b]=await Promise.all([f.plugin.connect(input),f.plugin.connect(input)]);
  assert.equal(a.sessionId,b.sessionId);assert.equal(count(),start+1);
  assert.equal(f.store.selected().sessionId,selected.sessionId,'remote connect does not switch desktop');
  assert.equal(a.context,(await f.loadContext(path.join(f.directory,projectId))).context);
  assert.equal(a.contextSha256,digest(a.context));
  assert.equal((await f.plugin.connect({...input,requestId:randomUUID()})).sessionId,a.sessionId);
  await assert.rejects(f.plugin.connect({...input,projectId:'Second'}),{code:'PLUGIN_BINDING_CONFLICT'});
  await assert.rejects(f.plugin.connect({...input,metadata:{'openai/session':'other'}}),{code:'PLUGIN_BINDING_CONFLICT'});
  const restarted=new ControlFacade({storageFile:f.file,execution:{}});await restarted.projects.load();
  const restored=restarted.projects.project(path.join(f.directory,projectId),a.sessionId);
  assert.equal(restored.external.provider,'chatgpt-plugin');assert.equal(restored.chatUrl,null);
  assert.equal(JSON.stringify(restarted.projects.snapshot()).includes('conversation-fixture'),false,'raw host identifiers are not persisted');
  const repeat=await restarted.createPlugin({loadContext:f.loadContext}).connect(input);
  assert.equal(repeat.sessionId,a.sessionId);
  const broken=f.control.createPlugin({loadContext:async workspace=>({...await f.loadContext(workspace),context:'damaged'})});
  await assert.rejects(broken.connect({...input,requestId:randomUUID(),metadata:{'openai/session':'new'}}),{code:'MCP_CONTEXT_DAMAGED'});
  assert.equal(count(),start+1,'incomplete context never creates a session');
});

test('private bridge rejects browser origins, unauthenticated and oversized requests',async t=>{
  const f=await fixture(t),state=await bridge(t,f),url=`http://127.0.0.1:${state.port}/plugin`;
  const send=(body,headers={})=>fetch(url,{method:'POST',body:JSON.stringify(body),headers});
  assert.equal((await send({action:'list'})).status,403);
  const headers={Authorization:'Bearer '+state.token};
  assert.equal((await send({action:'list'},{...headers,Origin:'https://example.com'})).status,403);
  assert.equal((await send({action:'list',padding:'x'.repeat(17000)},headers)).status,413);
  assert.equal((await send({action:'exec'},headers)).status,400);
  assert.equal((await (await send({action:'open',projectId:'Первый'},headers)).json()).project.id,'Первый');
  assert.equal((await fs.stat(path.join(f.directory,'plugin-bridge.json'))).mode&0o777,0o600);
  await assert.rejects(startPluginBridge({directory:f.directory}),/already running/);
});

test('real MCP lists extension metadata, serves bundled UI, binds using host metadata and returns full context',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const tools=(await c.listTools()).tools;
  const panel=tools.find(v=>v.name==='workflow_pilot_panel');
  assert.deepEqual(panel._meta['openai/ui'].entrypoints,[{type:'global'},{type:'thread'}]);
  assert.equal(panel.annotations.readOnlyHint,false);
  assert.equal(panel.annotations.idempotentHint,true);
  assert.equal(panel.inputSchema.properties.ctx,undefined);
  assert.equal(panel.inputSchema.properties.enrollment_ticket.anyOf[0].pattern,'^[a-f0-9]{64}$');
  assert.equal(panel.inputSchema.required?.length??0,0);
  assert.equal(tools.find(v=>v.name==='workflow_connect_project').annotations.idempotentHint,true);
  assert.equal(tools.find(v=>v.name==='workflow_connect_project').inputSchema.properties.ctx,undefined);
  for(const name of ['workflow_plugin_wait','workflow_plugin_claim','workflow_plugin_report'])assert.equal(tools.find(v=>v.name===name),undefined);
  assert.equal(tools.find(v=>v.name==='workflow_open_project')._meta?.ui?.resourceUri,undefined);
  const resource=await c.readResource({uri:panel._meta.ui.resourceUri});
  assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
  assert.match(resource.contents[0].text,/Связь участников/);assert.match(resource.contents[0].text,/<script>/);
  assert.doesNotMatch(resource.contents[0].text,/navigation-probe|launch-arm|target:\s*["']new/);
  assert.doesNotMatch(resource.contents[0].text,/<script[^>]+src=/);
  const bundled=new JSDOM(resource.contents[0].text);
  for(const script of bundled.window.document.scripts)new Script(script.textContent);
  bundled.window.close();
  const panelResult=await c.callTool({name:'workflow_pilot_panel',arguments:{}});
  assert.equal(panelResult.structuredContent.communication.build_id,COMMUNICATION_BUILD);assert.equal(panelResult.structuredContent.projects,undefined);
  const listing=await c.callTool({name:'workflow_open_project',arguments:{}});assert.equal(listing.structuredContent.projects.length,2);
  const args={project_id:'Первый',request_id:randomUUID()};
  const missing=await c.callTool({name:'workflow_connect_project',arguments:args});
  assert.equal(missing.isError,true);assert.equal(missing.structuredContent.error.code,'PLUGIN_SESSION_REQUIRED');
  const connected=await c.callTool({name:'workflow_connect_project',arguments:args,_meta:metadata});
  assert.equal(connected.isError,false,JSON.stringify(connected));
  assert.equal(connected.content[1].text,(await f.loadContext(path.join(f.directory,'Первый'))).context);
  const repeated=await c.callTool({name:'workflow_connect_project',arguments:args,_meta:metadata});
  assert.equal(repeated.structuredContent.sessionId,connected.structuredContent.sessionId);
  const manual=await c.callTool({name:'workflow_connect_project',arguments:{project_id:'Первый'},_meta:metadata});
  assert.equal(manual.structuredContent.sessionId,connected.structuredContent.sessionId,'ordinary chat can connect without a panel request');
  const focused=await c.callTool({name:'workflow_open_project',arguments:{project_id:'Первый'}});
  assert.equal(focused.isError,false);assert.equal(focused.structuredContent.project.id,'Первый');
  assert.ok(focused.structuredContent.sessions.some(s=>s.id===connected.structuredContent.sessionId));
  const absent=await c.callTool({name:'workflow_open_project',arguments:{project_id:'missing'}});
  assert.equal(absent.isError,true);assert.equal(absent.structuredContent.error.code,'PLUGIN_PROJECT_UNAVAILABLE');
});

test('MCP reports a closed desktop without creating a separate project store',async t=>{
  const f=await fixture(t),c=await client(t,f);
  const response=await c.callTool({name:'workflow_pilot_panel',arguments:{}});
  assert.equal(response.isError,true);assert.equal(response.structuredContent.error.code,'PLUGIN_DESKTOP_REQUIRED');
  assert.deepEqual((await fs.readdir(f.directory)).sort(),['Second','communication','sessions.json','Первый'].sort());
});

test('backend owns the plugin bridge: MCP lists projects with no frontend and reports backend loss',{skip:process.platform!=='darwin'?'macOS Electron fixture only':false,timeout:90000},async t=>{
  const {spawn,execFileSync}=await import('node:child_process');
  const readline=await import('node:readline');
  const backendRoot=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-plugin-backend-')));
  t.after(()=>fs.rm(backendRoot,{recursive:true,force:true}));
  const workspace=path.join(backendRoot,'Проект');
  await fs.mkdir(path.join(workspace,'.harness/plans'),{recursive:true});await fs.mkdir(path.join(workspace,'scripts'));
  await fs.writeFile(path.join(workspace,'scripts/workflow.mjs'),'// fixture');
  await fs.writeFile(path.join(workspace,'.harness/workflow.json'),'{}');
  await fs.writeFile(path.join(workspace,'.harness/plans/todo-plan.md'),
    '<!-- workflow-state:begin -->\n```json\n'+JSON.stringify({schema_version:1,project_id:'backend-project',project_name:'Проект',
      plan_revision:1,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',current_task_id:null,tasks:[]})
      +'\n```\n<!-- workflow-state:end -->');
  execFileSync('git',['init','-q',workspace]);
  const control=new ControlFacade({storageFile:path.join(backendRoot,'workspaces.json'),execution:{}});
  await control.projects.load();await control.projects.select(workspace);
  const electron=(await import('electron')).default;
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const backend=spawn(electron,['.','--backend-host','--backend-fixture-root='+backendRoot],{cwd:root,env,stdio:['pipe','pipe','pipe']});
  t.after(()=>{if(backend.exitCode===null)backend.kill('SIGKILL');});
  let errors='';backend.stderr.setEncoding('utf8');backend.stderr.on('data',chunk=>{errors+=chunk;});
  const lines=readline.createInterface({input:backend.stdout});
  let deadline;
  const ready=await Promise.race([
    new Promise((resolve,reject)=>{lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready)resolve(value);}catch{}});
      backend.on('exit',code=>reject(new Error('backend '+code+': '+errors)));}),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('startup timeout: '+errors)),30000);}),
  ]).finally(()=>clearTimeout(deadline));
  const directory=path.join(backendRoot,'plugin');
  const descriptor=JSON.parse(await fs.readFile(path.join(directory,'plugin-bridge.json'),'utf8'));
  assert.equal(descriptor.pid,ready.pid,'the bridge belongs to the backend process');
  const c=await client(t,{directory});
  const panel=await c.callTool({name:'workflow_pilot_panel',arguments:{}});
  assert.equal(panel.isError,false,JSON.stringify(panel.structuredContent));
  assert.equal(panel.structuredContent.projects,undefined);assert.equal(panel.structuredContent.communication.build_id,COMMUNICATION_BUILD);
  const opened=await c.callTool({name:'workflow_open_project',arguments:{project_id:'backend-project'}});
  assert.equal(opened.isError,false);assert.equal(opened.structuredContent.project.id,'backend-project');
  backend.kill('SIGKILL');await new Promise(resolve=>backend.once('exit',resolve));
  const lost=await c.callTool({name:'workflow_pilot_panel',arguments:{}});
  assert.equal(lost.isError,true);assert.equal(lost.structuredContent.error.code,'PLUGIN_DESKTOP_UNAVAILABLE');
  assert.match(lost.structuredContent.error.message,/Фоновая служба Workflow Pilot/);
});
