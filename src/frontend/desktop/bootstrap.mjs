import fs from 'node:fs';
import { LinuxExecutorBootstrap, LinuxRuntimeSwitcher } from '../../execution/platform/linux/runtime.mjs';
import { LinuxServices } from '../../execution/platform/linux/services.mjs';
import { bundledLinuxNode } from '../../execution/platform/paths.mjs';
import { chatGPTTitleScript } from '../../execution/browser/chatgpt-title.mjs';
import { toolFilterScript } from '../../execution/browser/chatgpt-tool-filter.mjs';
import { installChatGPTAutoScroll } from '../../execution/browser/chatgpt-auto-scroll.mjs';
import { ChatColors, normalizeChatColors, validateColorChange, DEFAULT_COLORS } from '../../execution/browser/chatgpt-colors.mjs';
import { chatGPTEntrypoint, CHATGPT_SIGNIN_ENTRYPOINT } from '../../execution/browser/chatgpt-experience.mjs';
import { BUNDLED_NODE_VERSION, defaultRuntimeFolder, bundledMacNode, nodeExecutableCandidates } from '../../execution/platform/paths.mjs';
import { WindowsExecutorBootstrap, WINDOWS_RUNTIME_ARCHIVE } from '../../execution/runtime/windows.mjs';
import { CodexAppServerRuntime, MacRuntimeSwitcher, runtimeLabel, CHATGPT_CHANNEL_SECURE, CHATGPT_CHANNELS } from '../../execution/runtime/service.mjs';
import { VpsTunnel, WindowsVpsTunnel } from '../../execution/runtime/vps.mjs';
import { ExecutionFacade } from '../../execution/facade.mjs';
import {fileURLToPath} from 'node:url';
import { inspectMacGit, installMacGit } from '../../execution/platform/mac-setup.mjs';
import { ChromiumDiagnostics, safeUrl } from '../../execution/browser/diagnostics.mjs';
import { appendDiagnostic } from '../../execution/files/diagnostics.mjs';
import {ControlFacade} from '../../control/facade.mjs';
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

// Identity is configured before importing the desktop shell or creating services.
export async function startDesktop(electron) {
  const {app}=electron;
  const eventBaseline=!app.isPackaged&&process.argv.includes('--event-runtime-baseline');
  const eventRuntimeChecker=!app.isPackaged&&process.argv.includes('--event-runtime-checker');
  const smoke=!app.isPackaged&&(process.argv.includes('--smoke')||eventBaseline);
  const identity=configureDesktopIdentity(app,{smoke});
  const executionServices=new ExecutionFacade();
  const {startDesktopApplication}=await import('./application.mjs');
  return startDesktopApplication({electron,...identity,smoke,eventBaseline,eventRuntimeChecker,
    sourceDir:fileURLToPath(new URL('../../',import.meta.url)),
    desktopDir:fileURLToPath(new URL('./',import.meta.url)),executionServices,
    createControl:options=>new ControlFacade({...options,execution:executionServices}),
    dependencies:{LinuxExecutorBootstrap,LinuxRuntimeSwitcher,LinuxServices,bundledLinuxNode,ChromiumDiagnostics,safeUrl,appendDiagnostic,inspectMacGit,installMacGit,chatGPTTitleScript, toolFilterScript, installChatGPTAutoScroll, ChatColors, normalizeChatColors, validateColorChange, DEFAULT_COLORS, chatGPTEntrypoint, CHATGPT_SIGNIN_ENTRYPOINT, BUNDLED_NODE_VERSION, defaultRuntimeFolder, bundledMacNode, nodeExecutableCandidates, WindowsExecutorBootstrap, WINDOWS_RUNTIME_ARCHIVE, CodexAppServerRuntime, MacRuntimeSwitcher, runtimeLabel, CHATGPT_CHANNEL_SECURE, CHATGPT_CHANNELS, VpsTunnel, WindowsVpsTunnel},
  });
}
