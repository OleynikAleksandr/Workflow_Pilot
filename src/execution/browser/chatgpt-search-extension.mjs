import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import yauzl from 'yauzl';
import { SEARCH_EXTENSION_PIN } from './search-extension-pin.mjs';

const PREFIX = 'CHATGPT_SEARCH_EXTENSION_';
const messages = {
  DOWNLOAD: 'Не удалось загрузить официальное расширение ChatGPT search. Проверьте интернет и повторите открытие ChatGPT.',
  INTEGRITY: 'Проверка официального расширения ChatGPT search не пройдена. Непроверенная копия не подключена.',
  CACHE_UNSAFE: 'Каталог расширения ChatGPT search недоступен или содержит символическую ссылку.',
  INSTALL: 'Не удалось сохранить расширение ChatGPT search. Проверьте доступ к служебному каталогу приложения.',
  LOAD: 'Не удалось подключить расширение ChatGPT search к браузеру. Повторите открытие ChatGPT.',
};
const fail = (kind, cause) => Object.assign(new Error(messages[kind], cause ? { cause } : undefined), { code: PREFIX + kind });
const ownError = error => typeof error?.code === 'string' && error.code.startsWith(PREFIX);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const matches = (bytes, expected) => !!expected && bytes.length === expected.bytes && digest(bytes) === expected.sha256;
const canonical = value => process.platform === 'darwin' ? path.resolve(value).replace(/^\/(var|tmp)(?=\/|$)/, '/private/$1') : path.resolve(value);
const allowedUrl = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port
    && ['clients2.google.com', 'clients2.googleusercontent.com'].includes(u.hostname); } catch { return false; }
};
async function stat(file) { try { return await fs.lstat(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
async function plainDirectory(directory, create = false) {
  let current = path.parse(directory).root;
  for (const part of path.relative(current, directory).split(path.sep).filter(Boolean)) {
    current = path.join(current, part); let s = await stat(current);
    if (!s && create) { await fs.mkdir(current, { mode: 0o700 }).catch(e => { if (e.code !== 'EEXIST') throw e; }); s = await stat(current); }
    if (!s?.isDirectory() || s.isSymbolicLink()) throw fail('CACHE_UNSAFE');
  }
}
async function syncDirectory(directory) {
  if (process.platform === 'win32') return;
  const file = await fs.open(directory, 'r'); try { await file.sync(); } finally { await file.close(); }
}
function manifestMatches(bytes, pin) {
  try { const m = JSON.parse(bytes.toString('utf8')); return m.name === pin.name && m.version === pin.version && m.manifest_version === 3
    && !m.background && m.content_scripts?.length === 1 && m.content_scripts[0].run_at === 'document_start'
    && JSON.stringify(m.content_scripts[0].matches) === '["https://*.chatgpt.com/*"]'
    && JSON.stringify(m.content_scripts[0].js) === '["content_script.js"]'; } catch { return false; }
}

// The hash is checked before ZIP parsing. Even the reviewed package is subject to entry/path/size checks.
export async function unpackSearchExtension(bytes, pin = SEARCH_EXTENSION_PIN) {
  if (!matches(bytes, pin) || bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'Cr24' || bytes.readUInt32LE(4) !== 3) throw fail('INTEGRITY');
  const offset = 12 + bytes.readUInt32LE(8);
  if (offset > bytes.length - 4 || bytes.readUInt32LE(offset) !== 0x04034b50) throw fail('INTEGRITY');
  const expected = { ...pin.files, ...pin.archiveOnlyFiles }, names = new Set(), directories = new Set();
  for (const name of Object.keys(expected)) { let d = path.posix.dirname(name); while (d !== '.') { directories.add(d + '/'); d = path.posix.dirname(d); } }
  try {
    const zip = await new Promise((resolve, reject) => yauzl.fromBuffer(bytes.subarray(offset),
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true }, (e, value) => e ? reject(e) : resolve(value)));
    const result = new Map();
    await new Promise((resolve, reject) => {
      let stopped = false;
      const stop = error => { if (!stopped) { stopped = true; zip.close(); reject(error); } };
      zip.on('error', stop); zip.on('end', resolve);
      zip.on('entry', entry => { void (async () => {
        const name = entry.fileName, mode = (entry.externalFileAttributes >>> 16) & 0o170000;
        if (names.has(name) || ![0, 0o100000, 0o040000].includes(mode) || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || /^[A-Za-z]:/.test(name)) throw fail('INTEGRITY');
        names.add(name);
        if (name.endsWith('/')) { if (!directories.has(name)) throw fail('INTEGRITY'); zip.readEntry(); return; }
        if (!expected[name] || entry.uncompressedSize !== expected[name].bytes) throw fail('INTEGRITY');
        const stream = await new Promise((done, no) => zip.openReadStream(entry, (e, value) => e ? no(e) : done(value)));
        const chunks = []; let length = 0;
        for await (const chunk of stream) { length += chunk.length; if (length > expected[name].bytes) throw fail('INTEGRITY'); chunks.push(chunk); }
        const content = Buffer.concat(chunks);
        if (!matches(content, expected[name])) throw fail('INTEGRITY');
        result.set(name, content); zip.readEntry();
      })().catch(stop); });
      zip.readEntry();
    });
    if (Object.keys(expected).some(name => !result.has(name)) || !manifestMatches(result.get('manifest.json'), pin)) throw fail('INTEGRITY');
    return new Map([...result].filter(([name]) => Object.hasOwn(pin.files, name)));
  } catch { throw fail('INTEGRITY'); }
}

export class ChatGPTSearchExtension {
  constructor({ session, directory, fetch: request = globalThis.fetch, pin = SEARCH_EXTENSION_PIN, timeoutMs = 30000 }) {
    Object.assign(this, { session, request, pin, timeoutMs });
    this.directory = canonical(directory);
    this.installation = path.join(this.directory, pin.version + '-' + pin.sha256.slice(0, 16));
    this.extensionPath = path.join(this.installation, 'extension');
    this.pending = null; this.loadedId = null;
  }
  prepareNavigation(url) {
    try { if (new URL(url).origin !== 'https://chatgpt.com') return Promise.resolve(null); } catch { return Promise.resolve(null); }
    return this.ensure();
  }
  ensure() {
    if (!this.pending) this.pending = this.#ensure().finally(() => { this.pending = null; });
    return this.pending;
  }
  async #download() {
    const signal = AbortSignal.timeout(this.timeoutMs); let url = this.pin.url;
    try {
      for (let redirects = 0; redirects <= 3; redirects++) {
        if (!allowedUrl(url)) throw fail('DOWNLOAD');
        const response = await this.request(url, { signal, redirect: 'manual', credentials: 'omit' });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const next = response.headers.get('location'); await response.body?.cancel();
          if (!next) throw fail('DOWNLOAD'); url = new URL(next, url).href; continue;
        }
        if (response.status !== 200 || !response.body || Number(response.headers.get('content-length')) > this.pin.bytes) throw fail('DOWNLOAD');
        const chunks = []; let length = 0;
        for await (const chunk of response.body) { length += chunk.length; if (length > this.pin.bytes) throw fail('INTEGRITY'); chunks.push(Buffer.from(chunk)); }
        const bytes = Buffer.concat(chunks); if (!matches(bytes, this.pin)) throw fail('INTEGRITY'); return bytes;
      }
      throw fail('DOWNLOAD');
    } catch (error) { throw ownError(error) ? error : fail('DOWNLOAD'); }
  }
  async #verify() {
    const root = await stat(this.installation); if (!root) return false;
    await plainDirectory(this.installation);
    const extension = await stat(this.extensionPath); if (!extension) return false;
    await plainDirectory(this.extensionPath);
    if (JSON.stringify((await fs.readdir(this.installation)).sort()) !== '["extension","package.crx"]') return false;
    const archive = await stat(path.join(this.installation, 'package.crx'));
    if (archive?.isSymbolicLink()) throw fail('CACHE_UNSAFE');
    if (!archive?.isFile() || archive.size !== this.pin.bytes || !matches(await fs.readFile(path.join(this.installation, 'package.crx')), this.pin)) return false;
    const actual = [];
    const walk = async (directory, prefix = '') => {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const name = prefix + entry.name, file = path.join(directory, entry.name), s = await fs.lstat(file);
        if (s.isSymbolicLink()) throw fail('CACHE_UNSAFE');
        if (s.isDirectory()) {
          if (!Object.keys(this.pin.files).some(f => f.startsWith(name + '/'))) return false;
          if (!await walk(file, name + '/')) return false;
        } else {
          if (!s.isFile() || s.size !== this.pin.files[name]?.bytes || !matches(await fs.readFile(file), this.pin.files[name])) return false;
          actual.push(name);
        }
      }
      return true;
    };
    return await walk(this.extensionPath) && JSON.stringify(actual.sort()) === JSON.stringify(Object.keys(this.pin.files).sort());
  }
  async #install() {
    const bytes = await this.#download(), contents = await unpackSearchExtension(bytes, this.pin);
    const temp = await fs.mkdtemp(path.join(this.directory, '.install-'));
    try {
      await fs.mkdir(path.join(temp, 'extension'), { mode: 0o700 });
      await fs.writeFile(path.join(temp, 'package.crx'), bytes, { mode: 0o600, flag: 'wx', flush: true });
      for (const [name, content] of contents) {
        const file = path.join(temp, 'extension', name); await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
        await fs.writeFile(file, content, { mode: 0o600, flag: 'wx', flush: true });
      }
      await fs.rename(temp, this.installation); await syncDirectory(this.directory);
    } finally { await fs.rm(temp, { recursive: true, force: true }); }
  }
  async #ensure() {
    const api = this.session.extensions;
    if (!this.session.isPersistent?.() || typeof api?.loadExtension !== 'function' || typeof api?.getExtension !== 'function') throw fail('LOAD');
    try {
      await plainDirectory(this.directory, true);
      if (!await this.#verify()) {
        if (this.loadedId && api.getExtension(this.loadedId)) { api.removeExtension(this.loadedId); this.loadedId = null; }
        if (await stat(this.installation)) await fs.rename(this.installation, this.installation + '.rejected-' + randomUUID());
        await this.#install();
      }
      if (!await this.#verify()) throw fail('INTEGRITY');
    } catch (error) { throw ownError(error) ? error : fail('INSTALL', error); }
    try {
      let extension = this.loadedId && api.getExtension(this.loadedId);
      if (!extension) extension = await api.loadExtension(this.extensionPath);
      if (extension.name !== this.pin.name || extension.version !== this.pin.version || canonical(extension.path) !== this.extensionPath) throw fail('LOAD');
      this.loadedId = extension.id;
      return { ready: true, version: this.pin.version, officialId: this.pin.officialId };
    } catch { throw fail('LOAD'); }
  }
}
