import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {startPluginBridge} from '../../src/execution/plugin/bridge.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const metadata={'openai/session':'conversation-fixture','openai/subject':'user-fixture'};
async function bridge(t,f){
  const b=await startPluginBridge({directory:f.directory,panel:input=>f.plugin.panel(input),list:()=>f.plugin.list(),open:id=>f.plugin.open(id),connect:i=>f.plugin.connect(i),
    communication:f.plugin.communication});
  t.after(()=>b.close());
  return JSON.parse(await fs.readFile(path.join(f.directory,'plugin-bridge.json'),'utf8'));
}
async function client(t,f,{sourceDir=path.join(root,'tools/codex-app-server-mcp')}={}){
  const c=new Client({name:'fixture',version:'1'});
  const transport=new StdioClientTransport({command:path.join(root,'.harness/runtime/test-python/bin/python'),
    args:['-B',path.join(root,'tests/fixtures/plugin-server.py'),sourceDir,f.directory],stderr:'pipe'});
  let stderr='';transport.stderr?.on('data',chunk=>{stderr+=chunk;});
  t.after(()=>c.close());
  try{await c.connect(transport);}catch(error){throw new Error(error.message+'\n'+stderr);}
  return c;
}
async function eventually(check){for(let i=0;i<200;i++){if(await check())return;await delay(10);}assert.ok(await check(),'async UI completed');}

async function communicationHtml(t,c,{hostMetadata=metadata,messageSupported=true,onMessage=async()=>{},theme='light',toolReply=async(_request,result)=>result,timerMs=ms=>ms,initialToolResult,handshake=Promise.resolve(),resourceCache=new Map()}={}) {
  const tool=(await c.listTools()).tools.find(tool=>tool.name==='workflow_pilot_panel');
  const resourceUri=tool._meta.ui.resourceUri;
  if(!resourceCache.has(resourceUri))resourceCache.set(resourceUri,(await c.readResource({uri:resourceUri})).contents[0].text);
  const html=resourceCache.get(resourceUri);
  const errors=[],calls=[],messages=[];let initialized=false,currentMetadata=hostMetadata,notify,activeWaits=0,maxWaits=0;
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://communication-fixture.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,
    beforeParse(window){
      const nativeTimeout=window.setTimeout.bind(window);window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,timerMs(ms),...args);
      window.TextEncoder=TextEncoder;window.TextDecoder=TextDecoder;
      window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
      window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
      const deliver=data=>window.dispatchEvent(new window.MessageEvent('message',{source:window,data}));
      notify=deliver;
      window.postMessage=async request=>{
        try{
          if(request.method==='ui/initialize')queueMicrotask(async()=>{
            await handshake;
            if(initialToolResult)deliver(initialToolResult);
            deliver({jsonrpc:'2.0',id:request.id,result:{
            protocolVersion:request.params.protocolVersion,hostInfo:{name:'Isolated communication host',version:'1'},
            hostContext:{theme},hostCapabilities:{serverTools:{},experimental:messageSupported?{'openai/message':{}}:{}}}});
          });
          else if(request.method==='ui/notifications/initialized')initialized=true;
          else if(request.method==='tools/call'){
            calls.push(request.params.name);
            if(request.params.name==='workflow_communication_wait')maxWaits=Math.max(maxWaits,++activeWaits);
            const result=await toolReply(request.params,await c.callTool({...request.params,_meta:currentMetadata}));
            if(request.params.name==='workflow_communication_wait')activeWaits--;
            if(result?.transportError)deliver({jsonrpc:'2.0',id:request.id,error:result.rpcError??{code:-32000,message:'Response connection lost'}});
            else deliver({jsonrpc:'2.0',id:request.id,result});
          }else if(request.method==='ui/message'){
            messages.push(request.params);const result=await onMessage(request.params);
            if(!result?.drop)deliver({jsonrpc:'2.0',id:request.id,result:result??{}});
          }
        }catch(e){errors.push(e.message);deliver({jsonrpc:'2.0',id:request.id,error:{code:-32000,message:'Fixture failed'}});}
      };
    }});
  t.after(()=>{dom.window.dispatchEvent(new dom.window.Event('pagehide'));dom.window.close();});
  await eventually(()=>initialized||errors.length);assert.deepEqual(errors,[]);
  const $=id=>dom.window.document.getElementById('communication-'+id);
  return {dom,$,errors,calls,messages,notify,resourceUri,get maxWaits(){return maxWaits;},setMetadata(meta){currentMetadata=meta;}};
}

export {bridge,client,eventually,communicationHtml};
