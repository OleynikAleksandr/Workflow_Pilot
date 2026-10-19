import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const clientDir = path.join(repoRoot, 'tools', 'codex-app-server-mcp');
const userCodex = path.join(homedir(), '.npm-global', 'bin', 'codex');

function tomlString(value) {
  return JSON.stringify(String(value));
}

async function runPython(script, args = [], env = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn('python3', ['-B', script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env, PYTHONDONTWRITEBYTECODE:'1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

test('Codex App Server client executes directly without a model turn', { timeout: 60_000 }, async t => {
  if (process.platform !== 'darwin' || !existsSync(userCodex)) {
    t.skip('real Codex App Server probe requires the local macOS Codex binary');
    return;
  }

  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-app-server-'));
  const codexHome = path.join(root, 'codex-home');
  await mkdir(codexHome, { recursive: true });

  let modelRequests = 0;
  const modelServer = http.createServer((_request, response) => {
    modelRequests += 1;
    response.statusCode = 503;
    response.end('model endpoint intentionally unavailable');
  });
  await new Promise(resolve => modelServer.listen(0, '127.0.0.1', resolve));
  const modelPort = modelServer.address().port;

  const config = `
model_provider = "blocked"
model = "probe-model"
[analytics]
enabled = false
[model_providers.blocked]
name = "Blocked local model endpoint"
base_url = ${tomlString(`http://127.0.0.1:${modelPort}/v1`)}
wire_api = "responses"
requires_openai_auth = false
`.trimStart();
  await writeFile(path.join(codexHome, 'config.toml'), config);

  const probe = path.join(root, 'probe.py');
  await writeFile(probe, `import json, os, sys, tempfile, time
sys.path.insert(0, ${JSON.stringify(clientDir)})
from app_server_client import AppServerClient, AppServerError

codex, root = sys.argv[1], sys.argv[2]
target = os.path.join(root, "data.txt")
c = AppServerClient(binary=codex, cwd=root, environment={"CODEX_HOME": os.environ["CODEX_HOME"]}, request_timeout=20)
c.start()
before = c.status()
cmd = c.command_exec(["/bin/echo", "APP_SERVER_DIRECT_OK"], sandbox_policy={"type":"readOnly"}, timeout_ms=5000)
c.fs_write_file(target, b"hello-from-app-server")
readback = c.fs_read_file(target).decode("utf-8")
listing = c.fs_read_directory(root)
git_init = c.command_exec(["/usr/bin/git", "init", "-q"], cwd=root, sandbox_policy={"type":"dangerFullAccess"}, timeout_ms=5000)
git_status = c.command_exec(["/usr/bin/git", "status", "--short"], cwd=root, sandbox_policy={"type":"dangerFullAccess"}, timeout_ms=5000)
process = c.start_command(["/bin/sh", "-c", "printf PROCESS_START; sleep 10; printf PROCESS_END"], cwd=root, sandbox_policy={"type":"dangerFullAccess"})
chunk = c.read_process_output(process["process_id"], wait_ms=2000)
stopped = c.stop_process(process["process_id"])
forbidden = False
try:
    c.request("turn/start", {})
except AppServerError:
    forbidden = True
old_generation = c.generation
c._process.kill()
c._process.wait(timeout=3)
read_after_restart = c.fs_read_file(target).decode("utf-8")
after = c.status()
c.close()
print(json.dumps({
    "before": before,
    "stdout": cmd.get("stdout"),
    "exitCode": cmd.get("exitCode"),
    "readback": readback,
    "directoryHasData": any((entry.get("fileName") == "data.txt") for entry in listing.get("entries", [])),
    "gitInit": git_init.get("exitCode"),
    "gitStatus": git_status.get("exitCode"),
    "processChunk": chunk.get("stdout"),
    "processStopped": not stopped.get("running", True),
    "forbidden": forbidden,
    "hasMcpThread": any(hasattr(c, name) for name in ("ensure_mcp_thread", "mcp_status_list", "mcp_tool_call")),
    "statusKeys": sorted(before.keys()),
    "restartGenerationAdvanced": after["generation"] > old_generation,
    "readAfterRestart": read_after_restart,
}, ensure_ascii=False))
`);

  try {
    const result = await runPython(probe, [userCodex, root], { CODEX_HOME: codexHome });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const lines = result.stdout.trim().split(/\n/);
    const data = JSON.parse(lines.at(-1));
    assert.equal(data.exitCode, 0);
    assert.match(data.stdout, /APP_SERVER_DIRECT_OK/);
    assert.equal(data.readback, 'hello-from-app-server');
    assert.equal(data.directoryHasData, true);
    assert.equal(data.gitInit, 0);
    assert.equal(data.gitStatus, 0);
    assert.match(data.processChunk, /PROCESS_START/);
    assert.equal(data.processStopped, true);
    assert.equal(data.forbidden, true);
    assert.equal(data.hasMcpThread, false, 'the executor opens no Codex thread and calls no Codex-side MCP');
    assert.deepEqual(data.statusKeys, ['binary', 'generation', 'pid', 'running', 'version']);
    assert.equal(data.restartGenerationAdvanced, true);
    assert.equal(data.readAfterRestart, 'hello-from-app-server');
    assert.equal(modelRequests, 0, 'executor path must not call the configured model endpoint');
  } finally {
    await new Promise(resolve => modelServer.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('Codex App Server MCP exposes exactly the 9-tool catalog and delivers no project context', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(path.join(repoRoot, 'tools', 'codex-app-server-mcp', 'server.py'), 'utf8');

  const expected = [
    'exec_command', 'write_stdin', 'apply_patch', 'view_image',
    'bridge_status', 'turn_watchdog',
    'computer_list_windows', 'computer_capture_screen', 'computer_capture_window',
  ];
  for (const name of expected) {
    assert.match(source, new RegExp(`def ${name}\\(`), `missing local tool ${name}`);
  }
  assert.equal(source.match(/@mcp\.tool/g).length, 9, 'catalog is exactly 9 tools');
  // 0.6.96: MCP carries tools only; the context and the session rules go in the start message of Web Pilot.
  for (const name of ['workflow_context_recover', 'workflow_context', 'workflow_recover', 'active_workspace', 'session_rules',
    'split_context', 'part_key', 'context_part', 'CONTEXT_PART_BYTES', 'SESSION_RULES_FILE', 'PART_ORDER', 'КОНЕЦ ПАКЕТА'])
    assert.ok(!source.includes(name), `context delivery leftover ${name} must be absent from server.py`);
  assert.equal(existsSync(path.join(clientDir, 'session-rules.md')), false, 'session-rules.md is deleted');
  const instructions = source.slice(source.indexOf('instructions=('), source.indexOf('host=host'));
  assert.doesNotMatch(instructions, /Workflow Kit|recover|context|part=|after key/i, 'server instructions do not mention recovery');
  for (const phrase of ['Local-computer tools only', 'never launches a Codex model turn', 'No UI control',
    'Tool usage: search with rg through exec_command', 'LONG_COMMAND_RULE', 'PREEXECUTION_RETRY_RULE'])
    assert.ok(instructions.includes(phrase), phrase);

  const removedTools = [
    'list_drives', 'file_info', 'list_directory', 'read_file', 'read_binary',
    'search_files', 'search_text', 'make_directory', 'write_file', 'write_binary',
    'patch_binary', 'replace_text', 'copy_path', 'move_path',
    'run_command', 'run_command_batch', 'start_process', 'process_status',
    'read_process_output', 'list_processes', 'stop_process',
    'list_repository_tree', 'read_repository_file', 'search_repository',
    'git_status', 'git_diff', 'git_log', 'git_show',
    // 0.6.95: the recoverable-delete tools are gone; deletion is rm or an apply_patch delete, undo is git.
    'delete_path', 'list_trash', 'restore_trash',
  ];
  for (const name of removedTools) {
    assert.doesNotMatch(source, new RegExp(`def ${name}\\(`), `removed tool ${name} must not be defined by the facade`);
  }
  for (const helper of ['run_shell', 'run_batch', 'start_shell_process']) {
    assert.doesNotMatch(source, new RegExp(`def ${helper}\\(`), `dead helper ${helper} must be gone`);
  }

  // 0.6.90: the web model observes the screen but never drives the interface.
  const removedUi = [
    'computer_status', 'computer_activate_window', 'computer_move_mouse', 'computer_click',
    'computer_scroll', 'computer_type_text', 'computer_key_press', 'computer_hotkey',
    'computer_actions', 'computer_release_inputs',
  ];
  for (const name of removedUi) assert.doesNotMatch(source, new RegExp(name), `UI control tool ${name} must be gone`);
  const client = await readFile(path.join(repoRoot, 'tools', 'codex-app-server-mcp', 'app_server_client.py'), 'utf8');
  for (const text of [source, client]) {
    assert.doesNotMatch(text, /node_repl|@oai\/sky|\bsky\.|computer_use/);
    assert.doesNotMatch(text, /thread\/start|mcpServer\/tool\/call|mcp_tool_call/);
  }
  assert.match(source, /No UI control: this MCP cannot move the mouse, press keys or switch windows/);
  for (const duplicate of ['openaiDeveloperDocs', 'codex_apps', 'playwright']) {
    assert.doesNotMatch(source, new RegExp(`def ${duplicate}\\(`));
  }
});

const executorVenvPython = path.join(repoRoot, '.harness', 'runtime', 'test-python', 'bin', 'python');

test('bridge_status reports pinned and installed Codex tool compatibility', { timeout: 30_000 }, async t => {
  if (!existsSync(executorVenvPython)) { t.skip('Codex App Server runtime venv is not installed'); return; }
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-status-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const pinned=JSON.parse(await readFile(path.join(clientDir,'codex-tools.lock.json'),'utf8'));
  const probe = path.join(root, 'probe.py');
  await writeFile(probe, `import json, pathlib, sys, types
sys.path.insert(0, sys.argv[1])
import server
class Client:
    cwd = sys.argv[2]
    binary = types.SimpleNamespace(version="codex-cli ${pinned.codex_version}")
    def status(self):
        return {"version": self.binary.version}
    def command_exec(self, argv, **kwargs):
        if argv == ["/usr/bin/which", "apply_patch"]:
            return {"exitCode": 0, "stdout": "/codex/bin/apply_patch\\n", "stderr": ""}
        return {"exitCode": 1, "stdout": "", "stderr": "unexpected"}
root = pathlib.Path(sys.argv[2])
(root / "empty-state" / "trash").mkdir(parents=True)
(root / "full-state" / "trash" / "kept").mkdir(parents=True)
(root / "full-state" / "trash" / "kept" / "metadata.json").write_text("{}")
server.LocalFacade(Client(), root / "empty-state")
server.LocalFacade(Client(), root / "full-state")
facade = server.LocalFacade(Client(), root / "state")
print(json.dumps({
    "codex_tools": facade.status()["codex_tools"],
    "state_created": (root / "state").is_dir(),
    "fresh_trash": (root / "state" / "trash").exists(),
    "empty_trash": (root / "empty-state" / "trash").exists(),
    "full_trash": (root / "full-state" / "trash" / "kept" / "metadata.json").is_file(),
}))
`);
  const run = await new Promise((resolve, reject) => {
    const child = spawn(executorVenvPython, ['-B', probe, clientDir, root], {
      cwd: root, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  assert.equal(run.code, 0, run.stderr || run.stdout);
  const probed = JSON.parse(run.stdout.trim());
  assert.equal(probed.state_created, true, 'the state folder is still created');
  assert.equal(probed.fresh_trash, false, 'no trash folder is created any more');
  assert.equal(probed.empty_trash, false, 'an empty legacy trash folder is removed');
  assert.equal(probed.full_trash, true, 'a non-empty legacy trash folder is left untouched');
  const status = probed.codex_tools;
  assert.deepEqual(status, {
    pinned_version: pinned.codex_version,
    pinned_tag: pinned.tag,
    installed_version: pinned.codex_version,
    version_matches: true,
    apply_patch_available: true,
  });
});

test('Codex-form exec_command and write_stdin run through the real App Server', { timeout: 60_000 }, async t => {
  if (process.platform !== 'darwin' || !existsSync(userCodex) || !existsSync(executorVenvPython)) {
    t.skip('real Codex command-tool probe requires macOS, Codex, and the executor venv');
    return;
  }
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-command-tools-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = path.join(root, 'codex-home');
  await mkdir(codexHome, { recursive: true });
  await writeFile(path.join(codexHome, 'config.toml'), '[analytics]\nenabled = false\n');
  await writeFile(path.join(root, 'not-a-directory.txt'), 'x');
  await writeFile(path.join(root, 'calc.py'), 'def add(a, b):\n    return a + b\n');

  const probe = path.join(root, 'probe.py');
  await writeFile(probe, [
    'import json, os, pathlib, re, subprocess, sys, time',
    'sys.path.insert(0, sys.argv[1])',
    'import server',
    'from app_server_client import AppServerClient',
    'codex, root, codex_home = sys.argv[2], sys.argv[3], sys.argv[4]',
    'client = AppServerClient(binary=codex, cwd=root, environment={"CODEX_HOME": codex_home}, request_timeout=20)',
    'facade = server.LocalFacade(client, pathlib.Path(root) / "state")',
    'def session_id(text):',
    '    match = re.search(r"Process running with session ID ([0-9a-f]+)", text)',
    '    if not match: raise RuntimeError(text)',
    '    return match.group(1)',
    'out = {}',
    'try:',
    '    out["short"] = facade.exec_command("printf SHORT_OK", root, "/bin/sh", False, False, 500, 10000)',
    '    out["nonzero"] = facade.exec_command("printf ERR >&2; exit 7", root, "/bin/sh", False, False, 500, 10000)',
    '    out["login_shell"] = facade.exec_command("printf SHELL_OK", root, "/bin/bash", True, False, 500, 10000)',
    '    out["truncated"] = facade.exec_command("printf BEGIN-; /usr/bin/yes x | /usr/bin/head -c 400; printf -- -END", root, "/bin/sh", False, False, 500, 20)',
    '    out["default_large"] = facade.exec_command("seq 1 60000", root, "/bin/sh", False, False, 1000)',
    '    out["rg"] = facade.exec_command("rg -n add", root, "/bin/zsh", True, False, 1000, 10000)',
    '    out["rg_sessions"] = len(facade._command_sessions)',
    '    out["cat"] = facade.exec_command("cat", root, "/bin/sh", False, False, 1000, 10000)',
    '    running = facade.exec_command("printf START; sleep 1; printf DONE", root, "/bin/sh", False, False, 250, 10000)',
    '    out["running"] = running',
    '    sid = session_id(running)',
    '    out["poll"] = facade.write_stdin(sid, "", 5000, 10000)',
    '    try:',
    '        facade.write_stdin(sid, "", 5000, 10000)',
    '        out["finished_error"] = None',
    '    except ValueError as error:',
    '        out["finished_error"] = str(error)',
    '    non_tty_waiting = facade.exec_command("sleep 20", root, "/bin/sh", False, False, 250, 10000)',
    '    non_tty_sid = session_id(non_tty_waiting)',
    '    try:',
    '        facade.write_stdin(non_tty_sid, "hello\\n", 5000, 10000)',
    '        out["non_tty_write_error"] = None',
    '    except ValueError as error:',
    '        out["non_tty_write_error"] = str(error)',
    '    time.sleep(2)',
    '    poll_started = time.monotonic()',
    '    out["non_tty_poll"] = facade.write_stdin(non_tty_sid, "", 1000, 10000)',
    '    out["non_tty_poll_elapsed"] = time.monotonic() - poll_started',
    '    out["non_tty_cleanup"] = facade.write_stdin(non_tty_sid, "\\x03", 5000, 10000)',
    '    marker = "web-pilot-nontty-" + str(os.getpid())',
    `    interrupt_waiting = facade.exec_command('python3 -c "import time; time.sleep(20)" ' + marker, root, "/bin/sh", False, False, 250, 10000)`,
    '    interrupt_sid = session_id(interrupt_waiting)',
    '    out["non_tty_interrupt"] = facade.write_stdin(interrupt_sid, "\\x03", 5000, 10000)',
    '    out["non_tty_interrupt_pgrep"] = subprocess.run(["pgrep", "-f", marker], capture_output=True).returncode',
    '    try:',
    '        facade.write_stdin(interrupt_sid, "again", 5000, 10000)',
    '        out["non_tty_interrupt_repeat"] = None',
    '    except ValueError as error:',
    '        out["non_tty_interrupt_repeat"] = str(error)',
    `    waiting = facade.exec_command('IFS= read -r line; printf "got:%s" "$line"', root, "/bin/sh", False, True, 250, 10000)`,
    '    input_sid = session_id(waiting)',
    '    stdin_started = time.monotonic()',
    '    out["stdin"] = facade.write_stdin(input_sid, "hello\\n")',
    '    out["stdin_elapsed"] = time.monotonic() - stdin_started',
    `    wall_waiting = facade.exec_command('printf WALL_READY; sleep 2.2; IFS= read -r line; printf "wall:%s" "$line"', root, "/bin/sh", False, True, 250, 10000)`,
    '    wall_sid = session_id(wall_waiting)',
    '    time.sleep(2.4)',
    '    out["wall_after_pause"] = facade.write_stdin(wall_sid, "hello\\n", 250, 10000)',
    '    finished_tty = facade.exec_command("printf BEFORE; sleep 0.4; printf LATE_TTY; exit 7", root, "/bin/sh", False, True, 250, 10000)',
    '    finished_tty_sid = session_id(finished_tty)',
    '    time.sleep(0.8)',
    '    out["finished_tty_write"] = facade.write_stdin(finished_tty_sid, "ignored\\n", 250, 10000)',
    '    try:',
    '        facade.write_stdin(finished_tty_sid, "again\\n", 250, 10000)',
    '        out["finished_tty_repeat"] = None',
    '    except ValueError as error:',
    '        out["finished_tty_repeat"] = str(error)',
    '    finished_non_tty = facade.exec_command("printf BEFORE; sleep 0.4; printf LATE_CTRL; exit 9", root, "/bin/sh", False, False, 250, 10000)',
    '    finished_non_tty_sid = session_id(finished_non_tty)',
    '    time.sleep(0.8)',
    '    out["finished_non_tty_ctrl_c"] = facade.write_stdin(finished_non_tty_sid, "\\x03", 250, 10000)',
    '    race_tty = facade.exec_command("sleep 0.6; printf TTY_RACE; exit 11", root, "/bin/sh", False, True, 250, 10000)',
    '    race_tty_sid = session_id(race_tty)',
    '    original_write = client.write_command_stdin',
    '    def delayed_write(*args, **kwargs):',
    '        time.sleep(0.5)',
    '        return original_write(*args, **kwargs)',
    '    client.write_command_stdin = delayed_write',
    '    try:',
    '        out["tty_write_race"] = facade.write_stdin(race_tty_sid, "ignored\\n", 250, 10000)',
    '    finally:',
    '        client.write_command_stdin = original_write',
    '    race_terminate = facade.exec_command("sleep 0.6; printf TERM_RACE; exit 12", root, "/bin/sh", False, False, 250, 10000)',
    '    race_terminate_sid = session_id(race_terminate)',
    '    original_request = client.request',
    '    def delayed_request(method, params=None, **kwargs):',
    '        if method == "command/exec/terminate": time.sleep(0.5)',
    '        return original_request(method, params, **kwargs)',
    '    client.request = delayed_request',
    '    try:',
    '        out["terminate_race"] = facade.write_stdin(race_terminate_sid, "\\x03", 250, 10000)',
    '    finally:',
    '        client.request = original_request',
    '    clamp_waiting = facade.exec_command("sleep 0.5; printf CLAMP_WRITE", root, "/bin/sh", False, False, 100, 10000)',
    '    clamp_sid = session_id(clamp_waiting)',
    '    out["write_clamp"] = facade.write_stdin(clamp_sid, "", 1000, 10000)',
    '    out["exec_clamp_low"] = facade.exec_command("printf CLAMP_LOW", root, "/bin/sh", False, False, 100, 10000)',
    '    out["exec_clamp_high"] = facade.exec_command("printf CLAMP_HIGH", root, "/bin/sh", False, False, 999999, 10000)',
    '    out["token_clamp"] = facade.exec_command("printf TOKEN_CLAMP", root, "/bin/sh", False, False, 500, 20000)',
    '    tty_waiting = facade.exec_command("printf READY; sleep 20", root, "/bin/sh", False, True, 250, 10000)',
    '    out["tty_start"] = tty_waiting',
    '    tty_sid = session_id(tty_waiting)',
    '    out["tty_signal"] = facade.write_stdin(tty_sid, "\\x03", 5000, 10000)',
    '    out["tty_done"] = facade.write_stdin(tty_sid, "", 5000, 10000) if "Process running" in out["tty_signal"] else out["tty_signal"]',
    '    errors = {}',
    '    for name, call in {',
    '        "empty_cmd": lambda: facade.exec_command(" ", root),',
    '        "empty_workdir": lambda: facade.exec_command("true", ""),',
    '        "missing_workdir": lambda: facade.exec_command("true", os.path.join(root, "missing")),',
    '        "file_workdir": lambda: facade.exec_command("true", os.path.join(root, "not-a-directory.txt")),',
    '        "string_yield": lambda: facade.exec_command("true", root, yield_time_ms="100"),',
    '        "string_tokens": lambda: facade.exec_command("true", root, max_output_tokens="20000"),',
    '        "string_write_yield": lambda: facade.write_stdin("deadbeef", "", "1000", 10000),',
    '        "unknown_session": lambda: facade.write_stdin("deadbeef", "", 5000, 10000),',
    '    }.items():',
    '        try:',
    '            call()',
    '            errors[name] = None',
    '        except Exception as error:',
    '            errors[name] = str(error)',
    '    out["errors"] = errors',
    'finally:',
    '    client.close()',
    'print(json.dumps(out))',
  ].join('\n'));

  const run = await new Promise((resolve, reject) => {
    const child = spawn(executorVenvPython, ['-B', probe, clientDir, userCodex, root, codexHome], {
      cwd: root,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  assert.equal(run.code, 0, run.stderr || run.stdout);
  const out = JSON.parse(run.stdout.trim().split('\n').at(-1));

  for (const key of ['short', 'nonzero', 'login_shell', 'truncated', 'default_large', 'rg', 'cat', 'running', 'poll', 'non_tty_poll', 'non_tty_cleanup', 'non_tty_interrupt', 'stdin', 'wall_after_pause', 'finished_tty_write', 'finished_non_tty_ctrl_c', 'tty_write_race', 'terminate_race', 'write_clamp', 'exec_clamp_low', 'exec_clamp_high', 'token_clamp', 'tty_start', 'tty_signal', 'tty_done']) {
    assert.match(out[key], /^Chunk ID: [0-9a-f]{8}\nWall time: \d+\.\d{3} seconds\n/m, key);
    assert.match(out[key], /\nOriginal token count: \d+\nOutput:\n/, key);
  }
  assert.match(out.short, /Process exited with code 0/);
  assert.match(out.short, /SHORT_OK$/);
  assert.match(out.nonzero, /Process exited with code 7/);
  assert.match(out.nonzero, /ERR$/);
  assert.match(out.login_shell, /SHELL_OK$/);
  assert.match(out.truncated, /BEGIN-/);
  assert.match(out.truncated, /bytes omitted/);
  assert.match(out.truncated, /-END$/);
  const largeOutput = out.default_large.split('Output:\n')[1];
  assert.ok(Buffer.byteLength(largeOutput, 'utf8') <= 32_000, `default output was ${Buffer.byteLength(largeOutput, 'utf8')} bytes`);
  assert.equal((largeOutput.match(/bytes omitted/g) || []).length, 1);
  assert.match(largeOutput, /^1\n2\n3\n/);
  assert.match(largeOutput, /59999\n60000\n?$/);
  assert.ok(Number(out.default_large.match(/Original token count: (\d+)/)[1]) > 8_000);
  assert.match(out.rg, /Process exited with code 0/);
  assert.match(out.rg, /calc\.py:1:def add\(a, b\):/);
  assert.equal(out.rg_sessions, 0);
  assert.match(out.cat, /Process exited with code 0/);
  assert.match(out.running, /Process running with session ID [0-9a-f]+/);
  assert.match(out.poll, /Process exited with code 0/);
  assert.match(out.poll, /DONE$/);
  assert.match(out.finished_error, /Unknown or finished command session/);
  assert.equal(out.non_tty_write_error, 'stdin is closed for this session; rerun exec_command with tty=true to keep stdin open');
  assert.match(out.non_tty_poll, /Process running with session ID [0-9a-f]+/);
  assert.ok(out.non_tty_poll_elapsed >= 4.5, `empty poll lower clamp was ${out.non_tty_poll_elapsed}s`);
  const nonTtyPollWall = Number(out.non_tty_poll.match(/Wall time: ([0-9.]+) seconds/)[1]);
  assert.ok(Math.abs(nonTtyPollWall - out.non_tty_poll_elapsed) < 0.5, `poll wall time ${nonTtyPollWall}s did not match ${out.non_tty_poll_elapsed}s interaction`);
  assert.match(out.non_tty_cleanup, /Process exited with code /);
  assert.match(out.non_tty_interrupt, /Process exited with code /);
  assert.equal(out.non_tty_interrupt_pgrep, 1);
  assert.match(out.non_tty_interrupt_repeat, /Unknown or finished command session/);
  assert.match(out.stdin, /Process exited with code 0/);
  assert.match(out.stdin, /got:hello/);
  assert.ok(out.stdin_elapsed < 2, `tty write with default yield took ${out.stdin_elapsed}s`);
  const wallAfterPause = Number(out.wall_after_pause.match(/Wall time: ([0-9.]+) seconds/)[1]);
  assert.ok(wallAfterPause < 1, `write_stdin wall time used process age: ${wallAfterPause}s`);
  assert.match(out.wall_after_pause, /wall:hello/);
  assert.match(out.finished_tty_write, /Process exited with code 7/);
  assert.match(out.finished_tty_write, /LATE_TTY/);
  assert.match(out.finished_tty_repeat, /Unknown or finished command session/);
  assert.match(out.finished_non_tty_ctrl_c, /Process exited with code 9/);
  assert.match(out.finished_non_tty_ctrl_c, /LATE_CTRL/);
  assert.match(out.tty_write_race, /Process exited with code 11/);
  assert.match(out.tty_write_race, /TTY_RACE/);
  assert.match(out.terminate_race, /Process exited with code 12/);
  assert.match(out.terminate_race, /TERM_RACE/);
  assert.match(out.write_clamp, /Process exited with code 0/);
  assert.match(out.write_clamp, /CLAMP_WRITE$/);
  assert.match(out.exec_clamp_low, /CLAMP_LOW$/);
  assert.match(out.exec_clamp_high, /CLAMP_HIGH$/);
  assert.match(out.token_clamp, /TOKEN_CLAMP$/);
  assert.match(out.tty_start, /Process running with session ID [0-9a-f]+/);
  assert.match(out.tty_start, /READY/);
  assert.match(out.tty_signal, /\^C/);
  assert.match(out.tty_done, /Process exited with code /);
  assert.match(out.errors.empty_cmd, /cmd must not be empty/);
  assert.match(out.errors.empty_workdir, /workdir is required/);
  assert.match(out.errors.missing_workdir, /Path does not exist/);
  assert.match(out.errors.file_workdir, /workdir is not a directory/);
  assert.match(out.errors.string_yield, /yield_time_ms must be an integer from 250 to 30000/);
  assert.match(out.errors.string_tokens, /max_output_tokens must be an integer from 1 to 8000/);
  assert.equal(out.errors.string_write_yield, 'yield' + '_time_ms must be an integer from 5000 to 60000');
  assert.match(out.errors.unknown_session, /Unknown or finished command session/);
});


test('native Codex apply_patch and Codex-form view_image satisfy the macOS contract', { timeout: 60_000 }, async t => {
  if (process.platform !== 'darwin' || !existsSync(userCodex) || !existsSync(executorVenvPython)) {
    t.skip('patch/image probe requires macOS, Codex, and the executor venv');
    return;
  }
  const root = await mkdtemp(path.join(homedir(), 'Library', 'Caches', 'web-pilot-codex-patch-image-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const codexHome = path.join(root, 'codex-home');
  await mkdir(codexHome, { recursive: true });
  await writeFile(path.join(codexHome, 'config.toml'), '[analytics]\nenabled = false\n');

  const probe = path.join(root, 'probe.py');
  await writeFile(probe, [
    'import json, os, pathlib, struct, subprocess, sys, zlib',
    'sys.path.insert(0, sys.argv[1])',
    'import server',
    'from app_server_client import AppServerClient',
    'codex, root, codex_home = sys.argv[2], pathlib.Path(sys.argv[3]), sys.argv[4]',
    'client = AppServerClient(binary=codex, cwd=str(root), environment={"CODEX_HOME": codex_home}, request_timeout=20)',
    'facade = server.LocalFacade(client, root / "state")',
    'def patch(text): return "*** Begin Patch\\n" + text + "\\n*** End Patch"',
    'def png(width, height):',
    '    def chunk(kind, data):',
    '        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)',
    '    raw = b"".join(b"\\x00" + (b"\\xff\\x00\\x00\\xff" * width) for _ in range(height))',
    '    return b"\\x89PNG\\r\\n\\x1a\\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")',
    'out = {}',
    'try:',
    '    out["add"] = facade.apply_patch(patch("*** Add File: alpha.txt\\n+one"), str(root))',
    '    out["after_add"] = (root / "alpha.txt").read_text()',
    '    out["update"] = facade.apply_patch(patch("*** Update File: alpha.txt\\n@@\\n-one\\n+two"), str(root))',
    '    out["after_update"] = (root / "alpha.txt").read_text()',
    '    out["move"] = facade.apply_patch(patch("*** Update File: alpha.txt\\n*** Move to: beta.txt\\n@@\\n-two\\n+three"), str(root))',
    '    out["after_move"] = [(root / "alpha.txt").exists(), (root / "beta.txt").read_text()]',
    '    out["delete"] = facade.apply_patch(patch("*** Delete File: beta.txt"), str(root))',
    '    out["after_delete"] = (root / "beta.txt").exists()',
    '    errors = {}',
    '    cases = {',
    '        "empty": lambda: facade.apply_patch("", str(root)),',
    '        "missing_header": lambda: facade.apply_patch("*** Add File: x.txt\\n+x", str(root)),',
    '        "too_large": lambda: facade.apply_patch("*** Begin Patch\\n" + ("x" * (server.MAX_PATCH_BYTES + 1)), str(root)),',
    '        "missing_workdir": lambda: facade.apply_patch(patch("*** Add File: x.txt\\n+x"), str(root / "missing")),',
    '        "invalid_native": lambda: facade.apply_patch(patch("*** Update File: absent.txt\\n@@\\n-old\\n+new"), str(root)),',
    '    }',
    '    for name, call in cases.items():',
    '        try:',
    '            call()',
    '            errors[name] = None',
    '        except Exception as error:',
    '            errors[name] = str(error)',
    '    out["errors"] = errors',
    '    missing = client.start_command(["webpilot-command-that-does-not-exist"], cwd=str(root), sandbox_policy={"type":"dangerFullAccess"})',
    '    missing_result = client.read_command_output(missing["process_id"], cursor=0, wait_ms=1000)',
    '    out["unavailable"] = str(facade._native_apply_patch_error(str(missing_result.get("error") or missing_result.get("output") or "")))',
    '    image = root / "wide.png"',
    '    image.write_bytes(png(2000, 10))',
    '    shown = facade.view_image(str(image))',
    '    rendered = root / "rendered.png"',
    '    rendered.write_bytes(shown[1].data)',
    '    dimensions = subprocess.run(["/usr/bin/sips", "-g", "pixelWidth", "-g", "pixelHeight", str(rendered)], capture_output=True, text=True, check=True).stdout',
    '    out["image_meta"] = shown[0]',
    '    out["image_type"] = type(shown[1]).__name__',
    '    out["dimensions"] = dimensions',
    '    text = root / "plain.txt"',
    '    text.write_text("not an image")',
    '    huge = root / "huge.png"',
    '    with huge.open("wb") as stream:',
    '        stream.seek(server.MAX_VIEW_IMAGE_BYTES)',
    '        stream.write(b"x")',
    '    secret_dir = root / ".ssh"',
    '    secret_dir.mkdir()',
    '    secret = secret_dir / "secret.png"',
    '    secret.write_bytes(image.read_bytes())',
    '    image_errors = {}',
    '    for name, value in {"missing": root / "missing.png", "text": text, "huge": huge, "secret": secret}.items():',
    '        try:',
    '            facade.view_image(str(value))',
    '            image_errors[name] = None',
    '        except Exception as error:',
    '            image_errors[name] = str(error)',
    '    out["image_errors"] = image_errors',
    '    out["leftovers"] = [item.name for item in (root / "state").glob("view-image-*")]',
    '    mcp = server.create_server(host="127.0.0.1", port=0, state_root=root / "schema-state", codex_binary=codex)',
    '    out["apply_params"] = mcp._tool_manager.get_tool("apply_patch").parameters',
    '    out["view_params"] = mcp._tool_manager.get_tool("view_image").parameters',
    'finally:',
    '    client.close()',
    'print(json.dumps(out))',
  ].join('\n'));

  const run = await new Promise((resolve, reject) => {
    const child = spawn(executorVenvPython, ['-B', probe, clientDir, userCodex, root, codexHome], {
      cwd: root,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  assert.equal(run.code, 0, run.stderr || run.stdout);
  const out = JSON.parse(run.stdout.trim().split('\n').at(-1));

  for (const name of ['add', 'update', 'move', 'delete']) assert.match(out[name], /^Success\./);
  assert.equal(out.after_add, 'one\n');
  assert.equal(out.after_update, 'two\n');
  assert.deepEqual(out.after_move, [false, 'three\n']);
  assert.equal(out.after_delete, false);
  assert.match(out.errors.empty, /patch is empty/);
  assert.match(out.errors.missing_header, /must start with \*\*\* Begin Patch/);
  assert.match(out.errors.too_large, /larger than 1000000 bytes/);
  assert.match(out.errors.missing_workdir, /Path does not exist/);
  assert.ok(out.errors.invalid_native && out.errors.invalid_native.length > 0);
  assert.match(out.unavailable, /Codex apply_patch command is unavailable/);

  assert.equal(out.image_type, 'Image');
  assert.equal(out.image_meta.source, path.join(root, 'wide.png'));
  assert.ok(out.image_meta.bytes > 0);
  assert.match(out.dimensions, /pixelWidth:\s+1600/);
  assert.match(out.dimensions, /pixelHeight:\s+8/);
  assert.match(out.image_errors.missing, /Path does not exist/);
  assert.match(out.image_errors.text, /not an image/);
  assert.match(out.image_errors.huge, /larger than 20000000 bytes/);
  assert.match(out.image_errors.secret, /Sensitive credential\/private path/);
  assert.deepEqual(out.leftovers, []);

  assert.deepEqual(Object.keys(out.apply_params.properties).sort(), ['patch', 'workdir']);
  assert.deepEqual(out.apply_params.required.sort(), ['patch', 'workdir']);
  assert.deepEqual(Object.keys(out.view_params.properties), ['path']);
  assert.deepEqual(out.view_params.required, ['path']);
});

// Every control.py test runs on a temporary state and never reads the real state of the retired local runtime.
function controlEnvironment(root, extra = {}) {
  return {
    WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR: path.join(root, 'state'),
    WORKFLOW_PILOT_CODEX_EXECUTOR_PORT: '27852',
    WORKFLOW_PILOT_CODEX_EXECUTOR_TUNNEL_PORT: '27853',
    WORKFLOW_PILOT_LEGACY_LOCAL_STATE_DIR: path.join(root, 'no-legacy-state'),
    ...extra,
  };
}

function configureTunnel(control, env, key = '0123456789abcdefghijklmnop') {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [control, 'configure-tunnel', '--tunnel-id', 'tunnel_abcdefghijklmnop', '--key-stdin'],
      { cwd: repoRoot, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.stdin.end(key + '\n');
  });
}

test('executor lifecycle keeps its own state, ports and tunnel credentials and needs no other runtime', { timeout: 20_000 }, async () => {
  const { readFile, stat } = await import('node:fs/promises');
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-control-'));
  const state = path.join(root, 'state');
  const control = path.join(repoRoot, 'tools', 'codex-app-server-mcp', 'control.py');
  const env = controlEnvironment(root);
  const selectorFile = path.join(state, 'private', 'selector.json');
  const profilePath = path.join(state, 'private', 'tunnel-profile', 'codex-executor.yaml');
  const keyPath = path.join(state, 'private', 'tunnel-key');

  try {
    const status = await runPython(control, ['status'], env);
    assert.equal(status.code, 0, status.stderr || status.stdout);
    const statusJson = JSON.parse(status.stdout);
    assert.equal(statusJson.ok, true);
    assert.equal(statusJson.mcp_url, 'http://127.0.0.1:27852/mcp');
    assert.equal(statusJson.tunnel.ready, false);
    assert.equal(statusJson.selector, null);

    // First run: there is no tunnel yet. The selector is written anyway and nothing is invented.
    const first = await runPython(control, ['configure-selector'], env);
    assert.equal(first.code, 0, first.stderr || first.stdout);
    assert.deepEqual(JSON.parse(first.stdout), { ok: true, configured: true, mode: 'app-server',
      mcp_url: 'http://127.0.0.1:27852/mcp', chatgpt_channel: 'secure-tunnel', adopted_tunnel: false });
    assert.deepEqual(JSON.parse(await readFile(selectorFile, 'utf8')),
      { schema_version: 1, mode: 'app-server', mcp_url: 'http://127.0.0.1:27852/mcp', chatgpt_channel: 'secure-tunnel' });
    assert.equal(existsSync(profilePath), false);
    assert.equal(existsSync(keyPath), false);

    const configured = await configureTunnel(control, env);
    assert.equal(configured.code, 0, configured.stderr || configured.stdout);
    assert.equal(JSON.parse(configured.stdout).configured, true);
    const profile = await readFile(profilePath, 'utf8');
    assert.match(profile, /127\.0\.0\.1:27852\/mcp/);
    assert.match(profile, /127\.0\.0\.1:27853/);
    assert.match(profile, /WORKFLOW_PILOT_CODEX_EXECUTOR_TUNNEL_API_KEY/);
    assert.doesNotMatch(profile, /0123456789abcdefghijklmnop/);
    assert.equal((await readFile(keyPath, 'utf8')).trim(), '0123456789abcdefghijklmnop');
    assert.equal((await stat(keyPath)).mode & 0o777, 0o600);
    assert.equal(profile.includes('17842'), false);
    assert.equal(profile.includes('17843'), false);

    // A selector left by 0.6.90 in the retired local mode is read as the only backend and rewritten without its block.
    await writeFile(selectorFile, JSON.stringify({ schema_version: 1, mode: 'local', mcp_url: 'http://127.0.0.1:27842/mcp', chatgpt_channel: 'vps',
      local: { python: '/gone/python3', control: '/gone/control.py', runtime_root: '/gone', state_directory: '/gone/state' } }));
    assert.deepEqual(JSON.parse((await runPython(control, ['status'], env)).stdout).selector,
      { mode: 'app-server', mcp_url: 'http://127.0.0.1:27842/mcp', chatgpt_channel: 'vps' });
    const selected = await runPython(control, ['configure-selector'], env);
    assert.equal(selected.code, 0, selected.stderr || selected.stdout);
    assert.deepEqual(JSON.parse(await readFile(selectorFile, 'utf8')),
      { schema_version: 1, mode: 'app-server', mcp_url: 'http://127.0.0.1:27852/mcp', chatgpt_channel: 'vps' });
    assert.match(await readFile(profilePath, 'utf8'), /127\.0\.0\.1:27852\/mcp/);

    // The old arguments are gone together with the second backend.
    const legacyCall = await runPython(control, ['configure-selector', '--mode', 'local', '--mcp-url', 'http://127.0.0.1:27842/mcp'], env);
    assert.notEqual(legacyCall.code, 0);
    const source = await readFile(control, 'utf8');
    for (const gone of ['run_local_control', '--local-python', 'Codex Local Mac', 'mac-codex-local']) assert.equal(source.includes(gone), false, gone);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a new product never adopts the donor tunnel or credentials during selector setup', async () => {
  const { readFile } = await import('node:fs/promises');
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-stable-tunnel-adopt-'));
  const state = path.join(root, 'state');
  const legacyState = path.join(root, 'legacy-state');
  const legacyProfileDir = path.join(legacyState, 'private', 'tunnel-profile');
  const control = path.join(repoRoot, 'tools', 'codex-app-server-mcp', 'control.py');
  const secret = 'stable-local-key-abcdefghijklmnop';
  const env = controlEnvironment(root, { WORKFLOW_PILOT_LEGACY_LOCAL_STATE_DIR: legacyState });
  const keyPath = path.join(state, 'private', 'tunnel-key');
  await mkdir(legacyProfileDir, { recursive: true });
  await writeFile(path.join(legacyState, 'private', 'tunnel-key'), secret + '\n');
  try {
    // A damaged legacy profile is not carried over and does not stop the first run.
    await writeFile(path.join(legacyProfileDir, 'mac-local.yaml'), '{ broken');
    const damaged = await runPython(control, ['configure-selector'], env);
    assert.equal(damaged.code, 0, damaged.stderr || damaged.stdout);
    assert.equal(JSON.parse(damaged.stdout).adopted_tunnel, false);
    assert.equal(existsSync(keyPath), false);

    await writeFile(path.join(legacyProfileDir, 'mac-local.yaml'), JSON.stringify({
      config_version: 1,
      control_plane: { base_url: 'https://api.openai.com', tunnel_id: 'tunnel_abcdefghijklmnop', api_key: 'env:LOCAL_KEY' },
      health: { listen_addr: '127.0.0.1:17843' },
      mcp: { server_urls: [{ channel: 'main', url: 'http://127.0.0.1:17842/mcp' }] },
    }, null, 2));
    const result = await runPython(control, ['configure-selector'], env);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const data = JSON.parse(result.stdout);
    assert.equal(data.adopted_tunnel, false);
    assert.equal(data.mcp_url, 'http://127.0.0.1:27852/mcp');
    assert.equal((result.stdout + result.stderr).includes(secret), false);
    assert.equal(existsSync(keyPath), false, 'no donor key in the new runtime');
    assert.equal(existsSync(path.join(state, 'private', 'tunnel-profile', 'codex-executor.yaml')), false);
    // Donor files remain intact.
    assert.equal((await readFile(path.join(legacyState, 'private', 'tunnel-key'), 'utf8')).trim(), secret);

    const again = await runPython(control, ['configure-selector'], env);
    assert.equal(JSON.parse(again.stdout).adopted_tunnel, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a missing Codex is reported by its own code before anything is installed or started', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-missing-'));
  const probe = path.join(root, 'probe.py');
  const control = path.join(clientDir, 'control.py');
  await writeFile(probe, `import contextlib, importlib.util, io, json, os, sys
control_file, client_dir, scratch = sys.argv[1:4]
sys.path.insert(0, client_dir)
spec = importlib.util.spec_from_file_location("ctl", control_file)
ctl = importlib.util.module_from_spec(spec); spec.loader.exec_module(ctl)
import app_server_client
def missing(explicit=None):
    raise app_server_client.AppServerError("No compatible Codex binary was found")
app_server_client.discover_codex_binary = missing
out = {"path_before": os.environ.get("PATH")}
def run(command):
    sys.argv = ["control.py", *command]
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        code = ctl.main()
    return {"exit": code, **json.loads(buffer.getvalue())}
out["setup"] = run(["setup"])
out["start"] = run(["start", "--mcp-only"])
out["path_after"] = os.environ.get("PATH")
out["runtime_created"] = ctl.RUNTIME.exists()
os.environ["WORKFLOW_PILOT_UV"] = sys.executable
out["bundled_uv"] = ctl.find_uv() == sys.executable
os.environ["WORKFLOW_PILOT_UV"] = os.path.join(scratch, "no-such-uv")
out["missing_bundled_uv_ignored"] = ctl.find_uv() != os.environ["WORKFLOW_PILOT_UV"]
print(json.dumps(out))
`);
  try {
    // "start" reaches the Codex check only with an installed venv: borrow the real one read-only when it exists.
    const env = controlEnvironment(root);
    if (existsSync(executorVenvPython)) {
      await mkdir(path.join(root, 'state', 'runtime'), { recursive: true });
      await (await import('node:fs/promises')).symlink(path.dirname(path.dirname(executorVenvPython)), path.join(root, 'state', 'runtime', 'venv'));
    }
    const result = await runPython(probe, [control, clientDir, root], env);
    assert.equal(result.code, 0, result.stderr);
    const out = JSON.parse(result.stdout.trim().split('\n').at(-1));
    assert.deepEqual(out.setup, { exit: 1, ok: false, code: 'CODEX_NOT_FOUND',
      error: 'Codex is not installed: install the Codex CLI or the ChatGPT app and check again' });
    if (existsSync(executorVenvPython)) assert.equal(out.start.code, 'CODEX_NOT_FOUND');
    else assert.match(out.start.error, /setup first/);
    assert.equal(out.runtime_created, existsSync(executorVenvPython), 'setup stops before it creates the runtime folder');
    assert.equal(out.path_after, out.path_before, 'the search path of the caller is restored');
    assert.equal(out.bundled_uv, true);
    assert.equal(out.missing_bundled_uv_ignored, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function runCommand(command, args, env = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(command + ' exited ' + code)));
  });
}

// A real process group recorded as if control.py had launched it.
async function fakeService(state, name) {
  const child = spawn('/bin/sleep', ['60'], { detached: true, stdio: 'ignore' });
  const exited = new Promise(resolve => child.once('exit', () => resolve(true)));
  await new Promise(resolve => setTimeout(resolve, 150));
  const identity = await runCommand('/bin/ps', ['-p', String(child.pid), '-o', 'lstart=', '-o', 'command='], { LC_ALL: 'C', LANG: 'C' });
  await mkdir(state, { recursive: true });
  await writeFile(path.join(state, name + '.pid.json'), JSON.stringify({ pid: child.pid, identity }));
  return { child, exited };
}

test('ChatGPT channel is kept by the selector; login starts only the App Server MCP and obeys the channel', { timeout: 90_000 }, async t => {
  const { readFile, symlink } = await import('node:fs/promises');
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-chatgpt-channel-'));
  const state = path.join(root, 'state');
  const control = path.join(clientDir, 'control.py');
  const env = controlEnvironment(root);
  const services = [];
  const json = result => JSON.parse(result.stdout);
  const selectorFile = path.join(state, 'private', 'selector.json');
  const readSelector = async () => JSON.parse(await readFile(selectorFile, 'utf8'));
  // Login starts the real MCP server: it needs the installed venv. The tunnel-client is deliberately absent here.
  const canStart = process.platform === 'darwin' && existsSync(executorVenvPython) && existsSync(userCodex);
  try {
    if (canStart) {
      await mkdir(path.join(state, 'runtime'), { recursive: true });
      await symlink(path.dirname(path.dirname(executorVenvPython)), path.join(state, 'runtime', 'venv'));
    }
    assert.equal((await runPython(control, ['configure-selector'], env)).code, 0);

    if (canStart) {
      // First run at login: no tunnel is configured yet. The MCP comes up and nothing fails.
      const firstLogin = await runPython(control, ['selector-start'], env);
      assert.equal(firstLogin.code, 0, firstLogin.stdout + firstLogin.stderr);
      assert.equal(json(firstLogin).mcp.ready, true);
      assert.equal(json(firstLogin).tunnel.configured, false);
      assert.equal(json(firstLogin).tunnel.running, false);
      assert.deepEqual(json(firstLogin).selected_backend.mode, 'app-server');
      assert.equal(json(await runPython(control, ['stop'], env)).ok, true);
    }

    const configured = await configureTunnel(control, env);
    assert.equal(configured.code, 0, configured.stdout);
    const selected = await runPython(control, ['configure-selector'], env);
    assert.equal(selected.code, 0, selected.stdout);
    assert.equal(json(selected).chatgpt_channel, 'secure-tunnel');
    assert.equal(json(await runPython(control, ['status'], env)).selector.chatgpt_channel, 'secure-tunnel');

    const invalid = await runPython(control, ['configure-channel', '--channel', 'public'], env);
    assert.notEqual(invalid.code, 0);
    assert.equal((await readSelector()).chatgpt_channel, 'secure-tunnel');

    const vps = await runPython(control, ['configure-channel', '--channel', 'vps'], env);
    assert.equal(vps.code, 0, vps.stdout);
    assert.deepEqual(json(vps), { ok: true, configured: true, chatgpt_channel: 'vps' });
    assert.deepEqual(await readSelector(), { schema_version: 1, mode: 'app-server', mcp_url: 'http://127.0.0.1:27852/mcp', chatgpt_channel: 'vps' });

    // stop --tunnel-only stops tunnel-client and leaves MCP running.
    const tunnel = await fakeService(state, 'tunnel'); services.push(tunnel.child);
    const mcp = await fakeService(state, 'mcp'); services.push(mcp.child);
    const stopped = await runPython(control, ['stop', '--tunnel-only'], env);
    assert.equal(stopped.code, 0, stopped.stdout);
    assert.deepEqual(json(stopped).services.map(service => service.service), ['tunnel']);
    assert.equal(await tunnel.exited, true);
    assert.equal(existsSync(path.join(state, 'tunnel.pid.json')), false);
    assert.equal(existsSync(path.join(state, 'mcp.pid.json')), true);
    assert.equal(mcp.child.exitCode, null);
    assert.equal(json(await runPython(control, ['stop'], env)).ok, true);
    assert.equal(await mcp.exited, true);

    // A reconfigured selector keeps the ChatGPT channel.
    const again = await runPython(control, ['configure-selector'], env);
    assert.equal(json(again).chatgpt_channel, 'vps');
    assert.equal((await readSelector()).chatgpt_channel, 'vps');

    if (!canStart) { t.diagnostic('login checks skipped: the executor venv or Codex is not installed'); return; }

    // Login in vps mode stops a running tunnel-client and never starts it.
    const loginTunnel = await fakeService(state, 'tunnel'); services.push(loginTunnel.child);
    const vpsLogin = await runPython(control, ['selector-start'], env);
    assert.equal(vpsLogin.code, 0, vpsLogin.stdout + vpsLogin.stderr);
    const login = json(vpsLogin);
    assert.equal(login.mcp.ready, true);
    assert.equal(login.tunnel.running, false);
    assert.deepEqual(login.selected_backend.mcp_url, 'http://127.0.0.1:27852/mcp');
    assert.equal(login.selector.chatgpt_channel, 'vps');
    assert.equal(await loginTunnel.exited, true);
    assert.equal(existsSync(path.join(state, 'tunnel.pid.json')), false);

    // Secure Tunnel at login still starts tunnel-client (missing here, so the attempt is visible).
    assert.equal((await runPython(control, ['configure-channel', '--channel', 'secure-tunnel'], env)).code, 0);
    const secureLogin = await runPython(control, ['selector-start'], env);
    assert.equal(secureLogin.code, 1);
    assert.match(json(secureLogin).error, /tunnel-client is missing/);
  } finally {
    await runPython(control, ['stop'], env).catch(() => {});
    for (const child of services) if (child.exitCode === null && child.signalCode === null) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    }
    await rm(root, { recursive: true, force: true });
  }
});

test('App Server MCP answers a stale session id without initialize after a restart', { timeout: 60_000 }, async t => {
  const venvPython = path.join(repoRoot, '.harness', 'runtime', 'test-python', 'bin', 'python');
  const source = await (await import('node:fs/promises')).readFile(path.join(clientDir, 'server.py'), 'utf8');
  assert.match(source, /stateless_http=True/);
  if (!existsSync(venvPython)) { t.skip('Codex App Server runtime venv is not installed'); return; }
  const port = await new Promise((resolve, reject) => {
    const probe = http.createServer().listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
    probe.on('error', reject);
  });
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-stateless-'));
  const server = spawn(venvPython, ['-B', path.join(clientDir, 'server.py'), '--port', String(port), '--state-dir', root],
    { cwd: clientDir, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  server.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
    await rm(root, { recursive: true, force: true });
  });
  // The id belongs to no process: exactly what ChatGPT sends after Web Pilot restarted the server.
  const call = () => fetch(`http://127.0.0.1:${port}/mcp`, { method: 'POST', headers: {
    'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    'Mcp-Session-Id': '0123456789abcdef0123456789abcdef', 'MCP-Protocol-Version': '2025-06-18',
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list', params: {} }) });
  let response;
  for (let attempt = 0; attempt < 100 && !response; attempt += 1) {
    try { response = await call(); } catch { await new Promise(resolve => setTimeout(resolve, 200)); }
    assert.equal(server.exitCode, null, stderr);
  }
  assert.ok(response, 'server did not start: ' + stderr);
  const text = await response.text();
  assert.equal(response.status, 200, text);
  assert.equal(response.headers.get('mcp-session-id'), null);
  const payload = text.trim().startsWith('{') ? text : text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).at(-1);
  const message = JSON.parse(payload);
  assert.equal(message.id, 7);
  const tools = message.result.tools;
  const panel=tools.find(tool=>tool.name==='workflow_pilot_panel');
  assert.equal(panel.annotations.readOnlyHint,false);
  assert.equal(panel.annotations.idempotentHint,true);
  assert.equal(panel.inputSchema.properties.ctx,undefined);
  assert.equal(panel.inputSchema.properties.enrollment_ticket.anyOf[0].pattern,'^[a-f0-9]{64}$');
  for(const name of ['workflow_communication_join','workflow_communication_probe'])
    assert.match(tools.find(tool=>tool.name===name).description,/Legacy experiment only/);
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    'apply_patch', 'bridge_status', 'computer_capture_screen', 'computer_capture_window',
    'computer_list_windows', 'exec_command',
    'turn_watchdog', 'view_image',
    'workflow_assignment_send', 'workflow_assignment_status', 'workflow_assignment_yield',
    'workflow_communication_bind', 'workflow_communication_claim', 'workflow_communication_enable',
    'workflow_communication_export',
    'workflow_communication_join', 'workflow_communication_journal', 'workflow_communication_participants', 'workflow_communication_probe',
    'workflow_communication_read_context',
    'workflow_communication_read_message', 'workflow_communication_recover', 'workflow_communication_report', 'workflow_communication_send_message',
    'workflow_communication_status', 'workflow_communication_stop', 'workflow_communication_sync', 'workflow_communication_telemetry', 'workflow_communication_verify', 'workflow_communication_wait',
    'workflow_connect_project', 'workflow_open_project', 'workflow_pilot_panel',
    'write_stdin',
  ]);
  for (const tool of tools) {
    assert.ok(tool.description?.trim(), `${tool.name} description is required`);
    for (const [parameter, schema] of Object.entries(tool.inputSchema.properties || {})) {
      assert.ok(schema.description?.trim(), `${tool.name}.${parameter} description is required`);
    }
  }
  for (const name of ['exec_command', 'write_stdin']) {
    const tool = tools.find(candidate => candidate.name === name);
    const outputSchema = tool.inputSchema.properties.max_output_tokens;
    assert.equal(outputSchema.default, 8000, `${name}.max_output_tokens default`);
    assert.match(outputSchema.description, /Defaults to 8000 tokens/);
    assert.match(outputSchema.description, /1-8000/);
    assert.match(tool.description, /If OpenAI blocked the call before execution, retry the same call once unchanged; change or split it only if the retry is blocked too\./);
  }
  assert.match(tools.find(tool => tool.name === 'exec_command').description, /capped at 8000 estimated tokens/);
  assert.match(tools.find(tool => tool.name === 'apply_patch').description, /Codex apply_patch format to edit files/);
  assert.equal(tools.find(tool => tool.name === 'view_image').inputSchema.properties.path.description, 'Local filesystem path to an image file.');
  for (const name of ['view_image', 'computer_capture_screen', 'computer_capture_window']) {
    const description = tools.find(tool => tool.name === name).description;
    assert.match(description, /text block with JSON metadata and an image\/png block/);
    assert.match(description, /content_items/);
    assert.match(description, /image\(\)/);
  }
});

test('window list and screenshots use system tools and validate input before running a command', { timeout: 30_000 }, async t => {
  const venvPython = path.join(repoRoot, '.harness', 'runtime', 'test-python', 'bin', 'python');
  const source = await (await import('node:fs/promises')).readFile(path.join(clientDir, 'server.py'), 'utf8');
  assert.match(source, /def computer_capture_window\(/);
  if (!existsSync(venvPython)) { t.skip('Codex App Server runtime venv is not installed'); return; }
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-observation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const probe = path.join(root, 'probe.py');
  await writeFile(probe, `import json, sys, pathlib
sys.path.insert(0, sys.argv[1])
import server
calls = []
windows = [
    {"window_id": 84, "application": "Calculator", "pid": 501, "title": "Калькулятор", "bounds": {"X": 10, "Y": 20, "Width": 300, "Height": 400}},
    {"window_id": 91, "application": "TextEdit", "pid": 502, "title": "Notes.txt", "bounds": {"X": 0, "Y": 0, "Width": 800, "Height": 600}},
    {"window_id": "broken", "application": "Ignored"},
]
listing = {"exit": 0, "stdout": json.dumps(windows)}
class Client:
    cwd = sys.argv[2]
    def command_exec(self, argv, **kwargs):
        calls.append(argv)
        if argv[0] == "/usr/bin/osascript":
            return {"exitCode": listing["exit"], "stdout": listing["stdout"], "stderr": "not allowed" if listing["exit"] else ""}
        if argv[0] == "/usr/sbin/screencapture":
            if "-l" in argv and argv[argv.index("-l") + 1] == "404":
                return {"exitCode": 1, "stdout": "", "stderr": "could not create image from window"}
            pathlib.Path(argv[-1]).write_bytes(b"PNGDATA")
        return {"exitCode": 0, "stdout": "", "stderr": ""}
    def fs_read_file(self, path):
        return pathlib.Path(path).read_bytes()
state = pathlib.Path(sys.argv[2])
facade = server.LocalFacade(Client(), state)
out = {}
out["all"] = facade.computer_list_windows()
out["by_title"] = [row["window_id"] for row in facade.computer_list_windows("notes")["windows"]]
out["by_app"] = [row["window_id"] for row in facade.computer_list_windows("calc")["windows"]]
out["limited"] = len(facade.computer_list_windows(max_results=1)["windows"])
listing["stdout"] = json.dumps([{**row, "title": None} for row in windows[:2]])
out["no_permission"] = facade.computer_list_windows()
errors = {}
for name, (code, stdout) in {"failed": (1, ""), "garbage": (0, "not json"), "not_a_list": (0, "{}")}.items():
    listing.update(exit=code, stdout=stdout)
    try:
        facade.computer_list_windows()
        errors[name] = None
    except ValueError as error:
        errors[name] = str(error)
calls.clear()
window = facade.computer_capture_window(84, 800)
out["window"] = [window[0], type(window[1]).__name__]
out["window_calls"] = [argv[:-1] for argv in calls]
calls.clear()
for name, bad in {"zero": 0, "negative": -5, "bool": True, "text": "84"}.items():
    try:
        facade.computer_capture_window(bad)
        errors[name] = None
    except ValueError as error:
        errors[name] = str(error)
out["calls_for_invalid_ids"] = len(calls)
try:
    facade.computer_capture_window(404)
    errors["missing_window"] = None
except ValueError as error:
    errors["missing_window"] = str(error)
calls.clear()
screen = facade.computer_capture_screen(1, 2, 3, 4, 0, True)
out["screen"] = [screen[0], type(screen[1]).__name__]
out["screen_calls"] = [argv[:-1] for argv in calls]
out["errors"] = errors
out["leftovers"] = sorted(item.name for item in state.glob("screen-*"))
out["ui_control"] = sorted(name for name in dir(facade) if name.startswith("computer_"))
print(json.dumps(out, ensure_ascii=False))
`);
  const run = await new Promise((resolve, reject) => {
    const child = spawn(venvPython, ['-B', probe, clientDir, root], { cwd: root, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  assert.equal(run.code, 0, run.stderr);
  const out = JSON.parse(run.stdout.trim().split('\n').at(-1));

  // Only the three observation methods remain on the facade.
  assert.deepEqual(out.ui_control, ['computer_capture_screen', 'computer_capture_window', 'computer_list_windows']);

  assert.deepEqual(out.all.windows, [
    { window_id: 84, title: 'Калькулятор', application: 'Calculator', pid: 501, rect: { x: 10, y: 20, width: 300, height: 400 } },
    { window_id: 91, title: 'Notes.txt', application: 'TextEdit', pid: 502, rect: { x: 0, y: 0, width: 800, height: 600 } },
  ]);
  assert.equal(out.all.note, undefined);
  assert.deepEqual(out.by_title, [91]);
  assert.deepEqual(out.by_app, [84]);
  assert.equal(out.limited, 1);
  // Without Screen Recording permission macOS hides titles: the answer says so instead of looking empty.
  assert.equal(out.no_permission.windows.length, 2);
  assert.match(out.no_permission.note, /Screen Recording permission/);
  assert.match(out.errors.failed, /not allowed/);
  assert.match(out.errors.garbage, /invalid data/);
  assert.match(out.errors.not_a_list, /invalid data/);

  assert.deepEqual(out.window, [{ source: 'window', window_id: 84, bytes: 7 }, 'Image']);
  assert.deepEqual(out.window_calls, [
    ['/usr/sbin/screencapture', '-x', '-t', 'png', '-o', '-l', '84'],
    ['/usr/bin/sips', '-Z', '800'],
  ]);
  for (const name of ['zero', 'negative', 'bool', 'text']) assert.match(out.errors[name], /positive integer/, name);
  assert.equal(out.calls_for_invalid_ids, 0, 'an invalid window_id never reaches a command');
  assert.match(out.errors.missing_window, /could not create image from window/);

  assert.deepEqual(out.screen, [{ source: 'desktop', bytes: 7 }, 'Image']);
  assert.deepEqual(out.screen_calls, [['/usr/sbin/screencapture', '-x', '-t', 'png', '-C', '-R', '1,2,3,4']]);
  assert.deepEqual(out.leftovers, [], 'temporary screenshots are removed, also after a failed capture');
});

const SERVER_INSTRUCTIONS = 'Local-computer tools only. Use ChatGPT native web/cloud tools for public information. '
  + 'This MCP uses Codex App Server as an executor and never launches a Codex model turn. '
  + 'No UI control: this MCP cannot move the mouse, press keys or switch windows. Observation only: '
  + 'computer_list_windows, computer_capture_screen and computer_capture_window. '
  + 'Tool usage: search with rg through exec_command; edit text files with apply_patch and do not reread them after a successful patch. '
  + 'Workflow roles come from read_message. '
  + 'Do not background commands with & or nohup: they end when the command returns. '
  + 'Run a long command with exec_command and poll its session ID with write_stdin, empty chars; never rerun it. '
  + 'If OpenAI blocked the call before execution, retry the same call once unchanged; change or split it only if the retry is blocked too.';

test('server instructions are the short tool rules and the executor drops the retired active-workspace record', { timeout: 60_000 }, async t => {
  const venvPython = path.join(repoRoot, '.harness', 'runtime', 'test-python', 'bin', 'python');
  if (!existsSync(venvPython)) { t.skip('Codex App Server runtime venv is not installed'); return; }
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-tools-only-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const probe = path.join(root, 'probe.py');
  await writeFile(probe, `import asyncio, json, sys, pathlib
sys.path.insert(0, sys.argv[1])
import server
root = pathlib.Path(sys.argv[2])
class Client:
    cwd = str(root)
state = root / "state"
state.mkdir()
record = state / "active-workspace.json"
record.write_text(json.dumps({"workspace": "/Projects/Old"}), encoding="utf-8")
(state / "keep.json").write_text("{}", encoding="utf-8")
facade = server.LocalFacade(Client(), state)
out = {"record_removed": not record.exists(), "other_kept": (state / "keep.json").exists()}
server.LocalFacade(Client(), state)
out["facade"] = [name for name in ("workflow_context", "workflow_recover", "active_workspace") if hasattr(facade, name)]
out["module"] = [name for name in ("session_rules", "split_context", "part_key", "context_part") if hasattr(server, name)]
mcp = server.create_server(host="127.0.0.1", port=0, state_root=state)
out["instructions"] = mcp.instructions
out["tools"] = sorted(tool.name for tool in asyncio.run(mcp.list_tools()))
print(json.dumps(out, ensure_ascii=False))
`);
  const run = await new Promise((resolve, reject) => {
    const child = spawn(venvPython, ['-B', probe, clientDir, root], { cwd: root, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  assert.equal(run.code, 0, run.stderr);
  const out = JSON.parse(run.stdout.trim().split('\n').at(-1));
  assert.equal(out.record_removed, true, 'the record written by 0.6.86–0.6.95 is removed at start');
  assert.equal(out.other_kept, true, 'nothing else in the state folder is touched');
  assert.deepEqual(out.facade, []); assert.deepEqual(out.module, []);
  assert.equal(out.instructions, SERVER_INSTRUCTIONS, 'the exact text of the server instructions');
  // 0.6.101: the long-command rule needs the room; the cap still keeps the instructions a short rule list.
  assert.ok(out.instructions.length < 850, 'short instructions');
  assert.doesNotMatch(out.instructions, /Workflow Kit|recover|context|part=|after key/i);
  assert.deepEqual(out.tools, ['apply_patch', 'bridge_status', 'computer_capture_screen', 'computer_capture_window',
    'computer_list_windows', 'exec_command', 'turn_watchdog', 'view_image',
    'workflow_assignment_send', 'workflow_assignment_status', 'workflow_assignment_yield',
    'workflow_communication_bind', 'workflow_communication_claim', 'workflow_communication_enable',
    'workflow_communication_export',
    'workflow_communication_join', 'workflow_communication_journal', 'workflow_communication_participants', 'workflow_communication_probe',
    'workflow_communication_read_context',
    'workflow_communication_read_message', 'workflow_communication_recover', 'workflow_communication_report', 'workflow_communication_send_message',
    'workflow_communication_status', 'workflow_communication_stop', 'workflow_communication_sync', 'workflow_communication_telemetry', 'workflow_communication_verify', 'workflow_communication_wait',
    'workflow_connect_project', 'workflow_open_project', 'workflow_pilot_panel',
    'write_stdin']);
});

test('pid identity forces C locale for stable Terminal ownership checks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-identity-'));
  const probe = path.join(root, 'probe.py');
  const control = path.join(repoRoot, 'tools', 'codex-app-server-mcp', 'control.py');
  await writeFile(probe, `import importlib.util, json, sys
spec=importlib.util.spec_from_file_location("ctl", sys.argv[1])
ctl=importlib.util.module_from_spec(spec); spec.loader.exec_module(ctl)
seen={}
class Result:
    returncode=0
    stdout="Sat Sep 19 13:39:39 2026     /tmp/fake-process\\n"
def fake_run(*args, **kwargs):
    seen.update(kwargs.get("env") or {})
    return Result()
ctl.subprocess.run=fake_run
identity=ctl.pid_identity(123)
print(json.dumps({"identity":identity,"LC_ALL":seen.get("LC_ALL"),"LANG":seen.get("LANG")}))
`);
  try {
    const result = await runPython(probe, [control], { LANG: 'ru_RU.UTF-8', LC_ALL: 'ru_RU.UTF-8' });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const data = JSON.parse(result.stdout.trim());
    assert.equal(data.LC_ALL, 'C');
    assert.equal(data.LANG, 'C');
    assert.match(data.identity, /^Sat Sep 19/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---- Windows branches of the executor, exercised on the build host with the platform passed in ----

async function runVenvProbe(t, name, script, args = []) {
  if (!existsSync(executorVenvPython)) { t.skip('Codex App Server runtime venv is not installed'); return null; }
  const root = await mkdtemp(path.join(tmpdir(), name));
  t.after(() => rm(root, { recursive: true, force: true }));
  const probe = path.join(root, 'probe.py');
  await writeFile(probe, script);
  const run = await new Promise((resolve, reject) => {
    const child = spawn(executorVenvPython, ['-B', probe, clientDir, root, ...args], { cwd: root, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  assert.equal(run.code, 0, run.stderr);
  return { root, out: JSON.parse(run.stdout.trim().split('\n').at(-1)) };
}

test('command activity survives unknown completion, covers subdirectories and clears only after confirmed completion',async t=>{
  const result=await runVenvProbe(t,'web-pilot-command-activity-',`import json, pathlib, sys
sys.path.insert(0, sys.argv[1])
import server
root=pathlib.Path(sys.argv[2]).resolve()
(root / '.harness/plans').mkdir(parents=True)
(root / '.harness/plans/todo-plan.md').write_text('fixture')
(root / 'nested').mkdir()
directory=root / '.harness/runtime/command-activity'
def markers(): return list(directory.glob('*.json'))
class Client:
    cwd=str(root)
    running=False
    error=None
    def start_command(self, *args, **kwargs):
        assert markers(), 'mark before launch'
        return {'process_id':'12345678'}
    def read_command_output(self, *args, **kwargs):
        return {'process_id':'12345678','running':self.running,'exit_code':None if self.running else 0,
            'duration_ms':1,'output':'done','cursor':4,'error':self.error}
client=Client()
facade=server.LocalFacade(client,root/'state')
facade.exec_command('PRIVATE COMMAND TEXT',str(root/'nested'),'/bin/sh',False)
assert not markers()
client.running=True
facade.exec_command('PRIVATE COMMAND TEXT',str(root),'/bin/sh',False)
assert len(markers())==1
metadata=json.loads(markers()[0].read_text())
assert metadata['version']==2 and metadata['state']=='running' and metadata['process_id']=='12345678'
if server.current_boot_identity():
    assert metadata['boot_id']==server.current_boot_identity()
assert metadata['workspace']==str(root) and metadata['kind']=='exec'
assert 'PRIVATE' not in markers()[0].read_text()
client.running=False
facade.write_stdin('12345678','',5000)
assert not markers()
client.error='unknown outcome'
try: facade.exec_command('unknown',str(root),'/bin/sh',False)
except ValueError: pass
assert len(markers())==1
def patch(*args):
    assert len(markers())==2
    return 'Done!'
facade._apply_patch=patch
assert facade.apply_patch('*** Begin Patch\\n*** End Patch',str(root))=='Done!'
assert len(markers())==1
print(json.dumps({'confirmed':True,'unknown':True,'patch':True}))
`);
  if(result)assert.deepEqual(result.out,{confirmed:true,unknown:true,patch:true});
});


test('real command completion is witnessed without polling and read-only preview serves without writing', {timeout:60000}, async t=>{
 if(process.platform!=='darwin'||!existsSync(userCodex)){t.skip('real local Mac sandbox');return;}
 const result=await runVenvProbe(t,'web-pilot-command-events-',`import json,pathlib,sys,time,shlex,re,urllib.request
sys.path.insert(0,sys.argv[1])
import server
from app_server_client import AppServerClient
root=pathlib.Path(sys.argv[2]).resolve()
(root/'.harness/plans').mkdir(parents=True)
(root/'.harness/plans/todo-plan.md').write_text('fixture')
client=AppServerClient(cwd=str(root),request_timeout=20)
client.start()
facade=server.LocalFacade(client,root/'state')
directory=root/'.harness/runtime/command-activity'
receipts=root/'.harness/runtime/command-results'
try:
    first=facade.exec_command('sleep 0.5; printf FINISHED',str(root),'/bin/sh',False,False,250)
    sid=re.search(r'session ID ([a-f0-9]+)',first).group(1)
    deadline=time.monotonic()+5
    while list(directory.glob('*.json')) and time.monotonic()<deadline:time.sleep(0.02)
    assert not list(directory.glob('*.json')), 'completion must not depend on write_stdin'
    records=[json.loads(p.read_text()) for p in receipts.glob('*.json')]
    assert records and records[-1]['exit_code']==0
    assert 'FINISHED' in facade.write_stdin(sid,'',5000)
    code="from http.server import HTTPServer,SimpleHTTPRequestHandler; s=HTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler); print('PORT='+str(s.server_port),flush=True); s.serve_forever()"
    command=shlex.quote(sys.executable)+' -I -u -c '+shlex.quote(code)
    service=facade.exec_command(command,str(root),'/bin/sh',False,False,1000,8000,True)
    sid=re.search(r'session ID ([a-f0-9]+)',service).group(1)
    port=int(re.search(r'PORT=(\\d+)',service).group(1))
    assert urllib.request.urlopen('http://127.0.0.1:'+str(port),timeout=3).status==200
    live=json.loads(next(directory.glob('*.json')).read_text())
    assert live['read_only_verified'] and live['sandbox_policy']=='readOnly'
    assert live.get('boot_id')==server.current_boot_identity()
    denied=facade.exec_command('printf denied > forbidden',str(root),'/bin/sh',False,False,1000,8000,True)
    assert not (root/'forbidden').exists()
    assert 'Process exited with code 0' not in denied
    # A shell child must not escape the same read-only filesystem sandbox.
    subprocess=sys.modules['subprocess'] if 'subprocess' in sys.modules else __import__('subprocess')
    nested='import subprocess,sys; p=subprocess.run([sys.executable,"-c","open(\\\"child-forbidden\\\",\\\"w\\\").write(\\\"unsafe\\\")"]); sys.exit(p.returncode)'
    child_denied=facade.exec_command(shlex.quote(sys.executable)+' -c '+shlex.quote(nested),str(root),'/bin/sh',False,False,1000,8000,True)
    assert not (root/'child-forbidden').exists()
    assert 'Process exited with code 0' not in child_denied
    facade.write_stdin(sid,'\\x03',5000)
    deadline=time.monotonic()+5
    while list(directory.glob('*.json')) and time.monotonic()<deadline:time.sleep(0.02)
    assert not list(directory.glob('*.json'))
    print(json.dumps({'completion':True,'http':True,'writeDenied':True}))
finally: client.close()
`);
 if(result)assert.deepEqual(result.out,{completion:true,http:true,writeDenied:true});
});

test('Windows: Codex is found behind the npm launcher, on PATH and by architecture; macOS search is unchanged', { timeout: 30_000 }, async t => {
  const result = await runVenvProbe(t, 'web-pilot-win-codex-', `import json, os, stat, sys, pathlib
sys.path.insert(0, sys.argv[1])
import app_server_client as client
root = pathlib.Path(sys.argv[2])
def binary(path, version):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("#!/bin/sh\\necho codex-cli " + version + "\\n")
    path.chmod(0o755)
    return str(path)
appdata, local = root / "Roaming", root / "Local"
npm = appdata / "npm"
npm.mkdir(parents=True)
launcher = npm / "codex.cmd"
launcher.write_text("@echo off\\r\\nnode codex.js %*\\r\\n")
scope = npm / "node_modules" / "@openai"
x64 = binary(scope / "codex" / "node_modules" / "@openai" / "codex-win32-x64" / "vendor" / "x86_64-pc-windows-msvc" / "bin" / "codex.exe", "0.160.0")
arm = binary(scope / "codex" / "node_modules" / "@openai" / "codex-win32-arm64" / "vendor" / "aarch64-pc-windows-msvc" / "bin" / "codex.exe", "0.160.0-arm")
env = {"APPDATA": str(appdata), "LOCALAPPDATA": str(local), "PROCESSOR_ARCHITECTURE": "AMD64"}
out = {"x64": x64, "arm": arm}
found = client.discover_codex_binary(platform="win32", environ=env, which=lambda name: str(launcher))
out["npm_launcher"] = [found.path, found.version]
out["npm_without_path"] = client.discover_codex_binary(platform="win32", environ=env, which=lambda name: None).path
out["arm64"] = client.discover_codex_binary(platform="win32", environ={**env, "PROCESSOR_ARCHITECTURE": "ARM64"}, which=lambda name: None).path
out["wow64"] = client.discover_codex_binary(platform="win32", environ={**env, "PROCESSOR_ARCHITECTURE": "x86", "PROCESSOR_ARCHITEW6432": "ARM64"}, which=lambda name: None).path
direct = binary(root / "bin" / "codex.exe", "9.9.9")
out["exe_on_path"] = client.discover_codex_binary(platform="win32", environ=env, which=lambda name: direct).path
winget = binary(local / "Microsoft" / "WinGet" / "Links" / "codex.exe", "1.0.0")
out["winget"] = client.discover_codex_binary(platform="win32", environ={"LOCALAPPDATA": str(local)}, which=lambda name: None).path == winget
standalone = binary(local / "Programs" / "OpenAI" / "Codex" / "bin" / "codex.exe", "1.1.0")
out["standalone"] = client.discover_codex_binary(platform="win32", environ={"LOCALAPPDATA": str(local)}, which=lambda name: None).path == standalone
explicit = binary(root / "explicit" / "codex.exe", "2.0.0")
out["explicit"] = client.discover_codex_binary(explicit, platform="win32", environ=env, which=lambda name: str(launcher)).path == explicit
out["env"] = client.discover_codex_binary(platform="win32", environ={**env, "CODEX_APP_SERVER_BIN": explicit}, which=lambda name: None).path == explicit
try:
    client.discover_codex_binary(platform="win32", environ={"APPDATA": str(root / "empty")}, which=lambda name: None)
    out["missing"] = None
except client.AppServerError as error:
    out["missing"] = str(error)
posix = binary(root / "posix" / "codex", "3.0.0")
out["darwin_path"] = client.discover_codex_binary(platform="darwin", environ={"HOME": str(root)}, which=lambda name: posix).path in (posix, str(pathlib.Path.home() / ".npm-global/bin/codex"), str(pathlib.Path.home() / ".local/bin/codex"))
out["detached_win"] = client._detached_process_options("win32")
out["detached_mac"] = client._detached_process_options("darwin")
calls = []
class Process:
    pid = 4242
    def kill(self): calls.append("kill")
    def terminate(self): calls.append("terminate")
client._stop_process_tree(Process(), force=False, platform="win32", run=lambda argv, **kwargs: calls.append(argv))
def broken(argv, **kwargs): raise OSError("no taskkill")
client._stop_process_tree(Process(), force=True, platform="win32", run=broken)
out["stop_calls"] = calls
print(json.dumps(out))
`);
  if (!result) return;
  const { out } = result;
  assert.deepEqual(out.npm_launcher, [out.x64, 'codex-cli 0.160.0'], 'codex.cmd is only a launcher: the native executable is used');
  assert.equal(out.npm_without_path, out.x64, '%APPDATA%\\npm is searched even when it is not on PATH');
  assert.equal(out.arm64, out.arm); assert.equal(out.wow64, out.arm, 'the real architecture of an emulated process');
  assert.ok(out.exe_on_path.endsWith('/bin/codex.exe'));
  assert.equal(out.winget, true); assert.equal(out.explicit, true); assert.equal(out.env, true);
  assert.equal(out.standalone, true, 'the folder of the official installer is searched before PATH catches up');
  assert.equal(out.missing, 'No compatible Codex binary was found');
  assert.equal(out.darwin_path, true);
  assert.equal(out.detached_win.start_new_session, undefined);
  assert.equal(out.detached_win.creationflags, 0x200 | 0x08000000, 'new process group, no console window');
  assert.deepEqual(out.detached_mac, { start_new_session: true });
  assert.deepEqual(out.stop_calls, [['taskkill', '/PID', '4242', '/T', '/F'], 'kill'], 'the whole tree is ended; a missing taskkill falls back to kill');
});

test('Windows: shell argv follows Codex, status names the system and the state lives in LOCALAPPDATA', { timeout: 30_000 }, async t => {
  const result = await runVenvProbe(t, 'web-pilot-win-shell-', `import json, os, sys, pathlib
sys.path.insert(0, sys.argv[1])
import server
root = pathlib.Path(sys.argv[2])
out = {"names": [server.server_name("win32"), server.server_name("darwin")],
       "state": [str(server.default_state_dir("win32", {"LOCALAPPDATA": str(root / "Local")})), str(server.default_state_dir("darwin"))],
       "prefix": server.POWERSHELL_UTF8_PREFIX}
argv = server.LocalFacade._shell_argv
out["argv"] = {
    "pwsh_login": argv(r"C:\\Program Files\\PowerShell\\7\\pwsh.exe", "Get-ChildItem", True, "win32"),
    "powershell_plain": argv(r"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\PowerShell.EXE", "dir", False, "win32"),
    "cmd": argv(r"C:\\Windows\\System32\\cmd.exe", "dir /b", True, "win32"),
    "git_bash": argv(r"C:\\Program Files\\Git\\bin\\bash.exe", "ls", True, "win32"),
    "mac_zsh": argv("/bin/zsh", "ls", True, "darwin"),
    "mac_plain": argv("/bin/bash", "ls", False, "darwin"),
    "mac_pwsh": argv("/usr/local/bin/pwsh", "ls", True, "darwin"),
}
shell = root / "tools" / "pwsh.exe"
shell.parent.mkdir()
shell.write_text("#!/bin/sh\\n")
shell.chmod(0o755)
started = []
class Binary:
    path = str(shell)
    version = "codex-cli 0.160.0"
class Client:
    cwd = str(root)
    binary = Binary()
    environment = dict(os.environ)
    def status(self): return {"running": True}
    def command_exec(self, argv, **kwargs):
        started.append(["exec", *argv]); return {"exitCode": 0, "stdout": "", "stderr": ""}
    def start_command(self, argv, **kwargs):
        started.append({"argv": argv, "tty": kwargs.get("tty"), "sandbox": kwargs.get("sandbox_policy")}); return {"process_id": "abcdef0123456789"}
    def read_command_output(self, process_id, cursor=0, wait_ms=0):
        return {"process_id": process_id, "running": False, "exit_code": 0, "output": "ok", "cursor": 2, "duration_ms": 5}
facade = server.LocalFacade(Client(), root / "state")
facade.platform = "win32"
out["exec"] = facade.exec_command("Get-Date", str(root), str(shell))
out["exec_plain"] = facade.exec_command("Get-Date", str(root), str(shell), False, True)
out["started"] = started[:]
for bad in ("missing-shell-name", str(root / "nope.exe"), "relative\\\\pwsh.exe"):
    try:
        facade.exec_command("x", str(root), bad); out.setdefault("bad", []).append(None)
    except ValueError as error:
        out.setdefault("bad", []).append(str(error))
started.clear()
status = facade.status()
out["status"] = {"scope": status["filesystem_scope"], "apply_patch": status["codex_tools"]["apply_patch_available"], "calls": started[:]}
facade.platform = "darwin"
out["mac_scope"] = facade.status()["filesystem_scope"]
out["mac_probe"] = started[-1]
print(json.dumps(out))
`);
  if (!result) return;
  const { out, root } = result;
  const prefix = 'try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n';
  assert.equal(out.prefix, prefix, 'the UTF-8 line of Codex itself');
  assert.deepEqual(out.names, ['Workflow Pilot Local Windows', 'Workflow Pilot Local Mac']);
  assert.equal(out.state[0], path.join(root, 'Local', 'WorkflowPilotCodexExecutor'));
  assert.ok(out.state[1].endsWith('Library/Application Support/WorkflowPilotCodexExecutor'));
  assert.deepEqual(out.argv.pwsh_login, ['C:\\Program Files\\PowerShell\\7\\pwsh.exe', '-Command', prefix + 'Get-ChildItem']);
  assert.deepEqual(out.argv.powershell_plain, ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\PowerShell.EXE', '-NoProfile', '-Command', prefix + 'dir']);
  assert.deepEqual(out.argv.cmd, ['C:\\Windows\\System32\\cmd.exe', '/c', 'dir /b']);
  assert.deepEqual(out.argv.git_bash, ['C:\\Program Files\\Git\\bin\\bash.exe', '-lc', 'ls']);
  assert.deepEqual(out.argv.mac_zsh, ['/bin/zsh', '-lc', 'ls']);
  assert.deepEqual(out.argv.mac_plain, ['/bin/bash', '-c', 'ls']);
  assert.deepEqual(out.argv.mac_pwsh, ['/usr/local/bin/pwsh', '-lc', 'ls'], 'macOS keeps its argv for every shell');
  const shell = path.join(root, 'tools', 'pwsh.exe');
  assert.deepEqual(out.started[0], { argv: [shell, '-Command', prefix + 'Get-Date'], tty: false, sandbox: { type: 'dangerFullAccess' } });
  assert.deepEqual(out.started[1], { argv: [shell, '-NoProfile', '-Command', prefix + 'Get-Date'], tty: true, sandbox: { type: 'dangerFullAccess' } });
  assert.match(out.exec, /^Chunk ID: abcdef01\nWall time: 0\.005 seconds\nProcess exited with code 0\nOriginal token count: 1\nOutput:\nok$/, 'the same result format');
  assert.equal(out.bad.length, 3); for (const message of out.bad) assert.match(message, /^shell is not executable: /);
  assert.equal(out.status.scope, 'local Windows filesystem with current user permissions');
  assert.equal(out.status.apply_patch, true);
  assert.deepEqual(out.status.calls, [], 'no /usr/bin/which on Windows');
  assert.equal(out.mac_scope, 'local macOS filesystem with current user permissions');
  assert.deepEqual(out.mac_probe, ['exec', '/usr/bin/which', 'apply_patch']);
});

test('Windows: apply_patch runs the Codex executable under the alias name and reads the patch from stdin', { timeout: 60_000 }, async t => {
  const result = await runVenvProbe(t, 'web-pilot-win-patch-', `import json, os, sys, pathlib
sys.path.insert(0, sys.argv[1])
import server
import glob
root = pathlib.Path(sys.argv[2])
# The native executable, as on Windows: the npm "codex" on PATH is a Node launcher and ignores the alias name.
native = sorted(glob.glob(str(pathlib.Path.home() / ".npm-global/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-*/vendor/*/bin/codex")))
if not native:
    print(json.dumps({"skipped": True})); raise SystemExit(0)
work = root / "Проект с пробелом"
work.mkdir()
(work / "note.txt").write_text("one\\ntwo\\n", encoding="utf-8")
class Client:
    cwd = str(root)
    binary = type("Binary", (), {"path": native[0], "version": "native"})()
    environment = dict(os.environ)
    def start_command(self, *args, **kwargs):
        raise AssertionError("Windows does not route the patch through command/exec")
facade = server.LocalFacade(Client(), root / "state")
facade.platform = "win32"
big = "".join(f"+строка {i}\\n" for i in range(4000))
patch = "*** Begin Patch\\n*** Update File: note.txt\\n@@\\n one\\n-two\\n+два\\n*** Add File: big.txt\\n" + big + "*** End Patch\\n"
out = {"bytes": len(patch.encode("utf-8"))}
out["result"] = facade.apply_patch(patch, str(work))
out["note"] = (work / "note.txt").read_text(encoding="utf-8")
out["big_lines"] = len((work / "big.txt").read_text(encoding="utf-8").splitlines())
try:
    facade.apply_patch("*** Begin Patch\\n*** Update File: missing.txt\\n@@\\n-a\\n+b\\n*** End Patch\\n", str(work))
    out["failure"] = None
except ValueError as error:
    out["failure"] = str(error)
Client.binary = type("Binary", (), {"path": str(root / "no-codex.exe"), "version": "x"})()
try:
    facade.apply_patch(patch, str(work)); out["unavailable"] = None
except ValueError as error:
    out["unavailable"] = str(error)
print(json.dumps(out, ensure_ascii=False))
`);
  if (!result) return;
  const { out } = result;
  if (out.skipped) { t.skip('native Codex executable of the npm install is not present'); return; }
  assert.ok(out.bytes > 40_000, 'longer than a Windows command line: only stdin can carry it');
  assert.match(out.result, /Success\. Updated the following files:/);
  assert.match(out.result, /M note\.txt/); assert.match(out.result, /A big\.txt/);
  assert.equal(out.note, 'one\nдва\n'); assert.equal(out.big_lines, 4000);
  assert.ok(out.failure && /missing\.txt/.test(out.failure), out.failure);
  assert.match(out.unavailable, /^Codex apply_patch command is unavailable: failed to spawn: /);
});

test('image type is read from the file itself; Windows windows, screenshots and notifications keep the executor result', { timeout: 30_000 }, async t => {
  const result = await runVenvProbe(t, 'web-pilot-win-desktop-', `import base64, json, struct, sys, pathlib, zlib
sys.path.insert(0, sys.argv[1])
import server, windows_desktop
root = pathlib.Path(sys.argv[2])
out = {}
bmp = b"BM" + (70).to_bytes(4, "little") + b"\\x00\\x00\\x00\\x00" + (54).to_bytes(4, "little") + (40).to_bytes(4, "little") + b"\\x00" * 40
samples = {
    "png": b"\\x89PNG\\r\\n\\x1a\\n" + b"\\x00" * 20, "jpeg": b"\\xff\\xd8\\xff\\xe0" + b"\\x00" * 20, "gif": b"GIF89a" + b"\\x00" * 20,
    "webp": b"RIFF\\x10\\x00\\x00\\x00WEBPVP8 ", "tiff_le": b"II*\\x00" + b"\\x00" * 8, "tiff_be": b"MM\\x00*" + b"\\x00" * 8,
    "heic": b"\\x00\\x00\\x00\\x18ftypheic" + b"\\x00" * 8, "heif": b"\\x00\\x00\\x00\\x18ftypmif1" + b"\\x00" * 8, "avif": b"\\x00\\x00\\x00\\x1cftypavif" + b"\\x00" * 8,
    "bmp": bmp, "ico": b"\\x00\\x00\\x01\\x00\\x01\\x00" + b"\\x00" * 16, "svg": b"\\xef\\xbb\\xbf<?xml version='1.0'?>\\n<svg xmlns='http://www.w3.org/2000/svg'/>",
    "text": b"not an image", "bm_text": b"BMW is a car maker, not a bitmap file at all", "mp4": b"\\x00\\x00\\x00\\x18ftypisom" + b"\\x00" * 8, "empty": b"",
}
out["mime"] = {name: server.sniff_image_mime(data) for name, data in samples.items()}
# The PNG encoder and the size rule of the Windows module run on any system.
png = windows_desktop.encode_bgra_png(bytes([10, 20, 30, 0, 40, 50, 60, 0]), 2, 1)
width, height = struct.unpack(">II", png[16:24])
idat = png[png.index(b"IDAT") + 4: png.index(b"IEND") - 8]
out["png"] = {"signature": png[:8] == b"\\x89PNG\\r\\n\\x1a\\n", "size": [width, height], "rgba": list(zlib.decompress(idat))}
out["sizes"] = [windows_desktop.output_size(3200, 1600, 1600), windows_desktop.output_size(100, 50, 0), windows_desktop.output_size(3000, 10, 50), windows_desktop.output_size(8000, 100, 99999)]
try:
    windows_desktop.WindowsDesktop(); out["desktop_off_windows"] = None
except RuntimeError as error:
    out["desktop_off_windows"] = str(error)
calls = []
class Desktop:
    failing = None
    def list_windows(self):
        calls.append(["list"])
        if self.failing: raise OSError(5, "EnumWindows failed")
        return [{"window_id": 1310, "title": "Отчёт — Блокнот", "application": "notepad", "pid": 700, "rect": {"x": -8, "y": 0, "width": 800, "height": 600}},
                {"window_id": 2620, "title": "Workflow Pilot", "application": "Workflow Pilot", "pid": 701, "rect": {"x": 10, "y": 20, "width": 1200, "height": 900}}]
    def capture_screen(self, x, y, width, height, max_dimension, include_cursor):
        calls.append(["screen", x, y, width, height, max_dimension, include_cursor]); return b"SCREENPNG"
    def capture_window(self, window_id, max_dimension):
        calls.append(["window", window_id, max_dimension])
        if window_id == 404: raise ValueError("window_id is not a valid window")
        if window_id == 500: raise OSError(6, "GetDIBits failed")
        return b"WINDOWPNG"
class Client:
    cwd = str(root)
    def command_exec(self, argv, **kwargs): raise AssertionError("no macOS command on Windows: " + argv[0])
facade = server.LocalFacade(Client(), root / "state")
facade.platform = "win32"
facade._windows_desktop = Desktop()
out["list"] = facade.computer_list_windows()
out["by_title"] = [row["window_id"] for row in facade.computer_list_windows("блокнот")["windows"]]
out["by_app"] = [row["window_id"] for row in facade.computer_list_windows("workflow pilot")["windows"]]
out["limited"] = len(facade.computer_list_windows(max_results=1)["windows"])
errors = {}
Desktop.failing = True
try: facade.computer_list_windows(); errors["list"] = None
except ValueError as error: errors["list"] = str(error)
Desktop.failing = None
calls.clear()
def blocks(value): return [value[0], type(value[1]).__name__, value[1]._mime_type, base64.b64decode(value[1].to_image_content().data).decode()]
out["screen"] = blocks(facade.computer_capture_screen())
out["region"] = blocks(facade.computer_capture_screen(5, 6, 300, 200, 800, False))
facade.computer_capture_screen(5, None, 300, 200)
out["window"] = blocks(facade.computer_capture_window(1310, 900))
out["capture_calls"] = calls[:]
calls.clear()
for name, bad in {"zero": 0, "negative": -5, "bool": True, "text": "84"}.items():
    try: facade.computer_capture_window(bad); errors[name] = None
    except ValueError as error: errors[name] = str(error)
out["calls_for_invalid_ids"] = len(calls)
for name, value in {"gone": 404, "gdi": 500}.items():
    try: facade.computer_capture_window(value); errors[name] = None
    except ValueError as error: errors[name] = str(error)
out["errors"] = errors
started = []
out["notify"] = server.TurnWatchdog._notify_windows("T" * 100, "M" * 300, popen=lambda argv, **kwargs: started.append([argv, kwargs]))
def refused(argv, **kwargs): raise OSError("powershell is blocked")
out["notify_refused"] = server.TurnWatchdog._notify_windows("t", "m", popen=refused)
out["notify_call"] = started
watchdog = server.TurnWatchdog(facade)
seen = []
watchdog._notify_windows = lambda title, message: seen.append([title, message]) or True
token = watchdog.action("start", "работаю", "", 60, False)["turn_token"]
out["complete"] = watchdog.action("complete", "готово", token, 60, False)
out["watchdog_notifications"] = seen
mcp = server.create_server(host="127.0.0.1", port=0, state_root=root / "schema-state")
out["summary_description"] = mcp._tool_manager.get_tool("turn_watchdog").parameters["properties"]["summary"]["description"]
picture = root / "wide.png"
picture.write_bytes(windows_desktop.encode_bgra_png(bytes([0, 0, 255, 0]) * (2000 * 10), 2000, 10))
small = root / "small.png"
small.write_bytes(windows_desktop.encode_bgra_png(bytes([0, 255, 0, 0]) * 6, 3, 2))
try:
    import PIL
    shown = facade.view_image(str(picture))
    from PIL import Image as PillowImage
    import io
    kept = facade.view_image(str(small))
    out["view"] = {"pillow": True, "meta": shown[0], "size": list(PillowImage.open(io.BytesIO(shown[1].data)).size), "mime": shown[1]._mime_type,
                   "small_untouched": kept[1].data == small.read_bytes()}
    broken = root / "broken.png"
    broken.write_bytes(b"\\x89PNG\\r\\n\\x1a\\n" + b"garbage" * 10)
    try: facade.view_image(str(broken)); out["view"]["broken"] = None
    except ValueError as error: out["view"]["broken"] = str(error)
except ImportError:
    try: facade.view_image(str(picture)); out["view"] = {"pillow": False, "error": None}
    except ValueError as error: out["view"] = {"pillow": False, "error": str(error)}
text = root / "plain.txt"
text.write_text("not an image")
try: facade.view_image(str(text)); out["view_text"] = None
except ValueError as error: out["view_text"] = str(error)
print(json.dumps(out, ensure_ascii=False))
`);
  if (!result) return;
  const { out, root } = result;
  assert.deepEqual(out.mime, { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', tiff_le: 'image/tiff', tiff_be: 'image/tiff',
    heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/vnd.microsoft.icon', svg: 'image/svg+xml',
    text: null, bm_text: null, mp4: null, empty: null });
  assert.deepEqual(out.png, { signature: true, size: [2, 1], rgba: [0, 30, 20, 10, 255, 60, 50, 40, 255] }, 'BGRA becomes opaque RGBA');
  assert.deepEqual(out.sizes, [[1600, 800, 0.5], [100, 50, 1], [100, 1, 100 / 3000], [5000, 62, 0.625]], '0 keeps the size; the limit is clamped to 100-5000');
  assert.match(out.desktop_off_windows, /only on Windows/);
  assert.deepEqual(out.list, { windows: [
    { window_id: 1310, title: 'Отчёт — Блокнот', application: 'notepad', pid: 700, rect: { x: -8, y: 0, width: 800, height: 600 } },
    { window_id: 2620, title: 'Workflow Pilot', application: 'Workflow Pilot', pid: 701, rect: { x: 10, y: 20, width: 1200, height: 900 } },
  ], backend: 'Win32 window list' }, 'the fields of the macOS result');
  assert.deepEqual(out.by_title, [1310]); assert.deepEqual(out.by_app, [2620]); assert.equal(out.limited, 1);
  assert.deepEqual(out.screen, [{ source: 'desktop', bytes: 9 }, 'Image', 'image/png', 'SCREENPNG']);
  assert.deepEqual(out.region, [{ source: 'desktop', bytes: 9 }, 'Image', 'image/png', 'SCREENPNG']);
  assert.deepEqual(out.window, [{ source: 'window', window_id: 1310, bytes: 9 }, 'Image', 'image/png', 'WINDOWPNG']);
  assert.deepEqual(out.capture_calls, [['screen', null, null, null, null, 1600, true], ['screen', 5, 6, 300, 200, 800, false],
    ['screen', null, null, null, null, 1600, true], ['window', 1310, 900]], 'a region needs all four values, as on macOS');
  assert.equal(out.calls_for_invalid_ids, 0);
  for (const name of ['zero', 'negative', 'bool', 'text']) assert.match(out.errors[name], /window_id must be a positive integer/);
  assert.match(out.errors.list, /^Window list is unavailable: /);
  assert.equal(out.errors.gone, 'window_id is not a valid window');
  assert.match(out.errors.gdi, /^Screen capture failed: /);
  assert.equal(out.notify, true); assert.equal(out.notify_refused, false);
  const [argv, options] = out.notify_call[0];
  assert.deepEqual(argv.slice(0, 8), ['powershell.exe', '-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File']);
  assert.equal(argv[8], path.join(clientDir, 'windows_notify.ps1'));
  assert.deepEqual(argv.slice(9), ['-Title', 'T'.repeat(80), '-Message', 'M'.repeat(240)]);
  assert.equal(options.close_fds, true);
  assert.deepEqual(out.watchdog_notifications, [['Codex executor: ответ готов', 'готово']]);
  assert.equal(out.complete.notification_requested, true);
  assert.equal(out.summary_description, 'Short status text used in the desktop notification if the watchdog fires.');
  if (out.view.pillow) {
    assert.deepEqual(out.view.size, [1600, 8]); assert.equal(out.view.mime, 'image/png');
    assert.equal(out.view.meta.source, await realpath(path.join(root, 'wide.png')));
    assert.equal(out.view.small_untouched, true, 'an image within the limit is returned as it is');
    assert.equal(out.view.broken, 'Image format is not supported');
  } else assert.match(out.view.error, /^Image resize is unavailable: Pillow is missing/);
  assert.equal(out.view_text, 'File is not an image');
  const notify = await (await import('node:fs/promises')).readFile(path.join(clientDir, 'windows_notify.ps1'), 'utf8');
  assert.match(notify, /BalloonTipTitle = \$Title/); assert.doesNotMatch(notify, /[^\x00-\x7f]/, 'ASCII only: Windows PowerShell 5.1 reads it without a BOM');
  const desktop = await (await import('node:fs/promises')).readFile(path.join(clientDir, 'windows_desktop.py'), 'utf8');
  for (const control of ['SendInput', 'SetCursorPos', 'SetForegroundWindow', 'ShowWindow', 'BringWindowToTop', 'keybd', 'mouse_event'])
    assert.ok(!desktop.includes(control), `the Windows module never drives the interface: ${control}`);
});

test('Windows services: paths, components, DPAPI key, process tree, start at sign-in and the tunnel prompt', { timeout: 30_000 }, async t => {
  const result = await runVenvProbe(t, 'web-pilot-win-control-', `import base64, json, os, pathlib, subprocess, sys, types
client_dir, root = sys.argv[1], pathlib.Path(sys.argv[2])
sys.path.insert(0, client_dir)
import server
local, appdata = root / "Local", root / "Roaming"
os.environ.update(LOCALAPPDATA=str(local), APPDATA=str(appdata), PATH="/usr/bin", SystemRoot=str(root / "Windows"))
for name in ("WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR", "WORKFLOW_PILOT_LEGACY_LOCAL_STATE_DIR", "WORKFLOW_PILOT_UV", "WORKFLOW_PILOT_CODEX_TUNNEL_CLIENT", "NO_PROXY"):
    os.environ.pop(name, None)

class Error(Exception): pass
class NoSuchProcess(Error): pass
class ZombieProcess(Error): pass
class AccessDenied(Error): pass
table, events = {}, []
class Process:
    def __init__(self, pid):
        if pid not in table: raise NoSuchProcess()
        if table[pid].get("denied"): raise AccessDenied()
        self.pid = pid
    def create_time(self): return table[self.pid]["created"]
    def exe(self): return table[self.pid]["exe"]
    def cmdline(self): return table[self.pid]["cmdline"]
    def name(self): return table[self.pid].get("name", "python.exe")
    def children(self, recursive=False):
        found = []
        for child in table[self.pid].get("children", []):
            if child not in table: continue  # psutil lists living processes only
            found.append(Process(child))
            if recursive: found += found[-1].children(recursive=True)
        return found
    def terminate(self):
        events.append(["terminate", self.pid])
        if not table[self.pid].get("stubborn"): table.pop(self.pid)
    def kill(self):
        events.append(["kill", self.pid]); table.pop(self.pid, None)
def wait_procs(processes, timeout=None):
    return [p for p in processes if p.pid not in table], [p for p in processes if p.pid in table]
psutil = types.ModuleType("psutil")
psutil.Process, psutil.wait_procs = Process, wait_procs
psutil.Error, psutil.NoSuchProcess, psutil.ZombieProcess, psutil.AccessDenied = Error, NoSuchProcess, ZombieProcess, AccessDenied
sys.modules["psutil"] = psutil

registry = {}
class Key:
    def __init__(self, path): self.path = path
    def __enter__(self): return self
    def __exit__(self, *rest): return False
winreg = types.ModuleType("winreg")
winreg.HKEY_CURRENT_USER, winreg.KEY_QUERY_VALUE, winreg.KEY_SET_VALUE, winreg.REG_SZ = "HKCU", 1, 2, 1
def open_key(hive, path, reserved, access):
    if (hive, path) not in registry: raise FileNotFoundError()
    return Key((hive, path))
def create_key(hive, path, reserved, access):
    registry.setdefault((hive, path), {}); return Key((hive, path))
def query(key, name):
    if name not in registry[key.path]: raise FileNotFoundError()
    return registry[key.path][name], 1
def set_value(key, name, reserved, kind, value): registry[key.path][name] = value
def delete_value(key, name):
    if name not in registry[key.path]: raise FileNotFoundError()
    del registry[key.path][name]
winreg.OpenKey, winreg.CreateKeyEx, winreg.QueryValueEx, winreg.SetValueEx, winreg.DeleteValue = open_key, create_key, query, set_value, delete_value
sys.modules["winreg"] = winreg

sys.platform = "win32"
import control, tunnel_prompt
out = {}
state = local / "WorkflowPilotCodexExecutor"
out["paths"] = {"state": str(control.STATE), "python": str(control.PYTHON.relative_to(state)), "tunnel_client": str(control.TUNNEL_CLIENT.relative_to(state)),
                "key": str(control.KEY_FILE.relative_to(state)), "legacy": str(control.LEGACY_LOCAL_STATE), "tools": str(control.TOOLS_FILE.relative_to(state)),
                "server_name": control.MCP_SERVER_NAME, "same_name_as_server": control.MCP_SERVER_NAME == server.server_name("win32"),
                "hidden": control._hidden()}

def attempt(action):
    try: action(); return None
    except Exception as error: return type(error).__name__ + ": " + str(error)

# Components recorded by Workflow Pilot.
out["tools_missing"] = attempt(control.tool_locations)
out["environment_before"] = control.environment()["PATH"].split(os.pathsep)
tools = {"uv": control.TOOLS_DIR / "uv" / "uv.exe", "tunnel_client": control.TOOLS_DIR / "tunnel-client" / "tunnel-client.exe",
         "rg": control.TOOLS_DIR / "ripgrep" / "ripgrep-15.2.0-x86_64-pc-windows-msvc" / "rg.exe", "git": control.TOOLS_DIR / "git" / "cmd" / "git.exe"}
for target in tools.values():
    target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(b"binary"); target.chmod(0o755)
outside = root / "elsewhere" / "git.exe"
outside.parent.mkdir(); outside.write_bytes(b"binary")
control.TOOLS_FILE.write_text(json.dumps({"schema_version": 1, "tools": {**{k: str(v) for k, v in tools.items()}, "git": str(outside)}}))
out["tools_outside"] = attempt(control.tool_locations)
control.TOOLS_FILE.write_text("\\ufeff" + json.dumps({"schema_version": 1, "tools": {k: str(v) for k, v in tools.items()}}), encoding="utf-8")
out["tools"] = sorted(control.tool_locations())
env = control.environment()
out["environment"] = {"path": env["PATH"].split(os.pathsep), "utf8": env["PYTHONUTF8"], "no_proxy": env["NO_PROXY"],
                      "state": env["WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR"]}
out["expected_path"] = [str(control.PYTHON.parent), str(tools["git"].parent), str(tools["rg"].parent), str(tools["uv"].parent), str(appdata / "npm"), "/usr/bin"]
out["uv"] = control.find_uv() == str(tools["uv"].resolve())

# Private folder access and the encrypted key.
acl_calls = []
def fake_run(argv, **options):
    acl_calls.append([argv, {k: options[k] for k in ("creationflags", "check") if k in options}])
    return types.SimpleNamespace(returncode=0, stdout='"host\\\\user","S-1-5-21-1-2-3-1001"\\n', stderr="")
control.secure_private_directory(run=fake_run)
out["acl"] = acl_calls[:]
out["acl_bad_sid"] = attempt(lambda: control.secure_private_directory(run=lambda argv, **options: types.SimpleNamespace(returncode=0, stdout="nothing", stderr="")))
secured = []
control.secure_private_directory = lambda: secured.append(True)
def fake_dpapi(data, *, decrypt=False):
    if decrypt:
        if not data.startswith(b"DPAPI:"): raise OSError("not protected data")
        return bytes(reversed(data[6:]))
    return b"DPAPI:" + bytes(reversed(data))
control.dpapi = fake_dpapi

# The new product does not adopt the previous Windows tunnel.
legacy = local / "CodexLocalWindows" / "private"
(legacy / "tunnel-profile").mkdir(parents=True)
(legacy / "tunnel-profile" / "windows-local.yaml").write_text(json.dumps({"control_plane": {"tunnel_id": "tunnel_legacy0123456789abc"}}))
(legacy / "tunnel-key.dpapi").write_bytes(fake_dpapi(b"sk-legacy-key-0123456789"))
selected = control.configure_selector()
out["adopted"] = {"flag": selected["adopted_tunnel"], "key_exists": control.KEY_FILE.exists(), "profile_exists": control.PROFILE.exists(),
                  "channel": selected["chatgpt_channel"], "legacy_kept": (legacy / "tunnel-key.dpapi").is_file()}
configured = control.configure_tunnel("tunnel_abcdefghijklmnop", "sk-new-key-0123456789abcdef")
raw = control.KEY_FILE.read_bytes()
out["key"] = {"plain_in_file": b"sk-new-key" in raw, "read": control.read_tunnel_key(), "secured": len(secured) >= 1, "configured": configured["configured"],
              "profile_has_key": "sk-new-key" in control.PROFILE.read_text()}
control.KEY_FILE.unlink(); control.PROFILE.unlink()
(legacy / "tunnel-key.dpapi").write_bytes(b"damaged")
out["damaged_legacy"] = control.adopt_legacy_tunnel()

# Launch, identity and stopping the whole tree.
popen_calls = []
class FakePopen:
    def __init__(self, argv, **options):
        popen_calls.append([argv, {k: v for k, v in options.items() if k in ("creationflags", "start_new_session", "close_fds", "cwd")}])
        self.pid = 4321
        table[4321] = {"created": 1700000000.25, "exe": "C:/state/runtime/venv/Scripts/python.exe", "cmdline": argv, "children": [4322]}
        table[4322] = {"created": 1700000000.5, "exe": "C:/python/python.exe", "cmdline": argv, "children": [4323]}
        table[4323] = {"created": 1700000001.0, "exe": "C:/codex/codex.exe", "cmdline": ["codex", "app-server"], "stubborn": True}
    def poll(self): return None
real_popen = subprocess.Popen
subprocess.Popen = FakePopen
pid = control.launch("mcp", ["python.exe", "-B", "server.py"], {"PATH": "x"})
subprocess.Popen = real_popen
record = json.loads((control.STATE / "mcp.pid.json").read_text())
out["launch"] = {"pid": pid, "call": popen_calls[0], "record": record, "managed": control.managed_process("mcp")}
table[4321]["created"] = 1.0
out["reused_pid"] = control.managed_process("mcp")
out["reused_record"] = (control.STATE / "mcp.pid.json").exists()
out["stop_foreign"] = attempt(lambda: control.stop_one("mcp"))
out["foreign_signals"] = events[:]
table[4321]["created"] = 1700000000.25
control.private_write(control.STATE / "mcp.pid.json", json.dumps(record))
table[4321]["denied"] = True
out["denied"] = control.managed_process("mcp")
out["denied_record"] = (control.STATE / "mcp.pid.json").exists()
table[4321]["denied"] = False
control.private_write(control.STATE / "mcp.pid.json", json.dumps(record))
out["stopped"] = control.stop_one("mcp")
out["stop_events"] = events[:]
out["after_stop"] = {"table": sorted(table), "record": (control.STATE / "mcp.pid.json").exists(), "managed": control.managed_process("mcp")}
control.private_write(control.STATE / "tunnel.pid.json", json.dumps({"pid": 999, "identity": {"created": 5.0, "exe": "x", "cmdline": []}}))
out["gone"] = [control.managed_process("tunnel"), (control.STATE / "tunnel.pid.json").exists()]

# Start at sign-in.
out["autostart_initial"] = control.autostart_status()
out["autostart_without_pythonw"] = attempt(lambda: control.configure_autostart(True))
control.PYTHON.parent.mkdir(parents=True, exist_ok=True)
pythonw = control.PYTHON.with_name("pythonw.exe"); pythonw.write_bytes(b"binary")
enabled = control.configure_autostart(True)
launcher = control.AUTOSTART_LAUNCHER.read_text()
compile(launcher, "autostart.pyw", "exec")
value = registry[("HKCU", control.AUTOSTART_KEY)][control.AUTOSTART_VALUE]
out["autostart"] = {"enabled": enabled, "value_ok": value == subprocess.list2cmdline([str(pythonw), "-B", str(control.AUTOSTART_LAUNCHER)]),
                    "key": control.AUTOSTART_KEY, "name": control.AUTOSTART_VALUE, "launcher": launcher,
                    "control": str(pathlib.Path(client_dir) / "control.py"), "state": str(control.STATE)}
registry[("HKCU", control.AUTOSTART_KEY)][control.AUTOSTART_VALUE] = "C:\\\\old\\\\pythonw.exe -B old.pyw"
out["autostart_stale"] = control.autostart_status()
out["autostart_off"] = [control.configure_autostart(False), control.configure_autostart(False), control.AUTOSTART_LAUNCHER.exists(),
                        control.AUTOSTART_VALUE in registry[("HKCU", control.AUTOSTART_KEY)]]

# The forward of the user's own server (the VPS channel): a supervisor instead of the macOS LaunchAgent.
route_file = root / 'workflow-pilot-vps-route.json'
route_file.write_text(json.dumps({'schema_version': 1, 'product': 'workflow-pilot', 'ssh_host': 'workflow-pilot-vps', 'remote_port': 18842}))
os.environ['WORKFLOW_PILOT_VPS_CONFIG'] = str(route_file)
for host, port in [('vps-mcp-tunnel', 18842), ('workflow-pilot-vps', 17842)]:
    route_file.write_text(json.dumps({'schema_version': 1, 'product': 'workflow-pilot', 'ssh_host': host, 'remote_port': port}))
    assert 'VPS_ROUTE_INVALID' in attempt(control.vps_config)
route_file.write_text(json.dumps({'schema_version': 1, 'product': 'workflow-pilot', 'ssh_host': 'workflow-pilot-vps-test', 'remote_port': 19842}))
assert control.vps_ssh_argv(18852)[-2:] == ['127.0.0.1:19842:127.0.0.1:18852', 'workflow-pilot-vps-test']
route_file.write_text(json.dumps({'schema_version': 1, 'product': 'workflow-pilot', 'ssh_host': 'workflow-pilot-vps', 'remote_port': 18842}))
out["vps_initial"] = control.vps_status()
out["vps_bad_port"] = [attempt(lambda: control.vps_apply(80)), attempt(lambda: control.vps_apply(True))]
vps_launches, next_pid = [], [6000]
class VpsPopen:
    def __init__(self, argv, **options):
        vps_launches.append([[str(part) for part in argv], {k: options[k] for k in ("creationflags", "cwd")}])
        self.pid = next_pid[0]; next_pid[0] += 10
        table[self.pid] = {"created": 1700000100.0 + self.pid, "exe": "python.exe", "cmdline": argv, "children": [self.pid + 1]}
        table[self.pid + 1] = {"created": 1700000200.0, "exe": "ssh.exe", "cmdline": ["ssh.exe"], "name": "ssh.exe"}
    def poll(self): return None
subprocess.Popen = VpsPopen
events.clear()
applied = control.vps_apply(17852)
same = control.vps_apply(17852)
launches_for_same_port = len(vps_launches)
control.start = lambda mcp_only=False, tunnel_only=False: {"mcp_url": "http://127.0.0.1:17852/mcp", "mcp": {"ready": True}}
login = control.selector_start()
moved = control.vps_apply(17842)
record = json.loads(control.VPS_FILE.read_text())
control.VPS_LOG.write_text("Warning: Permanently added the host key\\nError: remote port forwarding failed for listen port 17842\\n\\n")
table.pop(6011)
refused = control.vps_status()
runs, sleeps = [], []
class Ssh:
    def __init__(self, argv, **options):
        runs.append([[str(part) for part in argv], {k: options[k] for k in ("creationflags", "cwd")}])
        options["stderr"].write(b"ssh: connect to host vps port 22: Connection refused\\n")
    def wait(self): return 255
def no_ssh(argv, **options): raise FileNotFoundError("ssh.exe")
supervised = [control.vps_supervise(popen=Ssh, sleep=sleeps.append, rounds=2), control.vps_supervise(popen=no_ssh, sleep=sleeps.append, rounds=1)]
log_tail = control.VPS_LOG.read_text().splitlines()[-3:]
stopped = control.vps_stop()
subprocess.Popen = real_popen
login_without_vps = control.selector_start()
out["vps"] = {"applied": applied, "same": same, "launches_for_same_port": launches_for_same_port, "launch": vps_launches[0], "moved": moved,
              "launches": len(vps_launches), "record_port": record["forward_port"], "record_digest": len(record["control_sha256"]),
              "refused": refused, "stopped": stopped, "record_after_stop": control.VPS_FILE.exists(), "stop_events": events[:],
              "login": login.get("vps"), "login_without_vps": "vps" in login_without_vps, "supervised": supervised, "runs": runs,
              "sleeps": sleeps, "log_tail": log_tail, "no_record": control.vps_supervise(popen=Ssh, sleep=sleeps.append, rounds=1),
              "ssh": str(root / "Windows" / "System32" / "OpenSSH" / "ssh.exe"), "control": str(pathlib.Path(client_dir) / "control.py"),
              "python": str(control.PYTHON)}

# setup: the private Python and the pinned packages through the uv of the package.
commands = []
def setup_run(argv, **options):
    commands.append([[str(part) for part in argv], {"creationflags": options.get("creationflags"), "check": options.get("check"),
                     "uv_env": [options.get("env", {}).get("UV_PYTHON_INSTALL_DIR"), options.get("env", {}).get("UV_CACHE_DIR")]}])
    if argv[1:2] == ["venv"]: control.PYTHON.write_bytes(b"binary")
    return types.SimpleNamespace(returncode=0, stdout="tunnel-client 0.0.14\\n", stderr="")
control.PYTHON.unlink(missing_ok=True)
# shutil.which cannot search PATH under an emulated platform; nothing of the runtime is expected in PATH here.
control.shutil.which = lambda *args, **kwargs: None
control.require_codex = lambda: {"path": "C:/codex/codex.exe", "version": "0.160.0"}
real_run, real_check_output = subprocess.run, subprocess.check_output
subprocess.run = setup_run
versions = []
subprocess.check_output = lambda argv, **options: versions.append([str(argv[0]), argv[1:], options.get("creationflags")]) or "tunnel-client 0.0.14\\n"
before_setup = control.setup_complete()
installed = control.setup()
after_setup = control.setup_complete()
original_digest = control._requirements_digest
control._requirements_digest = lambda: "another version of the pinned packages"
changed_requirements = control.setup_complete()
control._requirements_digest = original_digest
control.TOOLS_FILE.unlink()
out["setup_without_tools"] = attempt(control.setup)
subprocess.run, subprocess.check_output = real_run, real_check_output
out["setup"] = {"result": installed, "commands": commands, "complete": [before_setup, after_setup, changed_requirements], "version_call": versions, "copied": (control.RUNTIME / "tunnel-client.exe").exists(),
                "venv": str(control.VENV), "requirements": str(pathlib.Path(client_dir) / "requirements.txt"), "uv": str(tools["uv"].resolve()),
                "python_dir": str(control.RUNTIME / "python"), "cache_dir": str(control.RUNTIME / "uv-cache")}

# The tunnel prompt.
prompts = []
def prompt_run(argv, **options):
    prompts.append([argv[:-1], base64.b64decode(argv[-1]).decode("utf-16-le"), {k: options[k] for k in ("creationflags", "timeout", "encoding")}])
    return types.SimpleNamespace(returncode=0, stdout='\\ufeff{"value":"  sk-typed-secret  "}', stderr="")
typed = tunnel_prompt.windows_prompt("Вставьте ключ", hidden=True, run=prompt_run)
tunnel_prompt.windows_prompt("Видимое поле", run=prompt_run)
def outcome(stdout, code=0):
    try:
        tunnel_prompt.windows_prompt("m", run=lambda argv, **options: types.SimpleNamespace(returncode=code, stdout=stdout, stderr="boom")); return "value"
    except tunnel_prompt.Cancelled: return "cancelled"
    except tunnel_prompt.PromptFailure: return "failure"
def refused(argv, **options): raise OSError("powershell is blocked")
def refused_outcome():
    try: tunnel_prompt.windows_prompt("m", run=refused); return "value"
    except tunnel_prompt.PromptFailure: return "failure"
outcomes = {"cancelled": outcome('{"cancelled":true}'), "failed": outcome("", 1), "garbage": outcome("not json"),
            "no_value": outcome('{"other":1}'), "refused": refused_outcome()}
routed = []
tunnel_prompt.windows_prompt = lambda message, hidden=False: routed.append(["windows", hidden]) or "x"
tunnel_prompt.mac_prompt = lambda message, hidden=False: routed.append(["mac", hidden]) or "x"
tunnel_prompt.prompt("m", hidden=True)
sys.platform = "darwin"
tunnel_prompt.prompt("m")
out["prompt"] = {"typed": typed, "argv": prompts[0][0], "options": prompts[0][2], "hidden_script": prompts[0][1], "visible_script": prompts[1][1],
                 "message64": base64.b64encode("Вставьте ключ".encode()).decode(), **outcomes, "routed": routed}
print(json.dumps(out, ensure_ascii=False))
`);
  if (!result) return;
  const { out, root } = result;
  const local = path.join(root, 'Local'), state = path.join(local, 'WorkflowPilotCodexExecutor');
  assert.deepEqual(out.paths, { state, python: path.join('runtime', 'venv', 'Scripts', 'python.exe'), tunnel_client: path.join('runtime', 'tools', 'tunnel-client', 'tunnel-client.exe'),
    key: path.join('private', 'tunnel-key.dpapi'), legacy: path.join(local, 'CodexLocalWindows'), tools: path.join('runtime', 'tools.json'),
    server_name: 'Workflow Pilot Local Windows', same_name_as_server: true, hidden: { creationflags: 0x08000000 } });

  assert.match(out.tools_missing, /Windows components are not prepared/);
  assert.match(out.tools_outside, /Windows components are not prepared/, 'an executable outside the runtime tools folder is refused');
  assert.deepEqual(out.tools, ['git', 'rg', 'tunnel_client', 'uv']);
  assert.deepEqual(out.environment_before.slice(0, 2), [path.join(state, 'runtime', 'venv', 'Scripts'), path.join(root, 'Roaming', 'npm')], 'status works before the components are prepared');
  assert.deepEqual(out.environment.path.map(item => item.replace(/^\/private/, '')), out.expected_path.map(item => item.replace(/^\/private/, '')),
    'the Python of the runtime, then MinGit, ripgrep and uv of the package, then global npm');
  assert.equal(out.environment.utf8, '1');
  assert.equal(out.environment.no_proxy, '127.0.0.1,localhost');
  assert.equal(out.environment.state, state);
  assert.equal(out.uv, true);

  assert.deepEqual(out.acl[0], [['whoami.exe', '/user', '/fo', 'csv', '/nh'], { creationflags: 0x08000000, check: true }]);
  assert.deepEqual(out.acl[1], [['icacls.exe', path.join(state, 'private'), '/inheritance:r', '/grant:r', '*S-1-5-21-1-2-3-1001:(OI)(CI)F', '*S-1-5-18:(OI)(CI)F'],
    { creationflags: 0x08000000, check: true }]);
  assert.match(out.acl_bad_sid, /Cannot determine the current Windows user SID/);
  assert.deepEqual(out.adopted, { flag: false, key_exists: false, profile_exists: false,
    channel: 'secure-tunnel', legacy_kept: true });
  assert.deepEqual(out.key, { plain_in_file: false, read: 'sk-new-key-0123456789abcdef', secured: true, configured: true, profile_has_key: false });
  assert.equal(out.damaged_legacy, false, 'a key that cannot be decrypted is not carried over');

  assert.equal(out.launch.pid, 4321);
  assert.deepEqual(out.launch.call[1], { creationflags: 0x08000000 | 0x00000200, close_fds: true, cwd: state },
    'no console window, own process group, no POSIX session; the source folder stays replaceable');
  assert.deepEqual(out.launch.record, { pid: 4321, identity: { created: 1700000000.25, exe: 'C:/state/runtime/venv/Scripts/python.exe', cmdline: ['python.exe', '-B', 'server.py'] } });
  assert.deepEqual(out.launch.managed, { running: true, owned: true, pid: 4321 });
  assert.deepEqual(out.reused_pid, { running: false, owned: false, pid: 4321 }, 'the same PID with another start time belongs to another program: the stale record is dropped');
  assert.equal(out.reused_record, false);
  assert.equal(out.stop_foreign, null, 'without a record there is nothing of ours to stop');
  assert.deepEqual(out.foreign_signals, [], 'the other program never receives a signal');
  assert.deepEqual(out.denied, { running: false, owned: false, pid: 4321 }, 'a process that cannot be inspected is not ours');
  assert.equal(out.denied_record, false);
  assert.deepEqual(out.stopped, { service: 'mcp', stopped: true });
  assert.deepEqual(out.stop_events, [['terminate', 4321], ['terminate', 4323], ['terminate', 4322], ['kill', 4323]], 'the whole tree, then force for what survived');
  assert.deepEqual(out.after_stop, { table: [], record: false, managed: { running: false, owned: false, pid: null } });
  assert.deepEqual(out.gone, [{ running: false, owned: false, pid: 999 }, false], 'a record of a finished process is removed');

  assert.deepEqual(out.autostart_initial, { autostart: { enabled: false, current: false } });
  assert.match(out.autostart_without_pythonw, /Windows background Python is missing/);
  assert.deepEqual(out.autostart.enabled, { autostart: { enabled: true, current: true } });
  assert.equal(out.autostart.value_ok, true);
  assert.equal(out.autostart.key, 'Software\\Microsoft\\Windows\\CurrentVersion\\Run');
  assert.equal(out.autostart.name, 'WorkflowPilotCodexExecutor');
  for (const text of ["'selector-start'", out.autostart.control, out.autostart.state, 'autostart.log', 'sys.path.insert(0, os.path.dirname(control))'])
    assert.ok(out.autostart.launcher.includes(text), text);
  assert.doesNotMatch(out.autostart.launcher, /sk-|tunnel_/, 'no credentials in the launcher');
  assert.deepEqual(out.autostart_stale, { autostart: { enabled: true, current: false } }, 'an entry of another location is reported as not current');
  assert.deepEqual(out.autostart_off, [{ autostart: { enabled: false, current: false } }, { autostart: { enabled: false, current: false } }, false, false]);

  const setup = out.setup, flags = { creationflags: 0x08000000, check: true }, uvEnv = [setup.python_dir, setup.cache_dir];
  assert.deepEqual(Object.keys(setup.result).sort(), ['codex', 'installed', 'mcp_url', 'python', 'state_directory', 'tunnel_client', 'tunnel_client_version', 'tunnel_health_url'],
    'the same result fields as on macOS');
  assert.equal(setup.result.tunnel_client_version, 'tunnel-client 0.0.14');
  const real = value => value.replace(/^\/private/, '');
  const uvCommands = setup.commands.filter(([argv]) => real(argv[0]) === real(setup.uv));
  assert.deepEqual(uvCommands.map(([argv, options]) => [argv.slice(1).map(real), options]), [
    [['venv', '--clear', '--managed-python', '--python', '3.13', '--no-config', real(setup.venv)], { ...flags, uv_env: uvEnv }],
    [['pip', 'install', '--no-config', '--python', real(path.join(setup.venv, 'Scripts', 'python.exe')), '-r', real(setup.requirements)], { ...flags, uv_env: uvEnv }],
  ]);
  assert.deepEqual(setup.version_call.map(([file, args, hidden]) => [real(file), args, hidden]),
    [[real(path.join(state, 'runtime', 'tools', 'tunnel-client', 'tunnel-client.exe')), ['--version'], 0x08000000]],
    'tunnel-client runs where the package unpacked it, next to cloudflared.exe');
  assert.equal(setup.copied, false);
  assert.deepEqual(setup.complete, [false, true, false], 'setup is repeated until it has finished and again when the pinned packages change');
  assert.match(out.setup_without_tools, /uv is missing from the prepared Windows components/);

  const prompt = out.prompt;
  assert.equal(prompt.typed, 'sk-typed-secret');
  assert.deepEqual(prompt.argv, ['powershell.exe', '-NoLogo', '-NoProfile', '-STA', '-EncodedCommand']);
  assert.deepEqual(prompt.options, { creationflags: 0x08000000, timeout: 900, encoding: 'utf-8' });
  assert.ok(prompt.hidden_script.includes(`FromBase64String('${prompt.message64}')`));
  assert.ok(!prompt.hidden_script.includes('Вставьте ключ'), 'the message is never quoted into the script');
  assert.match(prompt.hidden_script, /UseSystemPasswordChar = \$true/);
  assert.match(prompt.visible_script, /UseSystemPasswordChar = \$false/);
  for (const text of ["'Продолжить'", "'Отмена'", '$field.Clear()']) assert.ok(prompt.hidden_script.includes(text), text);
  assert.deepEqual([prompt.cancelled, prompt.failed, prompt.garbage, prompt.no_value, prompt.refused], ['cancelled', 'failure', 'failure', 'failure', 'failure']);
  assert.deepEqual(prompt.routed, [['windows', true], ['mac', false]]);

  const vps = out.vps, forward = port => [vps.ssh, '-N', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3', '-R', `127.0.0.1:18842:127.0.0.1:${port}`, 'workflow-pilot-vps'];
  assert.deepEqual(out.vps_initial, { vps: { supervised: false, running: false, pid: null, forward_port: null, last_error: null, owned: true, ssh_host: null, remote_port: null } });
  for (const error of out.vps_bad_port) assert.match(error, /A valid local MCP port is required/);
  assert.deepEqual(vps.applied, { vps: { supervised: true, running: true, pid: 6001, forward_port: 17852, last_error: null, owned: true, ssh_host: 'workflow-pilot-vps', remote_port: 18842 } });
  assert.deepEqual(vps.same, vps.applied);
  assert.equal(vps.launches_for_same_port, 1, 'the same port and the same control.py keep the running supervisor');
  assert.deepEqual(vps.launch, [[vps.python, '-B', vps.control, 'vps-supervise'], { creationflags: 0x08000000 | 0x00000200, cwd: state }]);
  assert.deepEqual(vps.login, { supervised: true, running: true, pid: 6001, forward_port: 17852, last_error: null, owned: true, ssh_host: 'workflow-pilot-vps', remote_port: 18842 },
    'sign-in keeps the forward up with either channel, as the LaunchAgent does on macOS');
  assert.deepEqual(vps.moved, { vps: { supervised: true, running: true, pid: 6011, forward_port: 17842, last_error: null, owned: true, ssh_host: 'workflow-pilot-vps', remote_port: 18842 } });
  assert.equal(vps.launches, 2, 'another MCP port restarts the supervisor');
  assert.deepEqual([vps.record_port, vps.record_digest], [17842, 64]);
  assert.equal(vps.refused.vps.running, false, 'the supervisor without a living ssh is not a working forward');
  assert.equal(vps.refused.vps.supervised, true);
  assert.equal(vps.refused.vps.last_error.message, 'Error: remote port forwarding failed for listen port 17842');
  assert.match(vps.refused.vps.last_error.at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  assert.deepEqual(vps.supervised, [0, 0]);
  assert.deepEqual(vps.runs, [[forward(17842), { creationflags: 0x08000000, cwd: state }], [forward(17842), { creationflags: 0x08000000, cwd: state }]],
    'the same ssh forward as the macOS LaunchAgent, started again after it ends');
  assert.equal(vps.sleeps.length, 3);
  for (const pause of vps.sleeps) assert.ok(pause > 14 && pause <= 15, 'at most one start in 15 seconds');
  assert.deepEqual(vps.log_tail, ['ssh: connect to host vps port 22: Connection refused', 'ssh: connect to host vps port 22: Connection refused', 'ssh could not be started: ssh.exe']);
  assert.deepEqual(vps.stopped, { services: [{ service: 'vps', stopped: true }], vps: { supervised: false, running: false, pid: null, forward_port: null,
    last_error: vps.stopped.vps.last_error, owned: true, ssh_host: null, remote_port: null } });
  assert.equal(vps.record_after_stop, false, 'a removed server is not dialled again at sign-in');
  assert.deepEqual(vps.stop_events.filter(([action]) => action === 'terminate').map(([, pid]) => pid), [6000, 6001, 6010], 'ssh ends with its supervisor');
  assert.equal(vps.login_without_vps, false);
  assert.equal(vps.no_record, 2);

  const control = path.join(clientDir, 'control.py');
  for (const command of [['vps-status'], ['vps-apply', '--port', '17852'], ['vps-stop']]) {
    const onMac = await runPython(control, command, controlEnvironment(root));
    assert.equal(onMac.code, 1);
    assert.match(JSON.parse(onMac.stdout).error, /kept by a LaunchAgent of Workflow Pilot/, command[0]);
  }
  assert.equal((await runPython(control, ['vps-supervise'], controlEnvironment(root))).code, 1);
  const refused = await runPython(control, ['autostart', '--state', 'status'], controlEnvironment(root));
  assert.equal(refused.code, 1);
  assert.match(JSON.parse(refused.stdout).error, /Start at login is set up by Workflow Pilot itself on this system/);
  assert.equal((await (await import('node:fs/promises')).readFile(path.join(clientDir, 'requirements.txt'), 'utf8')).includes('psutil==7.2.2 ; sys_platform == "win32"'), true);
});

test('busy ports move the services, a stale PID record of another program is dropped, the tunnel can be entered again', { timeout: 30_000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'web-pilot-codex-ports-'));
  const state = path.join(root, 'state');
  const control = path.join(repoRoot, 'tools', 'codex-app-server-mcp', 'control.py');
  const env = controlEnvironment(root);
  const probe = path.join(root, 'probe.py');
  await writeFile(probe, `import importlib.util, json, os, socket, sys
spec=importlib.util.spec_from_file_location("ctl", sys.argv[1])
ctl=importlib.util.module_from_spec(spec); spec.loader.exec_module(ctl)
out={}
holder=socket.socket(); holder.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); holder.bind(("127.0.0.1", ctl.PREFERRED_MCP_PORT)); holder.listen()
out["chosen"]=ctl._choose_port("mcp", ctl.PREFERRED_MCP_PORT, ctl.tunnel_port())
out["url"]=ctl.own_mcp_url()
out["saved"]=json.loads(ctl.PORTS_FILE.read_text())
holder.close()
out["kept"]=ctl.mcp_port()
ctl.STATE.mkdir(parents=True, exist_ok=True)
(ctl.STATE / "mcp.pid.json").write_text(json.dumps({"pid": os.getpid(), "identity": "another program"}))
out["stale"]=ctl.managed_process("mcp"); out["self"]=os.getpid()
out["record_left"]=(ctl.STATE / "mcp.pid.json").exists()
print(json.dumps(out))
`);
  const services = [];
  try {
    const result = await runPython(probe, [control], env);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const out = JSON.parse(result.stdout.trim());
    assert.notEqual(out.chosen, 27852, 'a busy preferred port is not reused');
    assert.notEqual(out.chosen, 27853, 'the tunnel port is avoided');
    assert.equal(out.url, `http://127.0.0.1:${out.chosen}/mcp`);
    assert.deepEqual(out.saved, { mcp: out.chosen });
    assert.equal(out.kept, out.chosen, 'the chosen port is kept for the next start');
    assert.deepEqual(out.stale, { running: false, owned: false, pid: out.self });
    assert.equal(out.record_left, false);

    // A tunnel that runs without becoming ready (revoked key) is replaced when it is entered again.
    const first = await configureTunnel(control, env);
    assert.equal(first.code, 0, first.stderr || first.stdout);
    const tunnel = await fakeService(state, 'tunnel'); services.push(tunnel.child);
    const again = await configureTunnel(control, env, 'abcdefghijklmnop0123456789');
    assert.equal(again.code, 0, again.stderr || again.stdout);
    assert.equal(await Promise.race([tunnel.exited, new Promise(resolve => setTimeout(() => resolve(false), 5000))]), true);
    assert.equal(existsSync(path.join(state, 'tunnel.pid.json')), false);
    const { readFile } = await import('node:fs/promises');
    assert.equal((await readFile(path.join(state, 'private', 'tunnel-key'), 'utf8')).trim(), 'abcdefghijklmnop0123456789');
    assert.match(await readFile(path.join(state, 'private', 'tunnel-profile', 'codex-executor.yaml'), 'utf8'), new RegExp(`127\\.0\\.0\\.1:${out.chosen}/mcp`));
  } finally {
    for (const child of services) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
    await rm(root, { recursive: true, force: true });
  }
});
