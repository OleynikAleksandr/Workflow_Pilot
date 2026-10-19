import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureDesktopIdentity } from '../src/frontend/desktop/bootstrap.mjs';
import { defaultRuntimeFolder } from '../src/execution/platform/paths.mjs';
import { VPS_TUNNEL_LABEL, VPS_SSH_HOST, VPS_REMOTE_PORT } from '../src/execution/runtime/vps.mjs';
import { APP_SERVER_LAUNCH_AGENT } from '../src/execution/runtime/service.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-pilot-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const paths = { appData: root };
  const app = { setName(name) { this.name = name; }, getPath(key) { return paths[key]; }, setPath(key, value) { paths[key] = value; } };
  return { root, app, paths };
}

test('desktop bootstrap gives the new application isolated profile and services', t => {
  const { root, app, paths } = fixture(t);
  const donor = path.join(root, 'Project Web Pilot');
  fs.mkdirSync(donor); fs.writeFileSync(path.join(donor, 'settings.json'), 'donor sentinel');
  const result = configureDesktopIdentity(app);
  assert.equal(app.name, 'Workflow Pilot');
  assert.equal(result.dataDir, path.join(root, 'Workflow Pilot'));
  assert.equal(paths.sessionData, path.join(result.dataDir, 'browser'));
  assert.equal(result.partition, 'persist:workflow-pilot-chatgpt');
  assert.equal(fs.readFileSync(path.join(donor, 'settings.json'), 'utf8'), 'donor sentinel');
  for (const platform of ['darwin', 'win32', 'linux']) {
    assert.match(defaultRuntimeFolder(root, platform, {}), /WorkflowPilotCodexExecutor$/);
  }
  assert.equal(APP_SERVER_LAUNCH_AGENT, 'com.oleynik.WorkflowPilotCodexExecutor');
  assert.equal(VPS_TUNNEL_LABEL, 'com.oleynik.workflow-pilot-vps');
  assert.equal(VPS_SSH_HOST, 'workflow-pilot-vps');
  assert.equal(VPS_REMOTE_PORT, 18842);
});

test('bootstrap refuses a profile symlink pointing at the donor', t => {
  const { root, app } = fixture(t);
  const donor = path.join(root, 'donor'); fs.mkdirSync(donor);
  fs.symlinkSync(donor, path.join(root, 'Workflow Pilot'), 'junction');
  assert.throws(() => configureDesktopIdentity(app), /linked profile/);
  assert.deepEqual(fs.readdirSync(donor), []);
});

test('smoke keeps all browser data under its disposable fixture', t => {
  const { root, app, paths } = fixture(t);
  const result = configureDesktopIdentity(app, { smoke: true, temporaryRoot: root });
  assert.equal(path.dirname(result.dataDir), fs.realpathSync(root));
  assert.equal(result.dataDir,fs.realpathSync(result.dataDir),'SDK journal receives a canonical fixture path');
  assert.equal(paths.sessionData, path.join(result.dataDir, 'browser'));
  assert.equal(result.partition.startsWith('persist:'), false);
});
