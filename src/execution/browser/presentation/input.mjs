// Validated client input -> Chromium DevTools Protocol. The page needs no OS
// focus or visible window; every pressed key and button is tracked so a lost
// viewer can be released without replaying anything.
const KEY_CODES = Object.freeze({ Backspace: 8, Tab: 9, Enter: 13, Escape: 27, ' ': 32, PageUp: 33, PageDown: 34,
  End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46,
  Shift: 16, Control: 17, Alt: 18, Meta: 91 });
const MODIFIER_BITS = Object.freeze({ alt: 1, control: 2, meta: 4, shift: 8 });
// macOS editing shortcuts are commands in Chromium, not text input.
const MAC_COMMANDS = Object.freeze({ a: 'selectAll', c: 'copy', v: 'paste', x: 'cut', z: 'undo' });
const BUTTON_BITS = Object.freeze({ left: 1, right: 2, middle: 4 });

const modifiers = list => (list ?? []).reduce((bits, name) => bits | MODIFIER_BITS[name], 0);
const keyCode = key => KEY_CODES[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);

export class PageInput {
  #buttons = new Set();
  #keys = new Map();
  #composing = false;
  #position = { x: 0, y: 0 };
  constructor(send, { platform = process.platform } = {}) { this.send = send; this.platform = platform; }
  get pressed() { return { buttons: [...this.#buttons], keys: [...this.#keys.keys()], composing: this.#composing }; }
  #buttonsMask() { return [...this.#buttons].reduce((bits, name) => bits | BUTTON_BITS[name], 0); }
  async dispatch({ type, data }) {
    if (type === 'pointer') return this.#pointer(data);
    if (type === 'wheel') {
      this.#position = { x: data.x, y: data.y };
      return this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: data.x, y: data.y,
        deltaX: data.deltaX, deltaY: data.deltaY, buttons: this.#buttonsMask() });
    }
    if (type === 'key') return this.#key(data);
    if (type === 'text') return this.send('Input.insertText', { text: data.text });
    return this.#composition(data);
  }
  async #pointer({ action, x, y, button = 'left', clickCount = 1 }) {
    this.#position = { x, y };
    if (action === 'move') return this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: this.#buttonsMask(),
      button: [...this.#buttons][0] ?? 'none' });
    if (action === 'leave') return this.releaseAll();
    if (button === 'none') return undefined;
    if (action === 'down') {
      this.#buttons.add(button);
      return this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount, buttons: this.#buttonsMask() });
    }
    // An unmatched release is ignored: nothing is pressed for this viewer.
    if (!this.#buttons.delete(button)) return undefined;
    return this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount, buttons: this.#buttonsMask() });
  }
  async #key({ action, key, code = '', modifiers: names }) {
    const bits = modifiers(names), id = code || key;
    const event = { key, code, modifiers: bits, windowsVirtualKeyCode: keyCode(key), nativeVirtualKeyCode: keyCode(key) };
    if (action === 'up') {
      if (!this.#keys.delete(id)) return undefined;
      return this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...event });
    }
    this.#keys.set(id, event);
    const shortcut = this.platform === 'darwin' && (bits & MODIFIER_BITS.meta) && MAC_COMMANDS[key.toLowerCase()];
    if (shortcut) return this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...event, commands: [shortcut] });
    // Enter produces its own text event; printable characters arrive as text input.
    if (key === 'Enter') return this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...event, text: '\r', unmodifiedText: '\r' });
    return this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...event });
  }
  async #composition({ phase, text, selectionStart, selectionEnd }) {
    if (phase === 'end') {
      this.#composing = false;
      return text ? this.send('Input.insertText', { text }) : this.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
    }
    this.#composing = true;
    return this.send('Input.imeSetComposition', { text, selectionStart, selectionEnd });
  }
  // Disconnect or lease loss: release, never replay. Errors of a closed page
  // are ignored because the page state is then reset anyway.
  async releaseAll() {
    const { x, y } = this.#position, sends = [];
    for (const button of [...this.#buttons]) {
      this.#buttons.delete(button);
      sends.push(this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1, buttons: this.#buttonsMask() }));
    }
    for (const [id, event] of [...this.#keys]) {
      this.#keys.delete(id);
      sends.push(this.send('Input.dispatchKeyEvent', { ...event, type: 'keyUp' }));
    }
    if (this.#composing) {
      this.#composing = false;
      sends.push(this.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 }));
    }
    await Promise.allSettled(sends);
  }
}
