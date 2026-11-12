/**
 * @file Módulo do Provedor Claude (Anthropic).
 */

import { fetchModels, createMessage } from "./client.js";
import { normalizeHistory, runToolLoop } from "../../toolLoop.js";

/**
 * Envia o prompt ao Claude (com tool calling) e retorna a string de resposta final.
 * @param {Object} params
 * @param {string} params.prompt
 * @param {Array} [params.history=[]]
 * @param {Object} params.config - Configuração do provedor (apiKey, model).
 * @param {string} params.systemPrompt
 * @param {import('../../tools/registry.js').ToolRegistry} params.tools
 * @param {Object} params.toolContext
 * @returns {Promise<{text: string, usage: import("../../toolLoop.js").TokenUsage}>}
 */
export async function sendRequest({
  prompt,
  history = [],
  config,
  systemPrompt,
  tools,
  toolContext,
}) {
  if (!config.apiKey) {
    throw new Error(
      "Chave de API do Claude não configurada. Defina-a em Configurações.",
    );
  }

  return runToolLoop({
    conversation: normalizeHistory(prompt, history),
    toolContext,

    async callModel(messages) {
      const data = await createMessage({
        apiKey: config.apiKey,
        model: config.model,
        system: systemPrompt,
        messages,
        tools: tools.getDefinitions(),
      });

      const blocks = data.content || [];
      const u = data.usage || {};
      return {
        usage: {
          input:
            (u.input_tokens || 0) +
            (u.cache_creation_input_tokens || 0) +
            (u.cache_read_input_tokens || 0),
          output: u.output_tokens || 0,
        },
        raw: blocks,
        text: blocks
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join(""),
        toolCalls: blocks
          .filter((b) => b.type === "tool_use")
          .map((b) => ({ id: b.id, name: b.name, args: b.input })),
      };
    },

    appendToolResults(messages, turn, results) {
      messages.push({ role: "assistant", content: turn.raw });
      messages.push({
        role: "user",
        content: results.map((r) => ({
          type: "tool_result",
          tool_use_id: r.call.id,
          content: r.output,
          is_error: r.isError,
        })),
      });
    },
  });
}

/**
 * Lista os modelos disponíveis na conta (usado para atualizar o select).
 * @param {Object} config - Configuração do provedor (apiKey).
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export function listModels(config) {
  return fetchModels(config.apiKey);
}
