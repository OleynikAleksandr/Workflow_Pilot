import test from 'node:test';
import assert from 'node:assert/strict';
import {AutomationSendState} from '../src/automation-send-state.mjs';

const selected={workspace:'/main',sessionId:'origin',chatUrl:'https://chatgpt.com/c/main',scopeId:'scope'};
const send=(gate,turnId,perform=async()=>({state:'sent'}))=>gate.send({selected,page:{turnId},
  kind:'finalization',ready:()=>true,perform});

test('F15: the sending reservation is saved before dispatch and survives restart as UNKNOWN',async()=>{
 let checkpoint;let dispatched=0;
 const gate=new AutomationSendState({save:async value=>{checkpoint=structuredClone(value);}});
 await send(gate,'turn',async()=>{
  assert.equal(checkpoint.entries[0].status,'sending');dispatched++;return {state:'unknown'};
 });
 const restored=new AutomationSendState();restored.restore(checkpoint);
 assert.equal((await send(restored,'turn',async()=>{dispatched++;return {state:'sent'};})).reason,'PAUSE_CONSUMED');
 assert.equal(dispatched,1);
});

test('F15: a failed reservation checkpoint never enters the composer and is retryable',async()=>{
 let broken=true,dispatched=0,checkpoint;
 const gate=new AutomationSendState({save:async value=>{
  if(broken)throw Error('checkpoint failed');checkpoint=structuredClone(value);
 }});
 await assert.rejects(send(gate,'turn',async()=>{dispatched++;return {state:'sent'};}),/checkpoint failed/);
 assert.equal(dispatched,0);
 broken=false;assert.equal((await send(gate,'turn',async()=>{dispatched++;return {state:'sent'};})).state,'sent');
 assert.equal(dispatched,1);assert.equal(checkpoint.entries[0].status,'sent');
});

test('F15: a failed post-dispatch checkpoint retains the sending reservation',async()=>{
 let writes=0,checkpoint;const gate=new AutomationSendState({save:async value=>{
  writes++;if(writes===2)throw Error('storage unavailable');checkpoint=structuredClone(value);
 }});
 await assert.rejects(send(gate,'turn'),/storage unavailable/);
 assert.equal(checkpoint.entries[0].status,'sending');
 const restored=new AutomationSendState();restored.restore(checkpoint);
 assert.equal((await send(restored,'turn',async()=>{throw Error('duplicate');})).reason,'PAUSE_CONSUMED');
});

test('F11/F12: cancelled pre-click attempts free the reservation, but unknown does not',async()=>{
 const gate=new AutomationSendState();let sent=0;
 assert.equal((await send(gate,'pause-1',async()=>({state:'cancelled'}))).state,'cancelled');
 assert.equal((await send(gate,'pause-1',async()=>{sent++;return {state:'sent'};})).state,'sent');
 assert.equal((await send(gate,'pause-1',async()=>{sent++;return {state:'sent'};})).reason,'PAUSE_CONSUMED');
 assert.equal((await send(gate,'pause-2',async()=>({state:'unknown'}))).state,'unknown');
 assert.equal((await send(gate,'pause-2',async()=>{sent++;return {state:'sent'};})).reason,'PAUSE_CONSUMED');
 assert.equal(sent,1);
});
