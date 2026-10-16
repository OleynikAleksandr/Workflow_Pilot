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

const listeners = [renderPairings, renderDevices];
export function onRemoteState(listener) { listeners.push(listener); }
function render(state) { for (const listener of listeners) listener(state); }
if (api) { api.getState().then(render).catch(() => {}); api.onState(render); }
