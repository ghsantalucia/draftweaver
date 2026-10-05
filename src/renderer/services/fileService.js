/**
 * @file Serviço responsável por centralizar as operações de CRUD de arquivos (leitura, escrita, restauração e resolução de caminhos), servindo como ponte entre o Editor e o Sistema de Arquivos.
 */

import { uiBus } from "../events/uiBus.js";

/**
 * Serviço de manipulação e persistência de arquivos locais via IPC do Electron.
 * @class
 */
export class FileService {
  /**
   * Cria uma instância do FileService.
   * @param {Object} state - Instância do gerenciador de estado global da aplicação.
   */
  constructor(state) {
    this.state = state;
  }

  /**
   * Retorna o caminho do arquivo temporário (.temp) correspondente.
   * @param {string|null} filePath - Caminho do arquivo original.
   * @returns {string|null} Caminho do .temp ou null se inválido.
   */
  getTempPath(filePath) {
    return filePath ? `${filePath}.temp` : null;
  }

  /**
   * Deleta um arquivo no disco via IPC.
   * @param {string} fullPath - Caminho completo do arquivo a ser deletado.
   * @returns {Promise<{success: boolean, error?: string}>} Resultado da exclusão.
   */
  async deleteFile(fullPath) {
    try {
      return await window.electronAPI.deleteFile(fullPath);
    } catch (error) {
      console.error(
        `[FILE SERVICE] Erro ao deletar arquivo em ${fullPath}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Lê o conteúdo bruto de um arquivo via IPC. Tenta carregar o .temp prioritariamente.
   * @param {string} fullPath - Caminho completo do arquivo.
   * @returns {Promise<{content: string|null, isTemp: boolean}>} Objeto contendo o conteúdo e a flag se é rascunho temporário.
   */
  async readFile(fullPath) {
    try {
      if (!fullPath) return { content: null, isTemp: false };

      // Se o caminho já for o arquivo .temp, lê diretamente sem chamar getTempPath
      if (fullPath.endsWith(".temp")) {
        const rawText = await window.electronAPI.readFile(fullPath);
        return { content: rawText, isTemp: true };
      }

      // Se for o caminho original, tenta o .temp primeiro
      const tempPath = this.getTempPath(fullPath);
      let rawText = await window.electronAPI.readFile(tempPath);
      let isTemp = true;

      if (rawText === null) {
        rawText = await window.electronAPI.readFile(fullPath);
        isTemp = false;
      }

      return { content: rawText, isTemp };
    } catch (error) {
      console.error(
        `[FILE SERVICE] Erro ao ler arquivo em ${fullPath}:`,
        error,
      );
      return { content: null, isTemp: false };
    }
  }

  /**
   * Salva o rascunho no arquivo .temp e notifica a interface via barramento de UI.
   * @param {string} fullPath - Caminho completo do arquivo original.
   * @param {string} content - Conteúdo a ser gravado no rascunho.
   * @returns {Promise<Object>} Resultado da operação de salvamento.
   */
  async saveTempFile(fullPath, content) {
    if (!fullPath) return { success: false, error: "Caminho inválido." };
    const tempPath = this.getTempPath(fullPath);
    const result = await window.electronAPI.saveFile(tempPath, content);

    if (result.success) {
      // Emite o evento real passando o arquivo original e o temp
      uiBus.emit("temp-file:saved", { originalPath: fullPath, tempPath });
    }

    return result;
  }

  /**
   * Persiste o conteúdo de um arquivo em disco substituindo o original pelo .temp e apagando o .temp.
   * @param {string} fullPath - Caminho completo do arquivo.
   * @param {string} content - Conteúdo oficial a ser gravado.
   * @returns {Promise<{success: boolean, error?: string}>} Resultado da operação.
   */
  async saveFile(fullPath, content) {
    if (!fullPath) {
      return { success: false, error: "Caminho de arquivo inválido." };
    }

    try {
      // 1. Grava no arquivo oficial
      const res = await window.electronAPI.saveFile(fullPath, content);

      if (res.success) {
        // 2. Remove o arquivo .temp
        const tempPath = this.getTempPath(fullPath);
        await this.deleteFile(tempPath);
      }

      return res;
    } catch (error) {
      console.error(
        `[FILE SERVICE] Erro ao salvar arquivo em ${fullPath}:`,
        error,
      );
      return {
        success: false,
        error: error.message || "Erro desconhecido ao salvar.",
      };
    }
  }
}
