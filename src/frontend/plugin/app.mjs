import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions } from '@openai/mcp-extensions/app';
import { mountCommunication } from './launch.mjs';
import {COMMUNICATION_APP_VERSION} from '../../contracts/backend.mjs';

const app=new App({name:'Workflow Pilot',version:COMMUNICATION_APP_VERSION});
const extensions=new OpenAIExtensions(app);
const communication=mountCommunication({document,getMessage:()=>extensions.message,
  callTool:(name,args,options)=>app.callServerTool({name,arguments:args},options)});
function theme(){const context=app.getHostContext();if(context?.theme)applyDocumentTheme(context.theme);
  if(context?.styles?.variables)applyHostStyleVariables(context.styles.variables);}
app.addEventListener('hostcontextchanged',()=>{theme();communication.contextChanged();communication.ready();});
app.ontoolresult=result=>communication.hostResult(result.structuredContent);
window.addEventListener('pagehide',()=>communication.dispose('pagehide'),{once:true});
document.addEventListener('visibilitychange',()=>communication.visibilityChanged());
app.connect().then(()=>{theme();communication.ready();}).catch(()=>communication.connectionError());
