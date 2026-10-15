/**
 * @file Gerencia e despacha os eventos de interface (UI) vindos do uiBus para os handlers visuais.
 */

import { uiBus } from "../events/uiBus.js";

import * as book from "./handlers/bookHandler.js";
import * as file from "./handlers/fileHandler.js";
import * as chat from "./handlers/chatHandler.js";
import * as config from "./handlers/configHandler.js";

/**
 * Controller responsável pelas reações visuais da interface.
 * @class
 */
export class UiController {
  /**
   * Cria uma instância do UiController e registra os ouvintes de eventos da UI.
   * @param {ServiceManager} services - Instância centralizada dos serviços.
   */
  constructor(services, state) {
    this.services = services;
    this.state = state;
    this.registerEvents();
  }

  /**
   * Registra todos os escutadores do barramento de UI.
   * @private
   */
  registerEvents() {
    // Evento de inicialização do app
    uiBus.on("app:ready", async () => {
      // Recupera lista de livros cadastrados
      const bookList = await book.fetchBooks(this.state, this.services.book);
      // Envia para preparar o frontend
      uiBus.emit("books:updated", bookList);
      // Restaura o último livro aberto caso exista
      uiBus.emit("book:selected", this.state.currentBookPath);
      // Restaura o último arquivo aberto caso exista
      if (this.state.currentFilePath) {
        uiBus.emit("editor:open-file", { path: this.state.currentFilePath });
      } else {
        uiBus.emit("editor:reseted");
      }
    });

    //==========================================//
    //         Requisições de UI (uiBus)        //
    //==========================================//

    // Solicita lista de livros do backend
    uiBus.onReq("books:fetch-list", (req) => {
      book.onFetchBooksList(req, this.services.book);
    });

    // Intercepta o evento file:get e delega para o fileHandler passando os dados e o state
    uiBus.onReq("file:get", (req) => {
      file.onFileGet(req, this.state, this.services.file);
    });

    //==========================================//
    //             Eventos  de  UI              //
    //==========================================//

    //
    uiBus.on("config:changed", async () => {
      const bookList = await book.fetchBooks(this.state, this.services.book);
      const currentBookConfig = bookList.find(
        (b) => b.fullPath === this.state.currentBookPath,
      );
      //config.onConfigChanged(currentBookConfig);
      console.log(currentBookConfig);
    });

    // Atualiza estado da árvore de arquivos quando uma pasta é aberta ou fechada
    uiBus.on("folder:toggle", (payload) => {
      book.onFolderToggle(this.state, this.services.book, payload.data);
    });

    // Evento que chama para tela de sincronização de arquivos .temp
    uiBus.on("sync:open-modal", () => {
      file.onSyncOpenModal(this.services.file, this.state);
    });

    // Lida com seleção de livro/projeto
    uiBus.on("book:selected", (e) => {
      if (e.nativeEvent) {
        book.onBookSelect(this.state, e.value, this.services.book);
      } else {
        book.onBookSelect(this.state, e, this.services.book);
      }
    });

    // Lida com troca de livro/projeto
    uiBus.on("book:changed", (bookPath) => {
      //console.log(this.state);
      book.onBookChange(this.state);
      chat.loadHistory(0, this.services.ai);
      file.handlePendingTempFiles(this.services.file);
      config.onCurrentConfigChanged(this.state, this.state.currentBookMetadata);
    });

    // Lida com editor resetado (nenhum arquivo aberto)
    uiBus.on("editor:reseted", () => {
      file.onEditorReset(this.state);
    });

    // Solicita o salvamento de um arquivo temporário (.temp) via IPC
    uiBus.on("file:save-temp", async ({ path, content }) => {
      file.onSaveTemp(path, content, this.services.file);
    });

    // Evento disparado quando um arquivo é aberto com sucesso
    uiBus.on("file:opened", (data) => {
      file.onFileOpened(this.state, this.services.book, data);
    });

    // Evento disparado quando o modo avançado é alternado
    uiBus.on("advanced-mode:toggle", (payload) => {
      book.onAdvancedModeToggle(this.state, this.services.book, payload);
    });

    // Envia mensagem para IA
    uiBus.on("chat:send-message", (data) => {
      chat.onSendMessage(data, this.services.ai);
    });

    // Solicita mais histórico de chat
    uiBus.on("chat:fetch-more-history", ({ offset }) => {
      chat.fetchMoreHistory(offset, this.services.ai);
    });

    // Trata deleção de arquivo temporário
    uiBus.on("temp-file:deleted", async (filePath) => {
      await file.onTempChanged(filePath, this.state, this.services.book);
      file.onTempDeleted(filePath, this.state, this.services.file);
    });
    // Trata sincronização de arquivo temporário
    uiBus.on("temp-file:synced", async (filePath) => {
      await file.onTempChanged(filePath, this.state, this.services.book);
      file.onTempDeleted(filePath, this.state, this.services.file);
    });
    uiBus.on("temp-file:saved", (filePath) => {
      file.onTempChanged(filePath, this.state, this.services.book);
    });

    //
    uiBus.on("book:ai-locked", () => {
      book.onAiLock(true);
    });
    //
    uiBus.on("book:ai-unlocked", () => {
      book.onAiLock(false);
    });
  }
}
