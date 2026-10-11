/**
 * @file Serviço responsável por centralizar as operações de CRUD de arquivos (leitura, escrita, restauração e resolução de caminhos), servindo como ponte entre o Editor e o Sistema de Arquivos.
 */

import { uiBus } from "../events/uiBus.js";
import { parseMarkdown, stringifyFrontmatter } from "../utils/markdown.js";

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

  // ========== Ciclo de vida do arquivo ========== //

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

  // ========== Ciclo de vida do arquivo .temp ========== //

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

    return result;
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
   * Varre a pasta do livro atual no disco em busca de arquivos .temp e retorna um array completo.
   * @async
   * @returns {Promise<Array<{path: string, tempPath: string, name: string, content: string}>>}
   */
  async getPendingTempFiles() {
    if (!this.state || !this.state.currentBookPath) return [];

    try {
      // 1. Obtém a árvore de arquivos completa do livro atual via IPC
      const tree = await window.electronAPI.getTree(this.state.currentBookPath);
      const tempFiles = [];

      // Função recursiva para varrer os nós do projeto
      const walkTree = async (node) => {
        if (!node) return;

        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            await walkTree(child);
          }
        } else if (node.name && node.name.endsWith(".temp")) {
          const tempPath = node.path;
          const originalPath = tempPath.replace(/\.temp$/, "");

          // 2. Lê o conteúdo bruto do arquivo .temp diretamente do disco
          const { content } = await this.readFile(tempPath);

          let displayName = node.name
            .replace(/\.temp$/, "")
            .replace(/\.md$/, "");

          // 3. Extrai o título dos metadados Frontmatter do .temp se existir
          if (content) {
            const { metadata } = parseMarkdown(content);
            if (metadata && metadata.title) {
              displayName = metadata.title;
            }
          }

          tempFiles.push({
            path: originalPath,
            tempPath: tempPath,
            name: displayName,
            content: content || "",
          });
        }
      };

      await walkTree(tree);
      return tempFiles;
    } catch (error) {
      console.error(
        "[FILE SERVICE] Erro ao varrer arquivos .temp do disco:",
        error,
      );
      return [];
    }
  }

  /**
   * Sincroniza um único arquivo (.temp -> original) preservando integralmente o Frontmatter.
   * @async
   * @param {string} filePath - Caminho do arquivo original.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async syncFile(filePath) {
    if (!filePath) return { success: false, error: "Caminho inválido" };

    let contentToSave = null;

    // 1. Caso o arquivo a ser sincronizado seja o atualmente focado no editor:
    if (this.state?.currentFilePath === filePath && this.state?.editor) {
      const bodyText = this.state.editor.getMarkdown();
      const metadata = this.state.currentFileMetadata || {};

      // Recompõe o Frontmatter YAML + Corpo antes de salvar
      contentToSave = stringifyFrontmatter(metadata, bodyText);
    } else {
      // 2. Para arquivos em segundo plano, lê o rascunho .temp completo (que já contém o Frontmatter)
      const tempPath = this.getTempPath(filePath);
      const readRes = await this.readFile(tempPath);

      if (!readRes.content) {
        return {
          success: false,
          error: "Não foi possível ler o arquivo temporário.",
        };
      }

      contentToSave = readRes.content;
    }

    // 3. Salva no arquivo original e apaga o .temp
    const res = await this.saveFile(filePath, contentToSave);

    if (res.success) {
      uiBus.emit("temp-file:synced", { filePath });
    }

    return res;
  }
}
