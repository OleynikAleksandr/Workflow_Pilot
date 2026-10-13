import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readCommandActivity,acknowledgeUnknownCommand,currentBootIdentity} from '../src/command-activity.mjs';

async function fixture(t) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'command-witness-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const dir=path.join(root,'.harness/runtime/command-activity');await fs.mkdir(dir,{recursive:true});
 const write=async(id,patch={})=>fs.writeFile(path.join(dir,id+'.json'),JSON.stringify({version:2,id,workspace:root,cwd:root,
  executor_pid:123456,executor_instance:'instance',started_at_ms:Date.now(),process_id:'abc123',state:'running',...patch}));
 return {root,dir,write};
}
test('command projection distinguishes terminal proof, protected services and writable commands',async t=>{
 const f=await fixture(t);
 await f.write('done',{state:'completed',exit_code:0});
 await f.write('server',{read_only_verified:true,sandbox_policy:'readOnly'});
 let view=await readCommandActivity(f.root,{isDead:()=>false});
 assert.equal(view.commandActive,false);assert.equal(view.deletionBlocked,true);assert.equal(view.services.length,1);
 await f.write('writer');view=await readCommandActivity(f.root,{isDead:()=>false});
 assert.equal(view.commandActive,true);assert.equal(view.commands.find(c=>c.id==='writer').blocksDeletion,true);
});
test('read-only UNKNOWN after restart cannot write, while legacy and incomplete evidence remain blocked',async t=>{
 const f=await fixture(t);
 await f.write('server',{read_only_verified:true,sandbox_policy:'readOnly'});
 await f.write('fake',{read_only_verified:true,sandbox_policy:'dangerFullAccess'});
 await fs.writeFile(path.join(f.dir,'legacy.json'),JSON.stringify({version:1,executor_pid:123456,started_at_ms:Date.now()}));
 const view=await readCommandActivity(f.root,{isDead:()=>true});
 assert.equal(view.commands.find(c=>c.id==='server').state,'unknown');
 assert.equal(view.commands.find(c=>c.id==='server').blocksIntegration,false);
 for(const id of ['fake','legacy'])assert.equal(view.commands.find(c=>c.id===id).blocksIntegration,true);
 assert.equal(view.deletionBlocked,true);
});
test('UNKNOWN acknowledgement binds exact ID and digest, refuses a live executor and never invents success',async t=>{
 const f=await fixture(t);await f.write('writer');
 const view=await readCommandActivity(f.root,{isDead:()=>true}),item=view.commands[0];
 const input={id:item.id,digest:item.digest,confirmation:item.id};
 await assert.rejects(acknowledgeUnknownCommand(f.root,{...input,confirmation:'other'},{isDead:()=>true}),{code:'COMMAND_CONFIRMATION'});
 await assert.rejects(acknowledgeUnknownCommand(f.root,input,{isDead:()=>false}),{code:'COMMAND_CHANGED'});
 await assert.rejects(acknowledgeUnknownCommand(f.root,{...input,digest:'changed'},{isDead:()=>true}),{code:'COMMAND_CHANGED'});
 const next=await acknowledgeUnknownCommand(f.root,input,{isDead:()=>true});
 assert.equal(next.commandActive,false);assert.equal(next.deletionBlocked,true);assert.equal(next.commands[0].exitCode,null);
 assert.equal(next.commands[0].state,'acknowledged_unknown');
});
test('malformed, symlink and terminal-without-exit records fail closed; temporary atomic writes are ignored',async t=>{
 const f=await fixture(t);await f.write('badexit',{state:'completed'});await fs.writeFile(path.join(f.dir,'broken.json'),'{');
 await fs.writeFile(path.join(f.dir,'pending.tmp'),'{}');await fs.symlink(path.join(f.dir,'badexit.json'),path.join(f.dir,'link.json'));
 const view=await readCommandActivity(f.root,{isDead:()=>true});
 assert.equal(view.commands.length,3);assert.ok(view.commands.every(c=>c.blocksIntegration&&c.blocksDeletion));
});

test('F05 previous-boot deletion exception uses boot identity, not an adjustable wall clock',async t=>{
 const f=await fixture(t),older='181c680c-917c-4d02-bb43-bf00e32dea75';
 const newer='8a6e25ef-d64e-4811-b19a-6a2dd471f106';
 await f.write('ack',{state:'acknowledged_unknown',acknowledged_at_ms:Date.now(),
   boot_id:older,started_at_ms:Date.now()+86400000});
 const read=(bootId,isDead)=>readCommandActivity(f.root,{bootId,isDead});
 let item=(await read(older,()=>true)).commands[0];
 assert.equal(item.blocksDeletion,true,'same boot stays blocked even when wall clock moved');
 item=(await read(newer,()=>true)).commands[0];
 assert.equal(item.blocksDeletion,false,'proved earlier boot with dead executor preserves exception');
 assert.equal(item.state,'acknowledged_unknown');assert.equal(item.exitCode,null);
 assert.equal(item.blocksIntegration,false,'manual acknowledgement is not fabricated completion');
 item=(await read(newer,()=>false)).commands[0];
 assert.equal(item.blocksDeletion,true,'an observed live PID must be investigated');
 for(const bootId of [null,'',older]){
  item=(await read(bootId,()=>true)).commands[0];assert.equal(item.blocksDeletion,true);
 }
 await f.write('ack',{state:'acknowledged_unknown',acknowledged_at_ms:Date.now(),
   started_at_ms:1});item=(await read(newer,()=>true)).commands[0];
 assert.equal(item.blocksDeletion,true,'old record without boot identity has no reboot proof');
 await f.write('ack',{state:'acknowledged_unknown',acknowledged_at_ms:Date.now(),
   started_at_ms:-123,boot_id:older});
 item=(await read(newer,()=>true)).commands[0];
 assert.equal(item.blocksDeletion,true,'invalid timestamp is not a valid v2 record');
});

test('boot identity probe is fail-closed when unavailable, and normalizes verified UUIDs',()=>{
 const uuid='181C680C-917C-4D02-BB43-BF00E32DEA75';
 assert.equal(currentBootIdentity({platform:'darwin',run:()=>uuid+'\n'}),uuid.toLowerCase());
 assert.equal(currentBootIdentity({platform:'linux',readFile:()=>uuid+'\n'}),uuid.toLowerCase());
 for(const value of ['random','yesterday',''])assert.equal(currentBootIdentity({platform:'darwin',run:()=>value}),null);
 assert.equal(currentBootIdentity({platform:'win32'}),null,'no unverified wall-clock approximation');
 assert.equal(currentBootIdentity({platform:'darwin',run:()=>{throw Error('absent');}}),null);
});
