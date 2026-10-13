import fs from 'node:fs/promises';
import path from 'node:path';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function measureEventRuntimeBaseline({
  app, browser, controller, snapshot, dataDir, chromiumDiagnostics,
  chromiumDiagnosticsFile, runtimeMetrics, waitFor,
}) {
  const windowMs = Number(process.env.WORKFLOW_PILOT_BASELINE_WINDOW_MS || 60000);
  const sampleMs = 1000;

  const journalCount = async () => {
    await chromiumDiagnostics.flush();
    const text = await fs.readFile(chromiumDiagnosticsFile, 'utf8').catch(() => '');
    return text ? text.trim().split('\n').filter(Boolean).length : 0;
  };

  const collect = async name => {
    runtimeMetrics.reset();
    const beforeLogs = await journalCount();
    const cpuSamples = [];
    const deadline = Date.now() + windowMs;
    while (Date.now() < deadline) {
      cpuSamples.push(app.getAppMetrics().map(metric => ({
        type: metric.type,
        cpu: metric.cpu?.percentCPUUsage ?? 0,
      })));
      await sleep(Math.min(sampleMs, Math.max(1, deadline - Date.now())));
    }
    const afterLogs = await journalCount();
    const counters = runtimeMetrics.snapshot();
    const byType = {};
    for (const item of cpuSamples.flat()) (byType[item.type] ??= []).push(item.cpu);
    const cpuAverage = Object.fromEntries(Object.entries(byType).map(([type, values]) => [
      type,
      Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000,
    ]));
    return {
      name,
      windowMs,
      ...counters,
      diagnosticRecords: Math.max(0, afterLogs - beforeLogs),
      cpuAverage,
    };
  };

  const scenarios = [];
  await waitFor(() => snapshot().context.phase === 'delivered', 'baseline delivered', snapshot);
  scenarios.push(await collect('idle-delivered'));

  await browser.executeJavaScript("(() => { const button=document.createElement('button'); button.setAttribute('data-testid','stop-button'); button.textContent='Stop'; document.body.append(button); })()");
  await controller.retry();
  await waitFor(() => snapshot().context.phase === 'waiting-generation', 'baseline waiting generation', snapshot);
  scenarios.push(await collect('waiting-generation'));

  await browser.executeJavaScript("(() => { const article=document.createElement('article'); article.id='baseline-stream'; article.setAttribute('data-message-author-role','assistant'); document.body.append(article); window.__baselineStreamTick=0; window.__baselineStream=setInterval(()=>{ article.textContent='token '+(++window.__baselineStreamTick); },50); })()");
  scenarios.push(await collect('streaming-response'));

  const result = {
    measuredAt: new Date().toISOString(),
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    fixture: true,
    scenarios,
    limitation: 'Isolated source fixture; no live ChatGPT text, recovery text, credentials or secrets are recorded.',
  };
  await fs.writeFile(path.join(dataDir, 'event-runtime-baseline.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('EVENT_RUNTIME_BASELINE=' + JSON.stringify(result));

  await browser.executeJavaScript("(() => { clearInterval(window.__baselineStream); document.getElementById('baseline-stream')?.remove(); document.querySelector('[data-testid=\"stop-button\"]')?.remove(); })()");
  return result;
}
