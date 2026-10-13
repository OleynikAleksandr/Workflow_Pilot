import path from 'node:path';
import { desktopFiles } from '../files/adapter.mjs';
import { RuntimeError } from '../../contracts/errors.mjs';

export const vpsRouteFile = home => path.join(home, '.config/workflow-pilot/vps/route.json');
export function validateVpsRoute(value) {
  if (!value || value.schema_version !== 1 || value.product !== 'workflow-pilot'
    || typeof value.ssh_host !== 'string' || !/^workflow-pilot-vps(?:-[A-Za-z0-9_-]+)?$/.test(value.ssh_host)
    || !Number.isSafeInteger(value.remote_port) || value.remote_port < 1024 || value.remote_port > 65535
    || value.remote_port === 17842) {
    throw new RuntimeError('VPS_ROUTE_INVALID', 'Нужен собственный маршрут Workflow Pilot; донорский alias/порт запрещён.');
  }
  return { schema_version: 1, product: 'workflow-pilot', ssh_host: value.ssh_host, remote_port: value.remote_port };
}
export async function readVpsRoute(file) {
  try { return validateVpsRoute(await desktopFiles.readJson(file)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
