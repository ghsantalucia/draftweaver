/**
 * @file Módulo do Provedor Simulado (Mock)
 */

const MOCK_RESPONSES = [
  "Anotei sua ideia! Posso estruturar um resumo detalhado ou ajustar este trecho se você desejar.",
  "Analisando a estrutura da sua narrativa, este desenvolvimento traz um bom ritmo para a trama.",
  "Excelente direcionamento. Gostaria que eu sugerisse alguns diálogos para apoiar este ponto?",
];

/**
 * Simula a chamada de rede e retorna apenas a string de resposta crua.
 * @param {Object} params
 * @param {string} params.prompt
 * @returns {Promise<string>}
 */
export async function sendRequest({ prompt }) {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const randomIndex = Math.floor(Math.random() * MOCK_RESPONSES.length);
  return MOCK_RESPONSES[randomIndex];
}
