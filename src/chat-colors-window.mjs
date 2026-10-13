import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export class ChatColorsWindow {
  constructor({ sourceDir, getState, change, reset, getBounds, passive=false }) {
    this.passive=passive;
    this.sourceDir = sourceDir; this.getState = getState; this.getBounds = getBounds; this.window = null;
    this.url = pathToFileURL(path.join(sourceDir, 'ui/chat-colors.html')).href;
    const handle = (channel, callback) => ipcMain.handle(channel, async (event, input) => {
      if (!this.window || this.window.isDestroyed() || event.sender !== this.window.webContents ||
          event.senderFrame !== this.window.webContents.mainFrame || event.senderFrame.url !== this.url)
        throw new Error('Недопустимый источник команды редактора цветов.');
      try { const result = await callback(input); return { ok: true, state: this.getState(), result }; }
      catch (error) { return { ok: false, error: { message: error.message }, state: this.getState() }; }
    });
    handle('chat-colors:get-state', () => null);
    handle('chat-colors:change', change);
    handle('chat-colors:reset', reset);
    handle('chat-colors:close', () => this.close());
  }
  publish() {
    if (this.window && !this.window.isDestroyed()) this.window.webContents.send('chat-colors:state', this.getState());
  }
  async open() {
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMinimized()) this.window.restore();
      if(!this.passive) {this.window.show();this.window.focus();} this.publish(); return;
    }
    const bounds = this.getBounds?.();
    this.window = new BrowserWindow({
      title: 'Цвета чата — Workflow Pilot', width: 440, height: 710, minWidth: 400, minHeight: 540,
      ...(bounds ? { x: bounds.x + 24, y: bounds.y + 90 } : {}),
      show: false, maximizable: false, backgroundColor: this.getState().theme === 'dark' ? '#1b1d22' : '#f4f6f8',
      focusable:!this.passive,
      webPreferences: { preload: path.join(this.sourceDir, 'chat-colors-preload.cjs'),
        nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: !this.passive },
    });
    const editor = this.window;
    editor.setMenu(null);
    editor.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    editor.webContents.on('will-navigate', event => event.preventDefault());
    editor.once('ready-to-show', () => { if (!editor.isDestroyed() && !this.passive) editor.show(); });
    editor.on('closed', () => { if (this.window === editor) this.window = null; });
    await editor.loadURL(this.url);
  }
  close() { if (this.window && !this.window.isDestroyed()) this.window.close(); }
}
