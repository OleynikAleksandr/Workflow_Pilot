import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCase,analyzeFolder,aggregateAnalyses,analysisMarkdown,verifyCycleEvidence} from '../scripts/analyze-sdk-busy-experiment.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';

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
test('backend UNKNOWN cannot be hidden by accepted telemetry, a late callback or later read reconciliation',()=>{
  const f=evidence();f.events.push({seq:99,event_type:'send.unknown',message_id:'left'},
    {seq:100,event_type:'sdk.late_accepted',message_id:'left'});
  assert.equal(analyzeCase(f).messages[0].classification,'UNKNOWN');assert.equal(analyzeCase(f).go,false);
  for(const edit of [value=>value.events.push({event_type:'experiment.invalidated',case_id:'case',reason:'changed-result'}),
    value=>value.events.push({event_type:'experiment.model_pull',message_id:'left',before_intent:true}),
    value=>value.events.push({event_type:'plan.permission',phase:'running'},{event_type:'plan.permission',phase:'running'})]){
    const value=evidence();edit(value);assert.equal(analyzeCase(value).classification,'INCONCLUSIVE');assert.equal(analyzeCase(value).go,false);
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
test('folder analysis validates complete pagination, immutable bytes and actual Git/Kit record structure; fixture never authorizes publication',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'sdk-analysis-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const f=evidence(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const write=async(name,value)=>{const bytes=typeof value==='string'?value:JSON.stringify(value);await fs.writeFile(path.join(root,name),bytes);return hash(bytes);};
  const raw={schema:1,plan:{tasks:[]},assignments:[],git:{commits:[],status_porcelain:'',worktrees:[{branch:'main'}]},commands:[],cleanup:{only_main:true,pending:[]}};
  for(const [index,id] of ['T001','T002','T003','DOCS'].entries()){
    const source='abcd'[index].repeat(40),integration=String(index+1).repeat(40),message_id=['left','right','third','docs'][index],acceptanceId='accepted-'+id;
    raw.plan.tasks.push({id,commit_status:'DONE'});raw.assignments.push({task_id:id,integration_commit:integration,transport_closed:true,
      dialogue:{result:{message_id,source_commit:source},acceptance:{message_id:acceptanceId,source_commit:source}}});
    raw.git.commits.push({sha:source,parents:[],role:'implementation',task_id:id},
      {sha:integration,parents:[source,...(index?[String(index).repeat(40)]:[])],task_id:id,role:'integration'});
    for(const event_type of ['message.read','message.yielded','assignment.transport_closed'])f.events.push({seq:f.events.length+1,event_type,message_id:acceptanceId});
    raw.git.head=integration;
  }
  assert.equal(verifyCycleEvidence(raw,f.events).verified,true);
  const wrapper={evidence_file:'kit-git-export.json',evidence_sha256:await write('kit-git-export.json',raw)};
  await write('cycle-proof.json',wrapper);
  await write('work-proof.json',{...f.work,evidence_file:'transcript.txt',evidence_sha256:await write('transcript.txt','Fixture original work nonce and observed turn boundaries')});
  const manifest={sourceCommit:'e'.repeat(40)},manifestHash=await write('release-manifest.json',manifest);
  await write('baseline-info.json',{version:'0.5.36',sourceCommit:'b24b82b21208622e61ef7ab80e6ce3e5266d0fe8',manifest_sha256:'6e32d95e700d1e5cf93fc25a971b979a1261b0a48f0d6e6adb39b5cd4815cd84'});
  const info={...f.info,schema:1,evidence_kind:'fixture',experiment_id:'fixture',build_id:'fixture-build',sourceCommit:manifest.sourceCommit,manifest_sha256:manifestHash};
  await write('experiment-info.json',info);
  const page={through_seq:f.events.length,after_seq:f.events.length,complete:true,summary:{page_from:0,visibility:'whole-run',build_id:'fixture-build'},jsonl:f.events.map(event=>JSON.stringify(event)).join('\n')+'\n'};
  await write('export-pages.json',[page]);const result=await analyzeFolder(root);assert.equal(result.go,true);assert.equal(result.full_cycle,true);
  assert.equal(aggregateAnalyses([result,result,result],{mode:'off',full_cycle:true}).go,false);
  page.summary.page_from=1;await write('export-pages.json',[page]);assert.equal((await analyzeFolder(root)).classification,'INCONCLUSIVE');
  await fs.unlink(path.join(root,'export-pages.json'));
  const summary={...page.summary,complete:true,through_seq:f.events.length,pages:[{after_seq:0,through_seq:f.events.length}]};
  await write('export-summary.json',summary);await write('communication.jsonl',page.jsonl);
  assert.equal((await analyzeFolder(root)).classification,'QUEUED_OBSERVED','the real panel download and captured summary are supported');
  summary.pages[0].after_seq=1;await write('export-summary.json',summary);assert.equal((await analyzeFolder(root)).go,false);
  const ordinary=f.events.filter(event=>!event.event_type.startsWith('experiment.')).map((event,index)=>({...event,seq:index+1}));
  await write('experiment-info.json',{...info,mode:'off'});
  await write('communication.jsonl',ordinary.map(event=>JSON.stringify(event)).join('\n'));
  await write('export-summary.json',{...summary,through_seq:ordinary.length,pages:[{after_seq:0,through_seq:ordinary.length}]});
  const control=await analyzeFolder(root);assert.equal(control.mode,'off');assert.equal(control.full_cycle,true,'off proof is computed, never a supplied success flag');
  raw.git.status_porcelain=' M user.txt';assert.equal(verifyCycleEvidence(raw,f.events).clean_main,false);
  await fs.unlink(path.join(root,'transcript.txt'));await fs.symlink(path.join(root,'kit-git-export.json'),path.join(root,'transcript.txt'));
  await assert.rejects(analyzeFolder(root),/symlink/);
});
