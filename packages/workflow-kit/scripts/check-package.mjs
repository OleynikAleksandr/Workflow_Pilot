import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

async function filesBelow(directory, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) result.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

async function digestFiles(root, files) {
  const digest = createHash('sha256');
  for (const file of files) {
    const text = (await fs.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    digest.update(file + '\0' + text + '\0');
  }
  return digest.digest('hex');
}

async function copyPackageSnapshot(destination) {
  await fs.mkdir(destination, { recursive: true });
  await fs.copyFile(path.join(ROOT, 'package.json'), path.join(destination, 'package.json'));
  await fs.copyFile(path.join(ROOT, 'index.mjs'), path.join(destination, 'index.mjs'));
  await fs.cp(SRC, path.join(destination, 'src'), { recursive: true });
}

const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@webpilot/workflow-kit');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(pkg.type, 'module');
assert.equal(pkg.main, './index.mjs');
assert.equal(pkg.bin?.workflow, './src/cli.mjs');
assert.equal(pkg.engines?.node, '>=22');
assert.deepEqual(pkg.files, ['index.mjs', 'src/']);

const sourceFiles = await filesBelow(SRC);
for (const required of ['WORKFLOW.md', 'cli.mjs', 'install.mjs', 'lib/common.mjs', 'schemas/plan.schema.json', 'templates/PLAN.md'])
  assert.ok(sourceFiles.includes(required), 'package source misses ' + required);
const sourceSha256 = await digestFiles(SRC, sourceFiles);
// One version in two places: package.json and the runtime constant that installed copies report.
assert.ok((await fs.readFile(path.join(SRC, 'lib/common.mjs'), 'utf8')).includes(`VERSION = '${pkg.version}'`),
  'package.json and src/lib/common.mjs name different versions');

const api = await import('@webpilot/workflow-kit');
assert.equal(api.VERSION, pkg.version);
assert.equal(typeof api.actions.status, 'function');
assert.equal(typeof api.plan.readPlan, 'function');
assert.equal(typeof api.sessionPlans.sessionPlanView, 'function');
assert.equal(typeof api.currentPlanView, 'function');
assert.equal(typeof api.sessionPlanView, 'function');
assert.equal(typeof api.recovery.contextPacket, 'function');
assert.equal(typeof api.installer.install, 'function');
assert.equal(typeof api.getRuntimeRoot, 'function');

for (const subpath of ['actions', 'plan', 'session-plans', 'recovery', 'installer', 'installation-files', 'common']) {
  const module = await import('@webpilot/workflow-kit/lib/' + subpath);
  assert.ok(Object.keys(module).length > 0, 'empty export: ' + subpath);
}

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-pack-check-'));
try {
  const snapshot = path.join(temp, 'package');
  await copyPackageSnapshot(snapshot);
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: snapshot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }))[0];
  const packedFiles = new Set(packed.files.map(entry => entry.path));
  for (const required of ['package.json', 'index.mjs', 'src/WORKFLOW.md', 'src/cli.mjs', 'src/lib/common.mjs', 'src/schemas/plan.schema.json', 'src/templates/PLAN.md']) {
    assert.ok(packedFiles.has(required), 'package missing ' + required);
  }
  for (const file of packedFiles) {
    assert.ok(!file.startsWith('.harness/'), 'runtime state leaked into package: ' + file);
    assert.ok(!file.startsWith('.git/'), 'Git internals leaked into package: ' + file);
    assert.ok(!file.startsWith('docs/'), 'project docs leaked into package: ' + file);
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    name: pkg.name,
    version: pkg.version,
    canonicalFiles: sourceFiles.length,
    canonicalSha256: sourceSha256,
    packageFiles: packed.files.length,
    exports: Object.keys(pkg.exports),
  }, null, 2) + '\n');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}