import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCase,aggregateAnalyses,analysisMarkdown} from '../scripts/analyze-sdk-busy-experiment.mjs';

function evidence(){
  const events=[];const add=(event_type,fields={})=>{const event={seq:events.length+1,event_type,at:new Date(10000+events.length*100).toISOString(),...fields};events.push(event);return event;};
  const info={case_id:'case',busy_kind:'tool-wait'},nonce='nonce';
  add('experiment.case_started',{case_id:'case',nonce});
  for(const message_id of ['left','right']){
    add('experiment.fixture_hold',{case_id:'case',message_id,source_commit:(message_id==='left'?'a':'b').repeat(40)});
    add('experiment.dispatch_admitted',{case_id:'case',message_id,delivery_attempt_id:message_id+'-attempt',snapshot:{busy:true,sdk_document_ready:true}});
    add('sdk.invoked',{message_id,case_id:'case',delivery_attempt_id:message_id+'-attempt',panel_instance_id:'panel',duration_ms:10,client_time:new Date(11000).toISOString()});
    add('sdk.accepted',{message_id,delivery_attempt_id:message_id+'-attempt',panel_instance_id:'panel',duration_ms:20,client_time:new Date(12000).toISOString()});
    add('send.report',{message_id,outcome:'accepted'});
  }
  const end=add('experiment.checkpoint',{case_id:'case',marker:'resume',nonce,at:new Date(20000).toISOString()});
  for(const message_id of ['left','right']){add('message.read',{message_id});add('message.yielded',{message_id});}
  add('plan.permission',{phase:'complete'});
  const work={nonce,preserved:true,transcript_verified:true,original_turn_id:'old',end_event_seq:end.seq,
    panel_clock:{panel_instance_id:'panel',verified:true},reads:['left','right'].map(message_id=>({message_id,turn_id:'new',evidence_verified:true}))};
  const cycle={verified:true,results:['left','right'].map(message_id=>({message_id,effect_count:1,git_verified:true,
    source_commit:(message_id==='left'?'a':'b').repeat(40),accepted_source_commit:(message_id==='left'?'a':'b').repeat(40),integration_commit:'c'.repeat(40)})),
    tasks:['T001','T002','T003','DOCS'].map(id=>({id,commit_status:'DONE',integration_commit:'c'.repeat(40)})),
    terminal_receipts:Array.from({length:4},()=>({read:true,yielded:true,transport_closed:true})),cleanup:{only_main:true,pending:[]},clean_main:true,commands_idle:true};
  return {events,info,work,cycle};
}
test('analysis distinguishes delivery, turn boundary and complete plan rather than converting SDK acceptance to success',()=>{
  const f=evidence(),result=analyzeCase(f);assert.equal(result.classification,'QUEUED_OBSERVED');assert.equal(result.go,true);
  f.cycle.cleanup.only_main=false;assert.equal(analyzeCase(f).go,false);assert.equal(analyzeCase(f).classification,'QUEUED_OBSERVED');
  assert.match(analysisMarkdown(result),/left: QUEUED_OBSERVED/);
});
test('all seven outcomes remain separate and late acceptance does not rewrite UNKNOWN',()=>{
  const edits={
    QUEUED_OBSERVED:()=>{},
    MID_TURN:f=>{f.work.reads[0].turn_id='old';},
    SDK_DEFERRED:f=>{f.events.find(event=>event.event_type==='sdk.accepted').client_time=new Date(21000).toISOString();},
    REJECTED:f=>{f.events.find(event=>event.event_type==='send.report').outcome='rejected';},
    UNKNOWN:f=>{f.events.find(event=>event.event_type==='send.report').outcome='unknown';f.events.push({seq:99,event_type:'sdk.late_accepted',message_id:'left'});},
    ACCEPTED_UNREAD:f=>{f.events=f.events.filter(event=>event.event_type!=='message.read');},
    INCONCLUSIVE:f=>{f.events.push({event_type:'frontend.gap'});}
  };
  for(const [expected,edit] of Object.entries(edits)){const f=evidence();edit(f);assert.equal(analyzeCase(f).classification,expected,expected);}
});
test('buffered telemetry does not change causal order; missing pages, clocks, old work or duplicate effects deny GO',()=>{
  const reordered=evidence();const telemetry=reordered.events.filter(event=>event.event_type.startsWith('sdk.'));
  reordered.events=[...reordered.events.filter(event=>!event.event_type.startsWith('sdk.')),...telemetry];
  assert.equal(analyzeCase(reordered).go,true,'arrival sequence is not a panel clock');
  for(const edit of [f=>{f.complete=false;},f=>{f.work.panel_clock.verified=false;},f=>{f.work.nonce='other';},
    f=>{f.cycle.results[0].effect_count=2;},f=>{f.events=f.events.filter(event=>event.event_type!=='sdk.invoked');}]){
    const f=evidence();edit(f);assert.equal(analyzeCase(f).go,false);
  }
});
test('aggregate requires live off control, three full primary cases and subsequent readonly case from identical bytes',()=>{
  const common={schema:1,evidence_kind:'live',experiment_id:'experiment',build_id:'build',sourceCommit:'a'.repeat(40),manifest_sha256:'b'.repeat(64)};
  const control={...common,mode:'off',full_cycle:true};
  const reports=['tool-wait','generation','tool-wait'].map((busy_kind,index)=>({...common,...analyzeCase(evidence()),case_id:'case'+index,busy_kind,hidden_no_executor_visits:index===2}));
  assert.equal(aggregateAnalyses(reports,control).preliminary_go,true);assert.equal(aggregateAnalyses(reports,control).go,false);
  reports.push({...reports[0],case_id:'command',busy_kind:'read-only-command',preliminary_go_verified:true});
  assert.equal(aggregateAnalyses(reports,control).go,true);
  reports[0].evidence_kind='fixture';assert.equal(aggregateAnalyses(reports,control).go,false);
});
