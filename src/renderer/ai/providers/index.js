/**
 * @file Catálogo dos provedores de IA disponíveis (usado para montar os selects das configurações).
 * Cada `id` corresponde a uma pasta em /ai/providers que exporta `sendRequest`
 * e, opcionalmente, `listModels`.
 */

import { CLAUDE_MODELS, CLAUDE_DEFAULT_MODEL } from "./claude/models.js";
import { MOCK_MODELS, MOCK_DEFAULT_MODEL } from "./mock/models.js";
import { GEMINI_MODELS, GEMINI_DEFAULT_MODEL } from "./gemini/models.js";

/**
 * @typedef {Object} AiProviderInfo
 * @property {string} id - Nome da pasta do provedor.
 * @property {string} label - Nome exibido na interface.
 * @property {Array<{id: string, label: string}>} models - Modelos padrão do select.
 * @property {string} defaultModel
 * @property {boolean} requiresKey - Se o provedor exige chave de API.
 */

/** @type {AiProviderInfo[]} */
export const AI_PROVIDERS = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    models: CLAUDE_MODELS,
    defaultModel: CLAUDE_DEFAULT_MODEL,
    requiresKey: true,
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    models: GEMINI_MODELS,
    defaultModel: GEMINI_DEFAULT_MODEL,
    requiresKey: true,
  },
  {
    id: "mock",
    label: "Mock (apenas testes)",
    models: MOCK_MODELS,
    defaultModel: MOCK_DEFAULT_MODEL,
    requiresKey: false,
  },
];

export const DEFAULT_AI_PROVIDER = "claude";

/**
 * @param {string} id
 * @returns {AiProviderInfo|undefined}
 */
export function getProviderInfo(id) {
  return AI_PROVIDERS.find((p) => p.id === id);
}
