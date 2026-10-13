import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

export async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

// Runtime discovery tolerates access errors; cleanup must surface them.
export async function exists(file, { strict = false } = {}) {
  try { await fs.access(file); return true; }
  catch (error) { if (strict && error.code !== 'ENOENT') throw error; return false; }
}

export const fail = (code, message) => Object.assign(new Error(message), { code });

// The phase journal keeps one previous file instead of growing without limit.
export const DIAGNOSTICS_MAX_BYTES = 4 * 1024 * 1024;
export const diagnosticFiles = file => [file, file + '.1'];
const diagnosticWrites = new Map();
export function queueDiagnosticFile(file, action) {
  const key=file.replace(/(\.jsonl)\.\d+$/, '$1');
  const operation=(diagnosticWrites.get(key)??Promise.resolve()).catch(()=>{}).then(action);
  diagnosticWrites.set(key,operation);
  void operation.finally(()=>{if(diagnosticWrites.get(key)===operation)diagnosticWrites.delete(key);}).catch(()=>{});
  return operation;
}
export function appendDiagnostic(file, line, maxBytes = DIAGNOSTICS_MAX_BYTES) {
 return queueDiagnosticFile(file,async()=>{
  const size = await fs.stat(file).then(stat => stat.size, error => { if (error.code === 'ENOENT') return 0; throw error; });
  if (size > 0 && size + Buffer.byteLength(line) > maxBytes) await fs.rename(file, file + '.1');
  await fs.appendFile(file, line, { mode: 0o600 });
 });
}
