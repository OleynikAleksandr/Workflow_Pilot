import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {install} from '../packages/workflow-kit/src/lib/installer.mjs';

const product=path.resolve(import.meta.dirname,'..');
const within=(file,root)=>file===root||file.startsWith(root+path.sep);
function destination(value){
  if(!value||!path.isAbsolute(value))throw Error('An explicit absolute new directory is required.');
  const target=path.resolve(value);
  for(const forbidden of [product,path.join(path.dirname(product),'Project Web Pilot')])
    if(within(target,forbidden)||within(forbidden,target))throw Error('Product and donor paths are forbidden.');
  if(target.split(path.sep).includes('probe-20261018-1748'))throw Error('The previous experiment is forbidden.');
  try{fs.lstatSync(target);throw Error('Destination already exists; nothing was changed.');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  let current=path.dirname(target);
  for(;;){const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Destination ancestors must be real directories.');
    const parent=path.dirname(current);if(parent===current)break;current=parent;}
  return target;
}
const files={
  '.gitignore':'node_modules/\n',
  'README.md':'# Automatic agent dialogue experiment\nImplement normalization, validation and a combined record function in three assignments. No global environment changes are needed.\n',
  'src/normalize.mjs':"export function normalize(value) { throw new Error('Implement trim, collapse whitespace and lowercase'); }\n",
  'src/validate.mjs':"import {minimumAge} from './policy.mjs';\nexport function validate(value) { throw new Error('Implement finite integer age >= minimumAge'); }\n",
  'src/record.mjs':"export function record(name, age) { throw new Error('Compose normalization and validation'); }\n",
  'tests/normalize.test.mjs':"import test from 'node:test';import assert from 'node:assert/strict';import {normalize} from '../src/normalize.mjs';test('normalize',()=>{assert.equal(normalize('  Ada   LOVELACE  '),'ada lovelace');assert.equal(normalize('  '),'');assert.throws(()=>normalize(null),TypeError);});\n",
  'tests/validate.test.mjs':"import test from 'node:test';import assert from 'node:assert/strict';import {validate} from '../src/validate.mjs';import {minimumAge} from '../src/policy.mjs';test('policy boundary',()=>{assert.equal(validate(minimumAge),true);for(const age of [minimumAge-1,NaN,Infinity,'30',null,minimumAge+0.5])assert.equal(validate(age),false);});\n",
  'tests/record.test.mjs':"import test from 'node:test';import assert from 'node:assert/strict';import {record} from '../src/record.mjs';import {minimumAge} from '../src/policy.mjs';test('composed result',()=>{assert.deepEqual(record('  Ada   LOVELACE ',minimumAge),{name:'ada lovelace',age:minimumAge});assert.throws(()=>record('Ada',minimumAge-1),RangeError);assert.throws(()=>record(' ',minimumAge),TypeError);});\n",
  'vendor/policy-alpha/index.mjs':'export const minimumAge=21;\n',
  'vendor/policy-beta/index.mjs':'export const minimumAge=18;\n',
  'TASKS.md':`# Three substantive assignments

T001: implement src/normalize.mjs; check npm run test:normalize. Trim, collapse whitespace to one space and lowercase strings; reject nonstrings with TypeError. Own only this module and its test.

T002: implement src/validate.mjs and src/policy.mjs; check npm run test:validate. Accept finite integer ages at least minimumAge. Both local policy packages are valid technical choices. The product policy is held by the orchestrator, not specified in this repository: do not guess it or alter tests to hide its absence. Inspect the actual failing import and local packages, then send a blocking question through workflow_assignment_send with facts, attempts and resume point. After a correlated decision, import minimumAge from the chosen installed package and finish the same task. Own only these modules and the validation test; never change global configuration.

T003: after verified integration of T001 and T002, implement src/record.mjs. Compose both functions; return {name, age}; blank normalized name throws TypeError, invalid age throws RangeError. Check npm test. Own only this module and its test. Required DOCS is additional, not a substitute for T003.
`
};

export function prepareExperiment(value){
  const target=destination(value);fs.mkdirSync(target);const workspace=path.join(target,'workspace');fs.mkdirSync(workspace);
  const write=(name,text)=>{const file=path.join(workspace,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text,{flag:'wx'});};
  for(const [name,text] of Object.entries(files))write(name,text);
  for(const name of ['alpha','beta'])write(`vendor/policy-${name}/package.json`,JSON.stringify({name:`@dialogue/policy-${name}`,version:'1.0.0',type:'module',exports:'./index.mjs'},null,2)+'\n');
  write('package.json',JSON.stringify({name:'automatic-dialogue-experiment',version:'1.0.0',private:true,type:'module',scripts:{test:'node --test tests/*.test.mjs','test:normalize':'node --test tests/normalize.test.mjs','test:validate':'node --test tests/validate.test.mjs'},dependencies:{'@dialogue/policy-alpha':'file:vendor/policy-alpha','@dialogue/policy-beta':'file:vendor/policy-beta'}},null,2)+'\n');
  const run=(command,args)=>execFileSync(command,args,{cwd:workspace,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')))});
  if(process.platform==='win32'){
    const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
    run(process.execPath,[npm,'install','--package-lock-only','--ignore-scripts','--offline','--no-audit','--no-fund']);
  }else run('npm',['install','--package-lock-only','--ignore-scripts','--offline','--no-audit','--no-fund']);
  run('git',['init','-b','main']);run('git',['config','user.name','Dialogue Experiment']);run('git',['config','user.email','experiment@example.invalid']);
  run('git',['add','--',...Object.keys(files),'package.json','package-lock.json','vendor/policy-alpha/package.json','vendor/policy-beta/package.json']);
  run('git',['commit','-m','test: isolated dialogue baseline']);install({project:workspace,mode:'existing'});
  fs.writeFileSync(path.join(target,'ORCHESTRATOR_BRIEF.md'),`# Orchestrator-only product decision

Open workspace as a new Workflow Pilot project with two allowed parallel workers and a new Chat orchestrator. Use its ordinary startup and automatically opened panel. Discuss, review when enabled, and publish a new orchestrated plan for TASKS.md, with T001 and T002 independent and T003 dependent on both integrations. Assign npm checks from package.json. Do not start until the user's single Start.

This is live scenario B for the orchestrator-owned dialogue. After Start, read each ready event and send each executor its own task and only the selected context through workflow_assignment_send. Do not rely on backend task text or DOM delivery. The plan's context_pack is your input for selection, not an automatic attachment to E.

The product choice for T002 is @dialogue/policy-alpha, minimumAge 21. Keep this decision in the orchestrator discussion; do not copy this brief or the decision into the repository, plan, specification or executor context before the question. The executor must encounter the genuine missing src/policy.mjs import, inspect both installed choices, and send a blocking question through workflow_assignment_send. First ask a clarification about the available packages; wait for its facts, then send the choice and resume=true for the same block_id. Use read/yield and end each waiting turn without model polling. This is an isolated policy-decision test, not a request to sabotage an environment.

Require each executor to send result with its checked source_commit and Kit proof after commit. Read the report, inspect its changes, accept that exact result through the channel, then call Kit integration:start/continue. READY is not a report or acceptance. After both integrations send T003 its task and selected context; assign DOCS likewise, then perform cleanup and the final response. No manual join, IDs, Enable, executor panel visits or user continuation. Save evidence in REPORT.md outside the workspace. Do not run models or manipulate windows from this preparation script.
`,{flag:'wx'});
  fs.writeFileSync(path.join(target,'REPORT.md'),`# Live automatic dialogue report

A (separate basic two-executor run): NOT_RUN
B (this multihop dialogue experiment): NOT_RUN
C (separate revision experiment): NOT_RUN
D (separate five-executor/background/restart/deletion runs): NOT_RUN

- Application / backend / panel build / protocol / Kit / sourceCommit:
- Client (embedded Workflow Pilot), orchestrator Chat:
- New project / scope / sessions / assignments / task IDs:
- User actions (one Start expected after normal preparation):
- Host confirmation required per new chat (yes means automation FAIL):
- Manual executor panel opening / join / ID / Enable / continuation (any means automation FAIL):
- Bootstrap, bind, O-authored task and selected context for each executor:
- Actual error, attempts, block_id, question/read/clarification/facts/decision/resume timestamps:
- Verification, E-authored result, source_commit, O acceptance and checked integration:
- Dependency integrations, third assignment, result, DOCS, cleanup, final turn and grant revocation:
- Export fixed through_seq / completed pages / gaps:
- Optional interface close/reopen times; events before versus after close:
- Missing evidence and observed errors:

Accepted notification is not a read; read is not a completed task. Fixtures do not fill this report. Manual recovery cannot turn the original failed automation into PASS. Do not include enrollment tickets, credentials or raw host metadata.
`,{flag:'wx'});
  return {workspace,brief:path.join(target,'ORCHESTRATOR_BRIEF.md'),report:path.join(target,'REPORT.md'),live:'NOT_RUN'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{if(process.argv.length!==3)throw Error('Usage: node scripts/prepare-agent-dialogue-experiment.mjs /absolute/new-directory');console.log(JSON.stringify(prepareExperiment(process.argv[2]),null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
