import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { LINUX_ASSETS } from '../src/execution/platform/linux/toolchain.mjs';
import { verifyLinuxTools } from '../src/execution/platform/linux/runtime.mjs';
const execute=promisify(execFile),ROOT=fileURLToPath(new URL('..',import.meta.url));
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
async function binaries(root,name) {
  const result=[];
  for(const entry of await fs.readdir(root,{withFileTypes:true})) {
    const file=path.join(root,entry.name);
    if(entry.isDirectory())result.push(...await binaries(file,name));
    else if(entry.isFile()&&entry.name===name)result.push(file);
  }
  return result;
}
export async function prepareLinuxToolchain({root=ROOT,run=execute,assets=LINUX_ASSETS,download=async(url,file)=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error('Linux download HTTP '+response.status);
  await fs.writeFile(file,Buffer.from(await response.arrayBuffer()));
}}={}) {
  const cache=path.join(root,'.harness/runtime/linux-cache'),output=path.join(root,'.harness/runtime/linux-tools');
  await fs.mkdir(cache,{recursive:true});const stage=await fs.mkdtemp(path.join(cache,'stage-'));
  const manifest={schema_version:1,platform:'linux',arch:'x64',tools:{}};
  try {
    for(const asset of assets) {
      const name=decodeURIComponent(new URL(asset.url).pathname.split('/').at(-1)),archive=path.join(cache,name);
      if(await hash(archive).catch(()=>null)!==asset.sha256) {
        const temporary=archive+'.download';
        try {await download(asset.url,temporary);if(await hash(temporary)!==asset.sha256)throw new Error(asset.id+' archive SHA-256 mismatch');await fs.rename(temporary,archive);}
        finally {await fs.rm(temporary,{force:true});}
      }
      const folder=path.join(stage,asset.id);await fs.mkdir(folder);
      const zip=name.endsWith('.zip');
      const listing=await run(zip?'/usr/bin/unzip':'/usr/bin/tar',zip?['-Z1',archive]:['-tf',archive],{maxBuffer:8*1024*1024});
      if(listing.stdout.split('\n').some(file=>file.startsWith('/')||file.split('/').includes('..')))throw new Error('Unsafe archive path');
      await run(zip?'/usr/bin/unzip':'/usr/bin/tar',zip?['-q',archive,'-d',folder]:['-xf',archive,'-C',folder],{timeout:120000,maxBuffer:1024*1024});
      const matches=await binaries(folder,asset.binary);
      if(matches.length!==1)throw new Error('Missing or ambiguous Linux binary '+asset.id);
      const file=matches[0];await fs.chmod(file,0o755);
      manifest.tools[asset.id]={path:path.relative(stage,file),version:asset.version,archive_sha256:asset.sha256,sha256:await hash(file)};
    }
    await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    // Never execute Linux payload while preparing it on macOS.
    if(assets===LINUX_ASSETS)await verifyLinuxTools(stage);
    await fs.rm(output,{recursive:true,force:true});await fs.rename(stage,output);
    return {output,manifest};
  } finally {await fs.rm(stage,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  prepareLinuxToolchain().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
