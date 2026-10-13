import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../src/common.mjs';
import { releaseAssetNames } from './release-all.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPOSITORY = 'OleynikAleksandr/Workflow_Pilot';

function exec(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  }).trim();
}

function remoteRef(ref) {
  const output = exec('git', ['ls-remote', 'origin', ref, ref + '^{}']);
  const rows = output.split('\n').filter(Boolean).map(line => line.split(/\s+/));
  if (!rows.length) throw new Error('Remote ref missing: ' + ref);
  const peeled = rows.find(([, name]) => name === ref + '^{}');
  const direct = rows.find(([, name]) => name === ref);
  return (peeled ?? direct)?.[0];
}

function githubToken() {
  const output = execFileSync('git', ['credential', 'fill'], {
    cwd: ROOT,
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    timeout: 10000,
  });
  const values = Object.fromEntries(output.trim().split(/\r?\n/).map(line => {
    const index = line.indexOf('=');
    return index < 0 ? [line, ''] : [line.slice(0, index), line.slice(index + 1)];
  }));
  if (!values.password) throw new Error('GitHub credential helper did not return a token');
  return values.password;
}

async function githubApi(pathname) {
  const response = await fetch('https://api.github.com' + pathname, {
    headers: {
      'Authorization': 'Bearer ' + githubToken(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Project-Web-Pilot-release-check',
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) throw new Error('GitHub API ' + response.status + ': ' + (typeof body === 'string' ? body : JSON.stringify(body)));
  return body;
}

async function expectedAssets(delivery, version) {
  const result = [];
  for (const name of releaseAssetNames(version)) {
    const file = path.join(delivery, name);
    const stat = await fs.stat(file);
    assert.ok(stat.isFile(), 'Expected release asset file: ' + name);
    result.push({ name, size: stat.size, sha256: await sha256File(file) });
  }
  return result;
}

export async function verifyGitHubRelease({ root = ROOT } = {}) {
  root = path.resolve(root);
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const tag = 'v' + version;
  const delivery = path.join(os.homedir(), 'Downloads', 'WorkflowPilot-' + version);
  const manifest = JSON.parse(await fs.readFile(path.join(delivery, 'release-manifest.json'), 'utf8'));
  assert.equal(manifest.version, version);
  assert.match(manifest.sourceCommit ?? '', /^[0-9a-f]{40}$/);

  const expected = await expectedAssets(delivery, version);
  const localHead = exec('git', ['rev-parse', 'HEAD']);
  const remoteMain = remoteRef('refs/heads/main');
  assert.equal(remoteMain, localHead, 'origin/main must match local HEAD when GitHub verification runs');

  const remoteTag = remoteRef('refs/tags/' + tag);
  assert.equal(remoteTag, manifest.sourceCommit, 'release tag must point to release-manifest.sourceCommit');

  const release = await githubApi(`/repos/${REPOSITORY}/releases/tags/${tag}`);
  assert.equal(release.tag_name, tag);
  assert.equal(release.draft, false);
  assert.equal(release.prerelease, false);

  const actual = [...release.assets].sort((a, b) => a.name.localeCompare(b.name));
  const wanted = [...expected].sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(actual.map(asset => asset.name), wanted.map(asset => asset.name), 'GitHub release asset names');

  for (const item of wanted) {
    const asset = actual.find(value => value.name === item.name);
    assert.equal(asset.size, item.size, 'GitHub asset size: ' + item.name);
    assert.equal(asset.digest, 'sha256:' + item.sha256, 'GitHub asset digest: ' + item.name);
  }

  return {
    ok: true,
    version,
    tag,
    sourceCommit: manifest.sourceCommit,
    localHead,
    remoteMain,
    assets: wanted,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyGitHubRelease()
    .then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
