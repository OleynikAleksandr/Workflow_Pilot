import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKEND_API_VERSION,BACKEND_LIMITS,BACKEND_OPERATIONS,
  validateHandshake,validateSnapshot,validateEvent,validateCommand,
  validateResult,validateOperation,validateError,validateTransfer,wireCopy,
} from '../src/contracts/backend.mjs';
import {validateBrowserInput,validateFrame,clientPointToBrowser,verifyInputTarget}
  from '../src/contracts/browser-presentation.mjs';
import {
  checkBackendCompatibility,authorizeLoopback,verifyControlLease,pluginPermission,
  createBackendEventLog,registerBackendCommand,validateBackendQueue,
} from '../src/backend/protocol.mjs';

const handshake={apiVersion:BACKEND_API_VERSION,identity:'workflow-pilot',bootGeneration:'boot:123',capabilities:{browser:true,plugin:true},readiness:'ready'};
const command={requestId:'request:1',operation:'browser.input',args:{sessionId:'test'},bootGeneration:'boot:123',leaseGeneration:3};
const browserInput={browserSessionId:'session:1',documentGeneration:2,sequence:14,leaseGeneration:3,type:'text',data:{text:'Привет'}};
const code=error=>error.code;

test('versioned backend handshake refuses a foreign identity, wrong version and unknown keys',()=>{
  assert.deepEqual(validateHandshake(handshake),handshake);
  assert.equal(checkBackendCompatibility(handshake,{identity:'workflow-pilot'}),'boot:123');
  assert.throws(()=>checkBackendCompatibility(handshake,{identity:'donor'}),error=>code(error)==='BACKEND_IDENTITY_MISMATCH');
  assert.throws(()=>validateHandshake({...handshake,apiVersion:3}),error=>code(error)==='BACKEND_VERSION_INCOMPATIBLE');
  assert.throws(()=>validateHandshake({...handshake,token:'secret'}),error=>code(error)==='BACKEND_HANDSHAKE_INVALID');
  assert.throws(()=>validateHandshake({...handshake,readiness:'windowReady'}),error=>code(error)==='BACKEND_HANDSHAKE_INVALID');
});

test('snapshots, events, results, operations and errors have bounded immutable wire copies',()=>{
  const state={rows:[{id:'one'}]};
  const snapshot=validateSnapshot({bootGeneration:'boot:123',sequence:0,revision:1,state});
  state.rows[0].id='mutated';assert.equal(snapshot.state.rows[0].id,'one');
  assert.deepEqual(validateEvent({bootGeneration:'boot:123',sequence:1,revision:1,type:'session',data:{id:'one'}}).data,{id:'one'});
  assert.equal(validateResult({requestId:'request:1',status:'accepted',operationId:'operation:1'}).status,'accepted');
  assert.equal(validateResult({requestId:'request:1',status:'unknown'}).status,'unknown');
  assert.equal(validateOperation({operationId:'operation:1',requestId:'request:1',status:'running',bootGeneration:'boot:123'}).status,'running');
  assert.equal(validateError({code:'BACKEND_NOT_READY',message:'Backend ещё запускается.'}).code,'BACKEND_NOT_READY');
  assert.throws(()=>validateError({code:'ERROR',message:'safe',stack:'private content'}),error=>code(error)==='BACKEND_ERROR_INVALID');
  assert.throws(()=>validateResult({requestId:'request:1',status:'accepted'}),error=>code(error)==='BACKEND_RESULT_INVALID');
  assert.throws(()=>wireCopy({secret:'x'.repeat(BACKEND_LIMITS.messageBytes)}),error=>code(error)==='BACKEND_MESSAGE_SIZE');
});

test('command allowlist, lease generation and browser input prevent arbitrary JS, shell or stale input',()=>{
  assert.equal(validateCommand(command).operation,'browser.input');
  assert.equal(Object.hasOwn(BACKEND_OPERATIONS,'shell.exec'),false);
  assert.throws(()=>validateCommand({...command,operation:'shell.exec'}),error=>code(error)==='BACKEND_COMMAND_INVALID');
  assert.throws(()=>validateCommand({...command,operation:'webContents.executeJavaScript'}),error=>code(error)==='BACKEND_COMMAND_INVALID');
  assert.throws(()=>validateCommand({...command,leaseGeneration:undefined}),error=>code(error)==='BACKEND_LEASE_REQUIRED');
  assert.throws(()=>validateCommand({...command,extra:'token'}),error=>code(error)==='BACKEND_COMMAND_INVALID');
  assert.equal(validateCommand({...command,operation:'projects.list',leaseGeneration:undefined}).operation,'projects.list');
  assert.equal(verifyControlLease(command,{generation:3,bootGeneration:'boot:123'}),true);
  assert.throws(()=>verifyControlLease(command,{generation:4,bootGeneration:'boot:123'}),error=>code(error)==='BACKEND_LEASE_STALE');
  assert.throws(()=>verifyControlLease(command,{generation:3,bootGeneration:'boot:older'}),error=>code(error)==='BACKEND_LEASE_STALE');
  assert.deepEqual(validateBrowserInput(browserInput),browserInput);
  assert.equal(verifyInputTarget(browserInput,{browserSessionId:'session:1',documentGeneration:2,leaseGeneration:3,lastSequence:13}),true);
  assert.throws(()=>verifyInputTarget(browserInput,{browserSessionId:'session:other',documentGeneration:2,leaseGeneration:3,lastSequence:13}),error=>code(error)==='BROWSER_DOCUMENT_CHANGED');
  assert.throws(()=>verifyInputTarget(browserInput,{browserSessionId:'session:1',documentGeneration:3,leaseGeneration:3,lastSequence:13}),error=>code(error)==='BROWSER_DOCUMENT_CHANGED');
  assert.throws(()=>verifyInputTarget(browserInput,{browserSessionId:'session:1',documentGeneration:2,leaseGeneration:4,lastSequence:13}),error=>code(error)==='BACKEND_LEASE_STALE');
  assert.throws(()=>verifyInputTarget(browserInput,{browserSessionId:'session:1',documentGeneration:2,leaseGeneration:3,lastSequence:14}),error=>code(error)==='BROWSER_INPUT_REPLAY');
});

test('composition, pointer, keyboard, wheel and transfer boundaries are checked',()=>{
  for(const data of [
    {...browserInput,type:'composition',data:{phase:'update',text:'ёж',selectionStart:0,selectionEnd:2}},
    {...browserInput,type:'pointer',data:{action:'down',x:25,y:9,button:'left',clickCount:1}},
    {...browserInput,type:'key',data:{action:'down',key:'Я',code:'KeyZ',modifiers:['shift']}},
    {...browserInput,type:'wheel',data:{x:25,y:9,deltaX:0,deltaY:-120}},
  ])assert.deepEqual(validateBrowserInput(data),data);
  assert.throws(()=>validateBrowserInput({...browserInput,data:{text:'',script:'alert(1)'}}),error=>code(error)==='BROWSER_PRESENTATION_INVALID');
  assert.throws(()=>validateBrowserInput({...browserInput,type:'pointer',data:{action:'down',x:NaN,y:0}}),error=>code(error)==='BROWSER_PRESENTATION_INVALID');
  assert.deepEqual(validateTransfer({transferId:'tx:1',name:'тестовый-файл.txt',size:1024,direction:'upload'}),
    {transferId:'tx:1',name:'тестовый-файл.txt',size:1024,direction:'upload'});
  for(const name of ['../secrets','.\\hidden','/absolute','..'])assert.throws(()=>validateTransfer({transferId:'tx:1',name,size:1,direction:'upload'}),error=>code(error)==='BACKEND_TRANSFER_INVALID');
  assert.throws(()=>validateTransfer({transferId:'tx:1',name:'a.txt',size:BACKEND_LIMITS.transferBytes+1,direction:'upload'}),error=>code(error)==='BACKEND_TRANSFER_INVALID');
});

test('Retina presentation scales pixels, not logical click coordinates',()=>{
  const frame=validateFrame({browserSessionId:'session:1',documentGeneration:2,frameSequence:3,
    logicalWidth:900,logicalHeight:700,pixelWidth:1800,pixelHeight:1400,scale:2});
  assert.deepEqual(clientPointToBrowser({x:210,y:160,bounds:{x:30,y:20,width:900,height:700},frame}),{x:180,y:140});
  assert.throws(()=>clientPointToBrowser({x:0,y:0,bounds:{x:30,y:20,width:900,height:700},frame}),error=>code(error)==='BROWSER_PRESENTATION_INVALID');
  assert.throws(()=>validateFrame({...frame,pixelWidth:900}),error=>code(error)==='BROWSER_PRESENTATION_INVALID');
});

test('loopback requires exact Host, Origin policy and bearer token even for local clients',()=>{
  const config={port:58719,token:'a'.repeat(48),allowedOrigins:['app://workflow-pilot']};
  const headers={host:'127.0.0.1:58719',authorization:'Bearer '+config.token};
  assert.equal(authorizeLoopback(headers,config),true);
  assert.equal(authorizeLoopback({...headers,origin:'app://workflow-pilot'},config),true);
  for(const invalid of [{host:'malicious.example:58719'},{host:'127.0.0.1:1234'},
    {origin:'https://chatgpt.com'},{authorization:'Bearer bad'},
    {authorization:'Bearer '+config.token.slice(0,-1)}])assert.throws(()=>authorizeLoopback({...headers,...invalid},config),error=>code(error)==='BACKEND_ACCESS_DENIED');
});

test('atomic subscribe/snapshot and replay preserve event order across reconnect',()=>{
  const log=createBackendEventLog({bootGeneration:'boot:123',state:{count:0},limit:3});
  const received=[];
  const first=log.snapshotAndSubscribe(event=>received.push(event));
  assert.equal(first.snapshot.sequence,0);
  log.publish('counter',{value:1},{count:1});log.publish('counter',{value:2},{count:2});
  first.unsubscribe();assert.deepEqual(received.map(event=>event.sequence),[1,2]);
  const newClient=[];
  const second=log.subscribeSince({afterSequence:1,listener:event=>newClient.push(event)});
  assert.equal(second.status,'subscribed');
  log.publish('counter',{value:3},{count:3});second.unsubscribe();
  assert.deepEqual(newClient.map(event=>event.sequence),[2,3]);
  const stale=log.subscribeSince({afterSequence:0,listener:()=>{}});
  assert.equal(stale.status,'subscribed');
  log.publish('counter',{value:4},{count:4});
  const gap=log.subscribeSince({afterSequence:0,listener:()=>{}});
  assert.equal(gap.status,'resync');assert.equal(gap.snapshot.state.count,4);
  const bootChanged=log.subscribeSince({generation:'boot:old',afterSequence:4,listener:()=>{}});
  assert.equal(bootChanged.status,'resync');
  assert.equal(log.snapshot().sequence,4);
});

test('mutations are durably accepted before an effect, and requestId retries never repeat Send',async()=>{
  const records=new Map();let accepts=0;
  const adapter={lookup:async id=>records.get(id),acceptIfAbsent:async record=>{
    if(records.has(record.requestId))return {inserted:false,record:records.get(record.requestId)};
    accepts++;records.set(record.requestId,record);return {inserted:true,record};
  }};
  const first=await registerBackendCommand(command,{bootGeneration:'boot:123',...adapter});
  assert.equal(first.status,'accepted');assert.equal(accepts,1);
  const retry=await registerBackendCommand({...command,args:{sessionId:'test'}},{bootGeneration:'boot:123',...adapter});
  assert.equal(retry.status,'existing');assert.equal(retry.operationId,first.operationId);assert.equal(accepts,1);
  await assert.rejects(registerBackendCommand({...command,args:{sessionId:'another'}},{bootGeneration:'boot:123',...adapter}),error=>code(error)==='BACKEND_REQUEST_CONFLICT');
  await assert.rejects(registerBackendCommand({...command,bootGeneration:'boot:new'},{bootGeneration:'boot:123',...adapter}),error=>code(error)==='BACKEND_BOOT_STALE');
  const older={...records.get(command.requestId),bootGeneration:'boot:older'};
  records.set(command.requestId,older);
  const unknown=await registerBackendCommand(command,{bootGeneration:'boot:123',...adapter});
  assert.equal(unknown.status,'unknown');assert.equal(accepts,1);
  await assert.rejects(registerBackendCommand(command,{bootGeneration:'boot:123',lookup:async()=>null,acceptIfAbsent:async()=>{throw Error('DISK_FULL');}}),/DISK_FULL/);
  await assert.rejects(registerBackendCommand(command,{bootGeneration:'boot:123',lookup:async()=>null,acceptIfAbsent:async()=>null}),error=>code(error)==='BACKEND_JOURNAL_UNCERTAIN');
  // Two simultaneous clients using the same requestId share one durable CAS.
  records.clear();accepts=0;
  const both=await Promise.all(Array.from({length:2},()=>registerBackendCommand(command,{bootGeneration:'boot:123',...adapter})));
  assert.deepEqual(both.map(value=>value.status).sort(),['accepted','existing']);
  assert.equal(accepts,1);
});

test('synchronous event writes from a replay listener preserve ordered delivery',()=>{
  const stream=createBackendEventLog({bootGeneration:'boot:123'});
  stream.publish('saved',{n:1});stream.publish('saved',{n:2});
  const order=[];
  const sub=stream.subscribeSince({afterSequence:0,listener:event=>{
    order.push(event.sequence);
    if(event.sequence===1)stream.publish('saved',{n:3});
  }});
  assert.equal(sub.status,'subscribed');assert.deepEqual(order,[1,2,3]);
  sub.unsubscribe();
});

test('plugin UI write is leased but standalone MCP execution is not tied to a frontend',()=>{
  assert.equal(pluginPermission('list'),'read');
  assert.equal(pluginPermission('open'),'read');
  assert.equal(pluginPermission('panel'),'read');
  for(const action of ['wait','claim','report'])assert.throws(()=>pluginPermission(action),error=>code(error)==='PLUGIN_ACTION_INVALID');
  assert.equal(pluginPermission('connect'),'ui-mutation');
  assert.equal(pluginPermission('mcp.tools'),'agent-independent');
  assert.equal(pluginPermission('mcp.context'),'agent-independent');
  assert.equal(Object.hasOwn(BACKEND_OPERATIONS,'mcp.tools'),false);
  assert.throws(()=>pluginPermission('executeShell'),error=>code(error)==='PLUGIN_ACTION_INVALID');
});

test('bounded event, request and transfer queues reject overload',()=>{
  assert.equal(validateBackendQueue({pendingCommands:64,pendingEvents:256,chunkBytes:256*1024}),true);
  for(const value of [
    {pendingCommands:65,pendingEvents:0,chunkBytes:0},
    {pendingCommands:0,pendingEvents:257,chunkBytes:0},
    {pendingCommands:0,pendingEvents:0,chunkBytes:300*1024},
  ])assert.throws(()=>validateBackendQueue(value),error=>code(error)==='BACKEND_QUEUE_LIMIT');
});
