/**
 * @file Cliente HTTP da API Gemini (generateContent).
 */

import { GEMINI_API_BASE, GEMINI_MAX_OUTPUT_TOKENS } from "./config.js";

/** Modelos que não servem para chat de texto. */
const EXCLUDED_MODELS =
  /(image|tts|embedding|live|audio|robotics|computer-use|aqa)/i;

/**
 * Lê o JSON da resposta e lança um erro legível se a API falhou.
 * @param {Response} response
 */
async function parseResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message || response.statusText;
    throw new Error(`Gemini API (${response.status}): ${detail}`);
  }
  return data;
}

/**
 * Chama generateContent.
 * @param {Object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {string} params.system - Instrução de sistema.
 * @param {Array} params.contents - Conversa no formato Gemini.
 * @param {Array<{name: string, description: string, parameters: Object}>} [params.tools]
 * @returns {Promise<Object>} Resposta crua.
 */
export async function generateContent({
  apiKey,
  model,
  system,
  contents,
  tools = [],
}) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
  };
  if (tools.length > 0) {
    // O Gemini rejeita objetos de parâmetros sem propriedades: omite `parameters` nesses casos.
    const functionDeclarations = tools.map(
      ({ name, description, parameters }) => ({
        name,
        description,
        ...(Object.keys(parameters?.properties || {}).length > 0
          ? { parameters }
          : {}),
      }),
    );
    body.tools = [{ functionDeclarations }];
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    },
  );
  return parseResponse(response);
}

/**
 * Lista os modelos Gemini que suportam generateContent.
 * @param {string} apiKey
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function fetchModels(apiKey) {
  const response = await fetch(`${GEMINI_API_BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": apiKey },
  });
  const data = await parseResponse(response);

  return (data?.models || [])
    .filter(
      (m) =>
        m.name.startsWith("models/gemini") &&
        m.supportedGenerationMethods?.includes("generateContent") &&
        !EXCLUDED_MODELS.test(m.name),
    )
    .map((m) => {
      const id = m.name.replace(/^models\//, "");
      return {
        id,
        label: m.displayName || id,
        contextWindow: m.inputTokenLimit || undefined,
      };
    });
}
