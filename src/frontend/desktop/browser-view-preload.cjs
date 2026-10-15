const { contextBridge, ipcRenderer } = require('electron');
// The page image and input of one backend page. No URL, script or file path
// crosses this bridge; the main process addresses the page by its own viewer.
contextBridge.exposeInMainWorld('webPilotBrowser', Object.freeze({
  input: (type, data, bounds) => ipcRenderer.invoke('browser:input', { type, data, bounds }),
  copy: () => ipcRenderer.invoke('browser:copy'),
  paste: () => ipcRenderer.invoke('browser:paste'),
  onFrame: callback => {
    if (typeof callback !== 'function') throw new TypeError('Expected a callback');
    const listener = (_event, frame) => callback(frame);
    ipcRenderer.on('browser:frame', listener);
    return () => ipcRenderer.removeListener('browser:frame', listener);
  },
  onStatus: callback => {
    if (typeof callback !== 'function') throw new TypeError('Expected a callback');
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('browser:status', listener);
    return () => ipcRenderer.removeListener('browser:status', listener);
  },
}));
