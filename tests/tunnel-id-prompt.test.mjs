import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
for (const [name, platform] of [['mac', 'darwin'], ['windows', 'win32']]) {
  test(`${name}: ID-only entry opens one native prompt and never loads runtime or requests a key`, async () => {
    // One worker for both systems; only the native prompt differs.
    const helper = fileURLToPath(new URL('../tools/codex-app-server-mcp/tunnel_prompt.py', import.meta.url));
    const { stdout } = await execute('python3', ['-B', '-c', `
import contextlib,io,json,runpy,subprocess
from unittest.mock import patch
h=runpy.run_path(${JSON.stringify(helper)},run_name='fixture')
identity='tunnel_fixture1234567890123456'
calls=[]
def ask(message,hidden=False):
 assert not hidden
 calls.append(message)
 return '  '+identity+'  '
assert h['collect_tunnel_id'](ask)=={'tunnel_id':identity}
assert len(calls)==1
for value in ['', 'sk-fixture_secret_1234567890', 'tunnel_short', 'x'*9000]:
 try: h['collect_tunnel_id'](lambda *a: value)
 except h['TunnelIdError']: pass
 else: raise AssertionError('invalid ID accepted')
def cancel(*a): raise h['Cancelled']()
try: h['collect_tunnel_id'](cancel)
except h['Cancelled']: pass
else: raise AssertionError('cancel not propagated')
# Exercise the actual CLI branch with native process output, without opening UI.
seen=[]
def native(args,**kwargs):
 seen.append(args)
 answer=json.dumps({'value':identity}) if ${JSON.stringify(name)}=='windows' else identity
 return subprocess.CompletedProcess(args,0,stdout=answer,stderr='')
output=io.StringIO()
with patch('sys.platform',${JSON.stringify(platform)}),patch('sys.argv',['helper','--tunnel-id']),patch.object(subprocess,'CREATE_NO_WINDOW',0,create=True),patch('subprocess.run',native),patch('runpy.run_path',side_effect=AssertionError('runtime must not load')),contextlib.redirect_stdout(output):
 h['main']()
assert json.loads(output.getvalue())=={'tunnel_id':identity}
assert len(seen)==1
print('ID-only native branch passed')
`], { timeout: 10000 });
    assert.equal(stdout.trim(), 'ID-only native branch passed');
  });
}
