import { state } from './config.js';
import { initEditor, resetEditorState } from './editor.js';
import { popularSelectDeLivros, checkAILock, updateBookTitlesInSelect, updateWindowTitle } from './books.js';
import { renderTree, restoreLastOpenedFile } from './tree.js';
import { initTheme, toggleTheme } from './theme.js';
import { initSaveButtonAnimation, initStarryBackground, setupDrawerEvents } from './uiAnimations.js';
import { initMenuEvents } from './utils.js';


// Inicializa o Editor Markdown
document.addEventListener('DOMContentLoaded', async () => {

  // Inicializa o editor
  initEditor();

  // Inicializa o tema salvo ao abrir o app
  const isDark = initTheme();

  // Caso tenha um botão/switch de teste com id="theme-toggle"
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.checked = isDark;
    themeToggle.addEventListener('change', (e) => {
      toggleTheme(e.target.checked);
    });
  }

  // Carrega lista de livros
  await popularSelectDeLivros();

  // Tenta restaurar o último arquivo aberto
  restoreLastOpenedFile();

  // TODO: Alterar polling para websocket
  // Polling 1: Trava da IA
  setInterval(checkAILock, 500);
  // Polling 2: Atualização do título do livro no select
  setInterval(updateBookTitlesInSelect, 1000);

  // Configura ouvintes de interface
  setupUIEvents();
});

function setupUIEvents() {

  // Animação do botão de salvar
  initSaveButtonAnimation();
  
  // Animações e eventos do chat de IA
  initStarryBackground();
  setupDrawerEvents();
  setupAutoResizeInput();

  // Impede o comportamento padrão de arrastar imagens e elementos na aplicação inteira
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
  }, true);

  const selectBook = document.getElementById('select-book');
  if (selectBook) {
    selectBook.addEventListener('change', async (e) => {
      state.currentBookPath = e.target.value;
      localStorage.setItem('last_selected_book', state.currentBookPath);

      // CHAMADA 2: Atualiza o título da janela ao trocar o livro no select
      const selectedOption = selectBook.options[selectBook.selectedIndex];
      if (selectedOption) {
        updateWindowTitle(selectedOption.innerText);
      }

      // 1. Zera o editor, apaga o texto atual e reativa a tela de "Nenhum arquivo selecionado"
      resetEditorState();

      // 2. Renderiza a árvore do livro novo
      await renderTree();

      // 3. Atualiza o estado da trava da IA para o novo livro
      checkAILock();
    });
  }

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

  const btnOpenMenu = document.getElementById('btn-open-menu');
  if (btnOpenMenu) {
    // Inicializa os cliques do menu/drawer de forma limpa
    initMenuEvents();
  }
}

export function setupAutoResizeInput() {
  const textarea = document.getElementById('ai-chat-input');
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    // Reseta a altura para recalcular corretamente ao apagar texto
    textarea.style.height = 'auto';
    
    // Define a nova altura com base no scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`;
  });

  // Opcional: Enviar com Enter (e Shift+Enter para quebra de linha)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const btnSend = document.getElementById('btn-send-ai');
      if (btnSend) btnSend.click();
    }
  });
}