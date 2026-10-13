import { sha256File } from '../src/execution/files/adapter.mjs';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractFile, uncache } from '@electron/asar';
import { verifyMacSignature } from './check-mac-signature.mjs';
import { createVerifiedArchive } from './release-archive.mjs';

const APP = 'Workflow Pilot.app';
// Spotlight skips `.noindex` folders, so helper apps inside backups are not listed as applications.
export const BACKUP_FOLDER = 'release-backups.noindex';
// One slot per install target (repo root app, /Applications): it holds only the previous Contents.
export function backupSlot(backupRoot, target) {
  const resolved = path.resolve(target);
  const parent = path.basename(path.dirname(resolved)).replace(/[^A-Za-z0-9._-]+/g, '-');
  return path.join(backupRoot, 'mac-' + parent + '-' + createHash('sha256').update(resolved).digest('hex').slice(0, 12));
}
const BUNDLE_ID = 'com.oleynik.WorkflowPilot';
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();

async function existingStat(file) {
  try { return await fs.lstat(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function inspectBundle(bundle, version) {
  const stat = await fs.lstat(bundle);
  const contents = await fs.lstat(path.join(bundle, 'Contents'));
  if (!stat.isDirectory() || stat.isSymbolicLink() || !contents.isDirectory() || contents.isSymbolicLink()) {
    throw new Error('Expected a real app directory: ' + bundle);
  }
  const entries = await fs.readdir(bundle);
  if (entries.length !== 1 || entries[0] !== 'Contents') throw new Error('Unexpected app entries: ' + bundle);
  const plist = path.join(bundle, 'Contents/Info.plist');
  const field = name => run('/usr/libexec/PlistBuddy', ['-c', 'Print :' + name, plist]);
  const actualVersion = field('CFBundleShortVersionString');
  if (field('CFBundleIdentifier') !== BUNDLE_ID) throw new Error('Unexpected app identity: ' + bundle);
  const archive = path.join(bundle, 'Contents/Resources/app.asar');
  uncache(archive);
  const pkg = JSON.parse(extractFile(archive, 'package.json').toString());
  if (pkg.name !== 'workflow-pilot' || pkg.version !== actualVersion || (version && actualVersion !== version)) {
    throw new Error('App version mismatch: ' + bundle);
  }
  return { version: actualVersion, asarSha256: await sha256File(archive), plistSha256: await sha256File(plist) };
}

async function inspectSignedBundle(bundle, version, verifySignature) {
  return { ...await inspectBundle(bundle, version), signature: await verifySignature({ bundle }) };
}

function sameBundle(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Copied app does not match staging');
}

// Keep the outer directory: Finder aliases can retain its filesystem identity.
export async function installMacBundle({ source, target, backupRoot, version, verifySignature = verifyMacSignature }) {
  if (process.platform !== 'darwin') throw new Error('macOS release requires macOS');
  if (path.resolve(source) === path.resolve(target)) throw new Error('Source and target must differ');
  if (!target.endsWith('.app')) throw new Error('Target must be an app bundle');
  const expected = await inspectSignedBundle(source, version, verifySignature);
  const previous = await existingStat(target);
  if (previous) await inspectBundle(target);
  if(path.basename(target)!==APP)throw new Error('Target must use Workflow Pilot identity');
  await fs.mkdir(path.dirname(target), { recursive: true });
  const stage = await fs.mkdtemp(path.join(path.dirname(target), '.workflow-pilot-install-'));
  const stagedApp = path.join(stage, APP);
  const targetContents = path.join(target, 'Contents');
  let backup = null, oldMoved = false, newMoved = false, created = false, result;
  try {
    run('/usr/bin/ditto', [source, stagedApp]);
    sameBundle(await inspectSignedBundle(stagedApp, version, verifySignature), expected);
    if (previous) {
      await fs.mkdir(backupRoot, { recursive: true });
      backup = await fs.mkdtemp(path.join(backupRoot, 'mac-'));
      await fs.rename(targetContents, path.join(backup, 'Contents'));
      oldMoved = true;
    } else {
      await fs.mkdir(target);
      created = true;
    }
    await fs.rename(path.join(stagedApp, 'Contents'), targetContents);
    newMoved = true;
    sameBundle(await inspectSignedBundle(target, version, verifySignature), expected);
    const installed = await fs.stat(target);
    if (previous && (previous.dev !== installed.dev || previous.ino !== installed.ino)) {
      throw new Error('App directory identity changed');
    }
    result = { target, ...expected, device: installed.dev, inode: installed.ino, backup };
  } catch (error) {
    if (newMoved) await fs.rm(targetContents, { recursive: true });
    if (oldMoved) await fs.rename(path.join(backup, 'Contents'), targetContents);
    if (created) await fs.rmdir(target);
    throw error;
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
  if (backup) {
    // The new app is verified: its backup replaces this target's previous one. A failure here keeps
    // the temporary backup and never undoes the completed installation.
    const slot = backupSlot(backupRoot, target);
    try {
      await fs.rm(slot, { recursive: true, force: true });
      await fs.rename(backup, slot);
      result.backup = slot;
    } catch (error) { result.backupError = String(error?.message ?? error); }
  }
  return result;
}

// Packaging is deliberately separate from installMacBundle: a failed later
// platform must not have installed or delivered an earlier partial release.
export async function publishMacRelease({root,directory,verifySignature=verifyMacSignature}={}) {
  root=path.resolve(root??fileURLToPath(new URL('..',import.meta.url)));
  const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const source=path.join(root,'.harness/runtime/build/Workflow Pilot-darwin-arm64',APP);
  const proof=await inspectSignedBundle(source,version,verifySignature);
  directory??=path.join(root,'.harness/runtime/mac-package',version);
  const zip=path.join(directory,'Workflow-Pilot-'+version+'-macOS-arm64.zip');
  await createVerifiedArchive({source,archive:zip});
  return {version,zip,sha256:await sha256File(zip),size:(await fs.stat(zip)).size,proof};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  publishMacRelease().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
