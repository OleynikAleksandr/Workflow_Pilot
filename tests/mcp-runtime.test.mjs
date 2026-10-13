import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LocalMcpClient, validateEndpoint } from '../src/execution/runtime/mcp-client.mjs';
import { validateContextPacket } from '../src/contracts/context.mjs';
import { defaultRuntimeFolder } from '../src/execution/platform/paths.mjs';

const ready = { mcp: { running: true, owned: true, ready: true },
  tunnel: { running: true, owned: true, ready: true, configured: true }, mcp_url: 'http://127.0.0.1:17842/mcp' };

test('the executor state folder is fixed per system and is never chosen by the user', () => {
  assert.equal(defaultRuntimeFolder('/Users/test', 'darwin'), '/Users/test/Library/Application Support/WorkflowPilotCodexExecutor');
  assert.equal(defaultRuntimeFolder('C:\\Users\\test', 'win32', { LOCALAPPDATA: 'D:\\Profiles\\test\\Local' }), 'D:\\Profiles\\test\\Local\\WorkflowPilotCodexExecutor');
  assert.equal(defaultRuntimeFolder('C:\\Users\\test', 'win32', { LOCALAPPDATA: 'relative' }), 'C:\\Users\\test\\AppData\\Local\\WorkflowPilotCodexExecutor');
  assert.equal(defaultRuntimeFolder('/home/test', 'linux'), '/home/test/.local/state/WorkflowPilotCodexExecutor');
});

test('the shell reads the catalogue over HTTP JSON or a streamed SSE answer and never calls a tool', async () => {
  const requests=[];
  const fetchImpl=async (_url,options) => {
    const body=JSON.parse(options.body);requests.push({body,headers:options.headers});
    if(body.method==='notifications/initialized')return new Response(null,{status:202});
    const results={initialize:{serverInfo:{name:'Workflow Pilot Local Windows'},protocolVersion:'2025-03-26'},
      'tools/list':{tools:['bridge_status','exec_command','apply_patch'].map(name=>({name}))}};
    const text=JSON.stringify({jsonrpc:'2.0',id:body.id,result:results[body.method]});
    if(body.method==='tools/list') {
      const bytes=new TextEncoder().encode(': keepalive\r\n\r\nevent: message\r\ndata: '+text+'\r\n\r\n');
      return new Response(new ReadableStream({start(controller){controller.enqueue(bytes.slice(0,28));controller.enqueue(bytes.slice(28));controller.close();}}),{headers:{'content-type':'text/event-stream'}});
    }
    return new Response(text,{headers:{'content-type':'application/json','mcp-session-id':'opaque-session'}});
  };
  const client=new LocalMcpClient(ready.mcp_url,{fetchImpl,expectedServerName:'Workflow Pilot Local Windows'});
  assert.deepEqual(await client.initialize(),{serverName:'Workflow Pilot Local Windows',toolCount:3,protocolVersion:'2025-03-26'});
  assert.equal(await client.initialize(),client.ready,'one handshake per client');
  assert.deepEqual(requests.map(request=>request.body.method),['initialize','notifications/initialized','tools/list']);
  assert.equal(requests[2].headers['Mcp-Session-Id'],'opaque-session');
  for(const name of ['exec_command','workflow_context_recover','bridge_status'])
    await assert.rejects(client.request('tools/call',{name}),{code:'MCP_READ_ONLY'},'the tools belong to the model, not to the shell');
  assert.equal(requests.length,3,'a refused call never reaches the server');
  assert.equal(typeof client.loadContext,'undefined','context is built by Workflow Kit, not fetched from the MCP server');
});

test('non-local addresses, another server on the port and a server without the status tool fail closed', async () => {
  for(const url of ['https://evil.test/mcp','http://127.0.0.1:17842/mcp?x=y','file:///tmp/mcp'])assert.throws(()=>validateEndpoint(url),{code:'MCP_URL_INVALID'});
  const server=tools=>async(_url,options)=>{
    const body=JSON.parse(options.body);
    if(body.method.startsWith('notifications/'))return new Response(null,{status:202});
    return new Response(JSON.stringify({id:body.id,result:body.method==='initialize'?{serverInfo:{name:'Workflow Pilot Local Mac'},protocolVersion:'2025-03-26'}
      :{tools:tools.map(name=>({name}))}}),{headers:{'content-type':'application/json'}});
  };
  await assert.rejects(new LocalMcpClient(ready.mcp_url,{fetchImpl:server([]),expectedServerName:'Workflow Pilot Local Mac'}).initialize(),
    error=>error.code==='MCP_TOOLS_MISSING'&&/bridge_status/.test(error.message));
  // The catalogue has no context tool on either system: nothing but the status tool is required by default.
  assert.deepEqual(await new LocalMcpClient(ready.mcp_url,{fetchImpl:server(['bridge_status','exec_command']),expectedServerName:'Workflow Pilot Local Mac'}).initialize(),
    {serverName:'Workflow Pilot Local Mac',toolCount:2,protocolVersion:'2025-03-26'});
  await assert.rejects(new LocalMcpClient(ready.mcp_url,{fetchImpl:server(['bridge_status']),expectedServerName:'Workflow Pilot Local Mac',requiredTools:['bridge_status','exec_command']}).initialize(),
    error=>error.code==='MCP_TOOLS_MISSING'&&/exec_command/.test(error.message)&&!/bridge_status,/.test(error.message));
  // Another MCP server on the same local port is refused, and the expected name is never assumed.
  await assert.rejects(new LocalMcpClient(ready.mcp_url,{fetchImpl:server(['bridge_status']),expectedServerName:'Workflow Pilot Local Windows'}).initialize(),{code:'MCP_SERVER_MISMATCH'});
  assert.throws(()=>new LocalMcpClient(ready.mcp_url,{fetchImpl:server([])}),TypeError);
});

function contextPacket() {
  const context='Полный контекст\nЗадача и незавершённые изменения';
  return {delivery_protocol:'inline-context-v1',ack_required:false,status:'ready',completeness:'COMPLETE',workspace:'/project',
    parts:[{index:1,total:1,text:context,bytes:Buffer.byteLength(context),sha256:createHash('sha256').update(context).digest('hex')}],
    context,context_bytes:Buffer.byteLength(context),context_sha256:createHash('sha256').update(context).digest('hex'),
    generated_at_ms:Date.now(),signature:'snapshot',head:'head',objective:'Example',
    facts:{project_id:'id',project_name:'Project',plan_revision:7,scope_id:'scope',execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',task_id:null,task_title:null}};
}

test('legacy diagnostics, another workspace, incomplete or modified context cannot be delivered',()=>{
  assert.equal(validateContextPacket(contextPacket(),'/project').facts.plan_revision,7);
  for(const [mutate,code] of [
    [p=>delete p.delivery_protocol,'MCP_UPDATE_REQUIRED'],
    [p=>p.workspace='/other','MCP_CONTEXT_MISMATCH'],
    [p=>delete p.facts.task_id,'MCP_CONTEXT_INCOMPLETE'],
    [p=>p.context+=' extra','MCP_CONTEXT_DAMAGED'],
    [p=>p.context_bytes=1,'MCP_CONTEXT_DAMAGED'],
    [p=>delete p.parts,'MCP_UPDATE_REQUIRED'],
    [p=>p.parts[0].text+=' corrupt','MCP_CONTEXT_DAMAGED'],
    [p=>p.parts[0].index=2,'MCP_CONTEXT_DAMAGED'],
    [p=>p.parts[0].total=2,'MCP_CONTEXT_DAMAGED'],
    [p=>p.budget={document_bytes:1},'MCP_CONTEXT_DAMAGED'],
    [p=>p.completeness='PARTIAL','MCP_CONTEXT_INCOMPLETE'],
    [p=>p.challenge='old-probe','MCP_CONTEXT_INCOMPLETE'],
    [p=>p.context='я'.repeat(100000),'MCP_CONTEXT_TOO_LARGE'],
  ]) { const packet=contextPacket();mutate(packet);assert.throws(()=>validateContextPacket(packet,'/project'),{code}); }
});
