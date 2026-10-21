import {FORCE_STOP_DIALOG} from '../../contracts/backend.mjs';

// Native windows bypass the API operation queue. Separate clients use the
// authenticated concurrent operation; neither path polls a dying service.
export async function requestConfirmedForceStop({confirm,force,connection}) {
  if((await confirm(FORCE_STOP_DIALOG)).response!==0)return false;
  if(force)force();
  else {
    await connection.acquire();
    await connection.submit('service.force-stop',{confirmed:true});
  }
  return true;
}
