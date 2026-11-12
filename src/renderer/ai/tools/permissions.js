/**
 * @file Resolução de arquivos do livro e verificação de permissões da IA (aiRead / aiWrite).
 *
 * As permissões ficam no frontmatter de cada .md (o disco é a fonte da verdade,
 * por isso a árvore é relida a cada chamada). A flag do próprio arquivo é a que vale:
 * o `folder.yml` descreve a pasta, não restringe os arquivos dentro dela.
 */

import { normalizePath } from "../../utils/helpers.js";

/**
 * Valida um caminho relativo à raiz do livro e o divide em segmentos.
 * Tolera `./`, barra inicial e caminhos absolutos que apontem para dentro do livro.
 * @param {string} relPath
 * @param {string} [bookPath] - Caminho absoluto do livro (para aceitar caminhos absolutos).
 * @returns {string[]}
 */
export function parseRelativePath(relPath, bookPath = "") {
  let normalized = normalizePath(String(relPath || "")).trim();
  const book = normalizePath(bookPath).replace(/\/+$/, "");

  if (book && normalized.toLowerCase().startsWith(`${book.toLowerCase()}/`)) {
    normalized = normalized.slice(book.length + 1);
  }

  const segments = normalized
    .split("/")
    .filter((segment) => segment && segment !== ".");
  const last = segments[segments.length - 1] || "";

  if (
    segments.length === 0 ||
    segments.some((s) => s === ".." || s.startsWith(".")) ||
    /^[a-z]:$/i.test(segments[0])
  ) {
    throw new Error(
      `Caminho inválido: "${relPath}". Use caminhos relativos à raiz do livro (ex: content/plot.md).`,
    );
  }
  if (!/\.md$/i.test(last)) {
    throw new Error("Apenas arquivos .md podem ser acessados.");
  }
  return segments;
}

/**
 * Localiza um arquivo .md na árvore do livro atual.
 * @param {Object} state
 * @param {string} relPath
 * @returns {Promise<{relPath: string, title: string, originalPath: string, isTemp: boolean, metadata: Object}>}
 */
export async function locateFile(state, relPath) {
  if (!state.currentBookPath) throw new Error("Nenhum livro selecionado.");

  const segments = parseRelativePath(relPath, state.currentBookPath);
  const tree = await window.electronAPI.getTree(
    normalizePath(state.currentBookPath),
  );
  if (!tree) throw new Error("Não foi possível ler a estrutura do livro.");

  let node = tree;
  for (const folderName of segments.slice(0, -1)) {
    node = node.folders?.[folderName];
    if (!node) throw new Error(`Arquivo não encontrado: ${relPath}`);
  }

  const fileKey = segments[segments.length - 1].replace(/\.md$/i, "");
  const file = node.files?.[fileKey];
  if (!file || !/\.md(\.temp)?$/i.test(file.originalPath || "")) {
    throw new Error(`Arquivo não encontrado: ${relPath}`);
  }

  return {
    relPath: segments.join("/"),
    title: file.metadata?.title || fileKey,
    originalPath: file.originalPath,
    isTemp: Boolean(file.isTemp),
    metadata: file.metadata || {},
  };
}

/**
 * Indica se a IA possui a permissão ("aiRead" | "aiWrite") sobre o arquivo.
 * @param {{metadata: Object}} located
 * @param {"aiRead"|"aiWrite"} flag
 * @returns {boolean}
 */
export function hasPermission(located, flag) {
  const value = located.metadata?.[flag];
  return value === true || value === "true";
}

/**
 * Lança erro se a IA não tiver a permissão necessária.
 * @param {{metadata: Object, relPath: string, title: string}} located
 * @param {"aiRead"|"aiWrite"} flag
 */
export function assertPermission(located, flag) {
  if (!hasPermission(located, flag)) {
    const action = flag === "aiRead" ? "leitura" : "escrita";
    throw new Error(
      `Acesso negado: o autor não permitiu ${action} da IA no arquivo "${located.title}" (${flag} está desativado).`,
    );
  }
}
