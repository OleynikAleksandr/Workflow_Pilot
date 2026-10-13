const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const path=require('node:path');
const code=String.raw`import json,pathlib,sys,shlex,re,time
sys.path.insert(0,sys.argv[1])
import server
from app_server_client import AppServerClient
root=pathlib.Path(sys.argv[2]).resolve()
codex_home=pathlib.Path(sys.argv[3])/'codex-home'
codex_home.mkdir(parents=True,exist_ok=True)
client=AppServerClient(cwd=str(root),environment={'CODEX_HOME':str(codex_home)},request_timeout=20)
client.start()
facade=server.LocalFacade(client,pathlib.Path(sys.argv[3]))
try:
    program="from http.server import HTTPServer,SimpleHTTPRequestHandler; s=HTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler); print('PORT='+str(s.server_port),flush=True); s.serve_forever()"
    command=shlex.quote(sys.executable)+' -I -u -c '+shlex.quote(program)
    result=facade.exec_command(command,str(root),'/bin/sh',False,False,1000,8000,True)
    sid=re.search(r'session ID ([a-f0-9]+)',result).group(1)
    port=int(re.search(r'PORT=(\d+)',result).group(1))
    denied=facade.exec_command('printf denied > forbidden',str(root),'/bin/sh',False,False,1000,8000,True)
    assert not (root/'forbidden').exists() and 'Process exited with code 0' not in denied
    print(json.dumps({'url':'http://127.0.0.1:'+str(port),'session':sid,'writeDenied':True}),flush=True)
    sys.stdin.readline()
    facade.write_stdin(sid,'\x03',5000)
    deadline=time.monotonic()+5
    directory=root/'.harness/runtime/command-activity'
    while list(directory.glob('*.json')) and time.monotonic()<deadline:time.sleep(.02)
    assert not list(directory.glob('*.json'))
    print(json.dumps({'stopped':True}),flush=True)
finally:
    client.close()
`;
module.exports.start=async function(workspace,stateDir) {
  if(process.platform!=='darwin')return null; // Native Windows sandbox is a separate acceptance check.
  const python=path.resolve(__dirname,'../.harness/runtime/test-python/bin/python');
  const child=spawn(python,['-c',code,path.resolve(__dirname,'../tools/codex-app-server-mcp'),workspace,stateDir],
    {stdio:['pipe','pipe','pipe']});
  let readyResolve,readyReject,endResolve,endReject,last=null,error='';
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const ended=new Promise((resolve,reject)=>{endResolve=resolve;endReject=reject;});ended.catch(()=>{});
  const lines=createInterface({input:child.stdout});
  lines.on('line',line=>{
    try{last=JSON.parse(line);if(last.url)readyResolve(last);}catch{readyReject(Error('Malformed preview fixture output'));}
  });
  child.stderr.on('data',chunk=>{error=(error+chunk).slice(-2000);});
  child.on('error',failure=>{readyReject(failure);endReject(failure);});
  child.on('close',code=>{
    lines.close();
    if(code!==0||!last?.stopped){const failure=Error('Protected preview fixture failed ('+code+'): '+error);readyReject(failure);endReject(failure);}
    else endResolve(last);
  });
  const timer=setTimeout(()=>{child.stdin.end();readyReject(Error('Protected preview did not become ready'));},30000);
  let result;try{result=await ready;}finally{clearTimeout(timer);}
  let stopping=null;
  return {...result,stop:()=>stopping??=(async()=>{child.stdin.end('stop\n');return ended;})()};
};
