
/**
 * @file Componente responsável pela renderização estrutural do editor markdown
 */

import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';

import './styles.css';
import templateHtml from './template.html?raw';
import { Component } from '../Component.js';

/**
 * Representa o Editor Markdown da aplicação.
 * @class
 */
export class EditorComponent extends Component {
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

  onInit() {
    this.initMarkdownEditor();
  }

  /**
   * Configura os ouvintes de eventos da interface.
   */
  setupListeners() {
    // TODO: Implementar ouvintes se necessário.
  }

  /**
   * Inicializa a biblioteca ToastUI Editor no elemento DOM recém-criado.
   * @private
   */
  initMarkdownEditor() {

    // Pergunta de forma limpa ao DOM/ThemeManager se o tema atual é escuro
    const isDark = document.body.classList.contains('dark-theme');
    const currentTheme = isDark ? 'dark' : 'default';
    const editorElement = this.element.querySelector('#markdown-editor');

    if (!editorElement) {
      console.error('[EditorComponent] Elemento #markdown-editor não encontrado no template.');
      return;
    }

    this.editor = new Editor({
      el: editorElement,
      height: '100%',
      initialEditType: 'wysiwyg',
      hideModeSwitch: true,
      placeholder: 'Selecione um arquivo...',
      theme: currentTheme
    });
  }
}