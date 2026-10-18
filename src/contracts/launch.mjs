// How one executable starts: client (ordinary launch), backend, or the
// development-only in-process smoke. Packaged builds ignore every test flag:
// no fixture profile, no fixture page and no token printed to stdout.
const SMOKE_FLAGS = ['--smoke', '--event-runtime-baseline', '--event-runtime-checker'];
export function launchMode(argv, { packaged }) {
  const option = name => argv.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1) ?? null;
  const development = packaged !== true;
  if (argv.includes('--backend-host'))
    return { mode: 'backend', fixtureRoot: development ? option('--backend-fixture-root') : null,
      leaseTtlMs: development && option('--backend-fixture-root') ? Number(option('--backend-lease-ttl-ms')) || null : null,
      // Development only: keep offscreen pages on a Mac to test the server mode.
      pageMode: development && ['view', 'offscreen'].includes(option('--backend-page-mode')) ? option('--backend-page-mode') : null };
  if (development && SMOKE_FLAGS.some(flag => argv.includes(flag))) return { mode: 'in-process' };
  // A launch on every platform asks the backend for its native window and exits;
  // --http-client opens the separate HTTP client instead (the test window of the
  // native mode). --client-launcher forces the launch path in development fixtures.
  const fixture = development && argv.includes('--client-fixture'), http = argv.includes('--http-client');
  return { mode: 'client', backendRoot: development ? option('--client-backend-root') : null,
    clientRoot: development ? option('--client-root') : null, fixture, http,
    launcher: !http && (development && argv.includes('--client-launcher') || !fixture) };
}
