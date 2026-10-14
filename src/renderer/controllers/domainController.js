/**
 * @file Gerencia e despacha os eventos de negócio e domínio vindos do domainBus para os handlers específicos.
 */

import { domainBus } from "../events/domainBus.js";
import { uiBus } from "../events/uiBus.js";
import { normalizePath } from "../utils/helpers.js";
import * as config from "./handlers/configHandler.js";

/**
 * Controller responsável pelas regras de negócio, IA e manipulação de dados.
 * @class
 */
export class DomainController {
  /**
   * Cria uma instância do DomainController e registra os ouvintes de eventos de domínio.
   * @param {import('../services/serviceManager.js').ServiceManager} services - Instância centralizada dos serviços.
   */
  constructor(services, state) {
    this.services = services;
    this.state = state;
    this.registerEvents();
  }

  /**
   * Registra todos os escutadores do barramento de domínio.
   * @private
   */
  registerEvents() {
    // Evento de alteração de arquivo em disco
    domainBus.on("fs:temp-changed", (filePath) => {
      // ...
    });

    // Evento disparado quando um livro é selecionado
    domainBus.on("fs:config-changed", async (payload) => {
      config.onConfigChanged(payload, this.state, this.services.book);
    });
  }
}
