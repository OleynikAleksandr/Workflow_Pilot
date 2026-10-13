import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPackagedSources } from './release-package.mjs';
import { verifyLinuxTools } from '../src/execution/platform/linux/runtime.mjs';
import { verifyWorkflowKitRuntime } from './stage-workflow-kit.mjs';
import { packageInventory } from './release-archive.mjs';
const ROOT=fileURLToPath(new URL('..',import.meta.url));

export async function requireElfX64(file) {
  const handle=await fs.open(file,'r');
  try {
    const data=Buffer.alloc(20);await handle.read(data,0,20,0);
    const stat=await handle.stat();
    if(data.subarray(0,4).toString('hex')!=='7f454c46'||data[4]!==2||data[5]!==1||data.readUInt16LE(18)!==62||!(stat.mode&0o111))
      throw new Error('Expected executable Linux x64 ELF: '+file);
  } finally {await handle.close();}
}
export async function verifyLinuxPackage(packageDir=path.join(ROOT,'.harness/runtime/build/Workflow Pilot-linux-x64'),
  {root=ROOT,version,sources}={}) {
  version??=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
  const resources=path.join(packageDir,'resources');
  const proof=await verifyPackagedSources({root,resources,version,sources});
  for(const file of ['Workflow Pilot','chrome-sandbox','chrome_crashpad_handler'])await requireElfX64(path.join(packageDir,file));
  for(const file of ['LICENSE','LICENSES.chromium.html','icudtl.dat','resources.pak','v8_context_snapshot.bin'])
    if(!(await fs.stat(path.join(packageDir,file))).size)throw new Error('Empty Linux resource: '+file);
  const payload=await verifyLinuxTools(path.join(resources,'linux-tools'));
  for(const binary of Object.values(payload.tools))await requireElfX64(binary);
  const kit=await verifyWorkflowKitRuntime(path.join(resources,'resources/workflow-kit'));
  await packageInventory(packageDir);
  return {...proof,workflowKit:{version:kit.version,files:kit.files,sha256:kit.sha256},tools:payload.manifest,nativeLinuxTested:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  verifyLinuxPackage(process.argv[2]).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
