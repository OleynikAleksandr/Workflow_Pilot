import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { remoteError } from '../contracts/remote.mjs';

const require = createRequire(import.meta.url);
export const TAILSCALE_DOWNLOAD_URL = 'https://tailscale.com/download';
export const TAILSCALE_DNS_ADMIN_URL = 'https://login.tailscale.com/admin/dns';

// QR code of the address, drawn locally (qrcode-svg, MIT); nothing leaves the Mac.
export function addressQr(address) {
  if (!address) return null;
  const QRCode = require('qrcode-svg');
  const svg = new QRCode({ content: address, width: 220, height: 220, padding: 2, join: true, ecl: 'M' }).svg();
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// Remote access of this backend: Tailscale checks, the loopback gateway, its own
// Serve entry and the sleep prevention. Changes happen only on an explicit
// action from the Mac; the enabled choice survives a restart.
export function createRemoteAccess({ gateway, tailscale, dir, power = null, openExternal = async () => {}, journal = { record() {} }, onChange = () => {} }) {
  const file = path.join(dir, 'remote.json');
  let persisted = false, tailscaleState = null, serve = null, error = null, busy = false, powerId = null;
  try { persisted = JSON.parse(fs.readFileSync(file, 'utf8'))?.enabled === true; } catch { persisted = false; }
  const save = enabled => {
    persisted = enabled;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file + '.tmp', JSON.stringify({ schema_version: 1, enabled }) + '\n', { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
  };
  const changed = () => { try { onChange(); } catch {} };
  const keepAwake = on => {
    if (!power) return;
    if (on && powerId === null) powerId = power.start('prevent-app-suspension');
    if (!on && powerId !== null) { power.stop(powerId); powerId = null; }
  };
  async function refresh() {
    tailscaleState = await tailscale.state();
    const port = gateway.status().port;
    serve = port ? await tailscale.serveState(port) : null;
    changed();
    return view();
  }
  async function enable() {
    await refresh();
    const state = tailscaleState;
    if (!state.installed) throw remoteError('TAILSCALE_NOT_INSTALLED', 'Установите Tailscale на этом компьютере.');
    if (!state.loggedIn || !state.login || !state.dnsName) throw remoteError('TAILSCALE_LOGGED_OUT', 'Войдите в Tailscale и включите его.');
    if (!state.httpsEnabled) throw remoteError('TAILSCALE_HTTPS_DISABLED', 'Разрешите HTTPS-сертификаты в панели Tailscale (раздел DNS).');
    const status = await gateway.enable({ owner: state.login, dnsName: state.dnsName });
    serve = await tailscale.serveState(status.port);
    if (serve.conflict) {
      await gateway.disable();
      throw remoteError('TAILSCALE_SERVE_CONFLICT', 'HTTPS-адрес этого компьютера в Tailscale уже занят другой настройкой Serve. Workflow Pilot её не меняет.');
    }
    if (!serve.ours) { await tailscale.serveOn(status.port); serve = await tailscale.serveState(status.port); }
    save(true); keepAwake(true);
    journal.record('remote-access-enabled', { serve: serve.ours });
    changed();
    return view();
  }
  async function disable() {
    const port = gateway.status().port;
    if (port && (await tailscale.serveState(port)).ours) await tailscale.serveOff(port);
    await gateway.disable();
    serve = null; save(false); keepAwake(false);
    journal.record('remote-access-disabled');
    changed();
    return view();
  }
  const run = async work => {
    if (busy) throw remoteError('REMOTE_BUSY', 'Подождите завершения предыдущего действия.');
    busy = true; error = null; changed();
    try { return await work(); }
    catch (failure) { error = { code: failure.code ?? 'REMOTE_FAILED', message: String(failure.message ?? failure).slice(0, 300) }; throw failure; }
    finally { busy = false; changed(); }
  };
  function view() {
    const status = gateway.status(), dnsName = status.dnsName ?? tailscaleState?.dnsName ?? null;
    const address = status.enabled && dnsName ? 'https://' + dnsName : null;
    return { enabled: status.enabled, persisted, busy, error, port: status.port,
      tailscale: tailscaleState && { installed: tailscaleState.installed, running: tailscaleState.running, loggedIn: tailscaleState.loggedIn,
        httpsEnabled: tailscaleState.httpsEnabled, login: tailscaleState.login, dnsName: tailscaleState.dnsName,
        error: tailscaleState.error ?? null, detail: tailscaleState.detail ?? null },
      serve, address, qr: address ? addressQr(address) : null };
  }
  return Object.freeze({ view, refresh,
    // Restore the user's earlier choice after a restart; a failure is shown, not retried.
    async restore() { if (!persisted) return view(); try { return await run(enable); } catch { return view(); } },
    action(input) {
      const op = typeof input === 'string' ? input : input?.op;
      if (op === 'refresh') return run(refresh);
      if (op === 'enable') return run(enable);
      if (op === 'disable') return run(disable);
      if (op === 'open-download') return openExternal(TAILSCALE_DOWNLOAD_URL).then(() => view());
      if (op === 'open-admin') return openExternal(TAILSCALE_DNS_ADMIN_URL).then(() => view());
      throw remoteError('REMOTE_ACTION_INVALID', 'Неизвестное действие.');
    },
    dispose() { keepAwake(false); },
  });
}
