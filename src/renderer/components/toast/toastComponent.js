/**
 * @file Componente responsável pela renderização estrutural do toast.
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";

/**
 * Representa o toast da aplicação.
 * @class
 */
export class ToastComponent extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus)
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos para a exigência do componente.
   * @param {Component} [parent=null]
   */
  constructor(selector, context, params, parent = null) {
    super(selector, context, templateHtml, params, parent);
  }

  /**
   * Configura os ouvintes de eventos da interface.
   */
  setupListeners() {
    this.uiBus.on("toast:show", ({ message, type }) => {
      this.show(message, type);
    });
  }

  /**
   * Exibe uma mensagem de notificação toast temporária na tela.
   * @param {string} message - Texto da mensagem.
   * @param {string} [type='success'] - Tipo do toast ('success' ou 'error').
   */
  show(message, type = "success") {
    const container = document.getElementById("toast-container");
    const messageEl = document.getElementById("toast-message");

    if (!container || !messageEl) return;

    // Define o texto e limpa classes anteriores de tipo
    messageEl.textContent = message;
    container.classList.remove("success", "error", "hidden");

    // Adiciona a classe correspondente ao tipo (success ou error)
    if (type) {
      container.classList.add(type);
    }

    // Limpa timer anterior caso já estivesse visível
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
    }

    // Oculta automaticamente após 3 segundos com animação suave
    this._toastTimer = setTimeout(() => {
      container.classList.add("hidden");
    }, 3000);
  }
}
