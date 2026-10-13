import { TUNNEL_ID_PATTERN } from './tunnel-setup.mjs';
import { createHash } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');
const keyPattern = /^sk-[A-Za-z0-9_-]{16,4093}$/;

// Main-process facade: only progress crosses the renderer boundary.
export class TunnelClipboard {
  #id = null; #last = null; #active = false; #generation = 0; #pending = false;
  constructor({ readText, configure, promptTunnelId, onChange = () => {}, schedule = setInterval, unschedule = clearInterval }) {
    Object.assign(this, { readText, configure, promptTunnelId, onChange, schedule, unschedule });
    this.timer = null; this.closed = false; this.conditions = { active: false };
    this.state = { step: 'tunnel', hasTunnelId: false, error: null };
  }
  snapshot() { return { ...this.state }; }
  observe(conditions) {
    if (this.closed) return;
    this.conditions = conditions;
    const allowed = conditions.active && conditions.ready !== false && !conditions.busy
      && !this.#pending && !['connecting', 'done'].includes(this.state.step);
    if (!allowed && this.timer !== null) { this.unschedule(this.timer); this.timer = null; }
    if (!conditions.active || conditions.ready === false) { if (this.#active) this.reset(); return; }
    if (allowed && this.timer === null) {
      this.timer = this.schedule(() => { void this.tick(this.conditions); }, 500);
      void this.tick(this.conditions);
    }
  }
  manualInput() { return this.#id ? { tunnelId: this.#id } : undefined; }
  async #rememberClipboard() {
    try { const value = await this.readText(); if (typeof value === 'string') this.#last = digest(value); }
    catch { /* Clipboard access is optional when using native input. */ }
  }
  async pasteTunnelId() {
    if (this.#pending || this.state.step !== 'tunnel') return;
    const generation = this.#generation;
    this.#pending = true; this.#active = true; this.publish({ error: null });
    try {
      const result = await this.promptTunnelId();
      if (generation !== this.#generation || result?.cancelled) return;
      if (typeof result?.tunnelId !== 'string' || !TUNNEL_ID_PATTERN.test(result.tunnelId)) {
        this.publish({ error: 'Вставьте полный ID туннеля, начинающийся с tunnel_, и подтвердите ввод ещё раз.' });
        return;
      }
      this.#id = result.tunnelId;
      this.publish({ step: 'key', hasTunnelId: true, error: null });
    } catch (error) {
      if (generation === this.#generation) this.publish({ error:
        ['MAC_TUNNEL_ID_INVALID', 'WINDOWS_TUNNEL_ID_INVALID'].includes(error?.code)
          ? 'Вставьте полный ID туннеля, начинающийся с tunnel_, и подтвердите ввод ещё раз.'
          : 'Не удалось открыть окно ввода ID туннеля. Повторите попытку.' });
    } finally {
      // Copy/paste inside a native dialog must not trigger another action on close/cancel.
      if (generation === this.#generation) await this.#rememberClipboard();
      this.#pending = false; if (this.conditions.active) this.observe(this.conditions);
    }
  }
  async configureManually(configure) {
    if (this.#pending) return;
    // Stop after collecting the ID so the user sees the API-key instructions first.
    if (!this.#id) { await this.pasteTunnelId(); return; }
    const generation = this.#generation;
    this.#pending = true;
    try { return await configure({ tunnelId: this.#id }); }
    finally {
      if (generation === this.#generation) await this.#rememberClipboard();
      this.#pending = false; if (this.conditions.active) this.observe(this.conditions);
    }
  }
  publish(patch) {
    Object.assign(this.state, patch);
    // Only an observed lifecycle owns a timer; direct/manual calls stay usable.
    if (this.conditions.active) this.observe(this.conditions);
    this.onChange(this.snapshot());
  }
  reset() {
    this.#generation++; this.#id = null; this.#last = null; this.#active = false;
    if (this.state.step !== 'tunnel' || this.state.error || this.state.hasTunnelId)
      this.publish({ step: 'tunnel', hasTunnelId: false, error: null });
  }
  async tick({ active, ready = true, busy = false }) {
    if (this.closed) return;
    if (!active) { if (this.#active) this.reset(); return; }
    if (busy || this.#pending) return;
    if (!ready) { if (this.#active) this.reset(); return; }
    let value;
    try {
      const reading = this.readText();
      value = reading && typeof reading.then === 'function' ? await reading : reading;
    } catch { return; }
    if (typeof value !== 'string') return;
    // Establish a baseline without accepting stale credentials from another task.
    if (!this.#active) { this.#active = true; this.#last = digest(value); return; }
    if (value.length > 8192) { this.#last = digest(value); return; }
    const changed = digest(value);
    if (changed === this.#last) return;
    this.#last = changed; value = value.trim();
    if (TUNNEL_ID_PATTERN.test(value)) {
      this.#id = value;
      this.publish({ step: 'key', hasTunnelId: true, error: null }); return;
    }
    if (!this.#id || !keyPattern.test(value)) return;
    const generation = this.#generation;
    const credentials = { tunnelId: this.#id, key: value }; value = '';
    this.#pending = true; this.publish({ step: 'connecting', error: null });
    try {
      await this.configure(credentials);
      if (generation === this.#generation) {
        this.#id = null; this.publish({ step: 'done', hasTunnelId: false, error: null });
      }
    } catch {
      if (generation === this.#generation) this.publish({ step: 'key',
        error: 'Подключение не подтверждено. Проверьте данные и права ключа. Скопируйте исправленный ключ или воспользуйтесь ручным вводом.' });
    } finally { credentials.key = ''; this.#pending = false; if (this.conditions.active) this.observe(this.conditions); }
  }
  dispose() {
    this.closed = true;
    if (this.timer !== null) this.unschedule(this.timer);
    this.timer = null; this.reset();
  }
}
