/**
 * @file Handler dos eventos relacionados ao livro/projeto
 */

import { uiBus } from "../../events/uiBus.js";
import { domainBus } from "../../events/domainBus.js";

/**
 * Handler de troca de livro.
 * @param {State} state - Instância do gerenciador de estado global da aplicação.
 * @param {string} bookPath - Caminho completo do livro selecionado.
 */
export function onBookSelect(state, bookPath) {
  localStorage.setItem("last_selected_book", bookPath);

  state.currentBookPath = bookPath;

  uiBus.emit("book:changed", bookPath);
}

/**
 * Solicita lista de livros do backend e também confere qual o último livro selecionado.
 * @async
 * @param {Object} bookService - Serviço responsável por se comunicar com a API do Electron para gerenciar livros.
 * @returns {Promise<void>}
 */
export async function onFetchBooks(req, state, bookService) {
  try {
    // Busca os dados puros no backend
    const books = await bookService.getBooksList();

    // Garante o array de forma segura
    const booksArray = Array.isArray(books) ? books : books?.books || [];

    if (booksArray.length === 0) {
      console.warn("[BookHandler] Nenhum livro retornado ou formato inválido.");
      return;
    } else {
      req.reply({ books: booksArray });
    }

    state.bookList = booksArray;
  } catch (error) {
    console.error("[BookHandler] Erro ao buscar livros:", error);
  }
}
