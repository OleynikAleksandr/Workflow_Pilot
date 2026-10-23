import { randomUUID } from 'node:crypto';
import { CHOICE_PRIORITY, choiceOptions, choiceView } from '../../contracts/user-choice.mjs';

const fail = (code, message) => Object.assign(new Error(message), { code });
const OPEN = ['offered', 'postponed'];
// Re-offered after the recipient's turn when its cause persists; one-time causes are not.
const PERSISTENT = new Set(['refused', 'review', 'acceptance']);
const HISTORY_LIMIT = 200;

const activePlan = status => ['ACTIVE', 'BLOCKED'].includes(status);
const sessionRole = session => ({ orchestrator: 'orchestrator', discussion: 'discussion', planning: 'planning', self: 'self' })[session?.role] ?? 'discussion';
const read = fn => { try { return fn(); } catch { return null; } };
// Causes of choice cards from facts the application already tracks; readers are injected.
export function collectChoiceFacts({ manual = new Map(), projects, project, execution, legacyOwner = () => null, review, mode, owner }) {
  const facts = [];
  for (const listed of projects) {
    if (listed.archivedAt || listed.parentWorkspace) continue;
    const info = project(listed.workspace); if (!info) continue;
    const workspace = listed.workspace, scope = info.scopeId, active = activePlan(info.scopeStatus);
    const sessions = listed.sessions.filter(s => !s.archivedAt && !s.external && !s.assignmentId);
    const live = id => !!id && sessions.some(s => s.sessionId === id);
    const planOwner = info.planExecution?.execution_origin_session_id ?? sessions.find(s => s.orchestratorScopeId === scope)?.sessionId ?? legacyOwner(workspace);
    const add = (session_id, kind, key, data = {}) => facts.push({ session_id, workspace, kind, key, data,
      role: sessionRole(sessions.find(s => s.sessionId === session_id)) });
    if (active && scope) {
      const view = execution(workspace, scope);
      if (view?.state === 'paused' && view.reason === 'refused' && live(planOwner))
        add(planOwner, 'refused', 'refused:' + scope + ':' + (view.message ?? ''), { message: view.message, task_id: /назначении (\S+?):/.exec(view.message ?? '')?.[1] ?? null });
      if (info.planView?.state === 'awaiting-acceptance' && live(planOwner)) add(planOwner, 'acceptance', 'acceptance:' + scope, { scope_id: scope });
    }
    const state = read(() => review(workspace));
    if (state?.stage === 'NEEDS_USER' && state.notification_handled && live(state.recipient_session_id))
      add(state.recipient_session_id, 'review', 'review:' + state.run_id + ':' + state.generation);
    if (active) continue;
    const request = read(() => mode(workspace)), planner = read(() => owner(workspace));
    if (request && !request.choice && live(request.session_id))
      add(request.session_id, 'mode', 'mode:' + request.generation, { recommended: request.recommended, reason: request.reason, generation: request.generation });
    // Another session wrote to its chat after planning was taken: offer to keep discussing or take over.
    if (planner && live(planner.session_id)) for (const session of sessions)
      if (session.sessionId !== planner.session_id && manual.get(session.sessionId) > Date.parse(planner.claimed_at))
        add(session.sessionId, 'second-session', 'second:' + planner.session_id + ':' + planner.generation);
  }
  return facts;
}

// The user's choice cards. Control derives causes from facts it already tracks (facts()),
// keeps one card per session, and turns a button press into an existing app action and/or
// an addressed message to the agent. Records survive a backend restart through snapshot().
export class UserChoices {
  constructor({ facts, act = async () => {}, deliver = async () => null, receipt = () => null, onChange = () => {},
    report = () => {}, now = () => Date.now(), id = randomUUID } = {}) {
    Object.assign(this, { facts, act, deliver, receipt, onChange, report, now, id });
    this.records = new Map(); this.keys = new Map(); this.manual = new Map(); this.pages = new Map(); this.history = [];
  }
  snapshot() {
    return structuredClone({ records: [...this.records.values()], keys: [...this.keys], manual: [...this.manual], history: this.history });
  }
  restore(saved = {}) {
    this.records = new Map((Array.isArray(saved.records) ? saved.records : []).filter(r => r?.session_id && r.choice_id).map(r => [r.session_id, r]));
    this.keys = new Map(Array.isArray(saved.keys) ? saved.keys.filter(e => Array.isArray(e) && e.length === 2) : []);
    this.manual = new Map(Array.isArray(saved.manual) ? saved.manual.filter(e => Array.isArray(e) && typeof e[0] === 'string' && Number.isFinite(e[1])) : []);
    this.history = Array.isArray(saved.history) ? saved.history.slice(-HISTORY_LIMIT) : [];
    this.pages.clear();
  }
  log(record, kind, text) {
    this.history.push({ at: new Date(this.now()).toISOString(), workspace: record.workspace, session_id: record.session_id, kind, text });
    if (this.history.length > HISTORY_LIMIT) this.history.splice(0, this.history.length - HISTORY_LIMIT);
  }
  // A cause may be offered when it was never shown, was superseded, or was declined and the
  // recipient finished the turn that answered the user's own message.
  eligible(fact) {
    const seen = this.keys.get(fact.session_id + '\n' + fact.key);
    if (!seen || seen.state === 'stale') return true;
    return seen.state === 'declined' && seen.turnEnded && PERSISTENT.has(fact.kind);
  }
  reconcile() {
    let facts;
    try { facts = this.facts({ manual: this.manual }) ?? []; } catch (error) { this.report(error); return false; }
    let changed = false;
    const best = new Map();
    // The most urgent cause that may still be shown; an answered cause lets the next one through.
    for (const fact of facts) {
      const open = this.records.get(fact.session_id);
      if (!(OPEN.includes(open?.state) && open.key === fact.key) && !this.eligible(fact)) continue;
      const current = best.get(fact.session_id);
      if (!current || CHOICE_PRIORITY[fact.kind] < CHOICE_PRIORITY[current.kind]) best.set(fact.session_id, fact);
    }
    for (const record of this.records.values()) {
      if (!OPEN.includes(record.state)) continue;
      const fact = best.get(record.session_id);
      if (fact?.key === record.key) continue;
      record.state = 'stale'; record.resolved_at = new Date(this.now()).toISOString();
      this.keys.set(record.session_id + '\n' + record.key, { state: 'stale' });
      this.log(record, 'warn', 'Выбор неактуален: ' + record.question); changed = true;
    }
    for (const fact of best.values()) {
      const current = this.records.get(fact.session_id);
      if (current && (OPEN.includes(current.state) || current.state === 'chosen')) continue;
      const { question, reason, options } = choiceOptions(fact.kind, fact.data);
      const record = { choice_id: this.id(), generation: 1, session_id: fact.session_id, workspace: fact.workspace, kind: fact.kind,
        key: fact.key, data: fact.data ?? {}, role: fact.role ?? null, question, reason: reason ?? null, options, state: 'offered',
        created_at: new Date(this.now()).toISOString() };
      this.records.set(fact.session_id, record);
      this.keys.set(fact.session_id + '\n' + fact.key, { state: 'offered' });
      this.log(record, 'ok', 'Предложен выбор: ' + question); changed = true;
    }
    if (changed) this.onChange();
    return changed;
  }
  find(sessionId, choiceId, generation) {
    const record = this.records.get(sessionId);
    if (!record || record.choice_id !== choiceId || record.generation !== Number(generation) || !OPEN.includes(record.state))
      throw fail('USER_CHOICE_CHANGED', 'Выбор устарел или уже сделан. Обновите панель.');
    return record;
  }
  async choose({ session_id, choice_id, option_id, generation, source }) {
    const record = this.find(session_id, choice_id, generation);
    const option = record.options.find(o => o.id === option_id);
    if (!option) throw fail('USER_CHOICE_OPTION', 'Неизвестный вариант выбора.');
    if (option.action === 'postpone') {
      record.state = 'postponed'; record.generation++;
      this.log(record, 'ok', 'Выбор отложен пользователем: ' + record.question); this.onChange();
      return choiceView(record);
    }
    // The decision is recorded before any effect: a repeated press can never act twice.
    Object.assign(record, { state: 'chosen', chosen_option: option.id, chosen_at: new Date(this.now()).toISOString(),
      source: source === 'window' ? 'window' : 'panel', generation: record.generation + 1 });
    this.keys.set(record.session_id + '\n' + record.key, { state: 'chosen' });
    this.log(record, 'ok', 'Выбор пользователя: ' + option.label); this.onChange();
    try {
      if (option.action && option.action !== 'dismiss') await this.act(record, option);
      if (option.message) record.message_id = (await this.deliver(record, option))?.message_id ?? null;
    } catch (error) {
      record.error = error.message;
      this.log(record, 'warn', 'Выбор не выполнен: ' + error.message); this.report(error);
    }
    // An app action without a message is complete at once; a failed one frees the card for the next cause.
    if (!record.message_id || record.error) record.state = 'done';
    this.onChange(); this.reconcile();
    return choiceView(record, this.delivery(record));
  }
  reopen({ session_id, choice_id, generation }) {
    const record = this.find(session_id, choice_id, generation);
    if (record.state !== 'postponed') throw fail('USER_CHOICE_CHANGED', 'Выбор не отложен.');
    record.state = 'offered'; record.generation++; this.onChange();
    return choiceView(record);
  }
  delivery(record) {
    if (!record?.message_id) return null;
    try { const receipt = this.receipt(record.message_id); return receipt?.read ? 'read' : receipt?.delivery ?? null; } catch { return null; }
  }
  // Page facts of one chat: a trusted manual send (its time is a fact for the second-session cause) declines the offered card; the end of a turn
  // allows a persistent cause to come back and retires a delivered choice.
  page(sessionId, event) {
    const state = event?.state;
    if (!sessionId || !state || event.reset) return;
    const previous = this.pages.get(sessionId), documentId = event.documentId ?? null;
    const manual = Number.isSafeInteger(state.manualSendRevision) ? state.manualSendRevision : 0, busy = !!state.busy;
    this.pages.set(sessionId, { documentId, manual, busy });
    let changed = false;
    if (previous && previous.documentId === documentId && manual > previous.manual) {
      this.manual.set(sessionId, this.now()); changed = true;
      const record = this.records.get(sessionId);
      if (record && OPEN.includes(record.state)) {
        record.state = 'declined'; record.resolved_at = new Date(this.now()).toISOString();
        this.keys.set(sessionId + '\n' + record.key, { state: 'declined', turnEnded: false });
        this.log(record, 'warn', 'Выбор отклонён: пользователь ответил сам'); changed = true;
      }
    }
    if (previous?.busy && !busy) {
      for (const [key, seen] of this.keys) if (key.startsWith(sessionId + '\n') && seen.state === 'declined' && !seen.turnEnded) {
        seen.turnEnded = true; changed = true;
      }
      const record = this.records.get(sessionId);
      if (record?.state === 'chosen' && (!record.message_id || this.delivery(record) === 'read')) { record.state = 'done'; changed = true; }
    }
    if (changed) { this.onChange(); this.reconcile(); }
  }
  view(sessionId) { const record = this.records.get(sessionId); return choiceView(record, this.delivery(record)); }
  pending(sessionId) { const record = this.records.get(sessionId); return !!record && (OPEN.includes(record.state) || record.state === 'chosen'); }
  workspaceHistory(workspace) { return this.history.filter(entry => entry.workspace === workspace); }
  forget(sessionId) {
    const removed = this.records.delete(sessionId);
    for (const key of [...this.keys.keys()]) if (key.startsWith(sessionId + '\n')) this.keys.delete(key);
    this.manual.delete(sessionId); this.pages.delete(sessionId);
    if (removed) this.onChange();
  }
}
