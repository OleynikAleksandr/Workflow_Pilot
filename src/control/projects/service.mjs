import { WorkspaceSessions } from '../sessions/workspace-session.mjs';
import { WorkspaceDeletion } from './workspace-deletion.mjs';

// Storage and mutation queues never cross the Control boundary. Reads are detached DTOs.
export class ProjectsService {
  #store;
  constructor(file, options) { this.#store = new WorkspaceSessions(file, options); }
  get file() { return this.#store.file; }
  load() { return this.#store.load(); }
  snapshot() { return this.#store.snapshot(); }
  selected() { return this.#store.selected(); }
  landing() { return this.#store.landing(); }
  project(...args) { return this.#store.project(...args); }
  inspect(...args) { return this.#store.inspect(...args); }
  select(...args) { return this.#store.select(...args); }
  selectSession(...args) { return this.#store.selectSession(...args); }
  bindChat(...args) { return this.#store.bindChat(...args); }
  newSession(...args) { return this.#store.newSession(...args); }
  connectExternal(...args) { return this.#store.connectExternal(...args); }
  newChat(...args) { return this.#store.newChat(...args); }
  reconcileRoles(...args) { return this.#store.reconcileRoles(...args); }
  assignOrchestrator(...args) { return this.#store.assignOrchestrator(...args); }
  ensureExecutor(...args) { return this.#store.ensureExecutor(...args); }
  assignmentProof(...args) { return this.#store.assignmentProof(...args); }
  saveExecutorAutomation(...args) { return this.#store.saveExecutorAutomation(...args); }
  saveExecutorTime(...args) { return this.#store.saveExecutorTime(...args); }
  resetUnsentExecutor(...args) { return this.#store.resetUnsentExecutor(...args); }
  setExpanded(...args) { return this.#store.setExpanded(...args); }
  setProjectDisplayName(...args) { return this.#store.setProjectDisplayName(...args); }
  renameSession(...args) { return this.#store.renameSession(...args); }
  setSessionTitle(...args) { return this.#store.setSessionTitle(...args); }
  applyScopeTitle(...args) { return this.#store.applyScopeTitle(...args); }
  recordAgentTime(...args) { return this.#store.recordAgentTime(...args); }
  updateSession(...args) { return this.#store.updateSession(...args); }
  setSessionArchived(...args) { return this.#store.setSessionArchived(...args); }
  forgetArchivedSessions(...args) { return this.#store.forgetArchivedSessions(...args); }
  setArchived(...args) { return this.#store.setArchived(...args); }
  forgetArchived(...args) { return this.#store.forgetArchived(...args); }
  forgetArchivedMany(...args) { return this.#store.forgetArchivedMany(...args); }
  whenIdle() { return this.#store.mutationTail; }
  createDeletion(options) {
    const service = new WorkspaceDeletion({...options, store:this.#store, git:this.#store.git});
    return Object.freeze({
      journalDir: service.journalDir,
      clear: () => service.clear(), isPending: workspace => service.isPending(workspace),
      preview: workspace => service.preview(workspace), apply: (...args) => service.apply(...args),
      forget: (...args) => service.forget(...args),
      inspectOrphan: input => service.inspectOrphan(input), clearOrphan: (...args) => service.clearOrphan(...args),
      recover: () => service.recover(),
    });
  }
}
