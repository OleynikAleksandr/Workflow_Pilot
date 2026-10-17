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
const mac = /Mac/.test(navigator.platform);
// The client's own command key: Cmd on macOS, Ctrl elsewhere; the physical key, not the layout.
const command = (event, code) => (mac ? event.metaKey : event.ctrlKey) && event.code === code;
let notice = null;
const report = message => {
  status.textContent = message; status.hidden = false;
  clearTimeout(notice); notice = setTimeout(() => { notice = null; status.hidden = true; }, 4000);
};
const act = (promise, failure) => promise.then(result => { if (result?.message) report(result.message); })
  .catch(error => report(failure + (error?.message ? ': ' + error.message : '.')));
const modifiers = event => ['shift', 'control', 'alt', 'meta'].filter(name => event[name + 'Key']);
const BUTTONS = ['left', 'middle', 'right'];
const FORWARDED = new Set(['Enter', 'Backspace', 'Tab', 'Escape', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'Meta']);

api.onFrame(({ png }) => {
  const next = URL.createObjectURL(new Blob([png], { type: 'image/png' }));
  image.onload = () => { if (objectUrl && objectUrl !== next) URL.revokeObjectURL(objectUrl); objectUrl = next; };
  image.src = next; if (!notice) status.hidden = true;
});
api.onStatus(({ message }) => { status.textContent = message || ''; status.hidden = !message; });

// Pasted files land where the user last pressed on the page, else in its centre.
let lastPoint = null;
const MAX_FILES = 10, MAX_FILE_BYTES = 32 * 1024 * 1024;
async function dropFiles(list, point) {
  const files = list.filter(file => file.size > 0 || file.type);
  if (!files.length) return report('Можно передать только файлы.');
  if (files.length > MAX_FILES) return report('За один раз можно передать до 10 файлов.');
  if (files.some(file => file.size > MAX_FILE_BYTES)) return report('Файл больше 32 МБ.');
  const box = bounds(), at = point ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  report(files.length === 1 ? 'Передаём файл ' + files[0].name + '…' : 'Передаём файлы: ' + files.length + '…');
  const payload = await Promise.all(files.map(async file => ({ name: file.name || 'file', mime: file.type || undefined,
    bytes: new Uint8Array(await file.arrayBuffer()) })));
  await act(api.drop(payload, at, box).then(() => { clearTimeout(notice); notice = null; status.hidden = true; }), 'Не удалось передать файлы');
}
// A file dragged over the page is accepted anywhere in the view.
window.addEventListener('dragover', event => {
  if (![...(event.dataTransfer?.types ?? [])].includes('Files')) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('drop', event => {
  event.preventDefault();
  const files = [...(event.dataTransfer?.files ?? [])];
  if (files.length) void dropFiles(files, { x: event.clientX, y: event.clientY }).catch(error => report('Не удалось передать файлы: ' + error.message));
});

image.addEventListener('pointerdown', event => {
  event.preventDefault(); keys.focus(); lastPoint = { x: event.clientX, y: event.clientY };
  send('pointer', { action: 'down', x: event.clientX, y: event.clientY, button: BUTTONS[event.button] ?? 'left', clickCount: event.detail || 1 });
});
window.addEventListener('pointerup', event => send('pointer', { action: 'up', x: event.clientX, y: event.clientY,
  button: BUTTONS[event.button] ?? 'left', clickCount: event.detail || 1 }));
image.addEventListener('pointermove', event => send('pointer', { action: 'move', x: event.clientX, y: event.clientY }));
image.addEventListener('pointerleave', event => send('pointer', { action: 'leave', x: event.clientX, y: event.clientY }));
image.addEventListener('wheel', event => { event.preventDefault(); send('wheel', { x: event.clientX, y: event.clientY, deltaX: event.deltaX, deltaY: event.deltaY }); }, { passive: false });
// The page's own context menu is not part of the frame: the client shows its own.
image.addEventListener('contextmenu', event => { event.preventDefault(); keys.focus(); void act(api.contextMenu(), 'Меню недоступно'); });

keys.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if (command(event, 'KeyC')) { event.preventDefault(); void act(api.copy(), 'Не удалось скопировать'); return; }
  if (command(event, 'KeyX')) { event.preventDefault(); void act(api.cut(), 'Не удалось вырезать'); return; }
  // The native paste command fires the paste event below with the clipboard contents.
  if (command(event, 'KeyV')) return;
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
// Cmd+V, Edit → Paste and the context menu all arrive here: the system hands
// the clipboard to this event, the client never reads it programmatically.
keys.addEventListener('paste', event => {
  event.preventDefault();
  // A copied screenshot or file is attached like a drop; text is typed into the page.
  const files = [...(event.clipboardData?.files ?? [])];
  if (files.length) return void dropFiles(files, lastPoint).catch(error => report('Не удалось вставить файл: ' + error.message));
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (text) void act(api.paste(text), 'Не удалось вставить');
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
