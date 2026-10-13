const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFile,spawn}=require('node:child_process');
const {promisify}=require('node:util');
const {randomUUID}=require('node:crypto');
const execute=promisify(execFile);

// F03 characterization: a real fixture-owned HTTP writer started only after a
// verified worker source commit. Its v2 activity record is a synthetic MCP
// witness; the actual App Server lifecycle is covered by executor-channel.
// Never attach this helper to a user checkout or an existing service.
module.exports.startFixtureWriter=async function(worktree,nodeExecutable=process.execPath) {
  const id='fixture-'+randomUUID();
  const directory=path.join(worktree,'.harness/runtime/command-activity');
  await fs.mkdir(directory,{recursive:true});
  const marker=path.join(directory,id+'.json');
  const server=String.raw`
    const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
    const server=http.createServer((req,res)=>{
      if(req.method==='POST'&&req.url==='/write'){
        fs.writeFileSync(path.join(process.cwd(),'.harness/runtime/writer-proof.txt'),'fixture write\n');
        res.writeHead(200);res.end('written');return;
      }
      res.writeHead(200);res.end('writer alive');
    });
    server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port));
    process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
  `;
  const child=spawn(nodeExecutable,['-e',server],{cwd:worktree,stdio:['ignore','pipe','pipe']});
  const exited=new Promise(resolve=>child.once('exit',resolve));
  let stopped=false;
  const stop=async()=>{
    if(stopped)return;stopped=true;
    if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
    const timeout=setTimeout(()=>child.kill('SIGKILL'),3000);
    try{await exited;}finally{clearTimeout(timeout);await fs.rm(marker,{force:true});}
  };
  try {
    const port=await new Promise((resolve,reject)=>{
      let output='';
      const timeout=setTimeout(()=>reject(Error('fixture writer did not bind loopback')),6000);
      const settle=(fn,value)=>{clearTimeout(timeout);fn(value);};
      child.stdout.on('data',chunk=>{
        output+=chunk.toString();const match=/PORT=(\d+)/.exec(output);
        if(match)settle(resolve,Number(match[1]));
      });
      child.once('error',error=>settle(reject,error));
      child.once('exit',(code,signal)=>settle(reject,Error('fixture writer exited before ready: '+(code??signal))));
    });
    const url='http://127.0.0.1:'+port;
    const response=await fetch(url);
    assert.equal(response.status,200);
    assert.equal(await response.text(),'writer alive');
    await fs.writeFile(marker,JSON.stringify({
      version:2,id,workspace:worktree,cwd:worktree,executor_instance:'fixture-writer',
      executor_pid:child.pid,started_at_ms:Date.now(),process_id:'fixture-'+child.pid,
      state:'running',read_only_verified:false,sandbox_policy:'dangerFullAccess'
    }),{flag:'wx',mode:0o600});
    return {url,id,pid:child.pid,marker,stop};
  }catch(error){await stop();throw error;}
};

module.exports.run=async function({sidebar,store,workspaceSetup,snapshot,selectWorkspace,liveSessions,dataDir,waitFor,getArchiveWindow}) {
  const node=await workspaceSetup.node(),script=path.resolve(__dirname,'../packages/workflow-kit/scripts/check-parallel-execution-fixture.mjs');
  const run=async(...args)=>JSON.parse((await execute(node,[script,...args],{env:workspaceSetup.environment,maxBuffer:4*1024*1024,timeout:120000})).stdout);
  const git=async(root,...args)=>(await execute('git',['-C',root,...args],{env:workspaceSetup.environment,encoding:'utf8'})).stdout.trim();
  const ipc=(name,...args)=>sidebar.executeJavaScript('window.webPilot.'+name+'('+args.map(a=>JSON.stringify(a)).join(',')+')');
  const wait=(predicate,name)=>waitFor(predicate,'parallel: '+name,()=>({...snapshot(),parallelRuntimes:[...liveSessions.records.values()]
    .filter(r=>r.identity?.assignmentId).map(r=>({identity:r.identity,ready:r.ready,loading:r.loading,
      phase:r.controller.state.phase,error:r.controller.state.error,runtimeError:r.error,url:r.view.webContents.getURL()}))}));
  const stageSnapshot=()=>sidebar.executeJavaScript(`(()=>{
    const root=document.getElementById('execution-actions'),list=document.getElementById('execution-stages');
    return {hidden:root.hidden,stages:Object.fromEntries([...list.querySelectorAll('li')].map(el=>[
      el.dataset.stage,{status:el.dataset.status,text:el.textContent}])),
      action:document.getElementById('execution-next-action').textContent,
      aria:list.getAttribute('aria-label'),role:document.getElementById('execution-next-action').getAttribute('role'),
      width:document.documentElement.clientWidth,overflow:root.scrollWidth>root.clientWidth+1,
      theme:document.documentElement.dataset.theme,
      focusable:document.getElementById('auto-plan-toggle').tabIndex>=0};})()`);
  const root=(await run('--create',path.join(dataDir+'-projects','parallel-e2e'))).root;
  const {SessionPlans}=await import('../src/session-plans.mjs');
  const plans=new SessionPlans({setup:workspaceSetup});
  const config=JSON.parse(await fs.readFile(path.join(root,'.harness/workflow.json'),'utf8'));
  config.checks.find(check=>check.id==='dependency').executable='node';
  config.checks.find(check=>check.id==='dependency').args=['--test','verify.mjs'];
  await plans.call(root,'config:apply',[],config);
  await ipc('setAutoPlan',false);await ipc('openSettings');
  assert.equal((await ipc('setParallelExecution',{parallel_allowed:true,max_workers:2})).ok,true);
  await ipc('closeSettings');await selectWorkspace(root);
  await wait(()=>store.selected()?.workspace===root&&snapshot().context.phase==='delivered','main context delivery');
  const origin=store.selected();assert.deepEqual(origin.executionSnapshot,{parallel_allowed:true,max_workers:2});
  const record=(workspace,id)=>[...liveSessions.records.values()].find(r=>r.identity?.workspace===workspace&&(!id||r.identity.sessionId===id));
  const main=record(root,origin.sessionId);
  await main.view.webContents.executeJavaScript('window.fixtureAssistant("Планировщик готов")');
  const clickAuto=()=>sidebar.executeJavaScript('document.getElementById("auto-plan-toggle").click()');
  const buttonReady=()=>sidebar.executeJavaScript('!document.getElementById("auto-plan-toggle").disabled');
  await wait(buttonReady,'empty-project button ready');await clickAuto();
  await wait(()=>snapshot().autoPlan.enabled===true,'button enables before first plan');
  assert.equal(await sidebar.executeJavaScript('document.getElementById("auto-plan-toggle").getAttribute("aria-pressed")'),'true');
  assert.equal(snapshot().execution.assignments.length,0,'no assignment without a published plan');
  const otherRoot=(await run('--create',path.join(dataDir+'-projects','project-controls'))).root;
  await selectWorkspace(otherRoot);
  await wait(()=>store.selected()?.workspace===otherRoot&&snapshot().context.phase==='delivered','second project context');
  assert.equal(snapshot().autoPlan.enabled,false);assert.equal(snapshot().planReview.enabled,false);
  await wait(()=>sidebar.executeJavaScript('!document.getElementById("plan-review-toggle").disabled'),'second Review button ready');
  await sidebar.executeJavaScript('document.getElementById("plan-review-toggle").click()');
  await wait(()=>snapshot().planReview.enabled===true,'second project Review ON');
  assert.equal(snapshot().autoPlan.enabled,false,'Review does not enable AutoPlan');
  await ipc('selectSession',root,origin.sessionId);
  await wait(()=>snapshot().selected?.workspace===root&&snapshot().autoPlan.enabled,'return to first project ON');
  assert.equal(snapshot().planReview.enabled,false,'second project Review does not affect first');
  await wait(()=>sidebar.executeJavaScript('document.getElementById("auto-plan-toggle").getAttribute("aria-pressed")==="true"&&document.getElementById("plan-review-toggle").getAttribute("aria-pressed")==="false"'),'first project independent buttons');
  await wait(buttonReady,'cancel pre-plan button ready');await clickAuto();
  await wait(()=>snapshot().autoPlan.enabled===false,'button cancels pre-plan ON');
  await main.view.webContents.executeJavaScript('const h=document.createElement("button");h.id="preplan-held";h.dataset.testid="stop-button";document.body.append(h)');
  await wait(()=>main.pageState.current?.state.busy,'main held before publication');
  await wait(buttonReady,'arm pre-plan button ready');await clickAuto();
  await wait(()=>snapshot().autoPlan.enabled===true,'button arms first publication');
  await run('--plan',root,origin.sessionId);
  const base=await git(root,'rev-parse','HEAD');
  await run('--legacy-start',root);
  await main.view.webContents.executeJavaScript('document.getElementById("preplan-held")?.remove()');
  await wait(()=>main.pageState.current?.state.lastMessageRole==='assistant','main observed pause');
  await ipc('openSettings');await ipc('setParallelExecution',{parallel_allowed:false,max_workers:1});await ipc('closeSettings');
  assert.deepEqual(store.project(root,origin.sessionId).executionSnapshot,{parallel_allowed:true,max_workers:2});
  assert.equal(snapshot().autoPlan.enabled,true,'pre-plan ON binds to published scope');
  await wait(()=>snapshot().execution.assignments.length===2,'two assigned worktrees');
  let assignments=snapshot().execution.assignments;
  const a=assignments.find(a=>a.parent_task_id==='T001'),b=assignments.find(a=>a.parent_task_id==='T002');
  assert.ok(a&&b);assert.notEqual(a.worktree,b.worktree);
  await wait(()=>[a,b].every(a=>store.project(a.worktree)?.chatUrl&&record(a.worktree)?.controller.state.phase==='delivered'),'independent delivered chats');
  const first=record(a.worktree),second=record(b.worktree);
  assert.equal(await fs.readFile(path.join(a.worktree,'README.md'),'utf8'),'# worker-a\n','legacy main work transferred without loss');
  assert.equal(await git(root,'status','--porcelain'),'','legacy main restored clean');
  for(const item of [a,b]) {
    assert.equal(await fs.stat(path.join(item.worktree,'node_modules')).then(s=>s.isDirectory()),true);
    assert.deepEqual(store.project(item.worktree).executionSnapshot,origin.executionSnapshot);
  }
  const hold=record=>record.view.webContents.executeJavaScript('if(!document.getElementById("parallel-held")){const b=document.createElement("button");b.id="parallel-held";b.dataset.testid="stop-button";b.setAttribute("aria-label","Stop generating");document.body.append(b);}window.parallelMarker=71;');
  const finish=record=>record.view.webContents.executeJavaScript('document.getElementById("parallel-held")?.remove();window.fixtureAssistant("Задача завершена")');
  await hold(first);await hold(second);
  await wait(()=>first.pageState.current?.state.busy&&second.pageState.current?.state.busy,'both workers busy');
  await ipc('setAutoPlan',false);
  await ipc('selectSession',a.worktree,store.project(a.worktree).sessionId);
  await ipc('selectSession',b.worktree,store.project(b.worktree).sessionId);
  assert.equal(first.pageState.current.state.busy,true);
  await ipc('selectSession',a.worktree,store.project(a.worktree).sessionId);
  assert.equal(await first.view.webContents.executeJavaScript('window.parallelMarker'),71);
  await wait(()=>sidebar.executeJavaScript('document.getElementById("plan-card").hidden&&!document.getElementById("assignment-card").hidden'),'executor shows only assignment');
  assert.equal(await sidebar.executeJavaScript('document.getElementById("correct-integration")'),null);
  await ipc('selectSession',root,origin.sessionId);
  await wait(()=>sidebar.executeJavaScript('!document.getElementById("plan-card").hidden&&document.querySelectorAll(".plan-task[data-status=current]").length===2'),'main shows both assigned tasks');
  assert.equal(await git(root,'rev-parse','HEAD'),base);
  await run('--complete',a.worktree);await run('--complete',b.worktree);
  assert.equal(await git(root,'rev-parse','HEAD'),base,'local commits do not change main');
  assert.equal(await fs.readFile(path.join(root,'README.md'),'utf8'),'# Original\n');
  await run('--conflict',root);
  const fullPath=workspaceSetup.environment.PATH;
  workspaceSetup.setRuntimeEnvironment({PATH:'/usr/bin:/bin'});
  await workspaceSetup.node();
  assert.equal(workspaceSetup.environment.PATH.split(':')[0],path.dirname(node));
  await finish(first);
  await wait(()=>snapshot().execution.integration?.status==='CONFLICT','merge conflict retained in main');
  assert.equal(snapshot().execution.planView.completed,0);
  assert.equal(second.pageState.current.state.busy,true,'independent worker keeps its page during main conflict');
  const operation=snapshot().execution.integration.operation_id;
  const before=await main.view.webContents.executeJavaScript('window.fixtureMessages.length');
  assert.equal(snapshot().execution.correctionStatus,null,'OFF does not request correction');
  await ipc('setAutoPlan',true);
  await wait(()=>snapshot().execution.correctionStatus==='sent','AutoPlan requests correction without an extra button');
  await wait(async()=>await main.view.webContents.executeJavaScript('window.fixtureMessages.length')===before+1,'correction in exact main chat');
  const message=await main.view.webContents.executeJavaScript('window.fixtureMessages.at(-1).text');
  assert.ok(message.includes(root)&&message.includes(operation)&&message.includes('integration:continue'));
  await ipc('setAutoPlan',false);
  assert.equal(await main.view.webContents.executeJavaScript('window.fixtureMessages.length'),before+1,'no duplicate correction');
  await run('--correct',root,operation);await finish(main);
  await wait(()=>snapshot().execution.assignments.find(x=>x.id===a.id)?.status==='INTEGRATED','corrected merge proof');
  await finish(second);
  await wait(()=>snapshot().execution.planView.completed===2,'second integration');
  assert.equal(snapshot().execution.assignments.length,2,'AutoPlan OFF does not dispatch the dependent task');
  const combined=await git(root,'rev-parse','HEAD');
  workspaceSetup.setRuntimeEnvironment({PATH:fullPath});
  await workspaceSetup.node();
  assert.equal((await ipc('setAutoPlan',true)).ok,true);
  await wait(()=>snapshot().execution.assignments.length===3,'AutoPlan resumes dependent task');
  const c=snapshot().execution.assignments.find(x=>x.parent_task_id==='T003');assert.equal(c.base_commit,combined);
  assert.match(await fs.readFile(path.join(c.worktree,'README.md'),'utf8'),/worker-a/);
  assert.match(await fs.readFile(path.join(c.worktree,'SECOND.md'),'utf8'),/worker-b/);
  await wait(()=>record(c.worktree)?.controller.state.phase==='delivered','dependent context delivered');
  const third=record(c.worktree);await hold(third);await run('--complete',c.worktree);await finish(third);
  await wait(()=>snapshot().execution.finalizationStatus==='sent','last READY hands completion to main');
  const finalMessage=await main.view.webContents.executeJavaScript('window.fixtureMessages.at(-1).text');
  assert.ok(finalMessage.includes(root)&&finalMessage.includes('integration:start/continue'));
  const ready=await plans.call(root,'assignment:status',['--id',c.id]);
  await hold(main);
  await plans.call(root,'integration:start',[],{id:c.id,source_commit:ready.source_commit});
  await finish(main);
  await wait(()=>snapshot().execution.phase==='complete','three verified integrations');
  assert.equal(snapshot().execution.finalizationStatus,'reply-observed');
  assert.equal(await git(root,'rev-list','--count','--merges',base+'..HEAD'),'3');
  for(const theme of ['dark','light']) {
    await ipc('setTheme',theme);
    const ui=await sidebar.executeJavaScript('({rows:document.querySelectorAll(".executor-row").length,text:document.querySelector(".executor-group")?.textContent,removed:!document.getElementById("reconcile-execution")&&!document.getElementById("execute-tasks")&&!document.getElementById("correct-integration")})');
    assert.equal(ui.rows,3);assert.match(ui.text,/Завершено · интеграция проверена/);assert.match(ui.text,/Работа/);assert.equal(ui.removed,true);
  }
  assert.equal(snapshot().execution.planView.completed,3);assert.equal(snapshot().autoPlan.enabled,false,'verified parallel completion turns project OFF');
  // Delete through the same archive preload/IPC used by the user, including all worker trees.
  const oldProjectId=origin.projectId,oldIds=assignments.map(a=>a.id).concat(c.id);
  const otherBefore=JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8')).projectAutoPlan[otherRoot];
  assert.equal((await ipc('archiveProject',root)).ok,true);
  assert.equal((await ipc('openArchive',root)).ok,true);
  await wait(()=>getArchiveWindow()&&!getArchiveWindow().isDestroyed(),'deletion archive ready');
  const archive=getArchiveWindow().webContents;
  await wait(()=>archive.executeJavaScript('typeof window.webPilotArchive==="object"'),'deletion preload');
  const archived=store.project(root),item={workspace:root,projectId:oldProjectId};
  const preview=await archive.executeJavaScript('window.webPilotArchive.previewDelete('+JSON.stringify(item)+')');
  assert.equal(preview.ok,true,JSON.stringify(preview));
  const deletion=await archive.executeJavaScript('window.webPilotArchive.deleteProject('+JSON.stringify(preview.result.token)+','+JSON.stringify(archived.name)+')');
  assert.equal(deletion.ok,true,JSON.stringify(deletion));
  await wait(()=>!store.project(root),'project removed from store');
  await assert.rejects(fs.stat(root),{code:'ENOENT'});
  for(const a of [assignments[0],assignments[1],c]) {
    await assert.rejects(fs.stat(a.worktree),{code:'ENOENT'});assert.equal(store.project(a.worktree),null);assert.equal(record(a.worktree),undefined);
  }
  assert.equal(record(root),undefined);
  const settingsAfter=JSON.parse(await fs.readFile(path.join(dataDir,'settings.json'),'utf8'));
  assert.equal(settingsAfter.projectAutoPlan[root],undefined);
  assert.equal(Object.values(settingsAfter.parallelExecutionBook).some(b=>b.workspace===root),false);
  assert.deepEqual(settingsAfter.projectAutoPlan[otherRoot],otherBefore);
  const {belongsToProject}=await import('../src/project-state-cleanup.mjs');
  assert.equal(belongsToProject(settingsAfter,[{workspace:root,projectId:oldProjectId,sessionIds:[origin.sessionId]}]),false);
  getArchiveWindow().close();
  // Same folder name and same scope, different identity: no inherited grant or old assignment.
  await ipc('openSettings');await ipc('setParallelExecution',{parallel_allowed:true,max_workers:3});await ipc('closeSettings');
  const recreated=(await run('--create',path.dirname(root))).root;assert.equal(recreated,root);
  await selectWorkspace(root);
  await wait(()=>store.selected()?.workspace===root&&snapshot().context.phase==='delivered','recreated main context');
  const newOrigin=store.selected();assert.notEqual(newOrigin.projectId,oldProjectId);assert.equal(snapshot().autoPlan.enabled,false);
  const newMain=record(root,newOrigin.sessionId);await newMain.view.webContents.executeJavaScript('window.fixtureAssistant("Новый план готов")');
  await run('--plan-five',root,newOrigin.sessionId);
  await wait(()=>snapshot().selected?.scopeId==='parallel-fixture','same scope republished');
  assert.equal(snapshot().autoPlan.enabled,false);assert.equal(snapshot().execution.assignments.length,0);
const httpPreview=await require('./protected-preview-fixture.cjs').start(root,path.join(dataDir,'preview-state'));
  try {
    if(httpPreview) {
      assert.equal(httpPreview.writeDenied,true);
      assert.equal((await fetch(httpPreview.url+'/RESULT.md')).status,200);
    }
    assert.equal((await ipc('setAutoPlan',true)).ok,true);
    await wait(()=>snapshot().execution.assignments.length===1,'exclusive foundation gets one assignment');
    const foundation=snapshot().execution.assignments[0];
    assert.equal(foundation.parent_task_id,'T001');assert.ok(!oldIds.includes(foundation.id));
    await wait(()=>record(foundation.worktree)?.controller.state.phase==='delivered','foundation delivered');
    await hold(record(foundation.worktree));await run('--complete',foundation.worktree);await finish(record(foundation.worktree));
    await wait(()=>snapshot().execution.assignments.length===4,'three independent tools start after foundation');
    const tools=snapshot().execution.assignments.filter(a=>a.parent_task_id!=='T001');
    assert.deepEqual(tools.map(a=>a.parent_task_id).sort(),['T002','T003','T004']);
    assert.equal(new Set(tools.map(a=>a.base_commit)).size,1);
    await wait(()=>tools.every(a=>record(a.worktree)?.controller.state.phase==='delivered'),'three tools delivered');
    for(const a of tools) {
      assert.match(await fs.readFile(path.join(a.worktree,'FOUNDATION.md'),'utf8'),/worker-a/);
      assert.equal(store.project(a.worktree).parentProjectId,newOrigin.projectId);
      await hold(record(a.worktree));
    }
    for(const a of tools){await run('--complete',a.worktree);await finish(record(a.worktree));}
    await wait(()=>snapshot().execution.assignments.length===5,'final task waits for all verified dependencies');
    const last=snapshot().execution.assignments.find(a=>a.parent_task_id==='T005');
    await wait(()=>record(last.worktree)?.controller.state.phase==='delivered','final task delivered');
    for(const file of ['FOUNDATION.md','TOOL-A.md','TOOL-B.md','TOOL-C.md'])
      assert.match(await fs.readFile(path.join(last.worktree,file),'utf8'),/worker-/);
    const beforeFinal=await newMain.view.webContents.executeJavaScript('window.fixtureMessages.length');
    await hold(record(last.worktree));
    await run('--complete',last.worktree);
    const lastSource=await plans.call(root,'assignment:status',['--id',last.id]);
    assert.equal(lastSource.status,'READY_FOR_INTEGRATION');
    const headBeforeLast=await git(root,'rev-parse','HEAD');
    let f03Writer;
    try {
      // Characterize the ORIGINAL F03: a real writable server appears only
      // after the final worker source commit, before the worker's last reply.
      f03Writer=await module.exports.startFixtureWriter(last.worktree,node);
      assert.equal((await fetch(f03Writer.url+'/write',{method:'POST'})).status,200);
      await finish(record(last.worktree));
      await wait(()=>snapshot().execution.assignments.some(a=>a.id===last.id
        &&a.status==='READY_FOR_INTEGRATION'&&a.commandActive),'last source held by real writer');
      await wait(()=>snapshot().execution.diagnosticStatus==='sent','blocked F03 delivers a read-only diagnostic');
      await ipc('setSidebarWidth',312);
      await wait(()=>snapshot().sidebarWidth===312,'minimum width for final-stage UI');
      for(const theme of ['light','dark']) {
        await ipc('setTheme',theme);
        await wait(async()=>(await stageSnapshot()).theme===theme,'final-stage theme '+theme);
        const stages=await stageSnapshot();
        assert.equal(stages.hidden,false);assert.equal(stages.width,312);
        assert.equal(stages.overflow,false,'status and operation paths wrap within the minimum sidebar');
        assert.equal(stages.aria,'Проверяемые этапы завершения');assert.equal(stages.role,'status');
        assert.equal(stages.focusable,true);
        assert.equal(stages.stages.source.status,'ready');assert.equal(stages.stages.main.status,'blocked');
        assert.equal(stages.stages.diagnostic.status,'sent');assert.equal(stages.stages.reply.status,'waiting');
        assert.match(stages.action,new RegExp(f03Writer.id));
        assert.match(stages.action,/Не останавливайте сервер/);
      }
      await ipc('setTheme','light');
      assert.equal(snapshot().execution.finalizationStatus==='sent',false,'diagnostic does not transfer final ownership');
      assert.equal(await newMain.view.webContents.executeJavaScript('window.fixtureMessages.length'),beforeFinal+1,
        'one diagnostic Send while writable command is active');
      const diagnosticText=await newMain.view.webContents.executeJavaScript('window.fixtureMessages.at(-1).text');
      assert.match(diagnosticText,/ЗАПРЕЩЕНО выполнять integration:start\/continue/);
      assert.equal(snapshot().execution.planView.completed,4,'last task not integrated');
      assert.equal(await git(root,'rev-parse','HEAD'),headBeforeLast,'main unchanged while writer lives');
      assert.equal((await plans.call(root,'assignment:status',['--id',last.id])).source_commit,lastSource.source_commit);
      await hold(newMain);await wait(()=>newMain.pageState.current?.state.busy,'diagnostic response is read-only');
      await f03Writer.stop();f03Writer=null;
      assert.equal(await git(root,'rev-parse','HEAD'),headBeforeLast,'main still owned by the queue before diagnostic reply');
      await finish(newMain);
      await wait(()=>snapshot().execution.diagnosticStatus==='reply-observed','diagnostic reply observed');
    }finally{if(f03Writer)await f03Writer.stop();}
    await wait(()=>snapshot().execution.planView.completed===5,'queue alone integrates source after diagnostic');
    await wait(()=>snapshot().execution.finalizationStatus==='sent','one final Send after main integration');
    const sentStages=await stageSnapshot();
    assert.equal(sentStages.stages.main.status,'done','only verified main is marked DONE');
    assert.equal(sentStages.stages.final.status,'sent');assert.equal(sentStages.stages.reply.status,'waiting');
    if(httpPreview) {
      assert.match(await (await fetch(httpPreview.url+'/RESULT.md')).text(),/worker-e/,'protected main preview reflects verified integration');
      const {readCommandActivity}=await import('../src/command-activity.mjs');
      const activity=await readCommandActivity(root);
      assert.equal(activity.commandActive,false);assert.equal(activity.deletionBlocked,true);
      assert.ok(activity.commands.some(c=>c.readOnly));
    }
    await hold(newMain);await wait(()=>newMain.pageState.current?.state.busy,'primary final verification running');
    const validation=await plans.call(root,'validate');assert.equal(Object.keys(validation.resolved).length,5);
    if(httpPreview)assert.match(await (await fetch(httpPreview.url+'/RESULT.md')).text(),/worker-e/);
    const report='Пять задач проверены в общем main. '+root+(httpPreview?' · '+httpPreview.url:'')+'. TEST FIXTURE; приёмку выполняет пользователь.';
    await newMain.view.webContents.executeJavaScript('document.getElementById("parallel-held")?.remove();window.fixtureAssistant('+JSON.stringify(report)+')');
    await wait(()=>snapshot().execution.finalizationStatus==='reply-observed'&&!snapshot().autoPlan.enabled,'one final report and completion OFF');
    const completedStages=await stageSnapshot();
    assert.equal(completedStages.stages.reply.status,'done');
    assert.match(completedStages.action,/приёмка пользователя/);
    assert.equal(await newMain.view.webContents.executeJavaScript('window.fixtureMessages.length'),beforeFinal+2);
    await ipc('selectSession',otherRoot,store.project(otherRoot).sessionId);await ipc('selectSession',root,newOrigin.sessionId);
    assert.equal(await newMain.view.webContents.executeJavaScript('window.fixtureMessages.length'),beforeFinal+2,'project switching cannot repeat diagnostic or final handoff');
    // A live read-only httpPreview blocks deletion. Stopping its exact session permits a new confirmation.
    await ipc('archiveProject',root);await ipc('openArchive',root);
    await wait(()=>getArchiveWindow()&&!getArchiveWindow().isDestroyed(),'five-task archive ready');
    const archive=getArchiveWindow().webContents;
    await wait(()=>archive.executeJavaScript('typeof window.webPilotArchive==="object"'),'five-task archive preload');
    const item={workspace:root,projectId:newOrigin.projectId};
    const inspect=()=>archive.executeJavaScript('window.webPilotArchive.previewDelete('+JSON.stringify(item)+')');
    const remove=httpPreview=>archive.executeJavaScript('window.webPilotArchive.deleteProject('+JSON.stringify(httpPreview.result.token)+','+JSON.stringify(store.project(root).name)+')');
    if(httpPreview) {
      const ticket=await inspect();assert.equal(ticket.ok,true);
      const blocked=await remove(ticket);assert.equal(blocked.ok,false);assert.equal(blocked.error.code,'DELETE_PROJECT_BUSY');
      assert.ok(store.project(root));await httpPreview.stop();
    }
    const ticket=await inspect();assert.equal(ticket.ok,true,JSON.stringify(ticket));
    const deleted=await remove(ticket);assert.equal(deleted.ok,true,JSON.stringify(deleted));
    assert.equal(store.project(root),null);assert.ok(store.project(otherRoot));
    for(const a of [foundation,...tools,last])assert.equal(store.project(a.worktree),null);
    getArchiveWindow().close();
  }finally{if(httpPreview)await httpPreview.stop();}
  await fs.writeFile(path.join(dataDir,'parallel-execution-result.json'),JSON.stringify({mode:'isolated-fixture',realIpc:true,
    realDependency:true,workers:8,fiveTaskDependencyChain:true,readOnlyHttp:!!httpPreview,oneFinalReport:true,
    independentPages:true,conflictCorrectionMainChat:true,mergeCommits:8,fullProjectDeletion:true,recreatedProjectFreshAssignments:true,liveChatGPT:false,nativeWindows:false,cleanOS:false},null,2));
  return true;
};
