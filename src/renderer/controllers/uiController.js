/**
 * @file Gerencia e despacha os eventos de interface (UI) vindos do uiBus para os handlers visuais.
 */

import { uiBus } from '../events/uiBus.js';

import * as book from './handlers/bookHandler.js';
import * as file from './handlers/fileHandler.js';
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

    // Evento que chama para tela de sincronização de arquivos .temp
    uiBus.on('sync:open-modal', () => {
      file.onSyncOpenModal();
      file.onSyncOpenModal();
    });

    // Lida com seleção de livro/projeto
    uiBus.on('book:selected', (e) => {
      if (e.nativeEvent) {
        book.onBookSelect(this.state, e.value);
      } else {
        book.onBookSelect(this.state, e);
      }
    });

    // Solicita lista de livros do backend
    uiBus.on('books:fetch-list', () => {
      book.onFetchBooks(this.services.book);
    });
  }

  /**
   * Handler para quando um arquivo temporário é salvo (.temp).
   * Atualiza o explorer (adicionando o asterisco) e libera a sincronização.
   * @private
   * @param {{ originalPath: string, tempPath: string }} payload - Dados do evento
   */
  handleTempFileSaved(payload) {
    console.log('[UiController] Evento recebido: temp-file:saved', payload);
    // TODO: Chamar métodos visuais para atualizar o explorer e a toolbar
  }
}