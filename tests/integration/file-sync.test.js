// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uiBus } from "../../src/renderer/events/uiBus.js";
import { FileService } from "../../src/renderer/services/fileService.js";
import {
  syncFile,
  syncMultipleFiles,
} from "../../src/renderer/controllers/handlers/fileHandler.js";

describe("Integração: Sincronização de Arquivos .temp (Handler & FileService)", () => {
  let fileService;
  let mockState;

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      currentBookPath: "/books/book_01",
      currentFilePath: "/books/book_01/cap01.md",
      currentFileMetadata: { title: "Capítulo 1", humanWrite: true },
      editor: {
        getMarkdown: vi.fn().mockReturnValue("Conteúdo atualizado no editor"),
      },
    };

    fileService = new FileService(mockState, uiBus);
  });

  it("deve sincronizar um arquivo ativo no editor, salvando o conteúdo atual e emitindo 'temp-file:synced'", async () => {
    fileService.saveFile = vi.fn().mockResolvedValue({ success: true });

    // Espiona a instância global uiBus importada pelo handler/service
    const emitSpy = vi.spyOn(uiBus, "emit");

    const result = await syncFile(
      "/books/book_01/cap01.md",
      fileService,
      mockState,
    );

    expect(result.success).toBe(true);
    expect(fileService.saveFile).toHaveBeenCalledWith(
      "/books/book_01/cap01.md",
      expect.stringContaining("Conteúdo atualizado no editor"),
    );

    // Agora o spy vai capturar a chamada global com o caminho normalizado
    expect(emitSpy).toHaveBeenCalledWith(
      "temp-file:synced",
      "/books/book_01/cap01.md",
    );
  });

  it("deve ler o .temp do disco e sincronizar corretamente um arquivo em segundo plano", async () => {
    fileService.readFile = vi
      .fn()
      .mockResolvedValue({
        content: "--- title: Cap 2 ---\nConteúdo em segundo plano",
      });
    fileService.saveFile = vi.fn().mockResolvedValue({ success: true });

    const emitSpy = vi.spyOn(uiBus, "emit");

    const result = await syncFile(
      "/books/book_01/cap02.md",
      fileService,
      mockState,
    );

    expect(result.success).toBe(true);
    expect(fileService.readFile).toHaveBeenCalledWith(
      "/books/book_01/cap02.md.temp",
    );
    expect(fileService.saveFile).toHaveBeenCalledWith(
      "/books/book_01/cap02.md",
      "--- title: Cap 2 ---\nConteúdo em segundo plano",
    );
    expect(emitSpy).toHaveBeenCalledWith(
      "temp-file:synced",
      "/books/book_01/cap02.md",
    );
  });

  it("deve lidar com múltiplos arquivos em lote e emitir toast de sucesso", async () => {
    fileService.readFile = vi
      .fn()
      .mockResolvedValue({ content: "Conteúdo temp" });
    fileService.saveFile = vi.fn().mockResolvedValue({ success: true });

    const emitSpy = vi.spyOn(uiBus, "emit");

    const pathsToSync = ["/books/book_01/cap02.md", "/books/book_01/cap03.md"];

    await syncMultipleFiles(pathsToSync, fileService, mockState);

    expect(emitSpy).toHaveBeenCalledWith("toast:show", {
      message: "✓ 2 arquivo(s) sincronizado(s) com sucesso!",
      type: "success",
    });
  });
});
