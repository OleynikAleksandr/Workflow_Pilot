import fs from 'node:fs';
import { atomic, check, json, readJSON, safePath, withLock } from './common.mjs';
import { localPath } from './git.mjs';
import { readPlan } from './plan.mjs';

// The session that received the user's first task owns planning until the plan is archived.
// Workflow Pilot writes the record; the shared MCP shell cannot tell sessions apart, so Kit
// compares the Session IDs an agent already passes to review:prepare and plan publication.
export const PLANNING_OWNER = '.harness/runtime/planning-owner.json';
const SESSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;
const file = root => safePath(root, PLANNING_OWNER);
const operation = (root, fn) => withLock(localPath(root, 'operation.lock'), fn);
function stored(root) {
  if (!fs.existsSync(file(root))) return null;
  const record = readJSON(file(root));
  check(record?.version === 1 && typeof record.session_id === 'string' && SESSION.test(record.session_id)
    && Number.isSafeInteger(record.generation), 'PLANNING_OWNER_STATE', 'Повреждена запись владельца планирования.');
  return record;
}
// A record written before an archive belongs to the closed plan, even if an older Kit kept the file.
export function readPlanningOwner(root) {
  const record = stored(root);
  if (!record) return null;
  return (readPlan(root).archived_scope_id ?? null) === (record.archived_scope_id ?? null) ? record : null;
}
// Compare-and-set: the first claim wins; a different session needs the user's explicit transfer.
export function claimPlanningOwner(root, { session_id, transfer = false } = {}) {
  check(typeof session_id === 'string' && SESSION.test(session_id), 'PLANNING_OWNER_SESSION', 'Нужен точный Session ID сессии.');
  return operation(root, () => {
    const current = readPlanningOwner(root);
    if (current?.session_id === session_id) return { ok: true, claimed: false, ...current };
    if (current && !transfer) return { ok: true, claimed: false, ...current };
    const plan = readPlan(root);
    const record = { version: 1, session_id, claimed_at: new Date().toISOString(), generation: (stored(root)?.generation ?? 0) + 1,
      scope_id: plan.execution_scope_status === 'NONE' ? null : plan.scope_id, plan_revision: plan.plan_revision,
      archived_scope_id: plan.archived_scope_id ?? null, ...(current ? { transferred_from: current.session_id } : {}) };
    atomic(file(root), json(record));
    return { ok: true, claimed: true, ...record };
  });
}
// The owner session was deleted or archived: only that session's record is removed.
export function releasePlanningOwner(root, { session_id } = {}) {
  return operation(root, () => {
    const current = stored(root);
    if (!current || current.session_id !== session_id) return { ok: true, released: false };
    fs.rmSync(file(root), { force: true });
    return { ok: true, released: true };
  });
}
// Call under Kit's operation lock (archive already holds it).
export function clearPlanningOwner(root) { fs.rmSync(file(root), { force: true }); }
export function assertPlanningOwner(root, sessionId, field) {
  const owner = readPlanningOwner(root);
  if (!owner) return;
  check(sessionId === owner.session_id, 'PLANNING_OWNED',
    'План проекта готовит другая сессия-оркестратор (' + owner.session_id + '). Эта сессия — обсуждение: не публикуйте план и не запускайте его Review. Передать роль может только пользователь в меню сессии «Назначить оркестратором».',
    { owner_session_id: owner.session_id, field, received: sessionId ?? null });
}
export function planningOwnerSummary(root) {
  const owner = readPlanningOwner(root);
  return owner ? 'ВЛАДЕЛЕЦ ПЛАНИРОВАНИЯ\nSession ID: ' + owner.session_id + ' (с ' + owner.claimed_at + '). Только эта сессия готовит и публикует план проекта до его архива; другие сессии — обсуждение. Передача — только пользователем через меню сессии.' : null;
}
