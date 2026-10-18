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
app.addEventListener('hostcontextchanged',context=>{theme();communication.contextChanged(Object.keys(context));communication.ready();});
// Tool results can be replayed from chat history. Only fresh recover/bind
// responses may establish backend compatibility or change communication state.
window.addEventListener('pagehide',()=>communication.suspend());
window.addEventListener('pageshow',()=>communication.resume());
app.onteardown=async()=>{communication.dispose();return {};};
document.addEventListener('visibilitychange',()=>communication.visibilityChanged());
app.connect().then(()=>{theme();communication.connected();}).catch(()=>communication.connectionError());
