import * as electron from 'electron';
const option=name=>process.argv.find(arg=>arg.startsWith(name+'='))?.slice(name.length+1);
if(process.argv.includes('--desktop-client')) {
  const {startDesktopClient}=await import('./frontend/desktop/client.mjs');
  // Test roots and the fixture flag exist only in development builds.
  const development=!electron.app.isPackaged;
  startDesktopClient(electron,{backendRoot:development?option('--client-backend-root')??null:null,
    clientRoot:development?option('--client-root')??null:null,fixture:development&&process.argv.includes('--client-fixture')});
} else if(process.argv.includes('--backend-host')) {
  const {startBackend}=await import('./backend/main.mjs');
  startBackend(electron,{fixtureRoot:electron.app.isPackaged?null:option('--backend-fixture-root')??null});
} else if(!electron.app.isPackaged&&['--smoke','--event-runtime-baseline','--event-runtime-checker'].some(flag=>process.argv.includes(flag))) {
  // In-process Desktop remains only for the development smoke fixtures (removed in T012).
  const {startDesktop}=await import('./frontend/desktop/bootstrap.mjs');
  await startDesktop(electron);
} else {
  // Ordinary launch: a client that connects to the one backend, starting it once if needed.
  const {startDesktopClient}=await import('./frontend/desktop/client.mjs');
  startDesktopClient(electron);
}
