import fs from 'node:fs';
import path from 'node:path';
import { VERSION, MANIFEST, PLAN, CONFIG, withPlanFile, check, hash, id, json, readJSON, atomic, safePath, errorResult } from './common.mjs';
import { git, run, repoRoot, head, allChanges, identityReady, localPath, ensureIdleGit, paths } from './git.mjs';
import { listPlans, preflightPlanMigration, migrateLegacyPlans } from './session-plans.mjs';
import { status } from './actions.mjs';
import { readPlan, emptyPlan, writePlan, projectContextPaths } from './plan.mjs';
import { journal } from './validate.mjs';
import { commitCandidate, locked } from './transaction.mjs';
import { payload, hooksDirectory, hookContent, installationManifest, HOOK_COMMAND, BLOCK_START, BLOCK_END, MD_START, MD_END } from './installation-files.mjs';
import { prepareRuntime, launcherCommand, windows } from './platform.mjs';
import { inspectionInputs } from './inspection-inputs.mjs';

const hookNames = ['pre-commit', 'commit-msg', 'post-commit', 'pre-push'];
const hookName = entry => path.posix.basename(entry.path.replaceAll('\\', '/'));
// Versions this installer upgrades in place. Consumers (Web Pilot Workspace Setup) read the same list.
export const upgradeFrom = new Set(['1.1.0', '1.2.0', '1.3.0', '1.4.0', '1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.6', '1.4.7', '1.4.8', '1.4.9', '1.4.10', '1.4.11', '1.4.12', '1.4.13', '1.5.0', '1.5.1', '1.5.2', '1.5.3', '1.5.4', '1.5.5', '1.5.6', '1.6.0', '1.6.1', '1.6.2', '1.6.3', '1.6.4', '1.7.0', '1.7.1']);
function migrateNonePlanForContinuity(root) {
  const file = path.join(root, PLAN);
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/<!-- workflow-state:begin -->\s*```json\s*([\s\S]*?)```\s*<!-- workflow-state:end -->/);
  let current;
  try { current = JSON.parse(match?.[1] ?? ''); } catch { return false; }
  if (current?.schema_version !== 1 || current.execution_scope_status !== 'NONE') return false;
  const required = new Set(current.context_pack?.documents?.filter(doc => doc.required).map(doc => doc.path) ?? []);
  if (projectContextPaths().every(name => required.has(name)) && required.size === projectContextPaths().length) return false;
  const next = emptyPlan(typeof current.project_name === 'string' && current.project_name ? current.project_name : path.basename(root));
  next.project_id = current.project_id;
  next.plan_revision = Number.isSafeInteger(current.plan_revision) ? current.plan_revision + 1 : 1;
  if (typeof current.archived_scope_id === 'string' && current.archived_scope_id) next.archived_scope_id = current.archived_scope_id;
  if (Array.isArray(current.user_decisions)) next.user_decisions = current.user_decisions;
  writePlan(root, next);
  return true;
}
function sectionBounds(text, start, end) {
  const i = text.indexOf(start), j = text.indexOf(end, i + start.length);
  check(i >= 0 && j >= i, 'MODIFIED_INTEGRATION', 'Управляемая секция отсутствует; автоматическое обновление остановлено.');
  return { i, j, value: text.slice(i, j + end.length) };
}
function replaceOwnedSection(current, entry, content, start = MD_START, end = MD_END) {
  const found = sectionBounds(current, start, end);
  check(entry.section_hash && hash(found.value) === entry.section_hash, 'MODIFIED_INTEGRATION', 'Управляемая секция изменена; автоматическое обновление остановлено: ' + entry.path);
  const next = start + '\n' + content.trim() + '\n' + end;
  return current.slice(0, found.i) + next + current.slice(found.j + end.length);
}
function manifestEntry(entry) { return installationManifest([entry], {}).files[0]; }
function manifestTarget(root, entry) {
  if (!entry.external) return safePath(root, entry.path);
  check(entry.kind === 'git-hook' && hookNames.includes(hookName(entry)), 'MANIFEST_PATH', 'Неизвестный внешний путь manifest.');
  return path.join(hooksDirectory(root).folder, hookName(entry));
}
function reconnect(root, preview) {
  check(preview.compatible, 'UNSUPPORTED_MIGRATION', 'Установлена версия ' + preview.version + '; приложение содержит ' + VERSION + '. Автоматическая миграция пока не поддерживается. Проект сохранён.');
  if (preview.conflicts.length) return publicPreview(preview);
  return locked(root, () => {
    const manifest = readJSON(path.join(root, MANIFEST));
    const location = hooksDirectory(root); const edits = [];
    for (const name of hookNames) {
      const file = path.join(location.folder, name);
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (current.includes(BLOCK_START)) {
        const entry = manifest.files.find(e => e.kind === 'git-hook' && hookName(e) === name);
        const start = current.indexOf(BLOCK_START), end = current.indexOf(BLOCK_END);
        check(entry && end > start && hash(current.slice(start, end + BLOCK_END.length)) === entry.section_hash, 'MODIFIED_INTEGRATION', 'Секция Git hook изменена; автоматическое переподключение остановлено: ' + name);
      } else edits.push({ file, content: hookContent(current, name) });
    }
    const runtime = prepareRuntime(root);
    for (const e of edits) atomic(e.file, e.content, 0o755);
    return { ...publicPreview(preview), reconnected: true, runtime, state: status(root), message: 'Проект подключён. Текущий план сохранён; локальные команды подготовлены.' };
  });
}

function selectedProject(opts) {
  check(typeof opts.project === 'string' && opts.project.trim(), 'PROJECT_REQUIRED', 'Выберите папку проекта.');
  const selected = path.resolve(opts.project);
  check(!/[\r\n\0]/.test(selected), 'PROJECT_PATH', 'Путь проекта не должен содержать переносы строк.');
  const exists = fs.existsSync(selected);
  if (exists) check(fs.statSync(selected).isDirectory(), 'PROJECT_PATH', 'Выберите папку, а не файл.');
  if (opts.mode === 'new') {
    const entries = exists ? fs.readdirSync(selected).filter(n => n !== '.DS_Store') : [];
    const recovering = fs.existsSync(path.join(selected, '.harness/runtime/install-journal.json'));
    const installed = fs.existsSync(path.join(selected, MANIFEST));
    check(entries.length === 0 || recovering || installed, 'FOLDER_NOT_EMPTY', 'Для нового проекта выберите пустую папку. Для существующего используйте «Подключить проект».');
    check(fs.existsSync(path.dirname(selected)), 'PARENT_MISSING', 'Родительская папка не существует.');
    return { root: exists ? fs.realpathSync(selected) : path.join(fs.realpathSync(path.dirname(selected)), path.basename(selected)), exists, isGit: exists && fs.existsSync(path.join(selected, '.git')) };
  }
  check(exists, 'PROJECT_MISSING', 'Выбранная папка не существует.');
  const result = git(selected, ['rev-parse', '--show-toplevel'], { allowFailure: true });
  return { root: result.status === 0 ? repoRoot(selected) : fs.realpathSync(selected), exists, isGit: result.status === 0 };
}
function fingerprint(root, entries, isGit) {
  const state = { root, version: VERSION, entries: entries.map(e => ({ path: e.path, before: e.original_hash, after: e.hash })),
    head: isGit ? head(root) : null, dirty: isGit ? allChanges(root) : [], folder: fs.existsSync(root) ? fs.readdirSync(root).sort() : null };
  // Generated IDs and template content are intentionally absent: preview is about current inputs.
  for (const entry of state.entries) delete entry.after;
  return hash(json(state));
}
export function inspect(opts) {
  return stableInspection(opts, false).preview;
}
export function inspectWithDiagnostics(opts) {
  return stableInspection(opts, true);
}
function stableInspection(opts, diagnostics) {
  const { root } = selectedProject(opts);
  if (!fs.existsSync(path.join(root, MANIFEST))) {
    const preview = inspectOnce(opts);
    return { preview, doctor: { ...publicPreview(preview), diagnostics: [] } };
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    let before;
    try { before = inspectionInputs(root); }
    catch (error) {
      const preview = inspectOnce(opts);
      preview.state = errorResult(error);
      return { preview, doctor: { ...publicPreview(preview), diagnostics: [], healthy: false } };
    }
    const preview = inspectOnce(opts);
    const diagnosed = diagnostics && !preview.upgradeable ? collectDiagnostics(root, publicPreview(preview)) : null;
    opts.beforeRecheck?.(attempt);
    const after = inspectionInputs(root);
    if (before.key !== after.key || root !== preview.project_path) {
      if (attempt === 0) continue;
      check(false, 'CONCURRENT_CHANGE', 'Проект меняется во время полной проверки. Повторите проверку.');
    }
    preview.inspection_key = after.key;
    preview.transaction_pending = after.transaction;
    return { preview, doctor: diagnosed ?? { ...publicPreview(preview), diagnostics: [] } };
  }
}
function inspectOnce(opts) {
  const selected = selectedProject(opts); const { root, isGit } = selected;
  const manifestFile = path.join(root, MANIFEST);
  if (fs.existsSync(manifestFile)) {
    const manifest = readJSON(manifestFile);
    const conflicts = [];
    for (const e of manifest.files.filter(e => e.kind === 'owned')) {
      const f = manifestTarget(root, e);
      if (!fs.existsSync(f) || hash(fs.readFileSync(f)) !== e.hash) conflicts.push({ path: e.path, reason: 'Файл runtime отсутствует или изменён.' });
    }
    let state; try {
      const states = listPlans(root).map(({ file, plan }) => withPlanFile(root, file, { sessionId: plan.owner_session_id ?? null }, () => ({ plan_path: file, ...status(root) })));
      state = { ...states[0], ok: states.every(s => s.ok), plans: states };
    } catch (e) { state = errorResult(e); }
    const compatible = manifest.version === VERSION;
    const upgradeable = !compatible && upgradeFrom.has(manifest.version) && conflicts.length === 0;
    return { ok: true, installed: true, project_path: root, project_name: state.project_name ?? path.basename(root), version: manifest.version,
      compatible, upgradeable, conflicts, can_install: false, state, files: [],
      message: conflicts.length ? 'Найдены изменения runtime. Автоматическая перезапись запрещена.' : upgradeable ? `Workflow Kit ${manifest.version} можно безопасно обновить до ${VERSION}.` : 'Комплект уже установлен. План и файлы сохранены.' };
  }
  const pendingFile = path.join(root, '.harness/runtime/install-journal.json');
  let entries; let hookLocation; let initialChanges;
  if (fs.existsSync(pendingFile)) {
    const pending = readJSON(pendingFile);
    check(pending.root === root && pending.version === VERSION, 'INSTALL_JOURNAL', 'Журнал частичной установки относится к другой версии/папке.');
    entries = pending.entries; hookLocation = pending.hook_location; initialChanges = pending.initial_changes ?? [];
  } else {
    hookLocation = isGit ? hooksDirectory(root) : { folder: path.join(root, '.git/hooks'), tracked: false, mechanism: 'git' };
    entries = payload(root, opts.name || path.basename(root), hookLocation);
  }
  const conflicts = [];
  for (const e of entries) {
    const target = e.external ? e.path : path.join(root, e.path);
    const current = fs.existsSync(target) ? hash(fs.readFileSync(target)) : null;
    if (fs.existsSync(pendingFile)) {
      if (current !== e.original_hash && current !== e.hash) conflicts.push({ path: e.path, reason: 'Файл изменён после прерванной установки.' });
    } else if (e.original_hash !== null && ['owned', 'editable'].includes(e.kind)) conflicts.push({ path: e.path, reason: 'Этот путь уже занят. Существующий файл не будет перезаписан.' });
  }
  const files = entries.map(e => ({ path: e.external ? path.relative(root, e.path) : e.path, action: e.existed ? 'Дополнить' : 'Создать', kind: e.kind }));
  return { ok: true, installed: false, project_path: root, project_name: opts.name || path.basename(root), version: VERSION,
    can_install: conflicts.length === 0, conflicts, files, is_git: isGit, initialize_git: !isGit, hook_mechanism: hookLocation.mechanism,
    git_identity_ready: identityReady(isGit ? root : path.dirname(root)),
    existing_changes: initialChanges ?? (isGit ? allChanges(root) : []), preview_fingerprint: fingerprint(root, entries, isGit),
    partial_install: fs.existsSync(pendingFile), _entries: entries, _hook_location: hookLocation };
}
function upgradeInstallation(root, preview) {
  check(preview.upgradeable && !preview.conflicts.length, 'UNSUPPORTED_MIGRATION', 'Автоматическое обновление этой установки недоступно.');
  return locked(root, () => {
    const old = readJSON(path.join(root, MANIFEST));
    check(upgradeFrom.has(old.version), 'UNSUPPORTED_MIGRATION', 'Версия установки изменилась после preview.');
    // Worktree contracts pin their inherited runtime. Never migrate a live
    // assignment or merge journal as a side effect of upgrading its parent.
    check(!fs.existsSync(localPath(root,'assignment.json'))&&!fs.existsSync(localPath(root,'integration.json')),
      'PARALLEL_UPGRADE_PENDING','Сначала завершите назначение или интеграцию. Runtime не изменён.');
    const assignments=localPath(root,'assignments');
    for(const name of fs.existsSync(assignments)?fs.readdirSync(assignments):[]) {
      if(!name.endsWith('.json'))continue;
      check(readJSON(path.join(assignments,name)).phase==='INTEGRATED','PARALLEL_UPGRADE_PENDING',
        'Есть незавершённое назначение. Обновление Kit не меняет его контракт; сначала завершите интеграцию.');
    }
    // Validate the canonical current plan before any upgrade write. Legacy plans
    // are inventoried only as history and never compete to become current.
    const legacyBefore = preflightPlanMigration(root);
    // Commit preconditions are checked before any write: a late refusal would leave
    // a written runtime and manifest that a retry treats as already installed.
    ensureIdleGit(root);
    check(identityReady(root), 'GIT_IDENTITY', 'Git не знает автора. Настройте user.name и user.email; обновление не начато.');
    const foreign = paths(root, 'staged');
    check(!foreign.length, 'FOREIGN_STAGED', 'В index есть посторонние файлы. Обновление не начато.', { paths: foreign });
    const temp = path.join(root, '.harness/runtime/kit-upgrade-preview-' + id());
    fs.mkdirSync(temp, { recursive: true });
    let desired;
    try { desired = payload(temp, preview.project_name, { folder: path.join(temp, '.git/hooks'), tracked: false, mechanism: 'git' }); }
    finally { fs.rmSync(temp, { recursive: true, force: true }); }
    const desiredMap = new Map(desired.filter(e => !e.external).map(e => [e.path, e]));
    const oldMap = new Map(old.files.map(e => [e.path, e]));
    const replacements = new Map(); const changed = []; const writes = [];
    const write = (entry, content) => {
      const file = safePath(root, entry.path); const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (before !== content) { writes.push({ file, content, mode: entry.mode ?? 0o644 }); changed.push(entry.path); }
      replacements.set(entry.path, manifestEntry({ ...entry, content, original_hash: entry.original_hash ?? (before === null ? null : hash(before)), hash: hash(content), existed: before !== null }));
    };
    const retired = [];
    for (const entry of old.files.filter(e => e.kind === 'owned' && (e.path.startsWith('.harness/kit/') || ['scripts/workflow', 'scripts/workflow.mjs', 'scripts/workflow.cmd'].includes(e.path)))) {
      const file = manifestTarget(root, entry); check(fs.existsSync(file) && hash(fs.readFileSync(file)) === entry.hash, 'MODIFIED_INTEGRATION', 'Runtime изменён; обновление остановлено: ' + entry.path);
      const next = desiredMap.get(entry.path);
      if (next) write(next, next.content);
      else {
        const committed=git(root,['show','HEAD:'+entry.path],{allowFailure:true,encoding:null});
        const staged=git(root,['show',':'+entry.path],{allowFailure:true,encoding:null});
        check(committed.status===0 && staged.status===0 && committed.stdout.equals(staged.stdout)
          && committed.stdout.equals(fs.readFileSync(file)), 'MODIFIED_INTEGRATION', 'Удаляемый файл Kit изменён или не записан в Git: '+entry.path);
        retired.push(entry.path); changed.push(entry.path);
      }
    }
    // New core files are part of the same preflight; never replace an unowned collision.
    for (const entry of desired.filter(e => e.kind === 'owned' && !oldMap.has(e.path))) {
      const file = safePath(root, entry.path);
      check(!fs.existsSync(file) || hash(fs.readFileSync(file)) === entry.hash, 'MODIFIED_INTEGRATION', 'Новый служебный путь занят: ' + entry.path);
      write(entry, entry.content);
    }
    const planTemplate = desiredMap.get('.harness/plans/todo-plan.template.md');
    if (planTemplate) {
      const previous = oldMap.get(planTemplate.path); const file = safePath(root, planTemplate.path); const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (current === null || (previous && hash(current) === previous.hash)) write(planTemplate, planTemplate.content);
      else replacements.set(planTemplate.path, manifestEntry(planTemplate));
    }
    const agentEntry = old.files.find(e => e.kind === 'managed' && /^AGENTS(?:\.override)?\.md$/.test(e.path));
    if (agentEntry) {
      const current = fs.readFileSync(manifestTarget(root, agentEntry), 'utf8');
      const template = desiredMap.get('.harness/kit/templates/AGENTS.md')?.content; check(template, 'UPGRADE_PAYLOAD', 'Новый комплект не содержит AGENTS template.');
      const next = replaceOwnedSection(current, agentEntry, template); write({ ...agentEntry, path: agentEntry.path, external: false, kind: 'managed' }, next);
    }
    for (const name of projectContextPaths()) {
      const entry = desiredMap.get(name); check(entry, 'UPGRADE_PAYLOAD', 'Новый комплект не содержит ' + name);
      const file = safePath(root, name);
      if (!fs.existsSync(file)) write(entry, entry.content);
      else {
        const current = fs.readFileSync(file, 'utf8');
        replacements.set(name, manifestEntry({ ...entry, content: current, original_hash: hash(current), hash: hash(current), existed: true }));
      }
    }
    // Keep originals before changing the kit, instructions or navigation.
    const backup = path.join(root, '.harness/runtime/kit-upgrade-' + id());
    fs.mkdirSync(backup, { recursive: true });
    const originals = [...new Set([...writes.map(e => e.file), path.join(root, MANIFEST), path.join(root, PLAN),
      ...retired.map(file => path.join(root,file)), ...legacyBefore.map(record => path.join(root, record.path))])].map((file, i) => {
      const exists = fs.existsSync(file), copy = exists ? String(i) + '.backup' : null;
      if (exists) fs.copyFileSync(file, path.join(backup, copy));
      return { path: path.relative(root, file).split(path.sep).join('/'), backup: copy };
    });
    atomic(path.join(backup, 'upgrade.json'), json({ version: VERSION, from: old.version, files: originals }));
    for (const entry of writes) { atomic(entry.file, entry.content, entry.mode); if (entry.mode === 0o755) fs.chmodSync(entry.file, 0o755); }
    for (const file of retired) fs.unlinkSync(safePath(root,file));
    if (migrateNonePlanForContinuity(root)) changed.push(PLAN);
    const legacyMigration = migrateLegacyPlans(root);
    changed.push(...legacyMigration.changed_paths);
    const obsoleteDocuments = ['docs/DOCUMENTATION_INDEX.md','docs/MODULES.md','docs/PRODUCT.md','docs/architecture/ARCHITECTURE.md','docs/WORKFLOW_START.md'];
    const kept = old.files.filter(e => !replacements.has(e.path) && !retired.includes(e.path) && !obsoleteDocuments.includes(e.path));
    const metadata = { ...old, version: VERSION, upgraded_from: old.version, upgraded_at: new Date().toISOString(),
      required_documents: projectContextPaths(),
      legacy_plan_migration: { model: 'single-active-plan', removed_count: legacyMigration.removed.length,
        source_commit: head(root), migrated_at: new Date().toISOString() },
      files: [...kept, ...replacements.values()] };
    delete metadata.installed_at; metadata.installed_at = new Date().toISOString();
    atomic(path.join(root, MANIFEST), json(metadata)); changed.push(MANIFEST);
    const selected = [...new Set(changed)];
    const result = commitCandidate(root, { plan: readPlan(root), role: 'kit-update', selected, message: 'chore: обновить Project Workflow Kit до ' + VERSION, beforeHead: head(root) });
    return { ok: true, installed: true, upgraded: true, project_path: root, project_name: preview.project_name, version: VERSION, sha: result.sha, backup_path: backup,
      state: status(root), message: 'Workflow Kit обновлён до ' + VERSION + '; активный план и пользовательские документы сохранены.' };
  });
}

function applyGitIdentity(root, opts) {
  for (const key of ['git-name', 'git-email']) check(typeof opts[key] === 'string' && opts[key].trim() && !/[\r\n\0]/.test(opts[key]), 'GIT_IDENTITY', 'Укажите имя и email автора Git.');
  git(root, ['config', '--local', 'user.name', opts['git-name'].trim()]);
  git(root, ['config', '--local', 'user.email', opts['git-email'].trim()]);
}

export function install(opts) {
  const preview = inspect(opts);
  if (opts['dry-run']) return publicPreview(preview);
  if (preview.installed && opts.update && preview.upgradeable) {
    if (opts['git-name'] || opts['git-email']) applyGitIdentity(preview.project_path, opts);
    return upgradeInstallation(preview.project_path, preview);
  }
  if (preview.installed && opts.update) check(preview.compatible, 'UNSUPPORTED_MIGRATION', 'Для этой версии нет безопасной миграции. Существующая установка сохранена.');
  if (preview.installed) return reconnect(preview.project_path, preview);
  check(preview.can_install, 'INSTALL_CONFLICT', 'Установка остановлена из-за конфликтов. Существующие файлы сохранены.', { conflicts: preview.conflicts });
  if (opts['expected-fingerprint']) check(opts['expected-fingerprint'] === preview.preview_fingerprint, 'PREVIEW_CHANGED', 'Папка изменилась после предварительного просмотра. Проверьте её ещё раз.');
  const root = preview.project_path; fs.mkdirSync(root, { recursive: true });
  const fresh = !preview.is_git;
  if (fresh) git(root, ['init', '-b', 'main']);
  return locked(root, () => {
    if (opts['git-name'] || opts['git-email']) applyGitIdentity(root, opts);
    const installJournal = path.join(root, '.harness/runtime/install-journal.json');
    const entries = preview._entries;
    atomic(installJournal, json({ schema_version: 1, version: VERSION, root, entries, initial_changes: preview.existing_changes, hook_location: preview._hook_location }), 0o600);
    for (const e of entries) {
      const file = e.external ? e.path : safePath(root, e.path);
      const current = fs.existsSync(file) ? hash(fs.readFileSync(file)) : null;
      check(current === e.original_hash || current === e.hash, 'INSTALL_CHANGED', 'Файл изменился во время установки: ' + e.path);
      if (current !== e.hash) atomic(file, e.content, e.mode);
      if (e.mode === 0o755) fs.chmodSync(file, 0o755);
      opts.afterWrite?.(e.path);
    }
    const runtime = prepareRuntime(root);
    const manifest = installationManifest(entries, { initialized_git: fresh, hook_mechanism: preview.hook_mechanism, ...runtime });
    atomic(path.join(root, MANIFEST), json(manifest));
    const installedPaths = [...entries.filter(e => !e.external).map(e => e.path), MANIFEST];
    atomic(localPath(root, 'installation.json'), json({ paths: installedPaths, preexisting_changes: preview.existing_changes, bootstrap_pending: true }));
    fs.unlinkSync(installJournal);
    let bootstrap = null; const warnings = [];
    if (!identityReady(root)) warnings.push('Настройте имя и email автора Git, затем выполните ./scripts/workflow install:commit.');
    else if (preview.existing_changes.length) warnings.push('Файлы установлены. Исходные изменения сохранены; bootstrap-коммит ждёт отдельной команды install:commit.');
    else {
      bootstrap = commitCandidate(root, { plan: readPlan(root), role: 'bootstrap', selected: installedPaths, message: 'chore: установить Project Workflow Kit', beforeHead: head(root) });
      atomic(localPath(root, 'installation.json'), json({ paths: installedPaths, preexisting_changes: [], bootstrap_pending: false, sha: bootstrap.sha }));
    }
    let state; try {
      const states = listPlans(root).map(({ file, plan }) => withPlanFile(root, file, { sessionId: plan.owner_session_id ?? null }, () => ({ plan_path: file, ...status(root) })));
      state = { ...states[0], ok: states.every(s => s.ok), plans: states };
    } catch (e) { state = errorResult(e); }
    return { ok: true, installed: true, project_path: root, project_name: preview.project_name, version: VERSION,
      installation_status: 'FILES_INSTALLED', integration_status: 'HOOK_TRUST_PENDING', state, bootstrap, warnings,
      message: 'Проект подготовлен. Добавьте эту папку в Codex и разрешите проектные hooks.' };
  });
}
function publicPreview(result) { const { _entries, _hook_location, ...value } = result; return value; }
export function finalizeInstallation(root) {
  return locked(root, () => {
    const record = readJSON(localPath(root, 'installation.json'));
    if (!record.bootstrap_pending) return { ok: true, message: 'Установка уже зафиксирована.', sha: record.sha };
    check(record.preexisting_changes.every(p => !record.paths.includes(p)), 'PREEXISTING_INSTALL_CHANGES', 'Изменения установки пересекаются с исходной работой. Нужен отдельный разбор; они не будут автоматически закоммичены.');
    const result = commitCandidate(root, { plan: readPlan(root), role: 'bootstrap', selected: record.paths, message: 'chore: установить Project Workflow Kit', beforeHead: head(root) });
    record.bootstrap_pending = false; record.sha = result.sha; atomic(localPath(root, 'installation.json'), json(record)); return result;
  });
}
export function doctor(root) {
  return inspectWithDiagnostics({ project: root, mode: 'existing' }).doctor;
}
function collectDiagnostics(root, inspected) {
  if (!inspected.installed) return { ...inspected, message: 'Комплект не установлен.' };
  const diagnostics = [];
  const hooksFile = path.join(root, '.codex/hooks.json');
  try {
    const hooks = readJSON(hooksFile);
    const count = (hooks.hooks?.SessionStart ?? []).flatMap(g => g.hooks ?? []).filter(h => h.command === HOOK_COMMAND).length;
    diagnostics.push({ name: 'SessionStart', status: count === 1 ? 'OK' : 'ERROR', detail: count === 1 ? 'Один обработчик зарегистрирован.' : 'Ожидается ровно один обработчик.' });
  } catch (e) { diagnostics.push({ name: 'SessionStart', status: 'ERROR', detail: e.message }); }
  for (const f of ['pre-commit', 'commit-msg', 'post-commit', 'pre-push']) {
    const location = hooksDirectory(root); const file = path.join(location.folder, f);
    const ready = fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(BLOCK_START) && (windows || (fs.statSync(file).mode & 0o111) !== 0);
    diagnostics.push({ name: f, status: ready ? 'OK' : 'ERROR', detail: ready ? 'Проверка подключена.' : 'Проверка отсутствует или не исполняется.' });
  }
  const command = launcherCommand(root);
  // Never execute workspace code if its owned installation is damaged.
  const launcher = inspected.conflicts.length ? { status: 1, stderr: 'Целостность runtime не подтверждена.' }
    : run(command.executable, [...command.args, 'help'], root, { allowFailure: true });
  diagnostics.push({ name: 'Launcher', status: launcher.status === 0 ? 'OK' : 'ERROR', detail: launcher.status === 0 ? 'Команды проекта запускаются.' : String(launcher.stderr || launcher.stdout || launcher.error?.message).slice(-2000) });
  diagnostics.push({ name: 'Codex', status: inspected.state?.integration_status === 'HOOK_VERIFIED' ? 'OK' : 'PENDING', detail: 'Фактическая доставка подтверждается маркером из новой сессии; файл конфигурации сам по себе её не доказывает.' });
  const recordFile = localPath(root, 'installation.json');
  const installation = fs.existsSync(recordFile) ? readJSON(recordFile) : null;
  if (installation?.bootstrap_pending) diagnostics.push({ name: 'Первый коммит', status: 'PENDING', detail: inspected.state?.git_identity_ready ? 'Фиксация установки ожидает команды ./scripts/workflow install:commit.' : 'Настройте Git user.name/user.email, затем выполните ./scripts/workflow install:commit.' });
  return { ...inspected, installation, diagnostics, healthy: diagnostics.every(d => d.status !== 'ERROR') && inspected.state?.ok === true && inspected.compatible && !inspected.conflicts.length };
}
export function remove(root, dryRun) {
  const manifest = readJSON(path.join(root, MANIFEST)); const plan = readPlan(root);
  check(listPlans(root).every(e => e.plan.execution_scope_status === 'NONE') && !journal(root), 'ACTIVE_SCOPE', 'Сначала пользователь должен закрыть активный scope.');
  const removals = []; const edits = []; const preserved = []; const conflicts = [];
  for (const e of manifest.files) {
    const file = manifestTarget(root, e);
    if (!fs.existsSync(file)) continue;
    const current = fs.readFileSync(file, 'utf8');
    if (e.kind === 'owned' || e.kind === 'editable') {
      if (hash(current) === e.hash) removals.push(file); else preserved.push(e.path);
    } else if (e.kind === 'json-hook') {
      const data = readJSON(file);
      const ownedHandlers = (data.hooks?.SessionStart ?? []).flatMap(g => g.hooks ?? []).filter(h => h.command === HOOK_COMMAND);
      if (ownedHandlers.some(h => hash(json(h)) !== e.handler_hash)) { conflicts.push(e.path); continue; }
      data.hooks.SessionStart = (data.hooks.SessionStart ?? []).map(g => ({ ...g, hooks: g.hooks.filter(h => h.command !== HOOK_COMMAND) })).filter(g => g.hooks.length);
      edits.push({ file, content: json(data) });
    } else {
      const start = e.kind === 'git-hook' || ['.gitignore', '.gitattributes'].includes(e.path) ? BLOCK_START : MD_START;
      const end = start === BLOCK_START ? BLOCK_END : MD_END;
      const i = current.indexOf(start); const j = current.indexOf(end);
      if (i >= 0 && hash(current.slice(i, j + end.length)) !== e.section_hash) { conflicts.push(e.path); continue; }
      if (i >= 0 && j >= i) {
        const content = current.slice(0, i) + current.slice(j + end.length).replace(/^\n/, '');
        if (!e.existed && content.trim().replace(/^#!\/bin\/sh/, '').trim() === '') removals.push(file);
        else edits.push({ file, content });
      }
    }
  }
  const repairId = hash(json({ removals, edits, preserved, conflicts }));
  if (dryRun === true) return { ok: true, dry_run: true, remove_id: repairId, removals, edits: edits.map(e => e.file), preserved, conflicts };
  check(conflicts.length === 0, 'MODIFIED_INTEGRATION', 'Пользователь изменил принадлежащие комплекту секции. Сначала согласуйте их удаление.', { paths: conflicts });
  check(dryRun === repairId, 'REMOVE_REVIEW', 'Сначала remove --dry-run, затем remove --apply <remove_id>.');
  return locked(root, () => { for (const e of edits) atomic(e.file, e.content); for (const file of removals) fs.unlinkSync(file); fs.unlinkSync(path.join(root, MANIFEST)); return { ok: true, preserved, message: 'Принадлежащие комплекту неизменённые файлы удалены. Пользовательские файлы сохранены.' }; });
}
export async function installerCommand(command, opts) {
  if (command === 'install') return install(opts);
  if (command === 'inspect') return publicPreview(inspect(opts));
  const root = repoRoot(path.resolve(opts.project ?? process.cwd()));
  if (command === 'doctor') return doctor(root);
  if (command === 'install:commit') return finalizeInstallation(root);
  return remove(root, opts['dry-run'] ? true : opts.apply ?? false);
}
