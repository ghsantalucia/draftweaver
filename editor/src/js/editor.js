import { state } from './config.js';
import { parseMarkdown, showToast, stringifyFrontmatter, normalizeItemMetadata } from './utils.js';
import { autoOpenFileByPath } from './tree.js'; // Ajuste o caminho de importação conforme sua estrutura

// Inicializa o Editor
export function initEditor() {

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

  // Ativa a interceptação de links internos
  setupInternalLinkHandler();
}

// Escuta cliques dentro do container do editor para capturar links de arquivos .md
function setupInternalLinkHandler() {
  const container = document.querySelector('#markdown-editor');
  if (!container) return;

  container.addEventListener('click', (e) => {
    // Procura se o elemento clicado é uma tag <a> ou está dentro de uma
    const link = e.target.closest('a');
    if (!link) return;

    let href = link.getAttribute('href');

    if (href) {
      // 1. Decodifica caracteres de URL (%C3%A7 -> ç)
      try {
        href = decodeURIComponent(href);
      } catch (err) {
        console.error('Erro ao decodificar URL do link:', err);
      }

      // 2. Remove parâmetros de busca (?foo=bar) ou âncoras (#secao) se existirem
      const cleanHref = href.split('?')[0].split('#')[0];

      // 3. Verifica se é um link interno de Markdown ou um caminho relativo/absoluto interno
      const isExternal = cleanHref.startsWith('http://') || cleanHref.startsWith('https://') || cleanHref.startsWith('mailto:');
      const isMarkdownFile = cleanHref.toLowerCase().endsWith('.md');

      if (!isExternal && isMarkdownFile) {
        e.preventDefault();
        e.stopPropagation();

        console.log('[LINK INTERNO] Clique detectado para:', cleanHref);

        // Dispara a busca flexível na árvore de arquivos
        autoOpenFileByPath(cleanHref);
      }
    }
  });
}

// Controla o estado de bloqueio (somente leitura) do editor e do botão salvar.
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
  const metadata = normalizeItemMetadata(rawMeta, fileName);

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