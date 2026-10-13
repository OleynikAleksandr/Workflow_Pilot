import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { payload, hooksDirectory, hookContent, BLOCK_START, BLOCK_END, MD_START, MD_END, installationManifest } from '../workflow-kit/lib/installation-files.mjs';
import { VERSION, MANIFEST, PLAN, withPlanFile, json, hash } from '../workflow-kit/lib/common.mjs';
import { repoRoot, head, gitPath, ensureIdleGit, localPath } from '../workflow-kit/lib/git.mjs';
import { parsePlan, renderPlan, projectContextPaths } from '../workflow-kit/lib/plan.mjs';
import { journal, resolveReferences, readConfig } from '../workflow-kit/lib/validate.mjs';
import { locked, completedTransaction, finishTransaction } from '../workflow-kit/lib/transaction.mjs';
import { upgradeFrom } from '../workflow-kit/lib/installer.mjs';
import { regularPath, readFile, signature, digest, fail, backupAndWrite } from './files.mjs';

let catalog;
function trustedFiles() {
  if (catalog) return catalog;
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'web-pilot-doctor-catalog-')));
  try { catalog = payload(temp, 'Doctor fixture', { folder: path.join(temp, '.git/hooks'), tracked: false }).filter(e => e.kind === 'owned'); }
  finally { fs.rmSync(temp, { recursive: true, force: true }); }
  return catalog;
}
const issue = (path, reason, code = 'DOCTOR_BLOCKED') => ({ path, reason, code });
const display = error => issue('Проект', error.message, error.code);
function scanTree(folder, names = []) {
  regularPath(folder);
  if (!fs.existsSync(folder)) return names;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const file = regularPath(path.join(folder, entry.name));
    if (entry.isDirectory()) scanTree(file, names); else { readFile(file); names.push(file); }
  }
  return names;
}

// The same versions Workspace Setup opens or upgrades: the bundled installer's list, never a second copy.
const SUPPORTED_VERSIONS = new Set(['1.0.0', ...upgradeFrom, VERSION]);

export function inspectProject(workspace) {
  const result = { workspace, version: null, kitVersion: VERSION, checks: [], issues: [], repairs: [], projectReady: false };
  const changes = [], observed = new Set(); let pending = null, completed = null;
  try {
    if (typeof workspace !== 'string' || !path.isAbsolute(workspace) || /[\r\n\0]/.test(workspace)) throw fail('PROJECT_PATH', 'Выберите папку проекта.');
    const root = repoRoot(workspace); result.workspace = root; ensureIdleGit(root);
    const file = name => regularPath(path.join(root, name));
    const read = name => { const target = file(name); observed.add(target); return readFile(target); };
    const manifestBytes = read(MANIFEST);
    if (!manifestBytes) throw fail('DOCTOR_MANIFEST', 'Установочная запись отсутствует. Откройте папку проекта через обычную подготовку; доктор не угадывает состав установки.');
    let manifest; try { manifest = JSON.parse(manifestBytes.content); } catch { throw fail('DOCTOR_MANIFEST', 'Установочная запись повреждена. Нужна её резервная копия.'); }
    if (manifest.schema_version !== 1 || !Array.isArray(manifest.files) || !SUPPORTED_VERSIONS.has(manifest.version)) throw fail('DOCTOR_VERSION', 'Версия или формат установки неизвестны. Нужен совместимый выпуск приложения.');
    result.version = manifest.version;
    const trusted = trustedFiles(), trustedMap = new Map(trusted.map(e => [e.path, e]));
    const owned = manifest.files.filter(e => e.kind === 'owned');
    if (new Set(owned.map(e => e.path)).size !== owned.length || owned.some(e => !trustedMap.has(e.path))) throw fail('DOCTOR_INVENTORY', 'Состав служебного комплекта неизвестен. Автоматическое исправление остановлено.');
    let reconcile = manifest.version !== VERSION;
    const repairedManifest = structuredClone(manifest);
    for (const entry of trusted) {
      const installed = owned.find(e => e.path === entry.path), current = read(entry.path);
      if (current && digest(current.content) !== entry.hash) {
        result.issues.push(issue(entry.path, 'Файл отличается от комплекта этого выпуска. Откройте обычную подготовку для обновления целой старой версии; неизвестные изменения сохранены.'));
        continue;
      }
      if (!current && installed?.hash !== entry.hash) {
        result.issues.push(issue(entry.path, 'Отсутствующий файл относится к другой версии. Нужен исходный комплект этой версии.')); continue;
      }
      if (!current) changes.push({ file: file(entry.path), content: entry.content, mode: entry.mode, label: 'Восстановлен служебный файл: ' + entry.path });
      else if (process.platform !== 'win32' && entry.mode & 0o111 && !(current.mode & 0o111)) changes.push({ file: file(entry.path), content: current.content, mode: current.mode | 0o111, label: 'Восстановлено право запуска: ' + entry.path });
      if (!installed) {
        // Reconcile only a complete byte-identical trusted source tree, never invent missing old-version files.
        repairedManifest.files.push(installationManifest([entry], {}).files[0]); reconcile = true;
      } else {
        if (installed.hash !== entry.hash) reconcile = true;
        Object.assign(repairedManifest.files.find(e => e.kind === 'owned' && e.path === entry.path), { hash: entry.hash, mode: entry.mode });
      }
    }
    for (const extra of scanTree(file('.harness/kit'))) if (!trustedMap.has(path.relative(root, extra).split(path.sep).join('/'))) result.issues.push(issue(path.relative(root, extra), 'В ядре найден дополнительный неизвестный файл. Он сохранён; автоматический ремонт остановлен.'));
    result.checks.push({ label: 'Служебные файлы проверены по комплекту приложения', ok: result.issues.length === 0 });
    // No project code is executed, even when a file is missing or altered.
    if (result.issues.length) return { ...result, changes: [], fingerprint: null };
    for (const entry of repairedManifest.files.filter(e => e.kind === 'managed' && /^AGENTS(?:\.override)?\.md$/.test(e.path))) {
      const current = read(entry.path)?.content.toString();
      if (!current) throw fail('DOCTOR_DOCUMENT', 'Отсутствуют инструкции проекта: ' + entry.path);
      const start = current.indexOf(MD_START), end = current.indexOf(MD_END, start);
      const expected = MD_START + '\n' + trustedMap.get('.harness/kit/templates/AGENTS.md').content.trim() + '\n' + MD_END;
      if (start >= 0 && end >= start && current.slice(start, end + MD_END.length) === expected && entry.section_hash !== hash(expected)) { entry.section_hash = hash(expected); reconcile = true; }
    }
    const hooks = hooksDirectory(root);
    for (const name of ['pre-commit', 'commit-msg', 'post-commit', 'pre-push']) {
      const target = regularPath(path.join(hooks.folder, name)); observed.add(target); const current = readFile(target), content = current?.content.toString() ?? '';
      const generated = hookContent('', name), begin = generated.indexOf(BLOCK_START), end = generated.indexOf(BLOCK_END) + BLOCK_END.length;
      const expected = generated.slice(begin, end);
      if (content.includes(BLOCK_END) && !content.includes(BLOCK_START)) { result.issues.push(issue('Git/' + name, 'Секция проверки повреждена. Содержимое сохранено.')); continue; }
      if (content.includes(BLOCK_START)) {
        const i = content.indexOf(BLOCK_START), j = content.indexOf(BLOCK_END, i);
        if (j < i || content.slice(i, j + BLOCK_END.length) !== expected || content.indexOf(BLOCK_START, i + 1) >= 0) { result.issues.push(issue('Git/' + name, 'Управляемая проверка изменена. Чужой код не перезаписывается.')); continue; }
      } else changes.push({ file: target, content: hookContent(content, name), mode: (current?.mode ?? 0o644) | 0o111, label: 'Восстановлена проверка изменений: ' + name });
      if (current && content.includes(BLOCK_START) && process.platform !== 'win32' && !(current.mode & 0o111)) changes.push({ file: target, content, mode: current.mode | 0o111, label: 'Восстановлено право запуска проверки: ' + name });
    }
    const currentPlanFile = read(PLAN);
    if (!currentPlanFile) throw fail('DOCTOR_PLAN', 'Текущий plan отсутствует. Нужна его резервная копия.');
    const currentRaw = currentPlanFile.content.toString();
    const currentPlan = parsePlan(currentRaw, { projection: false });
    read('.harness/workflow.json'); readConfig(root);
    regularPath(localPath(root, 'transaction.json')); pending = journal(root);
    observed.add(localPath(root, 'transaction.json'));
    if (pending) {
      completed = completedTransaction(root, pending);
      if (!completed) throw fail('DOCTOR_PENDING', 'Осталась незавершённая операция фиксации. Продолжите её исходную задачу; доктор не фиксирует работу автоматически.');
    }
    withPlanFile(root, PLAN, {}, () => resolveReferences(root, currentPlan, pending));
    if (renderPlan(currentPlan) !== currentRaw) changes.push({ file: file(PLAN), content: renderPlan(currentPlan), mode: currentPlanFile.mode, label: 'Восстановлено читаемое представление текущего plan' });
    const required = new Set([...(manifest.required_documents ?? projectContextPaths()),'.harness/plans/todo-plan.template.md',
      ...[currentPlan.context_pack, ...currentPlan.tasks.map(task => task.context_pack)].flatMap(pack => (pack?.documents ?? []).filter(e => e.required).map(e => e.path))]);
    for (const name of required) {
      if (typeof name !== 'string' || path.isAbsolute(name) || name.split(/[\\/]/).includes('..')) throw fail('DOCTOR_PATH','Недопустимый путь документа.');
      if (!read(name)) result.issues.push(issue(name, 'Обязательный документ отсутствует. Восстановите его из своей резервной копии или истории проекта.'));
    }
    if (reconcile) {
      repairedManifest.version = VERSION; repairedManifest.doctor_reconciled_at = new Date().toISOString();
      changes.push({ file: file(MANIFEST), content: json(repairedManifest), mode: manifestBytes.mode, label: 'Установочная запись согласована с проверенным комплектом ' + VERSION });
    }
    result.checks.push({ label: 'План и обязательные документы', ok: result.issues.length === 0 });
    observed.add(gitPath(root, 'index'));
    result.fingerprint = digest(JSON.stringify({ head: head(root), files: [...observed].sort().map(file => [file, signature(file)]) }));
    result.repairs = changes.map(c => c.label);
    if (completed) result.repairs.push('Завершён журнал уже подтверждённого коммита');
    return { ...result, changes: result.issues.length ? [] : changes, pending, completed };
  } catch (error) { result.issues.push(display(error)); return { ...result, changes: [], fingerprint: null }; }
}
export function publicReport(result) { const { changes, pending, completed, ...report } = result; return report; }
export function repairProject(workspace, expectedFingerprint) {
  const first = inspectProject(workspace);
  if (first.issues.length) return { ...publicReport(first), repairs: [] };
  return locked(first.workspace, () => {
    const next = inspectProject(first.workspace);
    if (next.issues.length) return { ...publicReport(next), repairs: [] };
    if (next.fingerprint !== first.fingerprint || expectedFingerprint && next.fingerprint !== expectedFingerprint) throw fail('DOCTOR_CHANGED', 'Проект изменился после проверки. Повторите запуск доктора.');
    const root = next.workspace;
    let changes = next.changes;
    // A confirmed commit journal is backed up before its metadata is finalized.
    if (next.completed && !changes.length) changes = [{ file: path.join(root, next.pending.plan_path ?? PLAN), content: readFile(path.join(root, next.pending.plan_path ?? PLAN)).content, mode: readFile(path.join(root, next.pending.plan_path ?? PLAN)).mode, label: 'Сохранён план перед завершением журнала' }];
    const backupPath = backupAndWrite(root, changes, [path.join(root, PLAN), path.join(root, MANIFEST), ...(next.pending ? ['transaction.json','index-before','last-verification.json','last-commit.json'].map(name => localPath(root,name)) : [])]);
    if (next.completed) withPlanFile(root, next.pending.plan_path ?? PLAN, {}, () => finishTransaction(root, next.pending, next.completed));
    return { ...publicReport(inspectProject(root)), repairs: next.repairs, backupPath, repaired: Boolean(changes.length || next.completed) };
  });
}
