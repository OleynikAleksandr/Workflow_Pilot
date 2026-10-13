import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
// The tunnel dialogs ship with the executor and write into its private store.
const helper = fileURLToPath(new URL('../tools/codex-app-server-mcp/tunnel_prompt.py', import.meta.url));
const control = fileURLToPath(new URL('../tools/codex-app-server-mcp/control.py', import.meta.url));
async function run(t, script) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-tunnel-gui-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return execute('python3', ['-c', [
    'import runpy,json,pathlib,os',
    'h=runpy.run_path(' + JSON.stringify(helper) + ',run_name="helper_test")',
    'c=runpy.run_path(' + JSON.stringify(control) + ',run_name="control_test")',
    script,
  ].join('\n')], { env: { ...process.env, WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR: path.join(root, 'state'),
    WORKFLOW_PILOT_LEGACY_LOCAL_STATE_DIR: path.join(root, 'no-legacy-state'), PYTHONDONTWRITEBYTECODE: '1' }, timeout: 10000 });
}
test('cancelling native password entry changes no private configuration', async t => {
  const { stdout } = await run(t, [
    'def ask(message, hidden=False):',
    '    if hidden: raise h["Cancelled"]()',
    '    return "tunnel_fixture1234567890123456"',
    'try: h["configure"](c,ask)',
    'except h["Cancelled"]: pass',
    'print(json.dumps({"key":c["KEY_FILE"].exists(),"profile":c["PROFILE"].exists()}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { key: false, profile: false });
});
test('native helper returns no key and writes it only to a private file', async t => {
  const { stdout, stderr } = await run(t, [
    'key="fixture-only-secret-value"',
    'def ask(message, hidden=False):',
    '    return key if hidden else "tunnel_fixture1234567890123456"',
    'result=h["configure"](c,ask)',
    'saved=c["KEY_FILE"].read_text().strip()==key',
    'mode=c["KEY_FILE"].stat().st_mode & 0o777',
    'profile=c["PROFILE"].read_text()',
    'print(json.dumps({"result":result,"saved":saved,"mode":mode,"profileHasSecret":key in profile}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { result: { configured: true }, saved: true, mode: 0o600, profileHasSecret: false });
  assert.doesNotMatch(stdout + stderr, /fixture-only-secret-value/);
});
test('invalid tunnel identity does not leave a key behind', async t => {
  const { stdout } = await run(t, [
    'def ask(message, hidden=False):',
    '    return "fixture-only-secret-value" if hidden else "bad-id"',
    'try: h["configure"](c,ask)',
    'except ValueError: pass',
    'print(json.dumps({"key":c["KEY_FILE"].exists(),"profile":c["PROFILE"].exists()}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { key: false, profile: false });
});

test('both real native prompt scripts compile with Unicode and hidden key input', { skip: process.platform !== 'darwin' }, async t => {
  const { stdout } = await run(t, [
    'import subprocess,tempfile',
    'from unittest.mock import patch',
    'scripts=[]',
    'def capture(args, **kwargs):',
    '    scripts.append(args[-1])',
    '    answer="fixture-only-secret-value" if "with hidden answer" in args[-1] else "tunnel_fixture1234567890123456"',
    '    return subprocess.CompletedProcess(args,0,stdout=answer,stderr="")',
    'with patch("subprocess.run",capture):',
    '    h["configure"](c)',
    'assert len(scripts)==2',
    'assert "Вставьте tunnel_id" in scripts[0]',
    'assert "with hidden answer" not in scripts[0]',
    'assert "with hidden answer" in scripts[1]',
    'with tempfile.TemporaryDirectory() as folder:',
    '    for i,script in enumerate(scripts):',
    '        compiled=subprocess.run(["/usr/bin/osacompile","-o",str(pathlib.Path(folder)/f"{i}.scpt"),"-"],input=script,capture_output=True,text=True,timeout=10)',
    '        assert compiled.returncode==0, compiled.stderr',
    'print(json.dumps({"compiled":len(scripts)}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { compiled: 2 });
});

test('native prompt failure is distinct from cancellation and changes no configuration', async t => {
  const { stdout } = await run(t, [
    'import subprocess',
    'from unittest.mock import patch',
    'def reject(args, **kwargs):',
    '    return subprocess.CompletedProcess(args,1,stdout="private-output",stderr="private-command (-2741)")',
    'with patch("subprocess.run",reject):',
    '    try: h["configure"](c)',
    '    except h["PromptFailure"]: pass',
    '    else: raise AssertionError("missing prompt failure")',
    'assert not c["KEY_FILE"].exists() and not c["PROFILE"].exists()',
    'def cancel(args, **kwargs):',
    '    return subprocess.CompletedProcess(args,1,stdout="",stderr="User canceled. (-128)")',
    'with patch("subprocess.run",cancel):',
    '    try: h["prompt"]("Cancel fixture")',
    '    except h["Cancelled"]: pass',
    '    else: raise AssertionError("missing cancellation")',
    'print(json.dumps({"untouched":True}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { untouched: true });
});

test('worker reports only a safe prompt error code when the native dialog cannot open', async t => {
  const { stdout } = await run(t, [
    'import subprocess,io,contextlib',
    'from unittest.mock import patch',
    'def reject(args, **kwargs):',
    '    return subprocess.CompletedProcess(args,1,stdout="fixture-secret",stderr="private-command (-2741)")',
    'out,err=io.StringIO(),io.StringIO()',
    'with patch("subprocess.run",reject),patch("sys.platform","darwin"),contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):',
    '    try: runpy.run_path(' + JSON.stringify(helper) + ',run_name="__main__")',
    '    except SystemExit as stopped: assert stopped.code==1',
    'assert out.getvalue()==""',
    'assert json.loads(err.getvalue())=={"ok":False,"code":"MAC_TUNNEL_PROMPT_FAILED"}',
    'print(json.dumps({"sanitized":True}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { sanitized: true });
});


test('private stdin values skip dialogs and partial ID still permits hidden key input', async t => {
  const { stdout, stderr } = await run(t, [
    'import io',
    'secret="sk-fixture_secret_1234567890"',
    'data=h["read_input"](io.StringIO(json.dumps({"tunnel_id":"tunnel_fixture1234567890123456","api_key":secret})))',
    'def forbidden(*a,**kw): raise AssertionError("unexpected dialog")',
    'assert h["configure"](c, forbidden, data)=={"configured":True}',
    'assert c["KEY_FILE"].read_text().strip()==secret',
    'assert c["KEY_FILE"].stat().st_mode & 0o777 == 0o600',
    'def only_key(message,hidden=False):',
    '    assert hidden',
    '    return secret',
    'assert h["configure"](c,only_key,{"tunnel_id":"tunnel_fixture1234567890123456"})=={"configured":True}',
    'print(json.dumps({"configured":True}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { configured: true });
  assert.doesNotMatch(stdout + stderr, /sk-fixture/);
});
test('stdin rejects oversized, unknown and non-string data before private writes', async t => {
  const { stdout } = await run(t, [
    'import io',
    'for raw in ["x"*8193,"[]","null",json.dumps({"api_key":7}),json.dumps({"unknown":"secret"})]:',
    '    try: h["read_input"](io.StringIO(raw))',
    '    except ValueError: pass',
    '    else: raise AssertionError("invalid input accepted")',
    'assert not c["KEY_FILE"].exists() and not c["PROFILE"].exists()',
    'print(json.dumps({"untouched":True}))',
  ].join('\n'));
  assert.deepEqual(JSON.parse(stdout), { untouched: true });
});

test('the worker started by Web Pilot stores the tunnel in the executor state and prints no key', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-tunnel-worker-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const state = path.join(root, 'state'), secret = 'sk-fixture_secret_1234567890';
  const worker = input => new Promise(resolve => {
    const child = execFile('/usr/bin/python3', ['-B', helper, '--stdin'], { env: { ...process.env, WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR: state,
      WORKFLOW_PILOT_LEGACY_LOCAL_STATE_DIR: path.join(root, 'no-legacy-state'), PYTHONDONTWRITEBYTECODE: '1' }, timeout: 10000 },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }));
    child.stdin.end(input);
  });
  const done = await worker(JSON.stringify({ tunnel_id: 'tunnel_fixture1234567890123456', api_key: secret }));
  assert.equal(done.code, 0, done.stderr);
  assert.deepEqual(JSON.parse(done.stdout), { configured: true });
  assert.doesNotMatch(done.stdout + done.stderr, /sk-fixture/);
  assert.equal((await fs.readFile(path.join(state, 'private/tunnel-key'), 'utf8')).trim(), secret);
  assert.equal((await fs.stat(path.join(state, 'private/tunnel-key'))).mode & 0o777, 0o600);
  const profile = await fs.readFile(path.join(state, 'private/tunnel-profile/codex-executor.yaml'), 'utf8');
  assert.match(profile, /tunnel_fixture1234567890123456/);
  assert.doesNotMatch(profile, /sk-fixture/);
  const rejected = await worker(JSON.stringify({ tunnel_id: 'not-a-tunnel', api_key: secret }));
  assert.equal(rejected.code, 1);
  assert.deepEqual(JSON.parse(rejected.stderr), { ok: false, code: 'MAC_TUNNEL_INVALID_DATA' });
  assert.equal(rejected.stdout, '');
});
