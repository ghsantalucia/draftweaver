/**
 * @file Provedor simulado (Mock) para desenvolvimento e testes locais da IA.
 */

import { executeAiTool } from "../aiTools.js";

/**
 * Respostas pré-definidas para simulação da IA em modo texto.
 */
const MOCK_RESPONSES = [
  "Anotei sua ideia! Posso estruturar um resumo detalhado ou ajustar este trecho do capítulo se você desejar.",
  "Analisando a estrutura da sua narrativa, este desenvolvimento traz um bom ritmo para a trama.",
  "Excelente direcionamento. Gostaria que eu sugerisse alguns diálogos ou desdobramentos de cena para apoiar este ponto?",
  "Com base nos personagens cadastrados no seu projeto, essa decisão gera um conflito interno interessante para o protagonista.",
];

/**
 * Simula uma requisição enviada ao provedor de IA.
 * @param {Object} params
 * @param {string} params.prompt - Mensagem/instrução enviada pelo usuário.
 * @param {Array} [params.history=[]] - Histórico de mensagens anteriores.
 * @returns {Promise<{role: string, content: string, toolCall?: Object}>} Resposta processada pela IA.
 */
export async function sendMockRequest({ prompt, history = [] }) {
  // Simula o tempo de latência de resposta da rede (1.2s)
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const lowerPrompt = prompt.toLowerCase();

  // Exemplo de simulação de Function Calling:
  // Se o usuário pedir para criar ou ajustar algo específico
  if (
    lowerPrompt.includes("criar capitulo") ||
    lowerPrompt.includes("novo capítulo")
  ) {
    const result = await executeAiTool("createChapter", {
      title: "Novo Capítulo Simulado",
    });
    return {
      role: "assistant",
      content: result.message,
      toolCall: { name: "createChapter", result },
    };
  }

  // Resposta padrão baseada em texto aleatório
  const randomIndex = Math.floor(Math.random() * MOCK_RESPONSES.length);
  return {
    role: "assistant",
    content: MOCK_RESPONSES[randomIndex],
  };
}
