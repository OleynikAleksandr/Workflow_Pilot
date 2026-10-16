import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createBackendJournal,launchServicesType} from '../src/backend/diagnostics.mjs';

test('backend journal keeps only small scalar facts, private and bounded',async t=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'wp-backend-journal-'));t.after(()=>fsp.rm(root,{recursive:true,force:true}));
  const file=path.join(root,'diagnostics','backend-events.jsonl');
  const journal=createBackendJournal(file,{now:()=>'2026-10-16T00:00:00.000Z',pid:42});
  assert.equal(journal.record('child-process-gone',{type:'GPU',reason:'killed',exitCode:15,token:{secret:'x'},list:['a'],'bad key':1}),true);
  assert.equal(journal.record('lease',{held:true,generation:3,note:'y'.repeat(500)}),true);
  assert.equal(journal.record('bad event!',{}),false,'event names are fixed identifiers');
  const lines=fs.readFileSync(file,'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(lines[0],{ts:'2026-10-16T00:00:00.000Z',pid:42,event:'child-process-gone',type:'GPU',reason:'killed',exitCode:15});
  assert.equal(lines[1].note.length,120,'strings are shortened');
  if(process.platform!=='win32')assert.equal(fs.statSync(file).mode&0o077,0,'the journal is private');
  fs.writeFileSync(file,'x'.repeat(1024*1024+1));
  journal.record('clients',{count:0});
  assert.equal(fs.existsSync(file+'.1'),true,'one rotation keeps the previous megabyte');
  assert.ok(fs.statSync(file).size<1000);
});

test('LaunchServices type is parsed from lsappinfo and absent elsewhere',async()=>{
  const output=' [ NULL ]  ASN:0x0-0x13013: \n !cgsConnection !signalled type="UIElement" flavor=[ NULL ]';
  assert.equal(await launchServicesType(1,{platform:'darwin',run:(_file,_args,_options,done)=>done(null,output)}),'UIElement');
  assert.equal(await launchServicesType(1,{platform:'darwin',run:(_file,_args,_options,done)=>done(new Error('gone'))}),null);
  assert.equal(await launchServicesType(1,{platform:'linux'}),null);
  if(process.platform==='darwin')assert.match(String(await launchServicesType(process.pid)),/^(null|[A-Za-z]+)$/);
});

test('the menu bar stop goes to its handler and a pending device appears with its code', async () => {
  const { createStatusMenu } = await import('../src/backend/status-menu.mjs');
  let template = null; const calls = [];
  class Tray { setToolTip() {} setContextMenu(menu) { template = menu; } destroy() {} isDestroyed() { return false; } }
  const Menu = { buildFromTemplate: items => items };
  const nativeImage = { createFromBitmap: () => ({ setTemplateImage() {} }) };
  const menu = createStatusMenu({ Tray, Menu, nativeImage, onOpen: () => calls.push('open'), onStop: () => calls.push('stop'),
    onCancelStop: () => calls.push('cancel'), onApprove: id => calls.push('approve ' + id) });
  menu.update({ service: { phase: 'running', reasons: [], error: null }, pages: 2, pairings: [{ id: 'p1', name: 'iPad', code: '123456' }] });
  const byLabel = label => template.find(item => item.label?.startsWith(label));
  assert.match(byLabel('Подключить').label, /iPad.*123456/);
  byLabel('Подключить').click(); byLabel('Остановить фоновую службу').click(); byLabel('Открыть Workflow Pilot').click();
  assert.deepEqual(calls, ['approve p1', 'stop', 'open']);
  menu.update({ service: { phase: 'draining', reasons: [{ message: 'Ждём ответа' }], error: null } });
  byLabel('Отменить остановку').click();
  assert.equal(calls.at(-1), 'cancel');
});
