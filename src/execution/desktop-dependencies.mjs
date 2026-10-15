import { LinuxExecutorBootstrap, LinuxRuntimeSwitcher } from './platform/linux/runtime.mjs';
import { LinuxServices } from './platform/linux/services.mjs';
import { bundledLinuxNode, BUNDLED_NODE_VERSION, defaultRuntimeFolder, bundledMacNode, nodeExecutableCandidates } from './platform/paths.mjs';
import { chatGPTTitleScript } from './browser/chatgpt-title.mjs';
import { toolFilterScript } from './browser/chatgpt-tool-filter.mjs';
import { installChatGPTAutoScroll } from './browser/chatgpt-auto-scroll.mjs';
import { ChatColors, normalizeChatColors, validateColorChange, DEFAULT_COLORS } from './browser/chatgpt-colors.mjs';
import { chatGPTEntrypoint, CHATGPT_SIGNIN_ENTRYPOINT } from './browser/chatgpt-experience.mjs';
import { WindowsExecutorBootstrap, WINDOWS_RUNTIME_ARCHIVE } from './runtime/windows.mjs';
import { CodexAppServerRuntime, MacRuntimeSwitcher, runtimeLabel, CHATGPT_CHANNEL_SECURE, CHATGPT_CHANNELS } from './runtime/service.mjs';
import { VpsTunnel, WindowsVpsTunnel } from './runtime/vps.mjs';
import { inspectMacGit, installMacGit } from './platform/mac-setup.mjs';
import { ChromiumDiagnostics, safeUrl } from './browser/diagnostics.mjs';
import { appendDiagnostic } from './files/diagnostics.mjs';

// Platform adapters of the Desktop model, the same for the in-process window
// and the independent backend.
export const desktopDependencies = Object.freeze({ LinuxExecutorBootstrap, LinuxRuntimeSwitcher, LinuxServices, bundledLinuxNode,
  ChromiumDiagnostics, safeUrl, appendDiagnostic, inspectMacGit, installMacGit, chatGPTTitleScript, toolFilterScript,
  installChatGPTAutoScroll, ChatColors, normalizeChatColors, validateColorChange, DEFAULT_COLORS, chatGPTEntrypoint,
  CHATGPT_SIGNIN_ENTRYPOINT, BUNDLED_NODE_VERSION, defaultRuntimeFolder, bundledMacNode, nodeExecutableCandidates,
  WindowsExecutorBootstrap, WINDOWS_RUNTIME_ARCHIVE, CodexAppServerRuntime, MacRuntimeSwitcher, runtimeLabel,
  CHATGPT_CHANNEL_SECURE, CHATGPT_CHANNELS, VpsTunnel, WindowsVpsTunnel });
