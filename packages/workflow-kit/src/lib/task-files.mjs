import fs from 'node:fs';
import path from 'node:path';
import {atomic,json,hash,check,planPath,contextPath,isPrivate} from './common.mjs';
import {allChanges,localPath} from './git.mjs';
import {isDocumentationFinalizationTask} from './plan.mjs';

const identity=(root,plan,task)=>({plan:planPath(root),scope:plan.scope_id,task:task.id,iteration:task.commit_ref?.iteration??1});
const recordPath=(root,plan,task)=>localPath(root,'task-files-'+hash(json(identity(root,plan,task))).slice(0,24)+'.json');
const read=(file)=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const managed=p=>p.startsWith('.harness/');
function fingerprint(root,p){const f=path.join(root,p),s=fs.lstatSync(f,{throwIfNoEntry:false});if(!s)return 'deleted';if(s.isDirectory())return 'directory:'+s.mtimeMs;return hash(s.isSymbolicLink()?fs.readlinkSync(f):Buffer.concat([Buffer.from(String(s.mode)),fs.readFileSync(f)]));}
export function beginTaskFiles(root,plan,task) {
 const file=recordPath(root,plan,task),handoff=read(file+'.handoff')??[];
 const preexisting=allChanges(root).filter(p=>p!==planPath(root)&&!handoff.includes(p));
 atomic(file,json({...identity(root,plan,task),preexisting,fingerprints:Object.fromEntries(preexisting.map(p=>[p,fingerprint(root,p)]))}),0o600);
 if(fs.existsSync(file+'.handoff'))fs.unlinkSync(file+'.handoff');
}
export function handoffTaskFiles(root,plan,from,to,files,write=true) {
 const baseline=read(recordPath(root,plan,from));
 const owned=files.filter(p=>baseline&&!baseline.preexisting.includes(p));
 if(write&&owned.length)atomic(recordPath(root,plan,to)+'.handoff',json(owned),0o600);
 return owned;
}
export function selectTaskFiles(root,plan,task,explicit) {
 const changed=allChanges(root).filter(p=>p!==planPath(root));
 const baseline=read(recordPath(root,plan,task));
 if(explicit!==undefined)check(Array.isArray(explicit)&&explicit.every(p=>typeof p==='string'),'COMMIT_FILES','files должен быть массивом путей.',{field:'files',expected:'array of paths',received:explicit});
 // Explicit files express the agent's actual selection, including deliberate
 // continuation of existing work. No permission or plan-amendment round-trip.
 let selected;
 if(explicit!==undefined)selected=[...new Set(explicit)];
 else {
  check(baseline,'TASK_FILES_UNKNOWN','Нет снимка начала задачи. Укажите фактические файлы через commit --files.',{task_id:task.id,next_action:'commit --task '+task.id+' --files \'["path/to/file"]\''});
  const mixed=baseline.preexisting.filter(p=>changed.includes(p)&&baseline.fingerprints[p]!==fingerprint(root,p));
  check(!mixed.length,'EXISTING_EDITS_CHANGED','Эти файлы уже содержали правки до задачи и изменились снова. Проверьте diff и явно укажите нужные файлы через --files.',{paths:mixed,next_action:'commit --task '+task.id+' --files <JSON array of actual paths>'});
  // 1.5.6: a changed private path (.env, credentials, .codex) stays in the worktree and is reported in
  // excluded_changes; only an explicit --files entry for it is refused below.
  selected=changed.filter(p=>!baseline.preexisting.includes(p)&&!managed(p)&&!isPrivate(p));
 }
 for(const p of selected){check(!managed(p),'MANAGED_FILE','Состояние Workflow Kit изменяется его командами.',{path:p});contextPath(root,p);}
 const actual=selected.filter(p=>changed.includes(p));
 const excluded=changed.filter(p=>!actual.includes(p));
 const add=(a,b)=>[...new Set([...a,...b])];
 task.functional_paths=add(task.functional_paths,actual.filter(p=>!p.endsWith('.md')));
 task.documentation_paths=add(task.documentation_paths,actual.filter(p=>p.endsWith('.md')));
 task.actual_files=actual;
 plan.approved_scope.functional_paths=add(plan.approved_scope.functional_paths,task.functional_paths);
 plan.approved_scope.documentation_paths=add(plan.approved_scope.documentation_paths,task.documentation_paths);
 const docs=plan.tasks.findLast(isDocumentationFinalizationTask);
 if(docs&&docs.commit_status!=='DONE')docs.documentation_paths=add(docs.documentation_paths,task.documentation_paths);
 return {selected:actual,excluded,preexisting:baseline?.preexisting??null};
}

// Verified handoff files belong to the incoming task, not to preexisting edits.
export function adoptTaskFiles(root,plan,task,files) {
 atomic(recordPath(root,plan,task)+'.handoff',json(files),0o600);
}
