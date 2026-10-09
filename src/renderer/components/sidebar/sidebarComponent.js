/**
 * @file Componente responsável pela renderização estrutural da barra lateral (Sidebar).
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { Component } from "../Component.js";

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

  /**
   * Configura os ouvintes de eventos da interface da sidebar.
   * @private
   * @returns {void}
   */
  setupListeners() {
    // Sincroniza o <select> com o livro atualmente selecionado
    this.uiBus.on("book:changed", (bookPath) => {
      // 1. Encontra o elemento <select> dentro do DOM do componente
      const selectEl = this.element.querySelector("#select-book");
      if (!selectEl) return;

      // 2. Se o valor atual do select for diferente do bookPath recebido, atualiza
      if (selectEl.value !== bookPath) {
        selectEl.value = bookPath;
      }
    });

    // Solicita atualização da lista de livros quando o backend notifica mudança
    this.uiBus.on("books:updated", (bookList) => {
      this.updateBookList(bookList);
    });
  }

  /**
   * Atualiza select de livros
   * @param {Array[Object]} books
   * @returns {void}
   * @private
   */
  async updateBookList(books) {
    const selectBookEl = this.element.querySelector("#select-book");
    if (!selectBookEl) return;

    selectBookEl.innerHTML = "";

    if (books.length === 0) {
      selectBookEl.innerHTML =
        '<option value="">Nenhum livro encontrado</option>';
      return;
    }

    books.forEach((book) => {
      const option = document.createElement("option");
      option.value = book.fullPath;
      option.innerText = book.book_title;
      selectBookEl.appendChild(option);
    });
  }

  selectLastBook() {
    const lastSelected = this.state.currentBookPath;
    const booksArray = this.state.bookList;

    const bookToLoad =
      booksArray.find((b) => b.fullPath === lastSelected) || booksArray[0];

    if (bookToLoad) {
      this.uiBus.emit("book:selected", bookToLoad.fullPath);
    }
  }
}
