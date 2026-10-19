import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {CodexAppServerRuntime,MacSelectedRuntime} from '../../src/execution/runtime/service.mjs';
import {createBackendOperations,openOperationJournal,backendCatalog} from '../../src/backend/operations.mjs';
import {createBackendEvents} from '../../src/backend/events.mjs';
import {startBackendServer} from '../../src/backend/server.mjs';
import {BackendConnection} from '../../src/frontend/client/connection.mjs';

const root=path.resolve(import.meta.dirname,'../..');
export async function dialogueRuntime(t,directory) {
  const child=spawn(path.join(root,'.harness/runtime/test-python/bin/python'),['-B',path.join(root,'tests/fixtures/plugin-server.py'),
    path.join(root,'tools/codex-app-server-mcp'),directory,'http'],{stdio:['ignore','pipe','pipe']});
  const exited=new Promise(resolve=>child.once('exit',resolve));let stderr='';
  child.stderr.on('data',data=>{stderr=(stderr+data).slice(-4000);});
  t.after(async()=>{if(child.exitCode===null)child.kill('SIGTERM');await exited;});
  const port=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Fixture MCP startup: '+stderr)),10000);
    child.once('exit',code=>{clearTimeout(timer);reject(Error('Fixture MCP exited '+code+': '+stderr));});
    createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(value.port){clearTimeout(timer);resolve(value.port);}}catch{}});
  });
  const endpoint='http://127.0.0.1:'+port+'/mcp';
  // The socket is bound before uvicorn's lifespan enters. Readiness is observed
  // through HTTP, not a fixed sleep or a mocked MCP response.
  for(let i=0;;i++) {
    try{const response=await fetch(endpoint,{method:'GET',signal:AbortSignal.timeout(300)});await response.body?.cancel();break;}
    catch(error){if(i>=50)throw error;await delay(20);}
  }
  const c=new Client({name:'dialogue-fixture',version:'1'});t.after(()=>c.close());
  await c.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const sourceDir=path.join(directory,'runtime-source'),binary=path.join(directory,'fixture-binary');
  await fs.mkdir(sourceDir);await fs.writeFile(path.join(sourceDir,'control.py'),'# isolated lifecycle fixture\n');await fs.writeFile(binary,'fixture');
  let active=0,maximum=0,mcp=false,tunnel=false,mcpStarts=0,tunnelStarts=0,checks=0;
  const app=new CodexAppServerRuntime({sourceDir,stateDir:path.join(directory,'runtime'),platform:'darwin',execute:async(_file,args)=>{
    maximum=Math.max(maximum,++active);await delay(15);checks++;
    if(args[2]==='start'){
      if(args.includes('--mcp-only')){mcp=true;mcpStarts++;}else{assert.ok(args.includes('--tunnel-only'));tunnel=true;tunnelStarts++;}
    }else assert.equal(args[2],'status');
    active--;
    return {stdout:JSON.stringify({ok:true,setup_complete:true,runtime_python:binary,tunnel_client:binary,mcp_url:endpoint,
      mcp:{ready:mcp,owned:true},tunnel:{ready:tunnel,owned:true,configured:true}})};
  }});
  const selected=new MacSelectedRuntime({appServerRuntime:app});
  return {client:c,ensure:()=>selected.ensure(),verify:()=>{
    assert.equal(maximum,1);assert.equal(mcpStarts,1);assert.equal(tunnelStarts,1);assert.ok(checks>=4);
    assert.equal(app.client.ready.serverName,'Workflow Pilot Local Mac');assert.ok(app.client.ready.toolCount>10);
  }};
}

export async function dialogueApi(t,directory,services) {
  const claim={generation:randomUUID(),token:randomUUID()+randomUUID()},events=createBackendEvents({bootGeneration:claim.generation,state:()=>({})});
  const operations=createBackendOperations({bootGeneration:claim.generation,
    journal:openOperationJournal(path.join(directory,'backend-operations.jsonl')),catalog:backendCatalog(services)});
  t.after(()=>operations.dispose());
  const server=await startBackendServer({claim,events,operations});t.after(()=>server.close());
  const api=new BackendConnection({port:server.port,token:claim.token});t.after(()=>api.close());
  await api.connect();await api.acquire();return api;
}
