import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { install } from '../src/lib/installer.mjs';
import { readReview, setReviewEnabled, prepareReview, respondReview, saveReview, publishReview, resolveReview, cancelReview, reviewSummary, reviewStatus } from '../src/lib/plan-review.mjs';
import { createScope, repair, startTask, applyConfig } from '../src/lib/actions.mjs';
import { readConfig } from '../src/lib/validate.mjs';
import { claimPlanningOwner, releasePlanningOwner, readPlanningOwner, PLANNING_OWNER } from '../src/lib/planning-owner.mjs';
import { requestExecutionMode, chooseExecutionMode, readExecutionMode, EXECUTION_MODE } from '../src/lib/execution-mode.mjs';
import { recover } from '../src/lib/recovery.mjs';
import { createSimplePlan } from '../src/lib/simple-workflow.mjs';
import { readPlan } from '../src/lib/plan.mjs';
import { locked } from '../src/lib/transaction.mjs';
import { localPath } from '../src/lib/git.mjs';
import { runReview, parseVerdict, REVIEW_MODEL } from '../src/lib/claude-review.mjs';
const roots=[];
const git=(r,...args)=>execFileSync('git',args,{cwd:r,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(r,p,v)=>{fs.mkdirSync(path.dirname(path.join(r,p)),{recursive:true});fs.writeFileSync(path.join(r,p),v);};
function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-review-'));roots.push(root);
  git(root,'init','-b','main');git(root,'config','user.name','Review Test');git(root,'config','user.email','review@test.local');
  write(root,'README.md','# Test\n');git(root,'add','README.md');git(root,'commit','-m','baseline');
  install({project:root,mode:'existing'});
  write(root,'docs/planning/review.md','# Review fixture\n');
  const scope={scope_id:'review-fixture',session_id:'fixture-chat',objective:'Test reviewed publication',approval_note:'User requests fixture plan',acceptance_criteria:['Correct plan'],
    approved_scope:{functional_paths:[],documentation_paths:['docs/planning/review.md','README.md']},
    context_pack:{documents:[{path:'docs/planning/review.md',required:true}],include_last_completed_task:false,dependency_task_ids:[]},
    tasks:[{id:'T001',title:'Update documentation',why:'Test task',functional_paths:[],documentation_paths:['README.md'],verification_ids:[],acceptance_criteria:['Done'],expected_commit_message:'docs: fixture'}]};
  return {root,scope,input:{scope,documents:['docs/planning/review.md']}};
}
const expect=(code,fn)=>assert.throws(fn,e=>e.code===code);
const state=(r,changes)=>locked(r,()=>saveReview(r,{...readReview(r),...changes}));
const approval={verdict:'approved',summary:'Согласовано',findings:[]};
const authorPosition='Согласен с проверкой: порядок задачи и её критерии достаточны. Дополнительных решений для исполнителя нет; существенных разногласий нет.';
const respond=(root,disposition='accept',position=authorPosition)=>respondReview(root,{round:readReview(root).review_history.at(-1).round,disposition,position});
// A simulated CLI result exercises the actual runner, never a live Claude/ChatGPT session.
const simulate=(root,verdict=approval,{fail=false}={})=>runReview(root,{}, {spawn:(_command,args,options)=>{
  const child=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>queueMicrotask(()=>{
    child.emit('spawn');
    if(!fail)fs.writeSync(options.stdio[1],JSON.stringify({subtype:'success',is_error:false,
      session_id:args[args.indexOf(args.includes('--resume')?'--resume':'--session-id')+1],
      modelUsage:{[REVIEW_MODEL]:{}},structured_output:verdict}));
    child.emit('close',fail?1:0);
  });return child;
}});
async function agree(root) {await simulate(root);respond(root);}
try {
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    await simulate(root,{verdict:'changes_requested',summary:'Уточнить критерий',findings:[]});
    respond(root,'revise','Принимаю замечание: добавляю явную проверку результата в спецификацию до повторного согласования.');
    write(root,'docs/planning/review.md','# Review fixture\nПроверить оба результата.\n');
    prepareReview(root,input);await agree(root);publishReview(root);
    const events=readReview(root).review_events,types=events.map(e=>e.type);
    for(const type of ['prepared','requested','started','feedback','author'])assert.equal(types.filter(t=>t===type).length,2,type);
    assert.equal(types.filter(t=>t==='published').length,1);
    assert.ok(events.every(e=>Number.isFinite(Date.parse(e.at))),'new facts have actual timestamps');
    assert.equal(new Set(events.map(e=>e.id)).size,events.length);
    startTask(root,'T001');assert.deepEqual(readReview(root).review_events,events,'history survives removal of all temporary review files');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);
    const missing=structuredClone(input);delete missing.scope.session_id;
    const before=readReview(root);
    for(const bad of [missing,{...input,recipient_session_id:'other'},
      {...missing,recipient_session_id:''},{...input,recipient_mode:'manual'}]){
      expect('REVIEW_RECIPIENT',()=>prepareReview(root,bad));
      assert.deepEqual(readReview(root),before,'invalid routing changes no state');
    }
    write(root,'.harness/runtime/review-input.json',JSON.stringify(input));
    const prepared=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/workflow.mjs'),'review:prepare','--input','.harness/runtime/review-input.json'],{cwd:root,encoding:'utf8'}));
    assert.equal(prepared.recipient_session_id,'fixture-chat','normal CLI reads explicit session metadata from scope');
    assert.equal(readPlan(root).execution_scope_status,'NONE','routing does not create a chat-owned plan');
    assert.equal(prepareReview(root,missing).recipient_session_id,'fixture-chat','next round inherits the same recipient');
    state(root,{stage:'AUTHOR_PENDING',round:1});
    missing.response='Автор прочитал первый отзыв; требуется следующая проверка.';
    const changed={...missing,recipient_session_id:'new-chat'};
    expect('REVIEW_RECIPIENT',()=>prepareReview(root,changed));
    const handover=prepareReview(root,{...changed,recipient_change_note:'User explicitly resumes this review in new-chat.'});
    assert.deepEqual(handover.recipient_change,{from:'fixture-chat',to:'new-chat',note:'User explicitly resumes this review in new-chat.'});
    assert.equal(handover.run_id,prepared.run_id);
    assert.equal(prepareReview(root,missing).recipient_session_id,'new-chat');
    expect('REVIEW_RECIPIENT',()=>prepareReview(root,{...missing,recipient_mode:'manual'}));
  }
  {
    const {root,input}=fixture();delete input.scope.session_id;input.recipient_mode='manual';
    setReviewEnabled(root,true);
    const s=prepareReview(root,input);assert.equal(s.recipient_session_id,null);assert.equal(s.recipient_mode,'manual');
    assert.equal(prepareReview(root,input).recipient_mode,'manual');
    state(root,{recipient_mode:undefined}); // legacy missing-ID state, not a guessed recipient
    const explicit={...input,recipient_mode:'webpilot',recipient_session_id:'new-chat'};
    expect('REVIEW_RECIPIENT',()=>prepareReview(root,explicit));
    assert.equal(prepareReview(root,{...explicit,recipient_change_note:'User requests taking over the legacy review here.'}).recipient_session_id,'new-chat');
  }
  {
    const {root,scope,input}=fixture();
    assert.equal(readReview(root).enabled,false);
    setReviewEnabled(root,true);
    const config=fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8');
    expect('REVIEW_REQUIRED',()=>createSimplePlan(root,{id:'simple',spec:'docs/planning/review.md',checks:[],tasks:[]}));
    assert.equal(fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8'),config);
    expect('REVIEW_REQUIRED',()=>createScope(root,scope));
    const prepared=prepareReview(root,input);assert.equal(prepared.stage,'PREPARED');
    assert.equal(prepareReview(root,input).run_id,prepared.run_id);
    write(root,'README.md','# Unrelated dirty documentation\n');
    await agree(root);
    const result=publishReview(root);assert.equal(result.ok,true);
    assert.equal(readReview(root).stage,'PUBLISHED');
    assert.equal(readPlan(root).scope_id,scope.scope_id);
    assert.equal(readPlan(root).session_id,'fixture-chat','session is metadata, not a plan selector');
    assert.equal(git(root,'show','HEAD:README.md'),'# Test');
    assert.equal(git(root,'show','HEAD:docs/planning/review.md'),'# Review fixture');
    assert.equal(fs.readFileSync(path.join(root,'.harness/workflow.json'),'utf8'),config);
    assert.equal(publishReview(root).already_published,true);
  }
  for (const mode of ['normal','already-removed','symlink','off']) {
    const {root,scope,input}=fixture();setReviewEnabled(root,true);
    const prepared=prepareReview(root,input), dir=path.join(root,'.harness/runtime/plan-review',prepared.run_id);
    if(mode==='off')state(root,{stage:'NEEDS_USER'});else await agree(root);
    if(mode==='off'){setReviewEnabled(root,false);createScope(root,scope);}else publishReview(root);
    const sibling=path.join(root,'.harness/runtime/plan-review/old-experiment');fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling,'keep.txt'),'keep');
    assert.ok(fs.existsSync(dir),'publication retains review');
    if(mode==='already-removed')fs.rmSync(dir,{recursive:true});
    if(mode==='symlink')fs.symlinkSync(sibling,path.join(dir,'foreign'));
    const result=startTask(root,'T001');
    assert.equal(readPlan(root).current_task_id,'T001');
    if(mode==='symlink'){
      assert.equal(readReview(root).cleanup_status,'failed');assert.ok(result.facts.review_cleanup_error);
      assert.ok(fs.existsSync(path.join(sibling,'keep.txt')));
      fs.unlinkSync(path.join(dir,'foreign'));
    }
    startTask(root,'T001');
    assert.equal(readReview(root).cleanup_status,'done');assert.equal(fs.existsSync(dir),false);
    assert.ok(fs.existsSync(path.join(sibling,'keep.txt')));
    assert.ok(fs.existsSync(path.join(root,'docs/planning/review.md')));
    assert.equal(readReview(root).documents,undefined,'no retained review archive');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);await agree(root);
    write(root,'docs/planning/review.md','# Changed after agreement\n');
    expect('REVIEW_STALE',()=>publishReview(root));assert.equal(readPlan(root).execution_scope_status,'NONE');
    state(root,{stage:'NEEDS_USER'});expect('REVIEW_RESOLUTION',()=>resolveReview(root,'publish',''));
    resolveReview(root,'cancel','User cancels');assert.equal(readReview(root).stage,'CANCELLED');
    prepareReview(root,input);state(root,{stage:'NEEDS_USER'});resolveReview(root,'retry','User requests retry');
    assert.equal(readReview(root).stage,'PREPARED');cancelReview(root,'User cancels again');
  }
  {
    const {root,scope,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);state(root,{stage:'NEEDS_USER'});
    setReviewEnabled(root,false);
    assert.equal(readReview(root).stage,'CANCELLED','OFF cancels the unfinished review');
    assert.equal(createScope(root,scope).ok,true,'OFF frees even a disputed plan');
    assert.equal(readReview(root).stage,'PUBLISHED');
  }
  {
    // A reviewed plan must start: functional tasks need the development profile and configured checks.
    const {root,scope,input}=fixture();setReviewEnabled(root,true);
    write(root,'src/app.mjs','export const value=1;\n');
    const code={...scope,approved_scope:{functional_paths:['src/app.mjs'],documentation_paths:['docs/planning/review.md','README.md']},
      tasks:[{...scope.tasks[0],functional_paths:['src/app.mjs'],verification_ids:['unit']}]};
    expect('NOT_CONFIGURED',()=>prepareReview(root,{...input,scope:code}));
    const unit={id:'unit',executable:'node',args:['--version'],required:false,timeout_ms:30000};
    applyConfig(root,{...readConfig(root),checks:[unit]});assert.equal(readConfig(root).profile,'DISCOVERY','no stack keeps discovery');
    expect('STACK_NOT_CONFIGURED',()=>prepareReview(root,{...input,scope:code}));
    assert.equal(readReview(root).stage,'IDLE','refused before any write');
    applyConfig(root,{...readConfig(root),stack:'Node.js'});assert.equal(readConfig(root).profile,'DEVELOPMENT','a stack means development');
    assert.equal(prepareReview(root,{...input,scope:code}).stage,'PREPARED');
  }
  {
    // One planning owner: the first claim wins, other Session IDs are refused, manual skips only the recipient.
    const {root,scope,input}=fixture();setReviewEnabled(root,true);
    assert.equal(claimPlanningOwner(root,{session_id:'owner-chat'}).claimed,true);
    assert.equal(claimPlanningOwner(root,{session_id:'second-chat'}).session_id,'owner-chat','compare-and-set keeps the first owner');
    assert.match(recover(root).parts.flatMap(p=>p.sources).find(x=>x.source==='planning-owner').content,/owner-chat/);
    assert.throws(()=>prepareReview(root,input),e=>e.code==='PLANNING_OWNED'&&e.details.owner_session_id==='owner-chat');
    const orchestrated={...scope,session_id:undefined,execution_strategy:'orchestrated',parallel_allowed:false,max_workers:1,
      execution_reason:'Fixture orchestrated plan',execution_origin_session_id:'second-chat',release:false,
      tasks:[...scope.tasks.map(t=>({...t,task_brief:'Update the assigned document and return a verified commit.',prepared_task:{version:1,contexts:[]}})),
        {...scope.tasks[0],id:'DOCS',title:'Актуализация всех документов проекта',task_brief:'Reconcile the project documents with verified integrations.',prepared_task:{version:1,contexts:[]}}]};
    expect('PLANNING_OWNED',()=>prepareReview(root,{scope:orchestrated,documents:input.documents,recipient_mode:'manual'}));
    expect('EXECUTION_MODE_REQUIRED',()=>prepareReview(root,{scope:{...orchestrated,execution_origin_session_id:'owner-chat'},documents:input.documents,recipient_mode:'manual'}));
    const asked=requestExecutionMode(root,{session_id:'owner-chat',recommended:'orchestrated',reason:'Large independent fixture tasks'});
    chooseExecutionMode(root,{session_id:'owner-chat',strategy:'orchestrated',generation:asked.generation,approval_note:'User chose orchestration in the panel'});
    assert.equal(prepareReview(root,{scope:{...orchestrated,execution_origin_session_id:'owner-chat'},documents:input.documents,recipient_mode:'manual'}).stage,'PREPARED',
      'manual skips only the recipient comparison');
    cancelReview(root,'User cancels the fixture review');setReviewEnabled(root,false);
    expect('PLANNING_OWNED',()=>createScope(root,{...orchestrated,approval_note:'User requests the fixture orchestrated plan'}));
    assert.equal(releasePlanningOwner(root,{session_id:'second-chat'}).released,false,'only the owner session releases');
    assert.equal(claimPlanningOwner(root,{session_id:'second-chat',transfer:true}).transferred_from,'owner-chat');
    assert.equal(fs.existsSync(path.join(root,EXECUTION_MODE)),false,'a transfer drops the previous mode choice');
    expect('EXECUTION_MODE_REQUIRED',()=>createScope(root,{...orchestrated,approval_note:'User requests the fixture orchestrated plan'}));
    const again=requestExecutionMode(root,{session_id:'second-chat',recommended:'orchestrated',reason:'Large independent fixture tasks'});
    chooseExecutionMode(root,{session_id:'second-chat',strategy:'orchestrated',generation:again.generation,approval_note:'User chose orchestration in the panel'});
    createScope(root,{...orchestrated,approval_note:'User requests the fixture orchestrated plan'});
    assert.ok(readPlan(root).user_decisions.some(d=>/Режим выполнения выбран пользователем: orchestrated/.test(d.text)));
    expect('EXECUTION_MODE_ACTIVE_PLAN',()=>requestExecutionMode(root,{session_id:'second-chat',recommended:'sequential',reason:'A request after publication'}));
    assert.equal(readPlanningOwner(root).session_id,'second-chat','the owner stays until the plan is archived');
    assert.equal(readPlan(root).execution_origin_session_id,'second-chat');
    // An older Kit may archive without removing the file: the record of a closed plan is ignored.
    const stale=JSON.parse(fs.readFileSync(path.join(root,PLANNING_OWNER),'utf8'));
    fs.writeFileSync(path.join(root,PLANNING_OWNER),JSON.stringify({...stale,archived_scope_id:'older-scope'}));
    assert.equal(readPlanningOwner(root),null,'a record from before an archive is stale');
    assert.equal(releasePlanningOwner(root,{session_id:'second-chat'}).released,true);
    assert.equal(fs.existsSync(path.join(root,PLANNING_OWNER)),false);
    assert.equal(fs.existsSync(path.join(root,EXECUTION_MODE)),false,'releasing the owner drops its mode record');
  }
  {
    // The user chooses the execution mode; plan creation must match it before any write.
    const {root}=fixture();
    write(root,'docs/planning/mode.md','# Mode fixture\n');write(root,'src/app.mjs','export const value=1;\n');
    const plan=(fields={})=>({id:'mode-fixture',spec:'docs/planning/mode.md',objective:'Fixture result',stack:'Node.js',
      checks:[{id:'unit',executable:'node',args:['--version'],kind:'test'}],
      tasks:[{id:'T001',title:'Implement',files:['src/app.mjs'],checks:['unit'],acceptance:['Done']}],
      parallel_allowed:false,max_workers:1,execution_strategy:'sequential',execution_reason:'Small sequential fixture',execution_origin_session_id:'mode-chat',...fields});
    expect('EXECUTION_MODE_REQUIRED',()=>createSimplePlan(root,plan()));
    assert.equal(readConfig(root).profile,'DISCOVERY','an origin without a request is refused before applyConfig');
    const asked=requestExecutionMode(root,{session_id:'mode-chat',recommended:'sequential',reason:'Small connected fixture tasks'});
    assert.equal(readPlanningOwner(root).session_id,'mode-chat','the request claims planning');
    expect('PLANNING_OWNED',()=>requestExecutionMode(root,{session_id:'other-chat',recommended:'orchestrated',reason:'Another session asks too'}));
    assert.equal(readExecutionMode(root).generation,asked.generation,'a refused request writes nothing');
    assert.match(recover(root).parts.flatMap(p=>p.sources).find(x=>x.source==='execution-mode').content,/не выбрал режим/);
    expect('EXECUTION_MODE_REQUIRED',()=>createSimplePlan(root,plan()));
    const noOrigin={...plan()};delete noOrigin.execution_origin_session_id;
    expect('EXECUTION_MODE_REQUIRED',()=>createSimplePlan(root,noOrigin));
    assert.equal(readConfig(root).profile,'DISCOVERY','no choice is refused before applyConfig');
    expect('EXECUTION_MODE_CHANGED',()=>chooseExecutionMode(root,{session_id:'mode-chat',strategy:'sequential',generation:asked.generation+1,approval_note:'User chose in the panel'}));
    expect('EXECUTION_MODE_CHANGED',()=>chooseExecutionMode(root,{session_id:'other-chat',strategy:'sequential',generation:asked.generation,approval_note:'User chose in the panel'}));
    chooseExecutionMode(root,{session_id:'mode-chat',strategy:'sequential',generation:asked.generation,approval_note:'User chose self-execution in the panel'});
    expect('EXECUTION_MODE_REQUIRED',()=>createSimplePlan(root,noOrigin));
    expect('EXECUTION_MODE_REQUIRED',()=>createSimplePlan(root,plan({execution_origin_session_id:'other-chat'})));
    expect('EXECUTION_MODE_MISMATCH',()=>createSimplePlan(root,plan({execution_strategy:'orchestrated',release:false})));
    assert.equal(readConfig(root).profile,'DISCOVERY','every refusal precedes applyConfig');
    const repeated=requestExecutionMode(root,{session_id:'mode-chat',recommended:'sequential',reason:'The spec changed after review'});
    assert.equal(readExecutionMode(root).choice,null,'a new request resets the previous choice');
    chooseExecutionMode(root,{session_id:'mode-chat',strategy:'sequential',generation:repeated.generation,approval_note:'User chose self-execution again'});
    assert.equal(createSimplePlan(root,plan()).ok,true);
    assert.equal(readPlan(root).execution_strategy,'sequential');
    assert.ok(readPlan(root).user_decisions.some(d=>/Режим выполнения выбран пользователем: sequential/.test(d.text)));
  }
  {
    // The switch is the user's decision at publication time and is frozen while a plan is published.
    const {root,scope,input}=fixture();
    assert.match(reviewSummary(root),/положение в момент публикации/);
    assert.match(reviewSummary(root),/не прося выключить Review/);
    setReviewEnabled(root,true);
    assert.throws(()=>createScope(root,scope),e=>e.code==='REVIEW_REQUIRED' && /Не просите выключить Review/.test(e.message));
    prepareReview(root,input);setReviewEnabled(root,false);
    assert.equal(readReview(root).stage,'CANCELLED');assert.equal(readReview(root).user_decision.action,'cancel');
    createScope(root,scope);
    expect('REVIEW_LOCKED',()=>setReviewEnabled(root,true));
    assert.equal(readReview(root).enabled,false,'a published plan keeps its Review decision');
    assert.equal(setReviewEnabled(root,false).enabled,false,'the unchanged value is not a toggle');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);await agree(root);
    process.env.WORKFLOW_TEST_FAILPOINT='committed';
    try {expect('TEST_INTERRUPTION',()=>publishReview(root));}finally{delete process.env.WORKFLOW_TEST_FAILPOINT;}
    expect('TRANSACTION_PENDING',()=>publishReview(root));
    repair(root,repair(root).repair_id);assert.equal(publishReview(root).already_published,true);
    assert.equal(readReview(root).stage,'PUBLISHED');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);await agree(root);
    write(root,'README.md','# staged foreign\n');git(root,'add','README.md');
    expect('FOREIGN_STAGED',()=>publishReview(root));
    git(root,'reset','HEAD','--','README.md');
    assert.equal(publishReview(root).ok,true,'retry after pre-transaction failure');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    const calls=[];
    const fake=(verdict,{timeout=false,badSession=false,exitCode=0,badJson=false}={})=>(command,args,options)=>{
      assert.equal(fs.existsSync(localPath(root,'operation.lock')),false,'Claude spawn must not hold Kit lock');
      assert.equal(options.shell,false);assert.equal(options.cwd,root);
      calls.push(args);
      const child=new EventEmitter();child.stdin=new EventEmitter();
      child.kill=()=>queueMicrotask(()=>child.emit('close',null));
      child.stdin.end=request=>{
        assert.match(request,/Нормализованный to-do plan/);
        if(timeout)return;
        queueMicrotask(()=>{
          const i=args.indexOf('--resume')>=0?args.indexOf('--resume'):args.indexOf('--session-id');
          fs.writeSync(options.stdio[1],badJson?'{invalid json':JSON.stringify({subtype:'success',is_error:false,session_id:badSession?'wrong':args[i+1],modelUsage:{[REVIEW_MODEL]:{}},structured_output:verdict}));
          child.emit('close',exitCode);
        });
      };
      return child;
    };
    const changes={verdict:'changes_requested',summary:'Исправить зависимость',findings:[{id:'F1',severity:'major',status:'open',reason:'Задача использует ещё не созданный файл.'}]};
    const approval={verdict:'approved',summary:'Согласовано',findings:[]};
    const first=await runReview(root,{}, {spawn:fake(changes)});
    assert.equal(first.stage,'AUTHOR_PENDING');assert.equal(first.round,1);
    assert.equal(calls[0].includes('--max-turns'),false,'unlimited turns by default');
    assert.equal(readReview(root).max_rounds,undefined,'new runs have no round limit');
    assert.ok(calls[0].includes('--session-id'));
    assert.equal(fs.readFileSync(path.join(first.run_directory,first.review_file),'utf8').includes('F1'),true);
    expect('REVIEW_RESPONSE',()=>prepareReview(root,{...input,response:'Одна строка вместо позиции не заменяет review:respond.'}));
    respond(root,'revise','Принимаю F1: порядок зависит от создания файла. Уточню эту зависимость в критериях до следующего ревью.');
    prepareReview(root,{...input,response:'Согласен, зависимость уточнена.'});
    const second=await runReview(root,{}, {spawn:fake(approval)});
    assert.equal(second.stage,'AGREED');assert.equal(second.claude_session_id,first.claude_session_id);
    assert.equal(calls[1][calls[1].indexOf('--resume')+1],first.claude_session_id);
    respond(root);
    prepareReview(root,{...input,response:'Дополнительная проверка.'});
    const third=await runReview(root,{}, {spawn:fake(approval,{badSession:true})});
    assert.equal(third.stage,'NEEDS_USER');assert.equal(third.error.code,'REVIEW_SESSION');
    resolveReview(root,'retry','Пользователь разрешил повтор');
    const fourth=await runReview(root,{timeoutMs:100}, {spawn:fake(approval,{timeout:true})});
    assert.equal(fourth.stage,'NEEDS_USER');assert.equal(fourth.error.code,'REVIEW_TIMEOUT');
    resolveReview(root,'retry','Ещё один раунд по решению пользователя');
    state(root,{max_rounds:1}); // Older state must not impose a hidden gate.
    const fifth=await runReview(root,{}, {spawn:fake(changes)});
    assert.equal(fifth.stage,'AUTHOR_PENDING');assert.equal(fifth.round,5);
    assert.equal(fifth.error,null,'legacy max_rounds is ignored');
    assert.deepEqual(fifth.review_history.map(r=>r.round),[1,2,5],'failed attempts preserve successful reviews without inventing responses');
    expect('REVIEW_RESPONSE',()=>prepareReview(root,input));
    respond(root,'revise','Принимаю F1, порядок подготовки файла нуждается в уточнении перед следующей попыткой согласования.');
    prepareReview(root,input);
    const sixth=await runReview(root,{}, {spawn:fake(approval)});
    assert.equal(sixth.stage,'AGREED');assert.equal(sixth.round,6);
    assert.equal(fs.existsSync(localPath(root,'operation.lock')),false);
    expect('REVIEW_FORMAT',()=>parseVerdict({structured_output:{...approval,findings:changes.findings}}));
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    const failed=await runReview(root,{}, {spawn:(_command,args,options)=>{
      assert.equal(args.includes('--max-turns'),false);
      const child=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>queueMicrotask(()=>{
        fs.writeSync(options.stdio[1],'{not JSON');child.emit('close',0);
      });return child;
    }});
    assert.equal(failed.stage,'NEEDS_USER');assert.equal(failed.error.code,'REVIEW_FORMAT');
    assert.deepEqual(failed.review_history,[],'invalid JSON cannot fabricate approval');
    resolveReview(root,'retry','Разрешён повтор после ошибочного JSON');
    const errored=await runReview(root,{}, {spawn:(_command,args,options)=>{
      const child=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>queueMicrotask(()=>child.emit('close',1));return child;
    }});
    assert.equal(errored.stage,'NEEDS_USER');assert.equal(errored.error.code,'REVIEW_CLI_ERROR');
    assert.deepEqual(errored.review_history,[]);
    await assert.rejects(runReview(root,{}, {spawn:()=>assert.fail('must not launch twice')}),e=>e.code==='REVIEW_NOT_READY');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    state(root,{stage:'RUNNING',round:1,launch_id:'crashed-run',runner_pid:2147483647,
      requested_session_id:'saved-claude-session',claude_session_id:'saved-claude-session',review_history:[]});
    const crashed=reviewStatus(root);
    assert.equal(crashed.stage,'NEEDS_USER');assert.equal(crashed.error.code,'REVIEW_INTERRUPTED');
    assert.equal(reviewStatus(root).generation,crashed.generation,'repeated status is idempotent');
    await assert.rejects(runReview(root,{}, {spawn:()=>assert.fail('crash must not auto-spawn')}),e=>e.code==='REVIEW_NOT_READY');
    resolveReview(root,'retry','Разрешено восстановление потерянного runner');
    const recovered=await runReview(root,{}, {spawn:(_command,args,options)=>{
      assert.equal(args[args.indexOf('--resume')+1],'saved-claude-session');
      assert.equal(args.includes('--max-turns'),false);
      const child=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>queueMicrotask(()=>{
        fs.writeSync(options.stdio[1],JSON.stringify({subtype:'success',is_error:false,
          session_id:'saved-claude-session',modelUsage:{[REVIEW_MODEL]:{}},structured_output:approval}));child.emit('close',0);
      });return child;
    }});
    assert.equal(recovered.stage,'AGREED');assert.equal(recovered.round,2);
    assert.equal(recovered.claude_session_id,'saved-claude-session');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);const prepared=prepareReview(root,input);
    const dir=path.join(root,'.harness/runtime/plan-review',prepared.run_id);
    const result=await runReview(root,{}, {spawn:(_command,args,options)=>{
      const child=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>queueMicrotask(()=>{
        expect('REVIEW_BUSY',()=>setReviewEnabled(root,false));
        assert.equal(readReview(root).enabled,true,'a running review cannot be switched off');
        assert.ok(fs.existsSync(dir),'the running process output stays');
        fs.writeSync(options.stdio[1],JSON.stringify({subtype:'success',is_error:false,session_id:args[args.indexOf('--session-id')+1],modelUsage:{[REVIEW_MODEL]:{}},structured_output:{verdict:'approved',summary:'OK',findings:[]}}));
        child.emit('close',0);
      });return child;
    }});
    assert.notEqual(result.stage,'CANCELLED');assert.equal(readReview(root).enabled,true);
    assert.equal(readPlan(root).execution_scope_status,'NONE');
  }
  {
    const {root,scope,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    const result=await simulate(root,{...approval,findings:[{id:'M1',severity:'minor',status:'accepted_limitation',reason:'Живая приёмка остаётся пользователю.'}]});
    expect('REVIEW_RESPONSE',()=>publishReview(root));
    expect('REVIEW_RESPONSE',()=>createScope(root,scope));
    expect('REVIEW_RESPONSE',()=>prepareReview(root,{...input,response:authorPosition}));
    const before=readReview(root);
    for(const bad of [{round:2,disposition:'accept',position:authorPosition},
      {round:1,disposition:'accept',position:'Согласен'}, {round:1,disposition:'unknown',position:authorPosition}]){
      expect('REVIEW_RESPONSE',()=>respondReview(root,bad));assert.deepEqual(readReview(root),before);
    }
    assert.match(reviewSummary(root),/review:respond/,'recovery names the mandatory author command');
    write(root,'.harness/runtime/position.json',JSON.stringify({round:1,disposition:'accept',
      position:'Принимаю M1: живая приёмка остаётся пользователю; автоматическая проверка не заменяет её. Новых требований к исполнителю нет.'}));
    const cli=(...args)=>JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/workflow.mjs'),...args],{cwd:root,encoding:'utf8',stdio:'pipe'}));
    const saved=cli('review:respond','--input','.harness/runtime/position.json');
    const authorPath=path.join(result.run_directory,saved.author_file),original=fs.readFileSync(authorPath,'utf8');
    const author=JSON.parse(original);assert.match(author.position,/Принимаю M1/);
    assert.equal(author.round,1);assert.equal(author.plan_digest,result.plan_digest);
    assert.deepEqual(author.documents,result.documents);
    assert.equal(saved.round,1,'saving a final response starts no formal review round');
    write(root,path.relative(root,authorPath),'tampered');
    expect('REVIEW_RESPONSE_STALE',()=>publishReview(root));
    fs.writeFileSync(authorPath,original);
    assert.equal(cli('review:publish').ok,true,'a fresh CLI process publishes the unchanged approved pair');
    assert.equal(readReview(root).round,1);assert.equal(readReview(root).review_history.length,1);
    assert.ok(fs.existsSync(authorPath),'publication retains the final author position');
    startTask(root,'T001');assert.equal(fs.existsSync(result.run_directory),false);
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    const first=await simulate(root);
    respond(root,'revise','Одобрение получено, но добавлю важное условие: проверка на чистой системе остаётся пользователю. Оно будет в spec и критериях.');
    input.scope.tasks[0].acceptance_criteria.push('Чистую установку проверяет пользователь');
    write(root,'docs/planning/review.md','# Review fixture\nЧистую установку проверяет пользователь.\n');
    expect('REVIEW_REQUIRED',()=>publishReview(root));
    const revised=prepareReview(root,input);assert.equal(revised.run_id,first.run_id);
    expect('REVIEW_REQUIRED',()=>publishReview(root));
    const final=await simulate(root);assert.equal(final.round,2);
    expect('REVIEW_RESPONSE',()=>publishReview(root));
    respond(root,'accept','Принимаю итог: условие «Чистую установку проверяет пользователь» сохранено в docs/planning/review.md и критериях T001. Существенных разногласий нет.');
    const positions=readReview(root).review_history.map(r=>r.author_response.file);
    assert.equal(positions.length,2);assert.ok(positions.every(f=>fs.existsSync(path.join(final.run_directory,f))));
    publishReview(root);startTask(root,'T001');
    assert.equal(fs.existsSync(final.run_directory),false);
    assert.match(git(root,'show','HEAD:docs/planning/review.md'),/Чистую установку проверяет пользователь/);
    assert.ok(readPlan(root).tasks.find(t=>t.id==='T001').acceptance_criteria.includes('Чистую установку проверяет пользователь'));
  }
  for(const respondFirst of [true,false]) {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    if(respondFirst){
      await simulate(root);
      respond(root,'needs_user','Не согласен с достаточностью приёмки: требование пользователя конфликтует с автоматической проверкой. Нужно его решение о публикации с этим ограничением.');
    }else{
      // A needs_user verdict is an explicit author dispute, not an exhausted round counter.
      state(root,{max_rounds:1});
      await simulate(root,{verdict:'changes_requested',summary:'Нужен пользователь',findings:[{id:'F1',severity:'major',status:'open',reason:'Требование остаётся спорным.'}]});
      respond(root,'needs_user','F1 остаётся нерешённым существенным спором: автор просит отдельное решение пользователя перед публикацией.');
    }
    assert.equal(readReview(root).stage,'NEEDS_USER');
    expect('REVIEW_REQUIRED',()=>publishReview(root));
    expect('REVIEW_BUSY',()=>prepareReview(root,input));
    resolveReview(root,'publish','Пользователь явно разрешил публикацию с сохранённым спором.');
    if(!respondFirst)assert.equal(readReview(root).review_history.at(-1).author_response.disposition,'needs_user');
    assert.equal(publishReview(root).ok,true,'explicit user override permits an unresolved author/reviewer dispute');
    assert.equal(readReview(root).review_history.at(-1).author_response.disposition,'needs_user');
    startTask(root,'T001');
    assert.ok(readPlan(root).user_decisions.some(d=>d.text.includes('Пользователь явно разрешил публикацию с сохранённым спором.')),
      'the user override remains in the published plan after review cleanup');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);
    await simulate(root,approval,{fail:true});
    assert.equal(readReview(root).stage,'NEEDS_USER');assert.deepEqual(readReview(root).review_history,[]);
    expect('REVIEW_REQUIRED',()=>publishReview(root));
    expect('REVIEW_RESPONSE',()=>respondReview(root,{round:1,position:authorPosition,disposition:'accept'}));
    resolveReview(root,'publish','Пользователь разрешил публикацию после ошибки CLI без успешного отзыва.');
    assert.equal(publishReview(root).ok,true,'a failed CLI attempt creates no fictitious author-response obligation');
  }
  {
    const {root,input}=fixture();setReviewEnabled(root,true);prepareReview(root,input);await simulate(root);respond(root);
    prepareReview(root,input);await simulate(root,approval,{fail:true});
    assert.equal(readReview(root).review_history.length,1,'successful review survives a failed retry of the same pair');
    resolveReview(root,'publish','Пользователь разрешил публикацию после ошибки повторной проверки.');
    const s=readReview(root),author=s.review_history[0].author_response;
    write(root,path.join('.harness/runtime/plan-review',s.run_id,author.file),'overwritten');
    expect('REVIEW_RESPONSE_STALE',()=>publishReview(root));
    respond(root);assert.equal(publishReview(root).ok,true,'explicit override cannot bypass the earlier successful review response');
  }
  console.log('Plan review fixtures: author positions, unchanged approval, revised pair, user override, publication, OFF, SHA, retry, cleanup and crash recovery passed.');
} finally {for(const root of roots)fs.rmSync(root,{recursive:true,force:true});}
