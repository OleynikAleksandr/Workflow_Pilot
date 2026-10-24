import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream, existsSync } from 'node:fs';
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
  existsSync(file) { return existsSync(absolute(file)); }
  access(file, mode) { return fs.access(absolute(file), mode); }
  readFile(file, options) { return fs.readFile(absolute(file), options); }
  writeFile(file, data, options) { return fs.writeFile(absolute(file), data, options); }
  appendFile(file, data, options) { return fs.appendFile(absolute(file), data, options); }
  rename(from, to) { return fs.rename(absolute(from), absolute(to)); }
  async syncDirectory(file) {
    absolute(file);
    if(process.platform==='win32')return;
    const handle=await fs.open(file,'r');try{await handle.sync();}finally{await handle.close();}
  }
  realpath(file) { return fs.realpath(absolute(file)); }
  lstat(file, options) { return fs.lstat(absolute(file), options); }
  stat(file, options) { return fs.stat(absolute(file), options); }
  readdir(file, options) { return fs.readdir(absolute(file), options); }
  mkdir(file, options) { return fs.mkdir(absolute(file), options); }
  rm(file, options) { return fs.rm(absolute(file), options); }
  rmdir(file, options) { return fs.rmdir(absolute(file), options); }
  unlink(file) { return fs.unlink(absolute(file)); }
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
