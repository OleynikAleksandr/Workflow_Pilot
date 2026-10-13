export function projectDoctorView(action) {
  const $ = id => document.getElementById(id);
  let current;
  $('doctor-run').addEventListener('click', () => action('runDoctor', $('doctor-workspace').value));
  $('doctor-workspace').addEventListener('change', () => action('selectDoctorProject', $('doctor-workspace').value));
  for (const mode of ['open','chat','work']) $('doctor-' + mode).addEventListener('click', () => action('continueDoctor', mode));
  $('doctor-backup').addEventListener('click', () => action('showDoctorBackup'));
  $('doctor-review').addEventListener('click', () => action('reviewDoctorProject'));
  function render(state, pending) {
    current = state.doctor;
    const chosen = current?.workspace ?? state.settings?.workspace ?? state.selected?.workspace;
    const projects = [...state.projects];
    if (chosen && !projects.some(p => p.workspace === chosen)) projects.unshift({ workspace: chosen, name: chosen.split(/[\\/]/).pop() });
    const select = $('doctor-workspace');
    const key = JSON.stringify(projects.map(p => [p.workspace,p.name]));
    if (select.dataset.options !== key) {
      select.replaceChildren(...projects.map(project => { const option = document.createElement('option'); option.value = project.workspace; option.textContent = project.name; return option; }));
      select.dataset.options = key;
    }
    if (chosen) select.value = chosen;
    const busy = pending || ['repairing','verifying','services'].includes(current?.phase);
    select.disabled = busy || !projects.length; $('doctor-run').disabled = busy || !select.value;
    $('doctor-path').textContent = select.value || 'Сначала выберите папку проекта.';
    const report = current && current.workspace === select.value ? current : null;
    const ready = report?.phase === 'done' && report.projectReady && report.servicesReady && !report.issues.length;
    $('doctor-status').textContent = { repairing: 'Проверяем и исправляем известные проблемы…', verifying: 'Проверяем открытие и полный контекст…', services: 'Проверяем локальное подключение…' }[report?.phase]
      ?? (report?.phase === 'done' ? ready ? 'Проект готов. Можно продолжать работу.' : 'Проверка завершена. Остались проблемы, требующие внимания.' : 'Проверит проект, сохранит резервную копию и исправит известные неисправности.');
    const lines = [ ...(report?.repairs ?? []).map(reason => ({ reason, type: 'repair' })), ...(report?.checks ?? []).map(c => ({ reason: c.label, type: c.ok ? 'ok' : 'issue' })), ...(report?.issues ?? []).map(i => ({ reason: i.path + ': ' + i.reason, type: 'issue' })) ];
    $('doctor-results').replaceChildren(...lines.map(line => { const li=document.createElement('li');li.dataset.kind=line.type;li.textContent=(line.type==='issue'?'○ ':'✓ ')+line.reason;return li; }));
    $('doctor-backup').hidden = !report?.backupPath; $('doctor-backup').disabled = busy;
    $('doctor-backup-note').hidden = !report?.backupPath;
    $('doctor-backup-note').textContent = report?.backupPath ? 'Оригиналы сохранены. Служебные исправления остаются видимыми в истории изменений проекта.' : '';
    $('doctor-actions').hidden = !ready;
    for(const mode of ['open','chat','work']) $('doctor-'+mode).disabled=busy || !ready;
    $('doctor-review').hidden = report?.phase !== 'done' || ready; $('doctor-review').disabled = busy;
  }
  return { render };
}
