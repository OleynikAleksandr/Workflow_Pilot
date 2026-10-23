import {requestExecutionMode,chooseExecutionMode} from '../../packages/workflow-kit/src/lib/execution-mode.mjs';

// Since Kit 1.9.8 a Workflow Pilot plan follows the user's mode choice. Fixtures stand in for
// the agent's request and the user's button press before creating such a plan.
export function userChoseMode(root,session_id,strategy='orchestrated'){
  const request=requestExecutionMode(root,{session_id,recommended:strategy,reason:'Fixture: the user chooses this mode'});
  return chooseExecutionMode(root,{session_id,strategy,generation:request.generation,approval_note:'Fixture: the user chose this mode in the panel'});
}
