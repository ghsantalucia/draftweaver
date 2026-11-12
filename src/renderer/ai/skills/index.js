/**
 * @file Registro de skills: pacotes de instruções em Markdown carregados sob demanda pela IA.
 *
 * Para adicionar uma skill, crie um arquivo `.md` nesta pasta com o frontmatter:
 *   ---
 *   name: nome-da-skill
 *   description: quando usar esta skill
 *   ---
 * O corpo do arquivo são as instruções. O nome e a descrição entram no prompt do
 * sistema; o corpo só é enviado quando a IA chama a ferramenta `load_skill`.
 */

import { parseMarkdown } from "../../utils/markdown.js";

const rawSkills = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** @type {Map<string, {name: string, description: string, body: string}>} */
const skills = new Map();

for (const raw of Object.values(rawSkills)) {
  const { metadata, body } = parseMarkdown(raw);
  if (!metadata.name) continue;
  skills.set(metadata.name, {
    name: metadata.name,
    description: metadata.description || "",
    body: body.trim(),
  });
}

/**
 * Lista as skills disponíveis (sem o corpo).
 * @returns {Array<{name: string, description: string}>}
 */
export function listSkills() {
  return [...skills.values()].map(({ name, description }) => ({
    name,
    description,
  }));
}

/**
 * Obtém uma skill pelo nome.
 * @param {string} name
 * @returns {{name: string, description: string, body: string}|undefined}
 */
export function getSkill(name) {
  return skills.get(name);
}
