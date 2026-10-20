import fs from 'node:fs';
import path from 'node:path';
import {check} from './common.mjs';

// A checked commit is not permission to change an executor checkout while its
// command is still running. Unknown/malformed markers remain a concrete blocker.
export function assertAssignmentCommandsIdle(record) {
  if(record.dialogue_version!==1)return;
  const directory=path.join(record.worktree,'.harness/runtime/command-activity');
  let entries;
  try {
    for(const relative of ['.harness','.harness/runtime','.harness/runtime/command-activity'])
      check(!fs.lstatSync(path.join(record.worktree,relative)).isSymbolicLink(),'ASSIGNMENT_COMMAND_ACTIVE','Каталог команд является ссылкой.');
    entries=fs.readdirSync(directory);
  }catch(error){if(error.code==='ENOENT')return;throw error;}
  for(const name of entries.filter(n=>!n.endsWith('.tmp'))){
    let safe=false;
    try {
      const file=path.join(directory,name),stat=fs.lstatSync(file);
      if(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=16384){
        const r=JSON.parse(fs.readFileSync(file,'utf8'));
        const valid=r.version===2&&r.id===name.replace(/\.json$/,'')&&r.workspace===record.worktree
          &&typeof r.executor_instance==='string'&&Number.isSafeInteger(r.started_at_ms)&&r.started_at_ms>0;
        safe=valid&&((r.state==='completed'&&Number.isInteger(r.exit_code))
          ||(r.state==='acknowledged_unknown'&&Number.isFinite(r.acknowledged_at_ms)&&r.acknowledged_at_ms>0)
          ||(['starting','running'].includes(r.state)&&r.read_only_verified===true&&r.sandbox_policy==='readOnly'
            &&typeof r.process_id==='string'&&r.process_id.length>0));
      }
    }catch{}
    check(safe,'ASSIGNMENT_COMMAND_ACTIVE','Команда исполнителя ещё активна или её исход не подтверждён.',{marker:name});
  }
}
