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

    console.log("[BookHandler] Lista de livros atualizada:", booksArray);
    return booksArray;
  } catch (error) {
    console.error("[BookHandler] Erro ao buscar livros:", error);
    return false;
  }
}

/**
 * Manipula a abertura/fechamento de pastas na árvore, atualizando o estado do livro atual.
 * @param {Object} state - Instância do estado global.
 * @param {Object} bookService - Instância do serviço de livros.
 * @param {Object} payload - Dados do evento (contém path e status).
 */
export function onFolderToggle(state, bookService, payload) {
  if (!state.currentBookPath || !state.bookList) return;

  // Encontra o objeto do livro atual na lista
  const currentBook = state.bookList.find(
    (book) => book.fullPath === state.currentBookPath,
  );
  if (!currentBook) return;

  // Cada um cuida do seu: garante o container e o array de pastas abertas
  currentBook.explorer_state = currentBook.explorer_state || {};
  if (!Array.isArray(currentBook.explorer_state.open_folders)) {
    currentBook.explorer_state.open_folders = [];
  }

  const folderPath = payload.path || payload.data?.path;
  const status = payload.status || payload.data?.status; // "open" ou "collapsed"

  if (!folderPath) return;

  const openFolders = currentBook.explorer_state.open_folders;
  const index = openFolders.indexOf(folderPath);

  if (status === "open" && index === -1) {
    // Adiciona se abriu e ainda não estava na lista
    openFolders.push(folderPath);
  } else if (status === "collapsed" && index !== -1) {
    // Remove se fechou e estava na lista
    openFolders.splice(index, 1);
  }

  // Persiste as alterações chamando o bookService
  if (typeof bookService.updateConfig === "function") {
    bookService.updateConfig();
  }
}

/**
 * Manipula a alteração do modo avançado, atualizando o estado do livro atual e persistindo.
 * @param {Object} state - Instância do estado global.
 * @param {Object} bookService - Instância do serviço de livros.
 * @param {Object} payload - Dados do evento gerados pelo dispatcher declarativo.
 */
export function onAdvancedModeToggle(state, bookService, payload) {
  if (!state.currentBookPath || !state.bookList) return;

  const currentBook = state.bookList.find(
    (book) => book.fullPath === state.currentBookPath,
  );
  if (!currentBook) return;

  // Cada um cuida do seu: garante apenas a estrutura explorer_state
  currentBook.explorer_state = currentBook.explorer_state || {};

  // O initDeclarativeEvents já extrai o boolean do checkbox em payload.value,
  // mas mantemos o fallback para payload.target.checked por segurança.
  const isAdvanced =
    payload.value !== null && payload.value !== undefined
      ? payload.value
      : payload.target?.checked;

  if (typeof isAdvanced === "boolean") {
    currentBook.explorer_state.advanced_mode = isAdvanced;
  }

  // Persiste as alterações no config.json do livro
  if (typeof bookService.updateConfig === "function") {
    bookService.updateConfig();
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
  // console.log("1--------------", filePath);

  // Normaliza barras para evitar problemas entre Windows (\) e Linux/Mac (/)
  const normBook = bookPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const normFile = filePath ? filePath.replace(/\\/g, "/") : null;

  // O arquivo pertence ao livro se o caminho do arquivo começa com o caminho do livro
  filePath = normFile && !normFile.startsWith(normBook + "/") ? null : filePath;
  // console.log("2--------------", filePath);
  state.currentBookPath = bookPath;
  state.currentFilePath = filePath;
  // console.log("3--------------", state.currentFilePath);
  uiBus.emit("book:changed", bookPath);
}

/**
 * Manipula a alteração de livro, atualizando o estado global, resetando o editor
 * e restaurando o último arquivo aberto (se houver) salvo no config.json.
 * @param {string} bookPath - Caminho completo do livro selecionado.
 * @param {Object} state - Instância do estado global.
 * @param {Object} uiBus - Barramento de eventos da interface.
 * @returns {void}
 */
export function onBookChange(bookPath, state) {
  if (!bookPath || !state || !state.bookList) return;

  // 1. Atualiza o livro atual no state
  state.currentBookPath = bookPath;

  // 2. Localiza o objeto do livro na lista para ler suas configurações salvas
  const currentBook = state.bookList.find((book) => book.fullPath === bookPath);

  // 3. Reseta o editor por segurança, limpando o arquivo anterior
  if (uiBus) {
    uiBus.emit("editor:reset");
  }

  // 4. Se o livro possui um arquivo salvo anteriormente, restaura-o
  const lastOpenedFile = currentBook?.explorer_state?.open_file;

  if (lastOpenedFile && uiBus) {
    // Dispara a abertura do arquivo no editor
    uiBus.emit("editor:open-file", { path: lastOpenedFile });
  }
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
