import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions } from '@openai/mcp-extensions/app';
import { mountPanel } from './panel.mjs';

const app=new App({name:'Workflow Pilot',version:'0.1.0'});
const extensions=new OpenAIExtensions(app);
const panel=mountPanel({document,callTool:(name,args)=>app.callServerTool({name,arguments:args}),
  getMessage:()=>extensions.message});
function theme(){const context=app.getHostContext();if(context?.theme)applyDocumentTheme(context.theme);
  if(context?.styles?.variables)applyHostStyleVariables(context.styles.variables);}
app.addEventListener('hostcontextchanged',()=>{theme();panel.ready();});
app.ontoolresult=result=>panel.render(result.structuredContent);
app.connect().then(()=>{theme();panel.ready();}).catch(()=>panel.error('Не удалось подключить панель. Откройте её внутри ChatGPT.'));
