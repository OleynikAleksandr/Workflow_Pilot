import { sha256File } from '../src/common.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import * as windowsRuntime from '../src/windows-runtime.mjs';
import { WindowsExecutorBootstrap, WINDOWS_RUNTIME_SHA256, WINDOWS_VENDOR_TOOLS, retireLegacyWindowsRuntime, windowsCommandFailureText,
  windowsExecutorPaths, windowsWorkflowEnvironment } from '../src/windows-runtime.mjs';
import { ZipError, bufferReader, extractZip, zipEntries, zipEntryData } from '../src/zip-archive.mjs';
import zlib from 'node:zlib';
const execute = promisify(execFile);
const windowsControl = fileURLToPath(new URL('../resources/runtime-control/windows-control.py', import.meta.url));

import { BUNDLED_NODE_VERSION, defaultRuntimeFolder, legacyWindowsStateFolder } from '../src/platform.mjs';
import { WINDOWS_EXECUTOR_FILES, vendorTools } from '../scripts/verify-windows-package.mjs';
import { ensureWindowsRuntimePayload, extractionCommand, NODE_ARCHIVE, NODE_SHA256, WINDOWS_RUNTIME_URL, windowsRuntimeSourceCandidates, windowsToolchainPaths } from '../scripts/prepare-windows-toolchain.mjs';
import { createHash } from 'node:crypto';

// A ZIP writer for fixtures: entries are [name, content, { method, crc }]; a name ending with "/" is a folder.
function buildZip(files, { method = 8 } = {}) {
  const parts = [], directory = [];
  let offset = 0;
  for (const [name, content = '', options = {}] of files) {
    const data = Buffer.from(content), nameBytes = Buffer.from(name);
    const used = name.endsWith('/') ? 0 : options.method ?? method;
    const body = used === 8 ? zlib.deflateRawSync(data) : data;
    const crc = options.crc ?? zlib.crc32(data);
    const local = Buffer.alloc(30), entry = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(used, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8); entry.writeUInt16LE(used, 10);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    parts.push(local, nameBytes, body); directory.push(entry, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, central, end]);
}
const sha256 = data => createHash('sha256').update(data).digest('hex');
const present = file => fs.access(file).then(() => true, () => false);

// The shape of the pinned archive: a top folder, the old bridge, and vendor/ with a manifest and four inner archives.
function vendorArchive({ damage = null } = {}) {
  const inner = {
    uv: ['uv-x86_64-pc-windows-msvc.zip', 'uv.exe', buildZip([['uv.exe', 'UV'], ['uvx.exe', 'UVX']])],
    'tunnel-client': ['tunnel-client-v0.0.14-windows-amd64.zip', 'tunnel-client.exe', buildZip([['tunnel-client.exe', 'TUNNEL'], ['cloudflared.exe', 'CLOUDFLARED']])],
    ripgrep: ['ripgrep-15.2.0-x86_64-pc-windows-msvc.zip', 'ripgrep-15.2.0-x86_64-pc-windows-msvc/rg.exe',
      buildZip([['ripgrep-15.2.0-x86_64-pc-windows-msvc/'], ['ripgrep-15.2.0-x86_64-pc-windows-msvc/rg.exe', 'RG']])],
    git: ['MinGit-2.55.0.5-64-bit.zip', 'cmd/git.exe', buildZip([['cmd/git.exe', 'GIT'], ['usr/'], ['usr/bin/'], ['usr/bin/sh.exe', 'SH', { method: 0 }]])],
  };
  const tools = Object.entries(inner).map(([id, [file, executable, data]]) => ({ id, file, executable,
    sha256: damage === 'inner-sha' && id === 'ripgrep' ? '0'.repeat(64) : sha256(data) }));
  if (damage === 'no-git') tools.pop();
  if (damage === 'executable') tools[0].executable = 'missing.exe';
  const manifest = damage === 'manifest' ? '{broken' : JSON.stringify({ schema_version: damage === 'schema' ? 2 : 1, target: 'windows-x64', tools });
  return buildZip([
    ['Windows-Codex-Local/'], ['Windows-Codex-Local/mcp/bridge_mcp.py', 'print("the old bridge")'], ['Windows-Codex-Local/vendor/'],
    ['Windows-Codex-Local/vendor/manifest.json', manifest, { method: 8 }],
    ...Object.values(inner).map(([file, , data]) => ['Windows-Codex-Local/vendor/' + file, data]),
  ], { method: 0 });
}

test('ZIP reader: stored and deflated entries of a real archiver, UTF-8 names, CRC-32 and names that would leave the folder', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-zip-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const archive = path.join(dir, 'made-by-python.zip');
  await execute('python3', ['-c', `import sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w') as z:
    z.writestr(zipfile.ZipInfo('cmd/'), '')
    z.writestr('cmd/git.exe', b'GIT' * 5000, compress_type=zipfile.ZIP_DEFLATED)
    z.writestr('stored.bin', bytes(range(256)), compress_type=zipfile.ZIP_STORED)
    z.writestr('папка/файл.txt', 'привет', compress_type=zipfile.ZIP_DEFLATED)
    z.writestr('empty.txt', b'', compress_type=zipfile.ZIP_DEFLATED)
`, archive]);
  const buffer = await fs.readFile(archive);
  const entries = await zipEntries(bufferReader(buffer));
  assert.deepEqual(entries.map(entry => [entry.name, entry.method, entry.size, entry.directory]),
    [['cmd/', 0, 0, true], ['cmd/git.exe', 8, 15000, false], ['stored.bin', 0, 256, false], ['папка/файл.txt', 8, 12, false], ['empty.txt', 8, 0, false]]);
  const files = await extractZip(buffer, path.join(dir, 'out'));
  assert.deepEqual(files, ['cmd/git.exe', 'stored.bin', 'папка/файл.txt', 'empty.txt']);
  assert.equal((await fs.readFile(path.join(dir, 'out', 'cmd', 'git.exe'))).equals(Buffer.from('GIT'.repeat(5000))), true);
  assert.equal((await fs.readFile(path.join(dir, 'out', 'stored.bin'))).equals(Buffer.from(Array.from({ length: 256 }, (_, index) => index))), true);
  assert.equal(await fs.readFile(path.join(dir, 'out', 'папка', 'файл.txt'), 'utf8'), 'привет');
  assert.equal((await fs.stat(path.join(dir, 'out', 'empty.txt'))).size, 0);

  // The fixture writer and the reader agree with the real archiver.
  const own = buildZip([['a/'], ['a/b.txt', 'text'], ['c.bin', 'stored', { method: 0 }]]);
  await fs.writeFile(path.join(dir, 'own.zip'), own);
  await execute('python3', ['-c', 'import sys, zipfile; z = zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read("a/b.txt") == b"text"', path.join(dir, 'own.zip')]);

  const reader = bufferReader(buildZip([['bad.txt', 'content', { crc: 1 }]]));
  await assert.rejects(zipEntryData(reader, (await zipEntries(reader))[0]), error => error instanceof ZipError && /bad\.txt/.test(error.message));
  const longer = buildZip([['grows.txt', 'x'.repeat(100)]]);
  longer.writeUInt32LE(10, longer.length - 22 - 46 - 'grows.txt'.length + 24);
  const grown = bufferReader(longer);
  await assert.rejects(zipEntryData(grown, (await zipEntries(grown))[0]), ZipError, 'more data than the directory declares is refused');
  for (const name of ['../outside.txt', 'a/../../outside.txt', '/absolute.txt', 'C:/drive.txt', 'back\\slash.txt', 'a//b.txt', './dot.txt']) {
    await assert.rejects(extractZip(buildZip([[name, 'x']]), path.join(dir, 'unsafe')), error => error instanceof ZipError && /unsafe name/.test(error.message), name);
  }
  assert.equal(await present(path.join(dir, 'outside.txt')), false);
  await assert.rejects(zipEntries(bufferReader(Buffer.from('not a zip archive at all, only text'))), ZipError);
  await assert.rejects(zipEntries(bufferReader(Buffer.alloc(5))), ZipError);
  const zip64 = buildZip([['a.txt', 'x']]); zip64.writeUInt16LE(0xffff, zip64.length - 22 + 10);
  await assert.rejects(zipEntries(bufferReader(zip64)), /ZIP64/);
  const encrypted = buildZip([['a.txt', 'x']]); encrypted.writeUInt16LE(0x801, encrypted.length - 22 - 46 - 'a.txt'.length + 8);
  await assert.rejects(zipEntries(bufferReader(encrypted)), /Encrypted/);
});

test('Windows executor paths and state folders live in the local profile', () => {
  const state = defaultRuntimeFolder('C:\\Users\\Alex', 'win32', { LOCALAPPDATA: 'C:\\Users\\Alex\\AppData\\Local' });
  assert.equal(state, 'C:\\Users\\Alex\\AppData\\Local\\WorkflowPilotCodexExecutor');
  assert.equal(defaultRuntimeFolder('C:\\Users\\Alex', 'win32', {}), state, 'the usual location when LOCALAPPDATA is absent');
  assert.equal(legacyWindowsStateFolder({ LOCALAPPDATA: 'C:\\Users\\Alex\\AppData\\Local' }), 'C:\\Users\\Alex\\AppData\\Local\\CodexLocalWindows');
  assert.equal(legacyWindowsStateFolder({}), null);
  assert.deepEqual(windowsExecutorPaths(state, path.win32), {
    runtime: state + '\\runtime', tools: state + '\\runtime\\tools', marker: state + '\\runtime\\tools.json',
    staging: state + '\\runtime\\tools.staging', venv: state + '\\runtime\\venv', python: state + '\\runtime\\venv\\Scripts\\python.exe' });
  assert.deepEqual(WINDOWS_VENDOR_TOOLS, { uv: 'uv', 'tunnel-client': 'tunnel_client', ripgrep: 'rg', git: 'git' });
  assert.equal(windowsCommandFailureText({ stdout: 'Extracting...\nERROR: no network.\n', stderr: '' }), 'Extracting...\nERROR: no network.');
});

test('Windows components: the four vendor tools are verified and unpacked, the private Python is created once, the old bridge is left in the archive', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-win-components-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const payloadFile = path.join(root, 'payload.zip'), stateDir = path.join(root, 'Local', 'WorkflowPilotCodexExecutor');
  const archive = vendorArchive();
  await fs.writeFile(payloadFile, archive);
  const paths = windowsExecutorPaths(stateDir), phases = [], calls = [];
  let venv = 'create';
  const execute = async (file, args, options) => {
    calls.push({ file, args, options });
    if (args[0] === 'venv') {
      if (venv === 'fail') throw Object.assign(new Error('exit 2'), { stderr: 'error: failed to download Python' });
      if (venv === 'create') { await fs.mkdir(path.dirname(paths.python), { recursive: true }); await fs.writeFile(paths.python, 'python'); }
      return { stdout: '', stderr: '' };
    }
    if (args[0] === '--version') return { stdout: 'git version 2.55.0.windows.5\n', stderr: '' };
    throw new Error('unexpected command');
  };
  const create = (extra = {}) => new WindowsExecutorBootstrap({ payloadFile, stateDir, platform: 'win32', expectedSha256: sha256(archive),
    environment: { Path: 'C:\\Windows\\System32' }, execute, onState: state => phases.push(state.phase), ...extra });
  const bootstrap = create();
  assert.deepEqual(bootstrap.snapshot(), { phase: 'embedded', installed: false, toolsReady: false, error: null });
  assert.deepEqual(await bootstrap.inspect(), { phase: 'embedded', installed: false, toolsReady: false, error: null });
  await assert.rejects(bootstrap.workflowEnvironment(), { code: 'WINDOWS_RUNTIME_NOT_INSTALLED' });

  const [tools, shared] = await Promise.all([bootstrap.ensureTools(), bootstrap.ensureTools()]);
  assert.equal(tools, shared, 'concurrent callers share one unpacking');
  assert.deepEqual(tools, { uv: path.join(paths.tools, 'uv', 'uv.exe'), tunnel_client: path.join(paths.tools, 'tunnel-client', 'tunnel-client.exe'),
    rg: path.join(paths.tools, 'ripgrep', 'ripgrep-15.2.0-x86_64-pc-windows-msvc', 'rg.exe'), git: path.join(paths.tools, 'git', 'cmd', 'git.exe') });
  for (const [file, content] of [[tools.uv, 'UV'], [tools.tunnel_client, 'TUNNEL'], [tools.rg, 'RG'], [tools.git, 'GIT'],
    [path.join(paths.tools, 'tunnel-client', 'cloudflared.exe'), 'CLOUDFLARED'], [path.join(paths.tools, 'git', 'usr', 'bin', 'sh.exe'), 'SH']]) {
    assert.equal(await fs.readFile(file, 'utf8'), content, file);
  }
  assert.deepEqual(JSON.parse(await fs.readFile(paths.marker, 'utf8')), { schema_version: 1, archive_sha256: sha256(archive), tools },
    'control.py of the executor reads the same record');
  assert.deepEqual((await fs.readdir(paths.runtime)).sort(), ['tools', 'tools.json'], 'no staging folder and no old bridge remain');
  assert.deepEqual(phases, ['verifying', 'extracting', 'embedded']);
  assert.deepEqual(await bootstrap.inspect(), { phase: 'embedded', installed: false, toolsReady: true, error: null }, 'Git is ready, the Python is not');
  assert.equal(calls.length, 0, 'unpacking runs no program');

  const environment = await bootstrap.workflowEnvironment();
  assert.deepEqual(environment, { WORKFLOW_GIT_BIN: tools.git, WORKFLOW_GIT_HOME: path.join(paths.tools, 'git'),
    Path: [path.join(paths.tools, 'git', 'cmd'), path.join(paths.tools, 'git', 'usr', 'bin'), 'C:\\Windows\\System32'].join(';') });
  assert.deepEqual([calls[0].file, calls[0].args, calls[0].options.windowsHide], [tools.git, ['--version'], true]);

  calls.length = 0;
  const [installed, again] = await Promise.all([bootstrap.ensure(), bootstrap.ensure()]);
  assert.equal(installed, again);
  assert.deepEqual(installed, { phase: 'installed', installed: true, toolsReady: true, error: null });
  assert.equal(calls.length, 1, 'one uv call for concurrent callers');
  assert.equal(calls[0].file, tools.uv);
  assert.deepEqual(calls[0].args, ['venv', '--clear', '--managed-python', '--python', '3.13', '--no-config', paths.venv]);
  assert.equal(calls[0].options.windowsHide, true);
  assert.equal(calls[0].options.env.UV_PYTHON_INSTALL_DIR, path.join(paths.runtime, 'python'));
  assert.equal(calls[0].options.env.UV_CACHE_DIR, path.join(paths.runtime, 'uv-cache'));
  assert.equal(calls[0].options.env.Path, 'C:\\Windows\\System32');
  const markerTime = (await fs.stat(paths.marker)).mtimeMs;
  calls.length = 0;
  await bootstrap.ensure(); await create().ensure();
  assert.equal(calls.length, 0, 'prepared components are not touched again');
  assert.equal((await fs.stat(paths.marker)).mtimeMs, markerTime);
  assert.deepEqual((await create().inspect()), { phase: 'installed', installed: true, toolsReady: true, error: null });

  // A record of another archive, a missing executable or a path outside the tools folder means: unpack again.
  for (const damage of [
    marker => ({ ...marker, archive_sha256: 'f'.repeat(64) }),
    marker => ({ ...marker, tools: { ...marker.tools, git: path.join(root, 'elsewhere', 'git.exe') } }),
    marker => ({ ...marker, tools: { ...marker.tools, rg: path.join(paths.tools, 'ripgrep', 'gone.exe') } }),
    () => 'not json',
  ]) {
    const marker = JSON.parse(await fs.readFile(paths.marker, 'utf8'));
    const next = damage(marker);
    await fs.writeFile(paths.marker, typeof next === 'string' ? next : JSON.stringify(next));
    assert.equal((await create().inspect()).toolsReady, false);
    assert.deepEqual(await create().ensureTools(), tools);
    assert.deepEqual(JSON.parse(await fs.readFile(paths.marker, 'utf8')).tools, tools);
  }
  assert.equal(await fs.readFile(paths.python, 'utf8'), 'python', 'unpacking the tools again keeps the Python');

  // Failures carry the codes the first-run wizard explains.
  await fs.rm(paths.python);
  venv = 'fail';
  const failing = create();
  await assert.rejects(failing.ensure(), error => error.code === 'WINDOWS_RUNTIME_SETUP_FAILED' && /failed to download Python/.test(error.message));
  assert.deepEqual(failing.snapshot(), { phase: 'error', installed: false, toolsReady: true, error: 'WINDOWS_RUNTIME_SETUP_FAILED' });
  assert.equal((await failing.inspect()).phase, 'error', 'an inspection does not hide the failure');
  venv = 'nothing';
  await assert.rejects(create().ensure(), { code: 'WINDOWS_RUNTIME_SETUP_INCOMPLETE' });
  venv = 'create';
  assert.equal((await failing.ensure()).phase, 'installed', 'the next attempt repeats the step');

  await fs.rm(paths.runtime, { recursive: true });
  await assert.rejects(create({ expectedSha256: 'a'.repeat(64) }).ensureTools(), { code: 'WINDOWS_RUNTIME_PAYLOAD_DAMAGED' });
  await assert.rejects(create({ payloadFile: path.join(root, 'absent.zip') }).ensure(), { code: 'WINDOWS_RUNTIME_PAYLOAD_MISSING' });
  for (const damage of ['inner-sha', 'no-git', 'executable', 'manifest', 'schema']) {
    const broken = vendorArchive({ damage });
    await fs.writeFile(path.join(root, damage + '.zip'), broken);
    const attempt = create({ payloadFile: path.join(root, damage + '.zip'), expectedSha256: sha256(broken) });
    await assert.rejects(attempt.ensureTools(), { code: 'WINDOWS_RUNTIME_ARCHIVE_INVALID' }, damage);
    assert.equal(attempt.snapshot().error, 'WINDOWS_RUNTIME_ARCHIVE_INVALID');
    assert.equal(await present(paths.marker), false, damage);
    assert.equal(await present(paths.staging), false, damage + ': nothing half-unpacked is left');
  }
  await fs.writeFile(path.join(root, 'text.zip'), 'this is not an archive');
  await assert.rejects(create({ payloadFile: path.join(root, 'text.zip'), expectedSha256: sha256('this is not an archive') }).ensureTools(),
    { code: 'WINDOWS_RUNTIME_ARCHIVE_INVALID' });
  const mac = create({ platform: 'darwin' });
  assert.equal(mac.snapshot().phase, 'unavailable');
  await assert.rejects(mac.ensure(), { code: 'WINDOWS_ONLY' });
  assert.throws(() => new WindowsExecutorBootstrap({ payloadFile }), TypeError);
});

test('Windows components unpack from the real pinned archive', { timeout: 120_000 }, async t => {
  const payloadFile = path.join(windowsToolchainPaths().cacheDir, 'Windows-Codex-Local-2026-09-10.zip');
  let digest = null;
  try { digest = await sha256File(payloadFile); } catch {}
  if (digest !== WINDOWS_RUNTIME_SHA256) { t.skip('pinned Windows archive is not in the local build cache'); return; }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-win-real-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateDir = path.join(root, 'WorkflowPilotCodexExecutor'), paths = windowsExecutorPaths(stateDir);
  const bootstrap = new WindowsExecutorBootstrap({ payloadFile, stateDir, platform: 'win32', environment: {},
    execute: async (file, args) => {
      if (args[0] === '--version') return { stdout: 'git version 2.55.0.windows.5\n', stderr: '' };
      throw new Error('unexpected command');
    } });
  const tools = await bootstrap.ensureTools();
  const size = async (...parts) => (await fs.stat(path.join(paths.tools, ...parts))).size;
  assert.equal(await size('uv', 'uv.exe'), 41455408);
  assert.equal(await size('tunnel-client', 'tunnel-client.exe'), 21826048);
  assert.equal(await size('tunnel-client', 'cloudflared.exe'), 39751680, 'tunnel-client keeps its companion next to it');
  assert.ok(await size('ripgrep', 'ripgrep-15.2.0-x86_64-pc-windows-msvc', 'rg.exe') > 1_000_000);
  assert.ok(await size('git', 'cmd', 'git.exe') > 10_000);
  assert.ok(await size('git', 'usr', 'bin', 'sh.exe') > 10_000);
  assert.equal(tools.git, path.join(paths.tools, 'git', 'cmd', 'git.exe'));
  assert.deepEqual((await fs.readdir(paths.tools)).sort(), ['git', 'ripgrep', 'tunnel-client', 'uv']);
  assert.equal((await bootstrap.workflowEnvironment()).WORKFLOW_GIT_BIN, tools.git);
  assert.equal(JSON.parse(await fs.readFile(paths.marker, 'utf8')).archive_sha256, WINDOWS_RUNTIME_SHA256);
});

test('the bridge of earlier versions is stopped by its own lifecycle script and only the copy in the app data is removed', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-win-legacy-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dataDir = path.join(root, 'Roaming', 'Workflow Pilot'), installed = path.join(dataDir, 'runtime', 'Windows-Codex-Local');
  const chosen = path.join(root, 'Codex Local Windows'), recorded = path.join(root, 'Recorded Copy'), empty = path.join(root, 'No Python');
  const legacyStateDir = path.join(root, 'Local', 'CodexLocalWindows');
  const python = folder => path.join(folder, '.venv', 'Scripts', 'python.exe');
  for (const folder of [installed, chosen, recorded]) {
    await fs.mkdir(path.dirname(python(folder)), { recursive: true });
    await fs.writeFile(python(folder), 'python');
  }
  await fs.mkdir(empty, { recursive: true });
  await fs.mkdir(path.join(legacyStateDir, 'private'), { recursive: true });
  await fs.writeFile(path.join(legacyStateDir, 'private', 'tunnel-key.dpapi'), 'old key');
  await fs.writeFile(path.join(legacyStateDir, 'mcp.pid.json'), JSON.stringify({ package_root: recorded, identity: { pid: 4242 } }));
  await fs.writeFile(path.join(legacyStateDir, 'tunnel.pid.json'), 'damaged');
  await fs.mkdir(path.join(dataDir, 'runtime', '.windows-runtime-staging'), { recursive: true });
  await fs.writeFile(path.join(dataDir, 'runtime', 'windows-runtime.json'), '{}');
  await fs.writeFile(path.join(dataDir, 'settings.json'), '{}');
  const calls = [];
  let stopFails = null, regFails = false;
  const execute = async (file, args, options) => {
    calls.push([file, args, options]);
    if (args[0] === 'delete') { if (regFails) throw new Error('ERROR: The system was unable to find the specified registry value.'); return { stdout: '' }; }
    if (stopFails && options.cwd === stopFails) throw Object.assign(new Error('exit 1'), { stderr: '{"ok": false, "error": "mcp: not stopped"}' });
    return { stdout: '{"stopped": ["tunnel", "mcp"]}' };
  };
  const options = { dataDir, runtimeRoots: [chosen, empty, chosen, 'relative', null], legacyStateDir, controlFile: '/app/resources/runtime-control/windows-control.py',
    execute, environment: { SystemRoot: '/Windows', Path: 'C:\\x' } };

  stopFails = chosen;
  await assert.rejects(retireLegacyWindowsRuntime(options), /exit 1/);
  assert.equal(await present(installed), true, 'nothing is removed while a bridge may still be running');
  calls.length = 0; stopFails = null; regFails = true;
  const result = await retireLegacyWindowsRuntime(options);
  assert.deepEqual(result, { stopped: [installed, chosen, recorded], removed: installed });
  const stops = calls.filter(([, args]) => args.at(-1) === 'stop');
  assert.deepEqual(stops.map(([file, args, settings]) => [file, args, settings.cwd, settings.env.WORKFLOW_PILOT_RUNTIME_ROOT, settings.env.PYTHONUTF8, settings.windowsHide]),
    [installed, chosen, recorded].map(folder => [python(folder), ['-B', options.controlFile, 'stop'], folder, folder, '1', true]),
    'every folder is stopped with its own Python; a folder without one cannot be running');
  const reg = calls.find(([, args]) => args[0] === 'delete');
  assert.deepEqual([reg[0], reg[1]], [path.join('/Windows', 'System32', 'reg.exe'),
    ['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', 'WorkflowPilotMCP', '/f']], 'the old start at sign-in is removed; a missing value is not an error');
  for (const gone of [installed, path.join(dataDir, 'runtime', 'windows-runtime.json'), path.join(dataDir, 'runtime', '.windows-runtime-staging')])
    assert.equal(await present(gone), false, gone);
  for (const kept of [python(chosen), python(recorded), empty, path.join(legacyStateDir, 'private', 'tunnel-key.dpapi'), path.join(dataDir, 'settings.json')])
    assert.equal(await present(kept), true, 'folders of the user and the old tunnel key stay: ' + kept);
  calls.length = 0;
  assert.deepEqual((await retireLegacyWindowsRuntime({ ...options, runtimeRoots: [], legacyStateDir: null })).stopped, [], 'a second run finds nothing to stop');
  await assert.rejects(retireLegacyWindowsRuntime({ ...options, dataDir: 'relative' }), TypeError);
  await assert.rejects(retireLegacyWindowsRuntime({ ...options, controlFile: undefined }), TypeError);
});

test('SHA-256 verification uses the canonical digest contract', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-win-runtime-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'payload.zip');
  await fs.writeFile(file, 'fixture');
  assert.equal(await sha256File(file), 'f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d');
  assert.match(WINDOWS_RUNTIME_SHA256, /^[0-9a-f]{64}$/);
});


test('nothing patches or starts the previous Windows bridge any more: the archive is only a source of four tools', async () => {
  for (const gone of ['patchWindowsBridgeSource', 'patchWindowsSkillSource', 'WINDOWS_REMOVED_TOOLS', 'WINDOWS_CONTEXT_PACKET_SOURCE',
    'WINDOWS_SKILL_DESKTOP_SECTION', 'WindowsRuntimeBootstrap', 'configureWindowsTunnel', 'windowsSetupInvocation', 'windowsExpandInvocation'])
    assert.equal(gone in windowsRuntime, false, gone);
  const source = await fs.readFile(new URL('../src/windows-runtime.mjs', import.meta.url), 'utf8');
  for (const text of ['bridge_mcp.py', 'setup.ps1', 'context_packet', 'Expand-Archive', 'workflow_context_recover', 'computer_click'])
    assert.equal(source.includes(text), false, text);
  assert.equal(windowsRuntime.WINDOWS_RUNTIME_ARCHIVE, 'Windows-Codex-Local-2026-09-10.zip', 'the pinned archive keeps its name');
  assert.equal(WINDOWS_RUNTIME_SHA256, '1f041488ad97d8abf1984fd3521afb8abe15f50b8df3d3e11f1cc4248e019d98', 'and its SHA-256');
  for (const file of ['../src/main.mjs', '../src/mac-runtime-switch.mjs', '../src/mcp-runtime.mjs', '../src/startup-platform.mjs']) {
    const text = await fs.readFile(new URL(file, import.meta.url), 'utf8');
    for (const gone of ['McpRuntime', 'WindowsRuntimeBootstrap', "'Codex Local Windows'", 'workflow_context_recover'])
      assert.equal(text.includes(gone), false, `${file}: ${gone}`);
  }
});

test('package verification: every executor file exists in the source and the archive must hold the four tools', async t => {
  assert.deepEqual(WINDOWS_EXECUTOR_FILES.slice(0, 3), ['server.py', 'app_server_client.py', 'control.py']);
  assert.ok(WINDOWS_EXECUTOR_FILES.includes('codex-tools.lock.json'));
  for (const file of WINDOWS_EXECUTOR_FILES) assert.equal(await present(new URL('../tools/codex-app-server-mcp/' + file, import.meta.url)), true, file);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-win-verify-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'good.zip'), vendorArchive());
  assert.deepEqual((await vendorTools(path.join(dir, 'good.zip'))).map(tool => [tool.id, tool.file]), [
    ['uv', 'uv-x86_64-pc-windows-msvc.zip'], ['tunnel-client', 'tunnel-client-v0.0.14-windows-amd64.zip'],
    ['ripgrep', 'ripgrep-15.2.0-x86_64-pc-windows-msvc.zip'], ['git', 'MinGit-2.55.0.5-64-bit.zip']]);
  await fs.writeFile(path.join(dir, 'no-git.zip'), vendorArchive({ damage: 'no-git' }));
  await assert.rejects(vendorTools(path.join(dir, 'no-git.zip')), /does not hold git/);
  await fs.writeFile(path.join(dir, 'empty.zip'), buildZip([['readme.txt', 'x']]));
  await assert.rejects(vendorTools(path.join(dir, 'empty.zip')), /no vendor list/);
  const pinned = path.join(windowsToolchainPaths().cacheDir, 'Windows-Codex-Local-2026-09-10.zip');
  if (await sha256File(pinned).catch(() => null) === WINDOWS_RUNTIME_SHA256)
    assert.deepEqual((await vendorTools(pinned)).map(tool => [tool.id, tool.version]),
      [['uv', '0.12.12'], ['tunnel-client', 'v0.0.14'], ['ripgrep', '15.2.0'], ['git', 'v2.55.0.windows.5']]);
});

test('portable Node build payload has pinned Windows x64 layout and safe extraction plans', () => {
  assert.equal(NODE_ARCHIVE, 'node-v24.21.0-win-x64.zip');
  assert.equal(NODE_SHA256, '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541');
  const p = windowsToolchainPaths('/repo');
  assert.match(p.nodeExe, /windows-node[\\/]node-v24\.21\.0-win-x64[\\/]node\.exe$/);
  const mac = extractionCommand('darwin', '/cache/node.zip', '/out');
  assert.deepEqual(mac, { executable: '/usr/bin/ditto', args: ['-x', '-k', '/cache/node.zip', '/out'], env: {} });
  const win = extractionCommand('win32', 'C:\\cache\\node.zip', 'C:\\out');
  assert.equal(win.executable, 'powershell.exe');
  assert.equal(win.env.WORKFLOW_PILOT_NODE_ARCHIVE, 'C:\\cache\\node.zip');
  assert.ok(!win.args.join(' ').includes('C:\\cache\\node.zip'), 'archive path is not interpolated into PowerShell source');
});


test('Windows build preflight can resolve the private runtime payload without hard-coding a user path', () => {
  const candidates = windowsRuntimeSourceCandidates('/repo/Workflow Pilot', { WORKFLOW_PILOT_WINDOWS_RUNTIME_ARCHIVE: 'D:\\cache\\runtime.zip' });
  assert.equal(candidates[0], 'D:\\cache\\runtime.zip');
  assert.equal(candidates[1], path.join('/repo/Workflow Pilot', 'windows-app', 'resources', 'windows-payload', 'Windows-Codex-Local-2026-09-10.zip'));
  assert.equal(candidates.length, 2, 'the build no longer looks into a neighbouring private workspace');
});

test('Windows runtime payload comes from the build cache, a local copy or the release asset and is always verified', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-win-payload-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cacheDir = path.join(root, 'cache'), cached = path.join(cacheDir, 'Windows-Codex-Local-2026-09-10.zip');
  await fs.mkdir(cacheDir, { recursive: true });
  const good = Buffer.from('pinned runtime fixture');
  const expectedSha256 = createHash('sha256').update(good).digest('hex');
  const offline = async () => { throw new Error('HTTP 404'); };
  assert.equal(WINDOWS_RUNTIME_URL, 'https://github.com/OleynikAleksandr/Project-Web-Pilot/releases/download/v0.6.115/Windows-Codex-Local-2026-09-10.zip');

  // Empty cache and no local copy: the release asset is downloaded and verified.
  const fetched = [];
  let result = await ensureWindowsRuntimePayload(root, cacheDir, { environment: {}, expectedSha256,
    fetchArchive: async (url, destination) => { fetched.push(url); await fs.writeFile(destination, good); } });
  assert.deepEqual([result.file, result.downloaded, result.reused, fetched], [cached, true, false, [WINDOWS_RUNTIME_URL]]);

  // A verified cache needs no network.
  result = await ensureWindowsRuntimePayload(root, cacheDir, { environment: {}, expectedSha256, fetchArchive: offline });
  assert.deepEqual([result.downloaded, result.reused], [false, true]);

  // A local copy named by the environment is preferred to the download.
  await fs.rm(cached);
  const local = path.join(root, 'local.zip');
  await fs.writeFile(local, good);
  result = await ensureWindowsRuntimePayload(root, cacheDir, { environment: { WORKFLOW_PILOT_WINDOWS_RUNTIME_ARCHIVE: local }, expectedSha256, fetchArchive: offline });
  assert.deepEqual([result.downloaded, result.reused, await sha256File(cached)], [false, false, expectedSha256]);

  // A download with another digest is rejected and never stays in the cache; so does a damaged cache.
  await fs.writeFile(cached, 'damaged cache');
  await assert.rejects(ensureWindowsRuntimePayload(root, cacheDir, { environment: {}, expectedSha256,
    fetchArchive: async (_url, destination) => fs.writeFile(destination, 'tampered') }), /Downloaded archive of Windows components has SHA-256 [0-9a-f]{64}, expected/);
  await assert.rejects(fs.access(cached));
  await assert.rejects(ensureWindowsRuntimePayload(root, cacheDir, { environment: {}, expectedSha256, fetchArchive: offline }),
    /download failed \(HTTP 404\)\. Put Windows-Codex-Local-2026-09-10\.zip at /);
  await assert.rejects(fs.access(cached));
});


test('the lifecycle script of the previous bridge stays in the package: 0.6.96 uses it once to stop that bridge', async () => {
  const source = await fs.readFile(windowsControl, 'utf8');
  assert.match(source, /RUNTIME_CONTRACT = 2/);
  assert.match(source, /WORKFLOW_PILOT_RUNTIME_ROOT/);
  assert.match(source, /def stop\(\) -> dict:/);
  assert.match(source, /stale_cleaned/);
});

function listenLocal(port=0){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server));});}
function closeLocal(server){return new Promise(resolve=>server.close(resolve));}
async function reserveLocalPort(){const server=await listenLocal();const port=server.address().port;await closeLocal(server);return port;}
async function pythonWithPsutilStub(t,state,runtime,args){
  const stub=path.join(state,'stubs');await fs.mkdir(stub,{recursive:true});
  await fs.writeFile(path.join(stub,'psutil.py'),`class NoSuchProcess(Exception): pass\nclass ZombieProcess(Exception): pass\nclass AccessDenied(Exception): pass\nclass Process:\n    def __init__(self,pid): raise NoSuchProcess(pid)\n`);
  return execute('python3',args,{env:{...process.env,PYTHONPATH:stub,CODEX_LOCAL_WINDOWS_STATE_DIR:state,WORKFLOW_PILOT_RUNTIME_ROOT:runtime,PYTHONDONTWRITEBYTECODE:'1'},timeout:10000});
}

test('Windows lifecycle adapter cleans stale PID and moves occupied persisted endpoints without WinAPI secrets', async t => {
  const state=await fs.mkdtemp(path.join(os.tmpdir(),'web-pilot-win-control-'));t.after(()=>fs.rm(state,{recursive:true,force:true}));
  const runtime=path.join(state,'runtime-root');await fs.mkdir(runtime,{recursive:true});
  const pidFile=path.join(state,'mcp.pid.json');await fs.writeFile(pidFile,JSON.stringify({package_root:runtime,identity:{pid:999999,created:0,exe:'foreign',cmdline:['foreign']}},null,2));
  const statusCode=`import importlib.util,json\ns=importlib.util.spec_from_file_location('c',${JSON.stringify(windowsControl)})\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(json.dumps(m.status()))`;
  const first=JSON.parse((await pythonWithPsutilStub(t,state,runtime,['-c',statusCode])).stdout);
  assert.equal(first.runtime_contract,2);assert.equal(first.mcp.running,false);assert.equal(first.mcp.stale_cleaned,true);await assert.rejects(fs.stat(pidFile),{code:'ENOENT'});
  const priv=path.join(state,'private'),profileDir=path.join(priv,'tunnel-profile');await fs.mkdir(profileDir,{recursive:true});
  const preferredMcp=await reserveLocalPort(),preferredTunnel=await reserveLocalPort();
  await fs.writeFile(path.join(priv,'runtime-endpoints.json'),JSON.stringify({schema_version:1,mcp_port:preferredMcp,tunnel_port:preferredTunnel}));
  await fs.writeFile(path.join(priv,'bridge_config.json'),JSON.stringify({repo:'/tmp/project',token:'opaque',port:preferredMcp}));
  const profile={control_plane:{tunnel_id:'tunnel_fixture_1234567890',api_key:'env:CODEX_LOCAL_WINDOWS_TUNNEL_API_KEY'},health:{listen_addr:`127.0.0.1:${preferredTunnel}`},mcp:{server_urls:[{channel:'main',url:`http://127.0.0.1:${preferredMcp}/mcp`}]}};
  await fs.writeFile(path.join(profileDir,'windows-local.yaml'),JSON.stringify(profile));
  const a=await listenLocal(preferredMcp),b=await listenLocal(preferredTunnel);let ao=true,bo=true;t.after(async()=>{if(ao)await closeLocal(a).catch(()=>{});if(bo)await closeLocal(b).catch(()=>{});});
  const code=`import importlib.util,json\ns=importlib.util.spec_from_file_location('c',${JSON.stringify(windowsControl)})\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(json.dumps(m.reconcile_endpoints()))`;
  const moved=JSON.parse((await pythonWithPsutilStub(t,state,runtime,['-c',code])).stdout);assert.notEqual(moved.mcp_port,preferredMcp);assert.notEqual(moved.tunnel_port,preferredTunnel);
  const updated=JSON.parse(await fs.readFile(path.join(profileDir,'windows-local.yaml'),'utf8'));assert.equal(updated.control_plane.tunnel_id,profile.control_plane.tunnel_id);assert.equal(updated.control_plane.api_key,profile.control_plane.api_key);assert.equal(updated.mcp.server_urls[0].url,`http://127.0.0.1:${moved.mcp_port}/mcp`);
  await closeLocal(a);ao=false;await closeLocal(b);bo=false;
});

test('Workflow Kit on Windows gets the MinGit of the package and refuses a Git from elsewhere', () => {
  const tools = 'C:\\Users\\Pilot\\AppData\\Local\\WorkflowPilotCodexExecutor\\runtime\\tools';
  const git = tools + '\\git\\cmd\\git.exe';
  const env = windowsWorkflowEnvironment(tools, { git }, { Path: 'C:\\Windows\\System32' }, path.win32);
  assert.equal(env.WORKFLOW_GIT_BIN, git);
  assert.equal(env.WORKFLOW_GIT_HOME, tools + '\\git');
  assert.equal(env.Path, `${tools}\\git\\cmd;${tools}\\git\\usr\\bin;C:\\Windows\\System32`);
  assert.equal(windowsWorkflowEnvironment(tools, { git: git.toUpperCase() }, {}, path.win32).Path, `${tools}\\git\\cmd;${tools}\\git\\usr\\bin`);
  assert.throws(() => windowsWorkflowEnvironment(tools, { git: 'C:\\foreign\\git.exe' }, {}, path.win32), { code: 'WINDOWS_GIT_LAYOUT_INVALID' });
  assert.throws(() => windowsWorkflowEnvironment(tools, {}, {}, path.win32), { code: 'WINDOWS_GIT_LAYOUT_INVALID' });
});


test('Windows build launcher uses the canonical bundled Node folder', async () => {
  const launcher = await fs.readFile(new URL('../BUILD_WINDOWS.cmd', import.meta.url), 'utf8');
  const folder = windowsToolchainPaths('/repo').nodeFolder;
  assert.equal(path.basename(folder), 'node-v' + BUNDLED_NODE_VERSION + '-win-x64');
  assert.ok(launcher.includes('windows-node\\' + path.basename(folder)));
});
