import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkCodexTools } from '../scripts/check-codex-tools.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const files = [
  'codex-rs/core/src/tools/handlers/shell_spec.rs',
  'codex-rs/core/src/tools/handlers/view_image_spec.rs',
  'codex-rs/core/assets/tools/apply_patch.lark',
];
const bodies = new Map(files.map((file, index) => [file, Buffer.from('definition-' + index)]));

async function fixtureLock(root, overrides = {}) {
  const lock = {
    schema_version: 1,
    repository: 'openai/codex',
    codex_version: '1.2.3',
    tag: 'rust-v1.2.3',
    files: files.map(file => ({ path: file, sha256: sha(bodies.get(file)) })),
    ...overrides,
  };
  const lockPath = path.join(root, 'codex-tools.lock.json');
  await writeFile(lockPath, JSON.stringify(lock));
  return lockPath;
}

function fetchFrom(map = bodies) {
  return async url => {
    const file = files.find(candidate => url.endsWith('/' + candidate));
    return file ? new Response(map.get(file), { status: 200 }) : new Response('', { status: 404 });
  };
}

test('Codex tool lock check distinguishes match and source mismatch by filename', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'codex-tools-check-'));
  try {
    const lockPath = await fixtureLock(root);
    const common = { lockPath, versionProvider: async () => '1.2.3' };
    const matched = await checkCodexTools({ ...common, fetchImpl: fetchFrom() });
    assert.equal(matched.exitCode, 0);
    assert.equal(matched.ok, true);
    assert.deepEqual(matched.changed, []);

    const changedBodies = new Map(bodies);
    changedBodies.set(files[1], Buffer.from('changed'));
    const changed = await checkCodexTools({ ...common, fetchImpl: fetchFrom(changedBodies) });
    assert.equal(changed.exitCode, 1);
    assert.deepEqual(changed.changed, [files[1]]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Codex tool lock check reports installed-version drift, network failure and missing tag', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'codex-tools-check-'));
  try {
    const lockPath = await fixtureLock(root);
    const drift = await checkCodexTools({
      lockPath,
      versionProvider: async () => '1.2.4',
      fetchImpl: fetchFrom(),
    });
    assert.equal(drift.exitCode, 1);
    assert.deepEqual(drift.changed.slice(0, 2), ['tag', 'codex_version']);

    const offline = await checkCodexTools({
      lockPath,
      versionProvider: async () => '1.2.3',
      fetchImpl: async () => { throw new Error('offline'); },
    });
    assert.equal(offline.exitCode, 2);
    assert.match(offline.reason, /Network error.*offline/);

    const missing = await checkCodexTools({
      lockPath,
      versionProvider: async () => '1.2.3',
      fetchImpl: async () => new Response('', { status: 404 }),
    });
    assert.equal(missing.exitCode, 2);
    assert.match(missing.reason, /tag\/source unavailable.*HTTP 404/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Codex tool lock check rejects a damaged lock file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'codex-tools-check-'));
  try {
    const lockPath = path.join(root, 'codex-tools.lock.json');
    await writeFile(lockPath, '{broken');
    await assert.rejects(
      checkCodexTools({ lockPath, versionProvider: async () => '1.2.3', fetchImpl: fetchFrom() }),
      error => error.exitCode === 1 && /invalid JSON/.test(error.message),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
