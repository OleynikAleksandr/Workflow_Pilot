import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {REMOTE_DEVICE_COOKIE,REMOTE_MAX_DEVICES,REMOTE_PAIRING_ATTEMPTS_PER_MINUTE,REMOTE_PAIRING_TTL_MS,deviceName,remoteError}
  from '../contracts/remote.mjs';

const sha256=value=>createHash('sha256').update(value).digest('hex');
const id=()=>randomBytes(12).toString('hex');
const json=(res,status,value,headers={})=>{
  const body=Buffer.from(JSON.stringify(value));
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':body.length,'cache-control':'no-store',...headers});
  res.end(body);
};
const readBody=req=>new Promise((resolve,reject)=>{
  let size=0;const chunks=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>4096){req.destroy();reject(remoteError('BACKEND_MESSAGE_SIZE'));}else chunks.push(chunk);});
  req.on('end',()=>{try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');resolve(value&&typeof value==='object'?value:{});}
    catch{reject(remoteError('BACKEND_MESSAGE_INVALID'));}});
  req.on('error',reject);
});

// Remote devices of this backend. A device is confirmed on the Mac only: the
// remote page shows a one-time code, the Mac shows the same code and the name.
// Tokens are stored as hashes; a revoked device loses control, viewers and
// event streams at once (revokeClient).
export function createRemoteDevices({dir,now=Date.now,onChange=()=>{},journal={record(){}},revokeClient=()=>{}}) {
  const file=path.join(dir,'devices.json');
  let devices=[];
  try {
    const stored=JSON.parse(fs.readFileSync(file,'utf8'));
    if(Array.isArray(stored?.devices))devices=stored.devices.filter(item=>typeof item?.id==='string'&&typeof item.tokenHash==='string');
  }catch(error){if(error.code!=='ENOENT')throw remoteError('REMOTE_STORE_INVALID','Список устройств повреждён. Данные не изменены.');}
  const pairings=new Map(),attempts=[];
  let saveTimer=null;
  const save=()=>{
    fs.mkdirSync(dir,{recursive:true,mode:0o700});
    const temp=file+'.'+process.pid+'.tmp';
    fs.writeFileSync(temp,JSON.stringify({schema_version:1,devices})+'\n',{mode:0o600});
    fs.renameSync(temp,file);
  };
  const expire=()=>{for(const [key,item] of pairings)if(item.expiresAt<=now())pairings.delete(key);};
  const changed=()=>{try{onChange();}catch{ /* state listeners never block pairing */ }};
  const publicDevice=item=>({id:item.id,name:item.name,createdAt:item.createdAt,lastSeenAt:item.lastSeenAt??null});
  function authenticate(cookieHeader) {
    const value=String(cookieHeader??'').split(';').map(part=>part.trim()).find(part=>part.startsWith(REMOTE_DEVICE_COOKIE+'='));
    const match=value?.slice(REMOTE_DEVICE_COOKIE.length+1).match(/^([a-f0-9]{24})\.([a-f0-9]{64})$/);
    if(!match)return null;
    const device=devices.find(item=>item.id===match[1]);
    if(!device)return null;
    const expected=Buffer.from(device.tokenHash,'hex'),actual=Buffer.from(sha256(match[2]),'hex');
    if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
    if(!device.lastSeenAt||now()-Date.parse(device.lastSeenAt)>60000) {
      device.lastSeenAt=new Date(now()).toISOString();
      clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{save();}catch{}},1000);saveTimer.unref?.();
    }
    return {id:device.id,clientId:device.clientId,name:device.name};
  }
  async function route(req,res,url,{name=''}={}) {
    expire();
    if(req.method==='POST'&&url.pathname==='/remote/pair') {
      const since=now()-60000;while(attempts.length&&attempts[0]<since)attempts.shift();
      if(attempts.length>=REMOTE_PAIRING_ATTEMPTS_PER_MINUTE)throw remoteError('REMOTE_RATE_LIMIT');
      attempts.push(now());
      const body=await readBody(req);
      const pairing={id:id(),code:String(randomInt(0,1000000)).padStart(6,'0'),name:deviceName(body.name)??deviceName(name)??'Устройство',
        expiresAt:now()+REMOTE_PAIRING_TTL_MS,status:'pending'};
      pairings.set(pairing.id,pairing);journal.record('remote-pair-requested');changed();
      return json(res,200,{pairingId:pairing.id,code:pairing.code,expiresAt:pairing.expiresAt});
    }
    const status=req.method==='GET'&&url.pathname.match(/^\/remote\/pair\/([a-f0-9]{24})$/);
    if(status) {
      const pairing=pairings.get(status[1]);
      if(!pairing)throw remoteError('REMOTE_PAIRING_EXPIRED');
      if(pairing.status==='rejected'){pairings.delete(pairing.id);changed();return json(res,200,{status:'rejected'});}
      if(pairing.status!=='approved')return json(res,200,{status:'pending'});
      // The token is handed over once, only to the page that asked for the code.
      pairings.delete(pairing.id);changed();
      return json(res,200,{status:'approved',device:{id:pairing.deviceId,name:pairing.name}},
        {'set-cookie':`${REMOTE_DEVICE_COOKIE}=${pairing.deviceId}.${pairing.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`});
    }
    if(req.method==='GET'&&url.pathname==='/remote/session') {
      const device=authenticate(req.headers.cookie);
      return json(res,200,{device:device?{id:device.id,name:device.name,clientId:device.clientId}:null});
    }
    throw remoteError('BACKEND_ROUTE_NOT_FOUND');
  }
  return Object.freeze({authenticate,route,
    approve(pairingId) {
      expire();
      const pairing=pairings.get(pairingId);
      if(!pairing||pairing.status!=='pending')throw remoteError('REMOTE_PAIRING_EXPIRED','Запрос подключения устарел.');
      if(devices.length>=REMOTE_MAX_DEVICES)throw remoteError('REMOTE_DEVICE_LIMIT','Слишком много устройств. Отключите ненужные.');
      const token=randomBytes(32).toString('hex'),device={id:id(),name:pairing.name,clientId:'remote-'+id(),tokenHash:sha256(token),
        createdAt:new Date(now()).toISOString(),lastSeenAt:null};
      devices=[...devices,device];save();
      Object.assign(pairing,{status:'approved',deviceId:device.id,token});
      journal.record('remote-device-approved');changed();
      return publicDevice(device);
    },
    reject(pairingId) {
      const pairing=pairings.get(pairingId);
      if(pairing&&pairing.status==='pending'){pairing.status='rejected';changed();}
      return {rejected:!!pairing};
    },
    revoke(deviceId) {
      const device=devices.find(item=>item.id===deviceId);
      if(!device)return {revoked:false};
      devices=devices.filter(item=>item!==device);save();
      try{revokeClient(device.clientId);}finally{journal.record('remote-device-revoked');changed();}
      return {revoked:true};
    },
    isRemoteClient:clientId=>typeof clientId==='string'&&devices.some(item=>item.clientId===clientId),
    view() {
      expire();
      return {pairings:[...pairings.values()].filter(item=>item.status==='pending').map(item=>({id:item.id,code:item.code,name:item.name,expiresAt:item.expiresAt})),
        devices:devices.map(publicDevice)};
    },
    dispose(){clearTimeout(saveTimer);},
  });
}
