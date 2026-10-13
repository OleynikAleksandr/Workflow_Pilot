import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Consume the ACTUAL archive listing, not the packaging configuration.
export function verifyPackageEntries(entries,allowed=['package.json','dist/','node_modules/']) {
 if(!Array.isArray(entries)||!entries.length)throw new Error('Empty artifact listing');
 const normalized=entries.map(raw=>raw.replaceAll('\\','/').replace(/^\/+/,''));
 const forbidden=normalized.filter(p=>p.split('/').some(part=>['.harness','.git','.codex','auth.json','config.toml','settings.json','Cookies'].includes(part)||/^\.env(?:\.|$)/.test(part))||/(?:^|\/)scripts\/workflow(?:\.|\/|$)/.test(p)||p.split('/').includes('..'));
 if(forbidden.length)throw new Error('Private state or workflow code in artifact: '+forbidden.join(', '));
 const unexpected=normalized.filter(p=>!allowed.some(a=>p===a.replace(/\/$/,'')||(a.endsWith('/')&&p.startsWith(a))));
 if(unexpected.length)throw new Error('Files outside runtime allowlist: '+unexpected.join(', '));
 if(!normalized.includes('package.json'))throw new Error('Missing package.json');
 return {ok:true,entries:normalized.length,privateState:'absent'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const entries=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(Boolean);
 console.log(JSON.stringify(verifyPackageEntries(entries)));
}
