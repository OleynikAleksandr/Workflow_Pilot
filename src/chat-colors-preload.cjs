const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('webPilotColors', Object.freeze({
  getState: () => ipcRenderer.invoke('chat-colors:get-state'),
  change: (key, value) => ipcRenderer.invoke('chat-colors:change', { key, value }),
  reset: () => ipcRenderer.invoke('chat-colors:reset'),
  close: () => ipcRenderer.invoke('chat-colors:close'),
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('chat-colors:state', listener);
    return () => ipcRenderer.removeListener('chat-colors:state', listener);
  },
}));
