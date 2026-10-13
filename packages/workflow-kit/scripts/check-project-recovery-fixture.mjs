import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {messageFor} from '../src/lib/transaction.mjs';

// Full repository/history, not a shortened fixture plan. Never install into the source checkout.
const source = fileURLToPath(new URL('../../..', import.meta.url));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-pilot-real-recovery-'));
const root = path.join(temp, 'project');
const env = {...process.env, GIT_AUTHOR_NAME:'Recovery Fixture', GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Recovery Fixture', GIT_COMMITTER_EMAIL:'fixture@example.invalid'};
for (const key of ['GIT_DIR','GIT_INDEX_FILE','GIT_WORK_TREE','GIT_COMMON_DIR']) delete env[key];
const git = (cwd,args,input) => execFileSync('git',args,{cwd,env,input,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']});
const planFile = '.harness/plans/todo-plan.md';
const beforeHead = git(source,['rev-parse','HEAD']).trim();
const originalPlan = fs.readFileSync(path.join(source,planFile));
const originalKit = git(source,['diff','HEAD','--','.harness/kit']);
try {
  git(temp,['clone','--shared','--no-checkout',source,root]);
  git(root,['config','user.name','Recovery Fixture']);git(root,['config','user.email','fixture@example.invalid']);
  const state = git(source,['rev-parse','--git-path','workflow-kit']).trim();
  const stateRoot = path.resolve(source,state);
  const journalFile = path.join(stateRoot,'transaction.json');
  const pending = fs.existsSync(journalFile) ? JSON.parse(fs.readFileSync(journalFile,'utf8')) : null;
  // During commit checks the actual plan is already DONE. Give its exact candidate tree
  // an isolated commit with the real trailers, without altering tasks or their evidence.
  const candidate = pending?.candidate_tree
    ? git(root,['commit-tree',pending.candidate_tree,'-p',pending.before_head],messageFor(pending)).trim() : beforeHead;
  git(root,['reset','--hard',candidate]);
  const tracked = git(source,['ls-files','-z']).split('\0').filter(Boolean);
  const extraDocs = git(source,['ls-files','--others','--exclude-standard','-z','--','docs']).split('\0').filter(Boolean);
  for (const file of new Set([...tracked,...extraDocs])) {
    const from = path.join(source,file), to = path.join(root,file);
    if (fs.existsSync(from)) {fs.mkdirSync(path.dirname(to),{recursive:true});fs.cpSync(from,to,{dereference:false});}
    else fs.rmSync(to,{force:true});
  }
  assert.deepEqual(fs.readFileSync(path.join(root,planFile)),originalPlan);
  const copiedState = path.join(root,'.git/workflow-kit');fs.mkdirSync(copiedState,{recursive:true});
  for (const file of ['last-verification.json','verification']) {
    const from=path.join(stateRoot,file);
    if (fs.existsSync(from)) fs.cpSync(from,path.join(copiedState,file),{recursive:true});
  }
  const evidenceFile=path.join(copiedState,'last-verification.json');
  if (pending?.candidate_tree && fs.existsSync(evidenceFile)) {
    const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
    if(evidence.transaction_id===pending.id) {evidence.commit=candidate;fs.writeFileSync(evidenceFile,JSON.stringify(evidence));}
  }
  fs.rmSync(path.join(root,'.harness/kit'),{recursive:true,force:true});
  fs.cpSync(path.join(source,'packages/workflow-kit/src'),path.join(root,'.harness/kit'),{recursive:true});
  const load = name => import(pathToFileURL(path.join(root,'.harness/kit/lib',name+'.mjs')));
  const {readPlan,nextTask,uniqueDocuments}=await load('plan'), {recover}=await load('recovery'), {applyPlan}=await load('actions');
  const {documentText}=await load('git');
  const initial=readPlan(root);
  const done=initial.tasks.filter(t=>t.commit_status==='DONE');
  const inspect=phase=>{
    const packet=recover(root);
    assert.equal(packet.budget.hard_bytes,180000);
    assert.ok(packet.size.bytes<=144000,phase+': '+packet.size.bytes+' bytes; need >=20% reserve; sources: '
      +JSON.stringify(packet.parts.flatMap(p=>p.sources).map(s=>({source:s.source,bytes:Buffer.byteLength(s.content)}))));
    assert.ok(packet.parts.length<=7,phase+': too many parts');
    assert.ok(packet.parts.every(p=>p.bytes<=packet.budget.document_bytes));
    const sources=packet.parts.flatMap(p=>p.sources);
    for(const task of initial.tasks) {
      const text=sources.filter(s=>s.source==='task:'+task.id).map(s=>s.content).join('');
      assert.ok(text.includes(task.title)&&text.includes(task.why),'lost task '+task.id);
      for(const criterion of task.acceptance_criteria) assert.ok(text.includes(criterion),'lost criterion '+task.id);
      for(const file of [...task.functional_paths,...task.documentation_paths,...(task.actual_files??[])])
        assert.ok(text.includes(file),'lost task file '+task.id+': '+file);
    }
    const current=readPlan(root);
    for(const doc of uniqueDocuments([...current.context_pack.documents,...(nextTask(current)?.context_pack?.documents??[])])) {
      if(!doc.required||['docs/MODULES.md','docs/DOCUMENTATION_INDEX.md','AGENTS.md','AGENTS.override.md'].includes(doc.path)) continue;
      assert.equal(sources.filter(s=>s.source==='required:'+doc.path&&s.revision===doc.revision).map(s=>s.content).join(''),
        documentText(root,doc),'incomplete required source '+doc.path);
    }
    return {phase,bytes:packet.size.bytes,parts:packet.parts.length,reserve:1-packet.size.bytes/180000};
  };
  const results=[inspect('before-normalization')];
  if(initial.execution_scope_status!=='NONE') applyPlan(root,{},initial.plan_revision);
  assert.deepEqual(readPlan(root).tasks.filter(t=>t.commit_status==='DONE'),done);
  results.push(inspect('after-normalization'));
  console.log(JSON.stringify({ok:true,realProjectRecovery:results,tasks:initial.tasks.length}));
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
  assert.equal(git(source,['rev-parse','HEAD']).trim(),beforeHead);
  assert.deepEqual(fs.readFileSync(path.join(source,planFile)),originalPlan);
  assert.equal(git(source,['diff','HEAD','--','.harness/kit']),originalKit);
}
