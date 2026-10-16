import fs from 'node:fs';
import { execFile } from 'node:child_process';

// Known locations of the Tailscale CLI. On macOS the app bundle carries it and
// it is usually not on the PATH of a GUI process.
export const TAILSCALE_CANDIDATES = Object.freeze({
  darwin: ['/Applications/Tailscale.app/Contents/MacOS/Tailscale', '/opt/homebrew/bin/tailscale', '/usr/local/bin/tailscale'],
  win32: ['C:\\Program Files\\Tailscale\\tailscale.exe', 'C:\\Program Files (x86)\\Tailscale\\tailscale.exe'],
  linux: ['/usr/bin/tailscale', '/usr/sbin/tailscale', '/usr/local/bin/tailscale'],
});
const tailscaleError = (code, message) => Object.assign(new Error(message), { code });

// The macOS app binary acts as the CLI only when it believes it runs in a
// terminal; a background service has none, so the CLI mode is requested
// explicitly. Other platforms ignore the variable.
export function tailscaleEnvironment(base = process.env) {
  return { ...base, TAILSCALE_BE_CLI: '1' };
}
function runFile(file, args, { timeout = 15000 } = {}) {
  return new Promise(resolve => execFile(file, args, { timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true, env: tailscaleEnvironment() },
    (error, stdout, stderr) => resolve({ code: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) })));
}

// Reads and changes only what Workflow Pilot needs: status, and its own Serve
// entry (HTTPS 443 → the loopback gateway). It never resets the user's Serve
// configuration, never uses Funnel and never logs in.
export class TailscaleCli {
  constructor({ platform = process.platform, exists = file => fs.existsSync(file), run = runFile } = {}) {
    Object.assign(this, { platform, exists, run });
  }
  locate() { return (TAILSCALE_CANDIDATES[this.platform] ?? []).find(file => this.exists(file)) ?? null; }
  async #json(args) {
    const cli = this.locate();
    if (!cli) throw tailscaleError('TAILSCALE_NOT_INSTALLED', 'Tailscale не установлен на этом компьютере.');
    const result = await this.run(cli, args);
    if (result.code !== 0) throw tailscaleError('TAILSCALE_COMMAND_FAILED', (result.stderr || result.stdout).trim().slice(0, 200) || 'Команда Tailscale не выполнена.');
    try { return JSON.parse(result.stdout); } catch { throw tailscaleError('TAILSCALE_OUTPUT_INVALID', 'Tailscale вернул неожиданный ответ.'); }
  }
  // installed → running (BackendState) → logged in (account) → HTTPS certificates allowed.
  async state() {
    const cli = this.locate();
    if (!cli) return { installed: false, running: false, loggedIn: false, httpsEnabled: false, login: null, dnsName: null, tailnet: null };
    let status;
    try { status = await this.#json(['status', '--json']); }
    catch (error) { return { installed: true, running: false, loggedIn: false, httpsEnabled: false, login: null, dnsName: null, tailnet: null,
      error: error.code, detail: String(error.message ?? '').slice(0, 200) }; }
    const backend = String(status.BackendState ?? '');
    const self = status.Self ?? {}, user = status.User?.[String(self.UserID)] ?? null;
    const dnsName = typeof self.DNSName === 'string' ? self.DNSName.replace(/\.$/, '').toLowerCase() : null;
    return { installed: true, running: backend === 'Running', loggedIn: backend === 'Running' && !!user,
      httpsEnabled: Array.isArray(status.CertDomains) && status.CertDomains.length > 0,
      login: typeof user?.LoginName === 'string' ? user.LoginName.toLowerCase() : null, dnsName,
      tailnet: typeof status.CurrentTailnet?.Name === 'string' ? status.CurrentTailnet.Name : null, backend };
  }
  // Who serves HTTPS 443 of this machine: nobody, Workflow Pilot, or someone else.
  async serveState(port) {
    let config;
    try { config = await this.#json(['serve', 'status', '--json']); }
    catch { return { known: false, ours: false, conflict: false }; }
    const target = `http://127.0.0.1:${port}`;
    const handlers = Object.entries(config?.Web ?? {}).filter(([host]) => /:443$/.test(host))
      .flatMap(([, value]) => Object.values(value?.Handlers ?? {}));
    const ours = handlers.some(handler => handler?.Proxy === target);
    const conflict = handlers.some(handler => handler?.Proxy !== target) || (!!config?.TCP?.['443'] && !handlers.length);
    return { known: true, ours, conflict: conflict && !ours };
  }
  async serveOn(port) {
    const cli = this.locate();
    if (!cli) throw tailscaleError('TAILSCALE_NOT_INSTALLED', 'Tailscale не установлен на этом компьютере.');
    const result = await this.run(cli, ['serve', '--bg', '--https=443', `http://127.0.0.1:${port}`]);
    if (result.code !== 0) throw tailscaleError('TAILSCALE_SERVE_FAILED', (result.stderr || result.stdout).trim().slice(0, 200) || 'Tailscale Serve не включён.');
    return true;
  }
  async serveOff(port) {
    const cli = this.locate();
    if (!cli) return false;
    const result = await this.run(cli, ['serve', '--https=443', `http://127.0.0.1:${port}`, 'off']);
    return result.code === 0;
  }
}
