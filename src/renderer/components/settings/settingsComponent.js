/**
 * @file Componente responsável pela renderização estrutural da drawer de configurações
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";

/**
 * Representa a drawer de configurações.
 * @class
 */
export class SettingsComponent extends Component {
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
   * Configura os ouvintes de eventos.
   */
  setupListeners() {
    // Abre a drawer
    this.uiBus.on("settings:open", () => {
      this.open();
    });

    // Fecha a drawer
    this.uiBus.on("settings:close", () => {
      this.close();
    });

    // Sincroniza o estado do switch sempre que o tema mudar (inclusive no init)
    this.uiBus.on("theme:changed", (data) => {
      console.log("[TOGGLE SWITCH]", data.theme);
      this.toggleThemeSwitch(data.theme);
    });
  }

  /**
   * Abre a gaveta de configurações.
   */
  open() {
    // Impede abrir as configurações se houver algum modal ativo na tela
    // if (Modal.activeModals.length > 0) return;

    const drawer = document.getElementById("settings-drawer");
    this.element?.classList.add("open");

    // toggleAppOverlay('show');
  }

  /**
   * Fecha a gaveta de configurações.
   */
  close() {
    this.element?.classList.remove("open");

    // Remove a chave 'settings-drawer' da pilha do overlay global
    // toggleAppOverlay('hide');
  }

  /**
   * Altera o estado do switch de alteração do theme
   */
  toggleThemeSwitch(theme) {
    const themeToggle = this.element?.querySelector("#theme-toggle");

    if (themeToggle) {
      themeToggle.checked = theme === "dark";
    }
  }
}
