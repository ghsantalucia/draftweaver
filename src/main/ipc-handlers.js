/**
 * @file Gerencia todos os canais de comunicação IPC (Inter-Process Communication) entre o processo de renderização e o processo principal do Electron (sistema de arquivos, diálogos e temas).
 */

import fs from "node:fs";
import path from "node:path";
import { ipcMain, dialog } from "electron";

/**
 * Configura todos os ouvintes de eventos IPC do processo principal.
 * @param {import('electron').BrowserWindow} mainWindow - Instância da janela principal da aplicação.
 */
export function setupIpcHandlers(mainWindow) {
  ipcMain.on("update-titlebar-theme", (event, isDark) => {
    if (!mainWindow) return;

    if (isDark) {
      mainWindow.setTitleBarOverlay({
        color: "#181926",
        symbolColor: "#cdd6f4",
      });
    } else {
      mainWindow.setTitleBarOverlay({
        color: "#1e1e2f",
        symbolColor: "#ffffff",
      });
    }
  });

  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("read-file", async (event, filePath) => {
    try {
      if (!filePath) return null;
      const normalizedPath = path.normalize(filePath);

      if (!fs.existsSync(normalizedPath)) return null;

      return await fs.promises.readFile(normalizedPath, "utf-8");
    } catch (err) {
      console.error("[MAIN IPC read-file] Erro:", err);
      return null;
    }
  });

  ipcMain.handle("delete-file", async (event, filePath) => {
    // console.log('[MAIN IPC delete-file] Tentando deletar:', filePath);
    try {
      if (!filePath) {
        return { success: false, error: "Caminho não fornecido." };
      }

      // Normaliza o caminho para o sistema operacional (resolve \ e / no Windows)
      const normalizedPath = path.normalize(filePath);

      if (!fs.existsSync(normalizedPath)) {
        console.warn(
          "[MAIN IPC delete-file] Arquivo NÃO existe:",
          normalizedPath,
        );
        return {
          success: false,
          error: `Arquivo temporário não encontrado: ${normalizedPath}`,
        };
      }

      await fs.promises.unlink(normalizedPath);
      // console.log('[MAIN IPC delete-file] Arquivo deletado com sucesso:', normalizedPath);
      return { success: true };
    } catch (err) {
      console.error("[MAIN IPC delete-file] Erro ao deletar:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("save-file", async (event, filePath, content) => {
    try {
      // Garante que o diretório pai exista antes de salvar
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(filePath, content, "utf-8");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Mapear pasta e subpastas (Assíncrono e Seguro)
  ipcMain.handle("get-tree", async (event, folderPath) => {
    if (!folderPath) return null;

    // Normaliza o caminho de acordo com o Sistema Operacional
    const targetPath = path.normalize(folderPath);

    if (!fs.existsSync(targetPath)) {
      return null;
    }

    async function buildTree(dir) {
      try {
        const stats = await fs.promises.stat(dir);
        const isDirectory = stats.isDirectory();

        const item = {
          name: path.basename(dir),
          path: dir,
          type: isDirectory ? "directory" : "file",
          isDirectory: isDirectory,
        };

        if (isDirectory) {
          const children = await fs.promises.readdir(dir);
          const childrenNodes = await Promise.all(
            children.map((child) => buildTree(path.join(dir, child))),
          );
          item.children = childrenNodes.filter(Boolean);
        }
        return item;
      } catch (err) {
        console.error(`[IPC get-tree] Erro ao ler ${dir}:`, err);
        return null;
      }
    }

    return await buildTree(targetPath);
  });

  // Listar livros dentro da pasta /books
  ipcMain.handle("get-books-list", async () => {
    const booksDir = path.join(process.cwd(), "books");
    try {
      if (!fs.existsSync(booksDir)) return [];

      const entries = await fs.promises.readdir(booksDir, {
        withFileTypes: true,
      });
      const books = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const bookPath = path.join(booksDir, entry.name);
          const configPath = path.join(bookPath, "config.json");
          let title = entry.name;

          if (fs.existsSync(configPath)) {
            try {
              const configContent = await fs.promises.readFile(
                configPath,
                "utf-8",
              );
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
      console.error("Erro ao buscar livros:", err);
      return [];
    }
  });
}
