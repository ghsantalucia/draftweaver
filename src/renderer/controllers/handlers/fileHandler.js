/**
 * @file Handler responsável pelas ações de sincronização e gerenciamento de arquivos .temp.
 */

import Handlebars from "handlebars";
import { uiBus } from "../../events/uiBus.js";
import syncFormTpl from "../../components/Modal/templates/syncForm.hbs?raw";
import { stringifyFrontmatter } from "../../utils/markdown.js";
import { normalizePath } from "../../utils/helpers.js";

/**
 * Persiste as alterações de um único arquivo (socreve original com .temp e limpa estado)
 * @param {string} filePath - Caminho do arquivo a ser sincronizado
 * @param {FileService} fileService - Instância do serviço de arquivos
 * @param {Object} state - Estado global da aplicação
 */
export async function syncFile(filePath, fileService, state) {
  if (!filePath) return { success: false, error: "Caminho inválido" };

  let contentToSave = null;

  // 1. Se é o arquivo atualmente aberto no editor, pega do estado/editor
  if (
    state.currentFilePath &&
    (state.currentFilePath === filePath ||
      state.currentFilePath.endsWith(filePath))
  ) {
    contentToSave = stringifyFrontmatter(
      state.currentFileMetadata,
      state.editor.getMarkdown(),
    );
  } else {
    // 2. Se está em segundo plano, lê o rascunho .temp direto do disco
    const tempPath = filePath.endsWith(".temp") ? filePath : `${filePath}.temp`;
    const { content } = await fileService.readFile(tempPath);

    if (content === null) {
      return {
        success: false,
        error: "Não foi possível ler o arquivo temporário.",
      };
    }
    contentToSave = content;
  }

  // 3. Persiste no arquivo oficial e remove o .temp
  const officialPath = filePath.replace(/\.temp$/, "");
  const res = await fileService.saveFile(officialPath, contentToSave);

  if (res.success) {
    // Notifica o barramento para atualizar botões e indicadores
    uiBus.emit("temp-file:synced", normalizePath(officialPath));
  }

  return res;
}

/**
 * Sincroniza uma lista de caminhos de arquivos em lote.
 */
export async function syncMultipleFiles(filePaths, fileService, state) {
  if (!filePaths || filePaths.length === 0) return;

  let successCount = 0;
  let errorCount = 0;

  for (const rawPath of filePaths) {
    const path = normalizePath ? normalizePath(rawPath) : rawPath;
    const res = await syncFile(path, fileService, state);
    if (res.success) successCount++;
    else errorCount++;
  }

  if (errorCount === 0) {
    uiBus.emit("toast:show", {
      message: `✓ ${successCount} arquivo(s) sincronizado(s) com sucesso!`,
      type: "success",
    });
  } else {
    uiBus.emit("toast:show", {
      message: `⚠ ${successCount} salvos, e ${errorCount} falharam.`,
      type: "error",
    });
  }
}

/**
 * Varre o sistema de arquivos via FileService e abre o modal de sincronização.
 */
export async function onSyncOpenModal(fileService, state) {
  const tempFiles = await fileService.getPendingTempFiles();

  if (tempFiles.length === 0) {
    uiBus.emit("toast:show", {
      message: "Nenhum arquivo pendente de sincronização.",
      type: "info",
    });
    return;
  }

  const template = Handlebars.compile(syncFormTpl);
  const modalContentHtml = template({ tempFiles });

  uiBus.emit("modal:open", {
    id: "sync-files-modal",
    title: "Sincronizar Alterações Pendentes",
    content: modalContentHtml,
    buttons: [
      { text: "Cancelar", class: "btn-secondary" },
      {
        text: "Sincronizar Selecionados",
        class: "btn-primary",
        onClick: async (modalInstance) => {
          const checkedBoxes = modalInstance.element.querySelectorAll(
            ".sync-file-checkbox:checked",
          );
          const pathsToSync = Array.from(checkedBoxes).map((cb) =>
            cb.getAttribute("data-path"),
          );

          if (pathsToSync.length === 0) {
            uiBus.emit("toast:show", {
              message: "Selecione pelo menos um arquivo para sincronizar.",
              type: "info",
            });
            return;
          }

          modalInstance.close();
          await syncMultipleFiles(pathsToSync, fileService, state);
        },
      },
    ],
    onMounted: (modalInstance) => {
      attachSyncModalEvents(modalInstance, fileService, state);
    },
  });
}

/**
 * Gerencia os ouvintes de eventos e interações dentro do modal.
 */
function attachSyncModalEvents(syncModal, fileService, state) {
  // Busca o container diretamente no DOM real para evitar nós desanexados
  const modalEl =
    document.getElementById("sync-files-modal") || syncModal.element;
  if (!modalEl) return;

  const selectAllCb = modalEl.querySelector("#sync-select-all");
  const countLabel = modalEl.querySelector("#sync-count-label");
  const fileListUl = modalEl.querySelector("#sync-file-list");

  // Localiza o botão primário dentro do próprio modal
  const syncBtn =
    modalEl.querySelector(".btn-primary") ||
    modalEl.querySelector(".modal-footer .btn-primary");

  const updateListState = () => {
    const remainingItems = modalEl.querySelectorAll(".sync-file-item");

    // Se zeraram os itens, fecha o modal e notifica a barra
    if (remainingItems.length === 0) {
      syncModal.close();
      return;
    }

    const checkedBoxes = modalEl.querySelectorAll(
      ".sync-file-checkbox:checked",
    );
    const checkedCount = checkedBoxes.length;

    // Atualiza o contador do "Selecionar Todos"
    if (countLabel) {
      countLabel.textContent = `Selecionar Todos (${remainingItems.length})`;
    }

    if (selectAllCb) {
      selectAllCb.checked =
        checkedCount === remainingItems.length && remainingItems.length > 0;
    }

    // Desabilita o botão de Sincronizar se NENHUM item estiver marcado
    if (syncBtn) {
      syncBtn.disabled = checkedCount === 0;
    }
  };

  // 1. Checkbox "Selecionar Todos"
  selectAllCb?.addEventListener("change", (e) => {
    const fileCbs = modalEl.querySelectorAll(".sync-file-checkbox");
    fileCbs.forEach((cb) => (cb.checked = e.target.checked));
    updateListState();
  });

  // 2. Eventos de clique na lista (Links, Lixeira e Checkboxes)
  fileListUl?.addEventListener("click", async (e) => {
    // Se clicou na checkbox individual (ou na label/span dela)
    const checkboxEl = e.target.closest(".sync-file-checkbox");
    if (checkboxEl) {
      updateListState();
      return;
    }

    // Se clicou no Link de Visualização
    const linkEl = e.target.closest(".sync-file-link");
    if (linkEl) {
      e.preventDefault();
      const targetPath = linkEl.getAttribute("data-path");
      if (targetPath) {
        syncModal.close();
        uiBus.emit("editor:open-file", { path: targetPath });
      }
      return;
    }

    // Se clicou no Botão da Lixeira
    const discardBtn = e.target.closest(".btn-discard-temp");
    if (discardBtn) {
      e.preventDefault();
      const rawPath = discardBtn.getAttribute("data-path");
      const path = normalizePath ? normalizePath(rawPath) : rawPath;
      const name = discardBtn.getAttribute("data-name");
      const targetLi = discardBtn.closest("li.sync-file-item");

      await handleDiscardTemp(
        path,
        name,
        targetLi,
        syncModal,
        updateListState,
        fileService,
      );
    }
  });

  // Calibragem inicial ao montar
  updateListState();
}

/**
 * Processa a exclusão/descarte do arquivo .temp no disco e na interface com modal de confirmação.
 */
async function handleDiscardTemp(
  path,
  name,
  targetLi,
  syncModal,
  updateListState,
  fileService,
) {
  uiBus.emit("modal:open", {
    id: "confirm-discard-modal",
    title: "Descartar Alterações?",
    content: `<p>Tem certeza que deseja descartar as alterações não salvas de <strong>${name}</strong>?</p>`,
    buttons: [
      { text: "Cancelar", class: "btn-secondary" },
      {
        text: "Descartar",
        class: "btn-danger",
        onClick: async (confirmInstance) => {
          confirmInstance.close();

          const tempPath = path.endsWith(".temp") ? path : `${path}.temp`;
          const res = await fileService.deleteFile(tempPath);

          if (res.success) {
            // Remove o nó visual do modal
            if (targetLi) {
              targetLi.remove();
            }

            uiBus.emit("temp-file:deleted", normalizePath(path));
            uiBus.emit("toast:show", {
              message: `Alterações de "${name}" descartadas.`,
              type: "success",
            });

            // Recalcula contadores e estado do modal
            updateListState();
          } else {
            uiBus.emit("toast:show", {
              message: `Erro ao descartar: ${res.error}`,
              type: "error",
            });
          }
        },
      },
    ],
  });
}

/**
 * Realiza a consulta do arquivo no disco (com prioridade .temp), atualiza o state e notifica globalmente.
 * @param {string} fullPath - Caminho absoluto do arquivo.
 * @param {string} relativePath - Caminho relativo para exibição.
 * @param {Object} state - Estado global da aplicação.
 * @returns {Promise<void>}
 */
export async function onFileGet(req, state, fileService) {
  try {
    const fullPath = req.data.path;
    const file = await fileService.readFile(fullPath);

    if (file) {
      // 3. Atualiza o state PRIMEIRO (garantindo consistência antes de notificar)
      if (state) {
        state.currentFilePath = fullPath; // Mantém a referência do arquivo original
      }

      // 4. Só agora notifica globalmente que o arquivo atual mudou, enviando o conteúdo integral
      req.reply({ content: file.content, isTemp: file.isTemp });
    } else {
      console.error(
        "[fileHandler] Conteúdo do arquivo veio vazio ou nulo:",
        fullPath,
      );
    }
  } catch (err) {
    console.error("[fileHandler] Erro ao obter dados do arquivo via IPC:", err);
  }
}

// Solicita o salvamento de um arquivo temporário (.temp) via IPC
export async function onSaveTemp(path, content, fileService) {
  const result = await fileService.saveTempFile(path, content);
  if (result.success) {
    uiBus.emit("temp-file:saved", normalizePath(path));
  } else {
    uiBus.emit("temp-file:saving-error", { path, error: result.err });
  }
}

/**
 * Manipula a abertura de um arquivo, atualizando o estado do livro atual e persistindo as configurações.
 * @param {Object} state - Instância do estado global.
 * @param {Object} bookService - Instância do serviço de livros.
 * @param {Object} payload - Dados do arquivo aberto (contém fullPath e metadata).
 */
export function onFileOpened(state, bookService, payload) {
  const filePath = payload.fullPath || payload.path;

  state.currentFilePath = filePath;
  state.currentFileMetadata = payload.metadata || "";

  if (!state.currentBookPath || !state.bookList) return;

  // Localiza o livro atual na lista
  const currentBook = state.bookList.find(
    (book) => book.fullPath === state.currentBookPath,
  );

  if (!currentBook) return;

  // Cada um cuida do seu: garante apenas a existência do container e atualiza o seu campo
  currentBook.explorer_state = currentBook.explorer_state || {};
  currentBook.explorer_state.open_file = filePath;

  // Atualiza o último arquivo aberto no objeto do livro
  currentBook.explorer_state.open_file = filePath;

  // Persiste as alterações no config.json do livro
  if (typeof bookService.updateConfig === "function") {
    bookService.updateConfig();
  }
}

/**
 * Ações a serem tomadas quando o editor é resetado
 * @param {Object} state
 */
export function onEditorReset(state) {
  state.currentFilePath = null;
  state.currentFileMetadata = "";
}

export async function onTempDeleted(filePath, state, fileService) {
  // Se o arquivo deletado estava aberto no editor, recarrega o arquivo original
  if (normalizePath(state.currentFilePath) === normalizePath(filePath)) {
    uiBus.emit("toolbar:save-status", "hidden");
    uiBus.emit("editor:open-file", { path: normalizePath(filePath) });
  }
  handlePendingTempFiles(fileService);
}

export async function handlePendingTempFiles(fileService) {
  // Envia lista de arquivos pendentes atualizados para ouvintes (botão sync e explorer)
  const pendingFiles = await fileService.getPendingTempFiles();
  uiBus.emit("temp-files:pending-list", pendingFiles);
}
