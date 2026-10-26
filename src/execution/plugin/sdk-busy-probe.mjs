import path from 'node:path';
import {createHash} from 'node:crypto';

// Only this literal is executable. All variable data are positional arguments.
export const SDK_BUSY_PROBE_CODE='import sys,time; n=sys.argv[1]; d=int(sys.argv[2]); assert 1 <= d <= 30000; print("sdk-busy-probe-start:"+n,flush=True); time.sleep(d/1000); print("sdk-busy-probe-end:"+n,flush=True)';
export function makeSdkBusyProbe({python,nonce,duration_ms=15000,platform=process.platform}){
  const api=platform==='win32'?path.win32:path;
  if(typeof python!=='string'||!api.isAbsolute(python)||/[\r\n\0]/.test(python)
    ||/[\\/]Project Web Pilot(?:[\\/]|$)/i.test(python)||!/^[a-f0-9-]{36}$/i.test(nonce??'')
    ||!Number.isSafeInteger(duration_ms)||duration_ms<1||duration_ms>30000)throw Error('SDK_BUSY_PROBE_INVALID');
  const quote=platform==='win32'?value=>"'"+value.replaceAll("'","''")+"'":value=>"'"+value.replaceAll("'","'\\''")+"'";
  const argv=[python,'-B','-I','-S','-c',SDK_BUSY_PROBE_CODE,nonce,String(duration_ms)];
  const command=(platform==='win32'?'& ':'')+argv.map(quote).join(' ');
  return {nonce,duration_ms,command,command_hash:createHash('sha256').update(command).digest('hex'),
    instruction:'Вызови exec_command ровно с этим cmd, workdir своего workspace, read_only=true и login=false. Код/аргументы не меняй; после результата checkpoint resume с тем же nonce.'};
}
