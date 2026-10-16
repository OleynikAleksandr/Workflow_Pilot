// Touch, pointer and keyboard input of the remote web client, turned into the
// same addressed page input as the Mac window sends. A tap is a click, a drag
// scrolls, a long press opens the context menu; the iPad keyboard types into a
// hidden field whose text, composition and editing keys go to the page.
const LONG_PRESS_MS = 550, MOVE_PX = 8, DOUBLE_TAP_MS = 320;
const KEYS = new Set(['Enter', 'Backspace', 'Delete', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

// The frame is drawn with object-fit: contain, anchored top-left.
export function contentBounds(image) {
  const rect = image.getBoundingClientRect(), width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height) return null;
  const scale = Math.min(rect.width / width, rect.height / height);
  return { x: rect.left, y: rect.top, width: width * scale, height: height * scale };
}
export function modifiers(event) {
  return [event.shiftKey && 'shift', event.ctrlKey && 'control', event.altKey && 'alt', event.metaKey && 'meta'].filter(Boolean);
}

export function attachPageInput({ target, keyboard, keyboardButton = null, view, canInput }) {
  // Input is sent strictly in order: a key up never overtakes the next key down.
  let queue = Promise.resolve();
  const send = (type, data) => {
    const current = view(); if (!current?.frame || !canInput()) return queue;
    queue = queue.then(() => current.input(type, data)).catch(() => {});
    return queue;
  };
  const point = (event) => {
    const current = view(), bounds = contentBounds(target);
    if (!current?.frame || !bounds) return null;
    try { return current.point(event.clientX, event.clientY, bounds); } catch { return null; }
  };
  let touch = null, lastTap = 0;
  // Down and up are queued together, so another event cannot fall between them.
  const click = (at, button = 'left', clickCount = 1) => {
    send('pointer', { action: 'down', x: at.x, y: at.y, button, clickCount });
    return send('pointer', { action: 'up', x: at.x, y: at.y, button, clickCount });
  };
  target.addEventListener('contextmenu', event => event.preventDefault());
  target.addEventListener('pointerdown', event => {
    const at = point(event); if (!at) return;
    event.preventDefault(); target.setPointerCapture?.(event.pointerId);
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      return void send('pointer', { action: 'down', x: at.x, y: at.y, button: event.button === 2 ? 'right' : 'left', clickCount: Math.max(1, event.detail || 1) });
    }
    touch = { id: event.pointerId, start: at, last: { x: event.clientX, y: event.clientY }, origin: { x: event.clientX, y: event.clientY },
      moved: false, pressed: false };
    touch.timer = setTimeout(() => { if (touch && !touch.moved) { touch.pressed = true; void click(touch.start, 'right'); } }, LONG_PRESS_MS);
  });
  target.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      const at = point(event); if (at) void send('pointer', { action: 'move', x: at.x, y: at.y, button: event.buttons ? 'left' : 'none' });
      return;
    }
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.last.x, dy = event.clientY - touch.last.y;
    if (!touch.moved && Math.hypot(event.clientX - touch.origin.x, event.clientY - touch.origin.y) < MOVE_PX) return;
    touch.moved = true; clearTimeout(touch.timer);
    touch.last = { x: event.clientX, y: event.clientY };
    const bounds = contentBounds(target), frame = view()?.frame;
    const ratio = bounds && frame ? frame.logicalWidth / bounds.width : 1;
    // Finger moves content: the page scrolls the opposite way.
    void send('wheel', { x: touch.start.x, y: touch.start.y, deltaX: -dx * ratio, deltaY: -dy * ratio });
  });
  const finish = event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      const at = point(event); if (at) void send('pointer', { action: 'up', x: at.x, y: at.y, button: event.button === 2 ? 'right' : 'left', clickCount: Math.max(1, event.detail || 1) });
      return;
    }
    if (!touch || touch.id !== event.pointerId) return;
    clearTimeout(touch.timer);
    if (!touch.moved && !touch.pressed && event.type === 'pointerup') {
      const now = Date.now(), count = now - lastTap < DOUBLE_TAP_MS ? 2 : 1; lastTap = now;
      void click(touch.start, 'left', count);
    }
    touch = null;
  };
  target.addEventListener('pointerup', finish);
  target.addEventListener('pointercancel', finish);
  target.addEventListener('wheel', event => {
    const at = point(event); if (!at) return;
    event.preventDefault();
    void send('wheel', { x: at.x, y: at.y, deltaX: event.deltaX, deltaY: event.deltaY });
  }, { passive: false });

  // Keyboard: only what the user typed reaches the page; the field stays empty.
  let composing = false;
  const key = (name, event) => {
    const mods = event ? modifiers(event) : [];
    send('key', { action: 'down', key: name, code: event?.code || undefined, ...(mods.length ? { modifiers: mods } : {}) });
    return send('key', { action: 'up', key: name, code: event?.code || undefined, ...(mods.length ? { modifiers: mods } : {}) });
  };
  keyboard.addEventListener('beforeinput', event => {
    if (composing || event.isComposing) return;
    if (event.inputType === 'insertText' && event.data) { event.preventDefault(); void send('text', { text: event.data }); }
    else if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') { event.preventDefault(); void key('Enter'); }
    else if (event.inputType === 'deleteContentBackward') { event.preventDefault(); void key('Backspace'); }
    else if (event.inputType === 'deleteContentForward') { event.preventDefault(); void key('Delete'); }
    else if (event.inputType === 'insertFromPaste' && event.data) { event.preventDefault(); void send('text', { text: event.data }); }
  });
  keyboard.addEventListener('keydown', event => {
    if (composing || event.isComposing) return;
    const shortcut = (event.metaKey || event.ctrlKey) && event.key.length === 1;
    if (KEYS.has(event.key) && !['Enter', 'Backspace', 'Delete'].includes(event.key) || shortcut) { event.preventDefault(); void key(event.key, event); }
  });
  const composition = phase => event => {
    composing = phase !== 'end';
    const text = event.data ?? keyboard.value ?? '';
    void send('composition', { phase, text, selectionStart: text.length, selectionEnd: text.length });
    if (phase === 'end') keyboard.value = '';
  };
  keyboard.addEventListener('compositionstart', composition('start'));
  keyboard.addEventListener('compositionupdate', composition('update'));
  keyboard.addEventListener('compositionend', composition('end'));
  keyboard.addEventListener('input', () => { if (!composing) keyboard.value = ''; });
  keyboardButton?.addEventListener('click', () => { keyboard.focus({ preventScroll: true }); });
  return Object.freeze({ focusKeyboard: () => keyboard.focus({ preventScroll: true }) });
}
