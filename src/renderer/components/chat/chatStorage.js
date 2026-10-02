/**
 * @file Módulo de armazenamento do chat, responsável por gerenciar o histórico de mensagens e a persistência dos dados do chat.
 */

import { state } from "../../core/state.js";

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
 * Monta o caminho completo do arquivo da sessão atual do chat.
 * @param {number} sessionIndex - Índice sequencial da sessão no dia caso ultrapasse o limite.
 * @returns {string|null} Caminho do arquivo .json ou null se não houver livro ativo.
 */
function getCurrentChatLogFilePath(sessionIndex = 1) {
  if (!state.currentBookPath) return null;
  const dateStr = getTodaySessionDate();
  const indexStr = String(sessionIndex).padStart(3, "0");
  return `${state.currentBookPath}/.system/chatlog/session_${dateStr}_${indexStr}.json`;
}

/**
 * Garante a rotação de arquivos caso o arquivo atual exceda o limite de mensagens.
 * @returns {Promise<string|null>} Caminho do arquivo pronto para escrita.
 */
async function resolveTargetLogFile() {
  if (!state.currentBookPath) return null;

  let sessionIndex = 1;
  let filePath = getCurrentChatLogFilePath(sessionIndex);

  while (filePath) {
    const rawData = await window.electronAPI.readFile(filePath);
    if (!rawData) {
      // Arquivo não existe ainda, podemos usar este
      return filePath;
    }

    try {
      const messages = JSON.parse(rawData);
      if (Array.isArray(messages) && messages.length < MAX_MESSAGES_PER_FILE) {
        return filePath;
      }
    } catch {
      // Se o arquivo estiver corrompido, utiliza um novo arquivo sequencial
      return filePath;
    }

    sessionIndex += 1;
    filePath = getCurrentChatLogFilePath(sessionIndex);
  }

  return filePath;
}

/**
 * Salva uma nova mensagem no arquivo de log da sessão atual.
 * @param {Object} message - Objeto da mensagem.
 * @param {string} message.role - Papel do emissor ('user' | 'assistant' | 'system').
 * @param {string} message.content - Texto da mensagem.
 * @param {string} [message.timestamp] - Data/hora da mensagem.
 * @returns {Promise<boolean>} Sucesso da gravação.
 */
export async function saveChatMessage(message) {
  const filePath = await resolveTargetLogFile();
  if (!filePath) return false;

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
    } catch {
      messages = [];
    }
  }

  messages.push(logEntry);

  const saveResult = await window.electronAPI.saveFile(
    filePath,
    JSON.stringify(messages, null, 2),
  );
  return saveResult && saveResult.success;
}

/**
 * Carrega todo o histórico de mensagens de todas as sessões do livro ativo.
 * @returns {Promise<Array<{role: string, content: string, timestamp: string}>>} Lista com o histórico de mensagens.
 */
export async function loadChatHistory() {
  console.log("[CHAT] Início de loadChatHistory()...");

  if (!state.currentBookPath) {
    console.log("[CHAT] Nulo: state.currentBookPath inválido.");
    return [];
  }

  // Normaliza as barras do caminho para evitar falhas no Node.js/Windows
  const normalizedPath = state.currentBookPath.replace(/\\/g, "/");
  const chatlogFolder = `${normalizedPath}/.system/chatlog`;

  try {
    console.log("[CHAT] Solicitando getTree para:", chatlogFolder);
    const folderTree = await window.electronAPI.getTree(chatlogFolder);
    console.log("[CHAT] Retorno de getTree recebido:", folderTree);

    if (!folderTree || !folderTree.children) {
      console.log(
        `[CHAT LOG] Nenhum histórico encontrado em: ${chatlogFolder}`,
      );
      return [];
    }

    // Filtra considerando tanto `type === 'file'` quanto `!isDirectory`
    const jsonFiles = folderTree.children
      .filter(
        (item) =>
          (item.type === "file" || item.isDirectory === false) &&
          item.name.endsWith(".json"),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const fullHistory = [];

    for (const file of jsonFiles) {
      const rawData = await window.electronAPI.readFile(file.path);
      if (rawData) {
        try {
          const parsed = JSON.parse(rawData);
          if (Array.isArray(parsed)) {
            fullHistory.push(...parsed);
          }
        } catch {
          console.warn(`[CHAT LOG] Erro ao ler arquivo de log: ${file.path}`);
        }
      }
    }

    return fullHistory;
  } catch (err) {
    console.error("[CHAT LOG] Erro crítico ao carregar histórico:", err);
    return [];
  }
}
