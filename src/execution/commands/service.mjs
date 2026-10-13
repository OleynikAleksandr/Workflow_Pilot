import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { operationId, unknownOperation } from '../../contracts/execution.mjs';
import { RuntimeError } from '../../contracts/errors.mjs';

// spawn, unlike execFile, actually supports detached process groups on POSIX.
function spawnFile(file, args, options, callback) {
  const { timeout = 0, maxBuffer = 1024 * 1024, ...spawnOptions } = options;
  const child = spawn(file, args, spawnOptions);
  let stdout = '', stderr = '', failure = null, closed = false, forceTimer;
  const terminate = () => {
    if (closed || !child.pid) return;
    try {
      if (process.platform === 'win32') execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {});
      else process.kill(-child.pid, 'SIGTERM');
    } catch { /* Await close; never synthesize success. */ }
    forceTimer ??= setTimeout(() => {
      if (!closed && process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
    }, 1000);
    forceTimer.unref?.();
  };
  const append = (current, chunk) => {
    const result = current + chunk;
    if (Buffer.byteLength(result) <= maxBuffer) return result;
    failure ??= Object.assign(new Error('Command output exceeds maxBuffer'), { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', killed: true });
    terminate();
    return Buffer.from(result).subarray(0, maxBuffer).toString('utf8');
  };
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout = append(stdout, chunk); });
  child.stderr.on('data', chunk => { stderr = append(stderr, chunk); });
  child.on('error', error => { failure ??= error; if (error.name === 'AbortError') terminate(); });
  const timeoutTimer = timeout > 0 ? setTimeout(() => {
    failure ??= Object.assign(new Error('Command timed out'), { code: 'ETIMEDOUT', killed: true });
    terminate();
  }, timeout) : null;
  child.on('close', (code, signal) => {
    closed = true; clearTimeout(timeoutTimer); clearTimeout(forceTimer);
    if (!failure && (code !== 0 || signal)) failure = Object.assign(new Error('Command failed: ' + (signal ?? code)), { code, signal, killed: !!signal });
    if (failure && signal) failure.signal = signal;
    callback(failure, stdout, stderr);
  });
  return child;
}

// Owns only local desktop workers. The Python AppServerClient owns model-tool commands separately.
// Records are bounded snapshots; input (including tunnel credentials) is never retained.
export class CommandService {
  constructor({ launch = spawnFile, platform = process.platform, signal = process.kill.bind(process),
    historyLimit = 128 } = {}) {
    Object.assign(this, { launch, platform, signal, historyLimit });
    this.operations = new Map();
    this.closed = false;
  }
  start(file, args = [], options = {}) {
    if (this.closed) throw new RuntimeError('EXECUTION_CLOSED', 'Исполнитель уже закрыт.');
    if (typeof file !== 'string' || !file || !Array.isArray(args) || args.some(arg => typeof arg !== 'string'))
      throw new TypeError('CommandService requires an executable and string arguments');
    const id = randomUUID();
    let complete;
    const record = { id, child: null, outcome: 'running', stdout: '', stderr: '', exitCode: null,
      signal: null, error: null, failure: null, cancelled: false, killTimer: null, inputClosed: false,
      completion: new Promise(resolve => { complete = resolve; }) };
    this.operations.set(id, record);
    const maxBuffer = options.maxBuffer ?? 1024 * 1024;
    const finish = (error, stdout = record.stdout, stderr = record.stderr) => {
      if (record.outcome !== 'running') return;
      clearTimeout(record.killTimer);
      record.stdout = String(stdout); record.stderr = String(stderr);
      record.exitCode = Number.isInteger(error?.code) ? error.code : error ? null : 0;
      record.signal = error?.signal ?? null;
      record.outcome = error ? (record.cancelled || error.name === 'AbortError' ? 'cancel' : 'error') : 'success';
      record.failure = error;
      record.error = error ? { code: String(error.code ?? 'COMMAND_FAILED'), message: String(error.message) } : null;
      complete(this.snapshot(id));
      this.prune();
    };
    try {
      const child = this.launch(file, args, { ...options, encoding: 'utf8', shell: false,
        detached: this.platform !== 'win32', windowsHide: true }, finish);
      record.child = child;
      child.stdout?.on('data', chunk => { record.stdout = (record.stdout + chunk).slice(0, maxBuffer); });
      child.stderr?.on('data', chunk => { record.stderr = (record.stderr + chunk).slice(0, maxBuffer); });
      child.stdin?.on('error', () => {}); // Process completion owns pipe errors.
    } catch (error) { finish(error); }
    return this.snapshot(id);
  }
  snapshot(id) {
    operationId(id);
    const r = this.operations.get(id);
    return r ? { operationId: id, sessionId: r.outcome === 'running' ? id : null, outcome: r.outcome,
      exitCode: r.exitCode, signal: r.signal, stdout: r.stdout, stderr: r.stderr,
      error: r.error ? { ...r.error } : null } : unknownOperation(id);
  }
  requireRunning(id) {
    operationId(id);
    const r = this.operations.get(id);
    if (!r || r.outcome !== 'running') throw new RuntimeError('EXECUTION_SESSION_UNKNOWN', 'Операция не имеет активного stdin.');
    return r;
  }
  async writeInput(id, input = '', { end = false } = {}) {
    const r = this.requireRunning(id);
    if (typeof input !== 'string' || r.inputClosed || !r.child?.stdin?.writable)
      throw new RuntimeError('EXECUTION_STDIN_CLOSED', 'Ввод этой операции закрыт.');
    if (end) { r.inputClosed = true; r.child.stdin.end(input); }
    else if (input) await new Promise((resolve, reject) => r.child.stdin.write(input, error => error ? reject(error) : resolve()));
    return this.snapshot(id);
  }
  async wait(id, yieldMs = 1000) {
    operationId(id);
    const r = this.operations.get(id);
    if (!r) return unknownOperation(id);
    if (r.outcome !== 'running') return this.snapshot(id);
    if (!Number.isFinite(yieldMs) || yieldMs < 0 || yieldMs > 60000) throw new RangeError('yieldMs must be 0..60000');
    let timer;
    try { return await Promise.race([r.completion, new Promise(resolve => {
      timer = setTimeout(() => resolve(this.snapshot(id)), yieldMs);
    })]); } finally { clearTimeout(timer); }
  }
  async cancel(id) {
    const r = this.requireRunning(id);
    if (r.cancelled) return this.snapshot(id);
    if (!r.child?.pid) return this.snapshot(id); // A spawn error still needs terminal evidence.
    r.cancelled = true;
    try {
      if (this.platform === 'win32') {
        // PID belongs to this still-live child; taskkill is limited to its tree.
        await new Promise((resolve, reject) => execFile('taskkill.exe',
          ['/PID', String(r.child.pid), '/T', '/F'], { windowsHide: true, timeout: 5000 },
          error => error ? reject(error) : resolve()));
      } else {
        this.signal(-r.child.pid, 'SIGTERM');
        r.killTimer = setTimeout(() => {
          if (r.outcome === 'running') { try { this.signal(-r.child.pid, 'SIGKILL'); } catch { /* keep awaiting evidence */ } }
        }, 1000);
        r.killTimer.unref?.();
      }
    } catch (error) {
      if (r.outcome === 'running') {
        r.cancelled = false;
        throw new RuntimeError('EXECUTION_CANCEL_UNCONFIRMED', 'Остановка не подтверждена: ' + String(error.code ?? error.message));
      }
    }
    return this.snapshot(id);
  }
  async executeFile(file, args = [], options = {}, input) {
    const first = this.start(file, args, options), r = this.operations.get(first.operationId);
    if (r.outcome === 'running' && r.child?.stdin?.writable)
      await this.writeInput(r.id, input ?? '', { end: true });
    await r.completion;
    if (r.failure) throw Object.assign(r.failure, { stdout: r.stdout, stderr: r.stderr,
      operationId: r.id, outcome: r.outcome });
    return { stdout: r.stdout, stderr: r.stderr, operationId: r.id, outcome: r.outcome };
  }
  prune() {
    const finished = [...this.operations.values()].filter(r => r.outcome !== 'running');
    for (const r of finished.slice(0, Math.max(0, finished.length - this.historyLimit))) this.operations.delete(r.id);
  }
  async dispose() {
    this.closed = true;
    const pending = [...this.operations.values()].filter(r => r.outcome === 'running');
    await Promise.allSettled(pending.map(r => this.cancel(r.id)));
    await Promise.all(pending.map(r => this.wait(r.id, 5000)));
  }
}
export const desktopCommands = new CommandService();
export const executeFile = (...args) => desktopCommands.executeFile(...args);
export const executeInput = (file, args, options, input) => desktopCommands.executeFile(file, args, options, input);
