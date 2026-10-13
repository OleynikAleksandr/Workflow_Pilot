const INDEPENDENT = new Set(['chat', 'signup', 'help', 'keys', 'tunnels', 'plugins', 'copy-diagnostics']);
export function createStartupView({ document, api }) {
  const $ = id => document.getElementById(id), panel = $('startup-panel');
  let current = null, pending = false, signup = false, localError = null, copied = false, lastVisibleStep = null;
  function render(state) {
    current = state;
    const s = state?.startup;
    const windows = (s?.platform ?? state?.platform) === 'win32';
    const linux = (s?.platform ?? state?.platform) === 'linux';
    $('host-platform-label').textContent = linux?'На вашем Ubuntu PC':windows ? 'На вашем Windows PC' : 'На вашем Mac';
    panel.hidden = !s?.active || !!state.setup || !!state.settings;
    $('open-startup').hidden = !s;
    if (!s) return;
    const logged = s.account === 'signed-in', loginVisible = s.page === 'loaded' && s.account === 'signed-out';
    const local = s.node && s.git && s.runtime, ready = local && s.tunnel;
    const waitingApple = !windows && !linux && !s.git && (!!s.gitInstallationRequested || s.phase === 'git-installing');
    const opening = ['loading', 'slow'].includes(s.page);
    const retry = ['slow', 'failed'].includes(s.page), unknown = s.page === 'loaded' && !logged && !loginVisible;
    const errors = {
      PAGE_RESPONSE_TIMEOUT: 'ChatGPT не ответил за две минуты.',
      PAGE_DOCUMENT_TIMEOUT: 'Ответ сайта получен, но страница не подготовилась за две минуты.',
      ERR_INTERNET_DISCONNECTED: 'Компьютер не подключён к интернету.',
      ERR_NAME_NOT_RESOLVED: 'Не удалось найти адрес сайта ChatGPT.',
      ERR_CONNECTION_TIMED_OUT: 'Сайт ChatGPT не ответил на подключение.',
      ERR_TIMED_OUT: 'Время ожидания ответа сайта истекло.',
      ERR_CERT_DATE_INVALID: 'Проверка сертификата не пройдена. Проверьте дату и время компьютера.',
      RENDER_PROCESS_GONE: 'Встроенная страница закрылась.',
    };
    const pageMessages = {
      idle: 'Открываем сайт chatgpt.com в правой части окна.',
      loading: 'Открываем ChatGPT. Проверка первого подключения может занять до двух минут. Дождитесь результата — повторять нажатие не нужно.',
      slow: 'Продолжаем ждать ответ ChatGPT. Первый запрос не прерывается; общий срок ожидания — до двух минут. Затем можно скопировать диагностику.',
      failed: (errors[s.pageError] || 'Не удалось открыть сайт ChatGPT.') + ' Нажмите «Повторить открытие». Если это не помогает, скопируйте диагностику и передайте её разработчику.',
    };
    $('startup-account-title').textContent = logged || loginVisible ? 'Аккаунт ChatGPT' : 'Открытие ChatGPT';
    $('startup-account-status').textContent = pageMessages[s.page] ?? (logged ? 'Вход подтверждён' : loginVisible
      ? 'Теперь можно войти или создать аккаунт'
      : 'Страница открыта. Состояние входа пока не определено.');
    $('startup-account-body').hidden = logged;
    $('startup-account-instructions').hidden = !loginVisible;
    $('startup-account-check').hidden = !loginVisible;
    $('startup-signup').hidden = !loginVisible;
    $('startup-signup-help').hidden = !signup || !loginVisible;
    $('startup-open-chat').textContent = opening ? 'Открываем ChatGPT…' : retry || unknown ? 'Повторить открытие' : 'Открыть сайт ChatGPT';
    $('startup-copy-diagnostics').hidden = s.page === 'idle';
    $('startup-diagnostics-copied').hidden = !copied;
    $('startup-components-status').textContent = local ? 'Компоненты готовы' : waitingApple ? 'Ожидаем завершения установки Apple' : s.phase === 'error' ? 'Подготовка остановлена' : s.busy ? 'Проверяем и подготавливаем…' : !s.node ? 'Проверяем комплект приложения' : linux?'Нужна подготовка компонентов Ubuntu':windows ? 'Нужна подготовка компонентов Windows' : !s.git ? 'Нужен компонент Apple' : 'Компонент Apple установлен';
    $('startup-components-body').hidden = !logged || local;
    $('startup-components-help').textContent = linux
      ? 'Нужна Ubuntu 24.04 LTS x64, сеанс «Ubuntu on Xorg» и обычный пользователь. Установите git, openssh-client и zenity через менеджер пакетов Ubuntu. Нажмите «Проверить и продолжить»: Workflow Pilot подготовит комплектные Node, Python, Codex и туннель. В первый раз нужен интернет. Wayland пока не поддерживается.'
      : windows
      ? (s.busy
        ? 'Распаковываем комплектные компоненты Windows в ваш профиль, готовим Python и запускаем локальный MCP. В первый раз нужен интернет. Оставьте Web Pilot открытым; результат появится здесь.'
        : 'Нажмите «Проверить и продолжить». Web Pilot подготовит комплектные Python и Git и запустит локальный MCP. На компьютере должен быть установлен Codex CLI. Приложение нужно запускать из полностью распакованной папки ZIP. Уже готовые компоненты сохранятся.')
      : waitingApple
      ? 'Подтвердите установку и примите условия в системном окне Apple. Если его не видно, сверните Web Pilot жёлтой кнопкой. Загрузка и установка могут занять десятки минут. Web Pilot сам проверит завершение; затем нажмите «Проверить и продолжить».'
      : !s.git
      ? 'Для истории проектов нужен Git из набора Apple Command Line Tools. Нажмите кнопку, затем «Установить» в системном окне и примите условия Apple. Загрузка и установка могут занять десятки минут; ход установки показывает системное окно Apple. Если его не видно, сверните Web Pilot жёлтой кнопкой. После завершения нажмите «Проверить и продолжить».'
      : (s.busy
        ? 'Загружаем и проверяем необходимые локальные компоненты. Время зависит от скорости загрузки и компьютера. Оставьте Web Pilot открытым; результат появится здесь.'
        : 'Нажмите «Проверить и продолжить». Web Pilot проверит установленные компоненты и подготовит недостающие. Повторно устанавливать уже готовый компонент Apple не нужно.');
    $('startup-install-git').hidden = windows || linux || !!s.git || waitingApple;
    $('startup-plugin-platform').hidden = !windows;
    $('startup-plugin-name').textContent = linux?'Workflow Pilot Local Linux':windows ? 'Workflow Pilot Local Windows' : 'Workflow Pilot Local Mac';
    $('startup-plugin-body').hidden = !logged || !ready;
    $('startup-plugin-wait').hidden = logged && ready;
    $('startup-tunnel-status').textContent = s.tunnel ? 'Служба подключения работает' : !local ? 'После подготовки компьютера' : 'Нужна однократная настройка';
    $('startup-tunnel-body').hidden = !logged || !local || s.tunnel;
    const tunnelStep = s.clipboard?.step ?? 'tunnel';
    $('startup-tunnel-create').hidden = tunnelStep !== 'tunnel';
    $('startup-tunnel-key').hidden = tunnelStep !== 'key';
    $('startup-tunnel-progress').textContent = {
      tunnel: 'Сначала — ID туннеля. Затем — отдельный API key.',
      key: 'ID туннеля получен. Шаг 2 из 2: создайте API key.',
      connecting: 'Данные получены. Проверяем подключение…',
      done: 'Служба туннеля готова.',
    }[tunnelStep] ?? '';
    $('startup-tunnel-input').hidden = tunnelStep !== 'key';
    $('startup-project-body').hidden = !logged || !ready;
    $('startup-project-wait').hidden = logged && ready;
    $('startup-error').hidden = !(localError || s.error || s.clipboard?.error);
    $('startup-error').textContent = localError || s.clipboard?.error || s.error || '';
    for (const button of panel.querySelectorAll('[data-startup]')) {
      const action = button.dataset.startup;
      button.disabled = ((opening || pending) && ['chat', 'signup', 'plugins'].includes(action))
        || (pending && !INDEPENDENT.has(action))
        || (s.busy && ['check', 'install-git', 'paste-tunnel-id', 'configure-tunnel', 'continue', 'existing'].includes(action))
        || (action === 'configure-tunnel' && (tunnelStep !== 'key' || !s.clipboard?.hasTunnelId))
        || (action === 'paste-tunnel-id' && tunnelStep !== 'tunnel')
        || (action === 'install-git' && (windows || linux || !!s.git || waitingApple));
    }
    $('startup-continue').disabled ||= !logged || !ready;
    $('startup-existing').disabled ||= !logged || !ready;
    const visibleStep = panel.hidden || !logged ? null : ready ? 'project' : local ? tunnelStep : null;
    if (windows && visibleStep === 'project' && lastVisibleStep !== 'project') $('startup-plugin-help').open = true;
    if (lastVisibleStep && visibleStep && visibleStep !== lastVisibleStep) {
      const target = visibleStep === 'project' ? $('startup-plugin-body') : $('startup-tunnel-progress');
      target.scrollIntoView?.({ block: 'nearest' });
    }
    lastVisibleStep = visibleStep;
  }
  async function perform(action) {
    if (pending && !INDEPENDENT.has(action)) return;
    if (action === 'signup' && current?.startup?.account === 'signed-out') {
      signup = true; render(current); return;
    }
    pending = true; localError = null; copied = false; if (current) render(current);
    try {
      const result = await api.startup(action === 'existing' ? 'continue' : action);
      if (result?.ok === false) { localError = result.error?.message || 'Не удалось выполнить шаг. Повторите попытку.'; return; }
      if (result?.state) render(result.state);
      if (action === 'copy-diagnostics') copied = true;
      if (action === 'continue' || action === 'existing') {
        const project = action === 'existing' ? await api.chooseWorkspace() : await api.beginCreate();
        if (project?.ok === false) localError = project.error?.message || 'Не удалось открыть подготовку проекта.';
        if (project?.state) render(project.state);
      }
    } catch { localError = 'Действие не завершилось. Повторите попытку.'; }
    finally { pending = false; if (current) render(current); }
  }
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-startup]');
    if (button && !button.disabled) void perform(button.dataset.startup);
  });
  $('open-startup').addEventListener('click', () => { void perform('show'); });
  return { render };
}
if (typeof window !== 'undefined' && window.webPilot && document.getElementById('startup-panel')) {
  const view = createStartupView({ document, api: window.webPilot });
  window.webPilot.onState(view.render);
  window.webPilot.getState().then(view.render).catch(() => {});
}
