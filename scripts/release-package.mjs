import { sha256File } from '../src/execution/files/adapter.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { extractFile, listPackage, statFile, uncache } from '@electron/asar';
import { macDirectoryIdentity } from './check-mac-signature.mjs';
import { WINDOWS_RUNTIME_ARCHIVE, WINDOWS_RUNTIME_SHA256 } from '../src/execution/runtime/windows.mjs';
import { packageInventory } from './release-archive.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
// The release records HEAD as its source commit, so everything it packages must already be committed.
export const COMMITTED_SOURCE_PATHS = ['src', 'resources', 'tools/codex-app-server-mcp', 'package.json', 'package-lock.json', 'LICENSE', 'scripts', 'packages/workflow-kit'];
export function assertCommittedSources(root, execute = (command, args) => execFileSync(command, args, { encoding: 'utf8' })) {
  const changed = execute('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all', '--', ...COMMITTED_SOURCE_PATHS]).trim();
  if (changed) throw new Error('Packaged sources have uncommitted changes; commit them before the release:\n' + changed);
}
// Identity of both installed copies before the build; the installed-release check compares against it.
export async function recordReleasePreflight({ root, version, apps, identity = macDirectoryIdentity }) {
  const file = path.join(root, '.harness/runtime', `release-${version}-preflight.json`);
  if (await fs.stat(file).catch(e => { if (e.code !== 'ENOENT') throw e; })) return file; // The first record of this version wins.
  const records = [];
  for (const app of apps) if (await fs.stat(app).catch(e => { if (e.code !== 'ENOENT') throw e; })) records.push(await identity(app));
  await fs.writeFile(file, JSON.stringify(records, null, 2) + '\n');
  return file;
}
// Everything electron-packager may take from the project root; package.json --ignore allows exactly these.
export const PACKAGED_ROOTS = new Set(['src', 'node_modules', 'package.json', 'LICENSE']);
// Every file of a GitHub Release. The pinned archive of Windows components ships next to the packages,
// so a fresh clone can build the Windows package without a private folder.
export const RELEASE_MATRIX = Object.freeze([
  { id:'mac', platform:'macOS arm64', os:'darwin', arch:'arm64', folder:'Workflow Pilot-darwin-arm64/Workflow Pilot.app', resources:'Contents/Resources', extension:'zip', suffix:'macOS-arm64' },
  { id:'win', platform:'Windows x64', os:'win32', arch:'x64', folder:'Workflow Pilot-win32-x64', resources:'resources', extension:'zip', suffix:'Windows-x64' },
  { id:'linux', platform:'Linux x64', os:'linux', arch:'x64', folder:'Workflow Pilot-linux-x64', resources:'resources', extension:'tar.gz', suffix:'Linux-x64' },
]);
export const packageName = (version, row) => 'Workflow-Pilot-'+version+'-'+row.suffix+'.'+row.extension;
export const releaseAssetNames = version => [...RELEASE_MATRIX.map(row=>packageName(version,row)),
  WINDOWS_RUNTIME_ARCHIVE, 'SHA256SUMS.txt', 'INSTALL.txt', 'release-manifest.json'];
export async function files(folder) {
  return (await fs.readdir(folder, { recursive: true, withFileTypes: true }))
    .filter(e => e.isFile() && e.name !== '.DS_Store')
    .map(e => path.relative(folder, path.join(e.parentPath, e.name))).sort();
}
export async function sourceSnapshot(root) {
  const result = {};
  for(const file of ['LICENSE','packages/workflow-kit/package.json','packages/workflow-kit/index.mjs']) {
    try {result[file]=await sha256File(path.join(root,file));}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  const codexExecutor = await files(path.join(root, 'tools', 'codex-app-server-mcp'))
    .then(list => list.filter(file => !file.includes('__pycache__') && !file.endsWith('.pyc'))
      .map(file => 'tools/codex-app-server-mcp/' + file));
  for (const file of ['package.json', 'package-lock.json', ...await files(path.join(root, 'src')).then(a => a.map(f => 'src/' + f)),
    ...await files(path.join(root, 'resources')).then(a => a.map(f => 'resources/' + f)), ...codexExecutor])
    result[file] = await sha256File(path.join(root, file));
  return result;
}
export async function verifyPackagedSources({ root, resources, version, sources }) {
  sources ??= await sourceSnapshot(root);
  const allowed=new Set(['app.asar','resources','codex-app-server-mcp','mac-tools','windows-payload','windows-node','linux-tools']);
  if(path.basename(resources)==='Resources'&&path.basename(path.dirname(resources))==='Contents') {
    const upstream=path.join(root,'node_modules/electron/dist/Electron.app/Contents/Resources');
    for(const name of await fs.readdir(upstream)) {
      if(name==='default_app.asar')continue;
      if(name!=='electron.icns'&&!/^[\w-]+\.lproj$/.test(name))throw new Error('Unexpected Electron resource: '+name);
      const source=path.join(upstream,name),target=path.join(resources,name);
      const expected=await fs.lstat(source),actual=await fs.lstat(target);
      if(expected.isSymbolicLink()||actual.isSymbolicLink()||expected.isDirectory()!==actual.isDirectory())
        throw new Error('Electron resource type mismatch: '+name);
      const matches=expected.isDirectory()
        ?isDeepStrictEqual(await packageInventory(source),await packageInventory(target))
        :expected.isFile()&&actual.isFile()&&await sha256File(source)===await sha256File(target);
      if(!matches)throw new Error('Electron resource mismatch: '+name);
      allowed.add(name);
    }
  }
  for(const entry of await fs.readdir(resources))if(!allowed.has(entry))throw new Error('Unexpected package resources: '+entry);
  const asar = path.join(resources, 'app.asar');
  uncache(asar);
  const pkg = JSON.parse(extractFile(asar, 'package.json'));
  if (pkg.name !== 'workflow-pilot' || pkg.version !== version) throw new Error('Package version mismatch: ' + resources);
  const expectedPackage = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  for (const field of ['private', 'scripts', 'devDependencies']) delete expectedPackage[field];
  if (!isDeepStrictEqual(pkg, expectedPackage)) throw new Error('Packaged runtime manifest mismatch');
  for (const [file, expected] of Object.entries(sources)) {
    if (file === 'package-lock.json' || file === 'package.json') continue; // Development metadata is pruned; runtime fields are checked above.
    let actual;
    if(file==='packages/workflow-kit/package.json') {
      const clean=value=>{for(const key of ['private','scripts','devDependencies'])delete value[key];return value;};
      if(!isDeepStrictEqual(clean(JSON.parse(extractFile(asar,'node_modules/@webpilot/workflow-kit/package.json'))),
        clean(JSON.parse(await fs.readFile(path.join(root,file),'utf8')))))throw new Error('Packaged Kit manifest mismatch');
      continue;
    }
    if(file.startsWith('packages/workflow-kit/'))actual=digest(extractFile(asar,'node_modules/@webpilot/workflow-kit/'+file.slice('packages/workflow-kit/'.length)));
    else if (file.startsWith('resources/')) actual = await sha256File(path.join(resources, file));
    else if (file.startsWith('tools/codex-app-server-mcp/')) {
      const relative = file.slice('tools/codex-app-server-mcp/'.length);
      actual = await sha256File(path.join(resources, 'codex-app-server-mcp', relative));
    } else actual = digest(extractFile(asar, file));
    if (actual !== expected) throw new Error('Packaged source mismatch: ' + file);
  }
  if (listPackage(asar).some(f => f.split('/').some(part=>part.toLowerCase().endsWith('.app')))) throw new Error('Nested app in package');
  // Only the application itself ships: a stray folder in the workspace must stop the release.
  const foreign = [...new Set(listPackage(asar).map(entry => entry.split(/[\\/]/).filter(Boolean)[0]))]
    .filter(top => top && !PACKAGED_ROOTS.has(top));
  if (foreign.length) throw new Error('Unexpected files in package: ' + foreign.join(', '));
  const entries = listPackage(asar);
  const actualSrc=entries.filter(f=>f.startsWith('/src/')&&!statFile(asar,f.slice(1)).files).map(f=>f.slice(1)).sort();
  if(!isDeepStrictEqual(actualSrc,Object.keys(sources).filter(f=>f.startsWith('src/')).sort()))
    throw new Error('Packaged src fileset mismatch');
  for(const [file,expected]of Object.entries(sources).filter(([f])=>f.startsWith('resources/workflow-kit/'))) {
    const member='node_modules/@webpilot/workflow-kit/src/'+file.slice('resources/workflow-kit/'.length);
    if(digest(extractFile(asar,member))!==expected)throw new Error('Packaged Kit dependency mismatch: '+member);
  }
  if(entries.some(f=>/(?:^|\/)(?:\.env(?:\..*)?|\.harness|\.git|\.codex|private|cookies|runtime-state)(?:\/|$)/i.test(f)))
    throw new Error('Runtime or secret files in package');
  for(const base of ['resources','codex-app-server-mcp']) {
    const prefix=base==='resources'?'resources/':'tools/codex-app-server-mcp/';
    const expected=Object.keys(sources).filter(f=>f.startsWith(prefix)).map(f=>f.slice(prefix.length)).sort();
    if(!isDeepStrictEqual(await files(path.join(resources,base)),expected))throw new Error('Unexpected external resources: '+base);
  }
  return { version: pkg.version, asarSha256: await sha256File(asar) };
}

export async function artifactRecord(file, extra={}) {
  const stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||!stat.size)throw new Error('Invalid artifact: '+file);
  return {...extra,file:path.basename(file),bytes:stat.size,sha256:await sha256File(file)};
}
export async function verifyReleaseDirectory(directory,{version,root,canonical=false,
  windowsVendor={file:WINDOWS_RUNTIME_ARCHIVE,sha256:WINDOWS_RUNTIME_SHA256}}={}) {
  const manifestFile=path.join(directory,'release-manifest.json'),bytes=await fs.readFile(manifestFile);
  const m=JSON.parse(bytes);
  if(m.schemaVersion!==2||m.version!==version||!m.packagedSourceMatches||!/^[a-f0-9]{40}$/.test(m.sourceCommit??''))throw new Error('Invalid release manifest');
  if(!isDeepStrictEqual(m.artifacts?.map(a=>[a.platform,a.os,a.arch,a.file]),
    RELEASE_MATRIX.map(r=>[r.platform,r.os,r.arch,packageName(version,r)])))throw new Error('Incomplete release matrix');
  if(m.windowsRuntimeArchive?.file!==windowsVendor.file||m.windowsRuntimeArchive.sha256!==windowsVendor.sha256)
    throw new Error('Invalid Windows vendor archive');
  const records=[...m.artifacts,m.windowsRuntimeArchive,...(m.records??[])];
  if(!isDeepStrictEqual(records.map(a=>a.file).sort(),releaseAssetNames(version).filter(n=>n!=='release-manifest.json').sort()))
    throw new Error('Incomplete release assets');
  if(!isDeepStrictEqual((await fs.readdir(directory)).sort(),releaseAssetNames(version).sort()))throw new Error('Unexpected release files');
  for(const record of records) {
    const actual=await artifactRecord(path.join(directory,record.file));
    if(actual.bytes!==record.bytes||actual.sha256!==record.sha256)throw new Error('Artifact mismatch: '+record.file);
  }
  const sums=[...m.artifacts,m.windowsRuntimeArchive].map(a=>a.sha256+'  '+a.file).join('\n')+'\n';
  if(await fs.readFile(path.join(directory,'SHA256SUMS.txt'),'utf8')!==sums)throw new Error('Checksum list mismatch');
  if(canonical&&(!root||!bytes.equals(await fs.readFile(path.join(root,'release-manifest.json')))))throw new Error('Canonical manifest byte mismatch');
  return {manifest:m,manifestSha256:digest(bytes)};
}
