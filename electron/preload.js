const { contextBridge, ipcRenderer } = require('electron')

// The only file-system access the page gets: handing a state snapshot to the
// main process, which writes it into the backup folder.
contextBridge.exposeInMainWorld('noxusBackup', {
  save: (json) => ipcRenderer.invoke('backup:save', json),
})
