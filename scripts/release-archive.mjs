import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { sha256File } from '../src/common.mjs';
const execute=promisify(execFile);

export async function packageInventory(root) {
  const realRoot=await fs.realpath(root), result={};
  for(const entry of await fs.readdir(root,{recursive:true,withFileTypes:true})) {
    const file=path.join(entry.parentPath,entry.name), relative=path.relative(root,file);
    if(entry.isSymbolicLink()) {
      const real=await fs.realpath(file);
      if(!real.startsWith(realRoot+path.sep))throw new Error('Package symlink escapes its root: '+relative);
      result[relative]={link:await fs.readlink(file)};
    } else if(entry.isFile()) result[relative]={sha256:await sha256File(file),mode:(await fs.stat(file)).mode&0o777};
    else if(!entry.isDirectory())throw new Error('Unsupported package entry: '+relative);
  }
  return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}

export async function verifyArchive({archive,source,format,run=execute}) {
  const temporary=await fs.mkdtemp(path.join(path.dirname(archive),'.verify-'));
  try {
    await run(format==='tar.gz'?'/usr/bin/tar':'/usr/bin/ditto',
      format==='tar.gz'?['-xzf',archive,'-C',temporary]:['-x','-k',archive,temporary],{timeout:180000,maxBuffer:1048576});
    const result=await packageInventory(path.join(temporary,path.basename(source)));
    if(!isDeepStrictEqual(result,await packageInventory(source)))throw new Error('Archive differs from staging');
    return {files:Object.keys(result).length};
  } finally {await fs.rm(temporary,{recursive:true,force:true});}
}

export async function createVerifiedArchive({source,archive,format='zip',run=execute}) {
  await fs.mkdir(path.dirname(archive),{recursive:true});
  await run(format==='tar.gz'?'/usr/bin/tar':'/usr/bin/ditto',format==='tar.gz'
    ?['-czf',archive,'-C',path.dirname(source),path.basename(source)]
    :['-c','-k','--keepParent','--norsrc',source,archive],{timeout:180000,maxBuffer:1048576,env:{...process.env,COPYFILE_DISABLE:'1'}});
  return verifyArchive({archive,source,format,run});
}
