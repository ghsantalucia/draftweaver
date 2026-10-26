// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { uiBus } from "../../src/renderer/events/uiBus.js";
import { AiService } from "../../src/renderer/services/aiService.js";
import * as chatHandler from "../../src/renderer/controllers/handlers/chatHandler.js";
import * as aiGateway from "../../src/renderer/ai/aiGateway.js";

describe("Integração: Envio, Persistência e Recebimento de Mensagens para provedor de IA", () => {
  let aiService;
  let mockState;

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      currentBookPath: "/books/book_01",
      aiProvider: "mock",
    };

    aiService = new AiService(mockState);
  });

  it("deve persistir e enviar uma mensagem do usuário ao provedor de IA, persistir e emitir a resposta", async () => {
    // 1. Mocks
    const promptText = "Return strictly: Test passed.";
    const expectedResponse = "Test passed.";

    aiService.saveMessage = vi.fn().mockResolvedValue(true);
    aiService.loadChatHistoryPaged = vi.fn().mockResolvedValue({
      messages: [],
      hasMore: false,
    });

    // 2. Spy - Espiona a instância global uiBus importada pelo handler/service
    const emitSpy = vi.spyOn(uiBus, "emit");
    const gatewaySpy = vi.spyOn(aiGateway, "processPrompt");

    // 3. Execute
    const result = await chatHandler.onSendMessage({ promptText }, aiService);

    // 4. Result
    expect(result).toBe(true);

    // 5. Calls
    expect(aiService.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        content: promptText,
        // O Vitest valida que o timestamp existe, sem se importar com o valor exato
        timestamp: expect.any(String),
      }),
    );

    expect(emitSpy).toHaveBeenNthCalledWith(
      1,
      "chat:render-message",
      expect.objectContaining({
        role: "user",
        content: promptText,
        timestamp: expect.any(String),
      }),
    );

    expect(emitSpy).toHaveBeenNthCalledWith(2, "chat:set-loading", true);

    expect(aiService.loadChatHistoryPaged).toHaveBeenCalledWith({
      sessionOffset: 0,
    });

    expect(gatewaySpy).toHaveBeenCalledWith(
      { prompt: promptText, history: [] },
      mockState,
    );

    expect(emitSpy).toHaveBeenNthCalledWith(
      3,
      "chat:render-message",
      expect.objectContaining({
        role: "assistant",
        content: expectedResponse,
        timestamp: expect.any(String),
      }),
    );

    expect(emitSpy).toHaveBeenNthCalledWith(4, "chat:set-loading", false);
  });

  it("não deve processar nada, deve retornar false e garantir que a UI foi liberada no finally se o prompt estiver vazio", async () => {
    // 1. Mocks
    aiService.saveMessage = vi.fn();
    aiService.loadChatHistoryPaged = vi.fn();
    const emitSpy = vi.spyOn(uiBus, "emit");

    // 2. Execute - Passando uma string vazia ou espaços em branco
    const result = await chatHandler.onSendMessage(
      { promptText: "   " },
      aiService,
    );

    // 3. Result - Como bate no return antecipado, o retorno explícito do finally é false
    expect(result).toBe(false);

    // 4. Calls - Garante que NENHUMA função de salvamento ou de gateway foi chamada
    expect(aiService.saveMessage).not.toHaveBeenCalled();
    expect(aiService.loadChatHistoryPaged).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("deve simular um erro do lado da IA e notificar o usuário", async () => {
    // 1. Mocks
    const promptText = "Return strictly: Test passed.";
    const expectedResponse = "Test passed.";

    aiService.sendMessage = vi
      .fn()
      .mockRejectedValue(new Error("Falha na API da IA"));

    aiService.saveMessage = vi.fn().mockResolvedValue(true);

    aiService.loadChatHistoryPaged = vi.fn().mockResolvedValue({
      messages: [],
      hasMore: false,
    });

    // 2. Spy - Espiona a instância global uiBus importada pelo handler/service
    const emitSpy = vi.spyOn(uiBus, "emit");

    // 3. Execute
    const result = await chatHandler.onSendMessage({ promptText }, aiService);

    // 4. Result
    expect(result).toBe(true);

    // 5. Calls
    expect(aiService.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "user",
        content: promptText,
        // O Vitest valida que o timestamp existe, sem se importar com o valor exato
        timestamp: expect.any(String),
      }),
    );

    expect(emitSpy).toHaveBeenNthCalledWith(
      1,
      "chat:render-message",
      expect.objectContaining({
        role: "user",
        content: promptText,
        timestamp: expect.any(String),
      }),
    );

    expect(emitSpy).toHaveBeenNthCalledWith(2, "chat:set-loading", true);

    expect(aiService.loadChatHistoryPaged).toHaveBeenCalledWith({
      sessionOffset: 0,
    });

    expect(emitSpy).toHaveBeenNthCalledWith(3, "chat:render-message", {
      role: "system",
      content:
        "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.",
    });

    expect(emitSpy).toHaveBeenNthCalledWith(4, "chat:set-loading", false);
  });
});
