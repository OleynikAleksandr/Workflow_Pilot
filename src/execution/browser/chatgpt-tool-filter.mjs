import { chatGPTDOMScript } from './chatgpt-dom.mjs';

function installToolFilter(hide, dom) {
  const key = '__webPilotToolCallFilter';
  window[key]?.disconnect();
  const attr = 'data-web-pilot-tool-call-hidden', footprintAttr = 'data-web-pilot-tool-call-footprint-hidden';
  const saved = new Map();
  let frame = null, changed = false;
  const protectedNode = e => e.closest(dom.selectors.user + ',pre,code,[contenteditable="true"]')
    || e.querySelector('a,input,textarea,select,[role="dialog"],[role="alertdialog"],[data-agent-activity-file-link]')
    || /(?:allow|approve|permission|разрешить|подтвердить|разрешени)/i.test(e.textContent)
    || [...e.querySelectorAll('button')].some(b => !b.hasAttribute('aria-expanded') && (b.textContent.trim() || b.getAttribute('aria-label')));
  const hideNode = (e, name) => {
    if (!saved.has(e)) saved.set(e, { value: e.style.getPropertyValue('display'), priority: e.style.getPropertyPriority('display') });
    if (e.getAttribute(name) === 'true') return;
    e.setAttribute(name, 'true'); e.style.setProperty('display', 'none', 'important'); changed = true;
  };
  const normalized = e => (e.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const apply = () => {
    frame = null; changed = false;
    // New activity header is a semantic service row, not an assistant text wrapper.
    for (const e of document.querySelectorAll(dom.selectors.activity)) {
      if (!protectedNode(e)) hideNode(e, attr);
    }
    // Legacy markup: expand only across parents with exactly the same service text.
    for (const e of document.querySelectorAll('button,[role="button"],summary')) {
      if (e.closest(dom.selectors.user + ',pre,code,[contenteditable="true"]')) continue;
      const text = normalized(e);
      if (!['вызываемый инструмент','called tool','tool call','получен ответ приложения','app response'].some(x => text === x || text.startsWith(x + ' '))) continue;
      if (e.closest('[role="dialog"],[role="alertdialog"]')) continue;
      let layout = e;
      for (let p = e.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        if (normalized(p) !== text || p.querySelector('a,input,textarea,select')) break;
        layout = p;
        if (p.matches(dom.selectors.assistant)) break;
      }
      hideNode(e, attr); hideNode(layout, footprintAttr);
    }
    if (changed) window.__webPilotConversationAutoScroll?.refresh?.();
  };
  const observer = new MutationObserver(() => { if (frame === null) frame = requestAnimationFrame(apply); });
  const disconnect = () => {
    observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame);
    for (const [e, s] of saved) {
      if (s.value) e.style.setProperty('display', s.value, s.priority); else e.style.removeProperty('display');
      e.removeAttribute(attr); e.removeAttribute(footprintAttr);
    }
    saved.clear(); delete window[key];
  };
  if (!hide) { window.__webPilotConversationAutoScroll?.refresh?.(); return 0; }
  window[key] = { apply, disconnect };
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  apply(); return saved.size;
}
export const toolFilterScript = hide => `(${installToolFilter.toString()})(${!!hide}, ${chatGPTDOMScript()})`;
