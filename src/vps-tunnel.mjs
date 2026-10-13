import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
// Contract with the vps-server repository: it creates the SSH host block, the key,
// the server user and the connector address; Web Pilot keeps the forward on the current MCP port.
export const VPS_TUNNEL_LABEL = 'com.oleynik.workflow-pilot-vps';
export const VPS_SSH_HOST = 'workflow-pilot-vps';
// Reserved candidate for the new product; requires its own server route and SSH alias.
export const VPS_REMOTE_PORT = 18842;
const CONNECTOR_PATH = /^\/mcp\/[A-Za-z0-9_-]{20,}\/mcp$/;

function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function loopbackMcpPort(mcpUrl) {
  let url;
  try { url = new URL(mcpUrl); } catch { return null; }
  const port = Number(url.port);
  return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.pathname === '/mcp'
    && Number.isSafeInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

// The path carries the secret: only the host is ever shown.
export function maskConnectorUrl(value) {
  return 'https://' + new URL(value).host + '/mcp/…/mcp';
}

export class VpsTunnel {
  constructor({ homeDir = os.homedir(), uid = typeof process.getuid === 'function' ? process.getuid() : 501,
    execute = execFile, launchAgentDir = null, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    settleMs = 2_000, startTimeoutMs = 6_000 } = {}) {
    this.execute = execute;
    this.sleep = sleep;
    this.settleMs = settleMs;
    this.startTimeoutMs = startTimeoutMs;
    this.ssh = '/usr/bin/ssh';
    this.spawnOptions = {};
    this.plistFile = path.join(launchAgentDir ?? path.join(homeDir, 'Library/LaunchAgents'), VPS_TUNNEL_LABEL + '.plist');
    this.logFile = path.join(homeDir, 'Library/Logs/workflow-pilot-vps.log');
    this.urlFile = path.join(homeDir, '.config/workflow-pilot/vps/mcp-url');
    this.domain = `gui/${uid}`;
    this.service = `${this.domain}/${VPS_TUNNEL_LABEL}`;
  }

  plist(port) {
    const argv = ['/usr/bin/ssh', '-N', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes',
      '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3',
      '-R', `127.0.0.1:${VPS_REMOTE_PORT}:127.0.0.1:${port}`, VPS_SSH_HOST];
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${VPS_TUNNEL_LABEL}</string>
<key>ProgramArguments</key><array>${argv.map(value => `<string>${xml(value)}</string>`).join('')}</array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>15</integer>
<key>StandardErrorPath</key><string>${xml(this.logFile)}</string>
</dict></plist>
`;
  }

  async connectorUrl() {
    const text = (await fs.readFile(this.urlFile, 'utf8')).trim();
    let url;
    try { url = new URL(text); } catch { url = null; }
    if (!url || url.protocol !== 'https:' || !CONNECTOR_PATH.test(url.pathname) || url.search || url.hash || url.username) {
      throw new Error('Адрес коннектора VPS повреждён; повторите настройку сервера.');
    }
    return text;
  }

  async inspectSsh() {
    let stdout = '';
    try {
      ({ stdout = '' } = await this.execute(this.ssh, ['-G', '-T', VPS_SSH_HOST], { timeout: 5_000, maxBuffer: 256 * 1024, ...this.spawnOptions }));
    } catch {
      return { configured: false, remoteForward: false };
    }
    const values = key => stdout.split(/\r?\n/).filter(line => line.startsWith(key + ' ')).map(line => line.slice(key.length + 1).trim());
    const hostname = values('hostname')[0];
    // Without a Host block ssh echoes the alias itself as the hostname.
    return { configured: !!hostname && hostname !== VPS_SSH_HOST, remoteForward: values('remoteforward').length > 0 };
  }

  async agent() {
    try {
      const { stdout = '' } = await this.execute('/bin/launchctl', ['print', this.service], { timeout: 5_000, maxBuffer: 512 * 1024 });
      const state = /^\s*state = (\S+)/m.exec(stdout)?.[1] ?? null;
      const pid = Number(/^\s*pid = (\d+)/m.exec(stdout)?.[1]) || null;
      return { loaded: true, running: state === 'running' && pid !== null, pid };
    } catch {
      return { loaded: false, running: false, pid: null };
    }
  }

  async forwardPort() {
    try {
      const text = await fs.readFile(this.plistFile, 'utf8');
      const match = new RegExp(`<string>-R</string><string>127\\.0\\.0\\.1:${VPS_REMOTE_PORT}:127\\.0\\.0\\.1:(\\d+)</string>`).exec(text);
      return match ? Number(match[1]) : null;
    } catch {
      return null;
    }
  }

  async lastError() {
    try {
      const stat = await fs.stat(this.logFile);
      if (!stat.size) return null;
      const handle = await fs.open(this.logFile, 'r');
      try {
        const length = Math.min(stat.size, 4096);
        const { buffer } = await handle.read(Buffer.alloc(length), 0, length, stat.size - length);
        const line = buffer.toString('utf8').split('\n').map(value => value.trim()).filter(Boolean).at(-1);
        return line ? { message: line.slice(0, 200), at: stat.mtime.toISOString() } : null;
      } finally { await handle.close(); }
    } catch {
      return null;
    }
  }

  async status(mcpUrl) {
    const mcpPort = loopbackMcpPort(mcpUrl);
    const ssh = await this.inspectSsh();
    if (!ssh.configured) {
      return { configured: false, conflict: false, running: false, ready: false, owned: false, pid: null,
        mcpPort, forwardPort: null, portMatches: false, lastError: null, connector: null };
    }
    const [seen, connector] = await Promise.all([this.observe(), this.connectorUrl().then(maskConnectorUrl, () => null)]);
    const portMatches = mcpPort !== null && seen.forwardPort === mcpPort;
    return { configured: true, conflict: ssh.remoteForward, running: seen.running, pid: seen.pid,
      ready: !ssh.remoteForward && seen.running && portMatches, owned: true,
      mcpPort, forwardPort: seen.forwardPort, portMatches, lastError: seen.lastError, connector };
  }

  // What keeps the forward and how it is doing. macOS: the LaunchAgent, its plist and its log.
  async observe() {
    const [agent, forwardPort, lastError] = await Promise.all([this.agent(), this.forwardPort(), this.lastError()]);
    return { running: agent.running, pid: agent.pid, forwardPort, lastError };
  }

  async bootstrap() {
    let failure;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await this.execute('/bin/launchctl', ['bootstrap', this.domain, this.plistFile], { timeout: 10_000, maxBuffer: 64 * 1024 });
        return;
      } catch (error) {
        failure = error;
        await this.sleep(500); // bootout finishes asynchronously
      }
    }
    throw new Error('Не удалось запустить туннель VPS: ' + (failure?.stderr || failure?.message || 'launchctl bootstrap').toString().trim().slice(0, 200));
  }

  // ExitOnForwardFailure ends ssh quickly when the forward is refused; a pid that
  // survives the settle period holds an established forward.
  async settle() {
    const deadline = Date.now() + this.startTimeoutMs;
    let agent = await this.agent();
    while (!agent.running && Date.now() < deadline) {
      await this.sleep(250);
      agent = await this.agent();
    }
    if (!agent.running) return;
    await this.sleep(this.settleMs);
  }

  async apply(mcpUrl) {
    const port = loopbackMcpPort(mcpUrl);
    if (port === null) throw new Error('Некорректный адрес локального MCP для туннеля VPS.');
    const ssh = await this.inspectSsh();
    if (!ssh.configured || ssh.remoteForward) return this.status(mcpUrl);
    const next = this.plist(port);
    const current = await fs.readFile(this.plistFile, 'utf8').catch(() => null);
    const agent = await this.agent();
    if (current !== next) {
      await fs.mkdir(path.dirname(this.plistFile), { recursive: true });
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.writeFile(this.plistFile + '.tmp', next, { mode: 0o644 });
      await fs.rename(this.plistFile + '.tmp', this.plistFile);
      if (agent.loaded) await this.execute('/bin/launchctl', ['bootout', this.service], { timeout: 10_000, maxBuffer: 64 * 1024 }).catch(() => {});
      await this.bootstrap();
      await this.settle();
    } else if (!agent.loaded) {
      await this.bootstrap();
      await this.settle();
    }
    return this.status(mcpUrl);
  }
}

// Windows has no LaunchAgent: control.py of the executor keeps the same ssh forward with a small supervisor
// process, starts it at sign-in and restarts it after a drop. Everything else — the alias in ~/.ssh/config,
// the RemoteForward conflict, the connector address — is read exactly as on macOS.
export class WindowsVpsTunnel extends VpsTunnel {
  // control(args) runs one vps-* command of control.py and returns its JSON.
  constructor({ control, homeDir = os.homedir(), environment = process.env, ...options } = {}) {
    super({ homeDir, ...options });
    if (typeof control !== 'function') throw new TypeError('WindowsVpsTunnel requires control');
    this.control = control;
    const systemRoot = Object.entries(environment).find(([key]) => key.toLowerCase() === 'systemroot')?.[1] || 'C:\\Windows';
    // The OpenSSH client that ships with Windows; without it the server counts as not configured.
    this.ssh = path.join(systemRoot, 'System32', 'OpenSSH', 'ssh.exe');
    this.spawnOptions = { windowsHide: true };
  }

  async observe() {
    const vps = (await this.control(['vps-status']))?.vps ?? {};
    return { supervised: !!vps.supervised, running: !!vps.running, pid: vps.pid ?? null,
      forwardPort: Number.isSafeInteger(vps.forward_port) ? vps.forward_port : null,
      lastError: vps.last_error?.message ? { message: String(vps.last_error.message).slice(0, 200), at: String(vps.last_error.at) } : null };
  }

  // ExitOnForwardFailure ends ssh quickly when the forward is refused; an ssh that
  // survives the settle period holds an established forward.
  async settle() {
    const deadline = Date.now() + this.startTimeoutMs;
    let seen = await this.observe();
    while (!seen.running && Date.now() < deadline) {
      await this.sleep(250);
      seen = await this.observe();
    }
    if (seen.running) await this.sleep(this.settleMs);
  }

  async apply(mcpUrl) {
    const port = loopbackMcpPort(mcpUrl);
    if (port === null) throw new Error('Некорректный адрес локального MCP для туннеля VPS.');
    const ssh = await this.inspectSsh();
    if (!ssh.configured) {
      // The server was removed from ~/.ssh/config: nothing may keep dialling it at every sign-in.
      const seen = await this.observe();
      if (seen.supervised || seen.forwardPort !== null) await this.control(['vps-stop']);
      return this.status(mcpUrl);
    }
    if (ssh.remoteForward) return this.status(mcpUrl);
    const before = await this.observe();
    await this.control(['vps-apply', '--port', String(port)]);
    if (!before.running || before.forwardPort !== port) await this.settle();
    return this.status(mcpUrl);
  }
}
