/**
 * @file Ponto de entrada do frontend (Renderer), responsável por inicializar módulos, escutadores de eventos de UI e orquestrar a aplicação.
 */

import { state } from './core/config.js';
import { initTheme } from './core/theme.js';

// import { initEditor } from './components/editor';
// import { initExplorerEvents } from './components/explorer';
// import { setupAiDrawerEvents } from './components/chat';
// import { initSettingsEvents } from './components/settings';
// import {
//   popularSelectDeLivros,
//   restoreLastSelectedBook,
//   setupBookEvents,
//   checkAILock,
//   updateBookTitlesInSelect
// } from './services/bookService.js';
// import { restoreLastOpenedFile } from './services/fileService.js';
// import { initTheme, initSaveButtonAnimation, initStarryBackground } from './ui';


// Inicialização principal quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Inicializa o editor Markdown
  initEditor();

  // 2. Inicializa e aplica o tema salvo
  initTheme();

  // 3. Registra todos os eventos de interface
  setupUIEvents();

  // 4. Popula a lista de livros no <select>
  const books = await popularSelectDeLivros();

  // 5. Seleciona o livro (restaura o último ou seleciona o primeiro) e carrega seu Chat/Tree
  await restoreLastSelectedBook(books);

  // 6. Restaura o último arquivo aberto via FileService
  restoreLastOpenedFile();

  // TODO: Migrar pollings para arquitetura orientada a eventos/websocket
  setInterval(checkAILock, 500);
  setInterval(updateBookTitlesInSelect, 1000);
});

/**
 * Configura os ouvintes de eventos da interface global (Select de livros, Menus, Modos de exibição, etc).
 */
function setupUIEvents() {

  // Animações e UI auxiliares
  initSaveButtonAnimation();
  initStarryBackground();
  setupAiDrawerEvents();
  initSettingsEvents();
  initExplorerEvents();
  setupBookEvents();

  // Previne comportamento padrão de arrastar elementos na janela
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
  }, true);

  // Impede que o TAB navegue pelos elementos do app fora do editor
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      // Verifica se o foco atual está dentro do ToastUI / CodeMirror / ProseMirror
      const isInsideEditor = e.target.closest('.toastui-editor-defaultUI') ||
        e.target.closest('.CodeMirror') ||
        e.target.closest('.ProseMirror');

      if (!isInsideEditor) {
        e.preventDefault();
      }
    }
  }, true); // O argumento 'true' ativa a fase de captura para interceptar antes de qualquer elemento

}