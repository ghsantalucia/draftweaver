/**
 * @file Classe gerenciadora de modais em pilha (Stack).
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";

/**
 * Componente de Modal em Pilha (Stack), herdando da classe base Component.
 * @class
 * @extends {Component}
 */
export class ModalComponent extends Component {
  /**
   * Cria uma instância do ModalComponent.
   * @param {string} selector - Seletor CSS do container onde o modal será inserido (ex: '#modal-container').
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus).
   * @param {Object|null} [params=null] - Configurações do modal (id, title, content, buttons, onClose).
   * @param {Component|null} [parent=null] - Componente pai opcional.
   */
  constructor(selector, context, params = null, parent = null) {
    super(selector, context, templateHtml, params, parent);

    // Configurações extraídas de params (com valores padrão seguros)
    this.modalConfig = params || {};
    this.id =
      this.modalConfig.id ||
      `modal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.title = this.modalConfig.title || "";
    this.content = this.modalConfig.content || "";
    this.buttons = this.modalConfig.buttons || [];
    this.onCloseCallback = this.modalConfig.onClose || null;
  }

  /**
   * Fornece o contexto de dados para a compilação do template Handlebars.
   * @returns {Object} Objeto contendo id, title, content e indicador de botões.
   */
  getContext() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      hasButtons: this.buttons.length > 0,
    };
  }

  /**
   * Gancho do ciclo de vida executado logo após a renderização inicial do HTML.
   */
  onInit() {
    // Renderiza botões dinamicamente no rodapé, se houver
    if (this.buttons.length > 0) {
      const footer = this.element.querySelector(".modal-footer");
      if (footer) {
        this.buttons.forEach((btnConfig) => {
          const btn = document.createElement("button");
          btn.className = `btn-modal ${btnConfig.class || "btn-secondary"}`;
          btn.textContent = btnConfig.text;
          btn.addEventListener("click", (e) => {
            // e.stopPropagation();
            if (btnConfig.onClick) btnConfig.onClick(this);
            else this.close();
          });
          footer.appendChild(btn);
        });
      }
    }
  }

  /**
   * Configura os ouvintes de eventos (blindagem de cliques internos e botão de fechar).
   * @private
   */
  setupListeners() {
    if (!this.element) return;
    // this.element.addEventListener("click", (e) => e.stopPropagation());

    const closeBtn = this.element.querySelector(".modal-close-btn");
    closeBtn?.addEventListener("click", (e) => {
      // e.stopPropagation();
      this.close();
    });
  }

  /**
   * Fecha o modal atual, executa o callback opcional e limpa o elemento do DOM.
   */
  close() {
    if (typeof this.onCloseCallback === "function") {
      this.onCloseCallback();
    }
    // Remove apenas a janela individual do modal, mantendo o #modal-container seguro
    if (this.element && this.element.classList.contains("app-modal-window")) {
      this.element.remove();
    } else if (this.element) {
      // Caso o element seja o próprio container (fallback de segurança)
      this.element.innerHTML = "";
    }
    this.element = null;
  }
}
