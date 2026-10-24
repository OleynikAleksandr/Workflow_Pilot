import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ContextCache } from '../src/control/context/context-cache.mjs';
import { ContextSession, externalClientLine, packetMatchesProject, startupMessage as panelStartupMessage, orchestratorStartupContext } from '../src/control/context/context-session.mjs';
import {legacyAttachmentMessage as startupMessage} from '../src/control/context/legacy-attachment-message.mjs';
const invitation={context_transport:'panel',enrollment_ticket:'a'.repeat(64)};
import * as contextSessionModule from '../src/control/context/context-session.mjs';
import { EXECUTOR_TOOL_RULES } from '../src/execution/runtime/service.mjs';

const project={workspace:'/Projects/Мой проект',projectId:'id-1',name:'Мой проект',planRevision:7,scopeId:'scope-1',
  scopeStatus:'ACTIVE',deliveryStatus:'IN_PROGRESS',nextTaskId:'T001',nextTaskTitle:'Read',sessionId:'session-1', experience:'chat',
  chatUrl:'https://chatgpt.com/c/aaaaaaaa',attempt:null,receipt:null};
const facts={project_id:project.projectId,project_name:project.name,plan_revision:7,scope_id:'scope-1',
  execution_scope_status:'ACTIVE',delivery_status:'IN_PROGRESS',task_id:'T001',task_title:'Read'};
const now=2000000;
function packet(){
  const context='ПОЛНЫЙ КОНТЕКСТ\nОписание проекта\nПлан\n\nНезавершённые изменения\nКОНЕЦ';
  return {delivery_protocol:'inline-context-v1',ack_required:false,status:'ready',completeness:'COMPLETE',workspace:project.workspace,session_id:project.sessionId,plan_id:project.scopeId,
    parts:[{index:1,total:1,text:context,bytes:Buffer.byteLength(context),sha256:createHash('sha256').update(context).digest('hex')}],
    context,context_bytes:Buffer.byteLength(context),context_sha256:createHash('sha256').update(context).digest('hex'),
    generated_at_ms:now,signature:'signature',head:'head',facts:{...facts}};
}
test('the first message contains the exact complete packet and asks for a short project reply without tools',()=>{
  const p=packet(), text=startupMessage(project,'unique-request',p);
  assert.ok(text.includes(JSON.stringify({recipient_session_id:project.sessionId})));
  assert.match(text,/получатель продолжения, не владелец плана/);
  assert.ok(!text.includes(p.context));
  assert.ok(text.includes('Читай каждое вложение отдельно одним вызовом'));
  assert.ok(text.includes('при признаках обрезки дочитай'));
  assert.ok(text.includes('выведи список /mnt/data и открой файл по фактическому имени'));
  assert.ok(text.includes('Не подтверждай восстановление, пока не прочитаны все части'));
  assert.ok(text.includes('Инструменты чтения вложений разрешены'));
  for(const item of ['"/Projects/Мой проект"','session-1','unique-request','коротко подтверди','опиши назначение проекта','не вызывай MCP проекта'])assert.ok(text.includes(item));
  for(const name of ['workflow_context_recover','workflow_context_ack','workflow_context_hook'])assert.ok(!text.includes(name));
  assert.equal(packetMatchesProject(p,project),true);
  assert.equal(packetMatchesProject({...p,session_id:'legacy-other',plan_id:'historical-plan'},project),true);
  assert.equal(packetMatchesProject(p,{...project,planRevision:8}),false);
  assert.ok(!text.includes('plan:prepare')); // Kit owns workflow rules.
  for (const rule of ['Не запускай codex exec', 'других модельных агентов', 'не делегируй им работу',
    'если пользователь прямо этого не попросил', 'локальный исполнитель MCP без модельных запросов разрешён'])
    assert.ok(text.includes(rule), rule);
  // 0.6.90: the model may look at the screen but must not drive the interface, also through shell commands.
  assert.ok(text.includes('Интерфейсом компьютера не управляй: не двигай мышь, не нажимай клавиши и не переключай окна — ни инструментами, ни командами (osascript, System Events, cliclick и подобными). Список окон и снимки экрана и окна (`computer_list_windows`, `computer_capture_screen`, `computer_capture_window`) разрешены. Живую проверку интерфейса выполняет пользователь.'));
});

test('automatic bootstrap reads recovery then opens only its panel; an executor does not start work in that turn',()=>{
  const invitation={enrollment_ticket:'a'.repeat(64),expires_at:now+1000};
  for(const experience of ['chat','work']){
    const origin=startupMessage({...project,experience,role:'orchestrator'},'request',packet(),[],invitation);
    assert.match(origin,/кроме единственного вызова workflow_pilot_panel/);
    assert.ok(origin.includes(JSON.stringify({enrollment_ticket:invitation.enrollment_ticket})));
    assert.match(origin,/После полного чтения recovery/);assert.match(origin,/публикация плана не запускают выполнение/);
  }
  const worker=startupMessage({...project,role:'executor',assignmentId:'assignment',taskId:'T001',parentWorkspace:'/main'},'request',packet(),[],invitation);
  assert.match(worker,/заверши загрузочный ход/);assert.match(worker,/не вызывай task:start/);
  assert.doesNotMatch(worker,/прочитай пакет и приступай|После чтения всех вложений выполни/);
  assert.match(worker,/Не обходи подтверждения самого ChatGPT/);
});

test('dialogue executor bootstrap carries only rules and identity and requires its panel invitation',()=>{
  const worker={...project,role:'executor',assignmentId:'assignment',taskId:'T001',parentWorkspace:'/main'};
  const p={...packet(),recovery_profile:'assignment-dialogue-v1'};
  const text=startupMessage(worker,'request',p,[],{enrollment_ticket:'c'.repeat(64)});
  assert.match(text,/workflow_pilot_panel/);assert.match(text,/task:start и реализация запрещены/);
  assert.match(text,/Оркестратор отдельно пришлёт task/);assert.match(text,/результат обязательно отправь ему/);assert.ok(text.includes(worker.workspace));
  assert.doesNotMatch(text,/ПОЛНЫЙ КОНТЕКСТ|полного чтения recovery|опиши назначение проекта/);
  assert.throws(()=>startupMessage(worker,'request',p),{code:'ASSIGNMENT_BOOTSTRAP_REQUIRED'});
});

test('every start names its parts with a short fragment of its own request id', () => {
  const { contextPartName } = contextSessionModule;
  const part = { index: 1, total: 5 };
  const first = contextPartName(part, 'wp-request-b8f5450a-cd1b-4c5f-9ea3-1a3004dca278');
  const second = contextPartName(part, 'wp-request-0c9e7d21-5a4b-4c3d-8e2f-6a7b8c9d0e1f');
  assert.equal(first, 'context-b8f5450a-01-of-5.md');
  assert.equal(second, 'context-0c9e7d21-01-of-5.md');
  assert.notEqual(first, second);
  assert.equal(contextPartName({ index: 12, total: 12 }, 'wp-request-b8f5450a-cd1b'), 'context-b8f5450a-12-of-12.md');
  assert.throws(() => contextPartName(part, ''), /request id/);
});

test('ordinary session contract defines one verified microtask per reply without an PlanContinuation protocol', () => {
  const p = packet(), text = startupMessage(project, 'contract-request', p);
  assert.ok(!text.includes('Delivery-порядок'));
  assert.ok(!text.includes(p.context), 'recovery is delivered only in attachments');
  assert.doesNotMatch(text, /PlanContinuation|автовыполнения|Готов продолжать\.|Нужен ваш ответ\.|План завершён\./);
  assert.equal(startupMessage({ ...project, planContinuationEnabled: true }, 'contract-request', p),
    startupMessage({ ...project, planContinuationEnabled: false }, 'contract-request', p));
});

test('executor tool rules join the session rules of the start message; without them the text is the former one', () => {
  const p = packet(), plain = startupMessage(project, 'rules-request', p), text = startupMessage(project, 'rules-request', p, EXECUTOR_TOOL_RULES);
  assert.equal(EXECUTOR_TOOL_RULES.length, 3);
  for (const item of ['rg в exec_command', 'apply_patch и не перечитывай их после успешного патча',
    'OpenAI заблокировал вызов инструмента до выполнения', 'повтори тот же вызов один раз без изменений',
    'не уводи в фон через & или nohup', 'опрашивай эту сессию через write_stdin', 'не запускай команду повторно'])
    assert.ok(text.includes(item), item);
  assert.equal(text.replace(EXECUTOR_TOOL_RULES.join('\n') + '\n', ''), plain, 'only the executor rule lines are added');
  assert.ok(text.indexOf(EXECUTOR_TOOL_RULES[1]) < text.indexOf('Вложения содержат'), 'rules precede attachment instructions');
  assert.ok(!text.includes(p.context), 'packet is carried by separate files');
  for (const name of ['workflow_context_recover', 'part=1', 'ключом after']) assert.ok(!text.includes(name), name);
  assert.equal(contextSessionModule.mcpStartMessage, undefined, 'the short MCP start message is gone');
});

test('the line for an external client names the folder, AGENTS.md and the recovery file and carries no secrets', () => {
  const line = externalClientLine({ name: 'Мой проект', workspace: '/Projects/Мой "проект"' }, 'darwin');
  assert.equal(line, [
    'Проект «Мой проект». Папка проекта (точная абсолютная папка, JSON-строка): "/Projects/Мой \\"проект\\"".',
    'Работай в этой папке. Сначала прочитай в ней AGENTS.md.',
    'Затем получи контекст проекта: выполни в папке проекта команду ./scripts/workflow recover --format text > .harness/runtime/recovery.txt и прочитай файл .harness/runtime/recovery.txt целиком, по частям, если он не помещается в один ответ инструмента.',
    'После этого коротко подтверди, что контекст получен, и в одном-двух предложениях опиши назначение проекта и текущее состояние плана.',
  ].join('\n'));
  const windows = externalClientLine({ name: 'Demo', workspace: 'C:\\Projects\\Demo' }, 'win32');
  assert.ok(windows.includes('"C:\\\\Projects\\\\Demo"'), 'the folder is a JSON string');
  assert.ok(windows.includes('scripts\\workflow.cmd recover --format text > .harness\\runtime\\recovery.txt'));
  assert.ok(windows.includes('прочитай файл .harness\\runtime\\recovery.txt целиком'));
  for (const text of [line, windows]) {
    assert.doesNotMatch(text, /https?:\/\/|tunnel_|sk-|mcp|session|wp-request/i, 'no connector address, key or session data');
    assert.ok(Buffer.byteLength(text) < 1200);
  }
});

test('the startup role follows the session table and Kit 1.9.8 leaves the mode to the user', () => {
  const packet = { facts: {}, parts: [] };
  const text = orchestratorStartupContext({ name: 'P', workspace: '/p', sessionId: 's1', role: 'planning', modeSupported: true, scopeStatus: 'NONE' }, packet);
  assert.match(text, /Роль сессии: планирование/);
  assert.match(text, /выбирает пользователь: когда спецификация готова, вызови plan:mode-request/);
  assert.doesNotMatch(text, /объясни выбранный способ/);
  const old = orchestratorStartupContext({ name: 'P', workspace: '/p', sessionId: 's1', role: 'orchestrator', scopeStatus: 'NONE' }, packet);
  assert.match(old, /Роль сессии: оркестратор/);assert.match(old, /объясни выбранный способ/, 'an older Kit keeps its wording');
});

const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function urlFixture({attempt=null,chatUrl=null}={}){
  let saved={...structuredClone(project),chatUrl,attempt},clock=now,serial=0;
  const info={...project},order=[],starts=[],bindings=[];
  const snap={id:'browser',incarnation:'incarnation',epoch:1,navigationSequence:0,navigationOwner:null};
  const page={url:chatUrl??'https://chatgpt.com/',documentId:'preflight',accountStatus:'signed-in',
    editorAvailable:true,writable:true,draftLength:0,busy:false};
  const store={selected:()=>structuredClone(saved),project:()=>structuredClone(saved),
    inspect:async()=>{const {attempt,chatUrl,receipt,...p}=info;return structuredClone(p);},
    updateSession:async(_w,_s,p)=>{Object.assign(saved,structuredClone(p));return structuredClone(saved);},
    patchAttempt:async(_w,_s,expected,patch)=>{
      if(expected? saved.attempt?.requestId!==expected.requestId||saved.attempt?.attemptGeneration!==expected.attemptGeneration:!!saved.attempt)return null;
      const delta=typeof patch==='function'?patch(structuredClone(saved.attempt)):patch;
      saved.attempt={...saved.attempt,...structuredClone(delta)};order.push('save:'+saved.attempt.state);return structuredClone(saved);
    },bindChat:async(_w,_s,url,options)=>{if(options?.isCurrent&&!options.isCurrent())return null;
      bindings.push(url);saved.chatUrl=url;return structuredClone(saved);}};
  let evidence=null,complete=false;
  const runtime={ensure:async()=>order.push('ensure'),loadContext:async()=>packet(),
    prepareBootstrap:async(p,c)=>{order.push('reserve');return {...invitation,run_id:'run',ticket_hash:'b'.repeat(64),expires_at:clock+1800000,...c};},
    stageStartup:async(p,a)=>{order.push('stage');assert.ok(a.startupText.includes(packet().context));return {message_id:'message'};},
    enrollmentProgress:async()=>evidence,startupProgress:()=>({complete}),
    cancelStartup:async()=>{order.push('revoke');return {status:evidence?.participant_id?'registered-stopped':'revoked'};}};
  const composer={getURL:()=>page.url,navigationSnapshot:()=>({...snap}),inspect:async()=>({...page}),
    openChatEntrypoint:async()=>{order.push('root');page.url='https://chatgpt.com/';page.documentId='new-root';snap.epoch++;},
    deliver:async()=>{throw Error('DOM Send is forbidden');},clearNewSessionDraft:async()=>{throw Error('Draft clearing is forbidden');},
    startChat:async input=>{assert.equal(input.canContinue(),true);order.push('q');starts.push(input);
      assert.ok(saved.attempt.contextRef);assert.equal(saved.attempt.state,'sending');assert.equal(saved.attempt.sendStartedAtMs,clock);
      snap.epoch++;snap.navigationSequence++;snap.navigationOwner=input.navigationToken;page.url=input.url;
      return true;}};
  const controller=new ContextSession({store,runtime,composer,now:()=>clock,uuid:()=>String(++serial).padStart(8,'0'),wait:async()=>{}});
  controller.attach(saved);
  const proof=()=>{evidence={status:'active',participant_id:'member',run_id:'run',ticket_hash:'b'.repeat(64),
    request_id:saved.attempt.requestId,attempt_generation:saved.attempt.attemptGeneration};return evidence;};
  const navigate=async(url=project.chatUrl,extra={})=>{snap.navigationSequence++;page.url=url;
    await controller.observeNavigation({type:'navigated',url,isMainFrame:true,navigationKind:'in-page',navigationSequence:snap.navigationSequence,
      navigationOwner:snap.navigationOwner,snapshot:{...snap},...extra});};
  const observe=async(extra={})=>{page.documentId='postflight';Object.assign(page,extra);
    await controller.observePage({documentId:page.documentId,state:{...page,login:page.accountStatus}}, {...snap});};
  return {controller,store,runtime,composer,page,snap,info,order,starts,bindings,proof,navigate,observe,
    get saved(){return saved;},setEvidence:e=>{evidence=e;},setComplete:()=>{complete=true;},advance:ms=>{clock+=ms;}};
}

test('URL bootstrap stages full role context and saves checkpoint before exactly one short q',async()=>{
  for(const role of ['discussion','orchestrator','executor']){
    const f=urlFixture();f.info.role=role;if(role==='executor')f.info.assignmentId='assignment';
    await f.controller.tick();await settle();
    assert.equal(f.starts.length,1);assert.ok(f.order.indexOf('stage')<f.order.indexOf('q'));
    const u=new URL(f.starts[0].url);assert.deepEqual([...u.searchParams.keys()],['q']);
    assert.equal(u.searchParams.get('q'),panelStartupMessage(project,'unused',packet(),[],invitation));
    assert.doesNotMatch(u.searchParams.get('q'),/ПОЛНЫЙ КОНТЕКСТ|wp-request|session-1/);
    assert.doesNotMatch(JSON.stringify(f.saved.attempt),new RegExp(invitation.enrollment_ticket));
    assert.doesNotMatch(JSON.stringify(f.controller.state),/ПОЛНЫЙ КОНТЕКСТ|enrollment_ticket/);
    assert.equal(f.saved.attempt.state,'sending');assert.equal(f.controller.state.phase,'waiting-registration');
    await f.controller.retry();assert.equal(f.starts.length,1);
  }
});
test('URL alone is never sent; exact durable registration is sent; URL and signed-in observation bind independently',async()=>{
  for(const registrationFirst of [false,true]){
    const f=urlFixture();await f.controller.tick();await settle();
    if(registrationFirst){f.proof();await f.controller.tick();assert.equal(f.saved.attempt.state,'sent');assert.equal(f.saved.chatUrl,null);}
    await f.navigate();await f.controller.tick();
    if(!registrationFirst)assert.equal(f.saved.attempt.state,'sending');
    assert.equal(f.saved.chatUrl,null,'mode observation is still required');
    await f.observe();f.proof();await f.controller.tick();
    assert.equal(f.saved.attempt.state,'sent');assert.equal(f.saved.chatUrl,project.chatUrl);assert.equal(f.bindings.length,1);
    f.setComplete();await f.controller.tick();assert.equal(f.controller.state.phase,'delivered');
    f.controller.attach(f.saved);await f.controller.tick();assert.equal(f.starts.length,1);assert.equal(f.bindings.length,1);
  }
});
test('unrelated, old, revoked and uncorrelated registrations cannot confirm sent',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();const good=f.proof();
  for(const delta of [{request_id:'old'},{attempt_generation:'old'},{ticket_hash:'c'.repeat(64)},{run_id:'other'},
    {status:'revoked'},{participant_id:null},{request_id:undefined}]){
    f.setEvidence({...good,...delta});await f.controller.tick();assert.equal(f.saved.attempt.state,'sending');
  }
});
test('persistent T1/T2 expire independently; restart never resets the deadline or repeats q',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();f.advance(60001);await f.controller.tick();
  assert.equal(f.controller.state.addressOverdue,true);assert.equal(f.saved.attempt.state,'sending');
  f.controller.attach(f.saved);f.advance(120000);await f.controller.tick();assert.equal(f.saved.attempt.state,'unknown');
  await f.controller.retry();assert.equal(f.starts.length,1);f.proof();await f.controller.tick();assert.equal(f.saved.attempt.state,'sent');
});
test('a durable sent receipt survives a missing enrollment reader after restart without querying or resending',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();f.proof();await f.controller.tick();
  delete f.runtime.enrollmentProgress;f.controller.attach(f.saved);await f.controller.tick();
  assert.equal(f.saved.attempt.state,'sent');assert.equal(f.controller.state.messageSent,true);assert.notEqual(f.controller.state.phase,'send-unknown');
  assert.equal(f.starts.length,1);
});
test('all preflight unknowns preserve draft and block reserve and q',async()=>{
  for(const [key,value,phase] of [['accountStatus','unknown','waiting-login'],['accountStatus','signed-out','waiting-login'],
    ['documentId',null,'waiting-composer'],
    ['draftLength',4,'waiting-draft'],['draftLength',undefined,'waiting-draft'],['busy',true,'waiting-generation'],
    ['writable',false,'waiting-composer'],['editorAvailable',false,'waiting-composer']]){
    const f=urlFixture();f.page[key]=value;await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt,null);
    assert.equal(f.controller.state.phase,phase);
  }
});
test('composer on an old conversation is not evidence of the new-chat draft',async()=>{
  const f=urlFixture();f.page.url=project.chatUrl;await f.controller.tick();assert.deepEqual(f.order,['root']);
  f.page.draftLength=5;await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.controller.state.phase,'waiting-draft');
});
test('plan, account, document, draft, fingerprint and expiry changes during staging revoke before q',async()=>{
  for(const change of [f=>f.info.planRevision++,f=>f.page.accountStatus='unknown',
    f=>f.page.documentId='replacement',f=>f.page.draftLength=3,f=>f.snap.epoch++,f=>f.advance(1800001)]){
    const f=urlFixture(),stage=f.runtime.stageStartup;f.runtime.stageStartup=async(...args)=>{const m=await stage(...args);change(f);return m;};
    await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt.cancelState,'revoked');
  }
  const f=urlFixture();let key='a';const cache=new ContextCache({load:async()=>packet(),inputKey:async()=>key});f.controller.contextCache=cache;
  const stage=f.runtime.stageStartup;f.runtime.stageStartup=async(...a)=>{const m=await stage(...a);key='b';return m;};
  await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt.cancelState,'revoked');
});
test('wrong or incomplete context and failed readiness stop before reserve',async()=>{
  for(const bad of [{status:'incomplete'}, {workspace:'/other'}, {facts:{}}]){
    const f=urlFixture();f.runtime.loadContext=async()=>({...packet(),...bad});await f.controller.tick();assert.equal(f.starts.length,0);
    assert.equal(f.saved.attempt,null);assert.equal(f.controller.state.phase,'error');
  }
  const f=urlFixture();f.controller.contextCache=new ContextCache({load:async()=>packet(),inputKey:async()=>{throw Error('not ready');}});
  await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt,null);
});
test('each persistence or service failure before checkpoint blocks q and cannot replay a prepared attempt',async()=>{
  for(const boundary of ['reserve','stage','sending']){
    const f=urlFixture();
    if(boundary==='reserve')f.runtime.prepareBootstrap=async()=>{throw Error('WAL unavailable');};
    if(boundary==='stage')f.runtime.stageStartup=async()=>{throw Error('stage unavailable');};
    if(boundary==='sending'){const patch=f.store.patchAttempt;f.store.patchAttempt=async(...a)=>{
      if(typeof a[3]==='function'&&a[3](f.saved.attempt)?.state==='sending')throw Error('fsync failed');return patch(...a);};}
    await f.controller.tick();assert.equal(f.starts.length,0);
    f.controller.attach(f.saved);await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt.cancelState,'revoked');
  }
});
test('own navigation generation cancellation does not cancel the authorized dispatch',async()=>{
  const f=urlFixture(),start=f.composer.startChat;f.composer.startChat=async input=>{
    f.controller.cancel();assert.equal(input.canContinue(),true);return start(input);};
  await f.controller.tick();assert.equal(f.starts.length,1);f.controller.attach(f.saved);await f.controller.tick();assert.equal(f.starts.length,1);
});
test('user cancellation durably revokes; lost revoke ack remains pending and never replays',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();let fail=true;
  f.runtime.cancelStartup=async()=>{if(fail)throw Error('WAL blocked');return {status:'revoked'};};
  await f.controller.cancelPreparation();assert.equal(f.saved.attempt.cancelState,'requested');assert.equal(f.controller.state.phase,'cancel-pending');
  f.proof();await f.controller.tick();assert.notEqual(f.saved.attempt.state,'sent');
  fail=false;f.controller.attach(f.saved);await f.controller.tick();assert.equal(f.saved.attempt.cancelState,'revoked');
  await f.controller.retry();assert.equal(f.starts.length,1);assert.equal(f.controller.state.phase,'startup-cancelled');
});
test('registration wins cancellation: participant remains, context stops, no replacement q',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();f.proof();await f.controller.tick();
  await f.controller.cancelPreparation();assert.equal(f.saved.attempt.state,'sent');assert.equal(f.saved.attempt.cancelState,'registered-stopped');
  await f.controller.retry();assert.equal(f.starts.length,1);
});
test('cancellation during reservation blocks q even if the service returns a late ticket',async()=>{
  const f=urlFixture();let release;const reserve=f.runtime.prepareBootstrap;
  f.runtime.prepareBootstrap=async(...a)=>{await new Promise(r=>release=r);return reserve(...a);};
  const running=f.controller.tick();while(!release)await settle();await f.controller.cancelPreparation();release();await running;
  f.controller.attach(f.saved);await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt.cancelState,'revoked');
});
test('stale readiness after A-B-A cannot create an attempt',async()=>{
  const f=urlFixture();let release;f.controller.packetIsCurrent=()=>new Promise(r=>release=r);
  const running=f.controller.tick();while(!release)await settle();f.controller.cancel();f.controller.attach(f.saved);release(true);await running;
  assert.equal(f.saved.attempt,null);assert.equal(f.starts.length,0);
});
test('iframe and old event cannot provide an address; a second or foreign main frame invalidates ownership',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();
  await f.navigate(project.chatUrl,{isMainFrame:false});assert.equal(f.saved.attempt.addressCandidate,undefined);
  await f.navigate(project.chatUrl,{navigationSequence:0});assert.equal(f.saved.attempt.addressCandidate,undefined);
  await f.navigate();await f.observe();await f.navigate('https://chatgpt.com/c/foreign1234');f.proof();await f.controller.tick();
  assert.equal(f.saved.chatUrl,null);assert.equal(f.saved.attempt.cancelState,'registered-stopped');
});
test('unsupported redirect is sticky before a conversation URL and blocks late registration',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();await f.navigate('https://chatgpt.com/unsupported/entry',{navigationKind:'redirect'});
  await f.navigate();await f.observe();f.proof();await f.controller.tick();
  assert.equal(f.saved.attempt.cancelReason,'foreign-navigation');assert.equal(f.saved.chatUrl,null);assert.notEqual(f.saved.attempt.state,'sent');
});
test('signed-out observer stops context after registration without changing identity',async()=>{
  for(const extra of [{accountStatus:'signed-out'}]){
    const f=urlFixture();await f.controller.tick();await settle();f.proof();await f.controller.tick();
    await f.observe(extra);await f.controller.tick();assert.equal(f.saved.attempt.state,'sent');assert.equal(f.saved.attempt.cancelState,'registered-stopped');
  }
});
test('crash/replacement runtime loses address authority; late registration never binds a guessed c',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();await f.navigate();await f.observe();
  f.snap.incarnation='replacement';f.page.url='https://chatgpt.com/c/unrelated';f.proof();await f.controller.tick();
  assert.equal(f.saved.attempt.state,'sent');assert.equal(f.saved.attempt.addressStatus,'lost');assert.equal(f.saved.chatUrl,null);
});
test('user refresh ends address authority even if account and registration later succeed',async()=>{
  const f=urlFixture();await f.controller.tick();await settle();await f.navigate();await f.observe();
  await f.navigate(project.chatUrl,{type:'navigation-interrupted',navigationKind:'refresh'});f.proof();await f.controller.tick();
  await f.navigate();await f.controller.tick();
  assert.equal(f.saved.chatUrl,null);assert.equal(f.saved.attempt.addressStatus,'lost');assert.equal(f.starts.length,1);
});
test('cache metadata survives without context in q and retry never rebuilds a dispatched packet',async()=>{
  const f=urlFixture();let builds=0;f.controller.contextCache=new ContextCache({load:async()=>{builds++;return packet();},inputKey:async()=> 'stable'});
  await f.controller.tick();await settle();assert.equal(builds,1);assert.equal(f.saved.attempt.packet.cacheKey,'stable');
  f.info.planRevision++;await f.controller.retry();assert.equal(builds,1);assert.equal(f.starts.length,1);
});
test('assigned executor waits for permission; disabling permission never replays a dispatched command',async()=>{
  const f=urlFixture();let allowed=false;await f.store.updateSession('','',{assignmentId:'a'});f.controller.canSendContext=()=>allowed;
  await f.controller.tick();assert.equal(f.saved.attempt,null);allowed=true;await f.controller.tick();await settle();
  allowed=false;await f.controller.tick();assert.equal(f.starts.length,1);
});
test('a confirmed URL snapshot observes fingerprint changes without rebuilding or replaying',async()=>{
  const f=urlFixture();let key='before',builds=0;
  f.controller.contextCache=new ContextCache({load:async()=>{builds++;return packet();},inputKey:async()=>key});
  await f.controller.tick();await settle();await f.navigate();await f.observe();f.proof();f.setComplete();await f.controller.tick();
  key='after';f.controller.projectChanged();await settle();
  assert.equal(f.controller.state.startup.complete,true);assert.equal(f.controller.state.startup.snapshot_stale,true);
  assert.equal(f.starts.length,1);assert.equal(builds,1);
});
test('backend draining before and during dispatch blocks a new q and resuming cannot replay it',async()=>{
  const f=urlFixture();let allowed=true;f.controller.canStartChat=()=>allowed;
  const stage=f.runtime.stageStartup;f.runtime.stageStartup=async(...a)=>{const m=await stage(...a);allowed=false;return m;};
  await f.controller.tick();assert.equal(f.starts.length,0);assert.equal(f.saved.attempt.cancelState,'revoked');
  const g=urlFixture();g.controller.canStartChat=()=>allowed;allowed=true;
  g.composer.startChat=async input=>{allowed=false;assert.equal(input.canContinue(),false);return null;};
  await g.controller.tick();await settle();allowed=true;await g.controller.retry();assert.equal(g.starts.length,0);
});
test('legacy bound and unknown attempts remain readable without services or a fresh Send',async()=>{
  for(const state of ['sent','unknown','acknowledged']){
    const f=urlFixture({chatUrl:project.chatUrl,attempt:{requestId:'old',text:'old',state,sendStartedAtMs:now-1}});
    f.runtime.ensure=async()=>{throw Error('must not start');};await f.controller.tick();await f.controller.retry();assert.equal(f.starts.length,0);
  }
  const f=urlFixture({chatUrl:project.chatUrl});await f.controller.tick();assert.equal(f.controller.state.phase,'manual-session');
  const old=urlFixture({attempt:{state:'prepared',text:'preserve draft',attachments:[{name:'old'}]}});
  await old.controller.tick();assert.equal(old.controller.state.error.code,'LEGACY_CONTEXT_DISABLED');assert.equal(old.saved.attempt.text,'preserve draft');
});
test('project reads use bounded retry; generation change suppresses stale error',async()=>{
  const f=urlFixture();let calls=0;f.store.inspect=async()=>{calls++;throw Error('unavailable');};await f.controller.tick();
  assert.equal(calls,3);assert.equal(f.controller.state.error.code,'PROJECT_READ_FAILED');
  const g=urlFixture();let release;g.store.inspect=async()=>{throw Error('old');};g.controller.wait=()=>new Promise(r=>release=r);
  const running=g.controller.tick();while(!release)await settle();g.controller.cancel();g.controller.attach(g.saved);release();await running;
  assert.equal(g.controller.state.error,null);assert.equal(g.starts.length,0);
});
