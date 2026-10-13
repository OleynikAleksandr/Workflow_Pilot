"""Linux branches on a host-independent fake X server and temporary filesystem.
Never starts systemd/SSH/tunnel, sends model requests or operates a real desktop.
"""
import io
import json
import os
from pathlib import Path
import sys
from types import SimpleNamespace as NS
from unittest.mock import patch

source, root = Path(sys.argv[1]), Path(sys.argv[2]).resolve()
sys.path.insert(0, str(source))
from PIL import Image
import linux_desktop as desktop
import linux_runtime
import tunnel_prompt
import app_server_client
import server


def rejected(call, text):
    try:
        call()
    except (ValueError, RuntimeError) as error:
        assert text in str(error), str(error)
    else:
        raise AssertionError('expected ' + text)


rejected(lambda: desktop.require_x11({'DISPLAY': ':1', 'WAYLAND_DISPLAY': 'wayland-0'}), 'WAYLAND')
rejected(lambda: desktop.require_x11({}), 'DISPLAY')
assert desktop.require_x11({'DISPLAY': ':1'}) == ':1'
red_blue = bytes([0, 0, 255, 0, 255, 0, 0, 0])
image = desktop.decode_drawable(red_blue, 2, 1, 32, 32, 0, (0xff0000, 0xff00, 0xff))
assert list(image.getdata()) == [(255, 0, 0), (0, 0, 255)]
big = desktop.decode_drawable(bytes([0, 255, 0, 0]), 1, 1, 32, 32, 1, (0xff0000, 0xff00, 0xff))
assert big.getpixel((0, 0)) == (255, 0, 0)
rejected(lambda: desktop.decode_drawable(b'', 2, 1, 32, 32, 0, (0xff0000, 0xff00, 0xff)), 'INCOMPLETE')
rejected(lambda: desktop.decode_drawable(b'', 1, 1, 16, 32, 0, (1, 2, 3)), 'FORMAT')

class Window:
    def __init__(self): self.visible = True
    def get_attributes(self): return NS(map_state=2 if self.visible else 0, visual=32)
    def get_geometry(self): return NS(width=2, height=1, depth=24)
    def get_full_property(self, atom, kind):
        assert kind == 0
        return NS(value={'_NET_WM_NAME': 'Окно Ω'.encode(), '_NET_WM_PID': [456]}[atom])
    def get_wm_class(self): return ('fixture', 'Fixture')
    def get_image(self, x, y, width, height, mode, mask):
        assert (x, y, width, height, mode, mask) == (0, 0, 2, 1, 2, 0xffffffff)
        return NS(data=red_blue)

window = Window()
class Display:
    def __init__(self):
        self.closed = False
        visual = NS(visual_id=32, visual_class=4, red_mask=0xff0000, green_mask=0xff00, blue_mask=0xff)
        self.display = NS(info=NS(roots=[NS(allowed_depths=[NS(visuals=[visual])])],
            pixmap_formats=[NS(depth=24, bits_per_pixel=32, scanline_pad=32)], image_byte_order=0))
    def screen(self): return NS(root=self)
    def intern_atom(self, value): return value
    def get_full_property(self, atom, kind): return NS(value=[123, 999])
    def translate_coords(self, value, x, y): assert value is window; return NS(x=-5, y=10)
    def create_resource_object(self, kind, identifier):
        assert kind == 'window'
        if identifier != 123: raise ValueError('BadWindow')
        return window
    def close(self): self.closed = True

connections = []
def connect(name):
    assert name == ':1'
    connection = Display(); connections.append(connection); return connection

class Screen:
    def __init__(self, **options): assert options == {'display': ':1', 'with_cursor': True}
    def __enter__(self): return self
    def __exit__(self, *args): pass
    monitors = [{'left': -5, 'top': 10, 'width': 2, 'height': 1}]
    def grab(self, region):
        assert region == self.monitors[0]
        return NS(size=(2, 1), rgb=bytes([255, 0, 0, 0, 0, 255]))

adapter = desktop.LinuxDesktop({'DISPLAY': ':1'}, connect, Screen)
rows = adapter.list_windows()
assert rows == [{'window_id':123, 'application':'Fixture', 'title':'Окно Ω', 'pid':456,
                 'rect':{'x':-5, 'y':10, 'width':2, 'height':1}}]
for data in [adapter.capture_window(123), adapter.capture_screen()]:
    decoded = Image.open(io.BytesIO(data)); assert decoded.size == (2, 1)
    assert decoded.getpixel((0, 0)) == (255, 0, 0)
rejected(lambda: adapter.capture_window(999), 'WINDOW_CAPTURE_FAILED')
window.visible = False
rejected(lambda: adapter.capture_window(123), 'WINDOW_CAPTURE_FAILED')
assert all(connection.closed for connection in connections)

facade = server.LocalFacade.__new__(server.LocalFacade)
facade.platform = 'linux'; facade._linux_desktop = adapter; facade.client = NS(environment={})
window.visible = True
assert facade.computer_list_windows('Ω')['backend'] == 'X11 window list'
assert facade.computer_capture_window(123)[0]['window_id'] == 123
with patch.dict(os.environ, {'SHELL': ''}):
    assert facade._command_shell('') == '/bin/bash'
assert app_server_client._detached_process_options('linux') == {'start_new_session': True}
assert facade._shell_argv('/bin/bash', 'printf "Привет"', False, 'linux') == ['/bin/bash', '-c', 'printf "Привет"']
assert server.server_name('linux') == 'Workflow Pilot Local Linux'
assert server.default_state_dir('linux', {'XDG_STATE_HOME':str(root / 'state')}) == root / 'state/WorkflowPilotCodexExecutor'

proc = root / 'proc'; (proc / '42').mkdir(parents=True); (proc / 'sys/kernel/random').mkdir(parents=True)
(proc / 'sys/kernel/random/boot_id').write_text('boot-A')
binary = root / 'fake executable'; binary.write_text('fixture'); (proc / '42/exe').symlink_to(binary)
fields = ['S'] + ['0'] * 18 + ['12345'] + ['0'] * 3
(proc / '42/stat').write_text('42 (name with ) spaces) ' + ' '.join(fields))
first = linux_runtime.pid_identity(42, proc); assert first['start'] == '12345'
(proc / 'sys/kernel/random/boot_id').write_text('boot-B')
assert linux_runtime.pid_identity(42, proc) != first
fields[0] = 'Z'; (proc / '42/stat').write_text('42 (zombie) ' + ' '.join(fields))
assert linux_runtime.pid_identity(42, proc) is None

state = root / 'runtime state'; config = root / 'config'
with patch.dict(os.environ, {'WORKFLOW_PILOT_CODEX_EXECUTOR_STATE_DIR':str(state),'XDG_CONFIG_HOME':str(config)}), patch.object(sys,'platform','linux'):
    import control
assert control.IS_LINUX and not control.IS_WINDOWS
tools_root = state / 'runtime/tools'; tools_root.mkdir(parents=True)
manifest = {'platform':'linux','arch':'x64','tools':{}}
for name in ('node','uv','python','rg','codex','tunnel_client'):
    file = tools_root / name; file.write_text('fixture'); file.chmod(0o755)
    manifest['tools'][name] = {'path':name}
(tools_root / 'manifest.json').write_text(json.dumps(manifest))
assert control.environment()['CODEX_APP_SERVER_BIN'] == str(tools_root / 'codex')
with patch.object(app_server_client, 'discover_codex_binary', return_value=NS(path=str(tools_root / 'codex'),version='fixture')) as discover:
    assert control.require_codex()['path'] == str(tools_root / 'codex')
    discover.assert_called_once_with(explicit=str(tools_root / 'codex'))
control.configure_tunnel('tunnel_abcdefghijklmnop', 'sk-' + 'a'*32)
assert control.KEY_FILE.stat().st_mode & 0o777 == 0o600
assert 'sk-' not in control.PROFILE.read_text()
assert control.read_tunnel_key() == 'sk-' + 'a'*32
calls = []
linux_runtime.setup_python(source, state / 'runtime', state / 'runtime/venv', state / 'runtime/venv/bin/python',
    run=lambda argv, **kwargs: calls.append((argv, kwargs)))
assert '--require-hashes' in calls[1][0] and '--only-binary' in calls[1][0]
assert calls[1][0][-1].endswith('requirements-linux.lock')
assert calls[0][1]['env']['UV_PYTHON_DOWNLOADS'] == 'never'

route = config / 'workflow-pilot/vps/route.json'; route.parent.mkdir(parents=True)
route.write_text(json.dumps({'schema_version':1,'product':'workflow-pilot','ssh_host':'workflow-pilot-vps-linux','remote_port':18842}))
with patch.dict(os.environ, {'XDG_CONFIG_HOME':str(config)}):
    argv = control.vps_ssh_argv(18852)
    assert argv[0] == '/usr/bin/ssh' and argv[-1] == 'workflow-pilot-vps-linux'
    assert argv[-2] == '127.0.0.1:18842:127.0.0.1:18852'
    route.write_text(json.dumps({'schema_version':1,'product':'workflow-pilot','ssh_host':'vps-mcp-tunnel','remote_port':17842}))
    rejected(control.vps_config, 'VPS_ROUTE_INVALID')
    route.write_text(json.dumps({'schema_version':1,'product':'workflow-pilot','ssh_host':'workflow-pilot-vps-linux','remote_port':18842}))
    control.private_write(control.VPS_FILE, json.dumps({'forward_port':18852,**control.vps_config()}))
    class Child:
        pid = 77
        def wait(self): assert (state/'vps-ssh.pid.json').is_file()
    with patch.object(control,'pid_identity',return_value={'boot':'fixture','start':'99','exe':'/usr/bin/ssh'}):
        control.vps_supervise(popen=lambda *args,**kwargs: Child(), sleep=lambda _:None, rounds=1)
    assert not (state/'vps-ssh.pid.json').exists()

assert tunnel_prompt.linux_prompt('fixture',hidden=True,run=lambda argv,**kwargs:
    NS(returncode=0,stdout='secret\n')) == 'secret'
try:
    tunnel_prompt.linux_prompt('fixture',run=lambda *args,**kwargs:NS(returncode=1))
except tunnel_prompt.Cancelled: pass
else: raise AssertionError('cancelled prompt must not configure a tunnel')
print(json.dumps({'linuxFixtures':True,'nativeLinux':False,'x11Pixels':True,'privateCredentials':True,'processIdentity':True}))
