/**
 * @file Ferramenta que carrega skills (instruções) sob demanda.
 */

import { getSkill, listSkills } from "../skills/index.js";

/**
 * @param {import('./registry.js').ToolRegistry} registry
 */
export function registerSkillTools(registry) {
  registry.register({
    name: "load_skill",
    description:
      "Carrega as instruções completas de uma skill listada no contexto. Use antes de executar a tarefa correspondente.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome da skill." },
      },
      required: ["name"],
    },
    async execute({ name }) {
      const skill = getSkill(name);
      if (!skill) {
        const names = listSkills()
          .map((s) => s.name)
          .join(", ");
        throw new Error(`Skill "${name}" não existe. Disponíveis: ${names}`);
      }
      return skill.body;
    },
  });
}
