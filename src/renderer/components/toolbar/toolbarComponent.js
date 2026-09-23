/**
 * @file Componente responsável pela renderização estrutural da Toolbar.
 */

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';

/**
 * Representa a Toolbar da aplicação.
 * @class
 */
export class ToolbarComponent extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Component} [parent=null]
   */
  constructor(selector, parent = null) {
    super(selector, templateHtml, parent);
  }

  /**
   * Configura os ouvintes de eventos da interface.
   */
  setupListeners() {
    // TODO: Implementar ouvintes se necessário.
  }
}