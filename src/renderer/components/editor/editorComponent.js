/**
 * @file Componente responsável pela renderização estrutural do editor markdown e manipulação de eventos via uiBus.
 */

import Editor from "@toast-ui/editor";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

import "./styles.css";
import templateHtml from "./template.html?raw";
import { Component } from "../Component.js";
import { parseMarkdown, stringifyFrontmatter } from "../../utils/markdown.js";
import { normalizeItemMetadata, getRelativePath } from "../../utils/helpers.js";

/**
 * Representa o Editor Markdown da aplicação baseado em eventos.
 * @class
 */
export class EditorComponent extends Component {
  /**
   * Cria uma instância da classe EditorComponent.
   * @constructor
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus).
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos.
   * @param {Component} [parent=null] - Componente pai, se houver.
   */
  constructor(selector, context, params, parent = null) {
    super(selector, context, templateHtml, params, parent);
    /** @type {any} */
    this.autoSaveTimer = null;
  }

  /**
   * Executado logo após a renderização inicial do componente.
   * @returns {void}
   */
  onInit() {
    this.initMarkdownEditor();
  }

  /**
   * Configura os ouvintes de eventos da interface exclusivamente via uiBus.
   * @returns {void}
   */
  setupListeners() {
    // Escuta a intenção de abrir o arquivo (cliques em links internos)
    if (this.uiBus) {
      this.uiBus.on("editor:open-file", (payload) => {
        this.openFile(payload.path);
      });

      // Reseta e bloqueia o editor sempre que um novo livro/projeto for selecionado
      this.uiBus.on("book:changed", () => {
        this.resetEditorState();
      });
    }
  }

  /**
   * Inicializa a biblioteca ToastUI Editor no elemento DOM recém-criado.
   * @private
   * @returns {void}
   */
  initMarkdownEditor() {
    const currentTheme = "default";
    const editorElement = this.element.querySelector("#markdown-editor");

    if (!editorElement) {
      console.error(
        "[EditorComponent] Elemento #markdown-editor não encontrado no template.",
      );
      return;
    }

    if (this.state) {
      this.state.editor = new Editor({
        el: editorElement,
        height: "100%",
        initialEditType: "wysiwyg",
        hideModeSwitch: true,
        placeholder: "Selecione um arquivo...",
        theme: currentTheme,
      });

      this.state.editor.on("change", () => this.handleEditorChange());
    }

    this.setupInternalLinkHandler();
  }

  /**
   * Gerencia a abertura de arquivos no editor, requisitando o conteúdo via uiBus e renderizando-o.
   * @param {string} path - O caminho do arquivo a ser aberto
   * @private
   * @returns {void}
   */
  openFile(path) {
    if (path) {
      this.uiBus.req("file:get", { path: path }).then((response) => {
        this.renderFileContent(path, response.content);
      });
    }
  }

  /**
   * Escuta cliques dentro do container do editor para capturar navegações por links internos.
   * @private
   * @returns {void}
   */
  setupInternalLinkHandler() {
    const container = this.element.querySelector("#markdown-editor");
    if (!container) return;

    container.addEventListener("click", async (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      let href = link.getAttribute("href");

      if (href) {
        try {
          href = decodeURIComponent(href);
        } catch (err) {
          console.error("Erro ao decodificar URL do link:", err);
        }

        const cleanHref = href.split("?")[0].split("#")[0];
        const isExternal =
          cleanHref.startsWith("http://") ||
          cleanHref.startsWith("https://") ||
          cleanHref.startsWith("mailto:");
        const isMarkdownFile = cleanHref.toLowerCase().endsWith(".md");

        if (!isExternal && isMarkdownFile) {
          e.preventDefault();
          e.stopPropagation();

          console.log(
            "[LINK INTERNO] Emitindo editor:open-file para:",
            cleanHref,
          );

          if (this.uiBus && this.state && this.state.currentFilePath) {
            const currentPath = this.state.currentFilePath;
            const parts = currentPath.split(/[/\\]/);
            const bookIndexInParts = parts.findIndex((p) => p === "books");

            if (
              bookIndexInParts !== -1 &&
              parts.length >= bookIndexInParts + 2
            ) {
              const bookName = parts[bookIndexInParts + 1];
              const basePathParts = parts.slice(0, bookIndexInParts + 2);
              const relativeCleanPath = cleanHref.replace(/^[/\\]+/, "");
              const relativePath = `${bookName}/${relativeCleanPath}`;
              const separator = currentPath.includes("\\") ? "\\" : "/";
              const fullPath = `${basePathParts.join(separator)}${separator}${relativeCleanPath.replace(/[/\\]/g, separator)}`;

              // Dispara direto o evento padrão da pipeline, sem redundâncias
              this.uiBus.emit("editor:open-file", {
                path: fullPath,
                relativePath,
              });
            }
          }
        }
      }
    });
  }

  /**
   * Monitora digitação e aguarda 1s sem digitação para disparar autosave.
   * @private
   * @returns {void}
   */
  handleEditorChange() {
    if (!this.state || !this.state.currentFilePath) return;

    this.setSaveStatus("unsaved");

    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);

    this.autoSaveTimer = setTimeout(async () => {
      await this.triggerAutoSave();
    }, 1000);
  }

  /**
   * Executa o salvamento automático emitindo evento de persistência via uiBus.
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async triggerAutoSave() {
    if (!this.state || !this.state.currentFilePath || !this.state.editor)
      return;

    this.setSaveStatus("saving");
    const contentToSave = stringifyFrontmatter(
      this.state.currentFileMetadata,
      this.state.editor.getMarkdown(),
    );

    // Emite evento fictício/arquitetural para o service de arquivo salvar via barramento
    if (this.uiBus) {
      this.uiBus.emit("file:save-temp", {
        path: this.state.currentFilePath,
        content: contentToSave,
      });
    }

    // Simulação visual de sucesso baseada em eventos
    this.setSaveStatus("saved");

    if (this.uiBus) {
      this.uiBus.emit("editor:saved-success", this.state.currentFilePath);
    }
  }

  /**
   * Atualiza o ícone visual de status de salvamento na UI.
   * @param {string} status - O estado atual do salvamento.
   * @returns {void}
   */
  setSaveStatus(status) {
    const statusEl = document.getElementById("save-status-indicator");
    if (!statusEl) return;

    statusEl.className = `save-status ${status}`;
    const iconEl = statusEl.querySelector("i");
    const textEl = statusEl.querySelector(".status-text");

    if (status === "unsaved") {
      if (iconEl) iconEl.className = "fas fa-spinner fa-spin";
      if (textEl) textEl.textContent = "Alterações pendentes...";
    } else if (status === "saving") {
      if (iconEl) iconEl.className = "fas fa-spinner fa-spin";
      if (textEl) textEl.textContent = "Salvando rascunho...";
    } else if (status === "saved") {
      if (iconEl) iconEl.className = "fas fa-check-circle";
      if (textEl) textEl.textContent = "Rascunho salvo";
    } else if (status === "hidden") {
      if (textEl) textEl.textContent = "";
    }
  }

  /**
   * Define o estado de leitura/escrita do editor de texto.
   * @param {boolean} isReadOnly - Define se o editor deve bloquear interações.
   * @returns {void}
   */
  setEditorReadOnly(isReadOnly) {
    const editorContainer = document.querySelector(".toastui-editor-defaultUI");
    if (!editorContainer) return;

    const isCurrentlyReadOnly =
      editorContainer.classList.contains("readonly-mode");
    if (isCurrentlyReadOnly === isReadOnly) return;

    if (isReadOnly) {
      editorContainer.classList.add("readonly-mode");
      if (this.state && !this.state.readOnlyKeyHandler) {
        this.state.readOnlyKeyHandler = (e) => {
          const isCopyOrSelectAll =
            (e.ctrlKey || e.metaKey) &&
            ["c", "a", "x"].includes(e.key.toLowerCase());
          const isNavigationKey = [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
            "PageUp",
            "PageDown",
          ].includes(e.key);

          if (isCopyOrSelectAll || isNavigationKey) return;
          e.preventDefault();
          e.stopPropagation();
        };
      }
      if (this.state && this.state.readOnlyKeyHandler) {
        editorContainer.addEventListener(
          "keydown",
          this.state.readOnlyKeyHandler,
          true,
        );
      }
      this.uiBus.emit("editor:locked");
    } else {
      editorContainer.classList.remove("readonly-mode");
      if (this.state && this.state.readOnlyKeyHandler) {
        editorContainer.removeEventListener(
          "keydown",
          this.state.readOnlyKeyHandler,
          true,
        );
      }
      this.uiBus.emit("editor:unlocked");
    }
  }

  /**
   * Renderiza o conteúdo do arquivo no editor e atualiza a interface.
   * @param {string} fullPath - Caminho absoluto do arquivo.
   * @param {string} relativePath - Caminho relativo para exibição.
   * @param {string} rawText - Conteúdo integral do arquivo obtido do disco.
   * @returns {void}
   */
  renderFileContent(fullPath, rawText) {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);

    const relativePath = getRelativePath(fullPath);

    if (!rawText) return;

    const { metadata: rawMeta, body } = parseMarkdown(rawText);
    const fileName = relativePath.split(/[/\\]/).pop();
    const metadata = normalizeItemMetadata(rawMeta, fileName);

    if (this.state && this.state.editor) {
      this.state.editor.off("change");
      this.state.editor.setMarkdown(body);
      this.state.editor.moveCursorToStart();
      this.state.editor.on("change", () => this.handleEditorChange());
    }

    const pageTitle = document.getElementById("page-title");
    if (pageTitle) pageTitle.innerText = relativePath;

    const isReadOnly =
      !metadata.humanWrite || (this.state && this.state.aiLockState);
    this.setEditorReadOnly(isReadOnly);
    this.setSaveStatus("hidden");

    if (this.uiBus) {
      this.uiBus.emit("editor-overlay:close", "no-file");
    }

    this.uiBus.emit("file:opened", {
      fullPath,
      relativePath,
      fileName,
      metadata,
      body,
    });
  }

  /**
   * Reseta a interface do editor para o estado inicial sem arquivo aberto.
   * @returns {void}
   */
  resetEditorState() {
    this.state.editor.setMarkdown("");
    const pageTitle = document.getElementById("page-title");
    if (pageTitle) pageTitle.innerText = "Selecione um arquivo";

    this.setEditorReadOnly(true);

    if (this.uiBus) {
      this.uiBus.emit("editor-overlay:open", {
        key: "no-file",
        message: "Nenhum arquivo selecionado",
        showSpinner: false,
      });
      this.uiBus.emit("editor:reseted");
    }

    this.setSaveStatus("hidden");
  }
}
