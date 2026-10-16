import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRemoteDevices} from '../src/backend/remote-devices.mjs';
import {remoteBackend} from './fixtures/remote-backend.mjs';

const settle=(ms=30)=>new Promise(resolve=>setTimeout(resolve,ms));

async function withDevices(t) {
  const ref={};let devices;
  const b=await remoteBackend(t,{devices:root=>(devices=createRemoteDevices({dir:path.join(root,'remote'),
    revokeClient:clientId=>ref.port.revokeClient(clientId)}))});
  ref.port=b.port;
  return {...b,devices};
}
async function pair(b,name='iPad') {
  const started=await b.call('/remote/pair',{method:'POST',body:{name}});
  assert.equal(started.status,200);assert.match(started.json.code,/^\d{6}$/);
  return started.json;
}

test('a device is confirmed on the Mac only, receives its token once and is then authenticated',async t=>{
  const b=await withDevices(t);
  const request=await pair(b);
  assert.equal((await b.call('/remote/pair/'+request.pairingId)).json.status,'pending');
  assert.deepEqual(b.devices.view().pairings.map(item=>[item.code,item.name]),[[request.code,'iPad']],'the Mac sees the same code');
  assert.equal((await b.call('/v1/handshake')).json.error.code,'REMOTE_DEVICE_REQUIRED');
  b.devices.approve(request.pairingId);
  const approved=await b.call('/remote/pair/'+request.pairingId);
  assert.equal(approved.json.status,'approved');
  const cookie=approved.headers.get('set-cookie');
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
  const value=cookie.split(';')[0];
  assert.equal((await b.call('/remote/pair/'+request.pairingId)).json.error.code,'REMOTE_PAIRING_EXPIRED','the token is handed over once');
  assert.equal((await b.call('/v1/handshake',{cookie:value})).status,200);
  assert.equal((await b.call('/remote/session',{cookie:value})).json.device.name,'iPad');
  assert.equal((await b.call('/v1/handshake',{cookie:value.replace(/.$/,c=>c==='0'?'1':'0')})).json.error.code,'REMOTE_DEVICE_REQUIRED');
  const stored=fs.readFileSync(path.join(b.root,'remote','devices.json'),'utf8');
  assert.equal(stored.includes(value.split('.')[1]),false,'only the token hash is stored');
  if(process.platform!=='win32')assert.equal(fs.statSync(path.join(b.root,'remote','devices.json')).mode&0o077,0);
  // A rejected request never yields a device.
  const other=await pair(b,'Чужой');b.devices.reject(other.pairingId);
  assert.equal((await b.call('/remote/pair/'+other.pairingId)).json.status,'rejected');
  assert.equal(b.devices.view().devices.length,1);
});

test('revoking a device ends its control, viewers and event streams at once',async t=>{
  const b=await withDevices(t);
  const request=await pair(b);const device=b.devices.approve(request.pairingId);
  const cookie=(await b.call('/remote/pair/'+request.pairingId)).headers.get('set-cookie').split(';')[0];
  const acquired=await b.call('/v1/commands',{method:'POST',cookie,body:{requestId:'acq',operation:'control.acquire',
    args:{clientId:'ignored-0000',takeover:false},bootGeneration:b.claim.generation}});
  assert.match(acquired.json.value.holder,/^remote-/);
  b.host.create('page-1');
  const viewer=await b.call('/v1/browser/viewers',{method:'POST',cookie,body:{browserSessionId:b.host.pages()[0].browserSessionId}});
  assert.equal(b.host.pages()[0].viewers,1);
  const stream=await fetch(`http://127.0.0.1:${b.proxy.port}/v1/events`,{headers:{cookie}});
  const reader=stream.body.getReader();await reader.read();
  b.devices.revoke(device.id);await settle(80);
  assert.equal(b.port.operations.leaseHolder(),null,'the lease is taken back without the device');
  assert.equal(b.host.pages()[0].viewers,0,'its viewers are detached');
  let ended=false;
  for(let i=0;i<20&&!ended;i++){
    const part=await Promise.race([reader.read().catch(()=>({done:true})),settle(100).then(()=>null)]);
    if(part?.done)ended=true;
  }
  assert.equal(ended,true,'its event stream is closed');
  assert.equal((await b.call('/v1/handshake',{cookie})).json.error.code,'REMOTE_DEVICE_REQUIRED');
  assert.ok(viewer.json.viewerId);
});

test('pairing requests are rate limited',async t=>{
  const b=await withDevices(t);
  for(let i=0;i<6;i++)await pair(b,'Устройство '+i);
  assert.equal((await b.call('/remote/pair',{method:'POST',body:{name:'x'}})).json.error.code,'REMOTE_RATE_LIMIT');
});
