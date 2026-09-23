/**
 * @file Componente responsável pela renderização estrutural do chat do assistente de IA
 */

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';

/**
 * Representa o chat do assistente de IA.
 * @class
 */
export class ChatComponent extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Component} [parent=null] - Componente pai (ex: SidebarComponent).
   */
  constructor(selector, parent = null) {
    super(selector, templateHtml, parent);
  }

  /**
   * Configura os ouvintes de eventos específicos do chat.
   */
  setupListeners() {
    // TODO: Implementar ouvintes do Chat.
  }
}