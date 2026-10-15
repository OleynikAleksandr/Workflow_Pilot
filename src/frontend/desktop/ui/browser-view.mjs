// Displays frames of the backend page and turns local input into addressed
// page input. Printable text arrives through a hidden textarea so IME and
// Russian layouts work; non-text keys and pointer events are forwarded as is.
const image = document.getElementById('frame');
const keys = document.getElementById('keys');
const status = document.getElementById('status');
const api = window.webPilotBrowser;
let objectUrl = null;
const bounds = () => { const rect = image.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
const send = (type, data) => api.input(type, data, bounds()).catch(() => {});
const modifiers = event => ['shift', 'control', 'alt', 'meta'].filter(name => event[name + 'Key']);
const BUTTONS = ['left', 'middle', 'right'];
const FORWARDED = new Set(['Enter', 'Backspace', 'Tab', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'Meta']);

api.onFrame(({ png }) => {
  const next = URL.createObjectURL(new Blob([png], { type: 'image/png' }));
  image.onload = () => { if (objectUrl && objectUrl !== next) URL.revokeObjectURL(objectUrl); objectUrl = next; };
  image.src = next; status.hidden = true;
});
api.onStatus(({ message }) => { status.textContent = message || ''; status.hidden = !message; });

image.addEventListener('pointerdown', event => {
  event.preventDefault(); keys.focus();
  send('pointer', { action: 'down', x: event.clientX, y: event.clientY, button: BUTTONS[event.button] ?? 'left', clickCount: event.detail || 1 });
});
window.addEventListener('pointerup', event => send('pointer', { action: 'up', x: event.clientX, y: event.clientY,
  button: BUTTONS[event.button] ?? 'left', clickCount: event.detail || 1 }));
image.addEventListener('pointermove', event => send('pointer', { action: 'move', x: event.clientX, y: event.clientY }));
image.addEventListener('pointerleave', event => send('pointer', { action: 'leave', x: event.clientX, y: event.clientY }));
image.addEventListener('wheel', event => { event.preventDefault(); send('wheel', { x: event.clientX, y: event.clientY, deltaX: event.deltaX, deltaY: event.deltaY }); }, { passive: false });
image.addEventListener('contextmenu', event => event.preventDefault());

keys.addEventListener('keydown', event => {
  if (event.isComposing) return;
  const key = event.key.toLowerCase();
  if (event.metaKey && key === 'c') { event.preventDefault(); void api.copy(); return; }
  if (event.metaKey && key === 'v') { event.preventDefault(); void api.paste(); return; }
  if (FORWARDED.has(event.key) || event.metaKey || event.ctrlKey) {
    event.preventDefault();
    send('key', { action: 'down', key: event.key, code: event.code, modifiers: modifiers(event) });
  }
});
keys.addEventListener('keyup', event => {
  if (event.isComposing) return;
  if (FORWARDED.has(event.key) || event.metaKey || event.ctrlKey)
    send('key', { action: 'up', key: event.key, code: event.code, modifiers: modifiers(event) });
});
keys.addEventListener('input', event => {
  if (event.isComposing) return;
  if (keys.value) send('text', { text: keys.value });
  keys.value = '';
});
keys.addEventListener('compositionstart', () => send('composition', { phase: 'start', text: '', selectionStart: 0, selectionEnd: 0 }));
keys.addEventListener('compositionupdate', event => {
  const text = event.data ?? '';
  send('composition', { phase: 'update', text, selectionStart: text.length, selectionEnd: text.length });
});
keys.addEventListener('compositionend', event => {
  const text = event.data ?? '';
  send('composition', { phase: 'end', text, selectionStart: text.length, selectionEnd: text.length });
  keys.value = '';
});
window.addEventListener('focus', () => keys.focus());
keys.focus();
