// The single run/pause control of an orchestrated plan. It belongs to a project and its plan,
// lives in the backend and survives restarts; publication alone never starts execution.
export const EXECUTION_STATES = Object.freeze(['not-started', 'running', 'pausing', 'paused', 'complete']);
export const PAUSE_REASONS = Object.freeze(['manual', 'escalation', 'unknown', 'restart', 'refused', 'blocked']);
const fail = (code, message) => Object.assign(new Error(message), { code });
const absolute = workspace => typeof workspace === 'string' && (workspace.startsWith('/') || /^[A-Za-z]:[\\/]/.test(workspace));
const validScope = scopeId => typeof scopeId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(scopeId);

export class ExecutionControl {
  constructor({ saved = {}, identity = null, now = Date.now, onChange = () => {} } = {}) {
    Object.assign(this, { identity, now, onChange });
    this.book = {};
    for (const [workspace, entry] of Object.entries(saved ?? {})) {
      if (!absolute(workspace) || !entry || !validScope(entry.scopeId) || !EXECUTION_STATES.includes(entry.state)) continue;
      if (entry.reason != null && !PAUSE_REASONS.includes(entry.reason)) continue;
      this.book[workspace] = { projectId: typeof entry.projectId === 'string' ? entry.projectId : null, scopeId: entry.scopeId,
        route:'plugin-v1',
        state: entry.route!=='plugin-v1'&&['running','pausing'].includes(entry.state)?'paused':entry.state,
        reason:entry.route!=='plugin-v1'&&['running','pausing'].includes(entry.state)?'restart':entry.reason??null,
        message:entry.route!=='plugin-v1'&&['running','pausing'].includes(entry.state)?'Канал обновлён. Нажмите «Продолжить».':typeof entry.message==='string'?entry.message.slice(0,1000):null,
        updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0,
        ...(entry.issue?.code&&typeof entry.issue.message==='string'?{issue:structuredClone(entry.issue)}:{}) };
    }
  }
  snapshot() { return structuredClone(this.book); }
  revokeAfterRestart(){for(const entry of Object.values(this.book))if(entry.route==='plugin-v1'&&['running','pausing'].includes(entry.state)){
    entry.state='paused';
    if(!['manual','blocked'].includes(entry.reason)){entry.reason='restart';entry.message='Служба перезапущена. Нажмите «Продолжить план».';}
  }}
  route(workspace,scopeId){return this.entry(workspace,scopeId)?.route??null;}
  selectRoute(workspace,scopeId,route) {
    if(route!=='plugin-v1')throw fail('PLAN_EXECUTION_INVALID','Неизвестный маршрут выполнения.');
    if(this.entry(workspace,scopeId))return this.route(workspace,scopeId);
    this.write(workspace,scopeId,'not-started',null,null,route,false);
    return route;
  }
  // A replaced project or another plan never inherits the state of the old one.
  entry(workspace, scopeId) {
    const entry = this.book[workspace];
    if (!entry || entry.scopeId !== scopeId) return null;
    const projectId = this.identity?.(workspace);
    if (this.identity && entry.projectId && entry.projectId !== projectId) return null;
    return entry;
  }
  view(workspace, scopeId) {
    const entry = this.entry(workspace, scopeId);
    return { state: entry?.state ?? 'not-started', reason: entry?.reason ?? null, message: entry?.message ?? null,
      ...(entry?.issue?{issue:structuredClone(entry.issue)}:{}) };
  }
  enabled(workspace, scopeId) { return this.view(workspace, scopeId).state === 'running'; }
  // Executors keep their normal continuations during pausing; only new tasks wait.
  issuing(workspace, scopeId) { return this.enabled(workspace, scopeId); }
  write(workspace, scopeId, state, reason = null, message = null, route = 'plugin-v1', notify = true, issue = null) {
    if (!absolute(workspace) || !validScope(scopeId)) throw fail('PLAN_EXECUTION_INVALID', 'Нужен проект и опубликованный план.');
    const old = this.entry(workspace, scopeId);
    if (old && old.state === state && old.reason === reason && old.message === message&&JSON.stringify(old.issue??null)===JSON.stringify(issue)) return old;
    this.book[workspace] = { projectId: this.identity?.(workspace) ?? null, scopeId, route:old?.route??route,state, reason, message, updatedAt: this.now(),
      ...(issue?{issue:structuredClone(issue)}:{}) };
    if(notify)this.onChange(workspace);
    return this.book[workspace];
  }
  // The one button: start, pause before the next task, continue.
  toggle(workspace, scopeId) {
    const { state } = this.view(workspace, scopeId);
    if (state === 'complete') throw fail('PLAN_COMPLETE', 'План уже выполнен.');
    if (state === 'pausing') throw fail('PLAN_PAUSING', 'Пауза уже запрошена: дождитесь завершения текущих задач.');
    if (state === 'running') this.write(workspace, scopeId, 'pausing', 'manual');
    else this.write(workspace, scopeId, 'running');
    return this.view(workspace, scopeId);
  }
  // Escalation by the orchestrator or an unknown outcome pauses execution with its reason.
  pause(workspace, scopeId, reason, message = null) {
    if (!PAUSE_REASONS.includes(reason)) throw fail('PLAN_EXECUTION_INVALID', 'Неизвестная причина паузы.');
    const { state } = this.view(workspace, scopeId);
    if (state === 'complete' || state === 'not-started') return this.view(workspace, scopeId);
    this.write(workspace, scopeId, state === 'paused' ? 'paused' : 'pausing', reason, message);
    return this.view(workspace, scopeId);
  }
  block(workspace,scopeId,issue,{busy=false,resuming=false}={}) {
    const current=this.view(workspace,scopeId);
    if(current.state==='complete'||['paused','pausing'].includes(current.state)
      &&(current.reason==='unknown'||current.reason==='manual'&&!resuming))return current;
    this.write(workspace,scopeId,busy?'pausing':'paused','blocked',String(issue.message).slice(0,1000),'plugin-v1',true,issue);
    return this.view(workspace,scopeId);
  }
  // Called by the scheduler: a requested pause takes effect once no executor is working.
  settle(workspace, scopeId, { busy }) {
    const entry = this.entry(workspace, scopeId);
    if (entry?.state === 'pausing' && !busy) this.write(workspace, scopeId, 'paused', entry.reason, entry.message,entry.route,true,entry.issue??null);
    return this.view(workspace, scopeId);
  }
  // Archiving a project stops its plan at once: no waiting for executors, nothing new is sent.
  stop(workspace, scopeId) {
    const { state } = this.view(workspace, scopeId);
    if (['running', 'pausing', 'paused'].includes(state)) this.write(workspace, scopeId, 'paused', 'manual');
    return this.view(workspace, scopeId);
  }
  complete(workspace, scopeId) { this.write(workspace, scopeId, 'complete'); return this.view(workspace, scopeId); }
  forget(workspaces) {
    let changed = false;
    for (const workspace of workspaces) if (this.book[workspace]) { delete this.book[workspace]; changed = true; }
    return changed;
  }
}
