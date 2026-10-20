import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UiEventBus } from "../../src/renderer/events/uiBus.js";
import { EditorComponent } from "../../src/renderer/components/Editor/EditorComponent.js";
import { ToolbarComponent } from "../../src/renderer/components/Toolbar/ToolbarComponent.js";

describe("Integração Lógica: Editor, Barramento (uiBus) e Toolbar", () => {
  let bus;
  let mockState;
  let editorComponent;
  let toolbarComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    bus = new UiEventBus();

    mockState = {
      currentFilePath: "/books/book_01/cap01.md",
      currentFileMetadata: { title: "Capítulo 1", humanWrite: true },
      currentBookMetadata: { ai_lock: false },
      editor: {
        getMarkdown: vi.fn().mockReturnValue("Conteúdo editado pelo usuário"),
        off: vi.fn(),
        on: vi.fn(),
        setMarkdown: vi.fn(),
        moveCursorToStart: vi.fn(),
      },
    };

    const context = { state: mockState, uiBus: bus };

    // Instancia os componentes passando mocks de seletores vazios (já que testamos a lógica e eventos)
    editorComponent = new EditorComponent("#editor", context);
    toolbarComponent = new ToolbarComponent("#toolbar", context);

    // Sobrescrevemos o element.querySelector para evitar qualquer manipulação de DOM real desnecessária
    editorComponent.element = { querySelector: vi.fn() };
    toolbarComponent.element = { querySelector: vi.fn() };

    editorComponent.setupListeners();
    toolbarComponent.setupListeners();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve emitir 'unsaved' ao alterar o editor e disparar o salvamento de rascunho após o tempo de espera (debounce)", async () => {
    const emitSpy = vi.spyOn(bus, "emit");

    // 1. Simula a digitação no editor
    editorComponent.handleEditorChange();

    // Valida se o status emitido foi o de alterações pendentes
    expect(emitSpy).toHaveBeenCalledWith("toolbar:save-status", "unsaved");

    // 2. Avança o timer do autosave (1000ms)
    await vi.advanceTimersByTimeAsync(1000);

    // Valida se o evento de salvamento de rascunho foi disparado no barramento
    expect(emitSpy).toHaveBeenCalledWith("toolbar:save-status", "saving");
    expect(emitSpy).toHaveBeenCalledWith(
      "file:save-temp",
      expect.objectContaining({
        path: "/books/book_01/cap01.md",
      }),
    );
  });

  it("deve atualizar o estado interno da toolbar ao receber a lista de arquivos temporários pendentes", () => {
    // Simula a chegada de arquivos pendentes via barramento
    bus.emit("temp-files:pending-list", [
      {
        path: "/books/book_01/cap01.md",
        tempPath: "/books/book_01/cap01.md.temp",
      },
    ]);

    // Verifica se a propriedade interna da toolbar refletiu que existem mudanças pendentes
    expect(toolbarComponent._hasPendingChanges).toBe(true);
  });
});
