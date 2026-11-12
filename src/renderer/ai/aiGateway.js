/**
 * @file Roteador dinâmico de provedores de IA.
 */

import { getProviderInfo } from "./providers/index.js";
import { buildSystemPrompt } from "./prompts/index.js";
import { toolRegistry } from "./aiTools.js";

/**
 * Processa a instrução enviada direcionando para a pasta do provedor ativo no State.
 * O prompt de sistema (arquivo único) e as ferramentas são os mesmos para todos os provedores.
 * @param {Object} params
 * @param {string} params.prompt - Texto/instrução simples enviada.
 * @param {Array} [params.history=[]] - Histórico bruto de conversas.
 * @param {Object} state - Estado global da aplicação.
 * @param {Object} toolContext - Contexto repassado às ferramentas (state, fileService).
 * @returns {Promise<string>} Texto final retornado pelo provedor.
 */
export async function processPrompt(
  { prompt, history = [] },
  state,
  toolContext,
) {
  const providerName = state.aiProvider;
  const info = getProviderInfo(providerName);

  if (!info) {
    throw new Error(
      `Provedor de IA "${providerName}" inválido. Selecione um em Configurações.`,
    );
  }

  try {
    // Import dinâmico com base na pasta do provedor
    const providerModule = await import(`./providers/${providerName}/index.js`);

    if (typeof providerModule.sendRequest !== "function") {
      throw new Error(
        `O provedor "${providerName}" não exporta o método "sendRequest".`,
      );
    }

    const saved = state.aiSettings?.providers?.[providerName] || {};
    const config = { ...saved, model: saved.model || info.defaultModel };

    return await providerModule.sendRequest({
      prompt,
      history,
      config,
      systemPrompt: buildSystemPrompt(state),
      tools: toolRegistry,
      toolContext,
    });
  } catch (error) {
    console.error(
      `[AI GATEWAY] Erro ao carregar/executar o provedor "${providerName}":`,
      error,
    );
    throw error;
  }
}
