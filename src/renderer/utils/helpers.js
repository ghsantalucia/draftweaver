/**
 * @file Funções auxiliares genéricas para apoio à interface do usuário, controle de menus e normalizações.
 */

import { DEFAULT_TREE_METADATA } from "../core/state.js";

/**
 * Garante que todas as chaves obrigatórias do objeto de metadados existam com valores padrão (fallbacks).
 * @param {Object} rawMetadata Metadados lidos do YAML
 * @param {string} fallbackTitle Título alternativo caso não informado
 * @returns {Object} Metadados normalizados
 */
export function normalizeItemMetadata(rawMetadata, fallbackTitle = "") {
  const metadata = {
    ...DEFAULT_TREE_METADATA,
    ...rawMetadata,
  };

  if (!metadata.title) {
    metadata.title = fallbackTitle;
  }

  return metadata;
}

/**
 * Normaliza caminhos de arquivo para evitar quebras em seletores CSS ou chamadas do Node/IPC.
 */
export function normalizePath(p) {
  return (p || "").replace(/\\/g, "/");
}

/**
 * Transforma um caminho completo em um caminho relativo a partir da pasta 'books',
 * garantindo que a pasta do livro imediatamente abaixo de 'books' comece com 'book_'.
 * @param {string} fullPath - O caminho completo do arquivo.
 * @returns {string|null} O caminho relativo ou null caso o formato seja inválido.
 */
export function getRelativePath(fullPath) {
  if (!fullPath) return null;

  const normalizedPath = fullPath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");
  const booksIndex = parts.indexOf("books");

  if (booksIndex === -1 || booksIndex + 1 >= parts.length) {
    return null;
  }

  const bookFolderName = parts[booksIndex + 1];
  if (!bookFolderName || !bookFolderName.startsWith("book_")) {
    return null;
  }

  // Retorna tudo após a pasta 'books'
  return parts.slice(booksIndex + 1).join("/");
}

/**
 * Utilitário simples para sanitizar textos HTML.
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
