import {createHash} from 'node:crypto';

const digest = text => createHash('sha256').update(text).digest('hex');
const limit = 24000;
const footer = '\n\nWorkflow Pilot receipt: ';
const codeLength = 12;
const payloadLimit = limit - Buffer.byteLength(footer) - codeLength - 1;

// Files carry their own end markers. The manifest must never reveal those markers.
export function contextFileBundle(messageId, markdown) {
  const chunks = [];
  let chunk = '', bytes = 0;
  for (const char of markdown) {
    const size = Buffer.byteLength(char);
    if (bytes + size > payloadLimit) {
      chunks.push(chunk);
      chunk = '';
      bytes = 0;
    }
    chunk += char;
    bytes += size;
  }
  chunks.push(chunk);
  const contextHash = digest(markdown);
  const marks = [];
  const files = chunks.map((part, index) => {
    const mark = digest(JSON.stringify([messageId, contextHash, index, part])).slice(0, codeLength);
    marks.push(mark);
    const name = 'context-' + String(index + 1).padStart(2, '0') + '-of-' + String(chunks.length).padStart(2, '0') + '.md';
    const text = part + footer + mark + '\n';
    return {name, uri:'workflow-context://' + messageId + '/' + name, bytes:Buffer.byteLength(text), text};
  });
  return {files, contextHash, receiptHash:digest(JSON.stringify(marks))};
}

export function requireFileReceipts(expected, marks) {
  if (!Array.isArray(marks) || marks.length !== expected.count || marks.some(x => typeof x !== 'string' || !/^[a-f0-9]{12}$/.test(x))
      || digest(JSON.stringify(marks)) !== expected.digest)
    throw Object.assign(new Error('Для подтверждения прочитайте все Markdown-файлы и передайте метки из их последних строк по порядку.'), {code:'PLUGIN_COMMUNICATION_INCOMPLETE'});
}
