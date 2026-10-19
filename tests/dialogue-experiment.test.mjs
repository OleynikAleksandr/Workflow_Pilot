import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {prepareExperiment} from '../scripts/prepare-agent-dialogue-experiment.mjs';

test('experiment preparation is isolated, refuses existing/symlink/product paths and retains a real policy blocker',t=>{
  const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pilot-experiment-')));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  assert.throws(()=>prepareExperiment('relative'),/absolute/);
  assert.throws(()=>prepareExperiment(path.resolve(import.meta.dirname,'../.harness/runtime/forbidden-experiment')),/Product/);
  const existing=path.join(directory,'existing');fs.mkdirSync(existing);fs.writeFileSync(path.join(existing,'keep'),'untouched');
  assert.throws(()=>prepareExperiment(existing),/already exists/);assert.equal(fs.readFileSync(path.join(existing,'keep'),'utf8'),'untouched');
  const link=path.join(directory,'linked');fs.symlinkSync(existing,link,'dir');assert.throws(()=>prepareExperiment(path.join(link,'new')),/real directories/);
  assert.throws(()=>prepareExperiment(path.join(directory,'probe-20261018-1748')),/previous experiment/);
  const result=prepareExperiment(path.join(directory,'new'));assert.equal(result.live,'NOT_RUN');
  assert.equal(fs.existsSync(path.join(result.workspace,'src/policy.mjs')),false);
  assert.match(fs.readFileSync(result.brief,'utf8'),/policy-alpha, minimumAge 21/);
  assert.match(fs.readFileSync(result.report,'utf8'),/S1: NOT_RUN/);
  const git=(...args)=>execFileSync('git',args,{cwd:result.workspace,encoding:'utf8'}).trim();
  assert.equal(git('status','--porcelain'),'');assert.equal(git('branch','--show-current'),'main');
  assert.equal(git('ls-files').includes('ORCHESTRATOR_BRIEF'),false);
  assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',"import './src/validate.mjs'"],{cwd:result.workspace,stdio:'pipe'}),error=>{
    assert.match(String(error.stderr),/ERR_MODULE_NOT_FOUND/);assert.match(String(error.stderr),/policy.mjs/);return true;
  });
  assert.throws(()=>prepareExperiment(path.dirname(result.workspace)),/already exists/);
});
