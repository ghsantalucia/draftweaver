const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  getTree: (folderPath) => ipcRenderer.invoke('get-tree', folderPath),
  getBooksList: () => ipcRenderer.invoke('get-books-list'), 
  setNativeTheme: (isDark) => ipcRenderer.send('update-titlebar-theme', isDark)
});