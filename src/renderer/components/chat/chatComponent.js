/**
 * @file Componente responsável pela renderização estrutural do chat do assistente de IA
 */

import "./styles.css";
import templateHtml from "./template.html?raw";
import { initStarryBackground } from "./chatAnimations.js";
import { Component } from "../Component.js";
import { gsap } from "gsap";

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
  }

  onInit() {
    initStarryBackground();
    this.setupAutoResizeAndInputListeners();

    // FIXME SIMULAÇÃO DE MENSAGENS RECEBIDAS (MOCK)
    setTimeout(() => {
      // 1. Simula a chegada de uma mensagem da IA após 1.5s
      this.uiBus.emit("chat:render-message", {
        role: "assistant",
        content: "Olá! Como posso ajudar na estruturação do seu livro hoje?",
      });

      // 2. Simula o envio de uma resposta do usuário e o estado de carregamento após 3.5s
      setTimeout(() => {
        this.uiBus.emit("chat:render-message", {
          role: "user",
          content: "Preciso de ajuda para planejar o Capítulo 1.",
        });

        this.uiBus.emit("chat:set-loading", true);

        // 3. Simula a IA respondendo após processar por 2s
        setTimeout(() => {
          this.uiBus.emit("chat:render-message", {
            role: "assistant",
            content:
              "Com certeza! Qual é o objetivo principal do protagonista no início deste capítulo?",
          });
          this.uiBus.emit("chat:set-loading", false);
        }, 2000);
      }, 2000);
    }, 1500);
  }

  /**
   * Configura os ouvintes de eventos específicos do chat.
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

    // Limpa a caixa de mensagens
    this.uiBus.on("chat:clear", () => {
      this.clearChatContainer();
    });
  }

  /**
   * Alterna o estado da gaveta (Drawer) com fade-in no canvas.
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

  scrollToBottom() {
    if (
      document.getElementById("chat-container").classList.contains("expanded")
    ) {
      this.element.scrollTop = this.element.scrollHeight;
    }
  }

  /**
   * Renderiza uma mensagem no DOM do chat.
   * @param {Object} msgData
   * @param {string} msgData.role - Papel do emissor ('user' | 'assistant' | 'system').
   * @param {string} msgData.content - Conteúdo em texto.
   */
  renderChatMessage({ role, content }) {
    const chatContainer = document.getElementById("ai-chat-messages");
    if (!chatContainer) return;

    const messageDiv = document.createElement("div");
    messageDiv.className = `ai-message ${role}`;
    messageDiv.textContent = content;

    chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * Limpa o container de mensagens da interface.
   */
  clearChatContainer() {
    const chatContainer = document.getElementById("ai-chat-messages");
    if (chatContainer) {
      chatContainer.innerHTML = "";
    }
  }

  /**
   * Define o estado visual de carregamento do chat (bloqueando ou liberando a digitação).
   * @param {boolean} isLoading - Indica se o assistente está processando a requisição.
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
}
