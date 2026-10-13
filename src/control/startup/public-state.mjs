// Runtime credentials and full connector paths never enter renderer snapshots.
export function publicVpsState(vps) {
  if (!vps) return null;
  let connector = null;
  try { const url=new URL(vps.connector); if(url.protocol==='https:')connector='https://'+url.host+'/mcp/…/mcp'; } catch {}
  return { configured:!!vps.configured,ready:!!vps.ready,running:!!vps.running,conflict:!!vps.conflict,
    phase:!vps.configured?'setup-required':vps.ready?'ready':'unavailable',
    portMatches:!!vps.portMatches,mcpPort:Number.isInteger(vps.mcpPort)?vps.mcpPort:null,
    forwardPort:Number.isInteger(vps.forwardPort)?vps.forwardPort:null,
    lastError:vps.lastError?{message:'SSH-подключение не подтверждено. Проверьте настройку своего сервера.',
      at:Number.isFinite(Date.parse(vps.lastError.at))?new Date(vps.lastError.at).toISOString():null}:null,
    error:vps.error?'Не удалось проверить подключение к своему серверу.':null,connector };
}
export function publicRuntimeState(status) {
  return {mcpReady:!!status?.mcp?.ready,tunnelReady:!!status?.tunnel?.ready,
    tunnelConfigured:!!status?.tunnel?.configured,vps:publicVpsState(status?.vps)};
}
