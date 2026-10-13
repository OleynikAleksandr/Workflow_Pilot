import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { check, atomic, id, VERSION } from './common.mjs';

export const windows = process.platform === 'win32';
export function runtimeLayout(root, platform = process.platform) {
  const directory = path.join(root, '.harness', 'runtime');
  return { directory, node: path.join(directory, platform === 'win32' ? 'node.exe' : 'node'),
    git: path.join(directory, 'git'), gitExecutable: path.join(directory, 'git', 'cmd', 'git.exe') };
}
export function gitExecutable(root, platform = process.platform, env = process.env) {
  if (platform !== 'win32') return 'git';
  for (let current = path.resolve(root); ; current = path.dirname(current)) {
    const local = runtimeLayout(current, platform).gitExecutable;
    if (fs.existsSync(local)) return local;
    if (path.dirname(current) === current) break;
  }
  if (env.WORKFLOW_GIT_BIN && fs.existsSync(env.WORKFLOW_GIT_BIN)) return env.WORKFLOW_GIT_BIN;
  return 'git.exe';
}
export function processEnvironment(cwd, overrides = {}, platform = process.platform) {
  const environment = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C.UTF-8', ...overrides };
  // Git exposes repository-local locations to hooks. A nested workflow must
  // resolve its own worktree instead of inheriting the caller's index/objects.
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX']) delete environment[key];
  if (platform === 'win32') {
    const oldPath = Object.entries(overrides).find(([key]) => key.toLowerCase() === 'path')?.[1]
      ?? Object.entries(environment).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
    for (const key of Object.keys(environment)) if (key.toLowerCase() === 'path') delete environment[key];
    const local = runtimeLayout(cwd, platform);
    environment.Path = [path.dirname(local.node), path.join(local.git, 'cmd'), path.join(local.git, 'usr', 'bin'), oldPath].join(';');
  }
  return environment;
}
export function usableNode(candidate) {
  if (!candidate || !fs.existsSync(candidate)) return false;
  const result = spawnSync(candidate, ['--version'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  return result.status === 0 && /^v(\d+)\./.test(result.stdout) && Number(RegExp.$1) >= 22;
}
export function prepareRuntime(root) {
  const layout = runtimeLayout(root);
  fs.mkdirSync(layout.directory, { recursive: true });
  if (!windows) {
    if (['/opt/homebrew/bin/node', '/usr/local/bin/node'].some(usableNode)) return { node_runtime: 'system' };
    if (!fs.existsSync(layout.node)) { fs.copyFileSync(process.execPath, layout.node); fs.chmodSync(layout.node, 0o755); }
    check(usableNode(layout.node), 'NODE_RUNTIME', 'Локальному проекту нужен исправный Node.js 22+.');
    return { node_runtime: 'project-local' };
  }
  if (!fs.existsSync(layout.node)) fs.copyFileSync(process.execPath, layout.node);
  check(usableNode(layout.node), 'NODE_RUNTIME', 'Локальный Node.js 22+ отсутствует или повреждён.');
  if (process.env.WORKFLOW_NODE_LICENSE && fs.existsSync(process.env.WORKFLOW_NODE_LICENSE)) fs.copyFileSync(process.env.WORKFLOW_NODE_LICENSE, path.join(layout.directory, 'Node-LICENSE'));
  const bundled = process.env.WORKFLOW_GIT_HOME;
  if (bundled) {
    check(fs.existsSync(path.join(bundled, 'cmd', 'git.exe')) && fs.existsSync(path.join(bundled, 'usr', 'bin', 'sh.exe')), 'GIT_RUNTIME', 'Комплект Git в приложении неполон. Распакуйте весь ZIP.');
    const marker = path.join(layout.git, '.workflow-runtime-ready');
    if (!fs.existsSync(layout.git)) {
      const temporary = path.join(layout.directory, 'git-copy-' + id());
      try { fs.cpSync(bundled, temporary, { recursive: true, errorOnExist: true }); atomic(path.join(temporary, '.workflow-runtime-ready'), VERSION + '\n'); fs.renameSync(temporary, layout.git); }
      finally { if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true }); }
    }
    check(fs.existsSync(marker) && fs.existsSync(layout.gitExecutable), 'GIT_RUNTIME_CONFLICT', 'Локальная папка Git неполна или принадлежит другой установке; автоматическая перезапись запрещена.');
  }
  const git = gitExecutable(root);
  const probe = spawnSync(git, ['--version'], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true, env: processEnvironment(root) });
  check(probe.status === 0, 'GIT_RUNTIME', 'Git для Windows не запускается. Распакуйте весь пакет приложения.');
  return { node_runtime: 'project-local', git_runtime: fs.existsSync(layout.gitExecutable) ? 'project-local' : 'system' };
}
export function launcherCommand(root) {
  return windows ? { executable: runtimeLayout(root).node, args: [path.join(root, 'scripts', 'workflow.mjs')] }
    : { executable: path.join(root, 'scripts', 'workflow'), args: [] };
}

export const windowsLauncher = [
  '@echo off', 'setlocal DisableDelayedExpansion', 'set "WORKFLOW_ROOT=%~dp0.."',
  'set "PATH=%WORKFLOW_ROOT%\\.harness\\runtime\\git\\cmd;%WORKFLOW_ROOT%\\.harness\\runtime\\git\\usr\\bin;%PATH%"',
  'if not exist "%WORKFLOW_ROOT%\\.harness\\runtime\\node.exe" (',
  '  echo Workflow runtime is missing. Open this project in Project Workflow Kit. 1>&2', '  exit /b 1', ')',
  '"%WORKFLOW_ROOT%\\.harness\\runtime\\node.exe" "%~dp0workflow.mjs" %*', 'exit /b %errorlevel%', '',
].join('\r\n');

// The Windows command hook defaults to CMD. An explicit PowerShell invocation
// resolves the nearest project without requiring Git on the machine PATH.
export const windowsHookScript = [
  "$ErrorActionPreference = 'Stop'",
  '[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)',
  '[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)',
  '$OutputEncoding = [Text.UTF8Encoding]::new($false)',
  '$d = [IO.DirectoryInfo]::new((Get-Location).Path)',
  "while ($null -ne $d -and -not (Test-Path -LiteralPath (Join-Path $d.FullName '.harness/kit/cli.mjs'))) { $d = $d.Parent }",
  "if ($null -eq $d) { throw 'Workflow project not found' }",
  "$node = Join-Path $d.FullName '.harness/runtime/node.exe'",
  "if (-not (Test-Path -LiteralPath $node)) { throw 'Workflow Node runtime is missing' }",
  '$payload = [Console]::In.ReadToEnd()',
  "$payload | & $node (Join-Path $d.FullName '.harness/kit/cli.mjs') hook session-start",
  'exit $LASTEXITCODE',
].join('; ');
export const windowsHookCommand = 'powershell.exe -NoLogo -NoProfile -NonInteractive -Command "' + windowsHookScript + '"';
