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
import {mountPanel} from '../src/frontend/plugin/panel.mjs';
import {mountNavigationProbe,conversationUrl} from '../src/frontend/plugin/navigation-probe.mjs';
import {mountLaunch} from '../src/frontend/plugin/launch.mjs';
import {PluginLaunch} from '../src/control/plugin/launch.mjs';

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
  const plugin=control.createPlugin({loadContext,onChange:()=>changes++});
  return {directory,file,control,store,plugin,loadContext,changes:()=>changes};
}
async function bridge(t,f){
  const b=await startPluginBridge({directory:f.directory,list:()=>f.plugin.list(),open:id=>f.plugin.open(id),connect:i=>f.plugin.connect(i),
    wait:(id,signal)=>f.plugin.launch.wait(id,signal),claim:i=>f.plugin.launch.claim(i),report:i=>f.plugin.launch.report(i)});
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
  for(const name of ['workflow_plugin_wait','workflow_plugin_claim','workflow_plugin_report'])
    assert.deepEqual(tools.find(v=>v.name===name)._meta.ui.visibility,['app']);
  const resource=await c.readResource({uri:panel._meta.ui.resourceUri});
  assert.equal(resource.contents[0].mimeType,'text/html;profile=mcp-app');
  assert.match(resource.contents[0].text,/Новая сессия/);assert.match(resource.contents[0].text,/<script>/);
  assert.doesNotMatch(resource.contents[0].text,/<script[^>]+src=/);
  const bundled=new JSDOM(resource.contents[0].text);
  for(const script of bundled.window.document.scripts)new Script(script.textContent);
  bundled.window.close();
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
  const focused=await c.callTool({name:'workflow_pilot_panel',arguments:{project_id:'Первый'}});
  assert.equal(focused.isError,false);assert.equal(focused.structuredContent.project.id,'Первый');
  assert.equal(focused.structuredContent.projects.length,2);
  assert.ok(focused.structuredContent.sessions.some(s=>s.id===connected.structuredContent.sessionId));
  const absent=await c.callTool({name:'workflow_pilot_panel',arguments:{project_id:'missing'}});
  assert.equal(absent.isError,true);assert.equal(absent.structuredContent.error.code,'PLUGIN_PROJECT_UNAVAILABLE');
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
    const text=payload.content[0].text;
    assert.ok(text.indexOf('workflow_pilot_panel')<text.indexOf('workflow_connect_project'),'panel is requested before connecting or reading recovery');
    assert.ok(text.lastIndexOf('workflow_pilot_panel')>text.indexOf('прочитай весь полученный контекст'),'refresh after recovery');
    result=await c.callTool({name:'workflow_connect_project',arguments:{project_id:'Первый',request_id:requestId},_meta:metadata});
    return {};
  }};
  ui.ready();$('new-session').click();$('new-session').click();
  await eventually(()=>$('status').textContent.includes('Запрос передан'));
  assert.equal(sends,1);assert.equal(result.isError,false);
  assert.equal(f.store.snapshot().projects.find(p=>p.projectId==='Первый').sessions.filter(s=>s.external).length,1);
  assert.equal($('new-session').disabled,true);
  $('refresh').click();await eventually(()=>$('status').textContent==='Данные проекта обновлены.');
  assert.equal($('sessions').children.length,result?f.plugin.list().projects.find(p=>p.id==='Первый').sessions.length:0);
  assert.equal($('new-session').disabled,true,'refresh must not re-enable an uncertain send');
  ui.render({projects:[]});
  assert.equal($('project-detail').hidden,true);assert.equal($('sessions').children.length,0);
  ui.render((await c.callTool({name:'workflow_pilot_panel',arguments:{project_id:'Первый'}})).structuredContent);
  assert.equal($('project-detail').hidden,false);assert.equal($('projects').children.length,2);
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

test('served bundled HTML starts the actual SDK and handles project and new-session buttons',async t=>{
  const f=await fixture(t);await bridge(t,f);const c=await client(t,f);
  const html=(await c.readResource({uri:'ui://workflow-pilot/projects-v1.html'})).contents[0].text;
  const listing=await c.callTool({name:'workflow_pilot_panel',arguments:{project_id:'Первый'}});
  const errors=[],calls=[],messages=[],links=[],compatLinks=[];let initialized=false;
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://plugin-fixture.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,
    beforeParse(window){
      window.openai={openExternal:params=>{compatLinks.push(params);return {};}};
      window.TextEncoder=TextEncoder;window.TextDecoder=TextDecoder;
      window.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}};
      window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
      const deliver=data=>window.dispatchEvent(new window.MessageEvent('message',{source:window,data}));
      window.postMessage=async request=>{
        try{
          if(request.method==='ui/initialize'){
            queueMicrotask(()=>deliver({jsonrpc:'2.0',id:request.id,result:{protocolVersion:request.params.protocolVersion,
              hostInfo:{name:'Fixture Host',version:'1'},hostContext:{theme:'dark'},
              hostCapabilities:{openLinks:{},serverTools:{},experimental:{'openai/message':{}}}}}));
          }else if(request.method==='ui/notifications/initialized'){
            initialized=true;deliver({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:listing});
          }else if(request.method==='tools/call'){
            calls.push(request.params.name);
            deliver({jsonrpc:'2.0',id:request.id,result:await c.callTool(request.params)});
          }else if(request.method==='ui/message'){
            messages.push(request.params);deliver({jsonrpc:'2.0',id:request.id,result:{}});
          }else if(request.method==='ui/open-link'){
            links.push(request.params);deliver({jsonrpc:'2.0',id:request.id,result:{isError:links.length>1}});
          }
        }catch(e){errors.push(e.message);}
      };
    }});
  t.after(()=>dom.window.close());const $=id=>dom.window.document.getElementById(id);
  await eventually(()=>initialized||errors.length>0);assert.deepEqual(errors,[]);
  await eventually(()=>$('projects').querySelectorAll('button').length===2);
  assert.equal(dom.window.document.querySelector('h1').textContent,'Workflow Pilot');
  assert.equal($('project-detail').hidden,false,'focused tool result opens project on a fresh panel');
  await eventually(()=>$('new-session').disabled===false).catch(error=>{
    throw new Error(error.message+'; status='+$('status').textContent+'; calls='+JSON.stringify(calls)+'; errors='+JSON.stringify(errors));
  });
  assert.equal($('project-name').textContent,'Первый');
  const url='https://chatgpt.com/c/12345678-1234-1234-1234-123456789abc';
  $('probe-url').value=url;$('probe-url').dispatchEvent(new dom.window.Event('input'));
  assert.equal($('probe-sdk').disabled,false);
  $('probe-sdk').click();await eventually(()=>$('probe-status').textContent.includes('API вернул'));
  assert.equal(links[0].url,url);assert.equal(messages.length,0,'navigation does not send a message');
  $('probe-sdk').click();await eventually(()=>$('probe-status').textContent.includes('отклонил'));
  $('probe-compat').click();await eventually(()=>compatLinks.length===1&&!$('probe-compat').disabled);
  $('probe-compat-direct').click();await eventually(()=>compatLinks.length===2&&!$('probe-compat-direct').disabled);
  assert.deepEqual(JSON.parse(JSON.stringify(compatLinks)),[{href:url},{href:url,redirectUrl:false}]);
  for(const [id,target] of [['anchor-blank','_blank'],['anchor-top','_top']]){
    const anchor=$('probe-'+id);assert.equal(anchor.href,url);assert.equal(anchor.target,target);
    anchor.addEventListener('click',e=>e.preventDefault(),{once:true});anchor.click();
    assert.equal(JSON.parse($('probe-report').value).events.at(-1).method,id);
  }
  $('probe-outcome').value='browser';$('probe-save').click();
  assert.equal(JSON.parse($('probe-report').value).events.at(-1).outcome,'browser');
  assert.ok(!$('probe-report').value.includes('12345678'));
  assert.ok(!dom.window.localStorage.getItem('workflow-pilot-navigation-probe-v1').includes(url));
  $('probe-url').value='https://chatgpt.com/share/123';$('probe-url').dispatchEvent(new dom.window.Event('input'));
  assert.equal($('probe-sdk').disabled,true);assert.equal($('probe-anchor-top').hasAttribute('href'),false);
  $('new-session').click();await eventually(()=>messages.length===1);
  assert.deepEqual(JSON.parse(JSON.stringify(messages[0]._meta)),{'openai/message':{target:'new',send:true}});
  assert.match(messages[0].content[0].text,/workflow_connect_project/);
  const requestId=messages[0].content[0].text.match(/"request_id":"([^"]+)"/)[1];
  const connected=await c.callTool({name:'workflow_connect_project',arguments:{project_id:'Первый',request_id:requestId},_meta:metadata});
  assert.equal(connected.isError,false);
  $('refresh').click();await eventually(()=>$('sessions').children.length===f.plugin.list().projects.find(p=>p.id==='Первый').sessions.length);
  assert.deepEqual(calls,['workflow_pilot_panel']);assert.deepEqual(errors,[]);
  const selected=f.store.selected(),count=f.plugin.list().projects.find(p=>p.id==='Первый').sessions.length;
  $('launch-arm').click();$('launch-arm').click();
  await eventually(()=>f.plugin.launch.snapshot().phase==='ready');
  const ticket=f.plugin.launch.request((await f.plugin.open('Первый')).project);
  await eventually(()=>messages.length===2 && f.plugin.launch.snapshot().phase==='accepted');
  assert.match(messages[1].content[0].text,new RegExp(ticket.requestId));
  assert.equal(messages[1]._meta['openai/message'].target,'new');
  assert.equal(f.store.selected().sessionId,selected.sessionId,'launch never selects a browser session');
  assert.equal(f.plugin.list().projects.find(p=>p.id==='Первый').sessions.length,count,'host acceptance alone does not bind a session');
  const launched=await c.callTool({name:'workflow_connect_project',arguments:{project_id:'Первый',request_id:ticket.requestId},
    _meta:{...metadata,'openai/session':'fresh-launch-conversation'}});
  assert.equal(launched.isError,false,JSON.stringify(launched));
  assert.equal(launched.content[1].text,(await f.loadContext(path.join(f.directory,'Первый'))).context);
  assert.equal(f.plugin.launch.snapshot().phase,'context-delivered');
  assert.equal(f.plugin.launch.snapshot().contextBytes,Buffer.byteLength(launched.content[1].text));
  assert.equal(f.plugin.launch.snapshot().contextSha256,digest(launched.content[1].text));
  assert.equal(f.plugin.launch.snapshot().domUsed,false);
  assert.deepEqual(calls.slice(1),['workflow_plugin_wait','workflow_plugin_claim','workflow_plugin_report']);
  assert.deepEqual(errors,[]);
});

test('one-shot launch rejects missing receiver, duplicate claims, wrong tickets and expired waits',async()=>{
  let now=1000;const launch=new PluginLaunch({waitMs:10,now:()=>now});
  const receiverId=randomUUID(),project={id:'one',name:'Project'};
  assert.throws(()=>launch.request(project),{code:'PLUGIN_RECEIVER_REQUIRED'});
  const expired=launch.wait(receiverId);
  assert.throws(()=>launch.wait(randomUUID()),{code:'PLUGIN_RECEIVER_BUSY'});
  assert.deepEqual(await expired,{expired:true});
  assert.equal(launch.snapshot().phase,'expired');
  const abort=new AbortController(),cancelled=launch.wait(receiverId,abort.signal);abort.abort();
  assert.deepEqual(await cancelled,{expired:true});
  const waiting=launch.wait(receiverId),ticket=launch.request(project);
  assert.deepEqual(await waiting,{...ticket,projectId:'one'});
  assert.throws(()=>launch.request(project),{code:'PLUGIN_RECEIVER_REQUIRED'});
  assert.throws(()=>launch.claim({...ticket,receiverId:randomUUID()}),{code:'PLUGIN_LAUNCH_EXPIRED'});
  now+=16000;
  assert.throws(()=>launch.claim({...ticket,receiverId}),{code:'PLUGIN_LAUNCH_EXPIRED'});
  // A separate receiver represents an explicit subsequent experiment.
  const other=new PluginLaunch({waitMs:100});
  const ready=other.wait(receiverId),next=other.request(project);await ready;
  other.claim({...next,receiverId});
  assert.throws(()=>other.claim({...next,receiverId}),{code:'PLUGIN_LAUNCH_EXPIRED'});
  other.connected({...next,projectId:'other',contextBytes:20,contextSha256:'hash'});
  assert.equal(other.snapshot().phase,'sending');
  other.connected({...next,projectId:'one',contextBytes:20,contextSha256:'hash'});
  other.report({...next,receiverId,outcome:'accepted'});
  assert.equal(other.snapshot().phase,'context-delivered','late API response cannot downgrade context delivery');
});

test('launch UI times out once, does not resend and disposes before dispatch',async t=>{
  const dom=new JSDOM(await fs.readFile(path.join(root,'src/frontend/plugin/index.html'),'utf8'));t.after(()=>dom.window.close());
  let sends=0;const outcomes=[];
  const request={projectId:'one',requestId:randomUUID()};
  const ui=mountLaunch({document:dom.window.document,sendTimeoutMs:5,
    getMessage:()=>({send:()=>{sends++;return new Promise(()=>{});}}),
    callTool:async(name,args)=>{if(name==='workflow_plugin_report')outcomes.push(args.outcome);return {structuredContent:request};}});
  const button=dom.window.document.getElementById('launch-arm');button.click();button.click();
  await eventually(()=>outcomes.length===1);
  assert.equal(sends,1);assert.deepEqual(outcomes,['unknown']);ui.dispose();button.click();assert.equal(sends,1);
  const second=new JSDOM(await fs.readFile(path.join(root,'src/frontend/plugin/index.html'),'utf8'));t.after(()=>second.window.close());
  let resolve;
  const closed=mountLaunch({document:second.window.document,getMessage:()=>({send:()=>sends++}),
    callTool:()=>new Promise(r=>{resolve=r;})});
  second.window.document.getElementById('launch-arm').click();closed.dispose();resolve({structuredContent:request});
  await delay(0);assert.equal(sends,1,'unmounted panel does not claim or send');
});

test('navigation probe rejects unrelated URLs, limits waiting and restores only safe journal fields',async t=>{
  for(const value of ['javascript:alert(1)','https://evil.test/c/a','https://chatgpt.com.evil.test/c/a',
    'https://user:pass@chatgpt.com/c/a','https://chatgpt.com/share/a','https://chatgpt.com/c/a?token=secret',
    'https://chatgpt.com/c/a#secret','http://chatgpt.com/c/a'])assert.equal(conversationUrl(value),null);
  assert.equal(conversationUrl(' https://chatgpt.com/g/g-p-test/c/abc '),'https://chatgpt.com/g/g-p-test/c/abc');
  const dom=new JSDOM(await fs.readFile(path.join(root,'src/frontend/plugin/index.html'),'utf8'));t.after(()=>dom.window.close());
  const $=id=>dom.window.document.getElementById(id);let sent=0;
  let stored=JSON.stringify([{method:'sdk',phase:'attempt',time:1,secret:'sensitive value'}]);
  const ui=mountNavigationProbe({document:dom.window.document,storage:{getItem:()=>stored,setItem:(_k,v)=>{stored=v;}},
    timeoutMs:5,getPorts:()=>({sdk:()=>{sent++;return new Promise(()=>{});}})});
  assert.equal($('probe-compat').disabled,true);assert.ok(!$('probe-report').value.includes('sensitive value'));
  $('probe-url').value='https://chatgpt.com/c/test';ui.ready();$('probe-sdk').click();$('probe-sdk').click();
  await eventually(()=>$('probe-status').textContent.includes('не подтверждён'));
  assert.equal(sent,1);assert.equal(JSON.parse(stored).at(-1).phase,'unknown');
  assert.equal($('probe-sdk').disabled,false);
});
