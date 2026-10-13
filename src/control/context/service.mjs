import { ContextCache } from './context-cache.mjs';
import { readinessContextKey } from './context-inputs.mjs';
import { validateContextPacket } from '../../contracts/context.mjs';

export class ContextService {
  #cache;
  constructor({execution, plans, setup, getRuntime, loadFixture = null, onChange}) {
    this.runtime = Object.freeze({
      ensure: () => execution.ensureServices(),
      get startupRules() { return getRuntime()?.startupRules ?? []; },
      async loadContext(workspace) {
        if (loadFixture) return loadFixture(workspace);
        await execution.ensureServices();
        return validateContextPacket(await plans.loadContext(workspace), workspace);
      },
    });
    this.#cache = new ContextCache({load: workspace => this.runtime.loadContext(workspace),
      inputKey: workspace => readinessContextKey(setup, workspace), onChange});
    this.cache = Object.freeze({
      load: workspace => this.#cache.load(workspace), warm: workspace => this.#cache.warm(workspace),
      isCurrent: (...args) => this.#cache.isCurrent(...args), clear: () => this.#cache.clear(),
      isBuilding: workspace => this.#cache.isBuilding(workspace), isPending: () => this.#cache.isPending(),
    });
  }
}
