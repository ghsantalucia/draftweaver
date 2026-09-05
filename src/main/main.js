/**
 * @file Ponto de entrada do Electron, gerencia a janela principal e manipuladores IPC do sistema de arquivos.
 */

import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Trata criação e remoção de atalhos no Windows durante instalação/desinstalação
if (started) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Aponta para o ícone na pasta public da raiz
    icon: path.join(process.cwd(), 'public', 'icon.ico'),
    title: 'DraftWeaver',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0e0f17',   /* Cor de fundo da barra para combinar com a Sidebar */
      symbolColor: '#ffffff', /* Cor dos ícones (X, -, square) */
      height: 30,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Maximiza e exibe a janela
  mainWindow.maximize();
  mainWindow.show();

  // Carrega a URL do servidor Vite em dev, ou o index.html compilado em produção
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Atalhos em modo de desenvolvimento (F12 e F5)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!app.isPackaged && input.type === 'keyDown') {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
      if (input.key === 'F5') {
        mainWindow.webContents.reload();
        event.preventDefault();
      }
    }
  });

  // Menu de contexto com Inspecionar Elemento em modo dev
  mainWindow.webContents.on('context-menu', (e, props) => {
    if (!app.isPackaged) {
      Menu.buildFromTemplate([
        {
          label: 'Inspecionar Elemento',
          click: () => mainWindow.webContents.inspectElement(props.x, props.y),
        },
      ]).popup(mainWindow);
    }
  });

  // Configuração do menu superior nativo
  const templateMenu = [
    { role: 'fileMenu', label: 'Arquivo' },
    { role: 'editMenu', label: 'Editar' },
    { role: 'viewMenu', label: 'Exibir' },
    { role: 'windowMenu', label: 'Janela' },
  ];

  const menu = Menu.buildFromTemplate(templateMenu);
  Menu.setApplicationMenu(menu);
};

// Inicialização da aplicação
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// === COMUNICAÇÕES COM O SISTEMA (IPC HANDLERS) ===

// Atualizar tema da barra de título nativa
ipcMain.on('update-titlebar-theme', (event, isDark) => {
  if (!mainWindow) return;

  if (isDark) {
    mainWindow.setTitleBarOverlay({
      color: '#181926',      // Modo escuro
      symbolColor: '#cdd6f4',
    });
  } else {
    mainWindow.setTitleBarOverlay({
      color: '#1e1e2f',      // Modo claro
      symbolColor: '#ffffff',
    });
  }
});

// Selecionar pasta no HD
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Ler arquivo
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
});

// Salvar arquivo
ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Mapear pasta e subpastas
ipcMain.handle('get-tree', async (event, folderPath) => {
  function buildTree(dir) {
    const stats = fs.statSync(dir);
    const item = {
      name: path.basename(dir),
      path: dir,
      isDirectory: stats.isDirectory(),
    };

    if (stats.isDirectory()) {
      const children = fs.readdirSync(dir);
      item.children = children.map((child) => buildTree(path.join(dir, child)));
    }
    return item;
  }

  try {
    return buildTree(folderPath);
  } catch (err) {
    return null;
  }
});

// Listar livros dentro da pasta /books
ipcMain.handle('get-books-list', async () => {
  // Busca a pasta /books na raiz do projeto
  const booksDir = path.join(process.cwd(), 'books');
  try {
    if (!fs.existsSync(booksDir)) return [];

    const entries = fs.readdirSync(booksDir, { withFileTypes: true });
    const books = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bookPath = path.join(booksDir, entry.name);
        const configPath = path.join(bookPath, 'config.json');
        let title = entry.name;

        if (fs.existsSync(configPath)) {
          try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            if (config.book_title) title = config.book_title;
          } catch (e) {
            console.error(`Erro ao ler config.json em ${entry.name}:`, e);
          }
        }

        books.push({
          folderName: entry.name,
          title: title,
          fullPath: bookPath,
        });
      }
    }
    return books;
  } catch (err) {
    console.error('Erro ao buscar livros:', err);
    return [];
  }
});