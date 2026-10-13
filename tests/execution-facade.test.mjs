import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { CommandService } from '../src/execution/commands/service.mjs';
import { FileAdapter } from '../src/execution/files/adapter.mjs';
import { ExecutionFacade } from '../src/execution/facade.mjs';
import { CodexAppServerRuntime } from '../src/execution/runtime/service.mjs';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-pilot-execution-')));
  const commands = new CommandService(), execution = new ExecutionFacade({ commands, files: new FileAdapter() });
  t.after(async () => { await execution.dispose(); await fs.rm(root, { recursive: true, force: true }); });
  return { root, execution };
}
test('Execution facade owns exact stdin sessions, cwd and terminal results', async t => {
  const { root, execution } = await fixture(t);
  const run = execution.runCommand(process.execPath, ['-e',
    "let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({cwd:process.cwd(),input:s})))"], { cwd: root });
  assert.equal(run.outcome, 'running');
  const other = execution.runCommand(process.execPath, ['-e', "process.stdin.resume();"], { cwd: root });
  await execution.writeCommandInput(run.sessionId, 'привет\n', { end: true });
  const done = await execution.waitCommand(run.operationId, 5000);
  assert.equal(done.outcome, 'success'); assert.equal(done.exitCode, 0); assert.equal(done.sessionId, null);
  assert.deepEqual(JSON.parse(done.stdout), { cwd: root, input: 'привет\n' });
  assert.equal(execution.commandSnapshot(other.operationId).outcome, 'running', 'other stdin is independent');
  await assert.rejects(execution.writeCommandInput(done.operationId, 'again'), { code: 'EXECUTION_SESSION_UNKNOWN' });
  await execution.stopCommand(other.operationId);
  assert.equal((await execution.waitCommand(other.operationId, 5000)).outcome, 'cancel');
});
test('Execution distinguishes failure, requested cancellation and lost ownership', async t => {
  const { root, execution } = await fixture(t);
  await assert.rejects(execution.executeFile(process.execPath, ['-e', "process.stderr.write('failure');process.exit(7)"], { cwd: root }),
    error => error.outcome === 'error' && error.code === 7 && error.stderr === 'failure' && !!error.operationId);
  const unknown = await execution.waitCommand('never-owned', 0);
  assert.equal(unknown.outcome, 'UNKNOWN'); assert.equal(unknown.exitCode, null);
  await assert.rejects(execution.stopCommand('never-owned'), { code: 'EXECUTION_SESSION_UNKNOWN' });
  assert.equal(execution.commandSnapshot('never-owned').outcome, 'UNKNOWN');
  await assert.rejects(execution.executeFile(path.join(root, 'missing'), [], { cwd: root }), { code: 'ENOENT', outcome: 'error' });
});
test('Execution preserves private file writes, canonical paths and missing-file errors', async t => {
  const { root, execution } = await fixture(t);
  const file = path.join(root, 'папка с пробелом', 'input.json');
  await execution.writeJson(file, { text: 'данные' }, { exclusive: true });
  await assert.rejects(execution.writeJson(file, { overwrite: true }, { exclusive: true }), { code: 'EEXIST' });
  assert.deepEqual(await execution.readJson(file), { text: 'данные' });
  await execution.writeJson(file, { changed: true });
  assert.deepEqual(await execution.readJson(file), { changed: true });
  assert.equal(await execution.canonicalPath(root), await fs.realpath(root));
  await assert.rejects(execution.readText(path.join(root, 'absent')), { code: 'ENOENT' });
  assert.deepEqual(await fs.readdir(path.dirname(file)), ['input.json']);
});

test('desktop worker timeout and output bounds fail with terminal evidence', async t => {
  const { root, execution } = await fixture(t);
  await assert.rejects(execution.executeFile(process.execPath, ['-e', 'setInterval(()=>{}, 1000)'],
    { cwd: root, timeout: 100 }), error => error.code === 'ETIMEDOUT' && error.outcome === 'error' && error.killed === true);
  await assert.rejects(execution.executeFile(process.execPath, ['-e', "process.stdout.write('x'.repeat(10000));setInterval(()=>{},1000)"],
    { cwd: root, maxBuffer: 128 }), error => error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
      && error.outcome === 'error' && Buffer.byteLength(error.stdout) <= 128);
});
test('disposing desktop commands does not stop login services and never reports unknown as finished', async t => {
  const { root, execution } = await fixture(t);
  let stopped = 0;
  const runtime = { ensure: async () => ({ mcp: { ready: true } }), control: async () => { stopped++; }, lastStatus: { mcp: { ready: true } } };
  execution.attachRuntime(runtime);
  assert.throws(() => execution.attachRuntime({}), { code: 'EXECUTION_OWNER_CONFLICT' });
  const snapshot = execution.lastStatus; snapshot.mcp.ready = false;
  assert.equal(execution.lastStatus.mcp.ready, true);
  const child = execution.runCommand(process.execPath, ['-e', 'process.stdin.resume()'], { cwd: root });
  await execution.dispose();
  assert.equal(execution.commandSnapshot(child.operationId).outcome, 'cancel');
  assert.equal(stopped, 0);
  assert.throws(() => execution.runCommand(process.execPath, []), { code: 'EXECUTION_CLOSED' });
});
test('runtime refuses symlinked state before copying files or running control.py', async t => {
  const { root } = await fixture(t);
  const donor = path.join(root, 'donor'), state = path.join(root, 'state');
  await fs.mkdir(donor); await fs.writeFile(path.join(donor, 'sentinel'), 'untouched');
  await fs.symlink(donor, state, 'junction');
  let calls = 0;
  const runtime = new CodexAppServerRuntime({ sourceDir: root, stateDir: state, execute: async () => { calls++; } });
  await assert.rejects(runtime.syncSource(), { code: 'RUNTIME_OWNER_CONFLICT' });
  assert.equal(calls, 0); assert.deepEqual(await fs.readdir(donor), ['sentinel']);
});
