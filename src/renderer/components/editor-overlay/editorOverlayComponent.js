/**
 * @file Componente responsável pela renderização estrutural do editor overlay
 */

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';

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
  }

  /**
   * Configura os ouvintes de eventos da interface.
   */
  setupListeners() {
    // TODO: Implementar ouvintes se necessário.
  }
}