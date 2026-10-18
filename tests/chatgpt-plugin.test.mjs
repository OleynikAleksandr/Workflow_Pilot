import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import {Script} from 'node:vm';
import {pluginHtml} from '../scripts/stage-chatgpt-plugin.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
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
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
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
  const plugin=control.createPlugin({loadContext,onChange:()=>changes++,communicationStore:await openCommunicationStore(path.join(directory,'communication'))});
  return {directory,file,control,store,plugin,loadContext,changes:()=>changes};
}
async function bridge(t,f){
  const b=await startPluginBridge({directory:f.directory,panel:()=>f.plugin.panel(),list:()=>f.plugin.list(),open:id=>f.plugin.open(id),connect:i=>f.plugin.connect(i),
    communication:f.plugin.communication});
  t.after(()=>b.close());
  return JSON.parse(await fs.readFile(path.join(f.directory,'plugin-bridge.json'),'utf8'));
}
async function client(t,f){
  const c=new Client({name:'fixture',version:'1'});
  const transport=new StdioClientTransport({command:path.join(root,'.harness/runtime/test-python/bin/python'),
    args:['-B',path.join(root,'tests/fixtures/plugin-server.py'),path.join(root,'tools/codex-app-server-mcp'),f.directory],stderr:'pipe'});
  let stderr='';transport.stderr?.on('data',chunk=>{stderr+=chunk;});
  t.after(()=>c.close());
  try{await c.connect(transport);}catch(error){throw new Error(error.message+'\n'+stderr);}
  return c;
}
async function eventually(check){for(let i=0;i<200;i++){if(await check())return;await delay(10);}assert.ok(await check(),'async UI completed');}

const communicationTools=['bind','claim','enable','export','join','journal','probe','read_message','report','send_message','status','stop','telemetry','verify','wait'];
test('communication MCP contracts reject missing identity, wrong binding and stale protocol; Stop cancels probe',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const tools=(await c.listTools()).tools;
  const appOnly=['bind','claim','enable','report','stop','telemetry','verify','wait'];
  for(const suffix of communicationTools){const tool=tools.find(t=>t.name==='workflow_communication_'+suffix);
    assert.ok(tool);assert.equal(tool._meta.ui.resourceUri,undefined,'data operations cannot recreate UI');
    assert.deepEqual(tool._meta.ui.visibility,appOnly.includes(suffix)?['app']:['journal','status','export'].includes(suffix)?['app','model']:['model']);
    assert.equal(tool.annotations.readOnlyHint,['journal','status','export'].includes(suffix));
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

async function communicationHtml(t,c,{hostMetadata=metadata,messageSupported=true,onMessage=async()=>{},theme='light'}={}) {
  const html=(await c.readResource({uri:'ui://workflow-pilot/projects-v1.html'})).contents[0].text;
  const errors=[],calls=[],messages=[];let initialized=false,currentMetadata=hostMetadata,notify,activeWaits=0,maxWaits=0;
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://communication-fixture.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,
    beforeParse(window){
      window.TextEncoder=TextEncoder;window.TextDecoder=TextDecoder;
      window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
      window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
      const deliver=data=>window.dispatchEvent(new window.MessageEvent('message',{source:window,data}));
      notify=deliver;
      window.postMessage=async request=>{
        try{
          if(request.method==='ui/initialize')queueMicrotask(()=>deliver({jsonrpc:'2.0',id:request.id,result:{
            protocolVersion:request.params.protocolVersion,hostInfo:{name:'Isolated communication host',version:'1'},
            hostContext:{theme},hostCapabilities:{serverTools:{},experimental:messageSupported?{'openai/message':{}}:{}}}}));
          else if(request.method==='ui/notifications/initialized')initialized=true;
          else if(request.method==='tools/call'){
            calls.push(request.params.name);
            if(request.params.name==='workflow_communication_wait')maxWaits=Math.max(maxWaits,++activeWaits);
            const result=await c.callTool({...request.params,_meta:currentMetadata});
            if(request.params.name==='workflow_communication_wait')activeWaits--;
            deliver({jsonrpc:'2.0',id:request.id,result});
          }else if(request.method==='ui/message'){
            messages.push(request.params);await onMessage(request.params);
            deliver({jsonrpc:'2.0',id:request.id,result:{}});
          }
        }catch(e){errors.push(e.message);deliver({jsonrpc:'2.0',id:request.id,error:{code:-32000,message:'Fixture failed'}});}
      };
    }});
  t.after(()=>{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();});
  await eventually(()=>initialized||errors.length);assert.deepEqual(errors,[]);
  const $=id=>dom.window.document.getElementById('communication-'+id);
  return {dom,$,errors,calls,messages,notify,get maxWaits(){return maxWaits;},setMetadata(meta){currentMetadata=meta;}};
}

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
    await eventually(()=>ui.$('status').textContent.includes('подтвердила Stop'));
    assert.equal((await f.plugin.communication.status({...model,metadata})).stopped,true);
    assert.deepEqual(ui.errors,[]);
  });
});

test('a cached panel/backend mismatch is visible and cannot enable delivery',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f),ui=await communicationHtml(t,c);
  ui.notify({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{content:[],structuredContent:{communication:{protocol_version:1,build_id:'old'}}}});
  await eventually(()=>ui.$('status').textContent.includes('Несовместимая панель'));
  assert.equal(ui.$('enable').disabled,true);assert.equal(ui.messages.length,0);
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
