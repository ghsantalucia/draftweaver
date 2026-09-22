/**
 * @file Componente responsável pela renderização estrutural da barra lateral (Sidebar).
 */

import './styles.css';
import templateHtml from './template.html?raw';

/**
 * Representa o painel lateral esquerdo da aplicação.
 * @class
 */
export class SidebarComponent {
  /**
   * Cria uma instância do SidebarComponent.
   * @param {string} selector - Seletor CSS do elemento do DOM onde a sidebar será injetada.
   */
  constructor(selector) {
    /** @type {HTMLElement|null} Elemento container da sidebar */
    this.containerElement = document.querySelector(selector);
  }

  /**
   * Inicializa o componente, executando a renderização e configurando ouvintes.
   * @public
   */
  init() {
    this.render();
    console.log('[SidebarComponent] Inicializado com sucesso.');
  }

  /**
   * Renderiza o template HTML da sidebar no container alvo.
   * @private
   */
  render() {
    if (!this.containerElement) {
      console.error('[SidebarComponent] Container alvo não fornecido para renderização.');
      return;
    }
    
    this.containerElement.innerHTML = templateHtml;
  }

  /**
   * Configura os ouvintes de eventos da interface da sidebar.
   * @private
   */
  setupListeners() {
    // TODO: Implementar.
  }
}