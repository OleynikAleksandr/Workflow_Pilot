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
  const dom = new JSDOM(['initial','actual','available','clock','tick','count','connection','request','pip']
    .map(id => `<button id="${id}"></button>`).join(''));
  t.after(() => dom.window.close());
  const callbacks = new Map(), calls = []; let n = 0, resolvePending;
  const app = {
    getHostContext: () => ({displayMode: 'inline', availableDisplayModes: ['inline','pip']}),
    addEventListener() {},
    async connect() {},
    async requestDisplayMode(args) { calls.push(['mode', args.mode]); if (mode === 'reject') throw Error(); return {mode}; },
    async callServerTool(args) {
      calls.push(['tool', args.name]);
      if (app.hold) return new Promise(resolve => { resolvePending = resolve; });
      return {structuredContent: {synthetic: true, tick: ++n, serverTime: 'test'}};
    },
  };
  const view = mountProbe({app, document: dom.window.document, kind,
    timers: {setTimeout(fn) { const id = ++n; callbacks.set(id, fn); return id; }, clearTimeout(id) { callbacks.delete(id); }}});
  return {app, view, dom, callbacks, calls,
    async tick() { const entry = callbacks.entries().next().value; if(entry) {callbacks.delete(entry[0]); await entry[1]();} },
    finishPending() { resolvePending({structuredContent: {synthetic: true, tick: 99, serverTime: 'late'}}); },
  };
}

test('closing passive PiP does not stop the independent plan viewer or issue agent commands', async t => {
  const plan = fixture(t, 'plan'), pip = fixture(t, 'dialogue');
  await plan.view.start(); await pip.view.start();
  assert.equal(pip.dom.window.document.getElementById('initial').textContent, 'inline');
  assert.equal(pip.dom.window.document.getElementById('actual').textContent, 'pip');
  assert.match(pip.dom.window.document.getElementById('request').textContent, /предоставил PiP/);
  await pip.app.onteardown();
  const before = plan.calls.length;
  await plan.tick();
  assert.ok(plan.calls.length > before);
  assert.equal(pip.callbacks.size, 0);
  assert.ok([...plan.calls,...pip.calls].every(([kind,name]) => kind === 'mode' || name === 'pip_probe_status'));
  plan.view.dispose();
});
test('alternative mode and host rejection are reported without pretending PiP succeeded', async t => {
  for (const mode of ['fullscreen','reject']) {
    const f = fixture(t, 'dialogue', mode); await f.view.start();
    assert.match(f.dom.window.document.getElementById('request').textContent, /не предоставлен|отклонил/);
    f.view.dispose();
  }
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
    assert.deepEqual(resource._meta['openai/ui'].availableDisplayModes,
      uri.includes('/dialogue-') ? ['inline','pip'] : ['inline','fullscreen']);
    assert.equal(resource._meta['openai/ui'].preferredDisplayMode, 'inline');
    assert.match(resource.text, /Изолированный опыт/);
    const tool = tools.find(t=>t._meta?.ui?.resourceUri === uri);
    assert.deepEqual(tool._meta['openai/ui'], {preferredModelDisplayMode:'inline'});
    assert.equal((await client.callTool({name:tool.name,arguments:{}})).isError, undefined);
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
    assert.equal(resource._meta['openai/ui'].preferredDisplayMode, 'inline');
    assert.deepEqual(resource._meta['openai/ui'].availableDisplayModes,
      kind === 'dialogue' ? ['inline','pip'] : ['inline','fullscreen']);
    assert.deepEqual(tool._meta['openai/ui'], {preferredModelDisplayMode:'inline'});
    assert.equal((await client.callTool({name:tool.name,arguments:{}})).isError, false);
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
