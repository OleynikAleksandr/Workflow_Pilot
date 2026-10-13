#!/usr/bin/env python3
"""Lifecycle for Codex Local Windows. Run inside the installed local venv."""
from __future__ import annotations

import argparse
import asyncio
import contextlib
import csv
import ctypes
import getpass
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import time
import urllib.request

import psutil

ROOT = Path(os.environ.get('WORKFLOW_PILOT_RUNTIME_ROOT') or Path(__file__).resolve().parent).resolve()
PYTHON = ROOT / '.venv' / 'Scripts' / 'python.exe'
STATE = Path(os.environ.get('CODEX_LOCAL_WINDOWS_STATE_DIR') or Path(os.environ.get('LOCALAPPDATA') or Path.home()) / 'CodexLocalWindows')
PRIVATE = STATE / 'private'
CONFIG = PRIVATE / 'bridge_config.json'
PROFILE_DIR = PRIVATE / 'tunnel-profile'
PROFILE = PROFILE_DIR / 'windows-local.yaml'
KEY_FILE = PRIVATE / 'tunnel-key.dpapi'
LOCATIONS = ROOT / '.runtime' / 'locations.json'
RUNTIME_CONTRACT = 2
DEFAULT_MCP_PORT = 17842
DEFAULT_TUNNEL_PORT = 17843
ENDPOINTS = PRIVATE / 'runtime-endpoints.json'


def require_windows():
    if sys.platform != 'win32':
        raise RuntimeError('This launcher is for the target Windows PC. An uploaded ZIP or a cloud shell is not local Windows access.')


def write_private(path: Path, data: str | bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.' + secrets.token_hex(8) + '.tmp')
    try:
        with temporary.open('xb') as handle:
            handle.write(data.encode('utf-8') if isinstance(data, str) else data)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def secure_private_directory():
    require_windows()
    PRIVATE.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(['whoami.exe', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, errors='replace', check=True, timeout=10)
    rows = list(csv.reader(result.stdout.strip().splitlines()))
    sid = rows[-1][-1].strip() if rows else ''
    if not re.fullmatch(r'S-1-[0-9-]+', sid):
        raise RuntimeError('Cannot determine the current Windows user SID.')
    subprocess.run(['icacls.exe', str(PRIVATE), '/inheritance:r', '/grant:r', f'*{sid}:(OI)(CI)F', '*S-1-5-18:(OI)(CI)F'], capture_output=True, check=True, timeout=15)


def dpapi(data: bytes, *, decrypt: bool = False) -> bytes:
    """Use Windows DPAPI CurrentUser with UI forbidden; no plaintext file."""
    require_windows()
    from ctypes import wintypes

    class Blob(ctypes.Structure):
        _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_ubyte))]

    crypt32 = ctypes.WinDLL('crypt32', use_last_error=True)
    kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
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
    description = None if decrypt else 'Codex Local Windows tunnel key'
    if not function(ctypes.byref(source), description, None, None, None, 1, ctypes.byref(output)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        if output.pbData:
            ctypes.memset(output.pbData, 0, output.cbData)
            kernel32.LocalFree(output.pbData)
        ctypes.memset(buffer, 0, len(data))


@contextlib.contextmanager
def operation_lock():
    require_windows()
    import msvcrt
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / 'control.lock').open('a+b') as handle:
        handle.seek(0, os.SEEK_END)
        if handle.tell() == 0:
            handle.write(b'\0')
            handle.flush()
        handle.seek(0)
        try:
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            raise RuntimeError('Another install/start/stop operation is running.') from None
        try:
            yield
        finally:
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)


def tool_locations() -> dict[str, Path]:
    data = json.loads(LOCATIONS.read_text(encoding='utf-8-sig'))
    if os.path.normcase(data.get('package_root', '')) != os.path.normcase(str(ROOT)):
        raise RuntimeError('The package was moved after installation. Stop the old copy and run 1_INSTALL.cmd here.')
    result = {}
    for name in ('uv', 'git', 'rg', 'tunnel_client'):
        target = Path(data[name]).resolve()
        target.relative_to((ROOT / 'tools').resolve())
        if not target.is_file():
            raise RuntimeError(f'Missing {name}. Run 1_INSTALL.cmd.')
        result[name] = target
    return result




def _valid_port(value):
    return isinstance(value, int) and 1024 <= value <= 65535

def load_endpoints():
    data = {'mcp_port': DEFAULT_MCP_PORT, 'tunnel_port': DEFAULT_TUNNEL_PORT}
    if ENDPOINTS.is_file():
        try:
            parsed = json.loads(ENDPOINTS.read_text(encoding='utf-8'))
            if _valid_port(parsed.get('mcp_port')):
                data['mcp_port'] = parsed['mcp_port']
            if _valid_port(parsed.get('tunnel_port')):
                data['tunnel_port'] = parsed['tunnel_port']
        except Exception:
            pass
    if data['mcp_port'] == data['tunnel_port']:
        data['tunnel_port'] = DEFAULT_TUNNEL_PORT if DEFAULT_TUNNEL_PORT != data['mcp_port'] else data['mcp_port'] + 1
    return data

def port_available(port: int) -> bool:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('127.0.0.1', port))
        return True
    except OSError:
        return False
    finally:
        sock.close()

def choose_free_port(preferred: int, reserved=()):
    reserved = set(reserved)
    if preferred not in reserved and port_available(preferred):
        return preferred
    for _ in range(20):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('127.0.0.1', 0))
            candidate = sock.getsockname()[1]
        finally:
            sock.close()
        if candidate not in reserved and port_available(candidate):
            return candidate
    raise RuntimeError('Cannot allocate a free loopback port.')

def persist_endpoints(mcp_port: int, tunnel_port: int):
    if not (_valid_port(mcp_port) and _valid_port(tunnel_port)) or mcp_port == tunnel_port:
        raise ValueError('Invalid runtime endpoints')
    if CONFIG.is_file():
        config = json.loads(CONFIG.read_text(encoding='utf-8'))
        config['port'] = mcp_port
        write_private(CONFIG, json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    if PROFILE.is_file():
        profile = json.loads(PROFILE.read_text(encoding='utf-8'))
        profile.setdefault('health', {})['listen_addr'] = f'127.0.0.1:{tunnel_port}'
        profile.setdefault('mcp', {})['server_urls'] = [{'channel': 'main', 'url': f'http://127.0.0.1:{mcp_port}/mcp'}]
        write_private(PROFILE, json.dumps(profile, indent=2) + '\n')
    write_private(ENDPOINTS, json.dumps({'schema_version': 1, 'mcp_port': mcp_port, 'tunnel_port': tunnel_port}, indent=2) + '\n')
    return {'mcp_port': mcp_port, 'tunnel_port': tunnel_port}

def reconcile_endpoints():
    ports = load_endpoints()
    mcp = managed_process('mcp'); tunnel = managed_process('tunnel')
    mcp_port, tunnel_port = ports['mcp_port'], ports['tunnel_port']
    if not mcp['owned'] and not port_available(mcp_port):
        mcp_port = choose_free_port(DEFAULT_MCP_PORT, {tunnel_port})
    if not tunnel['owned'] and not port_available(tunnel_port):
        tunnel_port = choose_free_port(DEFAULT_TUNNEL_PORT, {mcp_port})
    if (mcp_port, tunnel_port) != (ports['mcp_port'], ports['tunnel_port']) or not ENDPOINTS.is_file():
        persist_endpoints(mcp_port, tunnel_port)
    return {'mcp_port': mcp_port, 'tunnel_port': tunnel_port}


def environment() -> dict[str, str]:
    env = os.environ.copy()
    env['CODEX_LOCAL_WINDOWS_STATE_DIR'] = str(STATE)
    env['PYTHONUTF8'] = '1'
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    locations = tool_locations()
    prefixes = [str(PYTHON.parent), *(str(locations[n].parent) for n in ('git', 'rg', 'uv'))]
    env['PATH'] = os.pathsep.join([*prefixes, env.get('PATH', '')])
    env['NO_PROXY'] = ','.join(filter(None, [env.get('NO_PROXY', ''), '127.0.0.1', 'localhost']))
    return env


def identity(pid: int) -> dict | None:
    if not isinstance(pid, int) or pid <= 0:
        return None
    try:
        process = psutil.Process(pid)
        return {'pid': pid, 'created': process.create_time(), 'exe': process.exe(), 'cmdline': process.cmdline()}
    except (psutil.NoSuchProcess, psutil.ZombieProcess):
        return None


def managed_process(name: str) -> dict:
    record = STATE / (name + '.pid.json')
    if not record.is_file():
        return {'running': False, 'owned': False, 'pid': None, 'stale_cleaned': False}
    try:
        data = json.loads(record.read_text(encoding='utf-8'))
    except Exception:
        record.unlink(missing_ok=True)
        return {'running': False, 'owned': False, 'pid': None, 'stale_cleaned': True}
    expected = data.get('identity', {})
    pid = expected.get('pid')
    try:
        actual = identity(pid)
    except psutil.AccessDenied:
        return {'running': True, 'owned': False, 'pid': pid, 'error': 'PROCESS_ACCESS_DENIED', 'stale_cleaned': False}
    same_root = os.path.normcase(data.get('package_root', '')) == os.path.normcase(str(ROOT))
    if not actual or actual != expected or not same_root:
        # The record is stale or belongs to another package copy. Never signal that PID.
        record.unlink(missing_ok=True)
        return {'running': False, 'owned': False, 'pid': None, 'stale_cleaned': True}
    return {'running': True, 'owned': True, 'pid': pid, 'stale_cleaned': False}


def port_open(port: int) -> bool:
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=0.3):
            return True
    except OSError:
        return False


async def mcp_probe(port: int) -> bool:
    from mcp import ClientSession
    from mcp.client.streamable_http import streamable_http_client
    async with streamable_http_client(f'http://127.0.0.1:{port}/mcp') as (read, write, _):
        async with ClientSession(read, write) as session:
            response = await session.initialize()
            return response.serverInfo.name == 'Codex Local Windows'


def mcp_ready(port: int) -> bool:
    if not port_open(port):
        return False
    try:
        return asyncio.run(asyncio.wait_for(mcp_probe(port), timeout=5))
    except Exception:
        return False


def tunnel_ready(port: int) -> bool:
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(f'http://127.0.0.1:{port}/readyz', timeout=2) as response:
            return response.status == 200 and response.read().decode().strip().strip('"') == 'ready'
    except Exception:
        return False


def status() -> dict:
    ports = load_endpoints()
    mcp = managed_process('mcp'); tunnel = managed_process('tunnel')
    mcp['ready'] = bool(mcp['owned'] and mcp_ready(ports['mcp_port']))
    tunnel['ready'] = bool(tunnel['owned'] and tunnel_ready(ports['tunnel_port']))
    tunnel['configured'] = PROFILE.is_file() and KEY_FILE.is_file()
    return {'runtime_contract': RUNTIME_CONTRACT, 'mcp': mcp, 'tunnel': tunnel,
            'mcp_url': f"http://127.0.0.1:{ports['mcp_port']}/mcp",
            'tunnel_ui': f"http://127.0.0.1:{ports['tunnel_port']}/ui", 'endpoints': ports,
            'state_directory': str(STATE), 'package_root': str(ROOT)}


def setup(workspace: Path) -> dict:
    require_windows()
    workspace = workspace.expanduser().resolve()
    if not workspace.is_dir():
        raise ValueError('Workspace does not exist.')
    tool_locations()
    secure_private_directory()
    if not CONFIG.exists():
        write_private(CONFIG, json.dumps({'repo': str(workspace), 'token': secrets.token_urlsafe(32), 'port': load_endpoints()['mcp_port']}, ensure_ascii=False, indent=2))
    else:
        existing = json.loads(CONFIG.read_text(encoding='utf-8'))
        if not Path(existing['repo']).is_dir():
            raise RuntimeError('Existing workspace no longer exists. Set a new one with control.py workspace --path PATH.')
    return {'installed': True, 'workspace': json.loads(CONFIG.read_text(encoding='utf-8'))['repo'], 'tunnel_configured': PROFILE.exists() and KEY_FILE.exists(), 'next': '2_CONNECT_TUNNEL.cmd, then 3_START.cmd'}


def assert_stopped():
    for name in ('mcp', 'tunnel'):
        if managed_process(name)['running']:
            raise RuntimeError(f'{name} is running. Stop the existing installation before changing its configuration.')


def make_profile(tunnel_id: str) -> dict:
    if not re.fullmatch(r'tunnel_[A-Za-z0-9_-]{16,100}', tunnel_id):
        raise ValueError('Enter the actual tunnel_id from your OpenAI Platform account.')
    ports = load_endpoints()
    return {'config_version': 1,
            'control_plane': {'base_url': 'https://api.openai.com', 'tunnel_id': tunnel_id, 'api_key': 'env:CODEX_LOCAL_WINDOWS_TUNNEL_API_KEY'},
            'health': {'listen_addr': f"127.0.0.1:{ports['tunnel_port']}"}, 'admin_ui': {'open_browser': False},
            'log': {'level': 'info', 'format': 'json'},
            'mcp': {'server_urls': [{'channel': 'main', 'url': f"http://127.0.0.1:{ports['mcp_port']}/mcp"}]}}


def configure_tunnel(tunnel_id: str, key: str) -> dict:
    assert_stopped()
    profile = make_profile(tunnel_id.strip())
    if not key.startswith('sk-') or len(key) < 20 or any(c.isspace() for c in key):
        raise ValueError('Enter a valid restricted OpenAI API key with Tunnels Read and Use.')
    if not CONFIG.is_file():
        raise RuntimeError('Run 1_INSTALL.cmd first.')
    secure_private_directory()
    encrypted = dpapi(key.encode('utf-8'))
    write_private(KEY_FILE, encrypted)
    write_private(PROFILE, json.dumps(profile, indent=2) + '\n')
    return {'configured': True, 'tunnel_id': profile['control_plane']['tunnel_id'], 'next': '3_START.cmd'}


def launch(name: str, argv: list[str], env: dict[str, str]):
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / (name + '.out.log')).open('ab') as stdout, (STATE / (name + '.err.log')).open('ab') as stderr:
        process = subprocess.Popen(argv, cwd=str(ROOT), env=env, stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr,
                                   creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP, close_fds=True)
    try:
        actual = identity(process.pid)
        if actual is None or process.poll() is not None:
            raise RuntimeError(f'{name} exited during startup. See {STATE / (name + ".err.log")}')
        write_private(STATE / (name + '.pid.json'), json.dumps({'package_root': str(ROOT), 'identity': actual}, indent=2))
    except Exception:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=5)
        raise


def wait_ready(name: str, probe, seconds: int):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        current = managed_process(name)
        if not current['owned']:
            raise RuntimeError(f'{name} stopped or lost process ownership. See {STATE / (name + ".err.log")}')
        if probe():
            return
        time.sleep(0.3)
    raise RuntimeError(f'{name} is not ready. Inspect {STATE / (name + ".err.log")}; use 5_STOP.cmd before retrying setup.')


def install_autostart() -> None:
    """Keep the personal bridge alive independently of the Web Pilot window."""
    import winreg
    pythonw = PYTHON.with_name('pythonw.exe')
    if not pythonw.is_file():
        raise RuntimeError('Windows background Python is missing; repair the runtime installation.')
    target = PRIVATE / 'autostart-control.py'
    launcher = PRIVATE / 'autostart.pyw'
    write_private(target, Path(__file__).read_bytes())
    # The copied controller must use the installed runtime, never its private directory
    # or a removable release ZIP as ROOT. No credentials appear in this launcher.
    script = ('import os, runpy, sys\n'
              + 'os.environ["WORKFLOW_PILOT_RUNTIME_ROOT"] = ' + repr(str(ROOT)) + '\n'
              + 'os.environ["CODEX_LOCAL_WINDOWS_STATE_DIR"] = ' + repr(str(STATE)) + '\n'
              + 'os.environ["PYTHONUTF8"] = "1"\n'
              + 'sys.argv = [' + repr(str(target)) + ', "start"]\n'
              + 'runpy.run_path(' + repr(str(target)) + ', run_name="__main__")\n')
    write_private(launcher, script)
    command = subprocess.list2cmdline([str(pythonw), '-B', str(launcher)])
    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER,
                            r'Software\Microsoft\Windows\CurrentVersion\Run', 0,
                            winreg.KEY_SET_VALUE) as key:
        winreg.SetValueEx(key, 'WorkflowPilotMCP', 0, winreg.REG_SZ, command)


def start(*, mcp_only: bool = False) -> dict:
    require_windows()
    if not CONFIG.is_file() or not PYTHON.is_file():
        raise RuntimeError('Run 1_INSTALL.cmd first.')
    if not mcp_only and not (PROFILE.is_file() and KEY_FILE.is_file()):
        raise RuntimeError('Run 2_CONNECT_TUNNEL.cmd before starting the full connection.')
    if not mcp_only:
        install_autostart()
    env = environment(); ports = reconcile_endpoints()
    if not managed_process('mcp')['owned']:
        launch('mcp', [str(PYTHON), '-B', str(ROOT / 'mcp' / 'bridge_mcp.py'), '--transport', 'streamable-http', '--host', '127.0.0.1', '--port', str(ports['mcp_port']), '--config', str(CONFIG)], env)
    wait_ready('mcp', lambda: mcp_ready(ports['mcp_port']), 25)
    if not mcp_only:
        persist_endpoints(ports['mcp_port'], ports['tunnel_port'])
        if not managed_process('tunnel')['owned']:
            if not port_available(ports['tunnel_port']):
                ports['tunnel_port'] = choose_free_port(DEFAULT_TUNNEL_PORT, {ports['mcp_port']})
                persist_endpoints(ports['mcp_port'], ports['tunnel_port'])
            key = dpapi(KEY_FILE.read_bytes(), decrypt=True).decode('utf-8')
            tunnel_env = {**env, 'CODEX_LOCAL_WINDOWS_TUNNEL_API_KEY': key}
            launch('tunnel', [str(tool_locations()['tunnel_client']), 'run', '--profile', 'windows-local', '--profile-dir', str(PROFILE_DIR)], tunnel_env)
            del key, tunnel_env
        wait_ready('tunnel', lambda: tunnel_ready(ports['tunnel_port']), 45)
    return status()


def stop() -> dict:
    require_windows()
    stopped = []
    errors = []
    for name in ('tunnel', 'mcp'):
        current = managed_process(name)
        if not current['running']:
            (STATE / (name + '.pid.json')).unlink(missing_ok=True)
            continue
        if not current['owned']:
            errors.append(f'{name}: process identity or package root differs; not stopped')
            continue
        try:
            parent = psutil.Process(current['pid'])
            recorded = json.loads((STATE / (name + '.pid.json')).read_text(encoding='utf-8'))
            if parent.create_time() != recorded['identity']['created']:
                raise RuntimeError('Process identity changed before termination; not stopped')
            targets = parent.children(recursive=True) + [parent]
            for process in reversed(targets):
                with contextlib.suppress(psutil.NoSuchProcess):
                    process.terminate()
            _, alive = psutil.wait_procs(targets, timeout=5)
            for process in alive:
                with contextlib.suppress(psutil.NoSuchProcess):
                    process.kill()
            _, alive = psutil.wait_procs(alive, timeout=3)
            if alive:
                raise RuntimeError('Processes did not stop: ' + ','.join(str(p.pid) for p in alive))
            (STATE / (name + '.pid.json')).unlink(missing_ok=True)
            stopped.append(name)
        except (psutil.Error, OSError, RuntimeError) as exc:
            errors.append(f'{name}: {exc}')
    if errors:
        raise RuntimeError('; '.join(errors))
    return {'stopped': stopped}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['setup', 'configure-tunnel', 'start', 'status', 'stop', 'workspace', 'assert-stopped'])
    parser.add_argument('--path', type=Path, default=Path.home(), help='Default workspace for setup/workspace')
    parser.add_argument('--tunnel-id', default='')
    parser.add_argument('--mcp-only', action='store_true')
    args = parser.parse_args()
    try:
        require_windows()
        # UTF-8 console output and HTTP probes are local to this process.
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        os.environ['NO_PROXY'] = ','.join(filter(None, [os.environ.get('NO_PROXY', ''), '127.0.0.1', 'localhost']))
        if args.command == 'status':
            result = status()
        else:
            with operation_lock():
                if args.command == 'setup':
                    result = setup(args.path)
                elif args.command == 'configure-tunnel':
                    assert_stopped()
                    print('Create a separate Codex Local Windows tunnel and a restricted key (Tunnels Read + Use).')
                    tunnel_id = args.tunnel_id or input('Tunnel ID: ').strip()
                    key = getpass.getpass('Restricted API key (hidden; never paste into ChatGPT): ').strip()
                    result = configure_tunnel(tunnel_id, key)
                    del key
                elif args.command == 'start':
                    result = start(mcp_only=args.mcp_only)
                elif args.command == 'stop':
                    result = stop()
                elif args.command == 'assert-stopped':
                    assert_stopped()
                    result = {'stopped': True}
                else:
                    assert_stopped()
                    workspace = args.path.expanduser().resolve()
                    if not workspace.is_dir():
                        raise ValueError('Workspace does not exist.')
                    config = json.loads(CONFIG.read_text(encoding='utf-8'))
                    config['repo'] = str(workspace)
                    write_private(CONFIG, json.dumps(config, ensure_ascii=False, indent=2))
                    result = {'workspace': str(workspace)}
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as exc:
        message = re.sub(r'sk-[A-Za-z0-9_-]+', '[REDACTED]', str(exc))
        print(json.dumps({'ok': False, 'error': message}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
