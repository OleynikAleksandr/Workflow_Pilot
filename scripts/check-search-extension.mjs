import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { SEARCH_EXTENSION_PIN } from '../src/execution/browser/search-extension-pin.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
await fs.mkdir(path.join(root, '.harness/runtime'), { recursive: true });
const directory = await fs.mkdtemp(path.join(root, '.harness/runtime/search-extension-native-'));
const script = path.join(root, 'tests/fixtures/search-extension-electron.cjs');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
async function run(phase) {
  return new Promise((resolve, reject) => {
    const child = spawn(electron, [script, directory, phase], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', errors = ''; const timer = setTimeout(() => child.kill('SIGKILL'), 60000);
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { errors += chunk; });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', async code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('Extension fixture ' + phase + ' exit=' + code + ': ' + (errors + output).slice(-6000)));
      try { resolve(JSON.parse(await fs.readFile(path.join(directory, phase + '.json'), 'utf8'))); } catch (error) { reject(error); }
    });
  });
}
const cold = await run('cold'), offline = await run('offline');
await fs.writeFile(path.join(directory, 'cache', SEARCH_EXTENSION_PIN.version + '-' + SEARCH_EXTENSION_PIN.sha256.slice(0, 16), 'extension/content_script.js'), 'corrupted fixture');
const corrupt = await run('corrupt'), repair = await run('repair');
assert.equal(cold.requests, 1); assert.equal(cold.submissions, 1); assert.equal(cold.markerAtDocumentStart, '1');
assert.equal(offline.requests, 0); assert.equal(offline.submissions, 1); assert.equal(offline.markerAtDocumentStart, '1');
assert.equal(corrupt.loadBlocked, true); assert.equal(corrupt.submissions, 0);
assert.equal(repair.requests, 1); assert.equal(repair.submissions, 1);
const result = { ok: true, officialVersion: SEARCH_EXTENSION_PIN.version, cold, offline, corrupt, repair,
  realChatGPTTested: false, nativeWindowsTested: false, nativeLinuxTested: false };
await fs.writeFile(path.join(root, '.harness/runtime/search-extension-native-latest.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
