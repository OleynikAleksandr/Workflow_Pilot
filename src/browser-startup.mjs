const failure = (code, message, fields = {}) => Object.assign(new Error(message), { code, ...fields });
const superseded = () => failure('NAVIGATION_SUPERSEDED', 'Открыта другая страница.');

function firstDocument(contents, url, isCurrent, timeoutMs) {
  return new Promise((resolve, reject) => {
    let finished = false, documentStarted = false;
    const settle = error => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline); clearInterval(currentTimer);
      contents.removeListener('dom-ready', ready);
      contents.removeListener('did-frame-navigate', navigated);
      error ? reject(error) : resolve();
    };
    const ready = () => {
      if (!isCurrent()) settle(superseded());
      else if (contents.getURL() && contents.getURL() !== 'about:blank') settle();
    };
    const navigated = (_event, _url, _status, _text, main) => { if (main && _url && _url !== 'about:blank') documentStarted = true; };
    const deadline = setTimeout(() => settle(isCurrent()
      ? failure(documentStarted ? 'PAGE_DOCUMENT_TIMEOUT' : 'PAGE_RESPONSE_TIMEOUT',
        'Не удалось дождаться страницы ChatGPT.', { documentStarted })
      : superseded()), timeoutMs);
    const currentTimer = setInterval(() => { if (!isCurrent()) settle(superseded()); }, 50);
    contents.on('dom-ready', ready);
    contents.on('did-frame-navigate', navigated);
    try { Promise.resolve(contents.loadURL(url)).then(ready, settle); }
    catch (error) { settle(error); }
  });
}

// Diagnostic iteration: let Chromium complete its own first connection attempt.
const STARTUP_REQUEST_TIMEOUT_MS = 120000;
export async function openStartupPage(contents, url, {
  isCurrent = () => true, timeoutMs = STARTUP_REQUEST_TIMEOUT_MS,
} = {}) {
  if (!isCurrent()) throw superseded();
  try {
    await firstDocument(contents, url, isCurrent, timeoutMs);
    return { recovered: false };
  } catch (error) {
    if (!isCurrent()) throw superseded();
    if (error.code === 'PAGE_RESPONSE_TIMEOUT'
        && (!contents.getURL() || contents.getURL() === 'about:blank')) contents.stop();
    throw error;
  }
}
