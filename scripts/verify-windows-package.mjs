import { sha256File } from '../src/common.mjs';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WINDOWS_RUNTIME_ARCHIVE, WINDOWS_RUNTIME_SHA256, WINDOWS_VENDOR_TOOLS } from '../src/windows-runtime.mjs';
import { fileReader, zipEntries, zipEntryData } from '../src/zip-archive.mjs';
import { NODE_ARCHIVE, NODE_FOLDER, NODE_SHA256 } from './prepare-windows-toolchain.mjs';
import { verifyPackagedSources } from './release-package.mjs';
import { verifyWorkflowKitRuntime } from './stage-workflow-kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function requireFile(file, label) {
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) throw new Error(`${label} missing: ${file}`);
  return stat;
}

// The executor is the only local MCP of the Windows package; these files are what the app syncs and runs.
export const WINDOWS_EXECUTOR_FILES = Object.freeze(['server.py', 'app_server_client.py', 'control.py', 'tunnel_prompt.py',
  'windows_desktop.py', 'windows_notify.ps1', 'requirements.txt', 'codex-tools.lock.json']);

// The pinned archive is used only as the source of four tools: its vendor list must name them and hold their archives.
export async function vendorTools(archive) {
  const reader = await fileReader(archive);
  try {
    const entries = new Map((await zipEntries(reader)).map(entry => [entry.name, entry]));
    const manifestEntry = entries.get('Windows-Codex-Local/vendor/manifest.json');
    if (!manifestEntry) throw new Error('The archive of Windows components has no vendor list');
    const manifest = JSON.parse((await zipEntryData(reader, manifestEntry)).toString('utf8').replace(/^\uFEFF/, ''));
    return Object.keys(WINDOWS_VENDOR_TOOLS).map(id => {
      const found = (manifest.tools ?? []).filter(tool => tool?.id === id);
      if (found.length !== 1 || !entries.has('Windows-Codex-Local/vendor/' + found[0].file))
        throw new Error(`The archive of Windows components does not hold ${id}`);
      return { id, version: found[0].version, file: found[0].file };
    });
  } finally { await reader.close(); }
}

async function requirePe(file, label) {
  const handle = await fs.open(file, 'r');
  try {
    const magic = Buffer.alloc(2); await handle.read(magic, 0, 2, 0);
    if (magic.toString('ascii') !== 'MZ') throw new Error(`${label} is not a Windows PE executable: ${file}`);
  } finally { await handle.close(); }
}

export async function verifyWindowsPackage(packageDir = path.join(ROOT, '.harness', 'runtime', 'build', 'Workflow Pilot-win32-x64'), {root=ROOT}={}) {
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const resources = path.join(packageDir, 'resources');
  const executable = path.join(packageDir, 'Workflow Pilot.exe');
  const appAsar = path.join(resources, 'app.asar');
  const runtimeArchive = path.join(resources, 'windows-payload', WINDOWS_RUNTIME_ARCHIVE);
  const nodeArchive = path.join(resources, 'windows-payload', NODE_ARCHIVE);
  const nodeExe = path.join(resources, 'windows-node', NODE_FOLDER, 'node.exe');
  const workflowRoot = path.join(resources, 'resources', 'workflow-kit');
  const workflow = path.join(workflowRoot, 'WORKFLOW.md');
  const setupWorker = path.join(resources, 'resources', 'workspace-setup-worker.mjs');
  const exeStat = await requireFile(executable, 'Workflow Pilot.exe');
  await requireFile(appAsar, 'app.asar');
  await requireFile(runtimeArchive, 'pinned archive of Windows components');
  await requireFile(nodeArchive, 'portable Node archive');
  const nodeStat = await requireFile(nodeExe, 'portable node.exe');
  await requireFile(workflow, 'Workflow Kit');
  await requireFile(setupWorker, 'workspace setup worker');
  for (const file of WINDOWS_EXECUTOR_FILES) await requireFile(path.join(resources, 'codex-app-server-mcp', file), 'Codex App Server executor: ' + file);
  // Only stops the bridge that Web Pilot ran before 0.6.96; the executor has its own control.py.
  await requireFile(path.join(resources, 'resources/runtime-control/windows-control.py'), 'lifecycle script of the previous Windows bridge');
  if (fsSync.existsSync(path.join(resources, 'resources/runtime-control/windows-first-run.py'))) throw new Error('The worker of the previous Windows bridge is still in the package');
  const sourceProof = await verifyPackagedSources({ root, resources, version });
  await requirePe(executable, 'Workflow Pilot.exe');
  await requirePe(nodeExe, 'portable node.exe');
  // The packaged Workflow Kit must be the package source of this repository, file for file.
  const workflowKit = await verifyWorkflowKitRuntime(workflowRoot);
  const runtimeSha256 = await sha256File(runtimeArchive);
  if (runtimeSha256 !== WINDOWS_RUNTIME_SHA256) throw new Error(`SHA-256 of the archive of Windows components differs from the pinned one: ${runtimeSha256}`);
  const vendor = await vendorTools(runtimeArchive);
  const nodeSha256 = await sha256File(nodeArchive);
  if (nodeSha256 !== NODE_SHA256) throw new Error(`portable Node SHA mismatch: ${nodeSha256}`);
  if (fsSync.existsSync(path.join(packageDir, 'Contents', 'Info.plist'))) throw new Error('macOS bundle structure leaked into Windows package');
  if (exeStat.size < 1024 * 1024 || nodeStat.size < 10 * 1024 * 1024) throw new Error('Windows executable payload is unexpectedly small');
  return {
    ...sourceProof,
    firstRun: true,
    packageDir,
    executable,
    executableSha256: await sha256File(executable),
    runtimeSha256,
    executor: [...WINDOWS_EXECUTOR_FILES],
    vendorTools: vendor,
    nodeSha256,
    nodeExecutableBytes: nodeStat.size,
    workflowKit: { version: workflowKit.version, files: workflowKit.files, sha256: workflowKit.sha256 },
    macBundle: false,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyWindowsPackage(process.argv[2] ? path.resolve(process.argv[2]) : undefined).then(result => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
