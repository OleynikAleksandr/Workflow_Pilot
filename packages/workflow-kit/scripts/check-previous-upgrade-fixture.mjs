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
  // The previous release did not ignore .workflow-temp/.
  const files=path.join(source,'lib/installation-files.mjs'),filesText=await fs.readFile(files,'utf8');
  assert.ok(filesText.includes('dist/\\n.workflow-temp/\\n'));
  await fs.writeFile(files,filesText.replace('dist/\\n.workflow-temp/\\n','dist/\\n').replace('\\n.DS_Store\\n','\\n'));
  const previous=await import(pathToFileURL(path.join(source,'lib/installer.mjs')).href);
  const project=async directory=>{
    await fs.mkdir(directory);
    const run=(...args)=>execFileSync('git',['-C',directory,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    run('init','-b','main');run('config','user.name','Upgrade Fixture');run('config','user.email','fixture@example.invalid');
    await fs.writeFile(path.join(directory,'README.md'),'# Upgrade fixture\n');run('add','README.md');run('commit','-m','fixture');
    previous.install({project:directory,mode:'existing'});return run;
  };
  // A user edit inside the Kit .gitignore section stops the upgrade without changes.
  const edited=path.join(temporary,'edited'),runEdited=await project(edited);
  const ignoreFile=path.join(edited,'.gitignore'),ignored=await fs.readFile(ignoreFile,'utf8');
  assert.ok(!ignored.includes('.workflow-temp/'));
  await fs.writeFile(ignoreFile,ignored.replace('dist/\n','dist/\nbuild/\n'));
  const editedHead=runEdited('rev-parse','HEAD');
  assert.throws(()=>installer.install({project:edited,mode:'existing',update:true}),{code:'MODIFIED_INTEGRATION'});
  assert.equal(runEdited('rev-parse','HEAD'),editedHead);assert.ok((await fs.readFile(ignoreFile,'utf8')).includes('build/'));
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],
    ...(args[0]==='check-ignore'?{env:{...process.env,GIT_LITERAL_PATHSPECS:'0'}}:{})}).trim();
  git('init','-b','main');git('config','user.name','Upgrade Fixture');git('config','user.email','fixture@example.invalid');
  await fs.writeFile(path.join(root,'README.md'),'# Upgrade fixture\n');
  await fs.writeFile(path.join(root,'.gitignore'),'# User rules\nuser-cache/\n');
  await fs.mkdir(path.join(root,'tracked'));await fs.writeFile(path.join(root,'tracked/.DS_Store'),'tracked metadata');
  git('add','README.md','.gitignore','tracked/.DS_Store');git('commit','-m','fixture');
  assert.equal(previous.install({project:root,mode:'existing'}).version,'1.7.1');
  await fs.mkdir(path.join(root,'nested'));
  await fs.writeFile(path.join(root,'.DS_Store'),'root finder metadata');
  await fs.writeFile(path.join(root,'nested/.DS_Store'),'nested finder metadata');
  const planFile=path.join(root,'.harness/plans/todo-plan.md'),before=await fs.readFile(planFile,'utf8');
  const preview=installer.inspect({project:root,mode:'existing'});
  assert.equal(preview.version,'1.7.1');assert.equal(preview.upgradeable,true);
  const updated=installer.install({project:root,mode:'existing',update:true});
  assert.equal(updated.upgraded,true);assert.equal(updated.version,VERSION);
  assert.equal(await fs.readFile(planFile,'utf8'),before);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'.harness/kit-manifest.json'),'utf8')).upgraded_from,'1.7.1');
  assert.equal(git('status','--porcelain'),'');
  assert.match(await fs.readFile(path.join(root,'.gitignore'),'utf8'),/^\.workflow-temp\/$/m,'upgrade adds .workflow-temp/ to the Kit section');
  assert.match(await fs.readFile(path.join(root,'.gitignore'),'utf8'),/^\.DS_Store$/m);
  assert.match(await fs.readFile(path.join(root,'.gitignore'),'utf8'),/# User rules\nuser-cache\//);
  assert.equal(await fs.readFile(path.join(root,'.DS_Store'),'utf8'),'root finder metadata');
  assert.equal(await fs.readFile(path.join(root,'nested/.DS_Store'),'utf8'),'nested finder metadata');
  assert.equal(git('check-ignore','.DS_Store','nested/.DS_Store'),'.DS_Store\nnested/.DS_Store');
  const worktree=path.join(temporary,'linked');git('worktree','add','-b','linked-fixture',worktree);
  await fs.mkdir(path.join(worktree,'nested'));await fs.writeFile(path.join(worktree,'nested/.DS_Store'),'linked finder');
  assert.equal(execFileSync('git',['-C',worktree,'status','--porcelain'],{encoding:'utf8'}).trim(),'');
  await fs.writeFile(path.join(root,'user.txt'),'real user change');assert.match(git('status','--porcelain'),/user\.txt/);
  await fs.rm(path.join(root,'user.txt'));
  await fs.appendFile(path.join(root,'tracked/.DS_Store'),' changed');assert.match(git('status','--porcelain'),/M tracked\/\.DS_Store/);
  git('restore','tracked/.DS_Store');
  assert.equal(installer.inspect({project:root,mode:'existing'}).compatible,true);
  const head=git('rev-parse','HEAD');assert.notEqual(installer.install({project:root,mode:'existing',update:true}).upgraded,true);
  assert.equal(git('rev-parse','HEAD'),head);
  console.log(JSON.stringify({previousVersionUpgrade:true,from:'1.7.1',to:VERSION,planPreserved:true,idempotent:true,gitignoreSection:true,editedSectionStops:true}));
}finally{await fs.rm(temporary,{recursive:true,force:true});}
