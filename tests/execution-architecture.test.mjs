import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { executeFile } from '../src/execution/commands/service.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
test('architecture gate rejects a real Execution to Control import and a new cycle', { timeout: 30000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-pilot-boundary-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const name of ['execution', 'control', 'contracts','backend','frontend/client']) await fs.mkdir(path.join(directory, 'src', name), { recursive: true });
  const write = (name, text) => fs.writeFile(path.join(directory, 'src', name), text);
  await write('control/private.mjs', 'export const state = {};');
  await write('execution/a.mjs', "import '../control/private.mjs';");
  const check = () => executeFile(process.execPath,
    [path.join(root, 'node_modules/dependency-cruiser/bin/dependency-cruiser.mjs'), '--config', path.join(root, '.dependency-cruiser.cjs'), '--output-type', 'err-long', 'src'],
    { cwd: directory, timeout: 15000 });
  await assert.rejects(check(), error => error.code === 1 && /execution-does-not-import-product/.test(error.stdout + error.stderr));
  await write('execution/a.mjs', "import './b.mjs';");
  await write('execution/b.mjs', "import './a.mjs';");
  await assert.rejects(check(), error => error.code === 1 && /no-new-cycles/.test(error.stdout + error.stderr));
  await write('execution/b.mjs', 'export const independent = true;');
  await check();
  await write('control/session-runtime.mjs', "import '../execution/a.mjs';");
  await assert.rejects(check(), error => error.code === 1 && /control-uses-execution-facade/.test(error.stdout + error.stderr));
  await write('control/session-runtime.mjs', 'export const migrated = true;');
  await write('control/private.mjs', "import fs from 'node:fs/promises'; export const read = fs.readFile;");
  await assert.rejects(check(), error => error.code === 1 && /control-does-not-perform-physical-io/.test(error.stdout + error.stderr));
  await write('control/private.mjs', 'export const state = {};');
  await write('main.mjs', "import './control/private.mjs';");
  await assert.rejects(check(), error => error.code === 1 && /main-only-starts-desktop/.test(error.stdout + error.stderr));
  await write('auto-plan.mjs', 'export const legacy = true;');
  await write('main.mjs', "import './auto-plan.mjs';");
  await assert.rejects(check(), error => error.code === 1 && /main-only-starts-desktop/.test(error.stdout + error.stderr));
  await write('main.mjs','export const entry = true;');
  await write('backend/a.mjs',"import '../control/private.mjs';");
  await assert.rejects(check(), error => error.code === 1 && /backend-uses-product-facades/.test(error.stdout + error.stderr));
  await write('backend/a.mjs','export const backend = true;');
  await write('frontend/client/a.mjs',"import '../../control/private.mjs';");
  await assert.rejects(check(), error => error.code !== 0 && /network-client-is-unprivileged/.test(error.stdout + error.stderr));
  await write('frontend/client/a.mjs','export const client = true;');
  await check();
});
