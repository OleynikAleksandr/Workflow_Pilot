import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueDelivery} from '../src/control/workflow/dialogue-delivery.mjs';
import {ParallelKit} from '../src/control/workflow/parallel-kit.mjs';

test('finalization waits for live effects and unread deliveries, but a rejected intent cannot strand a corrected plan',()=>{
  const run={mode:'workflow',project_id:'project',grant:{scope_id:'scope'},messages:[],assignment_intents:{}};
  const delivery=new DialogueDelivery({store:{project:()=>({projectId:'project'})},getPlugin:()=>({communication:{runs:new Map([['run',run]])}})});
  const settled=()=>delivery.settled('/workspace','scope');
  for(const phase of ['prepared','deferred','published','failed','retired']){
    run.assignment_intents.one={effect:{scope_id:'scope'},phase};
    assert.equal(settled(),!['prepared','deferred'].includes(phase),phase);
  }
  run.messages.push({scope_id:'scope',reply_observed:false});assert.equal(settled(),false);
  run.messages[0].reply_observed=true;assert.equal(settled(),true);
  run.assignment_intents.other={effect:{scope_id:'another'},phase:'prepared'};assert.equal(settled(),true);
});

test('read retries a Git replacement window but rejects persistent plan corruption',async()=>{
  const kit=new ParallelKit({});let reads=0;
  kit.readSnapshot=async()=>{if(++reads===1)throw Object.assign(Error('partial Git write'),{code:'PLAN_JSON'});return {confirmed:true};};
  assert.deepEqual(await kit.read('/fixture'),{confirmed:true});assert.equal(reads,2);
  reads=0;kit.readSnapshot=async()=>{reads++;throw Object.assign(Error('corrupt'),{code:'PLAN_JSON'});};
  await assert.rejects(kit.read('/fixture'),{code:'PLAN_JSON'});assert.equal(reads,3);
});
