import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../src/execution/files/adapter.mjs';
import { WINDOWS_RUNTIME_ARCHIVE, WINDOWS_RUNTIME_SHA256 } from '../src/execution/runtime/windows.mjs';
import { stageWorkflowKit, verifyWorkflowKitRuntime } from './stage-workflow-kit.mjs';
import { verifyMacSignature } from './check-mac-signature.mjs';
import { verifyWindowsPackage } from './verify-windows-package.mjs';
import { verifyLinuxPackage } from './verify-linux-package.mjs';
import { createVerifiedArchive, packageInventory } from './release-archive.mjs';
import { stageVendorNotices, verifyVendorNotices } from './stage-vendor-notices.mjs';
import { RELEASE_MATRIX, packageName, artifactRecord, assertCommittedSources, sourceSnapshot,
  verifyPackagedSources, verifyReleaseDirectory } from './release-package.mjs';
export * from './release-package.mjs';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const run=(command,args,cwd)=>new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd,stdio:'inherit',shell:false});
  child.once('error',reject);
  child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(command+' failed ('+(code??signal)+')')));
});
export async function buildPlatforms(root,execute=run) {
  for(const row of RELEASE_MATRIX)await execute('npm',['run','build:'+row.id],root);
}
const present=async file=>!!await fs.lstat(file).catch(e=>{if(e.code!=='ENOENT')throw e;});

// The last marker is the canonical byte-copy. Failed copies never expose an
// incomplete delivery directory, and neither installation nor GitHub runs here.
export async function publishReleaseSet({root,directory,delivery,version,verify=verifyReleaseDirectory}) {
  const proof=await verify(directory,{version}),canonical=path.join(root,'release-manifest.json');
  const bytes=await fs.readFile(path.join(directory,'release-manifest.json'));
  if(await present(canonical)&&!bytes.equals(await fs.readFile(canonical)))throw new Error('Canonical manifest already differs');
  if(await present(delivery)) {
    await verify(delivery,{version});
    if(!bytes.equals(await fs.readFile(path.join(delivery,'release-manifest.json'))))throw new Error('Delivery manifest differs');
  } else {
    await fs.mkdir(path.dirname(delivery),{recursive:true});
    const stage=await fs.mkdtemp(path.join(path.dirname(delivery),'.workflow-pilot-delivery-'));
    try {
      await fs.cp(directory,stage,{recursive:true});
      await verify(stage,{version});
      await fs.rename(stage,delivery);
    } finally {await fs.rm(stage,{recursive:true,force:true});}
  }
  const temporary=canonical+'.tmp';
  await fs.writeFile(temporary,bytes,{flag:'wx'});
  await fs.rename(temporary,canonical);
  return {...proof,delivery};
}
export async function releaseAll({root=ROOT,deliveryDirectory}={}) {
  if(process.platform!=='darwin')throw new Error('The three-platform release requires the macOS build host');
  root=path.resolve(root);
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')),version=pkg.version;
  if(pkg.name!=='workflow-pilot'||!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid release identity/version');
  const runtime=path.join(root,'.harness/runtime'),release=path.join(runtime,'releases',version);
  const delivery=deliveryDirectory??path.join(os.homedir(),'Downloads','WorkflowPilot-'+version);
  await fs.mkdir(path.dirname(release),{recursive:true});
  const lock=path.join(runtime,'workflow-pilot-release.lock');await fs.mkdir(lock);
  let stage;
  try {
    assertCommittedSources(root);
    const sourceCommit=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    if(await present(release)) {
      const proof=await verifyReleaseDirectory(release,{version});
      if(proof.manifest.sourceCommit!==sourceCommit)throw new Error('Existing release has another sourceCommit; do not rebuild or mix platforms');
      if(JSON.stringify(await sourceSnapshot(root))!==JSON.stringify(proof.manifest.sources))throw new Error('Existing release source snapshot differs');
      return publishReleaseSet({root,directory:release,delivery,version});
    }
    stage=await fs.mkdtemp(path.join(path.dirname(release),'.workflow-pilot-release-'));
    await stageWorkflowKit({root});
    await stageVendorNotices({root});
    const kit=await verifyWorkflowKitRuntime(path.join(root,'resources/workflow-kit'));
    const sources=await sourceSnapshot(root);
    await buildPlatforms(root);
    assertCommittedSources(root);
    if(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sourceCommit
      ||JSON.stringify(await sourceSnapshot(root))!==JSON.stringify(sources))throw new Error('Sources changed during build');
    const artifacts=[];let macCodeSignature;
    for(const row of RELEASE_MATRIX) {
      const folder=path.join(runtime,'build',row.folder),resources=path.join(folder,row.resources);
      const proof=await verifyPackagedSources({root,resources,version,sources});
      await verifyWorkflowKitRuntime(path.join(resources,'resources/workflow-kit'));
      await verifyVendorNotices(path.join(resources,'resources/vendor-notices'));
      if(row.id==='mac') {
        macCodeSignature=await verifyMacSignature({bundle:folder,root});
        // Signing deliberately leaves vendor binaries unchanged.
        const a=await packageInventory(path.join(runtime,'mac-tools')),b=await packageInventory(path.join(resources,'mac-tools'));
        if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('Mac toolchain differs from prepared payload');
      } else if(row.id==='win')await verifyWindowsPackage(folder,{root});
      else await verifyLinuxPackage(folder,{root,version,sources});
      for(const payload of row.id==='win'?['windows-payload','windows-node']:row.id==='linux'?['linux-tools']:[]) {
        if(JSON.stringify(await packageInventory(path.join(runtime,payload)))!==JSON.stringify(await packageInventory(path.join(resources,payload))))
          throw new Error('Packaged toolchain mismatch: '+payload);
      }
      const archive=path.join(stage,packageName(version,row));
      const archiveProof=await createVerifiedArchive({source:folder,archive,format:row.extension});
      artifacts.push(await artifactRecord(archive,{platform:row.platform,os:row.os,arch:row.arch,
        asarSha256:proof.asarSha256,packageFiles:archiveProof.files}));
    }
    const vendorSource=path.join(runtime,'windows-payload',WINDOWS_RUNTIME_ARCHIVE);
    if(await sha256File(vendorSource)!==WINDOWS_RUNTIME_SHA256)throw new Error('Windows vendor digest mismatch');
    await fs.copyFile(vendorSource,path.join(stage,WINDOWS_RUNTIME_ARCHIVE));
    const windowsRuntimeArchive=await artifactRecord(path.join(stage,WINDOWS_RUNTIME_ARCHIVE));
    await fs.writeFile(path.join(stage,'SHA256SUMS.txt'),[...artifacts,windowsRuntimeArchive].map(a=>a.sha256+'  '+a.file).join('\n')+'\n');
    await fs.writeFile(path.join(stage,'INSTALL.txt'),installationInstructions(version));
    const records=await Promise.all(['SHA256SUMS.txt','INSTALL.txt'].map(name=>artifactRecord(path.join(stage,name))));
    assertCommittedSources(root);
    if(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sourceCommit
      ||JSON.stringify(await sourceSnapshot(root))!==JSON.stringify(sources))throw new Error('Sources changed while packaging archives');
    const manifest={schemaVersion:2,version,sourceCommit,sourceFiles:Object.keys(sources).length,sources,
      locks:Object.fromEntries(Object.entries(sources).filter(([file])=>file==='package-lock.json'||file.endsWith('.lock')||file.endsWith('codex-tools.lock.json'))),
      electron:pkg.devDependencies.electron,node:pkg.engines.node,packagedSourceMatches:true,
      workflowKit:{version:kit.version,files:kit.files,sha256:kit.sha256},macCodeSignature,artifacts,windowsRuntimeArchive,records,
      nativeMacTested:false,nativeWindowsTested:false,nativeLinuxTested:false,cleanVmTested:false};
    await fs.writeFile(path.join(stage,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await verifyReleaseDirectory(stage,{version});
    await fs.rename(stage,release);stage=null;
    return publishReleaseSet({root,directory:release,delivery,version});
  } finally {if(stage)await fs.rm(stage,{recursive:true,force:true});await fs.rmdir(lock);}
}
export function installationInstructions(version) {
  return 'Workflow Pilot '+version+'\n\n'+
    'macOS arm64: распакуйте ZIP. Установка готового приложения выполняется отдельно, без пересборки. Подпись локальная Apple Development, не notarized.\n'+
    'Windows x64: распакуйте всю папку ZIP, запустите Workflow Pilot.exe. Требуется Codex CLI. Мастер подготовит локальные компоненты и собственный туннель.\n'+
    'Ubuntu 24.04 LTS x64: распакуйте tar.gz с сохранением прав, запустите ./Workflow\\ Pilot из папки приложения. Нужен обычный пользователь и сеанс Ubuntu on Xorg; python3, git, openssh-client, zenity и systemd --user. Wayland и ARM64 не поддерживаются. Sandbox не отключайте; ошибку sandbox сохраните для диагностики. Дополнительные библиотеки Electron должны быть установлены из репозитория Ubuntu.\n'+
    'На каждой ОС войдите в ChatGPT сами и добавьте собственный коннектор Workflow Pilot Local Mac/Windows/Linux. VPS без собственного маршрута показывает setup-required; можно использовать Secure MCP Tunnel.\n\n'+
    'Все три пакета собраны из одного sourceCommit. Native/VM/clean-install приёмка пользователем ещё не выполнена. Windows ARM64 и Apple Silicon UTM x64 требуют эмуляции; отдельного ARM64 Linux/Windows пакета нет.\n'+
    WINDOWS_RUNTIME_ARCHIVE+' — неизменённый vendor-архив v0.6.115 для сборки, не установщик старого продукта. Его историческое имя сохранено. Лицензии и ссылки на исходники компонентов находятся в resources/resources/vendor-notices.\n';
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  releaseAll().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
