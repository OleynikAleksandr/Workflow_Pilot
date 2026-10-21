import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mountProbe} from '../tools/experiments/pip-probe/view.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

function fixture(t, kind, mode = 'pip') {
  const dom = new JSDOM(['initial','actual','available','clock','tick','count','connection','request','pip',
    'pip-compat','compat','compat-mode','ready','diagnostics']
    .map(id => `<button id="${id}"></button>`).join(''));
  t.after(() => dom.window.close());
  const callbacks = new Map(), calls = [], listeners = new Map(); let n = 0, resolvePending;
  let hostContext = {displayMode: 'inline', availableDisplayModes: ['inline','pip'], identity: 'PRIVATE-HOST'};
  const app = {
    getHostContext: () => hostContext,
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    async connect() {},
    async requestDisplayMode(args) { calls.push(['mode', args.mode]);
      if (mode === 'reject') throw Object.assign(Error('User action required'), {code: -32000});
      return mode === 'empty' ? undefined : {mode}; },
    async callServerTool(args) {
      calls.push(['tool', args.name]);
      if (app.hold) return new Promise(resolve => { resolvePending = resolve; });
      return {structuredContent: {synthetic: true, tick: ++n, serverTime: 'test'}};
    },
  };
  const view = mountProbe({app, document: dom.window.document, kind,
    timers: {setTimeout(fn) { const id = ++n; callbacks.set(id, fn); return id; }, clearTimeout(id) { callbacks.delete(id); }}});
  return {app, view, dom, callbacks, calls,
    ready() { app.ontoolresult({structuredContent:{synthetic:true, kind}, content:[{type:'text',text:'PRIVATE-BODY'}]}); },
    async click(id = 'pip') { dom.window.document.getElementById(id).click(); await new Promise(setImmediate); },
    hostChanged(displayMode) { hostContext = {...hostContext, displayMode}; listeners.get('hostcontextchanged')?.(); },
    async tick() { const entry = callbacks.entries().next().value; if(entry) {callbacks.delete(entry[0]); await entry[1]();} },
    finishPending() { resolvePending({structuredContent: {synthetic: true, tick: 99, serverTime: 'late'}}); },
  };
}

test('closing passive PiP does not stop the independent plan viewer or issue agent commands', async t => {
  const plan = fixture(t, 'plan'), pip = fixture(t, 'dialogue');
  await plan.view.start(); await pip.view.start();
  pip.ready(); await pip.click();
  assert.equal(pip.dom.window.document.getElementById('initial').textContent, 'inline');
  assert.equal(pip.dom.window.document.getElementById('actual').textContent, 'inline');
  assert.match(pip.dom.window.document.getElementById('request').textContent, /ответ SDK — pip/);
  pip.hostChanged('pip');
  assert.equal(pip.dom.window.document.getElementById('actual').textContent, 'pip');
  await pip.app.onteardown();
  const before = plan.calls.length;
  await plan.tick();
  assert.ok(plan.calls.length > before);
  assert.equal(pip.callbacks.size, 0);
  assert.ok([...plan.calls,...pip.calls].every(([kind,name]) => kind === 'mode' || name === 'pip_probe_status'));
  plan.view.dispose();
});
test('alternative mode and host rejection are reported without pretending PiP succeeded', async t => {
  for (const mode of ['fullscreen','reject','empty']) {
    const f = fixture(t, 'dialogue', mode); await f.view.start();
    f.ready(); await f.click();
    const result = f.dom.window.document.getElementById('request').textContent;
    assert.match(result, /не предоставлен|ошибка -32000: User action required|ответ без режима/);
    if (mode === 'empty') assert.doesNotMatch(result, /ошибка/);
    f.view.dispose();
  }
});
test('no automatic mode requests; tool result and connection gate distinct user-triggered bridges', async t => {
  const f = fixture(t, 'dialogue');
  await f.view.start(); await f.click();
  assert.equal(f.calls.filter(([type]) => type === 'mode').length, 0);
  assert.equal(f.dom.window.document.getElementById('pip').disabled, true);
  f.ready();
  assert.equal(f.dom.window.document.getElementById('pip-compat').disabled, true);
  let compatibilityCalls = 0;
  f.dom.window.openai = {displayMode:'inline', requestDisplayMode({mode}) {
    assert.equal(mode, 'pip'); compatibilityCalls++; return undefined;
  }};
  f.dom.window.dispatchEvent(new f.dom.window.Event('openai:set_globals'));
  await f.click();
  assert.equal(compatibilityCalls, 0, 'no implicit fallback');
  await f.click('pip-compat');
  assert.equal(compatibilityCalls, 1);
  assert.equal(f.calls.filter(([type]) => type === 'mode').length, 1);
  f.dom.window.openai.displayMode = 'pip';
  f.dom.window.dispatchEvent(new f.dom.window.Event('openai:set_globals'));
  assert.equal(f.dom.window.document.getElementById('compat-mode').textContent, 'pip');
  const log = f.dom.window.document.getElementById('diagnostics').textContent;
  assert.match(log, /openai.globals-changed/);
  assert.match(log, /"responseType":"undefined"/);
  assert.doesNotMatch(log, /PRIVATE-HOST|PRIVATE-BODY/);
  f.view.dispose();
});
test('early tool result cannot request before connection; outstanding request cannot overlap or repaint after teardown', async t => {
  const f = fixture(t, 'dialogue'); f.ready(); await f.click();
  assert.equal(f.calls.length, 0);
  await f.view.start();
  let finish, calls = 0;
  f.app.requestDisplayMode = () => {calls++; return new Promise(resolve => {finish = resolve;});};
  await f.click(); await f.click();
  assert.equal(calls, 1);
  const before = f.dom.window.document.getElementById('request').textContent;
  f.view.dispose(); finish({mode:'pip'}); await new Promise(setImmediate);
  assert.equal(f.dom.window.document.getElementById('request').textContent, before);
  assert.equal(f.callbacks.size, 0);
});
test('pagehide during an outstanding read cannot restart polling or change the closed view', async t => {
  const f = fixture(t, 'dialogue'); f.app.hold = true; await f.view.start();
  f.dom.window.dispatchEvent(new f.dom.window.Event('pagehide')); f.finishPending();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(f.callbacks.size, 0);
  assert.equal(f.dom.window.document.getElementById('count').textContent, '');
});
test('real MCP exposes distinct immutable UI resources and only synthetic status', async t => {
  const client = new Client({name:'probe-test',version:'1'});
  const transport = new StdioClientTransport({command:process.execPath,args:['tools/experiments/pip-probe/server.mjs'],stderr:'pipe'});
  t.after(()=>client.close());
  await client.connect(transport);
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map(t=>t.name).sort(), ['pip_probe_open_dialogue','pip_probe_open_plan','pip_probe_status']);
  const uris = tools.filter(t=>t._meta?.ui?.resourceUri).map(t=>t._meta.ui.resourceUri);
  assert.equal(new Set(uris).size, 2);
  for (const uri of uris) {
    const resource = (await client.readResource({uri})).contents[0];
    assert.deepEqual(resource._meta['openai/ui'], uri.includes('/dialogue-') ? undefined
      : {availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'inline'});
    assert.match(resource.text, /Изолированный опыт/);
    const tool = tools.find(t=>t._meta?.ui?.resourceUri === uri);
    assert.deepEqual(tool._meta['openai/ui'], uri.includes('/dialogue-') ? undefined : {preferredModelDisplayMode:'inline'});
    const opened = await client.callTool({name:tool.name,arguments:{}});
    assert.equal(opened.isError, undefined);
    assert.equal(opened.structuredContent.probeVersion, '1.3.0');
  }
  const result = await client.callTool({name:'pip_probe_status',arguments:{}});
  assert.equal(result.structuredContent.synthetic, true);
  assert.deepEqual(Object.keys(result.structuredContent).sort(), ['instance','serverTime','synthetic','tick']);
});

test('packaged Python MCP exposes both passive probes beside the real panel without accessing backend state', async t => {
  const root = path.resolve(import.meta.dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-pip-'));
  t.after(() => fs.rm(temp, {recursive:true, force:true}));
  const toolsDir = path.join(temp, 'tools');
  await fs.mkdir(toolsDir);
  for (const file of ['plugin.py', 'pip_probe.py', 'plugin-ui.html', 'pip-probe-plan.html', 'pip-probe-dialogue.html']) {
    await fs.copyFile(path.join(root, 'tools/codex-app-server-mcp', file), path.join(toolsDir, file));
  }
  const state = path.join(temp, 'state');
  const client = new Client({name:'packaged-probe-test',version:'1'});
  const transport = new StdioClientTransport({
    command:path.join(root, '.harness/runtime/test-python/bin/python'),
    args:['-B', path.join(root,'tests/fixtures/plugin-server.py'),toolsDir,state], stderr:'pipe',
  });
  t.after(() => client.close());
  await client.connect(transport);
  const tools = (await client.listTools()).tools;
  assert.ok(tools.some(tool => tool.name === 'workflow_pilot_panel'));
  for (const kind of ['plan','dialogue']) {
    const tool = tools.find(tool => tool.name === `pip_probe_open_${kind}`);
    assert.equal(tool.annotations.readOnlyHint, true);
    const uri = tool._meta.ui.resourceUri;
    const resource = (await client.readResource({uri})).contents[0];
    assert.equal(uri, `ui://workflow-pilot-probe/${kind}-${createHash('sha256').update(resource.text).digest('hex')}.html`);
    assert.deepEqual(resource._meta['openai/ui'], kind === 'dialogue' ? undefined
      : {availableDisplayModes:['inline','fullscreen'],preferredDisplayMode:'inline'});
    assert.deepEqual(tool._meta['openai/ui'], kind === 'dialogue' ? undefined : {preferredModelDisplayMode:'inline'});
    if (kind === 'dialogue') assert.match(resource.text, /Опыт 0.5.16: PiP по кнопке/);
    const opened = await client.callTool({name:tool.name,arguments:{}});
    assert.equal(opened.isError, false);
    assert.deepEqual(opened.structuredContent, {synthetic:true, kind, probeVersion:'1.3.0'});
    await fs.writeFile(path.join(toolsDir,`pip-probe-${kind}.html`), 'changed on disk');
    assert.equal((await client.readResource({uri})).contents[0].text, resource.text);
  }
  const status = tools.find(tool=>tool.name === 'pip_probe_status');
  assert.deepEqual(status._meta.ui.visibility, ['app']);
  const result = await client.callTool({name:status.name,arguments:{}});
  assert.equal(result.structuredContent.synthetic,true);
  assert.deepEqual(Object.keys(result.structuredContent).sort(), ['instance','serverTime','synthetic','tick']);
  await assert.rejects(fs.access(state), {code:'ENOENT'});
});
