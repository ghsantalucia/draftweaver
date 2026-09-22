/**
 * @file Classe gerenciadora de modais em pilha (Stack).
 */

import './styles.css';


export class Modal {
  // Pilha estática que rastreia as instâncias ativas no app
  static activeModals = [];

  /**
   * @param {Object} options
   * @param {string} [options.id] ID opcional do modal
   * @param {string} options.title Título impresso no cabeçalho
   * @param {string} options.content HTML interno do corpo do modal
   * @param {Array<{text: string, class?: string, onClick?: Function}>} [options.buttons] Botões do rodapé
   * @param {Function} [options.onClose] Callback disparado ao fechar
   */
  constructor({ id, title = '', content = '', buttons = [], onClose = null }) {
    // Garante um ID único se nenhum for passado ou para evitar colisões
    this.id = id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    this.title = title;
    this.content = content;
    this.buttons = buttons;
    this.onClose = onClose;
    this.element = null;
  }

  /**
     * Controla o estado de exibição do overlay global (fundo escuro/desfocado).
     * @param {boolean|'show'|'hide'|'toggle'} [action='toggle'] Ação a ser executada
     * @static
     * @private
     */
  static toggleAppOverlay(action = 'toggle') {
    const overlay = document.getElementById('app-modal-overlay');
    if (!overlay) return;

    if (action === 'show' || action === true) {
      overlay.classList.remove('hidden');
    } else if (action === 'hide' || action === false) {
      overlay.classList.add('hidden');
    } else {
      overlay.classList.toggle('hidden');
    }
  }

  /**
   * Renderiza a janela e a exibe no topo da pilha
   */
  show() {
    const overlay = document.getElementById('app-modal-overlay');
    if (!overlay) return;

    // 1. Se já existir outro modal visível, esconde o anterior temporariamente para não encavalar
    if (Modal.activeModals.length > 0) {
      const topModal = Modal.activeModals[Modal.activeModals.length - 1];
      if (topModal.element) {
        topModal.element.style.display = 'none';
      }
    } else {
      // Se é o primeiro modal da pilha, exibe o overlay de fundo
      Modal.toggleAppOverlay('show');
    }

    // 2. Cria o elemento DOM da janela
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'app-modal-window';

    // BLINDAGEM DE CLIQUE: Impede que cliques dentro da janela fechem o modal ou propaguem para o fundo
    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 3. Monta o HTML interno
    this.element.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${this.title}</h3>
        <button class="modal-close-btn" title="Fechar">&times;</button>
      </div>
      <div class="modal-body">
        ${this.content}
      </div>
      ${this.buttons.length > 0 ? `<div class="modal-footer"></div>` : ''}
    `;

    // 4. Renderiza botões do rodapé se existirem
    if (this.buttons.length > 0) {
      const footer = this.element.querySelector('.modal-footer');
      this.buttons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.className = `btn-modal ${btnConfig.class || 'btn-secondary'}`;
        btn.textContent = btnConfig.text;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (btnConfig.onClick) {
            btnConfig.onClick(this);
          } else {
            this.close();
          }
        });

        footer.appendChild(btn);
      });
    }

    // 5. Evento de fechar EXCLUSIVO no botão 'X'
    const closeBtn = this.element.querySelector('.modal-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Injeta a janela no DOM e salva na pilha
    overlay.appendChild(this.element);
    Modal.activeModals.push(this);
  }

  /**
   * Fecha o modal atual e restaura o modal anterior da pilha (se houver)
   */
  close() {
    if (!this.element) return;

    // Executa callback customizado
    if (typeof this.onClose === 'function') {
      this.onClose();
    }

    // Remove elemento do DOM
    this.element.remove();
    this.element = null;

    // Remove da pilha estática
    Modal.activeModals = Modal.activeModals.filter(m => m !== this);

    // Se ainda restarem modais na pilha, reexibe o modal que ficou no topo
    if (Modal.activeModals.length > 0) {
      const previousModal = Modal.activeModals[Modal.activeModals.length - 1];
      if (previousModal.element) {
        previousModal.element.style.display = 'flex';
      }
    } else {
      // Se não sobrou nenhum modal, oculta o overlay global escuro
      Modal.toggleAppOverlay('hide');
    }
  }
}