const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('webPilotArchive', Object.freeze({
  getState: () => ipcRenderer.invoke('archive:get-state'),
  restore: items => ipcRenderer.invoke('archive:restore', items),
  forget: items => ipcRenderer.invoke('archive:forget', items),
  restoreSessions: items => ipcRenderer.invoke('archive:restore-sessions', items),
  deleteSessions: items => ipcRenderer.invoke('archive:delete-sessions', items),
  previewDelete: item => ipcRenderer.invoke('archive:preview-delete', item),
  cancelDelete: () => ipcRenderer.invoke('archive:cancel-delete'),
  deleteProject: (token, confirmation) => ipcRenderer.invoke('archive:delete-project', { token, confirmation }),
  recoverDeletions: () => ipcRenderer.invoke('archive:recover-deletions'),
  close: () => ipcRenderer.invoke('archive:close'),
  onState: callback => {
    if (typeof callback !== 'function') throw new TypeError('Expected a callback');
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('pilot-archive:state-changed', listener);
    return () => ipcRenderer.removeListener('pilot-archive:state-changed', listener);
  },
}));
