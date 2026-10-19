import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ProjectCommands} from '../src/execution/runtime/project-commands.mjs';
import {createProjectLifecycle} from '../src/control/projects/lifecycle.mjs';

async function fixture(t){const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'project-stop-')));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}

test('backend persists exact project stops before authenticated cancellation; no shared service action',async t=>{
  const root=await fixture(t),privateDir=path.join(root,'private');await fs.mkdir(privateDir);
  const target=path.join(root,'project'),other=path.join(root,'neighbour'),token='b'.repeat(64),calls=[];
  const server=http.createServer(async(req,res)=>{
    assert.equal(req.url,'/workflow-project-control');assert.equal(req.headers.authorization,'Bearer '+token);
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks));
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(privateDir,'project-command-stops.json'))).workspaces,[target]);
    calls.push(body);res.setHeader('content-type','application/json');res.end(JSON.stringify({operation:body.operation,operations:['owned'],executor_instance:'one'}));
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  await fs.writeFile(path.join(privateDir,'command-control.json'),JSON.stringify({version:1,pid:process.pid,port:server.address().port,token}));
  const control=new ProjectCommands(root);const result=await control.retire([target]);
  assert.deepEqual(result.operations,['owned']);assert.deepEqual(calls[0].workspaces,[target]);
  assert.equal(calls[0].workspaces.includes(other),false);
  await control.update([target],false);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(privateDir,'project-command-stops.json'))).workspaces,[]);
});

test('removal releases busy pages and cancels commands before awaiting its scheduler',async t=>{
  const workspace=await fixture(t),events=[];let settle;
  const queue=new Promise(resolve=>settle=resolve),record={identity:{workspace},cleanups:[],controller:{pending:true},composer:{inFlight:true}};
  const lifecycle=createProjectLifecycle({store:{whenIdle:async()=>events.push('store')},
    workflow:{execution:{retire:()=>{events.push('retired');return queue;}},retireCommunication:async()=>events.push('channel')},
    liveSessions:{all:()=>[record],release:(r,options)=>{assert.equal(options.force,true);events.push('page');}},
    operations:{retireProjectCommands:async roots=>{assert.deepEqual(roots,[workspace]);events.push('commands');settle();return {operations:[]};}},
    awaitSettings:async()=>events.push('settings')});
  await lifecycle.prepareProjectRemoval({workspace,projectId:'one',sessionIds:['chat'],related:[]});
  assert.deepEqual(events,['retired','page','commands','channel','store','settings']);
});

test('private executor cancellation terminates only its selected command and rejects old project tools',{timeout:45000},async t=>{
  const root=await fixture(t),source=path.resolve('tools/codex-app-server-mcp'),python=path.resolve('.harness/runtime/test-python/bin/python');
  const binary=path.join(os.homedir(),'.npm-global/bin/codex');
  if(process.platform!=='darwin'||!await fs.stat(binary).catch(()=>null)){t.skip('real executor fixture requires macOS Codex');return;}
  const script=String.raw`
import asyncio,json,pathlib,sys,uuid,shlex,shutil
sys.path.insert(0,sys.argv[1])
import server,httpx
from app_server_client import AppServerClient
root=pathlib.Path(sys.argv[2]); a=root/'a'; b=root/'b'
for p in (a,b):
    (p/'.harness/plans').mkdir(parents=True)
    (p/'.harness/plans/todo-plan.md').write_text('fixture')
(root/'codex-home').mkdir()
(root/'codex-home/config.toml').write_text('model_provider="blocked"\n[model_providers.blocked]\nname="Blocked"\nbase_url="http://127.0.0.1:1/v1"\nwire_api="responses"\nrequires_openai_auth=false\n')
c=AppServerClient(binary=sys.argv[3],cwd=str(root),environment={'CODEX_HOME':str(root/'codex-home')})
f=server.LocalFacade(c,root/'state')
try:
    cmd=shlex.quote(sys.executable)+' -B -c '+shlex.quote('import time;print("started",flush=True);time.sleep(30)')
    f.exec_command(cmd,str(a),login=False,yield_time_ms=250)
    f.exec_command(cmd,str(b),login=False,yield_time_ms=250)
    mcp=server.FastMCP('fixture',host='127.0.0.1',port=12345,stateless_http=True)
    f.install_project_control(mcp,'127.0.0.1',12345)
    private=root/'state/private'
    (private/'project-command-stops.json').write_text(json.dumps({'version':1,'workspaces':[str(a)]}))
    descriptor=json.loads((private/'command-control.json').read_text())
    async def check():
        transport=httpx.ASGITransport(app=mcp.streamable_http_app(),client=('127.0.0.1',9999))
        async with httpx.AsyncClient(transport=transport,base_url='http://127.0.0.1:12345') as client:
            data={'operation':str(uuid.uuid4()),'workspaces':[str(a)]}
            assert (await client.post('/workflow-project-control',json=data)).status_code==403
            headers={'authorization':'Bearer '+descriptor['token']}
            assert (await client.post('/workflow-project-control',json={**data,'workspaces':[]},headers=headers)).status_code==409
            assert (await client.post('/workflow-project-control',json=data,headers={**headers,'origin':'https://foreign.invalid'})).status_code==403
            response=await client.post('/workflow-project-control',json=data,headers=headers)
            assert response.status_code==200,response.text
            return response.json()
    result=asyncio.run(check())
    owned=[(k,v) for k,v in f._activities.items() if v['workspace']==str(a)]
    neighbour=[v for v in f._activities.values() if v['workspace']==str(b)][0]
    assert result['operations']==[pathlib.Path(owned[0][0]).stem]
    assert c.process_status(neighbour['process_id'],include_output=False)['running']
    try: f.exec_command('echo forbidden',str(a),yield_time_ms=250)
    except ValueError as exc: assert 'PROJECT_REMOVED' in str(exc)
    else: raise AssertionError('removed project admitted a command')
    shutil.rmtree(a)
    f._activity_event(pathlib.Path(owned[0][0]),{'state':'completed','exit_code':0})
    assert not a.exists(),'late completion recreated deleted project'
    assert c.status()['running'],'shared executor remains running'
    print('PROJECT_REMOVAL_OK')
finally: c.close()
`;
  const result=await promisify(execFile)(python,['-B','-c',script,source,root,binary],
    {env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},timeout:40000,maxBuffer:1024*1024});
  assert.match(result.stdout,/PROJECT_REMOVAL_OK/);
});
