import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../src/common.mjs';
const ROOT=fileURLToPath(new URL('..',import.meta.url));
const uv=(version,name,sha256)=>({file:'uv-'+version+'-'+name+'.txt',url:'https://raw.githubusercontent.com/astral-sh/uv/'+version+'/LICENSE-'+name,sha256});
export const NOTICE_ASSETS=[
  ...['0.9.13','0.12.12'].flatMap(version=>[
    uv(version,'MIT','860e3d7a86b84e6a7012c7a635fc64df475cebc6cce34dfeb73a5982ec58176c'),
    uv(version,'APACHE','c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4')]),
  {file:'codex-0.162.1-LICENSE.txt',url:'https://raw.githubusercontent.com/openai/codex/rust-v0.162.1/LICENSE',sha256:'d17f227e4df5da1600391338865ce0f3055211760a36688f816941d58232d8dc'},
  {file:'codex-0.162.1-NOTICE.txt',url:'https://raw.githubusercontent.com/openai/codex/rust-v0.162.1/NOTICE',sha256:'9d71575ecfd9a843fc1677b0efb08053c6ba9fd686a0de1a6f5382fd3c220915'},
  {file:'python-xlib-0.33-LICENSE.txt',url:'https://raw.githubusercontent.com/python-xlib/python-xlib/0.33/LICENSE',sha256:'0640c7a235c536e10f85b808fdc36a2414a02e8ce4215624dc0c42f182ada961'},
  {file:'python-xlib-0.33.tar.gz',url:'https://files.pythonhosted.org/packages/source/p/python-xlib/python-xlib-0.33.tar.gz',sha256:'55af7906a2c75ce6cb280a584776080602444f75815a7aff4d287bb2d7018b32'},
];
export async function stageVendorNotices({root=ROOT,assets=NOTICE_ASSETS,download=async(url,file)=>{
  const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error('Notice download HTTP '+r.status);
  await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));
}}={}) {
  const directory=path.join(root,'resources/vendor-notices');
  await fs.mkdir(directory,{recursive:true});
  for(const asset of assets) {
    const file=path.join(directory,asset.file);
    if(await sha256File(file).catch(()=>null)===asset.sha256)continue;
    const temporary=file+'.download';
    try {
      await download(asset.url,temporary);
      if(await sha256File(temporary)!==asset.sha256)throw new Error('Notice SHA-256 mismatch: '+asset.file);
      await fs.rename(temporary,file);
    } finally {await fs.rm(temporary,{force:true});}
  }
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({assets},null,2)+'\n');
  return {files:assets.length,directory};
}
export async function verifyVendorNotices(root) {
  const names=(await fs.readdir(root)).sort();
  if(JSON.stringify(names)!==JSON.stringify([...NOTICE_ASSETS.map(a=>a.file),'manifest.json'].sort()))throw new Error('Unexpected vendor notice files');
  if(JSON.stringify(JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8')).assets)!==JSON.stringify(NOTICE_ASSETS))
    throw new Error('Vendor notices manifest mismatch');
  for(const a of NOTICE_ASSETS)if(await sha256File(path.join(root,a.file))!==a.sha256)throw new Error('Invalid vendor notice: '+a.file);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  stageVendorNotices().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
