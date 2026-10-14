/**
 * @file Handler para gerenciar alterações no arquivo config.json dos projetos.
 */

import { uiBus } from "../../events/uiBus.js";
import { domainBus } from "../../events/domainBus.js";
import { normalizePath } from "../../utils/helpers.js";
import * as bookHandler from "./bookHandler.js";

export async function onConfigChanged(payload, state, bookService) {
  const bookList = await bookHandler.fetchBooks(state, bookService);

  //
  const pertenceAoLivro = normalizePath(payload.filePath).includes(
    normalizePath(state.currentBookPath),
  );

  if (pertenceAoLivro) {
    const currentBookConfig = bookList.find(
      (b) => b.fullPath === state.currentBookPath,
    );
    //config.onConfigChanged(currentBookConfig);
    console.log(currentBookConfig);

    onCurrentConfigChanged(state, currentBookConfig);
  } else {
    // config secundário
  }
}

/**
 * Processa a alteração de um arquivo config.json do projeto atual detectada no sistema de arquivos.
 * @param {Object} state - Estado global da aplicação.
 * @param {Object|string} config - Conteúdo parseado do config.json ou string JSON.
 */
export async function onCurrentConfigChanged(state, config) {
  try {
    if (!state || !config) return;

    const { book_title, ai_lock } = config;

    // 1. Sempre que QUALQUER config.json mudar, atualizamos a lista de livros da sidebar
    // para garantir que se o título de um livro fechado mudou, o <select> reflita isso.
    uiBus.emit("books:refresh-list");

    // Título do livro atual
    if (book_title !== undefined && book_title !== state.currentBookTitle) {
      state.currentBookTitle = book_title;
      const payload = { title: book_title, filePath: state.currentBookPath };

      // Dispara em ambos os barramentos para desacoplar domínio e UI
      domainBus.emit("book:title-changed", payload);
      uiBus.emit("book:title-changed", payload);
    }

    // Lock de IA do livro atual
    if (ai_lock) {
      uiBus.emit("book:ai-locked");
    } else {
      uiBus.emit("book:ai-unlocked");
    }
  } catch (err) {
    console.error(
      "[ConfigHandler] Erro ao processar alteração do config.json:",
      err,
    );
  }
}
