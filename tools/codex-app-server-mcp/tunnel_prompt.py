#!/usr/bin/env python3
"""Native tunnel prompts for the Codex App Server executor. Secrets stay in this worker and the private store of control.py."""
import base64
import json
from pathlib import Path
import re
import runpy
import subprocess
import sys

class Cancelled(Exception):
    pass

class PromptFailure(Exception):
    pass

def windows_prompt_script(message, hidden=False):
    # The message travels as base64 and the whole script as -EncodedCommand: no quoting of user-visible text.
    message64 = base64.b64encode(message.encode('utf-8')).decode('ascii')
    return r'''
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Workflow Pilot'
$form.ClientSize = New-Object System.Drawing.Size(510, 190)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(16, 16)
$label.Size = New-Object System.Drawing.Size(478, 70)
$label.Text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(''' + "'" + message64 + "'" + r'''))
$field = New-Object System.Windows.Forms.TextBox
$field.Location = New-Object System.Drawing.Point(16, 91)
$field.Size = New-Object System.Drawing.Size(478, 25)
$field.MaxLength = 4096
$field.UseSystemPasswordChar = ''' + ('$true' if hidden else '$false') + r'''
$confirm = New-Object System.Windows.Forms.Button
$confirm.Text = 'Продолжить'
$confirm.Location = New-Object System.Drawing.Point(274, 140)
$confirm.Size = New-Object System.Drawing.Size(105, 30)
$confirm.DialogResult = [System.Windows.Forms.DialogResult]::OK
$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = 'Отмена'
$cancel.Location = New-Object System.Drawing.Point(389, 140)
$cancel.Size = New-Object System.Drawing.Size(105, 30)
$cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.Controls.AddRange(@($label, $field, $confirm, $cancel))
$form.AcceptButton = $confirm
$form.CancelButton = $cancel
$form.Add_Shown({$form.Activate(); $field.Focus()})
try {
    if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        @{value=$field.Text} | ConvertTo-Json -Compress
    } else { @{cancelled=$true} | ConvertTo-Json -Compress }
} finally { $field.Clear(); $form.Dispose() }
'''


def windows_prompt(message, hidden=False, run=None):
    encoded = base64.b64encode(windows_prompt_script(message, hidden).encode('utf-16-le')).decode('ascii')
    try:
        result = (run or subprocess.run)(['powershell.exe', '-NoLogo', '-NoProfile', '-STA', '-EncodedCommand', encoded],
                     capture_output=True, text=True, encoding='utf-8', timeout=900,
                     creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000))
        if result.returncode:
            raise PromptFailure()
        value = json.loads(result.stdout.lstrip('\ufeff'))
        if value.get('cancelled') is True:
            raise Cancelled()
        if not isinstance(value.get('value'), str):
            raise PromptFailure()
        return value['value'].strip()
    except (OSError, subprocess.TimeoutExpired, ValueError, AttributeError) as error:
        raise PromptFailure() from error


def mac_prompt(message, hidden=False):
    script = ('text returned of (display dialog ' + json.dumps(message, ensure_ascii=False) +
              ' with title "Workflow Pilot" default answer ""' +
              (' with hidden answer' if hidden else '') +
              ' buttons {"Отмена", "Продолжить"} default button "Продолжить" cancel button "Отмена")')
    try:
        result = subprocess.run(['/usr/bin/osascript', '-e', script],
                                capture_output=True, text=True, timeout=900)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise PromptFailure() from error
    if result.returncode:
        if '-128' in result.stderr:
            raise Cancelled()
        raise PromptFailure()
    return result.stdout.strip()


def linux_prompt(message, hidden=False, run=None):
    # zenity reads the secret from the user; neither the secret nor shell code is
    # supplied in argv. A cancelled dialog leaves the existing configuration intact.
    try:
        result = (run or subprocess.run)(['/usr/bin/zenity', '--entry', '--title=Workflow Pilot',
            '--text=' + message, *(['--hide-text'] if hidden else [])],
            capture_output=True, text=True, timeout=900)
        if result.returncode == 1:
            raise Cancelled()
        if result.returncode:
            raise PromptFailure()
        return result.stdout.strip()
    except (OSError, subprocess.TimeoutExpired) as error:
        raise PromptFailure() from error


def prompt(message, hidden=False):
    method = {'win32': windows_prompt, 'darwin': mac_prompt, 'linux': linux_prompt}.get(sys.platform)
    if method is None:
        raise PromptFailure()
    return method(message, hidden=hidden)


class TunnelIdError(ValueError):
    pass


def collect_tunnel_id(ask=prompt):
    value = ask('Шаг 1 из 2. Вставьте ID туннеля из OpenAI Platform → Tunnels. Он начинается с tunnel_. Подтвердите ввод; инструкция API key откроется следующим шагом.')
    if not isinstance(value, str) or len(value) > 150 or not re.fullmatch(r'tunnel_[A-Za-z0-9_-]{16,100}', value.strip()):
        raise TunnelIdError('Invalid tunnel ID')
    return {'tunnel_id': value.strip()}


def read_input(stream):
    raw = stream.read(8193)
    if len(raw) > 8192:
        raise ValueError('Invalid input')
    value = json.loads(raw)
    if not isinstance(value, dict) or set(value) - {'tunnel_id', 'api_key'}:
        raise ValueError('Invalid input')
    if any(not isinstance(v, str) for v in value.values()):
        raise ValueError('Invalid input')
    return value


def configure(control, ask=prompt, supplied=None):
    # Collect both values before taking the runtime lock or modifying any file.
    supplied = supplied if supplied is not None else {}
    tunnel_id = supplied.get('tunnel_id')
    if tunnel_id is None:
        tunnel_id = ask('Вставьте tunnel_id, полученный в OpenAI Platform → Tunnels.')
    key = supplied.get('api_key')
    if key is None:
        key = ask('Вставьте личный ключ OpenAI с правами Tunnels: Read и Use. Он сохранится только на этом компьютере.', hidden=True)
    if not isinstance(tunnel_id, str) or not isinstance(key, str):
        raise ValueError('Invalid input')
    if len(tunnel_id) > 150 or len(key) > 4096:
        raise ValueError('Проверьте длину введённых данных.')
    with control['operation_lock']():
        control['configure_tunnel'](tunnel_id, key)
    return {'configured': True}

def main():
    if sys.platform not in ('darwin', 'win32', 'linux'):
        raise RuntimeError('Неподдерживаемая платформа настройки.')
    supplied = read_input(sys.stdin) if sys.argv[1:] == ['--stdin'] else None
    try:
        if sys.argv[1:] == ['--tunnel-id']:
            result = collect_tunnel_id()
        else:
            # The executor's own lifecycle module: its lock and its private tunnel store.
            control = runpy.run_path(str(Path(__file__).with_name('control.py')), run_name='web_pilot_control')
            result = configure(control, supplied=supplied)
    except Cancelled:
        result = {'cancelled': True}
    print(json.dumps(result))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never surface captured native dialog stdout, keys, or command arguments.
        system = {'win32': 'WINDOWS', 'darwin': 'MAC', 'linux': 'LINUX'}.get(sys.platform, 'UNSUPPORTED')
        code = ('TUNNEL_ID_INVALID' if isinstance(error, TunnelIdError) else
                'TUNNEL_PROMPT_FAILED' if isinstance(error, PromptFailure) else
                'TUNNEL_INVALID_DATA' if isinstance(error, ValueError) else
                'TUNNEL_SETUP_FAILED')
        print(json.dumps({'ok': False, 'code': system + '_' + code}), file=sys.stderr)
        raise SystemExit(1)
