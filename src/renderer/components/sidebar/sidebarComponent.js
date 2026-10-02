/**
 * @file Componente responsável pela renderização estrutural da barra lateral (Sidebar).
 */

import "./styles.css";
import templateHtml from "./template.html?raw";
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

  async onInit() {
    // Solicita que o controller/handler busque e popule o select de livros
    await this.updateBookList();
    this.selectLastBook();
  }

  /**
   * Configura os ouvintes de eventos da interface da sidebar.
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
  }

  async updateBookList() {
    try {
      const response = await this.uiBus.req("books:fetch-list");
      const books = response?.books || [];

      // Atualiza o state local ou global
      this.state.bookList = books;

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
        option.innerText = book.title;
        selectBookEl.appendChild(option);
      });
    } catch (error) {
      console.error("[Sidebar] Erro ao atualizar lista de livros:", error);
    }
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
