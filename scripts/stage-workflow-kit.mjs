import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRuntimeRoot } from '@webpilot/workflow-kit';
import { PROJECT_ROOT, runtimeFiles, runtimeDigest, workflowKitSource } from './check-workflow-kit-dependency.mjs';

export { PROJECT_ROOT };
export const DEFAULT_STAGE = path.join(PROJECT_ROOT, 'resources/workflow-kit');

// A prepared or packaged runtime is correct when it is the package source of this repository, file for file.
export async function verifyWorkflowKitRuntime(root, source = null) {
  root = path.resolve(root);
  source ??= await workflowKitSource();
  const files = await runtimeFiles(root);
  assert.deepEqual(files, source.files, 'Workflow Kit runtime fileset differs from packages/workflow-kit/src');
  const sha256 = await runtimeDigest(root, files);
  assert.equal(sha256, source.sha256, 'Workflow Kit runtime differs from packages/workflow-kit/src');
  return { root, version: source.version, files: files.length, sha256 };
}

async function matchesSource(target, source) {
  try { await verifyWorkflowKitRuntime(target, source); return true; } catch { return false; }
}

export async function stageWorkflowKit({ root = PROJECT_ROOT, target = path.join(root, 'resources/workflow-kit') } = {}) {
  root = path.resolve(root);
  target = path.resolve(target);
  const source = await workflowKitSource();
  const canonicalRoot = await fs.realpath(getRuntimeRoot());
  assert.equal(canonicalRoot, await fs.realpath(source.root), 'Workflow Kit dependency does not resolve to packages/workflow-kit');
  const canonical = { root: canonicalRoot, version: source.version, files: source.files.length, sha256: source.sha256 };
  if (await matchesSource(target, source)) return { ...canonical, target, changed: false };

  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = target + '.stage-' + process.pid + '-' + Date.now();
  await fs.rm(temporary, { recursive: true, force: true });
  try {
    await fs.cp(canonicalRoot, temporary, { recursive: true });
    await verifyWorkflowKitRuntime(temporary, source);
    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
  const staged = await verifyWorkflowKitRuntime(target, source);
  return { ...staged, target, changed: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  stageWorkflowKit().then(result => process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 2) + '\n'))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
