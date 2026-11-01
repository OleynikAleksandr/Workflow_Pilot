import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { RuntimeError } from '../../contracts/errors.mjs';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME = /^context-\d{2,}-of-\d{2,}\.md$/;
const SEGMENTS = ['.harness', 'runtime', 'inbox'];
const digest = data => createHash('sha256').update(data).digest('hex');
const fail = (code, message) => { throw new RuntimeError(code, message); };

async function entry(file) {
  try { return await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Every segment below the workspace must be a real directory, never a link.
async function directoryChain(workspace, segments, { create }) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) fail('CONTEXT_FILES_PATH', 'Нужен абсолютный путь рабочей копии.');
  const root = await entry(workspace);
  if (!root?.isDirectory() && !root?.isSymbolicLink()) fail('CONTEXT_FILES_PATH', 'Рабочая копия получателя не найдена.');
  let current = workspace;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stat = await entry(current);
    if (!stat) {
      if (!create) return null;
      try { await fs.mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      stat = await entry(current);
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('CONTEXT_FILES_PATH', 'Каталог комплекта ведёт по символической ссылке или не является каталогом: ' + current);
  }
  return current;
}

// Immutable write-once bundle: equal bytes are reused, different bytes are a conflict.
export async function writeContextFiles({ workspace, messageId, files }) {
  if (!ID.test(messageId ?? '')) fail('CONTEXT_FILES_PATH', 'Неверный идентификатор сообщения комплекта.');
  if (!Array.isArray(files) || !files.length || files.some(f => !NAME.test(f?.name ?? '') || typeof f.text !== 'string'))
    fail('CONTEXT_FILES_INVALID', 'Комплект файлов пуст или повреждён.');
  const directory = await directoryChain(workspace, [...SEGMENTS, messageId.toLowerCase()], { create: true });
  const written = [];
  for (const file of files) {
    const target = path.join(directory, file.name), bytes = Buffer.from(file.text, 'utf8'), sha256 = digest(bytes);
    const existing = await entry(target);
    if (existing) {
      if (existing.isSymbolicLink() || !existing.isFile()) fail('CONTEXT_FILES_PATH', 'Файл комплекта не является обычным файлом: ' + target);
      if (digest(await fs.readFile(target)) !== sha256) fail('CONTEXT_FILES_CONFLICT', 'Файл комплекта уже существует с другим содержимым: ' + target);
    } else {
      const temporary = path.join(directory, '.' + file.name + '.' + randomUUID() + '.tmp');
      try {
        await fs.writeFile(temporary, bytes, { flag: 'wx' });
        await fs.rename(temporary, target);
      } finally { await fs.rm(temporary, { force: true }); }
      if (digest(await fs.readFile(target)) !== sha256) fail('CONTEXT_FILES_CONFLICT', 'Записанный файл комплекта не совпал по SHA-256: ' + target);
    }
    written.push({ index: file.index, name: file.name, path: target, bytes: bytes.length });
  }
  return { workdir: workspace, directory, files: written };
}

// Removes only UUID-named bundle directories that are not kept; links are never followed.
export async function pruneContextFiles({ workspace, keep = [] }) {
  const inbox = await directoryChain(workspace, SEGMENTS, { create: false });
  if (!inbox) return { removed: [] };
  const retained = new Set([...keep].map(id => String(id).toLowerCase())), removed = [];
  for (const name of await fs.readdir(inbox)) {
    if (!ID.test(name) || retained.has(name.toLowerCase())) continue;
    const target = path.join(inbox, name), stat = await entry(target);
    if (!stat?.isDirectory() || stat.isSymbolicLink()) continue;
    await fs.rm(target, { recursive: true, force: true });
    removed.push(name);
  }
  return { removed };
}
