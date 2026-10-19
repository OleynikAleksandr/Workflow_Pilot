// Pure correlation shared by Kit and Control. A v1 answer can clear only a v1 block.
export const sameAssignment=(a,b)=>a.scope_id===b.scope_id&&a.task_id===b.task_id&&a.assignment_id===b.assignment_id
  &&(a.assignment_attempt??1)===(b.assignment_attempt??1);
export const latestBlock=(signals,signal)=>signals.findLast(s=>s.kind==='task-blocked'&&sameAssignment(s,signal));
export function blockAnswered(signals,block){
  return signals.slice(signals.indexOf(block)+1).some(s=>s.kind==='assignment-message'&&sameAssignment(s,block)
    &&(block.block_id?s.block_id===block.block_id:!s.block_id));
}
export function currentSignal(signals,signal){
  const block=latestBlock(signals,signal);
  if(signal.kind==='task-blocked')return block?.id===signal.id&&!blockAnswered(signals,block);
  if(signal.kind==='assignment-message')return signal.block_id?block?.block_id===signal.block_id:!block?.block_id;
  return true;
}
