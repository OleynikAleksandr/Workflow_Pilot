import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { WorkspaceSetup } from '../src/workspace-setup.mjs';
import { nodeExecutableCandidates } from '../src/platform.mjs';
import { VERSION } from '@webpilot/workflow-kit/lib/common';
import { fileURLToPath } from 'node:url';
import { sessionPlanView } from '@webpilot/workflow-kit/lib/session-plans';
import { inspectProject as inspectDoctor } from '../resources/project-doctor/core.mjs';
const environment = { ...process.env, GIT_AUTHOR_NAME: 'Web Pilot Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Web Pilot Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX']) delete environment[key];
async function fixture(t) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-setup-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  return { parent, setup: new WorkspaceSetup({ environment }) };
}
async function create(t) {
  const f = await fixture(t);
  const preview = await f.setup.preview({ mode: 'new', parent: f.parent, name: 'Новый проект' });
  assert.equal(preview.action, 'install'); assert.equal(preview.installed, false);
  assert.ok(preview.files.some(f => f.path === '.harness/plans/todo-plan.md'));
  await assert.rejects(fs.stat(preview.workspace), { code: 'ENOENT' });
  const result = await f.setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result));
  return { ...f, workspace: result.workspace, result };
}
test('real readiness key tracks NONE planning and repeated edits to an already dirty source', async t => {
  const {workspace,setup}=await create(t);
  const key=async()=>{const result=await setup.ready(workspace);assert.equal(result.ready,true,JSON.stringify(result));return result.inputKey;};
  const before=await key();
  await fs.mkdir(path.join(workspace,'docs/planning'),{recursive:true});
  const source=path.join(workspace,'docs/planning/new-scope.md');
  await fs.writeFile(source,'# Scope\nalpha\n');const first=await key();assert.notEqual(first,before);
  await fs.writeFile(source,'# Scope\nbravo\n');const second=await key();assert.notEqual(second,first);
  await fs.writeFile(source,'# Scope\nthird\n');assert.notEqual(await key(),second);
});
function git(cwd, ...args) { return execFileSync('git', args, { cwd, env: environment, encoding: 'utf8' }).trim(); }
const sha = value => createHash('sha256').update(value).digest('hex');

test('Node candidates are centralized for macOS and Windows', () => {
  assert.deepEqual(nodeExecutableCandidates({ platform: 'darwin', environment: {}, execPath: '/usr/bin/node', electron: true }), [
    '/opt/homebrew/bin/node', '/usr/local/bin/node',
  ]);
  assert.deepEqual(nodeExecutableCandidates({
    platform: 'win32',
    environment: { ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)' },
    execPath: 'C:\\Node\\node.exe',
    electron: true,
  }), [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    'node.exe',
  ]);
  const setupEnvironment = { ProgramFiles: 'C:\\Program Files' };
  const setup = new WorkspaceSetup({ platform: 'win32', environment: setupEnvironment });
  assert.deepEqual(setup.nodeCandidates, nodeExecutableCandidates({ platform: 'win32', environment: setupEnvironment,
    execPath: process.execPath, electron: Boolean(process.versions.electron) }));
});

test('create a real empty Workflow Kit project and reopen without changes', async t => {
  const { setup, workspace } = await create(t);
  const config = JSON.parse(await fs.readFile(path.join(workspace, '.harness/workflow.json'), 'utf8'));
  const plan = JSON.parse((await fs.readFile(path.join(workspace, '.harness/plans/todo-plan.md'), 'utf8')).match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(config.profile, 'DISCOVERY'); assert.equal(config.budget.hard_bytes, 180000); assert.equal(plan.execution_scope_status, 'NONE'); assert.deepEqual(plan.tasks, []);
  assert.equal(plan.context_pack.include_last_completed_task, false);
  await fs.stat(path.join(workspace, 'README.md')); await fs.stat(path.join(workspace, 'docs/architecture/OVERVIEW.md'));
  assert.equal(config.budget.document_bytes,28000);
  for(const name of ['docs/MODULES.md','docs/DOCUMENTATION_INDEX.md','docs/PRODUCT.md','docs/WORKFLOW_START.md','docs/architecture/ARCHITECTURE.md']) await assert.rejects(fs.access(path.join(workspace,name)));
  const head = git(workspace, 'rev-parse', 'HEAD');
  const next = await setup.preview({ mode: 'existing', workspace });
  assert.equal(next.action, 'open'); assert.ok(next.checks.every(c => c.ok));
  assert.equal((await setup.apply(next.token)).ready, true);
  assert.equal(git(workspace, 'rev-parse', 'HEAD'), head); assert.equal(git(workspace, 'status', '--porcelain'), '');
});
test('existing contents, custom instructions and staged work survive setup', async t => {
  const { setup, parent } = await fixture(t); const workspace = path.join(parent, 'Existing'); await fs.mkdir(workspace);
  git(workspace, 'init', '-b', 'main'); await fs.writeFile(path.join(workspace, 'source.txt'), 'original\n');
  git(workspace, 'add', 'source.txt'); git(workspace, 'commit', '-m', 'original');
  await fs.writeFile(path.join(workspace, 'source.txt'), 'user work\n'); git(workspace, 'add', 'source.txt');
  await fs.writeFile(path.join(workspace, 'AGENTS.md'), '# My rules\n');
  await fs.mkdir(path.join(workspace, 'docs')); await fs.writeFile(path.join(workspace, 'docs/PRODUCT.md'), '# Existing product\n');
  const head = git(workspace, 'rev-parse', 'HEAD'), staged = git(workspace, 'diff', '--no-ext-diff', '--no-textconv', '--cached');
  const preview = await setup.preview({ mode: 'existing', workspace }); const result = await setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result)); assert.ok(result.warnings.length);
  assert.equal(git(workspace, 'rev-parse', 'HEAD'), head); assert.equal(git(workspace, 'diff', '--no-ext-diff', '--no-textconv', '--cached'), staged);
  assert.equal(await fs.readFile(path.join(workspace, 'source.txt'), 'utf8'), 'user work\n');
  assert.match(await fs.readFile(path.join(workspace, 'AGENTS.md'), 'utf8'), /^# My rules/);
  assert.equal(await fs.readFile(path.join(workspace, 'docs/PRODUCT.md'), 'utf8'), '# Existing product\n');
});
test('conflicting paths and changed preview block writes', async t => {
  const { setup, parent } = await fixture(t); const workspace = path.join(parent, 'Existing');
  await fs.mkdir(path.join(workspace, '.harness'), { recursive: true }); await fs.writeFile(path.join(workspace, '.harness/workflow.json'), 'user file');
  const conflict = await setup.preview({ mode: 'existing', workspace }); assert.equal(conflict.action, null); assert.ok(conflict.issues.length);
  await assert.rejects(setup.apply(conflict.token), { code: 'SETUP_BLOCKED' });
  assert.equal(await fs.readFile(path.join(workspace, '.harness/workflow.json'), 'utf8'), 'user file');
  const preview = await setup.preview({ mode: 'new', parent, name: 'Fresh' });
  await fs.mkdir(preview.workspace); await fs.writeFile(path.join(preview.workspace, 'arrived.txt'), 'new');
  await assert.rejects(setup.apply(preview.token), { code: 'FOLDER_NOT_EMPTY' });
  await assert.rejects(fs.stat(path.join(preview.workspace, '.git')), { code: 'ENOENT' });
});
test('missing local checks reconnect, changed core and missing documents never overwrite', async t => {
  const { setup, workspace } = await create(t);
  await fs.unlink(path.join(workspace, 'README.md'));
  const optional = await setup.preview({ mode: 'existing', workspace });
  assert.equal(optional.ready, true);assert.ok(!optional.issues.some(i => i.path === 'README.md'));
  const hook = path.join(workspace, '.git/hooks/pre-commit'); await fs.unlink(hook);
  const preview = await setup.preview({ mode: 'existing', workspace }); assert.equal(preview.action, 'reconnect');
  assert.equal((await setup.apply(preview.token)).ready, true);
  const hookStat = await fs.stat(hook); if (process.platform !== 'win32') assert.ok(hookStat.mode & 0o111);
  const source = path.join(workspace, '.harness/kit/lib/common.mjs'); await fs.appendFile(source, '\n// user change\n');
  const conflict = await setup.preview({ mode: 'existing', workspace }); assert.equal(conflict.action, null); assert.ok(conflict.issues.some(i => i.path.endsWith('common.mjs')));
  await fs.unlink(path.join(workspace, 'docs/architecture/OVERVIEW.md'));
  const docs = await setup.preview({ mode: 'existing', workspace }); assert.ok(docs.issues.some(i => i.path === 'docs/architecture/OVERVIEW.md'));
});
test('legacy compatible version opens unchanged and unsupported version is explicit', async t => {
  const { setup, workspace } = await create(t); const file = path.join(workspace, '.harness/kit-manifest.json');
  const m = JSON.parse(await fs.readFile(file, 'utf8')); m.version = '1.0.0'; await fs.writeFile(file, JSON.stringify(m));
  const old = await setup.preview({ mode: 'existing', workspace }); assert.equal(old.action, 'open');
  const before = await fs.readFile(file); await setup.apply(old.token); assert.deepEqual(await fs.readFile(file), before);
  m.version = '9.0.0'; await fs.writeFile(file, JSON.stringify(m));
  const unsupported = await setup.preview({ mode: 'existing', workspace }); assert.equal(unsupported.action, null); assert.match(unsupported.issues[0].reason, /9.0.0/);
});

test('compatible 1.2 installation upgrades to the current Kit and preserves user documents', async t => {
  const { setup, workspace } = await create(t);
  const manifestFile = path.join(workspace, '.harness/kit-manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8')); manifest.version = '1.2.0';
  const commonPath = path.join(workspace, '.harness/kit/lib/common.mjs');
  const legacyCommon = (await fs.readFile(commonPath, 'utf8')).replace(`VERSION = '${VERSION}'`, "VERSION = '1.2.0'");
  await fs.writeFile(commonPath, legacyCommon);
  const commonEntry = manifest.files.find(entry => entry.path === '.harness/kit/lib/common.mjs'); commonEntry.hash = sha(legacyCommon);
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  const planFile = path.join(workspace, '.harness/plans/todo-plan.md');

  await fs.writeFile(path.join(workspace, 'docs/architecture/OVERVIEW.md'), '# Краткая архитектура проекта\n\nCUSTOM_OVERVIEW_STAYS\n');
  await fs.writeFile(path.join(workspace, 'docs/PRODUCT.md'), '# User product stays\n');
  const indexFile = path.join(workspace, 'docs/DOCUMENTATION_INDEX.md');
  const customIndex = '# Legacy index\n<!-- workflow-kit:begin -->\n| docs/custom.md | User-added index row |\n<!-- workflow-kit:end -->\n';
  await fs.writeFile(indexFile, customIndex);
  git(workspace, 'add', '.'); git(workspace, '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'simulate legacy 1.2 NONE');

  const preview = await setup.preview({ mode: 'existing', workspace });
  assert.equal(preview.action, 'upgrade', JSON.stringify(preview));
  const result = await setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result)); assert.equal(result.version, VERSION);
  assert.ok((await fs.readFile(commonPath, 'utf8')).includes(`VERSION = '${VERSION}'`));
  assert.match(await fs.readFile(path.join(workspace, 'docs/architecture/OVERVIEW.md'), 'utf8'), /CUSTOM_OVERVIEW_STAYS/);
  assert.equal(await fs.readFile(path.join(workspace, 'docs/PRODUCT.md'), 'utf8'), '# User product stays\n');
  assert.equal(await fs.readFile(indexFile,'utf8'),customIndex,'upgrade preserves legacy documents without extending them');
  for(const name of ['docs/MODULES.md','docs/WORKFLOW_START.md','docs/architecture/ARCHITECTURE.md']) await assert.rejects(fs.access(path.join(workspace,name)));
  const upgradedPlanText = await fs.readFile(planFile, 'utf8');
  const upgradedPlan = JSON.parse(upgradedPlanText.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(upgradedPlan.execution_scope_status, 'NONE');
  assert.ok(upgradedPlan.context_pack.documents.some(doc => doc.path === 'docs/architecture/OVERVIEW.md' && doc.required));
  assert.equal(git(workspace, 'status', '--porcelain'), '');
});

test('Git subfolder resolves to project root and preview change prevents reopening', async t => {
  const { setup, workspace } = await create(t); const child = path.join(workspace, 'nested'); await fs.mkdir(child);
  const preview = await setup.preview({ mode: 'existing', workspace: child }); assert.equal(preview.workspace, workspace);
  await fs.writeFile(path.join(workspace, 'new.txt'), 'changed');
  await assert.rejects(setup.apply(preview.token), { code: 'PREVIEW_CHANGED' });
});
test('invalid names, expired tickets and missing Node do not create folders', async t => {
  const { setup, parent } = await fixture(t);
  for (const name of ['../outside', 'folder/name', '.', '.hidden', 'bad\nname']) await assert.rejects(setup.preview({ mode: 'new', parent, name }), { code: 'PROJECT_NAME' });
  await assert.rejects(setup.apply('forged'), { code: 'PREVIEW_REQUIRED' });
  const missing = new WorkspaceSetup({ nodeCandidates: ['/does/not/exist'] });
  await assert.rejects(missing.preview({ mode: 'new', parent, name: 'New' }), { code: 'NODE_MISSING' });
  assert.deepEqual(await fs.readdir(parent), []);
});

test('Windows setup ignores inherited Node flags and preload hooks in a real worker', async t => {
  const { parent } = await fixture(t);
  for (const [index, options] of ['--web-pilot-invalid-option', '--require=web-pilot-missing-preload'].entries()) {
    const inherited = {
      ...environment,
      PATH: path.dirname(process.execPath) + path.delimiter + (environment.PATH ?? environment.Path ?? ''),
      NODE_OPTIONS: options, Node_Options: options,
      NODE_PATH: '/web-pilot-unrelated-modules', Node_Path: '/web-pilot-unrelated-modules',
    };
    const setup = new WorkspaceSetup({
      platform: 'win32', nodeCandidates: [path.basename(process.execPath)], environment: inherited,
    });
    const preview = await setup.preview({ mode: 'new', parent, name: 'Windows flags ' + index });
    assert.equal(preview.action, 'install');
    await assert.rejects(fs.stat(preview.workspace), { code: 'ENOENT' });
    assert.equal((await setup.apply(preview.token)).ready, true);
    assert.equal((await setup.preview({ mode: 'existing', workspace: preview.workspace })).action, 'open');
    assert.equal(inherited.NODE_OPTIONS, options);
    assert.equal(inherited.Node_Options, options);
    assert.equal(inherited.NODE_PATH, '/web-pilot-unrelated-modules');
    assert.equal(Object.keys(setup.environment).some(key => /^node_(options|path)$/i.test(key)), false);
  }
});

test('Windows Node errors distinguish missing, old, denied, invalid and timed out executables', async t => {
  const cases = [
    { name: 'missing', error: { code: 'ENOENT' }, expected: 'NODE_MISSING', message: /resources/ },
    { name: 'old', stdout: 'v20.19.0\r\n', expected: 'NODE_TOO_OLD', message: /v20\.19\.0/ },
    { name: 'denied', error: { code: 'EACCES' }, expected: 'NODE_START_FAILED', message: /EACCES/ },
    { name: 'invalid image', error: { code: 'UNKNOWN' }, expected: 'NODE_START_FAILED', message: /UNKNOWN/ },
    { name: 'timeout', error: { code: null, killed: true }, expected: 'NODE_START_FAILED', message: /TIMEOUT/ },
    { name: 'unexpected output', stdout: 'not-node-secret', expected: 'NODE_START_FAILED', message: /INVALID_VERSION_OUTPUT/ },
  ];
  for (const item of cases) await t.test(item.name, async () => {
    const setup = new WorkspaceSetup({
      platform: 'win32', nodeCandidates: ['C:\\Program Files\\Web Pilot\\node.exe'],
      executeNode: async () => {
        if (item.error) throw Object.assign(new Error('stderr-secret'), item.error);
        return { stdout: item.stdout };
      },
    });
    await assert.rejects(setup.node(), error => {
      assert.equal(error.code, item.expected);
      assert.match(error.message, item.message);
      assert.doesNotMatch(error.message, /secret/);
      return true;
    });
  });
});

test('Windows keeps searching after failure and caches only a successful Node', async () => {
  const calls = [];
  let available = false;
  const setup = new WorkspaceSetup({
    platform: 'win32', nodeCandidates: ['missing.exe', 'blocked.exe', 'old.exe', 'good.exe'],
    executeNode: async candidate => {
      calls.push(candidate);
      if (candidate === 'blocked.exe') throw Object.assign(new Error(), { code: 'EACCES' });
      if (candidate === 'old.exe') return { stdout: 'v18.20.0\n' };
      if (candidate === 'good.exe' && available) return { stdout: 'v24.21.0\r\n' };
      throw Object.assign(new Error(), { code: 'ENOENT' });
    },
  });
  await assert.rejects(setup.node(), { code: 'NODE_START_FAILED' });
  available = true;
  assert.equal(await setup.node(), 'good.exe');
  assert.deepEqual(calls, ['missing.exe', 'blocked.exe', 'old.exe', 'good.exe',
    'missing.exe', 'blocked.exe', 'old.exe', 'good.exe']);
  assert.equal(await setup.node(), 'good.exe');
  assert.equal(calls.length, 8);
});

test('macOS retains Node environment and legacy missing-Node diagnostics', async () => {
  const setup = new WorkspaceSetup({
    platform: 'darwin', environment: { NODE_OPTIONS: '--trace-warnings', NODE_PATH: '/existing/modules' },
    nodeCandidates: ['/usr/local/bin/node'],
    executeNode: async (_candidate, _args, options) => {
      assert.equal(options.env.NODE_OPTIONS, '--trace-warnings');
      assert.equal(options.env.NODE_PATH, '/existing/modules');
      assert.equal(options.windowsHide, undefined);
      throw Object.assign(new Error(), { code: 'EACCES' });
    },
  });
  await assert.rejects(setup.node(), { code: 'NODE_MISSING' });
});

test('1.3 upgrade installs newly introduced core files with a backup and preserves sessions plans', async t => {
  const {setup,workspace}=await create(t);
  const manifestFile=path.join(workspace,'.harness/kit-manifest.json');
  const m=JSON.parse(await fs.readFile(manifestFile,'utf8'));m.version='1.3.0';
  m.files=m.files.filter(e=>e.path!=='.harness/kit/lib/session-plans.mjs');
  await fs.unlink(path.join(workspace,'.harness/kit/lib/session-plans.mjs'));
  await fs.writeFile(manifestFile,JSON.stringify(m,null,2)+'\n');
  const original=await fs.readFile(path.join(workspace,'.harness/plans/todo-plan.md'));
  git(workspace,'add','.');git(workspace,'-c','core.hooksPath=/dev/null','commit','-m','simulate pre-session kit inventory');
  const preview=await setup.preview({mode:'existing',workspace});
  assert.equal(preview.action,'upgrade',JSON.stringify(preview));
  const result=await setup.apply(preview.token);
  assert.equal(result.ready,true,JSON.stringify(result));assert.equal(result.version,VERSION);
  assert.deepEqual(await fs.readFile(path.join(workspace,'.harness/plans/todo-plan.md')),original);
  assert.ok((await fs.readdir(path.join(workspace,'.harness/runtime'))).some(n=>n.startsWith('kit-upgrade-')));
  await fs.stat(path.join(workspace,'.harness/kit/lib/session-plans.mjs'));
  assert.ok(JSON.parse(await fs.readFile(manifestFile)).files.some(e=>e.path==='.harness/kit/lib/session-plans.mjs'));
});

test('inspection fingerprints cover content, hooks, index, external attributes and pending transactions', async t => {
  const { workspace } = await create(t);
  const { inspectionInputs } = await import('@webpilot/workflow-kit/lib/inspection-inputs');
  const key = () => inspectionInputs(workspace).key;
  const doc = path.join(workspace, 'docs/architecture/OVERVIEW.md');
  const before = key(), st = await fs.stat(doc), body = await fs.readFile(doc, 'utf8');
  await fs.writeFile(doc, body.replace('проект', 'Проект'));
  await fs.utimes(doc, st.atime, st.mtime);
  assert.notEqual(key(), before, 'content changes with unchanged size/mtime');
  const beforeIndex = key(); git(workspace, 'add', 'docs/architecture/OVERVIEW.md');
  assert.notEqual(key(), beforeIndex, 'index-only transition');
  const attributes = path.join(workspace, '.harness/runtime/global-attributes');
  await fs.writeFile(attributes, '* -diff\n'); git(workspace, 'config', 'core.attributesFile', attributes);
  const firstAttributes = key(); await fs.writeFile(attributes, '* +diff\n');
  assert.notEqual(key(), firstAttributes, 'external attributes bytes');
  const hook = path.join(workspace, '.git/hooks/pre-commit'), mode = (await fs.stat(hook)).mode;
  const firstHook = key(); await fs.chmod(hook, mode ^ 0o100);
  assert.notEqual(key(), firstHook, 'hook execute mode'); await fs.chmod(hook, mode);
  // Foreign contents are not part of recovery, only their names/status.
  const large = path.join(workspace, 'unrelated-large.bin');
  const handle = await fs.open(large, 'w'); await handle.truncate(20 * 1024 * 1024); await handle.close();
  await fs.symlink('unrelated-large.bin', path.join(workspace, 'unrelated-link'));
  assert.equal(typeof key(), 'string');
  const transaction = path.join(workspace, '.git/workflow-kit/transaction.json');
  const beforeTransaction = key(); await fs.writeFile(transaction, '{}');
  assert.equal(inspectionInputs(workspace).transaction, true);
  assert.notEqual(key(), beforeTransaction);
});

test('one inspection validates only the current plan and historical payloads do not block readiness', async t => {
  const { workspace } = await create(t);
  const historyDir = path.join(workspace, '.harness/plans/archive/legacy-session-plans/by-session');
  await fs.mkdir(historyDir, { recursive: true });
  await fs.writeFile(path.join(historyDir, 'oversized.md'), 'invalid historical plan\n' + 'x'.repeat(220000));
  const trace = path.join(workspace, '.harness/runtime/inspection.trace2');
  const traced = new WorkspaceSetup({ environment: { ...environment, GIT_TRACE2_EVENT: trace } });
  const result = await traced.preview({ mode: 'existing', workspace });
  assert.equal(result.ready, true, JSON.stringify(result));
  assert.equal(result.checks.filter(c => c.label === 'Текущий plan проекта').length, 1);
  assert.equal(result.checks.some(c => c.label.startsWith('Полный контекст:')), false);

  const { inspectWithDiagnostics } = await import('@webpilot/workflow-kit/lib/installer');
  let changes = 0;
  assert.throws(() => inspectWithDiagnostics({ project: workspace, mode: 'existing', beforeRecheck() {
    changes++;
    execFileSync(process.execPath, ['-e', 'require("fs").appendFileSync(process.argv[1],"\\nchanged")', path.join(workspace, 'docs/architecture/OVERVIEW.md')]);
  } }), { code: 'CONCURRENT_CHANGE' });
  assert.equal(changes, 2, 'at most one retry');
});


for (const legacy of ['1.4.0', '1.4.11', '1.4.12', '1.4.13']) test(`compatible ${legacy} upgrades to the bundled Kit and migrates legacy plan data safely`, async t => {
  const { setup, workspace } = await create(t);
  const { createScope } = await import('@webpilot/workflow-kit/lib/actions');
  const { withSessionPlan, listPlans } = await import('@webpilot/workflow-kit/lib/session-plans');
  withSessionPlan(workspace, { sessionId: 'patch-upgrade-session' }, () => createScope(workspace, {
    scope_id: 'patch-upgrade', objective: 'Upgrade fixture', approval_note: 'Approved fixture', acceptance_criteria: ['Preserved'],
    approved_scope: { functional_paths: [], documentation_paths: ['docs/PRODUCT.md'], max_functional_files_per_task: 3 },
    tasks: [{ id: 'T1', title: 'Fixture', why: 'Upgrade', dependencies: [], functional_paths: [], documentation_paths: ['docs/PRODUCT.md'], acceptance_criteria: ['Preserved'], verification_ids: [], expected_commit_message: 'docs: fixture' }],
  }));
  const originals = await Promise.all(listPlans(workspace).map(async p => [p.file, await fs.readFile(path.join(workspace, p.file))]));
  const manifestFile = path.join(workspace, '.harness/kit-manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8')); manifest.version = legacy;
  const commonPath = path.join(workspace, '.harness/kit/lib/common.mjs');
  const oldCommon = (await fs.readFile(commonPath, 'utf8')).replace(`VERSION = '${VERSION}'`, `VERSION = '${legacy}'`);
  await fs.writeFile(commonPath, oldCommon);
  manifest.files.find(entry => entry.path === '.harness/kit/lib/common.mjs').hash = sha(oldCommon);
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  git(workspace, 'add', '.'); git(workspace, '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'isolated patch upgrade input');
  const preview = await setup.preview({ mode: 'existing', workspace });
  assert.equal(preview.action, 'upgrade', JSON.stringify(preview));
  const result = await setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result)); assert.equal(result.version, VERSION);
  for (const [file, bytes] of originals) assert.deepEqual(await fs.readFile(path.join(workspace, file)), bytes);
  assert.ok((await fs.readdir(path.join(workspace, '.harness/runtime'))).some(n => n.startsWith('kit-upgrade-')));
  assert.equal(git(workspace, 'status', '--porcelain'), '');
});

test('real installation of the development Kit upgrades to the bundled Kit and archives legacy session plans', async t => {
  const development = await import('../.harness/kit/lib/common.mjs');
  if (development.VERSION === VERSION) return t.skip('development and bundled Kit are the same version');
  const { parent, setup } = await fixture(t);
  const workspace = path.join(parent, 'legacy-project');
  await fs.mkdir(workspace); git(workspace, 'init', '-q', '-b', 'main');
  const kitRoot = new URL('../.harness/kit/', import.meta.url);
  execFileSync(process.execPath, [fileURLToPath(new URL('install.mjs', kitRoot)), '--project', workspace], { cwd: workspace, env: environment, encoding: 'utf8' });
  execFileSync(process.execPath, ['scripts/workflow.mjs', 'install:commit'], { cwd: workspace, env: environment, encoding: 'utf8' });
  assert.equal(JSON.parse(await fs.readFile(path.join(workspace, '.harness/kit-manifest.json'), 'utf8')).version, development.VERSION);
  const { createScope } = await import('../.harness/kit/lib/actions.mjs');
  const { withSessionPlan, listPlans } = await import('../.harness/kit/lib/session-plans.mjs');
  withSessionPlan(workspace, { sessionId: 'legacy-session' }, () => createScope(workspace, {
    scope_id: 'legacy-upgrade', objective: 'Upgrade fixture', approval_note: 'Approved fixture', acceptance_criteria: ['Preserved'],
    approved_scope: { functional_paths: [], documentation_paths: ['docs/PRODUCT.md'], max_functional_files_per_task: 3 },
    tasks: [{ id: 'T1', title: 'Fixture', why: 'Upgrade', dependencies: [], functional_paths: [], documentation_paths: ['docs/PRODUCT.md'], acceptance_criteria: ['Preserved'], verification_ids: [], expected_commit_message: 'docs: fixture' }],
  }));
  const originals = await Promise.all(listPlans(workspace).map(async p => [p.file, await fs.readFile(path.join(workspace, p.file))]));
  // A development Kit older than 1.5.0 keeps session plans in by-id: the upgrade archives them. From 1.5.0 on there is
  // one current plan and nothing to archive; the same real upgrade (development → bundled version) is still checked.
  const sessionOwned = originals.some(([file]) => file.startsWith('.harness/plans/by-id/'));
  assert.equal(sessionOwned, Number(development.VERSION.split('.')[0]) === 1 && Number(development.VERSION.split('.')[1]) < 5,
    'plan layout of the development Kit ' + development.VERSION);
  assert.ok(originals.some(([file]) => file === '.harness/plans/todo-plan.md') || sessionOwned);
  const preview = await setup.preview({ mode: 'existing', workspace });
  assert.equal(preview.action, 'upgrade', JSON.stringify(preview));
  assert.equal(preview.version, development.VERSION); assert.equal(preview.kitVersion, VERSION);
  const result = await setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result)); assert.equal(result.version, VERSION);
  for (const [file, bytes] of originals) {
    if (file === '.harness/plans/todo-plan.md') assert.deepEqual(await fs.readFile(path.join(workspace, file)), bytes, file);
    else {
      const archived = path.join(workspace, '.harness/plans/archive/legacy-session-plans', file.slice('.harness/plans/'.length));
      assert.deepEqual(await fs.readFile(archived), bytes, archived);
      await assert.rejects(fs.stat(path.join(workspace, file)), { code: 'ENOENT' });
    }
  }
  for (const template of ['PROTOTYPE', 'PLAN', 'SPEC', 'CONTINUE', 'STAGES']) await fs.stat(path.join(workspace, '.harness/kit/templates', template + '.md'));
  assert.equal(git(workspace, 'status', '--porcelain'), '');
});

test('plan:create with a legacy session argument updates the one current plan for sidebar, readiness and Doctor', async t => {
  const { setup, workspace } = await create(t);
  const sessionId = 'web-pilot-plan-create-session';
  const run = (...args) => JSON.parse(execFileSync(process.execPath, ['scripts/workflow.mjs', ...args, '--session', sessionId],
    { cwd: workspace, env: environment, encoding: 'utf8' }));
  await fs.mkdir(path.join(workspace, 'docs/planning'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'docs/planning/prototype.md'), '# Прототип\n\n## Результат\nФайл result.txt.\n');
  await fs.mkdir(path.join(workspace, '.harness/runtime'), { recursive: true });
  await fs.writeFile(path.join(workspace, '.harness/runtime/plan.json'), JSON.stringify({
    id: 'visible-plan-001', spec: 'docs/planning/prototype.md', objective: 'Проверить видимость плана сессии', stack: 'Node.js',
    checks: [{ id: 'node', executable: 'node', args: ['--version'] }],
    tasks: [{ id: 'T001', title: 'Создать результат', files: ['result.txt'], checks: ['node'], acceptance: ['result.txt создан'] }],
  }));
  // Compatibility --session is accepted but does not select or own project state.
  assert.equal(run('plan:create', '--input', '.harness/runtime/plan.json').ok, true);
  const planFile = '.harness/plans/todo-plan.md';
  await fs.stat(path.join(workspace, planFile));
  const view = await sessionPlanView(workspace, sessionId);
  assert.equal(view.plan_id, 'visible-plan-001'); assert.equal(view.plan_path, planFile);
  assert.deepEqual(view.plan.tasks.map(task => task.id), ['T001']);
  run('task:start', 'T001'); await fs.writeFile(path.join(workspace, 'result.txt'), 'ok\n');
  assert.equal(run('commit', '--task', 'T001').ok, true);
  const after = await sessionPlanView(workspace, sessionId);
  assert.equal(after.plan.tasks.find(task => task.id === 'T001').commit_status, 'DONE');
  const ready = await setup.ready(workspace);
  assert.equal(ready.ready, true, JSON.stringify(ready));
  assert.ok(ready.checks.some(check => check.ok && check.label === 'Текущий plan проекта'), JSON.stringify(ready.checks));
  assert.deepEqual(inspectDoctor(workspace).issues, []);
  assert.equal(git(workspace, 'status', '--porcelain'), '');
});

test('Windows runtime environment replaces duplicate Path casing and accepts only runtime fields', () => {
  const setup = new WorkspaceSetup({ platform: 'win32', environment: { PATH: 'old-a', Path: 'old-b', NODE_OPTIONS: '--bad' } });
  setup.setRuntimeEnvironment({ WORKFLOW_GIT_BIN: 'C:\\Pilot\\git\\cmd\\git.exe', WORKFLOW_GIT_HOME: 'C:\\Pilot\\git', Path: 'C:\\Pilot\\git\\cmd;C:\\Windows' });
  assert.deepEqual(Object.keys(setup.environment).filter(k => k.toLowerCase() === 'path'), ['Path']);
  assert.equal(setup.environment.WORKFLOW_GIT_HOME, 'C:\\Pilot\\git');
  assert.equal(setup.environment.NODE_OPTIONS, undefined);
  const previous = { ...setup.environment };
  assert.throws(() => setup.setRuntimeEnvironment({ WORKFLOW_GIT_BIN: 'changed', NODE_OPTIONS: 'bad' }), { code: 'RUNTIME_ENVIRONMENT' });
  assert.deepEqual(setup.environment, previous);
});
test('workspace worker receives prepared Git environment before its first inspection', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'pilot-environment-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  await fs.writeFile(path.join(folder, 'workspace-setup-worker.mjs'), `
    let input=''; for await (const chunk of process.stdin) input+=chunk;
    process.stdout.write(JSON.stringify({ok:true,action:JSON.parse(input).action,git:process.env.WORKFLOW_GIT_BIN,home:process.env.WORKFLOW_GIT_HOME}));
  `);
  let preparation = 0;
  const setup = new WorkspaceSetup({ resourceDir: folder, nodeCandidates: [process.execPath], environment,
    prepareEnvironment: async () => { preparation++; return { WORKFLOW_GIT_BIN: '/fixture/git', WORKFLOW_GIT_HOME: '/fixture/git-home' }; } });
  assert.deepEqual(await setup.call({ action: 'inspect' }), { ok: true, action: 'inspect', git: '/fixture/git', home: '/fixture/git-home' });
  assert.equal(preparation, 1);
  setup.prepareEnvironment = async () => { throw Object.assign(new Error('not ready'), { code: 'WINDOWS_GIT_INCOMPLETE' }); };
  await assert.rejects(setup.call({ action: 'apply' }), { code: 'WINDOWS_GIT_INCOMPLETE' });
});

async function anonymousEnvironment(t) {
  const { parent } = await fixture(t);
  const config = path.join(parent, 'gitconfig');
  await fs.writeFile(config, '[user]\n\tuseConfigOnly = true\n');
  const env = { ...environment, GIT_CONFIG_GLOBAL: config, GIT_CONFIG_NOSYSTEM: '1' };
  for (const key of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'EMAIL']) delete env[key];
  return { parent, config, env, setup: new WorkspaceSetup({ environment: env }) };
}
test('a clean machine creates committed local history without personal attributes or global Git changes', async t => {
  const f = await anonymousEnvironment(t), original = await fs.readFile(f.config, 'utf8');
  const preview = await f.setup.preview({ mode: 'new', parent: f.parent, name: 'Без личных данных' });
  assert.equal(Object.hasOwn(preview, 'gitIdentityReady'), false);
  const result = await f.setup.apply(preview.token);
  assert.equal(result.ready, true, JSON.stringify(result));
  const local = (...args) => execFileSync('git', args, { cwd: result.workspace, env: f.env, encoding: 'utf8' }).trim();
  assert.equal(local('config', '--local', 'user.name'), 'Web Pilot');
  assert.equal(local('config', '--local', 'user.email'), 'web-pilot@localhost');
  assert.equal(local('log', '-1', '--format=%an <%ae>'), 'Web Pilot <web-pilot@localhost>');
  assert.equal(await fs.readFile(f.config, 'utf8'), original);
  assert.equal(JSON.stringify(result).includes('web-pilot@localhost'), false);
  const reloaded = new WorkspaceSetup({ environment: f.env });
  assert.equal((await reloaded.ready(result.workspace)).ready, true);
});
test('existing complete Git identity is preserved and partial identity gets only the missing value', async t => {
  const f = await anonymousEnvironment(t);
  for (const complete of [true, false]) {
    const workspace = path.join(f.parent, complete ? 'configured' : 'partial');
    await fs.mkdir(workspace);
    const local = (...args) => execFileSync('git', args, { cwd: workspace, env: f.env, encoding: 'utf8' }).trim();
    local('init', '-b', 'main'); local('config', '--local', 'user.name', 'Existing User');
    if (complete) local('config', '--local', 'user.email', 'existing@example.invalid');
    const preview = await f.setup.preview({ mode: 'existing', workspace });
    assert.equal((await f.setup.apply(preview.token)).ready, true);
    assert.equal(local('config', '--local', 'user.name'), 'Existing User');
    assert.equal(local('config', '--local', 'user.email'), complete ? 'existing@example.invalid' : 'web-pilot@localhost');
  }
});
test('worker Node accepts only supported Node 24 releases on macOS and Windows', async t => {
  for (const platform of ['darwin', 'win32']) {
    for (const [version, expected] of [
      ['v22.17.0', 'NODE_TOO_OLD'], ['v24.20.0', 'NODE_TOO_OLD'],
      ['v25.0.0', 'NODE_UNSUPPORTED'], ['v26.0.0', 'NODE_UNSUPPORTED'],
      ['v24.21.0', null], ['v24.21.1', null], ['v24.22.0', null],
    ]) await t.test(platform + ' ' + version, async () => {
      const candidate = platform === 'win32' ? 'node.exe' : '/fixture/node';
      const setup = new WorkspaceSetup({ platform, nodeCandidates: [candidate],
        executeNode: async () => ({ stdout: version + '\r\n' }) });
      if (expected) await assert.rejects(setup.node(), { code: expected });
      else assert.equal(await setup.node(), candidate);
    });
    await t.test(platform + ' continues past unsupported Node', async () => {
      const candidates = platform === 'win32' ? ['newer.exe', 'supported.exe'] : ['/newer/node', '/supported/node'];
      const setup = new WorkspaceSetup({ platform, nodeCandidates: candidates,
        executeNode: async candidate => ({ stdout: candidate === candidates[0] ? 'v25.0.0\n' : 'v24.21.0\n' }) });
      assert.equal(await setup.node(), candidates[1]);
    });
  }
});

test('selected absolute Node is available to nested Kit checks with a Finder-like PATH', async t => {
  const { SessionPlans } = await import('../src/session-plans.mjs');
  const { parent } = await fixture(t);
  const setup = new WorkspaceSetup({ nodeCandidates: [process.execPath], environment: { ...environment, PATH: '/usr/bin:/bin' } });
  const preview = await setup.preview({ mode: 'new', parent, name: 'Minimal PATH' });
  const { workspace } = await setup.apply(preview.token);
  const plans = new SessionPlans({ setup });
  await fs.mkdir(path.join(workspace, 'docs/planning'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'docs/planning/test.md'), '# Minimal PATH\n\n## Result\nNested Node check.\n');
  await plans.call(workspace, 'plan:create', [], { id: 'nested-node', spec: 'docs/planning/test.md', objective: 'Nested Node', stack: 'Node',
    checks: [{ id: 'test', executable: 'node', args: ['--test', 'result.test.mjs'] }],
    tasks: [{ id: 'T001', title: 'Result', files: ['result.test.mjs'], checks: ['test'], acceptance: ['Node executes'] }] });
  await plans.call(workspace, 'task:start', ['T001']);
  await fs.writeFile(path.join(workspace, 'result.test.mjs'), "import test from 'node:test';import assert from 'node:assert/strict';test('runtime',()=>assert.equal(process.execPath,"+JSON.stringify(process.execPath)+"));\n");
  assert.equal((await plans.call(workspace, 'commit', ['--task', 'T001'])).ok, true);
  const paths = setup.environment.PATH.split(':');
  assert.equal(paths[0], path.dirname(process.execPath));
  await setup.node();assert.deepEqual(setup.environment.PATH.split(':'), paths, 'cached Node does not duplicate PATH');
  assert.equal(environment.PATH, process.env.PATH, 'parent environment is unchanged');
});

test('Windows cached Node restores its directory after runtime environment preparation', async () => {
  const setup = new WorkspaceSetup({ platform: 'win32', environment: { PATH: 'C:\\Windows', Path: 'old' },
    nodeCandidates: ['C:\\Pilot\\node\\node.exe'], executeNode: async () => ({ stdout: 'v24.21.0\n' }) });
  await setup.node();assert.equal(setup.environment.Path, 'C:\\Pilot\\node;C:\\Windows');
  setup.setRuntimeEnvironment({ Path: 'C:\\Git\\cmd;C:\\Windows' });
  await setup.node();assert.equal(setup.environment.Path, 'C:\\Pilot\\node;C:\\Git\\cmd;C:\\Windows');
  assert.deepEqual(Object.keys(setup.environment).filter(key=>key.toLowerCase()==='path'), ['Path']);
});
