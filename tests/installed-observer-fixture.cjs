const { app, BrowserWindow, ipcMain, session } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildSync } = require('esbuild');
const fixtureBundle = buildSync({ entryPoints: [path.join(__dirname, 'prosemirror-composer-fixture.mjs')],
  bundle: true, platform: 'browser', format: 'iife', write: false }).outputFiles[0].text;
const [resourceRoot, moduleRoot, profile] = process.argv.slice(2);
app.setPath('userData', profile);
const html = `<!doctype html><html><body><div id="messages"></div><form>
<div id="editor-host"></div><button data-testid="send-button" disabled>Send</button></form>
<script>
const sent=JSON.parse(sessionStorage.getItem('sent')||'[]');
function show(text){const el=document.createElement('article');el.dataset.messageAuthorRole='user';el.textContent='Вставленный Markdown.md';document.querySelector('#messages').append(el)}
sent.forEach(show);
document.querySelector('form').onsubmit=e=>{e.preventDefault();const text=fixtureReadModel();sent.push(text);sessionStorage.setItem('sent',JSON.stringify(sent));show(text);history.replaceState({},'', '/c/installed-fixture');fixtureClearModel();document.querySelector('#prompt-textarea').dispatchEvent(new Event('input',{bubbles:true}))};
setTimeout(()=>document.querySelector('button').disabled=false,350);
</script></body></html>`;
let fixtureStage = 'boot', trace = [];
const deadline = setTimeout(() => { console.error('Installed fixture deadline', fixtureStage, JSON.stringify(trace.slice(-4))); app.exit(1); }, 20000);
app.whenReady().then(async () => {
  const { PageStateSource } = await import(pathToFileURL(path.join(moduleRoot, 'page-state.mjs')));
  const { connectPageState } = await import(pathToFileURL(path.join(moduleRoot, 'page-state-bridge.mjs')));
  const { ChatGPTComposer } = await import(pathToFileURL(path.join(moduleRoot, 'chatgpt-composer.mjs')));
  const partition = session.fromPartition('installed-observer-fixture');
  await partition.protocol.handle('https', () => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
  const view = new BrowserWindow({ show: false, webPreferences: { session: partition,
    sandbox: true, contextIsolation: true, nodeIntegration: false,
    preload: path.join(resourceRoot, 'resources/chatgpt-page-observer-preload.cjs') } });
  const source = new PageStateSource(), disconnect = connectPageState(view.webContents, ipcMain, source);
  try {
    fixtureStage = 'load';
    await view.loadURL('https://chatgpt.com/');
    await view.webContents.executeJavaScript(fixtureBundle);
    if (!source.current?.state.editorAvailable) await source.waitForChange(source.version, { timeoutMs: 3000 });
    assert.ok(source.current?.state.editorAvailable);
    assert.equal(await view.webContents.executeJavaScript('typeof window.require + ":" + typeof window.webPilot'), 'undefined:undefined');
    fixtureStage = 'clear';
    const composer = new ChatGPTComposer(view.webContents, { pageState: source, onDiagnostic: r => trace.push(r) });
    assert.equal((await composer.clearNewSessionDraft()).action, 'draft-cleared');
    assert.equal((await composer.inspect()).draftLength, 0);
    fixtureStage = 'deliver';
    // Comparable to the incident: ~100k characters with hundreds of lines.
    const text = '\n\n  <script>not executable</script> & \\ literal\n' + ('Полный пакет проверки. Отступы  и путь /My  Folder. '.repeat(3) + '\n').repeat(700)
      + '\n\tТабуляция\nКод: \\n и \\t\nwp-request-installed-fixture';
    const delivery=await composer.deliver({ text, requestId: 'wp-request-installed-fixture' });
    assert.equal(delivery.state, 'sent');assert.equal(delivery.completion, 'send-dispatched');
    const clickIndex=trace.findIndex(r=>r.outcome==='clicked');
    assert.ok(clickIndex>=0);
    assert.equal(trace.slice(clickIndex+1).some(r=>r.event==='observation'),false,
      'no post-Send DOM inspection or confirmation wait');
    assert.equal((await composer.inspect({requestId:'wp-request-installed-fixture'})).messageSeen,false,
      'attachment UI contains no recovery marker');
    assert.equal(await view.webContents.executeJavaScript('document.querySelectorAll("article").length'), 1);
    const insertion=trace.find(r=>r.insertionMethod==='ClipboardEvent.paste');
    assert.ok(insertion, 'installed composer uses paste pipeline');
    assert.equal(insertion.pasteHandled, true);
    assert.equal(await view.webContents.executeJavaScript('fixturePasteTransactions'), 1);
    assert.equal(await view.webContents.executeJavaScript('fixturePastedModel'), text,
      'whole model preserves every character, blank line and indentation');
    assert.equal(await view.webContents.executeJavaScript('document.querySelector("#editor-host script")'), null);
    assert.ok(insertion.elapsedMs < 5000, 'large fixture insertion must not regress to tens of seconds');
    assert.ok(trace.some(r => r.outcome === 'clicked'));
    assert.ok(trace.some(r => r.event === 'delivery-result' && r.state === 'sent'));
    assert.ok(trace.some(r => r.diagnostic?.editorKind === 'contenteditable'));
    assert.equal(JSON.stringify(trace).includes('Полный пакет проверки'), false);
    fixtureStage = 'error-observer';
    const errorVersion = source.version;
    await view.webContents.executeJavaScript("(()=>{const e=document.createElement('div');e.setAttribute('role','alert');e.textContent='Resume stream unavailable';document.body.append(e)})()");
    if (source.current?.state.connectionError !== 'stream-interrupted')
      await source.waitForChange(errorVersion, { timeoutMs: 3000 });
    assert.equal(source.current.state.connectionError, 'stream-interrupted');
    assert.equal((await composer.inspect()).connectionError, 'stream-interrupted');
    const documentId = source.current.documentId;
    await view.loadURL('https://chatgpt.com/c/installed-fixture');
    await view.webContents.executeJavaScript(fixtureBundle);
    if (!source.current?.state.editorAvailable) await source.waitForChange(source.version, { timeoutMs: 3000 });
    assert.notEqual(source.current.documentId, documentId);
    assert.equal((await composer.inspect({ requestId: 'wp-request-installed-fixture' })).messageSeen, false);
    assert.equal(await view.webContents.executeJavaScript('document.querySelector("#prompt-textarea").innerText'), 'Контекст архивной сессии wp-request-old-draft');

    assert.equal(await view.webContents.executeJavaScript('document.querySelectorAll("article").length'), 1);

    fixtureStage = 'cancel-owned-paste';
    await view.webContents.executeJavaScript('fixtureClearModel()');
    const cancelled = await composer.sendUserMessage({ text: 'Продолжай', cleanupOnCancel: true,
      onBeforeSend: async () => false });
    assert.equal(cancelled.state, 'cancelled');
    assert.equal(await view.webContents.executeJavaScript('fixtureReadModel()'), '',
      'real ProseMirror clears only the automatic insertion after cancellation');

    fixtureStage = 'installed-auto-plan';
    const { AutoPlan } = await import(pathToFileURL(path.join(moduleRoot, 'auto-plan.mjs')));
    await view.webContents.executeJavaScript('fixtureClearModel()');
    const waiting = new Set();
    const notify = () => { for (const check of [...waiting]) check(); };
    const until = predicate => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiting.delete(check); reject(new Error('Installed AutoPlan timeout: ' + fixtureStage + ' ' + JSON.stringify({ auto: automatic.view(), page: source.current?.state }))); }, 4000);
      const check = () => { if (predicate()) { clearTimeout(timer); waiting.delete(check); resolve(); } };
      waiting.add(check); check();
    });
    const selection = { workspace: '/installed-fixture', sessionId: 'chat', scopeId: 'scope', chatUrl: 'https://chatgpt.com/c/installed-fixture' };
    const plan = { confirmed: true, scopeId: 'scope', scopeStatus: 'ACTIVE', planRevision: 3,
      planView: { tasks: [{ id: 'T001', status: 'done' }, { id: 'DOCS', status: 'pending' }] } };
    const automatic = new AutoPlan({ selected: () => selection, inspectPlan: async () => structuredClone(plan),
      send: (text, canContinue, onBeforeSend) => composer.sendUserMessage({ text, canContinue, onBeforeSend, waitForAcknowledgement: false, cleanupOnCancel: true }),
      onChange: notify });
    const unsubscribeAuto = source.subscribe(event => { automatic.observe(event); notify(); });
    automatic.observe(source.current);
    const beginAnswer = async () => {
      await view.webContents.executeJavaScript("(()=>{const b=document.createElement('button');b.id='fixture-stop';b.dataset.testid='stop-button';b.textContent='Stop';document.body.append(b)})()");
      await until(() => source.current.state.busy);
    };
    const endAnswer = () => view.webContents.executeJavaScript("(()=>{const a=document.createElement('article');a.dataset.messageAuthorRole='assistant';a.textContent='Изменение проверено и закоммичено.';document.getElementById('messages').append(a);document.getElementById('fixture-stop').remove()})()");
    try {
      await until(() => !source.current.state.draftPresent);
      await automatic.start();
      assert.equal(automatic.view().reason, 'USER_MESSAGE_PENDING');
      await beginAnswer(); await endAnswer();
      await until(() => automatic.checkpoint?.status === 'sent'
        && source.current.state.userMessageCount === 2);
      assert.equal(await view.webContents.executeJavaScript('JSON.parse(sessionStorage.sent).at(-1)'), 'Продолжай');
      // Replace the complete visible window, including same-text user/assistant
      // messages. Native IDs and DOM counts cannot identify this new answer.
      await beginAnswer();
      await view.webContents.executeJavaScript("document.getElementById('messages').innerHTML='<article data-message-author-role=\"user\">Same request</article>'");
      await endAnswer();
      await until(() => automatic.view().continuations === 2);
      assert.equal(await view.webContents.executeJavaScript('JSON.parse(sessionStorage.sent).length'), 3);
      const saved = automatic.checkpointState();
      automatic.restore(true, saved); await automatic.recover();
      assert.equal(await view.webContents.executeJavaScript('JSON.parse(sessionStorage.sent).length'), 3,
        'reconstructed controller does not repeat a native-less pause');
      await beginAnswer();
      plan.planView.tasks[1].status = 'done'; plan.planRevision++;
      await endAnswer(); await until(() => automatic.view().phase === 'complete');
      assert.equal(await view.webContents.executeJavaScript('JSON.parse(sessionStorage.sent).length'), 3,
        'all DONE produces no extra Continue in installed code');
    } finally { unsubscribeAuto(); automatic.dispose(); }
    console.log(JSON.stringify({ installedPreload: resourceRoot, installedAutoPlan: true, scenario: 'partial plan -> Continue -> all DONE without extra Send; sandbox observer, restored draft cleared, real ProseMirror paste, exact multiline model, immediate Send completion without marker or extra message, Resume stream unavailable detected, same conversation reload without duplicate',
      electron: process.versions.electron, node: process.versions.node, insertionMethod: insertion.insertionMethod, insertionMs: insertion.elapsedMs, chars: text.length, liveChatGPT: false }));
  } finally { disconnect(); view.destroy(); clearTimeout(deadline); }
  app.quit();
}).catch(error => { console.error(error); clearTimeout(deadline); app.exit(1); });
