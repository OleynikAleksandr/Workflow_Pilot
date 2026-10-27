// Markdown is a container. Fences inside JSON strings never delimit this payload.
export function parseWorkflowPlan(text) {
  const invalid=()=>{throw Object.assign(new Error('Не удалось прочитать данные плана.'),{code:'WORKFLOW_PLAN_INVALID'});};
  if(typeof text!=='string')return invalid();
  const begin=[...text.matchAll(/^<!-- workflow-state:begin -->\r?$/gm)];
  const end=[...text.matchAll(/^<!-- workflow-state:end -->\r?$/gm)];
  if(begin.length!==1||end.length!==1||begin[0].index>=end[0].index)return invalid();
  const fragment=text.slice(begin[0].index+begin[0][0].length,end[0].index).trim();
  const match=/^```json\r?\n([\s\S]*)\r?\n```$/.exec(fragment);
  if(!match)return invalid();
  let plan;try{plan=JSON.parse(match[1]);}catch{return invalid();}
  if(!plan||plan.schema_version!==1||typeof plan.project_id!=='string'||!plan.project_id
    ||!Array.isArray(plan.tasks)||plan.tasks.some(t=>!t||typeof t.id!=='string')
    ||new Set(plan.tasks.map(t=>t.id)).size!==plan.tasks.length)return invalid();
  return plan;
}

// IO and ownership stay with the backend. Failed reads can be retried by an ordinary refresh.
export class ClosedPlanCache {
  constructor({load,isCurrent,changed,now=Date.now,retryMs=2000}) {
    Object.assign(this,{load,isCurrent,changed,now,retryMs});this.entries=new Map();
  }
  read(target) {
    const key=JSON.stringify([target.workspaceId,target.projectId,target.scopeId,target.sessionId,target.commit]);
    const old=this.entries.get(key);
    if(old&&(!old.value?.detailsUnavailable||old.attempts>=2||this.now()-old.at<this.retryMs))return old.value;
    const entry={value:null,at:this.now(),attempts:(old?.attempts??0)+1};this.entries.set(key,entry);
    while(this.entries.size>128)this.entries.delete(this.entries.keys().next().value);
    const current=()=>this.entries.get(key)===entry&&this.isCurrent(target);
    void Promise.resolve().then(()=>this.load(target)).then(text=>{
      if(!current())return;
      const plan=parseWorkflowPlan(text);
      const owner=plan.execution_origin_session_id??plan.owner_session_id;
      if(plan.project_id!==target.projectId||plan.scope_id!==target.scopeId||owner&&owner!==target.sessionId)
        throw Object.assign(new Error('Исторический план принадлежит другой сессии.'),{code:'CLOSED_PLAN_IDENTITY'});
      if(!plan.tasks.length||plan.tasks.some(t=>typeof t.title!=='string'||t.commit_status!=='DONE'||t.implementation_status!=='DONE'))
        throw Object.assign(new Error('Завершение задач не подтверждено.'),{code:'CLOSED_PLAN_INCOMPLETE'});
      entry.value={scopeId:plan.scope_id,objective:plan.objective??'',strategy:plan.execution_strategy,
        tasks:plan.tasks.map(t=>({id:t.id,title:t.title,status:'done',parallel_safe:t.parallel_safe,verification_kind:t.verification_kind,
          delivery:['package','installed'].includes(t.verification_kind)}))};
      this.changed();
    }).catch(error=>{
      if(!current())return;
      entry.value={detailsUnavailable:true,tasks:[],diagnostic:{code:['WORKFLOW_PLAN_INVALID','CLOSED_PLAN_IDENTITY','CLOSED_PLAN_INCOMPLETE'].includes(error.code)?error.code:'CLOSED_PLAN_READ_FAILED'}};
      entry.at=this.now();this.changed();
    });
    return null;
  }
  clear(){this.entries.clear();}
  retryUnavailable(){for(const [key,entry] of this.entries)if(entry.value?.detailsUnavailable)this.entries.delete(key);}
}
