import fs from 'node:fs';
import path from 'node:path';
import { inspectWithDiagnostics, install, upgradeFrom } from './workflow-kit/lib/installer.mjs';
import { inspectionInputs } from './workflow-kit/lib/inspection-inputs.mjs';
import { check, hash, json, MANIFEST, VERSION, errorResult } from './workflow-kit/lib/common.mjs';
import { hooksDirectory, BLOCK_START, BLOCK_END } from './workflow-kit/lib/installation-files.mjs';
import { run, git, identityReady } from './workflow-kit/lib/git.mjs';

// Versions the bundled installer can open or upgrade: its own list, so a new Kit version needs no second edit here.
// Before 0.6.96 this was a separate list that stopped at 1.4.13, and projects with Kit 1.5.0–1.5.4 were refused.
const supported = new Set(['1.0.0', ...upgradeFrom, VERSION]);
function options(input) {
  check(input && ['inspect', 'apply', 'fingerprint'].includes(input.action), 'SETUP_ACTION', 'Неизвестное действие подготовки.');
  check(['new', 'existing'].includes(input.mode), 'SETUP_MODE', 'Выберите создание или подключение проекта.');
  check(typeof input.project === 'string' && path.isAbsolute(input.project) && !/[\r\n\0]/.test(input.project), 'PROJECT_PATH', 'Нужен полный путь к папке проекта.');
  return { project: input.project, mode: input.mode, name: input.name };
}
function localHistoryDefaults(workspace) {
  const cwd = fs.existsSync(workspace) ? workspace : path.dirname(workspace);
  if (identityReady(cwd)) return {};
  const configured = key => git(cwd, ['config', '--get', key], { allowFailure: true }).stdout.trim();
  // Git requires a signature; personal project attributes are not collected by the app.
  return { 'git-name': configured('user.name') || 'Web Pilot',
    'git-email': configured('user.email') || 'web-pilot@localhost' };
}
function recoverCurrentPlan(root) {
  const workflow = path.join(root, 'scripts/workflow.mjs');
  const execute = args => run(process.execPath, [workflow, 'recover', ...args, '--format', 'json'], root, { allowFailure: true });
  const parse = result => {
    try { return JSON.parse(result.stdout); } catch { return null; }
  };
  let result = execute([]), packet = parse(result);
  if (result.status !== 0 && packet?.code === 'SESSION_REQUIRED') {
    let plan;
    try {
      const text = fs.readFileSync(path.join(root, '.harness/plans/todo-plan.md'), 'utf8');
      plan = JSON.parse(text.match(/<!-- workflow-state:begin -->\s*```json\s*([\s\S]*?)```/)?.[1] ?? '');
    } catch {}
    if (plan?.owner_session_id) {
      result = execute(['--session', plan.owner_session_id, ...(plan.scope_id ? ['--plan', plan.scope_id] : [])]);
      packet = parse(result);
    }
  }
  return result.status === 0 ? packet : packet ?? null;
}
function inspectProject(opts) {
  const inspection = inspectWithDiagnostics(opts);
  const p = inspection.preview;
  const result = { workspace: p.project_path, name: p.project_name, version: p.version, kitVersion: VERSION, installed: p.installed,
    ready: false, action: null, issues: [...p.conflicts], checks: [], files: p.files,
    initializeGit: p.initialize_git,
    existingChanges: p.existing_changes ?? [], warnings: [], fingerprint: p.preview_fingerprint };
  if (!p.installed) {
    result.action = p.can_install ? 'install' : null;
    return result;
  }
  if (!supported.has(p.version)) result.issues.push({ path: MANIFEST, reason: `Версия ${p.version} пока не поддерживается. Автоматическое обновление не выполняется.` });
  const manifest = JSON.parse(fs.readFileSync(path.join(p.project_path, MANIFEST), 'utf8'));
  const legacyDocuments = ['docs/DOCUMENTATION_INDEX.md','docs/WORKFLOW_START.md','docs/PRODUCT.md','docs/architecture/ARCHITECTURE.md',
    ...(!['1.0.0','1.1.0'].includes(p.version) ? ['docs/MODULES.md','docs/architecture/OVERVIEW.md'] : [])];
  const anchors = ['.harness/workflow.json', '.harness/plans/todo-plan.md', '.harness/plans/todo-plan.template.md',
    ...(manifest.required_documents ?? legacyDocuments)];
  anchors.push(...manifest.files.filter(f => f.kind === 'managed' && /^AGENTS(?:\.override)?\.md$/.test(f.path)).map(f => f.path));
  if (!anchors.some(f => /^AGENTS/.test(f))) result.issues.push({ path: 'AGENTS.md', reason: 'Не найдены зарегистрированные инструкции проекта.' });
  for (const file of anchors) {
    try { check(fs.statSync(path.join(p.project_path, file)).isFile(), 'MISSING', 'Нужен обычный файл.'); }
    catch { result.issues.push({ path: file, reason: 'Обязательный файл отсутствует.' }); }
  }
  result.checks.push({ label: 'Файлы комплекта и документы', ok: !result.issues.length });
  if (result.issues.length) return result; // Never execute a damaged installation.
  if (p.upgradeable) {
    result.checks.push({ label: `Workflow Kit ${p.version} → ${VERSION}`, ok: true });
    result.action = 'upgrade'; result.warnings.push('Совместимый runtime будет обновлён; активный plan и пользовательские документы сохранятся.');
    result.fingerprint = hash(json({ root: p.project_path, version: p.version, manifest: hash(fs.readFileSync(path.join(p.project_path, MANIFEST))), state: [p.state?.head, p.state?.plan_revision, p.state?.changes] }));
    return result;
  }
  const d = inspection.doctor;
  const checks = d.diagnostics.filter(c => !['Codex', 'SessionStart', 'Первый коммит'].includes(c.name));
  // Verify owned Git-hook sections too: presence of a marker is insufficient.
  const hookFolder = hooksDirectory(p.project_path).folder;
  let hookConflict = false;
  for (const entry of manifest.files.filter(f => f.kind === 'git-hook')) {
    const file = path.join(hookFolder, path.basename(entry.path));
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8'), start = content.indexOf(BLOCK_START), end = content.indexOf(BLOCK_END);
    if (start >= 0 && (end < start || hash(content.slice(start, end + BLOCK_END.length)) !== entry.section_hash)) {
      hookConflict = true;
      result.issues.push({ path: path.relative(p.project_path, file), reason: 'Секция проверки изменена. Автоматическая перезапись запрещена.' });
    }
  }
  const launcher = checks.find(c => c.name === 'Launcher');
  const hookErrors = checks.filter(c => c.name !== 'Launcher' && c.status === 'ERROR');
  const currentPacket = recoverCurrentPlan(p.project_path);
  const currentComplete = currentPacket?.ok === true && currentPacket.completeness === 'COMPLETE';
  result.checks.push({ label: 'Текущий plan проекта', ok: currentComplete },
    { label: 'Команды проекта', ok: launcher?.status === 'OK' },
    { label: 'Проверки изменений', ok: !hookErrors.length && !hookConflict });
  if (!currentComplete) result.issues.push({ path: '.harness/plans/todo-plan.md',
    reason: currentPacket?.message ?? 'Не удалось собрать полный пакет контекста текущего plan.' });
  if (d.installation?.bootstrap_pending) result.warnings.push('Файлы комплекта подготовлены. Их первая фиксация в истории ещё ожидает команды install:commit; исходные изменения сохранены.');
  if (p.version !== VERSION) result.warnings.push(`Установлен Workflow Kit ${p.version}. Рабочая версия сохраняется без обновления.`);
  const repairable = !result.issues.length && p.compatible && (hookErrors.length || launcher?.status === 'ERROR');
  result.ready = !result.issues.length && !hookErrors.length && launcher?.status === 'OK';
  result.action = result.ready ? 'open' : repairable ? 'reconnect' : null;
  if (!result.ready && !repairable) {
    if (launcher?.status === 'ERROR') result.issues.push({ path: 'Команды проекта', reason: launcher.detail });
    for (const e of hookErrors) result.issues.push({ path: e.name, reason: e.detail });
  }
  if (repairable) result.warnings.push('Нужно восстановить локальные команды и отсутствующие проверки. План и файлы проекта сохранятся.');
  result.fingerprint = hash(json({ root: p.project_path, version: p.version, manifest: hash(fs.readFileSync(path.join(p.project_path, MANIFEST))),
    state: [p.state?.head, p.state?.plan_revision, p.state?.changes], checks: result.checks, issues: result.issues }));
  if (p.inspection_key) {
    const current = inspectionInputs(p.project_path);
    check(current.key === p.inspection_key, 'CONCURRENT_CHANGE', 'Проект изменился во время проверки. Повторите проверку.');
    result.inputKey = current.key;
    if (current.transaction) {
      result.ready = false; result.action = null;
      result.issues.push({ path: 'Workflow Kit', reason: 'Ожидается завершение транзакции проекта. Повторите проверку.' });
    }
  }
  return result;
}
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const opts = options(input);
  let result = input.action === 'fingerprint'
    ? { workspace: fs.realpathSync(opts.project), ...inspectionInputs(opts.project) }
    : inspectProject(opts);
  if (input.action === 'apply') {
    check(typeof input.fingerprint === 'string' && result.fingerprint === input.fingerprint, 'PREVIEW_CHANGED', 'Папка изменилась после проверки. Проверьте её ещё раз.');
    check(result.action, 'SETUP_BLOCKED', 'Сначала устраните показанные проблемы. Файлы сохранены.');
    if (['install', 'reconnect', 'upgrade'].includes(result.action)) {
      const installed = install({ ...opts, ...(result.action === 'upgrade' ? { update: true } : {}), 'expected-fingerprint': input.fingerprint,
        ...(['install', 'upgrade'].includes(result.action) ? localHistoryDefaults(result.workspace) : {}) });
      result = inspectProject({ project: installed.project_path, mode: 'existing' });
    }
  }
  process.stdout.write(JSON.stringify({ ok: true, ...result }) + '\n');
} catch (error) { process.stdout.write(JSON.stringify(errorResult(error)) + '\n'); process.exitCode = 1; }
