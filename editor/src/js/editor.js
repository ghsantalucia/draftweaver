import { state } from './config.js';
import { parseMarkdown, showToast, stringifyFrontmatter, normalizeMetadata } from './utils.js';

// Inicializa o Editor
export function initEditor() {

  // Ao criar a instância do Editor:
  const currentTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'default';

  state.editor = new toastui.Editor({
    el: document.querySelector('#markdown-editor'),
    height: '100%',
    initialEditType: 'wysiwyg',
    hideModeSwitch: true,
    placeholder: 'Selecione um arquivo...',
    theme: currentTheme
  });

  // Configura evento de salvar
  const btnSave = document.getElementById('btn-save');
  if (btnSave) {
    btnSave.addEventListener('click', saveCurrentFile);
  }
}

// editor.js

/**
 * Controla o estado de bloqueio (somente leitura) do editor e do botão salvar.
 * @param {boolean} isReadOnly 
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

    // Instancia os handlers globais se ainda não existirem
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

// Leitura de arquivo via Electron
export async function openFileElectron(fullPath, relativePath) {
  state.currentFilePath = fullPath;
  const rawText = await window.electronAPI.readFile(fullPath);

  if (rawText === null) return;

  // Normalização com os fallbacks definidos
  const { metadata: rawMeta, body } = parseMarkdown(rawText);

  // Extrai o nome do arquivo para usar de fallback caso não haja 'title' no YAML
  const fileName = relativePath.split(/[/\\]/).pop();

  // Aplica os fallbacks centralizados
  const metadata = normalizeMetadata(rawMeta, fileName);

  state.currentFileMetadata = metadata;
  // state.currentFileMetadata = normalizedMeta;

  if (state.editor) {
    state.editor.setMarkdown(body);
    state.editor.moveCursorToStart();
  }

  // Esconde o overlay de "Nenhum arquivo selecionado"
  const noFileOverlay = document.getElementById('no-file-overlay');
  if (noFileOverlay) noFileOverlay.classList.add('hidden');

  document.getElementById('page-title').innerText = relativePath;
  localStorage.setItem('last_open_file', relativePath);

  // Regra de escrita: Bloqueia se humanWrite for false
  const isReadOnly = !metadata.humanWrite;

  setEditorReadOnly(isReadOnly);
}

// Salvar via Electron
export async function saveCurrentFile(e) {

  if (e) e.preventDefault();
  if (!state.currentFilePath) return;

  // Usa o stringifyFrontmatter para converter o Objeto de volta em texto YAML
  const contentToSave = stringifyFrontmatter(state.currentFileMetadata, state.editor.getMarkdown());

  const res = await window.electronAPI.saveFile(state.currentFilePath, contentToSave);

  if (res.success) {
    // Dispara a animação visual do GSAP ao confirmar o salvamento
    showToast('✓ Arquivo salvo com sucesso!', 'success');
  } else {
    showToast('✕ Erro ao salvar: ' + res.error, 'error');
  }
}

// Adicione este helper em js/editor.js e importe no js/books.js
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