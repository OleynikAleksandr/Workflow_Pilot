import test from 'node:test';
import assert from 'node:assert/strict';
import {BackendConnection} from '../src/frontend/client/connection.mjs';

const settle=(ms=20)=>new Promise(resolve=>setTimeout(resolve,ms));
const frame=(type,value)=>`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`;
const event=(sequence,type='state')=>({bootGeneration:'boot-1',sequence,revision:sequence,type,data:{}});
// One scripted SSE response: frames, then either a clean end or a network failure.
function response(frames,{fail=false}={}) {
  const encoder=new TextEncoder();
  const pending=[...frames];
  return {ok:true,body:new ReadableStream({pull(controller){
    if(pending.length)return controller.enqueue(encoder.encode(pending.shift()));
    if(fail)controller.error(Object.assign(new TypeError('terminated'),{code:'UND_ERR_SOCKET'}));
    else controller.close();
  }})};
}

test('event stream: a resume without a snapshot ends the stale state; handler failures never end the stream',async t=>{
  const queries=[],scripts=[
    response([frame('snapshot',{bootGeneration:'boot-1',revision:0,sequence:0,state:{}}),frame('event',event(1)),
      frame('ui',{kind:'state',value:{broken:true}}),frame('event',event(2))],{fail:true}),
    response([frame('event',event(3)),frame('event',{bad:true}),frame('event',event(4))]),
    response([frame('snapshot',{bootGeneration:'boot-1',revision:4,sequence:4,state:{}}),frame('event',event(5))]),
  ];
  const fetch=async url=>{queries.push(new URL(url).search);const next=scripts.shift();
    if(!next)return new Promise(()=>{});return next;};
  const connection=new BackendConnection({port:4000,token:'x'.repeat(32),fetch});
  const seen=[],log=[];
  const stream=connection.subscribe({retryMs:5,
    onOpen:()=>log.push('open'),onError:error=>log.push('lost:'+error.code),
    onSnapshot:value=>log.push('snapshot:'+value.sequence),onEvent:value=>seen.push(value.sequence),
    onUi:()=>{throw new Error('renderer gone');},onHandlerError:(kind,error)=>log.push('handler:'+kind+':'+(error.code??error.message))});
  t.after(()=>stream.close());
  for(let i=0;i<100&&seen.length<5;i++)await settle();
  assert.deepEqual(seen,[1,2,3,5],'a failing ui handler does not stop later events; an unreadable event resyncs instead of looping');
  assert.deepEqual(log,['open','snapshot:0','handler:ui:state:renderer gone','lost:UND_ERR_SOCKET','open',
    'handler:invalid-event:BACKEND_EVENT_INVALID','open','snapshot:4']);
  assert.match(queries[1],/after=2/,'the second connection resumes by sequence, without a snapshot');
  assert.doesNotMatch(queries[2],/after=/,'after an unreadable event the client asks for a fresh snapshot');
});
