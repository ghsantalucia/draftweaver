import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileService } from "../../../../src/renderer/services/fileService.js";
import { uiBus } from "../../../../src/renderer/events/uiBus.js";

// Mock do uiBus para capturar eventos de sincronização
vi.mock("../../../../src/renderer/events/uiBus.js", () => ({
  uiBus: {
    emit: vi.fn(),
  },
}));

describe("FileService - Serviço de CRUD e Gerenciamento de Arquivos", () => {
  let fileService;
  let mockState;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global do window.electronAPI utilizado pelo FileService
    global.window = {
      electronAPI: {
        saveFile: vi.fn(),
        readFile: vi.fn(),
        deleteFile: vi.fn(),
        getTree: vi.fn(),
      },
    };

    mockState = {
      currentBookPath: "/books/book_01",
      currentFilePath: "/books/book_01/cap01.md",
      currentFileMetadata: { title: "Capítulo 1" },
      editor: {
        getMarkdown: vi.fn().mockReturnValue("Conteúdo atual do editor."),
      },
    };

    fileService = new FileService(mockState);
  });

  describe("getTempPath()", () => {
    it("deve adicionar .temp ao caminho do arquivo caso não possua", () => {
      const p = "/books/book_01/cap01.md";
      expect(fileService.getTempPath(p)).toBe("/books/book_01/cap01.md.temp");
    });

    it("deve retornar o mesmo caminho se já terminar com .temp", () => {
      const p = "/books/book_01/cap01.md.temp";
      expect(fileService.getTempPath(p)).toBe("/books/book_01/cap01.md.temp");
    });

    it("deve retornar null se o caminho for inválido ou nulo", () => {
      expect(fileService.getTempPath(null)).toBeNull();
      expect(fileService.getTempPath("")).toBeNull();
    });
  });

  describe("saveFile()", () => {
    it("deve salvar o arquivo oficial e apagar o correspondente .temp em caso de sucesso", async () => {
      window.electronAPI.saveFile.mockResolvedValue({ success: true });
      window.electronAPI.deleteFile.mockResolvedValue({ success: true });

      const fullPath = "/books/book_01/cap01.md";
      const result = await fileService.saveFile(fullPath, "Novo conteúdo");

      expect(result.success).toBe(true);
      expect(window.electronAPI.saveFile).toHaveBeenCalledWith(
        fullPath,
        "Novo conteúdo",
      );
      expect(window.electronAPI.deleteFile).toHaveBeenCalledWith(
        `${fullPath}.temp`,
      );
    });

    it("deve retornar erro se o caminho do arquivo for inválido", async () => {
      const result = await fileService.saveFile(null, "Conteúdo");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Caminho de arquivo inválido.");
    });

    it("deve capturar exceções e retornar erro caso o saveFile falhe", async () => {
      window.electronAPI.saveFile.mockRejectedValue(new Error("Erro de disco"));

      const result = await fileService.saveFile(
        "/books/book_01/cap01.md",
        "Conteúdo",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Erro de disco");
    });
  });

  describe("readFile()", () => {
    it("deve priorizar a leitura do arquivo .temp quando existir", async () => {
      window.electronAPI.readFile.mockResolvedValueOnce(
        "Conteúdo do rascunho .temp",
      );

      const result = await fileService.readFile("/books/book_01/cap01.md");

      expect(result.isTemp).toBe(true);
      expect(result.content).toBe("Conteúdo do rascunho .temp");
      expect(window.electronAPI.readFile).toHaveBeenCalledWith(
        "/books/book_01/cap01.md.temp",
      );
    });

    it("deve fazer fallback para o arquivo original se o .temp retornar null", async () => {
      window.electronAPI.readFile
        .mockResolvedValueOnce(null) // Simula .temp não encontrado
        .mockResolvedValueOnce("Conteúdo oficial original"); // Retorna o original

      const result = await fileService.readFile("/books/book_01/cap01.md");

      expect(result.isTemp).toBe(false);
      expect(result.content).toBe("Conteúdo oficial original");
    });

    it("deve ler diretamente o arquivo se o caminho enviado já terminar em .temp", async () => {
      window.electronAPI.readFile.mockResolvedValue("Rascunho direto");

      const result = await fileService.readFile("/books/book_01/cap01.md.temp");

      expect(result.isTemp).toBe(true);
      expect(result.content).toBe("Rascunho direto");
      expect(window.electronAPI.readFile).toHaveBeenCalledWith(
        "/books/book_01/cap01.md.temp",
      );
    });
  });

  describe("deleteFile()", () => {
    it("deve chamar o electronAPI.deleteFile corretamente", async () => {
      window.electronAPI.deleteFile.mockResolvedValue({ success: true });

      const res = await fileService.deleteFile("/books/book_01/temp.md");
      expect(res.success).toBe(true);
      expect(window.electronAPI.deleteFile).toHaveBeenCalledWith(
        "/books/book_01/temp.md",
      );
    });
  });

  describe("saveTempFile()", () => {
    it("deve salvar no caminho .temp do arquivo", async () => {
      window.electronAPI.saveFile.mockResolvedValue({ success: true });

      const res = await fileService.saveTempFile(
        "/books/book_01/cap01.md",
        "rascunho",
      );
      expect(res.success).toBe(true);
      expect(window.electronAPI.saveFile).toHaveBeenCalledWith(
        "/books/book_01/cap01.md.temp",
        "rascunho",
      );
    });

    it("deve retornar erro se o caminho for inválido", async () => {
      const res = await fileService.saveTempFile(null, "rascunho");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Caminho inválido.");
    });
  });

  describe("getPendingTempFiles()", () => {
    it("deve retornar array vazio se não houver livro atual no state", async () => {
      fileService.state.currentBookPath = null;
      const res = await fileService.getPendingTempFiles();
      expect(res).toEqual([]);
    });

    it("deve varrer a árvore e retornar os arquivos temporários pendentes", async () => {
      const mockTree = {
        files: {
          cap01: {
            isTemp: true,
            path: "/books/book_01/cap01.md.temp",
            originalPath: "/books/book_01/cap01.md",
            content: "Conteúdo temp",
            metadata: { title: "Título Customizado" },
          },
        },
        folders: {},
      };

      window.electronAPI.getTree.mockResolvedValue(mockTree);

      const pending = await fileService.getPendingTempFiles();

      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        path: "/books/book_01/cap01.md",
        name: "Título Customizado",
        content: "Conteúdo temp",
      });
    });
  });

  describe("syncFile()", () => {
    it("deve sincronizar o arquivo atualmente aberto no editor usando o conteúdo atual e metadados", async () => {
      window.electronAPI.saveFile.mockResolvedValue({ success: true });
      window.electronAPI.deleteFile.mockResolvedValue({ success: true });

      const targetPath = "/books/book_01/cap01.md";
      const res = await fileService.syncFile(targetPath);

      expect(res.success).toBe(true);
      expect(mockState.editor.getMarkdown).toHaveBeenCalled();
      expect(uiBus.emit).toHaveBeenCalledWith("temp-file:synced", {
        filePath: targetPath,
      });
    });

    it("deve retornar erro se o caminho for inválido", async () => {
      const res = await fileService.syncFile(null);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Caminho inválido");
    });
  });
});
