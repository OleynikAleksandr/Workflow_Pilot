#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextlib
import csv
import getpass
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from urllib.parse import urlparse
import zipfile

try:
    import fcntl
except ImportError:  # Windows: the lifecycle lock uses msvcrt instead
    fcntl = None

IS_WINDOWS = sys.platform == "win32"
ROOT = Path(__file__).resolve().parent


def _local_app_data() -> Path:
    return Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")


STATE = Path(os.environ.get("WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR") or (
    _local_app_data() / "WorkflowPilotCodexExecutor" if IS_WINDOWS
    else Path.home() / "Library/Application Support/WorkflowPilotCodexExecutor"))
PRIVATE = STATE / "private"
RUNTIME = STATE / "runtime"
VENV = RUNTIME / "venv"
PYTHON = VENV / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")
# Windows only: Workflow Pilot unpacks uv, tunnel-client, ripgrep and MinGit from its pinned
# archive into TOOLS_DIR and records their executables in TOOLS_FILE.
TOOLS_DIR = RUNTIME / "tools"
TOOLS_FILE = RUNTIME / "tools.json"
# macOS keeps its own copy of tunnel-client. Windows runs it where the package unpacked it: the
# official Windows archive ships cloudflared.exe next to tunnel-client.exe.
TUNNEL_CLIENT = TOOLS_DIR / "tunnel-client" / "tunnel-client.exe" if IS_WINDOWS else RUNTIME / "tunnel-client"
# Windows only: written when setup has installed the pinned packages. On macOS the copied tunnel-client,
# the last step of setup, plays this role; on Windows tunnel-client is there before setup ever runs.
SETUP_FILE = RUNTIME / "setup.json"
PROFILE_DIR = PRIVATE / "tunnel-profile"
PROFILE_NAME = "codex-executor"
PROFILE = PROFILE_DIR / f"{PROFILE_NAME}.yaml"
# Windows keeps the key encrypted for the current user (DPAPI); macOS keeps a 0600 file.
KEY_FILE = PRIVATE / ("tunnel-key.dpapi" if IS_WINDOWS else "tunnel-key")
SELECTOR_FILE = PRIVATE / "selector.json"
MCP_SERVER_NAME = "Workflow Pilot Local Windows" if IS_WINDOWS else "Workflow Pilot Local Mac"
# Preferred loopback ports. When another program holds one, a free port is chosen and kept in
# PORTS_FILE, so the selector, the tunnel profile and the VPS forward follow the actual address.
PREFERRED_MCP_PORT = int(os.environ.get("WORKFLOW_PILOT_CODEX_EXECUTOR_PORT", "18852"))
PREFERRED_TUNNEL_PORT = int(os.environ.get("WORKFLOW_PILOT_CODEX_EXECUTOR_TUNNEL_PORT", "18853"))
PORTS_FILE = STATE / "ports.json"
PORT_SEARCH_SPAN = 48
TUNNEL_KEY_ENV = "WORKFLOW_PILOT_CODEX_EXECUTOR_TUNNEL_API_KEY"
# How ChatGPT reaches the selected MCP: OpenAI Secure MCP Tunnel (tunnel-client)
# or the user's own server, whose SSH tunnel Workflow Pilot maintains itself.
CHATGPT_CHANNELS = ("secure-tunnel", "vps")
DEFAULT_CHATGPT_CHANNEL = "secure-tunnel"
# State of the retired local runtime (macOS before 0.6.91, Windows before 0.6.96): read once to
# carry its tunnel over, never written.
LEGACY_LOCAL_STATE = Path(os.environ.get("WORKFLOW_PILOT_LEGACY_LOCAL_STATE_DIR") or (
    _local_app_data() / "CodexLocalWindows" if IS_WINDOWS
    else Path.home() / "Library/Application Support/CodexLocalMac"))
LEGACY_PROFILE_NAME = "windows-local.yaml" if IS_WINDOWS else "mac-local.yaml"
# Windows start at login: a per-user Run value, no administrator rights.
AUTOSTART_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
AUTOSTART_VALUE = "WorkflowPilotCodexExecutor"
AUTOSTART_LAUNCHER = PRIVATE / "autostart.pyw"
AUTOSTART_LOG = STATE / "autostart.log"
# Windows only: the SSH forward from the user's own server (the VPS channel). macOS keeps the same forward
# with a LaunchAgent that Workflow Pilot installs; here a small supervisor process plays that role.
VPS_SSH_HOST = "workflow-pilot-vps"
VPS_REMOTE_PORT = 18842
TUNNEL_CLIENT_VERSION = 'v0.0.14'
VPS_RESTART_SECONDS = 15
VPS_FILE = STATE / "vps.json"
VPS_LOG = STATE / "vps-tunnel.log"


class CodexNotFound(RuntimeError):
    code = "CODEX_NOT_FOUND"


def json_out(value: object) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def _hidden() -> dict[str, int]:
    """Windows: a console child of a windowless parent would open its own console window."""
    return {"creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)} if IS_WINDOWS else {}


def private_write(path: Path, content: str | bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.parent.chmod(0o700)
    temp = path.with_name(path.name + "." + secrets.token_hex(8) + ".tmp")
    try:
        # Bytes as given on both systems: no newline translation on Windows.
        fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0), 0o600)
        with os.fdopen(fd, "wb") as handle:
            handle.write(content.encode("utf-8") if isinstance(content, str) else content)
        os.replace(temp, path)
        path.chmod(0o600)
    finally:
        temp.unlink(missing_ok=True)


def secure_private_directory(run=subprocess.run) -> None:
    """Windows: only the current user and the system may read the private folder."""
    PRIVATE.mkdir(parents=True, exist_ok=True)
    result = run(["whoami.exe", "/user", "/fo", "csv", "/nh"], capture_output=True, text=True,
                 errors="replace", check=True, timeout=10, **_hidden())
    rows = list(csv.reader(result.stdout.strip().splitlines()))
    sid = rows[-1][-1].strip() if rows else ""
    if not re.fullmatch(r"S-1-[0-9-]+", sid):
        raise RuntimeError("Cannot determine the current Windows user SID")
    run(["icacls.exe", str(PRIVATE), "/inheritance:r", "/grant:r", f"*{sid}:(OI)(CI)F", "*S-1-5-18:(OI)(CI)F"],
        capture_output=True, check=True, timeout=15, **_hidden())


def dpapi(data: bytes, *, decrypt: bool = False) -> bytes:
    """Windows DPAPI for the current user, without any interface; the plain key never reaches a file."""
    import ctypes
    from ctypes import wintypes

    class Blob(ctypes.Structure):
        _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]

    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    blob_ptr = ctypes.POINTER(Blob)
    crypt32.CryptProtectData.argtypes = [blob_ptr, wintypes.LPCWSTR, blob_ptr, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, blob_ptr]
    crypt32.CryptProtectData.restype = wintypes.BOOL
    crypt32.CryptUnprotectData.argtypes = [blob_ptr, ctypes.c_void_p, blob_ptr, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, blob_ptr]
    crypt32.CryptUnprotectData.restype = wintypes.BOOL
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p
    buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    source = Blob(len(data), buffer)
    output = Blob()
    function = crypt32.CryptUnprotectData if decrypt else crypt32.CryptProtectData
    description = None if decrypt else "Workflow Pilot tunnel key"
    # 1 = CRYPTPROTECT_UI_FORBIDDEN
    if not function(ctypes.byref(source), description, None, None, None, 1, ctypes.byref(output)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        if output.pbData:
            ctypes.memset(output.pbData, 0, output.cbData)
            kernel32.LocalFree(output.pbData)
        ctypes.memset(buffer, 0, len(data))


def store_tunnel_key(key: str) -> None:
    if IS_WINDOWS:
        secure_private_directory()
        private_write(KEY_FILE, dpapi(key.encode("utf-8")))
    else:
        private_write(KEY_FILE, key + "\n")


def read_tunnel_key(path: Path | None = None) -> str:
    source = path or KEY_FILE
    if IS_WINDOWS:
        return dpapi(source.read_bytes(), decrypt=True).decode("utf-8").strip()
    return source.read_text(encoding="utf-8").strip()


@contextlib.contextmanager
def _windows_operation_lock():
    import msvcrt
    with (STATE / "control.lock").open("a+b") as handle:
        handle.seek(0, os.SEEK_END)
        if handle.tell() == 0:
            handle.write(b"\0")
            handle.flush()
        handle.seek(0)
        try:
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            raise RuntimeError("Another Codex executor lifecycle operation is still running") from None
        try:
            yield
        finally:
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)


@contextlib.contextmanager
def operation_lock():
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    STATE.chmod(0o700)
    if fcntl is None:
        with _windows_operation_lock():
            yield
        return
    with (STATE / "control.lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Another Codex executor lifecycle operation is still running") from None
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def tool_locations() -> dict[str, Path]:
    """Windows components prepared by Workflow Pilot; every executable must lie inside the runtime tools folder."""
    try:
        recorded = json.loads(TOOLS_FILE.read_text(encoding="utf-8-sig"))["tools"]
        base = TOOLS_DIR.resolve()
        result = {}
        for name in ("uv", "tunnel_client", "rg", "git"):
            target = Path(recorded[name]).resolve()
            if base not in target.parents or not target.is_file():
                raise ValueError(name)
            result[name] = target
        return result
    except (OSError, ValueError, KeyError, TypeError):
        raise RuntimeError("Windows components are not prepared; let Workflow Pilot prepare them again") from None


def environment() -> dict[str, str]:
    env = os.environ.copy()
    env["WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR"] = str(STATE)
    env["WORKFLOW_PILOT_CODEX_EXECUTOR_PORT"] = str(mcp_port())
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    if IS_WINDOWS:
        env["PYTHONUTF8"] = "1"
        prefixes = [str(PYTHON.parent)]
        try:
            tools = tool_locations()
            # MinGit and ripgrep of the package come first: the same Git that Workflow Kit uses.
            prefixes += [str(tools[name].parent) for name in ("git", "rg", "uv")]
        except RuntimeError:
            pass  # status is asked before the components are prepared
        if env.get("APPDATA"):
            # Global npm installs (the Codex CLI) live here; a login item may start without it in PATH.
            prefixes.append(str(Path(env["APPDATA"]) / "npm"))
        env["PATH"] = os.pathsep.join([*prefixes, env.get("PATH", "")])
        # Loopback probes must not go through a system proxy.
        env["NO_PROXY"] = ",".join(filter(None, [env.get("NO_PROXY", ""), "127.0.0.1", "localhost"]))
        return env
    env["PATH"] = os.pathsep.join([
        str(VENV / "bin"),
        str(Path.home() / ".npm-global/bin"),
        "/opt/homebrew/bin", "/usr/local/bin",
        env.get("PATH", ""),
        "/usr/bin", "/bin", "/usr/sbin", "/sbin",
    ])
    return env


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "WorkflowPilotCodexExecutor/0.1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def install_tunnel_client() -> str:
    RUNTIME.mkdir(parents=True, exist_ok=True, mode=0o700)
    if IS_WINDOWS:
        # The pinned archive of the package is the only source on Windows: nothing is copied or downloaded.
        client = tool_locations()["tunnel_client"]
        if client != TUNNEL_CLIENT.resolve():
            raise RuntimeError("tunnel-client is not where the Windows components keep it; let Workflow Pilot prepare them again")
        return subprocess.check_output([str(client), "--version"], text=True, timeout=10, **_hidden()).strip()
    if TUNNEL_CLIENT.is_file():
        result = subprocess.run([str(TUNNEL_CLIENT), "--version"], capture_output=True, text=True, timeout=10, **_hidden())
        if result.returncode == 0:
            return result.stdout.strip()

    # Never copy a running application's runtime or resolve a moving latest release.
    release = json.loads(download(f"https://api.github.com/repos/openai/tunnel-client/releases/tags/{TUNNEL_CLIENT_VERSION}"))
    if release.get('tag_name') != TUNNEL_CLIENT_VERSION:
        raise RuntimeError('Unexpected tunnel-client release')
    arch = {"arm64": "arm64", "x86_64": "amd64"}.get(platform.machine())
    if arch is None:
        raise RuntimeError("Unsupported macOS architecture")
    name = f"tunnel-client-{release['tag_name']}-darwin-{arch}.zip"
    assets = {item["name"]: item["browser_download_url"] for item in release["assets"]}
    for key in (name, "SHA256SUMS.txt"):
        if key not in assets or not assets[key].startswith("https://github.com/openai/tunnel-client/releases/download/"):
            raise RuntimeError("Official tunnel-client artifact was not found")
    archive = download(assets[name])
    expected = next(
        (line.split()[0].lower() for line in download(assets["SHA256SUMS.txt"]).decode().splitlines()
         if line.split()[-1].lstrip("*") == name),
        None,
    )
    digest = hashlib.sha256(archive).hexdigest()
    if expected is None or digest != expected:
        raise RuntimeError("tunnel-client archive SHA-256 mismatch")
    with zipfile.ZipFile(io.BytesIO(archive)) as package:
        member = next((entry for entry in package.namelist() if Path(entry).name == "tunnel-client"), None)
        if member is None:
            raise RuntimeError("tunnel-client executable missing from official archive")
        TUNNEL_CLIENT.write_bytes(package.read(member))
        TUNNEL_CLIENT.chmod(0o755)
    return subprocess.check_output([str(TUNNEL_CLIENT), "--version"], text=True, timeout=10).strip()


def require_codex() -> dict[str, str]:
    """The MCP server cannot start without Codex: say so before installing or launching anything."""
    from app_server_client import AppServerError, discover_codex_binary
    saved = os.environ.get("PATH")
    os.environ["PATH"] = environment()["PATH"]
    try:
        binary = discover_codex_binary()
    except AppServerError:
        raise CodexNotFound("Codex is not installed: install the Codex CLI or the ChatGPT app and check again") from None
    finally:
        if saved is None:
            os.environ.pop("PATH", None)
        else:
            os.environ["PATH"] = saved
    return {"path": binary.path, "version": binary.version}


def find_uv() -> str | None:
    # The packaged app brings its own uv: a clean Mac has only Python 3.9, too old for the mcp package.
    explicit = os.environ.get("WORKFLOW_PILOT_UV")
    if explicit and os.access(explicit, os.X_OK):
        return explicit
    if IS_WINDOWS:
        with contextlib.suppress(RuntimeError):
            return str(tool_locations()["uv"])
    return shutil.which("uv", path=environment()["PATH"])


def _setup_windows_python(uv: str | None) -> None:
    """The private Python 3.13 and the pinned packages, both through the uv of the package."""
    if not uv:
        raise RuntimeError("uv is missing from the prepared Windows components; let Workflow Pilot prepare them again")
    secure_private_directory()
    env = {**os.environ, "UV_PYTHON_INSTALL_DIR": str(RUNTIME / "python"), "UV_CACHE_DIR": str(RUNTIME / "uv-cache")}
    if not PYTHON.is_file():
        # --clear replaces what an interrupted attempt left behind.
        subprocess.run([uv, "venv", "--clear", "--managed-python", "--python", "3.13", "--no-config", str(VENV)],
                       check=True, stdout=sys.stderr, env=env, **_hidden())
    subprocess.run([uv, "pip", "install", "--no-config", "--python", str(PYTHON), "-r", str(ROOT / "requirements.txt")],
                   check=True, stdout=sys.stderr, env=env, **_hidden())


def _requirements_digest() -> str:
    return hashlib.sha256((ROOT / "requirements.txt").read_bytes()).hexdigest()


def setup_complete() -> bool:
    """False until setup has finished for the packages this version pins."""
    if not PYTHON.is_file() or not TUNNEL_CLIENT.is_file():
        return False
    if not IS_WINDOWS:
        return True
    try:
        return json.loads(SETUP_FILE.read_text(encoding="utf-8")).get("requirements_sha256") == _requirements_digest()
    except (OSError, json.JSONDecodeError, AttributeError):
        return False


def setup() -> dict[str, object]:
    if sys.platform not in ("darwin", "win32"):
        raise RuntimeError("This runtime supports macOS and Windows only")
    codex = require_codex()
    RUNTIME.mkdir(parents=True, exist_ok=True, mode=0o700)
    uv = find_uv()
    if IS_WINDOWS:
        _setup_windows_python(uv)
    else:
        if not PYTHON.is_file():
            # Installer chatter goes to stderr: stdout carries only the JSON result of this command.
            if uv:
                subprocess.run([uv, "venv", "--python", "3.13", str(VENV)], check=True, stdout=sys.stderr)
            else:
                subprocess.run([sys.executable, "-m", "venv", str(VENV)], check=True, stdout=sys.stderr)
        installer = [uv, "pip", "install", "--python", str(PYTHON)] if uv else [str(PYTHON), "-m", "pip", "install"]
        subprocess.run([*installer, "-r", str(ROOT / "requirements.txt")], check=True, stdout=sys.stderr)
    version = install_tunnel_client()
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    if IS_WINDOWS:
        private_write(SETUP_FILE, json.dumps({"requirements_sha256": _requirements_digest()}, indent=2) + "\n")
    return {
        "installed": True,
        "python": str(PYTHON),
        "tunnel_client": str(TUNNEL_CLIENT),
        "tunnel_client_version": version,
        "mcp_url": own_mcp_url(),
        "tunnel_health_url": f"http://127.0.0.1:{tunnel_port()}/readyz",
        "state_directory": str(STATE),
        "codex": codex,
    }


def configure_tunnel(tunnel_id: str, key: str) -> dict[str, object]:
    if not re.fullmatch(r"tunnel_[A-Za-z0-9_-]{16,100}", tunnel_id):
        raise ValueError("A valid OpenAI tunnel_id is required")
    if len(key) < 16 or any(character.isspace() for character in key):
        raise ValueError("Tunnel runtime key is invalid")
    # A revoked key or a deleted tunnel leaves tunnel-client running without being ready:
    # entering the tunnel again in the wizard replaces it, so the old process is stopped first.
    tunnel = managed_process("tunnel")
    if tunnel["running"] and not tunnel["owned"]:
        raise RuntimeError("Recorded tunnel PID belongs to another process")
    if tunnel["owned"]:
        stop_one("tunnel")
    profile = {
        "config_version": 1,
        "control_plane": {
            "base_url": "https://api.openai.com",
            "tunnel_id": tunnel_id,
            "api_key": f"env:{TUNNEL_KEY_ENV}",
        },
        "health": {"listen_addr": f"127.0.0.1:{tunnel_port()}"},
        "admin_ui": {"open_browser": False},
        "log": {"level": "info", "format": "json"},
        "mcp": {
            "server_urls": [
                {"channel": "main", "url": own_mcp_url()}
            ]
        },
    }
    store_tunnel_key(key)
    private_write(PROFILE, json.dumps(profile, ensure_ascii=False, indent=2) + "\n")
    return {
        "configured": True,
        "tunnel_id": tunnel_id,
        "profile": str(PROFILE),
        "key_stored": True,
    }


def normalize_mcp_url(value: str) -> str:
    try:
        parsed = urlparse(value)
        port = parsed.port
    except (TypeError, ValueError):
        raise ValueError("A valid loopback MCP URL is required") from None
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or port is None
        or not 1024 <= port <= 65535
        or parsed.path != "/mcp"
        or parsed.params
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise ValueError("A valid loopback MCP URL is required")
    return f"http://127.0.0.1:{port}/mcp"


def tunnel_target() -> str | None:
    if not PROFILE.is_file():
        return None
    try:
        profile = json.loads(PROFILE.read_text(encoding="utf-8"))
        urls = profile.get("mcp", {}).get("server_urls", [])
        if len(urls) != 1 or urls[0].get("channel") != "main":
            return None
        return normalize_mcp_url(urls[0].get("url"))
    except (OSError, json.JSONDecodeError, ValueError, TypeError):
        return None


def set_tunnel_target(mcp_url: str) -> str:
    target = normalize_mcp_url(mcp_url)
    if not PROFILE.is_file() or not KEY_FILE.is_file():
        raise RuntimeError("Configure the stable Secure MCP Tunnel before selecting a backend")
    current = tunnel_target()
    tunnel = managed_process("tunnel")
    if tunnel["running"] and not tunnel["owned"]:
        raise RuntimeError("Recorded tunnel PID belongs to another process")
    if tunnel["owned"] and current != target:
        stop_one("tunnel")
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    profile.setdefault("mcp", {})["server_urls"] = [{"channel": "main", "url": target}]
    private_write(PROFILE, json.dumps(profile, ensure_ascii=False, indent=2) + "\n")
    return target


def _saved_ports() -> dict[str, int]:
    try:
        data = json.loads(PORTS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {name: port for name, port in data.items()
            if name in ("mcp", "tunnel") and isinstance(port, int) and 1024 <= port <= 65535}


def mcp_port() -> int:
    return _saved_ports().get("mcp", PREFERRED_MCP_PORT)


def tunnel_port() -> int:
    return _saved_ports().get("tunnel", PREFERRED_TUNNEL_PORT)


def _save_port(name: str, port: int) -> None:
    ports = _saved_ports()
    ports[name] = port
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    private_write(PORTS_FILE, json.dumps(ports, indent=2, sort_keys=True) + "\n")


def _bindable(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        try:
            probe.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def _choose_port(name: str, preferred: int, avoid: int) -> int:
    """A port held by another program is never stopped: the service moves to a free one instead."""
    for candidate in [preferred, *range(preferred + 2, preferred + 2 + PORT_SEARCH_SPAN)]:
        if candidate != avoid and 1024 <= candidate <= 65535 and not port_open(candidate) and _bindable(candidate):
            _save_port(name, candidate)
            return candidate
    raise RuntimeError(f"No free local port for {name} near {preferred}")


def own_mcp_url() -> str:
    return f"http://127.0.0.1:{mcp_port()}/mcp"


def write_selector(mcp_url: str, channel: str) -> None:
    # Same shape as before 0.6.91 without the "local" block, so an older Web Pilot still reads it.
    selector = {"schema_version": 1, "mode": "app-server", "mcp_url": mcp_url, "chatgpt_channel": channel}
    private_write(SELECTOR_FILE, json.dumps(selector, ensure_ascii=False, indent=2) + "\n")


def adopt_legacy_tunnel() -> bool:
    """Compatibility response only: no donor files, profiles or keys are read."""
    return False


def configure_selector() -> dict[str, object]:
    channel = current_chatgpt_channel()
    # Workflow Pilot owns a fresh tunnel. Never read or adopt donor credentials.
    adopted_tunnel = False
    target = own_mcp_url()
    # Without a tunnel (first run, or the VPS channel alone) there is no profile to retarget yet.
    if PROFILE.is_file() and KEY_FILE.is_file():
        target = set_tunnel_target(target)
    write_selector(target, channel)
    return {"configured": True, "mode": "app-server", "mcp_url": target, "chatgpt_channel": channel,
            "adopted_tunnel": adopted_tunnel}


def current_chatgpt_channel() -> str:
    try:
        return load_selector()["chatgpt_channel"]
    except RuntimeError:
        return DEFAULT_CHATGPT_CHANNEL


def configure_channel(channel: str) -> dict[str, object]:
    if channel not in CHATGPT_CHANNELS:
        raise ValueError("ChatGPT channel must be secure-tunnel or vps")
    write_selector(load_selector()["mcp_url"], channel)
    return {"configured": True, "chatgpt_channel": channel}


def load_selector() -> dict[str, object]:
    if not SELECTOR_FILE.is_file():
        raise RuntimeError("MCP backend selector is not configured")
    try:
        selector = json.loads(SELECTOR_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise RuntimeError("MCP backend selector is damaged") from None
    if selector.get("schema_version") != 1 or selector.get("mode") not in {"local", "app-server"}:
        raise RuntimeError("MCP backend selector is invalid")
    # A selector written before 0.6.91 may name the retired local backend: it is read as the only one.
    selector["mode"] = "app-server"
    selector.pop("local", None)
    selector["mcp_url"] = normalize_mcp_url(selector.get("mcp_url"))
    selector.setdefault("chatgpt_channel", DEFAULT_CHATGPT_CHANNEL)
    if selector["chatgpt_channel"] not in CHATGPT_CHANNELS:
        raise RuntimeError("MCP backend selector has an invalid ChatGPT channel")
    return selector


def selector_public() -> dict[str, object] | None:
    try:
        selector = load_selector()
    except RuntimeError:
        return None
    return {"mode": selector["mode"], "mcp_url": selector["mcp_url"], "chatgpt_channel": selector["chatgpt_channel"]}


def pid_identity(pid: object) -> str | dict[str, object] | None:
    if not isinstance(pid, int) or pid <= 1:
        return None
    if IS_WINDOWS:
        import psutil
        try:
            process = psutil.Process(pid)
            return {"created": process.create_time(), "exe": process.exe(), "cmdline": process.cmdline()}
        except (psutil.NoSuchProcess, psutil.ZombieProcess):
            return None
        except psutil.AccessDenied:
            # Running, but not ours to inspect: it never equals a recorded identity.
            return {"access_denied": True}
    # `ps -o lstart` is locale-sensitive on macOS.  Persisted process identity
    # must compare identically whether control.py is called from Finder, Codex,
    # or a user's Terminal with another LANG/LC_* environment.
    stable_env = os.environ.copy()
    stable_env["LC_ALL"] = "C"
    stable_env["LANG"] = "C"
    result = subprocess.run(
        ["/bin/ps", "-p", str(pid), "-o", "lstart=", "-o", "command="],
        capture_output=True, text=True, timeout=3, env=stable_env,
    )
    return result.stdout.strip() if result.returncode == 0 and result.stdout.strip() else None


def managed_process(name: str) -> dict[str, object]:
    record = STATE / f"{name}.pid.json"
    if not record.is_file():
        return {"running": False, "owned": False, "pid": None}
    try:
        data = json.loads(record.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"running": False, "owned": False, "pid": None}
    actual = pid_identity(data.get("pid"))
    if actual is None or actual != data.get("identity"):
        # The process is gone, or its number now belongs to another program (after a reboot):
        # the record is stale. It is dropped without signalling anyone; callers hold operation_lock.
        record.unlink(missing_ok=True)
        return {"running": False, "owned": False, "pid": data.get("pid")}
    return {"running": True, "owned": True, "pid": data.get("pid")}


def launch(name: str, argv: list[str], env: dict[str, str]) -> int:
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    stdout_path = STATE / f"{name}.out.log"
    stderr_path = STATE / f"{name}.err.log"
    for path in (stdout_path, stderr_path):
        path.touch(mode=0o600, exist_ok=True)
        path.chmod(0o600)
    # Detached from the caller on both systems; on Windows also without a console window.
    detached = ({"creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
                 | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)}
                if IS_WINDOWS else {"start_new_session": True})
    # Windows cannot replace a folder that is the working directory of a running process, and the
    # source folder is replaced on every update: the services run from the state folder there.
    with stdout_path.open("ab") as stdout, stderr_path.open("ab") as stderr:
        process = subprocess.Popen(
            argv, cwd=str(STATE if IS_WINDOWS else ROOT), env=env, stdin=subprocess.DEVNULL,
            stdout=stdout, stderr=stderr, close_fds=True, **detached,
        )
    identity = pid_identity(process.pid)
    if identity is None or process.poll() is not None:
        raise RuntimeError(f"{name} exited during startup; see {stderr_path}")
    private_write(
        STATE / f"{name}.pid.json",
        json.dumps({"pid": process.pid, "identity": identity}, indent=2) + "\n",
    )
    return process.pid


def port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.3):
            return True
    except OSError:
        return False


def mcp_ready() -> bool:
    if not port_open(mcp_port()) or not PYTHON.is_file():
        return False
    probe = """import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
async def main():
    async with streamablehttp_client(%r) as (read, write, _):
        async with ClientSession(read, write) as session:
            result = await session.initialize()
            return result.serverInfo.name == %r
raise SystemExit(0 if asyncio.run(main()) else 3)
""" % (own_mcp_url(), MCP_SERVER_NAME)
    try:
        result = subprocess.run(
            [str(PYTHON), "-B", "-c", probe],
            env=environment(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
            **_hidden(),
        )
        return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def tunnel_ready() -> bool:
    # Windows reads the system proxy from the registry: the loopback probe must bypass it.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if IS_WINDOWS else urllib.request.build_opener()
    try:
        with opener.open(f"http://127.0.0.1:{tunnel_port()}/readyz", timeout=1) as response:
            return response.status == 200 and response.read().decode().strip().strip('"') == "ready"
    except Exception:
        return False


def status() -> dict[str, object]:
    mcp = managed_process("mcp")
    tunnel = managed_process("tunnel")
    mcp["ready"] = bool(mcp["owned"] and PYTHON.is_file() and mcp_ready())
    tunnel["ready"] = bool(tunnel["owned"] and tunnel_ready())
    tunnel["configured"] = PROFILE.is_file() and KEY_FILE.is_file()
    return {
        "mcp": mcp,
        "tunnel": tunnel,
        "mcp_url": own_mcp_url(),
        "tunnel_ui": f"http://127.0.0.1:{tunnel_port()}/ui",
        "tunnel_target": tunnel_target(),
        "selector": selector_public(),
        "state_directory": str(STATE),
        "runtime_python": str(PYTHON),
        "tunnel_client": str(TUNNEL_CLIENT),
        "setup_complete": setup_complete(),
        "production_runtime_touched": False,
    }


def start_tunnel() -> dict[str, object]:
    if not (PROFILE.is_file() and KEY_FILE.is_file()):
        raise RuntimeError("Configure the stable Secure MCP Tunnel first")
    if not TUNNEL_CLIENT.is_file():
        raise RuntimeError("tunnel-client is missing; run setup again")
    target = tunnel_target()
    if target is None:
        raise RuntimeError("Stable tunnel profile has no valid MCP target")
    env = environment()
    tunnel = managed_process("tunnel")
    if tunnel["running"] and not tunnel["owned"]:
        raise RuntimeError("Recorded tunnel PID belongs to another process")
    if not tunnel["owned"]:
        if port_open(tunnel_port()):
            port = _choose_port("tunnel", PREFERRED_TUNNEL_PORT, mcp_port())
            profile = json.loads(PROFILE.read_text(encoding="utf-8"))
            profile.setdefault("health", {})["listen_addr"] = f"127.0.0.1:{port}"
            private_write(PROFILE, json.dumps(profile, ensure_ascii=False, indent=2) + "\n")
        env[TUNNEL_KEY_ENV] = read_tunnel_key()
        launch(
            "tunnel",
            [str(TUNNEL_CLIENT), "run", "--profile", PROFILE_NAME, "--profile-dir", str(PROFILE_DIR)],
            env,
        )
    deadline = time.monotonic() + 45
    while not tunnel_ready():
        if time.monotonic() > deadline or not managed_process("tunnel")["owned"]:
            raise RuntimeError(f"Tunnel did not become ready; see {STATE / 'tunnel.err.log'}")
        time.sleep(0.5)
    return status()


def start(*, mcp_only: bool = False, tunnel_only: bool = False) -> dict[str, object]:
    if tunnel_only:
        return start_tunnel()
    if not PYTHON.is_file():
        raise RuntimeError("Run control.py setup first")
    env = environment()

    mcp = managed_process("mcp")
    if mcp["running"] and not mcp["owned"]:
        raise RuntimeError("Recorded MCP PID belongs to another process")
    if not mcp["owned"]:
        if port_open(mcp_port()):
            _choose_port("mcp", PREFERRED_MCP_PORT, tunnel_port())
            env = environment()
        require_codex()
        launch(
            "mcp",
            [
                str(PYTHON), "-B", str(ROOT / "server.py"),
                "--port", str(mcp_port()), "--state-dir", str(STATE),
            ],
            env,
        )
    deadline = time.monotonic() + 25
    while not mcp_ready():
        if time.monotonic() > deadline or not managed_process("mcp")["owned"]:
            raise RuntimeError(f"MCP did not become ready; see {STATE / 'mcp.err.log'}")
        time.sleep(0.25)
    # The MCP may have moved to another port: the selector and the tunnel follow its actual address.
    if SELECTOR_FILE.is_file():
        write_selector(own_mcp_url(), current_chatgpt_channel())
    if PROFILE.is_file() and KEY_FILE.is_file() and tunnel_target() != own_mcp_url():
        set_tunnel_target(own_mcp_url())

    if mcp_only or not (PROFILE.is_file() and KEY_FILE.is_file()) or current_chatgpt_channel() == "vps":
        result = status()
        result["next"] = (
            "Local MCP is ready; configure the stable OpenAI Secure MCP Tunnel."
            if not result["tunnel"]["configured"] and current_chatgpt_channel() != "vps"
            else "Local MCP started without tunnel."
        )
        return result

    set_tunnel_target(own_mcp_url())
    return start_tunnel()


def _stop_windows_tree(pid: int) -> None:
    """The venv python.exe is a launcher with the real interpreter as its child: stop the whole tree."""
    import psutil
    try:
        parent = psutil.Process(pid)
        targets = parent.children(recursive=True) + [parent]
    except psutil.NoSuchProcess:
        return
    for process in reversed(targets):
        with contextlib.suppress(psutil.NoSuchProcess):
            process.terminate()
    _, alive = psutil.wait_procs(targets, timeout=5)
    for process in alive:
        with contextlib.suppress(psutil.NoSuchProcess):
            process.kill()
    _, alive = psutil.wait_procs(alive, timeout=3)
    if alive:
        raise RuntimeError("Processes did not stop: " + ",".join(str(process.pid) for process in alive))


def stop_one(name: str) -> dict[str, object]:
    process = managed_process(name)
    if process["running"] and not process["owned"]:
        raise RuntimeError(f"Refusing to stop {name}: PID is not owned by this runtime")
    if process["owned"]:
        pid = int(process["pid"])
        record_path = STATE / f"{name}.pid.json"
        record = json.loads(record_path.read_text(encoding="utf-8"))
        if pid_identity(pid) != record["identity"]:
            raise RuntimeError(f"{name} process identity changed before stop")
        if IS_WINDOWS:
            _stop_windows_tree(pid)
        else:
            try:
                os.killpg(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            deadline = time.monotonic() + 5
            while pid_identity(pid) == record["identity"] and time.monotonic() < deadline:
                time.sleep(0.1)
            if pid_identity(pid) == record["identity"]:
                os.killpg(pid, signal.SIGKILL)
    (STATE / f"{name}.pid.json").unlink(missing_ok=True)
    return {"service": name, "stopped": True}


def stop(*, tunnel_only: bool = False) -> dict[str, object]:
    if tunnel_only:
        return {"services": [stop_one("tunnel")]}
    return {"services": [stop_one("tunnel"), stop_one("mcp")]}


def selector_start() -> dict[str, object]:
    selector = load_selector()
    backend = start(mcp_only=True)
    target = normalize_mcp_url(str(backend.get("mcp_url") or ""))
    # Also drops what an older version stored: the "local" block and a foreign target.
    write_selector(target, selector["chatgpt_channel"])
    if selector["chatgpt_channel"] == "vps":
        # ChatGPT uses the user's server: tunnel-client must not run at login.
        tunnel = managed_process("tunnel")
        if tunnel["running"] and not tunnel["owned"]:
            raise RuntimeError("Recorded tunnel PID belongs to another process")
        if tunnel["owned"]:
            stop_one("tunnel")
        stable = status()
    elif PROFILE.is_file() and KEY_FILE.is_file():
        set_tunnel_target(target)
        stable = start_tunnel()
    else:
        # First run not finished: the MCP is up, the tunnel is entered in Web Pilot.
        stable = status()
    stable["selected_backend"] = {
        "mode": "app-server",
        "mcp_url": target,
        "mcp": backend.get("mcp"),
    }
    if IS_WINDOWS and _vps_record() is not None:
        # The forward of the user's server runs with either channel, as the LaunchAgent does on macOS.
        # Its failure must not undo the start of the MCP and of the tunnel.
        try:
            stable["vps"] = vps_apply(urlparse(target).port)["vps"]
        except Exception as error:
            stable["vps"] = {"error": str(error)[:200]}
    return stable


def vps_config() -> dict[str, object]:
    """Explicit product route, shared with desktop Execution. Server configuration is external."""
    file = Path(os.environ.get('WORKFLOW_PILOT_VPS_CONFIG') or Path.home() / '.config/workflow-pilot/vps/route.json')
    route = json.loads(file.read_text(encoding='utf-8'))
    host, port = route.get('ssh_host'), route.get('remote_port')
    if (route.get('schema_version') != 1 or route.get('product') != 'workflow-pilot'
            or not isinstance(host, str) or not re.fullmatch(r'workflow-pilot-vps(?:-[A-Za-z0-9_-]+)?', host)
            or not isinstance(port, int) or isinstance(port, bool) or not 1024 <= port <= 65535 or port == 17842):
        raise RuntimeError('VPS_ROUTE_INVALID: a separate Workflow Pilot alias and loopback port are required')
    return {'ssh_host': host, 'remote_port': port}


def vps_ssh_argv(port: int) -> list[str]:
    """Only the explicitly configured product loopback route leads to the local MCP."""
    route = vps_config()
    ssh = Path(os.environ.get("SystemRoot") or r"C:\Windows") / "System32" / "OpenSSH" / "ssh.exe"
    return [str(ssh), "-N", "-o", "BatchMode=yes", "-o", "ExitOnForwardFailure=yes",
            "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=3",
            "-R", f"127.0.0.1:{route['remote_port']}:127.0.0.1:{port}", route['ssh_host']]


def _vps_record() -> dict[str, object] | None:
    try:
        record = json.loads(VPS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    port = record.get("forward_port") if isinstance(record, dict) else None
    return record if isinstance(port, int) and not isinstance(port, bool) and 1024 <= port <= 65535 else None


def _vps_last_error() -> dict[str, str] | None:
    """The last line ssh wrote: why the forward is down, when it is."""
    try:
        stat = VPS_LOG.stat()
        if not stat.st_size:
            return None
        with VPS_LOG.open("rb") as handle:
            handle.seek(max(0, stat.st_size - 4096))
            lines = [line.strip() for line in handle.read().decode("utf-8", errors="replace").splitlines() if line.strip()]
    except OSError:
        return None
    if not lines:
        return None
    return {"message": lines[-1][:200], "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(stat.st_mtime))}


def _require_windows_vps() -> None:
    if not IS_WINDOWS:
        raise RuntimeError("The VPS tunnel is kept by a LaunchAgent of Workflow Pilot on this system")


def vps_status() -> dict[str, object]:
    _require_windows_vps()
    supervisor = managed_process("vps")
    ssh_pid = None
    if supervisor["owned"]:
        import psutil
        try:
            ssh_pid = next((child.pid for child in psutil.Process(int(supervisor["pid"])).children(recursive=True)
                            if child.name().lower() == "ssh.exe"), None)
        except psutil.Error:
            ssh_pid = None
    record = _vps_record()
    # "running" is ssh itself: with ExitOnForwardFailure a refused forward ends it within seconds.
    return {"vps": {"supervised": bool(supervisor["owned"]), "running": ssh_pid is not None, "pid": ssh_pid,
                    "owned": not supervisor['running'] or bool(supervisor['owned']),
                    "ssh_host": record.get('ssh_host') if record else None,
                    "remote_port": record.get('remote_port') if record else None,
                    "forward_port": record["forward_port"] if record else None, "last_error": _vps_last_error()}}


def vps_apply(port: int) -> dict[str, object]:
    """Keep the forward on this MCP port: start the supervisor, or restart it for another port or a newer control.py."""
    _require_windows_vps()
    if not isinstance(port, int) or isinstance(port, bool) or not 1024 <= port <= 65535:
        raise ValueError("A valid local MCP port is required")
    supervisor = managed_process("vps")
    if supervisor["running"] and not supervisor["owned"]:
        raise RuntimeError("Recorded VPS tunnel PID belongs to another process")
    wanted = {"forward_port": port, **vps_config(), "control_sha256": hashlib.sha256((ROOT / "control.py").read_bytes()).hexdigest()}
    if supervisor["owned"] and _vps_record() == wanted:
        return vps_status()
    if supervisor["owned"]:
        stop_one("vps")
    private_write(VPS_FILE, json.dumps(wanted, indent=2) + "\n")
    launch("vps", [str(PYTHON), "-B", str(ROOT / "control.py"), "vps-supervise"], environment())
    return vps_status()


def vps_stop() -> dict[str, object]:
    """The server is no longer configured: stop the forward and do not start it at sign-in."""
    _require_windows_vps()
    stopped = stop_one("vps")
    VPS_FILE.unlink(missing_ok=True)
    return {"services": [stopped], **vps_status()}


def vps_supervise(popen=subprocess.Popen, sleep=time.sleep, rounds: int | None = None) -> int:
    """Runs ssh and starts it again after it ends, at most once in 15 seconds — what KeepAlive and
    ThrottleInterval of the macOS LaunchAgent do. It ends only when control.py stops its process tree."""
    record = _vps_record()
    if record is None:
        return 2
    argv = vps_ssh_argv(int(record["forward_port"]))
    while rounds is None or rounds > 0:
        started = time.monotonic()
        try:
            if VPS_LOG.stat().st_size > 1_000_000:
                VPS_LOG.write_bytes(b"")
        except OSError:
            pass
        with VPS_LOG.open("ab") as log:
            try:
                popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=log, cwd=str(STATE), **_hidden()).wait()
            except OSError as error:
                log.write(f"ssh could not be started: {error}\n".encode("utf-8", errors="replace"))
        sleep(max(1.0, VPS_RESTART_SECONDS - (time.monotonic() - started)))
        if rounds is not None:
            rounds -= 1
    return 0


def autostart_command() -> str:
    return subprocess.list2cmdline([str(PYTHON.with_name("pythonw.exe")), "-B", str(AUTOSTART_LAUNCHER)])


def autostart_status() -> dict[str, object]:
    if not IS_WINDOWS:
        raise RuntimeError("Start at login is set up by Workflow Pilot itself on this system")
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_QUERY_VALUE) as key:
            value = winreg.QueryValueEx(key, AUTOSTART_VALUE)[0]
    except FileNotFoundError:
        value = None
    # "current" is false when the entry was written for another location of the runtime.
    return {"autostart": {"enabled": value is not None,
                          "current": value == autostart_command() and AUTOSTART_LAUNCHER.is_file()}}


def configure_autostart(enabled: bool) -> dict[str, object]:
    """Start the services when the user signs in to Windows: a per-user Run value, no administrator rights."""
    if not IS_WINDOWS:
        raise RuntimeError("Start at login is set up by Workflow Pilot itself on this system")
    import winreg
    if enabled:
        if not PYTHON.with_name("pythonw.exe").is_file():
            raise RuntimeError("Windows background Python is missing; run setup again")
        control = str(ROOT / "control.py")
        # No window and no console at login: the result goes to a log. No credentials appear here.
        launcher = (
            "import os, runpy, sys\n"
            f"os.environ['WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR'] = {str(STATE)!r}\n"
            "os.environ['PYTHONUTF8'] = '1'\n"
            "os.environ['PYTHONDONTWRITEBYTECODE'] = '1'\n"
            f"sys.stdout = sys.stderr = open({str(AUTOSTART_LOG)!r}, 'w', encoding='utf-8')\n"
            f"control = {control!r}\n"
            "sys.path.insert(0, os.path.dirname(control))\n"
            "sys.argv = [control, 'selector-start']\n"
            "runpy.run_path(control, run_name='__main__')\n"
        )
        private_write(AUTOSTART_LAUNCHER, launcher)
        with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, AUTOSTART_VALUE, 0, winreg.REG_SZ, autostart_command())
    else:
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE) as key:
                winreg.DeleteValue(key, AUTOSTART_VALUE)
        except FileNotFoundError:
            pass
        AUTOSTART_LAUNCHER.unlink(missing_ok=True)
    return autostart_status()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lifecycle for the Codex App Server MCP")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("setup")
    sub.add_parser("status")
    start_parser = sub.add_parser("start")
    start_group = start_parser.add_mutually_exclusive_group()
    start_group.add_argument("--mcp-only", action="store_true")
    start_group.add_argument("--tunnel-only", action="store_true")
    stop_parser = sub.add_parser("stop")
    stop_parser.add_argument("--tunnel-only", action="store_true")
    sub.add_parser("selector-start")
    channel = sub.add_parser("configure-channel")
    channel.add_argument("--channel", required=True, choices=list(CHATGPT_CHANNELS))
    sub.add_parser("configure-selector")
    autostart = sub.add_parser("autostart", help="Windows: start the services at sign-in")
    autostart.add_argument("--state", required=True, choices=["on", "off", "status"])
    vps = sub.add_parser("vps-apply", help="Windows: keep the SSH forward of the user's server on this MCP port")
    vps.add_argument("--port", required=True, type=int)
    sub.add_parser("vps-status")
    sub.add_parser("vps-stop")
    sub.add_parser("vps-supervise")
    configure = sub.add_parser("configure-tunnel")
    configure.add_argument("--tunnel-id")
    configure.add_argument(
        "--key-stdin", action="store_true",
        help="Read the runtime key from stdin instead of an interactive hidden prompt.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if IS_WINDOWS and hasattr(sys.stdout, "reconfigure"):
        # The JSON result may carry paths with non-ASCII user names.
        sys.stdout.reconfigure(encoding="utf-8")
    if args.command == "vps-supervise":
        # Long-running and outside the lifecycle lock: it is itself a service that control.py starts and stops.
        return vps_supervise() if IS_WINDOWS else 1
    try:
        with operation_lock():
            if args.command == "setup":
                result = setup()
            elif args.command == "status":
                result = status()
            elif args.command == "start":
                result = start(mcp_only=args.mcp_only, tunnel_only=args.tunnel_only)
            elif args.command == "stop":
                result = stop(tunnel_only=args.tunnel_only)
            elif args.command == "configure-channel":
                result = configure_channel(args.channel)
            elif args.command == "configure-selector":
                result = configure_selector()
            elif args.command == "selector-start":
                result = selector_start()
            elif args.command == "autostart":
                result = autostart_status() if args.state == "status" else configure_autostart(args.state == "on")
            elif args.command == "vps-apply":
                result = vps_apply(args.port)
            elif args.command == "vps-status":
                result = vps_status()
            elif args.command == "vps-stop":
                result = vps_stop()
            elif args.command == "configure-tunnel":
                tunnel_id = args.tunnel_id or input("OpenAI tunnel_id: ").strip()
                key = (
                    sys.stdin.readline().strip()
                    if args.key_stdin
                    else getpass.getpass("Tunnel runtime key (hidden): ").strip()
                )
                result = configure_tunnel(tunnel_id, key)
            else:
                raise RuntimeError("Unsupported command")
        json_out({"ok": True, **result})
        return 0
    except Exception as exc:
        code = getattr(exc, "code", None)
        json_out({"ok": False, "error": str(exc), **({"code": code} if isinstance(code, str) else {})})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
