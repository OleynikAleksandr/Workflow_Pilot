import { watch, statSync } from 'node:fs';
import path from 'node:path';

const projectWatchInputs = ['.harness/plans/todo-plan.md', 'scripts/workflow.mjs',
  'scripts/workflow', 'scripts/workflow.cmd', '.harness/workflow.json', '.harness/kit-manifest.json',
  '.harness/runtime/plan-review/state.json'];

// Watch only named inputs and their directory ancestry, never a recursive Git tree.
// Directory identity matters: fs.watch can remain attached to an unlinked inode.
export class ProjectInputWatch {
  constructor({ workspace, onSignal, onError, watchDirectory = watch, stat = statSync,
    schedule = setTimeout, unschedule = clearTimeout, retryDelays = [25, 100] }) {
    Object.assign(this, { workspace, onSignal, onError, watchDirectory, stat, schedule, unschedule, retryDelays });
    this.paths = projectWatchInputs; this.watches = new Map(); this.closed = false;
    this.timer = null; this.retry = 0;
  }
  update(paths = []) {
    const next = [...new Set([...projectWatchInputs, ...paths])].sort();
    const changed = JSON.stringify(next) !== JSON.stringify(this.paths);
    this.paths = next;
    this.refresh();
    return changed;
  }
  signal() {
    if (this.closed) return;
    this.retry = 0;
    if (this.timer !== null) this.unschedule(this.timer);
    this.timer = this.schedule(() => {
      this.timer = null; this.refresh(); this.onSignal();
    }, 20);
  }
  refresh({ explicit = false } = {}) {
    if (this.closed) return;
    if (explicit) this.retry = 0;
    const directories = new Map();
    for (const relative of this.paths) {
      if (typeof relative !== 'string' || path.isAbsolute(relative)) continue;
      let child = path.resolve(this.workspace, relative);
      if (!child.startsWith(this.workspace + path.sep)) continue;
      // Explicit directory subscriptions observe entry creation/removal too.
      if(relative.endsWith('/'))directories.set(child,new Set(['*']));
      // Watch the relevant tree plus the workspace parent so a removed/replaced
      // workspace can be rearmed without observing unrelated ancestors.
      const root = path.resolve(this.workspace);
      const parent = path.dirname(root);
      for (let directory = path.dirname(child);;) {
        const inside = directory === root || directory.startsWith(root + path.sep);
        if (!inside && directory !== parent) break;
        if (!directories.has(directory)) directories.set(directory, new Set());
        directories.get(directory).add(path.basename(child));
        if (directory === parent) break;
        child = directory;
        directory = path.dirname(child);
      }
    }
    let failure = null;
    const wanted = new Set();
    for (const [directory, names] of directories) {
      try {
        const stat = this.stat(directory);
        if (!stat.isDirectory()) continue;
        wanted.add(directory);
        const identity = `${stat.dev}:${stat.ino}`;
        const old = this.watches.get(directory);
        if (old?.identity === identity) { old.names = names; continue; }
        if (old) { this.watches.delete(directory); old.handle.close(); }
        const record = { identity, names, handle: null };
        record.handle = this.watchDirectory(directory, { persistent: false }, (_event, filename) => {
          if (this.closed || this.watches.get(directory) !== record) return;
          if (filename == null || record.names.has('*') || record.names.has(String(filename)) || String(filename) === path.basename(directory)) this.signal();
        });
        this.watches.set(directory, record);
        record.handle.on('error', error => {
          if (this.closed || this.watches.get(directory) !== record) return;
          this.watches.delete(directory); record.handle.close();
          this.failed(error);
        });
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR'].includes(error.code)) failure = error;
      }
    }
    for (const [directory, record] of this.watches) {
      if (!wanted.has(directory)) { this.watches.delete(directory); record.handle.close(); }
    }
    if (failure) this.failed(failure);
    else this.onError(null);
  }
  failed(error) {
    this.onError({ code: 'PLAN_WATCH_FAILED', message: `Автообновление проекта недоступно (${error.code ?? 'WATCH_ERROR'}). Повторите проверку или вернитесь в окно проекта.` });
    if (this.timer !== null || this.retry >= this.retryDelays.length) return;
    this.timer = this.schedule(() => {
      this.timer = null; this.refresh(); this.onSignal();
    }, this.retryDelays[this.retry++]);
  }
  close() {
    this.closed = true;
    if (this.timer !== null) this.unschedule(this.timer);
    this.timer = null;
    for (const record of this.watches.values()) record.handle.close();
    this.watches.clear();
  }
}

// The primary checkout must observe confirmed child command receipts even when
// the child's ChatGPT page has finished or is not the visible tab. This uses
// the same event-driven, inode-rearming watcher as normal project inputs.
export class ChildCommandWatches {
  constructor({onSignal,onError=()=>{},createWatcher=options=>new ProjectInputWatch(options)}) {
    Object.assign(this,{onSignal,onError,createWatcher});
    this.children=new Map();
  }
  update(workspaces) {
    const wanted=new Set(workspaces.filter(workspace=>typeof workspace==='string'&&path.isAbsolute(workspace)));
    for(const [workspace,watcher] of this.children)if(!wanted.has(workspace)){
      watcher.close();this.children.delete(workspace);
    }
    for(const workspace of wanted)if(!this.children.has(workspace)){
      const watcher=this.createWatcher({workspace,onSignal:this.onSignal,onError:error=>{
        if(error)this.onError({...error,workspace});
      }});
      this.children.set(workspace,watcher);
      watcher.update(['.harness/runtime/command-activity/']);
    }
  }
  close(){for(const watcher of this.children.values())watcher.close();this.children.clear();}
}
