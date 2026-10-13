import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exists, sha256File, appendDiagnostic, diagnosticFiles } from '../src/common.mjs';

test('file probes preserve strict cleanup errors and streamed hashes reject missing files', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-common-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'file'), missing = path.join(root, 'missing');
  await fs.writeFile(file, 'abc');
  assert.equal(await sha256File(file), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await assert.rejects(sha256File(missing), { code: 'ENOENT' });
  for (const strict of [false, true]) {
    assert.equal(await exists(file, { strict }), true);
    assert.equal(await exists(missing, { strict }), false);
  }
  const invalid = path.join(file, 'child');
  assert.equal(await exists(invalid), false);
  await assert.rejects(exists(invalid, { strict: true }), { code: 'ENOTDIR' });
});

test('the phase journal rotates to one previous file instead of growing without limit', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-diagnostics-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'diagnostics.jsonl'), line = JSON.stringify({ phase: 'x'.repeat(40) }) + '\n';
  for (let i = 0; i < 10; i++) await appendDiagnostic(file, line, 200);
  const sizes = await Promise.all(diagnosticFiles(file).map(name => fs.stat(name).then(stat => stat.size)));
  assert.ok(sizes.every(size => size <= 200), JSON.stringify(sizes));
  assert.deepEqual(diagnosticFiles(file), [file, file + '.1']);
  assert.equal((await fs.readFile(file, 'utf8')).split('\n').filter(Boolean).every(entry => JSON.parse(entry).phase), true);
});
