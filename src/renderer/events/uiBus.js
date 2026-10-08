/**
 * @file scripts/renderer/events/eventUi.js
 * @description Mini-framework de delegação de eventos via atributos declarativos, extraindo dados de atributos data-* automaticamente.
 */

import mitt from "mitt";
import { initDeclarativeEvents } from "./uiDeclarativeEvents.js";

/**
 * @class UiEventBus
 * @description Gerenciador centralizado de eventos UI baseado em Mitt, com suporte a Pub/Sub, intenções e Request-Response assíncrono blindado contra race conditions.
 */
export class UiEventBus {
  /**
   * @constructor
   * @description Inicializa a instância interna do Mitt, os eventos declarativos e o listener de depuração global.
   */
  constructor() {
    this.bus = mitt();
    initDeclarativeEvents(this.bus);

    // DEBUG Ouve absolutamente tudo o que passa pelo uiBus
    this.bus.on("*", (eventType, eventContext) => {
      console.log(`[UI Event]: "${eventType}"`, eventContext);
    });
  }

  /**
   * @method emit
   * @description Dispara um evento de forma direta (fire-and-forget) para notificações ou intenções.
   * @param {string} event - Nome do evento a ser emitido.
   * @param {any} [payload] - Dados opcionais a serem transmitidos junto com o evento.
   * @returns {void}
   */
  emit(event, payload) {
    this.bus.emit(event, payload);
  }

  /**
   * @method on
   * @description Registra um listener para um evento. Intercepta automaticamente eventos de requisição (*:req:*) para embrulhar o payload em um contexto inteligente com métodos de resposta.
   * @param {string} event - Nome do evento a ser escutado.
   * @param {Function} callback - Função executada quando o evento for disparado.
   * @returns {void}
   */
  on(event, callback) {
    if (event.includes(":req:")) {
      this.bus.on(event, (payload) => {
        // Extrai o requestId e separa o restante dos dados reais
        const { requestId, ...cleanPayload } = payload || {};

        // Cria o objeto de requisição inteligente
        const reqContext = {
          data: cleanPayload, // Contém apenas os dados enviados pelo componente, sem o lixo do requestId
          reply: (data) => {
            const resEvent = event.replace(":req:", ":res:");
            this.bus.emit(resEvent, { requestId, data });
          },
          error: (errorMessage) => {
            const resEvent = event.replace(":req:", ":res:");
            this.bus.emit(resEvent, { requestId, error: errorMessage });
          },
        };

        callback(reqContext);
      });
    } else {
      this.bus.on(event, callback);
    }
  }

  /**
   * @method onReq
   * @description Atalho declarativo para registrar um listener de requisição a partir de um nome base (ex: "books:fetch-list" converte-se internamente para "books:req:fetch-list").
   * @param {string} event - Nome base da requisição.
   * @param {Function} callback - Função executada recebendo o contexto inteligente da requisição.
   * @returns {void}
   */
  onReq(event, callback) {
    const parts = event.split(":");
    const domain = parts[0];
    const action = parts.slice(1).join(":");
    const reqEvent = `${domain}:req:${action}`;

    this.on(reqEvent, callback);
  }

  /**
   * @method off
   * @description Remove um listener de evento previamente cadastrado.
   * @param {string} event - Nome do evento.
   * @param {Function} callback - Referência da função callback associada.
   * @returns {void}
   */
  off(event, callback) {
    this.bus.off(event, callback);
  }

  /**
   * @method req
   * @description Executa uma requisição assíncrona baseada em Promise, gerando um ID de correlação único (requestId) e aguardando a resposta correspondente.
   * @param {string} eventBase - Nome base do evento (ex: "books:fetch-list").
   * @param {Object} [payload={}] - Dados ou filtros opcionais enviados na requisição.
   * @returns {Promise<any>} Retorna uma Promise que resolve com os dados da resposta ou rejeita em caso de erro ou estouro de tempo limite (timeout).
   */
  req(eventBase, payload = {}) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(2, 11);

      const parts = eventBase.split(":");
      const domain = parts[0];
      const action = parts.slice(1).join(":");

      const reqEvent = `${domain}:req:${action}`;
      const resEvent = `${domain}:res:${action}`;

      const timeout = setTimeout(() => {
        this.bus.off(resEvent, handleResponse);
        reject(
          new Error(
            `[UiEventBus] Timeout: Nenhuma resposta para '${reqEvent}'`,
          ),
        );
      }, 10000);

      const handleResponse = (response) => {
        if (response && response.requestId === requestId) {
          clearTimeout(timeout);
          this.bus.off(resEvent, handleResponse);

          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        }
      };

      this.bus.on(resEvent, handleResponse);
      this.bus.emit(reqEvent, { ...payload, requestId });
    });
  }
}

// Exporta uma instância única global (Singleton) para o app inteiro
export const uiBus = new UiEventBus();
