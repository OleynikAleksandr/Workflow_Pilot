import {createHash} from 'node:crypto';

const digest = text => createHash('sha256').update(text).digest('hex');
export const CONTEXT_FILE_LIMIT = 24000;
export const CONTEXT_FILES_VERSION = 2;
const footer = '\n\nWorkflow Pilot receipt: ';
const codeLength = 12;
const payloadLimit = CONTEXT_FILE_LIMIT - Buffer.byteLength(footer) - codeLength - 1;

export const CONTEXT_FILES_RULE = 'Комплект лежит на диске в context_files. Прочитай каждый файл целиком одной командой exec_command'
  + ' с read_only: true и workdir из context_files, строго по одному и по порядку. Не читай файлы параллельно и не объединяй'
  + ' несколько файлов в одну команду: объединённый вывод обрезается. Последняя строка каждого файла содержит конечную метку'
  + ' Workflow Pilot receipt. Если файл недоступен, сообщи его путь и не подтверждай неполный комплект.';

const utf8Size = code => code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;

// Longest prefix from start within limit bytes; never splits a code point.
function prefixEnd(text, start, limit) {
  let bytes = 0, index = start;
  while (index < text.length) {
    const code = text.codePointAt(index), size = utf8Size(code);
    if (bytes + size > limit) break;
    bytes += size; index += code > 0xffff ? 2 : 1;
  }
  return index;
}

// Version 2 prefers a paragraph, then a line boundary in the second half of a window.
function paragraphChunks(text) {
  const chunks = [];
  for (let start = 0;;) {
    const end = prefixEnd(text, start, payloadLimit);
    if (end >= text.length) { chunks.push(text.slice(start)); return chunks; }
    const window = text.slice(start, end), half = Math.floor(window.length / 2);
    const paragraph = window.lastIndexOf('\n\n'), line = window.lastIndexOf('\n');
    const cut = paragraph >= half ? paragraph + 2 : line >= half ? line + 1 : window.length;
    chunks.push(window.slice(0, cut));
    start += cut;
  }
}

// Version 1 (0.6.9-0.6.10) cut at code points; issued bundles keep their exact marks.
function legacyChunks(text, headerBytes) {
  const chunks = [];
  let chunk = '', bytes = 0, first = true;
  for (const char of text) {
    const size = Buffer.byteLength(char);
    if ((first ? headerBytes : 0) + bytes + size > payloadLimit) {
      chunks.push(chunk); chunk = ''; bytes = 0; first = false;
    }
    chunk += char; bytes += size;
  }
  chunks.push(chunk);
  return chunks;
}

function startupHeader(messageId, contextHash, version) {
  return [
    '# Подтверждение стартового контекста Workflow Pilot',
    'message_id: ' + messageId, 'context_ref: ' + contextHash,
    version === 1 ? 'Прочитай все приложенные файлы по порядку. В этом ходе вызови workflow_startup_complete.'
      : 'Прочитай все файлы комплекта по одному и по порядку. В этом ходе вызови workflow_startup_complete.',
    'Передай message_id из этой шапки, context_sha256 равный context_ref и file_receipts со всеми конечными метками по порядку.',
    '', '---', '',
  ].join('\n');
}

// Files carry their own end markers. The manifest must never reveal those markers.
export function contextFileBundle(messageId, markdown, {startup = false, version = CONTEXT_FILES_VERSION} = {}) {
  if (version !== 1 && version !== 2) throw Object.assign(new Error('Неизвестная версия комплекта файлов.'), {code:'PLUGIN_COMMUNICATION_CONTEXT'});
  const contextHash = digest(markdown);
  const header = startup ? startupHeader(messageId, contextHash, version) : '';
  let chunks;
  if (version === 1) {
    chunks = legacyChunks(markdown, Buffer.byteLength(header));
    chunks[0] = header + chunks[0];
  } else chunks = paragraphChunks(header + markdown);
  const marks = [];
  const files = chunks.map((part, index) => {
    const mark = digest(JSON.stringify([messageId, contextHash, index, part])).slice(0, codeLength);
    marks.push(mark);
    const name = 'context-' + String(index + 1).padStart(2, '0') + '-of-' + String(chunks.length).padStart(2, '0') + '.md';
    const text = part + footer + mark + '\n';
    return {index:index + 1, name, bytes:Buffer.byteLength(text), sha256:digest(text), text};
  });
  return {files, version, contextHash, receiptHash:digest(JSON.stringify(marks))};
}

// Receipts issued before version 2 carry no version field.
export const receiptVersion = receipt => receipt?.version ?? 1;

export function requireFileReceipts(expected, marks) {
  if (!Array.isArray(marks) || marks.length !== expected.count || marks.some(x => typeof x !== 'string' || !/^[a-f0-9]{12}$/.test(x))
      || digest(JSON.stringify(marks)) !== expected.digest)
    throw Object.assign(new Error('Для подтверждения прочитайте все ' + expected.count + ' файлов комплекта по одному'
      + (expected.directory ? ' из ' + expected.directory : '') + ' и передайте метки из их последних строк по порядку.'), {code:'PLUGIN_COMMUNICATION_INCOMPLETE'});
}

// Public manifest: paths and sizes only, never file text or marks.
export function contextFilesView({messageId, contextRef, documentSha256 = null, written}) {
  return {message_id:messageId, context_ref:contextRef, ...(documentSha256 ? {document_sha256:documentSha256} : {}),
    workdir:written.workdir, directory:written.directory, count:written.files.length,
    total_bytes:written.files.reduce((sum, file) => sum + file.bytes, 0),
    files:written.files.map(({index, name, path, bytes}) => ({index, name, path, bytes}))};
}
