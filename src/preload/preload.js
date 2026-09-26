/**
 * @file Expõe a API segura via IPC para comunicação entre o processo de renderização e o Node.js.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * API principal exposta no escopo global do renderizador para operações do sistema.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** Abre um diálogo nativo para seleção de diretórios. */
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  /** Lê o conteúdo de um arquivo de forma assíncrona. */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  /** Salva conteúdos em arquivos locais. */
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  
  /** Remove um arquivo do sistema. */
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  
  /** Mapeia a estrutura de pastas e arquivos de um diretório. */
  getTree: (folderPath) => ipcRenderer.invoke('get-tree', folderPath),
  
  /** Retorna a listagem de livros disponíveis na pasta raiz /books. */
  getBooksList: () => ipcRenderer.invoke('get-books-list'), 
  
  /** Altera o tema visual da barra de título nativa. */
  setNativeTheme: (isDark) => ipcRenderer.send('update-titlebar-theme', isDark)
});

/**
 * API secundária focada em escuta de eventos em tempo real.
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * Registra ouvintes para os eventos do observador de arquivos (Chokidar).
   * @param {Function} callback - Função de retorno chamada ao detectar alterações.
   */
  onFileWatcher: (callback) => {
    ipcRenderer.on('fs:config-changed', (e, data) => callback('config-changed', data));
    ipcRenderer.on('fs:markdown-changed', (e, data) => callback('markdown-changed', data));
    ipcRenderer.on('fs:temp-changed', (e, data) => callback('temp-changed', data));
    ipcRenderer.on('fs:book-folder-changed', (e, data) => callback('book-folder-changed', data));
  }
});

console.log("[PRELOAD]");