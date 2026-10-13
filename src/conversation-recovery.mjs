import { normalizeChatUrl } from './workspace-session.mjs';
// Reopen a known conversation once. Never sends a message or retries generation.
const keyOf = p => p ? JSON.stringify([p.workspace, p.sessionId, p.chatUrl]) : '';
const known = p => p?.chatUrl && normalizeChatUrl(p.chatUrl) === p.chatUrl
  && (p.manualStart || ['sent', 'acknowledged'].includes(p.attempt?.state));
export class ConversationRecovery {
  constructor({ selected, inspect, reopen, available = () => true, onChange = () => {},
    schedule = setTimeout, cancel = clearTimeout, delayMs = 3000, now = Date.now, checkpoint=null, save=async()=>{} }) {
    Object.assign(this, { selected, inspect, reopen, available, onChange, schedule, cancel, delayMs, now, save });
    this.used = new Set(); this.cooldowns = new Map(); this.stopped = new Map(); this.epoch = 0; this.timer = null;
    this.state = { phase: 'idle', message: '', canRetry: false };
    const key=keyOf(selected());
    if(checkpoint?.key===key) {
      if(checkpoint.used)this.used.add(key);
      if(Number.isFinite(checkpoint.cooldownUntil))this.cooldowns.set(key,checkpoint.cooldownUntil);
      if(Number.isFinite(checkpoint.stoppedAt))this.stopped.set(key,checkpoint.stoppedAt);
    }
  }
  persist() {
    const key=keyOf(this.selected());
    return this.save({key,used:this.used.has(key),cooldownUntil:this.cooldowns.get(key)??null,stoppedAt:this.stopped.get(key)??null});
  }
  remember() {void this.persist().catch(()=>this.set('blocked','Не удалось сохранить состояние восстановления. Проверьте хранилище сессии.',true));}
  view() { return { ...this.state }; }
  set(phase, message, canRetry = false) {
    this.state = { phase, message, canRetry }; this.onChange(this.view());
  }
  reset() {
    this.epoch++; this.cancel(this.timer); this.timer = null; this.key = null;
    this.set('idle', '');
  }
  manualStop(page) {
    const key = keyOf(this.selected());
    this.stopped.set(key, page?.userMessageCount ?? 0);
    this.remember();
    while (this.stopped.size > 32) this.stopped.delete(this.stopped.keys().next().value);
    this.reset();
  }
  async requestRetry() {
    this.key = keyOf(this.selected());
    this.stopped.delete(this.key);
    await this.persist();
    return this.retry();
  }
  observe(page) {
    const stopKey = keyOf(this.selected());
    if (this.stopped.has(stopKey)) {
      if ((page?.userMessageCount ?? 0) <= this.stopped.get(stopKey)) return;
      this.stopped.delete(stopKey);
      this.remember();
    }
    if (!page || this.state.phase === 'reopening') return;
    if (!page.connectionError) {
      if (this.key && page.url === this.selected()?.chatUrl) this.reset();
      return;
    }
    const project = this.selected(), key = keyOf(project);
    if (this.key === key && this.state.phase !== 'idle') return;
    this.reset(); this.key = key;
    if (!known(project) || page.url !== project.chatUrl) {
      this.set('blocked', 'На странице ChatGPT обнаружена ошибка соединения. Адрес чата ещё не подтверждён: проверьте сообщение справа.');
      return;
    }
    if ((this.cooldowns.get(key) ?? 0) > this.now()) { this.cooldown(); return; }
    if (this.used.has(key)) {
      this.set('failed', 'На странице ChatGPT снова обнаружена ошибка соединения. Можно перезагрузить текущую страницу чата.', true); return;
    }
    this.set('waiting', 'На странице ChatGPT обнаружена ошибка соединения. Проверим возможность безопасной перезагрузки текущей страницы…');
    this.timer = this.schedule(() => { this.timer = null; void this.retry(); }, this.delayMs);
    this.timer?.unref?.();
  }
  rateLimited(conversationId, retryAfter = 60) {
    const p = this.selected();
    if (!p?.chatUrl || new URL(p.chatUrl).pathname.split('/').at(-1) !== conversationId) return;
    const key = keyOf(p);
    this.cooldowns.set(key, this.now() + Math.max(60000, Math.min(300000, retryAfter * 1000)));
    this.remember();
    if (this.key === key) this.cooldown();
  }
  cooldown() {
    this.cancel(this.timer); this.timer = null; this.epoch++;
    this.set('cooldown', 'ChatGPT временно ограничил запросы. Подождите; перезагрузка страницы станет доступна после паузы.');
    const epoch = this.epoch, delay = Math.max(0, (this.cooldowns.get(this.key) ?? this.now()) - this.now());
    this.timer = this.schedule(() => {
      if (epoch !== this.epoch) return;
      this.timer = null;
      this.set('failed', 'Пауза после ограничения запросов завершена. Можно перезагрузить текущую страницу чата.', true);
    }, delay);
    this.timer?.unref?.();
  }
  async retry() {
    if (this.state.phase === 'reopening' || this.state.phase === 'cooldown') return false;
    this.cancel(this.timer); this.timer = null;
    const project = this.selected(), key = keyOf(project), epoch = this.epoch;
    if (key !== this.key) return false;
    if (!known(project) || !this.available()) {
      this.set('blocked', 'Отправка ещё не подтверждена или выполняется другая операция. Перезагрузка отложена: проверьте состояние страницы.', true); return false;
    }
    if ((this.cooldowns.get(key) ?? 0) > this.now()) { this.cooldown(); return false; }
    this.set('reopening', 'Проверяем страницу перед безопасной перезагрузкой…');
    const current = () => epoch === this.epoch && key === keyOf(this.selected()) ;
    try {
      const page = await this.inspect();
      if (!current()) return false;
      if (page.url !== project.chatUrl || page.login || !page.editorAvailable || page.draftLength
          || !known(this.selected()) || !this.available()) {
        this.set('blocked', page.draftLength
          ? 'В поле ввода есть черновик. Сохраните его перед перезагрузкой страницы.'
          : 'Состояние чата пока не подтверждено. Проверьте страницу перед перезагрузкой.', true);
        return false;
      }
      this.used.add(key);
      await this.persist();
      if(!current())return false;
      const restored = await this.reopen(project, current);
      if (!current()) return false;
      this.set(restored ? 'restored' : 'failed', restored
        ? 'Текущая страница чата перезагружена. Проверьте продолжение ответа в ChatGPT.'
        : 'Не удалось восстановить страницу чата. Можно повторить перезагрузку.', !restored);
      return restored;
    } catch {
      if (current()) this.set('failed', 'Не удалось перезагрузить страницу чата. Проверьте соединение и повторите попытку.', true);
      return false;
    }
  }
}
