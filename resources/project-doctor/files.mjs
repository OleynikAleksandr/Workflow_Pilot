import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const fail = (code, message) => Object.assign(new Error(message), { code });
export function regularPath(file) {
  const absolute = path.resolve(file);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let stat; try { stat = fs.lstatSync(cursor); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink()) throw fail('DOCTOR_SYMLINK', 'Служебный путь является ссылкой: ' + cursor);
    if (cursor !== absolute && !stat.isDirectory()) throw fail('DOCTOR_PATH', 'Служебный путь занят файлом: ' + cursor);
  }
  return absolute;
}
export function readFile(file) {
  regularPath(file);
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024) throw fail('DOCTOR_FILE', 'Нужен обычный служебный файл размером до 16 МБ: ' + file);
    return { content: fs.readFileSync(file), mode: stat.mode & 0o777 };
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export const signature = file => { const value = readFile(file); return value ? digest(Buffer.concat([Buffer.from(value.mode + '\n'), value.content])) : null; };
function atomicWrite(file, content, mode = 0o644) {
  regularPath(file); fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.doctor-' + randomUUID();
  try { fs.writeFileSync(temporary, content, { mode, flag: 'wx' }); fs.chmodSync(temporary, mode); fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
export function backupAndWrite(root, changes, extraFiles = []) {
  if (!changes.length) return null;
  const folder = regularPath(path.join(root, '.harness/runtime/doctor', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID()));
  fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
  const entries = [...new Set([...changes.map(c => c.file), ...extraFiles])].map((file, index) => {
    const value = readFile(file); const backup = value ? `${index}.backup` : null;
    if (value) fs.writeFileSync(path.join(folder, backup), value.content, { mode: 0o600, flag: 'wx' });
    return { file, backup, mode: value?.mode, before: signature(file) };
  });
  const record = { schema: 1, workspace: root, status: 'prepared', entries, changes: changes.map(c => ({ file: c.file, label: c.label })) };
  const journal = () => atomicWrite(path.join(folder, 'repair.json'), JSON.stringify(record, null, 2) + '\n', 0o600);
  journal(); const written = [];
  try {
    for (const change of changes) {
      const original = entries.find(e => e.file === change.file);
      if (signature(change.file) !== original.before) throw fail('DOCTOR_CHANGED', 'Файл изменился во время ремонта. Повторите проверку: ' + change.file);
      atomicWrite(change.file, change.content, change.mode);
      written.push({ file: change.file, after: signature(change.file) });
    }
    record.status = 'applied'; journal();
  } catch (error) {
    record.status = 'failed'; record.code = error.code ?? 'WRITE_FAILED'; record.rollbackConflicts = [];
    for (const change of written.reverse()) {
      try {
        if (signature(change.file) !== change.after) { record.rollbackConflicts.push(change.file); continue; }
        const original = entries.find(e => e.file === change.file);
        if (original.backup) atomicWrite(change.file, fs.readFileSync(path.join(folder, original.backup)), original.mode);
        else fs.unlinkSync(change.file);
      } catch { record.rollbackConflicts.push(change.file); }
    }
    journal(); error.backupPath = folder; throw error;
  }
  return folder;
}
