import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {installer,VERSION,getRuntimeRoot} from '../index.mjs';

// Install a self-consistent previous-version fixture, then exercise the public update path.
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'kit-previous-upgrade-'));
try {
  const source=path.join(temporary,'previous'),root=path.join(temporary,'project');
  await fs.cp(getRuntimeRoot(),source,{recursive:true});await fs.mkdir(root);
  const common=path.join(source,'lib/common.mjs'),text=await fs.readFile(common,'utf8');
  assert.ok(text.includes("VERSION = '"+VERSION+"'"));
  await fs.writeFile(common,text.replace("VERSION = '"+VERSION+"'","VERSION = '1.7.1'"));
  const previous=await import(pathToFileURL(path.join(source,'lib/installer.mjs')).href);
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','main');git('config','user.name','Upgrade Fixture');git('config','user.email','fixture@example.invalid');
  await fs.writeFile(path.join(root,'README.md'),'# Upgrade fixture\n');git('add','README.md');git('commit','-m','fixture');
  assert.equal(previous.install({project:root,mode:'existing'}).version,'1.7.1');
  const planFile=path.join(root,'.harness/plans/todo-plan.md'),before=await fs.readFile(planFile,'utf8');
  const preview=installer.inspect({project:root,mode:'existing'});
  assert.equal(preview.version,'1.7.1');assert.equal(preview.upgradeable,true);
  const updated=installer.install({project:root,mode:'existing',update:true});
  assert.equal(updated.upgraded,true);assert.equal(updated.version,VERSION);
  assert.equal(await fs.readFile(planFile,'utf8'),before);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'.harness/kit-manifest.json'),'utf8')).upgraded_from,'1.7.1');
  assert.equal(git('status','--porcelain'),'');
  assert.equal(installer.inspect({project:root,mode:'existing'}).compatible,true);
  const head=git('rev-parse','HEAD');assert.notEqual(installer.install({project:root,mode:'existing',update:true}).upgraded,true);
  assert.equal(git('rev-parse','HEAD'),head);
  console.log(JSON.stringify({previousVersionUpgrade:true,from:'1.7.1',to:VERSION,planPreserved:true,idempotent:true}));
}finally{await fs.rm(temporary,{recursive:true,force:true});}
