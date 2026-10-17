import * as electron from 'electron';
import { launchMode } from './contracts/launch.mjs';
const launch=launchMode(process.argv,{packaged:electron.app.isPackaged});
if(launch.mode==='in-process') {
  // In-process Desktop remains only for the development smoke fixtures (removed in T012).
  const {startDesktop}=await import('./frontend/desktop/bootstrap.mjs');
  await startDesktop(electron);
} else {
  // The client module serves both other modes: the ordinary launch and the
  // backend's native window, which is the same client opened inside the backend.
  const {startDesktopClient}=await import('./frontend/desktop/client.mjs');
  if(launch.mode==='backend') {
    const {startBackend}=await import('./backend/main.mjs');
    startBackend(electron,{fixtureRoot:launch.fixtureRoot,leaseTtlMs:launch.leaseTtlMs,pageMode:launch.pageMode,
      nativeWindow:options=>startDesktopClient(electron,{embedded:options})});
  } else {
    // Ordinary launch: a client that connects to the one backend, starting it once if needed.
    startDesktopClient(electron,{backendRoot:launch.backendRoot,clientRoot:launch.clientRoot,fixture:launch.fixture});
  }
}
