import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Mocks do Electron (ipcMain e dialog) antes de importar o handler
const ipcHandlersMap = new Map();
const ipcHandlesMap = new Map();

vi.mock("electron", () => ({
  ipcMain: {
    on: vi.fn((channel, callback) => {
      ipcHandlersMap.set(channel, callback);
    }),
    handle: vi.fn((channel, callback) => {
      ipcHandlesMap.set(channel, callback);
    }),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

import { setupIpcHandlers } from "../../../src/main/ipc-handlers.js";
import { dialog } from "electron";

describe("ipc-handlers.js - Testes de Comunicação IPC e Sistema de Arquivos", () => {
  let tempDir;
  let mockMainWindow;

  beforeEach(() => {
    vi.clearAllMocks();
    ipcHandlersMap.clear();
    ipcHandlesMap.clear();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "draftweaver-ipc-test-"));

    mockMainWindow = {
      setTitleBarOverlay: vi.fn(),
      webContents: {
        send: vi.fn(),
      },
    };

    // Configura os handlers passados para a janela mockada
    setupIpcHandlers(mockMainWindow);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Erro ao limpar pasta temporária:", e);
    }
  });

  describe("update-titlebar-theme", () => {
    it("deve atualizar o overlay da barra de título com o tema escuro", () => {
      const handler = ipcHandlersMap.get("update-titlebar-theme");
      expect(handler).toBeDefined();

      handler({}, true);

      expect(mockMainWindow.setTitleBarOverlay).toHaveBeenCalledWith(
        expect.objectContaining({ color: "#181926" }),
      );
    });

    it("deve atualizar o overlay da barra de título com o tema claro", () => {
      const handler = ipcHandlersMap.get("update-titlebar-theme");

      handler({}, false);

      expect(mockMainWindow.setTitleBarOverlay).toHaveBeenCalledWith(
        expect.objectContaining({ color: "#1e1e2f" }),
      );
    });
  });

  describe("select-folder", () => {
    it("deve retornar o caminho da pasta selecionada quando o diálogo não for cancelado", async () => {
      const handler = ipcHandlesMap.get("select-folder");
      dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ["/caminho/escolhido/books"],
      });

      const result = await handler({});
      expect(result).toBe("/caminho/escolhido/books");
    });

    it("deve retornar null se o usuário cancelar o diálogo", async () => {
      const handler = ipcHandlesMap.get("select-folder");
      dialog.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await handler({});
      expect(result).toBeNull();
    });
  });

  describe("read-file e save-file", () => {
    it("deve salvar um arquivo no disco e depois lê-lo corretamente", async () => {
      const saveHandler = ipcHandlesMap.get("save-file");
      const readHandler = ipcHandlesMap.get("read-file");

      const targetFile = path.join(tempDir, "sub", "teste.md");
      const content = "---\ntitle: Teste\n---\nConteúdo do arquivo.";

      // Salva
      const saveRes = await saveHandler({}, targetFile, content);
      expect(saveRes.success).toBe(true);

      // Lê
      const readRes = await readHandler({}, targetFile);
      expect(readRes).toBe(content);
    });

    it("deve retornar null ao tentar ler um arquivo que não existe", async () => {
      const readHandler = ipcHandlesMap.get("read-file");
      const fakePath = path.join(tempDir, "nao-existe.md");

      const result = await readHandler({}, fakePath);
      expect(result).toBeNull();
    });
  });

  describe("delete-file", () => {
    it("deve deletar um arquivo existente com sucesso", async () => {
      const deleteHandler = ipcHandlesMap.get("delete-file");
      const targetFile = path.join(tempDir, "deletar.md");
      fs.writeFileSync(targetFile, "Apagar");

      const result = await deleteHandler({}, targetFile);
      expect(result.success).toBe(true);
      expect(fs.existsSync(targetFile)).toBe(false);
    });

    it("deve retornar erro se o arquivo a ser deletado não existir", async () => {
      const deleteHandler = ipcHandlesMap.get("delete-file");
      const fakePath = path.join(tempDir, "fantasma.md");

      const result = await deleteHandler({}, fakePath);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("get-books-list", () => {
    it("deve listar os livros contidos na pasta /books com base no config.json", async () => {
      const booksParentDir = path.join(tempDir, "books");
      const bookFolder = path.join(booksParentDir, "book_01");
      fs.mkdirSync(bookFolder, { recursive: true });

      fs.writeFileSync(
        path.join(bookFolder, "config.json"),
        JSON.stringify({ title: "Meu Livro", ai_lock: false }),
      );

      // Mocka o process.cwd para apontar para o tempDir
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(tempDir);

      const getBooksHandler = ipcHandlesMap.get("get-books-list");
      const books = await getBooksHandler({});

      process.cwd = originalCwd;

      expect(books).toHaveLength(1);
      expect(books[0]).toMatchObject({
        folderName: "book_01",
        title: "Meu Livro",
        ai_lock: false,
      });
    });
  });

  describe("get-tree", () => {
    it("deve mapear recursivamente a árvore de arquivos e metadados de um livro", async () => {
      const bookDir = path.join(tempDir, "book_fantasia");
      fs.mkdirSync(bookDir, { recursive: true });

      // Cria um folder.yml
      fs.writeFileSync(
        path.join(bookDir, "folder.yml"),
        "title: 'Pasta Raiz'\nhumanRead: true",
      );

      // Cria um arquivo markdown com frontmatter
      fs.writeFileSync(
        path.join(bookDir, "cap01.md"),
        "---\ntitle: 'Capítulo Um'\n---\nTexto do capítulo.",
      );

      const getTreeHandler = ipcHandlesMap.get("get-tree");
      const tree = await getTreeHandler({}, bookDir);

      expect(tree).toBeDefined();
      expect(tree.metadata).toMatchObject({
        title: "Pasta Raiz",
        humanRead: true,
      });
      expect(tree.files["cap01"]).toBeDefined();
      expect(tree.files["cap01"].metadata).toMatchObject({
        title: "Capítulo Um",
      });
      expect(tree.files["cap01"].isTemp).toBe(false);
    });
  });
});
