/**
 * @file Componente responsável pela renderização estrutural da barra lateral (Sidebar).
 */

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';

/**
 * Representa o painel lateral esquerdo da aplicação.
 * @class
 */
export class SidebarComponent extends Component {
  /**
   * Cria uma instância do SidebarComponent.
   * @param {string} selector - Seletor CSS do elemento do DOM onde a sidebar será injetada.
   * @param {Component} [parent=null]
   */
  constructor(selector, parent = null) {
    super(selector, templateHtml, parent);
  }

  /**
   * Configura os ouvintes de eventos da interface da sidebar.
   */
  setupListeners() {
    // TODO: Implementar ouvintes da Sidebar se necessário.
  }
}