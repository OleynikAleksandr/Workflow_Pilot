import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../src/execution/files/adapter.mjs';
import { verifyMacSignature, macBootSessionUUID } from './check-mac-signature.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = 'Workflow Pilot.app';
const ID = 'com.oleynik.WorkflowPilot';
const STATE = path.join(os.homedir(), 'Library/Application Support/WorkflowPilotCodexExecutor');
// The MCP may run on another port when the preferred one was taken: its actual address is in the selector.
async function mcpPort() {
  const selector = JSON.parse(await fs.readFile(path.join(STATE, 'private/selector.json'), 'utf8'));
  const url = new URL(selector.mcp_url);
  assert.equal(url.hostname, '127.0.0.1', 'MCP must listen on loopback');
  return Number(url.port);
}
const env = { ...process.env, LC_ALL: 'C', LANG: 'C' };
const run = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024, env, ...options,
}).trim();

export async function screenCapturePreflight({ root = ROOT } = {}) {
  if (process.platform !== 'darwin') throw new Error('Проверка захвата требует macOS.');
  const app = path.join(root, APP), executable = path.join(app, 'Contents/MacOS/Workflow Pilot');
  const signedAt = (await fs.stat(path.join(app, 'Contents/_CodeSignature/CodeResources'))).mtimeMs;
  const processes = run('/bin/ps', ['-axo', 'pid=,lstart=,comm=']).split('\n').map(line => {
    const match = line.match(/^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);
    return match && { pid: Number(match[1]), startedAt: Date.parse(match[2]), executable: match[3] };
  }).filter(Boolean);
  const apps = processes.filter(p => p.executable === executable);
  assert.equal(apps.length, 1, 'Откройте одну корневую копию Web Pilot через прежний Finder-алиас.');
  const appProcess = apps[0];
  const record = JSON.parse(await fs.readFile(path.join(STATE, 'mcp.pid.json'), 'utf8'));
  const mcpProcess = processes.find(p => p.pid === record.pid);
  assert.ok(mcpProcess, 'Действующий MCP не найден.');
  assert.equal(run('/bin/ps', ['-p', String(record.pid), '-o', 'lstart=', '-o', 'command=']),
    record.identity, 'MCP process identity изменилась.');
  const port = await mcpPort();
  const listeners = run('/usr/sbin/lsof', ['-nP', '-iTCP:' + port, '-sTCP:LISTEN', '-t']).split(/\s+/).map(Number);
  assert.deepEqual([...new Set(listeners)], [record.pid], 'Порт MCP должен принадлежать проверенному процессу.');
  for (const process of [appProcess, mcpProcess]) {
    assert.ok(Number.isFinite(process.startedAt), 'Не удалось определить время запуска.');
    if (process.startedAt < signedAt) {
      const error = new Error('MAC_CAPTURE_RESTART_REQUIRED: Web Pilot или MCP запущен до подписи текущей сборки. Полностью выйдите через ⌘Q и откройте прежний Finder-алиас. Захват не вызывался.');
      error.code = 'MAC_CAPTURE_RESTART_REQUIRED';
      throw error;
    }
  }
  const signature = await verifyMacSignature({ bundle: app, root });
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString',
    path.join(app, 'Contents/Info.plist')]), version, 'Установленная версия должна совпадать с проверяемой сборкой.');
  const screenCaptureAllowed = run('/usr/bin/swift', ['-e',
    'import CoreGraphics; print(CGPreflightScreenCaptureAccess() ? "allowed" : "denied")']) === 'allowed';
  return { version, app: appProcess, mcp: mcpProcess, signedAt, signature, bootSessionUUID: macBootSessionUUID(), screenCaptureAllowed };
}

const PYTHON = String.raw`
import asyncio, base64, hashlib, json, os, struct, sys
from datetime import timedelta
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client(sys.argv[2], timeout=10, sse_read_timeout=40) as (read, write, _):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=40)) as session:
            initialized = await session.initialize()
            if initialized.serverInfo.name != "Workflow Pilot Local Mac":
                raise RuntimeError("Unexpected MCP server")
            result = await session.call_tool("computer_capture_screen", {"max_dimension":1600, "include_cursor":False})
            if result.isError:
                raise RuntimeError("MCP capture failed: " + " ".join(getattr(c, "text", "") for c in result.content)[:1500])
            images = [c for c in result.content if c.type == "image" and c.mimeType == "image/png"]
            if len(images) != 1:
                raise RuntimeError("MCP must return one PNG")
            png = base64.b64decode(images[0].data, validate=True)
            if len(png) <= 24 or png[:8] != b"\x89PNG\r\n\x1a\n" or png[12:16] != b"IHDR":
                raise RuntimeError("MCP returned an invalid PNG")
            width, height = struct.unpack(">II", png[16:24])
            if not width or not height:
                raise RuntimeError("MCP returned an empty PNG")
            with open(sys.argv[1], "xb") as image:
                os.chmod(sys.argv[1], 0o600)
                image.write(png)
            print(json.dumps({"tool":"computer_capture_screen", "server":initialized.serverInfo.name,
                "png":sys.argv[1], "bytes":len(png), "width":width, "height":height, "sha256":hashlib.sha256(png).hexdigest()}))

asyncio.run(main())
`;

function localTimestamp(date) {
  const pad = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}
const messageId = entry => entry.eventMessage?.match(/msgID=([^,\s]+)/)?.[1];

export async function checkMacScreenCapture({ root = ROOT } = {}) {
  // The preflight deliberately stops before calling MCP if an old app/executor is still running.
  const preflight = await screenCapturePreflight({ root });
  assert.ok(preflight.screenCaptureAllowed,
    'MAC_CAPTURE_PERMISSION_REQUIRED: Включите Screen & System Audio Recording для Workflow Pilot вручную. Захват не вызывался.');
  const runtime = path.join(root, '.harness/runtime');
  const directory = await fs.mkdtemp(path.join(runtime, 'screen-capture-'));
  const startedAt = new Date();
  try {
    const capture = JSON.parse(run(path.join(STATE, 'runtime/venv/bin/python'),
      ['-B', '-c', PYTHON, path.join(directory, 'screen.png'), `http://127.0.0.1:${await mcpPort()}/mcp`], { timeout: 55000 }));
    assert.equal(await sha256File(capture.png), capture.sha256);
    assert.equal((await fs.stat(capture.png)).size, capture.bytes);
    const after = await screenCapturePreflight({ root });
    assert.deepEqual(after, preflight, 'Приложение или MCP изменилось во время захвата.');
    const events = JSON.parse(run('/usr/bin/log', ['show', '--start',
      localTimestamp(new Date(startedAt.getTime() - 2000)), '--style', 'json', '--info', '--debug',
      '--predicate', 'subsystem == "com.apple.TCC"']));
    const captureIds = new Set(events.filter(e => e.eventMessage?.includes('service=kTCCServiceScreenCapture'))
      .map(messageId).filter(Boolean));
    const ours = events.filter(e => captureIds.has(messageId(e)) && (() => {
      const r = e.eventMessage.match(/responsible=\{TCCDProcess: identifier=([^,]+), pid=(\d+),[^}]*responsible_path=([^,}]+)/);
      return r && r[1] === ID && Number(r[2]) === preflight.app.pid && r[3] === preflight.app.executable
        && e.eventMessage.includes('accessing={TCCDProcess: identifier=com.apple.screencapture');
    })());
    assert.ok(ours.length, 'TCC не подтвердил responsible application = текущий подписанный Web Pilot.');
    const ourIds = new Set(ours.map(messageId));
    const attribution = events.filter(e => ourIds.has(messageId(e)))
      .map(e => ({ timestamp: e.timestamp, message: e.eventMessage }));
    assert.ok(!attribution.some(e => e.message.includes('Failed to match existing code requirement')),
      'TCC сообщил о несовпадении code requirement.');
    assert.ok(attribution.some(e => /AUTHREQ_CTX:.*preflight=no/.test(e.message)),
      'TCC не подтвердил настоящий запрос захвата после preflight.');
    const results = attribution.filter(e => e.message.includes('AUTHREQ_RESULT:'));
    assert.ok(results.length && results.every(e => /authValue=2,/.test(e.message)
      && e.message.includes('error=(null)')), 'TCC не подтвердил разрешение всех запросов захвата.');
    const tcc = path.join(directory, 'tcc.json');
    await fs.writeFile(tcc, JSON.stringify(attribution, null, 2) + '\n', { mode: 0o600 });
    const report = { checkedAt: new Date().toISOString(), ...preflight, capture,
      responsibleApplication: ID, tccEvidence: tcc, tccAuthorized: true, codeRequirementMismatch: false };
    await fs.writeFile(path.join(runtime, 'mac-screen-capture-check.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    return report;
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const operation = args.length === 0 ? checkMacScreenCapture
    : args.length === 1 && args[0] === '--preflight' ? screenCapturePreflight : null;
  if (!operation) { console.error('Допустим только --preflight.'); process.exitCode = 1; }
  else operation().then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
