import { fail } from './common.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { executableCandidateAllowed, nodeExecutableCandidates } from './platform.mjs';
import { WorkspaceReadiness } from './workspace-readiness.mjs';
const execute = promisify(execFile);

export class WorkspaceSetup {
  constructor({ resourceDir = fileURLToPath(new URL('../resources/', import.meta.url)), nodeCandidates,
    environment = process.env, platform = process.platform, executeNode = execute, prepareEnvironment,
    onWorkerStart = () => {} } = {}) {
    this.resourceDir = resourceDir;
    this.platform = platform;
    this.executeNode = executeNode;
    this.onWorkerStart = onWorkerStart;
    this.prepareEnvironment = prepareEnvironment;
    this.nodeCandidates = nodeCandidates ?? nodeExecutableCandidates({
      platform,
      environment,
      execPath: process.execPath,
      electron: Boolean(process.versions.electron),
    });
    this.environment = { ...environment, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' };
    for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX', 'ELECTRON_RUN_AS_NODE']) delete this.environment[key];
    if (platform === 'win32') {
      // The bundled worker must not inherit Node flags/module hooks from other apps.
      for (const key of Object.keys(this.environment)) {
        if (['NODE_OPTIONS', 'NODE_PATH'].includes(key.toUpperCase())) delete this.environment[key];
      }
    }
    this.tickets = new Map();
    this.readiness = new WorkspaceReadiness({
      fingerprint: workspace => this.call({ action: 'fingerprint', mode: 'existing', project: workspace }),
      inspect: workspace => this.call({ action: 'inspect', mode: 'existing', project: workspace }),
    });
  }
  setRuntimeEnvironment(values) {
    const allowed = new Set(['WORKFLOW_GIT_BIN', 'WORKFLOW_GIT_HOME', 'WORKFLOW_NODE_LICENSE']);
    for (const [key, value] of Object.entries(values ?? {})) {
      if ((!allowed.has(key) && key.toLowerCase() !== 'path') || typeof value !== 'string' || /[\r\n\0]/.test(value))
        throw fail('RUNTIME_ENVIRONMENT', 'Некорректное окружение локальных компонентов.');
    }
    for (const [key, value] of Object.entries(values ?? {})) {
      if (key.toLowerCase() === 'path') {
        for (const existing of Object.keys(this.environment)) if (existing.toLowerCase() === 'path') delete this.environment[existing];
        this.environment[this.platform === 'win32' ? 'Path' : 'PATH'] = value;
      } else this.environment[key] = value;
    }
  }
  includeNodePath() {
    const api = this.platform === 'win32' ? path.win32 : path.posix;
    if (!this.nodeExecutable || !api.isAbsolute(this.nodeExecutable)) return;
    const separator = this.platform === 'win32' ? ';' : ':';
    const oldPath = Object.entries(this.environment).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
    const directory = api.dirname(this.nodeExecutable);
    const same = value => this.platform === 'win32' ? value.toLowerCase() === directory.toLowerCase() : value === directory;
    for (const key of Object.keys(this.environment)) if (key.toLowerCase() === 'path') delete this.environment[key];
    this.environment[this.platform === 'win32' ? 'Path' : 'PATH'] = [directory, ...oldPath.split(separator).filter(value => !same(value))].join(separator);
  }
  async node() {
    if (this.nodeExecutable) { this.includeNodePath(); return this.nodeExecutable; }
    const nodeIssues = [];
    for (const candidate of this.nodeCandidates) {
      if (!executableCandidateAllowed(candidate, this.platform)) continue;
      try {
        const { stdout } = await this.executeNode(candidate, ['--version'], {
          timeout: 5000, env: this.environment,
          ...(this.platform === 'win32' ? { windowsHide: true } : {}),
        });
        const version = /^v(\d+)\.(\d+)\.(\d+)\s*$/.exec(stdout);
        if (version && Number(version[1]) === 24 && Number(version[2]) >= 21) {
          this.nodeExecutable = candidate;
          this.includeNodePath();
          return candidate;
        }
        if (version || this.platform === 'win32') nodeIssues.push({
          candidate, code: version
            ? (Number(version[1]) > 24 ? 'NODE_UNSUPPORTED' : 'NODE_TOO_OLD')
            : 'INVALID_VERSION_OUTPUT', version: version?.[0].trim(),
        });
      } catch (error) {
        if (this.platform === 'win32' && error.code !== 'ENOENT') nodeIssues.push({
          candidate, code: error.killed ? 'TIMEOUT' : String(error.code ?? 'START_FAILED'),
        });
      }
    }
    const issue = nodeIssues.find(item => !['NODE_TOO_OLD', 'NODE_UNSUPPORTED'].includes(item.code)) ?? nodeIssues[0];
    if (issue && ['NODE_TOO_OLD', 'NODE_UNSUPPORTED'].includes(issue.code)) throw fail(issue.code,
      'Найден Node.js ' + issue.version + ', нужен Node.js 24.21.0 или новее в линии 24 (ниже 25). ' +
      (this.platform === 'win32'
        ? 'Распакуйте всю папку актуальной Windows-версии приложения.'
        : 'Установите поддерживаемую версию и повторите проверку.'));
    if (this.platform === 'win32') {
      if (issue) throw fail('NODE_START_FAILED',
        'Не удалось запустить Node.js: ' + issue.candidate + ' (' + issue.code + '). Проверьте доступ к файлу и повторите проверку.');
      throw fail('NODE_MISSING',
        'Node.js не найден. Распакуйте всю папку Windows-версии приложения, включая resources, и повторите проверку.');
    }
    throw fail('NODE_MISSING', 'Для подготовки проектов нужен Node.js 24.21.0 или новее в линии 24 (ниже 25). Установите его и повторите проверку.');
  }
  async call(input) {
    if (this.prepareEnvironment) this.setRuntimeEnvironment(await this.prepareEnvironment());
    const node = await this.node();
    this.onWorkerStart('workspace-setup');
    const child = execFile(node, [path.join(this.resourceDir, 'workspace-setup-worker.mjs')],
      { env: this.environment, timeout: 120000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8',
        ...(this.platform === 'win32' ? { windowsHide: true } : {}) });
    const result = await new Promise((resolve, reject) => {
      let stdout = '', stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', code => {
        let data; try { data = JSON.parse(stdout); } catch { reject(fail('SETUP_FAILED', 'Проверка папки не завершилась: ' + (stderr.trim().slice(-500) || `код ${code}`))); return; }
        if (!data.ok) reject(fail(data.code ?? 'SETUP_FAILED', data.message)); else resolve(data);
      });
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify(input));
    });
    return result;
  }
  async preview({ mode, workspace, parent, name } = {}) {
    if (!['new', 'existing'].includes(mode)) throw fail('SETUP_MODE', 'Выберите создание или подключение проекта.');
    if (mode === 'new') {
      if (typeof name !== 'string' || !name.trim() || name !== name.trim() || name.length > 120 || /[\/\\\r\n\0]/.test(name) || ['.', '..'].includes(name) || name.startsWith('.')) throw fail('PROJECT_NAME', 'Укажите обычное имя новой папки без слешей и переносов строк.');
      if (typeof parent !== 'string' || !path.isAbsolute(parent)) throw fail('PARENT_REQUIRED', 'Выберите папку, в которой создать проект.');
      const canonicalParent = await fs.realpath(parent);
      workspace = path.join(canonicalParent, name);
    }
    if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) throw fail('PROJECT_PATH', 'Выберите папку проекта.');
    this.readiness.clear(workspace);
    const request = { action: 'inspect', mode, project: workspace, name: mode === 'new' ? name : undefined };
    const result = await this.call(request);
    const token = randomUUID();
    this.tickets.clear(); this.tickets.set(token, { request, fingerprint: result.fingerprint });
    return { ...result, token, mode };
  }
  async apply(token) {
    const ticket = this.tickets.get(token);
    if (!ticket) throw fail('PREVIEW_REQUIRED', 'Сначала проверьте выбранную папку.');
    this.readiness.clear(ticket.request.project);
    const result = await this.call({ ...ticket.request, action: 'apply', fingerprint: ticket.fingerprint });
    this.tickets.delete(token);
    return result;
  }
  clear() { this.tickets.clear(); }
  async ready(workspace,options) {
    if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) throw fail('PROJECT_PATH', 'Выберите папку проекта.');
    return this.readiness.check(await fs.realpath(workspace),options);
  }
  invalidateReadiness(workspace = null) { this.readiness.clear(workspace); }
}
