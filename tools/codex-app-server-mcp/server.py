#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import tempfile
import asyncio
import io
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import uuid
import secrets
from pathlib import Path
from typing import Annotated, Any, Literal

from mcp.server.fastmcp import FastMCP, Image
from mcp.types import ToolAnnotations
from pydantic import Field
from starlette.responses import JSONResponse

from app_server_client import AppServerClient, AppServerError


READ_ONLY = ToolAnnotations(
    readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False
)
ARBITRARY_COMMAND = ToolAnnotations(
    readOnlyHint=False, destructiveHint=True, idempotentHint=False, openWorldHint=True
)
LOCAL_NOTIFICATION = ToolAnnotations(
    readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False
)

MAX_VIEW_IMAGE_BYTES = 20_000_000
MAX_PATCH_BYTES = 1_000_000
MAX_OUTPUT = 120_000
STDIN_CLOSED_MESSAGE = "stdin is closed for this session; rerun exec_command with tty=true to keep stdin open"
PREEXECUTION_RETRY_RULE = "If OpenAI blocked the call before execution, retry the same call once unchanged; change or split it only if the retry is blocked too."
# Codex App Server ends the processes of a command when the command returns, so a shell background
# job (& or nohup) dies at once with an empty log; a running command keeps its session instead.
LONG_COMMAND_RULE = ("Do not background commands with & or nohup: they end when the command returns. "
                     "Run a long command with exec_command and poll its session ID with write_stdin, empty chars; never rerun it.")


def current_boot_identity() -> str | None:
    """Stable per-boot token; never infer a reboot from a wall-clock timestamp."""
    try:
        if sys.platform == "darwin":
            token = subprocess.check_output(
                ["/usr/sbin/sysctl", "-n", "kern.bootsessionuuid"], timeout=2
            ).decode("ascii").strip()
        elif sys.platform.startswith("linux"):
            token = Path("/proc/sys/kernel/random/boot_id").read_text(
                encoding="ascii"
            ).strip()
        else:
            return None  # No verified per-boot identifier on this platform.
        return str(uuid.UUID(token)).lower()
    except (OSError, subprocess.SubprocessError, UnicodeError, ValueError):
        return None
# The record of the project open in Web Pilot, written by 0.6.86–0.6.95 for context delivery through MCP.
RETIRED_ACTIVE_WORKSPACE_FILE = "active-workspace.json"
CODEX_TOOLS_LOCK_FILE = Path(__file__).resolve().parent / "codex-tools.lock.json"
# Codex asks PowerShell for UTF-8 output with the same line (codex-rs/shell-command/src/powershell.rs).
POWERSHELL_UTF8_PREFIX = "try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n"
POWERSHELL_NAMES = {"pwsh", "powershell"}


WINDOWS_NOTIFY_SCRIPT = Path(__file__).resolve().parent / "windows_notify.ps1"
VIEW_IMAGE_MAX_DIMENSION = 1600
HEIF_BRANDS = {b"heic": "heic", b"heix": "heic", b"hevc": "heic", b"hevx": "heic", b"heim": "heic", b"heis": "heic",
               b"mif1": "heif", b"msf1": "heif", b"avif": "avif", b"avis": "avif"}


def sniff_image_mime(header: bytes) -> str | None:
    """Image type by the first bytes of the file: the same on both systems, without an external command."""
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    if header[:4] in (b"II*\x00", b"MM\x00*"):
        return "image/tiff"
    if header[4:8] == b"ftyp" and header[8:12] in HEIF_BRANDS:
        return "image/" + HEIF_BRANDS[header[8:12]]
    if header[:2] == b"BM" and header[6:10] == b"\x00\x00\x00\x00" and int.from_bytes(header[14:18], "little") in {12, 40, 52, 56, 64, 108, 124}:
        return "image/bmp"
    if header[:4] == b"\x00\x00\x01\x00":
        return "image/vnd.microsoft.icon"
    if header[:4] == b"8BPS":
        return "image/vnd.adobe.photoshop"
    if header[:4] == b"icns":
        return "image/x-icns"
    text = header.lstrip(b"\xef\xbb\xbf \t\r\n")
    if text.startswith(b"<svg") or (text.startswith(b"<?xml") and b"<svg" in text):
        return "image/svg+xml"
    return None


def server_name(platform: str = sys.platform) -> str:
    """One executor on both systems; the MCP server is named after the computer it runs on."""
    return {'win32': 'Workflow Pilot Local Windows', 'darwin': 'Workflow Pilot Local Mac', 'linux': 'Workflow Pilot Local Linux'}[platform]


def default_state_dir(platform: str = sys.platform, environ: dict[str, str] | None = None) -> Path:
    environ = os.environ if environ is None else environ
    if platform == "win32":
        return Path(environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "WorkflowPilotCodexExecutor"
    if platform == 'linux':
        from linux_runtime import state_directory
        return state_directory(environ)
    return Path.home() / "Library/Application Support/WorkflowPilotCodexExecutor"

SENSITIVE_NAMES = {
    ".env", ".npmrc", ".pypirc", ".netrc", "credentials", "credentials.json",
    "id_rsa", "id_ed25519", "bridge_config.json", "tunnel-key.dpapi",
}
SENSITIVE_SUFFIXES = {".pem", ".key", ".pfx", ".p12"}
SENSITIVE_DIRS = {".ssh", ".gnupg", "keychains", "credentials", "wallets"}
SENSITIVE_FRAGMENTS = [
    ("library", "safari"),
    ("library", "accounts"),
    ("google", "chrome", "user data"),
    ("microsoft", "edge", "user data"),
    ("mozilla", "firefox", "profiles"),
    ("codexlocalmac", "private"),
    ("webpilotcodexexecutor", "private"),
]

def clamp(text: str, limit: int = MAX_OUTPUT) -> str:
    return text if len(text) <= limit else text[:limit] + f"\n\n[TRUNCATED: {len(text)-limit} chars omitted]"


def is_sensitive(path: Path) -> bool:
    parts = tuple(part.lower() for part in path.parts)
    name = path.name.lower()
    if name in SENSITIVE_NAMES or name.startswith(".env.") or path.suffix.lower() in SENSITIVE_SUFFIXES:
        return True
    if any(part in SENSITIVE_DIRS for part in parts):
        return True
    for fragment in SENSITIVE_FRAGMENTS:
        width = len(fragment)
        if any(parts[i:i+width] == fragment for i in range(len(parts)-width+1)):
            return True
    return False


class LocalFacade:
    def __init__(self, client: AppServerClient, state_root: Path) -> None:
        self.client = client
        self.state_root = state_root
        # The platform is a field so that the Windows branches can be exercised on any system.
        self.platform = sys.platform
        self._windows_desktop: Any = None
        state_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            # The recoverable-delete folder of 0.6.94 and earlier: rmdir removes it only when it is empty.
            (state_root / "trash").rmdir()
        except OSError:
            pass
        try:
            # This MCP carries tools only: the project context goes in the start message of Web Pilot.
            (state_root / RETIRED_ACTIVE_WORKSPACE_FILE).unlink()
        except OSError:
            pass
        self._command_sessions: dict[str, tuple[int, bool]] = {}
        self._command_activity: dict[str, Path] = {}
        self._command_sessions_lock = threading.Lock()
        self._activity_lock = threading.RLock()
        self._activities: dict[str, dict] = {}
        self._executor_instance = uuid.uuid4().hex
        self._boot_identity = current_boot_identity()
        self._read_only_generation = None
        self._patch_activity = threading.local()
        self._direct_patches: dict[str, Any] = {}

    def _assert_project_active(self, root: Path) -> None:
        file = self.state_root / 'private' / 'project-command-stops.json'
        try:
            if file.is_symlink():
                raise ValueError('Invalid project command control file')
            data = json.loads(file.read_text(encoding='utf-8'))
        except FileNotFoundError:
            return
        if data.get('version') != 1 or not isinstance(data.get('workspaces'), list):
            raise ValueError('Invalid project command control file')
        if str(root) in data['workspaces']:
            raise ValueError('PROJECT_REMOVED: commands for this project are disabled by its removal')

    def quiesce_projects(self, workspaces: list[str]) -> dict:
        if not isinstance(workspaces, list) or not workspaces or len(workspaces) > 256 or any(
            not isinstance(p, str) or not Path(p).is_absolute() or str(Path(p)) != p for p in workspaces
        ):
            raise ValueError('Invalid workspace addresses')
        targets = set(workspaces)
        # The backend persists the block before requesting cancellation. Never
        # accept a control request that can race a newly admitted command.
        for root in targets:
            try:
                self._assert_project_active(Path(root))
            except ValueError as exc:
                if not str(exc).startswith('PROJECT_REMOVED:'):
                    raise
            else:
                raise ValueError('Project stop intent is missing')
        deadline = time.monotonic() + 25
        confirmed = set()
        while True:
            with self._activity_lock:
                records = [(key, dict(value)) for key, value in self._activities.items()
                           if value['workspace'] in targets and key not in confirmed]
            if not records:
                return {'executor_instance': self._executor_instance,
                        'operations': [Path(key).stem for key in confirmed]}
            for key, record in records:
                stopped = record['state'] == 'completed' or record.get('direct_finished', False)
                process = self._direct_patches.get(key)
                if process is not None:
                    if process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(timeout=1)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait(timeout=5)
                    stopped = process.poll() is not None
                elif record.get('process_id'):
                    status = self.client.stop_process(record['process_id'])
                    stopped = not status.get('running', True)
                if stopped:
                    with self._activity_lock:
                        self._activities[key]['retired'] = True
                    confirmed.add(key)
            if time.monotonic() >= deadline:
                raise ValueError('Owned command launch or termination is not yet confirmed')
            time.sleep(0.02)

    def install_project_control(self, mcp, host: str, port: int) -> None:
        directory = self.state_root / 'private'
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        if self.state_root.is_symlink() or directory.is_symlink() or directory.resolve() != self.state_root.resolve() / 'private':
            raise ValueError('Private executor directory is not owned')
        token = secrets.token_hex(32)
        self._write_activity(directory / 'command-control.json',
                             {'version': 1, 'port': port, 'pid': os.getpid(), 'token': token})

        @mcp.custom_route('/workflow-project-control', methods=['POST'], include_in_schema=False)
        async def control(request):
            if (request.client is None or request.client.host not in ('127.0.0.1', '::1')
                or request.headers.get('origin') or request.headers.get('host') != f'127.0.0.1:{port}'
                or not secrets.compare_digest(request.headers.get('authorization', ''), 'Bearer ' + token)):
                return JSONResponse({'error': 'Forbidden'}, status_code=403)
            try:
                body = await request.body()
                if len(body) > 65536:
                    raise ValueError('Request too large')
                data = json.loads(body)
                operation = str(uuid.UUID(data['operation']))
                result = await asyncio.to_thread(self.quiesce_projects, data['workspaces'])
                return JSONResponse({'operation': operation, **result})
            except (ValueError, KeyError, OSError, AppServerError) as exc:
                return JSONResponse({'error': str(exc)[:300]}, status_code=409)

    def _begin_activity(self, cwd: Path, *, kind: str = "exec", command: str = "", read_only: bool = False) -> Path | None:
        for root in (cwd, *cwd.parents):
            if (root / ".harness" / "plans" / "todo-plan.md").is_file():
                directory = root / ".harness" / "runtime" / "command-activity"
                marker = directory / (uuid.uuid4().hex + ".json")
                metadata = {"version": 2, "id": marker.stem, "workspace": str(root),
                    "cwd": str(cwd), "kind": kind, "command_hash": hashlib.sha256(command.encode()).hexdigest(),
                    "executor_pid": os.getpid(), "executor_instance": self._executor_instance,
                    "generation": getattr(self.client, "generation", None), "process_id": None,
                    "started_at_ms": int(time.time() * 1000), "state": "starting",
                    "read_only_verified": read_only, "sandbox_policy": "readOnly" if read_only else "dangerFullAccess"}
                if self._boot_identity:
                    metadata["boot_id"] = self._boot_identity
                with self._activity_lock:
                    self._assert_project_active(root)
                    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
                    self._activities[str(marker)] = metadata
                    self._write_activity(marker, metadata)
                return marker
        for root in (cwd, *cwd.parents):
            self._assert_project_active(root)
        return None

    @staticmethod
    def _write_activity(marker: Path, metadata: dict) -> None:
        temporary = marker.with_suffix(".tmp")
        with temporary.open("w", encoding="utf-8") as stream:
            os.chmod(temporary, 0o600)
            json.dump(metadata, stream)
        os.replace(temporary, marker)

    def _activity_event(self, marker: Path | None, event: dict) -> None:
        if marker is None:
            return
        with self._activity_lock:
            metadata = self._activities.get(str(marker))
            if metadata is None or metadata.get('retired') or metadata["state"] == "completed":
                return
            if metadata["state"] == "unknown" and event.get("state") == "running":
                return
            metadata.update({k: v for k, v in event.items() if k in
                {"process_id", "state", "exit_code", "reason", "generation"}})
            if metadata["state"] == "completed":
                metadata["finished_at_ms"] = int(time.time() * 1000)
                receipts = marker.parent.parent / "command-results"
                receipts.mkdir(parents=True, exist_ok=True, mode=0o700)
                self._write_activity(receipts / marker.name, metadata)
                marker.unlink(missing_ok=True)
                completed = sorted(receipts.glob("*.json"), key=lambda p: p.stat().st_mtime_ns)
                for stale in completed[:-100]:
                    stale.unlink(missing_ok=True)
            else:
                self._write_activity(marker, metadata)

    def _finish_activity(self, marker: Path | None, exit_code: int = 0) -> None:
        self._activity_event(marker, {"state": "completed", "exit_code": exit_code})

    def _confirm_read_only(self) -> None:
        # A real capability probe, not a platform name or a promise from the caller.
        self.client.start()
        generation = self.client.generation
        if self._read_only_generation == generation:
            return
        with tempfile.TemporaryDirectory(prefix="web-pilot-readonly-") as root:
            probe = ("import pathlib,socket,subprocess,sys; "
                "s=socket.socket(); s.bind(('127.0.0.1',0)); "
                "r=subprocess.run([sys.executable,'-c',"
                "\"import pathlib; pathlib.Path('forbidden').write_text('probe')\"],capture_output=True); "
                "print('READ_ONLY_OK' if r.returncode!=0 and not pathlib.Path('forbidden').exists() else 'UNSAFE')")
            result = self.client.command_exec([sys.executable, "-I", "-c", probe], cwd=root,
                sandbox_policy={"type": "readOnly", "networkAccess": True}, timeout_ms=10000)
            if result.get("exitCode") != 0 or result.get("stdout", "").strip() != "READ_ONLY_OK":
                raise ValueError("Read-only command isolation could not be verified; command was not started")
        self._read_only_generation = generation

    def resolve(self, path: str, *, must_exist: bool = False, allow_sensitive: bool = False) -> Path:
        candidate = Path(path).expanduser()
        if not candidate.is_absolute():
            candidate = Path(self.client.cwd) / candidate
        resolved = candidate.resolve(strict=False)
        if must_exist and not resolved.exists():
            raise ValueError(f"Path does not exist: {resolved}")
        if not allow_sensitive and is_sensitive(resolved):
            raise ValueError("Sensitive credential/private path is not available")
        return resolved

    def _command(
        self,
        argv: list[str],
        *,
        cwd: str | Path | None = None,
        timeout_ms: int = 30_000,
        write: bool = False,
        output_cap: int = 200_000,
    ) -> dict[str, Any]:
        result = self.client.command_exec(
            argv,
            cwd=str(cwd) if cwd else self.client.cwd,
            timeout_ms=timeout_ms,
            output_bytes_cap=output_cap,
            # Fixed internal argv are constrained by this facade; readOnly sandbox on macOS\n            # blocks harmless tool caches (notably /usr/bin/git via xcrun) and adds ~600 ms.\n            sandbox_policy={"type": "dangerFullAccess"},
        )
        return {
            "ok": result.get("exitCode") == 0,
            "exit_code": result.get("exitCode"),
            "stdout": clamp(str(result.get("stdout") or "")),
            "stderr": clamp(str(result.get("stderr") or "")),
        }

    def _codex_tools_status(self) -> dict[str, Any]:
        installed_text = str(self.client.binary.version)
        installed_version = next(
            (part for part in installed_text.replace(",", " ").split() if part[:1].isdigit() and part.count(".") >= 2),
            installed_text,
        )
        pinned_version = None
        pinned_tag = None
        lock_error = None
        try:
            lock = json.loads(CODEX_TOOLS_LOCK_FILE.read_text(encoding="utf-8"))
            pinned_version = lock.get("codex_version")
            pinned_tag = lock.get("tag")
        except Exception as exc:
            lock_error = str(exc)
        return {
            "pinned_version": pinned_version,
            "pinned_tag": pinned_tag,
            "installed_version": installed_version,
            "version_matches": bool(pinned_version and installed_version == pinned_version),
            "apply_patch_available": self._apply_patch_available(),
            **({"lock_error": lock_error} if lock_error else {}),
        }

    def _apply_patch_available(self) -> bool:
        if self.platform in ("win32", "linux"):
            # On Windows the patch is applied by the Codex executable itself (see apply_patch).
            return os.path.isfile(str(self.client.binary.path))
        probe = self._command(["/usr/bin/which", "apply_patch"], timeout_ms=10_000)
        return bool(probe["ok"] and probe["stdout"].strip())

    def status(self, repository: str = "") -> dict[str, Any]:
        system = {'win32': 'Windows', 'darwin': 'macOS', 'linux': 'Linux'}[self.platform]
        data = {
            "executor": self.client.status(),
            "filesystem_scope": f"local {system} filesystem with current user permissions",
            "repository_mode": "per-call",
            "state_root": str(self.state_root),
            "local_only": True,
            "model_turns": "forbidden",
            "codex_tools": self._codex_tools_status(),
        }
        if repository:
            repo = self.resolve(repository, must_exist=True, allow_sensitive=True)
            git = self._command(["git", "status", "--short", "--branch"], cwd=repo)
            data["repository"] = str(repo)
            data["git"] = git
            operations = []
            for folder in ("command-activity", "command-results"):
                for file in sorted((repo / ".harness/runtime" / folder).glob("*.json")):
                    try:
                        item = json.loads(file.read_text())
                        operations.append({k: item[k] for k in ("version", "id", "workspace", "cwd", "kind",
                            "process_id", "executor_pid", "executor_instance", "generation", "state",
                            "read_only_verified", "sandbox_policy", "started_at_ms", "finished_at_ms", "exit_code", "reason") if k in item})
                    except (OSError, ValueError):
                        operations.append({"id": file.stem, "state": "unknown", "reason": "unreadable_record"})
            data["command_operations"] = operations
        return data

    @staticmethod
    def _native_apply_patch_error(detail: str) -> ValueError:
        text = detail.strip() or "apply_patch failed"
        lowered = text.lower()
        unavailable = any(
            marker in lowered
            for marker in ("no such file or directory", "command not found", "not found in path", "failed to spawn")
        )
        if unavailable:
            return ValueError(f"Codex apply_patch command is unavailable: {text}")
        return ValueError(text)

    def apply_patch(self, patch: str, workdir: str) -> str:
        if not isinstance(patch, str) or not patch.strip():
            raise ValueError("patch is empty")
        if len(patch.encode("utf-8")) > MAX_PATCH_BYTES:
            raise ValueError(f"patch is larger than {MAX_PATCH_BYTES} bytes")
        if not patch.lstrip().startswith("*** Begin Patch"):
            raise ValueError("patch must start with *** Begin Patch")
        marker = self._begin_activity(self._command_workdir(workdir), kind="patch")
        self._patch_activity.marker = marker
        try:
            result = self._apply_patch(patch, workdir)
            self._finish_activity(marker)
            return result
        except Exception:
            self._activity_event(marker, {"state": "unknown", "reason": "patch_result_unconfirmed"})
            raise
        finally:
            self._patch_activity.marker = None

    def _apply_patch(self, patch: str, workdir: str) -> str:
        if not isinstance(patch, str) or not patch.strip():
            raise ValueError("patch is empty")
        data = patch.encode("utf-8")
        if len(data) > MAX_PATCH_BYTES:
            raise ValueError(f"patch is larger than {MAX_PATCH_BYTES} bytes")
        if not patch.lstrip().startswith("*** Begin Patch"):
            raise ValueError("patch must start with *** Begin Patch")
        cwd = self._command_workdir(workdir)
        if self.platform in ("win32", "linux"):
            return self._apply_patch_direct(data, cwd)
        started = self.client.start_command(
            ["apply_patch"],
            cwd=str(cwd),
            output_bytes_cap=1_000_000,
            sandbox_policy={"type": "dangerFullAccess"},
            stream_stdin=True,
            on_event=lambda event, marker=getattr(self._patch_activity, "marker", None): self._activity_event(marker, event),
        )
        process_id = str(started["process_id"])
        try:
            self.client.write_command_stdin(process_id, data, close_stdin=True)
        except Exception as exc:
            result = self.client.read_command_output(process_id, cursor=0, wait_ms=100)
            detail = str(result.get("error") or result.get("output") or exc)
            raise self._native_apply_patch_error(detail) from None
        result = self.client.read_command_output(process_id, cursor=0, wait_ms=60_000)
        if result.get("running"):
            result = self.client.read_command_output(process_id, cursor=0, wait_ms=60_000)
        if result.get("running"):
            try:
                self.client.request("command/exec/terminate", {"processId": process_id}, timeout=10.0)
            except Exception:
                pass
            raise ValueError("Codex apply_patch did not finish within 120 seconds")
        if result.get("error"):
            raise self._native_apply_patch_error(str(result["error"]))
        output = str(result.get("output") or "").strip()
        if result.get("exit_code") != 0:
            raise self._native_apply_patch_error(output or f"apply_patch exited with code {result.get('exit_code')}")
        return output or "Done!"

    def _apply_patch_direct(self, data: bytes, cwd: Path) -> str:
        """Windows: Codex puts apply_patch.bat on PATH, and a batch file takes the patch as an argument.
        A patch has many lines and may exceed the command line, so the same Codex executable is started
        under the name apply_patch and reads the patch from stdin, exactly as the alias does on macOS."""
        marker = getattr(self._patch_activity, 'marker', None)
        process = None
        try:
            with self._activity_lock:
                if marker is not None:
                    self._assert_project_active(Path(self._activities[str(marker)]['workspace']))
                process = subprocess.Popen(
                ["apply_patch"],
                executable=str(self.client.binary.path),
                cwd=str(cwd),
                env=getattr(self.client, "environment", None),
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0) if sys.platform == "win32" else 0,
                )
                if marker is not None:
                    self._direct_patches[str(marker)] = process
            stdout, stderr = process.communicate(data, timeout=120)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate()
            raise ValueError("Codex apply_patch did not finish within 120 seconds") from None
        except OSError as exc:
            raise self._native_apply_patch_error(f"failed to spawn: {exc}") from None
        finally:
            if marker is not None:
                with self._activity_lock:
                    self._activities[str(marker)]['direct_finished'] = process is None or process.poll() is not None
        output = (stdout + stderr).decode("utf-8", errors="replace").strip()
        if process.returncode != 0:
            raise self._native_apply_patch_error(output or f"apply_patch exited with code {process.returncode}")
        return output or "Done!"

    def view_image(self, path: str) -> Any:
        target = self.resolve(path, must_exist=True)
        if not target.is_file():
            raise ValueError(f"Image path is not a file: {target}")
        size = target.stat().st_size
        if size > MAX_VIEW_IMAGE_BYTES:
            raise ValueError(f"Image is larger than {MAX_VIEW_IMAGE_BYTES} bytes")
        try:
            with target.open("rb") as stream:
                mime = sniff_image_mime(stream.read(512))
        except OSError as exc:
            raise ValueError(f"Image type check failed: {exc}") from None
        if mime is None:
            raise ValueError("File is not an image")
        if self.platform in ("win32", "linux"):
            data, image_format = self._resize_image_windows(target, mime)
            return [{"source": str(target), "bytes": len(data)}, Image(data=data, format=image_format)]
        suffix = target.suffix if 0 < len(target.suffix) <= 16 else ".image"
        copy = self.state_root / f"view-image-{uuid.uuid4().hex}{suffix}"
        try:
            shutil.copyfile(target, copy)
            try:
                resized = subprocess.run(
                    ["/usr/bin/sips", "-Z", str(VIEW_IMAGE_MAX_DIMENSION), str(copy)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                raise ValueError(f"Image resize failed: {exc}") from None
            if resized.returncode != 0:
                raise ValueError((resized.stderr or "").strip() or "Image format is not supported")
            data = copy.read_bytes()
            image_format = mime.split("/", 1)[1]
            return [{"source": str(target), "bytes": len(data)}, Image(data=data, format=image_format)]
        finally:
            try:
                copy.unlink()
            except OSError:
                pass

    @staticmethod
    def _resize_image_windows(target: Path, mime: str) -> tuple[bytes, str]:
        """Windows has no sips: Pillow from the executor runtime keeps the format and shrinks only a larger image."""
        try:
            from PIL import Image as PillowImage
        except ImportError:
            raise ValueError("Image resize is unavailable: Pillow is missing from the executor runtime; prepare the components again") from None
        try:
            with PillowImage.open(target) as picture:
                if max(picture.size) <= VIEW_IMAGE_MAX_DIMENSION:
                    return target.read_bytes(), mime.split("/", 1)[1]
                picture_format = picture.format if picture.format in {"PNG", "JPEG", "GIF", "WEBP", "BMP", "TIFF"} else "PNG"
                picture.thumbnail((VIEW_IMAGE_MAX_DIMENSION, VIEW_IMAGE_MAX_DIMENSION))
                buffer = io.BytesIO()
                picture.save(buffer, format=picture_format)
                return buffer.getvalue(), picture_format.lower()
        except Exception:
            raise ValueError("Image format is not supported") from None

    @staticmethod
    def _command_limit(name: str, value: int, minimum: int, maximum: int) -> int:
        if type(value) is not int:
            raise ValueError(f"{name} must be an integer from {minimum} to {maximum}")
        return max(minimum, min(value, maximum))

    def _command_workdir(self, workdir: str) -> Path:
        if not isinstance(workdir, str) or not workdir.strip():
            raise ValueError("workdir is required")
        cwd = self.resolve(workdir, must_exist=True, allow_sensitive=True)
        if not cwd.is_dir():
            raise ValueError(f"workdir is not a directory: {cwd}")
        return cwd

    def _windows_shell(self, shell: str) -> str:
        requested = shell.strip() if isinstance(shell, str) else ""
        if not requested:
            # The order Codex uses: PowerShell 7 when installed, otherwise Windows PowerShell.
            root = os.environ.get("SystemRoot") or r"C:\Windows"
            candidates = [
                shutil.which("pwsh"),
                os.path.join(os.environ.get("ProgramFiles") or r"C:\Program Files", "PowerShell", "7", "pwsh.exe"),
                shutil.which("powershell"),
                os.path.join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
            ]
            requested = next((item for item in candidates if item and os.path.isfile(item)), "")
            if not requested:
                raise ValueError("PowerShell was not found; pass shell explicitly")
        elif not any(separator in requested for separator in ("/", "\\")):
            requested = shutil.which(requested) or requested
        path = Path(requested).expanduser()
        if not path.is_absolute() or not path.is_file():
            raise ValueError(f"shell is not executable: {requested}")
        return str(path)

    @staticmethod
    def _shell_argv(executable: str, cmd: str, login: bool, platform: str) -> list[str]:
        """The argv Codex builds for a shell (codex-rs/core/src/shell.rs); POSIX shells are the same on both systems."""
        name = Path(executable.replace("\\", "/")).name.lower().removesuffix(".exe")
        if platform == "win32" and name in POWERSHELL_NAMES:
            return [executable, *([] if login else ["-NoProfile"]), "-Command", POWERSHELL_UTF8_PREFIX + cmd]
        if platform == "win32" and name == "cmd":
            return [executable, "/c", cmd]
        return [executable, "-lc" if login else "-c", cmd]

    def _command_shell(self, shell: str) -> str:
        if self.platform == "win32":
            return self._windows_shell(shell)
        requested = shell.strip() if isinstance(shell, str) else ""
        if not requested:
            environment = getattr(self.client, "environment", {})
            requested = str(environment.get("SHELL") or os.environ.get("SHELL") or ('/bin/bash' if self.platform == 'linux' else "/bin/zsh"))
        if "/" not in requested:
            requested = shutil.which(requested) or f"/bin/{requested}"
        path = Path(requested).expanduser()
        if not path.is_absolute():
            raise ValueError("shell must name an executable shell")
        resolved = path.resolve(strict=False)
        if not resolved.is_file() or not os.access(resolved, os.X_OK):
            raise ValueError(f"shell is not executable: {resolved}")
        return str(resolved)

    @staticmethod
    def _truncate_command_output(output: str, max_output_tokens: int) -> tuple[str, int]:
        data = output.encode("utf-8")
        original_tokens = (len(data) + 3) // 4
        budget = max_output_tokens * 4
        if len(data) <= budget:
            return output, original_tokens
        marker = f"\n... {len(data) - budget} bytes omitted ...\n".encode("utf-8")
        usable = max(2, budget - len(marker))
        head = usable // 2
        tail = usable - head
        clipped = data[:head].decode("utf-8", errors="ignore") + marker.decode("utf-8") + data[-tail:].decode("utf-8", errors="ignore")
        return clipped, original_tokens

    @classmethod
    def _format_command_result(cls, result: dict[str, Any], max_output_tokens: int) -> str:
        output, original_tokens = cls._truncate_command_output(str(result.get("output") or ""), max_output_tokens)
        process_id = str(result["process_id"])
        duration = max(0.0, float(result.get("duration_ms") or 0) / 1000.0)
        if result.get("running"):
            state = f"Process running with session ID {process_id}"
        else:
            state = f"Process exited with code {result.get('exit_code')}"
        return (
            f"Chunk ID: {process_id[:8]}\n"
            f"Wall time: {duration:.3f} seconds\n"
            f"{state}\n"
            f"Original token count: {original_tokens}\n"
            f"Output:\n{output}"
        )

    def exec_command(
        self,
        cmd: str,
        workdir: str,
        shell: str = "",
        login: bool = True,
        tty: bool = False,
        yield_time_ms: int = 10_000,
        max_output_tokens: int = 8_000,
        read_only: bool = False,
    ) -> str:
        if not isinstance(cmd, str) or not cmd.strip():
            raise ValueError("cmd must not be empty")
        cwd = self._command_workdir(workdir)
        executable = self._command_shell(shell)
        wait_ms = self._command_limit("yield_time_ms", yield_time_ms, 250, 30_000)
        token_limit = self._command_limit("max_output_tokens", max_output_tokens, 1, 8_000)
        if not isinstance(login, bool):
            raise ValueError("login must be true or false")
        if not isinstance(tty, bool):
            raise ValueError("tty must be true or false")
        if not isinstance(read_only, bool):
            raise ValueError("read_only must be true or false")
        if read_only:
            self._confirm_read_only()
        marker = self._begin_activity(cwd, command=cmd, read_only=read_only)
        try:
            started = self.client.start_command(
                self._shell_argv(executable, cmd, login, self.platform),
                cwd=str(cwd),
                output_bytes_cap=4_000_000,
                sandbox_policy={"type": "readOnly", "networkAccess": True} if read_only else {"type": "dangerFullAccess"},
                tty=tty,
                stream_stdin=tty,
                on_event=lambda event: self._activity_event(marker, event),
            )
        except Exception:
            self._activity_event(marker, {"state": "unknown", "reason": "launch_unconfirmed"})
            raise
        process_id = str(started["process_id"])
        self._activity_event(marker, {"process_id": process_id, "state": "running"})
        try:
            result = self.client.read_command_output(process_id, cursor=0, wait_ms=wait_ms)
        except Exception:
            self._activity_event(marker, {"state": "unknown", "reason": "read_result_unconfirmed"})
            raise
        if result.get("error"):
            self._activity_event(marker, {"state": "unknown", "reason": "command_result_unconfirmed"})
            raise ValueError(str(result["error"]))
        if result.get("running"):
            with self._command_sessions_lock:
                self._command_sessions[process_id] = (int(result["cursor"]), tty)
                if marker is not None:
                    self._command_activity[process_id] = marker
        else:
            if isinstance(result.get("exit_code"), int):
                self._finish_activity(marker, result["exit_code"])
            else:
                self._activity_event(marker, {"state": "unknown", "reason": "exit_code_missing"})
        return self._format_command_result(result, token_limit)

    def write_stdin(
        self,
        session_id: str,
        chars: str = "",
        yield_time_ms: int = 250,
        max_output_tokens: int = 8_000,
    ) -> str:
        if not isinstance(session_id, str) or not session_id.strip():
            raise ValueError("session_id is required")
        if not isinstance(chars, str):
            raise ValueError("chars must be a string")
        wait_ms = self._command_limit(
            "yield_time_ms",
            yield_time_ms,
            250 if chars else 5_000,
            30_000 if chars else 60_000,
        )
        token_limit = self._command_limit("max_output_tokens", max_output_tokens, 1, 8_000)
        with self._command_sessions_lock:
            session = self._command_sessions.get(session_id)
        if session is None:
            raise ValueError(f"Unknown or finished command session: {session_id}")
        cursor, tty = session
        result = None
        if chars:
            status = self.client.read_command_output(session_id, cursor=cursor, wait_ms=0)
            if not status.get("running"):
                result = status
            else:
                try:
                    if not tty:
                        if chars != "\x03":
                            raise ValueError(STDIN_CLOSED_MESSAGE)
                        self.client.request(
                            "command/exec/terminate",
                            {"processId": session_id},
                            timeout=10.0,
                        )
                    else:
                        self.client.write_command_stdin(session_id, chars.encode("utf-8"))
                except ValueError:
                    raise
                except Exception:
                    status = self.client.read_command_output(session_id, cursor=cursor, wait_ms=0)
                    if status.get("running"):
                        raise
                    result = status
        interaction_started = time.monotonic()
        if result is None:
            result = self.client.read_command_output(session_id, cursor=cursor, wait_ms=wait_ms)
        result = dict(result)
        result["duration_ms"] = int((time.monotonic() - interaction_started) * 1000)
        if result.get("error"):
            with self._command_sessions_lock:
                self._command_sessions.pop(session_id, None)
            raise ValueError(str(result["error"]))
        with self._command_sessions_lock:
            if result.get("running"):
                self._command_sessions[session_id] = (int(result["cursor"]), tty)
            else:
                self._command_sessions.pop(session_id, None)
                marker = self._command_activity.pop(session_id, None)
                if isinstance(result.get("exit_code"), int):
                    self._finish_activity(marker, result["exit_code"])
                else:
                    self._activity_event(marker, {"state": "unknown", "reason": "exit_code_missing"})
        return self._format_command_result(result, token_limit)


    # Observation only: this MCP lists windows and takes screenshots; it never drives the UI.
    # CoreGraphics through JXA needs neither Xcode tools nor Automation permission.
    # Options 1|16: on-screen windows only, no desktop elements; layer 0 is ordinary app windows.
    _WINDOW_LIST_JXA = (
        "ObjC.import('CoreGraphics');"
        "JSON.stringify((ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(1|16,0)))||[])"
        ".filter(w=>w.kCGWindowLayer===0).map(w=>({window_id:w.kCGWindowNumber,"
        "application:w.kCGWindowOwnerName||'',pid:w.kCGWindowOwnerPID,"
        "title:w.kCGWindowName===undefined?null:w.kCGWindowName,bounds:w.kCGWindowBounds||null})))"
    )

    def _desktop(self) -> Any:
        """Windows observation module; created on first use so that macOS never loads it."""
        if self.platform == 'linux':
            if getattr(self, '_linux_desktop', None) is None:
                from linux_desktop import LinuxDesktop
                self._linux_desktop = LinuxDesktop()
            return self._linux_desktop
        if self._windows_desktop is None:
            from windows_desktop import WindowsDesktop
            self._windows_desktop = WindowsDesktop()
        return self._windows_desktop

    def _mac_windows(self) -> list[dict[str, Any]]:
        result = self._command(["/usr/bin/osascript", "-l", "JavaScript", "-e", self._WINDOW_LIST_JXA])
        if not result["ok"]:
            raise ValueError(result["stderr"] or "Window list is unavailable")
        try:
            windows = json.loads(result["stdout"])
        except json.JSONDecodeError:
            raise ValueError("Window list returned invalid data") from None
        if not isinstance(windows, list):
            raise ValueError("Window list returned invalid data")
        rows = []
        for window in windows:
            if not isinstance(window, dict) or not isinstance(window.get("window_id"), int):
                continue
            bounds = window.get("bounds") if isinstance(window.get("bounds"), dict) else {}
            rows.append({
                "window_id": window["window_id"],
                "title": window.get("title"),
                "application": str(window.get("application") or ""),
                "pid": window.get("pid"),
                "rect": {"x": bounds.get("X"), "y": bounds.get("Y"), "width": bounds.get("Width"), "height": bounds.get("Height")},
            })
        return rows

    def computer_list_windows(self, title_contains: str = "", max_results: int = 200) -> dict[str, Any]:
        windows_system = self.platform == "win32"
        try:
            windows = self._desktop().list_windows() if self.platform in ('win32', 'linux') else self._mac_windows()
        except OSError as exc:
            raise ValueError(f"Window list is unavailable: {exc}") from None
        needle = title_contains.lower().strip()
        limit = max(1, min(int(max_results), 500))
        rows = []
        for window in windows:
            if needle and needle not in f"{window['title'] or ''} {window['application']}".lower():
                continue
            rows.append(window)
            if len(rows) >= limit:
                break
        data: dict[str, Any] = {"windows": rows, "backend": "Win32 window list" if windows_system else "CoreGraphics window list"}
        if self.platform == 'linux':
            data['backend'] = 'X11 window list'
            data['note'] = 'Window capture reads the drawable; obscured areas depend on the X server. Wayland is unsupported.'
        if self.platform == 'darwin' and windows and all(w.get("title") is None for w in windows):
            # macOS hides window names from a process without Screen Recording permission.
            data["note"] = "Window titles are hidden: grant Screen Recording permission to Workflow Pilot."
        return data

    def _screenshot(self, options: list[str], max_dimension: int) -> bytes:
        path = self.state_root / f"screen-{uuid.uuid4().hex}.png"
        try:
            result = self._command(["/usr/sbin/screencapture", "-x", "-t", "png", *options, str(path)], write=True, timeout_ms=30_000)
            if not result["ok"]:
                raise ValueError(result["stderr"] or "Screen capture failed")
            if max_dimension > 0:
                self._command(["/usr/bin/sips", "-Z", str(max(100, min(int(max_dimension), 5000))), str(path)], write=True, timeout_ms=30_000)
            return self.client.fs_read_file(str(path))
        finally:
            try:
                path.unlink()
            except OSError:
                pass

    def computer_capture_screen(self, x: int | None = None, y: int | None = None, width: int | None = None, height: int | None = None, max_dimension: int = 1600, include_cursor: bool = True) -> Any:
        region = None not in (x, y, width, height)
        if self.platform in ("win32", "linux"):
            try:
                # As on macOS, a region is used only when all four values are given.
                png = self._desktop().capture_screen(*((x, y, width, height) if region else (None, None, None, None)),
                                                     int(max_dimension), bool(include_cursor))
            except OSError as exc:
                raise ValueError(f"Screen capture failed: {exc}") from None
            return [{"source": "desktop", "bytes": len(png)}, Image(data=png, format="png")]
        options = ["-C"] if include_cursor else []
        if region:
            options += ["-R", f"{int(x)},{int(y)},{int(width)},{int(height)}"]
        png = self._screenshot(options, max_dimension)
        return [{"source": "desktop", "bytes": len(png)}, Image(data=png, format="png")]

    def computer_capture_window(self, window_id: int, max_dimension: int = 1600) -> Any:
        if isinstance(window_id, bool) or not isinstance(window_id, int) or window_id <= 0:
            raise ValueError("window_id must be a positive integer from computer_list_windows")
        if self.platform in ("win32", "linux"):
            try:
                png = self._desktop().capture_window(window_id, int(max_dimension))
            except OSError as exc:
                raise ValueError(f"Screen capture failed: {exc}") from None
            return [{"source": "window", "window_id": window_id, "bytes": len(png)}, Image(data=png, format="png")]
        # -l captures that window even when another one covers it; -o leaves out the shadow.
        png = self._screenshot(["-o", "-l", str(window_id)], max_dimension)
        return [{"source": "window", "window_id": window_id, "bytes": len(png)}, Image(data=png, format="png")]


class TurnWatchdog:
    def __init__(self, facade: LocalFacade) -> None:
        self.facade = facade
        self._lock = threading.Lock()
        self._items: dict[str, threading.Timer] = {}

    @staticmethod
    def _notify_windows(title: str, message: str, popen=subprocess.Popen) -> bool:
        # The invocation of the pinned Windows package: a hidden PowerShell shows a balloon and exits by itself.
        if not WINDOWS_NOTIFY_SCRIPT.is_file():
            return False
        try:
            popen(
                ["powershell.exe", "-NoProfile", "-Sta", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
                 "-File", str(WINDOWS_NOTIFY_SCRIPT), "-Title", title[:80], "-Message", message[:240]],
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                close_fds=True,
            )
            return True
        except OSError:
            return False

    def _notify(self, title: str, message: str) -> bool:
        if self.facade.platform == "win32":
            return self._notify_windows(title, message)
        if self.facade.platform == 'linux':
            try:
                return bool(self.facade._command(['/usr/bin/notify-send', '--', title[:80], message[:240]], write=True, timeout_ms=5000)['ok'])
            except Exception:
                return False
        script = 'on run argv\n display notification (item 2 of argv) with title (item 1 of argv)\nend run'
        try:
            result = self.facade._command(["/usr/bin/osascript", "-e", script, title[:80], message[:240]], write=True, timeout_ms=5000)
            return bool(result["ok"])
        except Exception:
            return False

    def action(self, action: str, summary: str, token: str, timeout_seconds: int, notify_checkpoint: bool) -> dict[str, Any]:
        bounded = max(60, min(int(timeout_seconds), 600))
        if action == "start":
            new = uuid.uuid4().hex
            timer = threading.Timer(bounded, self._notify, args=("Codex executor: возможно, ответ прерван", summary))
            timer.daemon = True
            with self._lock:
                self._items[new] = timer
            timer.start()
            return {"status": "watching", "turn_token": new, "timeout_seconds": bounded}
        if not token:
            raise ValueError("turn_token is required")
        with self._lock:
            timer = self._items.pop(token, None)
        if timer is None:
            raise ValueError("Unknown or expired turn_token")
        timer.cancel()
        if action == "checkpoint":
            if notify_checkpoint:
                self._notify("Codex executor: работа продолжается", summary)
            new_timer = threading.Timer(bounded, self._notify, args=("Codex executor: возможно, ответ прерван", summary))
            new_timer.daemon = True
            with self._lock:
                self._items[token] = new_timer
            new_timer.start()
            return {"status": "watching", "turn_token": token, "timeout_seconds": bounded}
        if action == "complete":
            return {"status": "completed", "turn_token": token, "notification_requested": self._notify("Codex executor: ответ готов", summary)}
        raise ValueError("action must be start, checkpoint or complete")


def create_server(*, host: str, port: int, state_root: Path, codex_binary: str | None = None) -> FastMCP:
    client = AppServerClient(binary=codex_binary, cwd=str(Path.home()), request_timeout=30)
    facade = LocalFacade(client, state_root)
    watchdog = TurnWatchdog(facade)
    mcp = FastMCP(
        server_name(),
        instructions=(
            "Local-computer tools only. Use ChatGPT native web/cloud tools for public information. "
            "This MCP uses Codex App Server as an executor and never launches a Codex model turn. "
            "No UI control: this MCP cannot move the mouse, press keys or switch windows. Observation only: "
            "computer_list_windows, computer_capture_screen and computer_capture_window. "
            "Tool usage: search with rg through exec_command; edit text files with apply_patch and do not reread them "
            "after a successful patch. "
            + LONG_COMMAND_RULE + " "
            + PREEXECUTION_RETRY_RULE
        ),
        host=host,
        port=port,
        log_level="WARNING",
        # No MCP sessions: Web Pilot restarts this server on every launch, and remote
        # clients (ChatGPT/Claude via the VPS) keep their old Mcp-Session-Id. A stateful
        # server answers 404 "Session not found" and ChatGPT does not reconnect. The tools
        # keep no per-session state and send no in-session notifications.
        stateless_http=True,
    )
    facade.install_project_control(mcp, host, port)

    @mcp.tool(annotations=LOCAL_NOTIFICATION)
    def turn_watchdog(
        action: Annotated[Literal["start","checkpoint","complete"], Field(description="Watchdog action: start a timer, checkpoint and restart it, or complete the watched turn.")],
        summary: Annotated[str, Field(description="Short status text used in the desktop notification if the watchdog fires.")],
        turn_token: Annotated[str, Field(description="Token returned by start; required for checkpoint and complete.")] = "",
        timeout_seconds: Annotated[int, Field(description="Watchdog timeout in seconds; values are clamped to 60-600.")] = 150,
        notify_checkpoint: Annotated[bool, Field(description="When true, checkpoint also posts a 'work continues' notification.")] = False,
    ) -> dict[str, Any]:
        """Manage a local turn watchdog that can notify the user if a long response appears interrupted."""
        return watchdog.action(action, summary, turn_token, timeout_seconds, notify_checkpoint)

    @mcp.tool(annotations=READ_ONLY)
    def bridge_status(
        repository: Annotated[str, Field(description="Optional local repository path. When provided, include git status for that repository.")] = "",
    ) -> dict[str, Any]:
        """Report Codex App Server executor status, local filesystem scope, and pinned/installed Codex tool compatibility."""
        return facade.status(repository)

    @mcp.tool(annotations=READ_ONLY)
    def computer_list_windows(
        title_contains: Annotated[str, Field(description="Optional case-insensitive substring matched against window title and application name.")] = "",
        max_results: Annotated[int, Field(description="Maximum windows to return; values are clamped to 1-500.")] = 200,
    ) -> dict[str, Any]:
        """List visible on-screen windows (read-only): window_id, title, application, pid and rect. Pass window_id to computer_capture_window."""
        return facade.computer_list_windows(title_contains, max_results)

    @mcp.tool(annotations=READ_ONLY)
    def computer_capture_screen(
        x: Annotated[int | None, Field(description="Crop origin X in screen coordinates; used only when x, y, width and height are all provided.")] = None,
        y: Annotated[int | None, Field(description="Crop origin Y in screen coordinates; used only when x, y, width and height are all provided.")] = None,
        width: Annotated[int | None, Field(description="Crop width in screen points; used only when x, y, width and height are all provided.")] = None,
        height: Annotated[int | None, Field(description="Crop height in screen points; used only when x, y, width and height are all provided.")] = None,
        max_dimension: Annotated[int, Field(description="Resize the PNG so its longest side is at most this value; 0 disables resize, positive values are clamped to 100-5000.")] = 1600,
        include_cursor: Annotated[bool, Field(description="Include the mouse cursor in the desktop capture.")] = True,
    ) -> Any:
        """Capture the desktop or a rectangular screen region as PNG. Result contains a text block with JSON metadata and an image/png block. In ChatGPT tool-call scripts the blocks are in content_items; pass the image block to image()."""
        return facade.computer_capture_screen(x,y,width,height,max_dimension,include_cursor)

    @mcp.tool(annotations=READ_ONLY)
    def computer_capture_window(
        window_id: Annotated[int, Field(description="Positive window_id returned by computer_list_windows.")],
        max_dimension: Annotated[int, Field(description="Resize the PNG so its longest side is at most this value; 0 disables resize, positive values are clamped to 100-5000.")] = 1600,
        include_cursor: Annotated[bool, Field(description="Compatibility parameter; ignored for window captures.")] = True,
    ) -> Any:
        """Capture one window from computer_list_windows as a PNG, even when another window covers it. include_cursor is ignored for windows. Result contains a text block with JSON metadata and an image/png block. In ChatGPT tool-call scripts the blocks are in content_items; pass the image block to image()."""
        return facade.computer_capture_window(window_id, max_dimension)


    @mcp.tool(annotations=ARBITRARY_COMMAND)
    async def apply_patch(
        patch: Annotated[str, Field(description="Codex patch text: *** Begin Patch, then Add/Delete/Update File operations, optional *** Move to, then *** End Patch.")],
        workdir: Annotated[str, Field(description="Working directory in which to apply the patch. Required because this MCP has no turn cwd.")],
    ) -> str:
        """Use the Codex apply_patch format to edit files. This MCP carries the freeform Codex patch inside the patch string parameter."""
        return await asyncio.to_thread(facade.apply_patch,patch,workdir)

    @mcp.tool(annotations=READ_ONLY)
    def view_image(
        path: Annotated[str, Field(description="Local filesystem path to an image file.")],
    ) -> Any:
        """View a local image file from the filesystem when visual inspection is needed. Use this for images already available on disk. This MCP resizes to at most 1600 points on the longest side. Result contains a text block with JSON metadata and an image/png block. In ChatGPT tool-call scripts the blocks are in content_items; pass the image block to image()."""
        return facade.view_image(path)


    @mcp.tool(annotations=ARBITRARY_COMMAND)
    async def exec_command(
        cmd: Annotated[str, Field(description="Shell command to execute.")],
        workdir: Annotated[str, Field(description="Working directory for the command. Required because this MCP has no turn cwd.")],
        shell: Annotated[str, Field(description="Shell binary to launch. Defaults to the user's default shell.")] = "",
        login: Annotated[bool, Field(description="True runs the shell with -l/-i semantics; false disables them. Defaults to true.", strict=True)] = True,
        tty: Annotated[bool, Field(description="True allocates a PTY and keeps stdin open for write_stdin; false or omitted uses plain pipes with stdin closed. A single Ctrl-C write can still terminate a running non-TTY session.", strict=True)] = False,
        yield_time_ms: Annotated[int, Field(description="Wait before yielding output. Defaults to 10000 ms; values are clamped to the effective 250-30000 ms range.", strict=True)] = 10_000,
        max_output_tokens: Annotated[int, Field(description="Output token budget. Defaults to 8000 tokens; values are clamped to the MCP policy range of 1-8000.", strict=True)] = 8_000,
        read_only: Annotated[bool, Field(description="Run with verified read-only filesystem isolation and network access. Use for a preview server after preparation; never falls back to writable execution.", strict=True)] = False,
    ) -> str:
        """Runs a shell command, returning output or a session ID for ongoing interaction.

        Do not background commands with & or nohup: they end when the command returns. Run a long command with exec_command and poll its session ID with write_stdin, empty chars; never rerun it.

        If OpenAI blocked the call before execution, retry the same call once unchanged; change or split it only if the retry is blocked too. Output is capped at 8000 estimated tokens so ChatGPT does not truncate it a second time.
        """
        return await asyncio.to_thread(facade.exec_command,cmd,workdir,shell,login,tty,yield_time_ms,max_output_tokens,read_only)

    @mcp.tool(annotations=ARBITRARY_COMMAND)
    async def write_stdin(
        session_id: Annotated[str, Field(description="Identifier of the running exec_command session.")],
        chars: Annotated[str, Field(description="Characters to write to stdin. Empty polls without writing. stdin is writable only for tty=true sessions; for tty=false, a single Ctrl-C interrupts the process and any other non-empty input is rejected.")] = "",
        yield_time_ms: Annotated[int, Field(description="Wait before yielding output. Defaults to 250 ms; non-empty writes clamp to 250-30000 ms, while empty polls clamp to 5000-60000 ms in this MCP.", strict=True)] = 250,
        max_output_tokens: Annotated[int, Field(description="Output token budget. Defaults to 8000 tokens; values are clamped to the MCP policy range of 1-8000.", strict=True)] = 8_000,
    ) -> str:
        """Writes characters to an existing exec_command session and returns recent output. If OpenAI blocked the call before execution, retry the same call once unchanged; change or split it only if the retry is blocked too."""
        return await asyncio.to_thread(facade.write_stdin,session_id,chars,yield_time_ms,max_output_tokens)


    from plugin import register_plugin
    register_plugin(mcp, state_root)
    return mcp


def parse_args() -> argparse.Namespace:
    parser=argparse.ArgumentParser()
    parser.add_argument("--host",default="127.0.0.1",choices=["127.0.0.1"])
    parser.add_argument("--port",type=int,default=int(os.environ.get("WORKFLOW_PILOT_CODEX_EXECUTOR_PORT","18852")))
    parser.add_argument("--state-dir",default=os.environ.get("WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR",str(default_state_dir())))
    parser.add_argument("--codex-bin",default=os.environ.get("CODEX_APP_SERVER_BIN"))
    parser.add_argument("--transport",choices=["streamable-http","stdio"],default="streamable-http")
    return parser.parse_args()


def main() -> None:
    args=parse_args()
    state=Path(args.state_dir).expanduser()
    state.mkdir(parents=True,exist_ok=True,mode=0o700)
    server=create_server(host=args.host,port=args.port,state_root=state,codex_binary=args.codex_bin)
    server.run(transport=args.transport)


if __name__=="__main__":
    main()
