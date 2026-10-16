import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {respondError} from './server.mjs';
import {REMOTE_PREFERRED_PORT,TAILSCALE_LOGIN_HEADER,TAILSCALE_NAME_HEADER,remoteError} from '../contracts/remote.mjs';

const TYPES={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'};
// Only these source folders are served to a remote browser; nothing else of
// the package, the profile or the file system is reachable.
const SERVED=['frontend/web/','frontend/desktop/ui/','frontend/client/','contracts/'];
const PRELOADS={local:'frontend/desktop/preload.cjs',archive:'frontend/desktop/archive-preload.cjs',colors:'frontend/desktop/chat-colors-preload.cjs'};
const UI_PRELOAD={'index.html':'local','archive.html':'archive','chat-colors.html':'colors'};
const SHELL_CSP="default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; "+
  "frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'; object-src 'none'";

// A Desktop UI page in a browser: the same HTML with the browser bridge in
// place of the Electron preload, and same-origin API access allowed.
export function remotePage(html,file) {
  const kind=UI_PRELOAD[path.basename(file)];
  let page=html.replace(/connect-src 'none'/g,"connect-src 'self'").replace(/img-src 'self' data:/g,"img-src 'self' data: blob:");
  if(kind)page=page.replace('</head>',`<script src="/app/frontend/web/ipc.js"></script><script src="/app/preload/${kind}.js"></script></head>`);
  return page;
}
// The unchanged preload source runs against a browser ipcRenderer.
export function remotePreload(source) {
  return '(()=>{"use strict";const require=()=>({contextBridge:{exposeInMainWorld:(key,value)=>{window[key]=value;}},'+
    'ipcRenderer:window.__wpIpc});\n'+source+'\n})();\n';
}

// Loopback-only gateway behind Tailscale Serve. Every request must carry the
// owner identity that Serve sets; API requests also need a confirmed device.
// The gateway assigns that device's clientId to everything it forwards.
export function createRemoteGateway({route,devices,sourceDir,preferredPort=REMOTE_PREFERRED_PORT,journal={record(){}},onClose=()=>{}}) {
  let server=null,config=null;
  const send=(res,status,type,body,extra={})=>{
    res.writeHead(status,{'content-type':type,'content-length':Buffer.byteLength(body),'cache-control':'no-store',
      'x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':SHELL_CSP,...extra});
    res.end(body);
  };
  const serveStatic=async(req,res,url)=>{
    if(req.method!=='GET')throw remoteError('BACKEND_ROUTE_NOT_FOUND');
    if(url.pathname==='/'||url.pathname==='/app'||url.pathname==='/app/')
      return send(res,302,'text/plain; charset=utf-8','',{location:'/app/frontend/web/index.html'});
    const preload=url.pathname.match(/^\/app\/preload\/(local|archive|colors)\.js$/);
    if(preload)return send(res,200,TYPES['.js'],remotePreload(await fs.promises.readFile(path.join(sourceDir,PRELOADS[preload[1]]),'utf8')));
    const relative=decodeURIComponent(url.pathname.slice('/app/'.length));
    if(!url.pathname.startsWith('/app/')||relative.includes('\0')||relative.split('/').some(part=>part==='..'||part.startsWith('.'))
      ||!SERVED.some(prefix=>relative.startsWith(prefix))||!TYPES[path.extname(relative)])throw remoteError('BACKEND_ROUTE_NOT_FOUND');
    const file=path.resolve(sourceDir,relative);
    if(!file.startsWith(path.resolve(sourceDir)+path.sep))throw remoteError('BACKEND_ROUTE_NOT_FOUND');
    let body;
    try{body=await fs.promises.readFile(file,path.extname(file)==='.png'?undefined:'utf8');}
    catch{throw remoteError('BACKEND_ROUTE_NOT_FOUND');}
    if(path.extname(file)==='.html')body=remotePage(body,file);
    return send(res,200,TYPES[path.extname(file)],body);
  };
  const handle=async(req,res)=>{
    try {
      if(!config)throw remoteError('REMOTE_DISABLED');
      const url=new URL(req.url,'http://gateway');
      const port=server.address().port,host=String(req.headers.host??'').toLowerCase();
      if(![`127.0.0.1:${port}`,`localhost:${port}`,config.dnsName,`${config.dnsName}:443`].includes(host))throw remoteError('REMOTE_HOST_INVALID');
      // Serve sets this header and strips client copies; a direct loopback
      // caller could fake it, so the confirmed device is checked as well.
      const login=String(req.headers[TAILSCALE_LOGIN_HEADER]??'').toLowerCase();
      if(!login||login!==config.owner)throw remoteError('REMOTE_OWNER_MISMATCH');
      if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==`https://${config.dnsName}`)throw remoteError('REMOTE_ORIGIN_INVALID');
      if(url.pathname.startsWith('/remote/'))
        return await devices.route(req,res,url,{name:String(req.headers[TAILSCALE_NAME_HEADER]??'').slice(0,60)});
      if(url.pathname.startsWith('/v1/')) {
        const device=devices.authenticate(req.headers.cookie);
        if(!device)throw remoteError('REMOTE_DEVICE_REQUIRED');
        return await route(req,res,url,{clientId:device.clientId,deviceId:device.id});
      }
      return await serveStatic(req,res,url);
    }catch(error){respondError(res,error);}
  };
  const listen=port=>new Promise((resolve,reject)=>{
    const next=http.createServer((req,res)=>void handle(req,res));
    Object.assign(next,{headersTimeout:10000,requestTimeout:0,maxConnections:64});
    next.once('error',reject);next.listen(port,'127.0.0.1',()=>{next.off('error',reject);resolve(next);});
  });
  return Object.freeze({
    async enable({owner,dnsName}) {
      if(typeof owner!=='string'||!owner||typeof dnsName!=='string'||!dnsName)throw remoteError('REMOTE_CONFIG_INVALID','Нет данных Tailscale.');
      config={owner:owner.toLowerCase(),dnsName:dnsName.toLowerCase()};
      if(!server) {
        try{server=await listen(preferredPort);}
        catch(error){if(error.code!=='EADDRINUSE')throw error;server=await listen(0);}
      }
      journal.record('remote-enabled',{port:server.address().port});
      return this.status();
    },
    async disable() {
      config=null;
      if(server){const old=server;server=null;old.closeAllConnections();await new Promise(resolve=>old.close(resolve));}
      onClose();journal.record('remote-disabled');
      return this.status();
    },
    status:()=>({enabled:!!config,port:server?.address()?.port??null,dnsName:config?.dnsName??null,owner:config?.owner??null}),
  });
}
