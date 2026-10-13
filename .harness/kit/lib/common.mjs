import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const VERSION = '1.7.2';
export const PLAN = '.harness/plans/todo-plan.md';
export const CONFIG = '.harness/workflow.json';
export const MANIFEST = '.harness/kit-manifest.json';
export const INDEX = 'docs/DOCUMENTATION_INDEX.md';

export class WorkflowError extends Error {
  constructor(code, message, details = {}) {
    super(message); this.code = code; this.details = details;
  }
}
export function check(condition, code, message, details) {
  if (!condition) throw new WorkflowError(code, message, details);
}
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export const id = () => crypto.randomUUID();
export const json = value => JSON.stringify(value, null, 2) + '\n';
export function atomic(file, data, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + id();
  try {
    fs.writeFileSync(temporary, data, { mode: mode ?? (fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o644) });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
export function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new WorkflowError('INVALID_JSON', 'Не удалось прочитать JSON: ' + file, { reason: e.message }); }
}
export function relativePath(value, platform = process.platform) {
  check(typeof value === 'string' && value.length > 0 && !value.includes('\0') && !value.includes('\n') && !value.includes('\r'), 'INVALID_PATH', 'Некорректный путь.');
  check(!path.isAbsolute(value) && !value.split('/').some(p => p === '..' || p === '' || p === '.') && !value.includes('\\') && !value.includes(':'), 'INVALID_PATH', 'Требуется относительный путь внутри проекта: ' + value);
  if (platform === 'win32') check(value.split('/').every(p => !/[<>"|?*\x00-\x1f]|[. ]$/.test(p) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)), 'INVALID_PATH', 'Имя файла недопустимо в Windows: ' + value);
  check(!value.split('/').includes('.git'), 'PROTECTED_PATH', 'Служебный каталог Git не входит в scope.');
  return value;
}
export function safePath(root, value) {
  relativePath(value);
  const target = path.resolve(root, value);
  const realRoot = fs.realpathSync(root);
  let current = root;
  for (const part of value.split('/')) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stat) {
      check(!stat?.isSymbolicLink(), 'SYMLINK_PATH', 'Workflow не следует по символическим ссылкам: ' + value);
      const resolved = fs.realpathSync(current);
      check(resolved === realRoot || resolved.startsWith(realRoot + path.sep), 'PATH_ESCAPE', 'Путь вышел за границы проекта.');
    }
  }
  return target;
}
export function textFile(root, value, max = 1024 * 1024) {
  const file = safePath(root, value);
  check(fs.existsSync(file), 'MISSING_FILE', 'Отсутствует обязательный файл: ' + value);
  const st = fs.statSync(file);
  check(st.isFile() && st.size <= max, 'FILE_TOO_LARGE', 'Файл не является текстовым файлом допустимого размера: ' + value);
  const bytes = fs.readFileSync(file);
  check(!bytes.includes(0), 'BINARY_CONTEXT', 'Бинарный файл нельзя включить как текст: ' + value);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
export const isPrivate = p => /(^|\/)(\.env(?:\..*)?|auth(?:\..*)?|credentials(?:\..*)?|secrets?(?:\..*)?|id_rsa|id_ed25519|node_modules|\.codex|\.git)(\/|$)|\.(pem|key|p12)$/i.test(p) || p.startsWith('.harness/runtime/');
export function contextPath(root, p) {
  check(!isPrivate(p), 'PRIVATE_CONTEXT', 'Локальные секреты и runtime не включаются в контекст: ' + p);
  return safePath(root, p);
}
export function withLock(file, fn) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let fd;
  try { fd = fs.openSync(file, 'wx'); }
  catch { throw new WorkflowError('WORKFLOW_LOCKED', 'Другая операция удерживает блокировку. Проверьте процесс; блокировка не снимается автоматически.', { lock: file }); }
  try { fs.writeFileSync(fd, json({ pid: process.pid, created_at: new Date().toISOString() })); return fn(); }
  finally { fs.closeSync(fd); fs.unlinkSync(file); }
}
export function errorResult(e) { return { ok: false, code: e.code ?? 'INTERNAL_ERROR', message: e.message, details: e.details ?? {} }; }

// Invocation-local addressing; selecting a UI row never changes command ownership.
const planContext = new AsyncLocalStorage();
export const currentPlanSelection = () => planContext.getStore() ?? null;
export function planPath(root) {
  const selected = currentPlanSelection();
  return selected && path.resolve(root) === selected.root ? selected.file : PLAN;
}
export function withPlanFile(root, file, metadata, fn) {
  safePath(root, file);
  return planContext.run({ ...metadata, root: path.resolve(root), file }, fn);
}
