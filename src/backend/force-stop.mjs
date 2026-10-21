import { execFileSync } from 'node:child_process';

// Only this live process and its descendants. Never find processes by name or
// trust a stale PID from a saved descriptor. Used after a bounded cleanup grace.
export function forceExitOwnTree({pid=process.pid,platform=process.platform,execute=execFileSync,
  signal=(id,name)=>process.kill(id,name),exit=code=>process.exit(code)}={}) {
  try {
    if (platform==='win32') {
      execute('taskkill.exe',['/PID',String(pid),'/T','/F'],{windowsHide:true,timeout:2000,stdio:'ignore'});
    } else {
      const table=String(execute('ps',['-axo','pid=,ppid='],{encoding:'utf8',timeout:1000,maxBuffer:2*1024*1024}));
      const rows=table.trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number))
        .filter(([id,parent])=>Number.isSafeInteger(id)&&id>1&&Number.isSafeInteger(parent)&&parent>=0);
      const descendants=new Set([pid]);
      for(let changed=true;changed;){changed=false;for(const [id,parent] of rows)
        if(descendants.has(parent)&&!descendants.has(id)){descendants.add(id);changed=true;}}
      // Check current parentage again immediately before signalling. Processes
      // that exited/reparented meanwhile are not selected by a stale snapshot.
      const current=String(execute('ps',['-axo','pid=,ppid='],{encoding:'utf8',timeout:1000,maxBuffer:2*1024*1024}));
      const parents=new Map(current.trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number)));
      const stillOwned=id=>{const seen=new Set();while(id!==pid){if(seen.has(id)||!descendants.has(id))return false;seen.add(id);id=parents.get(id);}return true;};
      const targets=[...descendants].filter(id=>id!==pid&&stillOwned(id)).reverse();
      for(const id of targets){try{signal(id,'SIGKILL');}catch{/* already exited */}}
    }
  } catch { /* Exit still terminates Electron pages if enumeration is unavailable. */ }
  finally { exit(1); }
}

export function createForceStop({stop,forceExit=forceExitOwnTree,onRequest=()=>{},schedule=setTimeout,graceMs=2000}) {
  let requested=false;
  return () => {
    if(requested)return false;
    requested=true;
    // Install the deadline first: neither a throw nor a never-settling cleanup
    // promise is allowed to disable the emergency path.
    schedule(()=>forceExit(),graceMs);
    try{onRequest();}catch{}
    try{Promise.resolve(stop()).catch(()=>{});}catch{}
    return true;
  };
}
