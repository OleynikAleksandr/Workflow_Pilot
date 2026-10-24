import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {FileAdapter} from '../src/execution/files/adapter.mjs';

test('directory durability propagates fsync failure and closes its handle', {skip:process.platform==='win32'?'directory fsync is POSIX only':false},async()=>{
  const adapter=new FileAdapter(),open=fs.open,directory=path.join(os.tmpdir(),'fixture-sync-directory');let closed=0;
  fs.open=async(file,flags)=>{assert.equal(file,directory);assert.equal(flags,'r');return {
    sync:async()=>{throw Object.assign(Error('fixture sync failure'),{code:'EIO'});},close:async()=>{closed++;}};};
  try{await assert.rejects(adapter.syncDirectory(directory),{code:'EIO'});assert.equal(closed,1);}
  finally{fs.open=open;}
  await assert.rejects(adapter.syncDirectory('relative-directory'),{code:'EXECUTION_PATH_INVALID'});
});
