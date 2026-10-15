import * as electron from 'electron';
if(process.argv.includes('--backend-host')) {
  const {startBackend}=await import('./backend/main.mjs');
  startBackend(electron,{fixtureRoot:process.argv.find(arg=>arg.startsWith('--backend-fixture-root='))?.slice('--backend-fixture-root='.length)});
} else {
  const {startDesktop}=await import('./frontend/desktop/bootstrap.mjs');
  await startDesktop(electron);
}
