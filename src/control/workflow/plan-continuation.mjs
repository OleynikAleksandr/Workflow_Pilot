import {createHash} from 'node:crypto';
export const CONTINUE_TEXT = 'Продолжай';
export const CONTINUE_MESSAGE_BYTES = 4096;
const CUT = '… [обрезано]';
const clip = (value, limit) => { const text = String(value ?? '').replace(/\s+/g, ' ').trim(), characters = [...text];
  return characters.length > limit ? characters.slice(0, limit).join('') + CUT : text; };
const list = (items, limit, each) => { const rows = items.slice(0, limit).map(each);
  return items.length > limit ? [...rows, `… ещё ${items.length - limit} [обрезано]`] : rows; };
const bytes = text => new TextEncoder().encode(text).length;

// «Продолжай» plus the next task as Workflow Kit has it, so the agent starts without reading the plan through tools.
// The task comes from the plan check made for this very send; task documents are never attached.
export function continueMessage(task) {
  if (!task || typeof task.id !== 'string' || !task.id || typeof task.title !== 'string' || !task.title) return CONTINUE_TEXT;
  const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : [];
  const acceptance = strings(task.acceptance), files = strings(task.files), checks = strings(task.checks);
  const lines = [CONTINUE_TEXT, '',
    'Данные текущего плана Workflow Kit — следующая задача (это не новое поручение; фактическое состояние плана проверь сам):',
    `Задача: ${clip(task.id, 40)} — ${clip(task.title, 240)}`];
  if (typeof task.why === 'string' && task.why.trim()) lines.push(`Зачем: ${clip(task.why, 500)}`);
  if (acceptance.length) lines.push('Критерии приёмки:', ...list(acceptance, 10, item => '- ' + clip(item, 320)));
  if (files.length) lines.push('Файлы: ' + list(files, 24, item => clip(item, 160)).join(', '));
  if (checks.length) lines.push('Проверки: ' + list(checks, 12, item => clip(item, 60)).join(', '));
  let text = lines.join('\n');
  if (bytes(text) <= CONTINUE_MESSAGE_BYTES) return text;
  const tail = '\n… [данные задачи обрезаны; полный текст — в плане]';
  const budget = CONTINUE_MESSAGE_BYTES - bytes(tail);
  let size = 0, cut = '';
  for (const character of text) { size += bytes(character); if (size > budget) break; cut += character; }
  return cut + tail;
}
const key = p => p && JSON.stringify([p.workspace, p.sessionId, p.scopeId, p.chatUrl]);
const conversationKey = p => p && JSON.stringify([p.workspace, p.sessionId, p.chatUrl]);
const finished = p => p?.planView?.tasks?.length > 0 && p.planView.tasks.every(t => t.status === 'done');
// Keep recent task intents plus every unresolved legacy send. Trimming history
// must never turn an uncertain effect into permission to send again.
export const LEDGER_PER_CONVERSATION = 20, LEDGER_TOTAL = 400;
export function pruneLedger(entries) {
  const kept = [], perConversation = new Map();
  for (const [id, entry] of [...entries.entries()].reverse()) {
    if(entry.status==='sending'){kept.push([id,entry]);continue;}
    const count = (perConversation.get(entry.key) ?? 0) + 1;
    perConversation.set(entry.key, count);
    if (count <= LEDGER_PER_CONVERSATION && kept.length < LEDGER_TOTAL) kept.push([id, entry]);
  }
  return new Map(kept.reverse());
}

export class PlanContinuation {
  constructor({ selected, inspectPlan, send, onChange = () => {}, log = () => {},
    schedule = setTimeout, cancel = clearTimeout, settleMs = 500, stallMs = 180000,
    available = () => true, saveCheckpoint = async () => {}, onComplete = () => {},durableQueue=false }) {
    this.durableQueue=durableQueue;
    Object.assign(this, { onComplete, selected, inspectPlan, send, onChange, log, schedule, cancel, settleMs, stallMs, available, saveCheckpoint });
    this.page = null; this.run = null; this.epoch = 0; this.timer = null; this.watchdog = null;
    this.state = { phase: 'off', message: '', active: false, reason: null };
    this.continuations = 0; this.continuationOwner = null;
    this.enabled = false; this.checkpoints = new Map(); this.cycles = new Map(); this.cyclesDirty = false; this.closed = false;
    this.pending = null; this.rerunRequested = false; this.lastAvailability = false;
    this.selectionKey = key(this.selected()); this.manualWaiting = null;
  }
  view() { return { ...this.state, enabled: this.enabled,
    warning: this.run?.stallWarning ? 'STALL_WARNING' : null,
    continuations: this.continuationOwner === key(this.selected()) ? this.continuations : 0 }; }
  get checkpoint() { return [...this.checkpoints.values()].findLast(entry => entry.key === key(this.selected())) ?? null; }
  unknown() {
    const selected=this.selected();if(!selected?.chatUrl)return false;
    return [...this.checkpoints.values()].some(entry=>{
      if(entry.status!=='sending')return false;
      try{const [workspace,sessionId,,chatUrl]=JSON.parse(entry.key);
        return workspace===selected.workspace&&sessionId===selected.sessionId&&chatUrl===selected.chatUrl;
      }catch{return true;}
    });
  }
  checkpointState(entries = this.checkpoints) {
    return entries.size || this.cycles.size ? { version: 3, entries: [...entries.values()],
      cycles: [...this.cycles.values()] } : null;
  }
  async writeCheckpoint(owner, checkpoint, replacingTurnId = checkpoint?.turnId) {
    const next = new Map(this.checkpoints);
    next.delete(JSON.stringify([owner, replacingTurnId]));
    if (checkpoint) next.set(JSON.stringify([owner, checkpoint.turnId]), checkpoint);
    const pruned = pruneLedger(next);
    await this.saveCheckpoint(this.checkpointState(pruned));
    this.checkpoints = pruned;
  }
  restore(enabled, checkpoint = null) {
    this.epoch++; this.clearTimer(); this.clearWatchdog(); this.run = null; this.manualWaiting = null;
    this.closed = false; this.enabled = enabled === true; this.checkpoints = new Map(); this.cycles = new Map(); this.cyclesDirty = false;
    const entries = [2, 3].includes(checkpoint?.version) && Array.isArray(checkpoint.entries) ? checkpoint.entries : [checkpoint];
    for (const entry of entries) {
      if (entry && typeof entry.key === 'string' && typeof entry.turnId === 'string'
          && ['sending', 'sent','queuing','queued'].includes(entry.status))
        this.checkpoints.set(JSON.stringify([entry.key, entry.turnId]), { key: entry.key, turnId: entry.turnId, status: entry.status,
          ...(typeof entry.text==='string'?{text:entry.text}:{}),
          ...(Number.isSafeInteger(entry.generation) && entry.generation >= 0 ? { generation: entry.generation } : {}) });
    }
    for (const cycle of checkpoint?.version === 3 && Array.isArray(checkpoint.cycles) ? checkpoint.cycles : []) {
      if (typeof cycle.key === 'string' && Number.isSafeInteger(cycle.generation) && cycle.generation >= 0
          && typeof cycle.busy === 'boolean')
        this.cycles.set(cycle.key, { key: cycle.key, generation: cycle.generation, busy: cycle.busy, legacy: cycle.legacy === true });
    }
    this.set(this.enabled ? 'waiting' : 'off', this.enabled ? 'Выполнение плана запущено. Ждём разговор и план.' : '');
  }
  start() { this.closed = false; this.enabled = true; return this.reconcile(); }
  disable({manual=false}={}) {
    this.enabled = false; this.epoch++; this.clearTimer(); this.clearWatchdog(); this.run = null;
    this.set('off', manual?'Выполнение плана на паузе.':'Выполнение плана не запущено.',
      false,manual?'MANUAL_OFF':'AUTHORIZATION_OFF');
  }
  // Compatibility for explicit recovery; publish uses availabilityChanged instead.
  recover() { return this.reconcile(); }
  planChanged() { return this.reconcile(); }
  availabilityChanged() {
    const available = !!this.available();
    if (available === this.lastAvailability) return;
    this.lastAvailability = available;
    void this.reconcile();
  }
  set(phase, message, active = false, reason = null) {
    const next = { phase, message, active, reason };
    if (JSON.stringify(next) === JSON.stringify(this.state)) return;
    this.state = next;
    this.log('state', { phase, ...(reason ? { reason } : {}) }); this.onChange();
  }
  clearTimer() { if (this.timer !== null) this.cancel(this.timer); this.timer = null; }
  clearWatchdog() { if (this.watchdog !== null) this.cancel(this.watchdog); this.watchdog = null; }
  wait(reason, message) {
    this.clearWatchdog();
    if (this.run) this.run.stallWarning = false;
    this.set('waiting', message, false, reason);
  }
  pause(message = 'Выполнение плана приостановлено.', reason = 'MANUAL_OFF') {
    this.clearTimer(); this.clearWatchdog();
    this.set('paused', message, false, reason);
  }
  complete() {
    this.enabled = false;
    this.clearTimer(); this.clearWatchdog();
    if (this.run) this.run.stallWarning = false;
    this.set('complete', 'Все пункты плана выполнены. Продолжение не отправляется.', false, 'PLAN_COMPLETED');
    this.onComplete();
  }
  selectionChanged() {
    const selectedKey = key(this.selected());
    if (selectedKey === this.selectionKey) return;
    this.selectionKey = selectedKey; this.epoch++;
    this.clearTimer(); this.clearWatchdog(); this.run = null;
    if (this.manualWaiting?.key !== conversationKey(this.selected())) this.manualWaiting = null;
    void this.reconcile();
  }
  observe(event) {
    const previous=this.page;
    if(event.reset){this.page=null;this.epoch++;this.run=null;void this.reconcile();return;}
    this.page={...event.state,documentId:event.documentId??previous?.documentId};
    if(previous?.documentId===this.page.documentId
      &&(this.page.manualStopRevision??0)>(previous.manualStopRevision??0)){
      this.manualWaiting={key:conversationKey(this.selected()),stopped:true};
    }
    if(previous?.documentId===this.page.documentId
      &&(this.page.manualSendRevision??0)>(previous.manualSendRevision??0))this.manualWaiting=null;
    this.selectionChanged();void this.reconcile();
  }
  // One serialized event-driven pass. No interval and no scheduled Git reads.
  reconcile() {
    if (this.closed || !this.enabled) return Promise.resolve();
    this.rerunRequested = true;
    if (this.pending) return this.pending;
    const work = Promise.resolve().then(async () => {
      while (this.rerunRequested && this.enabled && !this.closed) {
        this.rerunRequested = false;
        await this.reconcileOnce();
      }
    });
    this.pending = work.finally(() => {
      this.pending = null;
      if (this.rerunRequested && this.enabled && !this.closed) void this.reconcile();
    });
    return this.pending;
  }
  async reconcileOnce() {
    this.selectionChanged();
    const selected=this.selected(),p=this.page,owner=key(selected),epoch=this.epoch;
    if(!selected?.chatUrl||selected.sessionArchivedAt||!p||p.url!==selected.chatUrl||!this.available())
      return this.wait('PAGE_NOT_READY','Ждём подключения разговора.');
    if(p.connectionError)return this.wait('CONNECTION_ERROR','Ждём восстановления связи с ChatGPT.');
    if(this.manualWaiting?.stopped)return this.pause('Отправка остановлена пользователем.','MANUAL_STOP');
    // Legacy DOM effects are never retried as a new SDK message.
    if(this.unknown())
      return this.pause('Исход прежней отправки неизвестен. Повтор не отправляется.','SEND_UNKNOWN');
    if(!selected.scopeId)return this.wait('PLAN_UNAVAILABLE','Ждём опубликованный план.');
    const current=()=>this.enabled&&!this.closed&&epoch===this.epoch&&key(this.selected())===owner
      &&this.page?.documentId===p.documentId&&this.page?.url===selected.chatUrl
      &&!this.page.connectionError&&!this.manualWaiting?.stopped&&this.available();
    let plan;
    try{plan=await this.inspectPlan(selected);}catch{return this.wait('PLAN_READ_ERROR','Не удалось прочитать план.');}
    if(!current())return;
    if(!plan.confirmed||plan.scopeId!==selected.scopeId)return this.wait('PLAN_CHANGED_OR_TRANSACTION','Ждём подтверждённое состояние плана.');
    if(finished(plan))return this.complete();
    if(plan.scopeStatus!=='ACTIVE'||!plan.nextTask?.id)return this.wait('PLAN_UNAVAILABLE','Нет следующего поручения.');
    const taskId=plan.nextTask.id,turnId='task:'+taskId,id=JSON.stringify([owner,turnId]);
    const old=this.checkpoints.get(id);
    if(old&&old.status!=='queuing')return this.set('running','Поручение передано в канал.',true);
    const checkpoint=old??{key:owner,turnId,status:'queuing',text:'Продолжи текущий план Workflow Kit.\nПолные данные следующей задачи: '+JSON.stringify(plan.nextTask)};
    const before=async()=>{
      const latest=await this.inspectPlan(selected);
      return current()&&latest.confirmed&&latest.scopeId===selected.scopeId
        &&latest.scopeStatus==='ACTIVE'&&latest.nextTask?.id===taskId&&!finished(latest);
    };
    try{
      await this.writeCheckpoint(owner,checkpoint);
      if(!current()||!await before())return;
      this.set('sending','Передаём поручение через SDK…',true);
      const result=await this.send(checkpoint.text,current,before,{
        key:'continue:'+createHash('sha256').update(JSON.stringify([owner,taskId])).digest('hex')});
      if(['queued','sent'].includes(result.state)){
        await this.writeCheckpoint(owner,{...checkpoint,status:'queued'});
        this.continuationOwner=owner;this.continuations++;
        if(current())this.set('running','Поручение сохранено для передачи через SDK.',true);
      }else if(result.state==='unknown'){
        await this.writeCheckpoint(owner,{...checkpoint,status:'sending'});
        if(current())this.pause('Исход отправки неизвестен. Повтор не отправляется.','SEND_UNKNOWN');
      }else if(current())this.wait('SEND_NOT_SENT','Поручение пока не передано.');
    }catch{
      // The same durable key resumes queue insertion; it never repeats an SDK effect.
      if(current())this.wait('SEND_ERROR','Не удалось подтвердить сохранение поручения.');
    }
  }
  dispose() {
    this.closed = true; this.epoch++; this.clearTimer(); this.clearWatchdog(); this.run = null;
    this.rerunRequested = false;
  }
}
