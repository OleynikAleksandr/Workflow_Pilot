// Passive synthetic viewer: deliberately no Workflow Pilot binding or delivery SDK.
export function mountProbe({app, document, kind, timers = globalThis}) {
  let disposed = false, timer = null, inFlight = false, count = 0;
  const out = id => document.getElementById(id);
  function context() {
    if (disposed) return;
    const value = app.getHostContext() ?? {};
    out('actual').textContent = value.displayMode ?? 'не сообщён';
    out('available').textContent = (value.availableDisplayModes ?? []).join(', ') || 'не сообщены';
  }
  async function refresh() {
    if (disposed || inFlight) return;
    inFlight = true;
    try {
      const reply = await app.callServerTool({name: 'pip_probe_status', arguments: {}});
      if (disposed) return;
      if (reply.isError || !reply.structuredContent?.synthetic) throw Error('Нет тестовых данных');
      const data = reply.structuredContent;
      out('clock').textContent = data.serverTime;
      out('tick').textContent = String(data.tick);
      out('count').textContent = String(++count);
      out('connection').textContent = 'Тестовый источник доступен';
    } catch {
      if (!disposed) out('connection').textContent = 'Источник недоступен; обновление будет повторено';
    } finally {
      inFlight = false;
      if (!disposed) timer = timers.setTimeout(refresh, 2000);
    }
  }
  async function requestPip() {
    if (disposed || kind !== 'dialogue') return;
    try {
      const reply = await app.requestDisplayMode({mode: 'pip'});
      if (disposed) return;
      out('actual').textContent = reply.mode;
      out('request').textContent = reply.mode === 'pip'
        ? 'Хост предоставил PiP. Совместное отображение подтвердите визуально.'
        : `PiP не предоставлен: хост выбрал ${reply.mode}.`;
    } catch {
      if (!disposed) out('request').textContent = 'Хост отклонил запрос PiP.';
    }
  }
  function dispose() {
    disposed = true;
    if (timer !== null) timers.clearTimeout(timer);
    // No Stop, grant mutation, agent message, binding detach or backend command.
  }
  app.addEventListener('hostcontextchanged', context);
  app.onteardown = async () => { dispose(); return {}; };
  out('pip').hidden = kind !== 'dialogue';
  out('pip').addEventListener('click', requestPip);
  document.defaultView.addEventListener('pagehide', dispose);
  return {
    async start() {
      await app.connect();
      if (disposed) return;
      context();
      out('initial').textContent = app.getHostContext()?.displayMode ?? 'не сообщён';
      void refresh();
      if (kind === 'dialogue') await requestPip();
    },
    dispose,
  };
}
