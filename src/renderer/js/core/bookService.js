/**
 * @file Serviço responsável por gerenciar a lista de livros, dados de configuração por projeto e verificação de travas da IA no Electron.
 */

import { state } from '../config.js';
import { renderTree } from '../explorer';
import { resetEditorState, setEditorReadOnly } from '../editor';
import { readFile } from './fileService.js';
import { reloadChatForCurrentBook } from '../chat';
import { toggleEditorOverlay } from '../utils/helpers.js';


/**
 * Função centralizada para aplicar a seleção de um livro.
 * Executada tanto na troca manual pelo <select> quanto na restauração inicial.
 * @param {string} bookPath - Caminho completo do livro.
 * @param {string} [bookTitle] - Título opcional do livro para atualizar a janela.
 */
export async function selectBook(bookPath, bookTitle = '') {
  
  if (!bookPath) return;

  // 1. Atualiza estado e persistência
  state.currentBookPath = bookPath;
  localStorage.setItem('last_selected_book', bookPath);

  // 2. Atualiza o elemento <select> no DOM para refletir a escolha
  const selectBookEl = document.getElementById('select-book');
  if (selectBookEl && selectBookEl.value !== bookPath) {
    selectBookEl.value = bookPath;
  }

  // 3. Atualiza o título da janela
  if (bookTitle) {
    updateWindowTitle(bookTitle);
  } else if (selectBookEl && selectBookEl.selectedIndex !== -1) {
    const selectedOption = selectBookEl.options[selectBookEl.selectedIndex];
    if (selectedOption) updateWindowTitle(selectedOption.innerText);
  }

  // 4. Reseta estado do editor e renderiza a nova árvore de arquivos
  resetEditorState();
  await renderTree();

  // 5. Verifica trava da IA
  checkAILock();

  // 6. Recarrega o histórico do Chat para o livro recém-selecionado
  await reloadChatForCurrentBook();
}

/**
 * Popula estritamente o elemento <select> com os livros disponíveis.
 * @returns {Promise<Array>} Lista de livros retornados pela API.
 */
export async function popularSelectDeLivros() {
  const selectBookEl = document.getElementById('select-book');
  if (!selectBookEl) return [];

  const books = await window.electronAPI.getBooksList();
  selectBookEl.innerHTML = '';

  if (!books || books.length === 0) {
    selectBookEl.innerHTML = '<option value="">Nenhum livro encontrado</option>';
    return [];
  }

  books.forEach((book) => {
    const option = document.createElement('option');
    option.value = book.fullPath;
    option.innerText = `${book.title}`;
    selectBookEl.appendChild(option);
  });

  return books;
}

/**
 * Restaura o último livro selecionado salvo no localStorage ou assume o primeiro da lista.
 * @param {Array} books - Lista de livros populados no select.
 */
export async function restoreLastSelectedBook(books = []) {
  if (!books || books.length === 0) return;

  const lastSelectedBook = localStorage.getItem('last_selected_book');
  const bookToLoad = books.find((b) => b.fullPath === lastSelectedBook) || books[0];

  console.log(`[BOOK SERVICE] Carregando livro: ${bookToLoad.title} (${bookToLoad.fullPath})`);

  await selectBook(bookToLoad.fullPath, bookToLoad.title);
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

/**
 * Verifica o arquivo config.json do livro atual para gerenciar a exibição do overlay de trava da IA
 * e o estado de leitura/escrita do editor.
 */
export async function checkAILock() {
  if (!state.currentBookPath) return;

  const configPath = `${state.currentBookPath}/config.json`;
  const text = await readFile(configPath);

  if (!text) return;

  try {
    const config = JSON.parse(text.content);

    if (config.ai_lock) {
      // 1. Exibe a mensagem de trava no overlay
      toggleEditorOverlay(true, 'ai-lock', 'A IA está processando e atualizando a história. Aguarde...', true);
      
      // 2. Bloqueia o editor durante o processamento
      setEditorReadOnly(true);
    } else {
      // 1. Remove a trava 'ai-lock' da pilha
      toggleEditorOverlay(false, 'ai-lock');

      // 2. Restaura o estado de escrita correto com base nas permissões do arquivo
      if (state.currentFileMetadata) {
        const isReadOnly = !state.currentFileMetadata.humanWrite;
        setEditorReadOnly(isReadOnly);
      } else {
        // Se nenhum arquivo estiver aberto, garante que fique desativado
        setEditorReadOnly(true);
      }
    }
  } catch (err) {
    // Silencia erro enquanto o arquivo está sendo gravado
    console.warn(`[BOOK SERVICE] Falha ao ler config.json: ${err.message}`);
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
 * Configura os eventos de interface específicos para gestão de livros.
 */
export function setupBookEvents() {
  const selectBookEl = document.getElementById('select-book');
  if (!selectBookEl) return;

  selectBookEl.addEventListener('change', async (e) => {
    const selectedPath = e.target.value;
    const selectedOption = selectBookEl.options[selectBookEl.selectedIndex];
    const selectedTitle = selectedOption ? selectedOption.innerText : '';

    await selectBook(selectedPath, selectedTitle);
  });
}