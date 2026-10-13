import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash, X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveMacSigning } from './sign-mac-bundle.mjs';
import { sha256File } from '../src/common.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = 'Workflow Pilot.app';
const ID = 'com.oleynik.WorkflowPilot';
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ': ' + (result.stderr || result.stdout).trim());
  return (result.stdout + '\n' + result.stderr).trim();
}


const UUID = /^[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/i;
export function macBootSessionUUID() {
  const uuid = run('/usr/sbin/sysctl', ['-n', 'kern.bootsessionuuid']);
  assert.match(uuid, UUID, 'macOS boot session UUID');
  return uuid;
}
export function macVolumeUUID(directory) {
  const uuid = run('/usr/bin/swift', ['-e',
    'import Foundation; let values = try URL(fileURLWithPath: CommandLine.arguments[1]).resourceValues(forKeys: [.volumeUUIDStringKey]); print(values.volumeUUIDString ?? "")',
    directory]);
  assert.match(uuid, UUID, 'App volume UUID');
  return uuid;
}

// Filesystem identity of an installed app directory, as recorded before a release and checked after it.
export async function macDirectoryIdentity(app, { volumeUUID = macVolumeUUID, bootSessionUUID = macBootSessionUUID } = {}) {
  const stat = await fs.stat(app);
  return { path: app, device: stat.dev, inode: stat.ino, volumeUUID: volumeUUID(app), bootSessionUUID: bootSessionUUID() };
}
// Device numbers may change between boots; volume UUID + inode identify the same directory.
// Records without a volume UUID (legacy receipts) can only be compared within the same boot.
export function assertSameMacDirectory(before, after, label) {
  if (before.volumeUUID) {
    assert.equal(after.volumeUUID, before.volumeUUID, 'App volume identity: ' + label);
    if (before.bootSessionUUID && before.bootSessionUUID === after.bootSessionUUID) assert.equal(after.device, before.device, 'App device: ' + label);
  } else assert.equal(after.device, before.device, 'App device (legacy record): ' + label);
  assert.equal(after.inode, before.inode, 'App inode: ' + label);
}

export async function verifyMacSignature({ bundle, identity, root = ROOT } = {}) {
  if (process.platform !== 'darwin') throw new Error('macOS signature verification requires macOS');
  const expected = identity ?? (await resolveMacSigning({ root, identity: process.env.WORKFLOW_PILOT_MAC_SIGNING_IDENTITY })).identity;
  const stat = await fs.lstat(bundle);
  const contents = await fs.lstat(path.join(bundle, 'Contents'));
  if (!stat.isDirectory() || stat.isSymbolicLink() || !contents.isDirectory() || contents.isSymbolicLink()) {
    throw new Error('Expected a real signed app directory');
  }
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', bundle]);
  const details = run('/usr/bin/codesign', ['--display', '--verbose=4', '--requirements', '-', bundle]);
  const field = name => details.match(new RegExp('^' + name + '=(.+)$', 'm'))?.[1];
  assert.equal(field('Identifier'), ID, 'Code signature identifier');
  assert.ok(!details.includes('Signature=adhoc'), 'A persistent certificate signature is required');
  assert.match(details, /^Sealed Resources version=\d+ rules=\d+ files=\d+$/m, 'Sealed resources are required');
  assert.ok(!details.includes('Info.plist=not bound'), 'Info.plist must be bound to the signature');
  const requirement = details.match(/^#?\s*designated => (.+)$/m)?.[1];
  assert.ok(requirement && !/\bcdhash\b/.test(requirement), 'Stable designated requirement is required');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-pilot-signature-'));
  try {
    const prefix = path.join(temporary, 'certificate-');
    run('/usr/bin/codesign', ['--display', '--extract-certificates=' + prefix, bundle]);
    const certificate = await fs.readFile(prefix + '0');
    const hash = createHash('sha1').update(certificate).digest('hex').toUpperCase();
    assert.equal(hash, expected.toUpperCase(), 'The bundle must use the explicitly selected certificate');
    const subject = new X509Certificate(certificate).subject;
    const team = subject.match(/^OU=(.+)$/m)?.[1];
    assert.ok(team, 'Certificate team is required');
    assert.equal(field('TeamIdentifier'), team, 'Code signature team must match the selected certificate');
    assert.match(field('CDHash') ?? '', /^[a-fA-F0-9]{40}$/, 'Code directory hash is required');
    return { identity: hash, teamId: team, identifier: ID, cdhash: field('CDHash'), requirement };
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

export async function checkInstalledMacSignatures({ root = ROOT } = {}) {
  const selected = await resolveMacSigning({ root, identity: process.env.WORKFLOW_PILOT_MAC_SIGNING_IDENTITY });
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const bootSessionUUID = macBootSessionUUID();
  const apps = [
    path.join(root, '.harness/runtime/build/Workflow Pilot-darwin-arm64', APP),
    path.join(root, APP),
    path.join('/Applications', APP),
  ];
  const proofs = [];
  for (const app of apps) {
    const actual = run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', path.join(app, 'Contents/Info.plist')]);
    assert.equal(actual, version, 'Installed version: ' + app);
    const signature = await verifyMacSignature({ bundle: app, identity: selected.identity });
    if (proofs.length) assert.deepEqual(signature, proofs[0].signature, 'Copied code signature: ' + app);
    proofs.push({ app, signature });
  }
  const preflight = JSON.parse(await fs.readFile(path.join(root, '.harness/runtime/release-' + version + '-preflight.json'), 'utf8'));
  const filesystemIdentities = [];
  for (const app of apps.slice(1)) {
    const before = preflight.find(entry => entry.path === app);
    const after = await macDirectoryIdentity(app, { bootSessionUUID: () => bootSessionUUID });
    if (before) assertSameMacDirectory(before, after, app);
    filesystemIdentities.push({ app, device: after.device, inode: after.inode, volumeUUID: after.volumeUUID });
  }
  const canonical = await fs.readFile(path.join(root,'release-manifest.json'));
  const manifest = JSON.parse(canonical);
  assert.equal(manifest.version, version);
  assert.deepEqual(manifest.macCodeSignature, proofs[0].signature);
  const artifact = manifest.artifacts.find(a=>a.os==='darwin');
  const release = path.join(root,'.harness/runtime/releases',version);
  const delivery = path.join(os.homedir(),'Downloads','WorkflowPilot-'+version);
  for(const directory of [release,delivery]) {
    assert.deepEqual(await fs.readFile(path.join(directory,'release-manifest.json')),canonical);
    assert.equal(await sha256File(path.join(directory,artifact.file)),artifact.sha256);
  }
  const deliveredZip = path.join(delivery,artifact.file);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-pilot-signed-zip-'));
  try {
    run('/usr/bin/ditto', ['-x', '-k', deliveredZip, temporary]);
    const signature = await verifyMacSignature({ bundle: path.join(temporary, APP), identity: selected.identity });
    assert.deepEqual(signature, proofs[0].signature, 'Delivered ZIP signature');
    proofs.push({ app: deliveredZip, signature });
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
  const result = { version, bootSessionUUID, proofs, filesystemIdentities, filesystemIdentityPreserved: true, deliveredZipSha256: artifact.sha256 };
  await fs.writeFile(path.join(root, '.harness/runtime/mac-signature-check.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkInstalledMacSignatures().then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
