/**
 * @file Gerencia e despacha os eventos de negócio e domínio vindos do domainBus para os handlers específicos.
 */

import { domainBus } from "../events/domainBus.js";

/**
 * Controller responsável pelas regras de negócio, IA e manipulação de dados.
 * @class
 */
export class DomainController {
  /**
   * Cria uma instância do DomainController e registra os ouvintes de eventos de domínio.
   * @param {import('../services/serviceManager.js').ServiceManager} services - Instância centralizada dos serviços.
   */
  constructor(services) {
    this.services = services;
    this.registerEvents();
  }

  /**
   * Registra todos os escutadores do barramento de domínio.
   * @private
   */
  registerEvents() {
    // Evento de alteração de arquivo em disco
    domainBus.on("file:changed", (filePath) => {
      this.handleFileChanged(filePath);
    });

    // Evento disparado quando um livro é selecionado
    domainBus.on("book:selected", (payload) => {
      this.handleBookSelected(payload);
    });

    // Evento disparado quando o estado da trava de IA muda
    domainBus.on("ai-lock:changed", (payload) => {
      this.handleAiLockStateChanged(payload);
    });

    // Adicione novos ouvintes de domínio aqui no futuro...
  }

  /**
   * Handler para alterações de arquivos no disco.
   * @private
   * @param {string} filePath - Caminho do arquivo alterado
   */
  handleFileChanged(filePath) {
    console.log(
      "[DomainController] Evento de domínio: arquivo alterado em disco",
      filePath,
    );
    // TODO: Chamar handlers de capítulo/personagem para reprocessar dados
  }

  /**
   * Handler para quando um livro é selecionado.
   * @private
   * @param {{ bookPath: string, bookTitle: string }} payload
   */
  handleBookSelected(payload) {
    console.log("[DomainController] Evento: book:selected", payload);
    // TODO: Disparar ações de domínio relacionadas à troca de livro (ex: atualizar chat, redefinir árvore)
  }

  /**
   * Handler para mudança de estado da trava de IA.
   * @private
   * @param {{ isLocked: boolean, currentFileMetadata: Object }} payload
   */
  handleAiLockStateChanged(payload) {
    console.log("[DomainController] Evento: ai:lock-state-changed", payload);
    // TODO: Coordenar regras de negócio se necessário ao travar/destravar a IA
  }
}
