import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions } from '@openai/mcp-extensions/app';
import { mountPanel } from './panel.mjs';
import { mountNavigationProbe } from './navigation-probe.mjs';
import { mountLaunch } from './launch.mjs';

const app=new App({name:'Workflow Pilot',version:'0.4.1'});
const extensions=new OpenAIExtensions(app);
const panel=mountPanel({document,callTool:(name,args)=>app.callServerTool({name,arguments:args}),
  getMessage:()=>extensions.message});
const launch=mountLaunch({document,getMessage:()=>extensions.message,
  callTool:(name,args,options)=>app.callServerTool({name,arguments:args},options)});
window.addEventListener('pagehide',()=>launch.dispose(),{once:true});
let storage;try{storage=window.localStorage;}catch{}
const probe=mountNavigationProbe({document,storage,getPorts:()=>({
  sdk:app.getHostCapabilities()?.openLinks?params=>app.openLink(params,{timeout:10000}):null,
  compat:typeof window.openai?.openExternal==='function'?params=>window.openai.openExternal(params):null
})});
function theme(){const context=app.getHostContext();if(context?.theme)applyDocumentTheme(context.theme);
  if(context?.styles?.variables)applyHostStyleVariables(context.styles.variables);}
app.addEventListener('hostcontextchanged',()=>{theme();panel.ready();probe.ready();launch.ready();});
app.ontoolresult=result=>panel.render(result.structuredContent);
app.connect().then(()=>{theme();panel.ready();probe.ready();launch.ready();}).catch(()=>panel.error('Не удалось подключить панель. Откройте её внутри ChatGPT.'));
