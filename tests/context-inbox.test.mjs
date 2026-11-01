import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {writeContextFiles,pruneContextFiles} from '../src/execution/files/context-inbox.mjs';
import {contextFileBundle} from '../src/control/plugin/context-files.mjs';
import {PluginProjects} from '../src/control/plugin/service.mjs';
import {AssignmentDialogue} from '../src/control/plugin/assignment-dialogue.mjs';

const id='0b1f9c1e-5d2a-4c3b-9e8f-7a6b5c4d3e2f',other='1c2a0d2f-6e3b-4d4c-8f9a-8b7c6d5e4f30';
async function checkout(t){
  const directory=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'pilot-inbox-')));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  return directory;
}

test('a bundle is written once into the recipient checkout and reused with identical bytes',async t=>{
  const workspace=await checkout(t),bundle=contextFileBundle(id,'Поручение 🪟\n\n'.repeat(4000));
  const written=await writeContextFiles({workspace,messageId:id,files:bundle.files});
  assert.equal(written.workdir,workspace);assert.equal(written.directory,path.join(workspace,'.harness','runtime','inbox',id));
  for(const [index,file] of written.files.entries()){
    assert.equal(file.path,path.join(written.directory,bundle.files[index].name));
    assert.equal(await fs.readFile(file.path,'utf8'),bundle.files[index].text);assert.equal(file.bytes,bundle.files[index].bytes);
  }
  const before=(await fs.stat(written.files[0].path)).mtimeMs;
  assert.deepEqual(await writeContextFiles({workspace,messageId:id,files:bundle.files}),written);
  assert.equal((await fs.stat(written.files[0].path)).mtimeMs,before);
  assert.deepEqual((await fs.readdir(written.directory)).sort(),bundle.files.map(file=>file.name).sort(),'no temporary files remain');
  const changed=bundle.files.map((file,index)=>index?file:{...file,text:file.text.replace('Поручение','Подмена')});
  await assert.rejects(writeContextFiles({workspace,messageId:id,files:changed}),{code:'CONTEXT_FILES_CONFLICT'});
  assert.equal(await fs.readFile(written.files[0].path,'utf8'),bundle.files[0].text,'a conflict never overwrites');
});

test('links in the bundle path, foreign names and relative checkouts are refused',async t=>{
  const workspace=await checkout(t),outside=await checkout(t),files=contextFileBundle(id,'текст').files;
  await fs.mkdir(path.join(workspace,'.harness'));await fs.symlink(outside,path.join(workspace,'.harness','runtime'));
  await assert.rejects(writeContextFiles({workspace,messageId:id,files}),{code:'CONTEXT_FILES_PATH'});
  assert.deepEqual(await fs.readdir(outside),[]);
  const second=await checkout(t);
  await fs.mkdir(path.join(second,'.harness','runtime','inbox',id),{recursive:true});
  await fs.symlink(path.join(outside,'target.md'),path.join(second,'.harness','runtime','inbox',id,files[0].name));
  await assert.rejects(writeContextFiles({workspace:second,messageId:id,files}),{code:'CONTEXT_FILES_PATH'});
  await assert.rejects(writeContextFiles({workspace:second,messageId:'../escape',files}),{code:'CONTEXT_FILES_PATH'});
  await assert.rejects(writeContextFiles({workspace:'relative',messageId:id,files}),{code:'CONTEXT_FILES_PATH'});
  await assert.rejects(writeContextFiles({workspace:second,messageId:other,files:[{name:'../x.md',text:'x'}]}),{code:'CONTEXT_FILES_INVALID'});
});

test('cleanup removes only unkept UUID bundles and never follows links',async t=>{
  const workspace=await checkout(t),outside=await checkout(t),files=contextFileBundle(id,'текст').files;
  await writeContextFiles({workspace,messageId:id,files});await writeContextFiles({workspace,messageId:other,files});
  const inbox=path.join(workspace,'.harness','runtime','inbox');
  await fs.mkdir(path.join(inbox,'notes'));await fs.writeFile(path.join(outside,'keep.md'),'x');
  const linked='2d3b1e30-7f4c-4e5d-9a0b-9c8d7e6f5a41';await fs.symlink(outside,path.join(inbox,linked));
  assert.deepEqual(await pruneContextFiles({workspace,keep:[id]}),{removed:[other]});
  assert.deepEqual((await fs.readdir(inbox)).sort(),[id,linked,'notes'].sort());
  assert.equal(await fs.readFile(path.join(outside,'keep.md'),'utf8'),'x');
  assert.deepEqual(await pruneContextFiles({workspace:await checkout(t),keep:[]}),{removed:[]},'no inbox is not an error');
});

test('E writes into its own worktree while O and S use the project checkout',async()=>{
  const projects=[{workspace:'/repo',sessions:[{sessionId:'o',role:'orchestrator'},{sessionId:'s',role:'discussion'}]},
    {workspace:'/repo/.worktrees/T001',parentWorkspace:'/repo',sessions:[{sessionId:'e',role:'executor'}]},
    {workspace:'/old',archivedAt:'2026-01-01',sessions:[{sessionId:'gone',role:'orchestrator'}]}];
  const writes=[];
  const plugin=new PluginProjects({projects:{snapshot:()=>({projects})},loadContext:async()=>null,
    contextFiles:{write:async input=>{writes.push(input.workspace);return {workdir:input.workspace,directory:input.workspace,files:[]};},prune:async()=>({removed:[]})}});
  assert.equal(plugin.contextWorkspace({role:'E',local_session_id:'e'}),'/repo/.worktrees/T001');
  assert.equal(plugin.contextWorkspace({role:'O',local_session_id:'o'}),'/repo');
  assert.equal(plugin.contextWorkspace({role:'S',local_session_id:'s'}),'/repo');
  for(const target of [{role:'O',local_session_id:'e'},{role:'E',local_session_id:'o'},{role:'O',local_session_id:'gone'},{role:'O',local_session_id:'missing'}])
    assert.throws(()=>plugin.contextWorkspace(target),{code:'PLUGIN_COMMUNICATION_CONTEXT'},JSON.stringify(target));
  await plugin.communication.contextFiles.write({role:'E',local_session_id:'e'},id,[]);
  assert.deepEqual(writes,['/repo/.worktrees/T001']);
  plugin.communication.dispose();
});

test('a task whose bundle cannot reach the disk is not published and stays retryable',async()=>{
  const intent={phase:'kit_applied',operation_id:'op',message_id:id,source:{role:'O'},target:{role:'E',local_session_id:'e'},
    effect:{kind:'task',scope_id:'scope',assignment_id:'a',attempt:1},context_ref:'c'.repeat(64),contexts:[],key:'k',fingerprint:'f',created_at:'now'};
  const run={assignment_intents:{[id]:intent},members:{e:{id:'e',target:{local_session_id:'e'}}},messages:[]};
  let failure=Object.assign(new Error('disk full'),{code:'ENOSPC'});
  const c={run:()=>run,enrollment:{validate:async()=>{}},contextFiles:{},event(){},workflow:{receipt:message=>({message_id:message.message_id})},
    taskFiles:async()=>{if(failure)throw failure;return {};}};
  const dialogue=new AssignmentDialogue(c,null),receipt={operation_id:'op',message_id:id,task_id:'T001',attempt:1};
  await assert.rejects(dialogue.publish({message_id:id,receipt}),{code:'PLUGIN_COMMUNICATION_CONTEXT_FILES_PENDING'});
  assert.equal(run.messages.length,0);assert.equal(intent.phase,'kit_applied');
  failure=Object.assign(new Error('conflict'),{code:'CONTEXT_FILES_CONFLICT'});
  await assert.rejects(dialogue.publish({message_id:id,receipt}),{code:'CONTEXT_FILES_CONFLICT'});
  assert.equal(run.messages.length,0);
  failure=null;
  assert.deepEqual(await dialogue.publish({message_id:id,receipt}),{message_id:id});
  assert.equal(run.messages.length,1);assert.equal(intent.phase,'published');
});
