import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

// A small ZIP reader for the pinned Windows archive: stored and deflated entries, CRC-32 checked.
// No ZIP64, no encryption, no links: an archive that needs them is refused.
const inflateRaw = promisify(zlib.inflateRaw);
const END_OF_DIRECTORY = 0x06054b50, DIRECTORY_ENTRY = 0x02014b50, LOCAL_ENTRY = 0x04034b50;

export class ZipError extends Error {
  constructor(message) { super(message); this.code = 'ZIP_INVALID'; }
}

export function bufferReader(buffer) {
  return { size: buffer.length, read: async (offset, length) => {
    if (offset < 0 || offset + length > buffer.length) throw new ZipError('ZIP data ends too early');
    return buffer.subarray(offset, offset + length);
  } };
}

export async function fileReader(file) {
  const handle = await fs.open(file, 'r');
  const { size } = await handle.stat();
  return { size, close: () => handle.close(), read: async (offset, length) => {
    if (offset < 0 || offset + length > size) throw new ZipError('ZIP data ends too early');
    const buffer = Buffer.allocUnsafe(length);
    let done = 0;
    while (done < length) {
      const { bytesRead } = await handle.read(buffer, done, length - done, offset + done);
      if (!bytesRead) throw new ZipError('ZIP data ends too early');
      done += bytesRead;
    }
    return buffer;
  } };
}

export async function zipEntries(reader) {
  const tailLength = Math.min(reader.size, 22 + 65535);
  if (tailLength < 22) throw new ZipError('Not a ZIP archive');
  const tail = await reader.read(reader.size - tailLength, tailLength);
  let end = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (tail.readUInt32LE(index) === END_OF_DIRECTORY) { end = index; break; }
  }
  if (end < 0) throw new ZipError('Not a ZIP archive');
  const count = tail.readUInt16LE(end + 10), directorySize = tail.readUInt32LE(end + 12), directoryOffset = tail.readUInt32LE(end + 16);
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw new ZipError('ZIP64 archives are not supported');
  const directory = await reader.read(directoryOffset, directorySize);
  const entries = [];
  let at = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > directory.length || directory.readUInt32LE(at) !== DIRECTORY_ENTRY) throw new ZipError('ZIP directory is damaged');
    const flags = directory.readUInt16LE(at + 8), nameLength = directory.readUInt16LE(at + 28);
    const entry = { method: directory.readUInt16LE(at + 10), crc: directory.readUInt32LE(at + 16),
      compressedSize: directory.readUInt32LE(at + 20), size: directory.readUInt32LE(at + 24), offset: directory.readUInt32LE(at + 42),
      name: directory.toString(flags & 0x800 ? 'utf8' : 'latin1', at + 46, at + 46 + nameLength) };
    if (flags & 1) throw new ZipError('Encrypted ZIP entries are not supported');
    if ([entry.compressedSize, entry.size, entry.offset].includes(0xffffffff)) throw new ZipError('ZIP64 archives are not supported');
    entry.directory = entry.name.endsWith('/');
    entries.push(entry);
    at += 46 + nameLength + directory.readUInt16LE(at + 30) + directory.readUInt16LE(at + 32);
  }
  return entries;
}

export async function zipEntryData(reader, entry) {
  const header = await reader.read(entry.offset, 30);
  if (header.readUInt32LE(0) !== LOCAL_ENTRY) throw new ZipError(`ZIP entry is damaged: ${entry.name}`);
  const raw = await reader.read(entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28), entry.compressedSize);
  let data;
  if (entry.method === 0) data = raw;
  else if (entry.method === 8) {
    try { data = await inflateRaw(raw, { maxOutputLength: Math.max(entry.size, 1) }); }
    catch { throw new ZipError(`ZIP entry is damaged: ${entry.name}`); }
  } else throw new ZipError(`ZIP compression method ${entry.method} is not supported: ${entry.name}`);
  if (data.length !== entry.size || zlib.crc32(data) !== entry.crc) throw new ZipError(`ZIP entry is damaged: ${entry.name}`);
  return data;
}

// Entry names are archive-relative: anything that could leave the destination folder is refused.
function safeSegments(name) {
  const segments = name.replace(/\/$/, '').split('/');
  if (!name || name.startsWith('/') || name.includes('\\') || name.includes('\0') || /^[A-Za-z]:/.test(name)
      || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw new ZipError(`ZIP entry has an unsafe name: ${name}`);
  }
  return segments;
}

// Writes every entry under destination and returns the relative names of the files, with "/" separators.
export async function extractZip(buffer, destination) {
  const reader = bufferReader(buffer);
  const files = [];
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await zipEntries(reader)) {
    const target = path.join(destination, ...safeSegments(entry.name));
    if (entry.directory) { await fs.mkdir(target, { recursive: true }); continue; }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, await zipEntryData(reader, entry));
    files.push(entry.name);
  }
  return files;
}
