/**
 * @file Gerencia e despacha os eventos de interface (UI) vindos do uiBus para os handlers visuais.
 */

import { uiBus } from '../events/uiBus.js';

/**
 * Controller responsável pelas reações visuais da interface.
 * @class
 */
export class UiController {
  /**
   * Cria uma instância do UiController e registra os ouvintes de eventos da UI.
   * @param {import('../services/serviceManager.js').ServiceManager} services - Instância centralizada dos serviços.
   */
  constructor(services) {
    this.services = services;
    this.registerEvents();
  }

  /**
   * Registra todos os escutadores do barramento de UI.
   * @private
   */
  registerEvents() {
    
    // Escuta quando um arquivo temporário (.temp) é salvo
    uiBus.on('temp-file:saved', (payload) => {
      this.handleTempFileSaved(payload);
    });

    // Adicione novos ouvintes de UI aqui no futuro...
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