const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('fixtureView',Object.freeze({
  frame:()=>ipcRenderer.invoke('fixture-frame'),
  click:(x,y)=>ipcRenderer.invoke('fixture-click',{x,y}),
  insert:text=>ipcRenderer.invoke('fixture-insert',text),
  copy:()=>ipcRenderer.invoke('fixture-copy'),
  paste:()=>ipcRenderer.invoke('fixture-paste'),
  upload:(name,text)=>ipcRenderer.invoke('fixture-upload',{name,text}),
  download:()=>ipcRenderer.invoke('fixture-download'),
}));
