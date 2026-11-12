/**
 * @file Módulo do Provedor Gemini (Google).
 */

import { fetchModels, generateContent } from "./client.js";
import { normalizeHistory, runToolLoop } from "../../toolLoop.js";

/**
 * Envia o prompt ao Gemini (com function calling) e retorna a string de resposta final.
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
      "Chave de API do Gemini não configurada. Defina-a em Configurações.",
    );
  }

  const contents = normalizeHistory(prompt, history).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return runToolLoop({
    conversation: contents,
    toolContext,

    async callModel(conversation) {
      const data = await generateContent({
        apiKey: config.apiKey,
        model: config.model,
        system: systemPrompt,
        contents: conversation,
        tools: tools.getDefinitions(),
      });

      const content = data.candidates?.[0]?.content;
      if (!content) {
        const reason =
          data.promptFeedback?.blockReason ||
          data.candidates?.[0]?.finishReason ||
          "resposta vazia";
        throw new Error(`O Gemini não retornou conteúdo (${reason}).`);
      }

      // `parts` é reenviado intacto nas próximas rodadas (preserva assinaturas de raciocínio).
      const parts = content.parts || [];
      const u = data.usageMetadata || {};
      return {
        usage: {
          input: u.promptTokenCount || 0,
          output: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0),
        },
        raw: content,
        text: parts
          .filter((p) => p.text && !p.thought)
          .map((p) => p.text)
          .join(""),
        toolCalls: parts
          .filter((p) => p.functionCall)
          .map((p) => ({
            id: p.functionCall.id,
            name: p.functionCall.name,
            args: p.functionCall.args || {},
          })),
      };
    },

    appendToolResults(conversation, turn, results) {
      conversation.push(turn.raw);
      conversation.push({
        role: "user",
        parts: results.map((r) => ({
          functionResponse: {
            name: r.call.name,
            ...(r.call.id ? { id: r.call.id } : {}),
            response: r.isError ? { error: r.output } : { result: r.output },
          },
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
