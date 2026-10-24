import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { ChatGPTSearchExtension, unpackSearchExtension } from '../src/execution/browser/chatgpt-search-extension.mjs';
import { SEARCH_EXTENSION_PIN } from '../src/execution/browser/search-extension-pin.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = { name: 'ChatGPT search', version: '1.11', manifest_version: 3,
  content_scripts: [{ matches: ['https://*.chatgpt.com/*'], js: ['content_script.js'], run_at: 'document_start' }] };
const records = { 'manifest.json': Buffer.from(JSON.stringify(manifest)), 'content_script.js': Buffer.from('globalThis.fixtureExtension = true;\n') };
function archive(entries = Object.entries(records).map(([name, bytes]) => ({ name, bytes }))) {
  const local = [], central = []; let offset = 0;
  for (const { name, bytes, mode = 0o100600 } of entries) {
    const n = Buffer.from(name), h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4);
    h.writeUInt32LE(crc32(bytes), 14); h.writeUInt32LE(bytes.length, 18); h.writeUInt32LE(bytes.length, 22); h.writeUInt16LE(n.length, 26);
    local.push(h, n, bytes);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(0x0314, 4); c.writeUInt16LE(20, 6);
    c.writeUInt32LE(crc32(bytes), 16); c.writeUInt32LE(bytes.length, 20); c.writeUInt32LE(bytes.length, 24); c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE((mode * 65536) >>> 0, 38); c.writeUInt32LE(offset, 42); central.push(c, n); offset += h.length + n.length + bytes.length;
  }
  const c = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(c.length, 12); end.writeUInt32LE(offset, 16);
  const crx = Buffer.alloc(12); crx.write('Cr24'); crx.writeUInt32LE(3, 4);
  return Buffer.concat([crx, ...local, c, end]);
}
function pin(bytes = archive(), files = records) {
  return { officialId: SEARCH_EXTENSION_PIN.officialId, name: manifest.name, version: manifest.version,
    url: 'https://clients2.googleusercontent.com/crx/fixture.crx', bytes: bytes.length, sha256: hash(bytes),
    files: Object.fromEntries(Object.entries(files).map(([name, b]) => [name, { bytes: b.length, sha256: hash(b) }])) };
}
function session({ persistent = true, failure = null } = {}) {
  const extensions = new Map(), calls = [];
  const api = { failure, isPersistent: () => persistent, calls, extensions: {
    getExtension: id => extensions.get(id), removeExtension: id => extensions.delete(id),
    loadExtension: async file => { calls.push(file); if (api.failure) throw api.failure;
      const m = JSON.parse(await fs.readFile(path.join(file, 'manifest.json'), 'utf8'));
      const item = { id: 'fixture-extension', path: file, name: m.name, version: m.version }; extensions.set(item.id, item); return item; },
  } }; return api;
}
async function fixture(t, options = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'wp-extension-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bytes = archive(), p = pin(bytes), ses = session(); let requests = 0;
  const request = async () => { requests++; return new Response(bytes); };
  const manager = new ChatGPTSearchExtension({ session: ses, directory: path.join(root, 'extensions'), pin: p,
    fetch: request, ...options });
  return { root, bytes, pin: p, ses, manager, requests: () => requests };
}
const code = suffix => ({ code: 'CHATGPT_SEARCH_EXTENSION_' + suffix });

test('official pin includes an immutable versioned Google blob and a complete executable payload', () => {
  assert.equal(SEARCH_EXTENSION_PIN.officialId, 'ejcfepkfckglbgocfkanmcdngdijcgld');
  assert.equal(SEARCH_EXTENSION_PIN.version, '1.11'); assert.equal(SEARCH_EXTENSION_PIN.bytes, 12091);
  assert.match(SEARCH_EXTENSION_PIN.url, /^https:\/\/clients2\.googleusercontent\.com\/crx\/blobs\//);
  assert.match(SEARCH_EXTENSION_PIN.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(SEARCH_EXTENSION_PIN.files).sort(), ['content_script.js', 'images/icon128.png', 'images/icon16.png', 'images/icon19.png', 'images/icon38.png', 'images/icon48.png', 'manifest.json']);
});
test('cold installation is shared, exact and atomic; loaded extension is reused without network', async t => {
  const f = await fixture(t); const result = await Promise.all([f.manager.ensure(), f.manager.ensure(), f.manager.prepareNavigation('https://chatgpt.com/?q=private')]);
  assert.ok(result.every(r => r.ready)); assert.equal(f.requests(), 1); assert.equal(f.ses.calls.length, 1);
  assert.deepEqual(await fs.readFile(path.join(f.manager.extensionPath, 'content_script.js')), records['content_script.js']);
  await f.manager.ensure(); assert.equal(f.requests(), 1); assert.equal(f.ses.calls.length, 1);
  assert.deepEqual(await fs.readdir(f.manager.directory), [path.basename(f.manager.installation)]);
});
test('a new backend loads a verified cache offline; an unloaded extension is loaded again', async t => {
  const f = await fixture(t); await f.manager.ensure(); const ses = session();
  const restarted = new ChatGPTSearchExtension({ session: ses, directory: f.manager.directory, pin: f.pin, fetch: () => { throw Error('network forbidden'); } });
  await restarted.ensure(); assert.equal(ses.calls.length, 1); ses.extensions.removeExtension('fixture-extension');
  await restarted.ensure(); assert.equal(ses.calls.length, 2);
});
test('foreign navigation and unsupported/nonpersistent sessions never download', async t => {
  const f = await fixture(t); assert.equal(await f.manager.prepareNavigation('https://example.com/?q=x'), null);
  assert.equal(await f.manager.prepareNavigation('broken'), null); assert.equal(f.requests(), 0);
  for (const ses of [session({ persistent: false }), { isPersistent: () => true, extensions: {} }]) {
    const manager = new ChatGPTSearchExtension({ session: ses, directory: f.manager.directory, pin: f.pin, fetch: () => { throw Error('must not download'); } });
    await assert.rejects(manager.ensure(), code('LOAD'));
  }
});
test('tampered or missing cached payload is quarantined and repaired before another load', async t => {
  for (const kind of ['script', 'archive', 'extra', 'missing-directory']) {
    const f = await fixture(t); await f.manager.ensure();
    if (kind === 'script') await fs.writeFile(path.join(f.manager.extensionPath, 'content_script.js'), 'malicious');
    if (kind === 'archive') await fs.writeFile(path.join(f.manager.installation, 'package.crx'), 'broken');
    if (kind === 'extra') await fs.writeFile(path.join(f.manager.extensionPath, 'extra.js'), 'unknown');
    if (kind === 'missing-directory') await fs.rm(f.manager.extensionPath, { recursive: true });
    await f.manager.ensure(); assert.equal(f.requests(), 2); assert.equal(f.ses.calls.length, 2);
    assert.equal((await fs.readdir(f.manager.directory)).filter(n => n.includes('.rejected-')).length, 1);
  }
});
test('cache symlinks, including a parent, are rejected without writing through them', async t => {
  const f = await fixture(t); await f.manager.ensure(); const target = path.join(f.root, 'outside'); await fs.mkdir(target);
  await fs.rm(f.manager.extensionPath, { recursive: true }); await fs.symlink(target, f.manager.extensionPath, 'dir');
  await assert.rejects(f.manager.ensure(), code('CACHE_UNSAFE')); assert.deepEqual(await fs.readdir(target), []);
  const alias = path.join(f.root, 'alias'); await fs.symlink(target, alias, 'dir');
  const manager = new ChatGPTSearchExtension({ session: f.ses, directory: path.join(alias, 'cache'), pin: f.pin, fetch: () => { throw Error('network'); } });
  await assert.rejects(manager.ensure(), code('CACHE_UNSAFE')); assert.deepEqual(await fs.readdir(target), []);
});
test('a failed load is retryable from the checked cache without downloading again', async t => {
  const f = await fixture(t); f.ses.failure = Error('API failed'); await assert.rejects(f.manager.ensure(), code('LOAD'));
  f.ses.failure = null; await f.manager.ensure(); assert.equal(f.requests(), 1); assert.equal(f.ses.calls.length, 2);
});
test('wrong/truncated/oversized downloads never install or invoke Electron', async t => {
  const bad = [Buffer.from('wrong'), Buffer.alloc(128000)];
  for (const bytes of bad) {
    const f = await fixture(t, { fetch: async () => new Response(bytes) });
    await assert.rejects(f.manager.ensure(), code('INTEGRITY')); assert.equal(f.ses.calls.length, 0);
    assert.deepEqual(await fs.readdir(f.manager.directory), []);
  }
  const f = await fixture(t, { fetch: async () => new Response(null, { status: 503 }) });
  await assert.rejects(f.manager.ensure(), code('DOWNLOAD'));
});
test('redirects stay HTTPS on Google, are bounded, and requests omit browser credentials', async t => {
  const bytes = archive(), requested = [];
  const f = await fixture(t, { fetch: async (url, options) => {
    requested.push(url); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'manual');
    return requested.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://clients2.googleusercontent.com/crx/next' } }) : new Response(bytes);
  } }); await f.manager.ensure(); assert.equal(requested.length, 2);
  for (const location of ['http://clients2.googleusercontent.com/x', 'https://example.com/x', 'https://user:pass@clients2.googleusercontent.com/x', 'https://clients2.googleusercontent.com:444/x']) {
    let count = 0; const bad = await fixture(t, { fetch: async () => { count++; return new Response(null, { status: 302, headers: { location } }); } });
    await assert.rejects(bad.manager.ensure(), code('DOWNLOAD')); assert.equal(count, 1);
  }
  let count = 0; const loop = await fixture(t, { fetch: async () => { count++; return new Response(null, { status: 302, headers: { location: '/loop' } }); } });
  await assert.rejects(loop.manager.ensure(), code('DOWNLOAD')); assert.equal(count, 4);
});
test('download timeout is bounded, exposes no raw URL, and can be retried', async t => {
  const f = await fixture(t, { timeoutMs: 5, fetch: (_url, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('unexpected late response')), 100);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  }) }); await assert.rejects(f.manager.ensure(), e => e.code === code('DOWNLOAD').code && !e.message.includes('https://'));
  f.manager.request = async () => new Response(f.bytes); await f.manager.ensure();
});
test('a competing target is preserved when atomic rename fails; only owned temporary files are removed', async t => {
  const f = await fixture(t); f.manager.request = async () => {
    await fs.mkdir(f.manager.installation); await fs.writeFile(path.join(f.manager.installation, 'preserve.txt'), 'owned by another attempt');
    return new Response(f.bytes);
  }; await assert.rejects(f.manager.ensure(), code('INSTALL'));
  assert.equal(await fs.readFile(path.join(f.manager.installation, 'preserve.txt'), 'utf8'), 'owned by another attempt');
  assert.equal((await fs.readdir(f.manager.directory)).some(n => n.startsWith('.install-')), false); assert.equal(f.ses.calls.length, 0);
});
test('ZIP rejects traversal, absolute/backslash paths, duplicates, symlinks and unexpected files even with a matching container hash', async () => {
  for (const extra of [{ name: '../escape', bytes: Buffer.from('x') }, { name: '/escape', bytes: Buffer.from('x') },
    { name: 'C:/escape', bytes: Buffer.from('x') }, { name: 'a\\escape', bytes: Buffer.from('x') },
    { name: 'content_script.js', bytes: records['content_script.js'] }, { name: 'linked', bytes: Buffer.from('x'), mode: 0o120777 }, { name: 'extra.js', bytes: Buffer.from('x') }]) {
    const bytes = archive([...Object.entries(records).map(([name, bytes]) => ({ name, bytes })), extra]);
    await assert.rejects(unpackSearchExtension(bytes, pin(bytes)), code('INTEGRITY'));
  }
});
test('ZIP rejects inconsistent manifest, absent payload, incorrect inner digest and CRX header', async () => {
  for (const change of [{ version: '9.9' }, { background: { service_worker: 'extra.js' } }, { content_scripts: [] }]) {
    const files = { ...records, 'manifest.json': Buffer.from(JSON.stringify({ ...manifest, ...change })) };
    const bytes = archive(Object.entries(files).map(([name, bytes]) => ({ name, bytes })));
    await assert.rejects(unpackSearchExtension(bytes, pin(bytes, files)), code('INTEGRITY'));
  }
  const bytes = archive([{ name: 'manifest.json', bytes: records['manifest.json'] }]);
  await assert.rejects(unpackSearchExtension(bytes, pin(bytes)), code('INTEGRITY'));
  const bad = archive(); bad.writeUInt32LE(999999, 8); await assert.rejects(unpackSearchExtension(bad, pin(bad)), code('INTEGRITY'));
  await assert.rejects(unpackSearchExtension(archive(), { ...pin(), files: { ...pin().files, 'content_script.js': { bytes: records['content_script.js'].length, sha256: '0'.repeat(64) } } }), code('INTEGRITY'));
});
