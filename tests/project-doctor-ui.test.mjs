import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { projectDoctorView } from '../src/ui/project-doctor.mjs';
import { workspaceSetupView } from '../src/ui/workspace-setup.mjs';
import { settingsPanelView } from '../src/ui/settings-panel.mjs';
import { ProjectDoctor } from '../src/project-doctor.mjs';
async function fixture(t, factory=projectDoctorView) {
  const dom=new JSDOM(await fs.readFile(new URL('../src/ui/index.html',import.meta.url),'utf8'));
  const before=globalThis.document;globalThis.document=dom.window.document;
  t.after(()=>{globalThis.document=before;dom.window.close();});
  const calls=[], view=factory((...args)=>calls.push(args));
  return {view,calls,$:id=>dom.window.document.getElementById(id)};
}
const state=()=>({projects:[{workspace:'/one',name:'Первый'},{workspace:'/two',name:'Второй'}],selected:{workspace:'/one'},settings:{workspace:'/one'},context:{},archives:[]});
test('project form requests a location before exposing the name and continuation', async t => {
  const f=await fixture(t,workspaceSetupView),s=state();
  s.setup={phase:'form',mode:'new',parent:null,name:''};
  f.view.render(s,false);
  assert.equal(f.$('setup-parent-button').textContent,'Выбрать расположение папки для проектов');
  assert.equal(f.$('setup-parent').textContent,'');assert.equal(f.$('setup-parent').hidden,true);
  assert.equal(f.$('setup-name').hidden,true);assert.equal(f.$('setup-preview').hidden,true);
  const Event=f.$('setup-form').ownerDocument.defaultView.Event;
  f.$('setup-form').dispatchEvent(new Event('submit',{cancelable:true}));
  assert.deepEqual(f.calls,[]);
  f.$('setup-parent-button').click();assert.deepEqual(f.calls,[['chooseParent','']]);
  s.setup.parent='/chosen/projects';f.view.render(s,false);await Promise.resolve();
  assert.equal(f.$('setup-parent').textContent,'/chosen/projects');assert.equal(f.$('setup-name').hidden,false);
  assert.equal(f.$('setup-name').disabled,false);assert.equal(f.$('setup-preview').hidden,false);
  assert.equal(f.$('setup-name').ownerDocument.activeElement,f.$('setup-name'));
});
test('doctor waits for explicit action, selects exact project and reports successful recovery',async t=>{
  const f=await fixture(t);const s=state();f.view.render(s,false);assert.equal(f.calls.length,0);assert.equal(f.$('doctor-actions').hidden,true);
  f.$('doctor-run').click();assert.deepEqual(f.calls,[['runDoctor','/one']]);
  s.doctor={workspace:'/one',phase:'done',projectReady:true,servicesReady:true,issues:[],repairs:['Восстановлена установка'],checks:[{label:'Контекст',ok:true}],backupPath:'/backup'};
  f.view.render(s,false);assert.equal(f.$('doctor-actions').hidden,false);assert.equal(f.$('doctor-backup').hidden,false);
  f.$('doctor-work').click();assert.deepEqual(f.calls.at(-1),['continueDoctor','work']);
  s.doctor={workspace:'/two',phase:'idle'};f.view.render(s,false);assert.equal(f.$('doctor-actions').hidden,true);assert.equal(f.$('doctor-workspace').value,'/two');
});
test('busy run cannot be repeated and unready services never appear as success',async t=>{
  const f=await fixture(t),s=state();s.doctor={workspace:'/one',phase:'repairing'};f.view.render(s,false);
  assert.equal(f.$('doctor-run').disabled,true);assert.equal(f.$('doctor-workspace').disabled,true);
  s.doctor={workspace:'/one',phase:'done',projectReady:true,servicesReady:false,issues:[{path:'Подключение',reason:'<img onerror=alert(1)>'}]};f.view.render(s,false);
  assert.equal(f.$('doctor-actions').hidden,true);assert.equal(f.$('doctor-results').querySelector('img'),null);assert.match(f.$('doctor-results').textContent,/<img/);
});
test('setup offers doctor without a working session and settings remain available',async t=>{
  const f=await fixture(t,workspaceSetupView),s=state();s.setup={phase:'preview',installed:true,workspace:'/broken',issues:[{path:'file',reason:'broken'}]};
  f.view.render(s,false);assert.equal(f.$('setup-doctor').hidden,false);f.$('setup-doctor').click();assert.deepEqual(f.calls,[['openDoctor']]);
  const settings=settingsPanelView(()=>{});settings.render(s,false);assert.equal(f.$('open-settings').disabled,false);
});
function coordinator({worker,health={ready:true,checks:[],issues:[]},services=async()=>{}}={}) {
  const calls=[];const setup={preview:async()=>{calls.push('verify');return health;},apply:async()=>{calls.push('reconnect');return {ready:true,checks:[],issues:[]};}};
  const doctor=new ProjectDoctor({setup,ensureServices:services});doctor.worker=worker??(async workspace=>({workspace,checks:[],repairs:['fixed'],issues:[],backupPath:'/backup'}));return {doctor,calls};
}
test('coordinator rechecks project and connection independently, preserves backup on service failure',async()=>{
  const {doctor,calls}=coordinator({services:async()=>{throw Object.assign(new Error('Настройте подключение'),{code:'TUNNEL_NOT_CONFIGURED'});}});
  const phases=[],r=await doctor.run('/one',s=>phases.push(s.phase));assert.deepEqual(phases,['repairing','verifying','services']);assert.deepEqual(calls,['verify']);assert.equal(r.projectReady,true);assert.equal(r.servicesReady,false);assert.equal(r.backupPath,'/backup');assert.equal(r.issues[0].code,'TUNNEL_NOT_CONFIGURED');
});
test('coordinator never launches project verification after untrusted files, and unlocks on error',async()=>{
  const {doctor,calls}=coordinator({worker:async()=>({issues:[{reason:'unknown runtime'}]})});const r=await doctor.run('/one');assert.equal(r.projectReady,false);assert.deepEqual(calls,[]);assert.equal(doctor.running,false);
  doctor.worker=async()=>{throw new Error('Node missing');};assert.equal((await doctor.run('/one')).issues[0].reason,'Node missing');assert.equal(doctor.running,false);
});
test('coordinator reconnects missing local commands and rejects duplicate runs',async()=>{
  let release;const {doctor,calls}=coordinator({health:{ready:false,action:'reconnect'},worker:()=>new Promise(resolve=>{release=resolve;})});
  const first=doctor.run('/one');await assert.rejects(doctor.run('/one'),/уже работает/);release({workspace:'/one',repairs:[],issues:[]});const r=await first;assert.equal(r.projectReady,true);assert.equal(r.servicesReady,true);assert.deepEqual(calls,['verify','reconnect']);
});


test('healthy first-project preview offers only direct Chat and Work with one submission', async t => {
  const f=await fixture(t,workspaceSetupView),s=state();
  s.setup={phase:'preview',mode:'new',workspace:'/new',token:'preview-1',action:'install',firstSessionRequired:true,checks:[]};
  f.view.render(s,false);
  assert.equal(f.$('setup-experience').hidden,false); assert.equal(f.$('setup-apply').hidden,true);
  assert.equal(f.$('setup-doctor').hidden,true); assert.equal(f.$('setup-refresh').hidden,true);
  f.$('setup-experience-work').click(); f.$('setup-experience-chat').click();
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(f.calls,[['applySetup','preview-1','work']]);
});
test('first project needs no personal fields and diagnosed problems still expose recovery', async t => {
  const f=await fixture(t,workspaceSetupView),s=state();
  s.setup={phase:'preview',mode:'new',workspace:'/new',token:'preview-2',action:'install',firstSessionRequired:true};
  f.view.render(s,false); assert.equal(f.$('setup-experience-chat').disabled,false); assert.equal(f.$('setup-experience-work').disabled,false);
  assert.equal(f.$('setup-identity'),null); assert.equal(f.$('setup-git-name'),null); assert.equal(f.$('setup-git-email'),null);
  assert.equal(f.$('setup-experience-chat').disabled,false);
  s.setup.error={message:'Папка изменилась'};f.view.render(s,false);
  assert.equal(f.$('setup-experience').hidden,true);assert.equal(f.$('setup-doctor').hidden,false);assert.equal(f.$('setup-refresh').hidden,false);
  s.setup={phase:'preview',mode:'existing',workspace:'/existing',token:'preview-3',action:'open',ready:true,firstSessionRequired:false};
  f.view.render(s,false);assert.equal(f.$('setup-experience').hidden,true);assert.equal(f.$('setup-apply').hidden,false);
  assert.equal(f.$('setup-doctor').hidden,true);assert.equal(f.$('setup-refresh').hidden,true);
});

test('settings retain recovery workspace for doctor and open the separate archive window',async t=>{
  const f=await fixture(t,settingsPanelView),s={...state(),projects:[],selected:null,settings:{workspace:'/recovery'},doctor:null};
  f.view.render(s,false);
  assert.equal(f.$('settings-panel').hidden,false);
  assert.equal(f.$('active-projects').hidden,true);
  assert.equal(f.$('doctor-workspace').value,'/recovery');
  assert.equal(f.$('doctor-run').disabled,false);
  for(const id of ['archive-empty','archive-list','archive-detail','settings-notice','delete-form']) assert.equal(f.$(id),null);
  f.$('doctor-run').click();f.$('open-archive-window').click();
  assert.deepEqual(f.calls,[['runDoctor','/recovery'],['openArchive']]);
  f.view.render(s,true);assert.equal(f.$('open-archive-window').disabled,true);
  f.view.render(s,false);f.$('close-settings').click();
  assert.deepEqual(f.calls.at(-1),['closeSettings']);
  s.settings=null;f.view.render(s,false);
  assert.equal(f.$('settings-panel').hidden,true);assert.equal(f.$('active-projects').hidden,false);
  f.$('open-settings').click();assert.deepEqual(f.calls.at(-1),['openSettings']);
});
