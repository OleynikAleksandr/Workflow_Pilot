import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { VERSION, getRuntimeRoot } from '@webpilot/workflow-kit';
import { DEFAULT_STAGE, verifyWorkflowKitRuntime } from '../scripts/stage-workflow-kit.mjs';
import { verifyWorkflowKitDependency, workflowKitSource } from '../scripts/check-workflow-kit-dependency.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const packageRoot = path.join(projectRoot, 'packages/workflow-kit');

test('real project recovery has 20 percent reserve before and after plan normalization', () => {
  const output=execFileSync(process.execPath,[path.join(packageRoot,'scripts/check-project-recovery-fixture.mjs')],
    {cwd:projectRoot,encoding:'utf8',maxBuffer:1024*1024});
  const result=JSON.parse(output);
  assert.equal(result.ok,true);
  assert.equal(result.realProjectRecovery.length,2);
});

async function snapshot(root) {
  root = path.resolve(root);
  const files = (await fs.readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
  const contents = new Map();
  for (const file of files) contents.set(file, (await fs.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n'));
  return { files, contents };
}

function digestSnapshot(value) {
  const digest = createHash('sha256');
  for (const file of value.files) digest.update(file + '\0' + value.contents.get(file) + '\0');
  return digest.digest('hex');
}

test('Workflow Kit is the package of this repository, not a neighbouring checkout', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.name, '@webpilot/workflow-kit');
  assert.equal(VERSION, pkg.version);
  assert.equal(await fs.realpath(path.join(projectRoot, 'node_modules/@webpilot/workflow-kit')), await fs.realpath(packageRoot));
  assert.equal(await fs.realpath(getRuntimeRoot()), await fs.realpath(path.join(packageRoot, 'src')));
  const root = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  assert.equal(root.dependencies['@webpilot/workflow-kit'], 'file:packages/workflow-kit');
  const lock = JSON.parse(await fs.readFile(path.join(projectRoot, 'package-lock.json'), 'utf8'));
  assert.equal(lock.version, root.version);
  assert.equal(lock.packages[''].version, root.version);
  assert.equal(lock.packages['packages/workflow-kit'].version, pkg.version);

  const canonical = await snapshot(getRuntimeRoot());
  assert.ok(canonical.contents.get('lib/common.mjs').includes(`VERSION = '${pkg.version}'`), 'package.json and lib/common.mjs name one version');
  const verified = await verifyWorkflowKitDependency();
  assert.equal(verified.version, pkg.version);
  assert.equal(verified.files, canonical.files.length);
  assert.equal(verified.sha256, digestSnapshot(canonical));

  for (const subpath of ['actions', 'plan', 'session-plans', 'recovery', 'installer', 'installation-files', 'common']) {
    const module = await import('@webpilot/workflow-kit/lib/' + subpath);
    assert.ok(Object.keys(module).length > 0, 'empty package export: ' + subpath);
  }
});

test('the package carries no management files of the former repository', async () => {
  for (const name of ['.harness', '.codex', 'AGENTS.md', 'scripts/workflow', 'scripts/workflow.cmd', 'scripts/workflow.mjs'])
    await assert.rejects(fs.access(path.join(packageRoot, name)), { code: 'ENOENT' }, name);
});

test('build and check scripts do not reach outside this repository for Workflow Kit', async () => {
  for (const file of ['package.json', 'package-lock.json', 'scripts/stage-workflow-kit.mjs', 'scripts/check-workflow-kit-dependency.mjs',
    'scripts/check-workflow-kit-staging.mjs', 'scripts/release-all.mjs', 'scripts/verify-windows-package.mjs', 'scripts/check-installed-release.mjs'])
    assert.doesNotMatch(await fs.readFile(path.join(projectRoot, file), 'utf8'), /\.\.\/WorkflowKit/, file);
});

test('generated Workflow Kit runtime staging matches the package source', async () => {
  const source = await workflowKitSource();
  const canonical = await snapshot(getRuntimeRoot());
  const staged = await snapshot(DEFAULT_STAGE);
  assert.deepEqual(staged.files, canonical.files);
  assert.equal(digestSnapshot(staged), digestSnapshot(canonical));
  const verified = await verifyWorkflowKitRuntime(DEFAULT_STAGE);
  assert.deepEqual({ version: verified.version, files: verified.files, sha256: verified.sha256 },
    { version: source.version, files: source.files.length, sha256: source.sha256 });
});

test('a runtime that differs from the package source is refused', async () => {
  const temporary = await fs.mkdtemp(path.join(projectRoot, '.harness/runtime/kit-runtime-'));
  try {
    await fs.cp(getRuntimeRoot(), temporary, { recursive: true });
    await verifyWorkflowKitRuntime(temporary);
    await fs.appendFile(path.join(temporary, 'lib/common.mjs'), '\n// drift\n');
    await assert.rejects(verifyWorkflowKitRuntime(temporary), /differs from packages\/workflow-kit\/src/);
    await fs.writeFile(path.join(temporary, 'extra.mjs'), '');
    await assert.rejects(verifyWorkflowKitRuntime(temporary), /fileset differs/);
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
});

test('installed Workflow Kit of this repository stays a complete separate installation', async () => {
  const installed = await snapshot(path.join(projectRoot, '.harness/kit'));
  assert.ok(installed.files.includes('lib/common.mjs') && installed.files.includes('install.mjs'));
  assert.match(installed.contents.get('lib/common.mjs'), /VERSION = '\d+\.\d+\.\d+'/);
});
