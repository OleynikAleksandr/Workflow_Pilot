import { BackendConnection } from '../client/connection.mjs';
import { BrowserView } from '../client/browser-view.mjs';
import { attachPageInput } from './touch-input.mjs';

// Remote web client (iPad Safari) of the backend, served by the gateway behind
// Tailscale Serve. The Desktop UI pages run unchanged in frames; their preload
// calls arrive here (window.__wpHost) and go to the same backend API.
const $ = id => document.getElementById(id);
const settle = ms => new Promise(resolve => setTimeout(resolve, ms));
const RENEW_MS = 10000;
const FRAME_OPTIONS = { format: 'jpeg', maxScale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) };

async function json(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options,
    headers: { ...options.body ? { 'content-type': 'application/json' } : {}, ...options.headers } });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(value?.error?.message ?? 'Нет связи с компьютером.'), { code: value?.error?.code });
  return value;
}
const deviceGuess = () => /iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1 ? 'iPad'
  : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : 'Браузер';

// --- Pairing: a one-time code confirmed on the computer. ---
async function pairDevice() {
  $('pairing').hidden = false;
  $('pairing-retry').hidden = true;
  try {
    const request = await json('/remote/pair', { method: 'POST', body: JSON.stringify({ name: deviceGuess() }) });
    $('pairing-code').textContent = request.code;
    $('pairing-text').textContent = 'Подтвердите подключение этого устройства на компьютере. Код:';
    for (;;) {
      await settle(1500);
      const status = await json('/remote/pair/' + request.pairingId);
      if (status.status === 'approved') return location.reload();
      if (status.status === 'rejected') throw Object.assign(new Error('Подключение отклонено на компьютере.'), { code: 'REMOTE_PAIRING_REJECTED' });
    }
  } catch (error) {
    $('pairing-code').textContent = '';
    $('pairing-text').textContent = error.message;
    $('pairing-retry').hidden = false;
  }
}
$('pairing-retry').addEventListener('click', () => void pairDevice());

// --- Connected client. ---
let connection = null, myClientId = null, control = false, holder = null, stale = false, renewTimer = null, acquiring = null;
const states = { 'pilot:state-changed': null, 'pilot-archive:state-changed': null, 'chat-colors:state': null };
const listeners = new Map(Object.keys(states).map(channel => [channel, new Set()]));
// The UI asks for its state at load; it gets the first one the backend sends.
const firstState = new Map(Object.keys(states).map(channel => { let resolve; const promise = new Promise(done => { resolve = done; }); return [channel, { promise, resolve }]; }));
const current = channel => states[channel] ?? firstState.get(channel).promise;
const emit = (channel, value) => {
  states[channel] = value; firstState.get(channel).resolve(value);
  for (const listener of listeners.get(channel)) try { listener({}, value); } catch {}
};
const setStatus = () => {
  const text = stale ? 'Нет связи с компьютером. Данные могут быть устаревшими.'
    : control ? 'Управление у этого устройства'
      : holder ? 'Наблюдение: управление у другого окна' : 'Получение управления…';
  $('status').textContent = text;
  $('take-control').hidden = control || stale || !holder;
};

async function takeControl({ takeover = false } = {}) {
  if (acquiring && !takeover) return acquiring;
  acquiring = (async () => {
    try {
      const view = await connection.acquire({ takeover });
      control = true; holder = myClientId; void view;
      clearInterval(renewTimer);
      renewTimer = setInterval(() => void connection.renew().catch(() => { control = false; clearInterval(renewTimer); setStatus(); void takeControl().catch(() => {}); }), RENEW_MS);
    } catch (error) { control = false; if (error.code !== 'BACKEND_LEASE_HELD') setTimeout(() => void takeControl().catch(() => {}), 3000); }
    finally { acquiring = null; setStatus(); void syncViewport(); }
    return control;
  })();
  return acquiring;
}

// Desktop UI calls (the preload API) through the backend, as the Mac window does.
const SURFACE = { 'pilot:': 'local', 'archive:': 'archive', 'chat-colors:': 'colors' };
async function invoke(channel, input) {
  if (channel === 'pilot:get-state') return current('pilot:state-changed');
  if (channel === 'archive:get-state') return current('pilot-archive:state-changed');
  if (channel === 'chat-colors:get-state') return current('chat-colors:state');
  if (channel === 'chat-colors:close') { closeOverlay('colors'); return { ok: true }; }
  if (channel === 'archive:close') closeOverlay('archive');
  const prefix = Object.keys(SURFACE).find(value => channel.startsWith(value));
  const surface = SURFACE[prefix];
  const state = surface === 'archive' ? states['pilot-archive:state-changed'] : states['pilot:state-changed'];
  if (!connection || stale) return { ok: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Нет связи с компьютером.' }, state };
  if (!control && holder && holder !== myClientId)
    return { ok: false, error: { code: 'BACKEND_LEASE_HELD', message: 'Управление у другого окна. Нажмите «Взять управление».' }, state };
  if (!control) await takeControl();
  // The folder dialog of the computer is not available here: ask for a path.
  if (channel === 'pilot:choose-workspace' || channel === 'pilot:choose-parent') {
    const folder = window.prompt('Полный путь к папке на компьютере, например /Users/имя/Projects/проект', state?.setup?.parent ?? '');
    if (!folder) return { ok: true, result: null, state };
    input = { ...(input ?? {}), path: folder.trim() };
  }
  const backendChannel = surface === 'colors' ? channel.replace('chat-colors:', 'colors:') : channel;
  try {
    const value = await connection.invoke(surface, backendChannel, input);
    if (surface === 'colors') return value.ok === false ? Promise.reject(new Error(value.error?.message ?? 'Не удалось изменить цвет.')) : value.result;
    return { ok: value.ok, result: value.result, ...(value.error ? { error: value.error } : {}), state };
  } catch (error) {
    return { ok: false, error: { code: error.code ?? 'BACKEND_UNAVAILABLE', message: error.message }, state };
  }
}
window.__wpHost = Object.freeze({
  invoke,
  subscribe: (channel, listener) => listeners.get(channel)?.add(listener),
  unsubscribe: (channel, listener) => listeners.get(channel)?.delete(listener),
});

// --- Overlays for the archive, colours and ChatGPT popups. ---
function openOverlay(kind) {
  const overlay = $(kind + '-overlay');
  if (!overlay.querySelector('iframe')) {
    const frame = document.createElement('iframe');
    frame.src = kind === 'archive' ? '/app/frontend/desktop/ui/archive.html' : '/app/frontend/desktop/ui/chat-colors.html';
    frame.title = kind === 'archive' ? 'Архив' : 'Цвета чатов';
    overlay.append(frame);
  }
  overlay.classList.add('open');
}
function closeOverlay(kind) {
  const overlay = $(kind + '-overlay');
  overlay.classList.remove('open');
  overlay.querySelector('iframe')?.remove();
  if (kind === 'popup' && popup) { popup.active = false; void popup.view.detach().catch(() => {}); popup = null; }
}
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => {
  const kind = button.dataset.close;
  if (kind === 'archive') void invoke('archive:close');
  closeOverlay(kind);
});

// --- Page image. ---
let page = null, popup = null;
function frameLoop(entry, image, status) {
  void (async () => {
    try { await entry.view.attach(); } catch { status && (status.textContent = 'Страница недоступна.'); return; }
    while (entry.active) {
      try {
        const frame = await entry.view.nextFrame(FRAME_OPTIONS);
        if (!frame || !entry.active) continue;
        const url = URL.createObjectURL(new Blob([frame.png], { type: frame.mime ?? 'image/png' }));
        const old = image.src; image.src = url; image.dataset.mime = frame.mime ?? 'image/png'; if (old.startsWith('blob:')) URL.revokeObjectURL(old);
        if (status) status.hidden = true;
      } catch { if (!entry.active) return; if (status) { status.hidden = false; status.textContent = 'Страница недоступна. Ожидаем компьютер…'; } await settle(800); }
    }
  })();
}
async function showSelectedPage() {
  if (!connection) return;
  const { pages } = await connection.json('/v1/browser/pages');
  const selected = pages.find(item => item.selected && item.kind === 'page');
  if (!selected || page?.view.browserSessionId === selected.browserSessionId) return;
  if (page) { page.active = false; void page.view.detach().catch(() => {}); }
  page = { view: new BrowserView(connection, selected.browserSessionId), active: true };
  frameLoop(page, $('frame'), $('frame-status'));
  await settle(300); void syncViewport();
}
async function syncViewport() {
  if (!control || !page?.view.viewerId) return;
  const rect = $('stage').getBoundingClientRect();
  await page.view.setViewport(Math.max(320, Math.min(4096, Math.round(rect.width))), Math.max(320, Math.min(4096, Math.round(rect.height)))).catch(() => {});
}
window.addEventListener('resize', () => void syncViewport());

// Files: Safari opens its picker only from a tap, so a button is offered.
function offer(label, action) {
  const button = document.createElement('button');
  button.className = 'primary'; button.textContent = label;
  button.addEventListener('click', async () => { button.remove(); await action(); });
  $('actions').append(button);
  setTimeout(() => button.remove(), 120000);
  return button;
}
async function onEvent(event) {
  const data = event.data ?? {};
  if (event.type === 'ui.open-archive') return openOverlay('archive');
  if (event.type === 'ui.close-archive') return closeOverlay('archive');
  if (event.type === 'ui.open-colors') return openOverlay('colors');
  if (event.type === 'state' || event.type === 'operation') return void showSelectedPage().catch(() => {});
  if (event.type === 'browser.file-chooser' && page && data.browserSessionId === page.view.browserSessionId && control) {
    offer('Выбрать файл для ChatGPT', () => new Promise(resolve => {
      const input = $('file-input'); input.value = ''; input.multiple = false;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { await page.view.cancelChooser(data.chooserId).catch(() => {}); return resolve(); }
        if (file.size > 32 * 1024 * 1024) { alert('Файл больше 32 МБ.'); await page.view.cancelChooser(data.chooserId).catch(() => {}); return resolve(); }
        await page.view.upload({ chooserId: data.chooserId, name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type || undefined })
          .catch(error => alert('Не удалось передать файл: ' + error.message));
        resolve();
      };
      input.click();
    }));
  }
  if (event.type === 'browser.download-ready' && page) {
    offer('Сохранить «' + (data.name ?? 'файл') + '»', async () => {
      const file = await page.view.download(data.transferId);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([file.bytes])); link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    });
  }
  if (event.type === 'browser.page-opened' && data.kind === 'popup') {
    if (popup) { popup.active = false; void popup.view.detach().catch(() => {}); }
    popup = { view: new BrowserView(connection, data.browserSessionId), active: true };
    $('popup-overlay').classList.add('open');
    frameLoop(popup, $('popup-frame'), null);
    attachPageInput({ target: $('popup-frame'), keyboard: $('keyboard'), view: () => popup?.view, canInput: () => control });
  }
  if (event.type === 'browser.page-closed' && popup?.view.browserSessionId === data.browserSessionId) {
    popup.active = false; $('popup-overlay').classList.remove('open'); popup = null;
  }
}

$('toggle-sidebar').addEventListener('click', () => { $('app').classList.toggle('collapsed'); setTimeout(() => void syncViewport(), 50); });
$('take-control').addEventListener('click', () => void takeControl({ takeover: true }));
$('copy-selection').addEventListener('click', async () => {
  if (!page?.view.viewerId) return;
  const text = await page.view.selection().catch(() => '');
  if (text) await navigator.clipboard.writeText(text).catch(() => window.prompt('Скопируйте текст:', text));
});
$('paste-text').addEventListener('click', async () => {
  if (!page?.view.viewerId || !control) return;
  let text = await navigator.clipboard.readText().catch(() => null);
  if (!text) text = window.prompt('Текст для вставки в страницу:') ?? '';
  if (text) await page.view.paste(text.slice(0, 60 * 1024)).catch(() => {});
});

async function start() {
  const session = await json('/remote/session').catch(() => ({ device: null }));
  if (!session.device) return pairDevice();
  myClientId = session.device.clientId;
  connection = new BackendConnection({ origin: location.origin, clientId: myClientId, fetch: (...args) => fetch(...args) });
  await connection.connect();
  $('app').classList.add('ready');
  if (window.innerWidth < 700) $('app').classList.add('collapsed');
  attachPageInput({ target: $('frame'), keyboard: $('keyboard'), keyboardButton: $('show-keyboard'), view: () => page?.view, canInput: () => control });
  connection.subscribe({
    onUi: (kind, value) => {
      if (kind === 'state') { emit('pilot:state-changed', value); void showSelectedPage().catch(() => {}); }
      if (kind === 'archive') emit('pilot-archive:state-changed', value);
      if (kind === 'colors') emit('chat-colors:state', value);
      if (kind === 'lease') {
        holder = value.holder ?? null;
        if (control && holder !== myClientId) { control = false; clearInterval(renewTimer); connection.forgetLease(); }
        if ((!holder || holder === myClientId) && !control && !stale) void takeControl();
        setStatus();
      }
    },
    onEvent: event => void onEvent(event).catch(() => {}),
    onSnapshot: () => { if (stale) { stale = false; setStatus(); if (!control) void takeControl(); } },
    onError: error => {
      if (error?.code === 'REMOTE_DEVICE_REQUIRED' || error?.code === 'REMOTE_DEVICE_REVOKED') return location.reload();
      if (!stale) { stale = true; control = false; setStatus(); }
    },
  });
  await takeControl();
}
void start().catch(error => { $('pairing').hidden = false; $('pairing-text').textContent = error.message; $('pairing-retry').hidden = false; });
