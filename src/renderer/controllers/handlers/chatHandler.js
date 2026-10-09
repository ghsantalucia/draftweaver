/**
 * @file Handler para orquestração de eventos e mensagens do chat.
 */

import { uiBus } from "../../events/uiBus.js";
import { domainBus } from "../../events/domainBus.js";

/**
 * Trata o envio de uma mensagem digitada pelo usuário no chat.
 * @param {Object} data
 * @param {string} data.promptText - O texto da mensagem digitada pelo usuário.
 * @param {Object} aiService - Instância do AiService.
 */
export async function onSendMessage({ promptText }, aiService) {
  if (!promptText || !promptText.trim()) return;

  try {
    // 1. Cria a estrutura da mensagem do usuário
    const userMessage = {
      role: "user",
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    // 2. Salva no disco (AGUARDA a gravação ser concluída)
    if (aiService) {
      await aiService.saveMessage(userMessage);
    }

    // 3. Renderiza a mensagem do usuário na interface
    uiBus.emit("chat:render-message", userMessage);

    // 4. Define a UI como carregando (bloqueia textarea/botão de enviar)
    uiBus.emit("chat:set-loading", true);

    // 5. Obtém o histórico da sessão mais recente para enviar como contexto ao gateway
    let history = [];
    if (aiService) {
      const historyData = await aiService.loadChatHistoryPaged({
        sessionOffset: 0,
      });
      history = historyData.messages || [];
    }

    // 6. Envia o texto limpo para o AiService e aguarda a resposta da IA
    const responseText = await aiService.sendMessage({
      prompt: promptText,
      history,
    });

    // 7. Cria a estrutura da mensagem do assistente
    const assistantMessage = {
      role: "assistant",
      content: responseText,
      timestamp: new Date().toISOString(),
    };

    // 8. Salva a resposta da IA no disco
    if (aiService) {
      await aiService.saveMessage(assistantMessage);
    }

    // 9. Renderiza a resposta da IA no chat
    uiBus.emit("chat:render-message", assistantMessage);
  } catch (error) {
    console.error("[ChatHandler] Falha ao processar mensagem do chat:", error);

    // Renderiza uma mensagem de erro na interface para feedback visual
    uiBus.emit("chat:render-message", {
      role: "assistant",
      content:
        "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.",
    });
  } finally {
    // 10. Libera o carregamento da UI independente do resultado
    uiBus.emit("chat:set-loading", false);
  }
}

/**
 * Carrega o histórico de mensagens do chat para a sessão atual do livro ativo.
 * Se o lote inicial tiver <= 20 mensagens, busca arquivos anteriores até acumular >= 50 mensagens.
 *
 * @param {number} offset - Qual arquivo de log deve ser carregado (normalmente 0 no carregamento inicial).
 * @param {Object} aiService - Instância do AiService.
 */
export async function loadHistory(offset, aiService) {
  try {
    if (!aiService) {
      console.warn(
        "[ChatHandler] AiService indisponível para carregar o histórico.",
      );
      return;
    }

    let accumulatedMessages = [];
    let currentOffset = offset;
    let hasMore = true;

    // Loop de acumulação inicial: se <= 20 mensagens, carrega anteriores até totalizar >= 50 ou acabar os arquivos
    while (hasMore && accumulatedMessages.length <= 20) {
      const result = await aiService.loadChatHistoryPaged({
        sessionOffset: currentOffset,
      });

      if (!result || !Array.isArray(result.messages)) {
        break;
      }

      // Como o arquivo mais antigo é retornado nas chamadas com offset maior,
      // prependemos (ou concatenamos na ordem cronológica anterior) as mensagens novas
      accumulatedMessages = [...result.messages, ...accumulatedMessages];
      hasMore = Boolean(result.hasMore);

      // Avança para o próximo arquivo se ainda precisar de mais mensagens
      if (accumulatedMessages.length < 50 && hasMore) {
        currentOffset++;
      } else {
        break; // Atingiu o mínimo de 50 ou não há mais logs
      }
    }

    // Emite o histórico completo acumulado de uma só vez para o componente renderizar
    if (accumulatedMessages.length > 0 || !hasMore) {
      uiBus.emit("chat:render-history", {
        messages: accumulatedMessages,
        hasMore,
        offsetUsed: currentOffset, // Repassa o último offset utilizado para sincronizar o ChatComponent
      });
    }
  } catch (error) {
    console.error(
      "[ChatHandler] Erro ao carregar histórico na troca de livro:",
      error,
    );
  }
}

/**
 * Busca mais histórico antigo quando o usuário rola o chat até o topo (Infinite Scroll).
 * @param {number} offset - Próximo índice de arquivo a buscar.
 * @param {Object} aiService - Instância do AiService.
 */
export async function fetchMoreHistory(offset, aiService) {
  try {
    if (!aiService) return;

    const result = await aiService.loadChatHistoryPaged({
      sessionOffset: offset,
    });

    // Permite disparar o evento mesmo com mensagens vazias se hasMore for false
    if (result && Array.isArray(result.messages)) {
      uiBus.emit("chat:append-history", result);
    }
  } catch (error) {
    console.error("[ChatHandler] Erro ao buscar mais histórico antigo:", error);
  }
}
