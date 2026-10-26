import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha=value=>typeof value==='string'&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
const classes=['QUEUED_OBSERVED','MID_TURN','SDK_DEFERRED','REJECTED','UNKNOWN','ACCEPTED_UNREAD','INCONCLUSIVE'];
// Pure analysis uses server sequence only for causal server events. Frontend
// observations use a single mounted panel's monotonic clock, never arrival order.
export function analyzeCase({events,info,work,cycle,complete=true}){
  const issues=[];
  if(!complete||events.some(event=>['frontend.gap','diagnostic.gap'].includes(event.event_type)))issues.push('incomplete-journal');
  if(events.some(event=>event.event_type==='experiment.invalidated'&&event.case_id===info.case_id))issues.push('case-invalidated');
  if(events.filter(event=>event.event_type==='plan.permission'&&event.phase==='running'
    &&(!info.scope_id||event.scope_id===info.scope_id)).length>1)issues.push('repeated-start-or-continue');
  const selected=events.filter(event=>event.event_type==='experiment.fixture_hold'&&event.case_id===info.case_id);
  const ids=[...new Set(selected.map(event=>event.message_id))];
  if(ids.length!==2)issues.push('expected-two-results');
  const start=events.find(event=>event.event_type==='experiment.case_started'&&event.case_id===info.case_id);
  const end=events.find(event=>event.event_type==='experiment.checkpoint'&&event.case_id===info.case_id&&event.marker==='resume');
  const preserved=!!start&&!!end&&start.nonce===end.nonce&&work?.nonce===start.nonce&&work?.preserved===true
    &&work?.transcript_verified===true&&work?.original_turn_id&&work?.end_event_seq===end.seq;
  if(!preserved)issues.push('original-work-boundary-unproven');
  if(info.busy_kind==='generation'&&(!work?.generation_interval?.verified||!events.some(event=>event.event_type==='experiment.generation_candidate'&&event.case_id===info.case_id)))
    issues.push('generation-unproven');
  if(info.busy_kind==='read-only-command'&&!events.some(event=>event.event_type==='experiment.command_observed'&&event.case_id===info.case_id
    &&event.command_hash===work?.command_hash&&event.command_id===work?.command_id))issues.push('probe-unproven');
  const time=event=>Date.parse(event?.at??event?.server_time??event?.server_received_at??'');
  const messages=ids.map(id=>{
    const all=events.filter(event=>event.message_id===id),pick=type=>all.filter(event=>event.event_type===type);
    const admitted=pick('experiment.dispatch_admitted')[0],invocations=pick('sdk.invoked'),invoke=invocations[0];
    const accepted=pick('sdk.accepted')[0],rejected=pick('sdk.rejected')[0],report=pick('send.report')[0],read=pick('message.read')[0];
    const effect=cycle?.results?.find(result=>result.message_id===id),turn=work?.reads?.find(value=>value.message_id===id);
    const refs=all.map(event=>event.seq),local=[];
    let classification='INCONCLUSIVE';
    if(invocations.length>1)local.push('duplicate-sdk-invocation');
    if(admitted&&(!admitted.snapshot?.busy||!admitted.snapshot?.sdk_document_ready||admitted.snapshot.manual_stopped||admitted.snapshot.draft_present))local.push('unsafe-admission');
    if(invoke&&(!admitted||invoke.delivery_attempt_id!==admitted.delivery_attempt_id||invoke.case_id!==info.case_id))local.push('attempt-unproven');
    const acceptedInWindow=accepted&&invoke&&accepted.panel_instance_id===invoke.panel_instance_id
      &&accepted.delivery_attempt_id===invoke.delivery_attempt_id&&accepted.duration_ms>=invoke.duration_ms
      &&accepted.duration_ms-invoke.duration_ms<=120000;
    // Arrival of buffered telemetry can follow read. The export must contain
    // an explicit transcript boundary tying read to an observed model turn.
    const offset=work?.panel_clock?.offset_ms??0;
    const endMs=time(end),acceptedMs=Date.parse(accepted?.client_time??'')+offset,invokeMs=Date.parse(invoke?.client_time??'')+offset;
    const clock=work?.panel_clock?.panel_instance_id===invoke?.panel_instance_id&&work?.panel_clock?.verified===true;
    const beforeEnd=clock&&acceptedInWindow&&acceptedMs<endMs&&invokeMs<endMs;
    const sameTurn=read&&turn?.turn_id===work?.original_turn_id;
    for(const pull of pick('experiment.model_pull'))if(pull.before_intent||!clock||time(pull)<invokeMs)local.push('early-or-unproven-model-pull');
    const nextTurn=read&&turn?.turn_id&&turn.turn_id!==work?.original_turn_id&&turn.evidence_verified===true
      &&read.seq>end?.seq;
    const exact=effect?.effect_count===1&&sha(effect.source_commit)&&effect.source_commit===selected.find(event=>event.message_id===id)?.source_commit
      &&effect.accepted_source_commit===effect.source_commit&&sha(effect.integration_commit)&&effect.git_verified===true;
    if(rejected||report?.outcome==='rejected')classification='REJECTED';
    else if(pick('sdk.timeout').length||pick('sdk.error').length||pick('send.unknown').length||report?.outcome==='unknown')classification='UNKNOWN';
    else if(accepted&&!read)classification='ACCEPTED_UNREAD';
    else if(read&&sameTurn)classification='MID_TURN';
    else if(acceptedInWindow&&clock&&acceptedMs>=endMs)classification='SDK_DEFERRED';
    else if(beforeEnd&&nextTurn&&preserved&&exact&&invocations.length===1&&!issues.length&&!local.length)classification='QUEUED_OBSERVED';
    if(read&&!invoke)local.push('early-read-or-model-pull');
    if(!clock)local.push('clock-domains-unproven');
    if(!exact)local.push('exact-sha-or-single-effect-unproven');
    if((issues.length||local.length)&&!['REJECTED','UNKNOWN'].includes(classification))classification='INCONCLUSIVE';
    return {message_id:id,classification,refs,issues:local,sdk_accepted:!!accepted,read:!!read,
      read_calls:pick('read.requested').length,exact_sha_single_effect:!!exact,
      late_events:all.filter(event=>event.event_type.startsWith('sdk.late_')).map(event=>event.seq)};
  });
  const completeCycle=cycle?.verified===true&&cycle?.tasks?.length>=4&&cycle.tasks.every(task=>task.commit_status==='DONE'&&sha(task.integration_commit))
    &&new Set(cycle.tasks.map(task=>task.id)).size===cycle.tasks.length&&cycle.cleanup?.only_main===true
    &&cycle.cleanup?.pending?.length===0&&cycle.clean_main===true&&cycle.commands_idle===true
    &&cycle.terminal_receipts?.length>=4&&cycle.terminal_receipts.every(receipt=>receipt.read&&receipt.yielded&&receipt.transport_closed)
    &&events.some(event=>event.event_type==='plan.permission'&&event.phase==='complete');
  const priority=['UNKNOWN','REJECTED','INCONCLUSIVE','MID_TURN','SDK_DEFERRED','ACCEPTED_UNREAD'];
  const classification=priority.find(value=>messages.some(message=>message.classification===value))
    ??(messages.length===2&&!issues.length?'QUEUED_OBSERVED':'INCONCLUSIVE');
  return {case_id:info.case_id,busy_kind:info.busy_kind,classification,issues,messages,old_work_preserved:!!preserved,
    full_cycle:!!completeCycle,go:classification==='QUEUED_OBSERVED'&&!!completeCycle,classes};
}

async function readFile(root,relative){
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))throw Error('Unsafe evidence path');
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Unsafe evidence path');
  let current=root;
  for(const part of relative.split('/')){current=path.join(current,part);const stat=await fs.lstat(current);if(stat.isSymbolicLink())throw Error('Evidence symlink');}
  const stat=await fs.stat(file);if(!stat.isFile()||stat.size>32*1024*1024)throw Error('Evidence file size/type');
  return fs.readFile(file);
}
export function verifyCycleEvidence(raw,events){
  if(raw?.schema!==1||!Array.isArray(raw.plan?.tasks)||!Array.isArray(raw.assignments)||!Array.isArray(raw.git?.commits))return {verified:false};
  const commits=new Map(raw.git.commits.map(commit=>[commit.sha,commit]));
  const reachable=new Set(),visit=[raw.git.head];
  while(visit.length){const id=visit.pop();if(reachable.has(id))continue;reachable.add(id);visit.push(...(commits.get(id)?.parents??[]));}
  const results=[],terminal_receipts=[],tasks=[];
  for(const task of raw.plan.tasks){
    const assignment=raw.assignments.find(item=>item.task_id===task.id),result=assignment?.dialogue?.result,acceptance=assignment?.dialogue?.acceptance;
    if(!assignment||!result||!acceptance)return {verified:false};
    const integration=assignment.integration_commit,merge=commits.get(integration);
    const matching=raw.git.commits.filter(commit=>commit.task_id===task.id&&commit.role==='integration'&&reachable.has(commit.sha));
    const ancestry=new Set(),todo=[integration];while(todo.length){const id=todo.pop();if(ancestry.has(id))continue;ancestry.add(id);todo.push(...(commits.get(id)?.parents??[]));}
    const git_verified=reachable.has(integration)&&ancestry.has(result.source_commit)&&merge?.role==='integration'&&matching.length===1;
    results.push({message_id:result.message_id,source_commit:result.source_commit,accepted_source_commit:acceptance.source_commit,
      integration_commit:integration,effect_count:matching.length,git_verified});
    tasks.push({id:task.id,commit_status:task.commit_status,integration_commit:integration});
    const receipt=type=>events.some(event=>event.event_type===type&&event.message_id===acceptance.message_id);
    terminal_receipts.push({read:receipt('message.read'),yielded:receipt('message.yielded'),
      transport_closed:receipt('assignment.transport_closed')&&assignment.transport_closed===true});
  }
  return {verified:tasks.length>=4&&results.every(result=>result.git_verified),results,tasks,terminal_receipts,
    cleanup:raw.cleanup,clean_main:raw.git.status_porcelain===''&&raw.git.worktrees?.length===1,
    commands_idle:Array.isArray(raw.commands)&&raw.commands.every(command=>command.state==='completed')};
}
export async function analyzeFolder(directory){
  const root=await fs.realpath(directory),json=async file=>JSON.parse(await readFile(root,file));
  const info=await json('experiment-info.json'),baseline=await json('baseline-info.json'),manifest=await readFile(root,'release-manifest.json');
  let pages;
  try{pages=await json('export-pages.json');}catch(error){
    if(error.code!=='ENOENT')throw error;
    const summary=await json('export-summary.json'),jsonl=(await readFile(root,'communication.jsonl')).toString('utf8');
    let cursor=0,paginated=summary.complete===true&&Array.isArray(summary.pages)&&summary.pages.length>0;
    for(const page of summary.pages??[]){if(page.after_seq!==cursor||page.through_seq<cursor)paginated=false;cursor=page.through_seq;}
    paginated&&=cursor===summary.through_seq;
    pages=[{summary:{...summary,page_from:0},jsonl,through_seq:summary.through_seq,after_seq:cursor,complete:paginated}];
  }
  const work=await json('work-proof.json');let cycle=await json('cycle-proof.json');
  const events=[];let cursor=0,through=pages[0]?.through_seq,complete=Array.isArray(pages)&&pages.length>0;
  for(const page of pages){
    if(page.summary?.page_from!==cursor||page.through_seq!==through||page.summary?.visibility!=='whole-run'
      ||page.summary?.build_id!==info.build_id)complete=false;
    const entries=(page.jsonl??'').split('\n').filter(Boolean).map(line=>JSON.parse(line));
    for(const event of entries){if(event.seq!==events.length+1)complete=false;events.push(event);}
    cursor=page.after_seq;
  }
  complete&&=cursor===through&&pages.at(-1)?.complete===true&&events.length===through;
  const release=JSON.parse(manifest),baselineValid=baseline.version==='0.5.36'&&baseline.sourceCommit==='b24b82b21208622e61ef7ab80e6ce3e5266d0fe8'
    &&baseline.manifest_sha256==='6e32d95e700d1e5cf93fc25a971b979a1261b0a48f0d6e6adb39b5cd4815cd84';
  if(digest(manifest)!==info.manifest_sha256||release.sourceCommit!==info.sourceCommit||!baselineValid)complete=false;
  if(info.evidence_kind==='live'&&(!info.project_id||!info.scope_id||!info.recipient_session_id
    ||!/^ui:\/\/workflow-pilot\/panel-[a-f0-9]{64}\.html$/.test(info.resource_uri??'')||info.protocol_version!==5
    ||!events.some(event=>event.event_type==='experiment.armed'&&event.scope_id===info.scope_id)&&info.mode!=='off'
    ||pages.some(page=>page.summary?.protocol_version!==info.protocol_version
      ||['ext_apps','mcp_extensions','mcp'].some(key=>!info.sdk_versions?.[key]||page.summary.sdk_versions?.[key]!==info.sdk_versions[key]))||!info.sdk_versions))complete=false;
  for(const proof of [work,cycle]){
    proof.verified=false;
    if(proof.evidence_file&&proof.evidence_sha256){const bytes=await readFile(root,proof.evidence_file);proof.verified=digest(bytes)===proof.evidence_sha256;
      if(proof===cycle)cycle=proof.verified?verifyCycleEvidence(JSON.parse(bytes),events):{verified:false};}
  }
  work.transcript_verified=work.verified;
  const result=analyzeCase({events,info,work,cycle,complete});
  if(info.mode==='off'){
    const cleanControl=complete&&!events.some(event=>event.event_type.startsWith('experiment.')||event.event_type==='send.unknown'
      ||event.event_type==='send.report'&&event.outcome!=='accepted');
    return {schema:1,mode:'off',evidence_kind:info.evidence_kind??'unverified',experiment_id:info.experiment_id,
      build_id:info.build_id,sourceCommit:info.sourceCommit,manifest_sha256:info.manifest_sha256,
      full_cycle:cleanControl&&result.full_cycle,issues:cleanControl?[]:['control-incomplete-or-experimental'],
      limitation:'The off control is derived from complete export and verified Kit/Git/terminal records.'};
  }
  let preliminary_go_verified=false;
  if(info.busy_kind==='read-only-command'){
    const observed=events.find(event=>event.event_type==='experiment.command_observed'&&event.case_id===info.case_id);
    const bytes=await readFile(root,'preliminary-go.json'),preliminary=JSON.parse(bytes);
    preliminary_go_verified=observed?.preliminary_go===digest(bytes)&&preliminary.preliminary_go===true
      &&preliminary.build_id===info.build_id&&preliminary.sourceCommit===info.sourceCommit&&preliminary.manifest_sha256===info.manifest_sha256;
  }
  return {schema:1,evidence_kind:info.evidence_kind??'unverified',experiment_id:info.experiment_id,build_id:info.build_id,
    sourceCommit:info.sourceCommit,manifest_sha256:info.manifest_sha256,hidden_no_executor_visits:info.hidden_no_executor_visits===true,
    ...result,preliminary_go_verified,input_digests:{events:digest(Buffer.from(JSON.stringify(events))),work:digest(Buffer.from(JSON.stringify(work))),cycle:digest(Buffer.from(JSON.stringify(cycle)))}};
}
export function aggregateAnalyses(reports,control){
  const ids=reports.map(report=>report.case_id),common=reports[0];
  const valid=reports.length>=3&&new Set(ids).size===ids.length&&reports.every(report=>report.schema===1&&report.evidence_kind==='live'
    &&report.go&&report.build_id===common.build_id&&report.sourceCommit===common.sourceCommit&&report.manifest_sha256===common.manifest_sha256
    &&report.experiment_id===common.experiment_id);
  const primary=reports.filter(report=>['tool-wait','generation'].includes(report.busy_kind));
  const preliminary=!!valid&&control?.schema===1&&control.evidence_kind==='live'&&control.mode==='off'&&control.full_cycle===true
    &&control.build_id===common.build_id&&control.sourceCommit===common.sourceCommit&&control.manifest_sha256===common.manifest_sha256
    &&primary.length>=3&&primary.some(report=>report.busy_kind==='tool-wait')&&primary.some(report=>report.busy_kind==='generation')
    &&primary.some(report=>report.hidden_no_executor_visits);
  return {schema:1,experiment_id:common?.experiment_id,build_id:common?.build_id,sourceCommit:common?.sourceCommit,
    manifest_sha256:common?.manifest_sha256,preliminary_go:preliminary,
    go:preliminary&&reports.some(report=>report.busy_kind==='read-only-command'&&report.preliminary_go_verified),cases:reports.map(report=>({case_id:report.case_id,
      classification:report.classification,full_cycle:report.full_cycle,go:report.go})),limitation:'Evidence exports and supplied transcript/Git records are analyzed; this tool does not observe ChatGPT or grant execution.'};
}
export function analysisMarkdown(result){
  return '# SDK busy recipient\n\n'+(result.go?'GO':'NO-GO / INCONCLUSIVE')+'\n\n'+
    (result.messages??result.cases??[]).map(item=>'- '+(item.message_id??item.case_id)+': '+item.classification).join('\n')+
    '\n\nFull cycle: '+(result.full_cycle??'per case')+'.\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),markdown=args.includes('--markdown');if(markdown)args.splice(args.indexOf('--markdown'),1);let result;
  if(args[0]==='--aggregate'){
    const [control,...reports]=await Promise.all(args.slice(1).map(async file=>JSON.parse(await fs.readFile(file))));
    result=aggregateAnalyses(reports,control);
  }else result=await analyzeFolder(args[0]);
  // Output only; the source folder and application are never mutated.
  process.stdout.write(markdown?analysisMarkdown(result):JSON.stringify(result,null,2)+'\n');
}
