import { sha256File } from '../src/common.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { extractFile } from '@electron/asar';
import { sourceSnapshot, verifyPackagedSources } from './release-all.mjs';
import { verifyWindowsPackage } from './verify-windows-package.mjs';
import { verifyWorkflowKitRuntime } from './stage-workflow-kit.mjs';
import { createRequire } from 'node:module';
import { verifyMacSignature, macDirectoryIdentity, assertSameMacDirectory } from './check-mac-signature.mjs';
import { WINDOWS_RUNTIME_ARCHIVE, WINDOWS_RUNTIME_SHA256 } from '../src/windows-runtime.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const delivery = path.join(os.homedir(), 'Downloads', 'WorkflowPilot-' + version);
const manifest = JSON.parse(await fs.readFile(path.join(delivery, 'release-manifest.json'), 'utf8'));
assert.equal(manifest.version, version); assert.equal(manifest.packagedSourceMatches, true);
const sources = await sourceSnapshot(root);
const rootApp = path.join(root, 'Workflow Pilot.app');
const appsApp = '/Applications/Workflow Pilot.app';
const targets = [
  path.join(rootApp, 'Contents/Resources'),
  path.join(appsApp, 'Contents/Resources'),
  path.join(root, '.harness/runtime/build/Workflow Pilot-darwin-arm64/Workflow Pilot.app/Contents/Resources'),
  path.join(root, '.harness/runtime/build/Workflow Pilot-win32-x64/resources'),
];
for (const resources of targets) await verifyPackagedSources({ root, resources, version, sources });
for (const app of [rootApp, appsApp]) {
  assert.deepEqual(await verifyMacSignature({ bundle: app, root }), manifest.macCodeSignature);
  assert.equal((await fs.lstat(app)).isSymbolicLink(), false);
  assert.equal(execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', path.join(app, 'Contents/Info.plist')], { encoding: 'utf8' }).trim(), version);
}
const preflight = JSON.parse(await fs.readFile(path.join(root, '.harness/runtime/release-' + version + '-preflight.json'), 'utf8'));
for (const app of [rootApp, appsApp]) {
  const before = preflight.find(item => item.path === app);
  assert.ok(before, 'preflight identity for ' + app);
  assertSameMacDirectory(before, await macDirectoryIdentity(app), app);
}
assert.equal(Object.keys(sources).length, manifest.sourceFiles);
const hashList = await fs.readFile(path.join(delivery, 'SHA256SUMS.txt'), 'utf8');
const runtimeArchive = manifest.windowsRuntimeArchive;
assert.deepEqual({ file: runtimeArchive?.file, sha256: runtimeArchive?.sha256 }, { file: WINDOWS_RUNTIME_ARCHIVE, sha256: WINDOWS_RUNTIME_SHA256 });
assert.equal((await fs.stat(path.join(delivery, runtimeArchive.file))).size, runtimeArchive.bytes);
assert.equal(await sha256File(path.join(delivery, runtimeArchive.file)), WINDOWS_RUNTIME_SHA256);
assert.equal(hashList, [...manifest.artifacts, runtimeArchive].map(a => a.sha256 + '  ' + a.file).join('\n') + '\n');
assert.ok((await fs.readFile(path.join(delivery, 'INSTALL.txt'), 'utf8')).startsWith('Workflow Pilot ' + version + '\n'));
assert.equal(manifest.artifacts.length, 2);
assert.deepEqual(manifest.artifacts.map(a => a.platform), ['macOS arm64', 'Windows x64']);

assertSameMacDirectory(manifest.identity, await macDirectoryIdentity(rootApp), rootApp);
for (const artifact of manifest.artifacts) {
  const zip = path.join(delivery, artifact.file);
  assert.equal((await fs.stat(zip)).size, artifact.bytes);
  assert.equal(await sha256File(zip), artifact.sha256);
  const prefix = artifact.platform.startsWith('macOS')
    ? 'Workflow Pilot.app/Contents/Resources/' : 'Workflow Pilot-win32-x64/resources/';
  const preload = execFileSync('/usr/bin/unzip', ['-p', zip, prefix + 'resources/chatgpt-page-observer-preload.cjs'], { maxBuffer: 1024 * 1024 });
  assert.deepEqual(preload, await fs.readFile(path.join(targets[0], 'resources/chatgpt-page-observer-preload.cjs')));
}

// Probe both installed copies, without opening or stopping the user's application.
const nodeEnvironment = { ...process.env };
for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'ELECTRON_RUN_AS_NODE']) delete nodeEnvironment[key];
for (const app of [rootApp, appsApp]) {
  const versions = JSON.parse(execFileSync(path.join(app, 'Contents/MacOS/Workflow Pilot'),
    ['-p', 'JSON.stringify(process.versions)'],
    { encoding: 'utf8', timeout: 10000, env: { ...nodeEnvironment, ELECTRON_RUN_AS_NODE: '1' } }));
  assert.equal(versions.node, '24.21.0'); assert.equal(versions.electron, '44.5.1');
  const bundled = path.join(app, 'Contents/Resources/mac-tools/node/bin/node');
  assert.equal(execFileSync(bundled, ['-p', 'process.version + " " + process.arch'],
    { encoding: 'utf8', timeout: 10000, env: nodeEnvironment }).trim(), 'v24.21.0 arm64');
}
const bundledNode = path.join(targets[1], 'mac-tools/node/bin/node');
const isolatedEnvironment = { ...nodeEnvironment,
  PATH: [path.dirname(bundledNode), '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(path.delimiter) };
assert.deepEqual(execFileSync('/usr/bin/which', ['-a', 'node'],
  { encoding: 'utf8', env: isolatedEnvironment }).trim().split('\n'), [bundledNode],
  'fixture PATH resolves only the bundled Node');
const windows = await verifyWindowsPackage(path.dirname(targets[3]));
await fs.access(path.join(targets[3], 'windows-node/node-v24.21.0-win-x64/node.exe'));
assert.equal(windows.version, version);

for (const resources of [targets[0], targets[3]]) {
  const kit = path.join(resources,'resources/workflow-kit');
  const bundledKit = await verifyWorkflowKitRuntime(kit); // the package source of this repository, file for file
  const { readPlan } = await import(pathToFileURL(path.join(kit,'lib/plan.mjs')).href);
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(),'web-pilot-carryover-'));
  const run = (exe,args) => execFileSync(exe,args,{cwd:fixture,encoding:'utf8',timeout:30000,env:isolatedEnvironment});
  const cli = (...args) => {
    const result=JSON.parse(run(bundledNode,[path.join(fixture,'scripts/workflow.mjs'),...args]));
    assert.equal(result.ok,true,JSON.stringify(result));return result;
  };
  try {
    run('git',['init','-b','main']);run('git',['config','user.name','Installed Kit Test']);
    run('git',['config','user.email','test@example.invalid']);
    await fs.mkdir(path.join(fixture,'docs/planning'),{recursive:true});
    await fs.writeFile(path.join(fixture,'docs/planning/fixture.md'),'# Installed carryover\n');
    run('git',['add','docs/planning/fixture.md']);run('git',['commit','-m','fixture']);
    // Exercise the worker from each package with installed Mac Node; Windows JS is cross-package only.
    const worker = input => {
      const result = JSON.parse(execFileSync(bundledNode,
        [path.join(resources, 'resources/workspace-setup-worker.mjs')],
        { cwd: fixture, encoding: 'utf8', timeout: 60000, env: isolatedEnvironment,
          input: JSON.stringify({ project: fixture, mode: 'existing', ...input }) }));
      assert.equal(result.ok, true, JSON.stringify(result)); return result;
    };
    const preview = worker({ action: 'inspect' });
    assert.equal(preview.action, 'install');
    const installed = worker({ action: 'apply', fingerprint: preview.fingerprint });
    assert.equal(installed.kitVersion, bundledKit.version); assert.equal(installed.ready, true);
    assert.equal(worker({ action: 'inspect' }).ready, true);
    cli('status'); assert.equal(cli('recover', '--format', 'json').completeness, 'COMPLETE');
    const file=path.join(fixture,'.harness/runtime/input.json');
    await fs.writeFile(file,JSON.stringify({id:'old',spec:'docs/planning/fixture.md',objective:'Installed carryover',
      tasks:[{id:'T001',title:'Remaining',files:['docs/planning/fixture.md'],acceptance:['Retained criterion']}]}));
    cli('plan:create','--input',file);
    const before=await fs.readFile(path.join(fixture,'.harness/plans/todo-plan.md'),'utf8');
    const beforeHead=run('git',['rev-parse','HEAD']).trim();
    const revision=String(readPlan(fixture).plan_revision);
    await fs.writeFile(file,JSON.stringify({scope:'old',id:'new',approval_note:'Explicit installed test carryover'}));
    cli('plan:carryover','--input',file,'--expected-revision',revision);
    const after=readPlan(fixture);
    assert.deepEqual(after.tasks.map(t=>[t.id,t.implementation_status]),[['T001','TODO']]);
    assert.equal(after.carryover.source_commit,beforeHead);
    assert.equal(run('git',['show',beforeHead+':.harness/plans/todo-plan.md']),before);
    await assert.rejects(fs.access(path.join(fixture,'.harness/plans/archive/old.md')), { code: 'ENOENT' });
    assert.deepEqual(after.tasks[0].acceptance_criteria,['Retained criterion']);
    assert.ok(after.context_pack.documents.some(d=>d.path==='docs/planning/fixture.md' && d.required));
    cli('validate');assert.equal(run('git',['status','--porcelain']).trim(),'');
  } finally {await fs.rm(fixture,{recursive:true,force:true});}
}

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'web-pilot-installed-observer-'));
try {
  for (const file of ['page-state.mjs','page-state-bridge.mjs','chatgpt-dom.mjs','chatgpt-composer.mjs','auto-plan.mjs'])
    await fs.writeFile(path.join(temporary, file), extractFile(path.join(targets[0], 'app.asar'), 'src/' + file));
  await fs.writeFile(path.join(temporary, 'progress.mjs'), extractFile(path.join(targets[0], 'app.asar'), 'src/ui/progress.mjs'));
  const installedAuto = await import(pathToFileURL(path.join(temporary, 'auto-plan.mjs')).href);
  assert.equal(installedAuto.CONTINUE_TEXT, 'Продолжай');
  assert.equal(Object.hasOwn(installedAuto, 'AUTO_PLAN_INSTRUCTION'), false);
  for (const method of ['reconcile', 'planChanged', 'checkpointState'])
    assert.equal(typeof installedAuto.AutoPlan.prototype[method], 'function', 'installed client state machine: ' + method);
  const { operationLabel } = await import(pathToFileURL(path.join(temporary, 'progress.mjs')).href);
  for (const phase of ['waiting-chat', 'send-unknown'])
    assert.equal(operationLabel({ context: { phase }, contextPreparation: { busy: true } }), null,
      'installed UI has no post-Send progress indicator');
  const require = createRequire(import.meta.url);
  const environment = { ...process.env }; delete environment.ELECTRON_RUN_AS_NODE;
  const result = execFileSync(require('electron'), [path.join(root, 'tests/installed-observer-fixture.cjs'),
    targets[0], temporary, path.join(temporary, 'profile')], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
    env: environment,
  });
  process.stdout.write(result);
} finally { await fs.rm(temporary, { recursive: true, force: true }); }
console.log(JSON.stringify({ version, delivery, packagedSources: true, installedResourcesExecuted: true,
  clientAutoPlan: true, sourceCommit: manifest.sourceCommit, sourceFiles: manifest.sourceFiles,
  artifacts: manifest.artifacts, finderIdentityPreserved: true,
  embeddedNode: '24.21.0', bundledMacNode: 'v24.21.0 arm64', bundledWindowsNode: 'node-v24.21.0-win-x64',
  workerAndKitWithoutSystemNode: true, windowsPackageVerified: true,
  nativeWindowsTested: false, liveChatGPT: false }));
