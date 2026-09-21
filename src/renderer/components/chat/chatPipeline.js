/**
 * @file Controlador da pipeline do assistente de IA, gerenciando o fluxo entre o envio do usuário e a resposta da IA.
 */

import { saveChatMessage } from './chatStorage.js';


// =====================[MOCK]========================== //
/**
 * Respostas pré-definidas para simulação da IA.
 */
const MOCK_AI_RESPONSES = [
  'Anotei sua ideia! Posso estruturar um resumo detalhado ou ajustar este trecho do capítulo se você desejar.',
  'Analisando a estrutura da sua narrativa, este desenvolvimento traz um bom ritmo para a trama.',
  'Excelente direcionamento. Gostaria que eu sugerisse alguns diálogos ou desdobramentos de cena para apoiar este ponto?',
  'Com base nos personagens cadastrados no seu projeto, essa decisão gera um conflito interno interessante para o protagonista.',
];

/**
 * Retorna uma resposta aleatória da simulação de IA.
 * @returns {string} Resposta simulada.
 */
function getRandomMockResponse() {
  const index = Math.floor(Math.random() * MOCK_AI_RESPONSES.length);
  return MOCK_AI_RESPONSES[index];
}
// ===================================================== //


/**
 * Injeta diretamente uma mensagem no chat (usada por gatilhos do sistema ou pela IA) e persiste no log.
 * @param {Object} params
 * @param {'assistant'|'system'} params.role - Origem da mensagem.
 * @param {string} params.content - Conteúdo em texto.
 * @param {Function} renderCallback - Função da UI para desenhar o balão no DOM.
 * @returns {Promise<void>}
 */
export async function injectMessageIntoChat({ role, content }, renderCallback) {
  
  const messageData = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  // Salva no log
  await saveChatMessage(messageData);

  // Executa callback de renderização na interface
  if (typeof renderCallback === 'function') {
    renderCallback(messageData);
  }
}

/**
 * Processa a instrução enviada pelo usuário na pipeline da IA.
 * @param {string} userPrompt - Texto digitado pelo usuário.
 * @param {Object} callbacks - Funções para atualização da interface.
 * @param {Function} callbacks.onUserMessageRender - Callback para exibir a mensagem do usuário.
 * @param {Function} callbacks.onAssistantMessageRender - Callback para exibir a resposta da IA/Sistema.
 * @param {Function} callbacks.setLoadingState - Callback para habilitar/desabilitar inputs.
 */
export async function handleUserPrompt(userPrompt, callbacks) {
  
  const trimmed = userPrompt.trim();
  if (!trimmed) return;

  const { onUserMessageRender, onAssistantMessageRender, setLoadingState } = callbacks;

  // 1. Notifica a UI e salva a mensagem do usuário
  if (typeof setLoadingState === 'function') setLoadingState(true);

  const userMessage = {
    role: 'user',
    content: trimmed,
    timestamp: new Date().toISOString(),
  };

  if (typeof onUserMessageRender === 'function') {
    onUserMessageRender(userMessage);
  }
  await saveChatMessage(userMessage);

  // DEBUG: 2. Simula o tempo de resposta da IA (Mock Pipeline)
  setTimeout(async () => {
    const mockReply = getRandomMockResponse();

    await injectMessageIntoChat(
      {
        role: 'assistant',
        content: mockReply,
      },
      onAssistantMessageRender
    );

    if (typeof setLoadingState === 'function') setLoadingState(false);
  }, 1200);
  
}