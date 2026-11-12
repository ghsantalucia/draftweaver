/**
 * @file Cliente HTTP da API da Anthropic.
 */

import {
  CLAUDE_API_URL,
  CLAUDE_API_VERSION,
  CLAUDE_MAX_TOKENS,
  CLAUDE_MODELS_URL,
} from "./config.js";

/**
 * Cabeçalhos comuns às chamadas.
 * @param {string} apiKey
 */
function buildHeaders(apiKey) {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": CLAUDE_API_VERSION,
    // Necessário para chamadas feitas a partir do renderer (contexto de navegador).
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

/**
 * Lê o JSON da resposta e lança um erro legível se a API falhou.
 * @param {Response} response
 */
async function parseResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message || response.statusText;
    throw new Error(`Claude API (${response.status}): ${detail}`);
  }
  return data;
}

/**
 * Envia uma requisição à Messages API.
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {string} params.system - Prompt de sistema.
 * @param {Array} params.messages - Mensagens no formato da API.
 * @param {Array<{name: string, description: string, parameters: Object}>} [params.tools]
 * @returns {Promise<Object>} Resposta crua (`content` é uma lista de blocos).
 */
export async function createMessage({
  apiKey,
  model,
  system,
  messages,
  tools = [],
}) {
  const body = { model, max_tokens: CLAUDE_MAX_TOKENS, system, messages };
  if (tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

/**
 * Lista os modelos disponíveis para a chave informada.
 * @param {string} apiKey
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function fetchModels(apiKey) {
  const response = await fetch(`${CLAUDE_MODELS_URL}?limit=100`, {
    headers: buildHeaders(apiKey),
  });
  const data = await parseResponse(response);
  return (data?.data || []).map((m) => ({
    id: m.id,
    label: m.display_name || m.id,
    contextWindow: m.max_input_tokens || undefined,
  }));
}
