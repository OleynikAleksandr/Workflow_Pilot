import { CHATGPT_SELECTORS } from './chatgpt-dom.mjs';
const COLOR_KEYS = Object.freeze(['background', 'userBackground', 'userText', 'assistantText', 'composerBackground']);
export const DEFAULT_COLORS = Object.freeze({
  light: Object.freeze({ background: '#ffffff', userBackground: '#f4f4f4', userText: '#0d0d0d', assistantText: '#0d0d0d', composerBackground: '#ffffff' }),
  dark: Object.freeze({ background: '#212121', userBackground: '#303030', userText: '#ececec', assistantText: '#ececec', composerBackground: '#303030' }),
});
export function normalizeChatColors(value = {}) {
  const result = {};
  for (const key of COLOR_KEYS) {
    const color = value?.[key];
    result[key] = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null;
  }
  return result;
}
export function validateColorChange(input) {
  if (!input || !COLOR_KEYS.includes(input.key) || (input.value !== null && (typeof input.value !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.value))))
    throw new TypeError('Выберите цвет или укажите HEX в формате #RRGGBB.');
  return { key: input.key, value: input.value?.toLowerCase() ?? null };
}
const role = name => ':is(' + CHATGPT_SELECTORS[name] + ')';
export const COMPOSER_CAPSULE_ATTR = 'data-web-pilot-composer-capsule';
export const COMPOSER_INNER_ATTR = 'data-web-pilot-composer-inner';
const userContent = role('user') + ',' + role('user') + ' *,.user-message-bubble,.user-message-bubble *,.user-message-bubble-color,.user-message-bubble-color *';
const editableContent = '[contenteditable="true"],[contenteditable="true"] *,#prompt-textarea,#prompt-textarea *';
const assistantContent = ':is(' + role('assistant') + ',main :is(.markdown,.prose,[class*="markdown-new-styling"]):not(:where(' + userContent + ',' + editableContent + ')))';
export function chatColorsCSS(input) {
  const colors = normalizeChatColors(input), rules = [];
  if (colors.background) {
    const c = colors.background;
    rules.push(':root,html,body,.dark,.light{--main-surface-primary:' + c + '!important;--bg-primary:' + c + '!important;--chat-background:' + c + '!important}');
    rules.push('html,body,main,#main,[role="main"],#thread,#thread :is(.bg-token-main-surface-primary,.bg-token-bg-primary),main :is(.bg-token-main-surface-primary,.bg-token-bg-primary){background-color:' + c + '!important}');
  }
  if (colors.userBackground) {
    // The role element spans the row; only the inner bubble owns the rounded fill.
    rules.push(CHATGPT_SELECTORS.userBubble + '{background:' + colors.userBackground + '!important}');
  }
  if (colors.composerBackground) {
    // The page marker (installComposerCapsule) tags the rounded capsule and the rectangular wrappers inside it.
    const capsule = '[' + COMPOSER_CAPSULE_ATTR + ']';
    rules.push(capsule + '{background:' + colors.composerBackground + '!important}');
    rules.push(capsule + ' :is([' + COMPOSER_INNER_ATTR + '],' + CHATGPT_SELECTORS.editor + '){background:transparent!important}');
  }
  for (const name of ['user', 'assistant']) {
    const c = colors[name + 'Text'];
    const target = name === 'assistant' ? assistantContent : role(name);
    // Streaming Markdown can appear before ChatGPT adds its assistant role wrapper.
    if (c) rules.push(target + ',' + target + ' :not(:where(pre,pre *,code,code *,a,a *,svg,svg *,button,button *,' + editableContent + ')){color:' + c + '!important}');
  }
  return rules.join('\n');
}
// Runs in the ChatGPT page. ChatGPT builds differ in which wrapper draws the rounded capsule
// (data-composer-body itself, ComposerLayoutRoot around a rectangular body, or the form for guests),
// so the capsule is found by geometry: the nearest rounded ancestor of every visible editor, never above its form.
function installComposerCapsule(enabled, editorSelector, capsuleAttr, innerAttr) {
  const key = '__webPilotComposerCapsule';
  window[key]?.disconnect();
  const tagged = () => document.querySelectorAll('[' + capsuleAttr + '],[' + innerAttr + ']');
  if (!enabled) { for (const e of tagged()) { e.removeAttribute(capsuleAttr); e.removeAttribute(innerAttr); } return 0; }
  const MIN_RADIUS = 12, MAX_DEPTH = 14;
  const visible = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const radius = e => {
    const s = getComputedStyle(e);
    const corners = [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].filter(Boolean);
    const values = corners.length === 4 ? corners : String(s.borderRadius || '0').split(/[\s/]+/);
    return Math.min(...values.map(value => parseFloat(value) || 0));
  };
  let watched = new Set(), resizeWatched = new Set(), pending = false, live = true;
  let schedule = () => {};
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const apply = () => {
    if (!live) return 0;
    const capsules = new Set(), inner = new Set(), nextWatched = new Set();
    for (const editor of document.querySelectorAll(editorSelector)) {
      for (let e = editor; e; e = e.parentElement) {
        nextWatched.add(e);
        if (e === document.documentElement) break;
      }
      if (!visible(editor)) continue;
      const chain = [];
      for (let e = editor.parentElement, depth = 0; e && e !== document.body && depth < MAX_DEPTH; e = e.parentElement, depth++) {
        if (radius(e) >= MIN_RADIUS) { capsules.add(e); for (const wrapper of chain) inner.add(wrapper); break; }
        if (e.tagName === 'FORM') break;
        chain.push(e);
      }
    }
    for (const e of document.querySelectorAll('[' + capsuleAttr + ']')) if (!capsules.has(e)) e.removeAttribute(capsuleAttr);
    for (const e of document.querySelectorAll('[' + innerAttr + ']')) if (!inner.has(e)) e.removeAttribute(innerAttr);
    for (const e of capsules) if (!e.hasAttribute(capsuleAttr)) e.setAttribute(capsuleAttr, '');
    for (const e of inner) if (!e.hasAttribute(innerAttr)) e.setAttribute(innerAttr, '');
    watched = nextWatched;
    if (resizeObserver) {
      for (const e of resizeWatched) if (!watched.has(e)) resizeObserver.unobserve?.(e);
      for (const e of watched) if (!resizeWatched.has(e)) resizeObserver.observe(e);
      resizeWatched = new Set(watched);
    }
    return capsules.size;
  };
  schedule = () => {
    if (!live || pending) return;
    pending = true;
    queueMicrotask(() => { pending = false; apply(); });
  };
  const addsEditor = node => node.nodeType === 1 && (node.matches(editorSelector) || !!node.querySelector(editorSelector));
  const containsWatched = node => node.nodeType === 1 && [...watched].some(e => node === e || node.contains(e));
  const observer = new MutationObserver(mutations => {
    if ([...watched].some(e => !e.isConnected) || mutations.some(m =>
      m.type === 'attributes' ? watched.has(m.target)
        : watched.has(m.target) || [...m.addedNodes].some(addsEditor) || [...m.removedNodes].some(containsWatched))) schedule();
  });
  const onResize = () => schedule();
  const onMedia = () => schedule();
  window.addEventListener('resize', onResize);
  media?.addEventListener?.('change', onMedia);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  window[key] = { apply, disconnect: () => {
    live = false; pending = false; observer.disconnect(); resizeObserver?.disconnect();
    window.removeEventListener('resize', onResize); media?.removeEventListener?.('change', onMedia); delete window[key];
  } };
  return apply();
}
export const composerCapsuleScript = enabled => `(${installComposerCapsule.toString()})(${!!enabled}, ${JSON.stringify(CHATGPT_SELECTORS.editor)}, ${JSON.stringify(COMPOSER_CAPSULE_ATTR)}, ${JSON.stringify(COMPOSER_INNER_ATTR)})`;
function isChatColorsURL(value) {
  try { const url = new URL(value); return url.origin === 'https://chatgpt.com'; } catch { return false; }
}
// One sheet per document; coalescing prevents a fast color drag from queuing obsolete sheets.
export class ChatColors {
  constructor(contents, colors = {}) {
    this.contents = contents; this.colors = normalizeChatColors(colors);
    this.key = null; this.document = 0; this.revision = 0; this.pending = null;
    this.onNavigate = (_event, _url, inPlace, mainFrame) => {
      if (mainFrame && !inPlace) { this.document++; this.key = null; }
    };
    this.onLoad = () => { void this.apply().catch(() => {}); };
    contents.on('did-start-navigation', this.onNavigate);
    contents.on('dom-ready', this.onLoad);
    contents.on('did-finish-load', this.onLoad);
    contents.on('did-navigate-in-page', this.onLoad);
  }
  set(colors) { this.colors = normalizeChatColors(colors); return this.apply(); }
  apply() {
    this.revision++;
    if (!this.pending) {
      this.pending = this.flush().finally(() => { this.pending = null; });
    }
    return this.pending;
  }
  async flush() {
    let applied;
    do {
      applied = this.revision;
      const doc = this.document, contents = this.contents;
      if (contents.isDestroyed() || !isChatColorsURL(contents.getURL())) return;
      const previous = this.key, css = chatColorsCSS(this.colors);
      // Tag the capsule before the sheet arrives so the color never lands on a rectangular wrapper.
      await contents.executeJavaScript(composerCapsuleScript(!!this.colors.composerBackground), true).catch(() => {});
      if (doc !== this.document || contents.isDestroyed()) continue;
      // Electron 44.3.0 removes author sheets reliably; !important wins over site styles.
      const next = css ? await contents.insertCSS(css, { cssOrigin: 'author' }) : null;
      if (doc !== this.document || contents.isDestroyed()) {
        // Navigation owns a new document; never remove a sheet using an old document's key.
        continue;
      }
      this.key = next;
      if (previous) await contents.removeInsertedCSS(previous);
    } while (applied !== this.revision);
  }
  dispose() {
    for (const name of ['dom-ready', 'did-finish-load', 'did-navigate-in-page']) this.contents.removeListener(name, this.onLoad);
    this.contents.removeListener('did-start-navigation', this.onNavigate);
  }
}
