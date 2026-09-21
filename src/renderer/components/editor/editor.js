/**
 * @file Controla a inicialização do ToastUI Editor, leitura e salvamento de arquivos Markdown e aplicação de regras de permissão de escrita na UI.
 */

import './styles.css';

import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

import { state } from '../config.js';
import { parseMarkdown, stringifyFrontmatter } from '../utils/markdown.js';
import { normalizeItemMetadata, normalizePath } from '../utils/helpers.js';
import { showToast, toggleEditorOverlay, Modal } from '../ui';
import { readFile, saveFile, saveTempFile, deleteFile, autoOpenFileByPath } from '../services/fileService.js';
import { syncTreeSelection } from '../explorer';

let autoSaveTimer = null;

/**
 * Inicializa a instância do ToastUI Editor no DOM.
 */
export function initEditor() {
  const currentTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'default';

  state.editor = new Editor({
    el: document.querySelector('#markdown-editor'),
    height: '100%',
    initialEditType: 'wysiwyg',
    hideModeSwitch: true,
    placeholder: 'Selecione um arquivo...',
    theme: currentTheme
  });

  // Escuta edições no documento para disparar o autosave
  state.editor.on('change', handleEditorChange);

  const btnSave = document.getElementById('btn-save');
  if (btnSave) {
    btnSave.addEventListener('click', openSyncModal);
  }

  setupInternalLinkHandler();
}

/**
 * Escuta cliques dentro do container do editor para capturar navegações por links internos de arquivos Markdown.
 */
function setupInternalLinkHandler() {
  const container = document.querySelector('#markdown-editor');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    let href = link.getAttribute('href');

    if (href) {
      try {
        href = decodeURIComponent(href);
      } catch (err) {
        console.error('Erro ao decodificar URL do link:', err);
      }

      const cleanHref = href.split('?')[0].split('#')[0];
      const isExternal = cleanHref.startsWith('http://') || cleanHref.startsWith('https://') || cleanHref.startsWith('mailto:');
      const isMarkdownFile = cleanHref.toLowerCase().endsWith('.md');

      if (!isExternal && isMarkdownFile) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[LINK INTERNO] Clique detectado para:', cleanHref);
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

  setSaveStatus('unsaved');

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

  setSaveStatus('saving');
  const contentToSave = stringifyFrontmatter(state.currentFileMetadata, state.editor.getMarkdown());

  const res = await saveTempFile(state.currentFilePath, contentToSave);

  if (res.success) {
    setSaveStatus('saved');

    // Marca o item na árvore visualmente com asterisco se ainda não tiver
    const activeSpan = document.querySelector('.file-name.active');
    if (activeSpan) {
      const parentLi = activeSpan.closest('li');
      if (parentLi && !parentLi.classList.contains('has-temp')) {
        parentLi.classList.add('has-temp');

        let titleWrapper = activeSpan.querySelector('.file-title-wrapper');
        if (titleWrapper && !titleWrapper.querySelector('.dirty-asterisk')) {
          titleWrapper.insertAdjacentHTML('beforeend', '<span class="dirty-asterisk">*</span>');
        }
      }
    }
    refreshSaveButtonState();
  } else {
    setSaveStatus('error');
  }
}

/**
 * Atualiza o ícone visual de status de salvamento na UI.
 * @param {string} status - O estado atual do salvamento ('unsaved', 'saving', 'saved', 'error').
 */
function setSaveStatus(status) {
  const statusEl = document.getElementById('save-status-indicator');
  if (!statusEl) return;

  statusEl.className = `save-status ${status}`;

  const iconEl = statusEl.querySelector('i');
  const textEl = statusEl.querySelector('.status-text');

  if (status === 'unsaved') {
    if (iconEl) iconEl.className = 'fas fa-spinner fa-spin';
    // if (iconEl) iconEl.className = 'fas fa-circle';
    if (textEl) textEl.textContent = 'Alterações pendentes...';
  } else if (status === 'saving') {
    if (iconEl) iconEl.className = 'fas fa-spinner fa-spin';
    if (textEl) textEl.textContent = 'Salvando rascunho...';
  } else if (status === 'saved') {
    if (iconEl) iconEl.className = 'fas fa-check-circle';
    if (textEl) textEl.textContent = 'Rascunho salvo';
  } else if (status === 'error') {
    if (iconEl) iconEl.className = 'fas fa-exclamation-circle';
    if (textEl) textEl.textContent = 'Erro no autosave';
  }
}

/**
 * Define o estado de leitura/escrita do editor de texto e dos controles associados na UI.
 * @param {boolean} isReadOnly Define se o editor deve bloquear interações do usuário
 */
export function setEditorReadOnly(isReadOnly) {

  const editorContainer = document.querySelector('.toastui-editor-defaultUI');
  
  refreshSaveButtonState();

  if (!editorContainer) return;

  // Evita reprocessar se o estado atual já for o desejado (impede loops do setInterval)
  const isCurrentlyReadOnly = editorContainer.classList.contains('readonly-mode');
  if (isCurrentlyReadOnly === isReadOnly) return;

  if (isReadOnly) {
    editorContainer.classList.add('readonly-mode');

    if (!state.readOnlyKeyHandler) {
      state.readOnlyKeyHandler = (e) => {
        // Permite atalhos de cópia e seleção total (Ctrl+C, Ctrl+A, Cmd+C, Cmd+A, setas do teclado)
        const isCopyOrSelectAll = (e.ctrlKey || e.metaKey) && ['c', 'a', 'x'].includes(e.key.toLowerCase());
        const isNavigationKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key);

        if (isCopyOrSelectAll || isNavigationKey) {
          return;
        }

        // Bloqueia apenas as teclas que alteram o texto
        e.preventDefault();
        e.stopPropagation();
      };
    }

    editorContainer.addEventListener('keydown', state.readOnlyKeyHandler, true);

    // Se o foco estiver ESPECIFICAMENTE dentro do editor ao travar, nós removemos o foco apenas dele
    if (document.activeElement && editorContainer.contains(document.activeElement)) {
      document.activeElement.blur();
    }

  } else {
    editorContainer.classList.remove('readonly-mode');

    if (state.readOnlyKeyHandler) {
      editorContainer.removeEventListener('keydown', state.readOnlyKeyHandler, true);
    }
  }
}

/**
 * Centraliza a regra de ativação/desativação do botão Salvar/Sincronizar
 */
export function refreshSaveButtonState() {
  const btnSave = document.getElementById('btn-save');
  if (!btnSave) return;

  // 1. Verifica se o editor está em modo de leitura
  const isReadOnly = state.currentFileMetadata ? !state.currentFileMetadata.humanWrite : true;

  // 2. Verifica se existem alterações pendentes no sistema (arquivos .temp na árvore)
  const hasPendingChanges = document.querySelectorAll('#file-tree li.has-temp').length > 0;

  // O botão só fica habilitado se O EDITOR PERMITIR ESCRITA E HOUVER ALTERAÇÕES PENDENTES
  btnSave.disabled = isReadOnly || !hasPendingChanges;
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
    state.editor.off('change');
    state.editor.setMarkdown(body);
    state.editor.moveCursorToStart();
    state.editor.on('change', handleEditorChange);
  }

  // Oculta o overlay reutilizável do editor, pois um arquivo foi aberto
  toggleEditorOverlay(false, 'no-file');

  document.getElementById('page-title').innerText = relativePath;
  localStorage.setItem('last_open_file', relativePath);

  const isReadOnly = !metadata.humanWrite || state.aiLockState;
  setEditorReadOnly(isReadOnly);

  // Exibe o status inicial
  setSaveStatus('hidden');
}

/**
 * Reseta a interface do editor para o estado inicial sem arquivo aberto.
 */
export function resetEditorState() {
  state.currentFilePath = null;
  state.currentFileMetadata = '';

  if (state.editor) {
    state.editor.setMarkdown('');
  }

  const pageTitle = document.getElementById('page-title');
  const btnSave = document.getElementById('btn-save');

  if (pageTitle) pageTitle.innerText = 'Selecione um arquivo';
  if (btnSave) btnSave.disabled = true;

  // Exibe o overlay unificado informando que nenhum arquivo está selecionado (sem o spinner)
  toggleEditorOverlay(true, 'no-file', 'Nenhum arquivo selecionado', false);
  console.log('[EDITOR] Estado do editor resetado. Nenhum arquivo aberto.');

  // Exibe o status inicial
  setSaveStatus('hidden');
}

/**
 * Persiste as alterações de um único arquivo (socreve original com .temp e limpa estado)
 * @param {string} filePath Caminho do arquivo a ser sincronizado
 * @param {string} [content] Conteúdo opcional (se for o arquivo atualmente aberto)
 */
export async function syncFile(filePath) {
  if (!filePath) return { success: false, error: 'Caminho inválido' };

  console.log('[DEBUG syncFile] Processando arquivo absoluto:', filePath);

  let contentToSave = null;

  // 1. Se é o arquivo atualmente aberto no editor, pega o texto direto da memória
  if (state.currentFilePath && (state.currentFilePath === filePath || state.currentFilePath.endsWith(filePath))) {
    contentToSave = stringifyFrontmatter(state.currentFileMetadata, state.editor.getMarkdown());
  } else {
    // 2. Se está em segundo plano, lê o rascunho .temp diretamente do caminho de disco
    const tempPath = filePath.endsWith('.temp') ? filePath : `${filePath}.temp`;
    console.log('[DEBUG syncFile] Lendo .temp do disco em:', tempPath);

    const { content } = await readFile(tempPath);

    if (content === null) {
      console.error('[DEBUG syncFile] Não foi possível ler o arquivo .temp em:', tempPath);
      return { success: false, error: 'Não foi possível ler o arquivo temporário.' };
    }
    contentToSave = content;
  }

  // 3. Persiste no arquivo oficial e remove o .temp via fileService
  const officialPath = filePath.replace(/\.temp$/, '');
  const res = await saveFile(officialPath, contentToSave);

  if (res.success) {
    // Limpa a marcação visual na árvore lateral (procura por absolute-path ou data-path)
    const allLis = document.querySelectorAll('#file-tree li');
    allLis.forEach(li => {
      const abs = li.getAttribute('data-absolute-path');
      const rel = li.getAttribute('data-path');
      if (abs === officialPath || (rel && officialPath.endsWith(rel))) {
        li.classList.remove('has-temp');
        li.querySelector('.dirty-asterisk')?.remove();
      }
    });

    refreshSaveButtonState();
  }

  return res;
}

/**
 * Sincroniza uma lista de caminhos de arquivos em lote.
 * @param {string[]} filePaths - Array com os caminhos dos arquivos a serem sincronizados.
 */
export async function syncMultipleFiles(filePaths) {
  if (!filePaths || filePaths.length === 0) return;

  let successCount = 0;
  let errorCount = 0;

  for (const rawPath of filePaths) {
    const path = normalizePath(rawPath);
    const isCurrent = state.currentFilePath === path;
    const content = isCurrent
      ? stringifyFrontmatter(state.currentFileMetadata, state.editor.getMarkdown())
      : null;

    const res = await syncFile(path, content);
    if (res.success) successCount++;
    else errorCount++;
  }

  if (errorCount === 0) {
    showToast(`✓ ${successCount} arquivo(s) sincronizado(s) com sucesso!`, 'success');
  } else {
    showToast(`⚠ ${successCount} salvos, e ${errorCount} falharam.`, 'error');
  }
}

/**
 * Abre o modal de gerenciamento de alterações temporárias pendentes.
 */
export async function openSyncModal() {
  const tempNodes = Array.from(document.querySelectorAll('li.has-temp'));

  if (tempNodes.length === 0) {
    showToast('Nenhum arquivo pendente de sincronização.', 'info');
    return;
  }

  const tempFiles = tempNodes.map(node => {
    const nameEl = node.querySelector('.file-name');

    // Prioriza o caminho absoluto real do disco se disponível
    const absolutePath = node.getAttribute('data-absolute-path') ||
      nameEl?.getAttribute('data-absolute-path') ||
      node.getAttribute('data-path') ||
      nameEl?.getAttribute('data-path') || '';

    const name = nameEl ? nameEl.textContent.replace('*', '').trim() : absolutePath.split(/[/\\]/).pop();

    console.log(`[DEBUG openSyncModal] Mapeado: Nome="${name}" | PathAbsoluto="${absolutePath}"`);

    return { path: absolutePath, name };
  });

  const syncModal = new Modal({
    id: 'sync-files-modal',
    title: 'Sincronizar Alterações Pendentes',
    content: renderSyncModalContent(tempFiles),
    buttons: [
      { text: 'Cancelar', class: 'btn-secondary' },
      {
        text: 'Sincronizar Selecionados',
        class: 'btn-primary',
        onClick: async (modalInstance) => {
          const checkedBoxes = modalInstance.element.querySelectorAll('.sync-file-checkbox:checked');
          const pathsToSync = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-path'));

          if (pathsToSync.length === 0) {
            showToast('Selecione pelo menos um arquivo para sincronizar.', 'info');
            return;
          }

          modalInstance.close();
          await syncMultipleFiles(pathsToSync);
        }
      }
    ]
  });

  syncModal.show();
  attachSyncModalEvents(syncModal);
}

/**
 * Gera o HTML dinâmico contendo a lista de arquivos temporários para exibição no modal de sincronização.
 * @param {Array<Object>} tempFiles - Lista de objetos contendo o nome e caminho dos arquivos temporários.
 * @returns {string} String HTML estruturada para o conteúdo do modal.
 */
function renderSyncModalContent(tempFiles) {
  return `
    <div class="sync-modal-container">
      <p class="sync-modal-desc">
        Os seguintes arquivos possuem alterações temporárias não salvas no arquivo original:
      </p>
      
      <div class="sync-select-all-wrapper">
        <label class="custom-checkbox-label">
          <input type="checkbox" id="sync-select-all" checked>
          <span class="checkbox-mark"></span>
          <span class="checkbox-text"><strong id="sync-count-label">Selecionar Todos (${tempFiles.length})</strong></span>
        </label>
      </div>

      <ul class="sync-file-list" id="sync-file-list">
        ${tempFiles.map((file) => `
          <li class="sync-file-item" data-path="${file.path}">
            <label class="custom-checkbox-label">
              <input type="checkbox" class="sync-file-checkbox" data-path="${file.path}" checked>
              <span class="checkbox-mark"></span>
            </label>
            <span class="sync-file-title">
              <a href="#" class="sync-file-link" data-path="${file.path}" title="Visualizar arquivo">
                ${file.name}
              </a>
            </span>
            <button class="btn-discard-temp" data-path="${file.path}" data-name="${file.name}" title="Descartar alterações temporárias">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

/**
 * Manipula o processo de descarte e exclusão de um arquivo temporário (.temp) do disco e da interface.
 * @param {string} path - Caminho absoluto do arquivo.
 * @param {string} name - Nome amigável do arquivo.
 * @param {HTMLElement} targetLi - Elemento de lista visual correspondente ao arquivo no modal.
 * @param {Modal} syncModal - Instância do modal de sincronização aberto.
 * @param {Function} updateListState - Função de callback para atualizar o estado e contadores do modal.
 */
async function handleDiscardTemp(path, name, targetLi, syncModal, updateListState) {
  console.log('[DEBUG handleDiscardTemp] Caminho recebido:', path);

  const confirmModal = new Modal({
    id: 'confirm-discard-modal',
    title: 'Descartar Alterações?',
    content: `<p>Tem certeza que deseja descartar as alterações não salvas de <strong>${name}</strong>?</p>`,
    buttons: [
      { text: 'Cancelar', class: 'btn-secondary' },
      {
        text: 'Descartar',
        class: 'btn-danger',
        onClick: async (confirmInstance) => {
          confirmInstance.close();

          // Garante a extensão .temp no caminho
          const tempPath = path.endsWith('.temp') ? path : `${path}.temp`;
          console.log('[DEBUG handleDiscardTemp] Apagando no disco:', tempPath);

          const res = await deleteFile(tempPath);
          console.log('[DEBUG handleDiscardTemp] Resultado real do IPC:', res);

          if (res.success) {
            // Remove DIRETAMENTE o nó do elemento li da lista visual do modal
            if (targetLi) {
              targetLi.remove();
            }

            // Remove a marcação de .temp da árvore principal do app
            const treeNodes = document.querySelectorAll('#file-tree li');
            treeNodes.forEach(li => {
              const absPath = li.getAttribute('data-absolute-path');
              const relPath = li.getAttribute('data-path');
              if (absPath === path || (relPath && path.endsWith(relPath))) {
                li.classList.remove('has-temp');
                li.querySelector('.dirty-asterisk')?.remove();
              }
            });

            showToast(`Alterações de "${name}" descartadas.`, 'success');

            // Recalcula o estado dos seletores e fecha o modal se zerou
            updateListState();

            // Atualiza o botão de sincronizar na barra superior/lateral
            refreshSaveButtonState();
          } else {
            showToast(`Erro ao descartar: ${res.error}`, 'error');
          }
        }
      }
    ]
  });

  confirmModal.show();
}

/**
 * Gerencia os ouvintes de eventos e interações dentro do modal de sincronização (cliques em links, seleção de checkboxes e exclusão de itens).
 * @param {Modal} syncModal - Instância ativa do modal de sincronização.
 */
function attachSyncModalEvents(syncModal) {
  const modalEl = syncModal.element;
  const selectAllCb = modalEl.querySelector('#sync-select-all');
  const countLabel = modalEl.querySelector('#sync-count-label');
  const fileListUl = modalEl.querySelector('#sync-file-list');
  const syncBtn = modalEl.querySelector('.btn-primary');

  const updateListState = () => {
    const remainingItems = modalEl.querySelectorAll('.sync-file-item');
    console.log('[DEBUG ModalState] Itens restantes no modal:', remainingItems.length);

    // Se zeraram os itens, fecha o modal e atualiza o estado global
    if (remainingItems.length === 0) {
      syncModal.close();
      refreshSaveButtonState();
      return;
    }

    const checkedBoxes = modalEl.querySelectorAll('.sync-file-checkbox:checked');
    const checkedCount = checkedBoxes.length;

    // Atualiza o contador do "Selecionar Todos"
    if (countLabel) countLabel.textContent = `Selecionar Todos (${remainingItems.length})`;
    if (selectAllCb) selectAllCb.checked = (checkedCount === remainingItems.length && remainingItems.length > 0);

    // Desabilita o botão de Sincronizar se NENHUM item estiver marcado
    if (syncBtn) {
      syncBtn.disabled = (checkedCount === 0);
    }
  };

  // Evento do Checkbox "Selecionar Todos"
  selectAllCb?.addEventListener('change', (e) => {
    const fileCbs = modalEl.querySelectorAll('.sync-file-checkbox');
    fileCbs.forEach(cb => cb.checked = e.target.checked);
    updateListState();
  });

  fileListUl?.addEventListener('click', async (e) => {
    // Checkbox individual
    if (e.target.classList.contains('sync-file-checkbox')) {
      updateListState();
      return;
    }

    // Clique no Link (Visualizar)
    const linkEl = e.target.closest('.sync-file-link');
    if (linkEl) {
      e.preventDefault();
      const targetPath = linkEl.getAttribute('data-path');
      console.log('[DEBUG Modal] Clique no link de visualização:', targetPath);
      if (targetPath) {
        syncModal.close();
        autoOpenFileByPath(targetPath);
      }
      return;
    }

    // Botão Lixeira
    const discardBtn = e.target.closest('.btn-discard-temp');
    if (discardBtn) {
      e.preventDefault();
      const rawPath = discardBtn.getAttribute('data-path');
      const path = normalizePath ? normalizePath(rawPath) : rawPath;
      const name = discardBtn.getAttribute('data-name');
      const targetLi = discardBtn.closest('li.sync-file-item');

      await handleDiscardTemp(path, name, targetLi, syncModal, updateListState);
    }
  });

  // Executa uma checagem inicial para calibrar o estado do botão ao abrir o modal
  updateListState();
}