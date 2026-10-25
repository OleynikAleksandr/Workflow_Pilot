import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {SettingsService} from '../src/control/settings/service.mjs';
import {FileAdapter} from '../src/execution/files/adapter.mjs';
import {ExecutionControl} from '../src/control/workflow/execution-control.mjs';
import {UserChoices} from '../src/control/workflow/user-choices.mjs';

test('real settings roundtrip restores execution blocks and choice identity through the actual load boundary',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pilot-settings-workflow-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const file=path.join(dir,'settings.json'),control=new ExecutionControl();
  control.selectRoute('/fixture','scope','plugin-v1');control.block('/fixture','scope',{code:'MAIN_DIRTY',message:'src/user.txt',paths:['src/user.txt']});
  const choices=new UserChoices({facts:()=>[{session_id:'o',workspace:'/fixture',kind:'mode',key:'mode:1',data:{recommended:'orchestrated'}}]});
  choices.reconcile();const id=choices.view('o').choice_id;
  const state={executionControl:control.snapshot(),userChoices:choices.snapshot(),parallelExecutionBook:{}};
  const settings=new SettingsService({file,files:new FileAdapter(),workflowSnapshot:()=>state});await settings.save();
  const fresh=new SettingsService({file,files:new FileAdapter(),workflowSnapshot:()=>({})}),restored=await fresh.load();
  const restarted=new ExecutionControl({saved:restored.executionControl});restarted.revokeAfterRestart();
  assert.equal(restarted.view('/fixture','scope').reason,'blocked');assert.deepEqual(restarted.view('/fixture','scope').issue.paths,['src/user.txt']);
  const cards=new UserChoices({facts:()=>[]});cards.restore(restored.userChoices);
  assert.equal(cards.view('o').choice_id,id);assert.equal(cards.view('o').generation,1);
});
