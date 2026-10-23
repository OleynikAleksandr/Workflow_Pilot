import { claimPlanningOwner, releasePlanningOwner } from '@webpilot/workflow-kit/lib/planning-owner';
import { safePath } from '@webpilot/workflow-kit/lib/common';
import { desktopFiles as fs } from '../../execution/facade.mjs';

const activeScope = status => ['ACTIVE', 'BLOCKED'].includes(status);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// With Kit 1.9.7 the first orchestrator candidate that receives a task from the user owns planning;
// Kit 1.9.8 claims the owner itself when a session requests the execution mode. Kit keeps the record.
export class PlanningOwners {
  constructor({ store, onChange = () => {}, report = () => {}, claim = claimPlanningOwner, release = releasePlanningOwner,
    supports = workspace => fs.existsSync(safePath(workspace, '.harness/kit/lib/planning-owner.mjs')),
    requests = workspace => fs.existsSync(safePath(workspace, '.harness/kit/lib/execution-mode.mjs')),
    wait = pause, retryMs = 250, attempts = 40 }) {
    Object.assign(this, { store, onChange, report, claim, release, supports, requests, wait, retryMs, attempts });
    this.pending = new Set();
  }
  // A trusted manual send (never an automation message) in a candidate chat whose startup was
  // delivered is the user's first task. Kit compare-and-set keeps the first owner.
  observe(record, event) {
    if (event?.reset || !(event?.state?.manualSendRevision > 0) || record?.disposed) return;
    const identity = record?.identity;
    if (!identity?.workspace || identity.assignmentId || this.requests(identity.workspace)) return;
    const session = this.store.project(identity.workspace, identity.sessionId ?? record.project?.()?.sessionId);
    if (!session || session.parentWorkspace || session.external || session.archivedAt || session.sessionArchivedAt) return;
    if (activeScope(session.scopeStatus) || session.planningOwnerSessionId) return;
    if (session.role !== 'orchestrator' || session.orchestratorScopeId || session.closedPlanCommit) return;
    if (!['sent', 'acknowledged'].includes(session.attempt?.state)) return;
    void this.assign(identity.workspace, session.sessionId).catch(this.report);
  }
  // transfer=true is only the user's explicit choice in the session menu.
  async assign(workspace, sessionId, { transfer = false } = {}) {
    const key = workspace + '\n' + sessionId;
    if (this.pending.has(key)) return null;
    // A project on an older installed Kit has no owner record; its plan still binds by publication.
    if (!this.supports(workspace)) {
      if (transfer) throw Object.assign(new Error('Обновите Workflow Kit проекта, чтобы назначить оркестратора до публикации плана.'), { code: 'KIT_UPGRADE_REQUIRED' });
      return null;
    }
    this.pending.add(key);
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = this.claim(workspace, { session_id: sessionId, transfer });
          await this.store.reconcileRoles(workspace);
          this.onChange();
          return result;
        } catch (error) {
          // Kit's lock never waits: an agent command in progress is retried, not reported.
          if (error.code !== 'WORKFLOW_LOCKED' || attempt >= this.attempts) throw error;
          await this.wait(this.retryMs);
        }
      }
    } finally { this.pending.delete(key); }
  }
  // An archived or deleted owner session frees planning; another session's record stays.
  async forget(workspace, sessionId) {
    if (!this.supports(workspace)) return;
    for (let attempt = 0; ; attempt++) {
      try {
        const result = this.release(workspace, { session_id: sessionId });
        if (result.released) { await this.store.reconcileRoles(workspace); this.onChange(); }
        return;
      } catch (error) {
        if (error.code !== 'WORKFLOW_LOCKED' || attempt >= this.attempts) throw error;
        await this.wait(this.retryMs);
      }
    }
  }
}
