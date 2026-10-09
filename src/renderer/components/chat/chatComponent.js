/**
 * @file Componente responsável pela renderização estrutural do chat do assistente de IA
 */

import "./styles.css";
import templateHtml from "./templates/main.hbs?raw";
import { initStarryBackground } from "./chatAnimations.js";
import { Component } from "../Component.js";
import { gsap } from "gsap";

import messageTpl from "./templates/message.hbs?raw";
import dateDividerTpl from "./templates/dateDivider.hbs?raw";
import startMarkerTpl from "./templates/startMarker.hbs?raw";

/**
 * Representa o chat do assistente de IA.
 * @class
 */
export class ChatComponent extends Component {
  /**
   * Cria uma instância da classe
   * @param {string} selector - Seletor CSS do elemento do DOM onde será injetada.
   * @param {Object} context - Objeto de contexto e infraestrutura (state, uiBus, domainBus)
   * @param {Object|Array|null} [params=null] - Parâmetros opcionais dinâmicos para a exigência do componente.
   * @param {Component} [parent=null]
   */
  constructor(selector, context, params, parent = null) {
    super(selector, context, templateHtml, params, parent);

    // Controle da paginação e scroll infinito
    this.currentOffset = 0;
    this.isLoadingHistory = false;
    this.hasMoreHistory = true;
  }

  onInit() {
    initStarryBackground();
    this.setupAutoResizeAndInputListeners();
    this.setupScrollListener();
  }

  /**
   * Configura os ouvintes de eventos específicos do chat.
   * @returns {void}
   */
  setupListeners() {
    // Alterna visibilidade da gaveta
    this.uiBus.on("ai-chat:toggle", () => {
      this.toggleAiDrawer();
    });

    // Renderiza uma mensagem no chat (chamado pelo chatHandler/uiController)
    this.uiBus.on("chat:render-message", (msgData) => {
      this.renderChatMessage(msgData);
    });

    // Controla o estado de carregamento/bloqueio do input
    this.uiBus.on("chat:set-loading", (isLoading) => {
      this.setChatLoadingState(isLoading);
    });

    // Renderiza histórico inicial do chat
    this.uiBus.on("chat:render-history", (data) => {
      this.clearChatContainer();

      const messages = Array.isArray(data) ? data : data?.messages || [];
      const hasMore = Array.isArray(data) ? true : Boolean(data?.hasMore);

      // Atualiza o offset com o valor retornado ou reseta para 0
      this.currentOffset = data?.offsetUsed ?? 0;

      this.renderChatHistory(messages, hasMore);
      this.scrollToBottom();
    });

    // Adiciona histórico mais antigo ao chat (Infinite Scroll)
    this.uiBus.on("chat:append-history", (data) => {
      const messages = Array.isArray(data) ? data : data?.messages || [];
      const hasMore = Array.isArray(data) ? true : Boolean(data?.hasMore);

      this.renderChatHistory(messages, hasMore);
    });

    // Limpa a caixa de mensagens
    this.uiBus.on("chat:clear", () => {
      this.clearChatContainer();
      this.currentOffset = 0;
      this.isLoadingHistory = false;
      this.hasMoreHistory = true;
    });
  }

  /**
   * Alterna o estado da gaveta (Drawer) com fade-in no canvas.
   * @returns {void}
   */
  toggleAiDrawer() {
    const aiDrawer = document.getElementById("chat-container");
    const canvas = document.getElementById("ai-bg-canvas");
    if (!aiDrawer) return;

    const isOpening = !aiDrawer.classList.contains("expanded");
    aiDrawer.classList.toggle("expanded");

    if (isOpening) {
      if (canvas) gsap.set(canvas, { opacity: 0 });

      if (typeof window.resetStarsPosition === "function") {
        setTimeout(window.resetStarsPosition, 50);
        setTimeout(window.resetStarsPosition, 350);
      }

      if (canvas) {
        gsap.to(canvas, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          delay: 0.1,
        });
      }

      const textarea = document.getElementById("ai-chat-input");
      if (textarea) textarea.focus();
      this.scrollToBottom();
    } else if (canvas) {
      gsap.to(canvas, {
        opacity: 0,
        duration: 0.2,
      });
    }
  }

  /**
   * Rola o chat para o final, garantindo que a última mensagem esteja visível.
   * @returns {void}
   */
  scrollToBottom() {
    const drawer = document.getElementById("chat-container");
    const chatMessages = document.getElementById("ai-chat-messages");

    if (!drawer || !chatMessages) return;

    if (drawer.classList.contains("expanded")) {
      // requestAnimationFrame / setTimeout garante que o DOM já calculou
      // a altura final das mensagens antes de rolar até ao fundo
      requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
    }
  }

  /**
   * Renderiza uma mensagem individual no DOM do chat.
   * @param {Object} msgData
   * @returns {void}
   */
  renderChatMessage(msgData) {
    const chatContainer = document.getElementById("ai-chat-messages");
    if (!chatContainer) return;

    const messageElement = this.createMessageElement(msgData);
    chatContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  /**
   * Renderiza um lote de mensagens do histórico no topo do container de chat com divisores de data.
   * Mantém a ancoragem do scroll para evitar loops e pulos na tela.
   *
   * @param {Array<{role: string, content: string, timestamp?: string}>} msgData - Lista de mensagens retornada pelo histórico.
   * @param {boolean} [hasMore=true] - Indica se ainda existem lotes mais antigos.
   * @returns {void}
   */
  renderChatHistory(msgData, hasMore = true) {
    this.hasMoreHistory = hasMore;

    const chatContainer = document.getElementById("ai-chat-messages");
    if (!chatContainer) {
      this.isLoadingHistory = false;
      return;
    }

    const fragment = document.createDocumentFragment();

    // 1. Se chegou ao fim do histórico, insere o indicador no topo
    if (!hasMore) {
      const existingStart = chatContainer.querySelector(".start-of-chat");
      if (existingStart) existingStart.remove();

      fragment.appendChild(this.createStartOfChatElement());
    }

    // 2. Se houver mensagens, insere com os divisores de data
    let currentDateStr = null;
    if (Array.isArray(msgData) && msgData.length > 0) {
      // Pega o divisor de data atual do topo para evitar duplicatas
      const firstExistingChild = chatContainer.firstElementChild;
      let topExistingDate = null;
      if (
        firstExistingChild &&
        firstExistingChild.classList.contains("chat-date-divider")
      ) {
        topExistingDate = firstExistingChild.getAttribute("data-date");
      }

      msgData.forEach((msg) => {
        const msgDateStr = this.formatDateLabel(msg.timestamp);

        if (msgDateStr && msgDateStr !== currentDateStr) {
          currentDateStr = msgDateStr;
          fragment.appendChild(this.createDateDividerElement(currentDateStr));
        }

        const messageElement = this.createMessageElement(msg);
        fragment.appendChild(messageElement);
      });

      // Deduplicação de data
      if (
        currentDateStr &&
        currentDateStr === topExistingDate &&
        firstExistingChild
      ) {
        firstExistingChild.remove();
      }
    }

    // 3. Salva a altura antes de anexar para a ancoragem do scroll
    const previousScrollHeight = chatContainer.scrollHeight;

    // 4. Injeta tudo no DOM
    chatContainer.prepend(fragment);

    // 5. Ancoragem de scroll
    if (this.currentOffset > 0) {
      const newScrollHeight = chatContainer.scrollHeight;
      chatContainer.scrollTop = newScrollHeight - previousScrollHeight;
    }

    this.isLoadingHistory = false;
  }

  /**
   * Limpa o container de mensagens da interface.
   * @returns {void}
   */
  clearChatContainer() {
    const chatContainer = document.getElementById("ai-chat-messages");
    if (chatContainer) {
      chatContainer.innerHTML = "";
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  /**
   * Define o estado visual de carregamento do chat (bloqueando ou liberando a digitação).
   * @param {boolean} isLoading - Indica se o assistente está processando a requisição.
   * @returns {void}
   */
  setChatLoadingState(isLoading) {
    const textarea = document.getElementById("ai-chat-input");
    const btnSend = document.getElementById("btn-send-ai");

    if (textarea) {
      textarea.disabled = isLoading;
      if (
        !isLoading &&
        document.getElementById("chat-container").classList.contains("expanded")
      ) {
        textarea.focus();
      }
    }

    if (btnSend) {
      btnSend.disabled = isLoading;
      btnSend.style.opacity = isLoading ? "0.5" : "1";
      btnSend.style.pointerEvents = isLoading ? "none" : "auto";
    }
  }

  /**
   * Captura o texto do input e dispara o evento de envio de mensagem via uiBus.
   * @returns {void}
   */
  triggerSendMessage() {
    const textarea = document.getElementById("ai-chat-input");
    if (!textarea) return;

    const promptText = textarea.value.trim();
    if (!promptText) return;

    // Reseta o valor e a altura dinâmica do textarea
    textarea.value = "";
    textarea.style.height = "auto";

    // Emite o evento para a camada de controle tratar
    this.uiBus.emit("chat:send-message", { promptText });
  }

  /**
   * Configura os ouvintes de redimensionamento automático e atalhos de teclado para o textarea.
   * @returns {void}
   */
  setupAutoResizeAndInputListeners() {
    const textarea = document.getElementById("ai-chat-input");
    const btnSend = document.getElementById("btn-send-ai");

    if (textarea) {
      textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      });

      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.triggerSendMessage();
        }
      });
    }

    if (btnSend) {
      btnSend.addEventListener("click", (e) => {
        e.preventDefault();
        this.triggerSendMessage();
      });
    }
  }

  /**
   * Configura o evento de rolagem para disparar o infinite scroll com delay de 1s.
   * Se o usuário rolar para baixo antes de 1s, a busca é cancelada.
   * @returns {void}
   */
  setupScrollListener() {
    const chatContainer = document.getElementById("ai-chat-messages");
    if (!chatContainer) return;

    // Guarda a referência do timer para cancelamento
    this.scrollTimer = null;

    chatContainer.addEventListener("scroll", () => {
      const isAtTop = chatContainer.scrollTop <= 30;

      if (isAtTop) {
        // Se já está no topo, não está carregando, há mais histórico e ainda não iniciou o timer
        if (
          !this.isLoadingHistory &&
          this.hasMoreHistory &&
          !this.scrollTimer
        ) {
          this.scrollTimer = setTimeout(() => {
            this.isLoadingHistory = true;
            this.currentOffset += 1;
            this.scrollTimer = null;

            // Dispara o evento após manter 1s no topo
            this.uiBus.emit("chat:fetch-more-history", {
              offset: this.currentOffset,
            });
          }, 1000); // Delay de 1 segundo
        }
      } else {
        // Se o usuário rolou para baixo antes de dar 1s, cancela a chamada
        if (this.scrollTimer) {
          clearTimeout(this.scrollTimer);
          this.scrollTimer = null;
        }
      }
    });
  }

  /**
   * Converte o timestamp para uma string formatada de data (DD/MM/YYYY).
   * @param {string|number} timestamp
   * @returns {string}
   */
  formatDateLabel(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Cria a estrutura DOM de uma mensagem individual renderizada via template Handlebars.
   * @param {Object} msgData - Objeto contendo os dados da mensagem.
   * @param {string} msgData.role - Papel do emissor da mensagem ('user' | 'assistant' | 'system').
   * @param {string} msgData.content - Conteúdo em texto da mensagem.
   * @returns {HTMLElement} Elemento DOM do nó da mensagem pronto para injeção.
   */
  createMessageElement({ role, content }) {
    const html = this.compile(messageTpl, { role, content });
    return this.createDOMElement(html);
  }

  /**
   * Cria o elemento visual do divisor de data no chat via template Handlebars.
   * @param {string} dateText - Texto da data formatada a ser exibida (ex: "10/10/2026").
   * @returns {HTMLElement} Elemento DOM do nó do divisor de data pronto para injeção.
   */
  createDateDividerElement(dateText) {
    const html = this.compile(dateDividerTpl, { dateText });
    return this.createDOMElement(html);
  }

  /**
   * Cria o elemento visual indicando o início absoluto do histórico de conversa via template Handlebars.
   * @returns {HTMLElement} Elemento DOM do nó de marcação do início da conversa pronto para injeção.
   */
  createStartOfChatElement() {
    const html = this.compile(startMarkerTpl);
    return this.createDOMElement(html);
  }
}
