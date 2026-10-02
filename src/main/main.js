/**
 * @file Ponto de entrada do Electron, gerencia a janela principal e manipuladores IPC do sistema de arquivos.
 */

import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

import { setupFileWatcher } from "./file-watcher.js";
import { setupIpcHandlers } from "./ipc-handlers.js";

// Trata criação e remoção de atalhos no Windows durante instalação/desinstalação
if (started) {
  app.quit();
}

let mainWindow;

/**
 * Cria e configura a janela principal da aplicação, inicializando IPCs, monitoramento de arquivos e carregando a interface.
 */
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Aponta para o ícone na pasta public da raiz
    icon: path.join(process.cwd(), "public", "icon.ico"),
    title: "DraftWeaver",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0e0f17" /* Cor de fundo da barra para combinar com a Sidebar */,
      symbolColor: "#ffffff" /* Cor dos ícones (X, -, square) */,
      height: 30,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Maximiza e exibe a janela
  mainWindow.maximize();
  mainWindow.show();

  // Inicializa os manipuladores IPC passando a janela
  setupIpcHandlers(mainWindow);

  // Inicia o chokidar File Watcher
  setupFileWatcher(mainWindow);

  // Carrega a URL do servidor Vite em dev, ou o index.html compilado em produção
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Atalhos em modo de desenvolvimento (F12 e F5)
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (!app.isPackaged && input.type === "keyDown") {
      if (input.key === "F12") {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
      if (input.key === "F5") {
        mainWindow.webContents.reload();
        event.preventDefault();
      }
    }
  });

  // Menu de contexto com Inspecionar Elemento em modo dev
  mainWindow.webContents.on("context-menu", (e, props) => {
    if (!app.isPackaged) {
      Menu.buildFromTemplate([
        {
          label: "Inspecionar Elemento",
          click: () => mainWindow.webContents.inspectElement(props.x, props.y),
        },
      ]).popup(mainWindow);
    }
  });

  // Configuração do menu superior nativo
  const templateMenu = [
    { role: "fileMenu", label: "Arquivo" },
    { role: "editMenu", label: "Editar" },
    { role: "viewMenu", label: "Exibir" },
    { role: "windowMenu", label: "Janela" },
  ];

  const menu = Menu.buildFromTemplate(templateMenu);
  Menu.setApplicationMenu(menu);
};

// Inicialização da aplicação
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
