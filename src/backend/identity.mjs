import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';

const identityError=(code,message)=>Object.assign(new Error(message),{code});
function plainDirectory(directory) {
  // macOS maps the system's /var and /tmp aliases to /private/var and
  // /private/tmp. Resolve only those OS aliases before testing user paths.
  const resolved=process.platform==='darwin'
    ? path.resolve(directory).replace(/^\/(var|tmp)(?=\/|$)/, '/private/$1')
    : path.resolve(directory);
  let current=path.parse(resolved).root;
  for(const part of path.relative(current,resolved).split(path.sep).filter(Boolean)) {
    current=path.join(current,part);
    const stat=fs.lstatSync(current,{throwIfNoEntry:false});
    if(stat?.isSymbolicLink())throw identityError('BACKEND_PROFILE_LINK','Backend не использует символьные ссылки в профиле.');
    if(stat && !stat.isDirectory())throw identityError('BACKEND_PROFILE_INVALID','Профиль занят не каталогом.');
  }
}

export function configureBackendIdentity(app,{testRoot=null}={}) {
  const dataDir=testRoot ? path.resolve(testRoot) : path.join(app.getPath('appData'),'Workflow Pilot');
  if(testRoot && (!path.isAbsolute(testRoot) || !fs.existsSync(testRoot)))
    throw identityError('BACKEND_TEST_ROOT_INVALID','Тестовый профиль должен существовать.');
  plainDirectory(dataDir);
  const browserDir=path.join(dataDir,'browser');
  plainDirectory(browserDir);
  // Same product profile and Chromium partition as legacy Desktop; its Electron
  // single-instance lock prevents simultaneous legacy and independent owners.
  app.setName('Workflow Pilot');
  app.setPath('userData',dataDir);
  app.setPath('sessionData',browserDir);
  const ownerDir=path.join(dataDir,'.backend-host');
  plainDirectory(ownerDir);
  return Object.freeze({dataDir,browserDir,ownerDir,partition:'persist:workflow-pilot-chatgpt',
    ownerFile:path.join(ownerDir,'owner.json'),serviceFile:path.join(ownerDir,'service.json')});
}

function privateDirectory(directory) {
  plainDirectory(directory);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const st=fs.lstatSync(directory);
  if(!st.isDirectory()||st.isSymbolicLink()||(process.platform!=='win32' && (st.mode&0o077)!==0))
    throw identityError('BACKEND_PROFILE_UNSAFE','Профиль backend должен быть приватным.');
}

export function claimBackendIdentity(identity,{pid=process.pid}={}) {
  privateDirectory(identity.ownerDir);
  if(fs.lstatSync(identity.serviceFile,{throwIfNoEntry:false}))
    throw identityError('BACKEND_OWNER_CONFLICT','Обнаружен прежний descriptor backend. Без восстановления второй владелец запрещён.');
  // Do not reclaim even a dead PID automatically: a stale descriptor may
  // signal a crashed writer with an incomplete transaction.
  const generation=randomBytes(16).toString('hex');
  const token=randomBytes(32).toString('hex');
  const claim={product:'workflow-pilot',pid,generation};
  try {fs.writeFileSync(identity.ownerFile,JSON.stringify(claim)+'\n',{mode:0o600,flag:'wx'});}
  catch(error) {
    if(error.code==='EEXIST')throw identityError('BACKEND_OWNER_CONFLICT','Профиль уже занят или требует безопасного восстановления.');
    throw error;
  }
  let released=false;
  const owns=()=>{
    const stat=fs.lstatSync(identity.ownerFile,{throwIfNoEntry:false});
    if(!stat?.isFile()||stat.isSymbolicLink())return false;
    try {const current=JSON.parse(fs.readFileSync(identity.ownerFile,'utf8'));
      return current.product===claim.product&&current.pid===claim.pid&&current.generation===generation;
    }catch{return false;}
  };
  const publish=port=>{
    if(!Number.isSafeInteger(port)||port<=0||port>65535||!owns())
      throw identityError('BACKEND_OWNER_CHANGED','Владелец backend больше не подтверждён.');
    // Only the owner can publish. This descriptor is not a bearer URL.
    const content=JSON.stringify({product:'workflow-pilot',pid,generation,port,token})+'\n';
    const temp=identity.serviceFile+'.'+generation+'.tmp';
    try {fs.writeFileSync(temp,content,{mode:0o600,flag:'wx'});fs.renameSync(temp,identity.serviceFile);}
    finally {fs.rmSync(temp,{force:true});}
  };
  const release=()=>{
    if(released)return false;
    released=true;
    if(!owns())return false;
    const stat=fs.lstatSync(identity.serviceFile,{throwIfNoEntry:false});
    if(stat?.isFile()&&!stat.isSymbolicLink()){
      try {const desc=JSON.parse(fs.readFileSync(identity.serviceFile,'utf8'));
        if(desc.generation===generation&&desc.pid===pid)fs.unlinkSync(identity.serviceFile);
      }catch{ /* no deletion without a verified descriptor */ }
    }
    fs.unlinkSync(identity.ownerFile);
    return true;
  };
  return Object.freeze({generation,token,pid,publish,release,owns});
}

export function assertNoBackendOwner(dataDir) {
  const file=path.join(dataDir,'.backend-host','owner.json');
  const stat=fs.lstatSync(file,{throwIfNoEntry:false});
  if(stat)throw identityError('BACKEND_OWNER_CONFLICT','Backend уже владеет профилем; Desktop не открывает второй экземпляр.');
}

// The product profile opens only after T009 adds release on quit and recovery
// of a stale owner. Until then a quit or crash would leave an owner record that
// blocks Desktop, so the independent backend runs on isolated test profiles.
export function assertBackendProfileAllowed({fixtureRoot=null}={}) {
  if(typeof fixtureRoot==='string'&&fixtureRoot)return;
  throw identityError('BACKEND_PROFILE_NOT_ENABLED','Независимый backend пока запускается только на тестовом профиле.');
}
