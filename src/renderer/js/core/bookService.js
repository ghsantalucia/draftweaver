/**
 * @file Serviço responsável por gerenciar a lista de livros, dados de configuração por projeto e verificação de travas da IA no Electron.
 */

import { state } from '../config.js';
import { renderTree } from '../explorer/index.js';
import { resetEditorState } from '../editor/index.js';
import { readFile } from './fileService.js';

/**
 * Verifica o arquivo config.json do livro atual para gerenciar a exibição do overlay de trava da IA.
 */
export async function checkAILock() {
  if (!state.currentBookPath) return;

  const configPath = `${state.currentBookPath}/config.json`;
  const text = await readFile(configPath);

  if (!text) return;

  try {
    const config = JSON.parse(text);
    const overlay = document.getElementById('overlay');

    if (overlay) {
      if (config.ai_lock) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  } catch (err) {
    // Silencia erro enquanto o arquivo está sendo gravado
  }
}

/**
 * Executa o polling para manter atualizados os títulos dos livros no elemento <select>.
 */
export async function updateBookTitlesInSelect() {
  const selectBook = document.getElementById('select-book');
  if (!selectBook) return;

  const books = await window.electronAPI.getBooksList();

  books.forEach(book => {
    const option = selectBook.querySelector(`option[value="${CSS.escape(book.fullPath)}"]`);
    if (option) {
      const newTitle = `${book.title}`;
      if (option.innerText !== newTitle) {
        option.innerText = newTitle;
      }
    }
  });
}

/**
 * Popula o <select> da interface com a lista de livros encontrados na pasta /books.
 */
export async function popularSelectDeLivros() {
  const selectBook = document.getElementById('select-book');
  if (!selectBook) return;

  const books = await window.electronAPI.getBooksList();
  selectBook.innerHTML = '';

  if (books.length === 0) {
    selectBook.innerHTML = '<option value="">Nenhum livro encontrado</option>';
    return;
  }

  books.forEach(book => {
    const option = document.createElement('option');
    option.value = book.fullPath;
    option.innerText = `${book.title}`;
    selectBook.appendChild(option);
  });

  // Tenta restaurar o último livro selecionado no localStorage ou assume o primeiro da lista
  const lastSelectedBook = localStorage.getItem('last_selected_book');
  const bookToLoad = books.find(b => b.fullPath === lastSelectedBook) || books[0];

  selectBook.value = bookToLoad.fullPath;
  state.currentBookPath = bookToLoad.fullPath;
  localStorage.setItem('last_selected_book', bookToLoad.fullPath);

  // Atualiza a janela com o título do livro
  updateWindowTitle(bookToLoad.title);

  // Reseta o editor e renderiza a árvore de diretórios do livro selecionado
  resetEditorState();
  await renderTree();
}

/**
 * Atualiza o título da janela principal da aplicação.
 * @param {string} bookTitle Título do livro selecionado
 */
export function updateWindowTitle(bookTitle) {
  if (bookTitle) {
    document.title = `${bookTitle} — DraftWeaver`;
  } else {
    document.title = 'DraftWeaver';
  }
}