/**
 * @file Controla a inicialização do ToastUI Editor, leitura e salvamento de arquivos Markdown e aplicação de regras de permissão de escrita na UI.
 */

import "./styles.css";

import Editor from "@toast-ui/editor";
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

import { state } from "../../core/state.js";
import { parseMarkdown, stringifyFrontmatter } from "../../utils/markdown.js";
import { normalizeItemMetadata } from "../../utils/helpers.js";
import { toggleEditorOverlay } from "../editor-overlay/editorOverlays.js";
import {
  readFile,
  saveTempFile,
  autoOpenFileByPath,
} from "../../services/fileService.js";
import { syncTreeSelection } from "../explorer";
import { openSyncModal, refreshSaveButtonState } from "../toolbar/toolbar.js";

let autoSaveTimer = null;

/**
 * Inicializa a instância do ToastUI Editor no DOM.
 */
export function initEditor() {
  const currentTheme =
    localStorage.getItem("theme") === "dark" ? "dark" : "default";

  state.editor = new Editor({
    el: document.querySelector("#markdown-editor"),
    height: "100%",
    initialEditType: "wysiwyg",
    hideModeSwitch: true,
    placeholder: "Selecione um arquivo...",
    theme: currentTheme,
  });

  // Escuta edições no documento para disparar o autosave
  state.editor.on("change", handleEditorChange);

  const btnSave = document.getElementById("btn-save");
  if (btnSave) {
    btnSave.addEventListener("click", openSyncModal);
  }

  setupInternalLinkHandler();
}

/**
 * Escuta cliques dentro do container do editor para capturar navegações por links internos de arquivos Markdown.
 */
function setupInternalLinkHandler() {
  const container = document.querySelector("#markdown-editor");
  if (!container) return;

  container.addEventListener("click", (e) => {
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

        console.log("[LINK INTERNO] Clique detectado para:", cleanHref);
        autoOpenFileByPath(cleanHref);
      }
    }
  });
}

/**
 * Monitora digitação, altera indicador visual e aguarda 1s sem digitação para salvar no .temp
 */
function handleEditorChange() {
  if (!state.currentFilePath) return;

  setSaveStatus("unsaved");

  if (autoSaveTimer) clearTimeout(autoSaveTimer);

  autoSaveTimer = setTimeout(async () => {
    await triggerAutoSave();
  }, 1000);
}

/**
 * Executa o salvamento automático do arquivo atual, criando um rascunho temporário e atualizando a interface.
 */
async function triggerAutoSave() {
  if (!state.currentFilePath || !state.editor) return;

  setSaveStatus("saving");
  const contentToSave = stringifyFrontmatter(
    state.currentFileMetadata,
    state.editor.getMarkdown(),
  );

  const res = await saveTempFile(state.currentFilePath, contentToSave);

  if (res.success) {
    setSaveStatus("saved");

    // Marca o item na árvore visualmente com asterisco se ainda não tiver
    const activeSpan = document.querySelector(".file-name.active");
    if (activeSpan) {
      const parentLi = activeSpan.closest("li");
      if (parentLi && !parentLi.classList.contains("has-temp")) {
        parentLi.classList.add("has-temp");

        let titleWrapper = activeSpan.querySelector(".file-title-wrapper");
        if (titleWrapper && !titleWrapper.querySelector(".dirty-asterisk")) {
          titleWrapper.insertAdjacentHTML(
            "beforeend",
            '<span class="dirty-asterisk">*</span>',
          );
        }
      }
    }
    refreshSaveButtonState();
  } else {
    setSaveStatus("error");
  }
}

/**
 * Atualiza o ícone visual de status de salvamento na UI.
 * @param {string} status - O estado atual do salvamento ('unsaved', 'saving', 'saved', 'error').
 */
function setSaveStatus(status) {
  const statusEl = document.getElementById("save-status-indicator");
  if (!statusEl) return;

  statusEl.className = `save-status ${status}`;

  const iconEl = statusEl.querySelector("i");
  const textEl = statusEl.querySelector(".status-text");

  if (status === "unsaved") {
    if (iconEl) iconEl.className = "fas fa-spinner fa-spin";
    // if (iconEl) iconEl.className = 'fas fa-circle';
    if (textEl) textEl.textContent = "Alterações pendentes...";
  } else if (status === "saving") {
    if (iconEl) iconEl.className = "fas fa-spinner fa-spin";
    if (textEl) textEl.textContent = "Salvando rascunho...";
  } else if (status === "saved") {
    if (iconEl) iconEl.className = "fas fa-check-circle";
    if (textEl) textEl.textContent = "Rascunho salvo";
  } else if (status === "error") {
    if (iconEl) iconEl.className = "fas fa-exclamation-circle";
    if (textEl) textEl.textContent = "Erro no autosave";
  }
}

/**
 * Define o estado de leitura/escrita do editor de texto e dos controles associados na UI.
 * @param {boolean} isReadOnly Define se o editor deve bloquear interações do usuário
 */
export function setEditorReadOnly(isReadOnly) {
  const editorContainer = document.querySelector(".toastui-editor-defaultUI");

  refreshSaveButtonState();

  if (!editorContainer) return;

  // Evita reprocessar se o estado atual já for o desejado (impede loops do setInterval)
  const isCurrentlyReadOnly =
    editorContainer.classList.contains("readonly-mode");
  if (isCurrentlyReadOnly === isReadOnly) return;

  if (isReadOnly) {
    editorContainer.classList.add("readonly-mode");

    if (!state.readOnlyKeyHandler) {
      state.readOnlyKeyHandler = (e) => {
        // Permite atalhos de cópia e seleção total (Ctrl+C, Ctrl+A, Cmd+C, Cmd+A, setas do teclado)
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

        if (isCopyOrSelectAll || isNavigationKey) {
          return;
        }

        // Bloqueia apenas as teclas que alteram o texto
        e.preventDefault();
        e.stopPropagation();
      };
    }

    editorContainer.addEventListener("keydown", state.readOnlyKeyHandler, true);

    // Se o foco estiver ESPECIFICAMENTE dentro do editor ao travar, nós removemos o foco apenas dele
    if (
      document.activeElement &&
      editorContainer.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }
  } else {
    editorContainer.classList.remove("readonly-mode");

    if (state.readOnlyKeyHandler) {
      editorContainer.removeEventListener(
        "keydown",
        state.readOnlyKeyHandler,
        true,
      );
    }
  }
}

/**
 * Lê o conteúdo do arquivo usando o FileService e renderiza no editor.
 * @param {string} fullPath Caminho absoluto no disco
 * @param {string} relativePath Caminho relativo para exibição e gravação de histórico
 */
export async function openFileEditor(fullPath, relativePath) {
  // Sincroniza a árvore e a aba
  syncTreeSelection(relativePath);

  state.currentFilePath = fullPath;

  // Cancela qualquer autosave pendente do arquivo anterior
  if (autoSaveTimer) clearTimeout(autoSaveTimer);

  const { content: rawText, isTemp } = await readFile(fullPath);

  if (rawText === null) return;

  const { metadata: rawMeta, body } = parseMarkdown(rawText);
  const fileName = relativePath.split(/[/\\]/).pop();
  const metadata = normalizeItemMetadata(rawMeta, fileName);

  state.currentFileMetadata = metadata;

  if (state.editor) {
    // Desativa o listener temporariamente para carregar sem disparar o 'change'
    state.editor.off("change");
    state.editor.setMarkdown(body);
    state.editor.moveCursorToStart();
    state.editor.on("change", handleEditorChange);
  }

  // Oculta o overlay reutilizável do editor, pois um arquivo foi aberto
  toggleEditorOverlay(false, "no-file");

  document.getElementById("page-title").innerText = relativePath;
  localStorage.setItem("last_open_file", relativePath);

  const isReadOnly = !metadata.humanWrite || state.aiLockState;
  setEditorReadOnly(isReadOnly);

  // Exibe o status inicial
  setSaveStatus("hidden");
}

/**
 * Reseta a interface do editor para o estado inicial sem arquivo aberto.
 */
export function resetEditorState() {
  state.currentFilePath = null;
  state.currentFileMetadata = "";

  if (state.editor) {
    state.editor.setMarkdown("");
  }

  const pageTitle = document.getElementById("page-title");
  const btnSave = document.getElementById("btn-save");

  if (pageTitle) pageTitle.innerText = "Selecione um arquivo";
  if (btnSave) btnSave.disabled = true;

  // Exibe o overlay unificado informando que nenhum arquivo está selecionado (sem o spinner)
  toggleEditorOverlay(true, "no-file", "Nenhum arquivo selecionado", false);
  console.log("[EDITOR] Estado do editor resetado. Nenhum arquivo aberto.");

  // Exibe o status inicial
  setSaveStatus("hidden");
}
