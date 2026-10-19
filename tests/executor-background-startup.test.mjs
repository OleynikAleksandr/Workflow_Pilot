import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

test('two and five hidden native executor pages bootstrap through real observer and composer without selection',
  {skip:process.platform!=='darwin',timeout:90000},async t=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'pilot-background-startup-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const child=spawn((await import('electron')).default,['tests/fixtures/executor-background-startup.mjs',root],{env,stdio:['ignore','pipe','pipe']});
    let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);
    t.after(()=>{if(child.exitCode===null)child.kill('SIGTERM');});
    const code=await new Promise(resolve=>child.on('exit',resolve));assert.equal(code,0,errors+'\n'+output);
    const result=output.split('\n').map(line=>{try{return JSON.parse(line);}catch{return null;}}).find(v=>v?.backgroundBootstrap);
    assert.deepEqual(result.results.map(r=>r.count),[2,5]);
  });
