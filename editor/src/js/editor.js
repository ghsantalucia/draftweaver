import { state } from './config.js';
import { parseMarkdown, showToast, stringifyFrontmatter } from './utils.js';

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

// Leitura de arquivo via Electron
export async function openFileElectron(fullPath, relativePath) {
  state.currentFilePath = fullPath;
  const rawText = await window.electronAPI.readFile(fullPath);

  if (rawText === null) return;

  const { metadata, body } = parseMarkdown(rawText);
  state.currentFileMetadata = metadata;

  if (state.editor) {
    state.editor.setMarkdown(body);
    state.editor.moveCursorToStart();
  }

  // Esconde o overlay de "Nenhum arquivo selecionado"
  const noFileOverlay = document.getElementById('no-file-overlay');
  if (noFileOverlay) noFileOverlay.classList.add('hidden');

  document.getElementById('page-title').innerText = relativePath;
  document.getElementById('btn-save').disabled = false;

  localStorage.setItem('last_open_file', relativePath);

  // Confere se o arquivo tem a chave 'humanAllowed' no YAML e ajusta a interatividade do editor
  const isHumanAllowed = metadata.humanAllowed !== false;
  const editorContainer = document.querySelector('.toastui-editor-defaultUI');
  const btnSave = document.getElementById('btn-save');

  if (editorContainer) {
    if (!isHumanAllowed) {
      editorContainer.classList.add('readonly-mode');
      if (btnSave) btnSave.disabled = true;

      // 1. Instancia handlers para bloquear teclado e seleção via mouse se ainda não existirem
      if (!state.readOnlyKeyHandler) {
        state.readOnlyKeyHandler = (e) => {
          // Bloqueia qualquer tecla digitada ou combinações como Shift, Ctrl+A, etc.
          e.preventDefault();
          e.stopPropagation();
        };
      }

      if (!state.readOnlyMouseHandler) {
        state.readOnlyMouseHandler = (e) => {
          // Bloqueia se apertar Shift durante o clique ou se tentar iniciar seleção de texto
          if (e.shiftKey || e.type === 'selectstart') {
            e.preventDefault();
            e.stopPropagation();
          }
        };
      }

      // 2. Adiciona os ouvintes de eventos na fase de captura (true)
      editorContainer.addEventListener('keydown', state.readOnlyKeyHandler, true);
      editorContainer.addEventListener('mousedown', state.readOnlyMouseHandler, true);
      editorContainer.addEventListener('selectstart', state.readOnlyMouseHandler, true);

      // Remove qualquer foco ou cursor ativo atual
      if (document.activeElement) document.activeElement.blur();

    } else {
      // Remove o modo leitura
      editorContainer.classList.remove('readonly-mode');
      if (btnSave) btnSave.disabled = false;

      // Remove os ouvintes
      if (state.readOnlyKeyHandler) {
        editorContainer.removeEventListener('keydown', state.readOnlyKeyHandler, true);
      }
      if (state.readOnlyMouseHandler) {
        editorContainer.removeEventListener('mousedown', state.readOnlyMouseHandler, true);
        editorContainer.removeEventListener('selectstart', state.readOnlyMouseHandler, true);
      }
    }
  }
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