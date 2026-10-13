import path from 'node:path';
import { verifyLinuxPackage } from './verify-linux-package.mjs';
import { createVerifiedArchive } from './release-archive.mjs';
import { artifactRecord } from './release-package.mjs';

export async function releaseLinux({root,version,directory,verify=verifyLinuxPackage}) {
  const source=path.join(root,'.harness/runtime/build/Workflow Pilot-linux-x64');
  const proof=await verify(source,{root,version});
  const archive=path.join(directory,'Workflow-Pilot-'+version+'-Linux-x64.tar.gz');
  await createVerifiedArchive({source,archive,format:'tar.gz'});
  return artifactRecord(archive,{platform:'Linux x64',os:'linux',arch:'x64',asarSha256:proof.asarSha256});
}
