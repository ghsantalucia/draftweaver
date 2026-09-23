/**
 * @file Componente responsável pela renderização estrutural do explorer de arquivos.
 */

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';

/**
 * Representa o explorer de arquivos.
 * @class
 */
export class ExplorerComponent extends Component {
  /**
   * Cria uma instância do SidebarComponent.
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Component} [parent=null]
   */
  constructor(selector, parent = null) {
    super(selector, templateHtml, parent);
  }

  /**
   * Configura os ouvintes de eventos.
   */
  setupListeners() {
    // TODO: Implementar ouvintes se necessário.
  }
}