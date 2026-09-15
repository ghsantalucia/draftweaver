/**
 * @file Controla a inicialização do ToastUI Editor, leitura e salvamento de arquivos Markdown e aplicação de regras de permissão de escrita na UI.
 */

import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

import { state } from '../config.js';
import { parseMarkdown, stringifyFrontmatter } from '../utils/markdown.js';
import { showToast, normalizeItemMetadata } from '../utils/helpers.js';
import { readFile, saveFile, saveTempFile, autoOpenFileByPath } from '../core/fileService.js';
import { syncTreeSelection, updateSaveButtonState } from '../explorer';

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
    btnSave.addEventListener('click', saveCurrentFile);
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
    updateSaveButtonState();
  } else {
    setSaveStatus('error');
  }
}

/**
 * Atualiza o ícone visual de status de salvamento na UI
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
  const btnSave = document.getElementById('btn-save');

  if (btnSave) {
    btnSave.disabled = isReadOnly;
  }

  if (!editorContainer) return;

  if (isReadOnly) {
    editorContainer.classList.add('readonly-mode');

    if (!state.readOnlyKeyHandler) {
      state.readOnlyKeyHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
    }

    if (!state.readOnlyMouseHandler) {
      state.readOnlyMouseHandler = (e) => {
        if (e.shiftKey || e.type === 'selectstart') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
    }

    editorContainer.addEventListener('keydown', state.readOnlyKeyHandler, true);
    editorContainer.addEventListener('mousedown', state.readOnlyMouseHandler, true);
    editorContainer.addEventListener('selectstart', state.readOnlyMouseHandler, true);

    if (document.activeElement) document.activeElement.blur();

  } else {
    editorContainer.classList.remove('readonly-mode');

    if (state.readOnlyKeyHandler) {
      editorContainer.removeEventListener('keydown', state.readOnlyKeyHandler, true);
    }
    if (state.readOnlyMouseHandler) {
      editorContainer.removeEventListener('mousedown', state.readOnlyMouseHandler, true);
      editorContainer.removeEventListener('selectstart', state.readOnlyMouseHandler, true);
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
    state.editor.off('change');
    state.editor.setMarkdown(body);
    state.editor.moveCursorToStart();
    state.editor.on('change', handleEditorChange);
  }

  const noFileOverlay = document.getElementById('no-file-overlay');
  if (noFileOverlay) noFileOverlay.classList.add('hidden');

  document.getElementById('page-title').innerText = relativePath;
  localStorage.setItem('last_open_file', relativePath);

  const isReadOnly = !metadata.humanWrite;
  setEditorReadOnly(isReadOnly);

  // Exibe o status inicial
  setSaveStatus('hidden');
}

/**
 * Prepara o conteúdo visual do editor e delega a gravação para o FileService.
 * @param {Event} [e] Evento opcional de clique
 */
export async function saveCurrentFile(e) {
  if (e) e.preventDefault();
  if (!state.currentFilePath) return;

  if (autoSaveTimer) clearTimeout(autoSaveTimer);

  const contentToSave = stringifyFrontmatter(state.currentFileMetadata, state.editor.getMarkdown());
  const res = await saveFile(state.currentFilePath, contentToSave);

  if (res.success) {
    setSaveStatus('saved');
    showToast('✓ Arquivo salvo com sucesso!', 'success');

    // MUDANÇA: Remove o asterisco do item atual da árvore
    const activeSpan = document.querySelector('.file-name.active');
    if (activeSpan) {
      const parentLi = activeSpan.closest('li');
      if (parentLi) {
        parentLi.classList.remove('has-temp');
        const asterisk = activeSpan.querySelector('.dirty-asterisk');
        if (asterisk) asterisk.remove();
      }
    }
    updateSaveButtonState();
  } else {
    setSaveStatus('error');
    showToast('✕ Erro ao salvar: ' + res.error, 'error');
  }
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
  const noFileOverlay = document.getElementById('no-file-overlay');

  if (pageTitle) pageTitle.innerText = 'Selecione um arquivo';
  if (btnSave) btnSave.disabled = true;
  if (noFileOverlay) noFileOverlay.classList.remove('hidden');
}