import fs from 'node:fs';
import path from 'node:path';
import {BACKEND_LIMITS,BACKEND_OPERATIONS,protocolError,validateCommand,validateError,validateOperation,wireCopy} from '../contracts/backend.mjs';
import {registerBackendCommand,verifyControlLease} from './protocol.mjs';
import {DESKTOP_CHANNELS} from '../contracts/desktop.mjs';
import {createControlLease} from './control-lease.mjs';

const JOURNAL_KEEP=1000;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const invalid=()=>protocolError('BACKEND_ARGS_INVALID','Некорректные параметры операции.');

// Durable command acceptance. A record is on disk (fsync) before its effect
// starts. Records of an earlier boot are never executed again: they read as
// UNKNOWN until the user reconciles them.
export function openOperationJournal(file) {
  const records=new Map(),byOperation=new Map();
  const remember=record=>{records.set(record.requestId,record);byOperation.set(record.operationId,record);};
  let text='';
  const stat=fs.lstatSync(file,{throwIfNoEntry:false});
  if(stat){
    if(!stat.isFile()||stat.isSymbolicLink())throw protocolError('BACKEND_JOURNAL_UNSAFE','Журнал операций недоступен.');
    text=fs.readFileSync(file,'utf8');
  }
  const lines=text.split('\n');
  lines.forEach((line,index)=>{
    if(!line)return;
    try{const record=JSON.parse(line);if(!object(record)||typeof record.requestId!=='string'||typeof record.operationId!=='string')throw new Error();remember(record);}
    catch{
      // Only an interrupted final append is ignored: it was never acknowledged.
      if(index<lines.length-1&&lines.slice(index+1).some(Boolean))throw protocolError('BACKEND_JOURNAL_CORRUPT','Журнал операций повреждён.');
    }
  });
  const append=record=>{
    const fd=fs.openSync(file,'a',0o600);
    try{fs.writeSync(fd,JSON.stringify(record)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    remember(record);
  };
  if(records.size>JOURNAL_KEEP*2){
    const kept=[...records.values()].slice(-JOURNAL_KEEP),temp=file+'.compact';
    fs.writeFileSync(temp,kept.map(record=>JSON.stringify(record)+'\n').join(''),{mode:0o600,flag:'w'});
    const fd=fs.openSync(temp,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(temp,file);records.clear();byOperation.clear();kept.forEach(remember);
  }
  let tail=Promise.resolve();
  const serial=work=>{const next=tail.then(work);tail=next.catch(()=>{});return next;};
  return Object.freeze({
    lookup:async requestId=>records.has(requestId)?structuredClone(records.get(requestId)):undefined,
    // In-process serialization makes check-and-append atomic for this owner.
    acceptIfAbsent:record=>serial(()=>{
      const existing=records.get(record.requestId);
      if(existing)return {inserted:false,record:structuredClone(existing)};
      append(record);return {inserted:true,record:structuredClone(record)};
    }),
    update:(operationId,patch)=>serial(()=>{
      const current=byOperation.get(operationId);
      if(!current)throw protocolError('BACKEND_OPERATION_NOT_FOUND');
      append({...current,...patch});
    }),
    operation:operationId=>byOperation.has(operationId)?structuredClone(byOperation.get(operationId)):null,
    records:()=>[...byOperation.values()].map(record=>structuredClone(record)),
  });
}

const absolute=value=>typeof value==='string'&&value.length>1&&value.length<=4096&&path.isAbsolute(value)&&!/[\u0000-\u001f]/.test(value);
const sessionId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(value);
const name=value=>typeof value==='string'&&value.trim().length>0&&value.length<=200&&!/[\u0000-\u001f]/.test(value);
const exact=(args,keys)=>{if(!object(args)||!Object.keys(args).every(key=>keys.includes(key)))throw invalid();return args;};

function publicProject(project) {
  return {workspace:project.workspace,projectId:project.projectId??null,name:project.displayName||project.name||path.basename(project.workspace),
    archived:!!project.archivedAt,executor:!!project.parentWorkspace,selectedSessionId:project.selectedSessionId??null,
    sessions:(project.sessions??[]).map(session=>({sessionId:session.sessionId,title:session.title||'',experience:session.experience??'chat',
      archived:!!session.archivedAt,external:!!session.external,bound:!!session.chatUrl}))};
}

// The public state is a projection of Control; no chat text, URL secrets,
// receipts, tokens or filesystem details beyond project paths cross it.
export function backendPublicState(services) {
  const store=services.control.projects,selected=store.selected();
  const state={
    selected:selected?{workspace:selected.workspace,sessionId:selected.sessionId}:null,
    projects:store.snapshot().projects.filter(project=>!project.archivedAt).map(publicProject)
      .map(project=>({...project,sessions:project.sessions.filter(session=>!session.archived)})),
    pages:services.pages.list().map(({error,...page})=>({...page,error:error?{code:error.code}:null})),
    settings:{theme:services.settings.shellTheme,hideToolCalls:services.settings.hideToolCalls},
    truncated:false,
  };
  // A state event is one bounded message; large registries are read by operation.
  if(new TextEncoder().encode(JSON.stringify(state)).byteLength>BACKEND_LIMITS.messageBytes/2)
    Object.assign(state,{truncated:true,projects:state.projects.map(({sessions,...project})=>project).slice(0,100),pages:state.pages.slice(0,50)});
  return wireCopy(state);
}

function planSnapshot(services) {
  const selected=services.control.projects.selected();
  if(!selected)return {selected:null,plan:null,autoPlan:false};
  const plan=services.workflow.planMonitor.view(selected);
  const workspace=selected.parentWorkspace??selected.workspace;
  return {selected:{workspace:selected.workspace,sessionId:selected.sessionId},
    autoPlan:services.workflow.projectAutoPlan.enabled(workspace,plan?.scopeId??selected.scopeId??null),
    plan:plan?{scopeId:plan.scopeId??null,planRevision:plan.planRevision??null,scopeStatus:plan.scopeStatus??null,
      objective:typeof plan.objective==='string'?plan.objective.slice(0,2000):null,
      tasks:(plan.planView?.tasks??[]).slice(0,200).map(task=>({id:String(task.id).slice(0,40),status:String(task.status).slice(0,40),
        title:typeof task.title==='string'?task.title.slice(0,300):''}))}:null};
}

// Every allowed operation maps to an existing Control method with its own
// domain validation. Missing operations are refused, never routed generically.
const unwrap=envelope=>{
  if(envelope?.ok===false)throw Object.assign(new Error(envelope.error?.message??'Операция не выполнена.'),{code:envelope.error?.code??'BACKEND_OPERATION_FAILED'});
  return envelope?.result??null;
};
// With the Desktop model in the backend, product mutations go through its own
// actions (navigation generations, setup state, title sync), not around them.
function desktopCatalog(services,base) {
  const local=(channel,input)=>services.desktop.invoke('local',channel,input).then(unwrap);
  return Object.freeze({...base,
    'projects.open':async args=>{exact(args,['workspace']);if(!absolute(args.workspace))throw invalid();
      await local('pilot:select-workspace',args.workspace);return {selected:services.control.projects.selected()?{workspace:services.control.projects.selected().workspace,sessionId:services.control.projects.selected().sessionId}:null};},
    'projects.rename':async args=>{exact(args,['workspace','name']);if(!absolute(args.workspace)||!name(args.name))throw invalid();
      return {changed:await local('pilot:rename-project',args)};},
    'sessions.select':async args=>{exact(args,['workspace','sessionId']);if(!absolute(args.workspace)||!sessionId(args.sessionId))throw invalid();
      await local('pilot:select-session',args);return {selected:{workspace:args.workspace,sessionId:args.sessionId}};},
    'sessions.create':async args=>{exact(args,['workspace','experience']);
      if(!absolute(args.workspace)||!['chat','work'].includes(args.experience))throw invalid();
      await local('pilot:new-session',args);const selected=services.control.projects.selected();
      return {selected:selected?{workspace:selected.workspace,sessionId:selected.sessionId}:null};},
    'sessions.rename':async args=>{exact(args,['workspace','sessionId','name']);
      if(!absolute(args.workspace)||!sessionId(args.sessionId)||!name(args.name))throw invalid();
      return {changed:await local('pilot:rename-session',args)};},
    'settings.update':async args=>{exact(args,['theme','hideToolCalls']);
      if(!Object.keys(args).length||(args.theme!==undefined&&!['light','dark'].includes(args.theme))
        ||(args.hideToolCalls!==undefined&&typeof args.hideToolCalls!=='boolean'))throw invalid();
      if(args.theme!==undefined)await local('pilot:set-theme',args.theme);
      if(args.hideToolCalls!==undefined)await local('pilot:set-hide-tool-calls',args.hideToolCalls);
      return {theme:services.settings.shellTheme,hideToolCalls:services.settings.hideToolCalls};},
    'plan.continue':async args=>{exact(args,[]);await local('pilot:auto-plan',true);return planSnapshot(services);},
    'plan.stop':async args=>{exact(args,[]);await local('pilot:auto-plan',false);return planSnapshot(services);},
    'ui.state':args=>{exact(args,[]);return {state:services.desktop.snapshot(),archive:services.desktop.archiveSnapshot()};},
    'service.status':args=>{exact(args,[]);return services.service.view();},
    'service.stop':args=>{exact(args,[]);return services.service.request();},
    'service.cancel-stop':args=>{exact(args,[]);return services.service.cancel();},
    // The former IPC allowlist; the model validates each input as before.
    'ui.invoke':async args=>{exact(args,['surface','channel','input']);
      if(!['local','archive','colors'].includes(args.surface)||!DESKTOP_CHANNELS[args.surface].includes(args.channel))throw invalid();
      const envelope=await services.desktop.invoke(args.surface,args.channel,args.input);
      if(args.surface==='colors')return {ok:envelope.ok!==false,result:envelope.state??null,...envelope.ok===false?{error:envelope.error}:{}};
      if(/:get-state$/.test(args.channel))return {ok:true,result:null};
      return {ok:envelope?.ok!==false,result:envelope?.result??null,...envelope?.ok===false?{error:envelope.error}:{}};},
  });
}

export function backendCatalog(services) {
  if(services.desktop)return desktopCatalog(services,baseCatalog(services));
  return baseCatalog(services);
}
function baseCatalog(services) {
  const store=services.control.projects;
  const registered=workspace=>{
    const project=store.snapshot().projects.find(item=>item.workspace===workspace);
    if(!project)throw protocolError('PROJECT_NOT_REGISTERED','Проект не подключён к Workflow Pilot.');
    return project;
  };
  const open=async project=>{
    services.workflow.planMonitor.observeSelection();void services.workflow.planMonitor.refresh();
    if(!project.external)await services.pages.select(project);
    return {selected:{workspace:project.workspace,sessionId:project.sessionId}};
  };
  return Object.freeze({
    'projects.list':args=>{exact(args,[]);return {projects:store.snapshot().projects.map(publicProject)};},
    'sessions.list':args=>{exact(args,['workspace']);if(!absolute(args.workspace))throw invalid();
      return {sessions:publicProject(registered(args.workspace)).sessions};},
    'settings.get':args=>{exact(args,[]);return {theme:services.settings.shellTheme,hideToolCalls:services.settings.hideToolCalls};},
    'plan.snapshot':args=>{exact(args,[]);return planSnapshot(services);},
    'projects.open':async args=>{exact(args,['workspace']);if(!absolute(args.workspace))throw invalid();
      registered(args.workspace);return open(await store.select(args.workspace));},
    'projects.rename':async args=>{exact(args,['workspace','name']);if(!absolute(args.workspace)||!name(args.name))throw invalid();
      return {changed:await store.setProjectDisplayName(args.workspace,args.name)};},
    'sessions.select':async args=>{exact(args,['workspace','sessionId']);if(!absolute(args.workspace)||!sessionId(args.sessionId))throw invalid();
      registered(args.workspace);return open(await store.selectSession(args.workspace,args.sessionId));},
    'sessions.create':async args=>{exact(args,['workspace','experience']);
      if(!absolute(args.workspace)||!['chat','work'].includes(args.experience))throw invalid();
      registered(args.workspace);return open(await store.newSession(args.workspace,args.experience));},
    'sessions.rename':async args=>{exact(args,['workspace','sessionId','name']);
      if(!absolute(args.workspace)||!sessionId(args.sessionId)||!name(args.name))throw invalid();
      return {changed:await store.renameSession(args.workspace,args.sessionId,args.name)};},
    'settings.update':async args=>{exact(args,['theme','hideToolCalls']);
      if(!Object.keys(args).length||(args.theme!==undefined&&!['light','dark'].includes(args.theme))
        ||(args.hideToolCalls!==undefined&&typeof args.hideToolCalls!=='boolean'))throw invalid();
      const patch={...args.theme!==undefined?{shellTheme:args.theme}:{},...args.hideToolCalls!==undefined?{hideToolCalls:args.hideToolCalls}:{}};
      await services.settings.save(patch);
      if(args.hideToolCalls!==undefined)await Promise.all(services.sessions.all().map(record=>record.applyToolCalls?.()));
      return {theme:services.settings.shellTheme,hideToolCalls:services.settings.hideToolCalls};},
    'plan.continue':async args=>{exact(args,[]);return setAutoPlan(services,true);},
    'plan.stop':async args=>{exact(args,[]);return setAutoPlan(services,false);},
  });
}
async function setAutoPlan(services,enabled) {
  const selected=services.control.projects.selected();
  if(!selected)throw protocolError('WORKSPACE_REQUIRED','Сначала выберите проект.');
  if(selected.external)throw protocolError('EXTERNAL_SESSION','Автовыполнение для внешней сессии пока не поддерживается.');
  await services.workflow.setAutoPlan(enabled);
  return planSnapshot(services);
}

const publicError=error=>{
  try{return validateError({code:typeof error?.code==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(error.code)?error.code:'BACKEND_OPERATION_FAILED',
    message:typeof error?.message==='string'?error.message.slice(0,200):'Операция не выполнена.'});}
  catch{return {code:'BACKEND_OPERATION_FAILED',message:'Операция не выполнена.'};}
};

// Commands: validation, single-writer lease, durable acceptance, then effect.
// An effect runs at most once per accepted record and outlives its connection.
// Operations listed in `concurrent` keep their own ordering (Desktop actions:
// a newer navigation supersedes an older one); the rest run one at a time.
export function createBackendOperations({bootGeneration,journal,catalog,onOperation=()=>{},onLease=()=>{},
  limit=BACKEND_LIMITS.pendingCommands,concurrent=new Set(['ui.invoke']),leaseTtlMs,now}) {
  let pending=0,tail=Promise.resolve();
  const lease=createControlLease({bootGeneration,...leaseTtlMs?{ttlMs:leaseTtlMs}:{},...now?{now}:{},onChange:view=>onLease(view)});
  const inflight=new Set();
  const operationView=record=>validateOperation({operationId:record.operationId,requestId:record.requestId,
    bootGeneration:record.bootGeneration,status:record.bootGeneration!==bootGeneration&&['accepted','running'].includes(record.status)?'unknown':record.status,
    ...(record.result!==undefined?{result:record.result}:{})});
  const finish=async(record,patch)=>{
    try{await journal.update(record.operationId,patch);}
    // A completed effect whose record cannot be written stays uncertain.
    catch{return;}
    onOperation(operationView({...record,...patch}));
  };
  const run=(record,operation,args)=>{
    pending++;
    const work=async()=>{
      await journal.update(record.operationId,{status:'running'});
      onOperation(operationView({...record,status:'running'}));
      let outcome;
      try{outcome={status:'completed',result:{value:wireCopy(await catalog[operation](args)??null)}};}
      catch(error){outcome={status:'failed',result:{error:publicError(error)}};}
      await finish(record,outcome);
    };
    const done=(concurrent.has(operation)?work():tail.then(work)).catch(()=>{}).finally(()=>{pending--;});
    if(concurrent.has(operation))inflight.add(done),done.finally(()=>inflight.delete(done));
    else tail=done;
  };
  async function submit(command) {
    const request=validateCommand(command),operationClass=BACKEND_OPERATIONS[request.operation];
    if(request.bootGeneration!==bootGeneration)throw protocolError('BACKEND_BOOT_STALE','Backend перезапущен. Обновите состояние.');
    if(operationClass==='read') {
      if(!Object.hasOwn(catalog,request.operation))throw protocolError('BACKEND_OPERATION_NOT_AVAILABLE');
      try{return {requestId:request.requestId,status:'completed',value:wireCopy(await catalog[request.operation](request.args)??null)};}
      catch(error){return {requestId:request.requestId,status:'failed',error:publicError(error)};}
    }
    if(request.operation==='control.acquire') {
      exact(request.args,['clientId','takeover']);
      const view=lease.acquire(request.args);
      return {requestId:request.requestId,status:'completed',value:{leaseGeneration:view.generation,...view}};
    }
    verifyControlLease(request,lease.current());
    if(request.operation==='control.renew') {
      exact(request.args,['clientId']);
      const view=lease.renew({clientId:request.args.clientId,leaseGeneration:request.leaseGeneration});
      return {requestId:request.requestId,status:'completed',value:{leaseGeneration:view.generation,...view}};
    }
    if(request.operation==='control.release') {
      exact(request.args,['clientId']);
      return {requestId:request.requestId,status:'completed',value:lease.release({clientId:request.args.clientId,leaseGeneration:request.leaseGeneration})};
    }
    if(!Object.hasOwn(catalog,request.operation))throw protocolError('BACKEND_OPERATION_NOT_AVAILABLE');
    if(pending>=limit)throw protocolError('BACKEND_QUEUE_LIMIT','Backend занят. Повторите позже с тем же requestId.');
    const decision=await registerBackendCommand(request,{bootGeneration,lookup:journal.lookup,acceptIfAbsent:journal.acceptIfAbsent});
    if(decision.status==='unknown')return {requestId:request.requestId,status:'unknown',operationId:decision.operationId};
    if(decision.status==='accepted')run(journal.operation(decision.operationId),request.operation,request.args);
    return {requestId:request.requestId,status:'accepted',operationId:decision.operationId};
  }
  return Object.freeze({submit,
    operation:operationId=>{const record=journal.operation(operationId);return record?operationView(record):null;},
    get pending(){return pending;},get leaseGeneration(){return lease.current()?.generation??null;},
    lease:()=>lease.view(),dispose:()=>lease.dispose(),
    idle:()=>Promise.all([tail,...inflight])});
}
