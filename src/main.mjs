import * as electron from 'electron';
import { launchMode } from './contracts/launch.mjs';
const launch=launchMode(process.argv,{packaged:electron.app.isPackaged});
if(launch.mode==='backend') {
  const {startBackend}=await import('./backend/main.mjs');
  startBackend(electron,{fixtureRoot:launch.fixtureRoot,leaseTtlMs:launch.leaseTtlMs});
} else if(launch.mode==='in-process') {
  // In-process Desktop remains only for the development smoke fixtures (removed in T012).
  const {startDesktop}=await import('./frontend/desktop/bootstrap.mjs');
  await startDesktop(electron);
} else {
  // Ordinary launch: a client that connects to the one backend, starting it once if needed.
  const {startDesktopClient}=await import('./frontend/desktop/client.mjs');
  startDesktopClient(electron,{backendRoot:launch.backendRoot,clientRoot:launch.clientRoot,fixture:launch.fixture});
}
