import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export function pluginHtml(html,script,notices=[]) {
  const marker='<!-- plugin-script -->';
  if(html.split(marker).length!==2)throw new Error('Expected exactly one plugin script marker');
  const escaped=script.replace(/<\/script/gi,'<\\/script');
  new Script(escaped,{filename:'workflow-pilot-plugin.js'});
  // A replacement string interprets $&, $`, $' and $$ inside bundled SDK code.
  // A callback inserts the complete script literally.
  return html.replace(marker,()=>'<script>'+escaped+'</script>')
    +'\n<!-- Bundled dependencies\n'+notices.join('\n\n').replace(/-->/g,'-- >')+'\n-->\n';
}
export async function stageChatgptPlugin() {
const result=await build({entryPoints:[path.join(root,'src/frontend/plugin/app.mjs')],bundle:true,write:false,
  format:'iife',platform:'browser',target:'chrome120',minify:true,legalComments:'inline'});
const html=await fs.readFile(path.join(root,'src/frontend/plugin/index.html'),'utf8');
const notices=await Promise.all(['@openai/mcp-extensions','@modelcontextprotocol/ext-apps','@modelcontextprotocol/sdk','zod']
  .map(async name=>name+'\n'+await fs.readFile(path.join(root,'node_modules',name,'LICENSE'),'utf8')));
await fs.writeFile(path.join(root,'tools/codex-app-server-mcp/plugin-ui.html'),
  pluginHtml(html,result.outputFiles[0].text,notices));
console.log('Workflow Pilot plugin UI staged.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await stageChatgptPlugin();
