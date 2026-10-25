import { desktopFiles as fs } from '../../execution/facade.mjs';
import path from 'node:path';
import { executeFile } from '../../execution/facade.mjs';
import { createHash } from 'node:crypto';
import { parsePlan } from '@webpilot/workflow-kit/lib/plan';
import { readReview } from '@webpilot/workflow-kit/lib/plan-review';
import { reviewBlocksExecution } from './plan-continuation-state.mjs';
import {readCommandActivity,readCommitProgress} from './command-activity.mjs';

const planFile='.harness/plans/todo-plan.md';
export function projectVerifiedPlan(plan,resolved) {
  const projected=structuredClone(plan);
  for(const task of projected.tasks)if(task.commit_status==='DONE'&&!resolved?.[task.id]?.sha) {
    task.commit_status='PENDING';task.implementation_status='IN_PROGRESS';
  }
  return projected;
}
const exists=async file=>{try{await fs.access(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
// All potentially long Kit/Git work stays outside Electron's main event loop.
// Codes that leave an outcome open or describe a transient read are never a definite refusal.
const OPEN_CODES=['ASSIGNMENT_UNKNOWN','INTEGRATION_UNKNOWN','TRANSACTION_PENDING','WORKFLOW_LOCKED','PLAN_CHANGED_DURING_READ','PLAN_JSON',
  'PLAN_MARKERS','PLAN_PROJECTION','PLAN_COMMIT_MISMATCH','ASSIGNMENT_CONTRACT','MISSING_FILE','ENOENT','INVALID_JSON','PLAN_COMMAND_FAILED'];
export const kitRefusal=error=>error?.kitRefusal===true&&!OPEN_CODES.includes(error.code);
export const refusalText=(taskId,error)=>'Kit отказал в назначении '+taskId+': '+(error?.message??'причина не указана');

export class ParallelKit {
  constructor({plans,setup,execute=plans?.run??executeFile,onTiming=()=>{}}) {Object.assign(this,{plans,setup,execute,onTiming});}
  async git(workspace,args,{raw=false}={}) {
    await this.setup.node();
    const value=(await this.execute(this.setup.environment.WORKFLOW_GIT_BIN||'git',['-C',workspace,...args],
      {env:this.setup.environment,windowsHide:true,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024})).stdout;
    return raw?value:value.trim();
  }
  async projectIdentity(workspace,commit) {
    if(!commit)return null;
    try {return parsePlan(await this.git(workspace,['show',commit+':'+planFile])).project_id;}catch{return null;}
  }
  async signals(workspace){
    const directory=await this.git(workspace,['rev-parse','--path-format=absolute','--git-common-dir']);
    const text=await fs.readFile(path.join(directory,'workflow-kit','signals.jsonl'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    return text.split('\n').filter(Boolean).map(JSON.parse);
  }
  async read(workspace) {
    for(let attempt=0;;attempt++){
      try{return await this.readSnapshot(workspace,{retryTransient:attempt<2});}
      catch(error){
        // Git checkout/merge replaces the tracked plan outside Kit's atomic writer.
        // A bounded fresh read tolerates that window; persistent corruption still fails.
        if(!['PLAN_CHANGED_DURING_READ','PLAN_JSON','PLAN_MARKERS','PLAN_PROJECTION','PLAN_COMMIT_MISMATCH','ASSIGNMENT_CONTRACT','MISSING_FILE','ENOENT'].includes(error.code)||attempt>=2)throw error;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
    }
  }
  async migration(workspace,scope,operationId){
    const directory=await this.git(workspace,['rev-parse','--absolute-git-dir']);
    const record=await fs.readFile(path.join(directory,'workflow-kit','dialogue-migration.json'),'utf8')
      .then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(!record||record.phase==='DONE')return null;
    if(record.scope_id!==scope||record.operation_id!==operationId)
      throw Object.assign(Error('Сначала завершите ранее начатый переход.'),{code:'DIALOGUE_MIGRATION_PENDING'});
    return {assignments:record.children.map(child=>child.record)};
  }
  async readSnapshot(workspace,{retryTransient=true}={}) {
    const text=await fs.readFile(path.join(workspace,planFile),'utf8'),plan=parsePlan(text);
    if(!['parallel','orchestrated'].includes(plan.execution_strategy))return {workspace,plan,assignments:[],integration:{status:'IDLE'}};
    const beforeHead=await this.git(workspace,['rev-parse','HEAD']);
    const gitDir=await this.git(workspace,['rev-parse','--absolute-git-dir']);
    const integration=await this.plans.call(workspace,'integration:status');
    const proof=await this.plans.call(workspace,'validate');
    const assignments=[],childInputs=[];
    const directory=path.join(gitDir,'workflow-kit','assignments');
    for(const file of await fs.readdir(directory).catch(e=>{if(e.code==='ENOENT')return [];throw e;})) {
      if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\.json$/.test(file))continue;
      const record=JSON.parse(await fs.readFile(path.join(directory,file),'utf8'));
      if(record.parent_scope_id!==plan.scope_id)continue;
      const done=proof.resolved?.[record.parent_task_id];
      if(done?.integration_commit&&done.source_commit===record.source_commit&&done.sha===record.integration_commit) {
        assignments.push({...record,status:'INTEGRATED'});continue;
      }
      if(record.phase==='INTEGRATED') {
        assignments.push({...record,status:'UNKNOWN',error:{code:'INTEGRATION_PROOF_MISSING',message:'Интеграция не подтверждена историей main.'}});continue;
      }
      let childGit;
      try {
        childGit=await this.git(record.worktree,['rev-parse','--absolute-git-dir']);
        const status=await this.plans.call(workspace,'assignment:status',['--id',record.id]);
        const activity=await readCommandActivity(record.worktree);
        childInputs.push(path.relative(workspace,path.join(childGit,'workflow-kit','transaction.json')));
        assignments.push({...record,...status,...activity,kitProgress:await readCommitProgress(childGit),commandActive:activity.commandActive||await exists(path.join(childGit,'workflow-kit','operation.lock')),
          dirty:!!await this.git(record.worktree,['status','--porcelain'])});
      }catch(error){
        // A concurrent child's commit also replaces its plan. A failed read is
        // not evidence of an unknown write: retry the whole coherent snapshot.
        if(['PLAN_JSON','PLAN_MARKERS','PLAN_PROJECTION'].includes(error.code))throw error;
        // A revision updates the child plan and its contract under Kit locks.
        // A reader between these writes must not turn a known writer into UNKNOWN.
        if(await exists(path.join(gitDir,'workflow-kit','operation.lock'))
          ||childGit&&await exists(path.join(childGit,'workflow-kit','operation.lock')))
          throw Object.assign(Error('Workflow Kit обновляет назначение; ждём завершения операции.'),{code:'WORKFLOW_LOCKED'});
        // A commit replaces plan, transaction and HEAD separately. The writer
        // may have just released its lock by the time this failed read returns.
        if(retryTransient&&['PLAN_COMMIT_MISMATCH','ASSIGNMENT_CONTRACT','MISSING_FILE','ENOENT'].includes(error.code))throw error;
        // Kit answered with a definite refusal: nothing is unknown, the user fixes the cause and continues.
        assignments.push({...record,status:kitRefusal(error)?'REFUSED':'UNKNOWN',error:{code:error.code,message:error.message}});
      }
    }
    const pending=await exists(path.join(gitDir,'workflow-kit','transaction.json'));
    const handoff=await fs.readFile(path.join(gitDir,'workflow-kit','task-handoff.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    const committed=await this.git(workspace,['show','HEAD:'+planFile]);
    const unchanged=text===(await fs.readFile(path.join(workspace,planFile),'utf8'));
    const head=await this.git(workspace,['rev-parse','HEAD']);
    // Git proof and assignment receipts can straddle an O-driven integration.
    // Retry the read, never report that valid new receipt as an unknown effect.
    if(head!==beforeHead||(proof.plan_revision??proof.plan?.plan_revision)!==plan.plan_revision)
      throw Object.assign(Error('План изменился во время чтения доказательств; нужна свежая сверка.'),{code:'PLAN_CHANGED_DURING_READ'});
    const integrated=proof.resolved?.[integration.task_id];
    integration.committed=!!integrated?.integration_commit&&integrated.sha===head&&integrated.source_commit===integration.source_commit;
    const reviewPending=reviewBlocksExecution(readReview(workspace),plan.scope_id);
    const confirmationError=!unchanged?{code:'PLAN_CHANGED_DURING_READ',message:'План меняется. Ждём завершения его записи.'}
      :pending?{code:'TRANSACTION_PENDING',message:'Ждём завершения сохранённой транзакции Kit.'}
      :committed!==text.trim()?{code:'PLAN_UNPUBLISHED_OR_CHANGED',message:'Текущие изменения плана ещё не опубликованы в Git.'}
      :reviewPending?{code:'REVIEW_PENDING',message:'Ждём завершения согласования и публикации плана.'}:null;
    const activity=await readCommandActivity(workspace);
    // Signals of executors and the orchestrator; every checkout appends to the main repository's journal.
    const signalText=await fs.readFile(path.join(gitDir,'workflow-kit','signals.jsonl'),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    const signals=signalText.split('\n').filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{return null;}})
      .filter(signal=>signal&&typeof signal.id==='string'&&signal.scope_id===plan.scope_id);
    const records=(await this.git(workspace,['status','--porcelain=v1','--untracked-files=all','-z'],{raw:true})).split('\0');
    const mainChanges=[];
    for(let i=0;i<records.length;i++)if(records[i]){
      const record=records[i],status=record.slice(0,2);mainChanges.push({path:record.slice(3),status});
      if(/[RC]/.test(status)&&records[i+1])i++;
    }
    return {workspace,plan:projectVerifiedPlan(plan,proof.resolved),head,assignments,integration,confirmationError,...activity,signals,
      kitProgress:await readCommitProgress(gitDir),
      handoff:handoff&&handoff.phase!=='DONE'?handoff:null,
      watchInputs:['operation.lock','transaction.json','task-handoff.json','integration.json','assignments/','signals.jsonl'].map(name=>path.relative(workspace,path.join(gitDir,'workflow-kit',name))+(name.endsWith('/')?'/':'')).concat(childInputs),
      mainClean:mainChanges.length===0,mainChanges,
      commandActive:activity.commandActive||await exists(path.join(gitDir,'workflow-kit','operation.lock')),
      confirmed:!confirmationError};
  }
  async handoff(workspace,plan,task,id,base,previous=null) {
    const directory=path.join(path.dirname(workspace),'.workflow-pilot-worktrees',createHash('sha256').update(workspace).digest('hex').slice(0,16));
    if(!previous)await fs.mkdir(directory,{recursive:true});
    return this.plans.call(workspace,'assignment:handoff',['--expected-revision',String(plan.plan_revision)],
      previous?.input??{id,task_id:task.id,base_commit:base,worktree:path.join(directory,id)},{timeout:600000});
  }
  async create(workspace,plan,task,id,base) {
    const directory=path.join(path.dirname(workspace),'.workflow-pilot-worktrees',createHash('sha256').update(workspace).digest('hex').slice(0,16));
    await fs.mkdir(directory,{recursive:true});
    return this.plans.call(workspace,'assignment:create',['--expected-revision',String(plan.plan_revision)],
      {id,task_id:task.id,base_commit:base,worktree:path.join(directory,id)});
  }
  setupAssignment(workspace,id) {return this.plans.call(workspace,'assignment:setup',['--id',id,'--npm-ci'],null,
    {timeout:600000,onTiming:span=>this.onTiming(workspace,id,span)});}
  continueIntegration(workspace,id) {return this.plans.call(workspace,'integration:continue',['--id',id],null,{timeout:600000});}
  integrate(workspace,assignment) {return this.plans.call(workspace,'integration:start',[],
    {id:assignment.id,source_commit:assignment.source_commit},{timeout:600000});}
}
