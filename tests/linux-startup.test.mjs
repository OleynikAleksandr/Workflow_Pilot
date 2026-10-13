import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { inspectLinuxHost } from '../src/execution/platform/linux/startup.mjs';
import { startupPlatformOptions } from '../src/control/startup/platform.mjs';
import { StartupReadiness } from '../src/control/startup/readiness.mjs';
import { createStartupView } from '../src/frontend/desktop/ui/startup.mjs';

const host={platform:'linux',arch:'x64',uid:1000,environment:{DISPLAY:':1',XDG_SESSION_TYPE:'x11'},
  read:async()=> 'ID=ubuntu\nVERSION_ID="24.04"\n',run:async()=>({stdout:''})};
test('Ubuntu guard accepts only a non-root x64 X11 session with required system components',async()=>{
  assert.deepEqual(await inspectLinuxHost(host),{platform:'linux',arch:'x64',session:'x11',git:true});
  for(const [patch,code]of [[{platform:'darwin'},'LINUX_UNSUPPORTED'],[{arch:'arm64'},'LINUX_UNSUPPORTED'],
    [{uid:0},'LINUX_ROOT_UNSUPPORTED'],[{environment:{...host.environment,WAYLAND_DISPLAY:'wayland-0'}},'LINUX_WAYLAND_UNSUPPORTED'],
    [{environment:{}},'LINUX_DISPLAY_MISSING'],[{read:async()=> 'ID=debian\nVERSION_ID="12"'},'LINUX_UNSUPPORTED'],
    [{run:async()=>{throw new Error('missing');}},'LINUX_COMPONENTS_MISSING']])
    await assert.rejects(inspectLinuxHost({...host,...patch}),{code});
});

test('Linux first-run uses packaged components, keeps errors actionable and confirms neither login nor tunnel by assumption',async()=>{
  const calls=[];let fail=true,configured=false,runtime=false;
  const components={environment:{},inspectHost:async()=>{
    if(fail)await inspectLinuxHost({...host,environment:{}});calls.push('host');
  },ensure:async()=>calls.push('components'),workflowEnvironment:async()=>({PATH:'/fixture tools:/usr/bin'})};
  const flow=new StartupReadiness(startupPlatformOptions({platform:'linux',components,
    setup:{node:async()=>calls.push('node'),setRuntimeEnvironment:value=>calls.push(value.PATH)},
    bootstrap:{inspect:async()=>({installed:runtime}),configureTunnel:async()=>{configured=true;}},
    ensureRuntime:async()=>{runtime=true;calls.push('activate');},
    control:async()=>({mcp:{ready:runtime},tunnel:{ready:configured,configured}}),
    inspectGit:()=>assert.fail('must not use Apple'),installGit:()=>assert.fail('must not install Apple')}));
  await flow.check({prepare:true});assert.equal(flow.snapshot().phase,'error');assert.match(flow.snapshot().error,/X11/);
  assert(!calls.includes('activate'));fail=false;
  await flow.check({prepare:true});assert.equal(flow.snapshot().phase,'tunnel');
  assert.equal(flow.snapshot().account,'unknown');assert(calls.indexOf('components')<calls.indexOf('activate'));
  await flow.configure({key:'fixture-secret'});assert.equal(flow.snapshot().phase,'connected');
  assert(!JSON.stringify(flow.snapshot()).includes('fixture-secret'));flow.dispose();
});

test('Linux wizard renders Ubuntu instructions, package errors and its own connector without Apple actions',async t=>{
  const dom=new JSDOM(await fs.readFile(new URL('../src/frontend/desktop/ui/index.html',import.meta.url),'utf8'));
  t.after(()=>dom.window.close());const document=dom.window.document;
  const view=createStartupView({document,api:{startup:async()=>({ok:true})}});
  const startup={platform:'linux',active:true,phase:'prepare',account:'signed-in',page:'loaded',node:true,git:false,runtime:false,tunnel:false};
  view.render({platform:'linux',startup});
  assert.match(document.getElementById('host-platform-label').textContent,/Ubuntu/);
  assert.match(document.getElementById('startup-components-help').textContent,/Ubuntu on Xorg/);
  assert(!document.getElementById('startup-components-help').textContent.includes('Apple'));
  assert.equal(document.getElementById('startup-install-git').hidden,true);
  assert.equal(document.getElementById('startup-plugin-name').textContent,'Workflow Pilot Local Linux');
  assert.equal(document.getElementById('startup-continue').disabled,true);
  view.render({platform:'linux',startup:{...startup,git:true,runtime:true,tunnel:true}});
  assert.equal(document.getElementById('startup-continue').disabled,false);
});
