/**
 * @file Ponto de entrada do frontend (Renderer), responsável por inicializar módulos, escutadores de eventos de UI e orquestrar a aplicação.
 */

import { state } from './config.js';
import { initEditor, resetEditorState } from './editor/index.js';
import { renderTree } from './explorer/index.js';
import { setupAutoResizeInput, setupAiDrawerEvents } from './chat/index.js';
import { initSettingsEvents } from './settings/index.js';
import { popularSelectDeLivros, checkAILock, updateBookTitlesInSelect, updateWindowTitle } from './core/bookService.js';
import { restoreLastOpenedFile } from './core/fileService.js';
import { initTheme, toggleTheme } from './ui/theme.js';
import { initSaveButtonAnimation, initStarryBackground } from './ui/animations.js';

// Inicialização principal quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Inicializa o editor Markdown
  initEditor();

  // 2. Inicializa e aplica o tema salvo
  const isDark = initTheme();

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.checked = isDark;
    themeToggle.addEventListener('change', (e) => {
      toggleTheme(e.target.checked);
    });
  }

  // 3. Carrega a lista de livros disponíveis
  await popularSelectDeLivros();

  // 4. Restaura o último arquivo aberto via FileService
  restoreLastOpenedFile();

  // TODO: Migrar pollings para arquitetura orientada a eventos/websocket
  setInterval(checkAILock, 500);
  setInterval(updateBookTitlesInSelect, 1000);

  // 5. Registra todos os eventos de interface
  setupUIEvents();
});

/**
 * Configura os ouvintes de eventos da interface global (Select de livros, Menus, Modos de exibição, etc).
 */
function setupUIEvents() {

  // Animações e UI auxiliares
  initSaveButtonAnimation();
  initStarryBackground();
  setupAiDrawerEvents();
  setupAutoResizeInput();

  // Previne comportamento padrão de arrastar elementos na janela
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
  }, true);

  // Evento de troca de Livro no Select
  const selectBook = document.getElementById('select-book');
  if (selectBook) {
    selectBook.addEventListener('change', async (e) => {
      state.currentBookPath = e.target.value;
      localStorage.setItem('last_selected_book', state.currentBookPath);

      const selectedOption = selectBook.options[selectBook.selectedIndex];
      if (selectedOption) {
        updateWindowTitle(selectedOption.innerText);
      }

      // Reseta estado do editor e renderiza a nova árvore de arquivos
      resetEditorState();
      await renderTree();

      // Atualiza trava da IA para o livro selecionado
      checkAILock();
    });
  }

  // Alternador de exibição de itens avançados na árvore
  const modeToggle = document.getElementById('mode-toggle');
  if (modeToggle) {
    modeToggle.addEventListener('change', (e) => {
      const container = document.getElementById('file-tree');
      if (container) {
        if (e.target.checked) {
          container.classList.add('show-advanced');
        } else {
          container.classList.remove('show-advanced');
        }
      }
    });
  }

  // Inicializa o menu/gaveta de configurações
  const btnOpenMenu = document.getElementById('btn-open-menu');
  if (btnOpenMenu) {
    initSettingsEvents();
  }
}