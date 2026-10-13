import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RELEASE_MATRIX, sourceSnapshot, verifyPackagedSources, verifyReleaseDirectory, recordReleasePreflight } from './release-package.mjs';
import { verifyWindowsPackage } from './verify-windows-package.mjs';
import { verifyLinuxPackage } from './verify-linux-package.mjs';
import { verifyMacSignature, macDirectoryIdentity, assertSameMacDirectory } from './check-mac-signature.mjs';
import { installMacBundle, BACKUP_FOLDER } from './release-mac.mjs';
const ROOT=fileURLToPath(new URL('..',import.meta.url));

export async function releaseInputs({root=ROOT,deliveryDirectory}={}) {
  root=path.resolve(root);
  const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const delivery=deliveryDirectory??path.join(os.homedir(),'Downloads','WorkflowPilot-'+version);
  const release=path.join(root,'.harness/runtime/releases',version);
  const proof=await verifyReleaseDirectory(release,{version,root,canonical:true});
  const delivered=await verifyReleaseDirectory(delivery,{version,root,canonical:true});
  assert.equal(delivered.manifestSha256,proof.manifestSha256,'Staging/Downloads manifest');
  assert.deepEqual(await sourceSnapshot(root),proof.manifest.sources,'Source snapshot changed since build');
  return {root,version,release,delivery,...proof};
}

// Explicit T013 action. Uses only the ready staging bundle; no build/sign command.
export async function installPreparedRelease(options={}) {
  const input=await releaseInputs(options),{root,version,manifest}=input;
  const source=path.join(root,'.harness/runtime/build',RELEASE_MATRIX[0].folder);
  assert.deepEqual(await verifyMacSignature({bundle:source,root}),manifest.macCodeSignature);
  await verifyPackagedSources({root,resources:path.join(source,'Contents/Resources'),version,sources:manifest.sources});
  const apps=[path.join(root,'Workflow Pilot.app'),'/Applications/Workflow Pilot.app'];
  await recordReleasePreflight({root,version,apps});
  const installations=[];
  for(const target of apps)installations.push(await installMacBundle({source,target,version,
    backupRoot:path.join(root,'.harness/runtime',BACKUP_FOLDER),verifySignature:args=>verifyMacSignature({...args,root})}));
  return {ok:true,version,manifestSha256:input.manifestSha256,installations,noRebuild:true};
}
export async function verifyInstalledRelease(options={}) {
  const input=await releaseInputs(options),{root,version,manifest}=input;
  for(const row of RELEASE_MATRIX) {
    const folder=path.join(root,'.harness/runtime/build',row.folder);
    const proof=await verifyPackagedSources({root,resources:path.join(folder,row.resources),version,sources:manifest.sources});
    assert.equal(proof.asarSha256,manifest.artifacts.find(a=>a.os===row.os).asarSha256);
    if(row.id==='win')await verifyWindowsPackage(folder,{root});
    if(row.id==='linux')await verifyLinuxPackage(folder,{root,version,sources:manifest.sources});
  }
  const preflight=JSON.parse(await fs.readFile(path.join(root,'.harness/runtime','release-'+version+'-preflight.json'),'utf8'));
  const copies=[];
  const environment={...process.env};
  for(const key of ['NODE_OPTIONS','NODE_PATH','ELECTRON_RUN_AS_NODE'])delete environment[key];
  for(const app of [path.join(root,'Workflow Pilot.app'),'/Applications/Workflow Pilot.app']) {
    assert.equal((await fs.lstat(app)).isSymbolicLink(),false);
    const signature=await verifyMacSignature({bundle:app,root});
    assert.deepEqual(signature,manifest.macCodeSignature);
    const proof=await verifyPackagedSources({root,resources:path.join(app,'Contents/Resources'),version,sources:manifest.sources});
    assert.equal(proof.asarSha256,manifest.artifacts[0].asarSha256);
    const identity=await macDirectoryIdentity(app),before=preflight.find(p=>p.path===app);
    if(before)assertSameMacDirectory(before,identity,app);
    const binary=path.join(app,'Contents/MacOS/Workflow Pilot');
    const versions=JSON.parse(execFileSync(binary,['-p','JSON.stringify(process.versions)'],
      {encoding:'utf8',timeout:10000,env:{...environment,ELECTRON_RUN_AS_NODE:'1'}}));
    assert.equal(versions.electron,manifest.electron);assert.equal(versions.node,manifest.node);
    const node=path.join(app,'Contents/Resources/mac-tools/node/bin/node');
    assert.equal(execFileSync(node,['-p','process.version+" "+process.arch'],{encoding:'utf8',timeout:10000,env:environment}).trim(),'v'+manifest.node+' arm64');
    copies.push({app,signature,identity});
  }
  // No manifest write: stdout becomes the Workflow Kit check evidence.
  return {ok:true,version,manifestSha256:input.manifestSha256,copies,noRebuild:true,nativeWindowsTested:false,nativeLinuxTested:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const install=process.argv.slice(2);
  if(install.length&&(install.length!==1||install[0]!=='--install'))throw new Error('Expected --install or no arguments');
  (install.length?installPreparedRelease():verifyInstalledRelease()).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
