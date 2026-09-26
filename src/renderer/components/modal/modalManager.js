/**
 * @file Classe gerenciadora da pilha de modais dinâmicos da aplicação.
 */

import { ModalComponent } from './modalComponent.js';


/**
 * Gerenciador responsável por controlar a pilha de modais, overlay escuro e âncoras globais da aplicação.
 * @class
 */
export class ModalManager {

    /**
     * Cria uma instância do ModalManager.
     * @param {string} selector - Seletor CSS do container global de modais (ex: '#modal-container').
     * @param {Object} context - Objeto de contexto e infraestrutura compartilhada (state, uiBus, domainBus).
     */
    constructor(selector, context) {
        this.context = context;
        this.activeModals = [];
        this.overlayElement = document.getElementById('app-modal-overlay');
        this.containerElement = document.querySelector(selector);

        // Opcional: Ouvir eventos globais do uiBus para abrir modais declarativamente!
        this.setupListeners();
    }

    /**
     * Abre um novo modal empilhando-o sobre os anteriores.
     * @param {Object} options - Configurações e dados para o modal.
     * @param {string} [options.id] - ID único opcional para o modal.
     * @param {string} [options.title] - Título exibido no cabeçalho.
     * @param {string} [options.content] - Conteúdo HTML do corpo do modal.
     * @param {Array<Object>} [options.buttons] - Lista de botões customizados para o rodapé.
     * @param {Function} [options.onClose] - Callback disparado ao fechar o modal.
     * @returns {ModalComponent|undefined} A instância do modal criado ou undefined se falhar.
     */
    open(options) {
        if (!this.containerElement) {
            console.error("[ModalManager] Âncora #modal-container não encontrada no DOM.");
            return;
        }

        // 1. Se já houver um modal aberto, esconde o anterior
        if (this.activeModals.length > 0) {
            const topModal = this.activeModals[this.activeModals.length - 1];
            if (topModal.element) {
                topModal.element.style.display = 'none';
            }
        } else {
            this.toggleOverlay(true);
        }

        // 2. Cria um ID único e um elemento wrapper exclusivo para este modal dentro da âncora
        const modalId = options.id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        const modalWrapper = document.createElement('div');
        modalWrapper.id = modalId;
        modalWrapper.className = 'modal-wrapper-item'; // opcional para estilização
        this.containerElement.appendChild(modalWrapper);

        // 3. Passa o seletor único deste wrapper exclusivo para o ModalComponent!
        const selector = `#${modalId}`;
        const modal = new ModalComponent(selector, this.context, { ...options, id: modalId });

        // Inicializa o modal usando o ciclo de vida normal da classe Component
        modal.init();

        // Sobrescreve o close para gerenciar a pilha e remover o wrapper do DOM
        const originalClose = modal.close.bind(modal);
        modal.close = () => {
            originalClose();
            // Remove o wrapper exclusivo do DOM
            modalWrapper.remove();
            this.activeModals = this.activeModals.filter(m => m !== modal);
            this.handleModalClose();
        };

        this.activeModals.push(modal);
        return modal;
    }

    /**
     * Gerencia o comportamento visual da pilha ao fechar um modal (restaura o anterior ou esconde o overlay).
     * @private
     */
    handleModalClose() {
        if (this.activeModals.length > 0) {
            // Reexibe o modal anterior que estava embaixo
            const previousModal = this.activeModals[this.activeModals.length - 1];
            if (previousModal.element) {
                previousModal.element.style.display = 'flex';
            }
        } else {
            // Se acabou a pilha, oculta o overlay global
            this.toggleOverlay(false);
        }
    }

    /**
     * Alterna a visibilidade do overlay global escuro de fundo.
     * @param {boolean} show - True para exibir o overlay, false para ocultar.
     * @private
     */
    toggleOverlay(show) {
        if (this.containerElement) {
            if (show) {
                this.containerElement.classList.remove('hidden');
            } else {
                this.containerElement.classList.add('hidden');
            }
        }
        if (!this.overlayElement) return;
        if (show) {
            this.overlayElement.classList.remove('hidden');
        } else {
            this.overlayElement.classList.add('hidden');
        }
    }

    /**
     * Configura os ouvintes de eventos globais no barramento uiBus.
     * @private
     */
    setupListeners() {
        // Permite abrir modais disparando eventos no uiBus de qualquer lugar do app!
        this.context.uiBus.on('modal:open', (context) => {
            if(context.nativeEvent) {
                this.open(context.data); // data pode conter título, conteúdo, etc.
            }
            else {
                this.open(context);
            }
        });
    }
}