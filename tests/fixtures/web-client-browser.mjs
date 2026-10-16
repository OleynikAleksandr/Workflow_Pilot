// Chromium stand-in for Safari on an iPad: a hidden window loads the remote web
// client through the Serve stand-in. Test probes evaluate page expressions.
import { app, BrowserWindow, session } from 'electron';
import readline from 'node:readline';

const url = process.argv.at(-1);
app.whenReady().then(async () => {
  const partition = 'web-client-' + process.pid;
  const window = new BrowserWindow({ show: false, width: 1180, height: 820, webPreferences: { partition, sandbox: true, contextIsolation: true } });
  window.webContents.on('console-message', (_event, _level, message) => process.stderr.write('[page] ' + message + '\n'));
  await window.loadURL(url);
  process.stdout.write(JSON.stringify({ ready: true }) + '\n');
  readline.createInterface({ input: process.stdin }).on('line', async line => {
    let command; try { command = JSON.parse(line); } catch { return; }
    try {
      if (command.op === 'eval') {
        const value = await window.webContents.executeJavaScript(command.code, true);
        process.stdout.write(JSON.stringify({ id: command.id, value }) + '\n');
      } else if (command.op === 'quit') { app.quit(); }
    } catch (error) { process.stdout.write(JSON.stringify({ id: command.id, error: error.message }) + '\n'); }
  });
  void session;
});
