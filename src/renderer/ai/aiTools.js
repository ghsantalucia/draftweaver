/**
 * @file Define as ferramentas, funções auxiliares e utilitários integrados para uso dos modelos de Inteligência Artificial.
 * Para adicionar uma ferramenta, crie um módulo em /ai/tools com `registerXTools(registry)` e chame-o aqui.
 */

import { ToolRegistry } from "./tools/registry.js";
import { registerBookTools } from "./tools/bookTools.js";
import { registerSkillTools } from "./tools/skillTools.js";

export const toolRegistry = new ToolRegistry();

registerBookTools(toolRegistry);
registerSkillTools(toolRegistry);
