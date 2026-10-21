import { ContextCache } from './context-cache.mjs';
import { readinessContextKey } from './context-inputs.mjs';
import { validateContextPacket } from '../../contracts/context.mjs';
import { SESSION_ROLES } from '../sessions/workspace-session.mjs';

export class ContextService {
  #cache;
  constructor({execution, plans, setup, getRuntime, loadFixture = null, prepareBootstrap = async()=>null, stageStartup, startupProgress, onChange}) {
    this.runtime = Object.freeze({
      ensure: () => execution.ensureServices(),
      prepareBootstrap,
      stageStartup,startupProgress,
      get startupRules() { return getRuntime()?.startupRules ?? []; },
      async loadContext(workspace, role = null) {
        if (loadFixture) return loadFixture(workspace, role);
        await execution.ensureServices();
        return validateContextPacket(await plans.loadContext(workspace, role), workspace);
      },
    });
    // The recovery of a session depends on its role; a legacy session without a role keeps the plain packet.
    const key = (workspace, role) => role ? workspace + '\u0000' + role : workspace;
    const split = value => { const [workspace, role = null] = value.split('\u0000'); return { workspace, role }; };
    this.#cache = new ContextCache({load: value => { const { workspace, role } = split(value); return this.runtime.loadContext(workspace, role); },
      inputKey: value => readinessContextKey(setup, split(value).workspace), workspaceOf: value => split(value).workspace, onChange});
    this.cache = Object.freeze({
      load: (workspace, role) => this.#cache.load(key(workspace, role)), warm: (workspace, role) => this.#cache.warm(key(workspace, role)),
      isCurrent: (workspace, cacheKey, role) => this.#cache.isCurrent(key(workspace, role), cacheKey), clear: () => this.#cache.clear(),
      isBuilding: (workspace, role) => role !== undefined ? this.#cache.isBuilding(key(workspace, role))
        : [null, ...SESSION_ROLES].some(item => this.#cache.isBuilding(key(workspace, item))),
      isPending: () => this.#cache.isPending(),
    });
  }
}
