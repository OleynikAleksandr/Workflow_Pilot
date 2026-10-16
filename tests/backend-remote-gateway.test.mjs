import test from 'node:test';
import assert from 'node:assert/strict';
import {remotePage,remotePreload} from '../src/backend/remote-gateway.mjs';
import {remoteBackend} from './fixtures/remote-backend.mjs';

const fakeDevices=()=>({
  authenticate:cookie=>({'wp_device=dev-a':{id:'a',clientId:'client-remote-aaaa'},'wp_device=dev-b':{id:'b',clientId:'client-remote-bbbb'}})[cookie]??null,
  route:async(_req,res)=>{res.writeHead(204);res.end();},
});

test('gateway: owner identity, origin and a confirmed device guard every request',async t=>{
  const b=await remoteBackend(t,{devices:fakeDevices});
  const direct=await fetch(`http://127.0.0.1:${b.status.port}/v1/handshake`);
  assert.equal(direct.status,403,'a direct loopback caller without the Serve identity is refused');
  assert.equal((await direct.json()).error.code,'REMOTE_OWNER_MISMATCH');
  assert.equal((await b.call('/v1/handshake',{via:b.intruder})).json.error.code,'REMOTE_OWNER_MISMATCH','another tailnet user is refused');
  assert.equal((await b.call('/v1/handshake')).json.error.code,'REMOTE_DEVICE_REQUIRED');
  const ok=await b.call('/v1/handshake',{cookie:'wp_device=dev-a'});
  assert.equal(ok.status,200);assert.equal(ok.json.bootGeneration,b.claim.generation);
  const foreign=await b.call('/v1/commands',{method:'POST',cookie:'wp_device=dev-a',origin:'https://evil.example',
    body:{requestId:'r-origin',operation:'control.acquire',args:{clientId:'client-x-0000',takeover:false},bootGeneration:b.claim.generation}});
  assert.equal(foreign.json.error.code,'REMOTE_ORIGIN_INVALID');
  // The local bearer API is unchanged and still loopback-only.
  const local=await fetch(`http://127.0.0.1:${b.port.port}/v1/handshake`,{headers:{authorization:'Bearer '+b.claim.token}});
  assert.equal(local.status,200);
  await b.port.remote.disable();
  await assert.rejects(fetch(`http://127.0.0.1:${b.status.port}/v1/handshake`),'a disabled gateway does not listen');
});

test('gateway: the device clientId is assigned, an observer cannot use the holder generation, viewers belong to their device',async t=>{
  const b=await remoteBackend(t,{devices:fakeDevices});
  const command=(cookie,requestId,operation,args,extra={})=>b.call('/v1/commands',{method:'POST',cookie,
    body:{requestId,operation,args,bootGeneration:b.claim.generation,...extra}});
  const acquired=await command('wp_device=dev-a','a-acquire','control.acquire',{clientId:'client-mac-window',takeover:false});
  assert.equal(acquired.json.value.holder,'client-remote-aaaa','the gateway names the device, not the client');
  const generation=acquired.json.value.leaseGeneration;
  const stolen=await command('wp_device=dev-b','b-update','settings.update',{theme:'dark'},{leaseGeneration:generation});
  assert.equal(stolen.json.error.code,'BACKEND_LEASE_STALE','a seen generation is not control');
  const renew=await command('wp_device=dev-b','b-renew','control.renew',{clientId:'client-remote-aaaa'},{leaseGeneration:generation});
  assert.equal(renew.json.error.code,'BACKEND_LEASE_STALE');
  const release=await command('wp_device=dev-b','b-release','control.release',{clientId:'client-remote-aaaa'},{leaseGeneration:generation});
  assert.equal(release.json.error.code,'BACKEND_LEASE_STALE');
  assert.equal(b.port.operations.leaseHolder(),'client-remote-aaaa','the observer neither renewed nor released');
  const update=await command('wp_device=dev-a','a-update','settings.update',{theme:'dark'},{leaseGeneration:generation});
  assert.equal(update.json.status,'accepted');
  // Viewers: B cannot address or detach the viewer A created.
  b.host.create('page-1');
  const [page]=b.host.pages();
  const viewer=await b.call('/v1/browser/viewers',{method:'POST',cookie:'wp_device=dev-a',body:{browserSessionId:page.browserSessionId}});
  assert.equal(viewer.status,200);
  const detach=await b.call('/v1/browser/viewers/'+viewer.json.viewerId,{method:'DELETE',cookie:'wp_device=dev-b'});
  assert.equal(detach.json.error.code,'BROWSER_PAGE_NOT_FOUND');
  const input=await b.call('/v1/browser/viewport',{method:'POST',cookie:'wp_device=dev-b',
    body:{viewerId:viewer.json.viewerId,width:800,height:600,leaseGeneration:generation}});
  assert.equal(input.json.error.code,'BACKEND_LEASE_STALE','an observer cannot drive the viewport of the holder');
  assert.equal(b.host.pages()[0].viewers,1);
});

test('gateway serves only the web client folders with the browser bridge in place of preload',async t=>{
  const b=await remoteBackend(t,{devices:fakeDevices});
  const root=await b.call('/');assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/app/frontend/web/index.html');
  const ui=await b.call('/app/frontend/desktop/ui/index.html');
  assert.equal(ui.status,200);assert.match(ui.text,/\/app\/preload\/local\.js/);assert.match(ui.text,/connect-src 'self'/);
  assert.match(ui.headers.get('content-security-policy'),/frame-ancestors 'self'/);
  const preload=await b.call('/app/preload/local.js');assert.match(preload.text,/window\.__wpIpc/);assert.match(preload.text,/exposeInMainWorld\('webPilot'/);
  for(const route of ['/app/backend/main.mjs','/app/../package.json','/app/frontend/desktop/preload.cjs','/app/contracts/.hidden.mjs','/app/%2e%2e/main.mjs'])
    assert.equal((await b.call(route)).status,404,route);
  assert.equal((await b.call('/app/contracts/remote.mjs')).status,200);
  assert.match(remotePage('<head><meta content="connect-src \'none\'"></head>','/x/frontend/desktop/ui/archive.html'),/preload\/archive\.js/);
  assert.match(remotePreload('exposeInMainWorld'),/^\(\(\)=>/);
});
