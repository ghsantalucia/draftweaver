/**
 * @file Componente responsável pela renderização estrutural do chat do assistente de IA
 */

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';
import { gsap } from 'gsap';

/**
 * Representa o chat do assistente de IA.
 * @class
 */
export class ChatComponent extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus)
   * @param {Component} [parent=null] - Componente pai (ex: SidebarComponent).
   */
  constructor(selector, context, parent = null) {
    super(selector, context, templateHtml, parent);
  }

  /**
   * Configura os ouvintes de eventos específicos do chat.
   */
  setupListeners() {
    this.uiBus.on('ai-chat:toggle', () => {
      this.toggleAiDrawer();
    });
  }

  /**
   * Alterna o estado da gaveta (Drawer) com fade-in no canvas.
   */
  toggleAiDrawer() {

    const aiDrawer = document.getElementById('chat-container');
    const canvas = document.getElementById('ai-bg-canvas');
    if (!aiDrawer) return;

    const isOpening = !aiDrawer.classList.contains('expanded');
    aiDrawer.classList.toggle('expanded');

    if (isOpening) {
      if (canvas) gsap.set(canvas, { opacity: 0 });

      if (typeof window.resetStarsPosition === 'function') {
        setTimeout(window.resetStarsPosition, 50);
        setTimeout(window.resetStarsPosition, 350);
      }

      if (canvas) {
        gsap.to(canvas, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          delay: 0.1,
        });
      }

      const textarea = document.getElementById('ai-chat-input');
      if (textarea) textarea.focus();
      scrollToBottom();
    } else if (canvas) {
      gsap.to(canvas, {
        opacity: 0,
        duration: 0.2,
      });
    }
  }
}