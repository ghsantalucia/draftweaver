/**
 * @file Serviço responsável por gerenciar a lista de livros, dados de configuração por projeto e verificação de travas da IA.
 */

import { domainBus } from "../events/domainBus.js";
import { uiBus } from "../events/uiBus.js";
import { normalizePath } from "../utils/helpers.js";

export class BookService {
  /**
   * Cria uma instância do BookService.
   * @param {Object} state - Instância do gerenciador de estado global.
   * @param {import('../services/serviceManager.js').ServiceManager} services - Instância centralizada dos serviços.
   */
  constructor(state, services) {
    this.state = state;
    this.services = services;
  }

  /**
   * Aplica a seleção de um livro, atualiza o estado e emite evento de domínio.
   * @param {string} bookPath - Caminho completo do livro.
   * @param {string} [bookTitle=''] - Título opcional do livro.
   */
  async selectBook(bookPath, bookTitle = "") {
    if (!bookPath) return;

    // 1. Atualiza estado e persistência
    this.state.currentBookPath = bookPath;
    localStorage.setItem("last_selected_book", bookPath);

    // 2. Emite evento de domínio notificando que o livro foi alterado
    domainBus.emit("book:selected", { bookPath, bookTitle });

    // 3. Executa checagens e processos dependentes do livro atual
    await this.checkAILock();
  }

  /**
   * Busca a lista de livros disponíveis na API do Electron.
   * @returns {Promise<Array>} Lista de livros.
   */
  async getBooksList() {
    try {
      const books = await window.electronAPI.getBooksList();
      return books || [];
    } catch (error) {
      console.error("[BOOK SERVICE] Erro ao buscar lista de livros:", error);
      return [];
    }
  }

  /**
   * Restaura o último livro selecionado salvo no localStorage ou assume o primeiro da lista.
   * @param {Array} books - Lista de livros disponíveis.
   */
  async restoreLastSelectedBook(books = []) {
    if (!books || books.length === 0) return;

    const lastSelectedBook = localStorage.getItem("last_selected_book");
    const bookToLoad =
      books.find((b) => b.fullPath === lastSelectedBook) || books[0];

    await this.selectBook(bookToLoad.fullPath, bookToLoad.title);
  }

  /**
   * Verifica o arquivo config.json do livro atual para gerenciar a trava da IA e emite evento de mudança.
   */
  async checkAILock() {
    if (!this.state.currentBookPath) return;

    const configPath = `${this.state.currentBookPath}/config.json`;
    const text = await this.services.file.readFile(configPath);

    if (!text || !text.content) return;

    try {
      const config = JSON.parse(text.content);
      const isLocked = Boolean(config.ai_lock);

      // Se o estado do lock não mudou, não faz nada
      if (this.state.aiLockState === isLocked) return;
      this.state.aiLockState = isLocked;

      // Emite evento para que os controllers/UI reajam ao bloqueio/desbloqueio da IA
      domainBus.emit("ai-lock:changed", {
        isLocked,
        currentFileMetadata: this.state.currentFileMetadata,
      });
    } catch (err) {
      console.warn(`[BOOK SERVICE] Falha ao ler config.json: ${err.message}`);
    }
  }

  /**
   * Serializa e persiste o config.json do livro atualmente selecionado.
   * @async
   * @returns {Promise<void>}
   */
  async updateConfig(bookPath = this.state?.currentBookPath) {
    if (!this.state || !bookPath || !this.state.bookList) {
      return;
    }

    const currentBook = this.state.bookList.find(
      (book) => book.fullPath === bookPath,
    );
    if (!currentBook) return;

    // Remove os atributos artificiais adicionados pelo main.js antes de salvar
    const { folderName, fullPath, ...configData } = currentBook;

    // Monta o caminho absoluto para o config.json do livro
    const configPath = `${fullPath}/config.json`;
    const jsonContent = JSON.stringify(configData, null, 2);

    try {
      await window.electronAPI.saveFile(configPath, jsonContent);
    } catch (err) {
      console.error("[BookService] Erro ao salvar config.json do livro:", err);
    }
  }

  /**
   * Ativa/desativa o `ai_lock` no config.json do projeto informado. O watcher de arquivos
   * detecta a mudança e a interface bloqueia/libera o editor (fluxo único para todas as IAs).
   * @param {string} bookPath - Caminho absoluto do livro.
   * @param {boolean} locked
   * @returns {Promise<void>}
   */
  async setAiLock(bookPath, locked) {
    const norm = (p) => normalizePath(p);
    const book = this.state.bookList?.find(
      (b) => norm(b.fullPath) === norm(bookPath),
    );
    if (!book) return;

    book.ai_lock = locked;
    if (norm(this.state.currentBookPath) === norm(bookPath)) {
      this.state.aiLockState = locked;
    }
    await this.updateConfig(book.fullPath);
  }

  async getMap(bookPath) {
    return await window.electronAPI.getTree(bookPath);
  }
}
