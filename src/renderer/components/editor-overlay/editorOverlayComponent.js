/**
 * @file Componente responsável pela renderização estrutural do editor overlay
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";

/**
 * Representa o overlay do editor.
 * @class
 */
export class EditorOverlayComponent extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus)
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos para a exigência do componente.
   * @param {Component} [parent=null]
   */
  constructor(selector, context, params, parent = null) {
    super(selector, context, templateHtml, params, parent);
    this.overlayStack = [];
  }

  /**
   * Configura os ouvintes de eventos da interface.
   */
  setupListeners() {
    // Abre o overlay com base na chave e mensagem fornecidas
    this.uiBus.on("editor-overlay:open", (payload) => {
      this.toggleEditorOverlay(
        true,
        payload.key,
        payload.message,
        payload.showSpinner,
      );
    });

    // Fecha o overlay com base na chave fornecida
    this.uiBus.on("editor-overlay:close", (key) => {
      this.toggleEditorOverlay(false, key);
    });
  }

  /**
   * Exibe o overlay respeitando as camadas (stack) por chave.
   * @param {boolean} show - Define se o bloqueio deve ser exibido ou ocultado
   * @param {string} key - Identificador único da causa do bloqueio (ex: 'no-file', 'ai-lock')
   * @param {string} message - Mensagem a ser exibida no overlay
   * @param {boolean} showSpinner - Define se o spinner deve ser exibido
   * @returns {void}
   * @private
   */
  toggleEditorOverlay(show, key, message = "", showSpinner = true) {
    const overlay = document.getElementById("editor-overlay-container");
    const messageEl = document.getElementById("editor-overlay-message");
    const spinnerEl = document.getElementById("editor-overlay-spinner");

    if (!overlay) return;

    if (show) {
      // 1. Se a chave já existir na pilha, atualiza os dados; caso contrário, insere no topo
      const index = this.overlayStack.findIndex((item) => item.key === key);
      if (index !== -1) {
        this.overlayStack[index] = { key, message, showSpinner };
      } else {
        this.overlayStack.push({ key, message, showSpinner });
      }
    } else {
      // 2. Se for para ocultar, remove a chave informada da pilha
      const index = this.overlayStack.findIndex((item) => item.key === key);
      if (index !== -1) {
        this.overlayStack.splice(index, 1);
      }
    }

    // 3. Processa o estado final baseado no topo da pilha
    if (this.overlayStack.length > 0) {
      // Pega o último elemento adicionado à pilha
      const currentOverlay = this.overlayStack[this.overlayStack.length - 1];

      if (messageEl) messageEl.textContent = currentOverlay.message;
      if (spinnerEl)
        spinnerEl.style.display = currentOverlay.showSpinner ? "block" : "none";

      overlay.classList.remove("hidden");
    } else {
      // Se a pilha estiver vazia, oculta o overlay visualmente
      overlay.classList.add("hidden");
    }
  }
}
