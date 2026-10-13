import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const execute = promisify(execFile);
const PREPARATION_ERRORS = {
  WINDOWS_RUNTIME_PAYLOAD_MISSING: 'В комплекте отсутствует архив локальных компонентов Windows. Заново распакуйте всю папку приложения.',
  WINDOWS_RUNTIME_PAYLOAD_DAMAGED: 'Архив локальных компонентов повреждён. Скопируйте и распакуйте Windows ZIP заново.',
  WINDOWS_RUNTIME_ARCHIVE_INVALID: 'Архив локальных компонентов имеет неверную структуру. Заново распакуйте всю поставку.',
  WINDOWS_RUNTIME_SETUP_FAILED: 'Не удалось подготовить компоненты Windows. Проверьте доступ к интернету и разрешение Windows на запуск, затем нажмите «Проверить и продолжить».',
  WINDOWS_RUNTIME_SETUP_INCOMPLETE: 'Установка компонентов Windows не завершилась. Нажмите «Проверить и продолжить».',
  WINDOWS_RUNTIME_NOT_INSTALLED: 'Компоненты Windows ещё не подготовлены. Нажмите «Проверить и продолжить».',
  WINDOWS_GIT_LAYOUT_INVALID: 'Комплектный Git не соответствует установленным компонентам. Повторите подготовку; если ошибка сохраняется, передайте этот код разработчику.',
  WINDOWS_GIT_INCOMPLETE: 'Комплектный Git неполон. Заново распакуйте полный Windows ZIP и повторите подготовку.',
  WINDOWS_GIT_START_FAILED: 'Windows не запустила комплектный Git. Проверьте разрешение на запуск приложения и повторите подготовку.',
  // Codes of the Codex App Server executor on both systems. A computer without Codex carries its own message.
  APP_SERVER_AUTOSTART_FAILED: 'Службы запущены, но не удалось настроить их запуск при входе в Windows. Нажмите «Проверить и продолжить». Если ошибка повторяется, передайте этот код разработчику.',
  APP_SERVER_RUNTIME_COMMAND_FAILED: 'Не удалось загрузить, установить или запустить локальные компоненты. Проверьте доступ к интернету и нажмите «Проверить и продолжить». Если ошибка повторяется, передайте этот код разработчику.',
  APP_SERVER_SELECTOR_CONFIG_FAILED: 'Не удалось сохранить настройку локального подключения. Нажмите «Проверить и продолжить». Если ошибка повторяется, передайте этот код разработчику.',
  RUNTIME_STATUS_INVALID: 'Локальный компонент вернул непонятный ответ. Обновите Web Pilot и повторите подготовку.',
  RUNTIME_FOREIGN_PROCESS: 'Порт локального подключения занят другой программой. Перезагрузите компьютер и нажмите «Проверить и продолжить».',
  RUNTIME_NOT_READY: 'Локальные компоненты запущены, но ещё не подтвердили готовность. Нажмите «Проверить и продолжить».',
};


// Avoid /usr/bin/git on an unprepared Mac: the shim can launch a system dialog.
export async function inspectMacGit(run = execute) {
  try {
    const { stdout } = await run('/usr/bin/xcode-select', ['-p'], { timeout: 5000 });
    const developer = stdout.trim();
    if (!path.isAbsolute(developer)) return false;
    const result = await run('/usr/bin/git', ['--version'], { timeout: 5000 });
    return /^git version \d+\./.test(result.stdout.trim());
  } catch { return false; }
}
export async function installMacGit(run = execute) {
  try { await run('/usr/bin/xcode-select', ['--install'], { timeout: 10000 }); }
  catch { throw Object.assign(new Error('Не удалось открыть установку Apple.'), { publicMessage: 'Не удалось открыть установку Apple. Проверьте «Системные настройки → Основные → Обновление ПО» и повторите проверку.' }); }
  // xcode-select requests installation but does not guarantee foreground activation.
  // LaunchServices reuses the system helper; no AppleScript or accessibility consent.
  try {
    await run('/usr/bin/open', ['-a', '/System/Library/CoreServices/Install Command Line Developer Tools.app'], { timeout: 10000 });
  } catch {
    return { warning: 'Установка Apple запущена, но её окно не удалось вывести вперёд. Сверните Web Pilot жёлтой кнопкой и подтвердите установку. После завершения вернитесь и нажмите «Проверить и продолжить».' };
  }
  return { warning: null };
}

export class StartupReadiness {
  constructor({ platform = 'darwin', prepareComponents, probeNode, probeGit, inspectRuntime, prepareRuntime, installGit, configureTunnel, onChange = () => {},
    schedule = setTimeout, cancel = clearTimeout, scheduleGit = setTimeout, cancelGit = clearTimeout,
    gitPollInterval = 5000, gitPollLimit = 720 } = {}) {
    Object.assign(this, { platform, prepareComponents, probeNode, probeGit, inspectRuntime, prepareRuntime, installGit, configureTunnel, onChange, schedule, cancel,
      scheduleGit, cancelGit, gitPollInterval, gitPollLimit });
    this.state = { platform, phase: 'checking', busy: false, node: false, git: false, runtime: false, tunnel: false,
      gitInstallationRequested: false, account: 'unknown', page: 'idle', pageError: null, error: null };
    this.live = true; this.pending = null; this.pageGeneration = 0; this.timer = null;
    this.gitTimer = null; this.gitWatchGeneration = 0;
  }
  snapshot() { return { ...this.state }; }
  publish(patch) { if (!this.live) return; Object.assign(this.state, patch); this.onChange(this.snapshot()); }
  async serial(operation) {
    if (this.pending) return this.pending;
    if (!this.live) return;
    this.publish({ busy: true, error: null });
    this.pending = Promise.resolve().then(operation).catch(error => {
      // Never publish command arguments or raw stderr, which may contain credentials.
      const known = Object.hasOwn(PREPARATION_ERRORS, error?.code) ? PREPARATION_ERRORS[error.code] + ' (' + error.code + ')' : null;
      this.publish({ phase: 'error', error: error?.publicMessage || known || 'Не удалось подготовить локальные компоненты. Нажмите «Проверить и продолжить». Если ошибка повторяется, сообщите разработчику, на каком шаге она появилась.' });
    }).finally(() => { this.pending = null; this.publish({ busy: false }); });
    return this.pending;
  }
  async probe({ prepare = false } = {}) {
    this.stopGitWatch();
    this.publish({ phase: 'checking', runtime: false, tunnel: false });
    const node = await this.probeNode().then(() => true, () => false);
    if (node && prepare && this.prepareComponents && this.live) {
      this.publish({ node, phase: 'preparing-components' });
      await this.prepareComponents();
    }
    if (!this.live) return false;
    // Windows errors need their specific retry message; macOS absence is an install step.
    const git = this.platform === 'win32' ? await this.probeGit() : await this.probeGit().catch(() => false);
    if (!this.live) return false;
    this.publish({ node, git, ...(git ? { gitInstallationRequested: false } : {}) });
    if (!node) { this.publish({ phase: 'package', error: this.platform === 'win32'
      ? 'Не запускается встроенный компонент приложения. Полностью распакуйте Windows ZIP на локальный диск и откройте Workflow Pilot.exe снова.'
      : 'В приложении не запускается встроенный компонент. Скопируйте полное приложение в Applications и откройте его снова.' }); return false; }
    if (!git) {
      this.publish({ phase: this.state.gitInstallationRequested ? 'git-installing' : 'git' });
      if (this.state.gitInstallationRequested) this.watchGitInstallation();
      return false;
    }
    const service = await this.inspectRuntime();
    this.publish({ runtime: !!service?.mcp?.ready, tunnel: !!service?.tunnel?.ready && !!service?.tunnel?.configured });
    return true;
  }
  check({ prepare = false } = {}) {
    return this.serial(async () => {
      if (!await this.probe({ prepare }) || !this.live) return;
      if (prepare && (!this.state.runtime || !this.state.tunnel)) await this.prepare();
      else this.publish({ phase: this.state.runtime ? (this.state.tunnel ? 'connected' : 'tunnel') : 'prepare' });
    });
  }
  async prepare() {
    this.publish({ phase: 'preparing', runtime: false, tunnel: false });
    let service;
    try { service = await this.prepareRuntime(); }
    catch (error) {
      // A tunnel start can fail while the local MCP keeps running. Re-observe it.
      let current = null;
      try { current = await this.inspectRuntime(); } catch { /* Unknown is not ready. */ }
      this.publish({ runtime: !!current?.mcp?.ready, tunnel: false });
      throw error;
    }
    this.publish({ runtime: !!service?.mcp?.ready, tunnel: !!service?.tunnel?.ready && !!service?.tunnel?.configured,
      phase: !service?.mcp?.ready ? 'prepare' : service?.tunnel?.ready && service?.tunnel?.configured ? 'connected' : 'tunnel' });
  }
  install() {
    if (this.state.git || this.state.gitInstallationRequested) return this.pending ?? Promise.resolve();
    return this.serial(async () => {
      const result = await this.installGit();
      this.publish({ phase: 'git-installing', gitInstallationRequested: true, error: result?.warning ?? null });
      this.watchGitInstallation();
    });
  }
  stopGitWatch() {
    this.gitWatchGeneration++;
    if (this.gitTimer !== null) this.cancelGit(this.gitTimer);
    this.gitTimer = null;
  }
  watchGitInstallation() {
    this.stopGitWatch();
    if (!this.live || this.state.git || !this.state.gitInstallationRequested) return;
    const generation = this.gitWatchGeneration;
    let attempts = 0;
    const current = () => this.live && generation === this.gitWatchGeneration;
    const scheduleNext = () => {
      if (!current()) return;
      this.gitTimer = this.scheduleGit(async () => {
        this.gitTimer = null;
        if (!current()) return;
        if (this.pending) { scheduleNext(); return; }
        const ready = await this.probeGit().catch(() => false);
        if (!current()) return;
        if (ready) {
          this.stopGitWatch();
          this.publish({ git: true, gitInstallationRequested: false, phase: 'prepare', error: null });
        } else if (++attempts < this.gitPollLimit) scheduleNext();
        else {
          this.stopGitWatch();
          this.publish({ phase: 'git', gitInstallationRequested: false,
            error: 'Автоматическая проверка пока не подтвердила установку Apple. Если она ещё идёт, дождитесь завершения и нажмите «Проверить и продолжить». Если установка отменена, её можно запустить снова.' });
        }
      }, this.gitPollInterval);
      this.gitTimer?.unref?.();
    };
    scheduleNext();
  }
  configure(credentials) {
    return this.serial(async () => {
      if (!await this.probe() || !this.live) return;
      this.publish({ phase: 'configuring' });
      const result = await this.configureTunnel(credentials);
      if (result?.cancelled) { this.publish({ phase: 'tunnel' }); return; }
      await this.prepare();
    });
  }
  beginPage(generation) {
    this.pageGeneration = generation;
    if (this.timer !== null) this.cancel(this.timer);
    this.publish({ page: 'loading', account: 'unknown', pageError: null });
    this.timer = this.schedule(() => {
      if (this.live && this.pageGeneration === generation && this.state.page === 'loading') this.publish({ page: 'slow' });
    }, 15000);
  }
  finishPage(generation, error = null) {
    if (generation !== this.pageGeneration || !this.live) return;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.publish({ page: error ? 'failed' : 'loaded', pageError: error ? String(error).slice(0, 80) : null,
      ...(error ? { account: 'unknown' } : {}) });
  }
  observe(generation, observation) {
    if (generation !== this.pageGeneration || !this.live || ['loading', 'slow', 'failed'].includes(this.state.page)) return;
    const sharedLogin = ['signed-in', 'signed-out', 'unknown'].includes(observation?.login) ? observation.login : null;
    this.publish({ account: sharedLogin ?? (observation?.authenticated ? 'signed-in' : observation?.login ? 'signed-out' : 'unknown') });
  }
  dispose() { this.live = false; this.stopGitWatch(); if (this.timer !== null) this.cancel(this.timer); this.timer = null; }
}


export async function offerMacInstallation({ app, dialog, fresh }) {
  if (!fresh || app.isInApplicationsFolder()) return false;
  const choice = await dialog.showMessageBox({
    type: 'question', title: 'Установка Workflow Pilot',
    message: 'Установить Web Pilot в «Программы»?',
    detail: 'Приложение само переместится в папку Applications и откроется снова. Перетаскивать файлы вручную не нужно.',
    buttons: ['Установить', 'Пока пропустить'], defaultId: 0, cancelId: 1,
  });
  if (choice.response !== 0) return false;
  try {
    return app.moveToApplicationsFolder({ conflictHandler: () => dialog.showMessageBoxSync({
      type: 'question', title: 'Workflow Pilot',
      message: 'В «Программах» уже есть Workflow Pilot.',
      detail: 'Заменить его этой версией? Существующие проекты и настройки сохранятся.',
      buttons: ['Заменить', 'Отмена'], defaultId: 1, cancelId: 1,
    }) === 0 });
  } catch {
    dialog.showErrorBox('Перемещение не выполнено', 'Web Pilot продолжит работу из текущей папки. Позже скопируйте полное приложение в Applications через Finder.');
    return false;
  }
}
