import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { setupFileWatcher } from "../../../src/main/file-watcher.js";

describe("file-watcher.js - Testes de Integração com Disco Real", () => {
  let tempBooksDir;
  let mockMainWindow;
  let originalCwd;

  beforeEach(() => {
    // Cria uma pasta temporária isolada no sistema operacional
    tempBooksDir = fs.mkdtempSync(path.join(os.tmpdir(), "draftweaver-test-"));

    const booksFolderPath = path.join(tempBooksDir, "books");
    fs.mkdirSync(booksFolderPath, { recursive: true });

    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue(tempBooksDir);

    mockMainWindow = {
      webContents: {
        send: vi.fn(),
      },
    };
  });

  afterEach(() => {
    process.cwd = originalCwd;
    try {
      fs.rmSync(tempBooksDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Erro ao limpar pasta temporária:", e);
    }
  });

  it("deve disparar 'fs:config-changed' ao modificar um config.json real", async () => {
    // 1. Cria a estrutura ANTES de iniciar o watcher para evitar corrida de inicialização
    const bookDir = path.join(tempBooksDir, "books", "book_01");
    fs.mkdirSync(bookDir, { recursive: true });
    const configFile = path.join(bookDir, "config.json");
    fs.writeFileSync(configFile, JSON.stringify({ name: "Inicial" }));

    // 2. Inicia o watcher
    setupFileWatcher(mockMainWindow);

    // Aguarda o Chokidar escanear e estabilizar
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 3. Modifica o arquivo (o evento 'change' é garantido após ignoreInitial)
    fs.writeFileSync(configFile, JSON.stringify({ name: "Modificado" }));

    // Aguarda a propagação do evento do SO
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
      "fs:config-changed",
      expect.objectContaining({
        event: "change",
        relativePath: path.normalize("book_01/config.json"),
      }),
    );
  });

  it("deve disparar 'fs:markdown-changed' ao criar um arquivo .md real", async () => {
    setupFileWatcher(mockMainWindow);

    // Aguarda o watcher estar pronto e escutando ativamente
    await new Promise((resolve) => setTimeout(resolve, 200));

    const bookDir = path.join(tempBooksDir, "books", "book_01");
    fs.mkdirSync(bookDir, { recursive: true });

    const mdFile = path.join(bookDir, "cap01.md");
    fs.writeFileSync(mdFile, "# Capítulo 1");

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
      "fs:markdown-changed",
      expect.objectContaining({
        event: "add",
        relativePath: path.normalize("book_01/cap01.md"),
      }),
    );
  });

  it("deve disparar 'fs:book-folder-changed' ao criar uma nova pasta de livro no primeiro nível", async () => {
    setupFileWatcher(mockMainWindow);

    // Aguarda o watcher estabilizar
    await new Promise((resolve) => setTimeout(resolve, 200));

    const newBookDir = path.join(tempBooksDir, "books", "book_02");
    fs.mkdirSync(newBookDir);

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
      "fs:book-folder-changed",
      expect.objectContaining({
        event: "addDir",
        relativePath: "book_02",
      }),
    );
  });
});
