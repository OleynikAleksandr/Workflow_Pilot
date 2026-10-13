import { ProjectInputWatch } from './project-input-watch.mjs';
// Read-only plan projection. Delivery, browser readiness and MCP never gate it.
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const selectionKey = selected => selected ? [selected.workspace, selected.projectId, selected.sessionId].join('\n') : '';
const projectionSignature = info => JSON.stringify(info && {
  workspace: info.workspace,
  projectId: info.projectId,
  inspectedSessionId: info.inspectedSessionId,
  scopeId: info.scopeId,
  scopeTitle: info.scopeTitle,
  objective: info.objective,
  planRevision: info.planRevision,
  scopeStatus: info.scopeStatus,
  deliveryStatus: info.deliveryStatus,
  nextTaskId: info.nextTaskId,
  nextTaskTitle: info.nextTaskTitle,
  planView: info.planView,
});

export class PlanMonitor {
  constructor({ selected, inspect, onChange = () => {}, onError = () => {}, onInputsChanged = () => {},
    createWatcher = options => new ProjectInputWatch(options), wait = pause, retryDelays = [25, 100] }) {
    Object.assign(this, { selected, inspect, onChange, onError, onInputsChanged, createWatcher, wait, retryDelays });
    this.watcher = null; this.watchedSelection = ''; this.watchError = null;
    this.info = null;
    this.pending = false;
    this.rerunRequested = false;
    this.closed = false;
    this.generation = 0;
    this.lastSelectionKey = '';
    this.error = null;
  }

  matches(info, selected) {
    return !!info && !!selected && info.workspace === selected.workspace
      && info.inspectedSessionId === selected.sessionId && info.projectId === selected.projectId;
  }

  view(selected, fallback = null) {
    const current = this.matches(this.info, selected) ? this.info : null;
    const previous = this.matches(fallback, selected) ? fallback : null;
    if (!current) return previous;
    if (previous?.scopeId === current.scopeId && previous.planRevision > current.planRevision) return previous;
    return current;
  }

  invalidate() {
    this.generation++;
    if (this.pending) this.rerunRequested = true;
  }

  // Called on selection/publish; installing watchers precedes the initial read.
  observeSelection() {
    if (this.closed) return;
    const selected = this.selected(), key = selectionKey(selected);
    if (key === this.watchedSelection) return;
    this.watchedSelection = key;
    this.invalidate(); this.watcher?.close(); this.watcher = null; this.watchError = null;
    if (selected) {
      const watcher = this.createWatcher({ workspace: selected.workspace,
        onSignal: () => {
          if (this.watcher !== watcher || selectionKey(this.selected()) !== key) return;
          this.onInputsChanged(); void this.tick();
        },
        onError: error => {
          if (this.watcher !== watcher || JSON.stringify(error) === JSON.stringify(this.watchError)) return;
          this.watchError = error; this.onError(error);
        } });
      this.watcher = watcher;
      watcher.refresh();
    }
    void this.tick();
  }

  refresh() {
    this.observeSelection();
    this.watcher?.refresh({ explicit: true });
    this.onInputsChanged();
    return this.tick();
  }

  async #inspectWithRetry(selected, generation) {
    let lastError;
    for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
      try { return await this.inspect(selected.workspace, selected.sessionId); }
      catch (error) {
        lastError = error;
        if (attempt >= this.retryDelays.length) break;
        await this.wait(this.retryDelays[attempt]);
        if (this.closed || generation !== this.generation || selectionKey(this.selected()) !== selectionKey(selected)) return null;
      }
    }
    throw lastError;
  }

  async tick() {
    if (this.closed) return false;
    if (this.pending) { this.rerunRequested = true; return false; }
    let changed = false;
    do {
      this.rerunRequested = false;
      const selected = this.selected();
      const key = selectionKey(selected);
      if (key !== this.lastSelectionKey) {
        this.lastSelectionKey = key;
        this.generation++;
      }
      const generation = this.generation;
      if (!selected) {
        const previous = this.info;
        this.info = null;
        this.error = null;
        if (previous) { changed = true; this.onChange(null, { previous, initial: false }); }
        continue;
      }
      this.pending = true;
      try {
        const info = await this.#inspectWithRetry(selected, generation);
        if (!info || this.closed || generation !== this.generation
            || selectionKey(this.selected()) !== key || !this.matches(info, selected)) continue;
        // A newly discovered document may have changed during the first read.
        // Arm first, then read once more to close that registration gap.
        if (this.watcher?.update(info.watchInputs)) this.rerunRequested = true;
        const previous = this.info;
        if (projectionSignature(previous) !== projectionSignature(info)) {
          this.info = info;
          this.error = null;
          changed = true;
          this.onChange(info, { previous, initial: !previous, semanticChanged: true });
        } else {
          const recovered = !!this.error;
          this.error = null;
          if (recovered) this.onChange(info, { previous: info, initial: false, recovered: true, semanticChanged: false });
        }
      } catch (error) {
        if (this.closed || generation !== this.generation || selectionKey(this.selected()) !== key) continue;
        const next = { code: 'PLAN_READ_FAILED', message: String(error?.message ?? error).slice(0, 500) };
        if (JSON.stringify(next) !== JSON.stringify(this.error)) {
          this.error = next;
          this.onError(next);
        }
      } finally {
        this.pending = false;
      }
    } while (this.rerunRequested && !this.closed);
    return changed;
  }

  close() {
    this.watcher?.close(); this.watcher = null;
    this.closed = true;
    this.generation++;
    this.rerunRequested = false;
    this.info = null;
  }
}
