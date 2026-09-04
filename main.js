/**
 * @file Ponto de entrada do Electron, gerencia a janela principal e manipuladores IPC do sistema de arquivos.
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        // Define o ícone da janela
        icon: path.join(__dirname, 'app', 'assets', 'img', 'icon.ico'),
        title: "DraftWeaver",
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0e0f17',        /* Cor de fundo da barra para combinar com sua Sidebar */
            symbolColor: '#ffffff',   /* Cor dos ícones (X, -, square) */
            height: 30
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Abre a janela maximizada (tela cheia com barra de tarefas visível)
    mainWindow.maximize();
    mainWindow.show();

    ipcMain.on('update-titlebar-theme', (event, isDark) => {
        if (!mainWindow) return;

        if (isDark) {
            mainWindow.setTitleBarOverlay({
                color: '#181926',       // Cor de fundo da barra no modo escuro
                symbolColor: '#cdd6f4'  // Cor dos ícones (X, -, square) no modo escuro
            });
        } else {
            mainWindow.setTitleBarOverlay({
                color: '#1e1e2f',       // Cor de fundo da barra no modo claro
                symbolColor: '#ffffff'  // Cor dos ícones no modo claro
            });
        }
    });

    // Aponta para a pasta /app
    mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (!app.isPackaged && input.type === 'keyDown') {
            // Atalho F12 - DevTools
            if (input.key === 'F12') {
                mainWindow.webContents.toggleDevTools();
                event.preventDefault();
            }

            // Atalho F5 - Recarregar página
            if (input.key === 'F5') {
                mainWindow.webContents.reload();
                event.preventDefault();
            }
        }
    });

    mainWindow.webContents.on('context-menu', (e, props) => {
        if (!app.isPackaged) {
            Menu.buildFromTemplate([
                {
                    label: 'Inspecionar Elemento',
                    click: () => mainWindow.webContents.inspectElement(props.x, props.y)
                }
            ]).popup(mainWindow);
        }
    });

    const templateMenu = [
        { role: 'fileMenu', label: 'Arquivo' },
        { role: 'editMenu', label: 'Editar' },
        { role: 'viewMenu', label: 'Exibir' },
        { role: 'windowMenu', label: 'Janela' }
    ];

    const menu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// === COMUNICAÇÕES COM O SISTEMA (IPC) ===

// Selecionar pasta no HD
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
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
            isDirectory: stats.isDirectory()
        };

        if (stats.isDirectory()) {
            const children = fs.readdirSync(dir);
            item.children = children.map(child => buildTree(path.join(dir, child)));
        }
        return item;
    }

    try {
        return buildTree(folderPath);
    } catch (err) {
        return null;
    }
});

// IPC para listar livros dentro da pasta /books
ipcMain.handle('get-books-list', async () => {
    const booksDir = path.join(__dirname, 'books');
    try {
        if (!fs.existsSync(booksDir)) return [];

        const entries = fs.readdirSync(booksDir, { withFileTypes: true });
        const books = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const bookPath = path.join(booksDir, entry.name);
                const configPath = path.join(bookPath, 'config.json');
                let title = entry.name; // Título padrão caso não haja config.json

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
                    fullPath: bookPath
                });
            }
        }
        return books;
    } catch (err) {
        console.error("Erro ao buscar livros:", err);
        return [];
    }
});