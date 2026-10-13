import { TUNNEL_ID_PATTERN } from '../src/tunnel-setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CodexAppServerRuntime } from '../src/mac-runtime-switch.mjs';
const identity = 'tunnel_fixture1234567890123456';
for (const platform of ['mac', 'windows']) test(`${platform}: ID dialog facade validates non-secret output and sanitizes failures`, async t => {
  let output = { tunnel_id: identity }, failure;
  const calls = [];
  const execute = async (file, args, options) => {
    calls.push({ file, args, options });
    assert.equal(args.at(-1), '--tunnel-id');
    assert.doesNotMatch(JSON.stringify({ args, options }), /sk-fixture|tunnel_fixture/);
    if (failure) throw failure;
    return { stdout: JSON.stringify(output) };
  };
  const executeInput = async () => { throw new Error('ID dialog must not pass credentials'); };
  // The same executor runtime on both systems; Windows only adds its components step, which is not this test.
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-id-runtime-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const executor = new CodexAppServerRuntime({ sourceDir: fileURLToPath(new URL('../tools/codex-app-server-mcp', import.meta.url)),
    platform: platform === 'mac' ? 'darwin' : 'win32',
    stateDir: path.join(root, 'state'), sessionPlans: { loadContext() {} }, environment: {}, execute, executeInput });
  const invoke = () => executor.promptTunnelId();
  assert.deepEqual(await invoke(), { tunnelId: identity });
  output = { cancelled: true }; assert.deepEqual(await invoke(), { cancelled: true });
  for (const result of [{ configured: true }, { tunnel_id: 'sk-fixture-private' }, { tunnel_id: null }]) {
    output = result;
    await assert.rejects(invoke(), error => !error.message.includes('sk-fixture'));
  }
  failure = { stderr: JSON.stringify({ ok: false, code: platform.toUpperCase() + '_TUNNEL_ID_INVALID' }) };
  await assert.rejects(invoke(), error => /полный ID туннеля/.test(error.publicMessage));
  failure = { stderr: 'sk-fixture-private' };
  await assert.rejects(invoke(), error => !error.message.includes('sk-fixture'));
  assert.equal(calls.length, 7);
});

test('tunnel ID grammar matches every standalone Python runtime', async () => {
  const files = [
    'resources/runtime-control/windows-control.py',
    'tools/codex-app-server-mcp/control.py',
    'tools/codex-app-server-mcp/tunnel_prompt.py',
  ];
  for (const file of files) {
    const source = await fs.readFile(new URL('../' + file, import.meta.url), 'utf8');
    const patterns = [...source.matchAll(/re\.fullmatch\(r(['"])(tunnel_[^'"]+)\1,/g)];
    assert.ok(patterns.length, 'Missing tunnel ID validator in ' + file);
    for (const match of patterns) assert.equal('^' + match[2] + '$', TUNNEL_ID_PATTERN.source, file);
  }
  for (const size of [16, 100]) assert.equal(TUNNEL_ID_PATTERN.test('tunnel_' + 'a'.repeat(size)), true);
  for (const value of ['tunnel_' + 'a'.repeat(15), 'tunnel_' + 'a'.repeat(101), 'tunnel_' + 'a'.repeat(16) + '!', 'wrong_' + 'a'.repeat(16)])
    assert.equal(TUNNEL_ID_PATTERN.test(value), false);
});
