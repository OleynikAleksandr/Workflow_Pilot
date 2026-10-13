import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { packageInventory } from './release-archive.mjs';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
export async function copyLinuxToolchain({root=ROOT}={}) {
  const source=path.join(root,'.harness/runtime/linux-tools');
  const resources=path.join(root,'.harness/runtime/build/Workflow Pilot-linux-x64/resources');
  const destination=path.join(resources,'linux-tools');
  const expected=await packageInventory(source);
  if(!(await fs.lstat(resources)).isDirectory())throw new Error('Linux package resources must be a directory');
  await fs.rm(destination,{recursive:true,force:true});
  // Packager 20.3 extraResource uses fs.cp defaults, which rewrite links to absolute source paths.
  await fs.cp(source,destination,{recursive:true,dereference:false,verbatimSymlinks:true});
  if(!isDeepStrictEqual(await packageInventory(destination),expected))throw new Error('Copied Linux toolchain differs from prepared payload');
  return {destination,files:Object.keys(expected).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  copyLinuxToolchain().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
