import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Runs before any store, browser partition or service is constructed.
export function configureDesktopIdentity(app, { smoke = false, temporaryRoot = os.tmpdir() } = {}) {
  const dataDir = smoke ? fs.mkdtempSync(path.join(temporaryRoot, 'workflow-pilot-smoke-'))
    : path.join(app.getPath('appData'), 'Workflow Pilot');
  const browserDir = path.join(dataDir, 'browser');
  for (const directory of [dataDir, browserDir]) {
    if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) {
      throw new Error('Workflow Pilot refuses a linked profile directory: ' + directory);
    }
  }
  app.setName('Workflow Pilot');
  app.setPath('userData', dataDir);
  app.setPath('sessionData', browserDir);
  return { dataDir, partition: smoke ? 'workflow-pilot-smoke' : 'persist:workflow-pilot-chatgpt' };
}
