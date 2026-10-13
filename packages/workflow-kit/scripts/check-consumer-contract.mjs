import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_VERSION = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8')).version;
const REQUIRED_SUBPATHS = [
  'common',
  'actions',
  'session-plans',
  'plan',
  'transaction',
  'installer',
  'inspection-inputs',
  'installation-files',
  'git'
];

function run(executable, args, cwd) {
  return execFileSync(executable, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' },
  }).trim();
}

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
  await fs.cp(path.join(ROOT, 'src'), path.join(destination, 'src'), { recursive: true });
}

function consumerProbe(cwd) {
  const code = `
    import fs from 'node:fs';
    import path from 'node:path';
    import { VERSION, getRuntimeRoot, currentPlanView, sessionPlanView } from '@webpilot/workflow-kit';
    const required = ${JSON.stringify(REQUIRED_SUBPATHS)};
    const imported = [];
    for (const name of required) {
      const module = await import('@webpilot/workflow-kit/lib/' + name);
      if (!Object.keys(module).length) throw new Error('Empty module ' + name);
      imported.push(name);
    }
    const runtimeRoot = getRuntimeRoot();
    if (!fs.existsSync(path.join(runtimeRoot, 'WORKFLOW.md'))) throw new Error('Runtime root has no WORKFLOW.md');
    if (typeof currentPlanView !== 'function' || typeof sessionPlanView !== 'function') throw new Error('Missing single-active consumer facade');
    process.stdout.write(JSON.stringify({ version: VERSION, runtimeRoot, imported, currentPlanView: true, sessionPlanView: true }));
  `;
  return JSON.parse(run(process.execPath, ['--input-type=module', '-e', code], cwd));
}

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-consumer-'));
try {
  const packageSource = path.join(temp, 'package-source');
  await copyPackageSnapshot(packageSource);
  const sourceRuntime = path.join(packageSource, 'src');
  const sourceRuntimeFiles = await filesBelow(sourceRuntime);
  const expectedRuntimeSha256 = await digestFiles(sourceRuntime, sourceRuntimeFiles);

  const dev = path.join(temp, 'dev-consumer');
  await fs.mkdir(dev, { recursive: true });
  await fs.writeFile(path.join(dev, 'package.json'), JSON.stringify({ name: 'dev-consumer', private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', 'file:' + packageSource], dev);
  const devProbe = consumerProbe(dev);
  assert.equal(devProbe.version, EXPECTED_VERSION);
  assert.deepEqual(devProbe.imported, REQUIRED_SUBPATHS);

  const tarballs = path.join(temp, 'tarballs');
  await fs.mkdir(tarballs);
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', tarballs], packageSource))[0];
  const tarball = path.join(tarballs, packed.filename);
  const packaged = path.join(temp, 'packaged-consumer');
  await fs.mkdir(packaged);
  await fs.writeFile(path.join(packaged, 'package.json'), JSON.stringify({ name: 'packaged-consumer', private: true, type: 'module' }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], packaged);
  const packagedProbe = consumerProbe(packaged);
  assert.equal(packagedProbe.version, EXPECTED_VERSION);
  const packagedRuntimeReal = await fs.realpath(packagedProbe.runtimeRoot);
  const sourceRuntimeReal = await fs.realpath(path.join(packageSource, 'src'));
  assert.notEqual(packagedRuntimeReal, sourceRuntimeReal,
    'packed consumer unexpectedly depends on package source directory');
  assert.ok(packagedProbe.runtimeRoot.includes(path.sep + 'node_modules' + path.sep),
    'packed consumer runtime is not installed under node_modules');

  const staged = path.join(temp, 'electron-resources', 'workflow-kit');
  await fs.mkdir(path.dirname(staged), { recursive: true });
  await fs.cp(packagedProbe.runtimeRoot, staged, { recursive: true });
  const stagedFiles = await filesBelow(staged);
  assert.deepEqual(stagedFiles, sourceRuntimeFiles);
  assert.equal(await digestFiles(staged, stagedFiles), expectedRuntimeSha256);

  process.stdout.write(JSON.stringify({
    ok: true,
    version: EXPECTED_VERSION,
    localFileDependency: true,
    packedConsumerStandalone: true,
    requiredSubpaths: REQUIRED_SUBPATHS,
    stagedRuntimeFiles: stagedFiles.length,
    stagedRuntimeSha256: expectedRuntimeSha256
  }, null, 2) + '\n');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}