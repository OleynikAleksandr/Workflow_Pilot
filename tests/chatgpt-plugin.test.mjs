import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM} from 'jsdom';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ControlFacade} from '../src/control/facade.mjs';
import {startPluginBridge} from '../src/execution/plugin/bridge.mjs';
import {mountPanel} from '../src/frontend/plugin/panel.mjs';

const root=path.resolve(import.meta.dirname,'..');
const digest=text=>createHash('sha256').update(text).digest('hex');
const metadata={'openai/session':'conversation-fixture','openai/subject':'user-fixture'};
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
  const plugin=control.createPlugin({loadContext,onChange:()=>changes++});
  return {directory,file,control,store,plugin,loadContext,changes:()=>changes};
}
async function bridge(t,f){
  const b=await startPluginBridge({directory:f.directory,list:()=>f.plugin.list(),open:id=>f.plugin.open(id),connect:i=>f.plugin.connect(i)});
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
async function eventually(check){for(let i=0;i<200;i++){if(check())return;await delay(10);}assert.ok(check(),'async UI completed');}

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
  const resource=await c.readResource({uri:panel._meta.ui.resourceUri});
  assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
  assert.match(resource.contents[0].text,/Новая сессия/);assert.match(resource.contents[0].text,/<script>/);
  assert.doesNotMatch(resource.contents[0].text,/<script[^>]+src=/);
  const listing=await c.callTool({name:'workflow_pilot_panel',arguments:{}});assert.equal(listing.structuredContent.projects.length,2);
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
});

test('panel buttons traverse real MCP and Control; unsupported hosts cannot create conversations',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const dom=new JSDOM(await fs.readFile(path.join(root,'src/frontend/plugin/index.html'),'utf8'));t.after(()=>dom.window.close());
  let message=null,sends=0,result;
  const requestId=randomUUID();
  const ui=mountPanel({document:dom.window.document,getMessage:()=>message,uuid:()=>requestId,
    callTool:(name,args)=>c.callTool({name,arguments:args})});
  ui.render((await c.callTool({name:'workflow_pilot_panel',arguments:{}})).structuredContent);
  const $=id=>dom.window.document.getElementById(id);
  const first=()=>[...$('projects').querySelectorAll('button')].find(b=>b.textContent==='Первый');
  first().click();
  await eventually(()=>$('status').textContent.includes('Проект открыт'));
  assert.equal($('new-session').disabled,true);assert.equal($('capability').hidden,false);
  message={send:async payload=>{
    sends++;assert.deepEqual(payload._meta,{'openai/message':{target:'new',send:true}});
    assert.match(payload.content[0].text,new RegExp(requestId));
    result=await c.callTool({name:'workflow_connect_project',arguments:{project_id:'Первый',request_id:requestId},_meta:metadata});
    return {};
  }};
  ui.ready();$('new-session').click();$('new-session').click();
  await eventually(()=>$('status').textContent.includes('Запрос передан'));
  assert.equal(sends,1);assert.equal(result.isError,false);
  assert.equal(f.store.snapshot().projects.find(p=>p.projectId==='Первый').sessions.filter(s=>s.external).length,1);
  assert.equal($('new-session').disabled,true);
  // An uncertain host response must not create a second conversation on a repeated click.
  first().click();await eventually(()=>$('new-session').disabled===false);
  message={send:async()=>{sends++;throw new Error('timeout');}};
  $('new-session').click();await eventually(()=>$('status').textContent.includes('не подтверждён'));
  $('new-session').click();assert.equal(sends,2);assert.equal($('new-session').disabled,true);
});

test('MCP reports a closed desktop without creating a separate project store',async t=>{
  const f=await fixture(t),c=await client(t,f);
  const response=await c.callTool({name:'workflow_pilot_panel',arguments:{}});
  assert.equal(response.isError,true);assert.equal(response.structuredContent.error.code,'PLUGIN_DESKTOP_REQUIRED');
  assert.deepEqual((await fs.readdir(f.directory)).sort(),['Second','sessions.json','Первый'].sort());
});
