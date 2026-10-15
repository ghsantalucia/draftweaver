/**
 * @file Componente responsável pela estrutura e lógica reativa da Barra de Ferramentas (Toolbar).
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";
import { initSaveButtonAnimation } from "./animations.js";

/**
 * Representa a barra de ferramentas do editor.
 * @class
 * @extends Component
 */
export class ToolbarComponent extends Component {
  /**
   * Cria uma instância do ToolbarComponent.
   * @param {string} selector - Seletor CSS do container alvo no DOM.
   * @param {Object} context - Objeto de infraestrutura (state, uiBus, domainBus).
   * @param {Object|Array|null} [params=null] - Parâmetros dinâmicos opcionais.
   * @param {Component|null} [parent=null] - Componente pai opcional.
   */
  constructor(selector, context, params = null, parent = null) {
    super(selector, context, templateHtml, params, parent);
    this.cleanupAnimation = null;
  }

  /**
   * Inicialização do componente executada após a renderização no DOM.
   * @returns {void}
   */
  onInit() {
    this.initAnimations();
  }

  /**
   * Configura os ouvintes de eventos da UI (`uiBus`) e de interações do usuário no DOM.
   * @returns {void}
   */
  setupListeners() {
    if (!this.uiBus) return;

    //
    this.uiBus.on("book:selected", () => {
      this._tempListReady = false;
      this._hasPendingChanges = false;
    });

    // Trata atualização da lista de temp files
    this.uiBus.on("temp-files:pending-list", (list) => {
      this._hasPendingChanges = list.length > 0;
      this._tempListReady = true;
      this.refreshSaveButtonState();
    });

    // Trata atualização da lista de temp files
    this.uiBus.on("temp-file:saved", () => {
      this._hasPendingChanges = true;
      this.refreshSaveButtonState();
    });

    // Exibe status de salvamento do arquivo aberto no editor
    this.uiBus.on("toolbar:save-status", (status) => {
      this.setSaveStatus(status);
    });

    //
    this.uiBus.on("book:ai-locked", () => {
      if (this._tempListReady) this.refreshSaveButtonState();
    });
    //
    this.uiBus.on("book:ai-unlocked", () => {
      if (this._tempListReady) this.refreshSaveButtonState();
    });

    // Evento do botão de sincronização/salvamento na barra de ferramentas
    const btnSave = this.element?.querySelector("#btn-save");
    if (btnSave) {
      btnSave.addEventListener("click", () => {
        if (!btnSave.disabled) {
          this.handleSyncClick();
        }
      });
    }
  }

  /**
   * Inicializa a animação visual do botão de salvar/sincronizar.
   * @returns {void}
   */
  initAnimations() {
    const btnSave = this.element?.querySelector("#btn-save");
    if (btnSave && typeof initSaveButtonAnimation === "function") {
      if (typeof this.cleanupAnimation === "function") {
        this.cleanupAnimation();
      }
      this.cleanupAnimation = initSaveButtonAnimation(btnSave);
    }
  }

  /**
   * Dispara a solicitação para abertura do modal de sincronização de alterações pendentes.
   * @returns {void}
   */
  handleSyncClick() {
    this.uiBus.emit("toolbar:open-sync-modal");
  }

  /**
   * Centraliza a regra de ativação/desativação do botão Salvar/Sincronizar.
   * @returns {void}
   */
  refreshSaveButtonState() {
    const btnSave = this.element?.querySelector("#btn-save");
    if (!btnSave) return;

    // Verifica se o arquivo atualmente focado no editor é somente leitura
    const isReadOnly = this.state?.currentFileMetadata
      ? !this.state.currentFileMetadata.humanWrite
      : false;

    // Habilita o botão apenas se o editor permitir escrita E houver arquivos .temp no projeto
    btnSave.disabled =
      isReadOnly ||
      !this._hasPendingChanges ||
      this.state.currentBookMetadata.ai_lock;
  }

  /**
   * Atualiza o ícone visual de status de salvamento na UI.
   * @param {string} status - O estado atual do salvamento.
   * @returns {void}
   */
  setSaveStatus(status) {
    const statusEl = document.getElementById("save-status-indicator");
    if (!statusEl) return;

    statusEl.className = `save-status ${status}`;
    const iconEl = statusEl.querySelector("i");
    const textEl = statusEl.querySelector(".status-text");

    if (status === "unsaved") {
      if (iconEl) iconEl.className = "fas fa-spinner fa-spin";
      if (textEl) textEl.textContent = "Alterações pendentes...";
    } else if (status === "saving") {
      if (iconEl) iconEl.className = "fas fa-spinner fa-spin";
      if (textEl) textEl.textContent = "Salvando rascunho...";
    } else if (status === "saved") {
      if (iconEl) iconEl.className = "fas fa-check-circle";
      if (textEl) textEl.textContent = "Rascunho salvo";
    } else if (status === "hidden") {
      if (textEl) textEl.textContent = "";
    }
  }
}
