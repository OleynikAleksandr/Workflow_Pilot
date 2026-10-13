import fs from 'node:fs';
import path from 'node:path';
import { PLAN, check, safePath, textFile, withPlanFile, atomic, hash } from './common.mjs';
import { parsePlan, renderPlan } from './plan.mjs';
import { git, head } from './git.mjs';

// Legacy locations are retained only for upgrade/history compatibility.
// They are never part of normal runtime plan selection.
export const PLANS_DIRECTORY = '.harness/plans/by-id';
export const SESSION_PLANS_DIRECTORY = '.harness/plans/by-session';
export const PLAN_DIRECTORIES = [PLANS_DIRECTORY, SESSION_PLANS_DIRECTORY];
export const LEGACY_ARCHIVE_DIRECTORY = '.harness/plans/archive/legacy-session-plans';

export const validIdentity = (value, label = 'ID') => {
  check(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(value), 'PLAN_ID', 'Некорректный ' + label);
  return value;
};

// Kept for legacy tooling that needs to identify the old path layout.
export const ownedPlanPath = planId => PLANS_DIRECTORY + '/' + validIdentity(planId, 'planId') + '.md';

function currentPlan(root, { projection = true } = {}) {
  const file = safePath(root, PLAN);
  check(fs.existsSync(file), 'MISSING_FILE', 'Отсутствует навигационный план проекта.');
  return { file: PLAN, plan: parsePlan(textFile(root, PLAN), { projection }) };
}

function scanLegacyPlans(root) {
  const records = [];
  for (const directory of PLAN_DIRECTORIES) {
    const absolute = safePath(root, directory);
    if (!fs.existsSync(absolute)) continue;
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      check(!entry.isSymbolicLink(), 'SYMLINK_PATH', 'Legacy plans не могут быть символическими ссылками.');
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const source = directory + '/' + entry.name;
      const raw = textFile(root, source);
      const digest = hash(raw);
      let plan = null; let parseError = null;
      try { plan = parsePlan(raw, { projection: false }); }
      catch (error) { parseError = { code: error.code ?? 'PLAN_PARSE', message: error.message }; }
      records.push({ source, raw, digest, bytes: Buffer.byteLength(raw, 'utf8'), plan, parseError });
    }
  }
  return records;
}

const publicLegacyRecord = record => ({
  path: record.source,
  digest: record.digest,
  bytes: record.bytes,
  scope_id: record.plan?.scope_id ?? null,
  owner_session_id: record.plan?.owner_session_id ?? null,
  prepared_in_session_id: record.plan?.prepared_in_session_id ?? null,
  execution_scope_status: record.plan?.execution_scope_status ?? null,
  delivery_status: record.plan?.delivery_status ?? null,
  current_task_id: record.plan?.current_task_id ?? null,
  parse_error: record.parseError,
});

export function discoverLegacyPlans(root) {
  // A valid current todo-plan is a hard precondition. Never guess a winner.
  currentPlan(root);
  return scanLegacyPlans(root).map(publicLegacyRecord);
}

export function preflightPlanMigration(root) {
  currentPlan(root);
  const selected = new Set(scanLegacyPlans(root).map(record => record.source));
  const archive = '.harness/plans/archive';
  const visit = relative => {
    const absolute = safePath(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    check(!stat.isSymbolicLink(), 'SYMLINK_PATH', 'Миграция не удаляет символические ссылки: ' + relative);
    if (stat.isDirectory()) for (const name of fs.readdirSync(absolute)) visit(relative + '/' + name);
    else { check(stat.isFile(), 'LEGACY_PLAN_CHANGED', 'Необычный файл: ' + relative); selected.add(relative); }
  };
  visit(archive);
  // Include tracked deletions as well: migration must not consume someone's staged edits.
  for (const file of git(root, ['ls-files', '-z', '--', archive, ...PLAN_DIRECTORIES]).stdout.split('\0').filter(Boolean)) {
    if (file.startsWith(archive + '/') || file.endsWith('.md')) selected.add(file);
  }
  const sourceCommit = head(root);
  const records = [...selected].sort().map(file => {
    const absolute = safePath(root, file);
    const committed = git(root, ['show', 'HEAD:' + file], {allowFailure:true, encoding:null});
    const staged = git(root, ['show', ':' + file], {allowFailure:true, encoding:null});
    check(committed.status === 0 && staged.status === 0 && fs.existsSync(absolute)
      && fs.lstatSync(absolute).isFile() && committed.stdout.equals(staged.stdout)
      && committed.stdout.equals(fs.readFileSync(absolute)), 'LEGACY_PLAN_CHANGED',
      'Миграция остановлена: файл должен быть tracked и побайтно совпадать с HEAD и index: ' + file, {path:file});
    return {path:file, source_commit:sourceCommit, digest:hash(committed.stdout)};
  });
  return records;
}

export function migrateLegacyPlans(root) {
  const current = currentPlan(root);
  const records = preflightPlanMigration(root);

  const normalized = structuredClone(current.plan);
  let normalizedCurrent = false;
  for (const key of ['owner_session_id', 'prepared_in_session_id', 'session_experience', 'ownership_evidence']) {
    if (Object.hasOwn(normalized, key)) { delete normalized[key]; normalizedCurrent = true; }
  }
  if (normalizedCurrent) normalized.plan_revision++;

  // Every byte has been checked against Git before any deletion.
  const removed = [];
  for (const record of records) {
    fs.unlinkSync(safePath(root, record.path));
    removed.push(record.path);
  }
  const prune = directory => {
    const absolute = safePath(root, directory);
    if (!fs.existsSync(absolute)) return;
    for (const entry of fs.readdirSync(absolute, {withFileTypes:true})) if (entry.isDirectory()) prune(directory + '/' + entry.name);
    if (!fs.readdirSync(absolute).length) fs.rmdirSync(absolute);
  };
  for (const directory of [...PLAN_DIRECTORIES, '.harness/plans/archive']) prune(directory);

  if (normalizedCurrent) atomic(safePath(root, PLAN), renderPlan(normalized));

  return {
    ok: true,
    current_plan: PLAN,
    current_scope_id: normalized.scope_id,
    current_normalized: normalizedCurrent,
    removed: records,
    changed_paths: [...new Set([...removed, ...(normalizedCurrent ? [PLAN] : [])])],
  };
}

// Public compatibility: normal enumeration now exposes exactly one
// checkout-scoped current plan.
export function listPlans(root, options = {}) {
  return [currentPlan(root, options)];
}

export function selectPlan(root, { sessionId, planId } = {}) {
  if (sessionId !== undefined && sessionId !== null) validIdentity(sessionId, 'sessionId');
  if (planId !== undefined && planId !== null) validIdentity(planId, 'planId');
  const selected = currentPlan(root);
  if (planId !== undefined && planId !== null) {
    check(selected.plan.scope_id === planId, 'PLAN_NOT_CURRENT',
      'Указанный planId не является текущим plan этого checkout. Historical plans доступны только для чтения истории.',
      { requested_plan_id: planId, current_plan_id: selected.plan.scope_id });
  }
  return { ...selected, sessionId: sessionId ?? null };
}

// Transitional facade for old WebPilot callers. Session metadata is echoed
// but never selects or owns project state.
export function withSessionPlan(root, selector, fn) {
  const selected = selectPlan(root, selector);
  return withPlanFile(root, PLAN, { sessionId: selected.sessionId }, () => fn(selected));
}

export function currentPlanView(root) {
  const current = currentPlan(root);
  return {
    ok: true,
    plan_id: current.plan.scope_id,
    plan_path: PLAN,
    plan: current.plan,
  };
}

export function sessionPlanView(root, sessionId) {
  if (sessionId !== undefined && sessionId !== null) validIdentity(sessionId, 'sessionId');
  return {
    ...currentPlanView(root),
    session_id: sessionId ?? null,
    prepared: [],
    unassigned: [],
  };
}

// Single current plan means there is no second runtime writer to arbitrate.
export function assertSingleWriter(_root, targetFile) {
  check(targetFile === PLAN, 'PLAN_NOT_CURRENT', 'Runtime operations may modify only the current checkout plan.');
}

// Ownership no longer exists. Kept as a no-op export for package consumers
// during the compatibility window.
export function assertSelectionOwner() {}
