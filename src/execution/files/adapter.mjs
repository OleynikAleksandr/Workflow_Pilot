import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { RuntimeError } from '../../contracts/errors.mjs';

export async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function exists(file, { strict = false } = {}) {
  try { await fs.access(file); return true; }
  catch (error) { if (strict && error.code !== 'ENOENT') throw error; return false; }
}
const absolute = file => {
  if (typeof file !== 'string' || !path.isAbsolute(file))
    throw new RuntimeError('EXECUTION_PATH_INVALID', 'Нужен абсолютный путь.');
  return file;
};
export class FileAdapter {
  readText(file) { return fs.readFile(absolute(file), 'utf8'); }
  async readJson(file) { return JSON.parse(await this.readText(file)); }
  canonicalPath(file) { return fs.realpath(absolute(file)); }
  removeFile(file) { return fs.unlink(absolute(file)); }
  async writeJson(file, value, { exclusive = false } = {}) {
    absolute(file);
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const text = JSON.stringify(value, null, 2) + '\n';
    if (exclusive) return fs.writeFile(file, text, { mode: 0o600, flag: 'wx' });
    const temporary = file + '.tmp-' + randomUUID();
    try {
      await fs.writeFile(temporary, text, { mode: 0o600, flag: 'wx' });
      await fs.rename(temporary, file);
    } finally { await fs.rm(temporary, { force: true }); }
  }
}
export const desktopFiles = new FileAdapter();
