import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanReviewClient } from '../src/plan-review.mjs';
import { AutomationSendState } from '../src/automation-send-state.mjs';
import { ReviewContinuation } from '../src/review-continuation.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { once, EventEmitter } from 'node:events';
import { install } from '@webpilot/workflow-kit/lib/installer';
import { setReviewEnabled, readReview } from '@webpilot/workflow-kit/lib/plan-review';
import { runReview, REVIEW_MODEL } from '@webpilot/workflow-kit/lib/claude-review';
import { startupMessage } from '../src/context-session.mjs';

test('startup ID through normal prepare and simulated Claude round routes pauses and restart only to its recipient',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-routing-'));
  let flow,client;
  t.after(()=>{flow?.dispose();client?.dispose();fs.rmSync(root,{recursive:true,force:true});});
  const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
  git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@test.local');
  fs.writeFileSync(path.join(root,'README.md'),'# Fixture\n');git('add','README.md');git('commit','-m','fixture');
  install({project:root,mode:'existing'});
  const spec='docs/planning/review.md';fs.mkdirSync(path.join(root,'docs/planning'),{recursive:true});
  fs.writeFileSync(path.join(root,spec),'# Review routing fixture\n');
  let selected={workspace:root,sessionId:'web-pilot-fixture',chatUrl:'https://chatgpt.com/c/routing-fixture',scopeId:null};
  const text=startupMessage({...selected,name:'Fixture'},'fixture-request',{parts:[{}]});
  const recipient=JSON.parse(text.match(/\{"recipient_session_id":"[^"]+"\}/)[0]);
  const scope={scope_id:'routing',objective:'Check routing',approval_note:'User requests a fixture plan',acceptance_criteria:['Correct route'],
    approved_scope:{functional_paths:[],documentation_paths:[spec]},context_pack:{documents:[{path:spec,required:true}]},
    tasks:[{id:'T001',title:'Fixture',why:'Check routing',functional_paths:[],documentation_paths:[spec],verification_ids:[],
      acceptance_criteria:['Correct route'],expected_commit_message:'docs: fixture'}]};
  const inputFile=path.join(root,'.harness/runtime/routing-input.json');
  fs.writeFileSync(inputFile,JSON.stringify({scope,documents:[spec],...recipient}));
  setReviewEnabled(root,true);
  const prepared=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/workflow.mjs'),'review:prepare','--input',inputFile],
    {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:process.env}));
  assert.equal(prepared.recipient_session_id,selected.sessionId);
  const first=await runReview(root,{}, {spawn:(_command,args,options)=>{
    const child=new EventEmitter();child.stdin=new EventEmitter();
    child.stdin.end=()=>queueMicrotask(()=>{
      fs.writeSync(options.stdio[1],JSON.stringify({subtype:'success',is_error:false,session_id:args[args.indexOf('--session-id')+1],
        modelUsage:{[REVIEW_MODEL]:{}},structured_output:{verdict:'changes_requested',summary:'Уточнить проверку',findings:[]}}));
      child.emit('close',0);
    });return child;
  }});
  assert.equal(first.stage,'AUTHOR_PENDING');
  const checkpointFile=path.join(root,'.harness/runtime/routing-checkpoint.json'),sent=[];
  let resultState='sent';
  const createFlow=checkpoint=>{
    client=new PlanReviewClient({selected:()=>selected});client.observeSelection();
    flow=new ReviewContinuation({selected:()=>selected,client,available:()=>true,settleMs:0,
      saveCheckpoint:async value=>fs.writeFileSync(checkpointFile,JSON.stringify(value)),
      send:async(message,ready,before)=>{
        if(!ready() || !await before())return {state:'cancelled'};
        sent.push({sessionId:selected.sessionId,message});return {state:resultState};
      }});
    if(checkpoint)flow.restore(checkpoint);
  };
  const page={url:selected.chatUrl,busy:false,editorAvailable:true,writable:true,lastMessageRole:'assistant',
    turnId:'round-one-pause',userTurnId:'request',draftPresent:false,manualStopRevision:0,manualSendRevision:0};
  let restartCount=0;
  const observe=patch=>{Object.assign(page,patch);flow.observe({state:{...page},documentId:'fixture-doc-'+restartCount});};
  const drain=async()=>{await new Promise(r=>setTimeout(r,10));await flow.flow.reconcile();};
  createFlow();
  const original={...selected};
  selected={...original,workspace:root+'-other'};observe({});flow.update();await drain();
  assert.equal(sent.length,0,'stale client state from another checkout never routes');
  selected={...original,sessionId:'foreign-chat'};observe({});flow.update();await drain();
  assert.equal(sent.length,0,'another chat never receives continuation');
  selected=original;observe({draftPresent:true});flow.update();await drain();assert.equal(sent.length,0);
  observe({draftPresent:false});await drain();
  assert.equal(sent.length,1);assert.equal(sent[0].sessionId,recipient.recipient_session_id);
  assert.match(sent[0].message,/AUTHOR_PENDING/);
  assert.match(sent[0].message,/review:respond/,'the actual continuation directs the author to persist the response');
  assert.match(sent[0].message,/spec\/критерии до окончательного ревью/,'decisions must outlive runtime cleanup');
  const restart=async()=>{
    const checkpoint=JSON.parse(fs.readFileSync(checkpointFile,'utf8'));
    flow.dispose();client.dispose();restartCount++;createFlow(checkpoint);observe({});flow.update();await drain();
  };
  await restart();assert.equal(sent.length,1,'restart does not duplicate a delivered continuation');
  resultState='unknown';observe({busy:true});observe({busy:false,turnId:'next-pause'});await drain();
  assert.equal(sent.length,2);
  await restart();assert.equal(sent.length,2,'restart never repeats UNKNOWN');
  assert.equal(readReview(root).recipient_session_id,recipient.recipient_session_id);
});

test('Review rechecks persisted recipient at final send even before the file event arrives',async()=>{
  const selected={workspace:'/fixture',sessionId:'chat-a',chatUrl:'https://chatgpt.com/c/fixture'};
  const original={enabled:true,stage:'AUTHOR_PENDING',run_id:'run',round:1,generation:1,recipient_session_id:'chat-a'};
  const client={workspace:selected.workspace,state:original,refresh(){}};
  let persisted=original,sends=0;
  const flow=new ReviewContinuation({selected:()=>selected,client,available:()=>true,settleMs:0,status:()=>persisted,
    saveCheckpoint:async()=>{},send:async(_text,ready,before)=>{
      persisted={...original,generation:2,recipient_session_id:'chat-b'};
      if(ready() && await before()){sends++;return {state:'sent'};}return {state:'cancelled'};
    }});
  try{
    flow.observe({documentId:'doc',state:{url:selected.chatUrl,busy:false,editorAvailable:true,writable:true,
      lastMessageRole:'assistant',turnId:'pause',userTurnId:'request',draftPresent:false}});
    flow.update();await new Promise(r=>setTimeout(r,10));await flow.flow.reconcile();
    assert.equal(sends,0);
  }finally{flow.dispose();}
});

test('Review indicator distinguishes active work, waiting, success and attention; watchdog is bounded',()=>{
  let state={enabled:true,stage:'RUNNING',runner_pid:process.pid,started_at:new Date(0).toISOString()},now=0,readCount=0;
  const timers=new Map();let seq=0;
  const client=new PlanReviewClient({selected:()=>({workspace:'/fixture'}),supports:()=>true,
    read:()=>{readCount++;return state;},now:()=>now,
    schedule:(fn,ms)=>{const id=++seq;timers.set(id,{fn,ms});return id;},cancel:id=>timers.delete(id)});
  client.observeSelection();assert.equal(client.view().indicator,'working');assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,15000);
  now=905000;[...timers.values()][0].fn();timers.delete(seq);
  assert.equal(client.view().indicator,'attention');assert.equal(client.timer,null);
  for(const [stage,indicator] of [['PREPARED','waiting'],['AUTHOR_PENDING','waiting'],['AGREED','success'],
    ['PUBLISHED','success'],['NEEDS_USER','attention'],['STALE','attention'],['IDLE','none'],['CANCELLED','none'],['PUBLISHING','working']]){
    state={enabled:true,stage};client.refresh();
    assert.equal(client.view().indicator,indicator,stage);assert.equal(client.timer,null,stage);
  }
  state={enabled:true,stage:'RUNNING'};client.refresh();assert.equal(client.view().indicator,'attention','no PID is not verified work');
  state={enabled:false,stage:'RUNNING',runner_pid:process.pid,started_at:new Date(now).toISOString()};
  client.refresh();assert.equal(client.view().indicator,'none');assert.equal(client.timer,null);
  state={enabled:true,stage:'RUNNING',runner_pid:process.pid,started_at:new Date(now).toISOString()};client.refresh();
  assert.notEqual(client.timer,null);client.dispose();assert.equal(client.timer,null);
  const before=readCount;client.refresh();assert.equal(readCount,before,'disposed client never restarts watchdog');
});

test('Review refresh/watchdog detects a terminated real runner and restart keeps static attention',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'review-runner-ui-'));
  const child=spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});
  const exited=once(child,'exit');
  let client;
  t.after(()=>{client?.dispose();child.kill();fs.rmSync(root,{recursive:true,force:true});});
  await once(child,'spawn');
  execFileSync('git',['init','--quiet',root]);
  const dir=path.join(root,'.harness/runtime/plan-review');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'state.json');
  fs.writeFileSync(file,JSON.stringify({version:1,enabled:true,stage:'RUNNING',generation:1,run_id:'fixture',
    launch_id:'launch',round:1,runner_pid:child.pid,started_at:new Date().toISOString()}));
  let watchdog;
  const options={selected:()=>({workspace:root}),supports:()=>true,schedule:fn=>{watchdog=fn;return 1;},cancel:()=>{}};
  client=new PlanReviewClient(options);client.observeSelection();assert.equal(client.view().indicator,'working');
  child.kill();await exited;watchdog();
  assert.equal(client.view().stage,'NEEDS_USER');assert.equal(client.view().indicator,'attention');assert.equal(client.timer,null);
  assert.equal(JSON.parse(fs.readFileSync(file)).error.code,'REVIEW_INTERRUPTED');
  client.dispose();client=new PlanReviewClient(options);client.observeSelection();
  assert.equal(client.view().enabled,true);assert.equal(client.view().indicator,'attention');assert.equal(client.timer,null);
});

test('Review policy belongs to checkout, survives selection changes and rejects a stale IPC target',()=>{
  const states=new Map();let selected={workspace:'/project-a'},changed=0;
  const client=new PlanReviewClient({selected:()=>selected,onChange:()=>changed++,supports:()=>true,
    read:r=>states.get(r)??{enabled:false,stage:'IDLE'},write:(r,enabled)=>states.set(r,{...states.get(r),enabled,stage:'IDLE'})});
  client.observeSelection();assert.equal(client.view().enabled,false);
  client.setEnabled({workspace:'/project-a',enabled:true});assert.equal(client.view().enabled,true);
  selected={workspace:'/project-b'};client.observeSelection();assert.equal(client.view().enabled,false);
  assert.throws(()=>client.setEnabled({workspace:'/project-a',enabled:false}),{code:'REVIEW_SELECTION_CHANGED'});
  selected={workspace:'/project-a'};client.observeSelection();assert.equal(client.view().enabled,true);
  const before=changed;client.refresh();assert.equal(changed,before,'same state must not loop publish');
  const restored=new PlanReviewClient({selected:()=>selected,supports:()=>true,read:r=>states.get(r)});
  restored.observeSelection();assert.equal(restored.view().enabled,true);
  states.set('/project-a',{enabled:true,stage:'NEEDS_USER',round:4,max_rounds:4,error:{message:'Остался спор'}});
  client.refresh();assert.match(client.view().message,/Раунд 4 из 4/);assert.match(client.view().message,/Остался спор/);
  client.setEnabled({workspace:'/project-a',enabled:false});assert.equal(client.view().message,'');
});

test('old Kit and unreadable state are visible errors, not silently disabled review',()=>{
  const selected=()=>({workspace:'/fixture'});
  const old=new PlanReviewClient({selected,supports:()=>false});old.observeSelection();
  assert.match(old.view().error,/обновите Workflow Kit/);assert.equal(old.view().supported,false);
  const broken=new PlanReviewClient({selected,supports:()=>true,read:()=>{throw Error('Unreadable state');}});broken.observeSelection();
  assert.equal(broken.view().error,'Unreadable state');
  assert.throws(()=>broken.setEnabled({workspace:'/fixture',enabled:false}),{code:'REVIEW_UNAVAILABLE'});
});

test('Review and AutoPlan share a conversation pause across scope change and restart',async()=>{
  let checkpoint;const gate=new AutomationSendState({save:async value=>{checkpoint=structuredClone(value);}});
  const selected={workspace:'/project',sessionId:'chat',chatUrl:'https://chatgpt.com/c/test',scopeId:null};
  const page={turnId:'pause-one'};let sends=0;
  const first=await gate.send({selected,page,kind:'review',ready:()=>true,perform:async()=>{sends++;return {state:'sent'};}});
  assert.equal(first.state,'sent');
  selected.scopeId='new-scope';
  const next=await gate.send({selected,page,ready:()=>true,perform:async()=>{sends++;return {state:'sent'};}});
  assert.equal(next.reason,'PAUSE_CONSUMED');assert.equal(sends,1);
  const restored=new AutomationSendState();restored.restore(checkpoint);
  assert.equal((await restored.send({selected,page,ready:()=>true,perform:async()=>{throw Error('duplicate');}})).state,'unknown');
  const unknown=await gate.send({selected,page:{turnId:'pause-two'},ready:()=>true,perform:async()=>({state:'unknown'})});
  assert.equal(unknown.state,'unknown');assert.equal(checkpoint.entries.at(-1).status,'sending');
});

test('Review continuation at NONE targets its recipient, asks once and respects draft and manual Stop',async()=>{
  const selected={workspace:'/project',sessionId:'chat',chatUrl:'https://chatgpt.com/c/test',scopeId:null};
  const client={workspace:selected.workspace,state:{enabled:true,run_id:'run',stage:'PREPARED',round:0,generation:1,recipient_session_id:'chat'},refresh(){}};
  let saved;const sent=[];
  const flow=new ReviewContinuation({selected:()=>selected,client,available:()=>true,settleMs:0,
    status:()=>client.state,acknowledge:()=>{client.state={...client.state,notification_handled:true,generation:client.state.generation+1};},
    saveCheckpoint:async v=>{saved=structuredClone(v);},
    send:async(text,ready,before)=>{if(!ready()||!await before())return {state:'cancelled'};sent.push(text);return {state:'sent'};}});
  const page={url:selected.chatUrl,busy:false,editorAvailable:true,writable:true,lastMessageRole:'assistant',turnId:'a',userTurnId:'u',draftPresent:true,manualStopRevision:0,manualSendRevision:0};
  const observe=patch=>{Object.assign(page,patch);flow.observe({state:{...page},documentId:'doc'});};
  const drain=async()=>{await new Promise(r=>setTimeout(r,10));await flow.flow.reconcile();};
  try {
    observe({});flow.update();await drain();assert.equal(sent.length,0);
    observe({draftPresent:false});await drain();assert.equal(sent.length,1);assert.match(sent[0],/не разрешение выполнения задач/);
    client.state={...client.state,stage:'NEEDS_USER',generation:2,round:4};flow.update();observe({turnId:'b'});await drain();
    assert.equal(sent.length,2);assert.match(sent[1],/спроси, что делать/);
    observe({turnId:'c'});await drain();assert.equal(sent.length,2,'no repeat of the user question');
    client.state={...client.state,stage:'PREPARED',generation:4,notification_handled:false};flow.update();
    observe({busy:true,turnId:'d'});observe({busy:false,manualStopRevision:1});await drain();assert.equal(sent.length,2);
    assert.equal(saved.reviewStops.length,1);
    observe({manualSendRevision:1,userTurnId:'u2',lastMessageRole:'user'});await drain();assert.equal(sent.length,2);
    observe({busy:true});observe({busy:false,turnId:'e',lastMessageRole:'assistant'});await drain();assert.equal(sent.length,3);
    selected.sessionId='other';flow.update();observe({turnId:'f'});await drain();assert.equal(sent.length,3,'wrong recipient does not receive a review');
  } finally {flow.dispose();}
});

test('AutoPlan waits for confirmed reviewed publication, OFF and unrelated active plans remain ordinary',async()=>{
  const {reviewBlocksExecution}=await import('../src/auto-plan-state.mjs');
  for(const enabled of [false,true])for(const stage of ['PUBLISHING','PUBLISHED','NEEDS_USER']){
    const s={enabled,stage,scope_id:'new'};
    assert.equal(!!reviewBlocksExecution(s,'new'),enabled && stage!=='PUBLISHED');
    assert.equal(!!reviewBlocksExecution(s,'old'),false);
  }
});
