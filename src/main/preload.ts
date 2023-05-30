const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  askFile: () => ipcRenderer.invoke('dialog:askFile'),
  loadFile: (path: string) => ipcRenderer.invoke('dialog:loadFile', path)
})
