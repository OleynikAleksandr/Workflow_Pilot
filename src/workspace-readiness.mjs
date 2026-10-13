import { fail } from './common.mjs';
const copy = value => structuredClone(value);

// One active inspection. Visible navigation keeps only its latest queued choice;
// addressed background deliveries retain their own queued inspections.
export class WorkspaceReadiness {
  constructor({ fingerprint, inspect, maxEntries = 4 }) {
    Object.assign(this, { fingerprint, inspect, maxEntries });
    this.cache = new Map(); this.active = null; this.pending = null; this.retained=[];
  }
  check(workspace,{retain=false}={}) {
    for (const job of [this.active, this.pending,...this.retained]) {
      if (job?.workspace === workspace && !job.invalidated) {job.retain ||= retain;return job.promise.then(copy);}
    }
    const job = { workspace, invalidated: false,retain };
    job.promise = new Promise((resolve, reject) => Object.assign(job, { resolve, reject }));
    if (this.active) {
      if(retain)this.retained.push(job);
      else {
        if(this.pending?.retain)this.retained.push(this.pending);
        else this.pending?.reject(fail('READINESS_SUPERSEDED', 'Выбран другой проект.'));
        this.pending = job;
      }
    } else { this.active = job; void this.run(job); }
    return job.promise.then(copy);
  }
  clear(workspace = null) {
    if (workspace) this.cache.delete(workspace); else this.cache.clear();
    if (this.active && (!workspace || this.active.workspace === workspace)) this.active.invalidated = true;
    if (this.pending && (!workspace || this.pending.workspace === workspace)) {
      this.pending.reject(fail('READINESS_CHANGED', 'Проверка проекта отменена.'));
      this.pending = null;
    }
    this.retained=this.retained.filter(job=>{
      if(workspace&&job.workspace!==workspace)return true;
      job.reject(fail('READINESS_CHANGED','Проверка проекта отменена.'));return false;
    });
  }
  assertCurrent(job) {
    if (job.invalidated) throw fail('READINESS_CHANGED', 'Состояние проекта изменилось. Повторите проверку.');
  }
  async run(job) {
    const workspace = job.workspace;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        this.assertCurrent(job);
        const before = await this.fingerprint(workspace);
        this.assertCurrent(job);
        if (before.transaction) throw fail('READINESS_BUSY', 'Ожидается завершение транзакции проекта. Повторите проверку.');
        const cached = this.cache.get(workspace);
        if (cached?.key === before.key) {
          this.cache.delete(workspace); this.cache.set(workspace, cached);
          job.resolve(cached.result); return;
        }
        this.cache.delete(workspace);
        let result;
        try {result=await this.inspect(workspace);}
        catch(error){if(error.code==='CONCURRENT_CHANGE'&&attempt===0)continue;throw error;}
        const after = await this.fingerprint(workspace);
        this.assertCurrent(job);
        if (before.key !== after.key || after.transaction || (result.inputKey && result.inputKey !== after.key)) continue;
        if (result.ready) {
          this.cache.set(workspace, { key: after.key, result: copy(result) });
          while (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value);
        }
        job.resolve(result); return;
      }
      throw fail('READINESS_CHANGED', 'Проект меняется во время проверки. Повторите проверку.');
    } catch (error) { this.cache.delete(workspace); job.reject(error); }
    finally {
      this.active = this.pending??this.retained.shift()??null; this.pending = null;
      if (this.active) void this.run(this.active);
    }
  }
}
