const api = window.webPilotColors;
const labels = { background: 'Фон чата', userBackground: 'Плашка ваших сообщений', userText: 'Текст ваших сообщений', assistantText: 'Текст ответов агента', composerBackground: 'Фон поля ввода' };
const rows = new Map();
let state, version = 0, pending = Promise.resolve();
const status = document.getElementById('status');
function notice(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function render(next) {
  state = next;
  document.documentElement.dataset.theme = next.theme;
  for (const [key, row] of rows) {
    const color = next.colors[key] ?? next.defaults[key];
    row.picker.value = color;
    if (document.activeElement !== row.hex) row.hex.value = color;
    row.hex.setAttribute('aria-invalid', 'false');
    row.mode.textContent = next.colors[key] ? 'Свой цвет' : 'Стандартный';
    row.reset.disabled = !next.colors[key];
  }
  document.getElementById('reset-all').disabled = !Object.values(next.colors).some(Boolean);
}
function submit(key, value) {
  if (!state) return;
  const current = ++version;
  const optimistic = { ...state, colors: { ...state.colors, [key]: value } };
  render(optimistic); notice('Применяем цвет…');
  // Calls are issued immediately for live preview; main process serializes disk persistence.
  const request = api.change(key, value);
  pending = request.catch(() => {});
  request.then(result => {
    if (current !== version) return;
    if (!result.ok) { render(result.state); notice(result.error.message, true); return; }
    render(result.state); notice('Сохранено. Цвет применён ко всем чатам Web Pilot.');
  }).catch(error => { if (current === version) notice(error.message, true); });
}
for (const [key, label] of Object.entries(labels)) {
  const row = document.createElement('div'); row.className = 'row';
  const picker = document.createElement('input'); picker.type = 'color'; picker.id = key; picker.className = 'picker'; picker.setAttribute('aria-label', label);
  const title = document.createElement('label'); title.className = 'label'; title.htmlFor = key; title.append(label);
  const mode = document.createElement('span'); mode.className = 'mode'; title.append(mode);
  const hex = document.createElement('input'); hex.className = 'hex'; hex.id = key + '-hex'; hex.maxLength = 7; hex.spellcheck = false; hex.autocomplete = 'off'; hex.setAttribute('aria-label', label + ', HEX');
  const reset = document.createElement('button'); reset.className = 'reset-one'; reset.textContent = '↺'; reset.title = 'Вернуть стандартный цвет'; reset.setAttribute('aria-label', 'Сбросить: ' + label);
  picker.addEventListener('input', () => { hex.value = picker.value; submit(key, picker.value); });
  hex.addEventListener('input', () => {
    const value = hex.value.trim();
    const valid = /^#[0-9a-f]{6}$/i.test(value);
    hex.setAttribute('aria-invalid', String(!valid));
    if (valid) { picker.value = value; submit(key, value); }
  });
  hex.addEventListener('blur', () => {
    if (!/^#[0-9a-f]{6}$/i.test(hex.value.trim())) notice('Укажите цвет в формате #RRGGBB, например #25384B.', true);
  });
  reset.addEventListener('click', () => submit(key, null));
  row.append(picker, title, hex, reset); document.getElementById('colors').append(row);
  rows.set(key, { picker, hex, mode, reset });
}
document.getElementById('reset-all').addEventListener('click', async () => {
  const current = ++version;
  try {
    const result = await api.reset();
    if (current !== version) return;
    render(result.state); notice(result.ok ? 'Восстановлено стандартное оформление ChatGPT.' : result.error.message, !result.ok);
  } catch (error) { notice(error.message, true); }
});
document.getElementById('close').addEventListener('click', async () => { await pending; await api.close(); });
document.addEventListener('keydown', async event => { if (event.key === 'Escape') { await pending; await api.close(); } });
api.onState(render);
api.getState().then(result => { if (result.ok) render(result.state); else notice(result.error.message, true); }).catch(error => notice(error.message, true));
