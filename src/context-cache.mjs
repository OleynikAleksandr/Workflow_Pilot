import { validateContextPacket } from './mcp-runtime.mjs';

export class ContextCache {
  constructor({ load, inputKey, limit = 4, onChange = () => {} }) {
    if (typeof inputKey !== 'function') throw new TypeError('ContextCache requires the readiness input key');
    Object.assign(this, { loadPacket: load, inputKey, limit, onChange });
    this.entries = new Map(); this.pending = new Map(); this.warming = new Map(); this.building = new Set(); this.epoch = 0;
  }
  clear() { this.epoch++; this.entries.clear(); }
  isBuilding(workspace) { return this.building.has(workspace); }
  async load(workspace) {
    if (this.pending.has(workspace)) {
      const pendingResult = await this.pending.get(workspace);
      const packet = await this.load(workspace);
      if (!pendingResult.preparation.cacheHit) packet.preparation.cacheHit = false;
      return packet;
    }
    const promise = this.prepare(workspace);
    this.pending.set(workspace, promise);
    try { return await promise; } finally { this.pending.delete(workspace); }
  }
  async build(workspace) {
    this.building.add(workspace); this.onChange();
    try { return await this.loadPacket(workspace); }
    finally { this.building.delete(workspace); this.onChange(); }
  }
  async prepare(workspace) {
    const started = performance.now(), epoch = this.epoch;
    for (let attempt = 0; attempt < 2; attempt++) {
      let key;
      try { key = await this.inputKey(workspace); }
      catch (error) {
        this.entries.delete(workspace);
        throw Object.assign(new Error('Не удалось подтвердить актуальность проекта. Повторите проверку перед отправкой контекста.', { cause: error }),
          { code: 'CONTEXT_INPUTS_UNAVAILABLE' });
      }
      const cached = this.entries.get(workspace);
      if (cached?.key === key) {
        this.entries.delete(workspace); this.entries.set(workspace, cached);
        return { ...structuredClone(cached.packet), preparation: { cacheHit: true, inputKey: key, ms: performance.now() - started } };
      }
      this.entries.delete(workspace);
      const packet = validateContextPacket(await this.build(workspace), workspace);
      let after;
      try { after = await this.inputKey(workspace); } catch { after = null; }
      if (key !== after || epoch !== this.epoch) continue;
      this.entries.set(workspace, { key, packet: structuredClone(packet) });
      while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value);
      return { ...packet, preparation: { cacheHit: false, inputKey: key, ms: performance.now() - started } };
    }
    throw Object.assign(new Error('Проект менялся при подготовке контекста. Повторите после завершения изменений.'), { code: 'CONTEXT_CHANGED' });
  }
  async isCurrent(workspace, key) {
    if (!key) return false;
    try { return await this.inputKey(workspace) === key; } catch { return false; }
  }
  warm(workspace) {
    if (this.warming.has(workspace)) return this.warming.get(workspace);
    // Callers schedule warm on events. Concurrent requests share completion,
    // including failures; a later explicit event can retry immediately.
    const operation = (this.pending.get(workspace) ?? this.load(workspace))
      .then(() => ({ ok: true }), error => ({ ok: false, error }))
      .finally(() => this.warming.delete(workspace));
    this.warming.set(workspace, operation);
    return operation;
  }
}
