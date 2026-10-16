import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

async function stand({ allowed = true } = {}) {
  const dom = new JSDOM('<!doctype html><body><img id="frame"><textarea id="keyboard"></textarea></body>', { pretendToBeVisual: true });
  const { window } = dom;
  for (const name of ['HTMLElement', 'Element', 'Node', 'Event', 'InputEvent', 'CompositionEvent', 'KeyboardEvent', 'MouseEvent'])
    globalThis[name] = window[name];
  const image = window.document.getElementById('frame'), keyboard = window.document.getElementById('keyboard');
  Object.defineProperty(image, 'naturalWidth', { value: 1000 }); Object.defineProperty(image, 'naturalHeight', { value: 800 });
  image.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 400 });
  const sent = [];
  const view = { frame: { logicalWidth: 500, logicalHeight: 400 },
    point: (x, y, bounds) => ({ x: x * 500 / bounds.width, y: y * 400 / bounds.height }),
    input: async (type, data) => { sent.push([type, data]); } };
  const { attachPageInput, contentBounds } = await import('../src/frontend/web/touch-input.mjs');
  attachPageInput({ target: image, keyboard, view: () => view, canInput: () => allowed });
  const pointer = (type, x, y, pointerType = 'touch') => {
    const event = new window.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 });
    Object.defineProperty(event, 'pointerType', { value: pointerType }); Object.defineProperty(event, 'pointerId', { value: 1 });
    image.dispatchEvent(event);
  };
  return { window, image, keyboard, sent, pointer, contentBounds };
}

test('touch: a tap clicks, a drag scrolls the page, a long press opens the context menu', async () => {
  const s = await stand();
  assert.deepEqual(s.contentBounds(s.image), { x: 0, y: 0, width: 500, height: 400 }, 'contain-fit frame bounds');
  s.pointer('pointerdown', 100, 100); s.pointer('pointerup', 100, 100); await settle(5);
  assert.deepEqual(s.sent.splice(0).map(([type, data]) => [type, data.action, data.button, data.x, data.y]),
    [['pointer', 'down', 'left', 100, 100], ['pointer', 'up', 'left', 100, 100]]);
  s.pointer('pointerdown', 100, 100); s.pointer('pointermove', 100, 60); s.pointer('pointerup', 100, 60); await settle(5);
  assert.deepEqual(s.sent.splice(0), [['wheel', { x: 100, y: 100, deltaX: -0, deltaY: 40 }]], 'the finger moves content, the page scrolls');
  s.pointer('pointerdown', 50, 50); await settle(650); s.pointer('pointerup', 50, 50); await settle(5);
  assert.deepEqual(s.sent.splice(0).map(([type, data]) => [type, data.action, data.button]), [['pointer', 'down', 'right'], ['pointer', 'up', 'right']]);
});

test('keyboard: typed text, editing keys and composition reach the page; the field stays empty', async () => {
  const s = await stand();
  const input = (inputType, data = null) => s.keyboard.dispatchEvent(new s.window.InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }));
  input('insertText', 'П'); input('deleteContentBackward'); input('insertParagraph'); await settle(5);
  assert.deepEqual(s.sent.splice(0).map(([type, data]) => type === 'text' ? ['text', data.text] : [type, data.action, data.key]),
    [['text', 'П'], ['key', 'down', 'Backspace'], ['key', 'up', 'Backspace'], ['key', 'down', 'Enter'], ['key', 'up', 'Enter']]);
  for (const [type, data] of [['compositionstart', ''], ['compositionupdate', 'に'], ['compositionend', '日本']])
    s.keyboard.dispatchEvent(new s.window.CompositionEvent(type, { data, bubbles: true }));
  await settle(5);
  assert.deepEqual(s.sent.splice(0).map(([type, data]) => [type, data.phase, data.text]),
    [['composition', 'start', ''], ['composition', 'update', 'に'], ['composition', 'end', '日本']]);
  assert.equal(s.keyboard.value, '');
});

test('an observer sends no input', async () => {
  const s = await stand({ allowed: false });
  s.pointer('pointerdown', 10, 10); s.pointer('pointerup', 10, 10);
  s.keyboard.dispatchEvent(new s.window.InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true }));
  await settle(5);
  assert.deepEqual(s.sent, []);
});
