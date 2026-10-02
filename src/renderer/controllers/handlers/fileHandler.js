/**
 * @file Handler dos eventos relacionados a arquivos .md e .temp
 */

import { uiBus } from "../../events/uiBus.js";
import { domainBus } from "../../events/domainBus.js";

/**
 * Handler que abre modal e exibe todos os arquivos .temp do projeto para serem sincronizados
 */
export function onSyncOpenModal() {
  // TODO: Implementar função
  // Teste de modal
  uiBus.emit("modal:open", {
    title: "Confirmar Exclusão",
    content: "<p>Tem certeza que deseja apagar este livro?</p>",
    buttons: [
      { text: "Cancelar", class: "btn-secondary" },
      {
        text: "Excluir",
        class: "btn-danger",
        onClick: (modalInstance) => {
          modalInstance.close();
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
    console.log(req.data.path);
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
export async function onSaveTemp(path, content) {
  try {
    if (window.electronAPI && window.electronAPI.saveFile) {
      await window.electronAPI.saveFile(path + ".temp", content);
      uiBus.emit("file:save-temp-success", path + ".temp");
    } else {
      console.error(
        "[uiController] window.electronAPI.saveFile não está disponível.",
      );
    }
  } catch (err) {
    console.error(
      "[uiController] Erro ao salvar arquivo temporário via IPC:",
      err,
    );
    uiBus.emit("file:save-temp-error", { path, error: err });
  }
}

/**
 * Trata o evento de arquivo aberto, atualizando o state global e armazenando a referência do último arquivo aberto.
 * @param {Object} State
 * @param {Object} payload {fullPath, relativePath, fileName, metadata, body,}
 */
export function onFileOpened(state, payload) {
  state.currentFilePath = payload.fullPath;
  state.currentFileMetadata = payload.metadata;
  localStorage.setItem("last_opened_file", payload.fullPath);
}
