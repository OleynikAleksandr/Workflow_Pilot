import { desktopCommands } from './commands/service.mjs';
import { desktopFiles } from './files/adapter.mjs';
import { RuntimeError } from '../contracts/errors.mjs';
import { BrowserSessions } from './browser/session-runtime.mjs';
import { startPluginBridge } from './plugin/bridge.mjs';
import {ProjectCommands} from './runtime/project-commands.mjs';
export { openCommunicationStore } from './plugin/communication-store.mjs';
export { chatGPTUrlMatchesExperience, isPendingChatGPTConversation } from './browser/chatgpt-experience.mjs';
export { desktopFiles, exists } from './files/adapter.mjs';
export { ProjectInputWatch, ChildCommandWatches } from './files/project-input-watch.mjs';
export { currentBootIdentity, isProcessDead } from './commands/activity-probe.mjs';
export { chatGPTEntrypoint, CHATGPT_CHAT_ENTRYPOINT } from './browser/chatgpt-experience.mjs';
export { BackendBrowserHost, decorateBackendPage } from './browser/backend-host.mjs';
export { ChromiumDiagnostics } from './browser/diagnostics.mjs';
export { createPresentationRoutes } from './browser/presentation/transport.mjs';
export { TailscaleCli, TAILSCALE_CANDIDATES } from './runtime/tailscale.mjs';
export { desktopDependencies } from './desktop-dependencies.mjs';
export { executeFile } from './commands/service.mjs';
export { diagnosticFiles, queueDiagnosticFile } from './files/diagnostics.mjs';
export { executableCandidateAllowed, nodeExecutableCandidates } from './platform/paths.mjs';

// A desktop instance owns these adapters; no plan/session/store is accepted here.
export class ExecutionFacade {
  #browser = null;
  #plugin = null;
  constructor({ commands = desktopCommands, files = desktopFiles } = {}) {
    this.commands = commands; this.files = files; this.runtime = null;
  }
  attachRuntime(runtime) {
    if (this.runtime && this.runtime !== runtime) throw new RuntimeError('EXECUTION_OWNER_CONFLICT', 'Runtime уже имеет владельца.');
    this.runtime = runtime;
  }
  attachBrowser(options) {
    if (this.#browser) throw new RuntimeError('EXECUTION_OWNER_CONFLICT', 'Browser уже имеет владельца.');
    this.#browser = new BrowserSessions(options);
  }
  openBrowserSession(id) {
    if (!this.#browser) throw new RuntimeError('EXECUTION_NOT_READY', 'Browser ещё не подключён.');
    return this.#browser.open(id);
  }
  services() {
    if (!this.runtime) throw new RuntimeError('EXECUTION_NOT_READY', 'Runtime ещё не подключён.');
    return this.runtime;
  }
  runCommand(file, args, options) { return this.commands.start(file, args, options); }
  writeCommandInput(id, text, options) { return this.commands.writeInput(id, text, options); }
  waitCommand(id, yieldMs) { return this.commands.wait(id, yieldMs); }
  stopCommand(id) { return this.commands.cancel(id); }
  commandSnapshot(id) { return this.commands.snapshot(id); }
  configureProjectCommands(directory) {this.projectCommands=new ProjectCommands(directory);}
  async retireProjectCommands(workspaces) {
    const local=this.commands.retireWorkspaces(workspaces);
    const remote=this.projectCommands?.retire(workspaces)??Promise.resolve({operations:[]});
    const results=await Promise.allSettled([local,remote]);
    const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
    return results[1].value;
  }
  async allowProjectCommands(workspace) {
    await this.projectCommands?.update([workspace],false);this.commands.allowWorkspaces([workspace]);
  }
  executeFile = (...args) => this.commands.executeFile(...args);
  readText(file) { return this.files.readText(file); }
  readJson(file) { return this.files.readJson(file); }
  writeJson(file, value, options) { return this.files.writeJson(file, value, options); }
  canonicalPath(file) { return this.files.canonicalPath(file); }
  ensureServices() { return this.services().ensure(); }
  inspectServices() { return this.services().control('status'); }
  startMcpOnly() { return this.services().control('start', { mcpOnly: true }); }
  selectChannel(channel) { return this.services().setChannel(channel); }
  get channel() { return this.services().channel; }
  get lastStatus() { return this.runtime?.lastStatus ? structuredClone(this.runtime.lastStatus) : null; }
  async attachPlugin(options) {
    if(this.#plugin)throw new RuntimeError('EXECUTION_OWNER_CONFLICT','Plugin bridge уже подключён.');
    this.#plugin=await startPluginBridge(options);
  }
  // Login services survive closing the desktop. Only its own transient workers are disposed.
  async dispose() { this.#browser?.dispose();await Promise.all([this.#plugin?.close(),this.commands.dispose()]); }
}
