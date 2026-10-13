import { PAGE_STATE_CHANNEL } from './page-state.mjs';
const chatOrigin = value => { try { return new URL(value).origin === 'https://chatgpt.com'; } catch { return false; } };
const bridges=new WeakMap();

// One document identity check in the isolated preload world, never a DOM polling loop.
export function connectPageState(contents, ipc, source, { onFailure = () => {} } = {}) {
  let generation = 0, closed = false, identity = null, healthTimer = null;
  const handlers = [];
  const on = (event, handler) => { contents.on(event, handler); handlers.push([event, handler]); };
  const clearHealth = () => { clearTimeout(healthTimer); healthTimer = null; };
  const reset = () => { generation++; identity = null; clearHealth(); source.reset(); };
  const receive = async (event, raw) => {
    if (closed || contents.isDestroyed() || event.sender !== contents || event.senderFrame !== contents.mainFrame
        || !chatOrigin(event.senderFrame?.url)) return;
    const ownGeneration = generation, frame = event.senderFrame;
    try {
      // Never let a late hello designate itself as the current document.
      identity ??= contents.executeJavaScriptInIsolatedWorld(999, [{ code: 'globalThis.__webPilotObserverDocumentId' }]);
      const liveId = await identity;
      if (closed || ownGeneration !== generation || frame !== contents.mainFrame
          || !chatOrigin(frame.url) || !liveId || raw?.documentId !== liveId || raw?.state?.url !== frame.url) return;
      const result = source.accept(raw);
      if (result.accepted) clearHealth();
    } catch { if (!closed && ownGeneration === generation) onFailure('PAGE_OBSERVER_INVALID'); }
  };
  let bridge=bridges.get(ipc);
  if(!bridge) {
    bridge={receivers:new Map()};
    bridge.receive=(event,raw)=>bridge.receivers.get(event.sender)?.(event,raw);
    bridges.set(ipc,bridge);ipc.on(PAGE_STATE_CHANNEL,bridge.receive);
  }
  bridge.receivers.set(contents,receive);
  on('did-start-navigation', (event, _url, isInPlace, isMainFrame) => { if ((event.isMainFrame ?? isMainFrame) && !(event.isSameDocument ?? isInPlace)) reset(); });
  on('render-process-gone', reset);
  on('preload-error', (_event, preloadPath) => {
    if (preloadPath.endsWith('chatgpt-page-observer-preload.cjs')) onFailure('PAGE_OBSERVER_FAILED');
  });
  on('did-finish-load', () => {
    if (!chatOrigin(contents.getURL()) || source.current) return;
    const expected = generation;
    healthTimer = setTimeout(() => {
      if (!closed && generation === expected && !source.current) onFailure('PAGE_OBSERVER_UNAVAILABLE');
    }, 5000);
    healthTimer.unref?.();
  });
  return () => {
    closed = true; reset(); bridge.receivers.delete(contents);
    if(!bridge.receivers.size){ipc.removeListener(PAGE_STATE_CHANNEL,bridge.receive);bridges.delete(ipc);}
    for (const [event, handler] of handlers) contents.removeListener(event, handler);
  };
}
