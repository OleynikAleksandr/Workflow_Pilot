#!/usr/bin/env python3
from __future__ import annotations

import base64
import glob
import json
import os
import queue
import shutil
import signal
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


class AppServerError(RuntimeError):
    pass


@dataclass(frozen=True)
class CodexBinary:
    path: str
    version: str


@dataclass
class ProcessState:
    process_id: str
    request_id: int
    command: list[str]
    cwd: str | None
    started_at: float = field(default_factory=time.time)
    stdout: bytearray = field(default_factory=bytearray)
    stderr: bytearray = field(default_factory=bytearray)
    output: bytearray = field(default_factory=bytearray)
    stdout_base: int = 0
    stderr_base: int = 0
    cap_reached: dict[str, bool] = field(default_factory=lambda: {"stdout": False, "stderr": False})
    done: threading.Event = field(default_factory=threading.Event)
    result: dict[str, Any] | None = None
    error: str | None = None
    on_event: Any = None


def _binary_version(path: str) -> str:
    try:
        result = subprocess.run(
            [path, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise AppServerError(f"Cannot execute Codex binary: {path}: {exc}") from exc
    text = (result.stdout or result.stderr).strip()
    if result.returncode != 0 or not text:
        raise AppServerError(f"Codex version probe failed for {path}")
    return text


def _windows_npm_binaries(npm_root: str, machine: str) -> list[str]:
    """Native codex.exe of a global npm install: the codex.cmd next to it is only a Node launcher."""
    scope = os.path.join(npm_root, "node_modules", "@openai")
    patterns = [
        # The platform package is an optional dependency of @openai/codex; older releases kept the binary inside it.
        os.path.join(scope, "codex", "node_modules", "@openai", "codex-win32-*", "vendor", "*", "*", "codex.exe"),
        os.path.join(scope, "codex-win32-*", "vendor", "*", "*", "codex.exe"),
        os.path.join(scope, "codex", "vendor", "*", "*", "codex.exe"),
    ]
    found = [path for pattern in patterns for path in sorted(glob.glob(pattern))]
    triple = "aarch64" if machine.lower() in {"arm64", "aarch64"} else "x86_64"
    return sorted(found, key=lambda path: triple not in path)


def _windows_codex_candidates(environ: dict[str, str], which, machine: str) -> list[str]:
    candidates: list[str] = []
    npm_roots: list[str] = []
    from_path = which("codex")
    if from_path:
        if from_path.lower().endswith(".exe"):
            candidates.append(from_path)
        else:
            npm_roots.append(os.path.dirname(from_path))
    appdata, local = environ.get("APPDATA"), environ.get("LOCALAPPDATA")
    if appdata:
        npm_roots.append(os.path.join(appdata, "npm"))
    for root in dict.fromkeys(npm_roots):
        candidates.extend(_windows_npm_binaries(root, machine))
    if local:
        # The official installer (chatgpt.com/codex/install.ps1) puts Codex here; a running app does not
        # see the PATH entry that the installer has just added.
        candidates.append(os.path.join(local, "Programs", "OpenAI", "Codex", "bin", "codex.exe"))
        candidates.append(os.path.join(local, "Microsoft", "WinGet", "Links", "codex.exe"))
        candidates.append(os.path.join(local, "Programs", "ChatGPT", "resources", "codex.exe"))
    program_files = environ.get("ProgramFiles")
    if program_files:
        try:
            # The Store package of the ChatGPT app; its folder is often not listable, then nothing is found here.
            candidates.extend(sorted(glob.glob(os.path.join(
                program_files, "WindowsApps", "OpenAI.ChatGPT-Desktop_*", "app", "resources", "codex.exe")), reverse=True))
        except OSError:
            pass
    return candidates


def _detached_process_options(platform: str = sys.platform) -> dict[str, Any]:
    """Own process group, so the App Server and the commands it started can be stopped together."""
    if platform == "win32":
        return {"creationflags": getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x200) | getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)}
    return {"start_new_session": True}


def _stop_process_tree(process: "subprocess.Popen[bytes]", *, force: bool, platform: str = sys.platform, run=subprocess.run) -> None:
    if platform == "win32":
        # Windows has no signal for a process group: taskkill ends the App Server with its children.
        try:
            run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, timeout=10,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000))
        except (OSError, subprocess.TimeoutExpired):
            try:
                process.kill()
            except OSError:
                pass
        return
    try:
        os.killpg(process.pid, signal.SIGKILL if force else signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        try:
            process.kill() if force else process.terminate()
        except OSError:
            pass


def discover_codex_binary(
    explicit: str | None = None,
    *,
    platform: str = sys.platform,
    environ: dict[str, str] | None = None,
    which=shutil.which,
) -> CodexBinary:
    environ = os.environ if environ is None else environ
    candidates: list[str] = []
    requested = explicit or environ.get("CODEX_APP_SERVER_BIN")
    if requested:
        candidates.append(str(Path(requested).expanduser()))

    if platform == "win32":
        candidates.extend(_windows_codex_candidates(
            environ, which, environ.get("PROCESSOR_ARCHITEW6432") or environ.get("PROCESSOR_ARCHITECTURE") or "AMD64"))
    else:
        home = Path.home()
        candidates.extend(
            [
                str(home / ".npm-global/bin/codex"),
                str(home / ".local/bin/codex"),
            ]
        )
        from_path = which("codex")
        if from_path:
            candidates.append(from_path)
        candidates.append("/Applications/ChatGPT.app/Contents/Resources/codex")

    seen: set[str] = set()
    for candidate in candidates:
        if not candidate:
            continue
        path = str(Path(candidate).expanduser())
        if path in seen:
            continue
        seen.add(path)
        if not os.path.isfile(path) or not os.access(path, os.X_OK):
            continue
        try:
            return CodexBinary(path=path, version=_binary_version(path))
        except AppServerError:
            continue
    raise AppServerError("No compatible Codex binary was found")


class AppServerClient:
    """Small JSON-RPC client for Codex App Server.

    It intentionally has no method that can launch a Codex model turn.
    """

    FORBIDDEN_METHODS = frozenset({"turn/start"})

    def __init__(
        self,
        *,
        binary: str | None = None,
        cwd: str | None = None,
        environment: dict[str, str] | None = None,
        request_timeout: float = 30.0,
        client_name: str = "web-pilot-codex-executor",
        client_version: str = "0.1",
    ) -> None:
        self.binary = discover_codex_binary(binary)
        self.cwd = str(Path(cwd or os.getcwd()).expanduser().resolve())
        self.environment = dict(os.environ)
        if environment:
            self.environment.update(environment)
        self.request_timeout = request_timeout
        self.client_name = client_name
        self.client_version = client_version

        self._process: subprocess.Popen[bytes] | None = None
        self._generation = 0
        self._request_id = 0
        self._request_lock = threading.Lock()
        self._write_lock = threading.Lock()
        self._lifecycle_lock = threading.RLock()
        self._pending: dict[int, queue.Queue[dict[str, Any]]] = {}
        self._pending_lock = threading.Lock()
        self._reader: threading.Thread | None = None
        self._stderr_reader: threading.Thread | None = None
        self._stderr_tail: list[str] = []
        self._stderr_lock = threading.Lock()
        self._processes: dict[str, ProcessState] = {}
        self._processes_lock = threading.Lock()

    @property
    def generation(self) -> int:
        return self._generation

    def status(self) -> dict[str, Any]:
        process = self._process
        return {
            "binary": self.binary.path,
            "version": self.binary.version,
            "generation": self._generation,
            "pid": process.pid if process and process.poll() is None else None,
            "running": bool(process and process.poll() is None),
        }

    def start(self) -> dict[str, Any]:
        with self._lifecycle_lock:
            if self._process is not None and self._process.poll() is None:
                return self.status()
            self._terminate_process()
            try:
                self._process = subprocess.Popen(
                    [self.binary.path, "app-server", "--stdio"],
                    cwd=self.cwd,
                    env=self.environment,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    shell=False,
                    bufsize=0,
                    **_detached_process_options(),
                )
            except OSError as exc:
                self._process = None
                raise AppServerError(f"Cannot start Codex App Server: {exc}") from exc

            self._generation += 1
            self._reader = threading.Thread(target=self._read_stdout, daemon=True)
            self._stderr_reader = threading.Thread(target=self._read_stderr, daemon=True)
            self._reader.start()
            self._stderr_reader.start()

            init = self._request_running(
                "initialize",
                {
                    "clientInfo": {
                        "name": self.client_name,
                        "version": self.client_version,
                    },
                    "capabilities": {"experimentalApi": True},
                },
                timeout=min(self.request_timeout, 15.0),
            )
            self._notify_running("initialized", {})
            if not isinstance(init, dict):
                raise AppServerError("Codex App Server returned invalid initialize result")
            return self.status()

    def close(self) -> None:
        with self._lifecycle_lock:
            self._terminate_process()

    def __enter__(self) -> "AppServerClient":
        self.start()
        return self

    def __exit__(self, _type: object, _value: object, _traceback: object) -> None:
        self.close()

    def request(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        *,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        if method in self.FORBIDDEN_METHODS:
            raise AppServerError(f"Forbidden App Server model method: {method}")
        self._ensure_running()
        return self._request_running(method, params or {}, timeout=timeout)

    def fs_read_file(self, path: str) -> bytes:
        result = self.request("fs/readFile", {"path": self._absolute(path)})
        encoded = result.get("dataBase64")
        if not isinstance(encoded, str):
            raise AppServerError("fs/readFile returned no dataBase64")
        return base64.b64decode(encoded)

    def fs_write_file(self, path: str, data: bytes) -> dict[str, Any]:
        return self.request(
            "fs/writeFile",
            {
                "path": self._absolute(path),
                "dataBase64": base64.b64encode(data).decode("ascii"),
            },
        )

    def fs_read_directory(self, path: str) -> dict[str, Any]:
        return self.request("fs/readDirectory", {"path": self._absolute(path)})

    def command_exec(
        self,
        command: list[str],
        *,
        cwd: str | None = None,
        timeout_ms: int | None = None,
        output_bytes_cap: int | None = 200_000,
        sandbox_policy: dict[str, Any] | None = None,
        environment: dict[str, str | None] | None = None,
    ) -> dict[str, Any]:
        if not command:
            raise ValueError("command must not be empty")
        params: dict[str, Any] = {
            "command": [str(item) for item in command],
            "cwd": self._absolute(cwd) if cwd else self.cwd,
        }
        if timeout_ms is not None:
            params["timeoutMs"] = int(timeout_ms)
        if output_bytes_cap is not None:
            params["outputBytesCap"] = int(output_bytes_cap)
        if sandbox_policy is not None:
            params["sandboxPolicy"] = sandbox_policy
        if environment:
            params["env"] = environment
        return self.request(
            "command/exec",
            params,
            timeout=max(
                self.request_timeout,
                (timeout_ms / 1000.0 + 5.0) if timeout_ms else self.request_timeout,
            ),
        )

    def start_command(
        self,
        command: list[str],
        *,
        cwd: str | None = None,
        timeout_ms: int | None = None,
        output_bytes_cap: int = 1_000_000,
        sandbox_policy: dict[str, Any] | None = None,
        environment: dict[str, str | None] | None = None,
        tty: bool = False,
        stream_stdin: bool = False,
        on_event: Any = None,
    ) -> dict[str, Any]:
        if not command:
            raise ValueError("command must not be empty")
        self._ensure_running()
        process_id = uuid.uuid4().hex[:16]
        params: dict[str, Any] = {
            "command": [str(item) for item in command],
            "cwd": self._absolute(cwd) if cwd else self.cwd,
            "processId": process_id,
            "streamStdoutStderr": True,
            "outputBytesCap": int(output_bytes_cap),
            "tty": bool(tty),
            "streamStdin": bool(stream_stdin or tty),
        }
        if timeout_ms is not None:
            params["timeoutMs"] = int(timeout_ms)
        else:
            params["disableTimeout"] = True
        if sandbox_policy is not None:
            params["sandboxPolicy"] = sandbox_policy
        if environment:
            params["env"] = environment

        state = ProcessState(
            process_id=process_id,
            request_id=0,
            command=[str(item) for item in command],
            cwd=params["cwd"],
            on_event=on_event,
        )
        with self._processes_lock:
            self._processes[process_id] = state
        try:
            request_id, response_queue = self._send_request_running("command/exec", params)
            state.request_id = request_id
        except Exception:
            with self._processes_lock:
                self._processes.pop(process_id, None)
            raise

        if on_event:
            try:
                on_event({"process_id": process_id, "state": "running", "generation": self.generation})
            except Exception:
                pass

        waiter = threading.Thread(
            target=self._finish_streaming_command,
            args=(state, response_queue),
            daemon=True,
        )
        waiter.start()
        return self.process_status(process_id, include_output=False)

    def write_command_stdin(
        self,
        process_id: str,
        data: bytes = b"",
        *,
        close_stdin: bool = False,
    ) -> dict[str, Any]:
        state = self._get_process(process_id)
        if state.done.is_set():
            raise AppServerError(f"Command session is no longer running: {process_id}")
        if not data and not close_stdin:
            return {}
        params: dict[str, Any] = {
            "processId": process_id,
            "closeStdin": bool(close_stdin),
        }
        if data:
            params["deltaBase64"] = base64.b64encode(data).decode("ascii")
        return self._request_running(
            "command/exec/write",
            params,
            timeout=10.0,
        )

    def read_command_output(
        self,
        process_id: str,
        *,
        cursor: int = 0,
        wait_ms: int = 0,
    ) -> dict[str, Any]:
        state = self._get_process(process_id)
        wait_seconds = max(0.0, min(float(wait_ms) / 1000.0, 60.0))
        if wait_seconds > 0 and not state.done.is_set():
            state.done.wait(wait_seconds)
        start = max(0, min(int(cursor), len(state.output)))
        output = bytes(state.output[start:])
        result = state.result or {}
        return {
            "process_id": process_id,
            "running": not state.done.is_set(),
            "exit_code": result.get("exitCode") if state.done.is_set() else None,
            "duration_ms": int((time.time() - state.started_at) * 1000),
            "output": output.decode("utf-8", errors="replace"),
            "cursor": len(state.output),
            "error": state.error,
        }

    def process_status(self, process_id: str, *, include_output: bool = True) -> dict[str, Any]:
        state = self._get_process(process_id)
        result = state.result or {}
        response: dict[str, Any] = {
            "process_id": process_id,
            "running": not state.done.is_set(),
            "exit_code": result.get("exitCode") if state.done.is_set() else None,
            "duration_ms": int((time.time() - state.started_at) * 1000),
            "error": state.error,
            "cap_reached": dict(state.cap_reached),
        }
        if include_output:
            response["stdout"] = bytes(state.stdout).decode("utf-8", errors="replace")
            response["stderr"] = bytes(state.stderr).decode("utf-8", errors="replace")
        return response

    def read_process_output(
        self,
        process_id: str,
        *,
        stdout_cursor: int = 0,
        stderr_cursor: int = 0,
        wait_ms: int = 1000,
        max_bytes: int = 100_000,
    ) -> dict[str, Any]:
        state = self._get_process(process_id)
        wait_seconds = max(0.0, min(float(wait_ms) / 1000.0, 30.0))
        deadline = time.monotonic() + wait_seconds
        while time.monotonic() < deadline and not state.done.is_set():
            if (
                state.stdout_base + len(state.stdout) > stdout_cursor
                or state.stderr_base + len(state.stderr) > stderr_cursor
            ):
                break
            state.done.wait(min(0.05, deadline - time.monotonic()))

        out, out_next = self._slice_process_stream(
            state.stdout, state.stdout_base, stdout_cursor, max_bytes
        )
        err, err_next = self._slice_process_stream(
            state.stderr, state.stderr_base, stderr_cursor, max_bytes
        )
        result = state.result or {}
        return {
            "process_id": process_id,
            "running": not state.done.is_set(),
            "exit_code": result.get("exitCode") if state.done.is_set() else None,
            "stdout": out.decode("utf-8", errors="replace"),
            "stderr": err.decode("utf-8", errors="replace"),
            "stdout_cursor": out_next,
            "stderr_cursor": err_next,
            "more_output": (
                out_next < state.stdout_base + len(state.stdout)
                or err_next < state.stderr_base + len(state.stderr)
            ),
            "cap_reached": dict(state.cap_reached),
            "error": state.error,
        }

    def list_processes(self) -> dict[str, Any]:
        with self._processes_lock:
            ids = list(self._processes)
        return {
            "processes": [
                self.process_status(process_id, include_output=False)
                for process_id in ids
            ]
        }

    def stop_process(self, process_id: str) -> dict[str, Any]:
        state = self._get_process(process_id)
        if state.done.is_set():
            return self.process_status(process_id, include_output=False)
        self.request(
            "command/exec/terminate",
            {"processId": process_id},
            timeout=10.0,
        )
        state.done.wait(5.0)
        return self.process_status(process_id, include_output=False)

    def _ensure_running(self) -> None:
        process = self._process
        if process is None or process.poll() is not None:
            self.start()

    def _request_running(
        self,
        method: str,
        params: dict[str, Any],
        *,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        request_id, response_queue = self._send_request_running(method, params)
        return self._await_response(request_id, response_queue, timeout)

    def _send_request_running(
        self,
        method: str,
        params: dict[str, Any],
    ) -> tuple[int, queue.Queue[dict[str, Any]]]:
        if method in self.FORBIDDEN_METHODS:
            raise AppServerError(f"Forbidden App Server model method: {method}")
        process = self._process
        if process is None or process.poll() is not None or process.stdin is None:
            raise AppServerError("Codex App Server is not running")
        with self._request_lock:
            self._request_id += 1
            request_id = self._request_id
        response_queue: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=1)
        with self._pending_lock:
            self._pending[request_id] = response_queue
        message = {"id": request_id, "method": method, "params": params}
        self._write(message)
        return request_id, response_queue

    def _await_response(
        self,
        request_id: int,
        response_queue: queue.Queue[dict[str, Any]],
        timeout: float | None,
    ) -> dict[str, Any]:
        try:
            message = response_queue.get(
                timeout=self.request_timeout if timeout is None else timeout
            )
        except queue.Empty as exc:
            with self._pending_lock:
                self._pending.pop(request_id, None)
            raise AppServerError(f"App Server request timed out: id={request_id}") from exc
        if "error" in message:
            raise AppServerError(
                f"App Server error: {json.dumps(message['error'], ensure_ascii=False)}"
            )
        result = message.get("result")
        if not isinstance(result, dict):
            raise AppServerError("App Server returned invalid result")
        return result

    def _notify_running(self, method: str, params: dict[str, Any]) -> None:
        self._write({"method": method, "params": params})

    def _write(self, message: dict[str, Any]) -> None:
        process = self._process
        if process is None or process.stdin is None or process.poll() is not None:
            raise AppServerError("Codex App Server is not running")
        payload = (json.dumps(message, separators=(",", ":")) + "\n").encode("utf-8")
        with self._write_lock:
            try:
                process.stdin.write(payload)
                process.stdin.flush()
            except (BrokenPipeError, OSError) as exc:
                raise AppServerError("Codex App Server stdin closed") from exc

    def _read_stdout(self) -> None:
        process = self._process
        if process is None or process.stdout is None:
            return
        try:
            for raw in iter(process.stdout.readline, b""):
                if not raw:
                    break
                try:
                    message = json.loads(raw.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    continue
                request_id = message.get("id")
                if isinstance(request_id, int):
                    with self._pending_lock:
                        target = self._pending.pop(request_id, None)
                    if target is not None:
                        target.put(message)
                    continue
                method = message.get("method")
                params = message.get("params")
                if method == "command/exec/outputDelta" and isinstance(params, dict):
                    self._process_output_delta(params)
        finally:
            self._fail_pending("Codex App Server stdout closed")

    def _read_stderr(self) -> None:
        process = self._process
        if process is None or process.stderr is None:
            return
        for raw in iter(process.stderr.readline, b""):
            if not raw:
                break
            text = raw.decode("utf-8", errors="replace").rstrip()
            if not text:
                continue
            with self._stderr_lock:
                self._stderr_tail.append(text)
                del self._stderr_tail[:-50]

    def _process_output_delta(self, params: dict[str, Any]) -> None:
        process_id = params.get("processId")
        if not isinstance(process_id, str):
            return
        with self._processes_lock:
            state = self._processes.get(process_id)
        if state is None:
            return
        try:
            chunk = base64.b64decode(str(params.get("deltaBase64") or ""))
        except ValueError:
            return
        stream = params.get("stream")
        if stream == "stdout":
            state.stdout.extend(chunk)
        elif stream == "stderr":
            state.stderr.extend(chunk)
        if stream in {"stdout", "stderr"}:
            state.output.extend(chunk)
        if stream in state.cap_reached and params.get("capReached") is True:
            state.cap_reached[stream] = True

    def _finish_streaming_command(
        self,
        state: ProcessState,
        response_queue: queue.Queue[dict[str, Any]],
    ) -> None:
        try:
            result = self._await_response(
                state.request_id,
                response_queue,
                timeout=24 * 60 * 60,
            )
            state.result = result
            stdout = str(result.get("stdout") or "").encode("utf-8")
            stderr = str(result.get("stderr") or "").encode("utf-8")
            if stdout:
                state.stdout.extend(stdout)
                state.output.extend(stdout)
            if stderr:
                state.stderr.extend(stderr)
                state.output.extend(stderr)
        except AppServerError as exc:
            state.error = str(exc)
        finally:
            state.done.set()
            if state.on_event:
                try:
                    code = (state.result or {}).get("exitCode")
                    state.on_event({"process_id": state.process_id,
                        "state": "completed" if not state.error and isinstance(code, int) else "unknown",
                        "exit_code": code if not state.error else None,
                        "reason": "transport_lost" if state.error else None,
                        "generation": self.generation})
                except Exception:
                    # Keep the command result readable; an unwritten witness stays conservative.
                    pass

    def _fail_pending(self, reason: str) -> None:
        with self._pending_lock:
            pending = list(self._pending.values())
            self._pending.clear()
        for target in pending:
            try:
                target.put_nowait({"error": {"message": reason}})
            except queue.Full:
                pass
        with self._processes_lock:
            processes = list(self._processes.values())
        for state in processes:
            if not state.done.is_set():
                state.error = reason
                state.done.set()

    def _terminate_process(self) -> None:
        process = self._process
        self._process = None
        if process is None:
            return
        if process.poll() is None:
            _stop_process_tree(process, force=False)
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                _stop_process_tree(process, force=True)
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    pass
        self._fail_pending("Codex App Server stopped")

    def _get_process(self, process_id: str) -> ProcessState:
        with self._processes_lock:
            state = self._processes.get(process_id)
        if state is None:
            raise AppServerError(f"Unknown process_id: {process_id}")
        return state

    @staticmethod
    def _slice_process_stream(
        data: bytearray,
        base: int,
        cursor: int,
        max_bytes: int,
    ) -> tuple[bytes, int]:
        start = max(0, int(cursor) - base)
        limit = max(1, min(int(max_bytes), 1_000_000))
        chunk = bytes(data[start : start + limit])
        return chunk, base + start + len(chunk)

    def _absolute(self, path: str | None) -> str:
        if not path:
            return self.cwd
        candidate = Path(path).expanduser()
        if not candidate.is_absolute():
            candidate = Path(self.cwd) / candidate
        return str(candidate.resolve(strict=False))
