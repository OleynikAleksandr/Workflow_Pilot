export function workspaceSetupView(action) {
  const $ = id => document.getElementById(id);
  let last = null, pending = false, formKey = '', submitting = false, focusForm = false;
  $('create-workspace').addEventListener('click', () => action('beginCreate'));
  $('setup-parent-button').addEventListener('click', () => action('chooseParent', $('setup-name').value));
  $('setup-form').addEventListener('submit', event => {
    event.preventDefault();
    if (last?.setup?.parent && !pending) action('previewNew', $('setup-name').value);
  });
  $('setup-cancel').addEventListener('click', () => action('cancelSetup'));
  $('setup-doctor').addEventListener('click', () => action('openDoctor'));
  $('setup-refresh').addEventListener('click', () => action('refreshSetup'));
  $('setup-apply').addEventListener('click', () => action('applySetup', last?.setup?.token));
  function createFirst(experience) {
    const button = $('setup-experience-' + experience);
    if (button.disabled || $('setup-experience').hidden || submitting) return;
    const args = [last.setup.token, experience];
    submitting = true; render(last, pending);
    void Promise.resolve().then(() => action('applySetup', ...args)).finally(() => {
      submitting = false; if (last) render(last, pending);
    });
  }
  $('setup-experience-chat').addEventListener('click', () => createFirst('chat'));
  $('setup-experience-work').addEventListener('click', () => createFirst('work'));
  function render(state, actionPending) {
    last = state; pending = actionPending;
    const setup = state.setup;
    $('setup-panel').hidden = !setup;
    $('projects').hidden = !!setup;
    if(setup)$('session-notice').hidden = true;
    $('workspace-details').hidden = !!setup || !state.selected;
    if (!setup) { formKey = ''; focusForm = false; return; }
    const busy = ['checking', 'applying'].includes(setup.phase);
    const form = setup.mode === 'new' && !setup.token && !setup.installed;
    $('setup-title').textContent = busy ? (setup.phase === 'checking' ? 'Проверяем папку' : 'Подготавливаем проект')
      : setup.ready ? 'Проект готов к открытию' : setup.mode === 'new' ? 'Новый проект' : 'Подключение проекта';
    $('setup-intro').textContent = busy ? 'Проверяем структуру, команды и контекст проекта. Это может занять несколько секунд.'
      : form ? (setup.parent ? 'Теперь укажите имя проекта.' : 'Сначала выберите папку, в которой будут храниться проекты.')
      : setup.action === 'install' ? 'Добавим инструкции, документацию и план. Существующие файлы сохранятся.'
      : setup.action === 'reconnect' ? 'Восстановим локальные команды и проверки. План проекта сохранится.'
      : setup.action === 'upgrade' ? 'Обновим Workflow Kit до новой совместимой версии. План и пользовательские документы сохранятся.'
      : setup.ready ? 'Структура и полный контекст проверены. Можно продолжать работу в ChatGPT.'
      : 'Открытие приостановлено. Ниже указано, что нужно исправить.';
    $('setup-form').hidden = !form;
    if (form) {
      const key = `${setup.parent}\n${setup.name ?? ''}`;
      const changed = formKey !== key, located = !!setup.parent;
      if (changed) { $('setup-name').value = setup.name ?? ''; formKey = key; focusForm = true; }
      $('setup-parent').textContent = setup.parent ?? '';
      $('setup-parent').hidden = !located;
      $('setup-name-label').hidden = !located;
      $('setup-name').hidden = !located;
      $('setup-name').disabled = !located || busy || actionPending;
      $('setup-preview').hidden = !located;
      $('setup-preview').disabled = !located || busy || actionPending;
      $('setup-parent-button').textContent = located ? 'Изменить расположение папки для проектов' : 'Выбрать расположение папки для проектов';
      $('setup-parent-button').disabled = busy || actionPending;
      if (setup.phase === 'form' && !actionPending && (focusForm || document.activeElement === document.body)) {
        focusForm = false;
        queueMicrotask(() => $(located ? 'setup-name' : 'setup-parent-button').focus());
      }
    }
    $('setup-path').hidden = !setup.workspace;
    $('setup-path').textContent = setup.workspace ?? '';
    $('setup-checks').replaceChildren(...(setup.checks ?? []).map(check => {
      const item = document.createElement('li'); item.textContent = `${check.ok ? '✓' : '○'} ${check.label}`; item.dataset.ok = String(check.ok); return item;
    }));
    $('setup-issues').replaceChildren(...(setup.issues ?? []).map(issue => {
      const item = document.createElement('li'); const title = document.createElement('strong'); title.textContent = issue.path;
      const detail = document.createElement('span'); detail.textContent = issue.reason; item.append(title, detail); return item;
    }));
    $('setup-error').hidden = !setup.error;
    $('setup-error').textContent = setup.error?.message ?? '';
    const warnings = [...(setup.warnings ?? [])];
    if (setup.initializeGit) warnings.push('Будет создана локальная история проекта.');
    if (setup.existingChanges?.length) warnings.push(`Есть исходные изменения (${setup.existingChanges.length}). Они останутся на месте и не будут автоматически включены в служебный коммит.`);
    $('setup-notes').textContent = warnings.join('\n\n'); $('setup-notes').hidden = !warnings.length;
    const files = setup.files ?? [];
    $('setup-files').hidden = !files.length;
    $('setup-file-summary').textContent = `Изменения в папке · ${files.length} файлов`;
    $('setup-file-list').replaceChildren(...files.map(file => { const item = document.createElement('li'); item.textContent = `${file.action}: ${file.path}`; return item; }));
    const problem = !!setup.error || !!setup.issues?.length || setup.phase === 'error'
      || (!setup.action && setup.checks?.some(check => !check.ok));
    const firstSession = !!setup.firstSessionRequired;
    const canApply = !!setup.action && !!setup.token && !problem;
    $('setup-experience').hidden = !firstSession || form || busy || !canApply;
    for (const mode of ['chat', 'work']) {
      $('setup-experience-' + mode).removeAttribute('aria-pressed');
      $('setup-experience-' + mode).disabled = busy || actionPending || submitting || !canApply;
    }
    $('setup-apply').hidden = firstSession || !canApply || busy;
    $('setup-apply').textContent = { install: setup.mode === 'new' ? 'Создать и открыть' : 'Подготовить и открыть', reconnect: 'Восстановить и открыть', upgrade: 'Обновить и открыть', open: 'Открыть проект' }[setup.action] ?? 'Открыть проект';
    $('setup-apply').disabled = actionPending || submitting;
    $('setup-refresh').hidden = busy || form || !problem || (!setup.installed && !setup.workspace);
    $('setup-refresh').disabled = actionPending || submitting;
    $('setup-doctor').hidden = busy || form || !problem || !setup.workspace;
    $('setup-doctor').disabled = actionPending || submitting;
    $('setup-cancel').textContent = busy ? 'Подождите…' : 'Отмена';
  }
  return { render };
}
