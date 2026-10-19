import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {client} from './fixtures/plugin-host.mjs';
import {panelContract,verifyPluginResource} from '../scripts/check-plugin-resource.mjs';

const root=path.resolve(import.meta.dirname,'..');
const hash=text=>createHash('sha256').update(text).digest('hex');
const uri=async c=>(await c.listTools()).tools.find(t=>t.name==='workflow_pilot_panel')._meta.ui.resourceUri;
test('an MCP resource snapshot is immutable; HTML, CSS and JS changes each get a new catalogue URI',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pilot-panel-upgrade-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const sourceDir=path.join(directory,'source');await fs.mkdir(sourceDir);
  await fs.copyFile(path.join(root,'tools/codex-app-server-mcp/plugin.py'),path.join(sourceDir,'plugin.py'));
  const file=path.join(sourceDir,'plugin-ui.html'),original=await fs.readFile(path.join(root,'tools/codex-app-server-mcp/plugin-ui.html'),'utf8');
  await fs.writeFile(file,original);
  const first=await client(t,{directory},{sourceDir}),firstUri=await uri(first);
  assert.equal(firstUri,`ui://workflow-pilot/panel-${hash(original)}.html`);
  const uris=new Set([firstUri]);
  for(const [kind,changed] of [
    ['HTML',original.replace('<title>','<title>new HTML ')],
    ['CSS',original.replace('</style>','body { --upgrade-test: 1; }</style>')],
    ['JS',original.replace('</script>',';globalThis.upgradeTest=1;</script>')],
  ]) {
    assert.notEqual(changed,original);await fs.writeFile(file,changed);
    assert.equal((await first.readResource({uri:firstUri})).contents[0].text,original,`${kind}: running MCP retains its advertised bytes`);
    assert.equal(await uri(first),firstUri);
    const next=await client(t,{directory},{sourceDir}),nextUri=await uri(next);
    assert.equal(nextUri,`ui://workflow-pilot/panel-${hash(changed)}.html`);
    assert.equal(uris.has(nextUri),false);uris.add(nextUri);
    assert.equal((await next.readResource({uri:nextUri})).contents[0].text,changed);
    await assert.rejects(next.readResource({uri:firstUri}),'unknown historical hashes must not alias current HTML');
    await next.close();
  }
});

test('the release guard validates the actual staged HTML, wire contract, visible build and compiled script',async()=>{
  const html=await fs.readFile(path.join(root,'tools/codex-app-server-mcp/plugin-ui.html'),'utf8');
  const contract=panelContract(await fs.readFile(path.join(root,'src/contracts/backend.mjs'),'utf8'));
  const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const input={html,version,...contract},proof=verifyPluginResource(input);
  assert.equal(proof.uri,`ui://workflow-pilot/panel-${hash(html)}.html`);
  for(const changed of [
    html.replace('name="workflow-pilot-build"','name="missing-build"'),
    html.replace('name="workflow-pilot-protocol" content="2"','name="workflow-pilot-protocol" content="1"'),
    html.replace(`<small id="communication-build">${contract.build}`,`<small id="communication-build">0.5.2-communication-1`),
    html.replace(/<script>[\s\S]*?<\/script>/,'<script>globalThis.oldPanel=true;</script>'),
  ])assert.throws(()=>verifyPluginResource({...input,html:changed}),/Panel|panel/);
  assert.throws(()=>verifyPluginResource({...input,version:'0.0.1'}),/version mismatch/);
  assert.throws(()=>verifyPluginResource({...input,protocol:999}),/build\/protocol mismatch/);
});
