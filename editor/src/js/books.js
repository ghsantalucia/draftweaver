import { state } from './config.js';
import { renderTree } from './tree.js';
import { resetEditorState } from './editor.js';


// 1. Função com Responsabilidade ÚNICA: Verificar Trava da IA
export async function checkAILock() {
  if (!state.currentBookPath) return;

  const configPath = `${state.currentBookPath}/config.json`;
  const text = await window.electronAPI.readFile(configPath);

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
    // Silencia erro enquanto o arquivo é gravado
  }
}

// 2. Função com Responsabilidade ÚNICA: Polling para atualizar os títulos dos livros no Select
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

// Popula o <select> com os livros encontrados na pasta /books
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

  // Verifica se o usuário já tinha um livro aberto anteriormente
  const lastSelectedBook = localStorage.getItem('last_selected_book');
  const bookToLoad = books.find(b => b.fullPath === lastSelectedBook) || books[0];

  selectBook.value = bookToLoad.fullPath;
  state.currentBookPath = bookToLoad.fullPath;
  localStorage.setItem('last_selected_book', bookToLoad.fullPath);

  // CHAMADA 1: Atualiza o título no carregamento inicial
  updateWindowTitle(bookToLoad.title);

  // Renderiza a árvore do livro selecionado
  resetEditorState(); // Bloqueia o editor ao trocar de livro
  await renderTree();
}

// Exemplo no js/books.js na troca do livro ou inicialização:
export function updateWindowTitle(bookTitle) {
  if (bookTitle) {
    document.title = `${bookTitle} — DraftWeaver`;
  } else {
    document.title = 'DraftWeaver';
  }
}