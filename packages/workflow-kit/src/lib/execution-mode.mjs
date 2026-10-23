import fs from 'node:fs';
import { atomic, check, json, readJSON, safePath, withLock } from './common.mjs';
import { localPath } from './git.mjs';
import { readPlan } from './plan.mjs';
import { claimOwnerUnlocked, readPlanningOwner } from './planning-owner.mjs';

// The user chooses how a Workflow Pilot plan runs. The agent asks with its recommendation,
// the application records the user's button press, and plan creation must match the choice.
export const EXECUTION_MODE = '.harness/runtime/execution-mode.json';
export const EXECUTION_MODES = Object.freeze(['sequential', 'orchestrated']);
const SESSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;
const file = root => safePath(root, EXECUTION_MODE);
const operation = (root, fn) => withLock(localPath(root, 'operation.lock'), fn);
function stored(root) {
  if (!fs.existsSync(file(root))) return null;
  const record = readJSON(file(root));
  check(record?.version === 1 && typeof record.session_id === 'string' && SESSION.test(record.session_id)
    && Number.isSafeInteger(record.generation) && EXECUTION_MODES.includes(record.recommended)
    && (record.choice === null || EXECUTION_MODES.includes(record.choice?.strategy)),
  'EXECUTION_MODE_STATE', 'Повреждена запись режима выполнения.');
  return record;
}
// Like the planning owner, a record written before an archive belongs to the closed plan.
export function readExecutionMode(root) {
  const record = stored(root);
  if (!record) return null;
  return (readPlan(root).archived_scope_id ?? null) === (record.archived_scope_id ?? null) ? record : null;
}
// Call under Kit's operation lock: archive, owner transfer and release already hold it.
export function clearExecutionMode(root) { fs.rmSync(file(root), { force: true }); }
export function requestExecutionMode(root, { session_id, recommended, reason } = {}) {
  check(typeof session_id === 'string' && SESSION.test(session_id), 'EXECUTION_MODE_SESSION', 'Нужен точный Session ID этой сессии из recovery.');
  check(EXECUTION_MODES.includes(recommended), 'EXECUTION_MODE_INPUT', 'Рекомендация: sequential или orchestrated.');
  check(typeof reason === 'string' && reason.trim().length >= 10 && reason.trim().length <= 300, 'EXECUTION_MODE_INPUT',
    'Объясните рекомендацию пользователю: --reason от 10 до 300 символов.');
  return operation(root, () => {
    const plan = readPlan(root);
    check(plan.execution_scope_status === 'NONE', 'EXECUTION_MODE_ACTIVE_PLAN', 'План проекта уже опубликован; режим выбирается только для нового плана.');
    const owner = claimOwnerUnlocked(root, { session_id });
    const record = { version: 1, session_id, generation: (stored(root)?.generation ?? 0) + 1, recommended, reason: reason.trim(),
      requested_at: new Date().toISOString(), owner_generation: owner.generation, archived_scope_id: plan.archived_scope_id ?? null, choice: null };
    atomic(file(root), json(record));
    return { ok: true, ...record,
      message: 'Запрос отправлен пользователю. Дождитесь его выбора в панели Workflow Pilot; plan:mode-choose вызывает только приложение.' };
  });
}
// Workflow Pilot calls this after the user's button press: compare-and-set on generation and owner.
export function chooseExecutionMode(root, { session_id, strategy, generation, approval_note } = {}) {
  check(EXECUTION_MODES.includes(strategy), 'EXECUTION_MODE_INPUT', 'Режим: sequential или orchestrated.');
  check(typeof approval_note === 'string' && approval_note.trim().length >= 10, 'EXECUTION_MODE_INPUT', 'Нужна approval-note выбора пользователя.');
  return operation(root, () => {
    const record = readExecutionMode(root), owner = readPlanningOwner(root);
    check(record && record.session_id === session_id && record.generation === Number(generation), 'EXECUTION_MODE_CHANGED',
      'Запрос режима изменился. Выбор относится к устаревшему запросу.');
    check(owner?.session_id === session_id, 'PLANNING_OWNED', 'Сессия больше не владеет планированием.');
    check(readPlan(root).execution_scope_status === 'NONE', 'EXECUTION_MODE_ACTIVE_PLAN', 'План проекта уже опубликован.');
    const next = { ...record, choice: { strategy, approval_note: approval_note.trim(), chosen_at: new Date().toISOString() } };
    atomic(file(root), json(next));
    return { ok: true, ...next };
  });
}
// Fail before any write. Plans without an origin and without a request are the CLI workflow outside Workflow Pilot.
export function assertExecutionMode(root, plan) {
  if (plan.assignment) return null;
  const record = readExecutionMode(root), origin = plan.execution_origin_session_id;
  // A parallel plan is the legacy route of a started plan; the user chooses only sequential or orchestrated.
  if (!record && (origin === undefined || plan.execution_strategy === 'parallel')) return null;
  check(record, 'EXECUTION_MODE_REQUIRED',
    'План сессии Workflow Pilot требует выбора режима пользователем: сначала plan:mode-request с рекомендацией, затем дождитесь выбора.',
    { field: 'execution_origin_session_id', received: origin ?? null });
  check(origin === record.session_id, 'EXECUTION_MODE_REQUIRED',
    'Режим запрошен сессией ' + record.session_id + '; план должен указать её в execution_origin_session_id.', { expected: record.session_id, received: origin ?? null });
  check(record.choice, 'EXECUTION_MODE_REQUIRED', 'Пользователь ещё не выбрал режим выполнения. Дождитесь его выбора в панели Workflow Pilot.');
  check(plan.execution_strategy === record.choice.strategy, 'EXECUTION_MODE_MISMATCH',
    'Пользователь выбрал режим ' + record.choice.strategy + '; составьте план с этим execution_strategy.', { expected: record.choice.strategy, received: plan.execution_strategy ?? null });
  return record;
}
export function executionModeSummary(root) {
  const record = readExecutionMode(root);
  if (!record) return null;
  return 'РЕЖИМ ВЫПОЛНЕНИЯ\nЗапрос сессии ' + record.session_id + ': рекомендация ' + record.recommended + ' (' + record.reason + ').\n'
    + (record.choice ? 'Выбор пользователя: ' + record.choice.strategy + '. План составляется только в этом режиме.'
      : 'Пользователь ещё не выбрал режим; план не создавайте.');
}
