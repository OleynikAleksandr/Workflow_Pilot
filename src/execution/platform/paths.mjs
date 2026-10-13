import path from 'node:path';

export const BUNDLED_NODE_VERSION = '24.21.0';

function pathApi(platform) {
  return platform === 'win32' ? path.win32 : path.posix;
}

// Where the Codex App Server executor, the only local MCP backend, keeps its files. control.py of the
// executor computes the same folder when it starts at sign-in without Workflow Pilot.
export function defaultRuntimeFolder(homeDir, platform = process.platform, environment = process.env) {
  const api = pathApi(platform);
  if (platform === 'darwin') return api.join(homeDir, 'Library', 'Application Support', 'WorkflowPilotCodexExecutor');
  if (platform === 'win32') {
    const local = environment?.LOCALAPPDATA;
    return api.join(typeof local === 'string' && api.isAbsolute(local) ? local : api.join(homeDir, 'AppData', 'Local'), 'WorkflowPilotCodexExecutor');
  }
  const state=environment?.XDG_STATE_HOME;
  return api.join(typeof state==='string'&&api.isAbsolute(state)?state:api.join(homeDir,'.local','state'), 'WorkflowPilotCodexExecutor');
}

export function isAbsolutePlatformPath(value, platform = process.platform) {
  if (typeof value !== 'string') return false;
  if (platform === 'win32') return /^[A-Za-z]:[\\/]/.test(value) || /^\\\\[^\\]/.test(value);
  return pathApi(platform).isAbsolute(value);
}

export function nodeExecutableCandidates({
  platform = process.platform,
  environment = process.env,
  execPath = process.execPath,
  electron = Boolean(process.versions.electron),
} = {}) {
  if (platform === 'darwin') {
    return [...new Set(['/opt/homebrew/bin/node', '/usr/local/bin/node', ...(!electron ? [execPath] : [])])];
  }
  if (platform === 'win32') {
    const api = path.win32;
    const candidates = [];
    for (const root of [environment.ProgramFiles, environment['ProgramFiles(x86)']]) {
      if (typeof root === 'string' && root) candidates.push(api.join(root, 'nodejs', 'node.exe'));
    }
    if (!electron && isAbsolutePlatformPath(execPath, platform)) candidates.push(execPath);
    candidates.push('node.exe');
    return [...new Set(candidates)];
  }
  return [...new Set([...(!electron ? [execPath] : []), 'node'])];
}

export function executableCandidateAllowed(value, platform = process.platform) {
  return isAbsolutePlatformPath(value, platform) || (typeof value === 'string' && /^[A-Za-z0-9_.-]+$/.test(value));
}

export function bundledMacNode(resourcesPath) {
  return path.posix.join(resourcesPath, 'mac-tools', 'node', 'bin', 'node');
}
export function bundledLinuxNode(resourcesPath) {
  return path.posix.join(resourcesPath,'linux-tools','node',`node-v${BUNDLED_NODE_VERSION}-linux-x64`,'bin','node');
}
