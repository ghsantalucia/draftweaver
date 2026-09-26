/**
 * @file Handler dos eventos relacionados ao livro/projeto
 */

import { uiBus } from '../../events/uiBus.js';
import { domainBus } from '../../events/domainBus.js';


/**
 * Handler de troca de livro.
 * @param {State} state - Instância do gerenciador de estado global da aplicação.
 * @param {string} bookPath - Caminho completo do livro selecionado.
 */
export function onBookSelect(state, bookPath) {

    localStorage.setItem('last_selected_book', bookPath);

    state.currentBookPath = bookPath;

    uiBus.emit('book:changed', bookPath);
}

/**
 * Solicita lista de livros do backend e também confere qual o último livro selecionado.
 * @async
 * @param {Object} bookService - Serviço responsável por se comunicar com a API do Electron para gerenciar livros.
 * @returns {Promise<void>}
 */
export async function onFetchBooks(bookService) {
    try {
        // 1. Busca os dados puros no backend
        const books = await bookService.getBooksList();

        // 2. Emite um evento dizendo que os livros chegaram
        uiBus.emit('books:list-loaded', { books });

        // 3. Garante o array de forma segura
        const booksArray = Array.isArray(books) ? books : (books?.books || []);

        if (booksArray.length === 0) {
            console.warn("[BookHandler] Nenhum livro retornado ou formato inválido.");
            return;
        }

        // 4. Seleção inicial (usando booksArray em vez de books)
        const lastSelected = localStorage.getItem('last_selected_book');
        const bookToLoad = booksArray.find(b => b.fullPath === lastSelected) || booksArray[0];

        if (bookToLoad) {
            uiBus.emit('book:selected', bookToLoad.fullPath);
        }

    } catch (error) {
        console.error("[BookHandler] Erro ao buscar livros:", error);
    }
}