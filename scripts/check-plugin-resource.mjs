import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
import {fileURLToPath} from 'node:url';

// Read literal wire constants from the packaged source without executing it.
export function panelContract(source) {
  const appVersion=source.match(/^export const COMMUNICATION_APP_VERSION = '([^']+)';$/m)?.[1];
  const build=source.match(/^export const COMMUNICATION_BUILD = '([^']+)';$/m)?.[1];
  const protocol=Number(source.match(/^export const COMMUNICATION_PROTOCOL = (\d+);$/m)?.[1]);
  assert.ok(appVersion&&build&&Number.isSafeInteger(protocol),'Panel contract is missing');
  return {appVersion,build,protocol};
}

export function verifyPluginResource({html,version,appVersion,build,protocol}) {
  assert.equal(appVersion,version,'Panel/application version mismatch');
  assert.equal(build,`${version}-communication-${protocol}`,'Panel build/protocol mismatch');
  for(const [name,value] of [['build',build],['protocol',String(protocol)]]) {
    const entries=[...html.matchAll(new RegExp(`<meta name="workflow-pilot-${name}" content="([^"]*)">`,'g'))];
    assert.equal(entries.length,1,`Panel ${name} metadata must occur once`);
    assert.equal(entries[0][1],value,`Panel ${name} metadata mismatch`);
  }
  assert.ok(html.includes(`<small id="communication-build">${build} · протокол ${protocol}</small>`),'Visible panel version mismatch');
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1,'Panel must contain one compiled script');
  new Script(scripts[0][1],{filename:'workflow-pilot-plugin.js'});
  assert.ok(scripts[0][1].includes(JSON.stringify(build)),'Compiled panel build mismatch');
  const sha256=createHash('sha256').update(html).digest('hex');
  return {uri:`ui://workflow-pilot/panel-${sha256}.html`,sha256,build,protocol};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=path.resolve(import.meta.dirname,'..');
  const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const html=await fs.readFile(path.join(root,'tools/codex-app-server-mcp/plugin-ui.html'),'utf8');
  const contract=panelContract(await fs.readFile(path.join(root,'src/contracts/backend.mjs'),'utf8'));
  console.log(JSON.stringify(verifyPluginResource({html,version,...contract}),null,2));
}
