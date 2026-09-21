/**
 * @file Funções utilitárias para controlar o app overlay
 */

import './styles.css';

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