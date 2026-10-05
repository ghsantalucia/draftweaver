/**
 * @file Handler dos eventos relacionados ao livro/projeto
 */

import { uiBus } from "../../events/uiBus.js";
import { domainBus } from "../../events/domainBus.js";

export async function fetchBooks(state, bookService) {
  try {
    // Busca os dados puros no backend
    const books = await bookService.getBooksList();

    // Garante o array de forma segura
    const booksArray = Array.isArray(books) ? books : books?.books || [];

    state.bookList = booksArray;
    if (!state.currentBookPath) state.currentBookPath = booksArray[0].fullPath;

    return booksArray;
  } catch (error) {
    console.error("[BookHandler] Erro ao buscar livros:", error);
    return false;
  }
}

/**
 * Handler de troca de livro.
 * @param {State} state - Instância do gerenciador de estado global da aplicação.
 * @param {string} bookPath - Caminho completo do livro selecionado.
 */
export function onBookSelect(state, bookPath) {
  localStorage.setItem("last_selected_book", bookPath);

  let filePath = state.currentFilePath || null;
  console.log("1--------------", filePath);

  // Normaliza barras para evitar problemas entre Windows (\) e Linux/Mac (/)
  const normBook = bookPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const normFile = filePath ? filePath.replace(/\\/g, "/") : null;

  // O arquivo pertence ao livro se o caminho do arquivo começa com o caminho do livro
  filePath = normFile && !normFile.startsWith(normBook + "/") ? null : filePath;
  console.log("2--------------", filePath);
  state.currentBookPath = bookPath;
  state.currentFilePath = filePath;
  console.log("3--------------", state.currentFilePath);
  uiBus.emit("book:changed", bookPath);
}

/**
 * Solicita lista de livros do backend e também confere qual o último livro selecionado.
 * @async
 * @param {Object} bookService - Serviço responsável por se comunicar com a API do Electron para gerenciar livros.
 * @returns {Promise<void>}
 */
export async function onFetchBooksList(req, bookService) {
  const booksArray = await bookService.getBooksList();

  if (booksArray.length === 0) {
    console.warn("[BookHandler] Nenhum livro retornado ou formato inválido.");
    return;
  } else {
    req.reply({ books: booksArray });
  }
}
