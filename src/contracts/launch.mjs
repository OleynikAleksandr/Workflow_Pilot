// How one executable starts: client (ordinary launch), backend, or the
// development-only in-process smoke. Packaged builds ignore every test flag:
// no fixture profile, no fixture page and no token printed to stdout.
const SMOKE_FLAGS = ['--smoke', '--event-runtime-baseline', '--event-runtime-checker'];
export function launchMode(argv, { packaged }) {
  const option = name => argv.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1) ?? null;
  const development = packaged !== true;
  if (argv.includes('--backend-host'))
    return { mode: 'backend', fixtureRoot: development ? option('--backend-fixture-root') : null,
      leaseTtlMs: development && option('--backend-fixture-root') ? Number(option('--backend-lease-ttl-ms')) || null : null };
  if (development && SMOKE_FLAGS.some(flag => argv.includes(flag))) return { mode: 'in-process' };
  return { mode: 'client', backendRoot: development ? option('--client-backend-root') : null,
    clientRoot: development ? option('--client-root') : null, fixture: development && argv.includes('--client-fixture') };
}
