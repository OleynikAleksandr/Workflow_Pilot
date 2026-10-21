// Passive synthetic viewer: deliberately no Workflow Pilot binding or delivery SDK.
export function mountProbe({app, document, kind, timers = globalThis}) {
  let disposed = false, timer = null, inFlight = false, count = 0;
  let connected = false, toolReady = false, requesting = false, attempt = 0;
  const window = document.defaultView, history = [];
  const out = id => document.getElementById(id);
  const mode = value => ['inline', 'fullscreen', 'pip'].includes(value) ? value : 'не сообщён';
  function record(event, fields = {}) {
    if (disposed) return;
    history.push({time: new Date().toISOString(), event, ...fields});
    if (history.length > 50) history.shift();
    out('diagnostics').textContent = history.map(row => JSON.stringify(row)).join('\n');
  }
  function buttons() {
    out('pip').disabled = !connected || !toolReady || requesting;
    out('pip-compat').disabled = !connected || !toolReady || requesting ||
      typeof window.openai?.requestDisplayMode !== 'function';
    out('compat').textContent = typeof window.openai?.requestDisplayMode === 'function'
      ? 'window.openai доступен' : 'window.openai недоступен в этом компоненте';
  }
  function context(event = 'host.context') {
    if (disposed) return;
    const value = app.getHostContext() ?? {};
    const available = (value.availableDisplayModes ?? []).filter(item => mode(item) === item);
    out('actual').textContent = mode(value.displayMode);
    out('available').textContent = available.join(', ') || 'не сообщены';
    out('compat-mode').textContent = mode(window.openai?.displayMode);
    buttons();
    record(event, {mode: mode(value.displayMode), available,
      compatibilityMode: mode(window.openai?.displayMode)});
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
  async function requestPip(bridge, event) {
    if (disposed || kind !== 'dialogue' || !connected || !toolReady || requesting) return;
    requesting = true;
    const id = ++attempt, started = window.performance.now();
    buttons();
    record('request', {attempt: id, bridge, requested: 'pip',
      trustedClick: event.isTrusted, userActivation: window.navigator.userActivation?.isActive ?? null});
    out('request').textContent = `Попытка ${id}: ожидаем ответ ${bridge}…`;
    try {
      // Invoke directly in the click handler, before any asynchronous work.
      const reply = await (bridge === 'MCP'
        ? app.requestDisplayMode({mode: 'pip'})
        : window.openai.requestDisplayMode({mode: 'pip'}));
      if (disposed) return;
      const granted = mode(reply?.mode);
      record('response', {attempt: id, bridge, returnedMode: granted,
        responseType: reply === undefined ? 'undefined' : reply === null ? 'null' : typeof reply,
        elapsedMs: Math.round(window.performance.now() - started)});
      context('context.after-response');
      out('request').textContent = granted === 'pip'
        ? `${bridge}: ответ SDK — pip. Плавающее окно и совместную видимость подтвердите визуально.`
        : granted === 'не сообщён'
          ? `${bridge}: ответ без режима. Это не доказательство отказа или успеха; смотрите события режима и фактическое окно.`
          : `${bridge}: PiP не предоставлен, ответ SDK — ${granted}.`;
    } catch (error) {
      if (disposed) return;
      // Never serialize the error object, data, tool result or raw host context.
      const clean = value => String(value ?? '').replace(/https?:\/\/\S+/g, '[URL]')
        .replace(/\b(?:Bearer\s+\S+|[A-Za-z0-9_-]{32,})\b/g, '[redacted]').slice(0, 500);
      const diagnostic = {name: clean(error?.name), code: clean(error?.code), message: clean(error?.message ?? error)};
      record('error', {attempt: id, bridge, ...diagnostic,
        elapsedMs: Math.round(window.performance.now() - started)});
      out('request').textContent = `${bridge}: ошибка ${diagnostic.code || diagnostic.name}: ${diagnostic.message}`;
    } finally {
      requesting = false;
      if (!disposed) buttons();
    }
  }
  function dispose() {
    disposed = true;
    if (timer !== null) timers.clearTimeout(timer);
    app.removeEventListener?.('hostcontextchanged', hostChanged);
    window.removeEventListener('openai:set_globals', globalsChanged);
    window.removeEventListener('pagehide', dispose);
    // No Stop, grant mutation, agent message, binding detach or backend command.
  }
  const hostChanged = () => context('host.context-changed');
  const globalsChanged = () => context('openai.globals-changed');
  app.addEventListener('hostcontextchanged', hostChanged);
  window.addEventListener('openai:set_globals', globalsChanged);
  app.ontoolresult = result => {
    if (disposed) return;
    toolReady = result.isError !== true;
    out('ready').textContent = toolReady ? 'Результат инструмента получен' : 'Инструмент сообщил ошибку';
    record('tool.result', {isError: result.isError === true});
    context('context.tool-result');
  };
  app.onteardown = async () => { dispose(); return {}; };
  for (const id of ['pip', 'pip-compat']) out(id).hidden = kind !== 'dialogue';
  out('pip').addEventListener('click', event => { void requestPip('MCP', event); });
  out('pip-compat').addEventListener('click', event => { void requestPip('window.openai', event); });
  window.addEventListener('pagehide', dispose);
  buttons();
  return {
    async start() {
      await app.connect();
      if (disposed) return;
      connected = true;
      context('sdk.connected');
      out('initial').textContent = mode(app.getHostContext()?.displayMode);
      void refresh();
    },
    dispose,
  };
}
