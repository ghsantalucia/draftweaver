/**
 * @file Gerencia todos os canais de comunicação IPC (Inter-Process Communication) entre o processo de renderização e o processo principal do Electron (sistema de arquivos, diálogos e temas).
 */

import fs from "node:fs";
import path from "node:path";
const matter = require("gray-matter");
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
          let configData = {};

          if (fs.existsSync(configPath)) {
            try {
              const configContent = await fs.promises.readFile(
                configPath,
                "utf-8",
              );
              configData = JSON.parse(configContent);
            } catch (e) {
              console.error(`Erro ao ler config.json em ${entry.name}:`, e);
            }
          }

          books.push({
            folderName: entry.name,
            fullPath: bookPath,
            ...configData, // Espalha todas as propriedades do config.json (title, ai_lock, explorer_state, etc.)
          });
        }
      }
      return books;
    } catch (err) {
      console.error("Erro ao buscar livros:", err);
      return [];
    }
  });

  /**
   * @function get-tree (IPC Handler)
   * @description Mapeia recursivamente a estrutura de diretórios de um livro no disco,
   * retornando um "esqueleto" leve focado em metadados, caminhos e flags de controle.
   *
   * ESTRUTURA DO OBJETO RETORNADO:
   * {
   *   path: string,          // Caminho absoluto do diretório atual
   *   metadata: Object,      // Metadados extraídos do arquivo folder.yml da pasta (se existir)
   *   folders: {             // Dicionário de subpastas O(1) (chave = nome da pasta)
   *     [folderName]: { ... } // Segue a mesma estrutura recursiva (path, metadata, folders, files)
   *   },
   *   files: {               // Dicionário de arquivos O(1) (chave = nome base sem extensão/.temp)
   *     [fileKey]: {
   *       path: string,        // Caminho absoluto do arquivo ativo (aponta para o .temp se houver rascunho)
   *       originalPath: string,// Caminho absoluto do arquivo original (.md base)
   *       isTemp: boolean,     // true se estiver utilizando o rascunho (.md.temp) com prioridade
   *       metadata: Object     // Metadados extraídos do Frontmatter (usando gray-matter)
   *                            // NOTA: O 'content' foi excluído deste mapa para otimizar desempenho e cache.
   *                            // O conteúdo completo deve ser buscado sob demanda quando o arquivo for aberto.
   *     }
   *   }
   * }
   */
  ipcMain.handle("get-tree", async (event, folderPath) => {
    if (!folderPath) return null;

    const targetPath = path.normalize(folderPath);
    if (!fs.existsSync(targetPath)) {
      return null;
    }

    async function buildBookTree(dir) {
      try {
        const stats = await fs.promises.stat(dir);
        if (!stats.isDirectory()) return null;

        const result = {
          path: dir,
          metadata: {},
          folders: {},
          files: {},
        };

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        // 1. Processa o folder.yml da pasta atual
        const folderYmlPath = path.join(dir, "folder.yml");
        let folderMeta = {};
        if (fs.existsSync(folderYmlPath)) {
          try {
            const ymlContent = await fs.promises.readFile(
              folderYmlPath,
              "utf8",
            );
            folderMeta = matter.engines.yaml.parse(ymlContent) || {};
          } catch (ymlErr) {
            console.error(
              `[IPC get-tree] Erro ao ler folder.yml em ${dir}:`,
              ymlErr,
            );
          }
        }
        result.metadata = folderMeta;

        const markdownFilesMap = new Map();

        // 2. Mapeia entradas do diretório atual de forma isolada
        for (const entry of entries) {
          if (!entry.isDirectory()) {
            const fileName = entry.name;
            const lowerName = fileName.toLowerCase();

            if (lowerName === "folder.yml") continue;

            if (lowerName.endsWith(".md") || lowerName.endsWith(".md.temp")) {
              let keyName = fileName;
              if (lowerName.endsWith(".md.temp")) {
                keyName = fileName.slice(0, -5);
              }
              keyName = keyName.replace(/\.md$/, "");

              const originalPath = path.join(dir, `${keyName}.md`);
              const tempPath = `${originalPath}.temp`;

              let activePath = originalPath;
              let usingTemp = false;

              if (fs.existsSync(tempPath)) {
                activePath = tempPath;
                usingTemp = true;
              } else if (
                lowerName.endsWith(".md.temp") &&
                fs.existsSync(path.join(dir, fileName))
              ) {
                activePath = path.join(dir, fileName);
                usingTemp = true;
              }

              if (!markdownFilesMap.has(keyName)) {
                markdownFilesMap.set(keyName, {
                  keyName,
                  activePath,
                  originalPath,
                  isTemp: usingTemp,
                });
              }
            } else if (lowerName.endsWith(".json")) {
              const filePath = path.join(dir, fileName);
              const baseName = path.basename(fileName, ".json");

              result.files[baseName] = {
                path: filePath,
                originalPath: filePath,
                isTemp: false,
                metadata: {},
              };
            }
          }
        }

        // 3. Lê os metadados dos markdowns em paralelo de forma segura para este diretório
        const filePromises = Array.from(markdownFilesMap.entries()).map(
          async ([keyName, fileInfo]) => {
            try {
              const fileContent = await fs.promises.readFile(
                fileInfo.activePath,
                "utf8",
              );
              const parsedFile = matter(fileContent);

              return {
                keyName,
                data: {
                  path: fileInfo.activePath,
                  originalPath: fileInfo.originalPath,
                  isTemp: fileInfo.isTemp,
                  metadata: parsedFile.data || {},
                },
              };
            } catch (fileErr) {
              console.error(
                `[IPC get-tree] Erro ao ler ${fileInfo.activePath}:`,
                fileErr,
              );
              return null;
            }
          },
        );

        const resolvedFiles = await Promise.all(filePromises);
        for (const item of resolvedFiles) {
          if (item) {
            result.files[item.keyName] = item.data;
          }
        }

        // 4. Processa subdiretórios recursivamente de forma isolada
        const subDirPromises = entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const subDirName = entry.name;
            const subDirPath = path.join(dir, subDirName);
            const subTree = await buildBookTree(subDirPath);

            return { subDirName, subTree };
          });

        const resolvedSubDirs = await Promise.all(subDirPromises);
        for (const sub of resolvedSubDirs) {
          if (sub.subTree) {
            result.folders[sub.subDirName] = sub.subTree;
          }
        }

        return result;
      } catch (err) {
        console.error(
          `[IPC get-tree] Erro ao processar diretório ${dir}:`,
          err,
        );
        return null;
      }
    }

    return await buildBookTree(targetPath);
  });
}
