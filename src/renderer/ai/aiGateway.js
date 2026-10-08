/**
 * @file Roteador dinâmico de provedores de IA.
 */

/**
 * Processa a instrução enviada direcionando para a pasta do provedor ativo no State.
 * @param {Object} params
 * @param {string} params.prompt - Texto/instrução simples enviada.
 * @param {Array} [params.history=[]] - Histórico bruto de conversas.
 * @returns {Promise<string|Object>} Resposta crua retornada pelo provedor.
 */
export async function processPrompt({ prompt, history = [] }, state) {
  const providerName = state.aiProvider || "mock";

  try {
    // Import dinâmico com base na pasta do provedor
    const providerModule = await import(`./providers/${providerName}/index.js`);

    if (typeof providerModule.sendRequest !== "function") {
      throw new Error(
        `O provedor "${providerName}" não exporta o método "sendRequest".`,
      );
    }

    return await providerModule.sendRequest({ prompt, history });
  } catch (error) {
    console.error(
      `[AI GATEWAY] Erro ao carregar/executar o provedor "${providerName}":`,
      error,
    );
    throw error;
  }
}
