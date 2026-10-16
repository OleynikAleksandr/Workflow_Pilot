// Browser stand-in for Electron's ipcRenderer inside the Desktop UI pages of
// the remote web client. The unchanged preload files run against it; calls go
// to the web app (window.parent.__wpHost), which forwards them to the backend.
// The frame may load before the web app module has run: calls wait for it.
(() => {
  'use strict';
  window.__wpRemote = true;
  const parent = window.parent && window.parent !== window ? window.parent : null;
  const ready = new Promise(resolve => {
    const check = attempt => {
      if (parent?.__wpHost) return resolve(parent.__wpHost);
      if (!parent || attempt > 300) return resolve(null);
      setTimeout(() => check(attempt + 1), 50);
    };
    check(0);
  });
  const listeners = new Map();
  window.__wpIpc = Object.freeze({
    async invoke(channel, input) {
      const host = await ready;
      if (!host) return { ok: false, error: { code: 'REMOTE_HOST_MISSING', message: 'Откройте Workflow Pilot заново.' } };
      return host.invoke(channel, input, window);
    },
    on(channel, listener) {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel).add(listener);
      void ready.then(host => { if (listeners.get(channel)?.has(listener)) host?.subscribe(channel, listener); });
    },
    removeListener(channel, listener) {
      listeners.get(channel)?.delete(listener);
      void ready.then(host => host?.unsubscribe(channel, listener));
    },
  });
  window.addEventListener('pagehide', () => {
    void ready.then(host => { for (const [channel, set] of listeners) for (const listener of set) host?.unsubscribe(channel, listener); listeners.clear(); });
  });
})();
