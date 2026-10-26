import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {readPlan} from '../packages/workflow-kit/src/lib/plan.mjs';
import {writeSdkBusyExperiment} from '../src/execution/plugin/sdk-busy-experiment.mjs';
import {COMMUNICATION_BUILD} from '../src/contracts/backend.mjs';

const developmentRoot=fileURLToPath(new URL('..',import.meta.url));
export async function prepareSdkBusyExperiment({workspace,scopeId,caseId,busyKind='tool-wait',taskIds=['T001','T002'],
  experimentId='sdk-busy',off=false,testWorkspace=false,inspect=readPlan,buildId=COMMUNICATION_BUILD,preliminaryGo}){
  if(!testWorkspace||!path.isAbsolute(workspace??''))throw Error('Нужны явные --workspace и --test-workspace.');
  const canonical=await fs.realpath(workspace);
  if(canonical!==path.resolve(workspace)||canonical===await fs.realpath(developmentRoot)
    ||canonical.startsWith(path.resolve(developmentRoot)+path.sep)
    ||canonical.split(path.sep).some(part=>['Project Web Pilot','Workflow_Pilot'].includes(part)))throw Error('Нужен отдельный тестовый workspace без симлинков.');
  const plan=inspect(canonical);
  if(plan.execution_scope_status!=='ACTIVE'||!plan.scope_id||(scopeId&&scopeId!==plan.scope_id)
    ||plan.execution_strategy!=='orchestrated')throw Error('Нужен опубликованный orchestrated-план своего тестового workspace.');
  const expected={workspace:canonical,project_id:plan.project_id,scope_id:plan.scope_id,role:'O',build_id:buildId};
  if(!off&&(!Array.isArray(taskIds)||taskIds.length!==2||taskIds.some(id=>{
    const task=plan.tasks.find(task=>task.id===id);return !task||task.commit_status==='DONE'||!task.parallel_safe||task.dependencies.length;
  })))throw Error('Нужны две ещё не завершённые независимые параллельные задачи.');
  let preliminaryDigest;
  if(!off&&busyKind==='read-only-command'){
    if(!path.isAbsolute(preliminaryGo??''))throw Error('Нужен абсолютный --preliminary-go с анализом основных случаев.');
    const stat=await fs.lstat(preliminaryGo);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)throw Error('Неверный предварительный GO.');
    const bytes=await fs.readFile(preliminaryGo),proof=JSON.parse(bytes);
    if(proof.schema!==1||proof.preliminary_go!==true||proof.build_id!==buildId||proof.experiment_id!==experimentId)
      throw Error('Основные случаи не дали предварительный GO для этой сборки/опыта.');
    preliminaryDigest=createHash('sha256').update(bytes).digest('hex');
  }
  const value=off?{version:1,mode:'off'}:{version:1,mode:'sdk-busy-burst',experiment_id:experimentId,
    activation_id:randomUUID(),project_id:plan.project_id,workspace:canonical,scope_id:plan.scope_id,
    recipient_role:'O',build_id:buildId,test_workspace:true,
    cases:[{case_id:caseId,busy_kind:busyKind,max_notifications:2,task_ids:taskIds,
      ...(preliminaryDigest?{preliminary_go:preliminaryDigest}:{})}]};
  return writeSdkBusyExperiment(canonical,value,expected);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),input={};const names={'--workspace':'workspace','--scope':'scopeId','--case':'caseId',
    '--busy-kind':'busyKind','--experiment':'experimentId','--tasks':'taskIds','--preliminary-go':'preliminaryGo'};
  for(let i=0;i<args.length;i++){
    const arg=args[i];if(arg==='--test-workspace')input.testWorkspace=true;else if(arg==='--off')input.off=true;
    else if(names[arg]&&args[i+1]&&!args[i+1].startsWith('--'))input[names[arg]]=arg==='--tasks'?args[++i].split(','):args[++i];
    else throw Error('Неизвестный или неполный параметр: '+arg);
  }
  console.log(JSON.stringify(await prepareSdkBusyExperiment(input),null,2));
}
