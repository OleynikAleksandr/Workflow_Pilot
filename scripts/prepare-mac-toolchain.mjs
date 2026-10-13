import { sha256File } from '../src/execution/files/adapter.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BUNDLED_NODE_VERSION } from '../src/execution/platform/paths.mjs';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const UV_VERSION = '0.9.13';
export const UV_SHA256 = '11609c939296348c7cc1e1231b3fbf7ca90a603a4c494ec72b59d7ceafa695e1';
export const NODE_VERSION = BUNDLED_NODE_VERSION;
export const NODE_SHA256 = 'bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057';
export const NODE_ARCHIVE = 'node-v' + NODE_VERSION + '-darwin-arm64.tar.gz';
const matches = async (file, sha) => { try { return await sha256File(file) === sha; } catch { return false; } };

export async function prepareMacNode({ root = ROOT, run = execute, download = async (url, target) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('Node download failed: HTTP ' + response.status);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
} } = {}) {
  const cache = path.join(root, '.harness/runtime/mac-node-cache');
  const output = path.join(root, '.harness/runtime/mac-tools/node');
  await fs.mkdir(cache, { recursive: true });
  const archive = path.join(cache, NODE_ARCHIVE);
  if (!await matches(archive, NODE_SHA256)) {
    const temporary = archive + '.download';
    try {
      await download('https://nodejs.org/dist/v' + NODE_VERSION + '/' + NODE_ARCHIVE, temporary);
      if (!await matches(temporary, NODE_SHA256)) throw new Error('Mac Node archive SHA-256 mismatch.');
      await fs.rename(temporary, archive);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  const temporary = await fs.mkdtemp(path.join(cache, 'extract-'));
  try {
    await run('/usr/bin/tar', ['-xzf', archive, '-C', temporary], { timeout: 60000 });
    const source = path.join(temporary, 'node-v' + NODE_VERSION + '-darwin-arm64');
    const node = path.join(source, 'bin/node');
    const result = await run(node, ['-p', 'process.version + " " + process.arch'], { timeout: 5000 });
    if (result.stdout.trim() !== 'v' + NODE_VERSION + ' arm64') throw new Error('Unexpected Mac Node binary.');
    await fs.mkdir(path.join(output, 'bin'), { recursive: true });
    await fs.copyFile(node, path.join(output, 'bin/node'));
    await fs.chmod(path.join(output, 'bin/node'), 0o755);
    await fs.copyFile(path.join(source, 'LICENSE'), path.join(output, 'LICENSE'));
    const evidence = { version: NODE_VERSION, archiveSha256: NODE_SHA256, binarySha256: await sha256File(node) };
    await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(evidence, null, 2) + '\n');
    return { output, ...evidence };
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
export async function prepareMacToolchain({ root = ROOT, environment = process.env } = {}) {
  const out = path.join(root, '.harness/runtime/mac-tools/uv');
  const candidates = [environment.WORKFLOW_PILOT_UV, out, path.join(os.homedir(), '.local/bin/uv'), '/opt/homebrew/bin/uv', '/usr/local/bin/uv'].filter(Boolean);
  let source;
  for (const candidate of candidates) {
    if (!await matches(candidate, UV_SHA256)) continue;
    const result = await execute(candidate, ['--version'], { timeout: 5000 });
    if (result.stdout.trim().startsWith('uv ' + UV_VERSION)) { source = candidate; break; }
  }
  if (!source) throw new Error('Pinned uv ' + UV_VERSION + ' not found. Set WORKFLOW_PILOT_UV to the verified arm64 binary.');
  await fs.mkdir(path.dirname(out), { recursive: true });
  if (source !== out) await fs.copyFile(source, out);
  await fs.chmod(out, 0o755);
  if (!await matches(out, UV_SHA256)) throw new Error('Copied uv SHA-256 mismatch.');
  return { uv: { out, version: UV_VERSION, sha256: UV_SHA256 }, node: await prepareMacNode({ root }) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareMacToolchain().then(result => process.stdout.write(JSON.stringify(result) + '\n')).catch(error => {
    console.error(error.message); process.exitCode = 1;
  });
}
