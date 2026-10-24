import { ChatGPTComposer } from '../src/chatgpt-composer.mjs';
import { PlanReviewClient } from '../src/control/workflow/plan-review.mjs';
import { autoScrollPageScript } from '../src/execution/browser/chatgpt-auto-scroll.mjs';
import { VERSION as BUNDLED_KIT_VERSION } from '@webpilot/workflow-kit/lib/common';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { openStartupPage } from '../src/execution/browser/browser-startup.mjs';
import { readinessContextKey } from '../src/control/context/context-inputs.mjs';
import { TunnelClipboard } from '../src/control/startup/tunnel-clipboard.mjs';
import { StartupNetworkTrace } from '../src/execution/browser/startup-network-trace.mjs';
import { StartupReadiness } from '../src/control/startup/readiness.mjs';
import { startupPlatformOptions, startupSupported } from '../src/control/startup/platform.mjs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { nativeTheme, clipboard, BrowserWindow, dialog } from 'electron';
import { ChatColors } from '../src/execution/browser/chatgpt-colors.mjs';
import { readWorkspace, WorkspaceSessions } from '../src/control/sessions/workspace-session.mjs';
import { createScope, startTask } from '@webpilot/workflow-kit/lib/actions';
import { withSessionPlan } from '@webpilot/workflow-kit/lib/session-plans';
import { renderPlan } from '@webpilot/workflow-kit/lib/plan';
import { commitTask } from '@webpilot/workflow-kit/lib/transaction';
import { measureEventRuntimeBaseline } from './event-runtime-baseline.mjs';
import {ExecutionFacade,ChatGPTSearchExtension} from '../src/execution/facade.mjs';

let packetLoads = 0;
let smokeDataDir;
let fixtureBootstrap=null;
let fixtureUnsupportedRedirect=false;
const fixtureConversationTitles = new Map();
let fixtureTitleAuthFailures = 0;
let fixtureTitleReadFailures = 0;
let fixtureTitleDelayMs = 0;
let fixtureTitleRequests = 0;
const fixtureTexts = Array.from({length:4},(_,part)=>Array.from({ length: 100 }, (_, i) => `Раздел ${part*100+i + 1}: полный контекст проекта, включая кириллицу и точные пути.\n  Файл: /Projects/Мой проект/src/модуль.mjs\n\n`).join(''));
const fixtureContext = fixtureTexts.join('\n\n');
const fixtureTelemetrySse = [
  'data: {"type":"event_msg","payload":{"type":"token_count","info":{"last_token_usage":{"input_tokens":229043,"cached_input_tokens":220000,"total_tokens":229153},"model_context_window":258400},"message":"PRIVATE STREAM TEXT"}}',
  '',
  'data: {"type":"event_msg","payload":{"type":"item_completed","item":{"type":"ContextCompaction","id":"PRIVATE-COMPACTION-ID"}}}',
  '',
].join('\n');
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>TEST FIXTURE — no live ChatGPT</title>
<style>body{font:16px -apple-system,sans-serif;padding:40px;background:#fcfcff;color:#29394c}aside{background:#fff0d7;padding:14px;margin-bottom:20px}#prompt-textarea{border:1px solid #9caeb8;padding:12px;min-height:80px;white-space:pre-wrap}button{padding:10px}article{white-space:pre-wrap;font-size:12px}</style></head>
<body><aside>TEST FIXTURE · без реального ChatGPT, MCP и аккаунта</aside><h1>Composer fixture</h1>
<div class="group/activity-header" id="september-tool"><button aria-expanded="false" aria-labelledby="september-label"></button><span id="september-label">Прочитан файл</span><svg></svg></div>
<div id="tool-activity" style="min-height:96px;padding:12px"><div class="tool-row"><button id="fixture-tool-call" type="button">Вызываемый инструмент</button></div></div>
<div id="tool-message" data-message-author-role="assistant" style="min-height:128px;padding:16px"><div class="tool-row"><button id="fixture-tool-message-call" type="button">Вызываемый инструмент</button></div></div>
<div id="mixed-message" data-message-author-role="assistant" style="min-height:72px;padding:10px"><span id="mixed-message-text">Содержательный ответ агента</span><div class="tool-row"><button id="fixture-mixed-tool-call" type="button">Вызываемый инструмент</button></div></div>
<div id="messages"></div><form><div id="prompt-textarea" contenteditable="true" role="textbox"></div><button type="submit" data-testid="send-button">Send fixture</button></form>
<script>
// Minimal editor adapter for smoke; real ProseMirror is covered by installed gate.
document.getElementById('prompt-textarea').addEventListener('paste',event=>{
 event.preventDefault();const editor=event.currentTarget;
 if(event.clipboardData.files.length){
   const send=document.querySelector('[data-testid="send-button"]');send.disabled=true;
   window.fixtureFiles=[];
   Promise.all([...event.clipboardData.files].map(async file=>{
     const card=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');
     label.textContent=file.name;remove.type='button';remove.setAttribute('aria-label','Remove file');card.append(label,remove);card.setAttribute('aria-busy','true');editor.before(card);
     const text=await file.text();card.removeAttribute('aria-busy');return {name:file.name,bytes:file.size,text};
   })).then(files=>{window.fixtureFiles=files;send.disabled=false;});
   return;
 }
 editor.append(document.createTextNode(event.clipboardData.getData('text/plain')));
 editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}));
});
if(!location.pathname.startsWith('/c/'))document.getElementById('prompt-textarea').textContent=localStorage.getItem('fixture-restored-draft')||'';
document.getElementById('prompt-textarea').addEventListener('input',()=>{if(!document.getElementById('prompt-textarea').innerText.trim())localStorage.removeItem('fixture-restored-draft');});
// Fixture-only shared persistence models server history across separate WebContents.
window.fixtureMessages=JSON.parse(localStorage.getItem('fixture-messages:'+location.pathname)||'[]');
// Keep machine message IDs and ordering through real navigation/reload.
window.fixtureTurns=JSON.parse(localStorage.getItem('fixture-turns:'+location.pathname)||'null')
 || window.fixtureMessages.map((message,index)=>({role:'user',id:'fixture-message-'+index,text:message.text}));
function showTurn(turn){const article=document.createElement('article');article.dataset.messageAuthorRole=turn.role;article.dataset.messageId=turn.id;article.textContent=turn.text;document.getElementById('messages').append(article);}
window.fixtureTurns.forEach(showTurn);
function saveTurns(target=location.pathname){localStorage.setItem('fixture-turns:'+target,JSON.stringify(window.fixtureTurns));}
function showMessage(text){const turn={role:'user',id:'fixture-message-'+window.fixtureTurns.filter(t=>t.role==='user').length,text};window.fixtureTurns.push(turn);showTurn(turn);}
window.fixtureAssistant=(text,id='fixture-answer-'+crypto.randomUUID())=>{const turn={role:'assistant',id,text};window.fixtureTurns.push(turn);showTurn(turn);saveTurns();return id;};
document.querySelector('form').addEventListener('submit',event=>{
 event.preventDefault(); const editor=document.getElementById('prompt-textarea');const text=editor.innerText;
 const message={text,files:window.fixtureFiles||[],at:Date.now()};window.fixtureMessages.push(message);
 window.fixtureFiles=[];document.querySelectorAll('form > div:not(#prompt-textarea)').forEach(card=>card.remove());
 showMessage(text);
 editor.textContent='';localStorage.removeItem('fixture-restored-draft');
 const match=text.match(/wp-request-[a-zA-Z0-9-]+/) || ['manual-'+crypto.randomUUID()];
 if(match && !location.pathname.startsWith('/c/')){
   const target='/c/'+match[0];history.pushState({},'', '/c/WEB:12345678-1234-1234-1234-123456789abc');
   localStorage.setItem('fixture-messages:'+target,JSON.stringify(window.fixtureMessages));saveTurns(target);
   window.fixtureFinishConversation=()=>{history.replaceState({},'',target);saveTurns(target);};
   if(!localStorage.getItem('fixture-hold-conversation'))setTimeout(window.fixtureFinishConversation,600);
 }else{localStorage.setItem('fixture-messages:'+location.pathname,JSON.stringify(window.fixtureMessages));saveTurns();}
});
const bootstrapCommand=new URL(location.href).searchParams.get('q');
if(bootstrapCommand){
 document.getElementById('prompt-textarea').textContent=bootstrapCommand;
 if(document.documentElement.dataset.searchExtension!=='1')throw Error('Official search extension must run before q bootstrap');
 document.querySelector('form').requestSubmit();
 fetch('/fixture-bootstrap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:bootstrapCommand})})
  .then(r=>r.json()).then(result=>{if(result.error)window.fixtureBootstrapError=result.error;else window.fixtureAssistant('Контекст подтверждён');});
}
</script></body></html>`;

// Seed only the fresh smoke profile, before main restores settings or creates a page.
export async function prepareStartup({ dataDir }) {
  assert.ok(path.basename(dataDir).startsWith('workflow-pilot-smoke-'));
  // The fixture must not read, clear or overwrite the user's OS clipboard.
  let copiedText = '';
  clipboard.readText = () => copiedText;
  clipboard.writeText = value => { copiedText = String(value); };
  clipboard.clear = () => { copiedText = ''; };
  await fs.writeFile(path.join(dataDir, 'settings.json'), JSON.stringify({ planContinuationEnabled: true }), { flag: 'wx' });
}

export async function createRuntime({ browser, session, dataDir }) {
  // Explicit isolated test mode only. No request is sent to a real service.
  // Only the public pinned extension package may be downloaded; all ChatGPT requests stay on this fixture.
  const searchExtension=new ChatGPTSearchExtension({session,directory:path.join(dataDir,'browser-extensions','chatgpt-search')});
  await searchExtension.ensure();
  await session.protocol.handle('https', async request => {
    const url = new URL(request.url);
    if(fixtureUnsupportedRedirect&&url.hostname==='chatgpt.com'&&url.pathname==='/'&&url.searchParams.has('q')){
      fixtureUnsupportedRedirect=false;return Response.redirect('https://chatgpt.com/unsupported/fixture-redirect',302);
    }
    if(url.hostname==='chatgpt.com'&&url.pathname==='/unsupported/fixture-redirect')
      return Response.redirect('https://chatgpt.com/c/fixture-work-redirect',302);
    if(url.hostname==='chatgpt.com'&&url.pathname==='/fixture-bootstrap'&&request.method==='POST'){
      try{assert.ok(fixtureBootstrap);await fixtureBootstrap((await request.json()).text);return Response.json({ok:true});}
      catch(error){return Response.json({error:{code:error.code,message:error.message}});}
    }
    if (url.hostname === 'chatgpt.com' && url.pathname === '/fixture-clipboard' && request.method === 'POST') {
      clipboard.writeText(await request.text());
      return new Response('{}', { headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/fixture-flight') await new Promise(r => setTimeout(r, 250));
    if (url.pathname === '/fixture-first-load-failure') return Response.error();
    if (url.hostname === 'chatgpt.com' && url.pathname === '/backend-api/f/conversation') {
      return new Response(fixtureTelemetrySse, { headers: { 'content-type': 'text/event-stream; charset=utf-8' } });
    }
    if (url.hostname === 'chatgpt.com' && url.pathname === '/api/auth/session') {
      if (fixtureTitleAuthFailures > 0) {
        fixtureTitleAuthFailures--;
        return new Response('{}', { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } });
      }
      return new Response(JSON.stringify({ accessToken: 'fixture-renderer-only-token' }),
        { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }
    const titleMatch = url.hostname === 'chatgpt.com' && url.pathname.match(/^\/backend-api\/conversation\/([^/]+)$/);
    if (titleMatch) {
      const id = decodeURIComponent(titleMatch[1]);
      fixtureTitleRequests++;
      if (fixtureTitleDelayMs) await new Promise(resolve => setTimeout(resolve, fixtureTitleDelayMs));
      if (request.method === 'PATCH') {
        const body = await request.json();
        fixtureConversationTitles.set(id, body.title);
        return new Response(JSON.stringify({ success: true }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
      }
      if (fixtureTitleReadFailures > 0) {
        fixtureTitleReadFailures--;
        return new Response('{}', { status: 429, headers: { 'content-type': 'application/json; charset=utf-8' } });
      }
      return new Response(JSON.stringify({ id, title: fixtureConversationTitles.get(id) ?? '' }),
        { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }
    const signedIn=url.hostname==='chatgpt.com'&&(url.pathname==='/'||url.pathname.startsWith('/c/'));
    return new Response(signedIn?html.replace('<body>','<body><button data-testid="profile-button">Account</button>'):html,
      { headers: { 'content-type': 'text/html; charset=utf-8' } });
  });
  return {
    ensure: async () => ({ mcp: { ready: true }, tunnel: { ready: true }, fixture: true }),
    loadContext: async workspace => {
      packetLoads++;
      await new Promise(resolve => setTimeout(resolve, 650)); // Observable fixture preparation, not a performance benchmark.
      const info = await readWorkspace(workspace);
      const facts = { project_id: info.projectId, project_name: info.name, plan_revision: info.planRevision,
        scope_id: info.scopeId, execution_scope_status: info.scopeStatus, delivery_status: info.deliveryStatus,
        task_id: info.nextTaskId, task_title: info.nextTaskTitle };
      return { workspace, facts, plan_id: info.scopeId, delivery_protocol: 'inline-context-v1', ack_required: false,
        status: 'ready', completeness: 'COMPLETE', signature: 'fixture-snapshot', head: 'fixture-head',
        generated_at_ms: Date.now(), context: fixtureContext, context_bytes: Buffer.byteLength(fixtureContext),
        parts: fixtureTexts.map((text,index)=>({index:index+1,total:fixtureTexts.length,text,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')})),
        context_sha256: createHash('sha256').update(fixtureContext).digest('hex') };
    },
  };
}

async function waitFor(predicate, description, snapshot) {
  if (smokeDataDir) await fs.writeFile(path.join(smokeDataDir, 'stage.json'), JSON.stringify({ description, startedAt: new Date().toISOString() }));
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const timedOutState = snapshot?.();
  if (smokeDataDir) await fs.writeFile(path.join(smokeDataDir, 'timeout.json'), JSON.stringify({ description, state: timedOutState }, null, 2));
  throw new Error(`SMOKE_TIMEOUT: ${description}; context=${JSON.stringify(timedOutState?.context)}; waiting for: ${description}`);
}

async function verifyUninterruptedRequest(dataDir) {
  let requests = 0, responseTimer;
  const server = http.createServer((req, res) => {
    if (req.url !== '/') return;
    requests++;
    responseTimer = setTimeout(() => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<title>First document</title><h1>Ready</h1><img src="/pending-image">');
    }, 16000);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const probe = new BrowserWindow({ show: false, webPreferences: { partition: 'startup-network-fixture', sandbox: true, contextIsolation: true } });
  const rawFile = path.join(dataDir, 'native-network-raw.json');
  const trace = new StartupNetworkTrace(probe.webContents.session.netLog, rawFile, { origin: new URL(url).origin });
  try {
    await trace.start();
    assert.equal(trace.summary.state, 'recording', JSON.stringify(trace.summary));
    const began = Date.now();
    await openStartupPage(probe.webContents, url);
    const elapsedMs = Date.now() - began;
    assert.equal(requests, 1); assert.ok(elapsedMs >= 15000);
    assert.equal(await probe.webContents.mainFrame.executeJavaScript('document.title'), 'First document');
    assert.equal(probe.webContents.isLoading(), true, 'DOM-ready does not wait for the held image');
    const network = await trace.finish('dom-ready');
    assert.equal(network.state, 'complete', JSON.stringify(network)); assert.ok(network.matchedRequests >= 1);
    assert.ok(network.events.some(e => e.stage === 'TCP_CONNECT'));
    assert.ok(network.events.some(e => e.status === 200 && e.tMs >= 15000));
    await assert.rejects(fs.stat(path.join(dataDir, 'native-network-raw.json')), { code: 'ENOENT' });
    await fs.writeFile(path.join(dataDir, 'startup-network-native.json'), JSON.stringify({ requests, elapsedMs, network }, null, 2));
  } finally {
    await trace.finish('fixture-cleanup');
    probe.destroy(); clearTimeout(responseTimer); server.closeAllConnections(); server.close();
  }
}

export async function run({ app, window, sidebar, store, plugin, selectWorkspace, workspaceSetup, snapshot, assertLocalSender, permissionAllowed, dataDir, chromiumDiagnosticsFile, navigate, getArchiveWindow, getColorWindow, eventBaseline = false, runtimeMetrics = null, planContinuation, getLive, liveSessions, sessionView, deletion, deletionHooks, execution, withStartupFixture, continuePlan }) {
  // Since 0.5.20 a startup ends in the panel channel; the fixture page never opens the panel, so a sent startup stays there.
  const settled = () => !!store.selected()?.chatUrl&&(snapshot().context.phase === 'delivered'
    || snapshot().context.phase==='startup-complete'
    || store.selected()?.attempt?.bootstrapTransport!=='url-query'&&snapshot().context.phase==='startup-channel');
  // A packet invalidated by a later Kit change: 'stale' for attachments, a stale startup error for the panel.
  const stale = () => snapshot().context.phase === 'stale' || snapshot().context.startup?.snapshot_stale
    || snapshot().context.startup?.error?.code === 'PLUGIN_COMMUNICATION_STALE_MESSAGE';
  // Test actions follow the visible page; production controllers retain their own page.
  const currentObject=key=>new Proxy({}, {
    get:(_target,property)=>{const value=getLive()[key][property];return typeof value==='function'?value.bind(getLive()[key]):value;},
    set:(_target,property,value)=>{getLive()[key][property]=value;return true;},
  });
  const browser=currentObject('browser'),controller=currentObject('controller'),pageState=currentObject('pageState'),chromiumDiagnostics=currentObject('chromiumDiagnostics');
  smokeDataDir = dataDir;
  fixtureBootstrap=async text=>{
    assert.match(text,/^Открой панель Workflow Pilot:/);assert.doesNotMatch(text,/Раздел 1:|wp-request-/);
    const ticket=JSON.parse(text.match(/workflow_pilot_panel с аргументами (\{"enrollment_ticket":"[a-f0-9]{64}"\})/)[1]).enrollment_ticket;
    const hash=createHash('sha256').update(ticket).digest('hex');
    const raw=store.snapshot().projects.flatMap(p=>p.sessions.map(s=>({...s,workspace:p.workspace})))
      .find(s=>s.attempt?.enrollmentRef?.ticket_hash===hash);
    assert.ok(raw,'use the dispatched ticket, never reserve a second invitation');
    const record=liveSessions.find(raw);
    const metadata={'openai/session':'smoke-'+raw.sessionId,'openai/subject':'smoke'};
    const first=(await plugin.panel({enrollment_ticket:ticket,metadata})).startup_context;
    assert.ok(first,'the first response includes startup context');
    for(let part=1;part<first.total;part++)await plugin.communication.content({metadata,message_id:first.message_id,context_ref:first.context_ref,part});
    assert.equal((await plugin.communication.startupComplete({metadata,message_id:first.message_id,context_sha256:first.context_ref})).complete,true);
    liveSessions.tick(record);
  };
  const savedAutoState=async()=>{const settings=JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8'));
    const p=store.selected(),state=settings.projectPlanContinuation?.[p?.parentWorkspace??p?.workspace];
    return {planContinuationEnabled:state?.enabled===true,continuationCheckpoint:state?.sessions?.[p?.sessionId]?.continuationCheckpoint??null};};
  // Keep frame-based fixture checks running when another desktop window covers this one.
  sidebar.setBackgroundThrottling(false);
  await verifyUninterruptedRequest(dataDir);
  assert.equal(app.isPackaged, false, 'Fixtures never run from a packaged app');
  assert.equal(permissionAllowed('media', 'https://chatgpt.com', { mediaTypes: ['audio'] }), true);
  assert.equal(permissionAllowed('media', 'https://chatgpt.com/', { mediaType: 'audio' }), true);
  assert.equal(permissionAllowed('media', 'https://chatgpt.com', { mediaTypes: ['video'] }), false);
  assert.equal(permissionAllowed('media', 'https://chatgpt.com', { mediaTypes: ['audio', 'video'] }), false);
  assert.equal(permissionAllowed('geolocation', 'https://chatgpt.com', {}), true);
  assert.equal(permissionAllowed('geolocation-approximate', 'https://chatgpt.com', {}), true);
  assert.equal(permissionAllowed('clipboard-sanitized-write', 'https://chatgpt.com', {}, browser), true);
  assert.equal(permissionAllowed('clipboard-sanitized-write', 'https://chatgpt.com', {}, sidebar), false);
  assert.equal(permissionAllowed('clipboard-read', 'https://chatgpt.com', {}, browser), false);
  assert.equal(permissionAllowed('notifications', 'https://chatgpt.com', {}), false);
  assert.equal(permissionAllowed('clipboard-sanitized-write', 'https://example.com', {}, browser), false);
  assert.equal(permissionAllowed('media', 'https://example.com', { mediaTypes: ['audio'] }), false);
  const workspace = path.join(await fs.realpath(dataDir + '-projects'), 'Тестовый проект с пробелами');
  await waitFor(() => sidebar.executeJavaScript('typeof window.webPilot === "object"'), 'local IPC ready', snapshot);
  assert.equal(planContinuation.view().enabled, false, 'legacy global ON grants no project permission');
  assert.equal(snapshot().planContinuation.enabled, false);
  assert.deepEqual(snapshot().conversationRecovery, { phase: 'idle', message: '', canRetry: false });
  assert.equal(await sidebar.executeJavaScript("document.getElementById('plan-continuation-toggle')"), null, 'no PlanContinuation button');
  assert.equal(await sidebar.executeJavaScript("typeof window.webPilot.setPlanContinuation"), 'undefined', 'no PlanContinuation IPC');
  assert.equal((await savedAutoState()).planContinuationEnabled, false);
  // Continue the existing suite from its original OFF baseline through the real IPC.
  await continuePlan(false);
  assert.equal(snapshot().planContinuation.enabled, false);
  console.log(JSON.stringify({ mainStartup: true, savedPlanContinuation: 'legacy-on-migrated-off', sidebarReady: true, isolated: true }));


  await chromiumDiagnostics.flush();
  let firstLoadEvents = (await fs.readFile(chromiumDiagnosticsFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.ok(firstLoadEvents.some(entry => entry.event === 'session-start'), 'journal exists before first navigation');
  assert.equal(firstLoadEvents.some(entry => entry.event === 'did-finish-load'), false);
  await assert.rejects(browser.loadURL('https://chatgpt.com/fixture-first-load-failure?token=PRIVATE-FIRST-LOAD'));
  await chromiumDiagnostics.flush();
  firstLoadEvents = (await fs.readFile(chromiumDiagnosticsFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.ok(firstLoadEvents.some(entry => entry.event === 'did-fail-load' && entry.isMainFrame && entry.errorCode < 0), 'first failed document is recorded');
  const earlyReport = await chromiumDiagnostics.startupReport();
  assert.match(earlyReport, /did-fail-load/);
  assert.equal(earlyReport.includes('PRIVATE-FIRST-LOAD'), false, 'report excludes query values');
  await navigate(null);
  assert.equal(browser.getURL(), 'https://chatgpt.com/auth/login', 'onboarding opens sign-in directly without the home-page redirect');
  await chromiumDiagnostics.flush();
  assert.match(await chromiumDiagnostics.startupReport(), /main-document-response/, 'retry reaches a document');

  const opening = navigate(null, { entryUrl: 'https://chatgpt.com/fixture-flight' });
  const duplicate = navigate(null, { entryUrl: 'https://chatgpt.com/fixture-flight' });
  await Promise.all([opening, duplicate]);
  const navigationReport = JSON.parse(await chromiumDiagnostics.startupReport());
  assert.equal(navigationReport.events.filter(e => e.event === 'navigation-requested' && e.url?.path === '/fixture-flight').length, 1);

  const loginFlow = new StartupReadiness({ prepareRuntime: () => { throw new Error('Login check must not prepare services'); } });
  loginFlow.publish({ node: true, git: true, runtime: true, phase: 'tunnel' });
  await withStartupFixture(loginFlow, async () => {
    await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-account-check").hidden'), 'unknown login offers a real check button', snapshot);
    const documentBefore = pageState.current.documentId, sequenceBefore = chromiumDiagnostics.log.sequence;
    await sidebar.executeJavaScript('document.getElementById("startup-account-check").click()');
    await waitFor(async () => (await sidebar.executeJavaScript('!document.getElementById("startup-account-check").disabled'))
      && chromiumDiagnostics.log.sequence > sequenceBefore, 'manual account check completes through IPC', snapshot);
    assert.equal(pageState.current.documentId, documentBefore, 'checking login never reloads the document');
    assert.equal(snapshot().startup.account, 'unknown', 'guest editor is not authenticated');
    await browser.executeJavaScript(`document.body.insertAdjacentHTML('afterbegin', '<nav id="account-fixture"><a href="/c/12345678-1234-1234-1234-123456789abc">Private history</a><a href="/g/g-p-1234567890abcdef/project">Private project</a></nav>')`);
    await waitFor(() => snapshot().startup.account === 'signed-in', 'personal navigation confirms login through sandbox preload', snapshot);
    await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-tunnel-body").hidden'), 'confirmed login exposes file connection', snapshot);
    const copied = await sidebar.executeJavaScript('window.webPilot.startup("copy-diagnostics")');
    assert.equal(copied.ok, true);
    const report = JSON.parse(clipboard.readText());
    assert.equal(report.accountObservation.state.evidence.reason, 'account-navigation');
    assert.equal(report.startupState.state.account, 'signed-in');
    assert.equal(report.lastAccountCheck.state.reason, 'applied');
    assert.equal(clipboard.readText().includes('Private history'), false);
    await browser.executeJavaScript('document.getElementById("account-fixture").remove()');
    await waitFor(() => snapshot().startup.account === 'unknown', 'removed account signals invalidate login', snapshot);
  });
  console.log(JSON.stringify({ startupAccount: true, manualCheck: 'real-ipc-no-reload', diagnostics: 'safe-account-evidence', isolated: true }));

  // Render the real startup UI with isolated state; never install host components or use real credentials.
  await sidebar.executeJavaScript('import("./startup.mjs").then(() => window.webPilot.getState()).then(() => true)');
  const startupFixture = { ...snapshot(), setup: null, settings: null, selected: null, projects: [],
    startup: { active: true, node: true, git: false, runtime: false, tunnel: false,
      account: 'signed-out', page: 'slow', phase: 'git', busy: false, error: null } };
  sidebar.send('pilot:state-changed', startupFixture);
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-panel").hidden'), 'first-run panel', snapshot);
  const firstRun = await sidebar.executeJavaScript(`({
    signup: document.querySelector('[data-startup="signup"]').textContent,
    retry: !document.querySelector('[data-startup="chat"]').disabled,
    slow: document.getElementById('startup-account-status').textContent,
    noSecretInput: !document.querySelector('#startup-panel input'),
    projectsHidden: document.getElementById('active-projects').hidden,
    continueDisabled: document.getElementById('startup-continue').disabled,
    loginInstructionsHidden: document.getElementById('startup-account-instructions').hidden,
    signupHidden: document.getElementById('startup-signup').hidden,
    copyVisible: !document.getElementById('startup-copy-diagnostics').hidden,
  })`);
  assert.match(firstRun.signup, /нет аккаунта/);
  assert.match(firstRun.slow, /ChatGPT/);
  assert.equal(firstRun.retry, false); assert.equal(firstRun.noSecretInput, true);
  assert.equal(firstRun.projectsHidden, true); assert.equal(firstRun.continueDisabled, true);
  assert.equal(firstRun.loginInstructionsHidden, true); assert.equal(firstRun.signupHidden, true); assert.equal(firstRun.copyVisible, true);
  await fs.writeFile(path.join(dataDir, 'startup-account.png'), (await sidebar.capturePage()).toPNG());
  sidebar.send('pilot:state-changed', { ...startupFixture, startup: { ...startupFixture.startup, page: 'loaded', account: 'signed-out' } });
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-signup").hidden'), 'registration after visible login', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("startup-account-instructions").hidden'), false);
  await fs.writeFile(path.join(dataDir, 'startup-login.png'), (await sidebar.capturePage()).toPNG());
  sidebar.send('pilot:state-changed', { ...startupFixture, startup: { ...startupFixture.startup, page: 'loaded', account: 'signed-in' } });
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-components-body").hidden'), 'first-run components', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("startup-install-git").hidden'), false);
  await fs.writeFile(path.join(dataDir, 'startup-components.png'), (await sidebar.capturePage()).toPNG());
  let copied = '', finishClipboard, nativeIdPrompts = 0;
  const clipboardFixture = { ...startupFixture, startup: { ...startupFixture.startup,
    page: 'loaded', account: 'signed-in', git: true, runtime: true, phase: 'tunnel' } };
  const copiedValues = [];
  const clipboardFlow = new TunnelClipboard({ readText: () => copied,
    promptTunnelId: async () => { nativeIdPrompts++; return { tunnelId: 'tunnel_fixture1234567890123456' }; },
    configure: data => { copiedValues.push({ ...data }); return new Promise(r => { finishClipboard = r; }); },
    onChange: progress => sidebar.send('pilot:state-changed', { ...clipboardFixture,
      startup: { ...clipboardFixture.startup, clipboard: progress, tunnel: progress.step === 'done', busy: progress.step === 'connecting' } }),
  });
  sidebar.send('pilot:state-changed', clipboardFixture);
  await clipboardFlow.tick({ active: true });
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-tunnel-body").hidden'), 'clipboard tunnel step', snapshot);
  await sidebar.executeJavaScript('document.getElementById("startup-tunnel-body").scrollIntoView({block:"start"})');
  await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await fs.writeFile(path.join(dataDir, 'startup-tunnel-id.png'), (await sidebar.capturePage()).toPNG());
  await clipboardFlow.pasteTunnelId(); // Empty clipboard: the native entry route still advances after confirmation.
  assert.equal(nativeIdPrompts, 1); assert.equal(copiedValues.length, 0);
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-tunnel-key").hidden'), 'native ID confirmation shows key instructions', snapshot);
  clipboardFlow.reset(); await clipboardFlow.tick({ active: true });
  copied = 'tunnel_fixture1234567890123456'; await clipboardFlow.tick({ active: true });
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-tunnel-key").hidden && document.getElementById("startup-tunnel-create").hidden'), 'copied ID advances UI', snapshot);
  await sidebar.executeJavaScript('document.getElementById("startup-tunnel-progress").scrollIntoView({block:"start"})');
  await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await fs.writeFile(path.join(dataDir, 'startup-tunnel-key.png'), (await sidebar.capturePage()).toPNG());
  copied = 'sk-fixture-private-1234567890'; const connecting = clipboardFlow.tick({ active: true });
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("startup-tunnel-key").hidden && document.querySelector("[data-startup=configure-tunnel]").disabled'), 'copied key starts automatic connection', snapshot);
  assert.equal(copiedValues.length, 1);
  assert.equal(await sidebar.executeJavaScript('document.body.innerText.includes("sk-fixture") || document.body.innerText.includes("tunnel_fixture")'), false);
  finishClipboard(); await connecting;
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-project-body").hidden'), 'automatic connection reaches project', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("startup-plugin-help").open'), false);
  await sidebar.executeJavaScript('document.getElementById("startup-project-body").scrollIntoView({block:"start"})');
  await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await fs.writeFile(path.join(dataDir, 'startup-first-project.png'), (await sidebar.capturePage()).toPNG());
  clipboardFlow.dispose();
  // Exercise the Windows production adapter against the real Chromium renderer.
  assert.equal(startupSupported('win32'), true);
  let winComponents = false, winInstalled = false, winMcp = false, winConfigured = false, winTunnel = false;
  const winActions = [];
  const winFlow = new StartupReadiness({
    ...startupPlatformOptions({ platform: 'win32',
      setup: { node: async () => {}, setRuntimeEnvironment: () => winActions.push('git') },
      // The components of the package (tools and the private Python), then the same executor runtime as on macOS.
      components: { ensure: async () => { winActions.push('components'); winComponents = true; },
        inspect: async () => ({ toolsReady: winComponents, installed: winComponents }), workflowEnvironment: async () => ({ WORKFLOW_GIT_BIN: 'fixture' }) },
      bootstrap: { inspect: async () => ({ installed: winInstalled }),
        configureTunnel: async () => { winConfigured = true; return { configured: true }; } },
      ensureRuntime: async () => { winActions.push('prepare'); winInstalled = true; },
      control: async action => {
        if (action === 'start') { winMcp = true; winTunnel = winConfigured; }
        return { mcp: { ready: winMcp }, tunnel: { configured: winConfigured, ready: winTunnel } };
      },
      inspectGit: () => { throw new Error('Apple probe must not run in Windows'); },
      installGit: () => { throw new Error('Apple installer must not run in Windows'); },
    }),
    onChange: state => sidebar.send('pilot:state-changed', { ...startupFixture, platform: 'win32',
      startup: { ...state, active: true, account: 'signed-in', page: 'loaded' } }),
  });
  await winFlow.check({ prepare: true });
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-tunnel-body").hidden && document.getElementById("startup-install-git").hidden && document.getElementById("host-platform-label").textContent.includes("Windows")'), 'Windows prepared components and tunnel step', snapshot);
  assert.deepEqual(winActions, ['components', 'git', 'prepare']);
  await sidebar.executeJavaScript('document.getElementById("startup-tunnel-body").scrollIntoView({block:"start"})');
  await fs.writeFile(path.join(dataDir, 'startup-windows-tunnel.png'), (await sidebar.capturePage()).toPNG());
  await winFlow.configure({ tunnel_id: 'tunnel_fixture', api_key: 'sk-fixture-only' });
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("startup-project-body").hidden && document.getElementById("startup-plugin-help").open && !document.getElementById("startup-plugin-platform").hidden'), 'Windows connection guidance and first project', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.body.innerText.includes("sk-fixture")'), false);
  await sidebar.executeJavaScript('document.getElementById("startup-project-body").scrollIntoView({block:"start"})');
  await fs.writeFile(path.join(dataDir, 'startup-windows-project.png'), (await sidebar.capturePage()).toPNG());
  winFlow.dispose();
  sidebar.send('pilot:state-changed', snapshot());
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("startup-panel").hidden'), 'normal sidebar after startup fixture', snapshot);
  assert.equal(snapshot().sidebarWidth, 312);
  await sidebar.executeJavaScript('window.webPilot.setSidebarWidth(420)');
  await waitFor(() => snapshot().sidebarWidth === 420, 'persist sidebar width', snapshot);
  assert.equal(window.contentView.children[0].getBounds().width, 420); assert.equal(window.contentView.children[1].getBounds().x, 420);
  let layoutSettings = JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8'));
  assert.equal(layoutSettings.sidebarWidth, 420);
  await sidebar.executeJavaScript('window.webPilot.setSidebarWidth(100)');
  await waitFor(() => snapshot().sidebarWidth === 312, 'sidebar legacy minimum', snapshot);
  // IPC resolves in main before the state-changed event is rendered.
  // Dragging uses renderer currentState, so wait for the displayed starting width.
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("sidebar-splitter").getAttribute("aria-valuenow") === "312"'),
    'sidebar rendered minimum before drag', snapshot);
  await sidebar.executeJavaScript(`{
    const splitter=document.getElementById('sidebar-splitter');
    splitter.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,button:0,screenX:312}));
    splitter.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:7,screenX:432}));
    splitter.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,screenX:432}));
  }`);
  await waitFor(() => snapshot().sidebarWidth === 432, 'drag sidebar splitter', snapshot);
  assert.equal(window.contentView.children[0].getBounds().width, 432); assert.equal(window.contentView.children[1].getBounds().x, 432);
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("sidebar-splitter").getAttribute("aria-valuenow") === "432"'),
    'sidebar rendered drag width before keyboard', snapshot);
  await sidebar.executeJavaScript(`document.getElementById('sidebar-splitter').dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'ArrowLeft'}))`);
  await waitFor(() => snapshot().sidebarWidth === 408, 'keyboard sidebar resize', snapshot);
  const disclosure = await sidebar.executeJavaScript(`(() => {
    const details=document.getElementById('project-actions'), summary=details.querySelector('summary');
    const initially=details.open; summary.click(); summary.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
    const opened=details.open; summary.click(); const closed=!details.open;
    summary.click(); document.body.click(); return {initially,opened,closed,outsideClosed:!details.open};
  })()`);
  assert.deepEqual(disclosure, {initially:false,opened:true,closed:true,outsideClosed:true});
  const chooseProjectsFolder = async (canceled = false, folder = path.dirname(workspace)) => {
    const showOpenDialog = dialog.showOpenDialog;
    const previous = snapshot().setup.parent;
    let options;
    dialog.showOpenDialog = async (_window, input) => {
      options = input;
      return { canceled, filePaths: canceled ? [] : [folder] };
    };
    try { await sidebar.executeJavaScript('window.webPilot.chooseParent("")'); }
    finally { dialog.showOpenDialog = showOpenDialog; }
    assert.equal(options.title, 'Выбрать расположение папки для проектов');
    assert.equal(options.defaultPath, previous ?? undefined, 'only the explicit previous choice may be preselected');
  };
  let firstProjectForm = true;
  const previewNew = async () => {
    await sidebar.executeJavaScript('document.getElementById("create-workspace").click()');
    await waitFor(() => snapshot().setup?.phase === 'form', 'new workspace form', snapshot);
    if (firstProjectForm) { assert.equal(snapshot().setup.parent, null, 'fresh settings have no projects folder'); firstProjectForm = false; }
    if (snapshot().setup.parent === null) {
      await waitFor(() => sidebar.executeJavaScript('document.getElementById("setup-name").hidden && document.getElementById("setup-preview").hidden'), 'location before project name', snapshot);
      const missingParent = await sidebar.executeJavaScript('window.webPilot.previewNew("Тестовый проект с пробелами")');
      assert.equal(missingParent.ok, false);
      assert.match(missingParent.error.message, /Сначала выберите расположение/);
      // Return to a fresh form after the deliberate invalid IPC request.
      await sidebar.executeJavaScript('window.webPilot.beginCreate()');
      await chooseProjectsFolder(true);
      assert.equal(snapshot().setup.parent, null, 'cancel does not select a default folder');
      await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await fs.writeFile(path.join(dataDir, 'new-project-location.png'), (await sidebar.capturePage()).toPNG());
      await chooseProjectsFolder();
    }
    assert.equal(snapshot().setup.parent, path.dirname(workspace));
    assert.equal(JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8')).projectsParent, path.dirname(workspace), 'explicit folder saved on disk');
    await waitFor(() => sidebar.executeJavaScript('!document.getElementById("setup-name").hidden && document.activeElement.id === "setup-name"'), 'selected folder reveals and focuses name', snapshot);
    await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    await fs.writeFile(path.join(dataDir, 'new-project-name.png'), (await sidebar.capturePage()).toPNG());
    assert.equal(await sidebar.executeJavaScript('document.getElementById("setup-parent-button").textContent'), 'Изменить расположение папки для проектов');
    await sidebar.executeJavaScript(`document.getElementById('setup-name').value='Тестовый проект с пробелами'; document.getElementById('setup-preview').click()`);
    await waitFor(() => snapshot().setup?.phase === 'preview', 'new workspace preview', snapshot);
  };
  await previewNew();
  assert.equal(snapshot().setup.action, 'install'); assert.equal(packetLoads, 0); assert.equal(store.selected(), null);
  assert.equal(snapshot().setup.firstSessionRequired, true); assert.equal(Object.hasOwn(snapshot().setup,'firstSessionExperience'),false);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("setup-first-chat").hidden'), false);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("setup-apply").hidden'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("setup-doctor").hidden'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("setup-refresh").hidden'), true);
  await fs.writeFile(path.join(dataDir, 'first-project-choice.png'), (await sidebar.capturePage()).toPNG());
  await assert.rejects(fs.stat(workspace), { code: 'ENOENT' });
  assert.ok(snapshot().setup.files.some(f => f.path === 'AGENTS.md'));
  await sidebar.executeJavaScript('document.getElementById("setup-cancel").click()');
  await waitFor(() => !snapshot().setup, 'cancel without creating', snapshot);
  await assert.rejects(fs.stat(workspace), { code: 'ENOENT' });
  await previewNew();
  assert.equal(Object.hasOwn(snapshot().setup,'firstSessionExperience'),false,'there is no surface choice to remember');
  await sidebar.executeJavaScript('document.getElementById("setup-create-chat").click(); document.getElementById("setup-create-chat").click()');
  await waitFor(() => sidebar.executeJavaScript(`(() => { const e=document.getElementById('operation-progress'); return !e.hidden && e.querySelector('.operation-label').textContent.length > 0; })()`), 'visible recovery spinner', snapshot);
  assert.equal(await sidebar.executeJavaScript("getComputedStyle(document.querySelector('.operation-spinner')).animationName"), 'operation-spin');
  assert.equal(await sidebar.executeJavaScript("document.getElementById('operation-progress').getAttribute('role')"), 'status');
  const progressBounds = await sidebar.executeJavaScript("(() => { const r=document.getElementById('operation-progress').getBoundingClientRect(); return {x:0,y:Math.max(0,Math.floor(r.y)-8),width:Math.ceil(innerWidth),height:Math.ceil(r.height)+16}; })()");
  await fs.writeFile(path.join(dataDir,'progress-ui.png'), (await sidebar.capturePage(progressBounds)).toPNG());

  await waitFor(()=>settled()&&snapshot().context.startup?.complete,'first URL command, registration and complete context',snapshot);
  await browser.executeJavaScript("document.title='Первый разговор проекта'");
  await waitFor(() => snapshot().projects[0].sessions[0].title === 'Первый разговор проекта', 'conversation title', snapshot);
  const first = store.selected();
  assert.ok(first.chatUrl.startsWith('https://chatgpt.com/c/'));
  assert.equal(await sidebar.executeJavaScript('document.querySelector(".session-experience").textContent'), 'Chat');
  assert.equal(await sidebar.executeJavaScript('document.getElementById("new-chat")'), null, 'context card has no session creation button');
  assert.equal(first.attempt.state, 'sent');
  assert.equal(first.attempt.text,undefined,'raw ticket is not persisted in the attempt');
  // The context is pulled through the panel: the first message has no files and names the panel tool.
  const files = await browser.executeJavaScript('window.fixtureMessages[0].files');
  assert.deepEqual(files ?? [], []);
  assert.ok(first.attempt.sentEvidence.participant_id);
  assert.ok(Buffer.byteLength(fixtureContext) > 60000);
  assert.equal(snapshot().selected.attempt.text, undefined, 'Full prompt stays out of sidebar IPC');
  const sent = await browser.executeJavaScript('window.fixtureMessages[0].text');
  assert.match(sent,/workflow_pilot_panel/);assert.equal(sent.includes(fixtureContext),false);
  assert.ok(pageState.current, 'sandbox preload delivered its initial observation');
  const popupOpened = new Promise(resolve => browser.once('did-create-window', resolve));
  await browser.executeJavaScript("void window.open('https://auth.openai.com/fixture-popup')", true);
  const popup = await popupOpened;
  assert.ok(!popup.webContents.getLastWebPreferences().preload, 'auth popup has no observer preload');
  popup.destroy();

  assert.equal(browser.getLastWebPreferences().sandbox, true);
  assert.equal(browser.getLastWebPreferences().contextIsolation, true);
  assert.deepEqual(await browser.executeJavaScript('({id:typeof globalThis.__webPilotObserverDocumentId,snapshot:typeof globalThis.__webPilotObserverSnapshot})'),
    { id: 'undefined', snapshot: 'undefined' }, 'observer internals stay inside the isolated world');
  // Freeze project changes. Only the page signal may drive controller work.
  await new Promise(resolve => setTimeout(resolve, 1700));
  const originalTick = controller.tick.bind(controller); let pageTicks = 0;
  controller.tick = (...args) => { pageTicks++; return originalTick(...args); };
  const { ipcMain: observerIpc } = await import('electron');
  const listeners = observerIpc.listeners('pilot:page-observation'); observerIpc.removeAllListeners('pilot:page-observation');
  await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent='aa'");
  await new Promise(resolve => setTimeout(resolve, 1800));
  assert.equal(pageTicks, 0, 'shared pulse never compensates for suppressed DOM signals');
  for (const listener of listeners) observerIpc.on('pilot:page-observation', listener);
  await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent='bb'");
  await waitFor(() => pageTicks > 0, 'equal-length draft change signals controller', snapshot);
  const previousRevision = pageState.current.state.draftRevision;
  window.minimize();
  await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent='cc'");
  await waitFor(() => pageState.current?.state.draftRevision > previousRevision, 'observer works minimized', snapshot);
  window.restore();
  await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent=''");
  await waitFor(() => !controller.pending, 'finish page events', snapshot);
  controller.tick = originalTick;
  assert.equal(first.receipt, null);


  assert.equal(packetLoads, 1, 'packet loads at line 158');
  if (eventBaseline) {
    await measureEventRuntimeBaseline({ app, browser, controller, snapshot, dataDir, chromiumDiagnostics,
      chromiumDiagnosticsFile, runtimeMetrics, waitFor });
    return;
  }
  assert.deepEqual(await browser.executeJavaScript('({ require:typeof require, process:typeof process, bridge:typeof window.webPilot })'),
    { require: 'undefined', process: 'undefined', bridge: 'undefined' });
  const previousClipboard = await clipboard.readText();
  let tunnelClipboardReads = 0;
  const embeddedTunnelId = 'tunnel_fixture1234567890123456';
  const embeddedClipboard = new TunnelClipboard({ readText: () => { tunnelClipboardReads++; return clipboard.readText(); },
    configure: async () => {}, promptTunnelId: async () => ({ cancelled: true }) });  try {
    await clipboard.writeText('');
    // Complete the async baseline read before simulating a new in-window copy.
    await embeddedClipboard.tick({ active: true, ready: true, busy: false });
    embeddedClipboard.observe({ active: true, ready: true, busy: false });
    await browser.executeJavaScript(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: value => fetch('/fixture-clipboard', { method: 'POST', body: String(value) }).then(() => undefined) } }); navigator.clipboard.writeText(${JSON.stringify(embeddedTunnelId)});`);
    await waitFor(async () => await clipboard.readText() === embeddedTunnelId,
      'embedded browser copy reaches isolated fixture clipboard', snapshot);
    await waitFor(() => embeddedClipboard.snapshot().step === 'key',
      'tunnel polling observes embedded copy without focus change', snapshot);
    assert.ok(tunnelClipboardReads >= 2);
    embeddedClipboard.observe({ active: false });
    assert.equal(embeddedClipboard.timer, null);
  } finally {
    embeddedClipboard.dispose();
    await clipboard.writeText(previousClipboard);
  }

  assert.equal(await sidebar.executeJavaScript('document.querySelector(".session-tokens") === null'), true);
  assert.equal(snapshot().selected.tokenEstimate, undefined);
  assert.equal(snapshot().tokenHistory, undefined);
  const prefs = browser.getLastWebPreferences();
  assert.equal(prefs.nodeIntegration, false); assert.equal(prefs.contextIsolation, true); assert.equal(prefs.sandbox, true);
  assert.throws(() => assertLocalSender({ sender: browser, senderFrame: browser.mainFrame }), { code: 'IPC_FORBIDDEN' });
  assert.equal(await sidebar.executeJavaScript(`({
    planCard: !document.getElementById('plan-card').hidden,
    detailsVisible: !document.getElementById('workspace-details').hidden, oldPlanText: !!document.getElementById('plan-text'),
    revisionVisible: document.getElementById('plan-card').textContent.includes('версия') || document.getElementById('plan-card').textContent.includes('Revision')
  })`).then(value => JSON.stringify(value)), JSON.stringify({ planCard: true, detailsVisible: true, oldPlanText: false, revisionVisible: false }));
  // Without a plan the card shows only the stage; progress appears with the first published plan.
  assert.ok(['Ждёт задачи','Обсуждение','Подготовка плана','Подготовка'].includes(await sidebar.executeJavaScript('document.getElementById("plan-phase-text").textContent')));
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-progress").hidden'), true);
  assert.equal(await sidebar.executeJavaScript('document.querySelectorAll("#plan-tasks .plan-task").length'), 0);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-title").hidden'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("accept-plan") === null'), true);

  // Exercise the real sidebar click, preload, sender-checked IPC and persisted checkout policy.
  const reviewStateFile=path.join(workspace,'.harness/runtime/plan-review/state.json');
  const originalReviewState=await fs.readFile(reviewStateFile).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  await waitFor(()=>sidebar.executeJavaScript("!document.getElementById('plan-review-toggle').disabled"),'review button at NONE',snapshot);
  const autoBeforeReview=snapshot().planContinuation.enabled;
  await sidebar.executeJavaScript("document.getElementById('plan-review-toggle').click()");
  await waitFor(()=>snapshot().planReview.enabled,'review enabled',snapshot);
  // A panel startup packet becomes stale through the channel; a legacy packet reports 'stale'.
  await waitFor(stale,'review policy marks the confirmed snapshot stale without losing its receipt',snapshot);
  assert.equal(await sidebar.executeJavaScript("document.getElementById('plan-review-toggle').getAttribute('aria-pressed')"),'true');
  assert.ok(['rgb(228, 241, 240)','rgb(32, 53, 54)'].includes(await sidebar.executeJavaScript("getComputedStyle(document.getElementById('plan-review-toggle')).backgroundColor")),'the switch uses the shared selected token');
  assert.equal(JSON.parse(await fs.readFile(path.join(workspace,'.harness/runtime/plan-review/state.json'),'utf8')).enabled,true);
  assert.equal(snapshot().planContinuation.enabled,autoBeforeReview);
  await waitFor(()=>sidebar.executeJavaScript("!document.getElementById('plan-review-toggle').disabled"),'review toggle ready',snapshot);
  await sidebar.executeJavaScript("document.getElementById('plan-review-toggle').click()");
  await waitFor(()=>!snapshot().planReview.enabled,'review disabled',snapshot);

  await continuePlan(true);
  assert.equal(snapshot().planContinuation.enabled,true,'explicit ON waits for the first plan');
  for(const [review,auto] of [[false,false],[true,false],[false,false]]) {
    // Review stays a button; the former continuation engine has no button and is set directly.
    if(snapshot().planContinuation.enabled!==auto)await continuePlan(auto);
    for(const [id,current,wanted] of [
      ['plan-review-toggle',()=>snapshot().planReview.enabled,review]]) {
      if(current()!==wanted){
        await waitFor(()=>sidebar.executeJavaScript(`!document.getElementById('${id}').disabled`),'independent toggles ready',snapshot);
        await sidebar.executeJavaScript(`document.getElementById('${id}').click()`);
        await waitFor(()=>current()===wanted,'independent toggle state',snapshot);
      }
    }
    assert.equal(snapshot().planReview.enabled,review);assert.equal(snapshot().planContinuation.enabled,auto);
    assert.equal(await sidebar.executeJavaScript("document.getElementById('plan-review-toggle').getAttribute('aria-pressed')"),String(review));
    assert.equal((await savedAutoState()).planContinuationEnabled,auto);
    const restoredReview=new PlanReviewClient({selected:()=>({workspace})});
    restoredReview.observeSelection();assert.equal(restoredReview.view().enabled,review);restoredReview.dispose();
    for(const theme of ['light','dark']){
      await sidebar.executeJavaScript(`window.webPilot.setTheme(${JSON.stringify(theme)})`);
      for(const [id,on] of [['plan-review-toggle',review]]){
        const appearance=await sidebar.executeJavaScript(`(()=>{const b=document.getElementById('${id}');return {pressed:b.getAttribute('aria-pressed'),text:b.textContent,color:getComputedStyle(b).backgroundColor}})()`);
        assert.equal(appearance.pressed,String(on));assert.match(appearance.text,on?/^Выключить/:/^Включить/);
        // The switch uses the shared selected token when on and the line token when off, in each theme.
        const selected={light:'rgb(228, 241, 240)',dark:'rgb(32, 53, 54)'}[theme],line={light:'rgb(218, 228, 233)',dark:'rgb(54, 62, 72)'}[theme];
        assert.equal(appearance.color,on?selected:line,theme+' '+id);
      }
    }
  }

  // Renderer handler on TEST FIXTURE: icons retain the explanatory live text.
  const indicatorBase=snapshot();
  for(const indicator of ['working','waiting','success','attention','none']){
    let icon;
    await waitFor(async()=>{
      sidebar.send('pilot:state-changed',{...indicatorBase,planReview:{...indicatorBase.planReview,message:'Проверка статуса Review',indicator}});
      // Real project controllers may publish between fixture events. Capture the
      // rendered input and its appearance in one read, retrying only fixture input.
      icon=await sidebar.executeJavaScript(`(()=>{const i=document.getElementById('plan-review-indicator');return {state:i.dataset.state,hidden:i.hidden,decorative:i.getAttribute('aria-hidden'),animation:getComputedStyle(i).animationName,text:document.getElementById('plan-review-text').textContent,role:document.getElementById('plan-review-message').getAttribute('role')}})()`);
      return icon.state===indicator&&icon.text==='Проверка статуса Review';
    },'review indicator '+indicator,snapshot);
    assert.equal(icon.hidden,indicator==='none');assert.equal(icon.decorative,'true');assert.equal(icon.role,'status');
    assert.equal(icon.text,'Проверка статуса Review');
    if(indicator!=='working')assert.equal(icon.animation,'none','waiting and attention never animate');
  }
  sidebar.debugger.attach('1.3');
  try{
    await sidebar.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    let reduced;
    await waitFor(async()=>{
      sidebar.send('pilot:state-changed',{...indicatorBase,planReview:{...indicatorBase.planReview,message:'Claude проверяет документы.',indicator:'working'}});
      reduced=await sidebar.executeJavaScript(`({state:document.getElementById('plan-review-indicator').dataset.state,animation:getComputedStyle(document.getElementById('plan-review-indicator')).animationName,text:document.getElementById('plan-review-text').textContent})`);
      return reduced.state==='working'&&reduced.text==='Claude проверяет документы.';
    },'reduced motion review',snapshot);
    assert.equal(reduced.animation,'none');
  }finally{
    await sidebar.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[]});sidebar.debugger.detach();
    sidebar.send('pilot:state-changed',snapshot());
  }

  // Restore the fixture input so unrelated context scenarios still start from the original packet.
  if(originalReviewState)await fs.writeFile(reviewStateFile,originalReviewState);else await fs.rm(reviewStateFile);

  const planFile = path.join(workspace, '.harness/plans/todo-plan.md');
  const originalPlanText = await fs.readFile(planFile, 'utf8');
  const block = originalPlanText.match(/<!-- workflow-state:begin -->\s*```json\s*([\s\S]*?)```\s*<!-- workflow-state:end -->/);
  const activePlan = JSON.parse(block[1]);

  Object.assign(activePlan, { plan_revision: activePlan.plan_revision + 1, scope_id: 'fixture-plan-ui', baseline_commit: 'a'.repeat(40), acceptance_criteria: ['Fixture'], objective: 'Автоимя scope fixture', execution_scope_status: 'ACTIVE',
    delivery_status: 'IN_PROGRESS', current_task_id: 'T002', archived_scope_id: undefined, tasks: [
      { id: 'T001', title: 'Подготовить модель', implementation_status: 'DONE', commit_status: 'DONE' },
      { id: 'T002', title: 'Сделать интерфейс', implementation_status: 'IN_PROGRESS', commit_status: 'PENDING' },
      { id: 'T003', title: 'Собрать релиз', implementation_status: 'TODO', commit_status: 'PENDING' },
    ] });
  delete activePlan.archived_scope_id;
  activePlan.approved_scope.documentation_paths = ['docs/architecture/OVERVIEW.md'];
  activePlan.tasks = activePlan.tasks.map(task => ({ ...task, why: 'Isolated rendering fixture', dependencies: [],
    functional_paths: [], documentation_paths: ['docs/architecture/OVERVIEW.md'], acceptance_criteria: ['Fixture'], verification_ids: [],
    expected_commit_message: 'docs: rendering fixture', commit_ref: {scope_id: activePlan.scope_id, task_id: task.id, role: 'implementation'} }));
  const writeFixturePlan = async plan => fs.writeFile(planFile, renderPlan(plan));
  await writeFixturePlan(activePlan); controller.attach(store.selected()); await controller.tick();
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("plan-status").textContent === "в main 1 из 3"'), 'working plan UI', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-title").hidden'), false);
  const firstScopeTitle = 'Автоимя scope fixture';
  await waitFor(() => store.selected().title === firstScopeTitle && store.selected().titleSource === 'scope',
    'new scope gives the selected session a stable local title', snapshot);
  const firstConversationId = new URL(store.selected().chatUrl).pathname.split('/').at(-1);
  await waitFor(() => fixtureConversationTitles.get(firstConversationId) === firstScopeTitle,
    'new scope title is stored by native ChatGPT fixture', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.querySelector("#plan-card .eyebrow")'), null);
  assert.deepEqual(await sidebar.executeJavaScript(`Array.from(document.querySelectorAll('#plan-tasks .plan-task')).map(e=>({status:e.dataset.status,title:e.querySelector('strong').textContent,mark:e.querySelector('.plan-task-state .wp-spin')?'spinner':e.querySelector('.plan-task-state').textContent}))`), [
    { status: 'done', title: 'Подготовить модель', mark: '✓' },
    { status: 'current', title: 'Сделать интерфейс', mark: 'spinner' },
    { status: 'pending', title: 'Собрать релиз', mark: '○' },
  ]);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-card").textContent.includes("Revision") || document.getElementById("plan-card").textContent.includes("версия")'), false);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("accept-plan") === null'), true);

  const readyPlan = { ...activePlan, plan_revision: activePlan.plan_revision + 1, delivery_status: 'READY_FOR_ACCEPTANCE', current_task_id: null,
    tasks: activePlan.tasks.map(task => ({ ...task, implementation_status: 'DONE', commit_status: 'DONE' })) };
  await writeFixturePlan(readyPlan); controller.attach(store.selected()); await controller.tick();
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("plan-status").dataset.state === "awaiting-acceptance"'), 'completed plan remains visible', snapshot);
  // The project projection follows the same plan read; it may arrive one publish later.
  await waitFor(() => sidebar.executeJavaScript('document.querySelectorAll("#plan-tasks .plan-task[data-status=done]").length === 3'), 'all tasks in main', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-phase-text").textContent'), 'Ждёт приёмки');
  assert.equal(await sidebar.executeJavaScript('document.getElementById("accept-plan") === null'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("next-session-choice") === null'), true);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1, 'completion never sends an acceptance message');
  assert.equal(store.selected().sessionId, first.sessionId);
  await fs.writeFile(planFile, originalPlanText); controller.attach(store.selected()); await controller.tick();
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("plan-progress").hidden && document.getElementById("plan-note").hidden'), 'restore fixture plan', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("accept-plan") === null'), true);
  await clipboard.clear();
  await waitFor(() => sidebar.executeJavaScript('!document.querySelector(".project-menu-button").disabled'), 'project menu enabled', snapshot);
  await sidebar.executeJavaScript(`document.querySelector('.project-menu-button').click(); document.querySelector('.copy-workspace-path').click()`);
  await waitFor(async () => await clipboard.readText() === workspace, 'copy exact workspace path from menu', snapshot);
  // 0.6.96: the first line for a client outside Web Pilot; it goes to the clipboard only.
  const messagesBeforeLine = await browser.executeJavaScript('window.fixtureMessages.length');
  await sidebar.executeJavaScript(`document.querySelector('.project-menu-button').click(); document.querySelector('.copy-external-client-line').click()`);
  await waitFor(async () => (await clipboard.readText()).includes('recover --format text > .harness/runtime/recovery.txt'), 'copy the line for an external client', snapshot);
  const externalLine = await clipboard.readText();
  assert.ok(externalLine.includes(JSON.stringify(workspace)) && externalLine.includes('AGENTS.md'));
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), messagesBeforeLine, 'nothing is sent to the chat');
  await waitFor(()=>['delivered','startup-channel','startup-complete'].includes(snapshot().context.phase),'initial delivery settled',snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("context-card")'),null);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("session-notice").hidden'),true);
  assert.equal(await sidebar.executeJavaScript('document.querySelector("footer")'),null);
  const disclosureSize = await sidebar.executeJavaScript(`(() => { const e=document.querySelector('.expand-project'); const p=getComputedStyle(e,'::before'); return {button:e.getBoundingClientRect().width, icon:e.querySelector('svg').getBoundingClientRect().width, expanded:e.getAttribute('aria-expanded')}; })()`);
  assert.ok(disclosureSize.button >= 32); assert.ok(disclosureSize.icon >= 18); assert.ok(['true','false'].includes(disclosureSize.expanded));
  const restored = new WorkspaceSessions(store.file); await restored.load();
  assert.equal(restored.selected().sessionId, first.sessionId); assert.equal(restored.selected().chatUrl, first.chatUrl);
  await navigate(restored.selected());
  await waitFor(() => settled(), 'reopen manually sent conversation', snapshot);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1, 'manual Send never duplicates on reopen');

  // Native error UI must reopen this exact persisted conversation once, without Send.
  const boundUrl = store.selected().chatUrl;
  const boundSessionId = store.selected().sessionId;
  const recoverySessionCount = store.snapshot().projects.find(p=>p.workspace===workspace).sessions.length;
  const previousDocument = pageState.current.documentId;
  const injectError = "(()=>{const e=document.createElement('div');e.setAttribute('role','alert');e.textContent='Resume stream unavailable';document.body.append(e)})()";
  // A healthy page event can reset restored to idle before a polling check.
  // Capture every published phase before triggering recovery.
  await sidebar.executeJavaScript(`
    window.fixtureRecoveryPhases = [];
    window.stopFixtureRecoveryPhases = window.webPilot.onState(state => {
      const phase = state.conversationRecovery.phase;
      if (window.fixtureRecoveryPhases.at(-1) !== phase) window.fixtureRecoveryPhases.push(phase);
    });
    void 0; // executeJavaScript must not try to clone the unsubscribe function.
  `);
  try {
    await browser.executeJavaScript(injectError);
    await waitFor(() => sidebar.executeJavaScript('window.fixtureRecoveryPhases.includes("restored")'), 'safe stream reconnection', snapshot);
    assert.equal(browser.getURL(), boundUrl); assert.notEqual(pageState.current.documentId, previousDocument);
    assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
    assert.equal(store.selected().chatUrl, boundUrl);
    // A second outage requires an explicit action and must preserve a user's draft.
    await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent='Несохранённый черновик'");
    await browser.executeJavaScript(injectError);
    await waitFor(() => snapshot().conversationRecovery.phase === 'failed', 'bounded reconnect', snapshot);
    assert.equal(await sidebar.executeJavaScript("document.getElementById('conversation-recovery').hidden"),false);
    assert.equal(await sidebar.executeJavaScript("document.getElementById('reconnect-chat').textContent"),'Перезагрузить страницу чата');
    assert.match(await sidebar.executeJavaScript("document.getElementById('conversation-recovery-message').textContent"),/обнаружена ошибка соединения/);
    assert.match(await sidebar.executeJavaScript("document.getElementById('conversation-recovery-explanation').textContent"),/текущая страница чата.*Новый чат не создаётся, сообщение повторно не отправляется/);
    await sidebar.executeJavaScript("document.getElementById('reconnect-chat').click()");
    await waitFor(() => snapshot().conversationRecovery.phase === 'blocked', 'draft blocks reconnect', snapshot);
    assert.equal(await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent"), 'Несохранённый черновик');
    await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent=''");
    await sidebar.executeJavaScript('window.fixtureRecoveryPhases = []');
    await sidebar.executeJavaScript("document.getElementById('reconnect-chat').click()");
    await waitFor(() => sidebar.executeJavaScript('window.fixtureRecoveryPhases.includes("restored")'), 'manual reconnect button', snapshot);
    assert.equal(browser.getURL(), boundUrl);
    assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
    assert.equal(store.selected().sessionId,boundSessionId,'reload preserves the session');
    assert.equal(store.snapshot().projects.find(p=>p.workspace===workspace).sessions.length,recoverySessionCount,'reload creates no new chat');
  } finally {
    await sidebar.executeJavaScript('window.stopFixtureRecoveryPhases(); delete window.stopFixtureRecoveryPhases; delete window.fixtureRecoveryPhases;');
  }

  // A large prompt and a delayed Send button are verified through the native fixture composer.
  // Use a separate isolated view so session-count and packet-cache assertions stay independent.
  const largeView = new BrowserWindow({ show: false, webPreferences: {
    partition: 'persist:workflow-pilot-smoke', sandbox: true, contextIsolation: true, nodeIntegration: false,
    preload: path.join(app.getAppPath(), 'resources/chatgpt-page-observer-preload.cjs') } });
  const { PageStateSource } = await import('../src/execution/browser/page-state.mjs');
  const { connectPageState } = await import('../src/execution/browser/page-state-bridge.mjs');
  const { ipcMain } = await import('electron');
  const largeSource = new PageStateSource();
  const disconnect = connectPageState(largeView.webContents, ipcMain, largeSource);
  try {
    await largeView.loadURL('https://chatgpt.com/');
    // Production waits for observer readiness before delivery; the isolated view must too.
    await waitFor(() => largeSource.current?.state.editorAvailable, 'large composer observer ready', () => largeSource.current);
    await largeView.webContents.executeJavaScript("document.querySelector('[data-testid=send-button]').disabled=true; setTimeout(()=>document.querySelector('[data-testid=send-button]').disabled=false,700)");
    const largeComposer = new ChatGPTComposer(largeView.webContents, { pageState: largeSource });
    const largeText = fixtureContext.repeat(3) + '\nwp-request-large-autosend';
    assert.ok(Buffer.byteLength(largeText) > 200000);
    const largeResult = await largeComposer.deliver({ text: largeText, requestId: 'wp-request-large-autosend' });
    assert.equal(largeResult.state, 'sent', JSON.stringify(largeResult));
    assert.equal(await largeView.webContents.executeJavaScript('window.fixtureMessages.length'), 1);
    assert.equal((await largeComposer.inspect({ text: largeText, requestId: 'wp-request-large-autosend' })).messageSeen, true);
  } finally { disconnect(); largeView.destroy(); }

  controller.attach(store.selected()); await controller.tick();
  await controller.contextCache.load(workspace);
  const warmPacketLoads = packetLoads;
  assert.deepEqual(await sidebar.executeJavaScript(`(() => { document.querySelector('.project-menu-button').click(); return Array.from(document.querySelectorAll('.project-menu button')).map(button => button.textContent); })()`),
    ['Новый Chat', 'Переименовать', 'Скопировать полный путь', 'Скопировать строку для внешнего клиента', 'Перенести в архив']);
  await sidebar.executeJavaScript(`document.querySelector('.project-menu-button').click(); document.querySelector('.rename-project').click()`);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("rename-dialog").open'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("rename-dialog-input").value'), 'Тестовый проект с пробелами');
  await sidebar.executeJavaScript(`document.getElementById('rename-dialog-input').value='Проект Smoke Rename'; document.getElementById('rename-dialog-save').click()`);
  await waitFor(() => snapshot().projects[0].name === 'Проект Smoke Rename', 'project rename dialog IPC', snapshot);
  assert.equal(store.project(workspace).name, 'Тестовый проект с пробелами', 'project rename keeps canonical workflow name');
  // The project list row in the real sidebar: the name uses the free width, «В архив» stays compact.
  const pickerLayout = await sidebar.executeJavaScript(`(()=>{const menu=document.getElementById('project-actions');const was=menu.open;menu.open=true;
    const row=document.querySelector('#project-options .project-choice'),name=row.querySelector('[data-project-choice]'),archive=row.querySelector('.project-choice-archive');
    const a=name.getBoundingClientRect(),b=archive.getBoundingClientRect(),line=parseFloat(getComputedStyle(name).lineHeight)||18;
    const result={name:a.width,archive:b.width,height:a.height,line,sameRow:Math.abs(a.top-b.top)<a.height};menu.open=was;return result;})()`);
  assert.ok(pickerLayout.name > pickerLayout.archive * 2, 'project name is not squeezed: ' + JSON.stringify(pickerLayout));
  assert.ok(pickerLayout.height <= pickerLayout.line * 3 + 24, 'project name is not vertical: ' + JSON.stringify(pickerLayout));
  assert.ok(pickerLayout.sameRow, 'archive button sits on the row: ' + JSON.stringify(pickerLayout));
  // A started task of the to-do plan (the row is a button) uses the same two columns as an ordinary row.
  const taskLayout = await sidebar.executeJavaScript(`(()=>{const box=document.createElement('div');box.style.cssText='position:absolute;left:0;top:0;width:420px';
    box.innerHTML='<ul class="plan-tasks"><li class="plan-task"><button class="plan-task-open" type="button"><span class="plan-task-state">●</span><div><span class="plan-task-id">T002</span><strong>Подсчёт строк, слов, символов и средней длины</strong></div></button></li>'
      +'<li class="plan-task"><span class="plan-task-state">○</span><div><span class="plan-task-id">T004</span><strong>Подсчёт строк, слов, символов и средней длины</strong></div></li></ul>';
    document.body.append(box);const [open,plain]=[...box.querySelectorAll('strong')].map(node=>node.getBoundingClientRect());box.remove();
    return {open:{width:open.width,height:open.height},plain:{width:plain.width,height:plain.height}};})()`);
  assert.ok(Math.abs(taskLayout.open.width - taskLayout.plain.width) < 2 && taskLayout.open.height <= taskLayout.plain.height + 1,
    'a started task wraps like an ordinary one: ' + JSON.stringify(taskLayout));
  // The project may already be open after its first session; expand only a folded one.
  await sidebar.executeJavaScript(`{ const b=document.querySelector('.expand-project'); if(b.getAttribute('aria-expanded')!=='true')b.click(); }`);
  await waitFor(() => sidebar.executeJavaScript('!document.querySelector(".sessions").hidden && !document.querySelector(".session").disabled'), 'expand before session actions', snapshot);
  await sidebar.executeJavaScript(`{ const li=document.querySelector('[data-session-id="${first.sessionId}"]').closest('li'); li.querySelector('.session-menu-button').click(); li.querySelector('.rename-session').click(); }`);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("rename-dialog").open'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("rename-dialog-input").value'), store.selected().title);
  await sidebar.executeJavaScript(`(()=>{const input=document.getElementById('rename-dialog-input');input.value='Сессия Smoke Rename';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);
  await waitFor(() => store.selected()?.title === 'Сессия Smoke Rename', 'session rename dialog Enter IPC', snapshot);
  assert.equal(store.selected().titleSource, 'manual');
  await sidebar.executeJavaScript(`{ const li=document.querySelector('[data-session-id="${first.sessionId}"]').closest('li'); li.querySelector('.session-menu-button').click(); li.querySelector('.rename-session').click(); document.getElementById('rename-dialog-input').value='Не сохранять'; document.getElementById('rename-dialog-cancel').click(); }`);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("rename-dialog").open'), false);
  assert.equal(store.selected().title, 'Сессия Smoke Rename', 'rename dialog cancel preserves title');
  const firstTitleId = new URL(first.chatUrl).pathname.split('/').at(-1);
  await waitFor(() => fixtureConversationTitles.get(firstTitleId) === 'Сессия Smoke Rename',
    'manual local rename uses the same native ChatGPT sync path', snapshot);

  fixtureTitleDelayMs = 1200;
  const slowRenameStarted = Date.now();
  const slowRename = await sidebar.executeJavaScript(`window.webPilot.renameSession(${JSON.stringify(workspace)}, ${JSON.stringify(first.sessionId)}, 'Локальное имя без ожидания сети')`);
  const slowRenameElapsed = Date.now() - slowRenameStarted;
  assert.equal(slowRename.ok, true);
  assert.ok(slowRenameElapsed < 700, `manual IPC waited for native title sync: ${slowRenameElapsed}ms`);
  assert.equal(store.selected().title, 'Локальное имя без ожидания сети');
  fixtureTitleDelayMs = 0;
  await waitFor(() => fixtureConversationTitles.get(firstTitleId) === 'Локальное имя без ожидания сети',
    'detached manual sync eventually updates native title', snapshot);

  fixtureTitleReadFailures = 1;
  const requestsBefore429 = fixtureTitleRequests;
  const refusedRename = await sidebar.executeJavaScript(`window.webPilot.renameSession(${JSON.stringify(workspace)}, ${JSON.stringify(first.sessionId)}, 'Имя после 429')`);
  assert.equal(refusedRename.ok, true);
  assert.equal(store.selected().title, 'Имя после 429');
  await waitFor(() => fixtureTitleReadFailures === 0, 'one native title read receives 429', snapshot);
  const requestsAfter429 = fixtureTitleRequests;
  assert.ok(requestsAfter429 > requestsBefore429);
  await new Promise(resolve => setTimeout(resolve, 1500));
  assert.equal(fixtureTitleRequests, requestsAfter429, '429 never starts an automatic title retry loop');
  assert.equal(fixtureConversationTitles.get(firstTitleId), 'Локальное имя без ожидания сети');

  await navigate(store.selected());
  await waitFor(() => fixtureConversationTitles.get(firstTitleId) === 'Имя после 429',
    'next natural reopen reconciles the unsynced manual title once', snapshot);
  await browser.executeJavaScript(`document.title='Поздний заголовок ChatGPT'`);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(store.selected().title, 'Имя после 429', 'page title cannot overwrite manual session name');
  await browser.executeJavaScript("localStorage.setItem('fixture-hold-conversation','yes')");
  await sidebar.executeJavaScript('document.querySelector(".new-project-chat").click()');
  await waitFor(()=>store.selected()?.sessionId!==first.sessionId&&store.selected()?.attempt?.state==='sent'&&!store.selected()?.chatUrl,
    'bootstrap dispatched before permanent Chat URL',snapshot);
  const pendingChat=store.selected(),pendingRecord=liveSessions.find(pendingChat),pendingDocument=pendingRecord.pageState.current.documentId;
  assert.match(pendingRecord.composer.getURL(),/\/c\/WEB:/);
  for(const sessionId of [first.sessionId,pendingChat.sessionId,pendingChat.sessionId])
    await sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)},${JSON.stringify(sessionId)})`);
  await waitFor(()=>snapshot().workspaceHealth.ready,'selected pending Chat ready',snapshot);
  assert.equal(pendingRecord.pageState.current.documentId,pendingDocument,'selection keeps the exact temporary conversation document');
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'),1,'selection never duplicates bootstrap');
  await browser.executeJavaScript("localStorage.removeItem('fixture-hold-conversation');window.fixtureFinishConversation()");
  await waitFor(() => store.selected()?.sessionId !== first.sessionId && settled(), 'new Chat via project menu IPC', snapshot);
  assert.equal(packetLoads, warmPacketLoads, 'new Chat reuses the checkout-scoped recovery packet');
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  const second = store.selected();
  const firstRuntime=liveSessions.ensure(first),secondRuntime=liveSessions.ensure(second);
  assert.notEqual(sessionView(firstRuntime).webContents.id,sessionView(secondRuntime).webContents.id);
  const firstDocument=firstRuntime.pageState.current.documentId;
  await sessionView(firstRuntime).webContents.executeJavaScript("window.fixtureBackgroundMarker=17; document.getElementById('prompt-textarea').textContent='background draft'");
  await waitFor(()=>firstRuntime.pageState.current.state.draftPresent,'hidden page continues to report its own state',snapshot);
  assert.equal(secondRuntime.pageState.current.state.draftPresent,false,'hidden page does not alter selected page state');
  assert.equal(firstRuntime.pageState.current.documentId,firstDocument);
  assert.equal(firstRuntime.controller.active.sessionId,first.sessionId);
  await sessionView(firstRuntime).webContents.executeJavaScript("document.getElementById('prompt-textarea').textContent=''");
  assert.equal(second.attempt.packet.session_id, undefined);
  assert.equal(second.attempt.packet.plan_id, null);
  assert.equal(second.attempt.packet.contextSha256, first.attempt.packet.contextSha256);
  assert.notEqual(second.attempt.requestId, first.attempt.requestId);
  assert.ok(Number.isFinite(second.attempt.packet.preparationMs));
  assert.match(await sidebar.executeJavaScript('document.getElementById(\"session-detail\").textContent'), /Подготовка:/);
  assert.equal(store.snapshot().projects[0].sessions.length, 2);
  assert.deepEqual(await sidebar.executeJavaScript('Array.from(document.querySelectorAll(".session-experience")).map(e=>e.textContent)'), ['Chat', 'Chat']);
  assert.equal(snapshot().projects[0].sessions[0].attempt, undefined, 'Session tree only receives metadata');
  await browser.executeJavaScript("localStorage.setItem('fixture-hold-conversation','yes')");
  await sidebar.executeJavaScript(`document.querySelector('.project-menu-button').click(); document.querySelector('.new-project-chat').click()`);
  await waitFor(()=>store.selected()?.sessionId!==second.sessionId&&store.selected()?.attempt?.state==='sent'&&!store.selected()?.chatUrl,
    'second Chat bootstrap dispatched before permanent URL',snapshot);
  const menuPendingChat=store.selected(),menuPendingRecord=liveSessions.find(menuPendingChat),menuPendingDocument=menuPendingRecord.pageState.current.documentId;
  for(const sessionId of [first.sessionId,menuPendingChat.sessionId])
    await sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)},${JSON.stringify(sessionId)})`);
  await waitFor(()=>snapshot().workspaceHealth.ready,'selected pending Chat ready',snapshot);
  assert.equal(menuPendingRecord.pageState.current.documentId,menuPendingDocument);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'),1);
  await browser.executeJavaScript("localStorage.removeItem('fixture-hold-conversation');window.fixtureFinishConversation()");
  await waitFor(() => store.selected()?.sessionId===menuPendingChat.sessionId && settled(), 'second Chat via project menu IPC', snapshot);
  assert.equal(packetLoads, warmPacketLoads, 'new Chat reuses the same checkout-scoped recovery packet');
  const third = store.selected();
  assert.ok(third.chatUrl.startsWith('https://chatgpt.com/c/'));
  assert.ok(browser.getURL().startsWith('https://chatgpt.com/c/'));
  assert.equal(store.snapshot().projects[0].sessions.length, 3);
  assert.deepEqual(await sidebar.executeJavaScript('Array.from(document.querySelectorAll(".session-experience")).map(e=>e.textContent)'), ['Chat', 'Chat', 'Chat']);
  await sidebar.executeJavaScript(`document.querySelector('.project-menu-button').click(); document.querySelector('.new-project-chat').click()`);
  await waitFor(() => store.selected()?.sessionId !== third.sessionId
    && settled(), 'another Chat starts without a surface preference', snapshot);
  assert.equal(packetLoads, warmPacketLoads, 'chat navigation does not duplicate checkout recovery');
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  const fourth = store.selected();
  assert.deepEqual(snapshot().projects[0].sessions.map(s => s.sessionId), [fourth.sessionId, third.sessionId, second.sessionId, first.sessionId]);
  const treeScreenshots = [];
  for (const width of [312, 408]) {
    await sidebar.executeJavaScript('window.webPilot.setSidebarWidth(' + width + ')');
    await waitFor(() => snapshot().sidebarWidth === width, 'tree width ' + width, snapshot);
    for (const theme of ['light', 'dark']) {
      await sidebar.executeJavaScript('window.webPilot.setTheme(' + JSON.stringify(theme) + ')');
      await waitFor(() => sidebar.executeJavaScript('document.documentElement.dataset.theme === ' + JSON.stringify(theme)), 'tree theme ' + theme, snapshot);
      const bounds = await sidebar.executeJavaScript(`(() => {
        const list=document.querySelector('.sessions'), rows=[...list.children], row=rows[0], style=getComputedStyle(list);
        const right=list.getBoundingClientRect().right, menu=row.querySelector('.session-menu-button').getBoundingClientRect();
        const badge=row.querySelector('.session-experience').getBoundingClientRect();
        return {height:list.clientHeight,rowHeight:row.getBoundingClientRect().height,overflow:list.scrollHeight>list.clientHeight,
          scrollbar:list.offsetWidth-list.clientWidth, gutter:style.scrollbarGutter, right,menuRight:menu.right,badgeRight:badge.right,
          menuCenter:(menu.left+menu.right)/2,badgeCenter:(badge.left+badge.right)/2,menuBottom:menu.bottom,badgeTop:badge.top,
          copyRight:row.querySelector('.session-copy').getBoundingClientRect().right,badgeLeft:badge.left,
          horizontal:list.scrollWidth<=list.clientWidth, bodyFits:document.documentElement.scrollWidth<=innerWidth};
      })()`);
      assert.ok(Math.abs(bounds.height - bounds.rowHeight * 3) < 2, JSON.stringify(bounds));
      assert.ok(bounds.overflow && bounds.horizontal && bounds.bodyFits, JSON.stringify(bounds));
      assert.ok(bounds.scrollbar >= 10 && bounds.gutter === 'stable', JSON.stringify(bounds));
      // One right column: the menu above the Chat/Chat badge, centred on it; the row height does not depend on the width.
      assert.ok(Math.max(bounds.menuRight, bounds.badgeRight) < bounds.right - bounds.scrollbar, JSON.stringify(bounds));
      assert.ok(Math.abs(bounds.menuCenter - bounds.badgeCenter) < 1 && bounds.menuBottom <= bounds.badgeTop, JSON.stringify(bounds));
      assert.ok(bounds.copyRight <= bounds.badgeLeft && Math.abs(bounds.rowHeight - 80) < 1, JSON.stringify(bounds));
      const imageFile=path.join(dataDir, 'projects-' + width + '-' + theme + '.png');
      await fs.writeFile(imageFile, (await sidebar.capturePage()).toPNG()); treeScreenshots.push(imageFile);
    }
  }
  await sidebar.executeJavaScript('window.webPilot.setTheme("light")');
  await waitFor(() => snapshot().theme === 'light', 'restore theme after tree check', snapshot);
  await sidebar.executeJavaScript(`document.querySelector('.sessions').scrollTop=document.querySelector('.sessions').scrollHeight`);
  await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const oldScroll = await sidebar.executeJavaScript(`(() => {
    const list=document.querySelector('.sessions');
    const button=list.querySelector('[data-session-id="${first.sessionId}"]').closest('li').querySelector('.session-menu-button');
    button.focus({preventScroll:true}); button.click(); const menu=button.closest('li').querySelector('.session-menu'), rect=menu.getBoundingClientRect();
    const result={scroll:list.scrollTop,open:menu.matches(':popover-open'),visible:rect.width>0 && rect.top>=0 && rect.bottom<=innerHeight};
    menu.hidePopover(); result.afterHide=list.scrollTop; return result;
  })()`);
  assert.ok(oldScroll.scroll > 0 && oldScroll.open && oldScroll.visible, JSON.stringify(oldScroll));
  assert.equal(oldScroll.afterHide, oldScroll.scroll, JSON.stringify(oldScroll));
  await sidebar.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  assert.equal(await sidebar.executeJavaScript('document.querySelector(".sessions").scrollTop'), oldScroll.scroll, 'menu closing preserves scroll');

  await sidebar.executeJavaScript(`document.querySelector('[data-session-id="${first.sessionId}"]').click()`);
  await waitFor(() => store.selected()?.sessionId === first.sessionId && settled()
    && browser.getURL() === first.chatUrl, 'select earlier session via tree', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.querySelector(".sessions").scrollTop'), oldScroll.scroll, 'old session keeps scroll after state refresh');
  assert.deepEqual(snapshot().projects[0].sessions.map(s => s.sessionId), [fourth.sessionId, third.sessionId, second.sessionId, first.sessionId]);
  assert.equal(packetLoads, warmPacketLoads, 'Earlier chat does not receive another context packet');
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  assert.ok(await browser.executeJavaScript("window.fixtureMessages[0].text.includes('workflow_pilot_panel')"));
  assert.equal(store.selected().attempt.requestId, first.attempt.requestId);
  assert.equal(store.snapshot().projects[0].sessions[1].sessionId, second.sessionId);
  assert.equal(store.snapshot().projects[0].sessions[2].sessionId, third.sessionId);

  const archiveSessionFromTree = async sessionId => {
    await sidebar.executeJavaScript(`{ const choice=document.querySelector('[data-session-id="${sessionId}"]'); const li=choice.closest('li'); li.querySelector('.session-menu-button').click(); li.querySelector('.archive-session').click(); }`);
    await waitFor(() => store.snapshot().projects[0].sessions.find(session => session.sessionId === sessionId)?.archivedAt, 'archive session from tree', snapshot);
  };
  await archiveSessionFromTree(second.sessionId);
  assert.equal(snapshot().projects[0].sessions.some(session => session.sessionId === second.sessionId), false, 'archived session disappears from active tree');
  await sidebar.executeJavaScript('window.webPilot.openArchive()');
  await waitFor(() => !!getArchiveWindow() && !getArchiveWindow().isDestroyed(), 'session archive window', snapshot);
  let sessionArchiveWindow = getArchiveWindow(), sessionArchive = sessionArchiveWindow.webContents;
  await waitFor(() => sessionArchive.executeJavaScript('typeof window.webPilotArchive === "object"'), 'session archive preload ready', snapshot);
  await sessionArchive.executeJavaScript('document.getElementById("tab-sessions").click()');
  await waitFor(() => sessionArchive.executeJavaScript('document.querySelectorAll(".item").length === 1'), 'archived session visible', snapshot);
  assert.ok(await sessionArchive.executeJavaScript('document.querySelector(".item").textContent.includes("Проект Smoke Rename")'));
  assert.ok(await sessionArchive.executeJavaScript('document.querySelector(".item").textContent.includes("Chat")'));
  await sessionArchive.executeJavaScript('document.querySelector(".item").click(); document.getElementById("restore-sessions").click()');
  await waitFor(() => !store.snapshot().projects[0].sessions.find(session => session.sessionId === second.sessionId)?.archivedAt, 'restore archived session', snapshot);
  sessionArchiveWindow.close(); await waitFor(() => !getArchiveWindow() || getArchiveWindow().isDestroyed(), 'close session archive window', snapshot);

  await archiveSessionFromTree(third.sessionId);
  await sidebar.executeJavaScript('window.webPilot.openArchive()');
  await waitFor(() => !!getArchiveWindow() && !getArchiveWindow().isDestroyed(), 'session delete archive window', snapshot);
  sessionArchiveWindow = getArchiveWindow(); sessionArchive = sessionArchiveWindow.webContents;
  await waitFor(() => sessionArchive.executeJavaScript('typeof window.webPilotArchive === "object"'), 'session delete archive preload ready', snapshot);
  await sessionArchive.executeJavaScript('document.getElementById("tab-sessions").click()');
  await waitFor(() => sessionArchive.executeJavaScript('document.querySelectorAll(".item").length === 1'), 'Chat session in archive', snapshot);
  assert.ok(await sessionArchive.executeJavaScript('document.querySelector(".item").textContent.includes("Chat")'));
  await sessionArchive.executeJavaScript('document.querySelector(".item").click(); document.getElementById("delete-sessions").click()');
  await waitFor(() => sessionArchive.executeJavaScript('!document.getElementById("session-delete-panel").hidden'), 'session local delete confirmation', snapshot);
  assert.ok(await sessionArchive.executeJavaScript('document.getElementById("session-delete-panel").textContent.includes("OpenAI")'));
  await sessionArchive.executeJavaScript('document.getElementById("confirm-session-delete").click()');
  await waitFor(() => !store.snapshot().projects[0].sessions.some(session => session.sessionId === third.sessionId), 'delete archived session locally', snapshot);
  assert.ok(await fs.stat(workspace), 'session delete keeps workspace folder');
  sessionArchiveWindow.close(); await waitFor(() => !getArchiveWindow() || getArchiveWindow().isDestroyed(), 'close session delete archive', snapshot);
  await archiveSessionFromTree(second.sessionId);
  await sidebar.executeJavaScript('document.querySelector(".expand-project").click()');
  await waitFor(() => sidebar.executeJavaScript('document.querySelector(".sessions").hidden && !document.querySelector(".expand-project").disabled'), 'arrow collapses sessions', snapshot);
  assert.equal(store.selected().sessionId, first.sessionId);
  await sidebar.executeJavaScript('document.querySelector(".expand-project").click()');
  await waitFor(() => sidebar.executeJavaScript('!document.querySelector(".sessions").hidden && !document.querySelector(".project").disabled'), 'arrow expands sessions', snapshot);
  assert.equal(store.selected().sessionId, first.sessionId, 'disclosure preserves conversation');
  await sidebar.executeJavaScript('document.querySelector(".project").click()');
  await waitFor(() => store.selected().sessionId === first.sessionId && settled(), 'project name preserves last selected session', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.querySelector(".sessions").scrollTop'), 0);
  await sidebar.executeJavaScript('document.getElementById("toggle-projects").click()');
  await waitFor(() => sidebar.executeJavaScript('document.querySelector(".sessions").hidden && !document.getElementById("toggle-projects").disabled'), 'collapse all projects', snapshot);
  await sidebar.executeJavaScript('document.getElementById("toggle-projects").click()');
  await waitFor(() => sidebar.executeJavaScript('!document.querySelector(".sessions").hidden && !document.getElementById("toggle-projects").disabled'), 'expand all projects', snapshot);
  assert.equal(store.selected().sessionId, first.sessionId);
  await sidebar.executeJavaScript(`document.querySelector('[data-session-id="${first.sessionId}"]').click()`);
  await waitFor(() => store.selected().sessionId === first.sessionId && settled(), 'restore old selection for restart check', snapshot);
  const history = new WorkspaceSessions(store.file); await history.load();
  assert.equal(history.selected().sessionId, first.sessionId);
  assert.equal(history.snapshot().projects[0].sessions.length, 3);
  assert.ok(history.snapshot().projects[0].sessions.find(session => session.sessionId === second.sessionId).archivedAt);
  assert.equal(history.snapshot().projects[0].expanded, true);
  // A saved chat and its fresh plan open while full readiness is deliberately held.
  await waitFor(() => !controller.contextCache.isPending(), 'settle before navigation races', snapshot);
  const realReady = workspaceSetup.ready.bind(workspaceSetup), readiness = [];
  const readyResult = await realReady(workspace), loadsBeforeNavigation = packetLoads;
  // Hold only the opening checks; background context freshness still uses real inputs.
  const holdOpeningReadiness = (workspace,options) => options?.retain
    ? realReady(workspace,options) : new Promise((resolve,reject)=>readiness.push({resolve,reject}));
  workspaceSetup.ready = holdOpeningReadiness;
  const choose = sessionId => sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)}, ${JSON.stringify(sessionId)})`);
  // Switching sessions shows no notice above the list and never moves it (0.4.8).
  const sidebarStill = () => sidebar.executeJavaScript(`(() => ({progress:document.getElementById('operation-progress').hidden,
    top:Math.round(document.getElementById('projects').getBoundingClientRect().top)}))()`);
  const listBefore = await sidebarStill();
  await choose(first.sessionId); await choose(fourth.sessionId); await choose(first.sessionId);
  assert.deepEqual(await sidebarStill(), listBefore, 'opening a session keeps the sidebar still');
  await waitFor(() => !snapshot().pageLoading, 'saved chat before readiness', snapshot);
  assert.deepEqual(await sidebarStill(), listBefore, 'loading the chat keeps the sidebar still');
  assert.equal(readiness.length, 3); assert.equal(snapshot().workspaceHealth.phase, 'checking');
  assert.equal(snapshot().selected.sessionId, first.sessionId); assert.ok(snapshot().selected.planView);
  assert.equal(controller.active?.sessionId,first.sessionId,'existing live controller survives selection readiness checks'); assert.equal(packetLoads, loadsBeforeNavigation);
  readiness[1].reject(new Error('obsolete B')); readiness[0].resolve({ ...readyResult, ready: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(snapshot().workspaceHealth.phase, 'checking'); assert.equal(snapshot().startupError, null);
  readiness[2].resolve(readyResult);
  await waitFor(() => snapshot().workspaceHealth.ready && settled(), 'newest A readiness', snapshot);
  // Reopening an already live session changes presentation without loadURL.
  workspaceSetup.ready = async () => readyResult;
  const loadURL = browser.loadURL.bind(browser);let reopenedLoads=0;
  browser.loadURL = async (...args) => { reopenedLoads++;return loadURL(...args); };
  await choose(first.sessionId);
  await waitFor(() => snapshot().workspaceHealth.ready, 'readiness before navigation completes', snapshot);
  assert.equal(snapshot().pageLoading, false); assert.equal(controller.active?.sessionId,first.sessionId);
  assert.equal(reopenedLoads,0);browser.loadURL = loadURL;
  await waitFor(() => settled(), 'attach after both prerequisites', snapshot);
  workspaceSetup.ready = holdOpeningReadiness;
  await choose(first.sessionId); await sidebar.executeJavaScript('window.webPilot.openSettings()');
  const healthBeforeLateResult = snapshot().workspaceHealth;
  readiness.at(-1).reject(new Error('obsolete after settings'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controller.active,null,'failed readiness cancels delivery without changing the displayed settings'); assert.deepEqual(snapshot().workspaceHealth, healthBeforeLateResult);
  assert.equal(snapshot().startupError, null);
  workspaceSetup.ready = realReady;
  await browser.executeJavaScript('window.fixtureResumeMarker = 29');
  await sidebar.executeJavaScript('window.webPilot.closeSettings()');
  await waitFor(() => settled(), 'return after navigation races', snapshot);
  assert.equal(await browser.executeJavaScript('window.fixtureResumeMarker'), 29, 'closing settings preserves the loaded DOM');
  const startFile = path.join(workspace, 'docs/architecture/OVERVIEW.md');
  const startText = await fs.readFile(startFile); await fs.unlink(startFile);
  const urlBefore = browser.getURL();
  await selectWorkspace(workspace);
  await waitFor(() => snapshot().workspaceHealth?.phase === 'error' && !snapshot().pageLoading, 'background failure preserves chat', snapshot);
  assert.equal(snapshot().setup, null); assert.equal(snapshot().workspaceHealth.ready, false);
  assert.ok(snapshot().workspaceHealth.issues.some(i => i.path === 'docs/architecture/OVERVIEW.md'));
  assert.equal(controller.active, null);
  assert.equal(store.selected().sessionId, first.sessionId); assert.equal(browser.getURL(), urlBefore);
  await fs.writeFile(startFile, startText);
  await sidebar.executeJavaScript('document.getElementById("workspace-health-retry").click()');
  await waitFor(() => snapshot().workspaceHealth?.ready, 'retry background failure', snapshot);
  const archiveCurrent = async () => {
    await sidebar.executeJavaScript('document.querySelector(".project-menu-button").click(); document.querySelector(".archive-project").click()');
    await waitFor(() => snapshot().archives.some(project => project.workspace === workspace) && !snapshot().selected && !snapshot().pageLoading, 'archive current project', snapshot);
  };
  const makeAux = async (name, suffix) => {
    const dir = path.join(dataDir + '-projects', name);
    await fs.mkdir(path.join(dir, '.harness/plans'), { recursive: true }); await fs.mkdir(path.join(dir, 'scripts'), { recursive: true });
    const plan = { schema_version: 1, plan_revision: 1, project_id: 'fixture-project-' + suffix, project_name: name,
      scope_id: null, execution_scope_status: 'NONE', delivery_status: 'IN_PROGRESS', tasks: [] };
    const planText = '# Fixture\n\n<!-- workflow-state:begin -->\n```json\n' + JSON.stringify(plan, null, 2) + '\n```\n<!-- workflow-state:end -->\n';
    await fs.writeFile(path.join(dir, '.harness/plans/todo-plan.md'), planText);
    await fs.writeFile(path.join(dir, 'scripts/workflow.mjs'), 'export {};\n');
    const selectedProject = await store.select(dir); await store.setArchived(selectedProject.workspace, true); return selectedProject;
  };
  await archiveCurrent();
  assert.equal(await fs.readFile(startFile, 'utf8'), startText.toString(), 'Archiving preserves workspace files');
  const auxB = await makeAux('Архив B', 'b'), auxC = await makeAux('Архив C', 'c'), auxD = await makeAux('Архив D', 'd'), auxE = await makeAux('Архив E', 'e'), auxF = await makeAux('Архив F', 'f');
  assert.equal(store.snapshot().projects.filter(project => project.archivedAt).length, 6);

  await sidebar.executeJavaScript('document.getElementById("open-settings").click()');
  await waitFor(() => !!snapshot().settings, 'gear opens settings', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.querySelector("#archive-list, #archive-empty, #archive-detail, #settings-notice, #delete-form")'), null);
  assert.deepEqual(Object.keys(snapshot().settings), ['workspace']);
  const executionSnapshots = () => store.snapshot().projects.flatMap(project => project.sessions.map(session => [session.sessionId, session.executionSnapshot]));
  const existingExecutionSnapshots = executionSnapshots();
  assert.deepEqual(snapshot().parallelExecution, { parallel_allowed: false, max_workers: 2 });
  await sidebar.executeJavaScript('document.getElementById("parallel-allowed").click()');
  await waitFor(() => snapshot().parallelExecution.parallel_allowed, 'parallel permission saved through real IPC', snapshot);
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("parallel-options").hidden && !document.getElementById("parallel-max-workers").disabled'), 'parallel limit visible', snapshot);
  await sidebar.executeJavaScript('document.getElementById("parallel-max-workers").value = "3"; document.getElementById("parallel-max-workers").dispatchEvent(new Event("change", {bubbles:true}))');
  await waitFor(() => snapshot().parallelExecution.max_workers === 3, 'parallel limit saved through real IPC', snapshot);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8')).parallelExecution, { parallel_allowed: true, max_workers: 3 });
  assert.deepEqual(executionSnapshots(), existingExecutionSnapshots, 'settings never reconfigure existing sessions');
  assert.equal((await sidebar.executeJavaScript('window.webPilot.setParallelExecution({parallel_allowed:false,max_workers:2})')).ok, true);
  await waitFor(() => sidebar.executeJavaScript('document.getElementById("parallel-options").hidden'), 'OFF hides the limit', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("open-archive-window").textContent'), 'Архив…');
  assert.equal(snapshot().platform, process.platform);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("windows-runtime-section")'), null, 'the settings have one local tools section for both systems');
  assert.equal(await sidebar.executeJavaScript('document.getElementById("choose-runtime")'), null, 'macOS has one built-in backend and no runtime folder picker');
  assert.equal(snapshot().theme, 'light');
  await sidebar.executeJavaScript('document.getElementById("theme-dark").click()');
  await waitFor(() => snapshot().theme === 'dark', 'switch shell theme to dark', snapshot);
  assert.equal(nativeTheme.shouldUseDarkColors, true);
  let persistedSettings = JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8'));
  assert.equal(persistedSettings.shellTheme, 'dark'); assert.equal(persistedSettings.sidebarWidth, 408);
  assert.equal(snapshot().hideToolCalls, true);
  await waitFor(() => browser.executeJavaScript('getComputedStyle(document.getElementById("september-tool")).display === "none"'), 'new activity hidden', snapshot);
  await waitFor(() => browser.executeJavaScript('document.getElementById("fixture-tool-call").getAttribute("data-web-pilot-tool-call-hidden") === "true"'), 'default tool call hidden', snapshot);
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("tool-activity")).display'), 'none', 'hidden legacy tool-only wrapper leaves no layout footprint');
  assert.equal(await browser.executeJavaScript('document.getElementById("tool-activity").getAttribute("data-web-pilot-tool-call-footprint-hidden")'), 'true');
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("tool-message")).display'), 'none', 'tool-only message boundary leaves no layout footprint');
  assert.equal(await browser.executeJavaScript('document.getElementById("tool-message").getAttribute("data-web-pilot-tool-call-footprint-hidden")'), 'true');
  assert.notEqual(await browser.executeJavaScript('getComputedStyle(document.getElementById("mixed-message")).display'), 'none', 'mixed assistant message root remains visible');
  assert.equal(await browser.executeJavaScript('document.getElementById("mixed-message-text").textContent'), 'Содержательный ответ агента');
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("fixture-mixed-tool-call").parentElement).display'), 'none', 'tool-only row inside mixed assistant message is hidden');
  await sidebar.executeJavaScript('document.getElementById("tool-calls-show").click()');
  await waitFor(() => snapshot().hideToolCalls === false, 'show tool calls setting', snapshot);
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("september-tool")).display === "none"'), false);
  assert.equal(await browser.executeJavaScript('document.getElementById("fixture-tool-call").hasAttribute("data-web-pilot-tool-call-hidden")'), false);
  assert.notEqual(await browser.executeJavaScript('getComputedStyle(document.getElementById("tool-activity")).display'), 'none', 'show tool calls restores legacy wrapper layout');
  assert.notEqual(await browser.executeJavaScript('getComputedStyle(document.getElementById("tool-message")).display'), 'none', 'show tool calls restores dedicated message layout');
  assert.equal(await browser.executeJavaScript('document.getElementById("tool-message").hasAttribute("data-web-pilot-tool-call-footprint-hidden")'), false);
  assert.notEqual(await browser.executeJavaScript('getComputedStyle(document.getElementById("fixture-mixed-tool-call").parentElement).display'), 'none', 'show tool calls restores row inside mixed message');
  assert.equal(await browser.executeJavaScript('document.getElementById("tool-activity").hasAttribute("data-web-pilot-tool-call-footprint-hidden")'), false);
  await sidebar.executeJavaScript('document.getElementById("tool-calls-hide").click()');
  await waitFor(() => snapshot().hideToolCalls === true, 'hide tool calls setting', snapshot);
  await waitFor(() => browser.executeJavaScript('getComputedStyle(document.getElementById("tool-activity")).display === "none" && getComputedStyle(document.getElementById("tool-message")).display === "none"'), 'rehide removes both tool layout footprints', snapshot);
  assert.notEqual(await browser.executeJavaScript('getComputedStyle(document.getElementById("mixed-message")).display'), 'none', 'rehide still preserves mixed assistant message root');


  // Color editor exercises real Chromium computed styles, IPC, persistence and a fresh WebContents.
  await sidebar.executeJavaScript('document.getElementById("open-chat-colors").click()');
  await waitFor(() => getColorWindow() && !getColorWindow().webContents.isLoading(), 'color editor opens', snapshot);
  const firstColorWindow = getColorWindow(), colors = firstColorWindow.webContents;
  await waitFor(() => colors.executeJavaScript('document.querySelectorAll("input[type=color]").length === 5 && document.getElementById("background-hex").value.length === 7'), 'color controls ready', snapshot);
  assert.deepEqual(await colors.executeJavaScript('({require:typeof require,process:typeof process,pilot:typeof window.webPilot})'), { require: 'undefined', process: 'undefined', pilot: 'undefined' });
  assert.equal(await browser.executeJavaScript('typeof window.webPilotColors'), 'undefined');
  assert.equal(firstColorWindow.isModal(), false);
  assert.equal(firstColorWindow.isVisible(), false, 'the color fixture stays hidden');
  await sidebar.executeJavaScript('window.webPilot.openChatColors()');
  assert.equal(getColorWindow(), firstColorWindow, 'editor is single-instance');
  const bubbleFixture = "<main id=\"palette-probe\">\n<style>\n#palette-probe .user-message-bubble-color{background:#1b407c;border-radius:28px;padding:12px 20px;max-width:70%}\n#palette-user-row{display:flex;justify-content:flex-end;width:100%}\n</style>\n<div data-message-author-role=\"user\" id=\"palette-user-row\"><div class=\"user-message-bubble-color\" id=\"palette-user-bubble\"><span id=\"palette-user\">Ваше сообщение в скруглённой плашке</span></div></div>\n<div data-testid=\"user-message\" id=\"palette-second-row\"><div><div class=\"user-message-bubble-color\" id=\"palette-second-bubble\">Следующее сообщение</div></div></div>\n<div data-message-author-role=\"user\" id=\"palette-unknown-row\">Неизвестная разметка</div>\n<div data-message-author-role=\"user\" id=\"palette-legacy-row\"><div class=\"user-message-bubble\" id=\"palette-legacy-bubble\">Совместимая плашка</div></div>\n<div data-message-author-role=\"assistant\"><p id=\"palette-agent\">Ответ агента</p><pre><code style=\"color:rgb(190,30,40)\" id=\"palette-code\">const answer = 42;</code></pre></div>\n</main>";
  await browser.executeJavaScript('document.body.insertAdjacentHTML("beforeend", ' + JSON.stringify(bubbleFixture) + ')');
  const bubbleProbe = "(() => {\nconst ids=['palette-user-row','palette-second-row','palette-unknown-row','palette-legacy-row'];\nconst rowBackgrounds=ids.map(id=>getComputedStyle(document.getElementById(id)).backgroundColor);\nconst bubbles=['palette-user-bubble','palette-second-bubble','palette-legacy-bubble'].map(id=>getComputedStyle(document.getElementById(id)).backgroundColor);\nconst bubble=document.getElementById('palette-user-bubble'),style=getComputedStyle(bubble);\nreturn {rowBackgrounds,bubbles,radius:style.borderRadius,width:style.width,padding:style.padding};\n})()";
  const originalBubbles = await browser.executeJavaScript(bubbleProbe);
  assert.equal(originalBubbles.bubbles[0], 'rgb(27, 64, 124)', 'fixture starts with the native blue rounded bubble');
  const composerFixture = "<main id=\"palette-composer-probe\">\n<style>\n#palette-composer,#composer-background{background:#e4e8ec;border-radius:28px;padding:18px;color:#334455}\n#palette-editor{background:#e4e8ec;min-height:30px}\n#palette-stream p,#palette-stream span{color:#0d0d0d}\n#palette-composer button{background:#224466;color:#fff}\n</style>\n<form id=\"palette-composer-form\"><div class=\"bg-(--composer-surface-primary)\" id=\"palette-composer\"><div id=\"palette-editor\" data-testid=\"composer-text-input\" class=\"prose\" contenteditable=\"true\" role=\"textbox\">Сохранённый черновик</div><button id=\"palette-composer-button\" type=\"button\">Отправить</button></div></form>\n<form><div id=\"composer-background\"><textarea data-testid=\"prompt-textarea\">Другой черновик</textarea></div></form>\n<form id=\"palette-unrelated-form\"><textarea>Обычное поле</textarea></form>\n<div id=\"palette-stream\" class=\"markdown\"><p>Потоковый ответ без роли</p></div>\n<div data-message-author-role=\"user\"><div class=\"markdown\"><p id=\"palette-user-markdown\">Текст пользователя</p></div></div>\n</main>";
  await browser.executeJavaScript('document.body.insertAdjacentHTML("beforeend", ' + JSON.stringify(composerFixture) + ')');
  const composerProbe = '(() => {const c=id=>getComputedStyle(document.getElementById(id));return {background:c("palette-composer").backgroundColor,legacy:c("composer-background").backgroundColor,legacyEditor: getComputedStyle(document.querySelector("#composer-background textarea")).backgroundColor,editorBackground:c("palette-editor").backgroundColor,editorColor:c("palette-editor").color,draft:document.getElementById("palette-editor").textContent,button:c("palette-composer-button").backgroundColor,radius:c("palette-composer").borderRadius,padding:c("palette-composer").padding,width:c("palette-composer").width,unrelated:c("palette-unrelated-form").backgroundColor};})()';
  await browser.executeJavaScript('document.body.insertAdjacentHTML("beforeend", '+JSON.stringify('<div id="september-palette"><div data-user-message-bubble id="september-user">User</div><div data-markdown-text-style="assistant-message" id="september-assistant">Answer</div><div class="ComposerModeSurface-test" id="september-composer"><div data-composer-body id="september-capsule" style="border-radius:26px;background:#1b1b1b"><button type="button">+</button><div contenteditable="true" role="textbox">Draft</div><button type="button" style="background:#2466cc" id="september-voice">Voice</button></div></div><form><div id="september-thread-surface"><div id="september-thread-root" style="border-radius:26px;background:#1b1b1b"><div data-composer-body id="september-thread-body" style="background:#303030"><button type="button">+</button><div contenteditable="true" role="textbox">Thread draft</div></div></div></div></form></div>')+')');
  const originalComposer = await browser.executeJavaScript(composerProbe);
  const baselineBackground = await browser.executeJavaScript('getComputedStyle(document.body).backgroundColor');
  const palette = { background: '#efe5d4', userBackground: '#c5ddd3', userText: '#183b36', assistantText: '#493d65', composerBackground: '#243344' };
  for (const [key, value] of Object.entries(palette)) {
    await colors.executeJavaScript('(() => { const input = document.getElementById(' + JSON.stringify(key) + '); input.value = ' + JSON.stringify(value) + '; input.dispatchEvent(new Event("input",{bubbles:true})); })()');
  }
  await waitFor(async () => {    const settings = JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8'));
    return Object.entries(palette).every(([key,value]) => settings.chatColors?.[key] === value);
  }, 'palette saved', snapshot);
  // Settings persistence finishes before the browser's asynchronous CSS update.
  // Wait for its observable result rather than depending on renderer timing.
  await waitFor(() => browser.executeJavaScript('getComputedStyle(document.body).backgroundColor === "rgb(239, 229, 212)" && getComputedStyle(document.getElementById("palette-agent")).color === "rgb(73, 61, 101)"'), 'palette rendered after settings save', snapshot);
  const computedPalette = await browser.executeJavaScript('({background:getComputedStyle(document.body).backgroundColor,main:getComputedStyle(document.getElementById("palette-probe")).backgroundColor,bubble:getComputedStyle(document.querySelector("#palette-user-bubble")).backgroundColor,user:getComputedStyle(document.getElementById("palette-user")).color,assistant:getComputedStyle(document.getElementById("palette-agent")).color,code:getComputedStyle(document.getElementById("palette-code")).color})');
  assert.deepEqual(computedPalette, { background:'rgb(239, 229, 212)',main:'rgb(239, 229, 212)',bubble:'rgb(197, 221, 211)',user:'rgb(24, 59, 54)',assistant:'rgb(73, 61, 101)',code:'rgb(190, 30, 40)' });
  const coloredBubbles = await browser.executeJavaScript(bubbleProbe);
  assert.deepEqual(coloredBubbles.rowBackgrounds, Array(4).fill('rgba(0, 0, 0, 0)'), 'outer rows remain transparent');
  assert.deepEqual(coloredBubbles.bubbles, Array(3).fill('rgb(197, 221, 211)'), 'first, subsequent and legacy bubbles receive the color');
  for (const key of ['radius','width','padding']) assert.equal(coloredBubbles[key], originalBubbles[key], 'bubble geometry stays unchanged: ' + key);
  assert.deepEqual(await browser.executeJavaScript('(()=>{const c=id=>getComputedStyle(document.getElementById(id));return [c("september-user").backgroundColor,c("september-user").color,c("september-assistant").color,c("september-capsule").backgroundColor]})()'),['rgb(197, 221, 211)','rgb(24, 59, 54)','rgb(73, 61, 101)','rgb(36, 51, 68)']);
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("september-composer")).backgroundColor'), 'rgba(0, 0, 0, 0)', 'new composer backdrop remains transparent');
  assert.deepEqual(await browser.executeJavaScript('(()=>{const c=id=>getComputedStyle(document.getElementById(id));return [c("september-capsule").borderRadius,c("september-voice").backgroundColor,getComputedStyle(document.querySelector("#september-capsule [contenteditable]")).backgroundColor]})()'),['26px','rgb(36, 102, 204)','rgba(0, 0, 0, 0)']);
  await waitFor(() => browser.executeJavaScript('getComputedStyle(document.getElementById("september-thread-root")).backgroundColor==="rgb(36, 51, 68)"'), 'rounded thread root receives the composer color', snapshot);
  assert.deepEqual(await browser.executeJavaScript('(()=>{const c=id=>getComputedStyle(document.getElementById(id));return [c("september-thread-root").borderRadius,c("september-thread-body").backgroundColor,c("september-thread-surface").backgroundColor]})()'),['26px','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)'],'rectangular body inside the rounded root stays transparent');
  await browser.executeJavaScript('document.getElementById("september-palette").remove()');
  const coloredComposer = await browser.executeJavaScript(composerProbe);
  assert.equal(coloredComposer.background, 'rgb(36, 51, 68)', 'legacy rounded surface receives color');
  assert.equal(coloredComposer.legacy, coloredComposer.background, 'legacy composer capsule receives color');
  assert.equal(coloredComposer.legacyEditor, 'rgba(0, 0, 0, 0)', 'legacy editor remains transparent within capsule');
  assert.equal(coloredComposer.editorBackground, 'rgba(0, 0, 0, 0)', 'editor shares the capsule fill');
  for (const key of ['editorColor','draft','button','radius','padding','width','unrelated']) assert.equal(coloredComposer[key], originalComposer[key], 'composer preserves ' + key);
  await browser.executeJavaScript('(()=>{const c=document.getElementById("palette-composer"),f=document.getElementById("palette-composer-form");c.style.borderRadius="0px";f.style.borderRadius="34px"})()');
  await waitFor(() => browser.executeJavaScript('document.getElementById("palette-composer-form").hasAttribute("data-web-pilot-composer-capsule") && getComputedStyle(document.getElementById("palette-composer-form")).backgroundColor==="rgb(36, 51, 68)"'), 'composer class/style change moves capsule without safety polling', snapshot);
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("palette-composer")).backgroundColor'), 'rgba(0, 0, 0, 0)', 'former capsule becomes transparent inner wrapper');
  await browser.executeJavaScript('(()=>{const c=document.getElementById("palette-composer"),f=document.getElementById("palette-composer-form");f.style.borderRadius="0px";c.style.borderRadius="28px"})()');
  await waitFor(() => browser.executeJavaScript('document.getElementById("palette-composer").hasAttribute("data-web-pilot-composer-capsule")'), 'composer capsule returns on ancestor style event', snapshot);
  await browser.executeJavaScript('(()=>{const old=document.getElementById("palette-composer"),clone=old.cloneNode(true);clone.removeAttribute("data-web-pilot-composer-capsule");clone.querySelectorAll("[data-web-pilot-composer-inner]").forEach(e=>e.removeAttribute("data-web-pilot-composer-inner"));old.replaceWith(clone)})()');
  await waitFor(() => browser.executeJavaScript('document.getElementById("palette-composer").hasAttribute("data-web-pilot-composer-capsule")'), 'replacement editor subtree is retagged by childList event', snapshot);
  await colors.executeJavaScript('document.getElementById("composerBackground").closest(".row").querySelector(".reset-one").click()');
  await waitFor(async () => JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8')).chatColors.composerBackground === null, 'independent composer reset saved', snapshot);
  await waitFor(async () => (await browser.executeJavaScript(composerProbe)).background === originalComposer.background, 'independent composer reset applied', snapshot);
  assert.equal(JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8')).chatColors.assistantText, palette.assistantText);
  await colors.executeJavaScript('(() => { const input=document.getElementById("composerBackground");input.value="#243344";input.dispatchEvent(new Event("input",{bubbles:true})); })()');
  await waitFor(async () => JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8')).chatColors.composerBackground === palette.composerBackground, 'composer restored for persistence check', snapshot);
  await browser.executeJavaScript('window.__paletteChunks=0;window.__paletteStream=setInterval(()=>{const node=document.getElementById("palette-stream");if(node){const span=document.createElement("span");span.style.color="#000000";span.textContent=" fragment";node.append(span);window.__paletteChunks++;}},20)');
  await colors.executeJavaScript('(() => { const input=document.getElementById("assistantText");input.value="#b24a78";input.dispatchEvent(new Event("input",{bubbles:true})); })()');
  await waitFor(async () => JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8')).chatColors.assistantText === '#b24a78', 'assistant color saved during streaming', snapshot);
  await waitFor(() => browser.executeJavaScript('window.__paletteChunks >= 3'), 'streaming adds chunks', snapshot);
  assert.equal(await browser.executeJavaScript('[...document.querySelectorAll("#palette-stream p,#palette-stream span")].every(node=>getComputedStyle(node).color==="rgb(178, 74, 120)")'), true, 'new roleless streaming fragments retain selected text color');
  await browser.executeJavaScript('document.getElementById("palette-stream").outerHTML=\'<div id="palette-stream" class="markdown"><p style="color:#000000">Replacement while streaming</p></div>\'');
  await waitFor(() => browser.executeJavaScript('window.__paletteChunks >= 6'), 'streaming continues after DOM replacement', snapshot);
  assert.equal(await browser.executeJavaScript('[...document.querySelectorAll("#palette-stream p,#palette-stream span")].every(node=>getComputedStyle(node).color==="rgb(178, 74, 120)")'), true, 'replacement does not restore native text color');
  await browser.executeJavaScript('clearInterval(window.__paletteStream);document.getElementById("palette-stream").className="";document.getElementById("palette-stream").setAttribute("data-message-author-role","assistant")');
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.querySelector("#palette-stream p")).color'), 'rgb(178, 74, 120)', 'completed answer retains streaming color');
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.getElementById("palette-user-markdown")).color'), 'rgb(24, 59, 54)', 'user Markdown keeps user text color');
  assert.equal((await browser.executeJavaScript(composerProbe)).editorColor, originalComposer.editorColor, 'streaming color leaves the draft unchanged');
  assert.equal(await colors.executeJavaScript('document.getElementById("assistantText-hex").value.toLowerCase()'), '#b24a78', 'editor retains chosen streaming color');
  await colors.executeJavaScript('(() => { const input=document.getElementById("assistantText");input.value="#493d65";input.dispatchEvent(new Event("input",{bubbles:true})); })()');
  await waitFor(async () => JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8')).chatColors.assistantText === palette.assistantText, 'assistant palette restored after streaming test', snapshot);
  assert.equal((await colors.executeJavaScript('window.webPilotColors.change("background","red;display:none")')).ok, false, 'invalid CSS rejected');
  assert.equal(await colors.executeJavaScript('document.documentElement.scrollWidth <= innerWidth'), true, 'editor does not overflow');
  assert.equal(await colors.executeJavaScript('document.documentElement.scrollHeight <= innerHeight'), true, 'five color rows and reset fit the default window');
  const colorScreenshots = [];
  for (const theme of ['light','dark']) {
    await sidebar.executeJavaScript('window.webPilot.setTheme(' + JSON.stringify(theme) + ')');
    await waitFor(() => colors.executeJavaScript('document.documentElement.dataset.theme === ' + JSON.stringify(theme)), 'editor shell theme ' + theme, snapshot);
    await colors.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const file = path.join(dataDir, 'chat-colors-' + theme + '.png');
    await fs.writeFile(file, (await colors.capturePage()).toPNG()); colorScreenshots.push(file);
  }
  firstColorWindow.close();
  await sidebar.executeJavaScript('window.webPilot.openChatColors()');
  await waitFor(() => getColorWindow() && !getColorWindow().webContents.isLoading(), 'reopen editor', snapshot);
  const reopenedColors = getColorWindow().webContents;
  await waitFor(() => reopenedColors.executeJavaScript('document.getElementById("userText-hex")?.value === "#183b36"'), 'palette survives editor reopen', snapshot);
  persistedSettings = JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8'));
  const restoredView = new BrowserWindow({show:false,webPreferences:{partition:'persist:workflow-pilot-smoke',sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const restoredPalette = new ChatColors(restoredView.webContents, persistedSettings.chatColors);
  await restoredView.loadURL('https://chatgpt.com/c/palette-restart-fixture');
  await restoredPalette.apply();
  assert.equal(await restoredView.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor'), 'rgb(239, 229, 212)', 'persisted palette hydrates fresh WebContents');
  await restoredView.webContents.executeJavaScript('document.body.insertAdjacentHTML("beforeend", ' + JSON.stringify(composerFixture) + ')');
  assert.equal((await restoredView.webContents.executeJavaScript(composerProbe)).background, 'rgb(36, 51, 68)', 'composer color hydrates fresh WebContents and newly inserted editor');
  restoredPalette.dispose(); restoredView.close();
  await browser.executeJavaScript('history.pushState({}, "", location.pathname + "?palette=1")');
  await waitFor(() => browser.executeJavaScript('getComputedStyle(document.getElementById("palette-agent")).color === "rgb(73, 61, 101)"'), 'SPA preserves palette', snapshot);
  const rapidColors = await reopenedColors.executeJavaScript('Promise.all(["#101010","#202020","#303030"].map(value=>window.webPilotColors.change("background",value)))');
  assert.ok(rapidColors.every(result=>result.ok));
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.body).backgroundColor'), 'rgb(48, 48, 48)', 'latest color replaces previous values');
  await reopenedColors.executeJavaScript('window.webPilotColors.reset()');
  assert.equal(await browser.executeJavaScript('getComputedStyle(document.body).backgroundColor'), baselineBackground, 'reset removes user CSS');
  assert.deepEqual(await browser.executeJavaScript(bubbleProbe), originalBubbles, 'reset restores native blue bubbles and transparent rows');
  assert.equal(Object.values(JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8')).chatColors).every(value => value === null), true);
  assert.deepEqual(await browser.executeJavaScript(composerProbe), originalComposer, 'global reset restores native composer and keeps draft');
  getColorWindow().close();
  await browser.executeJavaScript('document.getElementById("palette-probe").remove(); document.getElementById("palette-composer-probe").remove(); history.replaceState({}, "", location.pathname)');

  await sidebar.executeJavaScript('document.getElementById("open-archive-window").click()');
  await waitFor(() => !!getArchiveWindow() && !getArchiveWindow().isDestroyed(), 'separate archive window', snapshot);
  const firstArchiveWindow = getArchiveWindow(), archive = firstArchiveWindow.webContents;
  await waitFor(() => archive.executeJavaScript('typeof window.webPilotArchive === "object"'), 'archive preload ready', snapshot);
  assert.deepEqual(await archive.executeJavaScript('({require:typeof require,process:typeof process})'), { require: 'undefined', process: 'undefined' });
  assert.equal(await archive.executeJavaScript('document.querySelectorAll(".item").length'), 6);
  await archive.executeJavaScript('document.getElementById("tab-sessions").click()');
  assert.equal(await archive.executeJavaScript('document.querySelectorAll(".item").length'), 0, 'sessions of archived projects are not duplicated');
  await archive.executeJavaScript('document.getElementById("tab-projects").click()');
  await sidebar.executeJavaScript('window.webPilot.openArchive()');
  await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(getArchiveWindow(), firstArchiveWindow, 'archive window is single-instance');

  const clickArchive = (target, options = {}) => archive.executeJavaScript(`document.querySelector('[data-workspace=${JSON.stringify(target)}]').dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:${!!options.shiftKey},metaKey:${!!options.metaKey},ctrlKey:${!!options.ctrlKey}}))`);
  await clickArchive(auxB.workspace); await clickArchive(auxC.workspace, { shiftKey: true });
  assert.equal(await archive.executeJavaScript('document.querySelectorAll(".item.selected").length'), 2, 'Shift selects range');
  await archive.executeJavaScript('document.getElementById("restore").click()');
  await waitFor(() => !store.project(auxB.workspace).archivedAt && !store.project(auxC.workspace).archivedAt, 'batch restore', snapshot);
  await waitFor(() => archive.executeJavaScript('document.querySelectorAll(".item").length === 4'), 'archive list after restore', snapshot);

  await clickArchive(auxD.workspace); await clickArchive(workspace, { metaKey: true });
  assert.equal(await archive.executeJavaScript('document.querySelectorAll(".item.selected").length'), 2, 'Command toggles separate item');
  await archive.executeJavaScript('document.getElementById("forget").click()');
  await waitFor(() => !store.project(auxD.workspace) && !store.project(workspace), 'batch forget', snapshot);
  assert.ok(await fs.stat(auxD.workspace)); assert.ok(await fs.stat(workspace));

  await clickArchive(auxF.workspace);
  const removalCommands=new ExecutionFacade();
  const commandOptions=workspace=>({cwd:workspace,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});
  const ownCommand=removalCommands.runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],commandOptions(auxF.workspace));
  const neighbourCommand=removalCommands.runCommand(process.execPath,['-e','setInterval(()=>{},1000)'],commandOptions(auxE.workspace));
  await fs.writeFile(path.join(auxF.workspace,'unfinished.txt'),'uncommitted result');
  assert.equal(await archive.executeJavaScript('document.getElementById("delete").disabled'), false);
  await archive.executeJavaScript('document.getElementById("delete").click()');
  await waitFor(() => archive.executeJavaScript('!document.getElementById("delete-panel").hidden'), 'delete preview in archive window', snapshot);
  assert.equal(await archive.executeJavaScript('document.getElementById("confirm-delete").disabled'), true);
  await archive.executeJavaScript('document.getElementById("cancel-delete").click()');
  await waitFor(() => archive.executeJavaScript('document.getElementById("delete-panel").hidden'), 'cancel archive deletion', snapshot); assert.ok(await fs.stat(auxF.workspace));
  assert.equal(removalCommands.commandSnapshot(ownCommand.operationId).outcome,'running','cancel confirmation preserves active work');
  await archive.executeJavaScript('document.getElementById("delete").click()');
  await waitFor(() => archive.executeJavaScript('!document.getElementById("delete-panel").hidden'), 'second delete preview', snapshot);
  await archive.executeJavaScript(`{ const input=document.getElementById('delete-confirmation'); input.value=${JSON.stringify(auxF.name)}; input.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('confirm-delete').click(); }`);
  await waitFor(() => !store.project(auxF.workspace), 'confirmed local deletion from archive window', snapshot);
  await assert.rejects(fs.stat(auxF.workspace), { code: 'ENOENT' });
  assert.equal(removalCommands.commandSnapshot(ownCommand.operationId).outcome,'cancel');
  assert.equal(removalCommands.commandSnapshot(neighbourCommand.operationId).outcome,'running','neighbour command survives deletion');
  await removalCommands.stopCommand(neighbourCommand.operationId);await removalCommands.waitCommand(neighbourCommand.operationId,5000);
  assert.ok(store.project(auxE.workspace)?.archivedAt, 'unselected archived project is untouched');
  await browser.loadURL(first.chatUrl);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1, 'Web conversation remains after archive operations');
  firstArchiveWindow.close();

  assert.equal(await sidebar.executeJavaScript('document.getElementById("context-window-card")'), null, 'context window indicator is absent');
  assert.equal(Object.hasOwn(snapshot(), 'contextWindow'), false, 'sidebar snapshot exposes no contextWindow state');

  await browser.executeJavaScript(`fetch('/backend-api/f/conversation',{method:'POST'}).then(response=>response.text())`);
  await waitFor(async () => {
    await chromiumDiagnostics.flush();
    const text = await fs.readFile(chromiumDiagnosticsFile, 'utf8');
    return text.includes('conversation-stream-inspected');
  }, 'conversation SSE diagnostics', snapshot);
  assert.equal(Object.hasOwn(snapshot(), 'contextWindow'), false, 'telemetry does not republish contextWindow state');
  await chromiumDiagnostics.flush();
  const diagnosticLines = (await fs.readFile(chromiumDiagnosticsFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.ok(diagnosticLines.some(entry => entry.source === 'diagnostics' && entry.event === 'session-start'), 'diagnostic session is logged');
  assert.ok(diagnosticLines.some(entry => entry.source === 'cdp' && entry.event === 'attached'), 'CDP is attached');
  assert.ok(diagnosticLines.some(entry => entry.source === 'webContents' && entry.event === 'did-finish-load'), 'native load is logged');
  assert.ok(diagnosticLines.some(entry => entry.source === 'dom' && entry.event === 'state' && entry.userMessages >= 1 && entry.composer === true), 'DOM pulse is logged');
  assert.ok(diagnosticLines.some(entry => entry.source === 'cdp' && ['request','response','loading-finished'].includes(entry.event)), 'network metadata is logged');
  assert.ok(diagnosticLines.some(entry => entry.source === 'telemetry' && entry.event === 'conversation-stream-inspected' && entry.telemetryFound === true), 'conversation SSE body is inspected');
  assert.ok(diagnosticLines.some(entry => entry.source === 'telemetry' && entry.event === 'context' && entry.origin === 'conversation-sse'
    && entry.inputTokens === 229043 && entry.modelContextWindow === 258400 && entry.compactSignal === 'direct'), 'context and compact telemetry is extracted');
  const diagnosticText = JSON.stringify(diagnosticLines);
  assert.equal(diagnosticText.includes('Раздел 1: полный контекст проекта'), false, 'diagnostics never contain project context text');
  assert.equal(diagnosticText.includes('Принимаю текущий план и результат работы'), false, 'diagnostics never contain user message text');
  assert.equal(diagnosticText.includes('PRIVATE STREAM TEXT'), false, 'SSE private text is never logged');
  assert.equal(diagnosticText.includes('PRIVATE-COMPACTION-ID'), false, 'SSE item identifiers are never logged');


  // Single-active-plan integration: old chats keep their URLs while every chat projects one current checkout plan.
  await sidebar.executeJavaScript('window.webPilot.closeSettings()');
  const reattached = await selectWorkspace(workspace);
  assert.equal(reattached.workspace, workspace);
  assert.equal(store.project(workspace).archivedAt, null, 'forgotten folder can be attached again');
  await waitFor(() => settled(), 'single-active fixture initial context', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("prepared-card") === null'), true);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-origin") === null'), true);

  const countMessages = () => browser.executeJavaScript('window.fixtureMessages.length');
  const beginAnswer = async () => {
    await browser.executeJavaScript("(()=>{const b=document.createElement('button');b.id='auto-fixture-stop';b.dataset.testid='stop-button';b.textContent='Stop';b.style='position:fixed;left:20px;top:20px;z-index:99999';b.onclick=()=>b.remove();document.body.append(b)})()");
    await waitFor(() => pageState.current?.state.busy, 'plan-continuation busy transition', snapshot);
  };
  const appendAnswer = text => browser.executeJavaScript('window.fixtureAssistant(' + JSON.stringify(text) + ')');
  const endAnswer = async (text = 'Изменение проверено и закоммичено.') => {
    await appendAnswer(text);
    await browser.executeJavaScript("document.getElementById('auto-fixture-stop')?.remove()");
  };
  const expectContinue = async (before, description) => {
    await waitFor(async () => await countMessages() === before + 1 && !planContinuation.pending
      && planContinuation.checkpoint?.status === 'sent', description, snapshot);
    // 0.6.96: the continuation carries the next task of the plan after the exact first line.
    const continuation = await browser.executeJavaScript('window.fixtureMessages.at(-1).text');
    assert.match(continuation, /^Продолжай\n\nДанные текущего плана Workflow Kit — следующая задача [^\n]+\nЗадача: \S+ — .+/s);
    assert.ok(Buffer.byteLength(continuation) <= 4096, 'continuation stays within 4 KB');
  };
  const noExtraSend = async before => {
    await Promise.all([planContinuation.planChanged(), planContinuation.planChanged(), planContinuation.recover()]);
    planContinuation.observe(pageState.current); await planContinuation.reconcile();
    assert.equal(await countMessages(), before);
  };
  const trustedClick = async selector => {
    // Target only this hidden fixture renderer; do not focus windows or send OS input.
    const debuggerApi = browser.debugger, attached = debuggerApi.isAttached();
    if (!attached) debuggerApi.attach('1.3');
    try {
      await debuggerApi.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
      const point = await browser.executeJavaScript("(async()=>{const b=document.querySelector(" + JSON.stringify(selector) + ");b.scrollIntoView({block:'center',behavior:'instant'});await new Promise(requestAnimationFrame);const r=b.getBoundingClientRect();window.__fixtureTrustedClick=null;document.addEventListener('click',e=>window.__fixtureTrustedClick={trusted:e.isTrusted,id:e.target.id,tag:e.target.tagName},{capture:true,once:true});return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
      const target = await browser.executeJavaScript(`(()=>{const b=document.elementFromPoint(${point.x},${point.y});return {id:b?.id,testid:b?.dataset.testid,disabled:b?.disabled,width:innerWidth,height:innerHeight}})()`);
      console.log(JSON.stringify({fixtureTarget:selector,point,target}));
      await debuggerApi.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
      await debuggerApi.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
      await waitFor(() => browser.executeJavaScript('window.__fixtureTrustedClick?.trusted === true'), 'hidden renderer receives trusted click: ' + selector, snapshot);
      const click = await browser.executeJavaScript('window.__fixtureTrustedClick');
      console.log(JSON.stringify({fixtureClick:selector,point,click}));
      assert.equal(click?.trusted, true, 'trusted event reaches the hidden fixture');
    } finally {
      await debuggerApi.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: false });
      if (!attached && debuggerApi.isAttached()) debuggerApi.detach();
    }
  };
  // 01TestAuto: saved ON -> new Chat with NONE -> busy plan creation -> idle.
  const prePlanChat = store.snapshot().projects.find(p => p.workspace === workspace).sessions
    .find(session => !session.archivedAt && session.chatUrl);
  await continuePlan(true);
  assert.equal((await savedAutoState()).planContinuationEnabled, true, 'explicit pre-plan authorization persists');
  await sidebar.executeJavaScript(`window.webPilot.newSession(${JSON.stringify(workspace)})`);
  await waitFor(() => store.selected()?.sessionId !== prePlanChat.sessionId
    && settled() && !snapshot().selected?.scopeId,
    '01TestAuto new Chat starts with NONE and saved ON', snapshot);
  const autoScopeOwner = store.selected();
  assert.equal(await countMessages(), 1, 'only normal recovery; no PlanContinuation startup instruction');
  assert.equal(planContinuation.view().enabled, false);
  await beginAnswer(); await noExtraSend(1);
  const legacyChats = [prePlanChat, autoScopeOwner]
    .map(session => store.project(workspace,session.sessionId))
    .map(session => ({ sessionId: session.sessionId, chatUrl: session.chatUrl, title: session.title, titleSource: session.titleSource }));
  const scopeOwner = legacyChats[1], untouchedLegacy = legacyChats[0];
  assert.equal(store.selected().sessionId, scopeOwner.sessionId);

  const definition = {
    scope_id: 'fixture-current-plan', objective: 'Единый current plan smoke', approval_note: 'Изолированный single-active smoke fixture.',
    acceptance_criteria: ['Fixture завершён'],
    approved_scope: { functional_paths: [], documentation_paths: ['docs/architecture/OVERVIEW.md'], max_functional_files_per_task: 3 },
    tasks: [{ id: 'T001', title: 'Записать общий результат', why: 'Проверить один plan на несколько chats', dependencies: [],
      functional_paths: [], documentation_paths: ['docs/architecture/OVERVIEW.md'], acceptance_criteria: ['Запись добавлена'],
      verification_ids: [], expected_commit_message: 'docs: single active smoke fixture' },
      {id:'T002',title:'Завершить заметку',why:'Проверить завершение плана без выпуска',dependencies:['T001'],
        functional_paths:[],documentation_paths:['docs/architecture/OVERVIEW.md'],acceptance_criteria:['Заметка завершена'],
        verification_ids:[],expected_commit_message:'docs: complete smoke fixture'}],
  };
  withSessionPlan(workspace, { sessionId: scopeOwner.sessionId }, () => createScope(workspace, definition));
  const currentScopeTitle = 'Единый current plan smoke';
  await waitFor(() => snapshot().selected?.scopeId === 'fixture-current-plan'
    && sidebar.executeJavaScript('document.getElementById("plan-title").textContent === "Единый current plan smoke"')
    && store.selected()?.title === currentScopeTitle,
    'current checkout plan visible and owning session named', snapshot);
  const scopeOwnerId = new URL(scopeOwner.chatUrl).pathname.split('/').at(-1);
  await waitFor(() => fixtureConversationTitles.get(scopeOwnerId) === currentScopeTitle,
    'scope owner title is synchronized to native ChatGPT fixture', snapshot);
  assert.equal(planContinuation.view().enabled, false);
  await continuePlan(true);
  assert.equal(planContinuation.view().enabled, true); assert.equal(await countMessages(), 1);
  await endAnswer('Создан текущий план, обычный отчёт без специальной итоговой строки.');
  await expectContinue(1, '01TestAuto NONE -> ACTIVE -> idle sends exactly one Continue');
  await noExtraSend(2);
  const loadsBeforeProgress = packetLoads;
  await beginAnswer();
  startTask(workspace, 'T001');
  await waitFor(() => snapshot().selected?.planView?.tasks.find(task => task.id === 'T001')?.status === 'current',
    'single current task visible during ordinary answer', snapshot);
  await fs.appendFile(path.join(workspace, 'docs/architecture/OVERVIEW.md'), '\nSingle active fixture result\n');
  assert.equal(commitTask(workspace, 'T001').ok, true);
  await waitFor(() => snapshot().selected?.planView?.completed === 1, 'Git commit reaches PlanMonitor', snapshot);
  await noExtraSend(2);
  await endAnswer('Микрозадача T001 проверена и закоммичена.');
  await expectContinue(2, 'ordinary microtask report sends the next Continue');
  await noExtraSend(3);
  assert.equal(packetLoads, loadsBeforeProgress, 'plan progress never sends recovery');
  await continuePlan(false);


  await sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)}, ${JSON.stringify(untouchedLegacy.sessionId)})`);
  await waitFor(() => store.selected()?.sessionId === untouchedLegacy.sessionId
    && snapshot().selected?.scopeId === 'fixture-current-plan'
    && browser.getURL() === untouchedLegacy.chatUrl, 'old chat projects current plan without inheriting its title', snapshot);
  assert.equal(store.selected().chatUrl, untouchedLegacy.chatUrl);
  if(untouchedLegacy.titleSource==='manual')assert.equal(store.selected().title,untouchedLegacy.title,'manual old-chat name survives');
  assert.notEqual(store.selected().title,currentScopeTitle,'old chat never inherits another session scope title');
  assert.equal(store.selected().planId, 'fixture-current-plan');
  assert.notEqual(fixtureConversationTitles.get(new URL(untouchedLegacy.chatUrl).pathname.split('/').at(-1)), currentScopeTitle);

  const loadsBeforeNewCurrentChat = packetLoads;
  await browser.executeJavaScript("localStorage.setItem('fixture-restored-draft','Мой сохранённый черновик')");

  await sidebar.executeJavaScript(`window.webPilot.newSession(${JSON.stringify(workspace)})`);
  await waitFor(()=>snapshot().context.phase==='waiting-draft','root draft blocks q without being cleared',snapshot);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'),0);
  assert.equal(await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent"),'Мой сохранённый черновик');
  await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent='';document.getElementById('prompt-textarea').dispatchEvent(new Event('input',{bubbles:true}))");
  await waitFor(() => !legacyChats.some(item => item.sessionId === store.selected()?.sessionId)
    && settled() && snapshot().selected?.scopeId === 'fixture-current-plan',
    'new Chat continues current checkout plan', snapshot);
  const currentChat = store.selected();
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  assert.equal(await browser.executeJavaScript("window.fixtureMessages[0].text.includes('wp-request-archived-')"), false);
  assert.ok(await browser.executeJavaScript("window.fixtureMessages[0].text.includes('workflow_pilot_panel')"));

  assert.equal(currentChat.planId, 'fixture-current-plan');
  assert.equal(currentChat.attempt.packet.facts.scope_id, 'fixture-current-plan');
  assert.equal(currentChat.attempt.packet.session_id, undefined);
  assert.equal(currentChat.title, currentScopeTitle, 'new Chat in the same scope receives its own session title');
  assert.equal(currentChat.titleSource, 'scope');
  await waitFor(() => fixtureConversationTitles.get(new URL(currentChat.chatUrl).pathname.split('/').at(-1)) === currentScopeTitle,
    'new Chat title is synchronized to native ChatGPT fixture', snapshot);
  assert.ok(packetLoads <= loadsBeforeNewCurrentChat + 1, 'at most one checkout recovery build is needed after plan creation');
  const currentPlanPacketLoads = packetLoads;

  await sidebar.executeJavaScript(`window.webPilot.newSession(${JSON.stringify(workspace)})`);
  await waitFor(() => store.selected()?.sessionId!==currentChat.sessionId && settled()
    && snapshot().selected?.scopeId === 'fixture-current-plan', 'another Chat continues current checkout plan', snapshot);
  const otherChat = store.selected();
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  assert.equal(await browser.executeJavaScript("window.fixtureMessages[0].text.includes('wp-request-archived-')"), false);
  assert.ok(await browser.executeJavaScript("window.fixtureMessages[0].text.includes('workflow_pilot_panel')"));

  assert.equal(otherChat.planId, 'fixture-current-plan');
  assert.equal(otherChat.attempt.packet.facts.scope_id, 'fixture-current-plan');
  assert.equal(otherChat.title, currentScopeTitle, 'new Chat in the same scope receives its own session title');
  await waitFor(() => fixtureConversationTitles.get(new URL(otherChat.chatUrl).pathname.split('/').at(-1)) === currentScopeTitle,
    'new Chat title is synchronized to native ChatGPT fixture', snapshot);
  assert.equal(packetLoads, currentPlanPacketLoads, 'second new chat reuses the same current-plan packet');
  await sidebar.executeJavaScript(`window.webPilot.renameSession(${JSON.stringify(workspace)}, ${JSON.stringify(otherChat.sessionId)}, "Ручное имя current Chat")`);
  await waitFor(() => store.selected()?.title === 'Ручное имя current Chat'
    && fixtureConversationTitles.get(new URL(otherChat.chatUrl).pathname.split('/').at(-1)) === 'Ручное имя current Chat',
    'manual rename updates local and native titles together', snapshot);
  assert.equal(store.selected().titleSource, 'manual');

  for (const directory of ['.harness/plans/by-id', '.harness/plans/by-session']) {
    const entries = await fs.readdir(path.join(workspace, directory)).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error));
    assert.equal(entries.some(name => name.endsWith('.md')), false, directory + ' is not runtime plan storage');
  }

  controller.cancel();
  // The fixture page never opens the panel: the agent's side of the panel startup runs here
  // (open with an invitation, read every part, confirm), as tests/startup-context.test.mjs does.
  const completePanelStartup = async session => {
    await waitFor(()=>plugin.communication.startup.progress(session.sessionId,session.attempt.requestId)?.complete,
      'actual dispatched invitation completed through fixture host',snapshot);
  };
  for (const target of [currentChat, otherChat]) await completePanelStartup(target);
  // Sidebar -> IPC -> real composer -> sandboxed observer in Chat and Chat.
  for (const target of [currentChat, otherChat]) {
    await continuePlan(false);
    await sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)}, ${JSON.stringify(target.sessionId)})`);
    await waitFor(() => store.selected()?.sessionId === target.sessionId && !snapshot().pageLoading
      && pageState.current?.state.url === target.chatUrl && snapshot().selected?.planView?.completed === 1,
      'partial plan ready in Chat', snapshot);
    await waitFor(() => sidebar.executeJavaScript("(()=>{const b=document.getElementById('plan-run-toggle');return !b.disabled&&!b.hidden&&['Начать выполнение плана','Продолжить'].includes(b.textContent);})()"), 'plan button ready', snapshot);
    const before = await countMessages();
    await beginAnswer();
    await sidebar.executeJavaScript("document.getElementById('plan-run-toggle').click()");
    await waitFor(() => planContinuation.view().phase === 'running', 'ON adopts the busy answer', snapshot);
    await noExtraSend(before);
    await endAnswer();
    await expectContinue(before, 'ordinary answer continues once in Chat');
    assert.deepEqual(planContinuation.run.completedAtStart, ['T001']);
    assert.equal(planContinuation.view().continuations, 1);
    await waitFor(() => sidebar.executeJavaScript("document.getElementById('plan-continuation-message').textContent.includes('Продолжай» №1')"),
      'confirmed counter visible in sidebar', snapshot);
    await noExtraSend(before + 1);
    if (target.sessionId === currentChat.sessionId) {
      await beginAnswer(); await appendAnswer('Частичный обычный ответ перед Stop.');
      await trustedClick('#auto-fixture-stop');
      await waitFor(()=>!pageState.current.state.busy&&pageState.current.state.manualStopRevision>0,'trusted Stop pauses automation',snapshot);
      await noExtraSend(before+1);
      assert.ok(pageState.current.state.manualStopRevision > 0);
      assert.equal(planContinuation.view().enabled, true);
      await browser.executeJavaScript("(()=>{const e=document.getElementById('prompt-textarea');e.textContent='Продолжаем после Stop';e.dispatchEvent(new Event('input',{bubbles:true}))})()");
      await trustedClick('[data-testid=send-button]');
      await waitFor(()=>pageState.current.state.manualSendRevision>0,'new user message after Stop',snapshot);
      await beginAnswer();await endAnswer();
      await expectContinue(before+2,'new user turn permits continuation after Stop');
    } else {
      await beginAnswer();
      const draft = 'Мой сохранённый черновик';
      await browser.executeJavaScript("(()=>{const e=document.getElementById('prompt-textarea');e.textContent=" + JSON.stringify(draft) + ";e.dispatchEvent(new Event('input',{bubbles:true}))})()");
      const beforeDraft = await countMessages(); await endAnswer();
      await waitFor(() => planContinuation.view().reason === 'DRAFT_PRESENT', 'draft waits without disabling mode', snapshot);
      assert.equal(await browser.executeJavaScript("document.getElementById('prompt-textarea').textContent"), draft);
      await noExtraSend(beforeDraft);
      assert.equal(await sidebar.executeJavaScript("document.getElementById('plan-run-toggle').textContent"), 'Пауза');
      await trustedClick('[data-testid=send-button]');
      await waitFor(() => planContinuation.view().reason === 'USER_MESSAGE_PENDING', 'manual Send waits for new answer', snapshot);
      assert.equal(await countMessages(), beforeDraft + 1);
      assert.equal(await browser.executeJavaScript('window.fixtureMessages.at(-1).text'), draft);
      const doc = pageState.current.documentId; browser.reload();
      await waitFor(() => pageState.current?.documentId !== doc && planContinuation.view().reason === 'USER_MESSAGE_PENDING',
        'manual Send remains pending after reload', snapshot);
      await noExtraSend(beforeDraft + 1);
      await beginAnswer(); await endAnswer();
      await expectContinue(beforeDraft + 1, 'new answer resumes after manual draft Send');
    }
  }
  const restartFixture = async (choice, mode = 'busy') => {
    const answerId = await browser.executeJavaScript("window.fixtureTurns.findLast(turn => turn.role === 'assistant').id");
    return promisify(execFile)(process.execPath,
      [path.join(import.meta.dirname, 'plan-continuation-restart-fixture.cjs'), path.join(dataDir, 'settings.json'), choice, planContinuation.checkpoint.key, mode, answerId],
      { timeout: 20000, env: { ...process.env, ELECTRON_RUN_AS_NODE: '' } });
  };
  for (const mode of ['busy', 'sent', 'sending', 'manual']) {
    const restarted = await restartFixture('on', mode);
    assert.match(restarted.stdout, /"planContinuationRestart":"on"/);
    assert.match(restarted.stdout, /"sends":0/);
  }
  const beforeRestore = await countMessages();
  const savedAuto = await savedAutoState();
  planContinuation.dispose(); planContinuation.restore(savedAuto.planContinuationEnabled, savedAuto.continuationCheckpoint);
  await planContinuation.recover();
  await waitFor(() => planContinuation.view().reason === 'USER_MESSAGE_PENDING', 'saved ON restores without a button click', snapshot);
  await noExtraSend(beforeRestore);
  const beforeReloadDocument = pageState.current.documentId; browser.reload();
  await waitFor(() => pageState.current?.documentId !== beforeReloadDocument && planContinuation.view().reason === 'USER_MESSAGE_PENDING',
    'real reload preserves history', snapshot);
  await noExtraSend(beforeRestore);
  // OFF during busy retains the idle pause; ON at idle sends once.
  await beginAnswer();
  await continuePlan(false);
  await endAnswer('Проверка завершена при выключенном режиме.');
  await waitFor(() => !pageState.current.state.busy, 'OFF answer reaches idle', snapshot);
  await noExtraSend(beforeRestore);
  await continuePlan(true);
  await expectContinue(beforeRestore, 'ON at suitable idle sends once');
  await continuePlan(false);
  await continuePlan(true);
  await noExtraSend(beforeRestore + 1);
  // OFF/ON during busy and former footer words remain ordinary prose.
  await beginAnswer();
  await continuePlan(false);
  await continuePlan(true);
  await noExtraSend(beforeRestore + 1);
  await endAnswer('Нужен ваш ответ. Эта строка не является клиентской командой.');
  await expectContinue(beforeRestore + 1, 'ordinary prose does not control PlanContinuation');
  await beginAnswer();
  const stalledRun = planContinuation.run, stalledEpoch = planContinuation.epoch;
  const beforeWarning = await countMessages(), originalStall = planContinuation.stallMs;
  try {
    planContinuation.stallMs = 25; planContinuation.watch(planContinuation.run);
    await waitFor(() => planContinuation.view().warning === 'STALL_WARNING', 'busy watchdog only warns', snapshot);
    assert.equal(planContinuation.view().phase, 'running'); assert.equal(planContinuation.run, stalledRun);
    assert.equal(planContinuation.epoch, stalledEpoch); await noExtraSend(beforeWarning);
    await waitFor(() => sidebar.executeJavaScript("document.getElementById('plan-continuation-message').textContent.includes('ещё работает')"), 'stall warning in sidebar', snapshot);
    assert.equal(snapshot().conversationRecovery.phase,'idle');
    assert.equal(await sidebar.executeJavaScript("document.getElementById('conversation-recovery').hidden"),true,'stall alone never offers recovery');
    assert.equal(await sidebar.executeJavaScript("document.getElementById('reconnect-chat').hidden"),true);
    // A long Claude wait keeps Review visible without turning silence into an outage.
    const reviewWait={...snapshot(),planReview:{enabled:true,supported:true,stage:'RUNNING',indicator:'working',
      message:'Раунд 1 из 4. Claude проверяет документы.'}};
    sidebar.send('pilot:state-changed',reviewWait);
    await waitFor(()=>sidebar.executeJavaScript("document.getElementById('plan-review-text').textContent.includes('Claude проверяет')"),'review wait status',snapshot);
    assert.equal(await sidebar.executeJavaScript("document.getElementById('plan-review-indicator').dataset.state"),'working');
    assert.equal(await sidebar.executeJavaScript("document.getElementById('conversation-recovery').hidden"),true,'review wait is not a connection error');
    sidebar.send('pilot:state-changed',snapshot());
    planContinuation.stallMs = originalStall; await appendAnswer('Продолжаю проверку');
    await waitFor(() => planContinuation.view().warning === null && pageState.current?.state.busy, 'busy progress clears warning', snapshot);
  } finally { planContinuation.stallMs = originalStall; }
  await endAnswer();
  await expectContinue(beforeWarning, 'normal answer after watchdog continues');
  assert.equal(planContinuation.run, stalledRun);
  // Connection recovery resumes from its natural event without OFF/ON.
  await beginAnswer(); const beforeError = await countMessages();
  await browser.executeJavaScript("(()=>{const e=document.createElement('div');e.id='auto-fixture-error';e.setAttribute('role','alert');e.textContent='Resume stream unavailable';document.body.append(e)})()");
  await waitFor(() => planContinuation.view().reason === 'CONNECTION_ERROR', 'connection alert blocks dispatch', snapshot);
  await endAnswer(); await noExtraSend(beforeError);
  await browser.executeJavaScript("document.getElementById('auto-fixture-error').remove()");
  await expectContinue(beforeError, 'connection recovery reconsiders the idle pause');
  // PlanMonitor completion and busy->idle race cannot produce a final Send.
  await beginAnswer();
  withSessionPlan(workspace, { sessionId: legacyChats[0].sessionId }, () => startTask(workspace, 'T002'));
  await fs.appendFile(path.join(workspace,'docs/architecture/OVERVIEW.md'),'\nSmoke task T002 complete.\n');
  assert.equal(withSessionPlan(workspace, { sessionId: legacyChats[1].sessionId }, () => commitTask(workspace, 'T002')).ok, true);
  await waitFor(() => snapshot().selected?.planView?.state === 'awaiting-acceptance', 'single current plan completed', snapshot);
  const beforeFinal = await countMessages(); await endAnswer();
  await waitFor(() => planContinuation.view().phase === 'complete', 'all ordinary tasks DONE sends no Continue', snapshot);
  await noExtraSend(beforeFinal);
  await continuePlan(false);
  await continuePlan(true);
  await waitFor(() => planContinuation.view().phase === 'complete', 'ON completed plan stays complete', snapshot);
  await noExtraSend(beforeFinal);
  await fs.writeFile(path.join(dataDir, 'plan-continuation-completed.png'), (await sidebar.capturePage()).toPNG());


  for (const legacy of legacyChats) {
    await sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)}, ${JSON.stringify(legacy.sessionId)})`);
    await waitFor(() => store.selected()?.sessionId === legacy.sessionId
      && snapshot().selected?.planView?.state === 'awaiting-acceptance'
      && browser.getURL() === legacy.chatUrl, 'completed current plan visible in old chat', snapshot);
    assert.equal(store.selected().planId, 'fixture-current-plan');
    assert.equal(store.selected().chatUrl, legacy.chatUrl);
  }

  const reopenedSingle = new WorkspaceSessions(store.file); await reopenedSingle.load();
  const savedProject = reopenedSingle.snapshot().projects.find(project => project.workspace === workspace);
  for (const legacy of legacyChats) {
    const saved = savedProject.sessions.find(session => session.sessionId === legacy.sessionId);
    assert.equal(saved.chatUrl, legacy.chatUrl);
    assert.equal(saved.title, legacy.sessionId === scopeOwner.sessionId ? currentScopeTitle : legacy.title);
  }
  const singleActivePlanScreenshot = path.join(dataDir, 'single-active-plan.png');
  await fs.writeFile(singleActivePlanScreenshot, (await sidebar.capturePage()).toPNG());

  assert.equal(planContinuation.view().enabled, false, 'completion disables project permission across chats');
  assert.equal((await savedAutoState()).planContinuationEnabled, false);
  await continuePlan(false);
  const savedOff = await savedAutoState();
  assert.equal(savedOff.planContinuationEnabled, false);
  const restartedOff = await restartFixture('off');
  assert.match(restartedOff.stdout, /"planContinuationRestart":"off"/);
  planContinuation.dispose(); planContinuation.restore(savedOff.planContinuationEnabled, savedOff.continuationCheckpoint);
  await planContinuation.recover();
  assert.equal(planContinuation.view().enabled, false, 'disabled choice remains off after reconstruction');
  // Doctor scenarios begin after prior background recovery work has settled.
  await waitFor(() => !controller.contextCache.isPending(), 'background preparation before Doctor', snapshot);
  // Doctor operates on the isolated fixture only; the real workspace is never damaged.
  const doctorManifest = path.join(workspace, '.harness/kit-manifest.json');
  const staleManifest = JSON.parse(await fs.readFile(doctorManifest, 'utf8'));
  staleManifest.version = '1.2.0';
  for (const entry of staleManifest.files.filter(e => e.kind === 'owned')) entry.hash = '0'.repeat(64);
  await fs.writeFile(doctorManifest, JSON.stringify(staleManifest, null, 2) + '\n');
  const damagedBytes = await fs.readFile(doctorManifest);
  const doctorSession = store.selected().sessionId;
  await sidebar.executeJavaScript(`window.webPilot.selectSession(${JSON.stringify(workspace)}, ${JSON.stringify(doctorSession)})`);
  await waitFor(() => snapshot().workspaceHealth?.phase === 'error', 'stale manifest in background', snapshot);
  assert.equal(snapshot().workspaceHealth.ready, false);
  assert.ok(snapshot().workspaceHealth.issues.length > 0);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("workspace-health-doctor").hidden'), false);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("open-settings").disabled'), false);
  await sidebar.executeJavaScript('document.getElementById("workspace-health-doctor").click()');
  await waitFor(() => snapshot().settings && !snapshot().setup, 'doctor from setup failure', snapshot);
  assert.deepEqual(await fs.readFile(doctorManifest), damagedBytes, 'opening doctor does not repair');
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("doctor-run").disabled'), 'doctor button ready', snapshot);
  await sidebar.executeJavaScript('document.getElementById("doctor-run").click(); document.getElementById("doctor-run").click()');
  await waitFor(() => snapshot().doctor?.phase === 'done', 'doctor repair completed', snapshot);  const doctorReport = snapshot().doctor;
  assert.equal(doctorReport.projectReady, true, JSON.stringify(doctorReport));
  assert.equal(doctorReport.servicesReady, true); assert.deepEqual(doctorReport.issues, []);
  assert.ok(doctorReport.backupPath); assert.equal(JSON.parse(await fs.readFile(doctorManifest)).version, BUNDLED_KIT_VERSION);
  assert.equal(store.selected().sessionId, doctorSession, 'repair never starts a session');
  await fs.stat(path.join(doctorReport.backupPath,'repair.json'));
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("doctor-open").disabled'), 'doctor success actions ready', snapshot);
  const doctorScreenshots = [];
  assert.equal(await sidebar.executeJavaScript('Array.from(document.querySelectorAll("#doctor-actions button")).every(button => button.getBoundingClientRect().height < 75)'), true, 'doctor actions stay compact');
  for (const theme of ['light','dark']) {
    await sidebar.executeJavaScript(`window.webPilot.setTheme('${theme}')`);
    await sidebar.executeJavaScript('document.getElementById("doctor-panel").scrollIntoView({block:"start"})');
    const file = path.join(dataDir, 'doctor-' + theme + '.png');
    await fs.writeFile(file, (await sidebar.capturePage()).toPNG()); doctorScreenshots.push(file);
    assert.equal(await sidebar.executeJavaScript('document.getElementById("doctor-panel").scrollWidth <= document.getElementById("doctor-panel").clientWidth + 1'), true, 'doctor fits minimum width');
  }
  await sidebar.executeJavaScript('document.getElementById("doctor-open").click()');
  await waitFor(() => !snapshot().settings && !snapshot().setup && (settled() || stale()), 'repaired session opens', snapshot);
  assert.equal(store.selected().sessionId, doctorSession);
  await waitFor(() => !controller.contextCache.isPending(), 'background preparation before repeat Doctor', snapshot);
  await sidebar.executeJavaScript('window.webPilot.openSettings()');
  await sidebar.executeJavaScript('window.webPilot.runDoctor(' + JSON.stringify(workspace) + ')');
  assert.equal(snapshot().doctor.repaired, false, 'repeat repair is idempotent');
  const beforeDoctorRefresh = await browser.executeJavaScript('window.fixtureMessages.length');
  assert.equal(await sidebar.executeJavaScript('document.getElementById("doctor-refresh")'),null);
  await sidebar.executeJavaScript('window.webPilot.continueDoctor("open")');
  await waitFor(() => (settled() || stale()), 'doctor opens existing session', snapshot);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), beforeDoctorRefresh);
  await waitFor(() => !controller.contextCache.isPending(), 'background preparation before new Chat', snapshot);
  await sidebar.executeJavaScript('window.webPilot.openSettings()');
  const beforeDoctorNew = store.snapshot().projects.find(p => p.workspace === workspace).sessions.length;
  const invalidDoctor=await sidebar.executeJavaScript('window.webPilot.continueDoctor("unsupported")');assert.equal(invalidDoctor.ok,false);
  await sidebar.executeJavaScript('window.webPilot.continueDoctor("chat")');
  await waitFor(() => store.selected().sessionId !== doctorSession && settled(), 'doctor new Chat created', snapshot);
  assert.equal(store.snapshot().projects.find(p => p.workspace === workspace).sessions.length, beforeDoctorNew + 1);

  // A new project's first Chat session uses the same one-click path and real IPC.
  await sidebar.executeJavaScript('window.webPilot.beginCreate()');
  await waitFor(() => snapshot().setup?.phase === 'form', 'first Chat project form', snapshot);
  assert.equal(snapshot().setup.parent, path.dirname(workspace), 'next project reuses the explicit choice');
  await chooseProjectsFolder(true);
  assert.equal(snapshot().setup.parent, path.dirname(workspace), 'cancel keeps the remembered folder');
  const changedParent = path.join(path.dirname(workspace), 'Другое расположение');
  await fs.mkdir(changedParent);
  await chooseProjectsFolder(false, changedParent);
  assert.equal(JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8')).projectsParent, changedParent, 'replacement saved on disk');
  await sidebar.executeJavaScript('window.webPilot.beginCreate()');
  assert.equal(snapshot().setup.parent, changedParent, 'all following projects use the replacement');
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("setup-name").hidden'), 'first Chat location selected', snapshot);
  await sidebar.executeJavaScript(`document.getElementById('setup-name').value='Первый Chat'; document.getElementById('setup-preview').click()`);
  await waitFor(() => snapshot().setup?.phase === 'preview', 'first Chat project preview', snapshot);
  const firstChatTarget = snapshot().setup.workspace;
  assert.equal(firstChatTarget, path.join(changedParent, 'Первый Chat'));
  const invalidToken = await sidebar.executeJavaScript('window.webPilot.applySetup(' + JSON.stringify(snapshot().setup.token+'.invalid') + ')');
  assert.equal(invalidToken.ok, false); await assert.rejects(fs.stat(firstChatTarget), { code: 'ENOENT' });
  await sidebar.executeJavaScript('window.webPilot.refreshSetup()');
  await waitFor(() => snapshot().setup?.phase === 'preview' && !snapshot().setup.error, 'recover rejected token', snapshot);
  await sidebar.executeJavaScript('window.webPilot.refreshSetup()');
  await waitFor(() => sidebar.executeJavaScript('!document.getElementById("setup-create-chat").disabled'), 'first Chat button ready', snapshot);
  await sidebar.executeJavaScript('document.getElementById("setup-create-chat").click(); document.getElementById("setup-create-chat").click()');
  await waitFor(() => store.selected()?.workspace === firstChatTarget && settled(), 'first Chat opens directly', snapshot);
  assert.equal(store.snapshot().projects.find(p => p.workspace === firstChatTarget).sessions.length, 1);

  // Animation frames run in the hidden, unthrottled fixture renderer.
  assert.equal(window.isVisible(), false, 'geometry tests never show a desktop window');
  const geometryDebugger = browser.debugger, geometryAttached = geometryDebugger.isAttached();
  if (!geometryAttached) geometryDebugger.attach('1.3');
  await geometryDebugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true });
  await browser.executeJavaScript(`(()=>{const box=document.createElement('div');box.id='reverse-probe';box.className='thread-scroll-container';box.style.cssText='position:fixed;top:80px;left:100px;width:240px;height:120px;overflow:auto;display:flex;flex-direction:column-reverse;z-index:9999';box.innerHTML='<div style="height:1200px;flex-shrink:0">scroll probe</div>';document.body.prepend(box);box.scrollTop=-400;window.__scrollWrites=0;const original=box.scrollTo.bind(box);box.scrollTo=opts=>{window.__scrollWrites++;original(opts)};})()`);
  await browser.executeJavaScript(autoScrollPageScript({forceFollow:true}));
  await waitFor(()=>browser.executeJavaScript('Math.abs(document.getElementById("reverse-probe").scrollTop)<1'), 'reverse bottom reached',snapshot);
  await browser.executeJavaScript(`(()=>{const b=document.getElementById('reverse-probe');window.__writesAtBottom=window.__scrollWrites;for(let i=0;i<20;i++)b.firstElementChild.append(document.createTextNode(' chunk'));})()`);
  await new Promise(r=>setTimeout(r,100));
  assert.equal(await browser.executeJavaScript('window.__scrollWrites === window.__writesAtBottom'),true,'reverse mutations do not cause repeated scrolling');
  await browser.executeJavaScript(`(()=>{const b=document.getElementById('reverse-probe');b.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-100}));b.scrollTop=-200;b.firstElementChild.append(' more');})()`);
  await new Promise(r=>setTimeout(r,100));
  assert.equal(await browser.executeJavaScript('document.getElementById("reverse-probe").scrollTop'),-200,'manual history stays still');
  await browser.executeJavaScript('document.getElementById("reverse-probe").remove();window.__webPilotConversationAutoScroll.refresh()');
  await geometryDebugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: false });
  if (!geometryAttached && geometryDebugger.isAttached()) geometryDebugger.detach();
  assert.equal(await sidebar.executeJavaScript('document.getElementById("prototype-version").textContent'), app.getVersion());
  const beforeSidebarReload = snapshot();
  await sidebar.reload();
  await waitFor(() => sidebar.executeJavaScript('typeof window.webPilot === "object" && document.getElementById("prototype-version")?.textContent === ' + JSON.stringify(app.getVersion())), 'sidebar reload receives initial state', snapshot);
  assert.equal(await sidebar.executeJavaScript('document.getElementById("plan-card").hidden'), false);
  assert.equal(snapshot().selected?.sessionId, beforeSidebarReload.selected?.sessionId, 'sidebar reload does not change selected session');
  // Ordinary first message: actual trusted input, persisted URL, no recovery acknowledgement.
  await browser.executeJavaScript("localStorage.setItem('fixture-restored-draft','Моё обычное ручное сообщение')");
  await sidebar.executeJavaScript('window.webPilot.newSession(' + JSON.stringify(firstChatTarget) + ')');
  await waitFor(() => snapshot().context.phase === 'waiting-draft', 'ordinary manual draft', snapshot);
  await trustedClick('[data-testid=send-button]');
  await waitFor(() => snapshot().context.phase === 'manual-session' && !!store.selected().chatUrl, 'ordinary Send binds its own conversation', snapshot);
  const manualSession = store.selected();
  assert.equal(snapshot().context.messageSent, false);
  assert.notEqual(manualSession.attempt?.state, 'sent');
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  const reopenedManual = new WorkspaceSessions(store.file); await reopenedManual.load();
  assert.equal(reopenedManual.selected().manualStart, true);
  assert.equal(reopenedManual.selected().chatUrl, manualSession.chatUrl);
  const loadsBeforeManualReopen = packetLoads;
  await navigate(reopenedManual.selected());
  await waitFor(() => snapshot().context.phase === 'manual-session', 'ordinary conversation after restart', snapshot);
  assert.equal(browser.getURL(), manualSession.chatUrl);
  assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'), 1);
  assert.equal(packetLoads, loadsBeforeManualReopen);
  const nativeProject=store.selected(), browserCount=[...liveSessions.all()].length, loadsBeforeNative=packetLoads;
  const nativeSession=await store.connectExternal(nativeProject.workspace,{projectId:nativeProject.projectId,
    requestId:'00000000-0000-4000-8000-000000000017',conversationKey:'a'.repeat(64)});
  assert.equal(store.selected().sessionId,nativeProject.sessionId);
  const selectNative=await sidebar.executeJavaScript('window.webPilot.selectSession('+JSON.stringify(nativeProject.workspace)+','+JSON.stringify(nativeSession.sessionId)+')');
  assert.equal(selectNative.ok,true,JSON.stringify(selectNative.error));
  await waitFor(()=>snapshot().context.phase==='external-session','external conversation selection',snapshot);
  assert.equal(liveSessions.visible,null,'native conversation has no embedded browser');
  assert.equal([...liveSessions.all()].length,browserCount);
  assert.equal(packetLoads,loadsBeforeNative,'selecting external session does not resend context');
  assert.throws(()=>liveSessions.ensure(store.selected()),{code:'EXTERNAL_SESSION'});
  await waitFor(()=>sidebar.executeJavaScript('document.getElementById("plan-run-toggle").hidden && !document.getElementById("session-notice").hidden'),'external session notice',snapshot);
  const nativeRestart=new WorkspaceSessions(store.file);await nativeRestart.load();
  assert.equal(nativeRestart.selected().external.provider,'chatgpt-plugin');
  assert.equal(await sidebar.executeJavaScript('document.querySelector(".new-project-plugin") === null && document.getElementById("plugin-launch-notice") === null'),true);
  const previousController=getLive().controller,previousCancel=previousController.cancel;
  let backgroundCancelled=0;
  previousController.cancel=function(...args){backgroundCancelled++;return previousCancel.apply(this,args);};
  try {
    const archived=await sidebar.executeJavaScript('window.webPilot.archiveSession('+JSON.stringify(nativeProject.workspace)+','+JSON.stringify(nativeSession.sessionId)+')');
    assert.equal(archived.ok,true);
    assert.equal(backgroundCancelled,0,'archiving a native session must not cancel the previous browser');
  }finally{previousController.cancel=previousCancel;}
  const selectEmbedded=await sidebar.executeJavaScript('window.webPilot.selectSession('+JSON.stringify(nativeProject.workspace)+','+JSON.stringify(nativeProject.sessionId)+')');
  assert.equal(selectEmbedded.ok,true,JSON.stringify(selectEmbedded.error));
  assert.equal(store.selected().external,undefined);
  fixtureUnsupportedRedirect=true;
  const guarded=await sidebar.executeJavaScript('window.webPilot.newSession('+JSON.stringify(nativeProject.workspace)+')');
  assert.equal(guarded.ok,true,JSON.stringify(guarded.error));
  await waitFor(()=>store.selected()?.attempt?.cancelReason==='foreign-navigation'&&store.selected().attempt.cancelState==='revoked',
    'real Chat redirect before shared c is durably rejected',snapshot);
  const denied=store.selected();assert.equal(denied.chatUrl,null);assert.notEqual(denied.attempt.state,'sent');
  const deniedMessage=[...plugin.communication.runs.values()].flatMap(r=>r.messages).find(m=>m.message_id===denied.attempt.contextRef.message_id);
  assert.equal(deniedMessage.read,false);assert.equal(deniedMessage.cancelled,true);
  const returnEmbedded=await sidebar.executeJavaScript('window.webPilot.selectSession('+JSON.stringify(nativeProject.workspace)+','+JSON.stringify(nativeProject.sessionId)+')');
  assert.equal(returnEmbedded.ok,true);
  // The former parallel UI scenario (tests/parallel-execution-smoke-fixture.cjs) started executors with attachments.
  // Since 0.5.20 executors start only through the panel channel, which the fixture ChatGPT page does not have;
  // the executor dialogue is covered by the isolated parallel-execution, parallel-finalization,
  // automatic-agent-dialogue and prepared-flow-cycle suites.
  await verifyDeletionRecoveryUi({sidebar,browser,store,snapshot,dataDir,deletion,deletionHooks,execution,dialog,makeAux,getArchiveWindow,waitFor,neighbour:auxE});
  const result = { legacyParallelScenario: 'retired-panel-startup', panelStartupCompleted: true, ordinaryManualSend: true, urlQueryBootstrap: true, boundedReconnect: true, largeAutomaticSend: true, fullVersionBadge: true, septemberDOM: true, reverseScroll: true, directFirstChat: true, unsupportedOptionsRejected: true, startupLoginEntrypoint: true, uninterruptedFirstRequest: true, firstRequestNetworkTrace: true, duplicateStartupBlocked: true, earlyFirstLoadDiagnostics: true, guidedFirstRun: true, firstRunScreenshots: [path.join(dataDir, "startup-account.png"), path.join(dataDir, "startup-login.png"), path.join(dataDir, "startup-components.png")], fastSavedNavigation: true, lastNavigationWins: true, readinessBeforeOrAfterLoad: true, backgroundFailureRetry: true, liveChatColors: true, composerBackground: true, streamingAssistantColor: true, chatColorsPersistence: true, chatColorsReset: true, colorScreenshots, projectDoctor: true, doctorBackup: true, doctorOpen: true, doctorRefresh: true, doctorNewSession: true, doctorScreenshots, newestSessionFirst: true, projectSelectsNewest: true, threeSessionViewport: true, sessionScrollPreserved: true, visibleSessionScrollbar: true, nativeProjectsDisclosure: true, treePopover: true, treeScreenshots, singleActivePlanSessions: true, checkoutPlanAcrossOldChats: true, checkoutRecoveryShared: true, noPreparedPlanUi: true,
    singleActivePlanScreenshot,unsupportedRedirectRejected:true, mode: 'isolated-fixture', electron: process.versions.electron, chromium: process.versions.chrome,
    views: window.contentView.children.length, secureRemote: true, sidebarIpc: true, archiveRestore: true, archiveRestart: true, deleteCancel: true, localDeletion: true, cloudChatPreserved: true, workspaceCreation: true, workspaceValidation: true, cancelPreservesSession: true, startupMessages: 4, canonicalPacketLoads: packetLoads, recoveryCache: true, operationProgress: true, progressScreenshot: path.join(dataDir, 'progress-ui.png'),
    tokenCounterRemoved: true, projectRename: true, sessionRename: true, sessionScopedTitleSync: true, restartKeepsSession: true, newChatCreatesSession: true, sessionTree: true, selectsEarlierSession: true, compactWorkspaceDetails: true, projectPathClipboard: true, sessionPlans: true, singleCurrentPlan: true, clientPlanContinuation: true, planContinuation01TestAuto: true,
    planContinuationFreshProcessModes: ['busy', 'sent', 'sending', 'manual', 'off'], planContinuationReloadNoDuplicate: true, chatOnly: true, noAcceptanceButton: true, chromiumDiagnostics: true, contextWindowIndicatorRemoved: true, resizableSidebar: true, separateArchiveWindow: true, archiveMultiSelect: true, archiveForgetKeepsFolder: true, archiveRecoveryAfterInterrupt: true, replacementFolderProtected: true, orphanSettingsConfirmed: true, orphanUnknownRefused: true, shellTheme: true, nativeTitlebarTheme: nativeTheme.shouldUseDarkColors, toolCallFilter: true, microphonePermission: true, geolocationPermission: true, cameraPermission: false, fullContextBytes: Buffer.byteLength(fixtureContext), liveChatGPT: false, agentToolsRequired: false };
  await fs.writeFile(path.join(dataDir, 'smoke-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

async function verifyDeletionRecoveryUi({sidebar,browser,store,snapshot,dataDir,deletion,deletionHooks,execution,dialog,makeAux,getArchiveWindow,waitFor,neighbour}) {
  assert.ok(path.basename(dataDir).startsWith('workflow-pilot-smoke-'),'recovery tests never use the real profile');
  const removed=await makeAux('Архив после прерывания','recovery-t005');
  const replaced=await makeAux('Архив с новым владельцем','replacement-t005');
  await sidebar.executeJavaScript('window.webPilot.openArchive()');
  await waitFor(()=>!!getArchiveWindow()&&!getArchiveWindow().isDestroyed(),'recovery fixture archive window',snapshot);
  const archive=getArchiveWindow().webContents;
  await waitFor(()=>archive.executeJavaScript('typeof window.webPilotArchive === "object"'),'recovery fixture archive preload',snapshot);
  await archive.executeJavaScript('window.webPilotArchive.cancelDelete()'); // refresh the newly seeded archives through real IPC
  const row=item=>`[...document.querySelectorAll('[data-workspace]')].find(el=>el.dataset.workspace===${JSON.stringify(item.workspace)})`;
  const confirmAndInterrupt=async item=>{
    const realFinish=deletionHooks.beforeFinish;
    deletionHooks.beforeFinish=async()=>{throw Error('fixture interruption after durable confirmed journal');};
    try {
      await waitFor(()=>archive.executeJavaScript('!!('+row(item)+')'),'new archived fixture listed',snapshot);
      await archive.executeJavaScript('('+row(item)+').click()');
      await archive.executeJavaScript('document.getElementById("delete").click()');
      await waitFor(()=>archive.executeJavaScript('!document.getElementById("delete-panel").hidden'),
        'archive preview confirmation',snapshot);
      await archive.executeJavaScript(`(()=>{
        const input=document.getElementById('delete-confirmation');
        input.value=${JSON.stringify(item.name)};
        input.dispatchEvent(new Event('input',{bubbles:true}));
        document.getElementById('confirm-delete').click();
      })()`);
      await waitFor(()=>archive.executeJavaScript('document.getElementById("notice").textContent.includes("fixture interruption")'),
        'interrupted deletion reported by archive',snapshot);
    }finally{deletionHooks.beforeFinish=realFinish;}
    assert.equal(deletion.isPending(item.workspace),true);
    const journals=await Promise.all((await fs.readdir(deletion.journalDir)).map(async name=>
      JSON.parse(await fs.readFile(path.join(deletion.journalDir,name),'utf8'))));
    assert.equal(journals.find(job=>job.workspace===item.workspace)?.stage,'confirmed');
    assert.ok(await archive.executeJavaScript('('+row(item)+').textContent.includes("удаление ожидает завершения")'));
  };
  await confirmAndInterrupt(removed);
  await fs.rm(removed.workspace,{recursive:true}); // emulate external interruption using disposable fixture files
  await archive.executeJavaScript('document.getElementById("recover").click()');
  await waitFor(async()=>!store.project(removed.workspace)&&!deletion.isPending(removed.workspace)
    &&(await fs.readdir(deletion.journalDir)).length===0,
  'recovery through archive button completes',snapshot);
  assert.equal(deletion.isPending(removed.workspace),false);
  assert.deepEqual(await fs.readdir(deletion.journalDir),[]);
  await waitFor(()=>archive.executeJavaScript('!('+row(removed)+')'),'completed row disappears without restart',snapshot);
  const twice=await archive.executeJavaScript('window.webPilotArchive.recoverDeletions()');
  assert.equal(twice.ok,true,'second archive recover has no effect');
  await confirmAndInterrupt(replaced);
  await fs.rm(replaced.workspace,{recursive:true});
  await fs.mkdir(replaced.workspace);
  await fs.writeFile(path.join(replaced.workspace,'new-project.txt'),'foreign directory: preserve');
  await archive.executeJavaScript('document.getElementById("recover").click()');
  await waitFor(()=>archive.executeJavaScript('document.getElementById("notice").textContent.includes("Исходная папка")'),
    'replacement refusal is visible in the archive',snapshot);
  assert.equal(await fs.readFile(path.join(replaced.workspace,'new-project.txt'),'utf8'),'foreign directory: preserve');
  assert.ok(store.project(replaced.workspace),'the replaced project record remains for safe recovery');
  await fs.rm(replaced.workspace,{recursive:true}); // fixture-only cleanup after refusal was verified
  await archive.executeJavaScript('document.getElementById("recover").click()');
  await waitFor(async()=>!store.project(replaced.workspace)&&!deletion.isPending(replaced.workspace)
    &&(await fs.readdir(deletion.journalDir)).length===0,
  'retry after removing disposable replacement',snapshot);
  assert.deepEqual(await fs.readdir(deletion.journalDir),[]);
  getArchiveWindow().close();

  const parent=await makeAux('Уже удалённый родитель','orphan-parent-t005');
  const parentRecord=store.snapshot().projects.find(p=>p.workspace===parent.workspace);
  const assignmentId='wp-orphan-t005',orphanId='orphan-fixture-id-t005',orphanSessionId='web-pilot-orphan-fixture-005';
  const orphanPath=path.join(path.dirname(parent.workspace),'.workflow-pilot-worktrees',
    createHash('sha256').update(parent.workspace).digest('hex').slice(0,16),assignmentId);
  const orphan={...structuredClone(parentRecord),workspace:orphanPath,projectId:orphanId,
    parentWorkspace:parent.workspace,parentProjectId:parent.projectId,ownershipState:'recovery',
    name:'Потерянный исполнитель',displayName:'Потерянный исполнитель',
    selectedSessionId:orphanSessionId,sessions:[{...structuredClone(parentRecord.sessions[0]),
      sessionId:orphanSessionId,chatUrl:'https://chatgpt.com/c/orphan-fixture-cloud-chat',
      assignmentId,taskId:'T005',parentScopeId:'fixture-scope',parentWorkspace:parent.workspace,
      parentProjectId:parent.projectId,executionOriginSessionId:parentRecord.sessions[0].sessionId}]};
  await fs.mkdir(path.dirname(path.dirname(orphanPath)),{recursive:true}); // hashed group itself is absent
  await store.whenIdle();
  const saved = JSON.parse(await fs.readFile(store.file,'utf8'));
  saved.projects=saved.projects.filter(p=>p.workspace!==parent.workspace);
  saved.projects.push(orphan);
  await fs.writeFile(store.file,JSON.stringify(saved));await fs.rm(parent.workspace,{recursive:true});await store.load();
  assert.equal(store.project(orphanPath)?.ownershipState,'recovery');
  assert.equal(snapshot().executorRecovery.filter(p=>p.workspace===orphanPath).length,1);
  assert.equal(snapshot().projects.some(p=>p.workspace===orphanPath),false,'orphans only appear in recovery');
  const cloudCount=await browser.executeJavaScript('window.fixtureMessages.length');
  const nativeDialog=dialog.showMessageBox,confirmation=[];
  let response=0;
  dialog.showMessageBox=async options=>{confirmation.push(options);return {response};};
  try {
    await sidebar.executeJavaScript('window.webPilot.openSettings()');
    await waitFor(()=>sidebar.executeJavaScript('!document.getElementById("executor-recovery").hidden'),
      'orphan shown in settings recovery',snapshot);
    const rows=()=>sidebar.executeJavaScript('document.querySelectorAll("#executor-recovery-items .executor-recovery-entry").length');
    assert.equal(await rows(),1);
    assert.match(await sidebar.executeJavaScript('document.getElementById("executor-recovery").textContent'),/Облачные чаты ChatGPT сохраняются/);
    const click=async()=>{
      // A native confirmation can resolve while the renderer is still finishing
      // the previous action. Never drop a second click into actionPending.
      await waitFor(()=>sidebar.executeJavaScript('!!document.querySelector("#executor-recovery-items button") && !document.querySelector("#executor-recovery-items button").disabled'),
        'recovery action ready after previous confirmation',snapshot);
      await sidebar.executeJavaScript('document.querySelector("#executor-recovery-items button").click()');
    };
    await click();
    await waitFor(()=>confirmation.length===1,'native orphan confirmation requested',snapshot);
    assert.deepEqual(confirmation[0].buttons,['Отмена','Убрать запись']);
    assert.equal(confirmation[0].defaultId,0);
    assert.match(confirmation[0].detail,/Облачные чаты ChatGPT сохраняются/);
    assert.ok(store.project(orphanPath),'cancel keeps the orphan record');
    response=1;
    await fs.mkdir(orphanPath,{recursive:true});
    await click();
    await waitFor(()=>sidebar.executeJavaScript('document.getElementById("error-banner").textContent.includes("папк")'),
      'present worktree refused before confirmation',snapshot);
    assert.equal(confirmation.length,1,'a present folder never reaches the confirmation dialog');
    assert.ok(store.project(orphanPath));
    await fs.rm(orphanPath,{recursive:true});
    execution.publish(parent.workspace,{assignments:[{worktree:orphanPath,status:'UNKNOWN'}]});
    await click();
    await waitFor(()=>confirmation.length===2,'UNKNOWN command confirmation requested',snapshot);
    await waitFor(()=>sidebar.executeJavaScript('document.getElementById("error-banner").textContent.includes("Исполнение не завершено")'),
      'UNKNOWN command blocks cleanup',snapshot);
    assert.ok(store.project(orphanPath));
    execution.publish(parent.workspace,{assignments:[]});
    const mismatch=await sidebar.executeJavaScript(`window.webPilot.clearOrphanExecutor({workspace:${JSON.stringify(orphanPath)},projectId:"wrong-project-id"})`);
    assert.equal(mismatch.ok,false,'replacement project ID must not be removed');
    await click();
    await waitFor(()=>!store.project(orphanPath),'confirmed orphan cleanup through settings IPC',snapshot);
    await waitFor(async()=>await rows()===0,'orphan disappears from the same renderer session',snapshot);
    const restarted=new WorkspaceSessions(store.file);await restarted.load();
    assert.equal(restarted.project(orphanPath),null,'cleanup survives storage restart');
    assert.equal(restarted.project(parent.workspace),null);
    assert.equal(await browser.executeJavaScript('window.fixtureMessages.length'),cloudCount,'remote conversation fixture remains untouched');
    assert.ok(store.project(neighbour.workspace),'unrelated archived project survives');
  }finally{dialog.showMessageBox=nativeDialog;execution.publish(parent.workspace,{assignments:[]});}
}
