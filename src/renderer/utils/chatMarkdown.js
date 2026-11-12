/**
 * @file Conversão segura de Markdown (respostas da IA) em HTML para o chat.
 */

import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Converte Markdown em HTML sanitizado (qualquer HTML cru vindo da IA é filtrado).
 * @param {string} markdown
 * @returns {string}
 */
export function renderChatMarkdown(markdown) {
  const html = marked.parse(markdown || "", { gfm: true, breaks: true });
  return DOMPurify.sanitize(html);
}
