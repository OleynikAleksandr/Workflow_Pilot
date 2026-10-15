import fs from 'node:fs';
import { desktopDependencies } from '../../execution/facade.mjs';
import { createBackendComposition } from '../../backend/bootstrap.mjs';
import { createDesktopModel } from '../../backend/desktop-model.mjs';
import { assertNoBackendOwner } from '../../backend/identity.mjs';
import {fileURLToPath} from 'node:url';
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
  if (!smoke) assertNoBackendOwner(dataDir);
  app.setName('Workflow Pilot');
  app.setPath('userData', dataDir);
  app.setPath('sessionData', browserDir);
  return { dataDir, partition: smoke ? 'workflow-pilot-smoke' : 'persist:workflow-pilot-chatgpt' };
}

// Identity is configured before importing the desktop shell or creating services.
export async function startDesktop(electron) {
  const {app}=electron;
  const eventBaseline=!app.isPackaged&&process.argv.includes('--event-runtime-baseline');
  const eventRuntimeChecker=!app.isPackaged&&process.argv.includes('--event-runtime-checker');
  const smoke=!app.isPackaged&&(process.argv.includes('--smoke')||eventBaseline);
  const identity=configureDesktopIdentity(app,{smoke});
  const {execution:executionServices,createControl}=createBackendComposition();
  const {startDesktopApplication}=await import('./application.mjs');
  return startDesktopApplication({electron,...identity,smoke,eventBaseline,eventRuntimeChecker,
    sourceDir:fileURLToPath(new URL('../../',import.meta.url)),
    desktopDir:fileURLToPath(new URL('./',import.meta.url)),executionServices,
    createControl,createDesktopModel,
    dependencies:desktopDependencies,
  });
}
