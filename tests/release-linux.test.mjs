import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createPackage } from '@electron/asar';
import { getRuntimeRoot } from '@webpilot/workflow-kit';
import { verifyLinuxPackage, requireElfX64 } from '../scripts/verify-linux-package.mjs';
import { createVerifiedArchive, packageInventory } from '../scripts/release-archive.mjs';
import { copyLinuxToolchain } from '../scripts/copy-linux-toolchain.mjs';
import { LINUX_ASSETS } from '../src/execution/platform/linux/toolchain.mjs';
import { RELEASE_MATRIX, sourceSnapshot, verifyPackagedSources, artifactRecord, releaseAssetNames, verifyReleaseDirectory } from '../scripts/release-package.mjs';
import { publishReleaseSet, buildPlatforms } from '../scripts/release-all.mjs';
import { stageVendorNotices } from '../scripts/stage-vendor-notices.mjs';
import { WINDOWS_RUNTIME_ARCHIVE } from '../src/execution/runtime/windows.mjs';
import { WINDOWS_RUNTIME_URL } from '../scripts/prepare-windows-toolchain.mjs';
import { verifyGitHubRelease } from '../scripts/check-github-release.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
async function temporary(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'workflow-pilot-release Ω '));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;
}
async function write(root,file,bytes,mode) {
  const p=path.join(root,file);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,bytes);
  if(mode)await fs.chmod(p,mode);return p;
}
const elf=()=>{const b=Buffer.alloc(32);b.write('\x7fELF');b[4]=2;b[5]=1;b.writeUInt16LE(62,18);return b;};
async function packageFixture(t) {
  const root=await temporary(t),folder=path.join(root,'.harness/runtime/build/Workflow Pilot-linux-x64'),resources=path.join(folder,'resources');
  const pkg=JSON.stringify({name:'workflow-pilot',version:'0.1.0'});
  await write(root,'package.json',pkg);await write(root,'package-lock.json','{}');
  for(const file of ['package.json','index.mjs'])await write(root,'packages/workflow-kit/'+file,
    await fs.readFile(new URL('../packages/workflow-kit/'+file,import.meta.url)));
  for(const file of ['frontend/desktop/preload.cjs','frontend/desktop/ui/index.html','execution/browser/chatgpt-page-observer.mjs','main.mjs'])
    await write(root,'src/'+file,'fixture '+file);
  for(const file of ['workspace-setup-worker.mjs','project-doctor-worker.mjs','chatgpt-page-observer-preload.cjs'])
    await write(root,'resources/'+file,'fixture '+file);
  await fs.cp(getRuntimeRoot(),path.join(root,'resources/workflow-kit'),{recursive:true});
  for(const file of ['control.py','server.py','linux_desktop.py','linux_runtime.py','requirements-linux.lock'])
    await write(root,'tools/codex-app-server-mcp/'+file,'fixture '+file);
  const input=path.join(root,'input');await fs.cp(path.join(root,'src'),path.join(input,'src'),{recursive:true});
  await write(input,'package.json',pkg);await fs.mkdir(resources,{recursive:true});
  await fs.cp(getRuntimeRoot(),path.join(input,'node_modules/@webpilot/workflow-kit/src'),{recursive:true});
  for(const file of ['package.json','index.mjs'])await write(input,'node_modules/@webpilot/workflow-kit/'+file,
    await fs.readFile(path.join(root,'packages/workflow-kit',file)));
  await createPackage(input,path.join(resources,'app.asar'));
  await fs.cp(path.join(root,'resources'),path.join(resources,'resources'),{recursive:true});
  await fs.cp(path.join(root,'tools/codex-app-server-mcp'),path.join(resources,'codex-app-server-mcp'),{recursive:true});
  for(const name of ['Workflow Pilot','chrome-sandbox','chrome_crashpad_handler'])await write(folder,name,elf(),0o755);
  for(const name of ['LICENSE','LICENSES.chromium.html','icudtl.dat','resources.pak','v8_context_snapshot.bin'])await write(folder,name,'fixture');
  const manifest={platform:'linux',arch:'x64',tools:{}};
  for(const a of LINUX_ASSETS) {
    await write(resources,'linux-tools/'+a.id,elf(),0o755);
    manifest.tools[a.id]={path:a.id,archive_sha256:a.sha256,sha256:digest(elf())};
  }
  await write(resources,'linux-tools/manifest.json',JSON.stringify(manifest));
  return {root,folder,resources,input,version:'0.1.0'};
}
test('Linux package validates ELF, Kit, HTML/preload/workers/observer and tar bytes/modes without running Linux',async t=>{
  const f=await packageFixture(t),proof=await verifyLinuxPackage(f.folder,f);
  assert.equal(proof.nativeLinuxTested,false);
  const archive=path.join(f.root,'out','Workflow-Pilot-0.1.0-Linux-x64.tar.gz');
  const archiveProof=await createVerifiedArchive({source:f.folder,archive,format:'tar.gz'});
  const result=await artifactRecord(archive,{asarSha256:proof.asarSha256,packageFiles:archiveProof.files});
  assert.equal(result.file,'Workflow-Pilot-0.1.0-Linux-x64.tar.gz');
  assert(result.bytes>0);assert.match(result.sha256,/^[a-f0-9]{64}$/);
  const executable=path.join(f.folder,'Workflow Pilot');await fs.chmod(executable,0o644);
  await assert.rejects(verifyLinuxPackage(f.folder,f),/executable Linux x64/);await fs.chmod(executable,0o755);
  const wrong=elf();wrong.writeUInt16LE(183,18);await fs.writeFile(executable,wrong);
  await assert.rejects(requireElfX64(executable),/Linux x64/);
});
test('all three layouts reject missing observer/worker, stale Kit and external runtime data',async t=>{
  const f=await packageFixture(t);
  for(const row of RELEASE_MATRIX) {
    const resources=path.join(f.root,'layout',row.id,row.resources);await fs.cp(f.resources,resources,{recursive:true});
    if(row.id==='mac') {
      const upstream=path.join(f.root,'node_modules/electron/dist/Electron.app/Contents/Resources');
      for(const base of [upstream,resources]) {
        await write(base,'en.lproj/locale.pak','pinned Electron locale');
        await write(base,'electron.icns','pinned Electron icon');
      }
    }
    const options={...f,resources};
    await verifyPackagedSources(options);
    for(const file of ['resources/chatgpt-page-observer-preload.cjs','resources/workspace-setup-worker.mjs','resources/workflow-kit/cli.mjs']) {
      const original=await fs.readFile(path.join(resources,file));await fs.rm(path.join(resources,file));
      await assert.rejects(verifyPackagedSources(options));
      await fs.writeFile(path.join(resources,file),original);
    }
    await write(resources,'resources/private/key','secret');
    await assert.rejects(verifyPackagedSources(options),/Unexpected external/);
  }
  await write(f.input,'src/.env','TOKEN=secret');await createPackage(f.input,path.join(f.resources,'app.asar'));
  await assert.rejects(verifyPackagedSources(f),/Runtime or secret|fileset mismatch/);
});
test('Linux toolchain preserves relocatable links instead of fs.cp absolute source links',async t=>{
  const root=await temporary(t),source=path.join(root,'.harness/runtime/linux-tools');
  const resources=path.join(root,'.harness/runtime/build/Workflow Pilot-linux-x64/resources');
  await write(source,'python/bin/python3.13','fixture',0o755);
  await fs.symlink('python3.13',path.join(source,'python/bin/python3'));
  await fs.mkdir(resources,{recursive:true});
  const broken=path.join(resources,'linux-tools');
  await fs.cp(source,broken,{recursive:true});
  await assert.rejects(packageInventory(broken),/escapes/);
  const expected=await packageInventory(source);
  const result=await copyLinuxToolchain({root});
  assert.deepEqual(await packageInventory(result.destination),expected);
  assert.equal(await fs.readlink(path.join(result.destination,'python/bin/python3')),'python3.13');
  await fs.rm(source,{recursive:true});
  assert.equal(await fs.readFile(path.join(result.destination,'python/bin/python3'),'utf8'),'fixture');
  await createVerifiedArchive({source:result.destination,archive:path.join(root,'relocated.tar.gz'),format:'tar.gz'});
  await write(source,'tool','fixture');await fs.symlink('/etc/hosts',path.join(source,'foreign'));
  await assert.rejects(copyLinuxToolchain({root}),/escapes/);
  assert.deepEqual(await packageInventory(result.destination),expected);
});
test('archive copying preserves executable bits and internal links; escaping links are refused',async t=>{
  const root=await temporary(t),source=path.join(root,'Пакет с пробелами');
  await write(source,'bin/tool','fixture',0o755);await fs.symlink('bin/tool',path.join(source,'alias'));
  for(const format of ['zip','tar.gz'])await createVerifiedArchive({source,archive:path.join(root,'package.'+format),format});
  await fs.symlink('/etc/hosts',path.join(source,'foreign'));
  await assert.rejects(packageInventory(source),/escapes/);
});

async function releaseFixture(t, { root, version = '0.1.0' } = {}) {
  root ??= await temporary(t);
  const directory=path.join(root,'.harness/runtime/releases',version);
  await fs.mkdir(directory,{recursive:true});
  const artifacts=[];
  for(const [i,row]of RELEASE_MATRIX.entries()) {
    const file=releaseAssetNames(version)[i];await write(directory,file,row.id);
    artifacts.push(await artifactRecord(path.join(directory,file),{platform:row.platform,os:row.os,arch:row.arch,asarSha256:'a'.repeat(64)}));
  }
  await write(directory,WINDOWS_RUNTIME_ARCHIVE,'isolated vendor fixture');
  const windowsRuntimeArchive=await artifactRecord(path.join(directory,WINDOWS_RUNTIME_ARCHIVE));
  await write(directory,'SHA256SUMS.txt',[...artifacts,windowsRuntimeArchive].map(a=>a.sha256+'  '+a.file).join('\n')+'\n');
  await write(directory,'INSTALL.txt','Workflow Pilot '+version+'\n');
  const records=await Promise.all(['SHA256SUMS.txt','INSTALL.txt'].map(file=>artifactRecord(path.join(directory,file))));
  const manifest={schemaVersion:2,version,sourceCommit:'b'.repeat(40),packagedSourceMatches:true,artifacts,windowsRuntimeArchive,records};
  await write(directory,'release-manifest.json',JSON.stringify(manifest)+'\n');
  const verify=(dir,options)=>verifyReleaseDirectory(dir,{...options,windowsVendor:windowsRuntimeArchive});
  return {root,directory,version,manifest,verify,delivery:path.join(root,'Downloads/WorkflowPilot-'+version)};
}
test('complete set is delivered atomically, canonical manifest is byte-identical and excluded from source snapshot',async t=>{
  const f=await releaseFixture(t),before=await fs.readFile(path.join(f.directory,'release-manifest.json'));
  await publishReleaseSet(f);
  assert.deepEqual(await fs.readFile(path.join(f.root,'release-manifest.json')),before);
  assert.deepEqual(await fs.readFile(path.join(f.delivery,'release-manifest.json')),before);
  await f.verify(f.delivery,{version:f.version,root:f.root,canonical:true});
  await publishReleaseSet(f); // safe acknowledgement/retry, no rebuild
  await write(f.root,'release-manifest.json',before+'\n');
  await assert.rejects(f.verify(f.delivery,{version:f.version,root:f.root,canonical:true}),/byte mismatch/);
  const packaged=await packageFixture(t);
  const snapshot=await sourceSnapshot(packaged.root);await write(packaged.root,'release-manifest.json','future receipt');
  assert.deepEqual(await sourceSnapshot(packaged.root),snapshot);
});
test('missing platform, corrupt asset, stale manifest and copy failure never publish a partial set',async t=>{
  for(const fault of ['missing','corrupt','manifest','copy']) {
    const f=await releaseFixture(t),asset=path.join(f.directory,f.manifest.artifacts[2].file);
    if(fault==='missing')await fs.rm(asset);
    if(fault==='corrupt')await fs.writeFile(asset,'damaged');
    if(fault==='manifest') {
      f.manifest.artifacts.pop();await write(f.directory,'release-manifest.json',JSON.stringify(f.manifest));
    }
    if(fault==='copy') {
      const verify=f.verify;f.verify=(dir,opts)=>dir===f.directory?verify(dir,opts):Promise.reject(new Error('copy verification failure'));
    }
    await assert.rejects(publishReleaseSet(f));
    await assert.rejects(fs.stat(f.delivery),{code:'ENOENT'});
    await assert.rejects(fs.stat(path.join(f.root,'release-manifest.json')),{code:'ENOENT'});
  }
});

test('a new version advances canonical manifest only after preserving and verifying the previous complete release',async t=>{
  const old=await releaseFixture(t);await publishReleaseSet(old);
  const previous=await fs.readFile(path.join(old.root,'release-manifest.json'));
  const next=await releaseFixture(t,{root:old.root,version:'0.1.1'});
  await publishReleaseSet(next);
  await next.verify(next.delivery,{version:'0.1.1',root:old.root,canonical:true});
  assert.deepEqual(await fs.readFile(path.join(old.delivery,'release-manifest.json')),previous);
  assert.deepEqual(await fs.readFile(path.join(old.directory,'release-manifest.json')),previous);
  await assert.rejects(publishReleaseSet(old),/version must increase/);
});

test('failed release advancement leaves canonical and previous delivery intact',async t=>{
  for(const fault of ['previous-corrupt','previous-manifest','new-copy','canonical-symlink']) {
    const old=await releaseFixture(t);await publishReleaseSet(old);
    const previous=await fs.readFile(path.join(old.root,'release-manifest.json'));
    const next=await releaseFixture(t,{root:old.root,version:'0.1.1'});
    if(fault==='previous-corrupt')await write(old.directory,old.manifest.artifacts[0].file,'damaged');
    if(fault==='previous-manifest')await write(old.root,'release-manifest.json',previous+'\n');
    if(fault==='new-copy') {
      const verify=next.verify;
      next.verify=(dir,opts)=>[next.directory,old.directory].includes(dir)?verify(dir,opts):Promise.reject(new Error('copy verification failure'));
    }
    if(fault==='canonical-symlink') {
      await fs.rm(path.join(old.root,'release-manifest.json'));
      await fs.symlink(path.join(old.directory,'release-manifest.json'),path.join(old.root,'release-manifest.json'));
    }
    const canonicalBefore=await fs.readFile(path.join(old.root,'release-manifest.json'));
    await assert.rejects(publishReleaseSet(next));
    assert.deepEqual(await fs.readFile(path.join(old.root,'release-manifest.json')),canonicalBefore);
    assert.deepEqual(await fs.readFile(path.join(old.delivery,'release-manifest.json')),previous);
    await assert.rejects(fs.stat(next.delivery),{code:'ENOENT'});
  }
});
test('unknown platform result stops the sequence and notices use pinned bytes',async t=>{
  const seen=[];
  await assert.rejects(buildPlatforms('/fixture',async(_,args)=>{seen.push(args[1]);if(args[1]==='build:win')throw new Error('UNKNOWN');}),/UNKNOWN/);
  assert.deepEqual(seen,['build:mac','build:win']);
  const root=await temporary(t),data='upstream fixture',assets=[{file:'LICENSE.txt',url:'https://example.invalid/pinned',sha256:digest(data)}];
  await assert.rejects(stageVendorNotices({root,assets,download:async(_,file)=>fs.writeFile(file,'wrong')}),/SHA-256/);
  await stageVendorNotices({root,assets,download:async(_,file)=>fs.writeFile(file,data)});
  await stageVendorNotices({root,assets,download:()=>assert.fail('verified cache must be reused')});
});

test('GitHub verification checks own origin, all seven digests, tag and immutable canonical manifest without writing',async t=>{
  const f=await releaseFixture(t);
  await write(f.root,'package.json',JSON.stringify({version:f.version}));
  await publishReleaseSet(f);
  const before=await fs.readFile(path.join(f.root,'release-manifest.json'));
  const assets=await Promise.all(releaseAssetNames(f.version).map(async name=>{
    const a=await artifactRecord(path.join(f.delivery,name));return {name,size:a.bytes,digest:'sha256:'+a.sha256};
  }));
  const options={root:f.root,deliveryDirectory:f.delivery,verify:f.verify,
    execute:(_,args)=>args[0]==='remote'?'https://github.com/OleynikAleksandr/Workflow_Pilot.git':'c'.repeat(40),
    ref:name=>name==='refs/heads/main'?'c'.repeat(40):f.manifest.sourceCommit,
    api:async route=>{assert.equal(route,'/repos/OleynikAleksandr/Workflow_Pilot/releases/tags/v0.1.0');
      return {tag_name:'v0.1.0',draft:false,prerelease:false,assets};}};
  assert.equal((await verifyGitHubRelease(options)).assets.length,7);
  await assert.rejects(verifyGitHubRelease({...options,execute:()=> 'https://github.com/OleynikAleksandr/Project-Web-Pilot.git'}),/repository/);
  assets[2].digest='sha256:'+'0'.repeat(64);
  await assert.rejects(verifyGitHubRelease(options),/digest/);
  assert.deepEqual(await fs.readFile(path.join(f.root,'release-manifest.json')),before);
});
test('build tools use own identity and frozen Windows vendor provenance, never legacy state or force-push',async()=>{
  assert.equal(WINDOWS_RUNTIME_URL,'https://github.com/OleynikAleksandr/Project-Web-Pilot/releases/download/v0.6.115/'+WINDOWS_RUNTIME_ARCHIVE);
  for(const name of ['release-all','release-mac','check-installed-release','check-github-release','sign-mac-bundle','prepare-windows-toolchain']) {
    const source=await fs.readFile(new URL('../scripts/'+name+'.mjs',import.meta.url),'utf8');
    assert.doesNotMatch(source,/WEB_PILOT_|\.web-pilot-|force-with-lease|releases\/latest|\/Applications\/Project Web Pilot/);
  }
});
