import test from 'node:test';
import assert from 'node:assert/strict';
import {blockAnswered,currentSignal} from '../packages/workflow-kit/src/lib/signal-state.mjs';
import {DialogueDelivery} from '../src/control/workflow/dialogue-delivery.mjs';
test('legacy decisions clear legacy blocks only; new correlation isolates scope, task and assignment',async()=>{
  const base={scope_id:'s',task_id:'t',assignment_id:'a'},block={...base,id:'b1',kind:'task-blocked'},decision={...base,id:'d1',kind:'assignment-message'};
  assert.equal(blockAnswered([block,decision],block),true);
  const next={...block,id:'b2',block_id:'b2'},late={...decision,id:'d2',block_id:'b1'};
  const signals=[block,decision,next,late];
  assert.equal(blockAnswered(signals,next),false);assert.equal(currentSignal(signals,decision),false);assert.equal(currentSignal(signals,late),false);
  for(const key of ['scope_id','task_id','assignment_id'])assert.equal(blockAnswered([...signals,{...decision,[key]:'foreign',block_id:'b2'}],next),false);
  const correct={...decision,id:'d3',block_id:'b2'};signals.push(correct);
  assert.equal(blockAnswered(signals,next),true);assert.equal(currentSignal(signals,next),false);assert.equal(currentSignal(signals,correct),true);
  const project={workspace:'/fixture',sessionId:'e'},delivery=new DialogueDelivery({store:{snapshot:()=>({projects:[{...project,sessions:[project]}]}),project:()=>project},signals:async()=>signals});
  assert.equal(await delivery.currentMessage({local_session_id:'e'},{...base,signal_id:'d3'}),true);
  assert.equal(await delivery.currentMessage({local_session_id:'e'},{...base,signal_id:'d2'}),false);
  assert.equal(await delivery.currentMessage({local_session_id:'e'},{...base,signal_id:'d3',assignment_id:'foreign'}),false);
});
