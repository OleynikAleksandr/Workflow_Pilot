"""Linux-specific paths, payload and process identity. No UI control or services at import."""
import json
import os
from pathlib import Path
import subprocess
import sys


def xdg_path(name, fallback, environ=None):
    environ = os.environ if environ is None else environ
    value = environ.get(name, "")
    return Path(value) if value and Path(value).is_absolute() else Path(fallback)


def state_directory(environ=None):
    return xdg_path('XDG_STATE_HOME', Path.home() / '.local/state', environ) / 'WorkflowPilotCodexExecutor'


def tool_locations(root):
    root = Path(root).resolve()
    try:
        manifest = json.loads((root / 'manifest.json').read_text())
        if manifest['platform'] != 'linux' or manifest['arch'] != 'x64':
            raise ValueError('platform')
        tools = {}
        for name in ('node', 'python', 'uv', 'rg', 'codex', 'tunnel_client'):
            value = manifest['tools'][name]['path']
            target = (root / value).resolve()
            if Path(value).is_absolute() or root not in target.parents or not target.is_file() or not os.access(target, os.X_OK):
                raise ValueError(name)
            tools[name] = target
        return tools
    except (OSError, ValueError, KeyError, TypeError):
        raise RuntimeError('LINUX_PAYLOAD_INVALID: prepare the complete Linux package again') from None


def setup_python(root, runtime, venv, python, run=subprocess.run):
    tools = tool_locations(runtime / 'tools')
    env = {**os.environ, 'UV_CACHE_DIR': str(runtime / 'uv-cache'), 'UV_PYTHON_DOWNLOADS': 'never'}
    if not python.is_file():
        run([str(tools['uv']), 'venv', '--clear', '--no-config', '--python', str(tools['python']), str(venv)],
            check=True, stdout=sys.stderr, env=env)
    run([str(tools['uv']), 'pip', 'sync', '--no-config', '--require-hashes', '--only-binary', ':all:',
         '--python', str(python), str(root / 'requirements-linux.lock')], check=True, stdout=sys.stderr, env=env)


def pid_identity(pid, proc=Path('/proc')):
    try:
        # /proc/PID/stat comm may contain spaces and parentheses. starttime is
        # field 22; boot ID prevents reuse across restart, even with equal ticks.
        fields = (proc / str(pid) / 'stat').read_text().rsplit(')', 1)[1].split()
        if fields[0] == 'Z':
            return None
        return {'boot': (proc / 'sys/kernel/random/boot_id').read_text().strip(),
                'start': fields[19], 'exe': str((proc / str(pid) / 'exe').resolve(strict=True))}
    except (OSError, ValueError, IndexError):
        return None
