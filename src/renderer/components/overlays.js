/**
 * @file Funções utilitárias para controlar overlays na interface.
 */


// Pilha em memória para armazenar os overlays ativos
// Estrutura do item: { key, message, showSpinner }
const overlayStack = [];

/**
 * Controla o estado do overlay interno do editor usando uma pilha por chaves.
 * @param {boolean} show Define se o bloqueio deve ser exibido ou ocultado
 * @param {string} key Identificador único da causa do bloqueio (ex: 'no-file', 'ai-lock')
 * @param {string} [message=''] Mensagem a ser exibida no card
 * @param {boolean} [showSpinner=true] Exibe ou oculta o spinner
 */
export function toggleEditorOverlay(show, key, message = '', showSpinner = true) {
  const overlay = document.getElementById('editor-overlay');
  const messageEl = document.getElementById('editor-overlay-message');
  const spinnerEl = document.getElementById('editor-overlay-spinner');

  if (!overlay) return;

  if (show) {
    // 1. Se a chave já existir na pilha, atualiza os dados; caso contrário, insere no topo
    const index = overlayStack.findIndex(item => item.key === key);
    if (index !== -1) {
      overlayStack[index] = { key, message, showSpinner };
    } else {
      overlayStack.push({ key, message, showSpinner });
    }
  } else {
    // 2. Se for para ocultar, remove a chave informada da pilha
    const index = overlayStack.findIndex(item => item.key === key);
    if (index !== -1) {
      overlayStack.splice(index, 1);
    }
  }

  // 3. Processa o estado final baseado no topo da pilha
  if (overlayStack.length > 0) {
    // Pega o último elemento adicionado à pilha
    const currentOverlay = overlayStack[overlayStack.length - 1];

    if (messageEl) messageEl.textContent = currentOverlay.message;
    if (spinnerEl) spinnerEl.style.display = currentOverlay.showSpinner ? 'block' : 'none';

    overlay.classList.remove('hidden');
  } else {
    // Se a pilha estiver vazia, oculta o overlay visualmente
    overlay.classList.add('hidden');
  }
}

/**
 * Controla o estado de exibição do overlay global (fundo escuro/desfocado).
 * @param {boolean|'show'|'hide'|'toggle'} action Ação a ser executada
 */
export function toggleAppOverlay(action = 'toggle') {
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