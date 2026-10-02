/**
 * @file Gerencia e despacha os eventos de interface (UI) vindos do uiBus para os handlers visuais.
 */

import { uiBus } from "../events/uiBus.js";

import * as book from "./handlers/bookHandler.js";
import * as file from "./handlers/fileHandler.js";
// import * as chapter from './handlers/chapterHandler.js';
// import * as character from './handlers/characterHandler.js';

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
    //==========================================//
    //         Requisições de UI (uiBus)        //
    //==========================================//

    // Solicita lista de livros do backend
    uiBus.onReq("books:fetch-list", (req) => {
      book.onFetchBooks(req, this.state, this.services.book);
    });

    // Intercepta o evento file:get e delega para o fileHandler passando os dados e o state
    uiBus.onReq("file:get", (req) => {
      file.onFileGet(req, this.state, this.services.file);
    });

    //==========================================//
    //             Eventos  de  UI              //
    //==========================================//

    // Evento que chama para tela de sincronização de arquivos .temp
    uiBus.on("sync:open-modal", () => {
      file.onSyncOpenModal();
      file.onSyncOpenModal();
    });

    // Lida com seleção de livro/projeto
    uiBus.on("book:selected", (e) => {
      if (e.nativeEvent) {
        book.onBookSelect(this.state, e.value);
      } else {
        book.onBookSelect(this.state, e);
      }
    });

    // Solicita o salvamento de um arquivo temporário (.temp) via IPC
    uiBus.on("file:save-temp", async ({ path, content }) => {
      file.onSaveTemp(path, content);
    });

    // Evento disparado quando um arquivo é aberto com sucesso
    uiBus.on("file:opened", (data) => {
      file.onFileOpened(this.state, data);
    });
  }
}
