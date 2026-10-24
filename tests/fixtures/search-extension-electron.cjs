const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const [directory, phase] = process.argv.slice(2);
const profile = path.join(directory, 'profile-' + phase);
app.setName('WorkflowPilotSearchExtensionFixture');app.setPath('userData', profile);app.setPath('sessionData', profile);
const windows = [];let manager;
const timer = setTimeout(() => { console.error('EXTENSION_FIXTURE_TIMEOUT'); app.exit(1); }, 55000);
app.on('window-all-closed', () => {});
(async () => {
  try {
    await app.whenReady();if (process.platform === 'darwin') app.setActivationPolicy('accessory');
    const source = path.resolve(__dirname, '../../src/execution/browser');
    const { ChatGPTSearchExtension } = await import(pathToFileURL(path.join(source, 'chatgpt-search-extension.mjs')));
    const { BrowserSessions } = await import(pathToFileURL(path.join(source, 'session-runtime.mjs')));
    const ses = session.fromPartition('persist:isolated-chatgpt-search');let requests = 0, submissions = 0;
    const html = '<!doctype html><title>Local extension startup fixture</title><script>'
      + 'window.fixture={markerAtDocumentStart:document.documentElement.dataset.searchExtension??null};'
      + 'const q=new URL(location.href).searchParams.get("q");'
      + 'window.delivery=q&&window.fixture.markerAtDocumentStart==="1"?fetch("/submit",{method:"POST",body:q}):Promise.resolve();'
      + '</script>';
    await ses.protocol.handle('https', async req => {
      const u = new URL(req.url);assert.equal(u.origin, 'https://chatgpt.com');
      if (u.pathname === '/submit') { assert.equal(await req.text(), 'isolated-opening-command'); submissions++; return new Response('{}'); }
      return new Response(html, { headers: { 'content-type': 'text/html' } });
    });
    const extension = new ChatGPTSearchExtension({ session: ses, directory: path.join(directory, 'cache'), fetch: (...args) => {
      requests++;if (phase === 'offline' || phase === 'corrupt') throw Error('Network forbidden by fixture');return fetch(...args);
    } });
    const host = { create: () => { const win = new BrowserWindow({ show: false, webPreferences: {
      session: ses, nodeIntegration: false, contextIsolation: true, sandbox: true } });windows.push(win);return win.webContents; },
      close: () => { for (const win of windows) if (!win.isDestroyed()) win.destroy(); } };
    manager = new BrowserSessions({ host, ipc: {}, connect: () => () => {}, createComposer: () => ({ inFlight: false }),
      prepareNavigation: url => extension.prepareNavigation(url) });
    const port = manager.open('extension-fixture');let result;
    if (phase === 'corrupt') {
      await assert.rejects(port.navigate('https://chatgpt.com/'), { code: 'CHATGPT_SEARCH_EXTENSION_DOWNLOAD' });
      assert.equal(windows[0].webContents.getURL(), '');assert.equal(ses.extensions.getAllExtensions().length, 0);
      result = { loadBlocked: true, requests, submissions };
    } else {
      await port.navigate('https://chatgpt.com/');
      const contents = windows[0].webContents;
      const root = await contents.executeJavaScript('window.fixture');assert.equal(root.markerAtDocumentStart, '1');
      await port.composer.startChat({ url: 'https://chatgpt.com/?q=isolated-opening-command', navigationToken: 'one-attempt' });
      await contents.executeJavaScript('window.delivery');assert.equal(submissions, 1);
      const page = await contents.executeJavaScript('window.fixture');
      await assert.rejects(port.composer.startChat({ url: 'https://chatgpt.com/?q=isolated-opening-command', navigationToken: 'one-attempt' }), { code: 'BOOTSTRAP_ALREADY_DISPATCHED' });
      await port.navigate('https://chatgpt.com/?q=isolated-opening-command', { reload: true });assert.equal(contents.getURL(), 'https://chatgpt.com/');
      assert.equal(submissions, 1);assert.equal(ses.extensions.getAllExtensions().length, 1);
      result = { requests, submissions, markerAtDocumentStart: page.markerAtDocumentStart, version: (await extension.ensure()).version };
    }
    await fs.writeFile(path.join(directory, phase + '.json'), JSON.stringify({ ...result, electron: process.versions.electron, chromium: process.versions.chrome }));
  } catch (error) { console.error(error.stack); process.exitCode = 1; }
  finally { clearTimeout(timer);manager?.dispose();for (const win of windows) if (!win.isDestroyed()) win.destroy();app.exit(process.exitCode ?? 0); }
})();
