import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const result=await build({entryPoints:[path.join(root,'src/frontend/plugin/app.mjs')],bundle:true,write:false,
  format:'iife',platform:'browser',target:'chrome120',minify:true,legalComments:'inline'});
const html=await fs.readFile(path.join(root,'src/frontend/plugin/index.html'),'utf8');
const notices=await Promise.all(['@openai/mcp-extensions','@modelcontextprotocol/ext-apps','@modelcontextprotocol/sdk','zod']
  .map(async name=>name+'\n'+await fs.readFile(path.join(root,'node_modules',name,'LICENSE'),'utf8')));
await fs.writeFile(path.join(root,'tools/codex-app-server-mcp/plugin-ui.html'),
  html.replace('<!-- plugin-script -->','<script>'+result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>')
  +'\n<!-- Bundled dependencies\n'+notices.join('\n\n').replace(/-->/g,'-- >')+'\n-->\n');
console.log('Workflow Pilot plugin UI staged.');
