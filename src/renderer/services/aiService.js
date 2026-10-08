/**
 * @file Serviço responsável pela comunicação, intermediação com o gateway de IA e gestão dos logs de chat do projeto.
 */

import * as ai from "../ai/aiGateway.js";

const MAX_MESSAGES_PER_FILE = 50;

/**
 * Obtém a data atual formatada como YYYY-MM-DD para nomear a sessão do chat.
 * @returns {string} Data formatada.
 */
function getTodaySessionDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Classe de serviço da Inteligência Artificial.
 * @class
 */
export class AiService {
  /**
   * Cria uma instância do AiService.
   * @param {Object} state - Instância do gerenciador de estado global da aplicação.
   */
  constructor(state) {
    this.state = state;
  }

  /**
   * Monta o caminho completo do arquivo de log da sessão atual.
   * @param {number} sessionIndex - Índice sequencial da sessão no dia.
   * @returns {string|null} Caminho do arquivo .json ou null se não houver livro ativo.
   */
  getCurrentChatLogFilePath(sessionIndex = 1) {
    if (!this.state.currentBookPath) return null;
    const dateStr = getTodaySessionDate();
    const indexStr = String(sessionIndex).padStart(3, "0");
    const normalizedPath = this.state.currentBookPath.replace(/\\/g, "/");
    return `${normalizedPath}/.system/chatlog/session_${dateStr}_${indexStr}.json`;
  }

  /**
   * Envia uma mensagem/prompt para o gateway e retorna a resposta crua da IA.
   * @param {Object} params
   * @param {string} params.prompt - Texto simples enviado pelo usuário.
   * @param {Array} [params.history=[]] - Histórico de mensagens anteriores (se houver).
   * @returns {Promise<string|Object>} Resposta crua retornada pelo provedor ativo.
   */
  async sendMessage({ prompt, history = [] }) {
    try {
      const response = await ai.processPrompt({ prompt, history }, this.state);
      return response;
    } catch (error) {
      console.error(
        "[AiService] Erro ao enviar mensagem para o gateway:",
        error,
      );
      throw error;
    }
  }

  /**
   * Salva uma nova mensagem no arquivo de log da sessão atual do livro ativo.
   * @param {Object} message - Objeto da mensagem.
   * @param {string} message.role - Papel do emissor ('user' | 'assistant' | 'system').
   * @param {string} message.content - Conteúdo em texto da mensagem.
   * @param {string} [message.timestamp] - Data/hora da mensagem.
   * @returns {Promise<boolean>} Retorna verdadeiro se a gravação foi bem-sucedida.
   */
  async saveMessage(message) {
    if (!message || !message.content) return false;

    const filePath = await this.resolveTargetLogFile();
    if (!filePath) {
      console.warn(
        "[AiService] Não foi possível resolver o caminho do arquivo de log (livro ativo não selecionado?).",
      );
      return false;
    }

    const logEntry = {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    let messages = [];
    const rawData = await window.electronAPI.readFile(filePath);

    if (rawData) {
      try {
        messages = JSON.parse(rawData);
        if (!Array.isArray(messages)) messages = [];
      } catch {
        messages = [];
      }
    }

    messages.push(logEntry);

    const saveResult = await window.electronAPI.saveFile(
      filePath,
      JSON.stringify(messages, null, 2),
    );

    return Boolean(saveResult && (saveResult.success || saveResult === true));
  }

  /**
   * Garante a rotação de arquivos caso o arquivo atual exceda o limite de 50 mensagens.
   * @returns {Promise<string|null>} Caminho completo do arquivo .json pronto para escrita.
   */
  async resolveTargetLogFile() {
    if (!this.state.currentBookPath) return null;

    let sessionIndex = 1;
    let filePath = this.getCurrentChatLogFilePath(sessionIndex);

    while (filePath) {
      const rawData = await window.electronAPI.readFile(filePath);

      // Se o arquivo ainda não existe, podemos usá-lo para criar uma nova sessão
      if (!rawData) {
        return filePath;
      }

      try {
        const messages = JSON.parse(rawData);
        // Se tiver menos de 50 mensagens, podemos continuar salvando nele
        if (
          Array.isArray(messages) &&
          messages.length < MAX_MESSAGES_PER_FILE
        ) {
          return filePath;
        }
      } catch {
        // Se o arquivo estiver corrompido, usa ele mesmo para sobrescrever
        return filePath;
      }

      // Se atinge 50 mensagens, incrementa para a próxima sessão
      sessionIndex += 1;
      filePath = this.getCurrentChatLogFilePath(sessionIndex);
    }

    return filePath;
  }

  /**
   * Obtém a lista de caminhos de todos os arquivos de log ordenados cronologicamente.
   * @returns {Promise<string[]>} Lista de caminhos dos arquivos .json.
   */
  async getChatLogFiles() {
    if (!this.state.currentBookPath) return [];

    const normalizedPath = this.state.currentBookPath.replace(/\\/g, "/");
    const chatlogFolder = `${normalizedPath}/.system/chatlog`;

    try {
      const folderTree = await window.electronAPI.getTree(chatlogFolder);
      if (!folderTree || !folderTree.children) return [];

      return folderTree.children
        .filter(
          (item) =>
            (item.type === "file" || item.isDirectory === false) &&
            item.name.endsWith(".json"),
        )
        .map((item) => item.path)
        .sort((a, b) => a.localeCompare(b)); // Ordenação cronológica
    } catch (err) {
      console.error("[CHAT LOG] Erro ao listar arquivos de histórico:", err);
      return [];
    }
  }

  /**
   * Carrega um lote de histórico de mensagens por paginação reversa (arquivo por arquivo).
   * @param {Object} [options={}]
   * @param {number} [options.sessionOffset=0] - Quantas sessões retroceder (0 = última sessão).
   * @returns {Promise<{ messages: Array<{role: string, content: string, timestamp: string}>, hasMore: boolean }>}
   */
  async loadChatHistoryPaged({ sessionOffset = 0 } = {}) {
    const files = await this.getChatLogFiles();

    if (files.length === 0) {
      return { messages: [], hasMore: false };
    }

    const targetIndex = files.length - 1 - sessionOffset;

    if (targetIndex < 0) {
      return { messages: [], hasMore: false };
    }

    const targetFilePath = files[targetIndex];
    const rawData = await window.electronAPI.readFile(targetFilePath);

    let messages = [];
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          messages = parsed;
        }
      } catch (err) {
        console.warn(
          `[CHAT LOG] Erro ao ler o arquivo de log ${targetFilePath}:`,
          err,
        );
      }
    }

    return {
      messages,
      hasMore: targetIndex > 0,
    };
  }
}
