/**
 * @file Monta o prompt de sistema único, reutilizado por todos os provedores de IA.
 */

import basePrompt from "./systemPrompt.md?raw";
import { listSkills } from "../skills/index.js";

/**
 * Prompt base (arquivo único) + contexto atual do app (livro, arquivo aberto e skills).
 * @param {Object} state - Estado global da aplicação.
 * @returns {string}
 */
export function buildSystemPrompt(state) {
  const lines = [basePrompt.trim(), "", "## Contexto atual"];

  const bookTitle = state.currentBookMetadata?.book_title;
  lines.push(`- Livro: ${bookTitle || "(nenhum livro selecionado)"}`);

  if (state.currentFilePath && state.currentBookPath) {
    const norm = (p) => p.replace(/\\/g, "/");
    const book = norm(state.currentBookPath).replace(/\/$/, "");
    const file = norm(state.currentFilePath).replace(/\.temp$/, "");
    if (file.startsWith(`${book}/`)) {
      lines.push(`- Arquivo aberto no editor: ${file.slice(book.length + 1)}`);
    }
  }

  const skills = listSkills();
  if (skills.length > 0) {
    lines.push("", "## Skills disponíveis (use `load_skill` para carregar)");
    skills.forEach((s) => lines.push(`- ${s.name}: ${s.description}`));
  }

  return lines.join("\n");
}
