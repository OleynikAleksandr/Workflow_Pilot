import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { PLUGIN_ACTION_CLASS } from '../../contracts/backend.mjs';

// Private transport to the single desktop owner. The MCP service never opens its store.
export async function startPluginBridge({ directory, list, open, connect, wait, claim, report, communication }) {
  const token=randomBytes(32).toString('hex'), file=path.join(directory,'plugin-bridge.json');
  const server=http.createServer(async(req,res)=>{
    const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    const supplied=Buffer.from(req.headers.authorization??''), expected=Buffer.from('Bearer '+token);
    if(req.headers.origin||req.headers.host!==`127.0.0.1:${server.address().port}`
        ||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return reply(403,{error:{code:'PLUGIN_ACCESS_DENIED',message:'Доступ запрещён.'}});
    if(req.method!=='POST'||req.url!=='/plugin')return reply(404,{error:{code:'NOT_FOUND',message:'Операция недоступна.'}});
    try {
      const chunks=[];let bytes=0;
      for await(const chunk of req) {bytes+=chunk.length;if(bytes>16384)return reply(413,{error:{code:'TOO_LARGE',message:'Запрос слишком велик.'}});chunks.push(chunk);}
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      // Only the classified plugin actions exist; agent MCP channels are not bridge actions.
      if(!['read','ui-mutation'].includes(PLUGIN_ACTION_CLASS[input?.action]))
        return reply(400,{error:{code:'PLUGIN_ACTION_INVALID',message:'Неизвестное действие плагина.'}});
      if(input.action.startsWith('communication.') && communication) {
        const operation=input.action.slice('communication.'.length),abort=new AbortController();
        const closed=()=>abort.abort();res.once('close',closed);
        try{const value=await communication[operation](input,abort.signal);if(!res.destroyed)reply(200,value);}
        finally{res.off('close',closed);}
        return;
      }
      if(input.action==='list')return reply(200,await list());
      if(input.action==='open')return reply(200,await open(input.projectId));
      if(input.action==='connect')return reply(200,await connect(input));
      if(input.action==='wait' && wait) {
        const abort=new AbortController();
        const closed=()=>abort.abort();res.once('close',closed);
        try {const value=await wait(input.receiverId,abort.signal);if(!res.destroyed)reply(200,value);}
        finally {res.off('close',closed);}
        return;
      }
      if(input.action==='claim' && claim)return reply(200,await claim(input));
      if(input.action==='report' && report)return reply(200,await report(input));
      reply(400,{error:{code:'PLUGIN_ACTION_INVALID',message:'Неизвестное действие плагина.'}});
    }catch(error){reply(400,{error:{code:typeof error.code==='string'?error.code:'PLUGIN_FAILED',
      message:typeof error.code==='string'&&/^(PLUGIN_|PROJECT_|MCP_|WORKSPACE_)/.test(error.code)?error.message:'Не удалось обработать запрос. Проверьте проект в Workflow Pilot.'}});}
  });
  server.requestTimeout=150000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const descriptor={version:1,port:server.address().port,token,pid:process.pid};
  try {
    await fs.mkdir(directory,{recursive:true,mode:0o700});
    const existing=await fs.lstat(file).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
    if(existing?.isSymbolicLink())throw new Error('Plugin descriptor cannot be a symlink');
    if(existing) {
      const previous=JSON.parse(await fs.readFile(file,'utf8'));
      if(Number.isSafeInteger(previous.pid)) {
        let running=false;try{process.kill(previous.pid,0);running=true;}catch(error){if(error.code!=='ESRCH')throw error;}
        if(running)throw new Error('Workflow Pilot plugin bridge is already running');
      }
    }
    const temporary=file+'.'+token+'.tmp';
    try{await fs.writeFile(temporary,JSON.stringify(descriptor),{mode:0o600,flag:'wx'});await fs.rename(temporary,file);}
    finally{await fs.rm(temporary,{force:true});}
  }catch(error){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));throw error;}
  return { async close(){
    communication?.dispose();
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    const current=await fs.readFile(file,'utf8').then(JSON.parse).catch(()=>null);
    if(current?.token===token)await fs.rm(file,{force:true});
  } };
}
