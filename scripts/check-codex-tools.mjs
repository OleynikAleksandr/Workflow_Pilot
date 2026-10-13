import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const defaultLockPath = fileURLToPath(new URL('../tools/codex-app-server-mcp/codex-tools.lock.json', import.meta.url));

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function parseCodexVersion(text) {
  const match = String(text || '').match(/\b(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/);
  if (!match) throw new Error('Cannot parse installed Codex version');
  return match[1];
}

export function validateLock(lock) {
  if (!lock || lock.schema_version !== 1 || lock.repository !== 'openai/codex') {
    throw new Error('Invalid codex-tools.lock.json: unsupported schema or repository');
  }
  if (typeof lock.codex_version !== 'string' || lock.tag !== `rust-v${lock.codex_version}`) {
    throw new Error('Invalid codex-tools.lock.json: version/tag mismatch');
  }
  if (!Array.isArray(lock.files) || lock.files.length !== 3) {
    throw new Error('Invalid codex-tools.lock.json: expected exactly three definition files');
  }
  const seen = new Set();
  for (const file of lock.files) {
    if (!file || typeof file.path !== 'string' || !/^[0-9a-f]{64}$/.test(String(file.sha256 || '')) || seen.has(file.path)) {
      throw new Error('Invalid codex-tools.lock.json: malformed file entry');
    }
    seen.add(file.path);
  }
  return lock;
}

async function installedVersion() {
  const candidates = [
    process.env.CODEX_APP_SERVER_BIN,
    path.join(homedir(), '.npm-global', 'bin', 'codex'),
    path.join(homedir(), '.local', 'bin', 'codex'),
    ...(process.env.PATH || '').split(path.delimiter).filter(Boolean).map(folder => path.join(folder, 'codex')),
    '/Applications/ChatGPT.app/Contents/Resources/codex',
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      await access(candidate, constants.X_OK);
      const { stdout, stderr } = await execFileAsync(candidate, ['--version'], { timeout: 10_000 });
      return parseCodexVersion(stdout || stderr);
    } catch {
      // Try the next installed Codex candidate, matching AppServerClient discovery.
    }
  }
  const error = new Error('No compatible Codex binary was found');
  error.exitCode = 1;
  throw error;
}

export async function checkCodexTools({
  lockPath = defaultLockPath,
  fetchImpl = globalThis.fetch,
  versionProvider = installedVersion,
} = {}) {
  let lock;
  try {
    lock = validateLock(JSON.parse(await readFile(lockPath, 'utf8')));
  } catch (error) {
    const wrapped = new Error(error instanceof SyntaxError ? 'Invalid codex-tools.lock.json: invalid JSON' : error.message);
    wrapped.exitCode = 1;
    throw wrapped;
  }

  const version = await versionProvider();
  const tag = `rust-v${version}`;
  const changed = [];
  const hashes = {};

  for (const file of lock.files) {
    const url = `https://raw.githubusercontent.com/${lock.repository}/${tag}/${file.path}`;
    let response;
    try {
      response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      return { exitCode: 2, ok: false, reason: `Network error while reading ${tag}: ${error.message}`, version, tag };
    }
    if (!response?.ok) {
      return { exitCode: 2, ok: false, reason: `Codex tag/source unavailable: ${tag} ${file.path} (HTTP ${response?.status ?? 'unknown'})`, version, tag };
    }
    const digest = sha256(Buffer.from(await response.arrayBuffer()));
    hashes[file.path] = digest;
    if (digest !== file.sha256) changed.push(file.path);
  }

  if (version !== lock.codex_version) changed.unshift('codex_version');
  if (tag !== lock.tag) changed.unshift('tag');

  return {
    exitCode: changed.length ? 1 : 0,
    ok: changed.length === 0,
    version,
    tag,
    pinnedVersion: lock.codex_version,
    pinnedTag: lock.tag,
    changed,
    hashes,
  };
}

async function main() {
  const result = await checkCodexTools();
  if (result.ok) {
    console.log(`Codex tool definitions match ${result.tag}.`);
  } else if (result.exitCode === 1) {
    console.error(`Codex tool definitions differ: ${result.changed.join(', ')}`);
  } else {
    console.error(result.reason);
  }
  process.exitCode = result.exitCode;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
  });
}
