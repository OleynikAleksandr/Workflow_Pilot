import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VERSION, getRuntimeRoot } from '@webpilot/workflow-kit';

export const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
// Workflow Kit lives in this repository: its runtime is compared with the package source, not with pinned numbers.
export const WORKFLOW_KIT_PACKAGE = path.join(PROJECT_ROOT, 'packages/workflow-kit');

export async function runtimeFiles(root = getRuntimeRoot()) {
  root = path.resolve(root);
  return (await fs.readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

export async function runtimeDigest(root = getRuntimeRoot(), files = null) {
  files ??= await runtimeFiles(root);
  const digest = createHash('sha256');
  for (const file of files) {
    const text = (await fs.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    digest.update(file + '\0' + text + '\0');
  }
  return digest.digest('hex');
}

export async function workflowKitSource() {
  const pkg = JSON.parse(await fs.readFile(path.join(WORKFLOW_KIT_PACKAGE, 'package.json'), 'utf8'));
  const root = path.join(WORKFLOW_KIT_PACKAGE, 'src');
  const files = await runtimeFiles(root);
  assert.ok(files.includes('cli.mjs') && files.includes('lib/common.mjs') && files.includes('WORKFLOW.md'), 'Workflow Kit package source is incomplete');
  const common = await fs.readFile(path.join(root, 'lib/common.mjs'), 'utf8');
  assert.ok(common.includes(`VERSION = '${pkg.version}'`), 'Workflow Kit package.json and lib/common.mjs name different versions');
  return { root, name: pkg.name, version: pkg.version, files, sha256: await runtimeDigest(root, files) };
}

export async function verifyWorkflowKitDependency() {
  const source = await workflowKitSource();
  assert.equal(source.name, '@webpilot/workflow-kit');
  assert.equal(VERSION, source.version, 'imported Workflow Kit is not the package of this repository');
  const resolved = await fs.realpath(path.join(PROJECT_ROOT, 'node_modules/@webpilot/workflow-kit'));
  assert.equal(resolved, await fs.realpath(WORKFLOW_KIT_PACKAGE), 'development dependency does not resolve to packages/workflow-kit');
  assert.equal(await fs.realpath(getRuntimeRoot()), await fs.realpath(source.root), 'Workflow Kit runtime root is not the package source');

  for (const subpath of ['actions', 'plan', 'session-plans', 'recovery', 'installer', 'inspection-inputs', 'installation-files', 'git', 'transaction', 'validate', 'common']) {
    const module = await import('@webpilot/workflow-kit/lib/' + subpath);
    assert.ok(Object.keys(module).length > 0, 'empty package export: ' + subpath);
  }
  return { version: source.version, files: source.files.length, sha256: source.sha256, runtime: getRuntimeRoot() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyWorkflowKitDependency().then(result => process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 2) + '\n'))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
