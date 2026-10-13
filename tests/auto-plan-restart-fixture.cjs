// Fresh Electron process: isolated local page, real preload/composer/Git plan.
const { app, BrowserWindow, ipcMain, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const [settingsFile, expectedChoice, selectedKey, mode = 'busy', answerId] = process.argv.slice(2);
const profile = path.join(path.dirname(settingsFile), 'auto-plan-restart-' + expectedChoice + '-' + mode);
app.setPath('userData', profile);
const deadline = setTimeout(() => { console.error('AutoPlan restart fixture timed out', mode); app.exit(1); }, 15000);
app.whenReady().then(async () => {
  const root = path.resolve(__dirname, '..');
  const { AutoPlan } = await import(pathToFileURL(path.join(root, 'src/auto-plan.mjs')));
  const { readAutoPlanState } = await import(pathToFileURL(path.join(root, 'src/auto-plan-state.mjs')));
  const { PageStateSource } = await import(pathToFileURL(path.join(root, 'src/page-state.mjs')));
  const { connectPageState } = await import(pathToFileURL(path.join(root, 'src/page-state-bridge.mjs')));
  const { ChatGPTComposer } = await import(pathToFileURL(path.join(root, 'src/chatgpt-composer.mjs')));
  const settings = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
  const identity=JSON.parse(selectedKey),project=settings.projectAutoPlan?.[identity[0]];
  settings.autoPlanEnabled=project?.enabled===true;settings.autoPlanCheckpoint=project?.sessions?.[identity[1]]?.autoPlanCheckpoint;
  assert.equal(settings.autoPlanEnabled, expectedChoice === 'on');
  const entries = [2, 3].includes(settings.autoPlanCheckpoint?.version) ? settings.autoPlanCheckpoint.entries : [settings.autoPlanCheckpoint];
  const checkpoint = selectedKey ? entries.findLast(entry => entry.key === selectedKey) : entries.at(-1);
  const [workspace, sessionId, scopeId, chatUrl] = JSON.parse(checkpoint.key);
  const selected = { workspace, sessionId, scopeId, chatUrl };
  // Simulate an interrupted persisted attempt on this real pause, only in a
  // private fixture settings copy. The application settings remain unchanged.
  if (mode === 'sending') {
    checkpoint.status = 'sending';
    const copy = path.join(profile, 'interrupted-settings.json');
    await fs.mkdir(profile, { recursive: true });
    await fs.writeFile(copy, JSON.stringify(settings));
    Object.assign(settings, JSON.parse(await fs.readFile(copy, 'utf8')));
  }
  const partition = session.fromPartition('restart-fixture');
  const assistant = '<article data-message-author-role="assistant" data-message-id="' + answerId + '">Ordinary completed answer</article>';
  const html = '<html><body><div id="messages"><article data-message-author-role="user">Existing request</article>'
    + assistant + (mode === 'manual' ? '<article data-message-author-role="user">Manual decision awaiting a new answer</article>' : '') + '</div>'
    + (mode === 'busy' ? '<button data-testid="stop-button">Stop</button>' : '')
    + '<form><div id="prompt-textarea" contenteditable="true"></div><button data-testid="send-button">Send</button></form>'
    + '<script>window.sent=[];document.querySelector("form").onsubmit=e=>{e.preventDefault();sent.push(document.getElementById("prompt-textarea").textContent)};document.getElementById("prompt-textarea").onpaste=e=>{e.preventDefault();e.currentTarget.textContent+=e.clipboardData.getData("text/plain");e.currentTarget.dispatchEvent(new Event("input",{bubbles:true}))}</script></body></html>';
  await partition.protocol.handle('https', () => new Response(html, { headers: { 'content-type': 'text/html' } }));
  const window = new BrowserWindow({ show: false, webPreferences: { session: partition, sandbox: true,
    contextIsolation: true, nodeIntegration: false, preload: path.join(root, 'resources/chatgpt-page-observer-preload.cjs') } });
  const source = new PageStateSource(), disconnect = connectPageState(window.webContents, ipcMain, source);
  const composer = new ChatGPTComposer(window.webContents, { pageState: source });
  let automatic;
  const wait = async predicate => {
    const began = Date.now();
    while (!predicate()) {
      if (Date.now() - began > 5000) throw new Error('Restart state timeout: ' + mode + ' ' + JSON.stringify(automatic?.view()));
      await source.waitForChange(source.version, { timeoutMs: 50 });
    }
  };
  const unsubscribe = source.subscribe(event => automatic?.observe(event));
  const verify = async () => {
    await wait(() => source.current?.state.editorAvailable);
    if (expectedChoice === 'on') {
      const reason = { sent: 'PAUSE_CONSUMED', sending: 'SEND_UNKNOWN', manual: 'USER_MESSAGE_PENDING' }[mode];
      await wait(() => !automatic.pending && (reason ? automatic.view().reason === reason : automatic.view().phase === 'running'));
      if (mode !== 'manual') assert.equal(source.current.state.turnId, checkpoint.turnId, 'same persisted machine message identity');
    } else assert.equal(automatic.run, null);
    await Promise.all([automatic.planChanged(), automatic.recover(), automatic.planChanged()]);
    assert.equal(automatic.view().enabled, expectedChoice === 'on');
    assert.deepEqual(await window.webContents.executeJavaScript('window.sent'), [], 'fresh process and repeated events never duplicate Send');
  };
  try {
    automatic = new AutoPlan({ selected: () => selected, inspectPlan: () => readAutoPlanState(selected),
      send: (text, canContinue, onBeforeSend) => composer.sendUserMessage({ text, canContinue, onBeforeSend, waitForAcknowledgement: false }) });
    automatic.restore(settings.autoPlanEnabled, settings.autoPlanCheckpoint);
    await window.loadURL(chatUrl); await verify();
    const documentId = source.current.documentId;
    window.webContents.reload();
    await wait(() => source.current?.documentId !== documentId); await verify();
    console.log(JSON.stringify({ autoPlanRestart: expectedChoice, mode, busy: mode === 'busy', sends: 0, reload: true, isolated: true }));
  } finally { automatic?.dispose(); unsubscribe(); disconnect(); window.destroy(); clearTimeout(deadline); app.quit(); }
}).catch(error => { console.error(error); clearTimeout(deadline); app.exit(1); });
