/**
 * @file Responsável pelos eventos e comportamentos da interface do Menu de Configurações (Settings Drawer).
 */


import './styles.css';

import { toggleAppOverlay, Modal } from '../ui';

/**
 * Abre a gaveta de configurações.
 */
export function openSettingsDrawer() {
  // Impede abrir as configurações se houver algum modal ativo na tela
  if (Modal.activeModals.length > 0) return;

  const drawer = document.getElementById('settings-drawer');
  drawer?.classList.add('open');
  
  toggleAppOverlay('show');
}

/**
 * Fecha a gaveta de configurações.
 */
export function closeSettingsDrawer() {
  
  console.log("closeSettingsDrawer();");
  
  const drawer = document.getElementById('settings-drawer');
  drawer?.classList.remove('open');
  
  // Remove a chave 'settings-drawer' da pilha do overlay global
  toggleAppOverlay('hide');
}

/**
 * Registra os ouvintes de evento para os botões do menu de configurações.
 */
export function initSettingsEvents() {
  const btnOpenMenu = document.getElementById('btn-open-menu');
  const btnCloseMenu = document.getElementById('btn-close-menu');
  const globalOverlay = document.getElementById('app-modal-overlay');

  if (btnOpenMenu) btnOpenMenu.addEventListener('click', openSettingsDrawer);
  if (btnCloseMenu) btnCloseMenu.addEventListener('click', closeSettingsDrawer);
  
  // Ao clicar no overlay global, fecha a gaveta APENAS se NÃO houver modais abertos
  if (globalOverlay) {
    globalOverlay.addEventListener('click', (e) => {
      // Se clicar direto no overlay e NÃO houver modais na pilha, fecha a gaveta
      if (e.target === globalOverlay && Modal.activeModals.length === 0) {
        closeSettingsDrawer();
      }
    });
  }
}