import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
test('Windows autostart uses current-user registry and stable quoted private launcher without secrets',()=>{
 const result=execFileSync('python3',['-B','-c',String.raw`
import ast, pathlib, tempfile, types, sys, subprocess
source=pathlib.Path('resources/runtime-control/windows-control.py').read_text()
node=next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name=='install_autostart')
class Key:
 def __enter__(self): return self
 def __exit__(self,*args): pass
records=[]
w=types.SimpleNamespace(HKEY_CURRENT_USER='HKCU',KEY_SET_VALUE=2,REG_SZ=1,CreateKeyEx=lambda *a:(records.append(a) or Key()),SetValueEx=lambda *a:records.append(a[1:]))
sys.modules['winreg']=w
with tempfile.TemporaryDirectory(prefix='pilot space ') as folder:
 root=pathlib.Path(folder)/'runtime'; private=pathlib.Path(folder)/'state'/'private';private.mkdir(parents=True);root.mkdir()
 python=root/'python.exe';python.with_name('pythonw.exe').touch()
 control=root/'control.py';control.write_text(source)
 def write(p,data): p.write_bytes(data.encode() if isinstance(data,str) else data)
 g=dict(PYTHON=python,PRIVATE=private,ROOT=root,STATE=private.parent,Path=pathlib.Path,__file__=str(control),write_private=write,subprocess=subprocess)
 exec(compile(ast.Module(body=[node],type_ignores=[]),'<test>','exec'),g)
 g['install_autostart']();g['install_autostart']()
 assert records[0][0]=='HKCU'
 assert records[1][0]=='WorkflowPilotMCP'
 assert records[1][-1]==subprocess.list2cmdline([str(python.with_name('pythonw.exe')),'-B',str(private/'autostart.pyw')])
 assert (private/'autostart-control.py').read_text()==source
 launcher=(private/'autostart.pyw').read_text();compile(launcher,'launcher','exec')
 assert repr(str(root)) in launcher and 'runpy.run_path' in launcher
 assert 'api_key' not in launcher and 'dpapi' not in launcher
 python.with_name('pythonw.exe').unlink()
 try:g['install_autostart']();raise AssertionError('missing interpreter accepted')
 except RuntimeError:pass
 print('AUTOSTART_OK')
`],{encoding:'utf8'});assert.match(result,/AUTOSTART_OK/);
});
