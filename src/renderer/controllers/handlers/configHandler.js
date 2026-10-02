/**
 * @file Handler para gerenciar alterações no arquivo config.json dos projetos.
 */

import { uiBus } from "../../events/uiBus.js";
import { domainBus } from "../../events/domainBus.js";

/**
 * Processa a alteração de um arquivo config.json detectada no sistema de arquivos.
 * @param {Object} state - Estado global da aplicação.
 * @param {string} filePath - Caminho absoluto do config.json alterado.
 * @param {string} relativePath - Caminho relativo do arquivo.
 * @param {Object|string} fileContent - Conteúdo parseado do config.json ou string JSON.
 */
export async function onConfigChanged(
  state,
  filePath,
  relativePath,
  fileContent,
) {
  try {
    if (!state) return;

    const config =
      typeof fileContent === "string" ? JSON.parse(fileContent) : fileContent;
    if (!config) return;

    const { book_title, ai_lock } = config;

    // 1. Sempre que QUALQUER config.json mudar, atualizamos a lista de livros da sidebar
    // para garantir que se o título de um livro fechado mudou, o <select> reflita isso.
    uiBus.emit("books:refresh-list");

    // 2. Verifica se o config alterado pertence estritamente ao projeto atualmente aberto
    const isCurrentBook =
      state.currentBookPath && filePath.includes(state.currentBookPath);
    if (!isCurrentBook) {
      console.log(
        "[ConfigHandler] Config alterado pertence a um projeto em segundo plano:",
        relativePath,
      );
      return;
    }

    // 3. Processamentos exclusivos para o projeto ATUAL:

    // Título do livro atual
    if (book_title !== undefined && book_title !== state.currentBookTitle) {
      state.currentBookTitle = book_title;
      const payload = { title: book_title, filePath };

      // Dispara em ambos os barramentos para desacoplar domínio e UI
      domainBus.emit("book:title-changed", payload);
      uiBus.emit("book:title-changed", payload);
    }

    // Lock de IA do livro atual
    if (ai_lock !== undefined && ai_lock !== state.aiLockState) {
      state.aiLockState = ai_lock;

      const lockEvent = ai_lock ? "book:ai-locked" : "book:ai-unlocked";
      const payload = { aiLock: ai_lock, filePath };

      uiBus.emit(lockEvent, payload);
    }
  } catch (err) {
    console.error(
      "[ConfigHandler] Erro ao processar alteração do config.json:",
      err,
    );
  }
}
