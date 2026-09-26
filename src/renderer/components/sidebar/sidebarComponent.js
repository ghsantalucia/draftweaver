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
    // Solicita que o controller/handler busque e popule o select de livros
    this.uiBus.emit('books:fetch-list');
  }

  /**
   * Configura os ouvintes de eventos da interface da sidebar.
   */
  setupListeners() {

    // Dentro da configuração de listeners do componente da Sidebar:
    this.uiBus.on('books:list-loaded', ({ books }) => {
      const selectBookEl = this.element.querySelector('#select-book');
      if (!selectBookEl) return;

      selectBookEl.innerHTML = '';

      if (!books || books.length === 0) {
        selectBookEl.innerHTML = '<option value="">Nenhum livro encontrado</option>';
        return;
      }

      books.forEach((book) => {
        const option = document.createElement('option');
        option.value = book.fullPath;
        option.innerText = book.title;
        selectBookEl.appendChild(option);
      });
    });

    // Sincroniza o <select> com o livro atualmente selecionado
    this.uiBus.on('book:changed', (bookPath) => {
      // 1. Encontra o elemento <select> dentro do DOM do componente
      const selectEl = this.element.querySelector('#select-book');
      if (!selectEl) return;

      // 2. Se o valor atual do select for diferente do bookPath recebido, atualiza
      if (selectEl.value !== bookPath) {
        selectEl.value = bookPath;
      }
    });
  }
}