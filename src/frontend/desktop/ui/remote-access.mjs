const api = window.webPilot;
// A remote browser (iPad) shows the same UI through the gateway bridge; it
// never confirms or removes devices: that stays with the computer.
const remoteClient = window.__wpRemote === true;
const $ = id => document.getElementById(id);

function button(label, onClick, className = 'secondary') {
  const element = document.createElement('button');
  element.type = 'button'; element.className = className; element.textContent = label;
  element.addEventListener('click', () => { element.disabled = true; Promise.resolve(onClick()).finally(() => { element.disabled = false; }); });
  return element;
}
function item(text, ...children) {
  const li = document.createElement('li');
  li.append(document.createTextNode(text), ...children);
  return li;
}
const date = value => { try { return value ? new Date(value).toLocaleString('ru-RU') : '—'; } catch { return '—'; } };

export function renderPairings(state) {
  const pairings = remoteClient ? [] : state?.remoteAccess?.pairings ?? [];
  const section = $('remote-pairing'), list = $('remote-pairing-list');
  if (!section || !list) return;
  section.hidden = pairings.length === 0;
  list.replaceChildren(...pairings.map(pairing => {
    const actions = document.createElement('div'); actions.className = 'actions';
    actions.append(button(`Подключить «${pairing.name}»`, () => api.approveRemoteDevice(pairing.id), 'primary'),
      button('Отклонить', () => api.rejectRemoteDevice(pairing.id)));
    return item(`«${pairing.name}» · код ${pairing.code}`, actions);
  }));
}

export function renderDevices(state) {
  const list = $('remote-devices');
  if (!list) return;
  const devices = state?.remoteAccess?.devices ?? [];
  if (!devices.length) { list.replaceChildren(item('Нет подключённых устройств')); return; }
  list.replaceChildren(...devices.map(device => item(`${device.name} · подключено ${date(device.createdAt)} · последний вход ${date(device.lastSeenAt)} `,
    ...remoteClient ? [] : [button('Отключить', () => api.revokeRemoteDevice(device.id))])));
}

// Step-by-step setup: each step shows its checked state, never a user tick.
function step(done, title, detail, ...actions) {
  const li = document.createElement('li');
  li.dataset.ok = done ? 'true' : 'false';
  const head = document.createElement('strong'); head.textContent = (done ? '✓ ' : '• ') + title;
  const text = document.createElement('span'); text.textContent = detail; text.style.display = 'block'; text.style.color = 'var(--muted)';
  li.append(head, text);
  if (actions.length) { const row = document.createElement('div'); row.className = 'actions'; row.append(...actions); li.append(row); }
  return li;
}
const act = op => () => api.remoteAccess({ op }).then(result => { if (result?.ok === false) throw new Error(result.error?.message); })
  .catch(error => { const status = $('remote-access-status'); if (status) status.textContent = error.message; });

export function renderRemoteSetup(state) {
  const list = $('remote-access-steps'), status = $('remote-access-status');
  if (!list || !status) return;
  const access = state?.remoteAccess ?? {}, ts = access.tailscale ?? {};
  if (remoteClient) {
    status.textContent = 'Это устройство подключено к компьютеру через Tailscale. Настройка доступа выполняется на компьютере.';
    list.replaceChildren(); $('remote-access-actions')?.replaceChildren(); $('remote-access-address').hidden = true; $('remote-access-qr').hidden = true;
    return;
  }
  const ready = access.enabled && access.serve?.ours;
  status.textContent = access.busy ? 'Выполняется…' : access.error ? access.error.message
    : ready ? 'Доступ включён. Компьютер не уйдёт в сон, пока доступ включён; не закрывайте крышку ноутбука без питания.'
      : 'Подключите iPad по шагам ниже. Доступ работает только внутри вашей сети Tailscale, без публичного адреса.';
  list.replaceChildren(
    step(ts.installed, 'На компьютере: установите Tailscale', 'Загрузите приложение с официального сайта и откройте его. Для личного использования Tailscale бесплатен (тариф Personal) — платные тарифы, которые он предлагает, не нужны.',
      ...ts.installed ? [] : [button('Открыть страницу загрузки', act('open-download'))]),
    step(ts.loggedIn, 'На компьютере: войдите в Tailscale и включите его', ts.login ? 'Аккаунт: ' + ts.login + (ts.dnsName ? ' · компьютер: ' + ts.dnsName : '')
      : ts.installed && ts.error ? 'Tailscale не ответил Workflow Pilot: ' + (ts.detail || ts.error) + '. Проверьте, что приложение Tailscale открыто и вход выполнен, затем «Проверить снова».'
        : 'Войдите личным аккаунтом Google, Apple или GitHub и включите подключение. Не используйте рабочую почту на собственном домене: она создаёт сеть организации с платным пробным периодом и одобрением устройств.'),
    step(ts.httpsEnabled, 'Один раз: разрешите HTTPS в панели Tailscale', 'Раздел DNS: включите MagicDNS и HTTPS Certificates.',
      ...ts.httpsEnabled ? [] : [button('Открыть панель Tailscale', act('open-admin'))]),
    step(ready, 'Включите доступ с других устройств', 'Workflow Pilot настроит Tailscale Serve только внутри вашей сети и проверит адрес.',
      ready ? button('Выключить доступ', act('disable')) : button('Включить доступ с других устройств', act('enable'), 'primary')),
    step(false, 'На iPad: установите Tailscale из App Store', 'Войдите тем же аккаунтом, разрешите конфигурацию VPN и включите переключатель Tailscale.'),
    step(false, 'На iPad: откройте адрес в Safari', access.address ? 'Адрес ниже или QR-код камерой iPad.' : 'Адрес появится после включения доступа.'),
    step(false, 'Подтвердите подключение на компьютере', 'iPad покажет код; здесь появится запрос с тем же кодом — нажмите «Подключить».'),
    step(false, 'По желанию: «Поделиться» → «На экран Домой»', 'Workflow Pilot будет открываться на iPad как приложение.'),
  );
  const address = $('remote-access-address'), qr = $('remote-access-qr');
  address.hidden = !access.address; address.textContent = access.address ?? '';
  qr.hidden = !access.qr;
  if (access.qr) { const image = qr.querySelector('img') ?? qr.appendChild(document.createElement('img')); image.alt = 'QR-код адреса'; image.width = 180; image.height = 180; image.src = access.qr; }
  $('remote-access-actions')?.replaceChildren(button('Проверить снова', act('refresh')));
}

// Opening the section checks Tailscale again, so a login made meanwhile shows.
let checkedOnOpen = false;
function refreshWhenShown() {
  const panel = $('settings-panel');
  if (!panel || remoteClient) return;
  const visible = !panel.hidden;
  if (visible && !checkedOnOpen) void act('refresh')();
  checkedOnOpen = visible;
}
const settingsPanel = $('settings-panel');
if (settingsPanel && typeof MutationObserver === 'function')
  new MutationObserver(refreshWhenShown).observe(settingsPanel, { attributes: true, attributeFilter: ['hidden'] });

// The optional first-run step leads to the same checked steps in Settings.
function renderStartupStep(state) {
  const section = $('startup-remote-step'), status = $('startup-remote-status');
  if (!section) return;
  section.hidden = remoteClient;
  const access = state?.remoteAccess ?? {};
  if (status) status.textContent = access.enabled && access.serve?.ours ? 'Доступ включён: ' + (access.address ?? '')
    : 'Можно пропустить и включить позже в Настройках.';
}
$('startup-remote-open')?.addEventListener('click', async () => {
  await api.openSettings?.();
  setTimeout(() => $('remote-access')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 150);
});

const listeners = [renderPairings, renderDevices, renderRemoteSetup, renderStartupStep];
export function onRemoteState(listener) { listeners.push(listener); }
function render(state) { for (const listener of listeners) listener(state); }
if (api) { api.getState().then(render).catch(() => {}); api.onState(render); }
