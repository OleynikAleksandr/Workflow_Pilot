import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {installer,plan as planApi} from '@webpilot/workflow-kit';
import {validateConfig,validateDocumentSizes,validateDocumentationCommit} from '@webpilot/workflow-kit/lib/validate';
import {commitCandidate} from '@webpilot/workflow-kit/lib/transaction';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'workflow-document-limit-'));
const file=name=>path.join(root,name);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const write=(name,text)=>{fs.mkdirSync(path.dirname(file(name)),{recursive:true});fs.writeFileSync(file(name),text);};
const input=(name,value)=>{const p='.harness/runtime/'+name+'.json';write(p,JSON.stringify(value));return file(p);};
function cli(args,ok=true){
  const result=spawnSync(process.execPath,[file('scripts/workflow.mjs'),...args],{cwd:root,encoding:'utf8'});
  const value=JSON.parse(result.stdout);assert.equal(value.ok,ok,JSON.stringify(value));return value;
}
const docs=(names,ok=true)=>cli(['docs:commit','--files',JSON.stringify(names),'--message','docs: limit fixture'],ok);
const oversized=(value,name,bytes,command)=>{
  assert.equal(value.code,'COMMIT_FAILED');
  const output=value.details.output;assert.ok(output.includes(name),output);
  assert.ok(output.includes(String(bytes))&&output.includes('28000')&&output.includes(command),output);
};
try {
  git('init','-b','main');git('config','user.name','Document Fixture');git('config','user.email','fixture@example.invalid');
  write('README.md','# Fixture\n');write('docs/legacy.md','л'.repeat(20000));
  write('AGENTS.override.md','# Project override\n');
  git('add','.');git('commit','-m','test: committed large legacy document');
  installer.install({project:root,mode:'existing'});
  const config=JSON.parse(fs.readFileSync(file('.harness/workflow.json'),'utf8'));
  assert.equal(config.budget.document_bytes,28000);
  assert.equal(config.budget.soft_tokens,undefined);assert.equal(config.budget.hard_tokens,undefined);
  assert.doesNotThrow(()=>validateConfig({...config,budget:{hard_bytes:180000,soft_tokens:1,hard_tokens:1}}));
  assert.throws(()=>validateConfig({...config,budget:{...config.budget,document_bytes:0}}),{code:'CONFIG_SCHEMA'});
  cli(['config:apply','--input',input('legacy-config',{...config,budget:{hard_bytes:180000,soft_tokens:1,hard_tokens:1}})]);
  assert.equal(cli(['recover','--format','json']).budget.document_bytes,28000,'legacy token values do not create a second limit');
  cli(['config:apply','--input',input('current-config',config)]);
  for(const p of ['docs/PRODUCT.md','docs/MODULES.md','docs/DOCUMENTATION_INDEX.md','docs/WORKFLOW_START.md','docs/architecture/ARCHITECTURE.md']) assert.equal(fs.existsSync(file(p)),false);

  const agents='AGENTS.override.md', good=fs.readFileSync(file(agents),'utf8');
  write(agents,good+'\nProject-only edit.\n');docs([agents]);
  const saved=fs.readFileSync(file(agents),'utf8'), bad=saved.replace('<!-- workflow-kit:begin -->','<!-- workflow-kit:begin -->changed');
  write(agents,bad);git('add',agents);write(agents,saved);
  assert.throws(()=>validateDocumentationCommit(root,[agents],planApi.readPlan(root)),{code:'MODIFIED_INTEGRATION'});
  git('add',agents);write(agents,bad);
  assert.doesNotThrow(()=>validateDocumentationCommit(root,[agents],planApi.readPlan(root)));
  assert.equal(docs([agents],false).code,'COMMIT_FAILED');
  assert.equal(fs.readFileSync(file(agents),'utf8'),bad,'refusal preserves edits');
  fs.unlinkSync(file(agents));assert.equal(docs([agents],false).code,'COMMIT_FAILED');
  assert.equal(fs.existsSync(file(agents)),false,'refusal preserves deletion');
  write(agents,saved);git('add',agents);

  for(const name of ['upper.MD','mixed.mD','long.markdown','upper.MARKDOWN']) {
    write(name,'я'.repeat(14000));git('add',name);
    assert.doesNotThrow(()=>validateDocumentSizes(root,[name],{role:'implementation',task_id:'T001',selected:[name]}));
    write(name,'я'.repeat(14000)+'x');git('add',name);write(name,'small');
    assert.throws(()=>validateDocumentSizes(root,[name],{role:'implementation',task_id:'T001',selected:[name]}),
      error=>error.code==='DOCUMENT_TOO_LARGE'&&error.details.path===name&&error.details.bytes===28001);
    git('rm','--cached','-f',name);fs.unlinkSync(file(name));
  }

  write('boundary.md','я'.repeat(14000));docs(['boundary.md']);
  write('boundary.md','я'.repeat(14000)+'x');
  oversized(docs(['boundary.md'],false),'boundary.md',28001,'docs:commit');
  assert.equal(fs.statSync(file('boundary.md')).size,28001);
  write('boundary.md','я'.repeat(14000)+'я');git('add','boundary.md');
  write('boundary.md','# Small worktree\n');
  for(const role of ['implementation','documentation','scope-plan','plan-adjustment','bootstrap','kit-update','archive','plan-carryover','repair']) {
    assert.throws(()=>validateDocumentSizes(root,['boundary.md'],{role,task_id:'T001',selected:['boundary.md']}),
      error=>error.code==='DOCUMENT_TOO_LARGE'&&error.details.bytes===28002&&error.details.limit===28000&&Boolean(error.details.retry_command));
  }
  git('add','boundary.md');write('boundary.md','я'.repeat(14001));
  assert.doesNotThrow(()=>validateDocumentSizes(root,['boundary.md'],{role:'documentation',selected:['boundary.md']}),'index, not working tree');
  write('boundary.md','# Small worktree\n');docs(['boundary.md']);
  fs.renameSync(file('boundary.md'),file('renamed.md'));docs(['boundary.md','renamed.md']);
  fs.unlinkSync(file('renamed.md'));docs(['renamed.md']);

  const planBefore=fs.readFileSync(file('.harness/plans/todo-plan.md'),'utf8');
  write('.harness/plans/todo-plan.md',planBefore+'x'.repeat(40000));git('add','.harness/plans/todo-plan.md');
  assert.doesNotThrow(()=>validateDocumentSizes(root,['.harness/plans/todo-plan.md'],{role:'implementation',task_id:'T001',selected:[]}));
  write('.harness/plans/todo-plan.md',planBefore);git('add','.harness/plans/todo-plan.md');
  write('.harness/plans/todo-plan.template.md','x'.repeat(28001));git('add','.harness/plans/todo-plan.template.md');
  assert.throws(()=>validateDocumentSizes(root,['.harness/plans/todo-plan.template.md'],{role:'kit-update',selected:[]}),{code:'DOCUMENT_TOO_LARGE'});
  write('.harness/plans/todo-plan.template.md',execFileSync('git',['show','HEAD:.harness/plans/todo-plan.template.md'],{cwd:root}));git('add','.harness/plans/todo-plan.template.md');

  const spec='docs/planning/size.md';write(spec,'x'.repeat(28001));
  const draft=input('plan',{id:'document-size',spec,objective:'Byte limits before every check',stack:'Node',
    checks:[{id:'proof',kind:'test',executable:process.execPath,args:['-e','require("fs").writeFileSync(".harness/runtime/proof.txt","passed")']}],
    tasks:[{id:'T001',title:'Task candidate',files:['code.mjs','notes.md'],checks:['proof']}]});
  oversized(cli(['plan:create','--input',draft],false),spec,28001,'plan:create');
  assert.equal(planApi.readPlan(root).execution_scope_status,'NONE');assert.equal(fs.statSync(file(spec)).size,28001);
  write(spec,'# Size checks\n');cli(['plan:create','--input',draft]);cli(['task:start','T001']);
  write('code.mjs','export const result = true;\n');write('notes.md','😀'.repeat(7000)+'x');
  oversized(cli(['commit','--task','T001'],false),'notes.md',28001,'commit --task T001');
  assert.equal(fs.existsSync(file('.harness/runtime/proof.txt')),false,'size check precedes tests');
  assert.equal(fs.statSync(file('notes.md')).size,28001);assert.equal(planApi.readPlan(root).current_task_id,'T001');
  write('notes.md','😀'.repeat(7000));cli(['commit','--task','T001']);
  assert.equal(fs.readFileSync(file('.harness/runtime/proof.txt'),'utf8'),'passed');
  assert.equal(fs.statSync(file('docs/legacy.md')).size,40000,'untouched legacy document does not block a task');
  fs.appendFileSync(file('docs/legacy.md'),'x');oversized(docs(['docs/legacy.md'],false),'docs/legacy.md',40001,'docs:commit');
  write('docs/legacy.md','л'.repeat(20000));

  const owned='.harness/kit/templates/SPEC.md', original=fs.readFileSync(file(owned));
  write(owned,'x'.repeat(28001));
  assert.throws(()=>commitCandidate(root,{plan:planApi.readPlan(root),role:'kit-update',selected:[owned],message:'chore: update fixture',beforeHead:git('rev-parse','HEAD')}),
    error=>error.code==='COMMIT_FAILED'&&error.details.output.includes('DOCUMENT_TOO_LARGE')&&error.details.output.includes('install --update'));
  assert.equal(fs.statSync(file(owned)).size,28001);write(owned,original);
  assert.equal(git('status','--porcelain'),'');
  console.log(JSON.stringify({ok:true,documentBytes:28000,index:true,allRoles:true,preTest:true,legacy:true,editsPreserved:true}));
} finally {fs.rmSync(root,{recursive:true,force:true});}
