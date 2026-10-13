import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { installer, sessionPlans, plan as planApi, VERSION, getRuntimeRoot } from '@webpilot/workflow-kit';

function run(executable, args, cwd) {
  return execFileSync(executable, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function git(root, ...args) {
  return run('git', args, root);
}

async function filesBelow(directory, prefix = '') {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) result.push(...await filesBelow(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

async function digestFiles(root, files) {
  const digest = createHash('sha256');
  for (const file of files) {
    const text = (await fs.readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    digest.update(file + '\0' + text + '\0');
  }
  return digest.digest('hex');
}

function workflow(root, ...args) {
  const output = run(process.execPath, [path.join(root, 'scripts/workflow.mjs'), ...args], root);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true, 'Workflow command failed: ' + output);
  return parsed;
}

function gitFailure(root, ...args) {
  try { run('git', args, root); }
  catch (error) { return String(error.stdout || '') + String(error.stderr || ''); }
  assert.fail('git ' + args.join(' ') + ' unexpectedly succeeded');
}

function workflowFailure(root, ...args) {
  try {
    const output = run(process.execPath, [path.join(root, 'scripts/workflow.mjs'), ...args], root);
    const parsed = JSON.parse(output);
    assert.equal(parsed.ok, false, 'Workflow command unexpectedly succeeded: ' + output);
    return parsed;
  } catch (error) {
    const output = String(error.stdout || error.stderr || '').trim();
    const parsed = JSON.parse(output);
    assert.equal(parsed.ok, false, 'Workflow command unexpectedly succeeded: ' + output);
    return parsed;
  }
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-package-'));
try {
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'Workflow Kit Test');
  git(root, 'config', 'user.email', 'workflow-kit@test.local');
  await fs.mkdir(path.join(root, 'docs/planning'), { recursive: true });
  await fs.writeFile(path.join(root, 'docs/planning/fixture.md'), '# Fixture plan\n\nRuntime package verification fixture.\n');
  await fs.writeFile(path.join(root, 'README.md'), '# Fixture\n');
  git(root, 'add', 'README.md', 'docs/planning/fixture.md');
  git(root, 'commit', '-m', 'test: fixture baseline');

  const installed = installer.install({ project: root, mode: 'existing' });
  assert.equal(installed.ok, true);
  assert.equal(installed.version, VERSION);

  const manifest = JSON.parse(await fs.readFile(path.join(root, '.harness/kit-manifest.json'), 'utf8'));
  assert.equal(manifest.version, VERSION);

  const runtimeRoot = path.join(root, '.harness/kit');
  const runtimeFiles = await filesBelow(runtimeRoot);
  const runtimeSha256 = await digestFiles(runtimeRoot, runtimeFiles);
  // The installed copy is the package source, file for file.
  const sourceFiles = await filesBelow(getRuntimeRoot());
  assert.deepEqual(runtimeFiles, sourceFiles);
  assert.equal(runtimeSha256, await digestFiles(getRuntimeRoot(), sourceFiles));

  const inspected = installer.inspect({ project: root, mode: 'existing' });
  assert.equal(inspected.installed, true);
  assert.equal(inspected.compatible, true);
  assert.equal(inspected.conflicts.length, 0);

  const headBeforeReconnect = git(root, 'rev-parse', 'HEAD');
  const reconnected = installer.install({ project: root, mode: 'existing', update: true });
  assert.equal(reconnected.ok, true);
  assert.equal(git(root, 'rev-parse', 'HEAD'), headBeforeReconnect, 'same-version reconnect unexpectedly committed changes');

  const planInput = {
    id: 'fixture-current-plan',
    spec: 'docs/planning/fixture.md',
    objective: 'Verify checkout-scoped current plan and recovery through installed runtime',
    tasks: [{
      id: 'T001',
      title: 'Fixture task',
      files: ['README.md'],
      acceptance: ['Installed runtime uses one current checkout plan']
    }]
  };
  const inputFile = path.join(root, '.harness/runtime/fixture-plan.json');
  await fs.mkdir(path.dirname(inputFile), { recursive: true });
  await fs.writeFile(inputFile, JSON.stringify(planInput));

  const created = workflow(root, 'plan:create', '--input', inputFile);
  assert.equal(created.state?.scope_id, 'fixture-current-plan');

  const status = workflow(root, 'status');
  assert.equal(status.scope_id, 'fixture-current-plan');
  assert.equal(status.recovery_completeness, 'COMPLETE');

  const recovered = workflow(root, 'recover', '--format', 'json');
  assert.equal(recovered.completeness, 'COMPLETE');
  assert.equal(recovered.plan_id, 'fixture-current-plan');
  assert.deepEqual(planApi.readPlan(root).tasks.map(task => task.id), ['T001'],
    'code-only plan does not create a release DOCS task');

  // Forms are on demand; legacy navigation maps are reference-only, never inlined sources.
  const sourceLabels = recovered.parts.flatMap(part => part.sources.map(source => source.source));
  assert.ok(sourceLabels.includes('.harness/kit/templates/PROTOTYPE.md'), 'source labels use the current format');
  assert.ok(!sourceLabels.some(label => /\.harness\/kit\/templates\/(PLAN|SPEC|CONTINUE|STAGES)\.md$/.test(label)));
  assert.ok(!sourceLabels.some(label => /docs\/(MODULES|DOCUMENTATION_INDEX)\.md$/.test(label)));
  assert.match(recovered.text, /ФОРМЫ ПО ЗАПРОСУ/);
  assert.ok(recovered.parts.length > 0);
  assert.ok(recovered.parts.every(part => part.bytes === Buffer.byteLength(part.text) && part.bytes <= 28000));
  assert.equal(recovered.parts.map(part => part.text).join('\n\n'), recovered.text);
  assert.equal(recovered.size.tokens, undefined);
  assert.equal(recovered.soft_exceeded, undefined);
  for (const line of ['plan:create --help', 'plan:extend --help', 'task:start --help'])
    assert.ok(recovered.text.includes(line), line);
  for (const form of ['PLAN', 'SPEC', 'CONTINUE', 'STAGES'])
    assert.ok(recovered.omitted.some(item => item.path === '.harness/kit/templates/' + form + '.md' && item.reason === 'ON_DEMAND'), form);
  assert.match(run(process.execPath, [path.join(root, 'scripts/workflow.mjs'), 'task:start', '--help'], root), /Формы проверки и документов/);
  assert.match(run(process.execPath, [path.join(root, 'scripts/workflow.mjs'), 'plan:create', '--help'], root), /Короткий контракт результата/);

  // project:rename: the project name in plan/recovery and manifest hook paths change
  // through one service commit; repeat is a no-op; invalid name and active task are refused.
  const renameRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-rename-'));
  try {
    git(renameRoot, 'init', '-b', 'main');
    git(renameRoot, 'config', 'user.name', 'Workflow Kit Rename Test');
    git(renameRoot, 'config', 'user.email', 'workflow-kit-rename@test.local');
    await fs.mkdir(path.join(renameRoot, 'docs/planning'), { recursive: true });
    await fs.writeFile(path.join(renameRoot, 'docs/planning/fixture.md'), '# Rename fixture\n');
    await fs.writeFile(path.join(renameRoot, 'README.md'), '# Rename fixture\n');
    git(renameRoot, 'add', 'README.md', 'docs/planning/fixture.md');
    git(renameRoot, 'commit', '-m', 'test: rename fixture baseline');
    installer.install({ project: renameRoot, mode: 'existing' });
    const renameInput = path.join(renameRoot, '.harness/runtime/rename-plan.json');
    await fs.writeFile(renameInput, JSON.stringify({ ...planInput, id: 'rename-plan' }));
    workflow(renameRoot, 'plan:create', '--input', renameInput);

    // A moved folder leaves old absolute hook paths in the manifest.
    const renameManifestFile = path.join(renameRoot, '.harness/kit-manifest.json');
    const movedManifest = JSON.parse(await fs.readFile(renameManifestFile, 'utf8'));
    const movedHooks = movedManifest.files.filter(entry => entry.external && entry.kind === 'git-hook');
    assert.ok(movedHooks.length > 0, 'manifest has no git-hook entries');
    for (const entry of movedHooks) entry.path = '/old/location/.git/hooks/' + path.basename(entry.path);
    await fs.writeFile(renameManifestFile, JSON.stringify(movedManifest, null, 2) + '\n');
    git(renameRoot, 'add', '.harness/kit-manifest.json');
    git(renameRoot, 'commit', '--no-verify', '-m', 'test: simulate moved project folder');

    const beforeRename = workflow(renameRoot, 'status');
    const renamed = workflow(renameRoot, 'project:rename', '--name', 'renamed-project', '--expected-revision', String(beforeRename.plan_revision));
    assert.equal(renamed.changed, true);
    assert.equal(renamed.project_name, 'renamed-project');
    assert.equal(planApi.readPlan(renameRoot).project_name, 'renamed-project');
    assert.ok((await fs.readFile(path.join(renameRoot, '.harness/plans/todo-plan.md'), 'utf8')).startsWith('# Активный план — renamed-project\n'));
    const renamedManifest = JSON.parse(await fs.readFile(renameManifestFile, 'utf8'));
    for (const entry of renamedManifest.files.filter(item => item.external && item.kind === 'git-hook')) {
      assert.ok(!entry.path.startsWith('/old/location/'), 'stale hook path kept: ' + entry.path);
      assert.ok(entry.path.replaceAll('\\', '/').endsWith('/.git/hooks/' + path.basename(entry.path)), 'unexpected hook path: ' + entry.path);
    }
    assert.equal(git(renameRoot, 'log', '-1', '--format=%s'), 'chore: переименовать проект в renamed-project');
    assert.equal(git(renameRoot, 'status', '--porcelain'), '', 'rename left uncommitted changes');
    const afterRename = workflow(renameRoot, 'status');
    assert.equal(afterRename.project_name, 'renamed-project');
    assert.equal(afterRename.recovery_completeness, 'COMPLETE');

    const headAfterRename = git(renameRoot, 'rev-parse', 'HEAD');
    const repeated = workflow(renameRoot, 'project:rename', '--name', 'renamed-project', '--expected-revision', String(afterRename.plan_revision));
    assert.equal(repeated.changed, false);
    assert.equal(git(renameRoot, 'rev-parse', 'HEAD'), headAfterRename, 'repeated rename committed changes');

    const invalid = workflowFailure(renameRoot, 'project:rename', '--name', '   ', '--expected-revision', String(afterRename.plan_revision));
    assert.equal(invalid.code, 'PROJECT_NAME');
    workflow(renameRoot, 'task:start', 'T001');
    const active = workflowFailure(renameRoot, 'project:rename', '--name', 'other-name', '--expected-revision', String(workflow(renameRoot, 'status').plan_revision));
    assert.equal(active.code, 'TASK_ACTIVE');
    assert.equal(planApi.readPlan(renameRoot).project_name, 'renamed-project');
    assert.equal(git(renameRoot, 'rev-parse', 'HEAD'), headAfterRename, 'refused rename committed changes');
  } finally {
    await fs.rm(renameRoot, { recursive: true, force: true });
  }

  // Delivery ordering: ordinary work -> DOCS -> package/installed tail.
  // Extending a plan must keep that order and reopen DOCS when new code work
  // appears after documentation was already completed but delivery is pending.
  const deliveryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-delivery-order-'));
  try {
    git(deliveryRoot, 'init', '-b', 'main');
    git(deliveryRoot, 'config', 'user.name', 'Workflow Kit Delivery Test');
    git(deliveryRoot, 'config', 'user.email', 'workflow-kit-delivery@test.local');
    await fs.mkdir(path.join(deliveryRoot, 'docs/planning'), { recursive: true });
    await fs.writeFile(path.join(deliveryRoot, 'docs/planning/fixture.md'), '# Delivery fixture\n');
    await fs.writeFile(path.join(deliveryRoot, 'README.md'), '# Delivery fixture\n');
    git(deliveryRoot, 'add', 'README.md', 'docs/planning/fixture.md');
    git(deliveryRoot, 'commit', '-m', 'test: delivery fixture baseline');
    installer.install({ project: deliveryRoot, mode: 'existing' });
    // 1.5.5: a local bare remote checks that the managed pre-push hook waits for DOCS.
    const remote = deliveryRoot + '-remote.git';
    run('git', ['init', '--bare', '-q', remote], deliveryRoot);
    git(deliveryRoot, 'remote', 'add', 'origin', remote);

    const deliveryInput = path.join(deliveryRoot, '.harness/runtime/delivery-plan.json');
    await fs.writeFile(deliveryInput, JSON.stringify({
      id: 'fixture-delivery-order',
      spec: 'docs/planning/fixture.md',
      objective: 'Verify documentation before delivery tail',
      stack: 'Node.js',
      checks: [
        { id: 'code', executable: process.execPath, args: ['-e', 'process.exit(0)'], kind: 'test' },
        { id: 'artifact', executable: process.execPath, args: ['-e', 'process.exit(0)'], kind: 'package',
          evidence: 'fixture package; zero-exit command represents artifact verification' }
      ],
      tasks: [
        { id: 'T001', title: 'Implement fixture', files: ['README.md'], checks: ['code'],
          acceptance: ['Fixture implementation is ready'] },
        { id: 'T002', title: 'Package fixture', files: ['README.md'], checks: ['artifact'],
          verification_kind: 'package', acceptance: ['Fixture package is verified'] }
      ]
    }));
    workflow(deliveryRoot, 'plan:create', '--input', deliveryInput);

    let deliveryPlan = planApi.readPlan(deliveryRoot);
    assert.deepEqual(deliveryPlan.tasks.map(task => task.id), ['T001', 'DOCS', 'T002']);
    assert.deepEqual(deliveryPlan.tasks.find(task => task.id === 'DOCS').dependencies, ['T001']);
    assert.ok(deliveryPlan.tasks.find(task => task.id === 'T002').dependencies.includes('DOCS'));

    const extendInput = path.join(deliveryRoot, '.harness/runtime/delivery-extend.json');
    await fs.writeFile(extendInput, JSON.stringify({ tasks: [{
      id: 'T003', title: 'Correct fixture', files: ['README.md'], checks: ['code'],
      acceptance: ['Correction is applied']
    }] }));
    workflow(deliveryRoot, 'plan:extend', '--input', extendInput, '--expected-revision',
      String(workflow(deliveryRoot, 'status').plan_revision));
    deliveryPlan = planApi.readPlan(deliveryRoot);
    assert.deepEqual(deliveryPlan.tasks.map(task => task.id), ['T001', 'T003', 'DOCS', 'T002']);
    assert.deepEqual(deliveryPlan.tasks.find(task => task.id === 'DOCS').dependencies, ['T001', 'T003']);
    assert.ok(deliveryPlan.tasks.find(task => task.id === 'T002').dependencies.includes('DOCS'));

    workflow(deliveryRoot, 'task:start', 'T001');
    await fs.appendFile(path.join(deliveryRoot, 'README.md'), 'implementation\n');
    workflow(deliveryRoot, 'commit', '--task', 'T001');
    workflow(deliveryRoot, 'task:start', 'T003');
    await fs.appendFile(path.join(deliveryRoot, 'README.md'), 'correction\n');
    workflow(deliveryRoot, 'commit', '--task', 'T003');
    assert.match(gitFailure(deliveryRoot, 'push', '-q', 'origin', 'main'), /DOCS_BEFORE_PUSH/, 'push before DOCS must be refused');
    workflow(deliveryRoot, 'task:start', 'DOCS');
    workflow(deliveryRoot, 'commit', '--task', 'DOCS');
    git(deliveryRoot, 'push', '-q', 'origin', 'main');
    assert.equal(git(remote, 'rev-parse', 'main'), git(deliveryRoot, 'rev-parse', 'HEAD'), 'push after DOCS reaches the remote');

    const secondExtend = path.join(deliveryRoot, '.harness/runtime/delivery-second-extend.json');
    await fs.writeFile(secondExtend, JSON.stringify({ tasks: [{
      id: 'T004', title: 'Late correction', files: ['README.md'], checks: ['code'],
      acceptance: ['Late correction is applied']
    }] }));
    workflow(deliveryRoot, 'plan:extend', '--input', secondExtend, '--expected-revision',
      String(workflow(deliveryRoot, 'status').plan_revision));
    deliveryPlan = planApi.readPlan(deliveryRoot);
    assert.deepEqual(deliveryPlan.tasks.map(task => task.id), ['T001', 'T003', 'DOCS', 'T004', 'DOCS-2', 'T002']);
    const reopenedDocs = deliveryPlan.tasks.find(task => task.id === 'DOCS-2');
    assert.equal(reopenedDocs.commit_status, 'PENDING');
    assert.equal(reopenedDocs.implementation_status, 'TODO');
    assert.equal(reopenedDocs.commit_ref.iteration, 2);
    assert.deepEqual(reopenedDocs.dependencies, ['T004']);
    assert.equal(workflow(deliveryRoot, 'recover', '--format', 'json').next_task_id, 'T004');
    assert.match(gitFailure(deliveryRoot, 'push', '-q', 'origin', 'main'), /DOCS_BEFORE_PUSH/, 'reopened DOCS blocks push again');
    for (const id of ['T004','DOCS-2','T002']) {
      workflow(deliveryRoot,'task:start',id);
      workflow(deliveryRoot,'commit','--task',id);
    }
    const completedRound = planApi.readPlan(deliveryRoot).tasks;
    assert.equal(workflow(deliveryRoot,'status').delivery_status,'READY_FOR_ACCEPTANCE');
    const extend = async tasks => {
      await fs.writeFile(secondExtend,JSON.stringify({tasks}));
      return workflow(deliveryRoot,'plan:extend','--input',secondExtend,'--expected-revision',String(planApi.readPlan(deliveryRoot).plan_revision));
    };
    await extend([{id:'T005',title:'Discuss next scope',files:['README.md'],checks:['code']}]);
    assert.deepEqual(planApi.readPlan(deliveryRoot).tasks.slice(0,completedRound.length),completedRound);
    assert.equal(planApi.readPlan(deliveryRoot).tasks.filter(planApi.isDocumentationFinalizationTask).length,2);
    assert.equal(workflow(deliveryRoot,'recover','--format','json').next_task_id,'T005');
    assert.equal(workflow(deliveryRoot,'status').delivery_status,'IN_PROGRESS');
    git(deliveryRoot,'push','-q','origin','main');
    workflow(deliveryRoot,'task:start','T005');workflow(deliveryRoot,'commit','--task','T005');
    await extend([{id:'T006',title:'New release',files:['README.md'],checks:['artifact'],verification_kind:'package'}]);
    const nextRound=planApi.readPlan(deliveryRoot);
    assert.deepEqual(nextRound.tasks.slice(0,completedRound.length),completedRound);
    assert.equal(nextRound.tasks.find(t=>t.id==='T002').dependencies.includes('DOCS-2'),true);
    assert.equal(nextRound.tasks.find(t=>t.id==='T002').dependencies.includes('DOCS-3'),false);
    assert.equal(workflow(deliveryRoot,'recover','--format','json').next_task_id,'DOCS-3');
    assert.match(gitFailure(deliveryRoot,'push','-q','origin','main'),/DOCS_BEFORE_PUSH/);
    workflow(deliveryRoot,'task:start','DOCS-3');workflow(deliveryRoot,'commit','--task','DOCS-3');
    workflow(deliveryRoot,'task:start','T006');workflow(deliveryRoot,'commit','--task','T006');
    workflow(deliveryRoot,'validate');git(deliveryRoot,'push','-q','origin','main');
    assert.equal(workflow(deliveryRoot,'status').delivery_status,'READY_FOR_ACCEPTANCE');
  } finally {
    await fs.rm(deliveryRoot, { recursive: true, force: true });
    await fs.rm(deliveryRoot + '-remote.git', { recursive: true, force: true });
  }

  // 1.5.6: plan:extend places a task before a not yet started one and adds dependencies; the plan order is the
  // execution order. Stat-only differences are not changes; a changed private path is excluded and reported.
  const orderRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-task-order-'));
  try {
    git(orderRoot, 'init', '-b', 'main');
    git(orderRoot, 'config', 'user.name', 'Workflow Kit Order Test');
    git(orderRoot, 'config', 'user.email', 'workflow-kit-order@test.local');
    await fs.mkdir(path.join(orderRoot, 'docs/planning'), { recursive: true });
    await fs.mkdir(path.join(orderRoot, 'config'));
    await fs.writeFile(path.join(orderRoot, 'docs/planning/fixture.md'), '# Order fixture\n');
    for (const name of ['README.md', 'a.txt', 'b.txt', 'config/credentials.json']) await fs.writeFile(path.join(orderRoot, name), name + '\n');
    git(orderRoot, 'add', '.');
    git(orderRoot, 'commit', '-m', 'test: order fixture baseline');
    installer.install({ project: orderRoot, mode: 'existing' });
    const orderFile = async (name, value) => {
      const file = path.join(orderRoot, '.harness/runtime', name + '.json');
      await fs.writeFile(file, JSON.stringify(value)); return file;
    };
    const revision = () => String(workflow(orderRoot, 'status').plan_revision);
    const ids = () => planApi.readPlan(orderRoot).tasks.map(task => task.id);
    const taskOf = id => planApi.readPlan(orderRoot).tasks.find(task => task.id === id);
    const extend = async value => workflow(orderRoot, 'plan:extend', '--input', await orderFile('extend', value), '--expected-revision', revision());
    const refuseExtend = async value => {
      const before = revision();
      const failure = workflowFailure(orderRoot, 'plan:extend', '--input', await orderFile('refused', value), '--expected-revision', before);
      assert.equal(revision(), before, 'a refused plan:extend leaves the plan unchanged');
      return failure;
    };
    workflow(orderRoot, 'plan:create', '--input', await orderFile('plan', {
      id: 'fixture-task-order', spec: 'docs/planning/fixture.md', objective: 'Verify task placement and content-based changes', stack: 'Node.js',
      checks: [{ id: 'code', executable: process.execPath, args: ['-e', 'process.exit(0)'], kind: 'test' },
        { id: 'artifact', executable: process.execPath, args: ['-e', 'process.exit(0)'], kind: 'package', evidence: 'fixture package' }],
      tasks: [{ id: 'T001', title: 'First', files: ['README.md'], checks: ['code'] },
        { id: 'T002', title: 'Second', files: ['a.txt'], checks: ['code'], dependencies: ['T001'] },
        { id: 'T003', title: 'Third', files: ['b.txt'], checks: ['code'] },
        { id: 'T900', title: 'Package', files: ['README.md'], checks: ['artifact'], verification_kind: 'package' }],
    }));
    assert.deepEqual(ids(), ['T001', 'T002', 'T003', 'DOCS', 'T900']);

    const extendHelp = run(process.execPath, [path.join(orderRoot, 'scripts/workflow.mjs'), 'plan:extend', '--help'], orderRoot);
    assert.match(extendHelp, /Поля задачи:/);
    for (const name of ['title', 'files', 'id', 'why', 'checks', 'dependencies', 'acceptance', 'commit', 'verification_kind', 'before'])
      assert.ok(extendHelp.includes(name), 'plan:extend --help names the task field ' + name);
    assert.match(extendHelp, /`spec` находится на верхнем уровне, не внутри задачи/);
    assert.match(extendHelp, /"before":"T003"/);
    assert.match(extendHelp, /"dependencies":\{"T004":\["T002"\]\}/);
    const specInside = await refuseExtend({ tasks: [{ title: 'Spec inside', files: ['a.txt'], spec: 'docs/planning/fixture.md' }] });
    assert.equal(specInside.code, 'PLAN_SCHEMA');
    assert.match(specInside.message, /spec указывается на верхнем уровне рядом с tasks/);
    const unknownField = await refuseExtend({ tasks: [{ title: 'Unknown', files: ['a.txt'], priority: 1 }] });
    assert.match(unknownField.message, /передавайте только id, title, why, files, checks, dependencies, acceptance, commit, verification_kind, before/);

    await extend({ tasks: [{ id: 'T001A', title: 'Inserted', files: ['a.txt'], checks: ['code'], before: 'T002' }],
      dependencies: { T003: ['T001A'] } });
    assert.deepEqual(ids(), ['T001', 'T001A', 'T002', 'T003', 'DOCS', 'T900'], 'the new task stands right before T002');
    assert.deepEqual(taskOf('T002').dependencies, ['T001', 'T001A'], 'T002 now waits for the inserted task');
    assert.deepEqual(taskOf('T003').dependencies, ['T001A'], 'dependencies of a not started task are added by the same command');
    assert.deepEqual(taskOf('DOCS').dependencies, ['T001', 'T001A', 'T002', 'T003']);
    assert.deepEqual(taskOf('T001').dependencies, []);

    workflow(orderRoot, 'task:start', 'T001');
    assert.equal((await refuseExtend({ tasks: [{ title: 'Before started', files: ['a.txt'], checks: ['code'], before: 'T001' }] })).code, 'TASK_ORDER');
    await fs.appendFile(path.join(orderRoot, 'README.md'), 'first\n');
    workflow(orderRoot, 'commit', '--task', 'T001');
    assert.equal(workflowFailure(orderRoot, 'task:start', 'T002').code, 'DEPENDENCY_PENDING', 'T002 cannot be started before the inserted task');
    assert.equal(workflow(orderRoot, 'status').next_task_id, 'T001A', 'the file order is the execution order');
    for (const [label, value] of [
      ['a finished task', { tasks: [{ title: 'x', files: ['a.txt'], checks: ['code'], before: 'T001' }] }],
      ['an unknown task', { tasks: [{ title: 'x', files: ['a.txt'], checks: ['code'], before: 'T777' }] }],
      ['DOCS', { tasks: [{ title: 'x', files: ['a.txt'], checks: ['code'], before: 'DOCS' }] }],
      ['ordinary before delivery', { tasks: [{ title: 'x', files: ['a.txt'], checks: ['code'], before: 'T900' }] }],
      ['a dependency that stands later', { dependencies: { T001A: ['T003'] } }],
      ['a new task at the end as a dependency of an earlier one', { tasks: [{ id: 'T050', title: 'x', files: ['a.txt'], checks: ['code'] }], dependencies: { T002: ['T050'] } }],
      ['dependencies of a finished task', { dependencies: { T001: ['T002'] } }],
    ]) assert.equal((await refuseExtend(value)).code, 'TASK_ORDER', label);
    assert.equal((await refuseExtend({ dependencies: { DOCS: ['T003'] } })).code, 'PLAN_SCHEMA', 'DOCS dependencies belong to Kit');
    assert.equal((await refuseExtend({ dependencies: { T003: [] } })).code, 'PLAN_SCHEMA');

    await extend({ tasks: [{ id: 'T899', title: 'Sign', files: ['README.md'], checks: ['artifact'], verification_kind: 'package', before: 'T900' }] });
    await extend({ tasks: [{ id: 'T004', title: 'Appended as before 1.5.6', files: ['b.txt'], checks: ['code'] }] });
    assert.deepEqual(ids(), ['T001', 'T001A', 'T002', 'T003', 'T004', 'DOCS', 'T899', 'T900'], 'work → DOCS → delivery is kept');
    assert.ok(['T899', 'DOCS'].every(id => taskOf('T900').dependencies.includes(id)));
    assert.equal(taskOf('T001').commit_status, 'DONE', 'finished tasks are untouched');

    // Another Git (a VM mount, another user) refreshed the index, or files were touched: no byte differs.
    workflow(orderRoot, 'task:start', 'T001A');
    await fs.appendFile(path.join(orderRoot, 'a.txt'), 'inserted\n');
    const later = new Date(Date.now() + 5000);
    for (const file of git(orderRoot, 'ls-files').split('\n')) await fs.utimes(path.join(orderRoot, file), later, later);
    const statOnly = git(orderRoot, '-c', 'diff.autoRefreshIndex=false', 'diff', '--name-only').split('\n');
    assert.ok(statOnly.includes('.codex/hooks.json') && statOnly.includes('README.md') && statOnly.includes('config/credentials.json'),
      'the fixture reproduces the state in which Git lists unchanged files');
    const inserted = workflow(orderRoot, 'commit', '--task', 'T001A');
    assert.deepEqual(inserted.excluded_changes, [], 'an unchanged .codex/hooks.json neither stops the commit nor counts as a change');
    assert.deepEqual(git(orderRoot, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['.harness/plans/todo-plan.md', 'a.txt']);
    assert.deepEqual(taskOf('T001A').actual_files, ['a.txt']);

    // A really changed private path stays out of the task commit and is reported.
    workflow(orderRoot, 'task:start', 'T002');
    await fs.appendFile(path.join(orderRoot, 'a.txt'), 'second\n');
    await fs.appendFile(path.join(orderRoot, 'config/credentials.json'), 'changed\n');
    await fs.writeFile(path.join(orderRoot, '.env'), 'TOKEN=fixture\n');
    const second = workflow(orderRoot, 'commit', '--task', 'T002');
    assert.deepEqual([...second.excluded_changes].sort(), ['.env', 'config/credentials.json']);
    assert.deepEqual(git(orderRoot, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort(), ['.harness/plans/todo-plan.md', 'a.txt']);
    assert.deepEqual(taskOf('T002').actual_files, ['a.txt']);
    const leftInWorktree = git(orderRoot, 'status', '--porcelain').split('\n').map(line => line.trim()).sort();
    assert.deepEqual(leftInWorktree, ['?? .env', 'M config/credentials.json'], 'both private changes are left in the worktree');
    workflow(orderRoot, 'task:start', 'T003');
    await fs.appendFile(path.join(orderRoot, 'b.txt'), 'third\n');
    assert.equal(workflowFailure(orderRoot, 'commit', '--task', 'T003', '--files', JSON.stringify(['b.txt', '.env'])).code, 'PRIVATE_CONTEXT',
      'an explicit request to commit a private path is still refused');
    assert.deepEqual([...workflow(orderRoot, 'commit', '--task', 'T003').excluded_changes].sort(), ['.env', 'config/credentials.json']);
  } finally {
    await fs.rm(orderRoot, { recursive: true, force: true });
  }

  const compatA = workflow(root, 'status', '--session', 'legacy-session-a');
  const compatB = workflow(root, 'status', '--session', 'legacy-session-b');
  assert.equal(compatA.scope_id, status.scope_id);
  assert.equal(compatB.scope_id, status.scope_id);
  assert.equal(compatA.plan_revision, status.plan_revision);
  assert.equal(compatB.plan_revision, status.plan_revision);

  const viewA = workflow(root, 'plan:view', '--session', 'legacy-session-a');
  const viewB = sessionPlans.sessionPlanView(root, 'legacy-session-b');
  assert.equal(viewA.plan_id, 'fixture-current-plan');
  assert.equal(viewB.plan_id, 'fixture-current-plan');
  assert.deepEqual(viewA.prepared, []);
  assert.deepEqual(viewB.prepared, []);
  assert.equal(Object.hasOwn(viewA.plan, 'owner_session_id'), false);
  assert.equal(Object.hasOwn(viewA.plan, 'prepared_in_session_id'), false);

  // Legacy migration: valid todo-plan.md always wins, even when several old
  // session plans are ACTIVE. Historical size must not affect normal readiness.
  const planFile = path.join(root, '.harness/plans/todo-plan.md');
  const currentBeforeLegacy = planApi.readPlan(root);
  const ownedCurrent = structuredClone(currentBeforeLegacy);
  ownedCurrent.owner_session_id = 'legacy-current-owner';
  ownedCurrent.prepared_in_session_id = 'legacy-origin';
  ownedCurrent.session_experience = 'chat';
  await fs.writeFile(planFile, planApi.renderPlan(ownedCurrent));

  function legacyPlan(scopeId, owner, objective = 'Legacy unfinished session plan') {
    const candidate = structuredClone(currentBeforeLegacy);
    candidate.scope_id = scopeId;
    candidate.objective = objective;
    candidate.owner_session_id = owner;
    candidate.prepared_in_session_id = 'legacy-origin';
    candidate.session_experience = 'chat';
    for (const task of candidate.tasks) task.commit_ref.scope_id = scopeId;
    return planApi.renderPlan(candidate);
  }

  const bySession = path.join(root, '.harness/plans/by-session');
  const byId = path.join(root, '.harness/plans/by-id');
  await fs.mkdir(bySession, { recursive: true });
  await fs.mkdir(byId, { recursive: true });
  const legacyA = legacyPlan('legacy-active-a', 'legacy-session-a');
  const legacyB = legacyPlan('legacy-active-b', 'legacy-session-b');
  const oversizedHistory = legacyPlan('legacy-oversized', 'legacy-session-big', 'X'.repeat(190000));
  await fs.writeFile(path.join(bySession, 'session-a.md'), legacyA);
  await fs.writeFile(path.join(bySession, 'session-b.md'), legacyB);
  await fs.writeFile(path.join(byId, 'oversized.md'), oversizedHistory);

  const inspectedWithHistory = installer.inspect({ project: root, mode: 'existing' });
  assert.equal(inspectedWithHistory.state?.ok, true, 'historical plans unexpectedly block readiness');
  assert.equal(workflow(root, 'status').scope_id, 'fixture-current-plan');

  assert.throws(()=>sessionPlans.migrateLegacyPlans(root),{code:'LEGACY_PLAN_CHANGED'});
  assert.equal(await fs.readFile(path.join(bySession,'session-a.md'),'utf8'),legacyA);
  git(root,'add','.harness/plans');git(root,'commit','--no-verify','-m','test: seed committed legacy plans');
  const migrated = sessionPlans.migrateLegacyPlans(root);
  assert.equal(migrated.removed.length, 3);
  assert.equal(migrated.current_normalized, true);
  const migratedCurrent = planApi.readPlan(root);
  assert.equal(migratedCurrent.scope_id, 'fixture-current-plan');
  assert.equal(migratedCurrent.plan_revision, ownedCurrent.plan_revision + 1);
  assert.equal(Object.hasOwn(migratedCurrent, 'owner_session_id'), false);
  assert.equal(Object.hasOwn(migratedCurrent, 'prepared_in_session_id'), false);
  for (const record of migrated.removed) {
    assert.equal(git(root,'show',record.source_commit+':'+record.path)+'\n',
      record.path.endsWith('session-a.md') ? legacyA : record.path.endsWith('session-b.md') ? legacyB : oversizedHistory);
    await assert.rejects(fs.access(path.join(root, record.path)));
  }

  git(root,'add','.harness/plans');git(root,'commit','--no-verify','-m','test: record migration fixture');
  const repeatedMigration = sessionPlans.migrateLegacyPlans(root);
  assert.equal(repeatedMigration.removed.length, 0);
  assert.deepEqual(repeatedMigration.changed_paths, []);

  // Invalid canonical current state is a hard stop before any legacy write.
  await fs.mkdir(bySession, { recursive: true });
  const preservedSource = path.join(bySession, 'must-stay.md');
  await fs.writeFile(preservedSource, legacyA);
  const validCurrentText = await fs.readFile(planFile, 'utf8');
  await fs.writeFile(planFile, '# broken current plan\n');
  assert.throws(() => sessionPlans.migrateLegacyPlans(root));
  assert.equal(await fs.readFile(preservedSource, 'utf8'), legacyA);
  await fs.writeFile(planFile, validCurrentText);
  git(root,'add','.harness/plans');git(root,'commit','--no-verify','-m','test: seed last legacy fixture');
  const finalMigration = sessionPlans.migrateLegacyPlans(root);
  assert.equal(finalMigration.removed.length, 1);
  assert.equal(git(root,'show',finalMigration.removed[0].source_commit+':'+finalMigration.removed[0].path)+'\n',legacyA);

  // The hard transport limit still applies to the current plan. History is
  // excluded, but an oversized current execution context must fail explicitly.
  const strictCurrent = planApi.readPlan(root);
  strictCurrent.objective = 'Y'.repeat(190000);
  await fs.writeFile(planFile, planApi.renderPlan(strictCurrent));
  const oversizedCurrent = workflowFailure(root, 'recover', '--format', 'json');
  assert.equal(oversizedCurrent.code, 'CONTEXT_TOO_LARGE');
  await fs.writeFile(planFile, validCurrentText);
  assert.equal(workflow(root, 'recover', '--format', 'json').completeness, 'COMPLETE');

  // A second Git worktree has an independent todo-plan.md filesystem state.
  const worktreePath = root + '-isolation-worktree';
  git(root, 'worktree', 'add', '-b', 'fixture-isolation', worktreePath);
  try {
    const mainRevision = planApi.readPlan(root).plan_revision;
    const isolatedPlan = planApi.readPlan(worktreePath);
    isolatedPlan.plan_revision += 100;
    await fs.writeFile(path.join(worktreePath, '.harness/plans/todo-plan.md'), planApi.renderPlan(isolatedPlan));
    const isolatedStatus = workflow(worktreePath, 'status');
    assert.equal(isolatedStatus.plan_revision, isolatedPlan.plan_revision);
    assert.equal(workflow(root, 'status').plan_revision, mainRevision);
  } finally {
    git(root, 'worktree', 'remove', '--force', worktreePath);
  }

  const removed = workflowFailure(root, 'plan:prepare', '--input', inputFile, '--session', 'legacy-session-a');
  assert.equal(removed.code, 'COMMAND_REMOVED');
  const wrongPlan = workflowFailure(root, 'status', '--plan', 'historical-plan');
  assert.equal(wrongPlan.code, 'PLAN_NOT_CURRENT');

  // Synthetic but structurally faithful 1.4.13 upgrade fixture: the manifest,
  // owned runtime and legacy plan files are committed as an old installation,
  // then upgraded through the public installer path.
  const upgradeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-kit-upgrade-1413-'));
  try {
    git(upgradeRoot, 'init', '-b', 'main');
    git(upgradeRoot, 'config', 'user.name', 'Workflow Kit Upgrade Test');
    git(upgradeRoot, 'config', 'user.email', 'workflow-kit-upgrade@test.local');
    await fs.mkdir(path.join(upgradeRoot, 'docs/planning'), { recursive: true });
    await fs.writeFile(path.join(upgradeRoot, 'docs/planning/fixture.md'), '# Upgrade fixture\n');
    await fs.writeFile(path.join(upgradeRoot, 'README.md'), '# Upgrade fixture\n');
    git(upgradeRoot, 'add', 'README.md', 'docs/planning/fixture.md');
    git(upgradeRoot, 'commit', '-m', 'test: upgrade fixture baseline');

    const installedCurrent = installer.install({ project: upgradeRoot, mode: 'existing' });
    assert.equal(installedCurrent.version, VERSION);
    const upgradeInput = path.join(upgradeRoot, '.harness/runtime/upgrade-plan.json');
    await fs.writeFile(upgradeInput, JSON.stringify({ ...planInput, id: 'upgrade-current-plan' }));
    workflow(upgradeRoot, 'plan:create', '--input', upgradeInput);

    const legacyCurrent = planApi.readPlan(upgradeRoot);
    legacyCurrent.owner_session_id = 'old-webpilot-session';
    legacyCurrent.prepared_in_session_id = 'old-origin-session';
    legacyCurrent.session_experience = 'chat';
    await fs.writeFile(path.join(upgradeRoot, '.harness/plans/todo-plan.md'), planApi.renderPlan(legacyCurrent));

    const oldSessionPlan = structuredClone(legacyCurrent);
    oldSessionPlan.scope_id = 'old-session-plan';
    oldSessionPlan.owner_session_id = 'old-webpilot-session-2';
    for (const task of oldSessionPlan.tasks) task.commit_ref.scope_id = oldSessionPlan.scope_id;
    const oldSessionText = planApi.renderPlan(oldSessionPlan);
    const oldSessionFile = path.join(upgradeRoot, '.harness/plans/by-session/old-session.md');
    await fs.mkdir(path.dirname(oldSessionFile), { recursive: true });
    await fs.writeFile(oldSessionFile, oldSessionText);
    const oldArchiveFile=path.join(upgradeRoot,'.harness/plans/archive/closed.md');
    await fs.mkdir(path.dirname(oldArchiveFile),{recursive:true});
    await fs.writeFile(oldArchiveFile,'# Historical closed plan\n');

    const runtimeWorkflow = path.join(upgradeRoot, '.harness/kit/WORKFLOW.md');
    const legacyRuntimeText = await fs.readFile(runtimeWorkflow, 'utf8') + '\n<!-- synthetic-1.4.13 -->\n';
    await fs.writeFile(runtimeWorkflow, legacyRuntimeText);
    const oldManifestFile = path.join(upgradeRoot, '.harness/kit-manifest.json');
    const oldManifest = JSON.parse(await fs.readFile(oldManifestFile, 'utf8'));
    const retiredTemplate='.harness/kit/templates/PRODUCT.md';
    const retiredText='# Retired product template\n';
    await fs.writeFile(path.join(upgradeRoot,retiredTemplate),retiredText);
    oldManifest.files.push({path:retiredTemplate,kind:'owned',mode:0o644,hash:createHash('sha256').update(retiredText).digest('hex')});
    const legacyDocs=['docs/PRODUCT.md','docs/MODULES.md','docs/DOCUMENTATION_INDEX.md','docs/WORKFLOW_START.md','docs/architecture/ARCHITECTURE.md'];
    for(const name of legacyDocs){
      const text=name==='docs/PRODUCT.md' ? 'я'.repeat(20000) : '# Legacy document\n';
      await fs.writeFile(path.join(upgradeRoot,name),text);
      oldManifest.files.push({path:name,kind:'editable',mode:0o644,hash:createHash('sha256').update(text).digest('hex')});
    }
    oldManifest.required_documents=['docs/architecture/OVERVIEW.md',...legacyDocs];
    oldManifest.version = '1.4.13';
    const workflowEntry = oldManifest.files.find(entry => entry.path === '.harness/kit/WORKFLOW.md');
    assert.ok(workflowEntry, 'old manifest missing WORKFLOW entry');
    workflowEntry.hash = createHash('sha256').update(legacyRuntimeText).digest('hex');
    await fs.writeFile(oldManifestFile, JSON.stringify(oldManifest, null, 2) + '\n');

    git(upgradeRoot, 'add', '.harness/kit-manifest.json', '.harness/kit/WORKFLOW.md',
      '.harness/plans/todo-plan.md', '.harness/plans/by-session/old-session.md', '.harness/plans/archive/closed.md',retiredTemplate,...legacyDocs);
    git(upgradeRoot, 'commit', '--no-verify', '-m', 'test: synthesize Workflow Kit 1.4.13 installation');

    const upgradePreview = installer.inspect({ project: upgradeRoot, mode: 'existing' });
    assert.equal(upgradePreview.version, '1.4.13');
    assert.equal(upgradePreview.upgradeable, true);
    const beforeMigrationHead=git(upgradeRoot,'rev-parse','HEAD');
    await fs.appendFile(oldArchiveFile,'Changed by user\n');
    assert.throws(()=>installer.install({project:upgradeRoot,mode:'existing',update:true}),{code:'LEGACY_PLAN_CHANGED'});
    assert.equal(await fs.readFile(oldSessionFile,'utf8'),oldSessionText,'preflight failure deletes nothing');
    assert.equal(await fs.readFile(runtimeWorkflow,'utf8'),legacyRuntimeText,'preflight failure writes no Kit files');
    await fs.writeFile(oldArchiveFile,'# Historical closed plan\n');
    const untrackedArchive=path.join(upgradeRoot,'.harness/plans/archive/untracked.md');
    await fs.writeFile(untrackedArchive,'Uncommitted history\n');
    assert.throws(()=>installer.install({project:upgradeRoot,mode:'existing',update:true}),{code:'LEGACY_PLAN_CHANGED'});
    assert.equal(await fs.readFile(oldArchiveFile,'utf8'),'# Historical closed plan\n');
    assert.equal(git(upgradeRoot,'rev-parse','HEAD'),beforeMigrationHead);
    await fs.unlink(untrackedArchive);
    await fs.appendFile(oldArchiveFile,'Staged change\n');git(upgradeRoot,'add','.harness/plans/archive/closed.md');
    await fs.writeFile(oldArchiveFile,'# Historical closed plan\n');
    assert.throws(()=>installer.install({project:upgradeRoot,mode:'existing',update:true}),{code:'LEGACY_PLAN_CHANGED'});
    git(upgradeRoot,'add','.harness/plans/archive/closed.md');
    const upgraded = installer.install({ project: upgradeRoot, mode: 'existing', update: true });
    assert.equal(upgraded.upgraded, true);
    assert.equal(upgraded.version, VERSION);
    const upgradedManifest = JSON.parse(await fs.readFile(oldManifestFile, 'utf8'));
    assert.equal(upgradedManifest.version, VERSION);
    assert.equal(upgradedManifest.upgraded_from, '1.4.13');
    assert.deepEqual(upgradedManifest.required_documents,['docs/architecture/OVERVIEW.md']);
    await assert.rejects(fs.access(path.join(upgradeRoot,retiredTemplate)));
    assert.equal((await fs.stat(path.join(upgradeRoot,'docs/PRODUCT.md'))).size,40000,'upgrade preserves untouched oversized legacy documents');
    assert.ok(legacyDocs.every(p=>!upgradedManifest.files.some(e=>e.path===p)),'obsolete project documents are no longer installation requirements');
    assert.equal(upgradedManifest.legacy_plan_migration?.removed_count, 2);
    await assert.rejects(fs.access(oldArchiveFile));
    assert.match(git(upgradeRoot,'log','-1','--format=%B'),/Workflow-Role: kit-update/);
    const upgradedCurrent = planApi.readPlan(upgradeRoot);
    assert.equal(upgradedCurrent.scope_id, 'upgrade-current-plan');
    assert.equal(Object.hasOwn(upgradedCurrent, 'owner_session_id'), false);
    assert.equal(Object.hasOwn(upgradedCurrent, 'prepared_in_session_id'), false);
    const archivedOldSession = path.join(upgradeRoot,
      '.harness/plans/archive/legacy-session-plans/by-session/old-session.md');
    await assert.rejects(fs.access(archivedOldSession));
    assert.equal(git(upgradeRoot,'show',upgradedManifest.legacy_plan_migration.source_commit+':.harness/plans/by-session/old-session.md')+'\n',oldSessionText);
    await assert.rejects(fs.access(oldSessionFile));
    assert.equal((await fs.readFile(runtimeWorkflow, 'utf8')).includes('synthetic-1.4.13'), false);

    for(const name of legacyDocs) await fs.unlink(path.join(upgradeRoot,name));
    workflow(upgradeRoot,'docs:commit','--files',JSON.stringify(legacyDocs),'--message','docs: migrate fixture documents');
    const headAfterUpgrade = git(upgradeRoot, 'rev-parse', 'HEAD');
    const repeatedUpdate = installer.install({ project: upgradeRoot, mode: 'existing', update: true });
    assert.equal(repeatedUpdate.version, VERSION);
    assert.equal(git(upgradeRoot, 'rev-parse', 'HEAD'), headAfterUpgrade,
      'same-version reconnect after 1.4.13 upgrade unexpectedly committed changes');
    for(const name of legacyDocs) await assert.rejects(fs.access(path.join(upgradeRoot,name)));
  } finally {
    await fs.rm(upgradeRoot, { recursive: true, force: true });
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    version: VERSION,
    installedRuntimeFiles: runtimeFiles.length,
    installedRuntimeSha256: runtimeSha256,
    currentPlan: viewA.plan_id,
    recovery: recovered.completeness,
    compatibilitySessions: true,
    sessionOwnershipRemoved: true,
    reconnectHeadStable: true,
    projectRename: true
  }, null, 2) + '\n');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

await import('./check-document-fixture.mjs');
await import('./check-project-recovery-fixture.mjs');
